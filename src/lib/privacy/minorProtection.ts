import { prisma } from '@/lib/prisma';

/** Age categories that are always minors */
const MINOR_CATEGORIES = ['U9', 'U11', 'U13', 'U15', 'U17'];
/** Age categories that may be minors (check DOB if available) */
const POSSIBLY_MINOR_CATEGORIES = ['U19'];
/** Age categories that are always adults */
const ADULT_CATEGORIES = ['Junior', 'Senior', 'Masters'];

interface AthleteData {
  id?: string;
  dateOfBirth?: string | null;
  ageCategory: string;
  isMinorAthlete?: boolean;
}

/**
 * Minor Protection Service
 * Centralizes all minor-related logic for the Pentathlon Tracker.
 */
export const MinorProtectionService = {
  /**
   * Determine if an athlete is a minor based on age category and DOB.
   */
  isMinor(athlete: AthleteData): boolean {
    // If DOB is available, calculate actual age
    if (athlete.dateOfBirth) {
      const age = calculateAge(athlete.dateOfBirth);
      if (age !== null) {
        return age < 18;
      }
    }

    // Fall back to age category
    if (MINOR_CATEGORIES.includes(athlete.ageCategory)) return true;
    if (POSSIBLY_MINOR_CATEGORIES.includes(athlete.ageCategory)) return true; // Assume minor for safety
    if (ADULT_CATEGORIES.includes(athlete.ageCategory)) return false;

    // Default: treat as minor (maximum privacy)
    return true;
  },

  /**
   * Get restrictions that apply to a minor athlete.
   */
  getMinorRestrictions(athlete: AthleteData) {
    const isMinor = this.isMinor(athlete);
    return {
      isMinor,
      hideFullNamePublicly: isMinor,
      hideFromPublicDirectory: isMinor,
      hideDOB: true, // Always hide DOB
      hideClubPublicly: isMinor,
      hideCountryPublicly: false, // Country is generally ok
      requireConsent: isMinor,
      abbreviateNameOnLeaderboard: isMinor,
    };
  },

  /**
   * Check if a specific field can be displayed publicly for this athlete.
   */
  canDisplayPublicly(athlete: AthleteData, field: string): boolean {
    if (!this.isMinor(athlete)) return true;

    const restrictedFields = [
      'lastName',
      'dateOfBirth',
      'club',
      'userId',
    ];

    return !restrictedFields.includes(field);
  },

  /**
   * Recalculate and update the isMinorAthlete flag for an athlete.
   */
  async updateMinorStatus(athleteId: string): Promise<boolean> {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { dateOfBirth: true, ageCategory: true },
    });

    if (!athlete) return false;

    const isMinor = this.isMinor(athlete);

    await prisma.athlete.update({
      where: { id: athleteId },
      data: { isMinorAthlete: isMinor },
    });

    // If this is a new minor, create default restrictive privacy settings
    if (isMinor) {
      await prisma.privacySettings.upsert({
        where: { athleteId },
        create: {
          athleteId,
          showFullName: false,
          showCountry: true,
          showClub: false,
          showAgeCategory: true,
          showInDirectory: false,
          showOnLeaderboard: true,
          allowTrainingDataSharing: false,
          profileVisibility: 'AUTHENTICATED_ONLY',
        },
        update: {}, // Don't override existing settings
      });
    }

    return isMinor;
  },

  /**
   * Batch recalculate minor status for all athletes.
   */
  async recalculateAllMinorStatuses(): Promise<{ updated: number }> {
    const athletes = await prisma.athlete.findMany({
      select: { id: true, dateOfBirth: true, ageCategory: true },
    });

    let updated = 0;
    for (const athlete of athletes) {
      const isMinor = this.isMinor(athlete);
      await prisma.athlete.update({
        where: { id: athlete.id },
        data: { isMinorAthlete: isMinor },
      });
      updated++;
    }

    return { updated };
  },
};

/**
 * Calculate age from a DOB string (ISO format: YYYY-MM-DD).
 */
function calculateAge(dob: string): number | null {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
