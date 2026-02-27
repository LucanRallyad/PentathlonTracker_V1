import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromCookie } from '@/lib/auth';

export enum AuditEventType {
  // Authentication
  AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_DOB_LOGIN_SUCCESS = 'AUTH_DOB_LOGIN_SUCCESS',
  AUTH_DOB_LOGIN_FAILURE = 'AUTH_DOB_LOGIN_FAILURE',
  AUTH_SESSION_CREATED = 'AUTH_SESSION_CREATED',
  AUTH_SESSION_DESTROYED = 'AUTH_SESSION_DESTROYED',
  AUTH_REGISTER = 'AUTH_REGISTER',
  AUTH_PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',

  // Authorization
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',

  // Data Access
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_ACCESS_CONFIDENTIAL = 'DATA_ACCESS_CONFIDENTIAL',
  DATA_ACCESS_RESTRICTED = 'DATA_ACCESS_RESTRICTED',

  // Data Modification
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',

  // Admin Actions
  ADMIN_USER_CREATE = 'ADMIN_USER_CREATE',
  ADMIN_ROLE_CHANGE = 'ADMIN_ROLE_CHANGE',
  ADMIN_DATA_WIPE = 'ADMIN_DATA_WIPE',
  ADMIN_SETTING_CHANGE = 'ADMIN_SETTING_CHANGE',

  // Privacy Actions
  PRIVACY_CONSENT_CHANGE = 'PRIVACY_CONSENT_CHANGE',
  PRIVACY_SETTINGS_CHANGE = 'PRIVACY_SETTINGS_CHANGE',
  PRIVACY_DELETION_REQUEST = 'PRIVACY_DELETION_REQUEST',
  PRIVACY_DATA_EXPORT = 'PRIVACY_DATA_EXPORT',

  // Security
  SECURITY_RATE_LIMIT = 'SECURITY_RATE_LIMIT',
  SECURITY_VALIDATION_FAILURE = 'SECURITY_VALIDATION_FAILURE',
  SECURITY_ALERT_CREATED = 'SECURITY_ALERT_CREATED',

  // Score Modifications
  SCORE_CREATE = 'SCORE_CREATE',
  SCORE_UPDATE = 'SCORE_UPDATE',
  SCORE_DELETE = 'SCORE_DELETE',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ALERT = 'ALERT',
  CRITICAL = 'CRITICAL',
}

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
}

interface AuditLogEntry {
  eventType: AuditEventType;
  severity?: AuditSeverity;
  actorId: string;
  actorRole?: string | null;
  actorIp?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  action: AuditAction | string;
  details?: Record<string, unknown> | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  responseStatus?: number | null;
  userAgent?: string | null;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Central audit logger. All security/privacy events go through this.
 * Audit logs are append-only — no updates or deletes.
 */
export const auditLogger = {
  /**
   * Log an audit event directly.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          eventType: entry.eventType,
          severity: entry.severity || AuditSeverity.INFO,
          actorId: entry.actorId,
          actorRole: entry.actorRole,
          actorIp: entry.actorIp,
          targetType: entry.targetType,
          targetId: entry.targetId,
          action: entry.action,
          details: entry.details ? JSON.stringify(entry.details) : null,
          requestPath: entry.requestPath,
          requestMethod: entry.requestMethod,
          responseStatus: entry.responseStatus,
          userAgent: entry.userAgent,
        },
      });
    } catch (err) {
      // Never let audit logging crash the application
      console.error('[AuditLogger] Failed to write audit log:', err);
    }
  },

  /**
   * Log an event from a NextRequest context (extracts session, IP, etc.)
   */
  async logFromRequest(
    req: NextRequest,
    eventType: AuditEventType,
    action: AuditAction | string,
    options: {
      severity?: AuditSeverity;
      targetType?: string;
      targetId?: string;
      details?: Record<string, unknown>;
      responseStatus?: number;
    } = {}
  ): Promise<void> {
    const session = getSessionFromCookie(req.headers.get('cookie'));
    let actorId = 'ANONYMOUS';
    let actorRole: string | null = null;

    if (session) {
      if ('userId' in session) {
        actorId = session.userId;
        actorRole = session.role;
      } else if ('athleteId' in session) {
        actorId = session.athleteId;
        actorRole = 'athlete';
      }
    }

    await this.log({
      eventType,
      severity: options.severity,
      actorId,
      actorRole,
      actorIp: getClientIp(req),
      targetType: options.targetType,
      targetId: options.targetId,
      action,
      details: options.details,
      requestPath: new URL(req.url).pathname,
      requestMethod: req.method,
      responseStatus: options.responseStatus,
      userAgent: req.headers.get('user-agent'),
    });
  },

  // Convenience methods for common events

  async logLogin(req: NextRequest, userId: string, role: string, success: boolean): Promise<void> {
    await this.logFromRequest(
      req,
      success ? AuditEventType.AUTH_LOGIN_SUCCESS : AuditEventType.AUTH_LOGIN_FAILURE,
      AuditAction.LOGIN,
      {
        severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
        targetType: 'User',
        targetId: userId,
        details: { success, role },
        responseStatus: success ? 200 : 401,
      }
    );
  },

  async logDobLogin(req: NextRequest, athleteId: string | null, success: boolean): Promise<void> {
    await this.logFromRequest(
      req,
      success ? AuditEventType.AUTH_DOB_LOGIN_SUCCESS : AuditEventType.AUTH_DOB_LOGIN_FAILURE,
      AuditAction.LOGIN,
      {
        severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
        targetType: 'Athlete',
        targetId: athleteId || undefined,
        details: { success, method: 'DOB' },
        responseStatus: success ? 200 : 401,
      }
    );
  },

  async logDataModification(
    req: NextRequest,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const eventMap = {
      CREATE: AuditEventType.DATA_CREATE,
      UPDATE: AuditEventType.DATA_UPDATE,
      DELETE: AuditEventType.DATA_DELETE,
    };
    await this.logFromRequest(req, eventMap[action], action, {
      targetType,
      targetId,
      details,
    });
  },

  async logScoreModification(
    req: NextRequest,
    action: 'CREATE' | 'UPDATE',
    discipline: string,
    athleteId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const eventMap = {
      CREATE: AuditEventType.SCORE_CREATE,
      UPDATE: AuditEventType.SCORE_UPDATE,
    };
    await this.logFromRequest(req, eventMap[action], action, {
      targetType: `Score_${discipline}`,
      targetId: athleteId,
      details,
    });
  },

  async logSecurityEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    details: Record<string, unknown>,
    req?: NextRequest
  ): Promise<void> {
    if (req) {
      await this.logFromRequest(req, eventType, 'SECURITY', { severity, details });
    } else {
      await this.log({
        eventType,
        severity,
        actorId: 'SYSTEM',
        action: 'SECURITY',
        details,
      });
    }
  },
};
