import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { competitionId: id, discipline: "laser_run" },
  });
  if (!event) return NextResponse.json({ error: "No laser run event" }, { status: 404 });

  const config = event.config ? JSON.parse(event.config) : {};
  return NextResponse.json(config);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;
  const { id } = await params;
  const { targetCount } = await req.json();

  if (!targetCount || targetCount < 1) {
    return NextResponse.json({ error: "targetCount must be >= 1" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({
    where: { competitionId: id, discipline: "laser_run" },
  });
  if (!event) return NextResponse.json({ error: "No laser run event" }, { status: 404 });

  const competitionAthletes = await prisma.competitionAthlete.findMany({
    where: { competitionId: id },
    include: { athlete: true },
  });

  const events = await prisma.event.findMany({
    where: { competitionId: id },
  });

  const athletePoints: Array<{ athleteId: string; name: string; points: number }> = [];

  for (const ca of competitionAthletes) {
    let total = 0;
    for (const ev of events) {
      if (ev.discipline === "laser_run") continue;
      const scores = await Promise.all([
        prisma.swimmingScore.findUnique({ where: { eventId_athleteId: { eventId: ev.id, athleteId: ca.athleteId } } }),
        prisma.fencingRankingScore.findUnique({ where: { eventId_athleteId: { eventId: ev.id, athleteId: ca.athleteId } } }),
        prisma.fencingDEScore.findUnique({ where: { eventId_athleteId: { eventId: ev.id, athleteId: ca.athleteId } } }),
        prisma.obstacleScore.findUnique({ where: { eventId_athleteId: { eventId: ev.id, athleteId: ca.athleteId } } }),
        prisma.ridingScore.findUnique({ where: { eventId_athleteId: { eventId: ev.id, athleteId: ca.athleteId } } }),
      ]);
      for (const s of scores) {
        if (s) total += s.calculatedPoints;
      }
    }
    athletePoints.push({
      athleteId: ca.athleteId,
      name: `${ca.athlete.firstName} ${ca.athlete.lastName}`,
      points: total,
    });
  }

  athletePoints.sort((a, b) => b.points - a.points);

  const assignments = athletePoints.map((ap, idx) => ({
    targetPosition: (idx % targetCount) + 1,
    athleteId: ap.athleteId,
    athleteName: ap.name,
    wave: Math.floor(idx / targetCount) + 1,
    rank: idx + 1,
    points: ap.points,
  }));

  const existingConfig = event.config ? JSON.parse(event.config) : {};
  const newConfig = {
    ...existingConfig,
    targetCount,
    assignments,
    released: existingConfig.released || false,
  };

  await prisma.event.update({
    where: { id: event.id },
    data: { config: JSON.stringify(newConfig) },
  });

  return NextResponse.json(newConfig);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;
  const { id } = await params;
  const { assignments } = await req.json();

  const event = await prisma.event.findFirst({
    where: { competitionId: id, discipline: "laser_run" },
  });
  if (!event) return NextResponse.json({ error: "No laser run event" }, { status: 404 });

  const config = event.config ? JSON.parse(event.config) : {};
  config.assignments = assignments;

  await prisma.event.update({
    where: { id: event.id },
    data: { config: JSON.stringify(config) },
  });

  return NextResponse.json(config);
}
