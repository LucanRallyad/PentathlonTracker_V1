import { prisma } from "@/lib/prisma";
import { calculateSwimming } from "@/lib/scoring/swimming";
import { calculateFencingRanking } from "@/lib/scoring/fencing-ranking";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { calculateObstacle } from "@/lib/scoring/obstacle";
import { calculateLaserRun } from "@/lib/scoring/laser-run";
import { calculateRiding } from "@/lib/scoring/riding";
import type { AgeCategory } from "@/lib/scoring/types";

/**
 * Promote preliminary score data to the official discipline score table.
 * Returns the ID of the created/updated official score record.
 */
export async function promoteScore(
  discipline: string,
  eventId: string,
  athleteId: string,
  data: Record<string, unknown>,
  ageCategory: string
): Promise<string> {
  const age = (ageCategory || "Senior") as AgeCategory;

  switch (discipline) {
    case "swimming": {
      const timeHundredths = data.timeHundredths as number;
      const penaltyPoints = (data.penaltyPoints as number) || 0;
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: { gender: true },
      });
      const calculatedPoints = calculateSwimming({
        timeHundredths,
        penaltyPoints,
        ageCategory: age,
        gender: (athlete?.gender as "M" | "F") || "M",
      });
      const score = await prisma.swimmingScore.upsert({
        where: { eventId_athleteId: { eventId, athleteId } },
        update: { timeHundredths, penaltyPoints, calculatedPoints },
        create: {
          eventId,
          athleteId,
          timeHundredths,
          penaltyPoints,
          calculatedPoints,
        },
      });
      return score.id;
    }

    case "fencing_ranking": {
      const victories = data.victories as number;
      const totalBouts = data.totalBouts as number;
      const calculatedPoints = calculateFencingRanking({ victories, totalBouts });
      const score = await prisma.fencingRankingScore.upsert({
        where: { eventId_athleteId: { eventId, athleteId } },
        update: { victories, totalBouts, calculatedPoints },
        create: { eventId, athleteId, victories, totalBouts, calculatedPoints },
      });
      return score.id;
    }

    case "fencing_de": {
      const placement = data.placement as number;
      const calculatedPoints = calculateFencingDE({ placement });
      const score = await prisma.fencingDEScore.upsert({
        where: { eventId_athleteId: { eventId, athleteId } },
        update: { placement, calculatedPoints },
        create: { eventId, athleteId, placement, calculatedPoints },
      });
      return score.id;
    }

    case "obstacle": {
      const timeSeconds = data.timeSeconds as number;
      const penaltyPoints = (data.penaltyPoints as number) || 0;
      const calculatedPoints = calculateObstacle({ timeSeconds, penaltyPoints });
      const score = await prisma.obstacleScore.upsert({
        where: { eventId_athleteId: { eventId, athleteId } },
        update: { timeSeconds, penaltyPoints, calculatedPoints },
        create: {
          eventId,
          athleteId,
          timeSeconds,
          penaltyPoints,
          calculatedPoints,
        },
      });
      return score.id;
    }

    case "laser_run": {
      const overallTimeSeconds = data.overallTimeSeconds as number | undefined;
      const finishTimeSeconds =
        (data.finishTimeSeconds as number | undefined) ?? overallTimeSeconds ?? 0;
      const penaltySeconds = (data.penaltySeconds as number) ?? 0;
      const handicapStartDelay = (data.handicapStartDelay as number) ?? 0;
      const rawDelay = (data.rawDelay as number) ?? 0;
      const isPackStart = (data.isPackStart as boolean) ?? false;
      const startMode = (data.startMode as string) ?? "staggered";
      const shootingStation = (data.shootingStation as number) ?? 0;
      const gateAssignment = (data.gateAssignment as string) ?? "A";
      const totalShootTimeSeconds = data.totalShootTimeSeconds as number | undefined;
      const totalRunTimeSeconds = data.totalRunTimeSeconds as number | undefined;
      const adjustedTimeSeconds = data.adjustedTimeSeconds as number | undefined;
      const shootingDetail = data.shootingDetail as string | undefined;

      const calculatedPoints = calculateLaserRun({
        finishTimeSeconds,
        overallTimeSeconds,
        penaltySeconds,
        ageCategory: age,
      });

      const scoreData = {
        finishTimeSeconds,
        overallTimeSeconds: overallTimeSeconds ?? null,
        handicapStartDelay,
        rawDelay,
        isPackStart,
        startMode,
        shootingStation,
        gateAssignment,
        penaltySeconds,
        totalShootTimeSeconds: totalShootTimeSeconds ?? null,
        totalRunTimeSeconds: totalRunTimeSeconds ?? null,
        adjustedTimeSeconds: adjustedTimeSeconds ?? null,
        shootingDetail: shootingDetail ?? null,
        calculatedPoints,
      };

      const score = await prisma.laserRunScore.upsert({
        where: { eventId_athleteId: { eventId, athleteId } },
        update: scoreData,
        create: { eventId, athleteId, ...scoreData },
      });
      return score.id;
    }

    case "riding": {
      const knockdowns = (data.knockdowns as number) || 0;
      const disobediences = (data.disobediences as number) || 0;
      const timeOverSeconds = (data.timeOverSeconds as number) || 0;
      const otherPenalties = (data.otherPenalties as number) || 0;
      const calculatedPoints = calculateRiding({
        knockdowns,
        disobediences,
        timeOverSeconds,
        otherPenalties,
      });
      const score = await prisma.ridingScore.upsert({
        where: { eventId_athleteId: { eventId, athleteId } },
        update: {
          knockdowns,
          disobediences,
          timeOverSeconds,
          otherPenalties,
          calculatedPoints,
        },
        create: {
          eventId,
          athleteId,
          knockdowns,
          disobediences,
          timeOverSeconds,
          otherPenalties,
          calculatedPoints,
        },
      });
      return score.id;
    }

    default:
      throw new Error(`Unknown discipline: ${discipline}`);
  }
}
