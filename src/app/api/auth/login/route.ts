import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from "@/lib/audit/auditLogger";
import { checkRateLimit, RATE_LIMIT_TIERS } from "@/lib/middleware/withRateLimit";
import { SESSION_MAX_AGE } from "@/lib/security/sessionManager";
import { sanitizeString } from "@/lib/validation/sanitize";
import { loginSchema, validateRequest } from "@/lib/validation/schemas";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`auth:login:${ip}`, RATE_LIMIT_TIERS.auth);
    if (!allowed) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    // Validate request body with Zod
    const validation = await validateRequest(req, loginSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { email, password } = validation.data;
    const sanitizedEmail = sanitizeString(email).toLowerCase().trim();

    // Check account lockout
    const userForLockout = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      select: { id: true, accountLockout: true },
    });

    if (userForLockout?.accountLockout?.lockoutUntil) {
      if (new Date() < userForLockout.accountLockout.lockoutUntil) {
        await auditLogger.logFromRequest(req, AuditEventType.AUTH_LOGIN_FAILURE, AuditAction.LOGIN, {
          severity: AuditSeverity.WARNING,
          targetType: "User",
          targetId: userForLockout.id,
          details: { reason: "account_locked", email: sanitizedEmail },
          responseStatus: 423,
        });
        return NextResponse.json({ error: "Account temporarily locked. Please try again later." }, { status: 423 });
      }
    }

    const user = await authenticateUser(sanitizedEmail, password);

    if (!user) {
      // Record failed attempt for lockout escalation
      if (userForLockout) {
        const lockout = await prisma.accountLockout.upsert({
          where: { userId: userForLockout.id },
          create: { userId: userForLockout.id, failedAttempts: 1, lastAttemptAt: new Date() },
          update: { failedAttempts: { increment: 1 }, lastAttemptAt: new Date() },
        });

        // Progressive lockout: 5 fails = 5 min, 10 = 30 min, 15+ = 2 hours
        let lockoutMinutes = 0;
        if (lockout.failedAttempts >= 15) lockoutMinutes = 120;
        else if (lockout.failedAttempts >= 10) lockoutMinutes = 30;
        else if (lockout.failedAttempts >= 5) lockoutMinutes = 5;

        if (lockoutMinutes > 0) {
          await prisma.accountLockout.update({
            where: { userId: userForLockout.id },
            data: {
              lockoutUntil: new Date(Date.now() + lockoutMinutes * 60 * 1000),
              escalationLevel: lockout.failedAttempts >= 15 ? 3 : lockout.failedAttempts >= 10 ? 2 : 1,
            },
          });
        }
      }

      await auditLogger.logFromRequest(req, AuditEventType.AUTH_LOGIN_FAILURE, AuditAction.LOGIN, {
        severity: AuditSeverity.WARNING,
        details: { email: sanitizedEmail },
        responseStatus: 401,
      });

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Successful login — reset lockout
    if (userForLockout?.accountLockout) {
      await prisma.accountLockout.update({
        where: { userId: user.id },
        data: { failedAttempts: 0, lockoutUntil: null, escalationLevel: 0 },
      });
    }

    // Auto-link athlete on login if not already linked
    if (user.role === "athlete") {
      const alreadyLinked = await prisma.athlete.findUnique({ where: { userId: user.id } });

      if (!alreadyLinked && user.name) {
        const nameParts = user.name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        if (firstName && lastName) {
          let athlete = await prisma.athlete.findFirst({
            where: { firstName, lastName, userId: null },
          });

          if (!athlete) {
            athlete = await prisma.athlete.findFirst({
              where: {
                firstName: { contains: firstName },
                lastName: { contains: lastName },
                userId: null,
              },
            });
          }

          if (athlete) {
            await prisma.athlete.update({
              where: { id: athlete.id },
              data: { userId: user.id },
            });
          }
        }
      }
    }

    // Use role-based session max age
    const maxAge = SESSION_MAX_AGE[user.role] || SESSION_MAX_AGE.athlete;
    const sessionData = JSON.stringify({ userId: user.id, role: user.role });
    const response = NextResponse.json({ user });
    response.cookies.set("pentathlon_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    // Audit log
    await auditLogger.logLogin(req, user.id, user.role, true);

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
