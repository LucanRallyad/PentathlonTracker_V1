import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAccessToken } from "@/lib/volunteer-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;

  const volunteers = await prisma.volunteer.findMany({
    where: { competitionId: id },
    include: {
      assignments: {
        include: { event: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(volunteers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const body = await req.json();
  const { name, email, phone } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json(
      { error: "Email or phone is required" },
      { status: 400 }
    );
  }

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) {
    return NextResponse.json(
      { error: "Competition not found" },
      { status: 404 }
    );
  }

  const accessToken = generateAccessToken();

  const volunteer = await prisma.volunteer.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      accessToken,
      competitionId: id,
      expiresAt: new Date(competition.endDate + "T23:59:59Z"),
      createdBy: adminOrError.id,
    },
  });

  const accessLink = `${req.headers.get("origin") || ""}/volunteer/${accessToken}`;

  return NextResponse.json({ ...volunteer, accessLink }, { status: 201 });
}
