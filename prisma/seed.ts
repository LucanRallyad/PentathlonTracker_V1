import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Super Admin User (from env or fallback) ─────────────────────────────
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@pentathlon.ca";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "admin123";
  const superAdminName = process.env.SUPER_ADMIN_NAME || "Admin";

  const admin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { role: "admin" }, // Always ensure this user stays admin
    create: {
      name: superAdminName,
      email: superAdminEmail,
      passwordHash: hashSync(superAdminPassword, 10),
      role: "admin",
    },
  });
  console.log("Super admin user:", admin.email);

  // ─── Athletes ──────────────────────────────────────────────────────────────
  const athleteData = [
    { firstName: "Emma", lastName: "Richardson", country: "CAN", ageCategory: "Senior", gender: "F", club: "Calgary AC" },
    { firstName: "Sophie", lastName: "Tremblay", country: "CAN", ageCategory: "Senior", gender: "F", club: "Montreal PC" },
    { firstName: "Olivia", lastName: "Chen", country: "CAN", ageCategory: "Senior", gender: "F", club: "Vancouver MP" },
    { firstName: "Sarah", lastName: "Mueller", country: "GER", ageCategory: "Senior", gender: "F", club: "Berlin SC" },
    { firstName: "Yuki", lastName: "Tanaka", country: "JPN", ageCategory: "Senior", gender: "F", club: "Tokyo MP" },
    { firstName: "Maria", lastName: "Garcia", country: "MEX", ageCategory: "Senior", gender: "F", club: "Mexico City AC" },
    { firstName: "Anna", lastName: "Kovacs", country: "HUN", ageCategory: "Senior", gender: "F", club: "Budapest PE" },
    { firstName: "Liu", lastName: "Wei", country: "CHN", ageCategory: "Senior", gender: "F", club: "Beijing MP" },
    { firstName: "Elena", lastName: "Rossi", country: "ITA", ageCategory: "Senior", gender: "F", club: "Rome AC" },
    { firstName: "Ava", lastName: "Johnson", country: "USA", ageCategory: "Senior", gender: "F", club: "New York MP" },
    { firstName: "Liam", lastName: "Park", country: "KOR", ageCategory: "Senior", gender: "M", club: "Seoul AC" },
    { firstName: "Noah", lastName: "Williams", country: "GBR", ageCategory: "Senior", gender: "M", club: "London PE" },
    { firstName: "Lucas", lastName: "Bernard", country: "FRA", ageCategory: "Senior", gender: "M", club: "Paris MP" },
    { firstName: "Carlos", lastName: "Santos", country: "BRA", ageCategory: "Senior", gender: "M", club: "São Paulo AC" },
    { firstName: "Ahmed", lastName: "Hassan", country: "EGY", ageCategory: "Senior", gender: "M", club: "Cairo MP" },
    { firstName: "Dmitri", lastName: "Volkov", country: "RUS", ageCategory: "Senior", gender: "M", club: "Moscow PE" },
    { firstName: "Jakob", lastName: "Lindgren", country: "SWE", ageCategory: "Senior", gender: "M", club: "Stockholm AC" },
    { firstName: "Mateo", lastName: "Ruiz", country: "ESP", ageCategory: "Senior", gender: "M", club: "Madrid PE" },
    { firstName: "Daniel", lastName: "Kim", country: "CAN", ageCategory: "Senior", gender: "M", club: "Calgary AC" },
    { firstName: "Ethan", lastName: "Brown", country: "CAN", ageCategory: "Senior", gender: "M", club: "Toronto MP" },
    { firstName: "James", lastName: "Taylor", country: "AUS", ageCategory: "Senior", gender: "M", club: "Sydney AC" },
    { firstName: "Alexander", lastName: "Petrov", country: "BUL", ageCategory: "Senior", gender: "M", club: "Sofia MP" },
    { firstName: "Tomasz", lastName: "Nowak", country: "POL", ageCategory: "Senior", gender: "M", club: "Warsaw PE" },
    { firstName: "Mehmet", lastName: "Yilmaz", country: "TUR", ageCategory: "Senior", gender: "M", club: "Istanbul AC" },
  ];

  const athletes = [];
  for (const data of athleteData) {
    const athlete = await prisma.athlete.create({ data });
    athletes.push(athlete);
  }
  console.log(`Created ${athletes.length} athletes`);

  // ─── Competition: Calgary Open 2026 ────────────────────────────────────────
  const competition = await prisma.competition.create({
    data: {
      name: "Calgary Open 2026",
      date: "2026-02-08",
      endDate: "2026-02-10",
      location: "Calgary, AB",
      description: "Annual Modern Pentathlon competition held in Calgary, Alberta.",
      status: "active",
      competitionType: "individual",
      ageCategory: "Senior",
    },
  });
  console.log("Created competition:", competition.name);

  // Register all athletes
  for (const athlete of athletes) {
    await prisma.competitionAthlete.create({
      data: {
        competitionId: competition.id,
        athleteId: athlete.id,
        status: "checked-in",
      },
    });
  }

  // ─── Events ────────────────────────────────────────────────────────────────
  const events = await Promise.all([
    prisma.event.create({
      data: {
        competitionId: competition.id,
        discipline: "fencing_ranking",
        scheduledStart: "2026-02-08T09:00:00",
        status: "completed",
        dayLabel: "Saturday, February 8",
        sortOrder: 1,
        completedAt: "2026-02-08T11:30:00",
      },
    }),
    prisma.event.create({
      data: {
        competitionId: competition.id,
        discipline: "fencing_de",
        scheduledStart: "2026-02-08T11:45:00",
        status: "completed",
        dayLabel: "Saturday, February 8",
        sortOrder: 2,
        completedAt: "2026-02-08T13:15:00",
      },
    }),
    prisma.event.create({
      data: {
        competitionId: competition.id,
        discipline: "obstacle",
        scheduledStart: "2026-02-08T14:00:00",
        status: "completed",
        dayLabel: "Saturday, February 8",
        sortOrder: 3,
        completedAt: "2026-02-08T15:30:00",
      },
    }),
    prisma.event.create({
      data: {
        competitionId: competition.id,
        discipline: "swimming",
        scheduledStart: "2026-02-09T09:00:00",
        status: "in_progress",
        dayLabel: "Sunday, February 9",
        sortOrder: 4,
      },
    }),
    prisma.event.create({
      data: {
        competitionId: competition.id,
        discipline: "laser_run",
        scheduledStart: "2026-02-09T11:00:00",
        status: "pending",
        dayLabel: "Sunday, February 9",
        sortOrder: 5,
      },
    }),
  ]);

  const [fencingRankingEvent, fencingDEEvent, obstacleEvent] = events;

  // ─── Sample Scores: Fencing Ranking Round ──────────────────────────────────
  const totalBouts = athletes.length - 1; // 23
  const fencingVictories = [
    20, 18, 22, 19, 16, 15, 21, 23, 17, 14, 20, 19, 18, 16, 21, 17, 15, 22, 19, 18, 16, 14, 20, 17,
  ];

  for (let i = 0; i < athletes.length; i++) {
    const victories = fencingVictories[i];
    // For 23 bouts: victoriesFor250 = 16, valuePerVictory = 7
    const points = 250 + (victories - 16) * 7;
    await prisma.fencingRankingScore.create({
      data: {
        eventId: fencingRankingEvent.id,
        athleteId: athletes[i].id,
        victories,
        totalBouts,
        calculatedPoints: Math.max(0, points),
      },
    });
  }
  console.log("Created fencing ranking scores");

  // ─── Sample Scores: Fencing DE ─────────────────────────────────────────────
  const dePlacementPoints: Record<number, number> = {
    1: 250, 2: 244, 3: 238, 4: 236, 5: 230, 6: 228, 7: 226, 8: 224,
    9: 218, 10: 216, 11: 214, 12: 212, 13: 210, 14: 208, 15: 206, 16: 204,
    17: 198, 18: 196,
  };

  for (let i = 0; i < Math.min(athletes.length, 18); i++) {
    const placement = i + 1;
    await prisma.fencingDEScore.create({
      data: {
        eventId: fencingDEEvent.id,
        athleteId: athletes[i].id,
        placement,
        calculatedPoints: dePlacementPoints[placement] || 0,
      },
    });
  }
  // Remaining athletes got eliminated in initial bout
  for (let i = 18; i < athletes.length; i++) {
    await prisma.fencingDEScore.create({
      data: {
        eventId: fencingDEEvent.id,
        athleteId: athletes[i].id,
        placement: 0,
        calculatedPoints: 0,
      },
    });
  }
  console.log("Created fencing DE scores");

  // ─── Sample Scores: Obstacle ───────────────────────────────────────────────
  const obstacleTimes = [
    18.5, 21.3, 16.8, 19.7, 24.1, 26.5, 17.2, 15.9, 22.8, 28.4,
    19.3, 20.1, 21.8, 25.0, 17.5, 23.2, 27.1, 16.4, 20.5, 19.8,
    24.6, 29.1, 18.1, 22.3,
  ];

  for (let i = 0; i < athletes.length; i++) {
    const timeSeconds = obstacleTimes[i];
    const timeDiff = timeSeconds - 15.0;
    const points = 400 - Math.round(timeDiff / 0.33);
    await prisma.obstacleScore.create({
      data: {
        eventId: obstacleEvent.id,
        athleteId: athletes[i].id,
        timeSeconds,
        penaltyPoints: 0,
        calculatedPoints: Math.max(0, points),
      },
    });
  }
  console.log("Created obstacle scores");

  // ─── Upcoming Competition ──────────────────────────────────────────────────
  await prisma.competition.create({
    data: {
      name: "National Championships 2026",
      date: "2026-03-01",
      endDate: "2026-03-03",
      location: "Toronto, ON",
      description: "Canadian National Modern Pentathlon Championships.",
      status: "upcoming",
      competitionType: "individual",
      ageCategory: "All",
    },
  });

  // ─── Past Competition ──────────────────────────────────────────────────────
  await prisma.competition.create({
    data: {
      name: "Winter Classic 2026",
      date: "2026-01-05",
      endDate: "2026-01-07",
      location: "Edmonton, AB",
      description: "Winter Modern Pentathlon Classic.",
      status: "completed",
      competitionType: "individual",
      ageCategory: "Junior",
    },
  });

  console.log("Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
