import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const alerts = await prisma.securityAlert.groupBy({
    by: ['severity'],
    where: { acknowledged: false },
    _count: true,
  });

  const counts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const alert of alerts) {
    counts[alert.severity] = alert._count;
  }

  return NextResponse.json(counts);
}
