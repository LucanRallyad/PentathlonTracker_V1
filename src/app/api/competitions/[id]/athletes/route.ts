import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { withCsrfProtection } from "@/lib/security/csrf";

// GET: list athletes in a competition (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const entries = await prisma.competitionAthlete.findMany({
    where: { competitionId: id },
    include: { athlete: true },
    orderBy: { athlete: { lastName: "asc" } },
  });

  return NextResponse.json(entries);
}

// POST: add an athlete to the competition (admin only)
// Body can be:
//   { athleteId: "existing-id" }                         → link existing athlete
//   { athleteId: "existing-id", ageCategory: "U17" }     → link existing athlete with competition-specific age category
//   { firstName, lastName, country, ... }                → find or create athlete then link
async function postCompetitionAthleteHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PROTECTED: only admins can add athletes to competitions
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;

  try {
    const body = await req.json();

    let athleteId: string;
    let competitionAgeCategory: string | null = null;

    if (body.athleteId) {
      // Link an existing athlete
      athleteId = body.athleteId;
      competitionAgeCategory = body.ageCategory || null;

      // Check athlete exists
      const athlete = await prisma.athlete.findUnique({ where: { id: athleteId } });
      if (!athlete) {
        return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
      }

      // If a different age category was provided for this competition,
      // update the athlete's primary ageCategory to the latest one
      if (competitionAgeCategory && competitionAgeCategory !== athlete.ageCategory) {
        await prisma.athlete.update({
          where: { id: athleteId },
          data: { ageCategory: competitionAgeCategory },
        });
      }
    } else {
      // Create or find an athlete
      const { firstName, lastName, country, gender, ageCategory, club, dateOfBirth } = body;

      if (!firstName || !lastName || !country || !gender || !ageCategory) {
        return NextResponse.json(
          { error: "firstName, lastName, country, gender, and ageCategory are required" },
          { status: 400 }
        );
      }

      competitionAgeCategory = ageCategory;

      // ── Deduplication: check for an existing athlete with the same name ──
      // Name is the stable key — country, gender, ageCategory, club may change between competitions
      const existingAthlete = await prisma.athlete.findFirst({
        where: {
          firstName: { equals: firstName },
          lastName: { equals: lastName },
        },
      });

      if (existingAthlete) {
        // Reuse the existing athlete — update profile fields to latest values
        const updates: Record<string, unknown> = {
          ageCategory, // always update to the competition's age category
          country,     // update country (may have changed)
          gender,      // update gender (may have been corrected)
        };
        if (club) updates.club = club;
        if (dateOfBirth) updates.dateOfBirth = dateOfBirth;

        await prisma.athlete.update({
          where: { id: existingAthlete.id },
          data: updates,
        });

        athleteId = existingAthlete.id;
      } else {
        // No existing match — create a brand new athlete

        // Try to find a matching User account to auto-link
        const fullName = `${firstName} ${lastName}`;
        const matchingUser = await prisma.user.findFirst({
          where: {
            name: fullName,
            role: "athlete",
          },
        });

        // Check that user isn't already linked to another athlete
        let linkedUserId: string | null = null;
        if (matchingUser) {
          const alreadyLinked = await prisma.athlete.findUnique({
            where: { userId: matchingUser.id },
          });
          if (!alreadyLinked) {
            linkedUserId = matchingUser.id;
          }
        }

        const athlete = await prisma.athlete.create({
          data: {
            firstName,
            lastName,
            country,
            gender,
            ageCategory,
            club: club || null,
            dateOfBirth: dateOfBirth || null,
            userId: linkedUserId,
          },
        });

        athleteId = athlete.id;
      }
    }

    // Check if already registered
    const existing = await prisma.competitionAthlete.findUnique({
      where: { competitionId_athleteId: { competitionId, athleteId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Athlete already in this competition" }, { status: 409 });
    }

    const entry = await prisma.competitionAthlete.create({
      data: {
        competitionId,
        athleteId,
        ageCategory: competitionAgeCategory,
      },
      include: { athlete: true },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to add athlete" }, { status: 500 });
  }
}

export const POST = withCsrfProtection(postCompetitionAthleteHandler);

// DELETE: remove an athlete from the competition (admin only)
// Body: { athleteId: "..." }
async function deleteCompetitionAthleteHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PROTECTED: only admins can remove athletes from competitions
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id: competitionId } = await params;

  try {
    const { athleteId } = await req.json();

    if (!athleteId) {
      return NextResponse.json({ error: "athleteId is required" }, { status: 400 });
    }

    await prisma.competitionAthlete.delete({
      where: { competitionId_athleteId: { competitionId, athleteId } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove athlete" }, { status: 500 });
  }
}

export const DELETE = withCsrfProtection(deleteCompetitionAthleteHandler);
