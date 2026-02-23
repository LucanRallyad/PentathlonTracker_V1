import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = getSessionFromCookie(req.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ user: null });
  }

  // User-based session (admin, official, registered athlete)
  if ("userId" in session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // If athlete role, also resolve their linked athlete ID
    let athleteId: string | null = null;
    if (user.role === "athlete") {
      const athlete = await prisma.athlete.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      athleteId = athlete?.id ?? null;
    }

    return NextResponse.json({
      user: { ...user, athleteId },
    });
  }

  // Athlete-login session (DOB-based, no User record)
  if ("athleteId" in session && session.role === "athlete") {
    const athlete = await prisma.athlete.findUnique({
      where: { id: session.athleteId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!athlete) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: `athlete_${athlete.id}`,
        name: `${athlete.firstName} ${athlete.lastName}`,
        email: null,
        role: "athlete",
        athleteId: athlete.id,
      },
    });
  }

  return NextResponse.json({ user: null });
}
