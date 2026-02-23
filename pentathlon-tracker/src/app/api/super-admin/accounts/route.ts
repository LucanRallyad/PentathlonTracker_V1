import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (isErrorResponse(admin)) return admin;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      passwordChangedAt: true,
      forcePasswordChange: true,
      accountLockout: {
        select: {
          failedAttempts: true,
          lockoutUntil: true,
          escalationLevel: true,
        },
      },
      sessionInfos: {
        where: { expiresAt: { gt: new Date() } },
        select: { id: true, lastActiveAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enrichedUsers = users.map((u) => ({
    ...u,
    activeSessions: u.sessionInfos.length,
    lastActive: u.sessionInfos[0]?.lastActiveAt || u.updatedAt,
    isLocked: u.accountLockout?.lockoutUntil
      ? new Date() < u.accountLockout.lockoutUntil
      : false,
  }));

  return NextResponse.json(enrichedUsers);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (isErrorResponse(admin)) return admin;

  const { userId, action, value } = await req.json();

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  // Prevent modifying own super_admin account's role
  if (action === "changeRole" && userId === admin.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  switch (action) {
    case "changeRole": {
      const validRoles = ["super_admin", "admin", "official", "athlete"];
      if (!validRoles.includes(value)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: { role: value } });
      return NextResponse.json({ success: true, message: `Role changed to ${value}` });
    }

    case "forcePasswordChange": {
      await prisma.user.update({ where: { id: userId }, data: { forcePasswordChange: true } });
      return NextResponse.json({ success: true, message: "User will be required to change password on next login" });
    }

    case "unlock": {
      await prisma.accountLockout.deleteMany({ where: { userId } });
      return NextResponse.json({ success: true, message: "Account unlocked" });
    }

    case "terminateSessions": {
      await prisma.sessionInfo.deleteMany({ where: { userId } });
      return NextResponse.json({ success: true, message: "All sessions terminated" });
    }

    case "toggleActive": {
      // We use a lockout with a far-future date to "disable" an account
      if (value === "disable") {
        await prisma.accountLockout.upsert({
          where: { userId },
          create: {
            userId,
            failedAttempts: 0,
            lockoutUntil: new Date("2099-12-31"),
            escalationLevel: 99,
          },
          update: {
            lockoutUntil: new Date("2099-12-31"),
            escalationLevel: 99,
          },
        });
        // Also terminate all sessions
        await prisma.sessionInfo.deleteMany({ where: { userId } });
        return NextResponse.json({ success: true, message: "Account disabled" });
      } else {
        await prisma.accountLockout.deleteMany({ where: { userId } });
        return NextResponse.json({ success: true, message: "Account enabled" });
      }
    }

    case "changeName": {
      if (!value || typeof value !== "string" || value.trim().length < 2) {
        return NextResponse.json({ error: "Valid name required" }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: { name: value.trim() } });
      return NextResponse.json({ success: true, message: "Name updated" });
    }

    case "changeEmail": {
      if (!value || typeof value !== "string" || !value.includes("@")) {
        return NextResponse.json({ error: "Valid email required" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { email: value.trim().toLowerCase() } });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      await prisma.user.update({ where: { id: userId }, data: { email: value.trim().toLowerCase() } });
      return NextResponse.json({ success: true, message: "Email updated" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (isErrorResponse(admin)) return admin;

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (userId === admin.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Clean up related data first
  await prisma.sessionInfo.deleteMany({ where: { userId } });
  await prisma.passwordHistory.deleteMany({ where: { userId } });
  await prisma.accountLockout.deleteMany({ where: { userId } });
  await prisma.policyAcceptance.deleteMany({ where: { userId } });

  // Unlink any linked athlete
  await prisma.athlete.updateMany({ where: { userId }, data: { userId: null } });

  // Delete the user
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true, message: "User deleted" });
}
