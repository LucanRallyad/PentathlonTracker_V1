import { prisma } from '@/lib/prisma';
import { MinorProtectionService } from './minorProtection';

interface PrivacySettingsUpdate {
  showFullName?: boolean;
  showCountry?: boolean;
  showClub?: boolean;
  showAgeCategory?: boolean;
  showInDirectory?: boolean;
  showOnLeaderboard?: boolean;
  allowTrainingDataSharing?: boolean;
  profileVisibility?: string;
}

export const privacySettingsService = {
  /**
   * Get privacy settings for an athlete, creating defaults if needed.
   */
  async getOrCreate(athleteId: string) {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { ageCategory: true, dateOfBirth: true, isMinorAthlete: true },
    });

    if (!athlete) return null;

    const isMinor = MinorProtectionService.isMinor(athlete);

    return prisma.privacySettings.upsert({
      where: { athleteId },
      create: {
        athleteId,
        // Minors get maximally restrictive defaults
        showFullName: !isMinor,
        showCountry: true,
        showClub: !isMinor,
        showAgeCategory: true,
        showInDirectory: !isMinor,
        showOnLeaderboard: true,
        allowTrainingDataSharing: false,
        profileVisibility: isMinor ? 'AUTHENTICATED_ONLY' : 'PUBLIC',
      },
      update: {}, // Don't override existing
    });
  },

  /**
   * Update privacy settings for an athlete.
   */
  async update(athleteId: string, settings: PrivacySettingsUpdate) {
    // Ensure settings exist first
    await this.getOrCreate(athleteId);

    return prisma.privacySettings.update({
      where: { athleteId },
      data: settings,
    });
  },

  /**
   * Admin override of privacy settings (with audit log).
   */
  async adminOverride(athleteId: string, settings: PrivacySettingsUpdate) {
    return prisma.privacySettings.update({
      where: { athleteId },
      data: settings,
    });
  },

  /**
   * Check if an athlete should appear in the public directory.
   */
  async isVisibleInDirectory(athleteId: string): Promise<boolean> {
    const settings = await this.getOrCreate(athleteId);
    if (!settings) return false;

    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { isMinorAthlete: true },
    });

    // Minors never appear in public directory unless explicit consent
    if (athlete?.isMinorAthlete) {
      return false;
    }

    return settings.showInDirectory;
  },

  /**
   * Check if athlete should appear on public leaderboards.
   */
  async isVisibleOnLeaderboard(athleteId: string): Promise<boolean> {
    const settings = await this.getOrCreate(athleteId);
    return settings?.showOnLeaderboard ?? true;
  },

  /**
   * Check profile visibility for a viewer.
   */
  async canViewProfile(
    athleteId: string,
    viewerRole: string | null,
    viewerAthleteId?: string
  ): Promise<boolean> {
    // Self can always view
    if (viewerAthleteId === athleteId) return true;

    // Admin/official can always view
    if (viewerRole === 'admin' || viewerRole === 'official') return true;

    const settings = await this.getOrCreate(athleteId);
    if (!settings) return false;

    switch (settings.profileVisibility) {
      case 'PUBLIC':
        return true;
      case 'AUTHENTICATED_ONLY':
        return viewerRole !== null;
      case 'PRIVATE':
        return false;
      default:
        return false;
    }
  },
};
