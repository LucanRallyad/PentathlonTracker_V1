import { FENCING_DE_PLACEMENT_POINTS } from "./constants";
import type { FencingDEInput } from "./types";

/**
 * Calculate fencing Direct Elimination MP points based on placement.
 * Fixed lookup: 1st=250, 2nd=244, ... 18th=196.
 * Eliminated in initial bout = 0 points.
 */
export function calculateFencingDE(input: FencingDEInput): number {
  const { placement } = input;

  if (placement <= 0) return 0;

  const points = FENCING_DE_PLACEMENT_POINTS[placement];
  if (points !== undefined) return points;

  // Beyond 18th place: 0 points (eliminated in initial bout)
  return 0;
}

/**
 * Get all available DE placement points for display.
 */
export function getAllDEPlacements(): { place: number; points: number }[] {
  return Object.entries(FENCING_DE_PLACEMENT_POINTS)
    .map(([place, points]) => ({
      place: parseInt(place, 10),
      points,
    }))
    .sort((a, b) => a.place - b.place);
}
