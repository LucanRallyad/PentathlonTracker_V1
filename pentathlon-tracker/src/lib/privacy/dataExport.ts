import { prisma } from '@/lib/prisma';

export const dataExport = {
  /**
   * Generate a data export for an athlete.
   * Returns structured data ready to be packaged.
   */
  async generateExport(athleteId: string): Promise<ExportData> {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        privacySettings: true,
        consentRecords: true,
        trainingEntries: true,
        competitionAthletes: {
          include: {
            competition: {
              select: { name: true, date: true, location: true, status: true },
            },
          },
        },
        fencingRankingScores: { include: { event: { select: { competitionId: true, discipline: true } } } },
        fencingDEScores: { include: { event: { select: { competitionId: true, discipline: true } } } },
        obstacleScores: { include: { event: { select: { competitionId: true, discipline: true } } } },
        swimmingScores: { include: { event: { select: { competitionId: true, discipline: true } } } },
        laserRunScores: { include: { event: { select: { competitionId: true, discipline: true } } } },
        ridingScores: { include: { event: { select: { competitionId: true, discipline: true } } } },
      },
    });

    if (!athlete) throw new Error('Athlete not found');

    // Get login history from audit logs
    const loginHistory = await prisma.auditLog.findMany({
      where: {
        actorId: athleteId,
        eventType: { in: ['AUTH_LOGIN_SUCCESS', 'AUTH_DOB_LOGIN_SUCCESS'] },
      },
      select: {
        timestamp: true,
        actorIp: true,
        userAgent: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return {
      profile: {
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        country: athlete.country,
        dateOfBirth: athlete.dateOfBirth,
        ageCategory: athlete.ageCategory,
        club: athlete.club,
        gender: athlete.gender,
        createdAt: athlete.createdAt.toISOString(),
      },
      competitions: athlete.competitionAthletes.map(ca => ({
        competitionName: ca.competition.name,
        date: ca.competition.date,
        location: ca.competition.location,
        status: ca.competition.status,
        ageCategory: ca.ageCategory,
        registrationStatus: ca.status,
      })),
      scores: {
        fencingRanking: athlete.fencingRankingScores.map(s => ({
          victories: s.victories,
          totalBouts: s.totalBouts,
          points: s.calculatedPoints,
          date: s.createdAt.toISOString(),
        })),
        fencingDE: athlete.fencingDEScores.map(s => ({
          placement: s.placement,
          points: s.calculatedPoints,
          date: s.createdAt.toISOString(),
        })),
        obstacle: athlete.obstacleScores.map(s => ({
          timeSeconds: s.timeSeconds,
          penaltyPoints: s.penaltyPoints,
          points: s.calculatedPoints,
          date: s.createdAt.toISOString(),
        })),
        swimming: athlete.swimmingScores.map(s => ({
          timeHundredths: s.timeHundredths,
          penaltyPoints: s.penaltyPoints,
          points: s.calculatedPoints,
          date: s.createdAt.toISOString(),
        })),
        laserRun: athlete.laserRunScores.map(s => ({
          finishTimeSeconds: s.finishTimeSeconds,
          penaltySeconds: s.penaltySeconds,
          points: s.calculatedPoints,
          date: s.createdAt.toISOString(),
        })),
        riding: athlete.ridingScores.map(s => ({
          knockdowns: s.knockdowns,
          disobediences: s.disobediences,
          timeOverSeconds: s.timeOverSeconds,
          points: s.calculatedPoints,
          date: s.createdAt.toISOString(),
        })),
      },
      trainingEntries: athlete.trainingEntries.map(t => ({
        discipline: t.discipline,
        date: t.date,
        notes: t.notes,
        points: t.points,
        createdAt: t.createdAt.toISOString(),
      })),
      privacySettings: athlete.privacySettings,
      consentRecords: athlete.consentRecords.map(c => ({
        consentType: c.consentType,
        consentGiven: c.consentGiven,
        consentDate: c.consentDate.toISOString(),
        consentExpiryDate: c.consentExpiryDate?.toISOString(),
        guardianRelationship: c.guardianRelationship,
        consentMethod: c.consentMethod,
      })),
      loginHistory: loginHistory.map(l => ({
        timestamp: l.timestamp.toISOString(),
        ipAddress: l.actorIp,
        userAgent: l.userAgent,
      })),
      exportedAt: new Date().toISOString(),
    };
  },

  /**
   * Create a data export request (rate limited: 1 per 24 hours).
   */
  async createRequest(athleteId: string): Promise<{ success: boolean; error?: string; requestId?: string }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentRequest = await prisma.dataExportRequest.findFirst({
      where: {
        athleteId,
        requestedAt: { gte: oneDayAgo },
      },
    });

    if (recentRequest) {
      return { success: false, error: 'Only one data export per 24 hours is allowed' };
    }

    const request = await prisma.dataExportRequest.create({
      data: {
        athleteId,
        status: 'PROCESSING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { success: true, requestId: request.id };
  },
};

interface ExportData {
  profile: Record<string, unknown>;
  competitions: Record<string, unknown>[];
  scores: Record<string, Record<string, unknown>[]>;
  trainingEntries: Record<string, unknown>[];
  privacySettings: Record<string, unknown> | null;
  consentRecords: Record<string, unknown>[];
  loginHistory: Record<string, unknown>[];
  exportedAt: string;
}
