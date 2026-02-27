import { prisma } from '@/lib/prisma';

/**
 * Data retention periods (in days).
 */
export const RETENTION_PERIODS = {
  completedCompetitionResults: 365 * 3,   // 3 years
  athleteInactiveData: 365,               // 1 year after last activity
  loginAuditLogs: 365,                    // 1 year
  sessionData: 30,                         // 30 days after expiry
  failedLoginAttempts: 90,                // 90 days
  consentRecords: 365 * 7,                // 7 years (legal requirement)
  trainingEntries: 365 * 2,              // 2 years
  dataExportRequests: 30,                 // 30 days
  securityAlerts: 365,                    // 1 year
};

export const dataRetention = {
  /**
   * Process data retention — identifies and handles data past retention periods.
   * Returns a summary of actions taken.
   */
  async processRetention(): Promise<{ actions: RetentionAction[] }> {
    const actions: RetentionAction[] = [];
    const now = new Date();

    // 1. Clean up expired sessions
    const expiredSessions = await prisma.sessionInfo.deleteMany({
      where: {
        expiresAt: { lt: new Date(now.getTime() - RETENTION_PERIODS.sessionData * 24 * 60 * 60 * 1000) },
      },
    });
    if (expiredSessions.count > 0) {
      actions.push({ type: 'DELETED', model: 'SessionInfo', count: expiredSessions.count });
    }

    // 2. Clean up old failed login attempts
    const oldAttempts = await prisma.dOBLoginAttempt.deleteMany({
      where: {
        timestamp: { lt: new Date(now.getTime() - RETENTION_PERIODS.failedLoginAttempts * 24 * 60 * 60 * 1000) },
      },
    });
    if (oldAttempts.count > 0) {
      actions.push({ type: 'DELETED', model: 'DOBLoginAttempt', count: oldAttempts.count });
    }

    // 3. Clean up old audit logs
    const oldAuditLogs = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: new Date(now.getTime() - RETENTION_PERIODS.loginAuditLogs * 24 * 60 * 60 * 1000) },
      },
    });
    if (oldAuditLogs.count > 0) {
      actions.push({ type: 'DELETED', model: 'AuditLog', count: oldAuditLogs.count });
    }

    // 4. Clean up expired data export requests
    const oldExports = await prisma.dataExportRequest.deleteMany({
      where: {
        status: 'EXPIRED',
        updatedAt: { lt: new Date(now.getTime() - RETENTION_PERIODS.dataExportRequests * 24 * 60 * 60 * 1000) },
      },
    });
    if (oldExports.count > 0) {
      actions.push({ type: 'DELETED', model: 'DataExportRequest', count: oldExports.count });
    }

    // 5. Clean up old security alerts
    const oldAlerts = await prisma.securityAlert.deleteMany({
      where: {
        acknowledged: true,
        timestamp: { lt: new Date(now.getTime() - RETENTION_PERIODS.securityAlerts * 24 * 60 * 60 * 1000) },
      },
    });
    if (oldAlerts.count > 0) {
      actions.push({ type: 'DELETED', model: 'SecurityAlert', count: oldAlerts.count });
    }

    // Log all retention actions
    for (const action of actions) {
      await prisma.dataRetentionLog.create({
        data: {
          action: action.type,
          targetType: action.model,
          targetId: 'BATCH',
          details: JSON.stringify({ count: action.count }),
        },
      });
    }

    return { actions };
  },

  /**
   * Get upcoming retention actions (preview what will be deleted).
   */
  async getUpcomingRetentions(): Promise<RetentionPreview[]> {
    const now = new Date();
    const previews: RetentionPreview[] = [];

    const expiredSessions = await prisma.sessionInfo.count({
      where: {
        expiresAt: { lt: new Date(now.getTime() - RETENTION_PERIODS.sessionData * 24 * 60 * 60 * 1000) },
      },
    });
    if (expiredSessions > 0) {
      previews.push({ model: 'SessionInfo', count: expiredSessions, action: 'DELETE' });
    }

    const oldAttempts = await prisma.dOBLoginAttempt.count({
      where: {
        timestamp: { lt: new Date(now.getTime() - RETENTION_PERIODS.failedLoginAttempts * 24 * 60 * 60 * 1000) },
      },
    });
    if (oldAttempts > 0) {
      previews.push({ model: 'DOBLoginAttempt', count: oldAttempts, action: 'DELETE' });
    }

    return previews;
  },
};

interface RetentionAction {
  type: 'DELETED' | 'ARCHIVED' | 'ANONYMIZED';
  model: string;
  count: number;
}

interface RetentionPreview {
  model: string;
  count: number;
  action: string;
}
