import { NextRequest, NextResponse } from "next/server";
import { getVolunteerSession } from "@/lib/volunteer-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getVolunteerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { eventId, athleteId, discipline, data } = body;

    if (!eventId || !athleteId || !discipline || !data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof eventId !== "string" || typeof athleteId !== "string" || typeof discipline !== "string") {
      return NextResponse.json({ error: "Invalid field types" }, { status: 400 });
    }

    const assignment = await prisma.volunteerAssignment.findFirst({
      where: {
        volunteerId: session.volunteerId,
        eventId,
      },
      include: { event: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Not assigned to this event" }, { status: 403 });
    }

    if (assignment.event.discipline !== discipline) {
      return NextResponse.json({ error: "Discipline does not match event" }, { status: 400 });
    }

    if (assignment.athleteIds) {
      try {
        const allowedIds: string[] = JSON.parse(assignment.athleteIds);
        if (!Array.isArray(allowedIds) || !allowedIds.includes(athleteId)) {
          return NextResponse.json({ error: "Not assigned to this athlete" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    const preliminaryScore = await prisma.preliminaryScore.create({
      data: {
        eventId,
        athleteId,
        volunteerId: session.volunteerId,
        discipline,
        data: JSON.stringify(data),
        status: "preliminary",
      },
    });

    return NextResponse.json({ id: preliminaryScore.id, status: "preliminary" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
