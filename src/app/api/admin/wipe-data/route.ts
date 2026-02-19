import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCode } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function POST(req: NextRequest) {
  const session = getSessionFromCookie(req.headers.get("cookie"));

  // Check if user is authenticated and is an admin
  if (!session || !("userId" in session)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  // Allow super_admin, admin, or official roles
  if (!user || (user.role !== "admin" && user.role !== "super_admin" && user.role !== "official")) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    // Delete in correct order to respect foreign key constraints
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete all score tables first (they reference both athletes and events)
      await tx.fencingRankingScore.deleteMany({});
      await tx.fencingDEScore.deleteMany({});
      await tx.obstacleScore.deleteMany({});
      await tx.swimmingScore.deleteMany({});
      await tx.laserRunScore.deleteMany({});
      await tx.ridingScore.deleteMany({});
      
      // Delete competition athletes (junction table)
      await tx.competitionAthlete.deleteMany({});
      
      // Delete training entries (references athletes)
      await tx.trainingEntry.deleteMany({});
      
      // Delete all athletes
      await tx.athlete.deleteMany({});

      // Delete competition events (references competitions)
      await tx.event.deleteMany({});
      
      // Delete all competitions
      await tx.competition.deleteMany({});
    });

    return NextResponse.json({
      success: true,
      message: "All competitions and athlete profiles have been wiped",
    });
  } catch (error) {
    console.error("Error wiping data:", error);
    // Use AppError for consistent error handling - never expose internal details
    return handleApiError(new AppError(ErrorCode.DATABASE_ERROR, "Failed to wipe data"));
  }
}
