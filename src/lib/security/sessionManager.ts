import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

// Concurrent session limits by role
const SESSION_LIMITS: Record<string, number> = {
  super_admin: 2,
  admin: 1,
  official: 2,
  athlete: 3,
};

// Max age by role (in seconds)
export const SESSION_MAX_AGE: Record<string, number> = {
  super_admin: 8 * 60 * 60, // 8 hours
  admin: 4 * 60 * 60,       // 4 hours
  official: 8 * 60 * 60,    // 8 hours
  athlete: 24 * 60 * 60,    // 24 hours
};

export const sessionManager = {
  /**
   * Hash a session token for storage (never store raw tokens).
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  },

  /**
   * Register a new session, enforcing concurrent session limits.
   */
  async createSession(
    userId: string,
    role: string,
    token: string,
    fingerprint: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const maxAge = SESSION_MAX_AGE[role] || SESSION_MAX_AGE.athlete;
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    // Check concurrent session limit
    const limit = SESSION_LIMITS[role] || 3;
    const activeSessions = await prisma.sessionInfo.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });

    // If at limit, remove the oldest session(s)
    if (activeSessions.length >= limit) {
      const toRemove = activeSessions.slice(0, activeSessions.length - limit + 1);
      await prisma.sessionInfo.deleteMany({
        where: { id: { in: toRemove.map(s => s.id) } },
      });
    }

    await prisma.sessionInfo.create({
      data: {
        userId,
        tokenHash,
        fingerprint,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
  },

  /**
   * Validate a session token and update last active time.
   */
  async validateSession(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const session = await prisma.sessionInfo.findUnique({
      where: { tokenHash },
    });

    if (!session) return false;
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.sessionInfo.delete({ where: { id: session.id } });
      return false;
    }

    // Update last active
    await prisma.sessionInfo.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return true;
  },

  /**
   * Destroy a session by token.
   */
  async destroySession(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await prisma.sessionInfo.deleteMany({ where: { tokenHash } });
  },

  /**
   * Destroy all sessions for a user (e.g., when password changes).
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    await prisma.sessionInfo.deleteMany({ where: { userId } });
  },

  /**
   * Force-terminate a specific session by ID (admin action).
   */
  async forceTerminate(sessionId: string): Promise<void> {
    await prisma.sessionInfo.delete({ where: { id: sessionId } });
  },

  /**
   * Get all active sessions for a user.
   */
  async getActiveSessions(userId: string) {
    return prisma.sessionInfo.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  },

  /**
   * Get all active sessions (admin view).
   */
  async getAllActiveSessions() {
    return prisma.sessionInfo.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  },

  /**
   * Clean up expired sessions.
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.sessionInfo.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },
};
