import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { searchParams } = new URL(req.url);
  const eventType = searchParams.get('eventType');
  const severity = searchParams.get('severity');
  const actorId = searchParams.get('actorId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  const where: Record<string, unknown> = {};
  if (eventType) where.eventType = eventType;
  if (severity) where.severity = severity;
  if (actorId) where.actorId = { contains: actorId };
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) (where.timestamp as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.timestamp as Record<string, unknown>).lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
