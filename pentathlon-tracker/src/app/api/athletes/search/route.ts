import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const athletes = await prisma.athlete.findMany({
    where: {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      country: true,
      ageCategory: true,
      gender: true,
      club: true,
      userId: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 10,
  });

  return NextResponse.json(athletes);
}
