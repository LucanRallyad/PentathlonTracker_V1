import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const sessions = await prisma.sessionInfo.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { lastActiveAt: 'desc' },
  });

  return NextResponse.json(sessions);
}

export async function DELETE(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  await prisma.sessionInfo.delete({ where: { id: sessionId } }).catch(() => null);

  return NextResponse.json({ success: true });
}
