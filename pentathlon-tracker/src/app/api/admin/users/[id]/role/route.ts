import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { withCsrfProtection } from "@/lib/security/csrf";

// PATCH /api/admin/users/:id/role — promote or demote a user (admin only)
// Body: { role: "admin" | "athlete" | "official" }
async function patchUserRoleHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: targetUserId } = await params;

  try {
    const { role } = await req.json();

    const validRoles = ["admin", "official", "athlete"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent admins from demoting themselves
    if (targetUserId === adminOrError.id && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot demote yourself. Ask another admin to do this." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

export const PATCH = withCsrfProtection(patchUserRoleHandler);
