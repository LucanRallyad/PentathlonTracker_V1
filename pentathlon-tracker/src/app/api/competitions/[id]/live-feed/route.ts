import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface FeedEntry {
  id: string;
  timestamp: string;
  discipline: string;
  athleteId: string;
  athleteName: string;
  country: string;
  rawInput: string;
  mpPoints: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get events for this competition
  const events = await prisma.event.findMany({
    where: { competitionId: id },
  });

  const eventIdToDisc: Record<string, string> = {};
  for (const e of events) {
    eventIdToDisc[e.id] = e.discipline;
  }

  const eventIds = events.map((e) => e.id);
  const feed: FeedEntry[] = [];

  // Fetch all score types and build a combined feed
  const [fr, de, ob, sw, lr, rd] = await Promise.all([
    prisma.fencingRankingScore.findMany({
      where: { eventId: { in: eventIds } },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.fencingDEScore.findMany({
      where: { eventId: { in: eventIds } },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.obstacleScore.findMany({
      where: { eventId: { in: eventIds } },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.swimmingScore.findMany({
      where: { eventId: { in: eventIds } },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.laserRunScore.findMany({
      where: { eventId: { in: eventIds } },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.ridingScore.findMany({
      where: { eventId: { in: eventIds } },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  for (const s of fr) {
    feed.push({
      id: s.id,
      timestamp: s.updatedAt.toISOString(),
      discipline: "fencing_ranking",
      athleteId: s.athleteId,
      athleteName: `${s.athlete.firstName} ${s.athlete.lastName}`,
      country: s.athlete.country,
      rawInput: `${s.victories} wins / ${s.totalBouts} bouts`,
      mpPoints: s.calculatedPoints,
    });
  }
  for (const s of de) {
    feed.push({
      id: s.id,
      timestamp: s.updatedAt.toISOString(),
      discipline: "fencing_de",
      athleteId: s.athleteId,
      athleteName: `${s.athlete.firstName} ${s.athlete.lastName}`,
      country: s.athlete.country,
      rawInput: s.placement > 0 ? `${ordinal(s.placement)} place` : "Eliminated",
      mpPoints: s.calculatedPoints,
    });
  }
  for (const s of ob) {
    feed.push({
      id: s.id,
      timestamp: s.updatedAt.toISOString(),
      discipline: "obstacle",
      athleteId: s.athleteId,
      athleteName: `${s.athlete.firstName} ${s.athlete.lastName}`,
      country: s.athlete.country,
      rawInput: `${s.timeSeconds.toFixed(2)}s`,
      mpPoints: s.calculatedPoints,
    });
  }
  for (const s of sw) {
    feed.push({
      id: s.id,
      timestamp: s.updatedAt.toISOString(),
      discipline: "swimming",
      athleteId: s.athleteId,
      athleteName: `${s.athlete.firstName} ${s.athlete.lastName}`,
      country: s.athlete.country,
      rawInput: formatSwimTime(s.timeHundredths),
      mpPoints: s.calculatedPoints,
    });
  }
  for (const s of lr) {
    feed.push({
      id: s.id,
      timestamp: s.updatedAt.toISOString(),
      discipline: "laser_run",
      athleteId: s.athleteId,
      athleteName: `${s.athlete.firstName} ${s.athlete.lastName}`,
      country: s.athlete.country,
      rawInput: formatMinSec(s.finishTimeSeconds),
      mpPoints: s.calculatedPoints,
    });
  }
  for (const s of rd) {
    feed.push({
      id: s.id,
      timestamp: s.updatedAt.toISOString(),
      discipline: "riding",
      athleteId: s.athleteId,
      athleteName: `${s.athlete.firstName} ${s.athlete.lastName}`,
      country: s.athlete.country,
      rawInput: `${(s.knockdowns * 7 + s.disobediences * 10 + s.timeOverSeconds + s.otherPenalties * 10)} penalty pts`,
      mpPoints: s.calculatedPoints,
    });
  }

  // Sort by timestamp desc
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(feed.slice(0, 100));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatSwimTime(hundredths: number): string {
  const totalSeconds = Math.floor(hundredths / 100);
  const h = hundredths % 100;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}.${h.toString().padStart(2, "0")}`;
}

function formatMinSec(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
