import { z } from 'zod';

const baseScoreEntry = z.object({
  athleteId: z.string().min(1, 'Athlete ID is required'),
});

export const fencingRankingEntry = baseScoreEntry.extend({
  victories: z.number().int().min(0).max(100),
  totalBouts: z.number().int().min(1).max(100),
});

export const fencingDEEntry = baseScoreEntry.extend({
  placement: z.number().int().min(1).max(100),
});

export const obstacleEntry = baseScoreEntry.extend({
  timeSeconds: z.number().min(0).max(600),
  penaltyPoints: z.number().int().min(0).max(100).optional().default(0),
});

export const swimmingEntry = baseScoreEntry.extend({
  timeHundredths: z.number().int().min(0).max(100000),
  penaltyPoints: z.number().int().min(0).max(100).optional().default(0),
});

export const laserRunEntry = baseScoreEntry.extend({
  finishTimeSeconds: z.number().min(0).max(3600),
  handicapStartDelay: z.number().int().min(0).optional().default(0),
  rawDelay: z.number().int().min(0).optional().default(0),
  isPackStart: z.boolean().optional().default(false),
  shootingStation: z.number().int().min(0).max(20).optional().default(0),
  gateAssignment: z.enum(['A', 'B', 'P']).optional().default('A'),
  penaltySeconds: z.number().int().min(0).max(600).optional().default(0),
  startMode: z.enum(["staggered", "mass"]).optional().default("staggered"),
  overallTimeSeconds: z.number().min(0).max(3600).optional(),
  totalShootTimeSeconds: z.number().min(0).max(3600).optional(),
  totalRunTimeSeconds: z.number().min(0).max(3600).optional(),
  adjustedTimeSeconds: z.number().min(0).max(3600).optional(),
  shootingDetail: z.string().optional(),
});

export const ridingEntry = baseScoreEntry.extend({
  knockdowns: z.number().int().min(0).max(50).optional().default(0),
  disobediences: z.number().int().min(0).max(50).optional().default(0),
  timeOverSeconds: z.number().int().min(0).max(600).optional().default(0),
  otherPenalties: z.number().int().min(0).max(500).optional().default(0),
});

export const scoreSubmissionSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  scores: z.array(z.union([
    fencingRankingEntry,
    fencingDEEntry,
    obstacleEntry,
    swimmingEntry,
    laserRunEntry,
    ridingEntry,
  ])).min(1, 'At least one score entry is required'),
}).strict();

const disciplineEnum = z.enum([
  'fencing_ranking', 'fencing_de', 'obstacle', 'swimming', 'laser_run', 'riding',
]);

export const scoreQuerySchema = z.object({
  eventId: z.string().optional(),
  discipline: disciplineEnum.optional(),
});
