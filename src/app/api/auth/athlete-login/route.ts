import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from "@/lib/audit/auditLogger";
import { dobLoginAudit } from "@/lib/security/dobLoginAudit";
import { DOBProtectionService } from "@/lib/privacy/dobProtection";
import { alertService, AlertType, AlertSeverity } from "@/lib/security/alertService";
import { athleteLoginSchema, validateRequest } from "@/lib/validation/schemas";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // DOB-specific rate limiting: 3 attempts per 10 minutes per IP
    const isLimited = await dobLoginAudit.isIpRateLimited(ip, 3, 10);
    if (isLimited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in 10 minutes." },
        { status: 429 }
      );
    }

    // Validate request body with Zod
    const validation = await validateRequest(req, athleteLoginSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { athleteId, dateOfBirth } = validation.data;

    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        country: true,
        ageCategory: true,
        dateOfBirth: true,
        dobHash: true,
      },
    });

    if (!athlete) {
      // Record failed attempt (don't reveal that athlete doesn't exist)
      await dobLoginAudit.recordAttempt(req, athleteId, false);
      await auditLogger.logDobLogin(req, athleteId, false);

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify DOB using hash-based comparison
    const dobValid = await DOBProtectionService.verifyDOB(athleteId, dateOfBirth);

    if (!dobValid) {
      await dobLoginAudit.recordAttempt(req, athleteId, false);
      await auditLogger.logDobLogin(req, athleteId, false);

      // Check for DOB scanning pattern
      const scanning = await dobLoginAudit.detectDobScanning(ip, 60);
      if (scanning.isSuspicious) {
        await alertService.createAlert(
          AlertType.DOB_SCANNING,
          AlertSeverity.CRITICAL,
          `DOB scanning detected from IP ${ip}: ${scanning.uniqueAthletes} different athletes targeted`,
          { ip, uniqueAthletes: scanning.uniqueAthletes }
        );
      }

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Success
    await dobLoginAudit.recordAttempt(req, athleteId, true);
    await auditLogger.logDobLogin(req, athleteId, true);

    // Create athlete session cookie — do NOT include DOB or raw PII
    const sessionData = JSON.stringify({
      athleteId: athlete.id,
      role: "athlete",
      name: `${athlete.firstName} ${athlete.lastName}`,
    });

    const response = NextResponse.json({
      athlete: {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        country: athlete.country,
        ageCategory: athlete.ageCategory,
      },
    });

    response.cookies.set("pentathlon_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
