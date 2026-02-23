import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { calculateFencingRanking } from "@/lib/scoring/fencing-ranking";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { calculateObstacle } from "@/lib/scoring/obstacle";
import { calculateSwimming } from "@/lib/scoring/swimming";
import { calculateLaserRun } from "@/lib/scoring/laser-run";
import { calculateRiding } from "@/lib/scoring/riding";
import type { AgeCategory } from "@/lib/scoring/types";
import { scoreEvents } from "@/lib/score-events";
import {
  fencingRankingScoreSchema,
  fencingDEScoreSchema,
  obstacleScoreSchema,
  swimmingScoreSchema,
  laserRunScoreSchema,
  ridingScoreSchema,
} from "@/lib/validation/schemas";
import { z } from "zod";
import { AppError, ErrorCode } from "@/lib/errors/AppError";
import { withCsrfProtection } from "@/lib/security/csrf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ discipline: string }> }
) {
  const { discipline } = await params;
  const eventId = new URL(req.url).searchParams.get("eventId");

  const where = eventId ? { eventId } : {};

  const scoreMap: Record<string, () => Promise<unknown>> = {
    fencing_ranking: () => prisma.fencingRankingScore.findMany({ where, include: { athlete: true } }),
    fencing_de: () => prisma.fencingDEScore.findMany({ where, include: { athlete: true } }),
    obstacle: () => prisma.obstacleScore.findMany({ where, include: { athlete: true } }),
    swimming: () => prisma.swimmingScore.findMany({ where, include: { athlete: true } }),
    laser_run: () => prisma.laserRunScore.findMany({ where, include: { athlete: true } }),
    riding: () => prisma.ridingScore.findMany({ where, include: { athlete: true } }),
  };

  const fetcher = scoreMap[discipline];
  if (!fetcher) {
    return NextResponse.json({ error: "Invalid discipline" }, { status: 400 });
  }

  const scores = await fetcher();
  return NextResponse.json(scores);
}

async function postScoreHandler(
  req: NextRequest,
  { params }: { params: Promise<{ discipline: string }> }
) {
  // PROTECTED: only admins can enter scores
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { discipline } = await params;
  const body = await req.json();
  const { eventId, scores: scoreEntries } = body;

  if (!eventId || !scoreEntries || !Array.isArray(scoreEntries)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate eventId format (cuid or uuid)
  if (typeof eventId !== "string" || eventId.length < 10 || eventId.length > 50) {
    return NextResponse.json({ error: "Invalid eventId format" }, { status: 400 });
  }

  // Validate each score entry based on discipline
  const schemaMap: Record<string, z.ZodSchema> = {
    fencing_ranking: z.array(fencingRankingScoreSchema),
    fencing_de: z.array(fencingDEScoreSchema),
    obstacle: z.array(obstacleScoreSchema),
    swimming: z.array(swimmingScoreSchema),
    laser_run: z.array(laserRunScoreSchema),
    riding: z.array(ridingScoreSchema),
  };

  const schema = schemaMap[discipline];
  if (!schema) {
    return NextResponse.json({ error: "Invalid discipline" }, { status: 400 });
  }

  try {
    schema.parse(scoreEntries);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join(".");
        validationErrors[path] = err.message;
      });
      const appError = new AppError(ErrorCode.VALIDATION_FAILED, "Validation failed", validationErrors);
      return NextResponse.json(appError.toClientJSON(), { status: 400 });
    }
    return NextResponse.json({ error: "Invalid score data" }, { status: 400 });
  }

  // Get event to determine competition context
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { competition: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const ageCategory = (event.competition.ageCategory || "Senior") as AgeCategory;
  const results = [];

  for (const entry of scoreEntries) {
    let calculatedPoints = 0;
    let scoreData: Record<string, unknown> = {};

    switch (discipline) {
      case "fencing_ranking": {
        calculatedPoints = calculateFencingRanking({
          victories: entry.victories,
          totalBouts: entry.totalBouts,
        });
        scoreData = {
          victories: entry.victories,
          totalBouts: entry.totalBouts,
          calculatedPoints,
        };
        const score = await prisma.fencingRankingScore.upsert({
          where: { eventId_athleteId: { eventId, athleteId: entry.athleteId } },
          update: scoreData,
          create: { eventId, athleteId: entry.athleteId, ...scoreData } as {
            eventId: string;
            athleteId: string;
            victories: number;
            totalBouts: number;
            calculatedPoints: number;
          },
        });
        results.push(score);
        break;
      }
      case "fencing_de": {
        calculatedPoints = calculateFencingDE({ placement: entry.placement });
        scoreData = { placement: entry.placement, calculatedPoints };
        const score = await prisma.fencingDEScore.upsert({
          where: { eventId_athleteId: { eventId, athleteId: entry.athleteId } },
          update: scoreData,
          create: { eventId, athleteId: entry.athleteId, ...scoreData } as {
            eventId: string;
            athleteId: string;
            placement: number;
            calculatedPoints: number;
          },
        });
        results.push(score);
        break;
      }
      case "obstacle": {
        calculatedPoints = calculateObstacle({
          timeSeconds: entry.timeSeconds,
          penaltyPoints: entry.penaltyPoints || 0,
        });
        scoreData = {
          timeSeconds: entry.timeSeconds,
          penaltyPoints: entry.penaltyPoints || 0,
          calculatedPoints,
        };
        const score = await prisma.obstacleScore.upsert({
          where: { eventId_athleteId: { eventId, athleteId: entry.athleteId } },
          update: scoreData,
          create: { eventId, athleteId: entry.athleteId, ...scoreData } as {
            eventId: string;
            athleteId: string;
            timeSeconds: number;
            penaltyPoints: number;
            calculatedPoints: number;
          },
        });
        results.push(score);
        break;
      }
      case "swimming": {
        // Fetch athlete gender for Masters gender-specific scoring
        const swimAthlete = await prisma.athlete.findUnique({
          where: { id: entry.athleteId },
          select: { gender: true },
        });
        calculatedPoints = calculateSwimming({
          timeHundredths: entry.timeHundredths,
          penaltyPoints: entry.penaltyPoints || 0,
          ageCategory,
          gender: (swimAthlete?.gender as "M" | "F") || "M",
        });
        scoreData = {
          timeHundredths: entry.timeHundredths,
          penaltyPoints: entry.penaltyPoints || 0,
          calculatedPoints,
        };
        const score = await prisma.swimmingScore.upsert({
          where: { eventId_athleteId: { eventId, athleteId: entry.athleteId } },
          update: scoreData,
          create: { eventId, athleteId: entry.athleteId, ...scoreData } as {
            eventId: string;
            athleteId: string;
            timeHundredths: number;
            penaltyPoints: number;
            calculatedPoints: number;
          },
        });
        results.push(score);
        break;
      }
      case "laser_run": {
        calculatedPoints = calculateLaserRun({
          finishTimeSeconds: entry.finishTimeSeconds,
          penaltySeconds: entry.penaltySeconds || 0,
          ageCategory,
        });
        scoreData = {
          finishTimeSeconds: entry.finishTimeSeconds,
          handicapStartDelay: entry.handicapStartDelay || 0,
          rawDelay: entry.rawDelay || 0,
          isPackStart: entry.isPackStart || false,
          shootingStation: entry.shootingStation || 0,
          gateAssignment: entry.gateAssignment || "A",
          penaltySeconds: entry.penaltySeconds || 0,
          calculatedPoints,
        };
        const score = await prisma.laserRunScore.upsert({
          where: { eventId_athleteId: { eventId, athleteId: entry.athleteId } },
          update: scoreData,
          create: { eventId, athleteId: entry.athleteId, ...scoreData } as {
            eventId: string;
            athleteId: string;
            finishTimeSeconds: number;
            handicapStartDelay: number;
            rawDelay: number;
            isPackStart: boolean;
            shootingStation: number;
            gateAssignment: string;
            penaltySeconds: number;
            calculatedPoints: number;
          },
        });
        results.push(score);
        break;
      }
      case "riding": {
        calculatedPoints = calculateRiding({
          knockdowns: entry.knockdowns || 0,
          disobediences: entry.disobediences || 0,
          timeOverSeconds: entry.timeOverSeconds || 0,
          otherPenalties: entry.otherPenalties || 0,
        });
        scoreData = {
          knockdowns: entry.knockdowns || 0,
          disobediences: entry.disobediences || 0,
          timeOverSeconds: entry.timeOverSeconds || 0,
          otherPenalties: entry.otherPenalties || 0,
          calculatedPoints,
        };
        const score = await prisma.ridingScore.upsert({
          where: { eventId_athleteId: { eventId, athleteId: entry.athleteId } },
          update: scoreData,
          create: { eventId, athleteId: entry.athleteId, ...scoreData } as {
            eventId: string;
            athleteId: string;
            knockdowns: number;
            disobediences: number;
            timeOverSeconds: number;
            otherPenalties: number;
            calculatedPoints: number;
          },
        });
        results.push(score);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid discipline" }, { status: 400 });
    }
  }

  // ── Broadcast real-time update to all connected SSE clients ──
  const athleteIds = scoreEntries.map((e: { athleteId: string }) => e.athleteId);
  scoreEvents.emit({
    competitionId: event.competitionId,
    discipline,
    athleteIds,
    timestamp: Date.now(),
  });

  return NextResponse.json(results);
}

export const POST = withCsrfProtection(postScoreHandler);
