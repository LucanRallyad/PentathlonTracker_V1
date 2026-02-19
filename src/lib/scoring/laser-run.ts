import { getLaserRunTargetTime } from "./constants";
import type { AgeCategory, LaserRunInput } from "./types";

/**
 * Calculate Laser Run MP points.
 * Formula: laser_run_pts = 500 + (target_time_seconds - finish_time_seconds) - penalty_seconds
 *
 * 1 second = 1 MP point
 * Penalty seconds are equivalent to MP point deductions.
 */
export function calculateLaserRun(input: LaserRunInput): number {
  const {
    finishTimeSeconds,
    penaltySeconds = 0,
    ageCategory = "Senior" as AgeCategory,
    isRelay = false,
  } = input;

  const targetTime = getLaserRunTargetTime(ageCategory, isRelay);

  // Points = 500 + (target - finish) - penalties
  const points =
    500 + (targetTime - finishTimeSeconds) - penaltySeconds;

  return Math.max(0, Math.round(points));
}

/**
 * Format seconds to MM:SS display string.
 */
export function formatLaserRunTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Parse MM:SS string to total seconds.
 */
export function parseLaserRunTime(timeStr: string): number {
  // Accept M:SS or MM:SS (also M:S for convenience)
  const match = timeStr.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!match) {
    // Try plain seconds
    const num = parseFloat(timeStr);
    return isNaN(num) ? 0 : num;
  }
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const frac = match[3] ? parseFloat(`0.${match[3]}`) : 0;
  return minutes * 60 + seconds + frac;
}
