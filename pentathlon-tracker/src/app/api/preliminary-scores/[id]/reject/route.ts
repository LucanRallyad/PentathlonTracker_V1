import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const body = await req.json();
  const { reason } = body;

  if (!reason) {
    return NextResponse.json(
      { error: "Rejection reason is required" },
      { status: 400 }
    );
  }

  const score = await prisma.preliminaryScore.findUnique({ where: { id } });
  if (!score) {
    return NextResponse.json(
      { error: "Preliminary score not found" },
      { status: 404 }
    );
  }

  if (score.status === "verified") {
    return NextResponse.json(
      { error: "Cannot reject an already verified score" },
      { status: 400 }
    );
  }

  const updated = await prisma.preliminaryScore.update({
    where: { id },
    data: {
      status: "rejected",
      rejectionReason: reason,
      verifiedAt: new Date(),
      verifiedBy: adminOrError.id,
    },
  });

  return NextResponse.json(updated);
}
