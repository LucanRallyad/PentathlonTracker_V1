import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id, vid } = await params;
  const body = await req.json();
  const { name, status } = body;

  const volunteer = await prisma.volunteer.findFirst({
    where: { id: vid, competitionId: id },
  });

  if (!volunteer) {
    return NextResponse.json(
      { error: "Volunteer not found" },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (status !== undefined) {
    if (!["active", "revoked"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'active' or 'revoked'" },
        { status: 400 }
      );
    }
    updateData.status = status;
  }

  const updated = await prisma.volunteer.update({
    where: { id: vid },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id, vid } = await params;

  const volunteer = await prisma.volunteer.findFirst({
    where: { id: vid, competitionId: id },
  });

  if (!volunteer) {
    return NextResponse.json(
      { error: "Volunteer not found" },
      { status: 404 }
    );
  }

  await prisma.volunteer.delete({ where: { id: vid } });

  return NextResponse.json({ success: true });
}
