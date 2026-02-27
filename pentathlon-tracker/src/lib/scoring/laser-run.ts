import { getLaserRunTargetTime } from "./constants";
import type {
  AgeCategory,
  LaserRunInput,
  LaserRunTimerData,
  LaserRunAggregatedLap,
  LaserRunAggregatedRecord,
} from "./types";

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
    overallTimeSeconds,
    penaltySeconds = 0,
    ageCategory = "Senior" as AgeCategory,
    isRelay = false,
  } = input;

  const effectiveTime = overallTimeSeconds ?? finishTimeSeconds;
  const targetTime = getLaserRunTargetTime(ageCategory, isRelay);

  const points = 500 + (targetTime - effectiveTime) - penaltySeconds;

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

export function computeLaserRunAggregation(data: LaserRunTimerData): LaserRunAggregatedRecord {
  const totalShootTimeSeconds = data.shootTimes.reduce((sum, st) => sum + st.shootTimeSeconds, 0);
  const totalRunTimeSeconds = data.overallTimeSeconds - totalShootTimeSeconds;
  const adjustedTimeSeconds = data.startMode === "mass"
    ? data.overallTimeSeconds - data.handicapStartDelay
    : null;

  const laps: LaserRunAggregatedLap[] = data.laps.map((lap, idx) => {
    const prevSplit = idx === 0 ? 0 : data.laps[idx - 1].splitTimestamp;
    const lapTimeSeconds = lap.splitTimestamp - prevSplit;

    let shootTimeSeconds: number | null = null;
    if (lap.type === "shoot") {
      const shootIdx = data.laps.slice(0, idx + 1).filter(l => l.type === "shoot").length - 1;
      if (data.shootTimes[shootIdx]) {
        shootTimeSeconds = data.shootTimes[shootIdx].shootTimeSeconds;
      }
    }

    const runTimeSeconds = shootTimeSeconds !== null
      ? lapTimeSeconds - shootTimeSeconds
      : lapTimeSeconds;

    return {
      lap: lap.lap,
      splitTimestamp: lap.splitTimestamp,
      lapTimeSeconds,
      type: lap.type,
      shootTimeSeconds,
      runTimeSeconds,
    };
  });

  return {
    overallTimeSeconds: data.overallTimeSeconds,
    adjustedTimeSeconds,
    totalShootTimeSeconds,
    totalRunTimeSeconds,
    penaltySeconds: 0,
    startMode: data.startMode,
    totalLaps: data.totalLaps,
    laps,
    handicapStartDelay: data.handicapStartDelay,
    isPackStart: data.isPackStart,
    gateAssignment: data.gateAssignment,
    targetPosition: data.targetPosition,
    wave: data.wave,
  };
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
