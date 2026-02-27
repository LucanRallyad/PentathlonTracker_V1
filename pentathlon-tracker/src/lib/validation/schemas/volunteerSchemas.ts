import { z } from "zod";

export const createVolunteerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
}).refine((data) => data.email || data.phone, {
  message: "Email or phone is required",
});

export const bulkCreateVolunteersSchema = z.object({
  volunteers: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
  })).min(1, "At least one volunteer required"),
});

export const autoAssignSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export const launchAssignmentsSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export const batchAssignmentsSchema = z.object({
  assignments: z.array(z.object({
    volunteerId: z.string(),
    eventId: z.string(),
    role: z.enum(["timer", "referee", "judge", "recorder", "flagger"]),
    athleteIds: z.string().optional().nullable(),
    metadata: z.string().optional().nullable(),
  })),
});

export const volunteerScoreSubmissionSchema = z.object({
  eventId: z.string().min(1),
  athleteId: z.string().min(1),
  discipline: z.enum(["swimming", "fencing_ranking", "fencing_de", "obstacle", "laser_run", "riding"]),
  data: z.record(z.string(), z.unknown()),
});

export const rejectScoreSchema = z.object({
  reason: z.string().optional(),
});

export const correctScoreSchema = z.object({
  correctedData: z.record(z.string(), z.unknown()),
});

export const bulkVerifySchema = z.object({
  ids: z.array(z.string()).min(1, "At least one score ID required"),
});

export const releaseTargetsSchema = z.object({
  startMode: z.enum(["staggered", "mass"]),
  totalLaps: z.number().int().min(1).max(20),
});

export const targetAssignmentSchema = z.object({
  targetCount: z.number().int().min(1).max(20),
});

export const laserRunTimerSubmissionSchema = z.object({
  eventId: z.string().min(1),
  athleteId: z.string().min(1),
  overallTimeSeconds: z.number().min(0).max(3600),
  startMode: z.enum(["staggered", "mass"]),
  handicapStartDelay: z.number().int().min(0).max(600),
  isPackStart: z.boolean(),
  targetPosition: z.number().int().min(1),
  wave: z.number().int().min(1),
  gateAssignment: z.string(),
  totalLaps: z.number().int().min(1),
  laps: z.array(z.object({
    lap: z.number().int().min(1),
    splitTimestamp: z.number().min(0),
    type: z.enum(["shoot", "run"]),
  })),
  shootTimes: z.array(z.object({
    visit: z.number().int().min(1),
    shootTimeSeconds: z.number().min(0).max(70),
    timedOut: z.boolean(),
  })),
});
