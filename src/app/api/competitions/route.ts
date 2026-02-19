import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { competitionCreateSchema, validateRequest } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { location: { contains: search } },
    ];
  }

  const competitions = await prisma.competition.findMany({
    where,
    include: {
      events: { select: { id: true, discipline: true, status: true } },
      _count: { select: { competitionAthletes: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(competitions);
}

export async function POST(req: NextRequest) {
  // PROTECTED: only admins can create competitions
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  try {
    // Validate request body with Zod
    const validation = await validateRequest(req, competitionCreateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const competition = await prisma.competition.create({ data });
    return NextResponse.json(competition, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create competition" },
      { status: 500 }
    );
  }
}
