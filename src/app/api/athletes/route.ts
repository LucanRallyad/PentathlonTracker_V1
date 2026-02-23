import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { athleteCreateSchema, validateRequest } from "@/lib/validation/schemas";
import { withCsrfProtection } from "@/lib/security/csrf";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const competitionId = searchParams.get("competitionId");

  // Only show athletes that have a linked account OR have competed in at least one competition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseFilter: any[] = [
    { userId: { not: null } },
    { competitionAthletes: { some: {} } },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { OR: baseFilter };

  if (competitionId) {
    where.competitionAthletes = { some: { competitionId } };
  }

  if (search) {
    where.AND = [
      {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { country: { contains: search } },
        ],
      },
    ];
  }

  const athletes = await prisma.athlete.findMany({
    where,
    include: {
      _count: { select: { competitionAthletes: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(athletes);
}

async function postAthleteHandler(req: NextRequest) {
  // PROTECTED: only admins can create athletes
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  try {
    // Validate request body with Zod
    const validation = await validateRequest(req, athleteCreateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { country, ageCategory, gender, ...rest } = validation.data;
    const data = {
      ...rest,
      country: country || "",
      ageCategory: ageCategory || "",
      gender: gender || "M",
    };
    const athlete = await prisma.athlete.create({ data });
    return NextResponse.json(athlete, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create athlete" },
      { status: 500 }
    );
  }
}

export const POST = withCsrfProtection(postAthleteHandler);
