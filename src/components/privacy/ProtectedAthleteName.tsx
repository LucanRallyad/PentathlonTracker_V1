'use client';

import { useAuth } from '@/lib/useAuth';
import { formatAthleteNameForContext } from '@/lib/privacy/nameFormatter';

interface ProtectedAthleteNameProps {
  athlete: {
    id?: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    ageCategory: string;
    isMinorAthlete?: boolean;
    privacySettings?: { showFullName?: boolean } | null;
  };
  className?: string;
}

export default function ProtectedAthleteName({ athlete, className }: ProtectedAthleteNameProps) {
  const { user, athleteId } = useAuth();

  const viewerRole = user?.role ?? null;
  const isSelf = athleteId && athleteId === athlete.id;

  // Self always sees full name
  if (isSelf) {
    return <span className={className}>{athlete.firstName} {athlete.lastName}</span>;
  }

  const displayName = formatAthleteNameForContext(athlete, viewerRole, !viewerRole);

  return <span className={className}>{displayName}</span>;
}
