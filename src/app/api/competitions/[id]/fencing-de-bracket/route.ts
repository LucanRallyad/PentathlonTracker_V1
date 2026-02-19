import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import {
  generateDEBracket,
  advanceWinner,
  serializeBracket,
  deserializeBracket,
  calculateFinalPlacements,
  isBracketComplete,
} from "@/lib/scoring/fencing-de-bracket";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { scoreEvents } from "@/lib/score-events";
import type { DEBracketSeed, DEMatchResult } from "@/lib/scoring/types";

// ─── Helpers: bracket config is keyed by gender+ageCategory ─────────────────
// The Event.config field stores a JSON object: { "M:Senior": <bracket>, "F:Senior": <bracket>, ... }

type BracketConfigMap = Record<string, string>; // key → serialized bracket JSON

function getBracketKey(gender: string, ageCategory: string): string {
  return `${gender}:${ageCategory}`;
}

function parseConfigMap(config: string | null): BracketConfigMap {
  if (!config) return {};
  try {
    const parsed = JSON.parse(config);
    // Handle legacy format: if it has "eventId" at top level, it's a single bracket (old format)
    if (parsed.eventId && parsed.rounds) {
      return {}; // Ignore old-format brackets — user needs to regenerate
    }
    return parsed as BracketConfigMap;
  } catch {
    return {};
  }
}

function serializeConfigMap(map: BracketConfigMap): string {
  return JSON.stringify(map);
}

function getFilters(req: NextRequest): { gender: string; ageCategory: string } {
  const url = new URL(req.url);
  return {
    gender: url.searchParams.get("gender") || "M",
    ageCategory: url.searchParams.get("ageCategory") || "Senior",
  };
}

// ─── GET: Load current bracket state ────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: competitionId } = await params;
  const { gender, ageCategory } = getFilters(req);
  const bracketKey = getBracketKey(gender, ageCategory);

  // Find the fencing_de event for this competition
  const deEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "fencing_de" },
  });

  if (!deEvent) {
    return NextResponse.json({ error: "No fencing DE event found" }, { status: 404 });
  }

  // Check if a bracket exists for this gender+category
  const configMap = parseConfigMap(deEvent.config);
  const bracketJson = configMap[bracketKey];

  if (!bracketJson) {
    // Check if we can generate one (do ranking round scores exist for this gender+category?)
    const rankingEvent = await prisma.event.findFirst({
      where: { competitionId, discipline: "fencing_ranking" },
    });

    let canGenerate = false;
    if (rankingEvent) {
      const scores = await prisma.fencingRankingScore.findMany({
        where: { eventId: rankingEvent.id },
        include: { athlete: true },
      });
      // Filter by gender + ageCategory
      const filtered = scores.filter(
        (s) => s.athlete.gender === gender && s.athlete.ageCategory === ageCategory
      );
      canGenerate = filtered.length >= 2;
    }

    return NextResponse.json({
      bracket: null,
      canGenerate,
      eventId: deEvent.id,
    });
  }

  try {
    const bracket = deserializeBracket(bracketJson);
    return NextResponse.json({
      bracket,
      canGenerate: false,
      eventId: deEvent.id,
    });
  } catch {
    return NextResponse.json({
      bracket: null,
      canGenerate: true,
      eventId: deEvent.id,
    });
  }
}

// ─── POST: Generate bracket from ranking round results ──────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;
  const body = await req.json();
  const gender = body.gender || "M";
  const ageCategory = body.ageCategory || "Senior";
  const bracketKey = getBracketKey(gender, ageCategory);

  // Find the fencing events
  const deEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "fencing_de" },
  });

  if (!deEvent) {
    return NextResponse.json({ error: "No fencing DE event found" }, { status: 404 });
  }

  const rankingEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "fencing_ranking" },
  });

  if (!rankingEvent) {
    return NextResponse.json({ error: "No fencing ranking event found" }, { status: 404 });
  }

  // Fetch ranking round scores with athlete details, filtered by gender + ageCategory
  const allRankingScores = await prisma.fencingRankingScore.findMany({
    where: { eventId: rankingEvent.id },
    include: { athlete: true },
    orderBy: [
      { calculatedPoints: "desc" },
      { victories: "desc" },
    ],
  });

  // Filter to only athletes matching the selected gender + age category
  const rankingScores = allRankingScores.filter(
    (s) => s.athlete.gender === gender && s.athlete.ageCategory === ageCategory
  );

  if (rankingScores.length < 2) {
    return NextResponse.json(
      { error: `Need at least 2 ${gender === "M" ? "Male" : "Female"} ${ageCategory} athletes with ranking round scores` },
      { status: 400 }
    );
  }

  // Build seed entries from ranking round results
  const seeds: DEBracketSeed[] = rankingScores.map((score, index) => ({
    athleteId: score.athleteId,
    seed: index + 1,
    athleteName: `${score.athlete.firstName} ${score.athlete.lastName}`,
  }));

  // Generate the bracket
  const bracket = generateDEBracket(deEvent.id, seeds);

  // Save bracket to event config (keyed by gender+category)
  const configMap = parseConfigMap(deEvent.config);
  configMap[bracketKey] = serializeBracket(bracket);

  await prisma.event.update({
    where: { id: deEvent.id },
    data: { config: serializeConfigMap(configMap) },
  });

  // Broadcast update
  scoreEvents.emit({
    competitionId,
    discipline: "fencing_de",
    athleteIds: seeds.map((s) => s.athleteId),
    timestamp: Date.now(),
  });

  return NextResponse.json({ bracket, eventId: deEvent.id });
}

// ─── PATCH: Record a match result ───────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;
  const { gender, ageCategory } = getFilters(req);
  const bracketKey = getBracketKey(gender, ageCategory);

  const body = await req.json();
  const { matchId, winnerId, score1, score2 } = body as DEMatchResult;

  if (!matchId || !winnerId || score1 == null || score2 == null) {
    return NextResponse.json(
      { error: "Missing required fields: matchId, winnerId, score1, score2" },
      { status: 400 }
    );
  }

  // Find the fencing DE event
  const deEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "fencing_de" },
  });

  if (!deEvent || !deEvent.config) {
    return NextResponse.json({ error: "No bracket found" }, { status: 404 });
  }

  const configMap = parseConfigMap(deEvent.config);
  const bracketJson = configMap[bracketKey];

  if (!bracketJson) {
    return NextResponse.json({ error: "No bracket found for this gender/category" }, { status: 404 });
  }

  // Load and update the bracket
  let bracket = deserializeBracket(bracketJson);

  try {
    bracket = advanceWinner(bracket, { matchId, winnerId, score1, score2 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to advance winner" },
      { status: 400 }
    );
  }

  // If bracket is complete, calculate and save final placements
  if (isBracketComplete(bracket)) {
    const placements = calculateFinalPlacements(bracket);
    bracket.placements = placements;

    // Upsert FencingDEScore records for all athletes with placements
    for (const [athleteId, placement] of Object.entries(placements)) {
      const calculatedPoints = calculateFencingDE({ placement });

      await prisma.fencingDEScore.upsert({
        where: {
          eventId_athleteId: { eventId: deEvent.id, athleteId },
        },
        update: { placement, calculatedPoints },
        create: {
          eventId: deEvent.id,
          athleteId,
          placement,
          calculatedPoints,
        },
      });
    }
  }

  // Save updated bracket
  configMap[bracketKey] = serializeBracket(bracket);
  await prisma.event.update({
    where: { id: deEvent.id },
    data: { config: serializeConfigMap(configMap) },
  });

  // Broadcast update
  const affectedAthleteIds: string[] = [];
  for (const round of bracket.rounds) {
    for (const match of round) {
      if (match.matchId === matchId) {
        if (match.athlete1Id) affectedAthleteIds.push(match.athlete1Id);
        if (match.athlete2Id) affectedAthleteIds.push(match.athlete2Id);
      }
    }
  }

  scoreEvents.emit({
    competitionId,
    discipline: "fencing_de",
    athleteIds: affectedAthleteIds,
    timestamp: Date.now(),
  });

  return NextResponse.json({ bracket, eventId: deEvent.id });
}

// ─── DELETE: Reset the bracket ──────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;
  const { gender, ageCategory } = getFilters(req);
  const bracketKey = getBracketKey(gender, ageCategory);

  // Find the fencing DE event
  const deEvent = await prisma.event.findFirst({
    where: { competitionId, discipline: "fencing_de" },
  });

  if (!deEvent) {
    return NextResponse.json({ error: "No fencing DE event found" }, { status: 404 });
  }

  // Remove only this gender+category bracket, keep others
  const configMap = parseConfigMap(deEvent.config);

  // Get athlete IDs from this bracket before deleting
  const bracketJson = configMap[bracketKey];
  let athleteIdsToDelete: string[] = [];
  if (bracketJson) {
    try {
      const bracket = deserializeBracket(bracketJson);
      for (const round of bracket.rounds) {
        for (const match of round) {
          if (match.athlete1Id) athleteIdsToDelete.push(match.athlete1Id);
          if (match.athlete2Id) athleteIdsToDelete.push(match.athlete2Id);
        }
      }
      athleteIdsToDelete = [...new Set(athleteIdsToDelete)];
    } catch {
      // If we can't parse, we'll just delete all DE scores for safety
    }
  }

  delete configMap[bracketKey];

  // Update config (or null if no brackets remain)
  const hasRemaining = Object.keys(configMap).length > 0;
  await prisma.event.update({
    where: { id: deEvent.id },
    data: { config: hasRemaining ? serializeConfigMap(configMap) : null },
  });

  // Delete DE scores only for athletes in this bracket
  if (athleteIdsToDelete.length > 0) {
    await prisma.fencingDEScore.deleteMany({
      where: {
        eventId: deEvent.id,
        athleteId: { in: athleteIdsToDelete },
      },
    });
  }

  // Broadcast update
  scoreEvents.emit({
    competitionId,
    discipline: "fencing_de",
    athleteIds: [],
    timestamp: Date.now(),
  });

  return NextResponse.json({ success: true });
}
