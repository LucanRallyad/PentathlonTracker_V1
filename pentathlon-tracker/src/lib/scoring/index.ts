// ─── UIPM Scoring Engine ────────────────────────────────────────────────────
// Central export for all scoring functions

export {
  calculateFencingRanking,
  getFencingRankingParams,
} from "./fencing-ranking";

export { calculateFencingDE, getAllDEPlacements } from "./fencing-de";

export {
  generateDEBracket,
  advanceWinner,
  calculateFinalPlacements,
  isBracketComplete,
  getTableauSize,
  generateSeedPositions,
  getRoundName,
  getBracketStats,
  getAllBracketAthletes,
  serializeBracket,
  deserializeBracket,
} from "./fencing-de-bracket";

export { calculateObstacle } from "./obstacle";

export {
  calculateSwimming,
  parseSwimmingTime,
  formatSwimmingTime,
} from "./swimming";

export {
  calculateLaserRun,
  formatLaserRunTime,
  parseLaserRunTime,
} from "./laser-run";

export { calculateRiding } from "./riding";

export { calculateHandicapStarts } from "./handicap";

export { calculateTeamStandings } from "./team";

export { applyMastersHandicap, calculateAge } from "./masters-handicap";

export * from "./types";
export * from "./constants";
