import { NextRequest, NextResponse } from "next/server";
import { getVolunteerSession } from "@/lib/volunteer-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getVolunteerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    eventId,
    athleteId,
    overallTimeSeconds,
    startMode,
    handicapStartDelay,
    isPackStart,
    targetPosition,
    wave,
    gateAssignment,
    totalLaps,
    laps,
    shootTimes,
  } = body;

  if (!eventId || !athleteId || overallTimeSeconds == null) {
    return NextResponse.json({ error: "Missing required fields: eventId, athleteId, overallTimeSeconds" }, { status: 400 });
  }

  const assignment = await prisma.volunteerAssignment.findFirst({
    where: {
      volunteerId: session.volunteerId,
      eventId,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Not assigned to this event" }, { status: 403 });
  }

  if (assignment.athleteIds) {
    const allowedIds: string[] = JSON.parse(assignment.athleteIds);
    if (!allowedIds.includes(athleteId)) {
      return NextResponse.json({ error: "Not assigned to this athlete" }, { status: 403 });
    }
  }

  const data = {
    overallTimeSeconds,
    startMode: startMode || "staggered",
    handicapStartDelay: handicapStartDelay || 0,
    isPackStart: isPackStart || false,
    targetPosition: targetPosition || null,
    wave: wave || null,
    gateAssignment: gateAssignment || "A",
    totalLaps: totalLaps || 4,
    laps: laps || [],
    shootTimes: shootTimes || [],
  };

  const preliminaryScore = await prisma.preliminaryScore.create({
    data: {
      eventId,
      athleteId,
      volunteerId: session.volunteerId,
      discipline: "laser_run",
      data: JSON.stringify(data),
      status: "preliminary",
    },
  });

  return NextResponse.json({ id: preliminaryScore.id, status: "preliminary" }, { status: 201 });
}
