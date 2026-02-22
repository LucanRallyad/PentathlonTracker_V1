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
 * Convert a time string to hundredths of a second.
 * Accepts formats: M:SS.hh, M:SS, :SS, :SS.hh, SS.hh, or plain seconds.
 * E.g. "1:10.00" -> 7000, "1:10" -> 7000, ":45" -> 4500, "70.50" -> 7050, "70" -> 7000
 */
export function parseSwimmingTime(timeStr: string): number {
  const trimmed = timeStr.trim();
  if (!trimmed) return 0;

  // Format: M:SS.hh or M:SS.h or M:SS (with minutes)
  const minsec = trimmed.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (minsec) {
    const minutes = parseInt(minsec[1], 10);
    const seconds = parseInt(minsec[2], 10);
    const hhStr = minsec[3] || "0";
    const hundredths = parseInt(hhStr.length === 1 ? hhStr + "0" : hhStr, 10);
    return minutes * 6000 + seconds * 100 + hundredths;
  }

  // Format: :SS or :SS.hh (leading colon, seconds only)
  const colonSec = trimmed.match(/^:(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (colonSec) {
    const seconds = parseInt(colonSec[1], 10);
    const hhStr = colonSec[2] || "0";
    const hundredths = parseInt(hhStr.length === 1 ? hhStr + "0" : hhStr, 10);
    return seconds * 100 + hundredths;
  }

  // Format: SS.hh (seconds with decimal, no colon)
  const secDec = trimmed.match(/^(\d+)\.(\d{1,2})$/);
  if (secDec) {
    const hh = secDec[2].length === 1 ? secDec[2] + "0" : secDec[2];
    return parseInt(secDec[1], 10) * 100 + parseInt(hh, 10);
  }

  // Format: plain number (treat as seconds)
  const plain = parseFloat(trimmed);
  if (!isNaN(plain) && plain > 0) {
    return Math.round(plain * 100);
  }

  return 0;
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
