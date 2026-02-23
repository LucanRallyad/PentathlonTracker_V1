import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteFromSession, isErrorResponse } from '@/lib/auth';
import { privacySettingsService } from '@/lib/privacy/privacySettingsService';
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from '@/lib/audit/auditLogger';

export async function GET(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  if (!result.athleteId) {
    return NextResponse.json({ error: 'No athlete profile linked' }, { status: 403 });
  }

  const settings = await privacySettingsService.getOrCreate(result.athleteId);
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const result = await resolveAthleteFromSession(req);
  if (isErrorResponse(result)) return result;

  if (!result.athleteId) {
    return NextResponse.json({ error: 'No athlete profile linked' }, { status: 403 });
  }

  const body = await req.json();

  // Only allow updating specific fields
  const allowedFields = [
    'showFullName', 'showCountry', 'showClub', 'showAgeCategory',
    'showInDirectory', 'showOnLeaderboard', 'allowTrainingDataSharing', 'profileVisibility',
  ];

  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      update[field] = body[field];
    }
  }

  const settings = await privacySettingsService.update(result.athleteId, update);

  await auditLogger.logFromRequest(
    req,
    AuditEventType.PRIVACY_SETTINGS_CHANGE,
    AuditAction.UPDATE,
    {
      severity: AuditSeverity.INFO,
      targetType: 'PrivacySettings',
      targetId: result.athleteId,
      details: { updated: Object.keys(update) },
    }
  );

  return NextResponse.json(settings);
}
