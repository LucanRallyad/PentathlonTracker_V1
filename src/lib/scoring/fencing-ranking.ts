import { FENCING_VICTORY_VALUE_TABLE } from "./constants";
import type { FencingRankingInput } from "./types";

/**
 * Calculate fencing ranking round MP points.
 * Formula: MP_points = 250 + (victories - victories_for_250) * value_per_victory
 *
 * The victory value table is keyed by total_bouts (19-60).
 * For bouts outside the table range, we compute it:
 *   victories_for_250 = round(total_bouts * 0.70)
 *   value_per_victory = round(250 / victories_for_250)
 */
export function calculateFencingRanking(input: FencingRankingInput): number {
  const { victories, totalBouts } = input;

  if (totalBouts <= 0) return 0;

  let victoriesFor250: number;
  let valuePerVictory: number;

  const tableEntry = FENCING_VICTORY_VALUE_TABLE[totalBouts];
  if (tableEntry) {
    victoriesFor250 = tableEntry.victoriesFor250;
    valuePerVictory = tableEntry.valuePerVictory;
  } else {
    // Fallback for bouts outside the table range
    victoriesFor250 = Math.round(totalBouts * 0.7);
    valuePerVictory = Math.round(250 / victoriesFor250);
  }

  const points = 250 + (victories - victoriesFor250) * valuePerVictory;
  return Math.max(0, points);
}

/**
 * Get the fencing ranking round parameters for a given number of competitors.
 */
export function getFencingRankingParams(numCompetitors: number) {
  const totalBouts = numCompetitors - 1;

  const tableEntry = FENCING_VICTORY_VALUE_TABLE[totalBouts];
  if (tableEntry) {
    return {
      totalBouts,
      victoriesFor250: tableEntry.victoriesFor250,
      valuePerVictory: tableEntry.valuePerVictory,
    };
  }

  const victoriesFor250 = Math.round(totalBouts * 0.7);
  const valuePerVictory =
    victoriesFor250 > 0 ? Math.round(250 / victoriesFor250) : 0;
  return { totalBouts, victoriesFor250, valuePerVictory };
}
