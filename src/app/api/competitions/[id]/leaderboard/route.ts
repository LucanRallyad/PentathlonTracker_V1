import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface LeaderboardEntry {
  athleteId: string;
  athleteName: string;
  country: string;
  gender: string;
  ageCategory: string;
  fencingRanking: number | null;
  fencingDE: number | null;
  obstacle: number | null;
  swimming: number | null;
  laserRun: number | null;
  riding: number | null;
  total: number;
  rank: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get all athletes in this competition
  const compAthletes = await prisma.competitionAthlete.findMany({
    where: { competitionId: id },
    include: { athlete: true },
  });

  // Get all events
  const events = await prisma.event.findMany({
    where: { competitionId: id },
  });

  // Build event ID lookup by discipline
  const eventByDiscipline: Record<string, string> = {};
  for (const event of events) {
    eventByDiscipline[event.discipline] = event.id;
  }

  // Fetch all scores
  const [fencingRankingScores, fencingDEScores, obstacleScores, swimmingScores, laserRunScores, ridingScores] =
    await Promise.all([
      eventByDiscipline.fencing_ranking
        ? prisma.fencingRankingScore.findMany({
            where: { eventId: eventByDiscipline.fencing_ranking },
          })
        : Promise.resolve([]),
      eventByDiscipline.fencing_de
        ? prisma.fencingDEScore.findMany({
            where: { eventId: eventByDiscipline.fencing_de },
          })
        : Promise.resolve([]),
      eventByDiscipline.obstacle
        ? prisma.obstacleScore.findMany({
            where: { eventId: eventByDiscipline.obstacle },
          })
        : Promise.resolve([]),
      eventByDiscipline.swimming
        ? prisma.swimmingScore.findMany({
            where: { eventId: eventByDiscipline.swimming },
          })
        : Promise.resolve([]),
      eventByDiscipline.laser_run
        ? prisma.laserRunScore.findMany({
            where: { eventId: eventByDiscipline.laser_run },
          })
        : Promise.resolve([]),
      eventByDiscipline.riding
        ? prisma.ridingScore.findMany({
            where: { eventId: eventByDiscipline.riding },
          })
        : Promise.resolve([]),
    ]);

  // Index scores by athleteId
  const frMap = new Map(fencingRankingScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const deMap = new Map(fencingDEScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const obMap = new Map(obstacleScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const swMap = new Map(swimmingScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const lrMap = new Map(laserRunScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const rdMap = new Map(ridingScores.map((s) => [s.athleteId, s.calculatedPoints]));

  // Build leaderboard
  const entries: LeaderboardEntry[] = compAthletes.map((ca) => {
    const fr = frMap.get(ca.athleteId) ?? null;
    const de = deMap.get(ca.athleteId) ?? null;
    const ob = obMap.get(ca.athleteId) ?? null;
    const sw = swMap.get(ca.athleteId) ?? null;
    const lr = lrMap.get(ca.athleteId) ?? null;
    const rd = rdMap.get(ca.athleteId) ?? null;

    const total = (fr ?? 0) + (de ?? 0) + (ob ?? 0) + (sw ?? 0) + (lr ?? 0) + (rd ?? 0);

    return {
      athleteId: ca.athleteId,
      athleteName: `${ca.athlete.firstName} ${ca.athlete.lastName}`,
      country: ca.athlete.country,
      gender: ca.athlete.gender,
      ageCategory: ca.ageCategory || ca.athlete.ageCategory,
      fencingRanking: fr,
      fencingDE: de,
      obstacle: ob,
      swimming: sw,
      laserRun: lr,
      riding: rd,
      total,
      rank: 0,
    };
  });

  // Sort by total descending and assign ranks
  entries.sort((a, b) => b.total - a.total);
  entries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return NextResponse.json({ entries, events });
}
