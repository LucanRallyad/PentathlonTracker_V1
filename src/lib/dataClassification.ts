/**
 * Data Classification System
 * Categorizes every field in the database into sensitivity tiers.
 */

export enum ClassificationLevel {
  PUBLIC = 'PUBLIC',           // Visible to unauthenticated users
  INTERNAL = 'INTERNAL',       // Visible to authenticated users with a valid role
  CONFIDENTIAL = 'CONFIDENTIAL', // Restricted to specific roles
  RESTRICTED = 'RESTRICTED',   // Highest sensitivity, special handling
}

// Full classification map for every Prisma model field
const FIELD_CLASSIFICATIONS: Record<string, Record<string, ClassificationLevel>> = {
  User: {
    id: ClassificationLevel.CONFIDENTIAL,
    name: ClassificationLevel.INTERNAL,
    email: ClassificationLevel.CONFIDENTIAL,
    passwordHash: ClassificationLevel.RESTRICTED,
    role: ClassificationLevel.INTERNAL,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  Athlete: {
    id: ClassificationLevel.INTERNAL,
    firstName: ClassificationLevel.INTERNAL,  // Public shows first name only
    lastName: ClassificationLevel.INTERNAL,   // Public shows last initial only
    country: ClassificationLevel.PUBLIC,
    dateOfBirth: ClassificationLevel.RESTRICTED,
    ageCategory: ClassificationLevel.PUBLIC,
    club: ClassificationLevel.INTERNAL,
    gender: ClassificationLevel.PUBLIC,
    userId: ClassificationLevel.RESTRICTED,
    isMinorAthlete: ClassificationLevel.INTERNAL,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  Competition: {
    id: ClassificationLevel.PUBLIC,
    name: ClassificationLevel.PUBLIC,
    date: ClassificationLevel.PUBLIC,
    endDate: ClassificationLevel.PUBLIC,
    location: ClassificationLevel.PUBLIC,
    description: ClassificationLevel.PUBLIC,
    status: ClassificationLevel.PUBLIC,
    competitionType: ClassificationLevel.PUBLIC,
    ageCategory: ClassificationLevel.PUBLIC,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  CompetitionAthlete: {
    id: ClassificationLevel.INTERNAL,
    competitionId: ClassificationLevel.PUBLIC,
    athleteId: ClassificationLevel.INTERNAL,
    ageCategory: ClassificationLevel.PUBLIC,
    status: ClassificationLevel.INTERNAL,
  },
  Event: {
    id: ClassificationLevel.PUBLIC,
    competitionId: ClassificationLevel.PUBLIC,
    discipline: ClassificationLevel.PUBLIC,
    scheduledStart: ClassificationLevel.PUBLIC,
    status: ClassificationLevel.PUBLIC,
    dayLabel: ClassificationLevel.PUBLIC,
    sortOrder: ClassificationLevel.PUBLIC,
    completedAt: ClassificationLevel.PUBLIC,
    config: ClassificationLevel.INTERNAL,
  },
  // All score models have the same classification
  FencingRankingScore: {
    id: ClassificationLevel.INTERNAL,
    eventId: ClassificationLevel.PUBLIC,
    athleteId: ClassificationLevel.INTERNAL,
    victories: ClassificationLevel.PUBLIC,
    totalBouts: ClassificationLevel.PUBLIC,
    calculatedPoints: ClassificationLevel.PUBLIC,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  FencingDEScore: {
    id: ClassificationLevel.INTERNAL,
    eventId: ClassificationLevel.PUBLIC,
    athleteId: ClassificationLevel.INTERNAL,
    placement: ClassificationLevel.PUBLIC,
    calculatedPoints: ClassificationLevel.PUBLIC,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  ObstacleScore: {
    id: ClassificationLevel.INTERNAL,
    eventId: ClassificationLevel.PUBLIC,
    athleteId: ClassificationLevel.INTERNAL,
    timeSeconds: ClassificationLevel.PUBLIC,
    penaltyPoints: ClassificationLevel.PUBLIC,
    calculatedPoints: ClassificationLevel.PUBLIC,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  SwimmingScore: {
    id: ClassificationLevel.INTERNAL,
    eventId: ClassificationLevel.PUBLIC,
    athleteId: ClassificationLevel.INTERNAL,
    timeHundredths: ClassificationLevel.PUBLIC,
    penaltyPoints: ClassificationLevel.PUBLIC,
    calculatedPoints: ClassificationLevel.PUBLIC,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  LaserRunScore: {
    id: ClassificationLevel.INTERNAL,
    eventId: ClassificationLevel.PUBLIC,
    athleteId: ClassificationLevel.INTERNAL,
    finishTimeSeconds: ClassificationLevel.PUBLIC,
    handicapStartDelay: ClassificationLevel.PUBLIC,
    rawDelay: ClassificationLevel.INTERNAL,
    isPackStart: ClassificationLevel.PUBLIC,
    shootingStation: ClassificationLevel.PUBLIC,
    gateAssignment: ClassificationLevel.PUBLIC,
    penaltySeconds: ClassificationLevel.PUBLIC,
    calculatedPoints: ClassificationLevel.PUBLIC,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  RidingScore: {
    id: ClassificationLevel.INTERNAL,
    eventId: ClassificationLevel.PUBLIC,
    athleteId: ClassificationLevel.INTERNAL,
    knockdowns: ClassificationLevel.PUBLIC,
    disobediences: ClassificationLevel.PUBLIC,
    timeOverSeconds: ClassificationLevel.PUBLIC,
    otherPenalties: ClassificationLevel.PUBLIC,
    calculatedPoints: ClassificationLevel.PUBLIC,
    createdAt: ClassificationLevel.INTERNAL,
    updatedAt: ClassificationLevel.INTERNAL,
  },
  TrainingEntry: {
    id: ClassificationLevel.CONFIDENTIAL,
    athleteId: ClassificationLevel.CONFIDENTIAL,
    discipline: ClassificationLevel.CONFIDENTIAL,
    date: ClassificationLevel.CONFIDENTIAL,
    notes: ClassificationLevel.CONFIDENTIAL,
    points: ClassificationLevel.CONFIDENTIAL,
    timeSeconds: ClassificationLevel.CONFIDENTIAL,
    timeHundredths: ClassificationLevel.CONFIDENTIAL,
    victories: ClassificationLevel.CONFIDENTIAL,
    totalBouts: ClassificationLevel.CONFIDENTIAL,
    placement: ClassificationLevel.CONFIDENTIAL,
    knockdowns: ClassificationLevel.CONFIDENTIAL,
    disobediences: ClassificationLevel.CONFIDENTIAL,
    createdAt: ClassificationLevel.CONFIDENTIAL,
    updatedAt: ClassificationLevel.CONFIDENTIAL,
  },
  // New models added by privacy system
  AuditLog: {
    id: ClassificationLevel.CONFIDENTIAL,
    timestamp: ClassificationLevel.CONFIDENTIAL,
    eventType: ClassificationLevel.CONFIDENTIAL,
    severity: ClassificationLevel.CONFIDENTIAL,
    actorId: ClassificationLevel.CONFIDENTIAL,
    actorRole: ClassificationLevel.CONFIDENTIAL,
    actorIp: ClassificationLevel.RESTRICTED,
    targetType: ClassificationLevel.CONFIDENTIAL,
    targetId: ClassificationLevel.CONFIDENTIAL,
    action: ClassificationLevel.CONFIDENTIAL,
    details: ClassificationLevel.RESTRICTED,
    requestPath: ClassificationLevel.CONFIDENTIAL,
    requestMethod: ClassificationLevel.CONFIDENTIAL,
    responseStatus: ClassificationLevel.CONFIDENTIAL,
    userAgent: ClassificationLevel.RESTRICTED,
  },
  ConsentRecord: {
    id: ClassificationLevel.CONFIDENTIAL,
    athleteId: ClassificationLevel.CONFIDENTIAL,
    guardianName: ClassificationLevel.RESTRICTED,
    guardianEmail: ClassificationLevel.RESTRICTED,
    guardianRelationship: ClassificationLevel.CONFIDENTIAL,
    consentType: ClassificationLevel.CONFIDENTIAL,
    consentGiven: ClassificationLevel.CONFIDENTIAL,
    consentDate: ClassificationLevel.CONFIDENTIAL,
    consentExpiryDate: ClassificationLevel.CONFIDENTIAL,
    ipAddress: ClassificationLevel.RESTRICTED,
    consentMethod: ClassificationLevel.CONFIDENTIAL,
    notes: ClassificationLevel.CONFIDENTIAL,
  },
  SessionInfo: {
    id: ClassificationLevel.RESTRICTED,
    userId: ClassificationLevel.RESTRICTED,
    tokenHash: ClassificationLevel.RESTRICTED,
    fingerprint: ClassificationLevel.RESTRICTED,
    ipAddress: ClassificationLevel.RESTRICTED,
    userAgent: ClassificationLevel.RESTRICTED,
    createdAt: ClassificationLevel.CONFIDENTIAL,
    lastActiveAt: ClassificationLevel.CONFIDENTIAL,
  },
};

/**
 * Get the classification level for a specific model field.
 * Returns RESTRICTED if the field or model is unknown (fail closed).
 */
export function getFieldClassification(
  model: string,
  field: string
): ClassificationLevel {
  const modelFields = FIELD_CLASSIFICATIONS[model];
  if (!modelFields) return ClassificationLevel.RESTRICTED;
  return modelFields[field] ?? ClassificationLevel.RESTRICTED;
}

/**
 * Get all fields for a model at or below a given classification level.
 */
export function getFieldsAtLevel(
  model: string,
  maxLevel: ClassificationLevel
): string[] {
  const modelFields = FIELD_CLASSIFICATIONS[model];
  if (!modelFields) return [];

  const levelOrder = [
    ClassificationLevel.PUBLIC,
    ClassificationLevel.INTERNAL,
    ClassificationLevel.CONFIDENTIAL,
    ClassificationLevel.RESTRICTED,
  ];
  const maxIndex = levelOrder.indexOf(maxLevel);

  return Object.entries(modelFields)
    .filter(([, level]) => levelOrder.indexOf(level) <= maxIndex)
    .map(([field]) => field);
}

/**
 * Check if a viewer role can access a given classification level.
 */
export function canRoleAccessLevel(
  role: string | null,
  level: ClassificationLevel
): boolean {
  switch (level) {
    case ClassificationLevel.PUBLIC:
      return true;
    case ClassificationLevel.INTERNAL:
      return role !== null; // Any authenticated user
    case ClassificationLevel.CONFIDENTIAL:
      return role === 'super_admin' || role === 'admin' || role === 'official';
    case ClassificationLevel.RESTRICTED:
      return role === 'super_admin' || role === 'admin';
    default:
      return false;
  }
}
