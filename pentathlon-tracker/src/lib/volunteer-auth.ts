import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const VOLUNTEER_COOKIE = "volunteer_session";

export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface VolunteerSession {
  volunteerId: string;
  competitionId: string;
  name: string;
  role: "volunteer";
}

export async function getVolunteerSession(): Promise<VolunteerSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(VOLUNTEER_COOKIE);
  if (!sessionCookie?.value) return null;

  try {
    const session = JSON.parse(sessionCookie.value) as VolunteerSession;

    const volunteer = await prisma.volunteer.findUnique({
      where: { id: session.volunteerId },
      include: { competition: true },
    });

    if (!volunteer || volunteer.status !== "active") return null;
    if (new Date() > volunteer.expiresAt) return null;

    await prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { lastActiveAt: new Date() },
    });

    return session;
  } catch {
    return null;
  }
}

export async function setVolunteerSession(session: VolunteerSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(VOLUNTEER_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearVolunteerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(VOLUNTEER_COOKIE);
}

export async function requireVolunteer(): Promise<VolunteerSession> {
  const session = await getVolunteerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getVolunteerAssignment(volunteerId: string) {
  return prisma.volunteerAssignment.findFirst({
    where: { volunteerId },
    include: {
      event: {
        include: { competition: true },
      },
    },
  });
}
