import { prisma } from '@/lib/prisma';

interface AnomalyResult {
  isAnomaly: boolean;
  alertType: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
}

export const loginAnomalyDetector = {
  /**
   * Run all anomaly detection checks and create alerts for detected anomalies.
   */
  async runChecks(): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check 1: Multiple failed logins from same IP (threshold: 10 in 1 hour)
    const failedByIp = await prisma.auditLog.groupBy({
      by: ['actorIp'],
      where: {
        eventType: { in: ['AUTH_LOGIN_FAILURE', 'AUTH_DOB_LOGIN_FAILURE'] },
        timestamp: { gte: oneHourAgo },
      },
      _count: true,
    });

    for (const entry of failedByIp) {
      if (entry._count >= 10) {
        results.push({
          isAnomaly: true,
          alertType: 'BRUTE_FORCE',
          severity: 'HIGH',
          message: `${entry._count} failed login attempts from IP ${entry.actorIp} in the last hour`,
          details: { ip: entry.actorIp, count: entry._count },
        });
      }
    }

    // Check 2: DOB scanning — same IP trying multiple athletes
    const dobAttemptsByIp = await prisma.dOBLoginAttempt.groupBy({
      by: ['ip'],
      where: { timestamp: { gte: oneHourAgo } },
      _count: true,
    });

    for (const entry of dobAttemptsByIp) {
      if (entry._count >= 3) {
        // Check how many unique athletes
        const uniqueAthletes = await prisma.dOBLoginAttempt.findMany({
          where: { ip: entry.ip, timestamp: { gte: oneHourAgo } },
          distinct: ['athleteId'],
          select: { athleteId: true },
        });

        if (uniqueAthletes.length >= 3) {
          results.push({
            isAnomaly: true,
            alertType: 'DOB_SCANNING',
            severity: 'CRITICAL',
            message: `DOB login attempts for ${uniqueAthletes.length} different athletes from IP ${entry.ip}`,
            details: { ip: entry.ip, uniqueAthletes: uniqueAthletes.length },
          });
        }
      }
    }

    // Check 3: Bulk data access (more than 50 athlete records in 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const bulkAccess = await prisma.auditLog.groupBy({
      by: ['actorId'],
      where: {
        eventType: 'DATA_ACCESS',
        targetType: 'Athlete',
        timestamp: { gte: oneMinuteAgo },
      },
      _count: true,
    });

    for (const entry of bulkAccess) {
      if (entry._count >= 50) {
        results.push({
          isAnomaly: true,
          alertType: 'BULK_ACCESS',
          severity: 'HIGH',
          message: `User ${entry.actorId} accessed ${entry._count} athlete records in 1 minute`,
          details: { actorId: entry.actorId, count: entry._count },
        });
      }
    }

    // Create security alerts for detected anomalies
    for (const result of results) {
      await prisma.securityAlert.create({
        data: {
          alertType: result.alertType,
          severity: result.severity,
          message: result.message,
          details: JSON.stringify(result.details),
        },
      });
    }

    return results;
  },

  /**
   * Check if an admin login is from a new IP.
   */
  async isNewAdminIp(userId: string, ip: string): Promise<boolean> {
    const previousLogins = await prisma.auditLog.findFirst({
      where: {
        actorId: userId,
        eventType: 'AUTH_LOGIN_SUCCESS',
        actorIp: ip,
      },
    });

    return previousLogins === null;
  },
};
