"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { TopNav } from "@/components/TopNav";
import { AthleteSelector } from "@/components/AthleteSelector";
import { useAuth } from "@/lib/useAuth";
import { Loader2, Trophy, Target, TrendingUp, Award, Swords, PersonStanding, Waves, Crosshair, Activity, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); });

// ─── Types ───────────────────────────────────────────────────────────────────

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  club: string | null;
}

interface PersonalBests {
  fencingRanking: number | null;
  fencingDE: number | null;
  obstacle: { bestTime: number; bestPoints: number } | null;
  swimming: { bestTime: number; bestPoints: number } | null;
  laserRun: { bestTime: number; bestPoints: number } | null;
  riding: number | null;
  totalPoints: number | null;
}

interface AthleteStats {
  totalCompetitions: number;
  completedCompetitions: number;
  highestTotal: number | null;
  averageTotal: number | null;
}

interface AthleteComp {
  competitionId: string;
  competitionName: string;
  date: string;
  location: string;
  status: string;
  fencingRanking: number | null;
  fencingDE: number | null;
  obstacle: number | null;
  swimming: number | null;
  laserRun: number | null;
  riding: number | null;
  total: number;
}

interface AthleteProfileData {
  athlete: Athlete;
  competitions: AthleteComp[];
  personalBests: PersonalBests;
  stats: AthleteStats;
  scoreHistory: Record<string, unknown[]>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparisonPage() {
  const { athleteId, isLoading: authLoading } = useAuth();
  const [selectedAthletes, setSelectedAthletes] = useState<(Athlete | null)[]>([null, null, null]);
  const [isLoadingOwnAthlete, setIsLoadingOwnAthlete] = useState(false);
  const hasLoadedOwnAthlete = useRef(false);

  // Auto-load logged-in athlete as Athlete 1
  useEffect(() => {
    if (!authLoading && athleteId && !hasLoadedOwnAthlete.current) {
      hasLoadedOwnAthlete.current = true;
      setIsLoadingOwnAthlete(true);
      fetcher(`/api/athletes/${athleteId}/stats`)
        .then((data: AthleteProfileData) => {
          setSelectedAthletes((prev) => {
            // Only set if still empty (user might have changed it)
            if (prev[0] === null) {
              const newSelection = [...prev];
              newSelection[0] = data.athlete;
              return newSelection;
            }
            return prev;
          });
        })
        .catch(() => {
          // Silently fail - user can still manually select athletes
          hasLoadedOwnAthlete.current = false; // Allow retry if failed
        })
        .finally(() => {
          setIsLoadingOwnAthlete(false);
        });
    }
  }, [athleteId, authLoading]);

  const handleAthleteSelect = (index: number, athlete: Athlete | null) => {
    const newSelection = [...selectedAthletes];
    newSelection[index] = athlete;
    setSelectedAthletes(newSelection);
  };

  const selectedIds = selectedAthletes.filter((a): a is Athlete => a !== null).map((a) => a.id);
  const hasSelection = selectedIds.length >= 2;

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Comparison" }]} />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight mb-6 md:mb-8">
          Athlete Comparison
        </h1>

        {/* Athlete Selection */}
        <section className="mb-8">
          <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-4">
            Select Athletes (2-3)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="relative">
                {index === 0 && isLoadingOwnAthlete && (
                  <div className="absolute top-0 right-0 z-10 flex items-center gap-2 text-xs text-[#787774]">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading your profile...</span>
                  </div>
                )}
                <AthleteSelector
                  selectedAthlete={selectedAthletes[index]}
                  onSelect={(athlete) => handleAthleteSelect(index, athlete)}
                  excludeIds={selectedIds.filter((id) => id !== selectedAthletes[index]?.id)}
                  label={index === 0 && athleteId ? "Athlete 1 (You)" : `Athlete ${index + 1}`}
                  placeholder={`Search for athlete ${index + 1}...`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Display */}
        {hasSelection ? (
          <ComparisonDisplay athleteIds={selectedIds} />
        ) : (
          <div className="border border-dashed border-[#E9E9E7] rounded-[4px] p-12 text-center">
            <p className="text-sm text-[#787774]">
              Select at least 2 athletes to compare their profiles
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Comparison Display Component ────────────────────────────────────────────

function ComparisonDisplay({ athleteIds }: { athleteIds: string[] }) {
  // All hooks must be called before any conditional returns
  const [displayMode, setDisplayMode] = useState<"points" | "times-ratios">("points");
  const [viewMode, setViewMode] = useState<"cards" | "graph">("cards");
  const [expandedCompetition, setExpandedCompetition] = useState<string | null>(null);

  // Fetch data for all athletes in parallel
  const { data: athletesData, isLoading, error } = useSWR<AthleteProfileData[]>(
    athleteIds.length > 0 ? `comparison-${athleteIds.join(",")}` : null,
    async () => {
      const results = await Promise.all(
        athleteIds.map((id) => fetcher(`/api/athletes/${id}/stats`))
      );
      return results;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[#787774]" />
        <span className="ml-3 text-sm text-[#787774]">Loading athlete data...</span>
      </div>
    );
  }

  if (error || !athletesData) {
    return (
      <div className="border border-[#E9E9E7] rounded-[4px] p-6 bg-white">
        <p className="text-sm text-[#787774]">Error loading athlete data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Display Mode Toggle */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F7F6F3] border border-[#E9E9E7] rounded-[4px]">
        <span className="text-xs font-medium text-[#9B9A97] uppercase tracking-wider">Display:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setDisplayMode("points")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap",
              displayMode === "points"
                ? "bg-[#0B6E99] text-white"
                : "bg-white text-[#787774] hover:bg-[#EFEFEF] border border-[#E9E9E7]"
            )}
          >
            Points
          </button>
          <button
            onClick={() => setDisplayMode("times-ratios")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap",
              displayMode === "times-ratios"
                ? "bg-[#0B6E99] text-white"
                : "bg-white text-[#787774] hover:bg-[#EFEFEF] border border-[#E9E9E7]"
            )}
          >
            Times & Ratios
          </button>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === "cards" ? "graph" : "cards")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap flex items-center gap-1.5",
              viewMode === "graph"
                ? "bg-[#0B6E99] text-white"
                : "bg-white text-[#787774] hover:bg-[#EFEFEF] border border-[#E9E9E7]"
            )}
          >
            <BarChart3 size={14} />
            Graph
          </button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletesData.map((data, index) => (
            <AthleteComparisonCard
              key={data.athlete.id}
              athlete={data.athlete}
              stats={data.stats}
              personalBests={data.personalBests}
              competitions={data.competitions}
              scoreHistory={data.scoreHistory}
              index={index}
              allAthletesData={athletesData}
              displayMode={displayMode}
              expandedCompetition={expandedCompetition}
              onCompetitionToggle={setExpandedCompetition}
            />
          ))}
        </div>
      ) : (
        <ComparisonGraphView athletesData={athletesData} displayMode={displayMode} />
      )}
    </div>
  );
}

// ─── Comparison Components ────────────────────────────────────────────────────

function AthleteComparisonCard({
  athlete,
  stats,
  personalBests,
  competitions,
  scoreHistory,
  index,
  allAthletesData,
  displayMode,
  expandedCompetition,
  onCompetitionToggle,
}: {
  athlete: Athlete;
  stats: AthleteStats;
  personalBests: PersonalBests;
  competitions: AthleteComp[];
  scoreHistory: Record<string, unknown[]>;
  index: number;
  allAthletesData: AthleteProfileData[];
  displayMode: "points" | "times-ratios";
  expandedCompetition: string | null;
  onCompetitionToggle: (competitionId: string | null) => void;
}) {
  const allStats = allAthletesData.map((d) => d.stats);
  const allPersonalBests = allAthletesData.map((d) => d.personalBests);
  const allScoreHistories = allAthletesData.map((d) => d.scoreHistory);

  // Calculate fencing win rate from scoreHistory (best win rate across all entries)
  const fencingRankingHistory = (scoreHistory.fencingRanking || []) as Array<{
    victories?: number;
    totalBouts?: number;
  }>;
  const winRates = fencingRankingHistory
    .filter((entry) => entry.victories !== undefined && entry.totalBouts !== undefined && entry.totalBouts > 0)
    .map((entry) => (entry.victories! / entry.totalBouts!) * 100);
  const winRate = winRates.length > 0 ? Math.max(...winRates) : null;

  // Calculate win rates for all athletes
  const allWinRates = allScoreHistories.map((sh) => {
    const history = (sh.fencingRanking || []) as Array<{
      victories?: number;
      totalBouts?: number;
    }>;
    const rates = history
      .filter((e) => e.victories !== undefined && e.totalBouts !== undefined && e.totalBouts > 0)
      .map((e) => (e.victories! / e.totalBouts!) * 100);
    return rates.length > 0 ? Math.max(...rates) : null;
  });

  return (
    <div className="w-full border border-[#E9E9E7] rounded-[4px] bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#F7F6F3] border-b border-[#E9E9E7] p-4">
        <h3 className="text-xl font-bold text-[#37352F] mb-1">
          {athlete.firstName} {athlete.lastName}
        </h3>
        <div className="text-xs text-[#787774] space-y-0.5">
          <div>{athlete.country}</div>
          <div>{athlete.ageCategory} · {athlete.gender}</div>
          {athlete.club && <div>{athlete.club}</div>}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Statistics */}
        <section>
          <h4 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
            Statistics
          </h4>
          <div className="space-y-3">
            <StatRow
              label="Total Competitions"
              icon={<Trophy size={16} />}
              value={stats.totalCompetitions}
              format={(v) => (v !== null && v !== undefined ? v.toString() : "—")}
              color="#DFAB01"
              isBest={isBestValue(stats.totalCompetitions, allStats.map((s) => s.totalCompetitions))}
            />
            <StatRow
              label="Completed Competitions"
              icon={<Target size={16} />}
              value={stats.completedCompetitions}
              format={(v) => (v !== null && v !== undefined ? v.toString() : "—")}
              color="#0B6E99"
              isBest={isBestValue(stats.completedCompetitions, allStats.map((s) => s.completedCompetitions))}
            />
            <StatRow
              label="Highest Total"
              icon={<Award size={16} />}
              value={stats.highestTotal}
              format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
              color="#0F7B6C"
              isBest={isBestValue(stats.highestTotal, allStats.map((s) => s.highestTotal))}
            />
            <StatRow
              label="Average Total"
              icon={<TrendingUp size={16} />}
              value={stats.averageTotal}
              format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
              color="#6940A5"
              isBest={isBestValue(stats.averageTotal, allStats.map((s) => s.averageTotal))}
            />
          </div>
        </section>

        {/* Personal Bests */}
        <section>
          <h4 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
            Personal Bests
          </h4>
          <div className="space-y-3">
            {/* Fencing (Rank) - Points or Win Rate */}
            {displayMode === "times-ratios" ? (
              <PersonalBestRow
                label="Fencing (Rank) Win Rate"
                icon={<Swords size={16} />}
                value={winRate}
                format={(v) => (v !== null && v !== undefined ? `${v.toFixed(1)}%` : "—")}
                color="#DFAB01"
                isBest={isBestValue(winRate, allWinRates)}
              />
            ) : (
              <PersonalBestRow
                label="Fencing (Rank)"
                icon={<Swords size={16} />}
                value={personalBests.fencingRanking}
                format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
                color="#DFAB01"
                isBest={isBestValue(personalBests.fencingRanking, allPersonalBests.map((pb) => pb.fencingRanking))}
              />
            )}
            
            {/* Fencing (DE) - Always points */}
            <PersonalBestRow
              label="Fencing (DE)"
              icon={<Swords size={16} />}
              value={personalBests.fencingDE}
              format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
              color="#DFAB01"
              isBest={isBestValue(personalBests.fencingDE, allPersonalBests.map((pb) => pb.fencingDE))}
            />
            
            {/* Obstacle - Points or Time */}
            {displayMode === "times-ratios" ? (
              <PersonalBestRow
                label="Obstacle (Time)"
                icon={<PersonStanding size={16} />}
                value={personalBests.obstacle?.bestTime}
                format={(v) => (v !== null && v !== undefined ? `${v.toFixed(2)}s` : "—")}
                color="#D9730D"
                isBest={isBestValue(
                  personalBests.obstacle?.bestTime,
                  allPersonalBests.map((pb) => pb.obstacle?.bestTime),
                  true // lower is better for times
                )}
              />
            ) : (
              <PersonalBestRow
                label="Obstacle"
                icon={<PersonStanding size={16} />}
                value={personalBests.obstacle?.bestPoints}
                format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
                color="#D9730D"
                isBest={isBestValue(personalBests.obstacle?.bestPoints, allPersonalBests.map((pb) => pb.obstacle?.bestPoints))}
              />
            )}
            
            {/* Swimming - Points or Time */}
            {displayMode === "times-ratios" ? (
              <PersonalBestRow
                label="Swimming (Time)"
                icon={<Waves size={16} />}
                value={personalBests.swimming?.bestTime}
                format={(v) => {
                  if (v === null || v === undefined) return "—";
                  const mins = Math.floor(v / 6000);
                  const secs = Math.floor((v % 6000) / 100);
                  const hh = v % 100;
                  return `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
                }}
                color="#0B6E99"
                isBest={isBestValue(
                  personalBests.swimming?.bestTime,
                  allPersonalBests.map((pb) => pb.swimming?.bestTime),
                  true // lower is better for times
                )}
              />
            ) : (
              <PersonalBestRow
                label="Swimming"
                icon={<Waves size={16} />}
                value={personalBests.swimming?.bestPoints}
                format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
                color="#0B6E99"
                isBest={isBestValue(personalBests.swimming?.bestPoints, allPersonalBests.map((pb) => pb.swimming?.bestPoints))}
              />
            )}
            
            {/* Laser Run - Points or Time */}
            {displayMode === "times-ratios" ? (
              <PersonalBestRow
                label="Laser Run (Time)"
                icon={<Crosshair size={16} />}
                value={personalBests.laserRun?.bestTime}
                format={(v) => {
                  if (v === null || v === undefined) return "—";
                  const m = Math.floor(v / 60);
                  const sec = Math.round(v % 60);
                  return `${m}:${String(sec).padStart(2, "0")}`;
                }}
                color="#6940A5"
                isBest={isBestValue(
                  personalBests.laserRun?.bestTime,
                  allPersonalBests.map((pb) => pb.laserRun?.bestTime),
                  true // lower is better for times
                )}
              />
            ) : (
              <PersonalBestRow
                label="Laser Run"
                icon={<Crosshair size={16} />}
                value={personalBests.laserRun?.bestPoints}
                format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
                color="#6940A5"
                isBest={isBestValue(personalBests.laserRun?.bestPoints, allPersonalBests.map((pb) => pb.laserRun?.bestPoints))}
              />
            )}
            
            {/* Riding - Always points */}
            <PersonalBestRow
              label="Riding"
              icon={<Activity size={16} />}
              value={personalBests.riding}
              format={(v) => (v !== null && v !== undefined ? Math.round(v).toString() : "—")}
              color="#AD1A72"
              isBest={isBestValue(personalBests.riding, allPersonalBests.map((pb) => pb.riding))}
            />
          </div>
        </section>

        {/* Latest Competitions */}
        {competitions.length > 0 && (
          <section>
            <h4 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Latest Competitions
            </h4>
            <div className="space-y-2">
              {competitions.slice(0, 3).map((comp) => {
                const isExpanded = expandedCompetition === comp.competitionId;
                return (
                  <div
                    key={comp.competitionId}
                    className="border border-[#E9E9E7] rounded-[4px] bg-[#FAFAF8] overflow-hidden"
                  >
                    {/* Clickable Header */}
                    <button
                      onClick={() =>
                        onCompetitionToggle(isExpanded ? null : comp.competitionId)
                      }
                      className="w-full text-left p-3 hover:bg-[#F0F0ED] transition-colors flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-[#37352F] mb-1">
                          {comp.competitionName}
                        </div>
                        <div className="text-xs text-[#787774]">
                          {comp.location} · {formatDate(comp.date)}
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp size={18} className="text-[#787774]" />
                        ) : (
                          <ChevronDown size={18} className="text-[#787774]" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <CompetitionDetails
                        comp={comp}
                        scoreHistory={scoreHistory}
                        displayMode={displayMode}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  icon,
  value,
  format,
  color,
  isBest,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  format: (v: number | null | undefined) => string;
  color: string;
  isBest: boolean;
}) {
  const formattedValue = format(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E9E9E7] last:border-b-0">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-sm text-[#787774]">{label}</span>
      </div>
      <div className={`text-sm font-mono ${isBest ? "font-bold text-[#0F7B6C]" : "text-[#37352F]"}`}>
        {formattedValue}
        {isBest && value !== null && (
          <span className="ml-1 text-[10px] text-[#0F7B6C]">★</span>
        )}
      </div>
    </div>
  );
}

function PersonalBestRow({
  label,
  icon,
  value,
  format,
  color,
  isBest,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | null | undefined;
  format: (v: number | null | undefined) => string;
  color: string;
  isBest: boolean;
}) {
  const formattedValue = format(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E9E9E7] last:border-b-0">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-sm text-[#787774]">{label}</span>
      </div>
      <div className={`text-sm font-mono ${isBest ? "font-bold text-[#0F7B6C]" : "text-[#37352F]"}`}>
        {formattedValue}
        {isBest && value !== null && value !== undefined && (
          <span className="ml-1 text-[10px] text-[#0F7B6C]">★</span>
        )}
      </div>
    </div>
  );
}

function CompetitionDetails({
  comp,
  scoreHistory,
  displayMode,
}: {
  comp: AthleteComp;
  scoreHistory: Record<string, unknown[]>;
  displayMode: "points" | "times-ratios";
}) {
  // Find matching entries in scoreHistory for this competition
  const getCompetitionEntry = (discipline: string) => {
    const history = (scoreHistory[discipline] || []) as Array<{
      competition?: string;
      date?: string;
      time?: number;
      timeSeconds?: number;
      timeHundredths?: number;
      finishTime?: number;
      finishTimeSeconds?: number;
      victories?: number;
      totalBouts?: number;
    }>;
    return history.find(
      (entry) =>
        entry.competition === comp.competitionName || entry.date === comp.date
    );
  };

  const fencingRankingEntry = getCompetitionEntry("fencingRanking");
  const obstacleEntry = getCompetitionEntry("obstacle");
  const swimmingEntry = getCompetitionEntry("swimming");
  const laserRunEntry = getCompetitionEntry("laserRun");

  // Calculate win rate for fencing ranking
  const fencingWinRate =
    fencingRankingEntry &&
    fencingRankingEntry.victories !== undefined &&
    fencingRankingEntry.totalBouts !== undefined &&
    fencingRankingEntry.totalBouts > 0
      ? (fencingRankingEntry.victories / fencingRankingEntry.totalBouts) * 100
      : null;

  return (
    <div className="px-3 pb-3 border-t border-[#E9E9E7] bg-white">
      <div className="pt-3 space-y-2">
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Fencing (Rank) - Points or Win Rate */}
          <div className="flex items-center gap-2">
            <Swords size={14} className="text-[#DFAB01] flex-shrink-0" />
            <span className="text-[#9B9A97]">
              Fencing (Rank){displayMode === "times-ratios" ? " Win Rate" : ""}:
            </span>
            <span className="font-mono font-medium text-[#37352F] ml-auto">
              {displayMode === "times-ratios" && fencingWinRate !== null
                ? `${fencingWinRate.toFixed(1)}%`
                : comp.fencingRanking !== null
                ? Math.round(comp.fencingRanking).toString()
                : "—"}
            </span>
          </div>

          {/* Fencing (DE) - Always points */}
          <div className="flex items-center gap-2">
            <Swords size={14} className="text-[#DFAB01] flex-shrink-0" />
            <span className="text-[#9B9A97]">Fencing (DE):</span>
            <span className="font-mono font-medium text-[#37352F] ml-auto">
              {comp.fencingDE !== null ? Math.round(comp.fencingDE) : "—"}
            </span>
          </div>

          {/* Obstacle - Points or Time */}
          <div className="flex items-center gap-2">
            <PersonStanding size={14} className="text-[#D9730D] flex-shrink-0" />
            <span className="text-[#9B9A97]">
              Obstacle{displayMode === "times-ratios" ? " (Time)" : ""}:
            </span>
            <span className="font-mono font-medium text-[#37352F] ml-auto">
              {displayMode === "times-ratios" && obstacleEntry?.time !== undefined
                ? `${obstacleEntry.time.toFixed(2)}s`
                : comp.obstacle !== null
                ? Math.round(comp.obstacle).toString()
                : "—"}
            </span>
          </div>

          {/* Swimming - Points or Time */}
          <div className="flex items-center gap-2">
            <Waves size={14} className="text-[#0B6E99] flex-shrink-0" />
            <span className="text-[#9B9A97]">
              Swimming{displayMode === "times-ratios" ? " (Time)" : ""}:
            </span>
            <span className="font-mono font-medium text-[#37352F] ml-auto">
              {displayMode === "times-ratios" && swimmingEntry?.timeHundredths !== undefined
                ? (() => {
                    const v = swimmingEntry.timeHundredths;
                    const mins = Math.floor(v / 6000);
                    const secs = Math.floor((v % 6000) / 100);
                    const hh = v % 100;
                    return `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
                  })()
                : comp.swimming !== null
                ? Math.round(comp.swimming).toString()
                : "—"}
            </span>
          </div>

          {/* Laser Run - Points or Time */}
          <div className="flex items-center gap-2">
            <Crosshair size={14} className="text-[#6940A5] flex-shrink-0" />
            <span className="text-[#9B9A97]">
              Laser Run{displayMode === "times-ratios" ? " (Time)" : ""}:
            </span>
            <span className="font-mono font-medium text-[#37352F] ml-auto">
              {displayMode === "times-ratios" &&
              (laserRunEntry?.finishTime !== undefined ||
                laserRunEntry?.finishTimeSeconds !== undefined)
                ? (() => {
                    const v = laserRunEntry.finishTime ?? laserRunEntry.finishTimeSeconds ?? 0;
                    const m = Math.floor(v / 60);
                    const sec = Math.round(v % 60);
                    return `${m}:${String(sec).padStart(2, "0")}`;
                  })()
                : comp.laserRun !== null
                ? Math.round(comp.laserRun).toString()
                : "—"}
            </span>
          </div>

          {/* Riding - Always points */}
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[#AD1A72] flex-shrink-0" />
            <span className="text-[#9B9A97]">Riding:</span>
            <span className="font-mono font-medium text-[#37352F] ml-auto">
              {comp.riding !== null ? Math.round(comp.riding) : "—"}
            </span>
          </div>
        </div>
        <div className="pt-2 mt-2 border-t border-[#E9E9E7] flex items-center justify-between">
          <span className="text-xs font-medium text-[#9B9A97] uppercase tracking-wider">
            Total Points
          </span>
          <span className="text-sm font-bold font-mono text-[#37352F]">
            {comp.total > 0 ? Math.round(comp.total) : "—"}
          </span>
        </div>
        {comp.status && (
          <div className="text-xs text-[#787774]">
            Status: <span className="font-medium capitalize">{comp.status}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonGraphView({
  athletesData,
  displayMode,
}: {
  athletesData: AthleteProfileData[];
  displayMode: "points" | "times-ratios";
}) {
  const [showLegend, setShowLegend] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<"obstacle" | "swimming" | "laserRun" | "winRate">("obstacle");
  const colors = ["#DFAB01", "#0B6E99", "#0F7B6C", "#6940A5", "#AD1A72"];

  // Prepare competition trend data with discipline scores over time
  const competitionData: Array<{
    competition: string;
    date: string;
    [key: string]: string | number | null;
  }> = [];

  // Get all unique competitions across all athletes, sorted by date
  const allCompetitions = new Map<string, { name: string; date: string }>();
  athletesData.forEach((data) => {
    data.competitions.forEach((comp) => {
      if (!allCompetitions.has(comp.competitionId)) {
        allCompetitions.set(comp.competitionId, {
          name: comp.competitionName,
          date: comp.date,
        });
      }
    });
  });

  // Create data points for each competition
  Array.from(allCompetitions.entries())
    .sort((a, b) => new Date(a[1].date).getTime() - new Date(b[1].date).getTime())
    .forEach(([compId, compInfo]) => {
      const dataPoint: { competition: string; date: string; [key: string]: string | number | null } = {
        competition: compInfo.name,
        date: compInfo.date,
      };

      athletesData.forEach((athleteData) => {
        const comp = athleteData.competitions.find((c) => c.competitionId === compId);
        const athleteName = `${athleteData.athlete.firstName} ${athleteData.athlete.lastName}`;
        
        if (displayMode === "times-ratios") {
          // For times mode, get time data from scoreHistory based on selected discipline
          let selectedValue: number | null = null;
          
          if (comp) {
            if (selectedDiscipline === "obstacle") {
              const obstacleHistory = (athleteData.scoreHistory.obstacle || []) as Array<{
                competition?: string;
                date?: string;
                time?: number;
              }>;
              const obstacleEntry = obstacleHistory.find(
                (e) => e.competition === comp.competitionName || e.date === comp.date
              );
              selectedValue = obstacleEntry?.time ?? null;
            } else if (selectedDiscipline === "swimming") {
              const swimmingHistory = (athleteData.scoreHistory.swimming || []) as Array<{
                competition?: string;
                date?: string;
                timeHundredths?: number;
              }>;
              const swimmingEntry = swimmingHistory.find(
                (e) => e.competition === comp.competitionName || e.date === comp.date
              );
              selectedValue = swimmingEntry?.timeHundredths ?? null;
            } else if (selectedDiscipline === "laserRun") {
              const laserRunHistory = (athleteData.scoreHistory.laserRun || []) as Array<{
                competition?: string;
                date?: string;
                finishTime?: number;
              }>;
              const laserRunEntry = laserRunHistory.find(
                (e) => e.competition === comp.competitionName || e.date === comp.date
              );
              selectedValue = laserRunEntry?.finishTime ?? null;
            } else if (selectedDiscipline === "winRate") {
              const fencingHistory = (athleteData.scoreHistory.fencingRanking || []) as Array<{
                competition?: string;
                date?: string;
                victories?: number;
                totalBouts?: number;
              }>;
              const fencingEntry = fencingHistory.find(
                (e) => e.competition === comp.competitionName || e.date === comp.date
              );
              selectedValue =
                fencingEntry &&
                fencingEntry.victories !== undefined &&
                fencingEntry.totalBouts !== undefined &&
                fencingEntry.totalBouts > 0
                  ? (fencingEntry.victories / fencingEntry.totalBouts) * 100
                  : null;
            }
          }
          
          dataPoint[athleteName] = selectedValue;
        } else {
          // For points mode, show total points
          dataPoint[athleteName] = comp?.total || null;
        }
      });

      competitionData.push(dataPoint);
    });

  // Custom tooltip formatter
  const formatTooltipValue = (value: unknown, name: string) => {
    if (value === null || value === undefined || typeof value !== "number") return "—";
    
    if (displayMode === "times-ratios") {
      if (selectedDiscipline === "winRate") {
        return `${value.toFixed(1)}%`;
      } else if (selectedDiscipline === "obstacle") {
        return `${value.toFixed(2)}s`;
      } else if (selectedDiscipline === "swimming") {
        const mins = Math.floor(value / 6000);
        const secs = Math.floor((value % 6000) / 100);
        const hh = value % 100;
        return `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
      } else if (selectedDiscipline === "laserRun") {
        const m = Math.floor(value / 60);
        const sec = Math.round(value % 60);
        return `${m}:${String(sec).padStart(2, "0")}`;
      }
    }
    
    return Math.round(value).toString();
  };

  const getDisciplineLabel = () => {
    if (displayMode === "points") return "Total Points";
    switch (selectedDiscipline) {
      case "obstacle":
        return "Obstacle Time";
      case "swimming":
        return "Swimming Time";
      case "laserRun":
        return "Laser Run Time";
      case "winRate":
        return "Fencing Win Rate";
      default:
        return "Time";
    }
  };

  if (competitionData.length === 0) {
    return (
      <div className="border border-[#E9E9E7] rounded-[4px] p-12 bg-white text-center">
        <p className="text-sm text-[#787774]">No competition data available for comparison</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Discipline Selector for Times & Ratios mode */}
      {displayMode === "times-ratios" && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F7F6F3] border border-[#E9E9E7] rounded-[4px]">
          <span className="text-xs font-medium text-[#9B9A97] uppercase tracking-wider">Event:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDiscipline("obstacle")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap",
                selectedDiscipline === "obstacle"
                  ? "bg-[#D9730D] text-white"
                  : "bg-white text-[#787774] hover:bg-[#EFEFEF] border border-[#E9E9E7]"
              )}
            >
              Obstacle
            </button>
            <button
              onClick={() => setSelectedDiscipline("swimming")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap",
                selectedDiscipline === "swimming"
                  ? "bg-[#0B6E99] text-white"
                  : "bg-white text-[#787774] hover:bg-[#EFEFEF] border border-[#E9E9E7]"
              )}
            >
              Swimming
            </button>
            <button
              onClick={() => setSelectedDiscipline("laserRun")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap",
                selectedDiscipline === "laserRun"
                  ? "bg-[#6940A5] text-white"
                  : "bg-white text-[#787774] hover:bg-[#EFEFEF] border border-[#E9E9E7]"
              )}
            >
              Laser Run
            </button>
            <button
              onClick={() => setSelectedDiscipline("winRate")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap",
                selectedDiscipline === "winRate"
                  ? "bg-[#DFAB01] text-white"
                  : "bg-white text-[#787774] hover:bg-[#EFEFEF] border border-[#E9E9E7]"
              )}
            >
              Win Rate
            </button>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
            {getDisciplineLabel()} vs Competitions
          </h2>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="text-xs text-[#787774] hover:text-[#37352F] transition-colors"
          >
            {showLegend ? "Hide" : "Show"} Legend
          </button>
        </div>
        <div className="border border-[#E9E9E7] rounded-[4px] p-6 bg-white">
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={competitionData} margin={{ top: 10, right: 20, bottom: 80, left: 10 }}>
              <defs>
                {athletesData.map((_, index) => {
                  const color = colors[index % colors.length];
                  const gradientId = `gradient-${index}`;
                  return (
                    <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" vertical={false} />
              <XAxis
                dataKey="competition"
                tick={false}
                axisLine={false}
                height={20}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#787774" }}
                stroke="#E9E9E7"
                tickLine={false}
                label={{
                  value: displayMode === "times-ratios"
                    ? selectedDiscipline === "winRate"
                      ? "Win Rate (%)"
                      : selectedDiscipline === "obstacle"
                      ? "Time (seconds)"
                      : selectedDiscipline === "swimming"
                      ? "Time (MM:SS.HH)"
                      : "Time (M:SS)"
                    : "Points",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: "#787774", fontSize: 12 },
                }}
              />
              <Tooltip
                formatter={(value, name) => formatTooltipValue(value, name as string)}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E9E9E7",
                  borderRadius: "6px",
                  padding: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: "#37352F",
                  marginBottom: "4px",
                }}
                cursor={{ stroke: "#E9E9E7", strokeWidth: 1, strokeDasharray: "5 5" }}
              />
              {showLegend && (
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="line"
                />
              )}
              {athletesData.map((data, index) => {
                const athleteName = `${data.athlete.firstName} ${data.athlete.lastName}`;
                const color = colors[index % colors.length];
                const gradientId = `gradient-${index}`;
                return (
                  <g key={athleteName}>
                    <Area
                      type="monotone"
                      dataKey={athleteName}
                      stroke="none"
                      fill={`url(#${gradientId})`}
                      connectNulls
                      hide
                      isAnimationActive={false}
                      legendType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey={athleteName}
                      name={athleteName}
                      stroke={color}
                      strokeWidth={3}
                      dot={{ r: 4, fill: color, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                      connectNulls
                      isAnimationActive={false}
                      legendType="line"
                    />
                  </g>
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function isBestValue(
  value: number | null | undefined,
  allValues: (number | null | undefined)[],
  lowerIsBetter: boolean = false
): boolean {
  if (value === null || value === undefined) return false;
  const numericValues = allValues.filter((v): v is number => typeof v === "number" && v !== null && v !== undefined);
  if (numericValues.length === 0) return false;
  
  if (lowerIsBetter) {
    const minValue = Math.min(...numericValues);
    return value === minValue;
  } else {
    const maxValue = Math.max(...numericValues);
    return value === maxValue;
  }
}


// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
