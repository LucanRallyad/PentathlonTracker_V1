"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Trophy, Target, TrendingUp, Award, Activity, ChevronRight, Swords, PersonStanding, Waves, Crosshair, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/pie-chart";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { DisciplineDetailModal, DISCIPLINE_ICONS } from "@/components/DisciplineDetailModal";
import { useAuth } from "@/lib/useAuth";
import { useScoreUpdates } from "@/lib/useScoreUpdates";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("Failed to fetch"); return r.json(); });

// ─── Types ───────────────────────────────────────────────────────────────────

interface Competition {
  id: string;
  name: string;
  date: string;
  endDate: string;
  location: string;
  status: string;
  ageCategory: string;
  events: { id: string; status: string }[];
  _count: { competitionAthletes: number };
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

interface ScoreHistoryEntry {
  date: string;
  competition: string;
  points: number;
  source?: "competition" | "training";
  id?: string;
  notes?: string | null;
  [key: string]: unknown;
}

interface AthleteDashboardData {
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    country: string;
    ageCategory: string;
    gender: string;
    club: string | null;
  } | null;
  user: { id: string; name: string; email: string; role: string };
  competitions: AthleteComp[];
  personalBests: PersonalBests;
  stats: AthleteStats;
  scoreHistory: Record<string, ScoreHistoryEntry[]>;
  message?: string;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading: checkingAuth } = useAuth();
  const userRole = user?.role || null;

  if (checkingAuth) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Dashboard" }]} />
        <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-12">
          <div className="h-10 w-48 bg-[#F7F6F3] rounded animate-pulse" />
        </div>
      </>
    );
  }

  if (userRole === "athlete") {
    return <AthleteDashboard />;
  }

  return <PublicDashboard />;
}

// ─── Athlete Dashboard ───────────────────────────────────────────────────────

function AthleteDashboard() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);

  // SWR: auto-fetches + polls every 10s as fallback for real-time
  const { data, isLoading: loading, mutate } = useSWR<AthleteDashboardData>(
    "/api/athlete/me",
    fetcher,
    {
      refreshInterval: 10_000,       // Poll every 10s as fallback
      revalidateOnFocus: true,       // Refetch when user tabs back
      dedupingInterval: 3_000,       // Debounce rapid refetches
    }
  );

  // SSE: instant push when admin saves scores
  // Triggers an immediate SWR re-fetch so the dashboard updates in real-time
  useScoreUpdates({
    athleteId: data?.athlete?.id ?? null,
    onUpdate: () => mutate(),
    enabled: !!data?.athlete?.id,
  });

  // Expose fetchData for the modal's onDataAdded callback
  const fetchData = useCallback(() => { mutate(); }, [mutate]);

  const athlete = data?.athlete ?? null;
  const stats = data?.stats;
  const personalBests = data?.personalBests;
  const competitions = data?.competitions ?? [];
  const scoreHistory = data?.scoreHistory ?? {};

  // Memoize expensive computed values
  const totalEntries = useMemo(
    () => Object.values(scoreHistory).reduce((sum, arr) => sum + arr.length, 0),
    [scoreHistory]
  );

  const scoredCompetitions = useMemo(
    () => competitions.filter((c) => c.total > 0),
    [competitions]
  );

  // Find the competition with the highest total score for pie chart breakdown
  const highestScoreCompetition = useMemo(() => {
    if (scoredCompetitions.length === 0) return null;
    return scoredCompetitions.reduce((best, comp) => 
      comp.total > best.total ? comp : best
    );
  }, [scoredCompetitions]);

  // Build modal props for the selected discipline (memoized)
  const modalProps = useMemo(() => {
    if (!selectedDiscipline || !personalBests) return null;
    const config = DISCIPLINE_CONFIG.find((d) => d.key === selectedDiscipline);
    if (!config) return null;

    const history: ScoreHistoryEntry[] = (scoreHistory[selectedDiscipline] || []).map((entry) => ({
      ...entry,
      source: (entry.source as "competition" | "training") || "competition",
    }));

    const pb = buildPersonalBest(selectedDiscipline, personalBests, history);

    return {
      discipline: selectedDiscipline,
      label: config.label,
      color: config.color,
      icon: DISCIPLINE_ICONS[selectedDiscipline],
      history,
      personalBest: pb,
      ageCategory: athlete?.ageCategory || "Senior",
    };
  }, [selectedDiscipline, scoreHistory, personalBests, athlete?.ageCategory]);

  const handleCloseModal = useCallback(() => setSelectedDiscipline(null), []);

  if (loading) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Dashboard" }]} />
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6 md:py-12">
          <div className="flex items-center gap-3 text-[#787774]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading your dashboard...</span>
          </div>
        </div>
      </>
    );
  }

  if (!athlete || !stats || !personalBests) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Dashboard" }]} />
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6 md:py-12">
          <h1 className="text-[32px] font-bold text-[#37352F] tracking-tight mb-4 leading-tight">
            Welcome, {data?.user?.name || "Athlete"}
          </h1>
          <div className="border border-[#E9E9E7] rounded-[4px] p-6 bg-[#FBFBFA]">
            <p className="text-sm text-[#787774]">
              No athlete profile has been linked to your account yet. Please contact an administrator to be added to a competition.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Dashboard" }]} />
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* ── Header ── */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight">
            Welcome back, {athlete.firstName}
          </h1>
          <p className="text-xs md:text-sm text-[#787774] mt-1">
            {athlete.firstName} {athlete.lastName} · {athlete.country} · {athlete.ageCategory} · {athlete.gender}
            {athlete.club && ` · ${athlete.club}`}
          </p>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6 md:mb-8">
          <StatCard
            icon={<Trophy size={18} />}
            label="Competitions"
            value={stats.totalCompetitions}
            sub={stats.completedCompetitions > 0 ? `${stats.completedCompetitions} scored` : undefined}
            color="#DFAB01"
          />
          <StatCard
            icon={<Target size={18} />}
            label="Highest Total"
            value={stats.highestTotal !== null ? Math.round(stats.highestTotal) : "—"}
            sub="personal best"
            color="#0B6E99"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Average Total"
            value={stats.averageTotal !== null ? Math.round(stats.averageTotal) : "—"}
            sub="across competitions"
            color="#0F7B6C"
          />
          <StatCard
            icon={<Award size={18} />}
            label="Events Scored"
            value={totalEntries}
            sub="across all disciplines"
            color="#6940A5"
          />
        </div>

        {/* ── Personal Bests (clickable) ── */}
        <section className="mb-6 md:mb-8">
          <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
            Personal Bests
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            <ClickablePBCard
              icon={<Swords size={16} />}
              discipline="Fencing (Rank)"
              disciplineKey="fencingRanking"
              points={personalBests.fencingRanking !== null ? Math.round(personalBests.fencingRanking) : null}
              color="#DFAB01"
              onClick={setSelectedDiscipline}
            />
            <ClickablePBCard
              icon={<Swords size={16} />}
              discipline="Fencing (DE)"
              disciplineKey="fencingDE"
              points={personalBests.fencingDE !== null ? Math.round(personalBests.fencingDE) : null}
              color="#DFAB01"
              onClick={setSelectedDiscipline}
            />
            <ClickablePBCard
              icon={<PersonStanding size={16} />}
              discipline="Obstacle"
              disciplineKey="obstacle"
              points={personalBests.obstacle?.bestPoints !== undefined ? Math.round(personalBests.obstacle.bestPoints) : null}
              rawTime={personalBests.obstacle?.bestTime !== undefined ? `${personalBests.obstacle.bestTime.toFixed(2)}s` : undefined}
              color="#D9730D"
              onClick={setSelectedDiscipline}
            />
            <ClickablePBCard
              icon={<Waves size={16} />}
              discipline="Swimming"
              disciplineKey="swimming"
              points={personalBests.swimming?.bestPoints !== undefined ? Math.round(personalBests.swimming.bestPoints) : null}
              rawTime={personalBests.swimming?.bestTime !== undefined ? formatHundredths(personalBests.swimming.bestTime) : undefined}
              color="#0B6E99"
              onClick={setSelectedDiscipline}
            />
            <ClickablePBCard
              icon={<Crosshair size={16} />}
              discipline="Laser Run"
              disciplineKey="laserRun"
              points={personalBests.laserRun?.bestPoints !== undefined ? Math.round(personalBests.laserRun.bestPoints) : null}
              rawTime={personalBests.laserRun?.bestTime !== undefined ? formatSeconds(personalBests.laserRun.bestTime) : undefined}
              color="#6940A5"
              onClick={setSelectedDiscipline}
            />
            <ClickablePBCard
              icon={<Activity size={16} />}
              discipline="Riding"
              disciplineKey="riding"
              points={personalBests.riding !== null ? Math.round(personalBests.riding) : null}
              color="#AD1A72"
              onClick={setSelectedDiscipline}
            />
          </div>
        </section>

        {/* ── Points by discipline (latest comp bar chart) ── */}
        {competitions.length > 0 && competitions[0].total > 0 && (
          <section className="mb-6 md:mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Latest Competition Breakdown
            </h2>
            <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white">
              <p className="text-sm font-medium text-[#37352F] mb-3">
                {competitions[0].competitionName}
                <span className="text-[#9B9A97] font-normal ml-2">{competitions[0].location} · {formatDate(competitions[0].date)}</span>
              </p>
              <ClickableDisciplineBarChart comp={competitions[0]} onClick={setSelectedDiscipline} />
              <div className="mt-3 text-right">
                <span className="text-sm font-bold text-[#37352F]">
                  Total: {Math.round(competitions[0].total)} pts
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── Highest Score Breakdown Pie Chart ── */}
        {highestScoreCompetition && highestScoreCompetition.total > 0 && (
          <section className="mb-6 md:mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Highest Score Breakdown
            </h2>
            <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white">
              <p className="text-sm font-medium text-[#37352F] mb-3">
                {highestScoreCompetition.competitionName}
                <span className="text-[#9B9A97] font-normal ml-2">
                  {highestScoreCompetition.location} · {formatDate(highestScoreCompetition.date)}
                </span>
              </p>
              <HighestScorePieChart comp={highestScoreCompetition} />
            </div>
          </section>
        )}

        {/* ── Score trend chart (total points per competition) ── */}
        {scoredCompetitions.length > 1 && (
          <section className="mb-6 md:mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Total Points Trend
            </h2>
            <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white">
              <TotalPointsTrend competitions={scoredCompetitions} />
            </div>
          </section>
        )}

        {/* ── Competition History (clickable cells) ── */}
        <section className="mb-6 md:mb-8">
          <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
            Competition History
          </h2>
          {competitions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[#E9E9E7] rounded-[4px]">
              <p className="text-sm text-[#9B9A97]">No competition history yet</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block border border-[#E9E9E7] rounded-[4px] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F6F3] border-b border-[#E9E9E7]">
                      <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] uppercase tracking-wider">Competition</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[#9B9A97] uppercase tracking-wider w-16">Fence</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[#9B9A97] uppercase tracking-wider w-12">DE</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[#9B9A97] uppercase tracking-wider w-14">Obst</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[#9B9A97] uppercase tracking-wider w-14">Swim</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[#9B9A97] uppercase tracking-wider w-14">L-Run</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[#9B9A97] uppercase tracking-wider w-14">Ride</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-16">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitions.map((comp) => (
                      <tr key={comp.competitionId} className="border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#FAFAF8] transition-colors">
                        <td className="py-2.5 px-3">
                          <Link href={`/competitions/${comp.competitionId}`} className="hover:underline">
                            <div className="font-medium text-[#37352F]">{comp.competitionName}</div>
                            <div className="text-xs text-[#9B9A97]">{comp.location} · {formatDate(comp.date)}</div>
                          </Link>
                        </td>
                        <ClickableScoreCell value={comp.fencingRanking} onClick={() => setSelectedDiscipline("fencingRanking")} />
                        <ClickableScoreCell value={comp.fencingDE} onClick={() => setSelectedDiscipline("fencingDE")} />
                        <ClickableScoreCell value={comp.obstacle} onClick={() => setSelectedDiscipline("obstacle")} />
                        <ClickableScoreCell value={comp.swimming} onClick={() => setSelectedDiscipline("swimming")} />
                        <ClickableScoreCell value={comp.laserRun} onClick={() => setSelectedDiscipline("laserRun")} />
                        <ClickableScoreCell value={comp.riding} onClick={() => setSelectedDiscipline("riding")} />
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#37352F]">
                          {comp.total > 0 ? Math.round(comp.total) : <span className="text-[#C4C4C0]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {competitions.map((comp) => (
                  <MobileCompetitionCard
                    key={comp.competitionId}
                    comp={comp}
                    onDisciplineClick={setSelectedDiscipline}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Discipline Score History (clickable) ── */}
        {Object.values(scoreHistory).some((arr) => arr.length > 0) && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Discipline Score History
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DISCIPLINE_CONFIG.map(({ key, label, color }) => {
                const history = scoreHistory[key] || [];
                if (history.length === 0) return null;
                return (
                  <ClickableDisciplineHistoryCard
                    key={key}
                    disciplineKey={key}
                    label={label}
                    color={color}
                    history={history}
                    onClick={setSelectedDiscipline}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Discipline Detail Modal ── */}
      {modalProps && (
        <DisciplineDetailModal
          {...modalProps}
          isOpen={!!selectedDiscipline}
          onClose={handleCloseModal}
          onDataAdded={fetchData}
          canEdit={true}
        />
      )}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DISCIPLINE_CONFIG = [
  { key: "fencingRanking", label: "Fencing (Ranking)", color: "#DFAB01" },
  { key: "fencingDE", label: "Fencing (DE)", color: "#DFAB01" },
  { key: "obstacle", label: "Obstacle", color: "#D9730D" },
  { key: "swimming", label: "Swimming", color: "#0B6E99" },
  { key: "laserRun", label: "Laser Run", color: "#6940A5" },
  { key: "riding", label: "Riding", color: "#AD1A72" },
];

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatHundredths(h: number): string {
  const mins = Math.floor(h / 6000);
  const secs = Math.floor((h % 6000) / 100);
  const hh = h % 100;
  return `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ─── Build Personal Best Info with Splits ────────────────────────────────────

function buildPersonalBest(
  key: string,
  personalBests: PersonalBests,
  history: ScoreHistoryEntry[]
): { points: number | null; rawTime?: string; splits?: { label: string; value: string }[] } {
  switch (key) {
    case "fencingRanking": {
      const pts = personalBests.fencingRanking !== null ? Math.round(personalBests.fencingRanking) : null;
      const bestEntry = history.find((h) => h.points === pts);
      const splits: { label: string; value: string }[] = [];
      if (bestEntry) {
        if (bestEntry.victories != null) splits.push({ label: "Victories", value: `${bestEntry.victories}` });
        if (bestEntry.totalBouts != null) splits.push({ label: "Total Bouts", value: `${bestEntry.totalBouts}` });
        if (bestEntry.victories != null && bestEntry.totalBouts != null && (bestEntry.totalBouts as number) > 0) {
          splits.push({ label: "Win Rate", value: `${Math.round(((bestEntry.victories as number) / (bestEntry.totalBouts as number)) * 100)}%` });
        }
        splits.push({ label: "Source", value: bestEntry.source === "competition" ? bestEntry.competition : "Training" });
        splits.push({ label: "Date", value: formatDate(bestEntry.date) });
      }
      return { points: pts, splits };
    }
    case "fencingDE": {
      const pts = personalBests.fencingDE !== null ? Math.round(personalBests.fencingDE) : null;
      const bestEntry = history.find((h) => h.points === pts);
      const splits: { label: string; value: string }[] = [];
      if (bestEntry) {
        if (bestEntry.placement != null) splits.push({ label: "Placement", value: `#${bestEntry.placement}` });
        splits.push({ label: "Source", value: bestEntry.source === "competition" ? bestEntry.competition : "Training" });
        splits.push({ label: "Date", value: formatDate(bestEntry.date) });
      }
      return { points: pts, splits };
    }
    case "obstacle": {
      const pb = personalBests.obstacle;
      const pts = pb ? Math.round(pb.bestPoints) : null;
      const rawTime = pb ? `${pb.bestTime.toFixed(2)}s` : undefined;
      const bestEntry = history.find((h) => h.points === pts);
      const splits: { label: string; value: string }[] = [];
      if (pb) splits.push({ label: "Best Time", value: `${pb.bestTime.toFixed(2)}s` });
      if (bestEntry) {
        splits.push({ label: "Source", value: bestEntry.source === "competition" ? bestEntry.competition : "Training" });
        splits.push({ label: "Date", value: formatDate(bestEntry.date) });
      }
      return { points: pts, rawTime, splits };
    }
    case "swimming": {
      const pb = personalBests.swimming;
      const pts = pb ? Math.round(pb.bestPoints) : null;
      const rawTime = pb ? formatHundredths(pb.bestTime) : undefined;
      const bestEntry = history.find((h) => h.points === pts);
      const splits: { label: string; value: string }[] = [];
      if (pb) splits.push({ label: "Best Time", value: formatHundredths(pb.bestTime) });
      if (bestEntry) {
        splits.push({ label: "Source", value: bestEntry.source === "competition" ? bestEntry.competition : "Training" });
        splits.push({ label: "Date", value: formatDate(bestEntry.date) });
      }
      return { points: pts, rawTime, splits };
    }
    case "laserRun": {
      const pb = personalBests.laserRun;
      const pts = pb ? Math.round(pb.bestPoints) : null;
      const rawTime = pb ? formatSeconds(pb.bestTime) : undefined;
      const bestEntry = history.find((h) => h.points === pts);
      const splits: { label: string; value: string }[] = [];
      if (pb) splits.push({ label: "Finish Time", value: formatSeconds(pb.bestTime) });
      if (bestEntry) {
        splits.push({ label: "Source", value: bestEntry.source === "competition" ? bestEntry.competition : "Training" });
        splits.push({ label: "Date", value: formatDate(bestEntry.date) });
      }
      return { points: pts, rawTime, splits };
    }
    case "riding": {
      const pts = personalBests.riding !== null ? Math.round(personalBests.riding) : null;
      const bestEntry = history.find((h) => h.points === pts);
      const splits: { label: string; value: string }[] = [];
      if (bestEntry) {
        if (bestEntry.knockdowns != null) splits.push({ label: "Knockdowns", value: `${bestEntry.knockdowns}` });
        if (bestEntry.disobediences != null) splits.push({ label: "Disobediences", value: `${bestEntry.disobediences}` });
        splits.push({ label: "Source", value: bestEntry.source === "competition" ? bestEntry.competition : "Training" });
        splits.push({ label: "Date", value: formatDate(bestEntry.date) });
      }
      return { points: pts, splits };
    }
    default:
      return { points: null };
  }
}

// ─── StatCard ────────────────────────────────────────────────────────────────

const StatCard = memo(function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white hover:bg-[#FAFAF8] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: color + "18", color }}>
          {icon}
        </div>
      </div>
      <div className="text-[22px] font-bold text-[#37352F] leading-tight">
        {value}
      </div>
      <div className="text-xs text-[#787774] mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-[#9B9A97] mt-0.5">{sub}</div>}
    </div>
  );
});

// ─── Clickable Personal Best Card ────────────────────────────────────────────

function ClickablePBCard({
  icon,
  discipline,
  disciplineKey,
  points,
  rawTime,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  discipline: string;
  disciplineKey: string;
  points: number | null;
  rawTime?: string;
  color: string;
  onClick: (key: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(disciplineKey)}
      className="border border-[#E9E9E7] rounded-[4px] p-3 bg-white text-left w-full hover:border-[#C4C4C0] hover:shadow-sm transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium text-[#787774] group-hover:text-[#37352F] transition-colors">{discipline}</span>
        <ChevronRight size={12} className="ml-auto text-[#C4C4C0] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {points !== null ? (
        <div>
          <span className="text-lg font-bold text-[#37352F]">{points}</span>
          <span className="text-xs text-[#9B9A97] ml-1">pts</span>
          {rawTime && (
            <div className="text-xs text-[#787774] font-mono mt-0.5">{rawTime}</div>
          )}
        </div>
      ) : (
        <div className="text-sm text-[#C4C4C0]">No data — click to add</div>
      )}
    </button>
  );
}

// ─── Mobile Competition Card (vertical layout for competition history) ────────

function MobileCompetitionCard({
  comp,
  onDisciplineClick,
}: {
  comp: AthleteComp;
  onDisciplineClick: (key: string) => void;
}) {
  const disciplines = [
    { key: "fencingRanking", label: "Fencing", value: comp.fencingRanking, color: "#DFAB01" },
    { key: "fencingDE", label: "Fencing DE", value: comp.fencingDE, color: "#DFAB01" },
    { key: "obstacle", label: "Obstacle", value: comp.obstacle, color: "#D9730D" },
    { key: "swimming", label: "Swimming", value: comp.swimming, color: "#0B6E99" },
    { key: "laserRun", label: "Laser Run", value: comp.laserRun, color: "#6940A5" },
    { key: "riding", label: "Riding", value: comp.riding, color: "#AD1A72" },
  ];

  return (
    <div className="border border-[#E9E9E7] rounded-[4px] bg-white overflow-hidden">
      {/* Competition header */}
      <Link href={`/competitions/${comp.competitionId}`} className="block px-3 py-2.5 border-b border-[#E9E9E7] hover:bg-[#FAFAF8] transition-colors">
        <div className="font-medium text-sm text-[#37352F]">{comp.competitionName}</div>
        <div className="text-[11px] text-[#9B9A97]">{comp.location} · {formatDate(comp.date)}</div>
      </Link>
      {/* Discipline scores as vertical list */}
      <div className="divide-y divide-[#E9E9E7]">
        {disciplines.map((d) => (
          <button
            key={d.key}
            onClick={() => onDisciplineClick(d.key)}
            className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-[#FAFAF8] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-[#787774]">{d.label}</span>
            </div>
            <span className="text-sm font-mono font-medium text-[#37352F]">
              {d.value !== null ? Math.round(d.value) : <span className="text-[#C4C4C0]">—</span>}
            </span>
          </button>
        ))}
      </div>
      {/* Total */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#F7F6F3] border-t border-[#E9E9E7]">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wider">Total</span>
        <span className="text-sm font-bold font-mono text-[#37352F]">
          {comp.total > 0 ? Math.round(comp.total) : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Clickable Score Cell (for competition history table) ────────────────────

const ClickableScoreCell = memo(function ClickableScoreCell({ value, onClick }: { value: number | null; onClick: () => void }) {
  return (
    <td
      className="py-2.5 px-2 text-right font-mono text-[#37352F] cursor-pointer hover:bg-[#F0F0ED] transition-colors rounded"
      onClick={onClick}
    >
      {value !== null ? (
        <span className="hover:text-[#0B6E99] transition-colors">{Math.round(value)}</span>
      ) : (
        <span className="text-[#C4C4C0]">—</span>
      )}
    </td>
  );
});

// ─── Clickable Discipline Bar Chart ──────────────────────────────────────────

function ClickableDisciplineBarChart({
  comp,
  onClick,
}: {
  comp: AthleteComp;
  onClick: (key: string) => void;
}) {
  const bars = [
    { label: "Fencing", key: "fencingRanking", value: comp.fencingRanking, color: "#DFAB01" },
    { label: "Fencing DE", key: "fencingDE", value: comp.fencingDE, color: "#DFAB01" },
    { label: "Obstacle", key: "obstacle", value: comp.obstacle, color: "#D9730D" },
    { label: "Swimming", key: "swimming", value: comp.swimming, color: "#0B6E99" },
    { label: "Laser Run", key: "laserRun", value: comp.laserRun, color: "#6940A5" },
    { label: "Riding", key: "riding", value: comp.riding, color: "#AD1A72" },
  ].filter((b) => b.value !== null);

  const maxVal = Math.max(...bars.map((b) => b.value || 0), 1);

  return (
    <div className="space-y-2">
      {bars.map((bar) => (
        <button
          key={bar.label}
          onClick={() => onClick(bar.key)}
          className="flex items-center gap-3 w-full group cursor-pointer hover:bg-[#FAFAF8] rounded-md py-0.5 -mx-1 px-1 transition-colors"
        >
          <span className="text-xs text-[#787774] w-20 flex-shrink-0 text-right group-hover:text-[#37352F] transition-colors">{bar.label}</span>
          <div className="flex-1 bg-[#F0F0ED] rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 group-hover:brightness-110"
              style={{
                width: `${Math.max(((bar.value || 0) / maxVal) * 100, 4)}%`,
                backgroundColor: bar.color,
              }}
            >
              <span className="text-[10px] font-bold text-white">
                {Math.round(bar.value || 0)}
              </span>
            </div>
          </div>
          <ChevronRight size={12} className="text-[#C4C4C0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ─── Clickable Discipline History Card ───────────────────────────────────────

function ClickableDisciplineHistoryCard({
  disciplineKey,
  label,
  color,
  history,
  onClick,
}: {
  disciplineKey: string;
  label: string;
  color: string;
  history: ScoreHistoryEntry[];
  onClick: (key: string) => void;
}) {
  const sorted = [...history].reverse();
  const maxPts = Math.max(...sorted.map((h) => h.points), 1);
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const trend = prev ? latest.points - prev.points : 0;

  return (
    <button
      onClick={() => onClick(disciplineKey)}
      className="border border-[#E9E9E7] rounded-[4px] p-3 bg-white text-left w-full hover:border-[#C4C4C0] hover:shadow-sm transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#787774] group-hover:text-[#37352F] transition-colors">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold" style={{ color }}>
            {latest.points}
          </span>
          <span className="text-[10px] text-[#9B9A97]">pts</span>
          {trend !== 0 && (
            <span className={`text-[10px] font-medium ${trend > 0 ? "text-[#0F7B6C]" : "text-[#E03E3E]"}`}>
              {trend > 0 ? "+" : ""}{trend}
            </span>
          )}
          <ChevronRight size={12} className="ml-1 text-[#C4C4C0] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {/* Mini bar sparkline */}
      <div className="flex items-end gap-0.5" style={{ height: 32 }}>
        {sorted.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${Math.max((h.points / maxPts) * 100, 6)}%`,
              backgroundColor: i === sorted.length - 1 ? color : color + "40",
            }}
            title={`${h.competition || "Training"}: ${h.points} pts`}
          />
        ))}
      </div>
      <div className="text-[9px] text-[#9B9A97] mt-1.5">
        {sorted.length} entry{sorted.length !== 1 ? "ies" : ""} recorded — click to view details
      </div>
    </button>
  );
}

// ─── Highest Score Pie Chart ───────────────────────────────────────────────────

const HighestScorePieChart = memo(function HighestScorePieChart({ comp }: { comp: AthleteComp }) {
  const pieData = useMemo(() => {
    const data = [
      { name: "fencingRanking", label: "Fencing (Rank)", value: comp.fencingRanking || 0, fill: "var(--color-fencingRanking)" },
      { name: "fencingDE", label: "Fencing (DE)", value: comp.fencingDE || 0, fill: "var(--color-fencingDE)" },
      { name: "obstacle", label: "Obstacle", value: comp.obstacle || 0, fill: "var(--color-obstacle)" },
      { name: "swimming", label: "Swimming", value: comp.swimming || 0, fill: "var(--color-swimming)" },
      { name: "laserRun", label: "Laser Run", value: comp.laserRun || 0, fill: "var(--color-laserRun)" },
      { name: "riding", label: "Riding", value: comp.riding || 0, fill: "var(--color-riding)" },
    ].filter((item) => item.value > 0);

    return data;
  }, [comp]);

  const chartConfig = {
    value: {
      label: "Points",
    },
    fencingRanking: {
      label: "Fencing (Rank)",
      color: "#DFAB01",
    },
    fencingDE: {
      label: "Fencing (DE)",
      color: "#DFAB01",
    },
    obstacle: {
      label: "Obstacle",
      color: "#D9730D",
    },
    swimming: {
      label: "Swimming",
      color: "#0B6E99",
    },
    laserRun: {
      label: "Laser Run",
      color: "#6940A5",
    },
    riding: {
      label: "Riding",
      color: "#AD1A72",
    },
  } satisfies ChartConfig;

  if (pieData.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[#9B9A97]">
        No discipline scores available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ChartContainer
        config={chartConfig}
        className="[&_.recharts-text]:fill-[#37352F] mx-auto aspect-square max-h-[350px]"
      >
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey="label" hideLabel formatter={(value: any, name: any) => {
              if (typeof value !== 'number' || isNaN(value)) return "";
              return [`${Math.round(value)} pts`, name];
            }} />}
          />
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={4}
            dataKey="value"
            nameKey="label"
            cornerRadius={8}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              stroke="none"
              fontSize={12}
              fontWeight={500}
              fill="#37352F"
              formatter={(value: any) => {
                if (typeof value === 'number' && !isNaN(value)) {
                  return `${Math.round(value)}`;
                }
                return '';
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-4 text-center">
        <span className="text-sm font-bold text-[#37352F]">
          Total: {Math.round(comp.total)} pts
        </span>
      </div>
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 flex-wrap text-xs text-[#787774]">
        {pieData.map((entry) => {
          const percent = ((entry.value / comp.total) * 100).toFixed(1);
          const configEntry = chartConfig[entry.name as keyof typeof chartConfig];
          const color = configEntry && 'color' in configEntry ? configEntry.color : entry.fill;
          return (
            <div key={entry.name} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              <span>{entry.label} ({percent}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── Total Points Trend (simple line-like bar chart, not clickable) ──────────

const TotalPointsTrend = memo(function TotalPointsTrend({ competitions }: { competitions: AthleteComp[] }) {
  // Show chronologically (oldest first)
  const sorted = [...competitions].reverse();
  const maxPts = Math.max(...sorted.map((c) => c.total), 1);

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {sorted.map((comp, i) => {
          const height = (comp.total / maxPts) * 100;
          return (
            <div
              key={comp.competitionId}
              className="flex-1 flex flex-col items-center justify-end group relative"
              style={{ height: "100%" }}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-[#37352F] text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {Math.round(comp.total)} pts
              </div>
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(height, 3)}%`,
                  backgroundColor: i === sorted.length - 1 ? "#0B6E99" : "#C8DDE6",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {sorted.map((comp) => (
          <div key={comp.competitionId} className="flex-1 text-center">
            <div className="text-[9px] text-[#9B9A97] truncate" title={comp.competitionName}>
              {new Date(comp.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Public Dashboard (for non-athlete users) ────────────────────────────────

interface ActiveAthlete {
  athleteId: string;
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    country: string;
    ageCategory: string;
    gender: string;
    club: string | null;
  };
  competitionName: string;
}

function PublicDashboard() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeAthletes, setActiveAthletes] = useState<ActiveAthlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => (r.ok ? r.json() : []))
      .then(async (comps: Competition[]) => {
        setCompetitions(comps);

        // Fetch athletes for all active/upcoming competitions IN PARALLEL
        const currentComps = comps.filter(
          (c: Competition) => c.status === "active" || c.status === "upcoming"
        );

        const results = await Promise.allSettled(
          currentComps.map(async (comp) => {
            const res = await fetch(`/api/competitions/${comp.id}/athletes`);
            if (!res.ok) return [];
            const entries = await res.json();
            return entries.map((entry: ActiveAthlete) => ({
              ...entry,
              competitionName: comp.name,
            }));
          })
        );

        const athleteResults: ActiveAthlete[] = [];
        const seenIds = new Set<string>();
        for (const result of results) {
          if (result.status === "fulfilled") {
            for (const entry of result.value) {
              if (!seenIds.has(entry.athleteId)) {
                seenIds.add(entry.athleteId);
                athleteResults.push(entry);
              }
            }
          }
        }

        setActiveAthletes(athleteResults);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Memoize filtered lists to avoid recomputing on every render
  const active = useMemo(() => competitions.filter((c) => c.status === "active"), [competitions]);
  const upcoming = useMemo(() => competitions.filter((c) => c.status === "upcoming"), [competitions]);
  const completed = useMemo(() => competitions.filter((c) => c.status === "completed"), [competitions]);

  function formatDateRange(start: string, end: string) {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString("en-US", opts)}–${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${s.getFullYear()}`;
  }

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Dashboard" }]} />
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight mb-6 md:mb-10 leading-tight">
          Dashboard
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* ── Left: Competitions ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22px] font-bold text-[#37352F] tracking-tight">
                  Competitions
                </h2>
                <Link
                  href="/competitions"
                  className="text-xs text-[#0B6E99] hover:text-[#095a7d] font-medium transition-colors"
                >
                  View all →
                </Link>
              </div>

              {competitions.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#E9E9E7] rounded-[4px]">
                  <Trophy size={24} className="mx-auto text-[#C4C4C0] mb-2" />
                  <p className="text-sm text-[#9B9A97]">No competitions yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {active.length > 0 && (
                    <CompetitionGroup label="IN PROGRESS" competitions={active} formatDateRange={formatDateRange} />
                  )}
                  {upcoming.length > 0 && (
                    <CompetitionGroup label="UPCOMING" competitions={upcoming} formatDateRange={formatDateRange} />
                  )}
                  {completed.length > 0 && (
                    <CompetitionGroup label="PAST" competitions={completed.slice(0, 5)} formatDateRange={formatDateRange} />
                  )}
                </div>
              )}
            </section>

            {/* ── Right: Current Athletes ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22px] font-bold text-[#37352F] tracking-tight">
                  Current Athletes
                </h2>
                <Link
                  href="/athletes"
                  className="text-xs text-[#0B6E99] hover:text-[#095a7d] font-medium transition-colors"
                >
                  All athletes →
                </Link>
              </div>

              {activeAthletes.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#E9E9E7] rounded-[4px]">
                  <Target size={24} className="mx-auto text-[#C4C4C0] mb-2" />
                  <p className="text-sm text-[#9B9A97]">No athletes currently competing</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block border border-[#E9E9E7] rounded-[4px] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F7F6F3] border-b border-[#E9E9E7]">
                          <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] uppercase tracking-wider">Athlete</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] uppercase tracking-wider w-16">Country</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] uppercase tracking-wider">Competition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeAthletes.map((entry) => (
                          <tr key={entry.athleteId} className="border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#FAFAF8] transition-colors">
                            <td className="py-2.5 px-3 font-medium">
                              <Link
                                href={`/athletes/${entry.athlete.id}`}
                                className="text-[#37352F] hover:text-[#0B6E99] transition-colors hover:underline"
                              >
                                {entry.athlete.firstName} {entry.athlete.lastName}
                              </Link>
                              <div className="text-[10px] text-[#9B9A97]">
                                {entry.athlete.ageCategory} · {entry.athlete.gender}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#787774] text-xs">{entry.athlete.country}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs text-[#787774]">{entry.competitionName}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="md:hidden divide-y divide-[#E9E9E7] border border-[#E9E9E7] rounded-[4px]">
                    {activeAthletes.map((entry) => (
                      <Link
                        key={entry.athleteId}
                        href={`/athletes/${entry.athlete.id}`}
                        className="block px-3 py-2.5 hover:bg-[#FAFAF8] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-[#37352F]">
                              {entry.athlete.firstName} {entry.athlete.lastName}
                            </div>
                            <div className="text-[11px] text-[#9B9A97]">
                              {entry.athlete.country} · {entry.athlete.ageCategory} · {entry.athlete.gender}
                            </div>
                          </div>
                          <div className="text-[11px] text-[#787774] text-right ml-2 flex-shrink-0">
                            {entry.competitionName}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

const CompetitionGroup = memo(function CompetitionGroup({
  label,
  competitions,
  formatDateRange,
}: {
  label: string;
  competitions: Competition[];
  formatDateRange: (s: string, e: string) => string;
}) {
  return (
    <div>
      <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-2">
        {label}
      </h2>
      <div className="divide-y divide-[#E9E9E7]">
        {competitions.map((comp) => {
          const completedEvents = comp.events.filter((e) => e.status === "completed").length;
          return (
            <Link
              key={comp.id}
              href={`/competitions/${comp.id}`}
              className="block py-3 px-3 -mx-3 rounded-[4px] hover:bg-[#EFEFEF] transition-colors duration-150"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-medium text-[#37352F]">
                      {comp.name}
                    </span>
                    <StatusBadge status={comp.status} />
                  </div>
                  <div className="text-sm text-[#787774]">
                    {comp.location} · {formatDateRange(comp.date, comp.endDate)} ·{" "}
                    {completedEvents} of {comp.events.length} events
                  </div>
                  <div className="text-xs text-[#9B9A97] mt-0.5">
                    {comp.ageCategory} · {comp._count.competitionAthletes} athletes
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#C4C4C0] mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});
