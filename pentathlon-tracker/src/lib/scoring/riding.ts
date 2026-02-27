import { RIDING_CONFIG } from "./constants";
import type { RidingInput } from "./types";

/**
 * Calculate riding MP points (Masters only).
 * Formula: MP_points = 300 - total_penalty_points
 *
 * Penalties:
 *   - Knockdown: 7 pts each
 *   - Disobedience: 10 pts each
 *   - Time over: 1 pt per second
 *   - Other: 10 pts each
 */
export function calculateRiding(input: RidingInput): number {
  const { knockdowns, disobediences, timeOverSeconds, otherPenalties = 0 } =
    input;

  const totalPenalty =
    knockdowns * RIDING_CONFIG.knockdownPenalty +
    disobediences * RIDING_CONFIG.disobediencePenalty +
    timeOverSeconds * RIDING_CONFIG.timeOverPenaltyPerSecond +
    otherPenalties * RIDING_CONFIG.otherPenalty;

  const points = RIDING_CONFIG.basePoints - totalPenalty;
  return Math.max(0, points);
}
