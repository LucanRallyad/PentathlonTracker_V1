import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export const dobLoginAudit = {
  /**
   * Record a DOB login attempt.
   */
  async recordAttempt(
    req: NextRequest,
    athleteId: string | null,
    success: boolean
  ): Promise<void> {
    await prisma.dOBLoginAttempt.create({
      data: {
        ip: getClientIp(req),
        athleteId,
        success,
        userAgent: req.headers.get('user-agent'),
      },
    });
  },

  /**
   * Check if an IP has too many recent failed attempts.
   * Returns true if the IP should be rate-limited.
   */
  async isIpRateLimited(ip: string, maxAttempts: number = 3, windowMinutes: number = 10): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const failedAttempts = await prisma.dOBLoginAttempt.count({
      where: {
        ip,
        success: false,
        timestamp: { gte: windowStart },
      },
    });

    return failedAttempts >= maxAttempts;
  },

  /**
   * Detect suspicious patterns: same IP trying different athletes.
   */
  async detectDobScanning(ip: string, windowMinutes: number = 60): Promise<{
    isSuspicious: boolean;
    uniqueAthletes: number;
  }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const attempts = await prisma.dOBLoginAttempt.findMany({
      where: {
        ip,
        timestamp: { gte: windowStart },
      },
      select: { athleteId: true },
    });

    const uniqueAthletes = new Set(attempts.map(a => a.athleteId).filter(Boolean)).size;

    return {
      isSuspicious: uniqueAthletes >= 3,
      uniqueAthletes,
    };
  },

  /**
   * Get recent login attempts for admin review.
   */
  async getRecentAttempts(limit: number = 100) {
    return prisma.dOBLoginAttempt.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  },
};
