import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10000,
  });

  const csv = [
    'ID,Timestamp,EventType,Severity,ActorId,ActorRole,ActorIp,TargetType,TargetId,Action,RequestPath,RequestMethod,ResponseStatus',
    ...logs.map(l =>
      [l.id, l.timestamp.toISOString(), l.eventType, l.severity, l.actorId, l.actorRole, l.actorIp, l.targetType, l.targetId, l.action, l.requestPath, l.requestMethod, l.responseStatus].join(',')
    ),
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
