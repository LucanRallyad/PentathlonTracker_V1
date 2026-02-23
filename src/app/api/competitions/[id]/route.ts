import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { competitionUpdateSchema, validateRequest } from "@/lib/validation/schemas";
import { withCsrfProtection } from "@/lib/security/csrf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { sortOrder: "asc" },
      },
      competitionAthletes: {
        include: {
          athlete: true,
        },
      },
    },
  });

  if (!competition) {
    return NextResponse.json(
      { error: "Competition not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(competition);
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  upcoming: ["active"],
  active: ["completed"],
  completed: [], // terminal state
};

async function patchCompetitionHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require admin/official auth
  const admin = await requireAdmin(req);
  if (isErrorResponse(admin)) return admin;

  const { id } = await params;
  
  // Validate request body with Zod
  const validation = await validateRequest(req, competitionUpdateSchema);
  if (!validation.success) {
    return validation.response;
  }

  const data = validation.data;

  // If status is being changed, validate the transition
  if (data.status) {
    const existing = await prisma.competition.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(data.status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${existing.status}" to "${data.status}"` },
        { status: 400 }
      );
    }
  }

  const competition = await prisma.competition.update({
    where: { id },
    data,
  });

  return NextResponse.json(competition);
}

export const PATCH = withCsrfProtection(patchCompetitionHandler);

async function deleteCompetitionHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (isErrorResponse(admin)) return admin;

  const { id } = await params;

  try {
    await prisma.competition.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete competition" },
      { status: 500 }
    );
  }
}

export const DELETE = withCsrfProtection(deleteCompetitionHandler);
