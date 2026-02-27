import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = {};

  const events = await prisma.event.findMany({
    where: { competitionId: id },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);
  where.eventId = { in: eventIds };

  if (eventId) where.eventId = eventId;
  if (status) where.status = status;

  const scores = await prisma.preliminaryScore.findMany({
    where,
    include: {
      event: true,
      athlete: true,
      volunteer: { select: { id: true, name: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(scores);
}
