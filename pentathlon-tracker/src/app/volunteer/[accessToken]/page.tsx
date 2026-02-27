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
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="text-center p-8 bg-white rounded-[4px] border border-[#E9E9E7] mx-4 max-w-sm w-full">
          <h1 className="text-xl font-semibold text-[#E03E3E] mb-2">Invalid Link</h1>
          <p className="text-sm text-[#787774]">This volunteer access link is not valid.</p>
        </div>
      </div>
    );
  }

  if (volunteer.status === "revoked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="text-center p-8 bg-white rounded-[4px] border border-[#E9E9E7] mx-4 max-w-sm w-full">
          <h1 className="text-xl font-semibold text-[#E03E3E] mb-2">Access Revoked</h1>
          <p className="text-sm text-[#787774]">Your volunteer access has been revoked by an administrator.</p>
        </div>
      </div>
    );
  }

  if (new Date() > volunteer.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="text-center p-8 bg-white rounded-[4px] border border-[#E9E9E7] mx-4 max-w-sm w-full">
          <h1 className="text-xl font-semibold text-[#D9730D] mb-2">Competition Ended</h1>
          <p className="text-sm text-[#787774]">This competition has ended and volunteer access has expired.</p>
        </div>
      </div>
    );
  }

  if (volunteer.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="text-center p-8 bg-white rounded-[4px] border border-[#E9E9E7] mx-4 max-w-sm w-full">
          <h1 className="text-xl font-semibold text-[#E03E3E] mb-2">Access Unavailable</h1>
          <p className="text-sm text-[#787774]">Your volunteer access is not currently active.</p>
        </div>
      </div>
    );
  }

  try {
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
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="text-center p-8 bg-white rounded-[4px] border border-[#E9E9E7] mx-4 max-w-sm w-full">
          <h1 className="text-xl font-semibold text-[#E03E3E] mb-2">Something Went Wrong</h1>
          <p className="text-sm text-[#787774]">Unable to start your volunteer session. Please try again.</p>
        </div>
      </div>
    );
  }

  redirect("/volunteer/dashboard");
}
