-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'official',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "ageCategory" TEXT NOT NULL,
    "club" TEXT,
    "gender" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "competitionType" TEXT NOT NULL DEFAULT 'individual',
    "ageCategory" TEXT NOT NULL DEFAULT 'Senior',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompetitionAthlete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    CONSTRAINT "CompetitionAthlete_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionAthlete_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "scheduledStart" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dayLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TEXT,
    "config" TEXT,
    CONSTRAINT "Event_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FencingRankingScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "victories" INTEGER NOT NULL,
    "totalBouts" INTEGER NOT NULL,
    "calculatedPoints" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FencingRankingScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FencingRankingScore_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FencingDEScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "calculatedPoints" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FencingDEScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FencingDEScore_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObstacleScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "timeSeconds" REAL NOT NULL,
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "calculatedPoints" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ObstacleScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObstacleScore_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SwimmingScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "timeHundredths" INTEGER NOT NULL,
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "calculatedPoints" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SwimmingScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SwimmingScore_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LaserRunScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "finishTimeSeconds" REAL NOT NULL,
    "handicapStartDelay" INTEGER NOT NULL DEFAULT 0,
    "rawDelay" INTEGER NOT NULL DEFAULT 0,
    "isPackStart" BOOLEAN NOT NULL DEFAULT false,
    "shootingStation" INTEGER NOT NULL DEFAULT 0,
    "gateAssignment" TEXT NOT NULL DEFAULT 'A',
    "penaltySeconds" INTEGER NOT NULL DEFAULT 0,
    "calculatedPoints" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LaserRunScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LaserRunScore_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RidingScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "knockdowns" INTEGER NOT NULL DEFAULT 0,
    "disobediences" INTEGER NOT NULL DEFAULT 0,
    "timeOverSeconds" INTEGER NOT NULL DEFAULT 0,
    "otherPenalties" INTEGER NOT NULL DEFAULT 0,
    "calculatedPoints" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RidingScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RidingScore_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAthlete_competitionId_athleteId_key" ON "CompetitionAthlete"("competitionId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "FencingRankingScore_eventId_athleteId_key" ON "FencingRankingScore"("eventId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "FencingDEScore_eventId_athleteId_key" ON "FencingDEScore"("eventId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "ObstacleScore_eventId_athleteId_key" ON "ObstacleScore"("eventId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "SwimmingScore_eventId_athleteId_key" ON "SwimmingScore"("eventId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "LaserRunScore_eventId_athleteId_key" ON "LaserRunScore"("eventId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "RidingScore_eventId_athleteId_key" ON "RidingScore"("eventId", "athleteId");
