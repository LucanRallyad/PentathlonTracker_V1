import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface ProposedAssignment {
  volunteerId: string;
  volunteerName: string;
  eventId: string;
  role: string;
  athleteIds: string[] | null;
  metadata: Record<string, unknown> | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const body = await req.json();
  const { eventId } = body;

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.competitionId !== id) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const existingAssignmentVolIds = (
    await prisma.volunteerAssignment.findMany({
      where: { eventId },
      select: { volunteerId: true },
    })
  ).map((a) => a.volunteerId);

  const availableVolunteers = await prisma.volunteer.findMany({
    where: {
      competitionId: id,
      status: "active",
      id: { notIn: existingAssignmentVolIds },
    },
  });

  const shuffled = shuffle(availableVolunteers);
  const config: Record<string, unknown> = event.config
    ? JSON.parse(event.config)
    : {};

  const proposed: ProposedAssignment[] = [];
  let idx = 0;

  const assignNext = (
    role: string,
    athleteIds: string[] | null,
    metadata: Record<string, unknown> | null
  ) => {
    if (idx >= shuffled.length) return;
    proposed.push({
      volunteerId: shuffled[idx].id,
      volunteerName: shuffled[idx].name,
      eventId,
      role,
      athleteIds,
      metadata,
    });
    idx++;
  };

  switch (event.discipline) {
    case "swimming": {
      const lanes = (config.laneCount as number) || 6;
      for (let lane = 1; lane <= lanes; lane++) {
        assignNext("timer", null, { lane });
      }
      break;
    }

    case "fencing_ranking": {
      const pools = (config.poolCount as number) || 2;
      for (let pool = 1; pool <= pools; pool++) {
        assignNext("referee", null, { pool });
      }
      break;
    }

    case "fencing_de": {
      const sections = (config.bracketSections as number) || 2;
      for (let section = 1; section <= sections; section++) {
        assignNext("referee", null, { bracketSection: section });
      }
      break;
    }

    case "obstacle": {
      assignNext("timer", null, { lane: 1 });
      assignNext("timer", null, { lane: 2 });
      const flaggers = (config.flaggerCount as number) || 2;
      for (let f = 1; f <= flaggers; f++) {
        assignNext("flagger", null, { position: f });
      }
      break;
    }

    case "laser_run": {
      const athletes = await prisma.competitionAthlete.findMany({
        where: { competitionId: id },
        select: { athleteId: true },
      });
      for (const ca of athletes) {
        assignNext("recorder", [ca.athleteId], null);
      }
      break;
    }

    case "riding": {
      const athletes = await prisma.competitionAthlete.findMany({
        where: { competitionId: id },
        select: { athleteId: true },
      });
      for (const ca of athletes) {
        assignNext("judge", [ca.athleteId], null);
      }
      break;
    }

    default:
      return NextResponse.json(
        { error: `Unknown discipline: ${event.discipline}` },
        { status: 400 }
      );
  }

  return NextResponse.json({
    proposed,
    totalAvailable: shuffled.length,
    totalAssigned: proposed.length,
    unassigned: shuffled.length - proposed.length,
  });
}
