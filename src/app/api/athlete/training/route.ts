import { NextRequest, NextResponse } from "next/server";
import { resolveAthleteFromSession, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFencingRanking } from "@/lib/scoring/fencing-ranking";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { calculateObstacle } from "@/lib/scoring/obstacle";
import { calculateSwimming } from "@/lib/scoring/swimming";
import { calculateLaserRun } from "@/lib/scoring/laser-run";
import { calculateRiding } from "@/lib/scoring/riding";
import type { AgeCategory } from "@/lib/scoring/types";
import { trainingEntrySchema, deleteTrainingEntrySchema, validateRequest } from "@/lib/validation/schemas";

/**
 * GET /api/athlete/training?discipline=obstacle
 * Returns all training entries for the logged-in athlete, optionally filtered by discipline.
 */
export async function GET(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  const { athleteId, isAdmin } = result;
  if (isAdmin) {
    return NextResponse.json({ error: "Admins do not have athlete training entries" }, { status: 400 });
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });
  if (!athlete) {
    return NextResponse.json({ error: "No athlete profile linked" }, { status: 404 });
  }

  const discipline = req.nextUrl.searchParams.get("discipline");

  const entries = await prisma.trainingEntry.findMany({
    where: {
      athleteId: athlete.id,
      ...(discipline ? { discipline } : {}),
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

/**
 * POST /api/athlete/training
 * Create a new training entry for the logged-in athlete.
 */
export async function POST(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  const { athleteId, isAdmin } = result;
  if (isAdmin) {
    return NextResponse.json({ error: "Admins do not have athlete training entries" }, { status: 400 });
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });
  if (!athlete) {
    return NextResponse.json({ error: "No athlete profile linked" }, { status: 404 });
  }

  // Validate request body with Zod
  const validation = await validateRequest(req, trainingEntrySchema);
  if (!validation.success) {
    return validation.response;
  }

  const {
    discipline,
    date,
    notes,
    points,
    timeSeconds,
    timeHundredths,
    victories,
    totalBouts,
    placement,
    knockdowns,
    disobediences,
  } = validation.data;

  // Auto-calculate points from raw data if not explicitly provided
  let resolvedPoints: number | null = points != null ? Number(points) : null;

  if (resolvedPoints == null) {
    const ageCategory = (athlete.ageCategory || "Senior") as AgeCategory;

    switch (discipline) {
      case "fencingRanking":
        if (victories != null && totalBouts != null && Number(totalBouts) > 0) {
          resolvedPoints = calculateFencingRanking({
            victories: Number(victories),
            totalBouts: Number(totalBouts),
          });
        }
        break;
      case "fencingDE":
        if (placement != null && Number(placement) > 0) {
          resolvedPoints = calculateFencingDE({ placement: Number(placement) });
        }
        break;
      case "obstacle":
        if (timeSeconds != null && Number(timeSeconds) > 0) {
          resolvedPoints = calculateObstacle({ timeSeconds: Number(timeSeconds) });
        }
        break;
      case "swimming":
        if (timeHundredths != null && Number(timeHundredths) > 0) {
          resolvedPoints = calculateSwimming({
            timeHundredths: Number(timeHundredths),
            ageCategory,
            gender: (athlete.gender as "M" | "F") || "M",
          });
        }
        break;
      case "laserRun":
        if (timeSeconds != null && Number(timeSeconds) > 0) {
          resolvedPoints = calculateLaserRun({
            finishTimeSeconds: Number(timeSeconds),
            ageCategory,
          });
        }
        break;
      case "riding":
        if (knockdowns != null && disobediences != null) {
          resolvedPoints = calculateRiding({
            knockdowns: Number(knockdowns),
            disobediences: Number(disobediences),
            timeOverSeconds: 0,
          });
        }
        break;
    }
  }

  const entry = await prisma.trainingEntry.create({
    data: {
      athleteId: athlete.id,
      discipline,
      date,
      notes: notes || null,
      points: resolvedPoints,
      timeSeconds: timeSeconds != null ? Number(timeSeconds) : null,
      timeHundredths: timeHundredths != null ? Number(timeHundredths) : null,
      victories: victories != null ? Number(victories) : null,
      totalBouts: totalBouts != null ? Number(totalBouts) : null,
      placement: placement != null ? Number(placement) : null,
      knockdowns: knockdowns != null ? Number(knockdowns) : null,
      disobediences: disobediences != null ? Number(disobediences) : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

/**
 * DELETE /api/athlete/training
 * Delete a training entry by id (body: { id: string }).
 */
export async function DELETE(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  const { athleteId, isAdmin } = result;
  if (isAdmin) {
    return NextResponse.json({ error: "Admins do not have athlete training entries" }, { status: 400 });
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });
  if (!athlete) {
    return NextResponse.json({ error: "No athlete profile linked" }, { status: 404 });
  }

  // Validate request body with Zod
  const validation = await validateRequest(req, deleteTrainingEntrySchema);
  if (!validation.success) {
    return validation.response;
  }

  const { id } = validation.data;

  // Ensure the entry belongs to this athlete
  const entry = await prisma.trainingEntry.findFirst({
    where: { id, athleteId: athlete.id },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await prisma.trainingEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
