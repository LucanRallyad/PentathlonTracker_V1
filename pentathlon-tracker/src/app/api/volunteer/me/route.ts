import { NextResponse } from "next/server";
import { getVolunteerSession, getVolunteerAssignment } from "@/lib/volunteer-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getVolunteerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const volunteer = await prisma.volunteer.findUnique({
      where: { id: session.volunteerId },
      include: { competition: true },
    });

    if (!volunteer) {
      return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
    }

    const assignment = await getVolunteerAssignment(session.volunteerId);

    return NextResponse.json({
      name: volunteer.name,
      competitionName: volunteer.competition.name,
      assignment: assignment
        ? {
            id: assignment.id,
            role: assignment.role,
            event: {
              id: assignment.event.id,
              discipline: assignment.event.discipline,
              competition: { name: assignment.event.competition.name },
            },
            metadata: assignment.metadata,
            athleteIds: assignment.athleteIds,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
