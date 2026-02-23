// ─── Age Categories ──────────────────────────────────────────────────────────

export type AgeCategory =
  | "U9"
  | "U11"
  | "U13"
  | "U15"
  | "U17"
  | "U19"
  | "Junior"
  | "Senior"
  | "Masters";

export type CompetitionType = "individual" | "relay" | "team";

// ─── Discipline Types ────────────────────────────────────────────────────────

export type Discipline =
  | "fencing_ranking"
  | "fencing_de"
  | "obstacle"
  | "swimming"
  | "laser_run"
  | "riding";

// ─── Score Inputs ────────────────────────────────────────────────────────────

export interface FencingRankingInput {
  victories: number;
  totalBouts: number;
}

export interface FencingDEInput {
  placement: number;
}

export interface ObstacleInput {
  timeSeconds: number;
  penaltyPoints?: number;
  isRelay?: boolean;
}

export interface SwimmingInput {
  timeHundredths: number; // e.g. 7000 = 1:10.00
  penaltyPoints?: number;
  ageCategory?: AgeCategory;
  gender?: "M" | "F"; // Required for Masters (different base times for men/women)
}

export interface LaserRunInput {
  finishTimeSeconds: number;
  penaltySeconds?: number;
  ageCategory?: AgeCategory;
  isRelay?: boolean;
}

export interface RidingInput {
  knockdowns: number;
  disobediences: number;
  timeOverSeconds: number;
  otherPenalties?: number;
}

// ─── Handicap Start ──────────────────────────────────────────────────────────

export interface HandicapAthleteInput {
  athleteId: string;
  athleteName: string;
  cumulativePoints: number;
}

export interface HandicapStartResult {
  athleteId: string;
  athleteName: string;
  cumulativePoints: number;
  rawDelay: number;
  startDelay: number; // capped at 90
  isPackStart: boolean;
  shootingStation: number;
  gateAssignment: "A" | "B" | "P";
  startTimeFormatted: string;
}

// ─── Fencing DE Bracket Types ──────────────────────────────────────────────

export interface DEBracketSeed {
  athleteId: string;
  seed: number; // 1-based, from ranking round results
  athleteName: string;
}

export interface DEMatch {
  matchId: string; // e.g., "R1-M0", "R2-M3"
  roundNumber: number; // 1 = first round
  matchPosition: number; // position within the round (0-based)
  bracketPosition: number; // absolute position in bracket
  athlete1Id: string | null;
  athlete2Id: string | null;
  athlete1Seed: number | null;
  athlete2Seed: number | null;
  athlete1Name: string | null;
  athlete2Name: string | null;
  winnerId: string | null;
  winnerSeed: number | null;
  score1: number | null; // touches for athlete1
  score2: number | null; // touches for athlete2
  isBye: boolean;
  feederMatch1Id: string | null; // which match feeds athlete1
  feederMatch2Id: string | null; // which match feeds athlete2
}

export interface DEBracket {
  eventId: string;
  tableauSize: number;
  numCompetitors: number;
  rounds: DEMatch[][]; // rounds[0] = first round matches
  placements: Record<string, number> | null; // athleteId → placement (null until complete)
  generatedAt: string; // ISO date
}

export interface DEMatchResult {
  matchId: string;
  winnerId: string;
  score1: number;
  score2: number;
}

// ─── Laser Run Target Config ────────────────────────────────────────────────

export interface LaserRunTargetConfig {
  ageGroup: string;
  totalDistanceMeters: number;
  runningSequences: string;
  shootingSequences: string;
  targetTimeSeconds: number;
}
