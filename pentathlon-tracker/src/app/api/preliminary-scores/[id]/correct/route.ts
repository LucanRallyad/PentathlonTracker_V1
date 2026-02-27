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
  const body = await req.json();
  const { correctedData } = body;

  if (!correctedData || typeof correctedData !== "object") {
    return NextResponse.json(
      { error: "correctedData object is required" },
      { status: 400 }
    );
  }

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

  const officialScoreId = await promoteScore(
    score.discipline,
    score.eventId,
    score.athleteId,
    correctedData,
    score.event.competition.ageCategory
  );

  const updated = await prisma.preliminaryScore.update({
    where: { id },
    data: {
      status: "corrected",
      correctedData: JSON.stringify(correctedData),
      verifiedAt: new Date(),
      verifiedBy: adminOrError.id,
      officialScoreId,
    },
  });

  return NextResponse.json(updated);
}
