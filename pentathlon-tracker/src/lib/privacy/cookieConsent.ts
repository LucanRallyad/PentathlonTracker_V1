import { prisma } from '@/lib/prisma';

export interface CookieConsentState {
  strictlyNecessary: boolean; // Always true
  functional: boolean;
  analytics: boolean;
}

export const cookieConsentService = {
  /**
   * Get consent state for a user or session.
   */
  async getConsent(userId?: string, sessionId?: string): Promise<CookieConsentState | null> {
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    else if (sessionId) where.sessionId = sessionId;
    else return null;

    const consent = await prisma.cookieConsent.findFirst({ where });
    if (!consent) return null;

    return {
      strictlyNecessary: true,
      functional: consent.functional,
      analytics: consent.analytics,
    };
  },

  /**
   * Save consent preferences.
   */
  async saveConsent(
    state: CookieConsentState,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const data = {
      strictlyNecessary: true,
      functional: state.functional,
      analytics: state.analytics,
    };

    if (userId) {
      await prisma.cookieConsent.upsert({
        where: { id: userId }, // Use a deterministic lookup
        create: { userId, ...data },
        update: data,
      });
    } else if (sessionId) {
      // For anonymous users, create/update by sessionId
      const existing = await prisma.cookieConsent.findFirst({
        where: { sessionId },
      });

      if (existing) {
        await prisma.cookieConsent.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.cookieConsent.create({
          data: { sessionId, ...data },
        });
      }
    }
  },
};
