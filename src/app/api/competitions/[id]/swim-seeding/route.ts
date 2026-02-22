import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";

/**
 * Swim seeding data is stored in the swimming Event's `config` JSON field:
 * {
 *   published: boolean,
 *   heats: Array<{ heatNumber, assignments: Array<{ lane, athleteId, firstName, lastName, country, ageCategory, gender, seedTime, seedHundredths }> }>
 * }
 */

interface SeedingAssignment {
  lane: number;
  athleteId: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  seedTime: string;
  seedHundredths: number;
}

interface SeedingHeat {
  heatNumber: number;
  gender: string;
  assignments: SeedingAssignment[];
}

interface SeedingConfig {
  published: boolean;
  heats: SeedingHeat[];
}

interface SwimmerData {
  athleteId: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  bestTime: number;
  avgTime: number;
}

// Lane assignment order: fastest swimmer → lane 4, then 5, 3, 6, 2, 7, 1, 8
const LANES = 8;
const LANE_ORDER = [4, 5, 3, 6, 2, 7, 1, 8];

function generateHeatsForGroup(
  swimmers: SwimmerData[],
  startHeatNumber: number,
  gender: string
): SeedingHeat[] {
  if (swimmers.length === 0) return [];

  // Sort: athletes with times first (by best time, tiebreak by avg time), then NT
  const sorted = [...swimmers].sort((a, b) => {
    if (a.bestTime === 0 && b.bestTime === 0) return 0;
    if (a.bestTime === 0) return 1;
    if (b.bestTime === 0) return -1;
    if (a.bestTime !== b.bestTime) return a.bestTime - b.bestTime;
    return a.avgTime - b.avgTime;
  });

  // NT swimmers first (early/slow heats), timed slowest→fastest
  const withTime = sorted.filter((s) => s.bestTime > 0);
  const noTime = sorted.filter((s) => s.bestTime === 0);
  const orderedForHeats = [...noTime, ...withTime.slice().reverse()];

  const totalHeats = Math.ceil(orderedForHeats.length / LANES);
  const heatGroups: SwimmerData[][] = [];
  for (let i = 0; i < totalHeats; i++) {
    heatGroups.push(orderedForHeats.slice(i * LANES, (i + 1) * LANES));
  }

  return heatGroups.map((group, idx) => {
    // Within each heat, sort by seed time (fastest first for lane assignment)
    const heatSorted = [...group].sort((a, b) => {
      if (a.bestTime === 0 && b.bestTime === 0) return 0;
      if (a.bestTime === 0) return 1;
      if (b.bestTime === 0) return -1;
      return a.bestTime - b.bestTime;
    });

    const assignments: SeedingAssignment[] = heatSorted.map((s, i) => ({
      lane: LANE_ORDER[i],
      athleteId: s.athleteId,
      firstName: s.firstName,
      lastName: s.lastName,
      country: s.country,
      ageCategory: s.ageCategory,
      gender: s.gender,
      seedTime: formatHundredths(s.bestTime),
      seedHundredths: s.bestTime,
    }));

    // Sort by lane for display
    assignments.sort((a, b) => a.lane - b.lane);

    return { heatNumber: startHeatNumber + idx, gender, assignments };
  });
}

function formatHundredths(h: number): string {
  if (h <= 0) return "NT";
  const mins = Math.floor(h / 6000);
  const secs = Math.floor((h % 6000) / 100);
  const hh = h % 100;
  return `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
}

// ─── GET: Load current swim seeding ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: competitionId } = await params;

  const swimEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "swimming" },
  });

  if (!swimEvent) {
    return NextResponse.json({ error: "No swimming event found" }, { status: 404 });
  }

  // Parse existing seeding config
  let seeding: SeedingConfig | null = null;
  if (swimEvent.config) {
    try {
      seeding = JSON.parse(swimEvent.config) as SeedingConfig;
    } catch {
      seeding = null;
    }
  }

  return NextResponse.json({
    seeding,
    eventId: swimEvent.id,
  });
}

// ─── POST: Generate swim seeding from athlete profile best times ────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;

  // Accept optional manual seed times from the request body
  let manualSeedTimes: Record<string, number> = {};
  try {
    const body = await req.json();
    if (body.manualSeedTimes && typeof body.manualSeedTimes === "object") {
      manualSeedTimes = body.manualSeedTimes as Record<string, number>;
    }
  } catch {
    // No body or invalid JSON – proceed with database times only
  }

  const swimEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "swimming" },
  });

  if (!swimEvent) {
    return NextResponse.json({ error: "No swimming event found" }, { status: 404 });
  }

  // Get all athletes in this competition
  const competitionAthletes = await prisma.competitionAthlete.findMany({
    where: { competitionId },
    include: { athlete: true },
  });

  if (competitionAthletes.length === 0) {
    return NextResponse.json({ error: "No athletes in this competition" }, { status: 400 });
  }

  // For each athlete, find their best swim time from all historical swimming scores
  const athleteIds = competitionAthletes.map((ca) => ca.athleteId);
  const allSwimScores = await prisma.swimmingScore.findMany({
    where: { athleteId: { in: athleteIds } },
    select: { athleteId: true, timeHundredths: true },
  });

  // Group scores by athlete
  const scoresByAthlete = new Map<string, number[]>();
  for (const s of allSwimScores) {
    if (s.timeHundredths > 0) {
      const arr = scoresByAthlete.get(s.athleteId) || [];
      arr.push(s.timeHundredths);
      scoresByAthlete.set(s.athleteId, arr);
    }
  }

  // Build seeded swimmer list
  const swimmers: SwimmerData[] = competitionAthletes.map((ca) => {
    // Use manual seed time if provided, otherwise fall back to database best time
    const manualTime = manualSeedTimes[ca.athleteId];
    const times = scoresByAthlete.get(ca.athleteId) || [];
    const bestTime = manualTime != null ? manualTime : (times.length > 0 ? Math.min(...times) : 0);
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    return {
      athleteId: ca.athleteId,
      firstName: ca.athlete.firstName,
      lastName: ca.athlete.lastName,
      country: ca.athlete.country,
      ageCategory: ca.ageCategory || ca.athlete.ageCategory,
      gender: ca.athlete.gender,
      bestTime,
      avgTime,
    };
  });

  // Split by gender
  const maleSwimmers = swimmers.filter(s => s.gender === "M");
  const femaleSwimmers = swimmers.filter(s => s.gender === "F");

  // Generate heats per gender: females first, then males
  const femaleHeats = generateHeatsForGroup(femaleSwimmers, 1, "F");
  const maleHeats = generateHeatsForGroup(maleSwimmers, femaleHeats.length + 1, "M");
  const heats = [...femaleHeats, ...maleHeats];

  // Preserve published state if it already exists
  let published = false;
  if (swimEvent.config) {
    try {
      const existing = JSON.parse(swimEvent.config) as SeedingConfig;
      published = existing.published || false;
    } catch { /* ignore */ }
  }

  const seeding: SeedingConfig = { published, heats };

  await prisma.event.update({
    where: { id: swimEvent.id },
    data: { config: JSON.stringify(seeding) },
  });

  return NextResponse.json({ seeding, eventId: swimEvent.id });
}

// ─── PATCH: Update seeding (reorder lanes, publish/unpublish) ───────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;
  const body = await req.json();

  const swimEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "swimming" },
  });

  if (!swimEvent || !swimEvent.config) {
    return NextResponse.json({ error: "No swim seeding found" }, { status: 404 });
  }

  let seeding: SeedingConfig;
  try {
    seeding = JSON.parse(swimEvent.config) as SeedingConfig;
  } catch {
    return NextResponse.json({ error: "Invalid seeding data" }, { status: 500 });
  }

  // Handle publish/unpublish
  if (typeof body.published === "boolean") {
    seeding.published = body.published;
  }

  // Handle heat/lane updates
  if (body.heats && Array.isArray(body.heats)) {
    seeding.heats = body.heats;
  }

  await prisma.event.update({
    where: { id: swimEvent.id },
    data: { config: JSON.stringify(seeding) },
  });

  return NextResponse.json({ seeding, eventId: swimEvent.id });
}

// ─── DELETE: Clear swim seeding ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;

  const swimEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "swimming" },
  });

  if (!swimEvent) {
    return NextResponse.json({ error: "No swimming event found" }, { status: 404 });
  }

  await prisma.event.update({
    where: { id: swimEvent.id },
    data: { config: null },
  });

  return NextResponse.json({ success: true });
}
