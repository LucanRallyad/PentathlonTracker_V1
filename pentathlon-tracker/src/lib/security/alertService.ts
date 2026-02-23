import { prisma } from '@/lib/prisma';

export enum AlertType {
  BRUTE_FORCE = 'BRUTE_FORCE',
  DOB_SCANNING = 'DOB_SCANNING',
  NEW_ADMIN_IP = 'NEW_ADMIN_IP',
  BULK_ACCESS = 'BULK_ACCESS',
  UNUSUAL_SCORE_MODIFICATION = 'UNUSUAL_SCORE_MODIFICATION',
  SCRAPING_DETECTED = 'SCRAPING_DETECTED',
  RATE_LIMIT_REACHED = 'RATE_LIMIT_REACHED',
  DELETION_REQUEST = 'DELETION_REQUEST',
  ROLE_ESCALATION = 'ROLE_ESCALATION',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const alertService = {
  async createAlert(
    alertType: AlertType | string,
    severity: AlertSeverity | string,
    message: string,
    details?: Record<string, unknown>
  ) {
    return prisma.securityAlert.create({
      data: {
        alertType,
        severity,
        message,
        details: details ? JSON.stringify(details) : null,
      },
    });
  },

  async getAlerts(options: {
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
  } = {}) {
    const where: Record<string, unknown> = {};
    if (options.severity) where.severity = options.severity;
    if (options.acknowledged !== undefined) where.acknowledged = options.acknowledged;

    return prisma.securityAlert.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });
  },

  async getUnacknowledgedCount(): Promise<Record<string, number>> {
    const alerts = await prisma.securityAlert.groupBy({
      by: ['severity'],
      where: { acknowledged: false },
      _count: true,
    });

    const counts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const alert of alerts) {
      counts[alert.severity] = alert._count;
    }
    return counts;
  },

  async acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    return prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });
  },

  async acknowledgeAll(acknowledgedBy: string) {
    return prisma.securityAlert.updateMany({
      where: { acknowledged: false },
      data: {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });
  },
};
