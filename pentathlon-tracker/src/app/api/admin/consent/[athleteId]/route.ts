import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/auth';
import { auditLogger, AuditEventType, AuditAction, AuditSeverity } from '@/lib/audit/auditLogger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { athleteId } = await params;

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      ageCategory: true,
      gender: true,
      isMinorAthlete: true,
      consentRecords: {
        orderBy: { consentDate: 'desc' },
      },
    },
  });

  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  return NextResponse.json(athlete);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { athleteId } = await params;
  const body = await req.json();

  const {
    guardianName,
    guardianEmail,
    guardianRelationship,
    consentType,
    consentGiven,
    consentExpiryDate,
    consentMethod,
    notes,
  } = body;

  if (!guardianName || !guardianRelationship || !consentType || !consentMethod) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const consent = await prisma.consentRecord.create({
    data: {
      athleteId,
      guardianName,
      guardianEmail,
      guardianRelationship,
      consentType,
      consentGiven: consentGiven ?? true,
      consentExpiryDate: consentExpiryDate ? new Date(consentExpiryDate) : null,
      consentMethod,
      notes,
    },
  });

  await auditLogger.logFromRequest(
    req,
    AuditEventType.PRIVACY_CONSENT_CHANGE,
    AuditAction.CREATE,
    {
      severity: AuditSeverity.INFO,
      targetType: 'ConsentRecord',
      targetId: consent.id,
      details: { athleteId, consentType, consentGiven },
    }
  );

  return NextResponse.json(consent, { status: 201 });
}
