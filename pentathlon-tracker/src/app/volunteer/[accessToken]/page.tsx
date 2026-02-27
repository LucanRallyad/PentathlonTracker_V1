import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setVolunteerSession } from "@/lib/volunteer-auth";

interface Props {
  params: Promise<{ accessToken: string }>;
}

export default async function VolunteerEntryPage({ params }: Props) {
  const { accessToken } = await params;

  const volunteer = await prisma.volunteer.findUnique({
    where: { accessToken },
    include: { competition: true },
  });

  if (!volunteer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Link</h1>
          <p className="text-gray-600">This volunteer access link is not valid.</p>
        </div>
      </div>
    );
  }

  if (volunteer.status === "revoked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Revoked</h1>
          <p className="text-gray-600">Your volunteer access has been revoked by an administrator.</p>
        </div>
      </div>
    );
  }

  if (new Date() > volunteer.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-amber-600 mb-2">Competition Ended</h1>
          <p className="text-gray-600">This competition has ended and volunteer access has expired.</p>
        </div>
      </div>
    );
  }

  await setVolunteerSession({
    volunteerId: volunteer.id,
    competitionId: volunteer.competitionId,
    name: volunteer.name,
    role: "volunteer",
  });

  await prisma.volunteer.update({
    where: { id: volunteer.id },
    data: { lastActiveAt: new Date() },
  });

  redirect("/volunteer/dashboard");
}
