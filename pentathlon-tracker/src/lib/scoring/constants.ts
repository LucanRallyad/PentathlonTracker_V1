import type { AgeCategory, LaserRunTargetConfig } from "./types";

// ─── Fencing Ranking Round: Victory Value Lookup Table ──────────────────────
// From Uipm_Scoring_Rules.JSON → events.fencing.ranking_round.victory_value_table

export const FENCING_VICTORY_VALUE_TABLE: Record<
  number,
  { victoriesFor250: number; valuePerVictory: number }
> = {
  60: { victoriesFor250: 42, valuePerVictory: 3 },
  59: { victoriesFor250: 41, valuePerVictory: 3 },
  58: { victoriesFor250: 41, valuePerVictory: 3 },
  57: { victoriesFor250: 40, valuePerVictory: 3 },
  56: { victoriesFor250: 39, valuePerVictory: 3 },
  55: { victoriesFor250: 39, valuePerVictory: 3 },
  54: { victoriesFor250: 38, valuePerVictory: 3 },
  53: { victoriesFor250: 37, valuePerVictory: 3 },
  52: { victoriesFor250: 36, valuePerVictory: 3 },
  51: { victoriesFor250: 36, valuePerVictory: 3 },
  50: { victoriesFor250: 35, valuePerVictory: 3 },
  49: { victoriesFor250: 34, valuePerVictory: 3 },
  48: { victoriesFor250: 34, valuePerVictory: 3 },
  47: { victoriesFor250: 33, valuePerVictory: 4 },
  46: { victoriesFor250: 32, valuePerVictory: 4 },
  45: { victoriesFor250: 32, valuePerVictory: 4 },
  44: { victoriesFor250: 31, valuePerVictory: 4 },
  43: { victoriesFor250: 30, valuePerVictory: 4 },
  42: { victoriesFor250: 29, valuePerVictory: 4 },
  41: { victoriesFor250: 29, valuePerVictory: 4 },
  40: { victoriesFor250: 28, valuePerVictory: 4 },
  39: { victoriesFor250: 27, valuePerVictory: 5 },
  38: { victoriesFor250: 27, valuePerVictory: 5 },
  37: { victoriesFor250: 26, valuePerVictory: 5 },
  36: { victoriesFor250: 25, valuePerVictory: 5 },
  35: { victoriesFor250: 25, valuePerVictory: 5 },
  34: { victoriesFor250: 24, valuePerVictory: 5 },
  33: { victoriesFor250: 23, valuePerVictory: 6 },
  32: { victoriesFor250: 22, valuePerVictory: 6 },
  31: { victoriesFor250: 22, valuePerVictory: 6 },
  30: { victoriesFor250: 21, valuePerVictory: 6 },
  29: { victoriesFor250: 20, valuePerVictory: 7 },
  28: { victoriesFor250: 20, valuePerVictory: 7 },
  27: { victoriesFor250: 19, valuePerVictory: 7 },
  26: { victoriesFor250: 18, valuePerVictory: 7 },
  25: { victoriesFor250: 18, valuePerVictory: 7 },
  24: { victoriesFor250: 17, valuePerVictory: 7 },
  23: { victoriesFor250: 16, valuePerVictory: 7 },
  22: { victoriesFor250: 15, valuePerVictory: 8 },
  21: { victoriesFor250: 15, valuePerVictory: 8 },
  20: { victoriesFor250: 14, valuePerVictory: 8 },
  19: { victoriesFor250: 13, valuePerVictory: 8 },
};

// ─── Fencing DE: Points by Placement ────────────────────────────────────────

export const FENCING_DE_PLACEMENT_POINTS: Record<number, number> = {
  1: 250,
  2: 244,
  3: 238,
  4: 236,
  5: 230,
  6: 228,
  7: 226,
  8: 224,
  9: 218,
  10: 216,
  11: 214,
  12: 212,
  13: 210,
  14: 208,
  15: 206,
  16: 204,
  17: 198,
  18: 196,
};

// ─── Obstacle Constants ─────────────────────────────────────────────────────

export const OBSTACLE_CONFIG = {
  individual: { baseTimeSeconds: 15.0, basePoints: 400, secondsPerPoint: 0.33 },
  relay: { baseTimeSeconds: 35.0, basePoints: 400, secondsPerPoint: 0.33 },
};

// ─── Swimming Constants ─────────────────────────────────────────────────────
// Per UIPM Competition Rules:
// - Standard (Senior→U13): 100m, 1:10.00 = 250pts, ±1pt per 0.20s
// - Youth (U11, U9): 50m, 0:45.00 = 250pts, ±1pt per 0.50s
// - Masters 30+/40+/50+ Men: 100m, 1:18.0 = 250pts, ±1pt per 0.50s
// - Masters 30+/40+/50+ Women: 100m, 1:30.0 = 250pts, ±1pt per 0.50s
// - Masters 60+/70+ Men: 50m, 0:38.0 = 250pts, ±1pt per 0.50s
// - Masters 60+/70+ Women: 50m, 0:43.0 = 250pts, ±1pt per 0.50s

export interface SwimmingConfig {
  distanceMeters: number;
  baseTimeHundredths: number;
  basePoints: number;
  incrementHundredths: number;
}

export const SWIMMING_CONFIG: Record<string, SwimmingConfig> = {
  // Senior, Junior, U19, U17, U15, U13
  standard: {
    distanceMeters: 100,
    baseTimeHundredths: 7000, // 1:10.00
    basePoints: 250,
    incrementHundredths: 20, // 0.20s
  },
  // U11, U9
  youth: {
    distanceMeters: 50,
    baseTimeHundredths: 4500, // 0:45.00
    basePoints: 250,
    incrementHundredths: 50, // 0.50s
  },
  // Masters Men 30+/40+/50+ (100m)
  masters_M: {
    distanceMeters: 100,
    baseTimeHundredths: 7800, // 1:18.00
    basePoints: 250,
    incrementHundredths: 50, // 0.50s
  },
  // Masters Women 30+/40+/50+ (100m)
  masters_F: {
    distanceMeters: 100,
    baseTimeHundredths: 9000, // 1:30.00
    basePoints: 250,
    incrementHundredths: 50, // 0.50s
  },
  // Masters Men 60+/70+ (50m) — not currently modelled as separate age group,
  // but included for completeness; use getMastersSwimmingConfig for future support
  masters_60_M: {
    distanceMeters: 50,
    baseTimeHundredths: 3800, // 0:38.00
    basePoints: 250,
    incrementHundredths: 50, // 0.50s
  },
  // Masters Women 60+/70+ (50m)
  masters_60_F: {
    distanceMeters: 50,
    baseTimeHundredths: 4300, // 0:43.00
    basePoints: 250,
    incrementHundredths: 50, // 0.50s
  },
};

export function getSwimmingConfig(ageCategory: AgeCategory, gender?: "M" | "F"): SwimmingConfig {
  if (ageCategory === "U9" || ageCategory === "U11") {
    return SWIMMING_CONFIG.youth;
  }
  if (ageCategory === "Masters") {
    // Masters has gender-specific base times
    // Default to male if gender not provided
    const g = gender || "M";
    return g === "F" ? SWIMMING_CONFIG.masters_F : SWIMMING_CONFIG.masters_M;
  }
  return SWIMMING_CONFIG.standard;
}

// ─── Laser Run Target Times (from LR_Handicap.JSON) ────────────────────────

export const LASER_RUN_INDIVIDUAL_TARGETS: LaserRunTargetConfig[] = [
  {
    ageGroup: "Senior, Junior, U19",
    totalDistanceMeters: 3000,
    runningSequences: "4 x 600m",
    shootingSequences: "4 x 5 hits",
    targetTimeSeconds: 800, // 13:20
  },
  {
    ageGroup: "U17",
    totalDistanceMeters: 2400,
    runningSequences: "3 x 600m",
    shootingSequences: "3 x 5 hits",
    targetTimeSeconds: 630, // 10:30
  },
  {
    ageGroup: "U15",
    totalDistanceMeters: 1800,
    runningSequences: "3 x 600m",
    shootingSequences: "3 x 5 hits",
    targetTimeSeconds: 460, // 7:40
  },
  {
    ageGroup: "U13",
    totalDistanceMeters: 900,
    runningSequences: "2 x 300m",
    shootingSequences: "2 x 5 hits",
    targetTimeSeconds: 320, // 5:20
  },
  {
    ageGroup: "U11",
    totalDistanceMeters: 600,
    runningSequences: "2 x 300m",
    shootingSequences: "2 x 5 hits",
    targetTimeSeconds: 240, // 4:00
  },
  {
    ageGroup: "U9",
    totalDistanceMeters: 600,
    runningSequences: "2 x 300m",
    shootingSequences: "2 x 5 hits",
    targetTimeSeconds: 240, // 4:00
  },
];

export const LASER_RUN_RELAY_TARGETS: LaserRunTargetConfig[] = [
  {
    ageGroup: "Senior, Junior, U19",
    totalDistanceMeters: 3600,
    runningSequences: "2 x 3 x 600m",
    shootingSequences: "2 x 3 x 5 hits",
    targetTimeSeconds: 800, // 13:20
  },
  {
    ageGroup: "U17",
    totalDistanceMeters: 2400,
    runningSequences: "2 x 2 x 600m",
    shootingSequences: "2 x 2 x 5 hits",
    targetTimeSeconds: 460, // 7:40
  },
  {
    ageGroup: "U15",
    totalDistanceMeters: 2400,
    runningSequences: "2 x 2 x 600m",
    shootingSequences: "2 x 2 x 5 hits",
    targetTimeSeconds: 460, // 7:40
  },
  {
    ageGroup: "U13",
    totalDistanceMeters: 1200,
    runningSequences: "2 x 2 x 300m",
    shootingSequences: "2 x 2 x 5 hits",
    targetTimeSeconds: 320, // 5:20
  },
  {
    ageGroup: "U11",
    totalDistanceMeters: 1200,
    runningSequences: "2 x 2 x 300m",
    shootingSequences: "2 x 2 x 5 hits",
    targetTimeSeconds: 320, // 5:20
  },
  {
    ageGroup: "U9",
    totalDistanceMeters: 1200,
    runningSequences: "2 x 2 x 300m",
    shootingSequences: "2 x 2 x 5 hits",
    targetTimeSeconds: 320, // 5:20
  },
];

export function getLaserRunTargetTime(
  ageCategory: AgeCategory,
  isRelay: boolean = false
): number {
  const targets = isRelay
    ? LASER_RUN_RELAY_TARGETS
    : LASER_RUN_INDIVIDUAL_TARGETS;

  // Map ageCategory to the target group
  const ageCategoryMap: Record<string, string> = {
    Senior: "Senior, Junior, U19",
    Junior: "Senior, Junior, U19",
    U19: "Senior, Junior, U19",
    U17: "U17",
    U15: "U15",
    U13: "U13",
    U11: "U11",
    U9: "U9",
    Masters: "Senior, Junior, U19", // Masters uses Senior baselines
  };

  const groupName = ageCategoryMap[ageCategory] || "Senior, Junior, U19";
  const config = targets.find((t) => t.ageGroup === groupName);
  return config?.targetTimeSeconds ?? 800;
}

export function getLaserRunConfig(
  ageCategory: AgeCategory,
  isRelay: boolean = false
): LaserRunTargetConfig | undefined {
  const targets = isRelay
    ? LASER_RUN_RELAY_TARGETS
    : LASER_RUN_INDIVIDUAL_TARGETS;

  const ageCategoryMap: Record<string, string> = {
    Senior: "Senior, Junior, U19",
    Junior: "Senior, Junior, U19",
    U19: "Senior, Junior, U19",
    U17: "U17",
    U15: "U15",
    U13: "U13",
    U11: "U11",
    U9: "U9",
    Masters: "Senior, Junior, U19",
  };

  const groupName = ageCategoryMap[ageCategory] || "Senior, Junior, U19";
  return targets.find((t) => t.ageGroup === groupName);
}

// ─── Handicap Start Constants ───────────────────────────────────────────────

export const HANDICAP_PACK_START_THRESHOLD_SECONDS = 90;
export const HANDICAP_PACK_START_TIME_SECONDS = 90; // 1:30

// ─── Riding Constants (Masters Only) ────────────────────────────────────────

export const RIDING_CONFIG = {
  basePoints: 300,
  knockdownPenalty: 7,
  disobediencePenalty: 10,
  timeOverPenaltyPerSecond: 1,
  otherPenalty: 10,
};

// ─── Masters Handicap Age Bonus ─────────────────────────────────────────────
// Interpolated from the examples in Uipm_Scoring_Rules.JSON

export const MASTERS_HANDICAP_BASE_AGE = 40;

export function getMastersHandicapBonus(age: number): number {
  // Linear interpolation from the provided examples:
  // age 30 = -50, age 40 = 0, age 50 = +50, age 60 = +150, age 70 = +300
  if (age <= 30) return -50 + (age - 30) * 5; // -5 pts per year under 30
  if (age <= 40) return (age - 40) * 5; // 5 pts per year from 30-40
  if (age <= 50) return (age - 40) * 5; // 5 pts per year from 40-50
  if (age <= 60) return 50 + (age - 50) * 10; // 10 pts per year from 50-60
  return 150 + (age - 60) * 15; // 15 pts per year from 60+
}

// ─── Discipline Display Names ───────────────────────────────────────────────

export const DISCIPLINE_NAMES: Record<string, string> = {
  fencing_ranking: "Fencing - Ranking",
  fencing_de: "Fencing - DE",
  obstacle: "Obstacle",
  swimming: "Swimming",
  laser_run: "Laser Run",
  riding: "Riding",
};

export const DISCIPLINE_ORDER: string[] = [
  "fencing_ranking",
  "fencing_de",
  "obstacle",
  "swimming",
  "laser_run",
  "riding",
];
