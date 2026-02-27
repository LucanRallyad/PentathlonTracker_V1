import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;
  const { id } = await params;
  const { startMode, totalLaps } = await req.json();

  if (!["staggered", "mass"].includes(startMode)) {
    return NextResponse.json({ error: "startMode must be 'staggered' or 'mass'" }, { status: 400 });
  }
  if (!totalLaps || totalLaps < 1) {
    return NextResponse.json({ error: "totalLaps must be >= 1" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({
    where: { competitionId: id, discipline: "laser_run" },
  });
  if (!event) return NextResponse.json({ error: "No laser run event" }, { status: 404 });

  const config = event.config ? JSON.parse(event.config) : {};

  if (!config.assignments || config.assignments.length === 0) {
    return NextResponse.json({ error: "No target assignments to release" }, { status: 400 });
  }

  config.startMode = startMode;
  config.totalLaps = totalLaps;
  config.released = true;
  config.releasedAt = new Date().toISOString();

  await prisma.event.update({
    where: { id: event.id },
    data: { config: JSON.stringify(config) },
  });

  return NextResponse.json({ success: true, config });
}
