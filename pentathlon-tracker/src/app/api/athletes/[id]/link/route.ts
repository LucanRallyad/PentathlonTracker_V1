import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";

// POST /api/athletes/:id/link — link an athlete to a user account (admin only)
// Body: { userId: string } or { email: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PROTECTED: only admins can link athletes to accounts
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: athleteId } = await params;

  try {
    const body = await req.json();

    const athlete = await prisma.athlete.findUnique({ where: { id: athleteId } });
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }

    let userId = body.userId as string | undefined;

    // If email provided instead of userId, look up the user
    if (!userId && body.email) {
      const user = await prisma.user.findUnique({
        where: { email: (body.email as string).toLowerCase().trim() },
      });
      if (!user) {
        return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
      }
      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "userId or email is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if this user is already linked to a different athlete
    const alreadyLinked = await prisma.athlete.findUnique({ where: { userId } });
    if (alreadyLinked && alreadyLinked.id !== athleteId) {
      return NextResponse.json(
        { error: `This user is already linked to athlete ${alreadyLinked.firstName} ${alreadyLinked.lastName}` },
        { status: 409 }
      );
    }

    const updated = await prisma.athlete.update({
      where: { id: athleteId },
      data: { userId },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to link athlete" }, { status: 500 });
  }
}

// DELETE /api/athletes/:id/link — unlink an athlete from a user account (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PROTECTED: only admins can unlink athletes
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: athleteId } = await params;

  try {
    const athlete = await prisma.athlete.findUnique({ where: { id: athleteId } });
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }

    const updated = await prisma.athlete.update({
      where: { id: athleteId },
      data: { userId: null },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to unlink athlete" }, { status: 500 });
  }
}
