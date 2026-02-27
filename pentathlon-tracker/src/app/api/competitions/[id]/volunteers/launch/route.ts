import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ProposedAssignment {
  volunteerId: string;
  eventId: string;
  role: string;
  athleteIds?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const body = await req.json();
  const { eventId, assignments } = body as {
    eventId: string;
    assignments: ProposedAssignment[];
  };

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

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json(
      { error: "assignments must be a non-empty array" },
      { status: 400 }
    );
  }

  await prisma.volunteerAssignment.deleteMany({ where: { eventId } });

  const created = await prisma.$transaction(
    assignments.map((a) =>
      prisma.volunteerAssignment.create({
        data: {
          volunteerId: a.volunteerId,
          eventId: a.eventId,
          role: a.role,
          athleteIds: a.athleteIds ? JSON.stringify(a.athleteIds) : null,
          metadata: a.metadata ? JSON.stringify(a.metadata) : null,
          assignedBy: adminOrError.id,
        },
      })
    )
  );

  return NextResponse.json({
    success: true,
    assignmentsCreated: created.length,
  });
}
