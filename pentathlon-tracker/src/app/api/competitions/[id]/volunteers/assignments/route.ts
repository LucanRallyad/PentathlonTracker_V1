import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AssignmentInput {
  volunteerId: string;
  eventId: string;
  role: string;
  athleteIds?: string[];
  metadata?: Record<string, unknown>;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const body = await req.json();
  const { assignments } = body as { assignments: AssignmentInput[] };

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json(
      { error: "assignments must be a non-empty array" },
      { status: 400 }
    );
  }

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) {
    return NextResponse.json(
      { error: "Competition not found" },
      { status: 404 }
    );
  }

  const results = await prisma.$transaction(
    assignments.map((a) =>
      prisma.volunteerAssignment.upsert({
        where: {
          id: a.volunteerId + "_" + a.eventId,
        },
        update: {
          role: a.role,
          athleteIds: a.athleteIds ? JSON.stringify(a.athleteIds) : null,
          metadata: a.metadata ? JSON.stringify(a.metadata) : null,
        },
        create: {
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

  return NextResponse.json(results);
}
