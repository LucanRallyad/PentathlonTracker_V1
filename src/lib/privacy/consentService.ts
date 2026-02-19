import { prisma } from '@/lib/prisma';

export enum ConsentType {
  DATA_COLLECTION = 'DATA_COLLECTION',
  PUBLIC_DISPLAY = 'PUBLIC_DISPLAY',
  PHOTO_USAGE = 'PHOTO_USAGE',
  COMPETITION_PARTICIPATION = 'COMPETITION_PARTICIPATION',
}

export enum GuardianRelationship {
  PARENT = 'PARENT',
  LEGAL_GUARDIAN = 'LEGAL_GUARDIAN',
  COACH_WITH_AUTHORITY = 'COACH_WITH_AUTHORITY',
}

export enum ConsentMethod {
  ONLINE_FORM = 'ONLINE_FORM',
  PAPER_SCANNED = 'PAPER_SCANNED',
  VERBAL_RECORDED = 'VERBAL_RECORDED',
}

interface RecordConsentInput {
  athleteId: string;
  guardianName: string;
  guardianEmail?: string;
  guardianRelationship: GuardianRelationship;
  consentType: ConsentType;
  consentGiven: boolean;
  consentExpiryDate?: Date;
  ipAddress?: string;
  consentMethod: ConsentMethod;
  notes?: string;
}

export const consentService = {
  /**
   * Check if an athlete has valid (non-expired, given) consent for a specific type.
   */
  async hasValidConsent(athleteId: string, consentType: ConsentType): Promise<boolean> {
    const now = new Date();
    const consent = await prisma.consentRecord.findFirst({
      where: {
        athleteId,
        consentType,
        consentGiven: true,
        OR: [
          { consentExpiryDate: null },
          { consentExpiryDate: { gt: now } },
        ],
      },
      orderBy: { consentDate: 'desc' },
    });

    return consent !== null;
  },

  /**
   * Get full consent status for an athlete (all consent types).
   */
  async getConsentStatus(athleteId: string): Promise<Record<ConsentType, {
    hasConsent: boolean;
    isExpired: boolean;
    consentDate?: Date;
    expiryDate?: Date | null;
    guardianName?: string;
  }>> {
    const now = new Date();
    const records = await prisma.consentRecord.findMany({
      where: { athleteId },
      orderBy: { consentDate: 'desc' },
    });

    const status = {} as Record<ConsentType, {
      hasConsent: boolean;
      isExpired: boolean;
      consentDate?: Date;
      expiryDate?: Date | null;
      guardianName?: string;
    }>;

    for (const type of Object.values(ConsentType)) {
      const latest = records.find(r => r.consentType === type);
      if (!latest) {
        status[type] = { hasConsent: false, isExpired: false };
      } else {
        const isExpired = latest.consentExpiryDate ? latest.consentExpiryDate < now : false;
        status[type] = {
          hasConsent: latest.consentGiven && !isExpired,
          isExpired,
          consentDate: latest.consentDate,
          expiryDate: latest.consentExpiryDate,
          guardianName: latest.guardianName,
        };
      }
    }

    return status;
  },

  /**
   * Record a new consent entry.
   */
  async recordConsent(input: RecordConsentInput) {
    return prisma.consentRecord.create({
      data: {
        athleteId: input.athleteId,
        guardianName: input.guardianName,
        guardianEmail: input.guardianEmail,
        guardianRelationship: input.guardianRelationship,
        consentType: input.consentType,
        consentGiven: input.consentGiven,
        consentExpiryDate: input.consentExpiryDate,
        ipAddress: input.ipAddress,
        consentMethod: input.consentMethod,
        notes: input.notes,
      },
    });
  },

  /**
   * Get all consents that have expired and need renewal.
   */
  async getExpiredConsents() {
    const now = new Date();
    return prisma.consentRecord.findMany({
      where: {
        consentGiven: true,
        consentExpiryDate: { lt: now },
      },
      include: {
        athlete: {
          select: { id: true, firstName: true, lastName: true, ageCategory: true },
        },
      },
      orderBy: { consentExpiryDate: 'asc' },
    });
  },

  /**
   * Get consent records for a specific athlete.
   */
  async getAthleteConsents(athleteId: string) {
    return prisma.consentRecord.findMany({
      where: { athleteId },
      orderBy: { consentDate: 'desc' },
    });
  },

  /**
   * Check if minor data can be shown publicly (requires PUBLIC_DISPLAY consent).
   */
  async canShowMinorPublicly(athleteId: string): Promise<boolean> {
    return this.hasValidConsent(athleteId, ConsentType.PUBLIC_DISPLAY);
  },
};
