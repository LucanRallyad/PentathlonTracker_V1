import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

/**
 * Zod validation schemas for API request validation.
 * These schemas ensure type safety and prevent invalid data from reaching the database.
 */

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required").max(255),
  password: z.string().min(1, "Password is required"),
  name: z.string().max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const athleteLoginSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

// ─── Training Entry Schema ───────────────────────────────────────────────────

export const trainingEntrySchema = z.object({
  discipline: z.enum([
    "fencingRanking",
    "fencingDE",
    "obstacle",
    "swimming",
    "laserRun",
    "riding",
  ], {
    error: "Invalid discipline",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  notes: z.string().max(1000).nullable().optional(),
  points: z.number().min(0).max(10000).nullable().optional(),
  timeSeconds: z.number().min(0).max(3600).nullable().optional(),
  timeHundredths: z.number().min(0).max(360000).nullable().optional(),
  victories: z.number().int().min(0).max(1000).nullable().optional(),
  totalBouts: z.number().int().min(0).max(1000).nullable().optional(),
  placement: z.number().int().min(1).max(1000).nullable().optional(),
  knockdowns: z.number().int().min(0).max(100).nullable().optional(),
  disobediences: z.number().int().min(0).max(100).nullable().optional(),
});

export const deleteTrainingEntrySchema = z.object({
  id: z.string().min(1, "Entry ID is required"),
});

// ─── Competition Schemas ─────────────────────────────────────────────────────

export const competitionUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  location: z.string().max(255).optional(),
  status: z.enum(["upcoming", "active", "completed"]).optional(),
  ageCategory: z.string().max(50).optional(),
  competitionType: z.string().max(50).optional(),
}).refine(
  (data) => {
    // If endDate is provided, date must also be provided
    if (data.endDate && !data.date) return false;
    // If both dates provided, endDate should be >= date
    if (data.endDate && data.date) {
      return new Date(data.endDate) >= new Date(data.date);
    }
    return true;
  },
  { message: "End date must be after or equal to start date" }
);

export const competitionCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  location: z.string().min(1, "Location is required").max(255),
  ageCategory: z.string().min(1).max(50),
  competitionType: z.string().max(50).optional(),
  status: z.enum(["upcoming", "active", "completed"]).default("upcoming"),
}).refine(
  (data) => {
    if (data.endDate) {
      return new Date(data.endDate) >= new Date(data.date);
    }
    return true;
  },
  { message: "End date must be after or equal to start date" }
);

// ─── Event Schema ───────────────────────────────────────────────────────────

export const eventStatusUpdateSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  status: z.enum(["pending", "in_progress", "completed"], {
    error: "Status must be pending, in_progress, or completed",
  }),
});

// ─── Score Entry Schemas ────────────────────────────────────────────────────

export const fencingRankingScoreSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  victories: z.number().int().min(0).max(1000),
  totalBouts: z.number().int().min(1).max(1000),
});

export const fencingDEScoreSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  placement: z.number().int().min(1).max(1000),
});

export const obstacleScoreSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  timeSeconds: z.number().min(0).max(3600),
  penaltyPoints: z.number().int().min(0).max(1000).optional().default(0),
});

export const swimmingScoreSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  timeHundredths: z.number().int().min(0).max(360000),
  penaltyPoints: z.number().int().min(0).max(1000).optional().default(0),
});

export const laserRunScoreSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  finishTimeSeconds: z.number().min(0).max(3600),
  penaltySeconds: z.number().int().min(0).max(600).optional().default(0),
});

export const ridingScoreSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  knockdowns: z.number().int().min(0).max(100),
  disobediences: z.number().int().min(0).max(100),
  timeOverSeconds: z.number().int().min(0).max(600).optional().default(0),
  otherPenalties: z.number().int().min(0).max(1000).optional().default(0),
});

// ─── Athlete Schema ─────────────────────────────────────────────────────────

export const athleteCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  country: z.string().length(3, "Country must be 3-letter code (e.g. CAN, USA)").default(""),
  ageCategory: z.string().max(50).optional(),
  gender: z.enum(["M", "F"]).optional(),
  club: z.string().max(255).nullable().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const athleteUpdateSchema = athleteCreateSchema.partial();

// ─── User Schema ────────────────────────────────────────────────────────────

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(["athlete", "official", "admin", "super_admin"]).optional(),
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Validate request body against a Zod schema and return parsed data or error response
 */
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { AppError, ErrorCode } = await import("@/lib/errors/AppError");
      const validationErrors: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join(".");
        validationErrors[path] = err.message;
      });
      const appError = new AppError(ErrorCode.VALIDATION_FAILED, "Validation failed", validationErrors);
      return { success: false, response: NextResponse.json(appError.toClientJSON(), { status: 400 }) };
    }
    const { AppError, ErrorCode } = await import("@/lib/errors/AppError");
    const appError = new AppError(ErrorCode.INVALID_INPUT, "Invalid request data");
    return { success: false, response: NextResponse.json(appError.toClientJSON(), { status: 400 }) };
  }
}
