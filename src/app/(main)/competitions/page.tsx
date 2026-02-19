"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { Search, Trophy, MapPin, Calendar, Users } from "lucide-react";

interface Competition {
  id: string;
  name: string;
  date: string;
  endDate: string;
  location: string;
  status: string;
  ageCategory: string;
  competitionType: string;
  _count?: { competitionAthletes: number };
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "completed">("all");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/competitions${search ? `?search=${encodeURIComponent(search)}` : ""}`)
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then(setCompetitions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  const filtered =
    filter === "all"
      ? competitions
      : competitions.filter((c) => c.status === filter);

  const active = competitions.filter((c) => c.status === "active");
  const upcoming = competitions.filter((c) => c.status === "upcoming");
  const completed = competitions.filter((c) => c.status === "completed");

  function formatDateRange(start: string, end: string) {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${s.toLocaleDateString("en-US", opts)}–${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${s.getFullYear()}`;
  }

  const filterTabs = [
    { id: "all", label: `All (${competitions.length})` },
    { id: "active", label: `Active (${active.length})` },
    { id: "upcoming", label: `Upcoming (${upcoming.length})` },
    { id: "completed", label: `Completed (${completed.length})` },
  ];

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Competitions" }]} />
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <h1 className="text-[40px] font-bold text-[#37352F] tracking-tight mb-8 leading-tight">
          Competitions
        </h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9A97]"
          />
          <input
            type="text"
            placeholder="Search competitions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E9E9E7] rounded-[4px] outline-none text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mb-6">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-4 py-2 text-sm font-medium rounded-[4px] border transition-colors ${
                filter === tab.id
                  ? "bg-[#37352F] text-white border-[#37352F]"
                  : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Trophy size={32} className="mx-auto text-[#C4C4C0] mb-3" />
            <p className="text-sm text-[#9B9A97]">
              {search ? "No competitions match your search" : "No competitions found"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((comp) => (
              <Link
                key={comp.id}
                href={`/competitions/${comp.id}`}
                className="block border border-[#E9E9E7] rounded-[4px] p-6 hover:bg-[#FBFBFA] hover:border-[#D3D1CB] transition-all group"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    {/* Title and Status */}
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-[16px] font-semibold text-[#37352F] group-hover:text-[#0B6E99] transition-colors truncate">
                        {comp.name}
                      </h3>
                      <StatusBadge status={comp.status} />
                    </div>

                    {/* Date, Location, Athletes */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-[#787774]">
                        <Calendar size={14} className="text-[#9B9A97] flex-shrink-0" />
                        <span>{formatDateRange(comp.date, comp.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#787774]">
                        <MapPin size={14} className="text-[#9B9A97] flex-shrink-0" />
                        <span>{comp.location}</span>
                      </div>
                      {comp._count?.competitionAthletes != null && (
                        <div className="flex items-center gap-2 text-sm text-[#787774]">
                          <Users size={14} className="text-[#9B9A97] flex-shrink-0" />
                          <span>{comp._count.competitionAthletes} athlete{comp._count.competitionAthletes !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>

                    {/* Category and Type Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      {comp.ageCategory.split(",").map((cat) => (
                        <span
                          key={cat}
                          className="inline-block px-2.5 py-1 text-[11px] font-medium bg-[#F0F0ED] text-[#787774] rounded-[3px]"
                        >
                          {cat.trim()}
                        </span>
                      ))}
                      {comp.competitionType.split(",").map((t) => (
                        <span
                          key={t}
                          className="inline-block px-2.5 py-1 text-[11px] font-medium bg-[#E8F4EC] text-[#0F7B6C] rounded-[3px]"
                        >
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="text-sm text-[#9B9A97] group-hover:text-[#0B6E99] transition-colors flex-shrink-0">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
