import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLaserRun } from "@/lib/scoring/laser-run";
import type { AgeCategory } from "@/lib/scoring/types";

interface LapData {
  lapNumber: number;
  runTimeSeconds?: number;
  shootTimeSeconds?: number;
  totalLapTimeSeconds?: number;
}

interface ShootTimeData {
  lapNumber: number;
  shootTimeSeconds: number;
  hits?: number;
  misses?: number;
}

interface LaserRunTimerData {
  overallTimeSeconds: number;
  startMode: string;
  handicapStartDelay: number;
  isPackStart: boolean;
  targetPosition: number | null;
  wave: number | null;
  gateAssignment: string;
  totalLaps: number;
  laps: LapData[];
  shootTimes: ShootTimeData[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { competitionId: id, discipline: "laser_run" },
  });
  if (!event) return NextResponse.json({ error: "No laser run event" }, { status: 404 });

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: { ageCategory: true },
  });
  const ageCategory = (competition?.ageCategory || "Senior") as AgeCategory;

  const verifiedScores = await prisma.preliminaryScore.findMany({
    where: {
      eventId: event.id,
      discipline: "laser_run",
      status: "verified",
    },
    include: { athlete: true },
  });

  if (verifiedScores.length === 0) {
    return NextResponse.json({ error: "No verified laser run scores to aggregate" }, { status: 400 });
  }

  const results: Array<{
    athleteId: string;
    athleteName: string;
    overallTimeSeconds: number;
    totalShootTimeSeconds: number;
    totalRunTimeSeconds: number;
    adjustedTimeSeconds: number | null;
    calculatedPoints: number;
  }> = [];

  for (const ps of verifiedScores) {
    let data: LaserRunTimerData;
    try {
      data = JSON.parse(ps.data) as LaserRunTimerData;
    } catch {
      continue;
    }

    const totalShootTimeSeconds = (data.shootTimes || []).reduce(
      (sum: number, st: ShootTimeData) => sum + (st.shootTimeSeconds || 0),
      0
    );
    const totalRunTimeSeconds = data.overallTimeSeconds - totalShootTimeSeconds;

    let adjustedTimeSeconds: number | null = null;
    if (data.startMode === "mass" && data.handicapStartDelay > 0) {
      adjustedTimeSeconds = data.overallTimeSeconds - data.handicapStartDelay;
    }

    const perLapBreakdown = (data.laps || []).map((lap: LapData) => {
      const matchingShoot = (data.shootTimes || []).find(
        (st: ShootTimeData) => st.lapNumber === lap.lapNumber
      );
      return {
        lapNumber: lap.lapNumber,
        runTimeSeconds: lap.runTimeSeconds || 0,
        shootTimeSeconds: matchingShoot?.shootTimeSeconds || 0,
        totalLapTimeSeconds: lap.totalLapTimeSeconds || 0,
        hits: matchingShoot?.hits,
        misses: matchingShoot?.misses,
      };
    });

    const shootingDetail = JSON.stringify({
      laps: perLapBreakdown,
      shootTimes: data.shootTimes || [],
      totalLaps: data.totalLaps,
      targetPosition: data.targetPosition,
      wave: data.wave,
      gateAssignment: data.gateAssignment,
    });

    const finishTime = adjustedTimeSeconds ?? data.overallTimeSeconds;
    const calculatedPoints = calculateLaserRun({
      finishTimeSeconds: finishTime,
      penaltySeconds: 0,
      ageCategory,
    });

    await prisma.laserRunScore.upsert({
      where: { eventId_athleteId: { eventId: event.id, athleteId: ps.athleteId } },
      update: {
        finishTimeSeconds: data.overallTimeSeconds,
        overallTimeSeconds: data.overallTimeSeconds,
        handicapStartDelay: data.handicapStartDelay || 0,
        rawDelay: data.handicapStartDelay || 0,
        isPackStart: data.isPackStart || false,
        startMode: data.startMode || "staggered",
        shootingStation: data.targetPosition || 0,
        gateAssignment: data.gateAssignment || "A",
        totalShootTimeSeconds: totalShootTimeSeconds,
        totalRunTimeSeconds: totalRunTimeSeconds,
        adjustedTimeSeconds: adjustedTimeSeconds,
        shootingDetail: shootingDetail,
        calculatedPoints,
      },
      create: {
        eventId: event.id,
        athleteId: ps.athleteId,
        finishTimeSeconds: data.overallTimeSeconds,
        overallTimeSeconds: data.overallTimeSeconds,
        handicapStartDelay: data.handicapStartDelay || 0,
        rawDelay: data.handicapStartDelay || 0,
        isPackStart: data.isPackStart || false,
        startMode: data.startMode || "staggered",
        shootingStation: data.targetPosition || 0,
        gateAssignment: data.gateAssignment || "A",
        totalShootTimeSeconds: totalShootTimeSeconds,
        totalRunTimeSeconds: totalRunTimeSeconds,
        adjustedTimeSeconds: adjustedTimeSeconds,
        shootingDetail: shootingDetail,
        calculatedPoints,
      },
    });

    results.push({
      athleteId: ps.athleteId,
      athleteName: `${ps.athlete.firstName} ${ps.athlete.lastName}`,
      overallTimeSeconds: data.overallTimeSeconds,
      totalShootTimeSeconds,
      totalRunTimeSeconds,
      adjustedTimeSeconds,
      calculatedPoints,
    });
  }

  return NextResponse.json({
    aggregated: results.length,
    results,
  });
}
