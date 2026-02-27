import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/athletes/:id/stats
 * Public endpoint — returns full competition history, scores, and stats for any athlete.
 * No authentication required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const athlete = await prisma.athlete.findUnique({ where: { id } });
  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  // Fetch all data in parallel (competitions, all 6 score types, training entries)
  const competitionSelect = { select: { name: true, date: true, location: true, status: true } };
  const eventCompInclude = { include: { competition: competitionSelect } };

  const [
    competitionAthletes,
    fencingRanking,
    fencingDE,
    obstacle,
    swimming,
    laserRun,
    riding,
    trainingEntries,
  ] = await Promise.all([
    prisma.competitionAthlete.findMany({
      where: { athleteId: athlete.id },
      include: {
        competition: { select: { id: true, name: true, date: true, location: true, status: true } },
      },
      orderBy: { competition: { date: "desc" } },
    }),
    prisma.fencingRankingScore.findMany({
      where: { athleteId: athlete.id },
      select: { calculatedPoints: true, victories: true, totalBouts: true, event: eventCompInclude },
    }),
    prisma.fencingDEScore.findMany({
      where: { athleteId: athlete.id },
      select: { calculatedPoints: true, placement: true, event: eventCompInclude },
    }),
    prisma.obstacleScore.findMany({
      where: { athleteId: athlete.id },
      select: { calculatedPoints: true, timeSeconds: true, event: eventCompInclude },
    }),
    prisma.swimmingScore.findMany({
      where: { athleteId: athlete.id },
      select: { calculatedPoints: true, timeHundredths: true, event: eventCompInclude },
    }),
    prisma.laserRunScore.findMany({
      where: { athleteId: athlete.id },
      select: { calculatedPoints: true, finishTimeSeconds: true, event: eventCompInclude },
    }),
    prisma.ridingScore.findMany({
      where: { athleteId: athlete.id },
      select: { calculatedPoints: true, knockdowns: true, event: eventCompInclude },
    }),
    prisma.trainingEntry.findMany({
      where: { athleteId: athlete.id },
      orderBy: { date: "desc" },
    }),
  ]);

  // Compute per-competition totals
  type CompResult = {
    competitionId: string;
    competitionName: string;
    date: string;
    location: string;
    status: string;
    fencingRanking: number | null;
    fencingDE: number | null;
    obstacle: number | null;
    swimming: number | null;
    laserRun: number | null;
    riding: number | null;
    total: number;
  };

  const compMap = new Map<string, CompResult>();

  for (const ca of competitionAthletes) {
    compMap.set(ca.competitionId, {
      competitionId: ca.competitionId,
      competitionName: ca.competition.name,
      date: ca.competition.date,
      location: ca.competition.location,
      status: ca.competition.status,
      fencingRanking: null,
      fencingDE: null,
      obstacle: null,
      swimming: null,
      laserRun: null,
      riding: null,
      total: 0,
    });
  }

  for (const s of fencingRanking) {
    const c = compMap.get(s.event.competitionId);
    if (c) { c.fencingRanking = s.calculatedPoints; c.total += s.calculatedPoints; }
  }
  for (const s of fencingDE) {
    const c = compMap.get(s.event.competitionId);
    if (c) { c.fencingDE = s.calculatedPoints; c.total += s.calculatedPoints; }
  }
  for (const s of obstacle) {
    const c = compMap.get(s.event.competitionId);
    if (c) { c.obstacle = s.calculatedPoints; c.total += s.calculatedPoints; }
  }
  for (const s of swimming) {
    const c = compMap.get(s.event.competitionId);
    if (c) { c.swimming = s.calculatedPoints; c.total += s.calculatedPoints; }
  }
  for (const s of laserRun) {
    const c = compMap.get(s.event.competitionId);
    if (c) { c.laserRun = s.calculatedPoints; c.total += s.calculatedPoints; }
  }
  for (const s of riding) {
    const c = compMap.get(s.event.competitionId);
    if (c) { c.riding = s.calculatedPoints; c.total += s.calculatedPoints; }
  }

  const competitions = Array.from(compMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Personal bests
  const personalBests = {
    fencingRanking: fencingRanking.length > 0 ? Math.max(...fencingRanking.map((s) => s.calculatedPoints)) : null,
    fencingDE: fencingDE.length > 0 ? Math.max(...fencingDE.map((s) => s.calculatedPoints)) : null,
    obstacle: obstacle.length > 0
      ? { bestTime: Math.min(...obstacle.map((s) => s.timeSeconds)), bestPoints: Math.max(...obstacle.map((s) => s.calculatedPoints)) }
      : null,
    swimming: swimming.length > 0
      ? { bestTime: Math.min(...swimming.map((s) => s.timeHundredths)), bestPoints: Math.max(...swimming.map((s) => s.calculatedPoints)) }
      : null,
    laserRun: laserRun.length > 0
      ? { bestTime: Math.min(...laserRun.map((s) => s.finishTimeSeconds)), bestPoints: Math.max(...laserRun.map((s) => s.calculatedPoints)) }
      : null,
    riding: riding.length > 0 ? Math.max(...riding.map((s) => s.calculatedPoints)) : null,
    totalPoints: competitions.length > 0
      ? Math.max(...competitions.filter((c) => c.total > 0).map((c) => c.total), 0) || null
      : null,
  };

  const completedComps = competitions.filter((c) => c.total > 0);
  const stats = {
    totalCompetitions: competitions.length,
    completedCompetitions: completedComps.length,
    highestTotal: personalBests.totalPoints,
    averageTotal: completedComps.length > 0
      ? Math.round(completedComps.reduce((sum, c) => sum + c.total, 0) / completedComps.length)
      : null,
  };

  const trainingByDiscipline: Record<string, typeof trainingEntries> = {};
  for (const entry of trainingEntries) {
    if (!trainingByDiscipline[entry.discipline]) {
      trainingByDiscipline[entry.discipline] = [];
    }
    trainingByDiscipline[entry.discipline].push(entry);
  }

  const scoreHistory = {
    fencingRanking: [
      ...fencingRanking.map((s) => ({
        date: s.event.competition.date, competition: s.event.competition.name, points: Math.round(s.calculatedPoints), victories: s.victories, totalBouts: s.totalBouts, source: "competition" as const,
      })),
      ...(trainingByDiscipline["fencingRanking"] || []).map((t) => ({
        date: t.date, competition: "", points: Math.round(t.points || 0), victories: t.victories, totalBouts: t.totalBouts, source: "training" as const, id: t.id, notes: t.notes,
      })),
    ],
    fencingDE: [
      ...fencingDE.map((s) => ({
        date: s.event.competition.date, competition: s.event.competition.name, points: Math.round(s.calculatedPoints), placement: s.placement, source: "competition" as const,
      })),
      ...(trainingByDiscipline["fencingDE"] || []).map((t) => ({
        date: t.date, competition: "", points: Math.round(t.points || 0), placement: t.placement, source: "training" as const, id: t.id, notes: t.notes,
      })),
    ],
    obstacle: [
      ...obstacle.map((s) => ({
        date: s.event.competition.date, competition: s.event.competition.name, points: Math.round(s.calculatedPoints), time: s.timeSeconds, source: "competition" as const,
      })),
      ...(trainingByDiscipline["obstacle"] || []).map((t) => ({
        date: t.date, competition: "", points: Math.round(t.points || 0), time: t.timeSeconds, source: "training" as const, id: t.id, notes: t.notes,
      })),
    ],
    swimming: [
      ...swimming.map((s) => ({
        date: s.event.competition.date, competition: s.event.competition.name, points: Math.round(s.calculatedPoints), timeHundredths: s.timeHundredths, source: "competition" as const,
      })),
      ...(trainingByDiscipline["swimming"] || []).map((t) => ({
        date: t.date, competition: "", points: Math.round(t.points || 0), timeHundredths: t.timeHundredths, source: "training" as const, id: t.id, notes: t.notes,
      })),
    ],
    laserRun: [
      ...laserRun.map((s) => ({
        date: s.event.competition.date, competition: s.event.competition.name, points: Math.round(s.calculatedPoints), finishTime: s.finishTimeSeconds, source: "competition" as const,
      })),
      ...(trainingByDiscipline["laserRun"] || []).map((t) => ({
        date: t.date, competition: "", points: Math.round(t.points || 0), finishTime: t.timeSeconds, source: "training" as const, id: t.id, notes: t.notes,
      })),
    ],
    riding: [
      ...riding.map((s) => ({
        date: s.event.competition.date, competition: s.event.competition.name, points: Math.round(s.calculatedPoints), knockdowns: s.knockdowns, source: "competition" as const,
      })),
      ...(trainingByDiscipline["riding"] || []).map((t) => ({
        date: t.date, competition: "", points: Math.round(t.points || 0), knockdowns: t.knockdowns, disobediences: t.disobediences, source: "training" as const, id: t.id, notes: t.notes,
      })),
    ],
  };

  return NextResponse.json({
    athlete: {
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      country: athlete.country,
      ageCategory: athlete.ageCategory,
      gender: athlete.gender,
      club: athlete.club,
    },
    competitions,
    personalBests,
    stats,
    scoreHistory,
  });
}
