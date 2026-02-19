'use client';

import { useAuth } from '@/lib/useAuth';

interface ProtectedDOBProps {
  dateOfBirth?: string | null;
  ageCategory: string;
  athleteId?: string;
  className?: string;
}

function getAgeRange(dob: string): string {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 'Unknown';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 9) return 'Under 9';
  if (age < 11) return '9-10';
  if (age < 13) return '11-12';
  if (age < 15) return '13-14';
  if (age < 17) return '15-16';
  if (age < 19) return '17-18';
  return '19+';
}

export default function ProtectedDOB({
  dateOfBirth,
  ageCategory,
  athleteId,
  className,
}: ProtectedDOBProps) {
  const { user, athleteId: viewerAthleteId } = useAuth();
  const viewerRole = user?.role ?? null;
  const isSelf = viewerAthleteId && viewerAthleteId === athleteId;

  // Admin or self: show raw DOB
  if (viewerRole === 'admin' || isSelf) {
    return (
      <span className={className}>
        {dateOfBirth || 'Not provided'}
      </span>
    );
  }

  // Others: show age category or age range
  if (dateOfBirth) {
    return <span className={className}>{getAgeRange(dateOfBirth)}</span>;
  }

  return <span className={className}>{ageCategory}</span>;
}
