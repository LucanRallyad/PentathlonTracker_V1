import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promoteScore } from "@/lib/promote-score";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;

  const score = await prisma.preliminaryScore.findUnique({
    where: { id },
    include: { event: { include: { competition: true } } },
  });

  if (!score) {
    return NextResponse.json(
      { error: "Preliminary score not found" },
      { status: 404 }
    );
  }

  if (score.status === "verified") {
    return NextResponse.json(
      { error: "Score is already verified" },
      { status: 400 }
    );
  }

  try {
    const data = JSON.parse(score.data);
    const officialScoreId = await promoteScore(
      score.discipline,
      score.eventId,
      score.athleteId,
      data,
      score.event.competition.ageCategory
    );

    const updated = await prisma.preliminaryScore.update({
      where: { id },
      data: {
        status: "verified",
        verifiedAt: new Date(),
        verifiedBy: adminOrError.id,
        officialScoreId,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to promote score" },
      { status: 500 }
    );
  }
}
