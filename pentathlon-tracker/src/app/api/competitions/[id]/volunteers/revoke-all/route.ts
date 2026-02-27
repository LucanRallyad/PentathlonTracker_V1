import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) {
    return NextResponse.json(
      { error: "Competition not found" },
      { status: 404 }
    );
  }

  const result = await prisma.volunteer.updateMany({
    where: { competitionId: id, status: "active" },
    data: { status: "revoked" },
  });

  return NextResponse.json({
    success: true,
    revoked: result.count,
  });
}
