import { OBSTACLE_CONFIG } from "./constants";
import type { ObstacleInput } from "./types";

/**
 * Calculate obstacle MP points.
 * Formula: MP_points = 400 - round((time_seconds - base_time) / 0.33) - penalty_points
 */
export function calculateObstacle(input: ObstacleInput): number {
  const { timeSeconds, penaltyPoints = 0, isRelay = false } = input;

  const config = isRelay ? OBSTACLE_CONFIG.relay : OBSTACLE_CONFIG.individual;

  const timeDiff = timeSeconds - config.baseTimeSeconds;
  const pointsFromTime = Math.round(timeDiff / config.secondsPerPoint);
  const points = config.basePoints - pointsFromTime - penaltyPoints;

  return Math.max(0, points);
}
