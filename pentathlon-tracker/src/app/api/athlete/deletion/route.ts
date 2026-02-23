import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteFromSession, isErrorResponse } from '@/lib/auth';
import { dataDeletion } from '@/lib/privacy/dataDeletion';
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from '@/lib/audit/auditLogger';

export async function POST(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  if (!result.athleteId) {
    return NextResponse.json({ error: 'No athlete profile linked' }, { status: 403 });
  }

  const deleteResult = await dataDeletion.createSelfRequest(result.athleteId);

  if (!deleteResult.success) {
    return NextResponse.json({ error: deleteResult.error }, { status: 400 });
  }

  await auditLogger.logFromRequest(
    req,
    AuditEventType.PRIVACY_DELETION_REQUEST,
    AuditAction.CREATE,
    {
      severity: AuditSeverity.ALERT,
      targetType: 'DeletionRequest',
      targetId: deleteResult.requestId,
      details: { athleteId: result.athleteId, type: 'self-service' },
    }
  );

  return NextResponse.json({
    message: 'Deletion request created. You have 14 days to cancel.',
    requestId: deleteResult.requestId,
    scheduledDate: deleteResult.scheduledDate,
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  const { requestId } = await req.json();
  if (!requestId) {
    return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
  }

  const cancelled = await dataDeletion.cancelRequest(requestId);
  if (!cancelled) {
    return NextResponse.json({ error: 'Cannot cancel this request' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Deletion request cancelled' });
}
