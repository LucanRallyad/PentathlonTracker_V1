import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/auth';
import { dataDeletion } from '@/lib/privacy/dataDeletion';
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from '@/lib/audit/auditLogger';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;

  const requests = await dataDeletion.getRequests(status);
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { athleteId, reason } = await req.json();
  if (!athleteId) {
    return NextResponse.json({ error: 'Athlete ID required' }, { status: 400 });
  }

  const result = await dataDeletion.createAdminRequest(athleteId, adminOrError.id, reason);

  await auditLogger.logFromRequest(
    req,
    AuditEventType.PRIVACY_DELETION_REQUEST,
    AuditAction.CREATE,
    {
      severity: AuditSeverity.ALERT,
      targetType: 'DeletionRequest',
      targetId: result.id,
      details: { athleteId, adminId: adminOrError.id, reason },
    }
  );

  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { requestId, action } = await req.json();

  if (action === 'cancel') {
    const cancelled = await dataDeletion.cancelRequest(requestId);
    if (!cancelled) {
      return NextResponse.json({ error: 'Cannot cancel this request' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
