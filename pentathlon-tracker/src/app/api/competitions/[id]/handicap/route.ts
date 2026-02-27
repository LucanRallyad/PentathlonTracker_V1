import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateHandicapStarts } from "@/lib/scoring/handicap";
import type { HandicapAthleteInput } from "@/lib/scoring/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get competition info
  const competition = await prisma.competition.findUnique({
    where: { id },
    select: { ageCategory: true, competitionType: true },
  });

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Get all athletes in competition (select only needed fields to avoid schema drift)
  const compAthletes = await prisma.competitionAthlete.findMany({
    where: { competitionId: id },
    include: {
      athlete: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Get events
  const events = await prisma.event.findMany({
    where: { competitionId: id },
  });

  const eventByDiscipline: Record<string, string> = {};
  for (const event of events) {
    eventByDiscipline[event.discipline] = event.id;
  }

  // Fetch prior event scores (fencing + obstacle + swimming)
  const [frScores, deScores, obScores, swScores] = await Promise.all([
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
  ]);

  // Build cumulative points
  const frMap = new Map(frScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const deMap = new Map(deScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const obMap = new Map(obScores.map((s) => [s.athleteId, s.calculatedPoints]));
  const swMap = new Map(swScores.map((s) => [s.athleteId, s.calculatedPoints]));

  const athletes: HandicapAthleteInput[] = compAthletes
    .filter((ca) => ca.athlete != null)
    .map((ca) => ({
      athleteId: ca.athleteId,
      athleteName: `${ca.athlete!.firstName} ${ca.athlete!.lastName}`,
      cumulativePoints:
        (frMap.get(ca.athleteId) ?? 0) +
        (deMap.get(ca.athleteId) ?? 0) +
        (obMap.get(ca.athleteId) ?? 0) +
        (swMap.get(ca.athleteId) ?? 0),
    }));

  const handicapStarts = calculateHandicapStarts(athletes);

    return NextResponse.json({
      ageCategory: competition.ageCategory,
      competitionType: competition.competitionType,
      handicapStarts,
    });
  } catch (error) {
    console.error("Handicap API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch handicap data" },
      { status: 500 }
    );
  }
}
