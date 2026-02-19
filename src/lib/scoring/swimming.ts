import { getSwimmingConfig } from "./constants";
import type { AgeCategory, SwimmingInput } from "./types";

/**
 * Calculate swimming MP points.
 * Formula: MP_points = 250 - floor((time_hundredths - base_time_hundredths) / increment)
 *
 * Times are banded in 0.20s groups: .00-.19, .20-.39, .40-.59, .60-.79, .80-.99
 * for standard categories, or 0.50s for youth.
 */
export function calculateSwimming(input: SwimmingInput): number {
  const {
    timeHundredths,
    penaltyPoints = 0,
    ageCategory = "Senior" as AgeCategory,
    gender,
  } = input;

  const config = getSwimmingConfig(ageCategory, gender);

  const timeDiff = timeHundredths - config.baseTimeHundredths;
  const pointsFromTime = Math.floor(timeDiff / config.incrementHundredths);
  const points = config.basePoints - pointsFromTime - penaltyPoints;

  return Math.max(0, points);
}

/**
 * Convert MM:SS.hh string to hundredths of a second.
 * E.g. "01:10.00" -> 7000, "00:50.23" -> 5023
 */
export function parseSwimmingTime(timeStr: string): number {
  // Accept M:SS.hh, M:SS.h, or M:SS (assumes .00 if no hundredths)
  const match = timeStr.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!match) return 0;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const hhStr = match[3] || "0";
  // Pad to 2 digits: "5" → "50", "05" → "05"
  const hundredths = parseInt(hhStr.length === 1 ? hhStr + "0" : hhStr, 10);

  return minutes * 6000 + seconds * 100 + hundredths;
}

/**
 * Convert hundredths of a second to MM:SS.hh string.
 */
export function formatSwimmingTime(hundredths: number): string {
  const totalSeconds = Math.floor(hundredths / 100);
  const remainingHundredths = hundredths % 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${remainingHundredths.toString().padStart(2, "0")}`;
}
