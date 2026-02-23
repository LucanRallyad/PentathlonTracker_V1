import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/auth';
import { dataRetention } from '@/lib/privacy/dataRetention';
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from '@/lib/audit/auditLogger';

export async function POST(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  // Only super admins can run retention
  if (adminOrError.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
  }

  const result = await dataRetention.processRetention();

  await auditLogger.logFromRequest(
    req,
    AuditEventType.ADMIN_SETTING_CHANGE,
    AuditAction.DELETE,
    {
      severity: AuditSeverity.ALERT,
      targetType: 'DataRetention',
      details: { actions: result.actions },
    }
  );

  return NextResponse.json(result);
}
