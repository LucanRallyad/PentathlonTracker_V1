import { MinorProtectionService } from './minorProtection';

interface AthleteForFormatting {
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  ageCategory: string;
  isMinorAthlete?: boolean;
  privacySettings?: {
    showFullName?: boolean;
  } | null;
}

/**
 * Format an athlete's name based on the viewing context.
 *
 * @param athlete - The athlete data
 * @param viewerRole - The viewer's role (null for public/unauthenticated)
 * @param isPublic - Whether this is a public-facing view
 * @returns The formatted display name
 */
export function formatAthleteNameForContext(
  athlete: AthleteForFormatting,
  viewerRole: string | null,
  isPublic: boolean = true
): string {
  // Always display full names for everyone
  return `${athlete.firstName} ${athlete.lastName}`;
}

/**
 * Abbreviate a name to "FirstName L." format.
 */
function abbreviateName(firstName: string, lastName: string): string {
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : '';
  return `${firstName} ${lastInitial}`.trim();
}

/**
 * Format name specifically for leaderboard display.
 */
export function formatLeaderboardName(
  athlete: AthleteForFormatting,
  viewerRole: string | null
): string {
  return formatAthleteNameForContext(athlete, viewerRole, true);
}

/**
 * Format name for export based on export type.
 */
export function formatExportName(
  athlete: AthleteForFormatting,
  exportType: 'official' | 'public'
): string {
  // Always display full names for everyone
  return `${athlete.firstName} ${athlete.lastName}`;
}
