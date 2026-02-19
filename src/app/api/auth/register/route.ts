import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from "@/lib/audit/auditLogger";
import { passwordPolicy } from "@/lib/security/passwordPolicy";
import { checkRateLimit, RATE_LIMIT_TIERS } from "@/lib/middleware/withRateLimit";
import { sanitizeString } from "@/lib/validation/sanitize";
import { MinorProtectionService } from "@/lib/privacy/minorProtection";
import { registerSchema, validateRequest } from "@/lib/validation/schemas";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`auth:register:${ip}`, RATE_LIMIT_TIERS.auth);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    // Validate request body with Zod
    const validation = await validateRequest(req, registerSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { email, password, name } = validation.data;
    const sanitizedEmail = sanitizeString(email).toLowerCase().trim();
    const sanitizedName = name ? sanitizeString(name) : undefined;

    // Validate password complexity
    const complexity = passwordPolicy.validateComplexity(password);
    if (!complexity.valid) {
      return NextResponse.json({ error: complexity.errors[0] }, { status: 400 });
    }

    // SECURITY: Public registration is ALWAYS athlete role.
    const userRole = "athlete";
    const userName = sanitizedName?.trim() || sanitizedEmail.split("@")[0];

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: sanitizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Hash password and create user
    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: userName,
        email: sanitizedEmail,
        passwordHash,
        role: userRole,
        passwordChangedAt: new Date(),
      },
    });

    // Record in password history
    await passwordPolicy.recordPasswordHistory(user.id, passwordHash);

    // Auto-link to existing Athlete record if name matches
    if (userName) {
      const nameParts = userName.trim().split(/\s+/);
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

          // Update minor status for linked athlete
          await MinorProtectionService.updateMinorStatus(athlete.id);
        }
      }
    }

    // Auto-login: create session cookie
    const sessionData = JSON.stringify({ userId: user.id, role: user.role });
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("pentathlon_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours for athletes
      path: "/",
    });

    await auditLogger.logFromRequest(req, AuditEventType.AUTH_REGISTER, AuditAction.CREATE, {
      severity: AuditSeverity.INFO,
      targetType: "User",
      targetId: user.id,
      details: { role: userRole },
      responseStatus: 201,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
