import {
  HANDICAP_PACK_START_THRESHOLD_SECONDS,
  HANDICAP_PACK_START_TIME_SECONDS,
} from "./constants";
import type { HandicapAthleteInput, HandicapStartResult } from "./types";

/**
 * Calculate handicap start times for the Laser Run.
 *
 * Implements the 10-step process from LR_Handicap.JSON:
 * 1. Collect cumulative points
 * 2. Find leader (max cumulative points)
 * 3. Calculate raw delays (leader_pts - athlete_pts)
 * 4. Apply pack start cap (min(raw_delay, 90))
 * 5. Sort athletes by delay ascending
 * 6. Assign shooting stations (station = position, 1-indexed)
 * 7. Format start times as MM:SS
 * 8. Group pack starters (raw_delay > 90 → start at 1:30)
 * 9-10. (Scoring & total handled separately)
 */
export function calculateHandicapStarts(
  athletes: HandicapAthleteInput[]
): HandicapStartResult[] {
  if (athletes.length === 0) return [];

  // Step 2: Find leader
  const leaderPoints = Math.max(...athletes.map((a) => a.cumulativePoints));

  // Step 3-4: Calculate delays and apply cap
  const withDelays = athletes.map((athlete) => {
    const rawDelay = leaderPoints - athlete.cumulativePoints;
    const isPackStart = rawDelay > HANDICAP_PACK_START_THRESHOLD_SECONDS;
    const startDelay = isPackStart
      ? HANDICAP_PACK_START_TIME_SECONDS
      : rawDelay;

    return {
      ...athlete,
      rawDelay,
      startDelay,
      isPackStart,
    };
  });

  // Step 5: Sort by delay ascending (leader first)
  withDelays.sort((a, b) => {
    // Non-pack starters sorted by delay
    // Pack starters go to the end, sorted by raw delay
    if (a.isPackStart && !b.isPackStart) return 1;
    if (!a.isPackStart && b.isPackStart) return -1;
    if (a.isPackStart && b.isPackStart) return a.rawDelay - b.rawDelay;
    return a.startDelay - b.startDelay;
  });

  // Step 6-8: Assign stations, gates, and format times
  return withDelays.map((athlete, index) => {
    const station = index + 1;
    // Alternate gates A/B for non-pack starters
    let gate: "A" | "B" | "P" = athlete.isPackStart
      ? "A" // Pack starters don't have a specific gate; use A as default
      : index % 2 === 0
        ? "A"
        : "B";

    return {
      athleteId: athlete.athleteId,
      athleteName: athlete.athleteName,
      cumulativePoints: athlete.cumulativePoints,
      rawDelay: athlete.rawDelay,
      startDelay: athlete.startDelay,
      isPackStart: athlete.isPackStart,
      shootingStation: station,
      gateAssignment: gate,
      startTimeFormatted: formatStartTime(athlete.startDelay),
    };
  });
}

/**
 * Format delay seconds as MM:SS.
 */
function formatStartTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
