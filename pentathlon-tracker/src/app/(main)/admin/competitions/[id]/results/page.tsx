"use client";

import { useState, useEffect, useCallback, use } from "react";
import { TopNav } from "@/components/TopNav";
import { Trophy, Medal, Printer } from "lucide-react";
import { CompetitionStatusControl } from "@/components/CompetitionStatusControl";

interface CompetitionInfo {
  id: string;
  name: string;
  date: string;
  location: string;
  ageCategory: string;
  status: string;
}

interface ResultEntry {
  athleteId: string;
  firstName: string;
  lastName: string;
  country: string;
  gender: string;
  ageCategory: string;
  club: string | null;
  fencingRanking: number | null;
  fencingDE: number | null;
  obstacle: number | null;
  swimming: number | null;
  laserRun: number | null;
  riding: number | null;
  total: number;
}

interface ResultsData {
  competition: CompetitionInfo;
  results: ResultEntry[];
}

type GroupKey = string; // e.g. "Senior_M", "U17_F", etc.

interface RankedGroup {
  label: string;
  gender: string;
  ageCategory: string;
  athletes: (ResultEntry & { rank: number })[];
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>("_all");

  const fetchResults = useCallback(() => {
    fetch(`/api/competitions/${id}/results`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading || !data) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Admin", href: "/admin" }, { label: "Loading..." }]} />
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="h-10 w-48 bg-[#F7F6F3] rounded animate-pulse" />
        </div>
      </>
    );
  }

  const { competition, results } = data;

  // Build groups by ageCategory + gender
  const categories = competition.ageCategory.split(",").map((c) => c.trim()).filter(Boolean);
  const genders = [...new Set(results.map((r) => r.gender))].sort();

  const groups: RankedGroup[] = [];
  for (const cat of categories) {
    for (const gender of genders) {
      const athletes = results
        .filter((r) => r.ageCategory === cat && r.gender === gender)
        .sort((a, b) => b.total - a.total)
        .map((r, i) => ({ ...r, rank: i + 1 }));

      if (athletes.length > 0) {
        const genderLabel = gender === "M" ? "Male" : "Female";
        groups.push({
          label: `${cat} — ${genderLabel}`,
          gender,
          ageCategory: cat,
          athletes,
        });
      }
    }
  }

  // Build filter buttons
  const groupButtons: { id: string; label: string }[] = [
    { id: "_all", label: `All (${results.length})` },
  ];

  // Add gender-only filters
  for (const gender of genders) {
    const genderLabel = gender === "M" ? "Male" : "Female";
    const count = results.filter((r) => r.gender === gender).length;
    groupButtons.push({ id: `gender_${gender}`, label: `${genderLabel} (${count})` });
  }

  // Add category+gender specific filters
  for (const group of groups) {
    const key = `${group.ageCategory}_${group.gender}`;
    groupButtons.push({ id: key, label: `${group.label} (${group.athletes.length})` });
  }

  // Filter groups based on selection
  let visibleGroups = groups;
  if (activeGroup !== "_all") {
    if (activeGroup.startsWith("gender_")) {
      const gender = activeGroup.replace("gender_", "");
      visibleGroups = groups.filter((g) => g.gender === gender);
    } else {
      visibleGroups = groups.filter((g) => `${g.ageCategory}_${g.gender}` === activeGroup);
    }
  }

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: competition.name, href: `/admin/competitions/${id}/score-entry` },
          { label: "Results" },
        ]}
      />
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight flex items-center gap-3">
              <Trophy size={28} className="text-[#DFAB01]" />
              Results
            </h1>
            <p className="text-sm text-[#787774] mt-1">
              {competition.name} · {competition.location} · {new Date(competition.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CompetitionStatusControl
              competitionId={id}
              status={competition.status}
              onStatusChange={fetchResults}
              variant="inline"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-[#F7F6F3] transition-colors print:hidden"
            >
              <Printer size={12} />
              Print
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mb-6 flex-wrap print:hidden">
          {groupButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setActiveGroup(btn.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                activeGroup === btn.id
                  ? "bg-[#37352F] text-white border-[#37352F]"
                  : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Results groups */}
        {visibleGroups.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E9E9E7] rounded-[4px]">
            <p className="text-sm text-[#9B9A97]">No results available</p>
          </div>
        ) : (
          <div className="space-y-8">
            {visibleGroups.map((group) => (
              <ResultGroup key={`${group.ageCategory}_${group.gender}`} group={group} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Medal colors ─────────────────────────────────────────────────────────────

const MEDAL_STYLES: Record<number, { bg: string; text: string; border: string; icon: string }> = {
  1: { bg: "bg-[#FFF8E1]", text: "text-[#B8860B]", border: "border-[#DFAB01]", icon: "🥇" },
  2: { bg: "bg-[#F5F5F5]", text: "text-[#6B6B6B]", border: "border-[#C0C0C0]", icon: "🥈" },
  3: { bg: "bg-[#FFF0E6]", text: "text-[#A0522D]", border: "border-[#CD7F32]", icon: "🥉" },
};

// ─── Result Group ─────────────────────────────────────────────────────────────

function ResultGroup({ group }: { group: RankedGroup }) {
  return (
    <div className="break-inside-avoid">
      {/* Group header */}
      <div className="flex items-center gap-2 mb-3">
        <Medal size={16} className="text-[#DFAB01]" />
        <h2 className="text-lg font-bold text-[#37352F] tracking-tight">
          {group.label}
        </h2>
        <span className="text-xs text-[#9B9A97]">
          {group.athletes.length} athlete{group.athletes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Podium cards for top 3 */}
      {group.athletes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {group.athletes.slice(0, 3).map((athlete) => {
            const medal = MEDAL_STYLES[athlete.rank];
            return (
              <div
                key={athlete.athleteId}
                className={`${medal?.bg || "bg-white"} border ${medal?.border || "border-[#E9E9E7]"} rounded-[6px] p-4 text-center`}
              >
                <div className="text-2xl mb-1">{medal?.icon || ""}</div>
                <div className={`text-lg font-bold ${medal?.text || "text-[#37352F]"}`}>
                  {ordinal(athlete.rank)}
                </div>
                <div className="text-[15px] font-semibold text-[#37352F] mt-1">
                  {athlete.firstName} {athlete.lastName}
                </div>
                <div className="text-xs text-[#787774]">
                  {athlete.country}
                  {athlete.club && ` · ${athlete.club}`}
                </div>
                <div className="text-xl font-bold text-[#37352F] mt-2">
                  {Math.round(athlete.total)}
                  <span className="text-xs font-normal text-[#9B9A97] ml-1">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full results table */}
      <div className="border border-[#E9E9E7] rounded-[4px] overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-[#F7F6F3] border-b border-[#E9E9E7]">
              <th className="text-center py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-12">Rank</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">Athlete</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-16">Country</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-16">Fence</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-12">DE</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-14">Obst</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-14">Swim</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-14">L-Run</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-14">Ride</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-[#37352F] uppercase tracking-wider w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {group.athletes.map((athlete) => {
              const medal = MEDAL_STYLES[athlete.rank];
              return (
                <tr
                  key={athlete.athleteId}
                  className={`border-b border-[#E9E9E7] last:border-b-0 transition-colors ${
                    medal ? medal.bg : "hover:bg-[#FAFAF8]"
                  }`}
                >
                  <td className={`py-2.5 px-2 text-center font-bold ${medal?.text || "text-[#787774]"}`}>
                    {medal?.icon ? `${medal.icon}` : athlete.rank}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-[#37352F]">
                      {athlete.firstName} {athlete.lastName}
                    </span>
                    {athlete.club && (
                      <span className="text-xs text-[#9B9A97] ml-2">{athlete.club}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-[#787774]">{athlete.country}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-[#37352F]">
                    {athlete.fencingRanking !== null ? Math.round(athlete.fencingRanking) : <span className="text-[#C4C4C0]">—</span>}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[#37352F]">
                    {athlete.fencingDE !== null ? Math.round(athlete.fencingDE) : <span className="text-[#C4C4C0]">—</span>}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[#37352F]">
                    {athlete.obstacle !== null ? Math.round(athlete.obstacle) : <span className="text-[#C4C4C0]">—</span>}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[#37352F]">
                    {athlete.swimming !== null ? Math.round(athlete.swimming) : <span className="text-[#C4C4C0]">—</span>}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[#37352F]">
                    {athlete.laserRun !== null ? Math.round(athlete.laserRun) : <span className="text-[#C4C4C0]">—</span>}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[#37352F]">
                    {athlete.riding !== null ? Math.round(athlete.riding) : <span className="text-[#C4C4C0]">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#37352F]">
                    {athlete.total > 0 ? Math.round(athlete.total) : <span className="text-[#C4C4C0]">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
