import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status'); // all, missing, expired, active

  // Get all minor athletes with their consent records
  const minors = await prisma.athlete.findMany({
    where: { isMinorAthlete: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      ageCategory: true,
      gender: true,
      consentRecords: {
        orderBy: { consentDate: 'desc' },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const now = new Date();
  const consentTypes = ['DATA_COLLECTION', 'PUBLIC_DISPLAY', 'PHOTO_USAGE', 'COMPETITION_PARTICIPATION'];

  const result = minors.map(athlete => {
    const consentStatus: Record<string, { status: string; consentDate?: string; expiryDate?: string }> = {};

    for (const type of consentTypes) {
      const latest = athlete.consentRecords.find(r => r.consentType === type && r.consentGiven);
      if (!latest) {
        consentStatus[type] = { status: 'missing' };
      } else if (latest.consentExpiryDate && latest.consentExpiryDate < now) {
        consentStatus[type] = {
          status: 'expired',
          consentDate: latest.consentDate.toISOString(),
          expiryDate: latest.consentExpiryDate.toISOString(),
        };
      } else {
        consentStatus[type] = {
          status: 'active',
          consentDate: latest.consentDate.toISOString(),
          expiryDate: latest.consentExpiryDate?.toISOString(),
        };
      }
    }

    const overallStatus = Object.values(consentStatus).some(s => s.status === 'missing')
      ? 'missing'
      : Object.values(consentStatus).some(s => s.status === 'expired')
        ? 'expired'
        : 'active';

    return {
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      ageCategory: athlete.ageCategory,
      gender: athlete.gender,
      consentStatus,
      overallStatus,
    };
  });

  const filtered = statusFilter && statusFilter !== 'all'
    ? result.filter(a => a.overallStatus === statusFilter)
    : result;

  return NextResponse.json(filtered);
}
