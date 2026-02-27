"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

interface RankingEntry {
  athleteId: string;
  firstName: string;
  lastName: string;
  country: string;
  club: string | null;
  gender: string;
  ageCategory: string;
  bestTotal: number;
  bestSwimLR: number;
  bestCompetitionName: string;
  standard: "national" | "development" | "none";
}

const AGE_CATEGORIES = ["Senior", "Junior", "U19", "U17", "U15"];
const GENDER_FILTERS = ["Male", "Female"];

const STANDARD_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  national:    { label: "National Team",    bg: "bg-[#DBEDDB]", text: "text-[#1A7A1A]", border: "border-[#A3D9A3]" },
  development: { label: "Development Team", bg: "bg-[#D3E5EF]", text: "text-[#0B6E99]", border: "border-[#9ECBDF]" },
  none:        { label: "---",              bg: "bg-[#F1F1EF]", text: "text-[#9B9A97]", border: "border-[#E9E9E7]" },
};

// National Team standards for display reference
const NATIONAL_STANDARDS: Record<string, Record<string, number>> = {
  Senior: { M: 1470, F: 1285 },
  Junior: { M: 1400, F: 1220 },
  U19:    { M: 1390, F: 1215 },
  U17:    { M: 1295, F: 1150 },
  U15:    { M: 1085, F: 1065 },
};

const DEVELOPMENT_STANDARDS: Record<string, Record<string, number>> = {
  Senior: { M: 1400, F: 1220 },
  Junior: { M: 1330, F: 1160 },
  U19:    { M: 1320, F: 1155 },
  U17:    { M: 1230, F: 1095 },
  U15:    { M: 1030, F: 1010 },
};

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rankings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch rankings");
        return r.json();
      })
      .then((data) => setRankings(data.rankings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Apply filters (only if filters are selected)
  const filtered = rankings.filter((r) => {
    if (genderFilter) {
      const genderCode = genderFilter === "Male" ? "M" : "F";
      if (r.gender !== genderCode) return false;
    }
    if (ageCategoryFilter) {
      if (r.ageCategory !== ageCategoryFilter) return false;
    }
    return true;
  });

  // Re-rank after filtering (sorted by bestTotal desc)
  const ranked = filtered
    .sort((a, b) => b.bestTotal - a.bestTotal)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Determine active standard thresholds for display
  const showStandardRef = ageCategoryFilter !== null;
  const activeGenderCode = genderFilter === "Female" ? "F" : genderFilter === "Male" ? "M" : null;

  if (loading) {
    return (
      <>
        <TopNav
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: "Rankings" },
          ]}
        />
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-[#F7F6F3] rounded animate-pulse" />
            <div className="h-6 w-48 bg-[#F7F6F3] rounded animate-pulse" />
            <div className="h-[400px] bg-[#F7F6F3] rounded animate-pulse mt-6" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Rankings" },
        ]}
      />
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight flex items-center gap-3">
            <TrendingUp size={28} className="text-[#0B6E99]" />
            Rankings
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            National and Development Team qualification standings based on best competition results.
          </p>
        </div>

        {/* Gender filter tabs */}
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider mb-1.5">
            Gender
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {GENDER_FILTERS.map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(genderFilter === g ? null : g)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                  genderFilter === g
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Age category filter tabs */}
        <div className="mb-6">
          <div className="text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider mb-1.5">
            Age Category
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {AGE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setAgeCategoryFilter(ageCategoryFilter === cat ? null : cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                  ageCategoryFilter === cat
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Standard reference card */}
        {showStandardRef && (
          <div className="mb-6 p-4 bg-[#F7F6F3] border border-[#E9E9E7] rounded-[6px]">
            <div className="text-xs font-semibold text-[#37352F] mb-2">
              Qualification Standards -- {ageCategoryFilter}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(activeGenderCode ? [activeGenderCode] : ["M", "F"]).map((g) => {
                const gLabel = g === "M" ? "Men" : "Women";
                const nt = NATIONAL_STANDARDS[ageCategoryFilter!]?.[g];
                const dt = DEVELOPMENT_STANDARDS[ageCategoryFilter!]?.[g];
                return (
                  <div key={g} className="flex items-center gap-3">
                    <span className="font-medium text-[#37352F] w-16">{gLabel}:</span>
                    {nt && (
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#1A7A1A]" />
                        <span className="text-[#787774]">NT {nt}</span>
                      </span>
                    )}
                    {dt && (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0B6E99]" />
                        <span className="text-[#787774]">DT {dt}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="text-xs text-[#9B9A97] mb-3">
          {ranked.length} athlete{ranked.length !== 1 ? "s" : ""}
        </div>

        {/* Rankings table */}
        {ranked.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E9E9E7] rounded-[4px]">
            <TrendingUp size={32} className="mx-auto text-[#D3D1CB] mb-3" />
            <p className="text-sm text-[#9B9A97]">No rankings available.</p>
            <p className="text-xs text-[#C4C4C0] mt-1">
              Athletes need to have competed in at least one competition with scores entered.
            </p>
          </div>
        ) : (
          <div className="border border-[#E9E9E7] rounded-[4px] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F6F3] border-b border-[#E9E9E7]">
                  <th className="text-center py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-14">
                    Rank
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">
                    Athlete
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-16 hidden sm:table-cell">
                    Country
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-20 hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-bold text-[#37352F] uppercase tracking-wider w-20">
                    Best Total
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-20 hidden sm:table-cell">
                    Swim+LR
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-36">
                    Standard
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((entry) => {
                  const badge = STANDARD_BADGES[entry.standard];
                  return (
                    <tr
                      key={entry.athleteId}
                      className="border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#FAFAF8] transition-colors"
                    >
                      <td className="py-2.5 px-2 text-center font-bold text-[#787774]">
                        {entry.rank}
                      </td>
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/athletes/${entry.athleteId}`}
                          className="font-medium text-[#37352F] hover:text-[#0B6E99] transition-colors"
                        >
                          {entry.firstName} {entry.lastName}
                        </Link>
                        {entry.club && (
                          <span className="text-xs text-[#9B9A97] ml-2 hidden lg:inline">
                            {entry.club}
                          </span>
                        )}
                        {entry.bestCompetitionName && (
                          <div className="text-[10px] text-[#C4C4C0] mt-0.5 hidden md:block">
                            Best at: {entry.bestCompetitionName}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[#787774] hidden sm:table-cell">
                        {entry.country}
                      </td>
                      <td className="py-2.5 px-2 text-[#787774] hidden md:table-cell">
                        <span className="text-xs">
                          {entry.ageCategory} {entry.gender === "M" ? "M" : "F"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-[#37352F]">
                        {entry.bestTotal > 0 ? entry.bestTotal : (
                          <span className="text-[#C4C4C0]">---</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-[#37352F] hidden sm:table-cell">
                        {entry.bestSwimLR > 0 ? entry.bestSwimLR : (
                          <span className="text-[#C4C4C0]">---</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-[3px] border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 flex-wrap text-xs text-[#9B9A97]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#1A7A1A]" />
            National Team Standard
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0B6E99]" />
            Development Team Standard
          </div>
          <div className="text-[#C4C4C0]">
            U15 uses 4-discipline totals (no fencing). Senior/Junior/U19/U17 use 5-discipline totals.
          </div>
        </div>
      </div>
    </>
  );
}
