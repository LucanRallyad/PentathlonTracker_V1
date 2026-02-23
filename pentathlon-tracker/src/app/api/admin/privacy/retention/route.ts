import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';
import { RETENTION_PERIODS, dataRetention } from '@/lib/privacy/dataRetention';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const upcoming = await dataRetention.getUpcomingRetentions();

  const recentLogs = await prisma.dataRetentionLog.findMany({
    orderBy: { processedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    retentionPolicies: RETENTION_PERIODS,
    upcomingDeletions: upcoming,
    recentLogs,
  });
}
