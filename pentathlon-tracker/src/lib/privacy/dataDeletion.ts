import { prisma } from '@/lib/prisma';

const COOLING_OFF_DAYS_SELF = 14;
const COOLING_OFF_DAYS_ADMIN = 7;

export const dataDeletion = {
  /**
   * Create a self-service deletion request (athlete requesting their own deletion).
   */
  async createSelfRequest(athleteId: string): Promise<{
    success: boolean;
    requestId?: string;
    scheduledDate?: Date;
    error?: string;
  }> {
    // Check for existing pending request
    const existing = await prisma.deletionRequest.findFirst({
      where: {
        athleteId,
        status: { in: ['PENDING', 'COOLING_OFF', 'PROCESSING'] },
      },
    });

    if (existing) {
      return { success: false, error: 'A deletion request is already pending' };
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + COOLING_OFF_DAYS_SELF);

    const request = await prisma.deletionRequest.create({
      data: {
        athleteId,
        requestedBy: 'SELF',
        status: 'COOLING_OFF',
        scheduledDeletionDate: scheduledDate,
      },
    });

    return {
      success: true,
      requestId: request.id,
      scheduledDate,
    };
  },

  /**
   * Create an admin-initiated deletion request.
   */
  async createAdminRequest(
    athleteId: string,
    adminUserId: string,
    reason: string
  ) {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + COOLING_OFF_DAYS_ADMIN);

    return prisma.deletionRequest.create({
      data: {
        athleteId,
        requestedBy: adminUserId,
        reason,
        status: 'COOLING_OFF',
        scheduledDeletionDate: scheduledDate,
      },
    });
  },

  /**
   * Cancel a deletion request (during cooling-off period).
   */
  async cancelRequest(requestId: string): Promise<boolean> {
    const request = await prisma.deletionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== 'COOLING_OFF') {
      return false;
    }

    await prisma.deletionRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    return true;
  },

  /**
   * Process deletion requests that have passed the cooling-off period.
   */
  async processReadyDeletions(): Promise<{ processed: number }> {
    const now = new Date();
    const readyRequests = await prisma.deletionRequest.findMany({
      where: {
        status: 'COOLING_OFF',
        scheduledDeletionDate: { lte: now },
      },
    });

    let processed = 0;

    for (const request of readyRequests) {
      await prisma.deletionRequest.update({
        where: { id: request.id },
        data: { status: 'PROCESSING' },
      });

      try {
        await this.executeAthleteAnonymization(request.athleteId);

        await prisma.deletionRequest.update({
          where: { id: request.id },
          data: { status: 'COMPLETED', completedDate: new Date() },
        });

        processed++;
      } catch (error) {
        console.error(`[DataDeletion] Failed to process deletion for athlete ${request.athleteId}:`, error);
      }
    }

    return { processed };
  },

  /**
   * Execute the actual data anonymization/deletion cascade.
   */
  async executeAthleteAnonymization(athleteId: string): Promise<void> {
    // 1. Delete training entries
    await prisma.trainingEntry.deleteMany({ where: { athleteId } });

    // 2. Delete privacy settings
    await prisma.privacySettings.deleteMany({ where: { athleteId } });

    // 3. Anonymize consent records (keep for legal compliance, remove guardian PII)
    await prisma.consentRecord.updateMany({
      where: { athleteId },
      data: {
        guardianName: 'ANONYMIZED',
        guardianEmail: null,
        notes: null,
      },
    });

    // 4. Delete data export requests
    await prisma.dataExportRequest.deleteMany({ where: { athleteId } });

    // 5. Delete the linked user account if exists
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { userId: true },
    });

    if (athlete?.userId) {
      // Delete user's sessions, password history, lockout, policy acceptances
      await prisma.sessionInfo.deleteMany({ where: { userId: athlete.userId } });
      await prisma.passwordHistory.deleteMany({ where: { userId: athlete.userId } });
      await prisma.accountLockout.deleteMany({ where: { userId: athlete.userId } });
      await prisma.policyAcceptance.deleteMany({ where: { userId: athlete.userId } });
      await prisma.user.delete({ where: { id: athlete.userId } });
    }

    // 6. Anonymize the athlete record (keep for competition history)
    await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        firstName: 'Deleted',
        lastName: 'Athlete',
        country: 'N/A',
        dateOfBirth: null,
        dobHash: null,
        club: null,
        userId: null,
      },
    });

    // 7. Anonymize audit logs referencing this athlete
    await prisma.auditLog.updateMany({
      where: { targetType: 'Athlete', targetId: athleteId },
      data: {
        details: JSON.stringify({ anonymized: true }),
      },
    });

    // Log the retention action
    await prisma.dataRetentionLog.create({
      data: {
        action: 'ANONYMIZED',
        targetType: 'Athlete',
        targetId: athleteId,
        details: JSON.stringify({ reason: 'Deletion request processed' }),
      },
    });
  },

  /**
   * Get all deletion requests for admin review.
   */
  async getRequests(status?: string) {
    const where = status ? { status } : {};
    return prisma.deletionRequest.findMany({
      where,
      include: {
        athlete: {
          select: { id: true, firstName: true, lastName: true, ageCategory: true },
        },
      },
      orderBy: { requestDate: 'desc' },
    });
  },
};
