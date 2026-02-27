import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: { id: true, name: true, date: true, location: true, ageCategory: true, status: true },
  });

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Get all athletes with full details
  const compAthletes = await prisma.competitionAthlete.findMany({
    where: { competitionId: id },
    include: { athlete: true },
  });

  // Get all events
  const events = await prisma.event.findMany({ where: { competitionId: id } });
  const eventByDiscipline: Record<string, string> = {};
  for (const event of events) {
    eventByDiscipline[event.discipline] = event.id;
  }

  // Fetch all scores
  const [fr, de, ob, sw, lr, rd] = await Promise.all([
    eventByDiscipline.fencing_ranking
      ? prisma.fencingRankingScore.findMany({ where: { eventId: eventByDiscipline.fencing_ranking } })
      : Promise.resolve([]),
    eventByDiscipline.fencing_de
      ? prisma.fencingDEScore.findMany({ where: { eventId: eventByDiscipline.fencing_de } })
      : Promise.resolve([]),
    eventByDiscipline.obstacle
      ? prisma.obstacleScore.findMany({ where: { eventId: eventByDiscipline.obstacle } })
      : Promise.resolve([]),
    eventByDiscipline.swimming
      ? prisma.swimmingScore.findMany({ where: { eventId: eventByDiscipline.swimming } })
      : Promise.resolve([]),
    eventByDiscipline.laser_run
      ? prisma.laserRunScore.findMany({ where: { eventId: eventByDiscipline.laser_run } })
      : Promise.resolve([]),
    eventByDiscipline.riding
      ? prisma.ridingScore.findMany({ where: { eventId: eventByDiscipline.riding } })
      : Promise.resolve([]),
  ]);

  const frMap = new Map(fr.map((s) => [s.athleteId, s.calculatedPoints]));
  const deMap = new Map(de.map((s) => [s.athleteId, s.calculatedPoints]));
  const obMap = new Map(ob.map((s) => [s.athleteId, s.calculatedPoints]));
  const swMap = new Map(sw.map((s) => [s.athleteId, s.calculatedPoints]));
  const lrMap = new Map(lr.map((s) => [s.athleteId, s.calculatedPoints]));
  const rdMap = new Map(rd.map((s) => [s.athleteId, s.calculatedPoints]));

  // Build results with athlete details
  const results = compAthletes.map((ca) => {
    const fencing = frMap.get(ca.athleteId) ?? null;
    const fencingDE = deMap.get(ca.athleteId) ?? null;
    const obstacle = obMap.get(ca.athleteId) ?? null;
    const swimming = swMap.get(ca.athleteId) ?? null;
    const laserRun = lrMap.get(ca.athleteId) ?? null;
    const riding = rdMap.get(ca.athleteId) ?? null;
    const total = (fencing ?? 0) + (fencingDE ?? 0) + (obstacle ?? 0) + (swimming ?? 0) + (laserRun ?? 0) + (riding ?? 0);

    return {
      athleteId: ca.athleteId,
      firstName: ca.athlete.firstName,
      lastName: ca.athlete.lastName,
      country: ca.athlete.country,
      gender: ca.athlete.gender,
      ageCategory: ca.ageCategory || ca.athlete.ageCategory,
      club: ca.athlete.club,
      fencingRanking: fencing,
      fencingDE,
      obstacle,
      swimming,
      laserRun,
      riding,
      total,
    };
  });

  return NextResponse.json({ competition, results });
}
