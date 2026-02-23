import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── National Team Standards (5-discipline total) ─────────────────────────────
const NATIONAL_TEAM_STANDARDS: Record<string, Record<string, number>> = {
  Senior: { M: 1470, F: 1285 },
  Junior: { M: 1400, F: 1220 },
  U19:    { M: 1390, F: 1215 },
  U17:    { M: 1295, F: 1150 },
  U15:    { M: 1085, F: 1065 },
};

// ─── Development Team Standards (5-discipline total) ──────────────────────────
const DEVELOPMENT_TEAM_STANDARDS: Record<string, Record<string, number>> = {
  Senior: { M: 1400, F: 1220 },
  Junior: { M: 1330, F: 1160 },
  U19:    { M: 1320, F: 1155 },
  U17:    { M: 1230, F: 1095 },
  U15:    { M: 1030, F: 1010 },
};

// ─── Swim + Laser Run combined thresholds for National Team ──────────────────
const SWIM_LR_NATIONAL: Record<string, Record<string, number>> = {
  Senior: { M: 900, F: 790 },
  Junior: { M: 860, F: 755 },
  U19:    { M: 855, F: 750 },
  U17:    { M: 800, F: 710 },
  U15:    { M: 670, F: 660 },
};

// ─── Swim + Laser Run combined thresholds for Development Team ───────────────
const SWIM_LR_DEVELOPMENT: Record<string, Record<string, number>> = {
  Senior: { M: 860, F: 755 },
  Junior: { M: 820, F: 720 },
  U19:    { M: 815, F: 715 },
  U17:    { M: 760, F: 675 },
  U15:    { M: 635, F: 625 },
};

function determineStandard(
  ageCategory: string,
  gender: string,
  bestTotal: number,
  bestSwimLR: number
): "national" | "development" | "none" {
  const cat = ageCategory;

  // Check National Team standard
  const ntTotal = NATIONAL_TEAM_STANDARDS[cat]?.[gender];
  const ntSwimLR = SWIM_LR_NATIONAL[cat]?.[gender];
  if ((ntTotal && bestTotal >= ntTotal) || (ntSwimLR && bestSwimLR >= ntSwimLR)) {
    return "national";
  }

  // Check Development Team standard
  const dtTotal = DEVELOPMENT_TEAM_STANDARDS[cat]?.[gender];
  const dtSwimLR = SWIM_LR_DEVELOPMENT[cat]?.[gender];
  if ((dtTotal && bestTotal >= dtTotal) || (dtSwimLR && bestSwimLR >= dtSwimLR)) {
    return "development";
  }

  return "none";
}

export async function GET() {
  try {
    // Get all athletes who have competed in at least one competition
    const athletes = await prisma.athlete.findMany({
      where: {
        competitionAthletes: { some: {} },
      },
      include: {
        competitionAthletes: {
          include: {
            competition: {
              include: {
                events: true,
              },
            },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // For each athlete, compute their best total across all competitions
    const rankings = await Promise.all(
      athletes.map(async (athlete) => {
        let bestTotal = 0;
        let bestSwimLR = 0;
        let bestCompetitionName = "";

        for (const ca of athlete.competitionAthletes) {
          const comp = ca.competition;
          const eventByDiscipline: Record<string, string> = {};
          for (const event of comp.events) {
            eventByDiscipline[event.discipline] = event.id;
          }

          // Fetch scores for this athlete in this competition
          const [frScore, deScore, obScore, swScore, lrScore] = await Promise.all([
            eventByDiscipline.fencing_ranking
              ? prisma.fencingRankingScore.findUnique({
                  where: {
                    eventId_athleteId: {
                      eventId: eventByDiscipline.fencing_ranking,
                      athleteId: athlete.id,
                    },
                  },
                })
              : null,
            eventByDiscipline.fencing_de
              ? prisma.fencingDEScore.findUnique({
                  where: {
                    eventId_athleteId: {
                      eventId: eventByDiscipline.fencing_de,
                      athleteId: athlete.id,
                    },
                  },
                })
              : null,
            eventByDiscipline.obstacle
              ? prisma.obstacleScore.findUnique({
                  where: {
                    eventId_athleteId: {
                      eventId: eventByDiscipline.obstacle,
                      athleteId: athlete.id,
                    },
                  },
                })
              : null,
            eventByDiscipline.swimming
              ? prisma.swimmingScore.findUnique({
                  where: {
                    eventId_athleteId: {
                      eventId: eventByDiscipline.swimming,
                      athleteId: athlete.id,
                    },
                  },
                })
              : null,
            eventByDiscipline.laser_run
              ? prisma.laserRunScore.findUnique({
                  where: {
                    eventId_athleteId: {
                      eventId: eventByDiscipline.laser_run,
                      athleteId: athlete.id,
                    },
                  },
                })
              : null,
          ]);

          const fencing = frScore?.calculatedPoints ?? 0;
          const fencingDE = deScore?.calculatedPoints ?? 0;
          const obstacle = obScore?.calculatedPoints ?? 0;
          const swimming = swScore?.calculatedPoints ?? 0;
          const laserRun = lrScore?.calculatedPoints ?? 0;

          const ageCategory = ca.ageCategory || athlete.ageCategory;
          const isU15 = ageCategory === "U15";

          // U15 uses 4-discipline (no fencing), others use 5-discipline
          const total = isU15
            ? obstacle + swimming + laserRun
            : fencing + fencingDE + obstacle + swimming + laserRun;

          const swimLR = swimming + laserRun;

          if (total > bestTotal) {
            bestTotal = total;
            bestCompetitionName = comp.name;
          }
          if (swimLR > bestSwimLR) {
            bestSwimLR = swimLR;
          }
        }

        const ageCategory = athlete.ageCategory;
        const standard = determineStandard(ageCategory, athlete.gender, bestTotal, bestSwimLR);

        return {
          athleteId: athlete.id,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          country: athlete.country,
          club: athlete.club,
          gender: athlete.gender,
          ageCategory,
          bestTotal: Math.round(bestTotal),
          bestSwimLR: Math.round(bestSwimLR),
          bestCompetitionName,
          standard,
        };
      })
    );

    // Sort by best total descending
    rankings.sort((a, b) => b.bestTotal - a.bestTotal);

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error("Rankings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
