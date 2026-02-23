import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { scoreEvents } from "@/lib/score-events";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const events = await prisma.event.findMany({
    where: { competitionId: id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  // Extract and validate duration fields
  const { durationMinutes, scheduledEnd, scheduledStart, ...rest } = data;

  // If scheduledStart is provided but scheduledEnd is not, calculate it from duration
  let computedEnd = scheduledEnd || null;
  if (scheduledStart && !computedEnd && durationMinutes) {
    const start = new Date(scheduledStart);
    computedEnd = new Date(start.getTime() + durationMinutes * 60 * 1000).toISOString();
  }

  const event = await prisma.event.create({
    data: {
      ...rest,
      scheduledStart: scheduledStart || null,
      durationMinutes: durationMinutes ? parseInt(String(durationMinutes)) : null,
      scheduledEnd: computedEnd,
      competitionId: id,
    },
  });

  return NextResponse.json(event, { status: 201 });
}

// PATCH: Update event status (admin only)
// Body: { eventId: string, status: "pending" | "in_progress" | "completed" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;
  const body = await req.json();
  const { eventId, status } = body;

  if (!eventId || !status) {
    return NextResponse.json({ error: "eventId and status are required" }, { status: 400 });
  }

  const validStatuses = ["pending", "in_progress", "completed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  // Verify the event belongs to this competition
  const event = await prisma.event.findFirst({
    where: { id: eventId, competitionId },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status,
      completedAt: status === "completed" ? new Date().toISOString() : event.completedAt,
    },
  });

  // Broadcast update so public views refresh
  scoreEvents.emit({
    competitionId,
    discipline: event.discipline,
    athleteIds: [],
    timestamp: Date.now(),
  });

  return NextResponse.json(updatedEvent);
}
