import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get('severity');
  const acknowledged = searchParams.get('acknowledged');

  const where: Record<string, unknown> = {};
  if (severity) where.severity = severity;
  if (acknowledged !== null && acknowledged !== undefined) {
    where.acknowledged = acknowledged === 'true';
  }

  const alerts = await prisma.securityAlert.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return NextResponse.json(alerts);
}

export async function PATCH(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { alertId, acknowledgeAll } = await req.json();

  if (acknowledgeAll) {
    await prisma.securityAlert.updateMany({
      where: { acknowledged: false },
      data: {
        acknowledged: true,
        acknowledgedBy: adminOrError.id,
        acknowledgedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (alertId) {
    await prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedBy: adminOrError.id,
        acknowledgedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
