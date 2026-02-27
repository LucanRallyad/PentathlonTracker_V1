"use client";

import { useState, use, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Trophy, Target, TrendingUp, Award, Activity,
  Swords, PersonStanding, Waves, Crosshair, Loader2,
  ArrowLeft, ChevronRight,
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { DisciplineDetailModal, DISCIPLINE_ICONS } from "@/components/DisciplineDetailModal";
import { useScoreUpdates } from "@/lib/useScoreUpdates";
import { useAuth } from "@/lib/useAuth";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); });

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface AthleteProfileData {
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    country: string;
    ageCategory: string;
    gender: string;
    club: string | null;
  };
  competitions: AthleteComp[];
  personalBests: PersonalBests;
  stats: AthleteStats;
  scoreHistory: Record<string, ScoreHistoryEntry[]>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AthleteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
  const { user: authUser } = useAuth();

  // SWR: auto-fetches + polls every 10s as fallback for real-time
  const { data, isLoading: loading, error, mutate } = useSWR<AthleteProfileData>(
    `/api/athletes/${id}/stats`,
    fetcher,
    {
      refreshInterval: 10_000,       // Poll every 10s as fallback
      revalidateOnFocus: true,       // Refetch when user tabs back
      dedupingInterval: 3_000,       // Debounce rapid refetches
    }
  );

  // SSE: instant push when admin saves scores for this athlete
  useScoreUpdates({
    athleteId: id,
    onUpdate: () => mutate(),
    enabled: true,
  });

  // Expose for modal's onDataAdded callback
  const fetchData = useCallback(() => { mutate(); }, [mutate]);

  if (loading) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Athletes", href: "/athletes" }, { label: "Loading..." }]} />
        <div className="max-w-[1000px] mx-auto px-6 py-12">
          <div className="flex items-center gap-3 text-[#787774]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading athlete profile...</span>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Athletes", href: "/athletes" }, { label: "Not Found" }]} />
        <div className="max-w-[1000px] mx-auto px-6 py-12">
          <p className="text-sm text-[#787774]">Athlete not found.</p>
          <Link href="/athletes" className="text-sm text-[#0B6E99] hover:underline mt-2 inline-block">
            &larr; Back to athletes
          </Link>
        </div>
      </>
    );
  }

  const { athlete, stats, personalBests, competitions, scoreHistory } = data;

  // Determine if the current user can edit this athlete's data
  // Athlete can edit their own profile (matched by athleteId), admin/official can edit any
  const isAdmin = authUser?.role === "super_admin" || authUser?.role === "admin" || authUser?.role === "official";
  const isOwnProfile = authUser?.athleteId === id;
  const canEdit = isAdmin || isOwnProfile;

  // Build modal props for the selected discipline
  const getModalProps = (key: string) => {
    const config = DISCIPLINE_CONFIG.find((d) => d.key === key);
    if (!config) return null;

    const history: ScoreHistoryEntry[] = (scoreHistory[key] || []).map((entry) => ({
      ...entry,
      source: (entry.source as "competition" | "training") || "competition",
    }));

    const pb = buildPersonalBest(key, personalBests, history);

    return {
      discipline: key,
      label: config.label,
      color: config.color,
      icon: DISCIPLINE_ICONS[key],
      history,
      personalBest: pb,
    };
  };

  const modalProps = selectedDiscipline ? getModalProps(selectedDiscipline) : null;

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Athletes", href: "/athletes" },
          { label: `${athlete.firstName} ${athlete.lastName}` },
        ]}
      />
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Back link */}
        <Link
          href="/athletes"
          className="inline-flex items-center gap-1 text-xs text-[#787774] hover:text-[#37352F] transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          All Athletes
        </Link>

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight">
            {athlete.firstName} {athlete.lastName}
          </h1>
          <p className="text-xs md:text-sm text-[#787774] mt-1">
            {athlete.country} · {athlete.ageCategory} · {athlete.gender}
            {athlete.club && ` · ${athlete.club}`}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6 md:mb-8">
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
            value={Object.values(scoreHistory).reduce((sum, arr) => sum + arr.length, 0)}
            sub="across all disciplines"
            color="#6940A5"
          />
        </div>

        {/* Personal Bests (clickable) */}
        <section className="mb-8">
          <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
            Personal Bests
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            <ClickablePBCard icon={<Swords size={16} />} discipline="Fencing (Rank)" disciplineKey="fencingRanking" points={personalBests.fencingRanking !== null ? Math.round(personalBests.fencingRanking) : null} color="#DFAB01" onClick={setSelectedDiscipline} />
            <ClickablePBCard icon={<Swords size={16} />} discipline="Fencing (DE)" disciplineKey="fencingDE" points={personalBests.fencingDE !== null ? Math.round(personalBests.fencingDE) : null} color="#DFAB01" onClick={setSelectedDiscipline} />
            <ClickablePBCard icon={<PersonStanding size={16} />} discipline="Obstacle" disciplineKey="obstacle" points={personalBests.obstacle?.bestPoints != null ? Math.round(personalBests.obstacle.bestPoints) : null} rawTime={personalBests.obstacle?.bestTime != null ? `${personalBests.obstacle.bestTime.toFixed(2)}s` : undefined} color="#D9730D" onClick={setSelectedDiscipline} />
            <ClickablePBCard icon={<Waves size={16} />} discipline="Swimming" disciplineKey="swimming" points={personalBests.swimming?.bestPoints != null ? Math.round(personalBests.swimming.bestPoints) : null} rawTime={personalBests.swimming?.bestTime != null ? formatHundredths(personalBests.swimming.bestTime) : undefined} color="#0B6E99" onClick={setSelectedDiscipline} />
            <ClickablePBCard icon={<Crosshair size={16} />} discipline="Laser Run" disciplineKey="laserRun" points={personalBests.laserRun?.bestPoints != null ? Math.round(personalBests.laserRun.bestPoints) : null} rawTime={personalBests.laserRun?.bestTime != null ? formatSeconds(personalBests.laserRun.bestTime) : undefined} color="#6940A5" onClick={setSelectedDiscipline} />
            <ClickablePBCard icon={<Activity size={16} />} discipline="Riding" disciplineKey="riding" points={personalBests.riding !== null ? Math.round(personalBests.riding) : null} color="#AD1A72" onClick={setSelectedDiscipline} />
          </div>
        </section>

        {/* Latest Competition Breakdown (clickable bars) */}
        {competitions.length > 0 && competitions[0].total > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Latest Competition Breakdown
            </h2>
            <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white">
              <p className="text-sm font-medium text-[#37352F] mb-3">
                {competitions[0].competitionName}
                <span className="text-[#9B9A97] font-normal ml-2">
                  {competitions[0].location} · {formatDate(competitions[0].date)}
                </span>
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

        {/* Total Points Trend */}
        {competitions.filter((c) => c.total > 0).length > 1 && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Total Points Trend
            </h2>
            <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white">
              <TotalPointsTrend competitions={competitions.filter((c) => c.total > 0)} />
            </div>
          </section>
        )}

        {/* Competition History (clickable cells) */}
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

        {/* Discipline Score History (clickable) */}
        {Object.values(scoreHistory).some((arr) => arr.length > 0) && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Discipline Score History
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Discipline Detail Modal */}
      {modalProps && (
        <DisciplineDetailModal
          {...modalProps}
          isOpen={!!selectedDiscipline}
          onClose={() => setSelectedDiscipline(null)}
          onDataAdded={fetchData}
          canEdit={canEdit}
          ageCategory={athlete.ageCategory}
          gender={(athlete.gender as "M" | "F") || "M"}
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

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white hover:bg-[#FAFAF8] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: color + "18", color }}>{icon}</div>
      </div>
      <div className="text-[22px] font-bold text-[#37352F] leading-tight">{value}</div>
      <div className="text-xs text-[#787774] mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-[#9B9A97] mt-0.5">{sub}</div>}
    </div>
  );
}

function ClickablePBCard({ icon, discipline, disciplineKey, points, rawTime, color, onClick }: { icon: React.ReactNode; discipline: string; disciplineKey: string; points: number | null; rawTime?: string; color: string; onClick: (key: string) => void }) {
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
          {rawTime ? (
            <>
              <span className="text-lg font-bold font-mono" style={{ color }}>{rawTime}</span>
              <div className="text-xs text-[#9B9A97] mt-0.5">{points} pts</div>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-[#37352F]">{points}</span>
              <span className="text-xs text-[#9B9A97] ml-1">pts</span>
            </>
          )}
        </div>
      ) : (
        <div className="text-sm text-[#C4C4C0]">No data</div>
      )}
    </button>
  );
}

function ClickableScoreCell({ value, onClick }: { value: number | null; onClick: () => void }) {
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
}

function ClickableDisciplineBarChart({ comp, onClick }: { comp: AthleteComp; onClick: (key: string) => void }) {
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
              style={{ width: `${Math.max(((bar.value || 0) / maxVal) * 100, 4)}%`, backgroundColor: bar.color }}
            >
              <span className="text-[10px] font-bold text-white">{Math.round(bar.value || 0)}</span>
            </div>
          </div>
          <ChevronRight size={12} className="text-[#C4C4C0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

function TotalPointsTrend({ competitions }: { competitions: AthleteComp[] }) {
  const sorted = [...competitions].reverse();
  const maxPts = Math.max(...sorted.map((c) => c.total), 1);

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {sorted.map((comp, i) => {
          const height = (comp.total / maxPts) * 100;
          return (
            <div key={comp.competitionId} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: "100%" }}>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-[#37352F] text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {Math.round(comp.total)} pts
              </div>
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{ height: `${Math.max(height, 3)}%`, backgroundColor: i === sorted.length - 1 ? "#0B6E99" : "#C8DDE6" }}
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
}

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
      <Link href={`/competitions/${comp.competitionId}`} className="block px-3 py-2.5 border-b border-[#E9E9E7] hover:bg-[#FAFAF8] transition-colors">
        <div className="font-medium text-sm text-[#37352F]">{comp.competitionName}</div>
        <div className="text-[11px] text-[#9B9A97]">{comp.location} · {formatDate(comp.date)}</div>
      </Link>
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
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#F7F6F3] border-t border-[#E9E9E7]">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wider">Total</span>
        <span className="text-sm font-bold font-mono text-[#37352F]">
          {comp.total > 0 ? Math.round(comp.total) : "—"}
        </span>
      </div>
    </div>
  );
}

function ClickableDisciplineHistoryCard({ disciplineKey, label, color, history, onClick }: { disciplineKey: string; label: string; color: string; history: ScoreHistoryEntry[]; onClick: (key: string) => void }) {
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
          <span className="text-sm font-bold" style={{ color }}>{latest.points}</span>
          <span className="text-[10px] text-[#9B9A97]">pts</span>
          {trend !== 0 && (
            <span className={`text-[10px] font-medium ${trend > 0 ? "text-[#0F7B6C]" : "text-[#E03E3E]"}`}>
              {trend > 0 ? "+" : ""}{trend}
            </span>
          )}
          <ChevronRight size={12} className="ml-1 text-[#C4C4C0] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="flex items-end gap-0.5" style={{ height: 32 }}>
        {sorted.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${Math.max((h.points / maxPts) * 100, 6)}%`, backgroundColor: i === sorted.length - 1 ? color : color + "40" }}
            title={`${h.competition || "Training"}: ${h.points} pts`}
          />
        ))}
      </div>
      <div className="text-[9px] text-[#9B9A97] mt-1.5">
        {sorted.length} entry{sorted.length !== 1 ? "ies" : ""} — click to view details
      </div>
    </button>
  );
}
