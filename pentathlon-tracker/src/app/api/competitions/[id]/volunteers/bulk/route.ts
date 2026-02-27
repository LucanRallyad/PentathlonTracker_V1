import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAccessToken } from "@/lib/volunteer-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin(req);
  if (isErrorResponse(adminOrError)) return adminOrError;

  const { id } = await params;
  const body = await req.json();
  const { volunteers } = body;

  if (!Array.isArray(volunteers) || volunteers.length === 0) {
    return NextResponse.json(
      { error: "volunteers must be a non-empty array" },
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

  const expiresAt = new Date(competition.endDate + "T23:59:59Z");
  const origin = req.headers.get("origin") || "";

  const created = await prisma.$transaction(
    volunteers.map(
      (v: { name: string; email?: string; phone?: string }) => {
        const accessToken = generateAccessToken();
        return prisma.volunteer.create({
          data: {
            name: v.name,
            email: v.email || null,
            phone: v.phone || null,
            accessToken,
            competitionId: id,
            expiresAt,
            createdBy: adminOrError.id,
          },
        });
      }
    )
  );

  const results = created.map((vol) => ({
    ...vol,
    accessLink: `${origin}/volunteer/${vol.accessToken}`,
  }));

  return NextResponse.json(results, { status: 201 });
}
