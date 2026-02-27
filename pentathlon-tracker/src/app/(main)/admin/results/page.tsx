"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { Trophy } from "lucide-react";

interface Competition {
  id: string;
  name: string;
  date: string;
  endDate: string;
  location: string;
  status: string;
  ageCategory: string;
  events: { id: string; status: string; discipline: string }[];
  _count: { competitionAthletes: number };
}

export default function ResultsHubPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then(setCompetitions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Show active first, then completed, then upcoming
  const sorted = [...competitions].sort((a, b) => {
    const order = { active: 0, completed: 1, upcoming: 2 };
    const oa = order[a.status as keyof typeof order] ?? 3;
    const ob = order[b.status as keyof typeof order] ?? 3;
    return oa - ob;
  });

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: "Results" },
        ]}
      />
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight mb-4 leading-tight flex items-center gap-3">
          <Trophy size={32} className="text-[#DFAB01]" />
          Results
        </h1>
        <p className="text-sm text-[#787774] mb-10">
          Select a competition to view results and medal standings.
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#9B9A97] text-sm">No competitions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((comp) => {
              const completedEvents = comp.events.filter(
                (e) => e.status === "completed"
              ).length;

              return (
                <Link
                  key={comp.id}
                  href={`/admin/competitions/${comp.id}/results`}
                  className="flex items-center justify-between p-4 border border-[#E9E9E7] rounded-[4px] hover:bg-[#FBFBFA] transition-colors group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-medium text-[#37352F]">
                        {comp.name}
                      </span>
                      <StatusBadge status={comp.status} />
                    </div>
                    <div className="text-sm text-[#787774]">
                      {comp.location} · {comp.ageCategory} ·{" "}
                      {comp._count.competitionAthletes} athletes ·{" "}
                      {completedEvents}/{comp.events.length} events done
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#DFAB01] border border-[#DFAB01] rounded-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trophy size={12} />
                    View Results
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
