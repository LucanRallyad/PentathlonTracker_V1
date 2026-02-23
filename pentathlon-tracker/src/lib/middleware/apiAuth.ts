import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie, isAdminRole, resolveAthleteFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCode } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/errorHandler";

/**
 * Reusable authentication middleware for API routes.
 * These functions wrap route handlers to ensure proper authentication and authorization.
 */

type Handler<T = any> = (
  req: NextRequest,
  context: T
) => Promise<NextResponse>;

// ─── withAuth ────────────────────────────────────────────────────────────────
/**
 * Require any authenticated user (admin or athlete)
 */
export function withAuth<T = any>(
  handler: Handler<{ user: { id: string; role: string } } & T>
): Handler<T> {
  return async (req: NextRequest, context: T) => {
    const session = getSessionFromCookie(req.headers.get("cookie"));

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    let user: { id: string; role: string };

    if ("userId" in session) {
      // Admin session
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true },
      });

      if (!dbUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 401 }
        );
      }

      user = { id: dbUser.id, role: dbUser.role };
    } else if ("athleteId" in session) {
      // Athlete session
      user = { id: session.athleteId, role: "athlete" };
    } else {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    try {
      return await handler(req, { ...context, user } as any);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ─── withAdmin ───────────────────────────────────────────────────────────────
/**
 * Require admin, super_admin, or official role
 */
export function withAdmin<T = any>(
  handler: Handler<{ user: { id: string; name: string; email: string; role: string } } & T>
): Handler<T> {
  return async (req: NextRequest, context: T) => {
    const session = getSessionFromCookie(req.headers.get("cookie"));

    if (!session || !("userId" in session)) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    if (!isAdminRole(dbUser.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    try {
      return await handler(req, { ...context, user: dbUser } as any);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ─── withSuperAdmin ──────────────────────────────────────────────────────────
/**
 * Require super_admin role only
 */
export function withSuperAdmin<T = any>(
  handler: Handler<{ user: { id: string; name: string; email: string; role: string } } & T>
): Handler<T> {
  return async (req: NextRequest, context: T) => {
    const session = getSessionFromCookie(req.headers.get("cookie"));

    if (!session || !("userId" in session)) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    if (dbUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    try {
      return await handler(req, { ...context, user: dbUser } as any);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ─── withAthlete ─────────────────────────────────────────────────────────────
/**
 * Require athlete session
 */
export function withAthlete<T = any>(
  handler: Handler<{ athlete: { id: string; firstName: string; lastName: string } } & T>
): Handler<T> {
  return async (req: NextRequest, context: T) => {
    const session = getSessionFromCookie(req.headers.get("cookie"));

    if (!session || !("athleteId" in session)) {
      return NextResponse.json(
        { error: "Athlete authentication required" },
        { status: 401 }
      );
    }

    const athleteResult = await resolveAthleteFromSession(req);
    
    if (athleteResult instanceof NextResponse) {
      return athleteResult;
    }

    if (!athleteResult.athleteId) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 401 }
      );
    }

    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteResult.athleteId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 401 }
      );
    }

    try {
      return await handler(req, { ...context, athlete } as any);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
