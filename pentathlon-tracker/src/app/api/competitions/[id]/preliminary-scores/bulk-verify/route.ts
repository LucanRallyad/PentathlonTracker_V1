import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promoteScore } from "@/lib/promote-score";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const body = await req.json();
  const { ids } = body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "ids must be a non-empty array" },
      { status: 400 }
    );
  }

  const eventIds = (
    await prisma.event.findMany({
      where: { competitionId: id },
      select: { id: true },
    })
  ).map((e) => e.id);

  const scores = await prisma.preliminaryScore.findMany({
    where: {
      id: { in: ids },
      eventId: { in: eventIds },
      status: { in: ["preliminary", "rejected"] },
    },
    include: { event: { include: { competition: true } } },
  });

  if (scores.length === 0) {
    return NextResponse.json(
      { error: "No eligible scores found" },
      { status: 404 }
    );
  }

  const results: { id: string; officialScoreId: string }[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const score of scores) {
    try {
      const data = JSON.parse(score.data);
      const officialScoreId = await promoteScore(
        score.discipline,
        score.eventId,
        score.athleteId,
        data,
        score.event.competition.ageCategory
      );

      await prisma.preliminaryScore.update({
        where: { id: score.id },
        data: {
          status: "verified",
          verifiedAt: new Date(),
          verifiedBy: adminOrError.id,
          officialScoreId,
        },
      });

      results.push({ id: score.id, officialScoreId });
    } catch (err) {
      errors.push({
        id: score.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    verified: results.length,
    failed: errors.length,
    results,
    errors,
  });
}
