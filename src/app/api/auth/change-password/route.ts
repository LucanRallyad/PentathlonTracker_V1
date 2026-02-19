import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';
import { passwordPolicy } from '@/lib/security/passwordPolicy';
import { sessionManager } from '@/lib/security/sessionManager';
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from '@/lib/audit/auditLogger';

export async function POST(req: NextRequest) {
  const session = getSessionFromCookie(req.headers.get('cookie'));

  if (!session || !('userId' in session)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new passwords are required' }, { status: 400 });
  }

  const result = await passwordPolicy.changePassword(session.userId, currentPassword, newPassword);

  if (!result.success) {
    await auditLogger.logFromRequest(
      req,
      AuditEventType.AUTH_PASSWORD_CHANGE,
      AuditAction.UPDATE,
      {
        severity: AuditSeverity.WARNING,
        targetType: 'User',
        targetId: session.userId,
        details: { success: false, error: result.error },
        responseStatus: 400,
      }
    );
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Destroy all other sessions (force re-login on other devices)
  await sessionManager.destroyAllUserSessions(session.userId);

  await auditLogger.logFromRequest(
    req,
    AuditEventType.AUTH_PASSWORD_CHANGE,
    AuditAction.UPDATE,
    {
      severity: AuditSeverity.INFO,
      targetType: 'User',
      targetId: session.userId,
      details: { success: true },
      responseStatus: 200,
    }
  );

  return NextResponse.json({ success: true, message: 'Password changed. Please log in again.' });
}
