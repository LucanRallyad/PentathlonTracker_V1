import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const passwordValid = await compare(password, user.passwordHash);
  if (!passwordValid) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// Session types
export type AdminSession = { userId: string; role: "super_admin" | "admin" | "official" };
export type AthleteSession = { athleteId: string; role: "athlete"; name: string };
export type Session = AdminSession | AthleteSession;

// Helper to check if a role has admin-level access
export function isAdminRole(role: string): boolean {
  return role === "super_admin" || role === "admin" || role === "official";
}

// Helper to check if a role is super_admin
export function isSuperAdmin(role: string): boolean {
  return role === "super_admin";
}

// Simple session-based auth using cookies
// For production, use NextAuth.js or similar
export function getSessionFromCookie(cookieHeader: string | null): Session | null {
  if (!cookieHeader) return null;
  
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  const session = cookies["pentathlon_session"];
  if (!session) return null;

  try {
    return JSON.parse(decodeURIComponent(session));
  } catch {
    return null;
  }
}

// ─── Admin guard helper ──────────────────────────────────────────────────────
// Returns the admin user if authenticated, or a 401/403 NextResponse error.

export async function requireAdmin(
  req: NextRequest
): Promise<{ id: string; name: string; email: string; role: string } | NextResponse> {
  const session = getSessionFromCookie(req.headers.get("cookie"));

  if (!session || !("userId" in session)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return user;
}

// ─── Super Admin guard helper ─────────────────────────────────────────────────
// Returns the super admin user if authenticated, or a 401/403 NextResponse error.

export async function requireSuperAdmin(
  req: NextRequest
): Promise<{ id: string; name: string; email: string; role: string } | NextResponse> {
  const session = getSessionFromCookie(req.headers.get("cookie"));

  if (!session || !("userId" in session)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  if (!isSuperAdmin(user.role)) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  return user;
}

// ─── Athlete ownership guard ──────────────────────────────────────────────────
// Resolves the currently logged-in user's athlete ID from either session type.
// Returns { athleteId, isAdmin } or a 401 NextResponse.

export async function resolveAthleteFromSession(
  req: NextRequest
): Promise<{ athleteId: string; isAdmin: boolean } | NextResponse> {
  const session = getSessionFromCookie(req.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // User-based session (admin/official/registered athlete)
  if ("userId" in session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const isAdmin = isAdminRole(user.role);

    // Admins don't need to be linked to an athlete
    if (isAdmin) {
      return { athleteId: "", isAdmin: true };
    }

    // For athlete users, look up their linked athlete
    const athlete = await prisma.athlete.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!athlete) {
      return NextResponse.json({ error: "No athlete profile linked to your account" }, { status: 403 });
    }

    return { athleteId: athlete.id, isAdmin: false };
  }

  // Athlete-login session (DOB-based)
  if ("athleteId" in session && session.role === "athlete") {
    const athlete = await prisma.athlete.findUnique({
      where: { id: session.athleteId },
      select: { id: true },
    });

    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 401 });
    }

    return { athleteId: athlete.id, isAdmin: false };
  }

  return NextResponse.json({ error: "Invalid session" }, { status: 401 });
}

// Helper to check if the result is an error response
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
