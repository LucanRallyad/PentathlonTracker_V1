import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteFromSession, isErrorResponse } from '@/lib/auth';
import { dataExport } from '@/lib/privacy/dataExport';
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from '@/lib/audit/auditLogger';

export async function POST(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  if (!result.athleteId) {
    return NextResponse.json({ error: 'No athlete profile linked' }, { status: 403 });
  }

  // Create export request (rate limited)
  const request = await dataExport.createRequest(result.athleteId);
  if (!request.success) {
    return NextResponse.json({ error: request.error }, { status: 429 });
  }

  // Generate export data
  const exportData = await dataExport.generateExport(result.athleteId);

  await auditLogger.logFromRequest(
    req,
    AuditEventType.PRIVACY_DATA_EXPORT,
    AuditAction.EXPORT,
    {
      severity: AuditSeverity.INFO,
      targetType: 'Athlete',
      targetId: result.athleteId,
    }
  );

  return NextResponse.json(exportData);
}
