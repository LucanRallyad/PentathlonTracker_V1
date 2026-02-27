import { MinorProtectionService } from './minorProtection';
import { formatAthleteNameForContext } from './nameFormatter';

interface AthleteRecord {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  dateOfBirth?: string | null;
  ageCategory: string;
  club?: string | null;
  gender: string;
  userId?: string | null;
  isMinorAthlete?: boolean;
  uuid?: string;
  privacySettings?: {
    showFullName?: boolean;
    showCountry?: boolean;
    showClub?: boolean;
    showAgeCategory?: boolean;
    showInDirectory?: boolean;
    showOnLeaderboard?: boolean;
    profileVisibility?: string;
  } | null;
  [key: string]: unknown;
}

/**
 * Filter athlete data for public consumption.
 * Strips sensitive fields, abbreviates minor names, respects privacy settings.
 */
export function filterAthleteForPublic(
  athlete: AthleteRecord,
  viewerRole: string | null = null,
  viewerAthleteId?: string
): Record<string, unknown> {
  const isSelf = viewerAthleteId && viewerAthleteId === athlete.id;
  const isAdminOrOfficial = viewerRole === 'admin' || viewerRole === 'official';
  const isMinor = MinorProtectionService.isMinor(athlete);

  // Self or admin/official: return more data
  if (isSelf || isAdminOrOfficial) {
    const result: Record<string, unknown> = {
      id: athlete.uuid || athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      country: athlete.country,
      ageCategory: athlete.ageCategory,
      gender: athlete.gender,
      club: athlete.club,
    };

    // Only admin sees raw DOB
    if (viewerRole === 'admin' || isSelf) {
      result.dateOfBirth = athlete.dateOfBirth;
    }

    return result;
  }

  // Public or authenticated non-admin view
  const displayName = formatAthleteNameForContext(athlete, viewerRole, true);
  const nameParts = displayName.split(' ');

  const result: Record<string, unknown> = {
    id: athlete.uuid || athlete.id,
    displayName,
    firstName: nameParts[0],
    lastName: isMinor ? (athlete.lastName?.charAt(0) + '.') : athlete.lastName,
    ageCategory: athlete.ageCategory,
    gender: athlete.gender,
  };

  // Respect privacy settings for non-minor fields
  const settings = athlete.privacySettings;

  if (!isMinor || settings?.showCountry !== false) {
    result.country = athlete.country;
  }

  if (!isMinor && settings?.showClub !== false) {
    result.club = athlete.club;
  }

  // Never expose these publicly
  // dateOfBirth, userId are always stripped

  return result;
}

/**
 * Filter an array of athletes for public consumption.
 * Also filters out athletes who have opted out of directory/leaderboard.
 */
export function filterAthletesForPublic(
  athletes: AthleteRecord[],
  viewerRole: string | null = null,
  context: 'directory' | 'leaderboard' | 'results' = 'results'
): Record<string, unknown>[] {
  return athletes
    .filter(athlete => {
      const settings = athlete.privacySettings;

      // For directory, exclude those who opted out
      if (context === 'directory') {
        if (settings?.showInDirectory === false) return false;
        if (settings?.profileVisibility === 'PRIVATE') return false;
        if (settings?.profileVisibility === 'AUTHENTICATED_ONLY' && !viewerRole) return false;
      }

      // For leaderboard, exclude those who opted out
      if (context === 'leaderboard' && settings?.showOnLeaderboard === false) {
        return false;
      }

      return true;
    })
    .map(athlete => filterAthleteForPublic(athlete, viewerRole));
}

/**
 * Strip sensitive fields from a competition response for public viewing.
 */
export function filterCompetitionForPublic(
  competition: Record<string, unknown>
): Record<string, unknown> {
  const { createdAt, updatedAt, ...safe } = competition;
  void createdAt;
  void updatedAt;
  return safe;
}
