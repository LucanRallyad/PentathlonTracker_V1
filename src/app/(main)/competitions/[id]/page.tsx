"use client";

import { useState, useEffect, useCallback, use, useRef, Fragment } from "react";
import useSWR from "swr";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { CompetitionStatusControl } from "@/components/CompetitionStatusControl";
import { TabBar } from "@/components/TabBar";
import { DISCIPLINE_NAMES } from "@/lib/scoring/constants";
import {
  calculateFencingRanking,
  getFencingRankingParams,
} from "@/lib/scoring/fencing-ranking";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { calculateObstacle } from "@/lib/scoring/obstacle";
import { calculateSwimming } from "@/lib/scoring/swimming";
import { calculateLaserRun } from "@/lib/scoring/laser-run";
import { calculateRiding } from "@/lib/scoring/riding";
import type { AgeCategory } from "@/lib/scoring/types";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import { Download, Star, StarOff, ArrowUp, ArrowDown, Printer } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Competition {
  id: string;
  name: string;
  date: string;
  endDate: string;
  location: string;
  status: string;
  ageCategory: string;
  competitionType: string;
  events: Event[];
  competitionAthletes: { athleteId: string; ageCategory: string | null; athlete: Athlete; status: string }[];
}

interface Event {
  id: string;
  discipline: string;
  scheduledStart: string;
  status: string;
  dayLabel: string;
  sortOrder: number;
  completedAt: string | null;
}

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  club: string | null;
}

interface LeaderboardEntry {
  athleteId: string;
  athleteName: string;
  country: string;
  gender: string;
  ageCategory: string;
  fencingRanking: number | null;
  fencingDE: number | null;
  obstacle: number | null;
  swimming: number | null;
  laserRun: number | null;
  riding: number | null;
  total: number;
  rank: number;
}

interface FeedEntry {
  id: string;
  timestamp: string;
  discipline: string;
  athleteName: string;
  country: string;
  rawInput: string;
  mpPoints: number;
}

interface HandicapResult {
  athleteId: string;
  athleteName: string;
  cumulativePoints: number;
  rawDelay: number;
  startDelay: number;
  isPackStart: boolean;
  shootingStation: number;
  gateAssignment: string;
  startTimeFormatted: string;
}

const disciplineColors: Record<string, string> = {
  fencing_ranking: "#DFAB01",
  fencing_de: "#DFAB01",
  obstacle: "#D9730D",
  swimming: "#0B6E99",
  laser_run: "#6940A5",
  riding: "#AD1A72",
};

export default function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("schedule");
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "official";

  const { data: competition, mutate } = useSWR<Competition>(
    `/api/competitions/${id}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  if (!competition) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/" }, { label: "Loading..." }]} />
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-12">
          <div className="h-10 w-64 bg-[#F7F6F3] rounded animate-pulse mb-4" />
          <div className="h-4 w-96 bg-[#F7F6F3] rounded animate-pulse" />
        </div>
      </>
    );
  }

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${e.getDate()}, ${s.getFullYear()}`;
  };

  const tabs = [
    { id: "schedule", label: "Schedule" },
    { id: "athletes", label: "Athletes" },
    { id: "scores", label: "Scores" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "live-feed", label: "Live Feed" },
    { id: "my-athletes", label: "My Athletes" },
  ];

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Competitions", href: "/" },
          { label: competition.name },
        ]}
      />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">
              {competition.name}
            </h1>
            <p className="text-xs md:text-sm text-[#787774] mt-1 md:mt-2 mb-1 flex items-center gap-2 flex-wrap">
              {competition.location} · {formatDateRange(competition.date, competition.endDate)}
              <StatusBadge status={competition.status} />
            </p>
            <p className="text-xs text-[#9B9A97] mb-4 md:mb-8">
              {competition.ageCategory} {competition.competitionType} ·{" "}
              {competition.competitionAthletes.length} Athletes
            </p>
          </div>

          {/* Admin status controls */}
          {isAdmin && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <CompetitionStatusControl
                competitionId={id}
                status={competition.status}
                onStatusChange={() => mutate()}
                variant="header"
              />
            </div>
          )}
        </div>

        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === "schedule" && <ScheduleTab events={competition.events} competitionId={id} />}
          {activeTab === "athletes" && (
            <AthletesTab
              ageCategory={competition.ageCategory}
              athletes={competition.competitionAthletes}
            />
          )}
          {activeTab === "scores" && (
            <ScoresTab competition={competition} competitionId={id} isAdmin={isAdmin} />
          )}
          {activeTab === "leaderboard" && <LeaderboardTab competitionId={id} ageCategory={competition.ageCategory} />}
          {activeTab === "live-feed" && <LiveFeedTab competitionId={id} />}
          {activeTab === "my-athletes" && (
            <MyAthletesTab
              competitionId={id}
              athletes={competition.competitionAthletes}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Scores Tab ─────────────────────────────────────────────────────────────

// Shared cell styles (matches admin spreadsheet look)
const cellBase =
  "border border-[#D5D5D2] px-3 py-2 text-sm text-[#37352F] font-mono";
const cellHeader =
  "border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase select-none whitespace-nowrap";
const cellRowNum =
  "border border-[#D5D5D2] bg-[#F7F6F3] px-2 py-2 text-[11px] text-[#9B9A97] text-center font-mono select-none w-10 min-w-[40px]";
const cellReadonlyStyle =
  "border border-[#D5D5D2] bg-[#FAFAF8] px-3 py-2 text-sm text-[#37352F]";
const cellComputed =
  "border border-[#D5D5D2] bg-[#F0F7FA] px-3 py-2 text-sm text-[#37352F] font-mono font-semibold text-right";
const cellValue =
  "border border-[#D5D5D2] bg-white px-3 py-2 text-sm font-mono text-[#37352F]";

// Master state shape: { discipline: { athleteId: { field: value } } }
type ScoreMasterValues = Record<string, Record<string, Record<string, string>>>;

function parseSwimmingHundredths(input: string): number {
  const mmss = input.match(/^(\d{1,2}):(\d{2})\.(\d{2})$/);
  if (mmss) return parseInt(mmss[1], 10) * 6000 + parseInt(mmss[2], 10) * 100 + parseInt(mmss[3], 10);
  const sec = input.match(/^(\d+)\.(\d{2})$/);
  if (sec) return parseInt(sec[1], 10) * 100 + parseInt(sec[2], 10);
  return Math.round(parseFloat(input) * 100) || 0;
}

function parseLaserRunSeconds(input: string): number {
  const m = input.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return parseFloat(input) || 0;
}

interface HandicapResult {
  athleteId: string;
  startDelay: number;
  rawDelay: number;
  isPackStart: boolean;
  shootingStation: number;
  gateAssignment: string;
  startTimeFormatted: string;
}

function printSheet(title: string, tableRef: React.RefObject<HTMLDivElement | null>, subtitle?: string) {
  if (!tableRef.current) return;
  const html = tableRef.current.innerHTML;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #37352F; }
h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.subtitle { font-size: 12px; color: #787774; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { background: #F0F0ED; border: 1px solid #C8C8C5; padding: 6px 10px; text-align: left; font-size: 10px; font-weight: 600; color: #5A5A57; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
td { border: 1px solid #D5D5D2; padding: 6px 10px; font-size: 12px; }
tr:nth-child(even) { background: #FAFAF8; }
.print-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; border-bottom: 2px solid #37352F; padding-bottom: 8px; }
.print-date { font-size: 11px; color: #9B9A97; }
@media print { body { padding: 12px; } }
</style></head>
<body>
<div class="print-header"><div><h1>${title}</h1>${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}</div>
<div class="print-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div></div>
${html}
<script>window.onload = function() { window.print(); }</script>
</body></html>`);
  win.document.close();
}

function ScoresPrintButton({ onClick, label = "Print Sheet" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-[#F7F6F3] hover:text-[#37352F] transition-colors"
    >
      <Printer size={12} />
      {label}
    </button>
  );
}

const ALL_EVENTS_LABELS: Record<string, string> = {
  fencing_ranking: "Fencing (Rank)",
  fencing_de: "Fencing (DE)",
  obstacle: "Obstacle",
  swimming: "Swimming",
  laser_run: "Laser Run",
  riding: "Riding",
};

const ALL_EVENTS_INPUT_META: Record<string, { hint: string; field: string }> = {
  fencing_ranking: { hint: "wins", field: "victories" },
  fencing_de: { hint: "place", field: "placement" },
  obstacle: { hint: "sec", field: "time" },
  swimming: { hint: "time", field: "time" },
  laser_run: { hint: "finish", field: "finishTime" },
  riding: { hint: "pen", field: "knockdowns" },
};

function ScoresTab({
  competition,
  competitionId,
  isAdmin,
}: {
  competition: Competition;
  competitionId: string;
  isAdmin: boolean;
}) {
  const [activeDiscipline, setActiveDiscipline] = useState<string>("_all");
  const [activeCategory, setActiveCategory] = useState<string>("_all");
  const [activeGender, setActiveGender] = useState<string>("_all");
  const [values, setValues] = useState<ScoreMasterValues>({});
  const [loaded, setLoaded] = useState(false);

  const { data: handicapData } = useSWR<{ handicapStarts: HandicapResult[] }>(
    `/api/competitions/${competitionId}/handicap`,
    fetcher,
    { refreshInterval: 10000 }
  );

  // Load scores from DB
  useEffect(() => {
    if (!competition || loaded) return;

    async function loadScores() {
      const loadedVals: ScoreMasterValues = {};
      for (const ev of competition.events) {
        loadedVals[ev.discipline] = {};
        try {
          const res = await fetch(`/api/scores/${ev.discipline}?eventId=${ev.id}`);
          if (!res.ok) continue;
          const scores = await res.json();
          for (const s of scores) {
            if (!s.athleteId) continue;
            if (s.eventId && s.eventId !== ev.id) continue;
            const fields: Record<string, string> = {};
            switch (ev.discipline) {
              case "fencing_ranking":
                if (s.victories != null) fields.victories = String(s.victories);
                break;
              case "fencing_de":
                if (s.placement != null) fields.placement = String(s.placement);
                break;
              case "obstacle":
                if (s.timeSeconds != null) fields.time = String(s.timeSeconds);
                if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
                break;
              case "swimming":
                if (s.timeHundredths != null) {
                  const total = s.timeHundredths;
                  const mins = Math.floor(total / 6000);
                  const secs = Math.floor((total % 6000) / 100);
                  const hh = total % 100;
                  fields.time = `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
                }
                if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
                break;
              case "laser_run":
                if (s.finishTimeSeconds != null) {
                  const m = Math.floor(s.finishTimeSeconds / 60);
                  const sec = s.finishTimeSeconds % 60;
                  fields.finishTime = `${m}:${String(sec).padStart(2, "0")}`;
                }
                if (s.penaltySeconds) fields.penalties = String(s.penaltySeconds);
                break;
              case "riding":
                if (s.knockdowns != null) fields.knockdowns = String(s.knockdowns);
                if (s.disobediences) fields.disobediences = String(s.disobediences);
                if (s.timeOverSeconds) fields.timeOver = String(s.timeOverSeconds);
                if (s.otherPenalties) fields.other = String(s.otherPenalties);
                break;
            }
            if (Object.keys(fields).length > 0) {
              loadedVals[ev.discipline][s.athleteId] = fields;
            }
          }
        } catch {
          // ignore
        }
      }
      setValues(loadedVals);
      setLoaded(true);
    }

    loadScores();
  }, [competition, loaded]);

  // Auto-refresh scores every 5 seconds
  useEffect(() => {
    if (!loaded || !competition) return;

    const interval = setInterval(async () => {
      const refreshed: ScoreMasterValues = {};
      for (const ev of competition.events) {
        refreshed[ev.discipline] = {};
        try {
          const res = await fetch(`/api/scores/${ev.discipline}?eventId=${ev.id}`);
          if (!res.ok) continue;
          const scores = await res.json();
          for (const s of scores) {
            if (!s.athleteId) continue;
            if (s.eventId && s.eventId !== ev.id) continue;
            const fields: Record<string, string> = {};
            switch (ev.discipline) {
              case "fencing_ranking":
                if (s.victories != null) fields.victories = String(s.victories);
                break;
              case "fencing_de":
                if (s.placement != null) fields.placement = String(s.placement);
                break;
              case "obstacle":
                if (s.timeSeconds != null) fields.time = String(s.timeSeconds);
                if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
                break;
              case "swimming":
                if (s.timeHundredths != null) {
                  const total = s.timeHundredths;
                  const mins = Math.floor(total / 6000);
                  const secs = Math.floor((total % 6000) / 100);
                  const hh = total % 100;
                  fields.time = `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
                }
                if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
                break;
              case "laser_run":
                if (s.finishTimeSeconds != null) {
                  const m = Math.floor(s.finishTimeSeconds / 60);
                  const sec = s.finishTimeSeconds % 60;
                  fields.finishTime = `${m}:${String(sec).padStart(2, "0")}`;
                }
                if (s.penaltySeconds) fields.penalties = String(s.penaltySeconds);
                break;
              case "riding":
                if (s.knockdowns != null) fields.knockdowns = String(s.knockdowns);
                if (s.disobediences) fields.disobediences = String(s.disobediences);
                if (s.timeOverSeconds) fields.timeOver = String(s.timeOverSeconds);
                if (s.otherPenalties) fields.other = String(s.otherPenalties);
                break;
            }
            if (Object.keys(fields).length > 0) {
              refreshed[ev.discipline][s.athleteId] = fields;
            }
          }
        } catch {
          // ignore
        }
      }
      setValues(refreshed);
    }, 5000);

    return () => clearInterval(interval);
  }, [loaded, competition]);

  const getValue = useCallback(
    (disc: string, athleteId: string, field: string): string => {
      return values[disc]?.[athleteId]?.[field] || "";
    },
    [values]
  );

  if (!loaded) {
    return (
      <div className="space-y-2 py-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-[#F7F6F3] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  // Parse age categories
  const categories = competition.ageCategory
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const hasMultipleCategories = categories.length > 1;

  const categoryTabs = [
    { id: "_all", label: `All (${competition.competitionAthletes.length})` },
    ...categories.map((cat) => {
      const count = competition.competitionAthletes.filter(
        (a) => (a.ageCategory || a.athlete.ageCategory) === cat
      ).length;
      return { id: cat, label: `${cat} (${count})` };
    }),
  ];

  const maleCount = competition.competitionAthletes.filter((a) => a.athlete.gender === "M").length;
  const femaleCount = competition.competitionAthletes.filter((a) => a.athlete.gender === "F").length;

  const genderTabs = [
    { id: "_all", label: `All (${competition.competitionAthletes.length})` },
    { id: "M", label: `Male (${maleCount})` },
    { id: "F", label: `Female (${femaleCount})` },
  ];

  // Filter athletes
  let filteredAthletes = competition.competitionAthletes;
  if (activeCategory !== "_all") {
    filteredAthletes = filteredAthletes.filter(
      (a) => (a.ageCategory || a.athlete.ageCategory) === activeCategory
    );
  }
  if (activeGender !== "_all") {
    filteredAthletes = filteredAthletes.filter((a) => a.athlete.gender === activeGender);
  }

  const allEventsTab = { id: "_all", label: "All Events" };
  const disciplineTabs = competition.events.map((e) => ({
    id: e.discipline,
    label: DISCIPLINE_NAMES[e.discipline] || e.discipline,
  }));
  const discTabs = [allEventsTab, ...disciplineTabs];

  const isAllView = activeDiscipline === "_all";
  const scoringAgeCategory = (
    activeCategory !== "_all" ? activeCategory : competition.ageCategory.split(",")[0]?.trim() || "Senior"
  ) as AgeCategory;

  return (
    <div>
      {/* Admin link */}
      {isAdmin && (
        <div className="mb-4">
          <Link
            href={`/admin/competitions/${competitionId}/score-entry`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#37352F] rounded-[4px] hover:bg-[#2F2E2B] transition-colors"
          >
            Open Score Entry (Edit Mode)
          </Link>
        </div>
      )}

      {/* Gender + Age category filter bar */}
      {competition.competitionAthletes.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Gender</span>
            {genderTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveGender(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                  activeGender === tab.id
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {hasMultipleCategories && <div className="hidden sm:block w-px h-6 bg-[#E9E9E7]" />}

          {hasMultipleCategories && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Category</span>
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                    activeCategory === tab.id
                      ? "bg-[#37352F] text-white border-[#37352F]"
                      : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="hidden sm:block ml-auto text-xs text-[#9B9A97]">
            Auto-refreshing every 5s
          </div>
        </div>
      )}

      {/* Discipline tabs */}
      <TabBar tabs={discTabs} activeTab={activeDiscipline} onTabChange={setActiveDiscipline} />

      {filteredAthletes.length === 0 ? (
        <div className="mt-6 text-center py-12 border border-dashed border-[#E9E9E7] rounded-[4px]">
          <p className="text-sm text-[#9B9A97]">No athletes in this category</p>
        </div>
      ) : (
        <div className="mt-6">
          {isAllView ? (
            <ReadonlyAllEventsGrid
              competition={{ ...competition, competitionAthletes: filteredAthletes }}
              getValue={getValue}
            />
          ) : (
            <>
              {activeDiscipline === "fencing_ranking" && (
                <ReadonlyFencingRanking athletes={filteredAthletes} getValue={getValue} />
              )}
              {activeDiscipline === "fencing_de" && (
                <ReadonlyFencingDE athletes={filteredAthletes} getValue={getValue} />
              )}
              {activeDiscipline === "obstacle" && (
                <ReadonlyObstacle athletes={filteredAthletes} getValue={getValue} />
              )}
              {activeDiscipline === "swimming" && (
                <ReadonlySwimming athletes={filteredAthletes} ageCategory={scoringAgeCategory} getValue={getValue} competitionId={competitionId} />
              )}
              {activeDiscipline === "laser_run" && (
                <ReadonlyLaserRun athletes={filteredAthletes} ageCategory={scoringAgeCategory} handicapData={handicapData} getValue={getValue} />
              )}
              {activeDiscipline === "riding" && (
                <ReadonlyRiding athletes={filteredAthletes} getValue={getValue} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Read-only props type ───────────────────────────────────────────────────

interface ReadonlyEntryProps {
  athletes: Competition["competitionAthletes"];
  getValue: (disc: string, athleteId: string, field: string) => string;
}

// ─── Read-only All Events Grid ──────────────────────────────────────────────

function ReadonlyAllEventsGrid({
  competition,
  getValue,
}: {
  competition: Competition;
  getValue: (disc: string, athleteId: string, field: string) => string;
}) {
  const athletes = competition.competitionAthletes;
  const events = competition.events;
  const ageCategory = competition.ageCategory as AgeCategory;
  const fencingParams = getFencingRankingParams(athletes.length);
  const printRef = useRef<HTMLDivElement>(null);

  function computePoints(discipline: string, raw: string, athleteGender?: string): number | null {
    if (!raw || raw.trim() === "") return null;
    switch (discipline) {
      case "fencing_ranking": {
        const v = parseInt(raw, 10);
        if (isNaN(v)) return null;
        return calculateFencingRanking({ victories: v, totalBouts: fencingParams.totalBouts });
      }
      case "fencing_de": {
        const p = parseInt(raw, 10);
        if (isNaN(p)) return null;
        return calculateFencingDE({ placement: p });
      }
      case "obstacle": {
        const t = parseFloat(raw);
        if (isNaN(t)) return null;
        return calculateObstacle({ timeSeconds: t, penaltyPoints: 0 });
      }
      case "swimming": {
        const h = parseSwimmingHundredths(raw);
        if (h <= 0) return null;
        return calculateSwimming({ timeHundredths: h, penaltyPoints: 0, ageCategory, gender: (athleteGender as "M" | "F") || "M" });
      }
      case "laser_run": {
        const s = parseLaserRunSeconds(raw);
        if (s <= 0) return null;
        return calculateLaserRun({ finishTimeSeconds: s, penaltySeconds: 0, ageCategory });
      }
      case "riding": {
        const k = parseInt(raw, 10);
        if (isNaN(k)) return null;
        return calculateRiding({ knockdowns: k, disobediences: 0, timeOverSeconds: 0, otherPenalties: 0 });
      }
      default:
        return null;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <ScoresPrintButton onClick={() => printSheet(`${competition.name} — All Events`, printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${400 + events.length * 150}px` }}>
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10`} rowSpan={2}>#</th>
              <th className={`${cellHeader} text-left`} rowSpan={2}>Athlete</th>
              <th className={`${cellHeader} text-left w-[80px]`} rowSpan={2}>Country</th>
              {events.map((ev) => (
                <th key={ev.discipline} className={`${cellHeader} text-center`} colSpan={2}>
                  {ALL_EVENTS_LABELS[ev.discipline] || ev.discipline}
                </th>
              ))}
              <th className={`${cellHeader} text-center bg-[#E8EDF0]`} rowSpan={2}>Total Pts</th>
            </tr>
            <tr>
              {events.map((ev) => (
                <Fragment key={ev.discipline}>
                  <th className={`${cellHeader} text-center text-[10px] w-[100px]`}>
                    {ALL_EVENTS_INPUT_META[ev.discipline]?.hint || "input"}
                  </th>
                  <th className={`${cellHeader} text-center text-[10px] w-[70px] bg-[#EBF0F0]`}>pts</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              let totalPts = 0;
              let hasAny = false;
              const cells = events.map((ev) => {
                const meta = ALL_EVENTS_INPUT_META[ev.discipline];
                const raw = getValue(ev.discipline, athleteId, meta?.field || "value");
                const pts = computePoints(ev.discipline, raw, athlete.gender);
                if (pts !== null) { totalPts += Math.round(pts); hasAny = true; }
                return { discipline: ev.discipline, raw, pts };
              });
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellReadonlyStyle}>{athlete.firstName} {athlete.lastName}</td>
                  <td className={`${cellReadonlyStyle} text-[#787774]`}>{athlete.country}</td>
                  {cells.map((c) => (
                    <Fragment key={c.discipline}>
                      <td className={`${cellValue} text-center`}>
                        {c.raw || <span className="text-[#C4C4C0]">—</span>}
                      </td>
                      <td className={`${cellBase} bg-[#F5F8FA] text-center font-semibold ${c.pts !== null ? "text-[#37352F]" : "text-[#C4C4C0]"}`}>
                        {c.pts !== null ? Math.round(c.pts) : "—"}
                      </td>
                    </Fragment>
                  ))}
                  <td className={`border border-[#C8C8C5] bg-[#E8F4EC] px-3 py-2 text-sm font-bold font-mono text-center ${hasAny ? "text-[#37352F]" : "text-[#C4C4C0]"}`}>
                    {hasAny ? totalPts : "—"}
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

// ─── Read-only Fencing Ranking ──────────────────────────────────────────────

function ReadonlyFencingRanking({ athletes, getValue }: ReadonlyEntryProps) {
  const params = getFencingRankingParams(athletes.length);
  const disc = "fencing_ranking";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Competitors: <strong>{athletes.length}</strong> &middot; Total Bouts: <strong>{params.totalBouts}</strong> &middot; Threshold: <strong>{params.victoriesFor250}</strong> &middot; Pts/Victory: <strong>{params.valuePerVictory}</strong>
        </div>
        <ScoresPrintButton onClick={() => printSheet("Fencing Ranking", printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10`}>#</th>
              <th className={`${cellHeader} text-left`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[140px]`}>Victories</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const v = getValue(disc, athleteId, "victories");
              const pts = v ? calculateFencingRanking({ victories: parseInt(v, 10) || 0, totalBouts: params.totalBouts }) : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellReadonlyStyle}>{athlete.firstName} {athlete.lastName}</td>
                  <td className={`${cellReadonlyStyle} text-[#787774]`}>{athlete.country}</td>
                  <td className={`${cellValue} text-center`}>{v || <span className="text-[#C4C4C0]">—</span>}</td>
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── Read-only Fencing DE ───────────────────────────────────────────────────

function ReadonlyFencingDE({ athletes, getValue }: ReadonlyEntryProps) {
  const disc = "fencing_de";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <ScoresPrintButton onClick={() => printSheet("Fencing DE", printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10`}>#</th>
              <th className={`${cellHeader} text-left`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[140px]`}>Placement</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const p = getValue(disc, athleteId, "placement");
              const pts = p ? calculateFencingDE({ placement: parseInt(p, 10) || 0 }) : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellReadonlyStyle}>{athlete.firstName} {athlete.lastName}</td>
                  <td className={`${cellReadonlyStyle} text-[#787774]`}>{athlete.country}</td>
                  <td className={`${cellValue} text-center`}>{p || <span className="text-[#C4C4C0]">—</span>}</td>
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── Read-only Obstacle ─────────────────────────────────────────────────────

function ReadonlyObstacle({ athletes, getValue }: ReadonlyEntryProps) {
  const disc = "obstacle";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Base: <strong>15.00s = 400 pts</strong> &middot; 0.33s per point
        </div>
        <ScoresPrintButton onClick={() => printSheet("Obstacle", printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10`}>#</th>
              <th className={`${cellHeader} text-left`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[140px]`}>Time (s)</th>
              <th className={`${cellHeader} text-center w-[120px]`}>Penalties</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const t = getValue(disc, athleteId, "time");
              const p = getValue(disc, athleteId, "penalties");
              const pts = t ? calculateObstacle({ timeSeconds: parseFloat(t) || 0, penaltyPoints: parseInt(p || "0", 10) }) : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellReadonlyStyle}>{athlete.firstName} {athlete.lastName}</td>
                  <td className={`${cellReadonlyStyle} text-[#787774]`}>{athlete.country}</td>
                  <td className={`${cellValue} text-center`}>{t || <span className="text-[#C4C4C0]">—</span>}</td>
                  <td className={`${cellValue} text-center`}>{p || <span className="text-[#C4C4C0]">0</span>}</td>
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── Read-only Swimming ─────────────────────────────────────────────────────

function ReadonlySwimming({ athletes, ageCategory, getValue, competitionId }: ReadonlyEntryProps & { ageCategory: AgeCategory; competitionId: string }) {
  const disc = "swimming";
  const isYouth = ageCategory === "U9" || ageCategory === "U11";
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch published swim seeding
  const { data: seedingData } = useSWR<{ seeding: { published: boolean; heats: { heatNumber: number; assignments: { lane: number; athleteId: string; firstName: string; lastName: string; country: string; ageCategory: string; gender: string; seedTime: string; seedHundredths: number }[] }[] } | null }>(
    `/api/competitions/${competitionId}/swim-seeding`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const publishedSeeding = seedingData?.seeding?.published ? seedingData.seeding : null;

  return (
    <div>
      {/* Published Swim Seeding */}
      {publishedSeeding && (
        <div className="mb-4 border border-[#B8DCE9] rounded-[4px] bg-[#F0F7FA] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download size={14} className="text-[#0B6E99]" />
            <span className="text-sm font-semibold text-[#0B6E99]">Heat Seeding</span>
          </div>
          <div className="space-y-3">
            {publishedSeeding.heats.map((heat) => (
              <div key={heat.heatNumber} className="bg-white border border-[#D5D5D2] rounded-sm overflow-hidden">
                <div className="px-3 py-1.5 bg-[#E8F4F8] border-b border-[#B8DCE9]">
                  <span className="text-xs font-semibold text-[#0B6E99]">
                    Heat {heat.heatNumber}
                    {heat.heatNumber === publishedSeeding.heats.length && publishedSeeding.heats.length > 1 ? " (Fastest)" : ""}
                    {heat.heatNumber === 1 && publishedSeeding.heats.length > 1 ? " (Slowest)" : ""}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[500px]">
                    <thead>
                      <tr>
                        <th className={`${cellHeader} text-center w-16`}>Lane</th>
                        <th className={`${cellHeader} text-left`}>Athlete</th>
                        <th className={`${cellHeader} text-left w-[80px]`}>Country</th>
                        <th className={`${cellHeader} text-center w-[100px]`}>Seed Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heat.assignments.map((a) => (
                        <tr key={a.athleteId}>
                          <td className={`${cellBase} text-center font-bold`}>{a.lane}</td>
                          <td className={cellReadonlyStyle}>{a.firstName} {a.lastName}</td>
                          <td className={`${cellReadonlyStyle} text-[#787774]`}>{a.country}</td>
                          <td className={`${cellBase} text-center font-mono ${a.seedTime === "NT" ? "text-[#9B9A97]" : "text-[#0B6E99] font-semibold"}`}>
                            {a.seedTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scores Table */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          {isYouth ? "50m" : "100m"} &middot; Base: <strong>{isYouth ? "0:45.00" : "1:10.00"} = 250 pts</strong> &middot; {isYouth ? "0.50" : "0.20"}s per point
        </div>
        <ScoresPrintButton onClick={() => printSheet("Swimming", printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10`}>#</th>
              <th className={`${cellHeader} text-left`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[160px]`}>Time (MM:SS.hh)</th>
              <th className={`${cellHeader} text-center w-[120px]`}>Penalties</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const t = getValue(disc, athleteId, "time");
              const p = getValue(disc, athleteId, "penalties");
              const hundredths = t ? parseSwimmingHundredths(t) : 0;
              const pts = t && hundredths > 0
                ? calculateSwimming({ timeHundredths: hundredths, penaltyPoints: parseInt(p || "0", 10), ageCategory, gender: (athlete.gender as "M" | "F") || "M" })
                : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellReadonlyStyle}>{athlete.firstName} {athlete.lastName}</td>
                  <td className={`${cellReadonlyStyle} text-[#787774]`}>{athlete.country}</td>
                  <td className={`${cellValue} text-center`}>{t || <span className="text-[#C4C4C0]">—</span>}</td>
                  <td className={`${cellValue} text-center`}>{p || <span className="text-[#C4C4C0]">0</span>}</td>
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── Read-only Laser Run ────────────────────────────────────────────────────

function ReadonlyLaserRun({
  athletes,
  ageCategory,
  handicapData,
  getValue,
}: ReadonlyEntryProps & { ageCategory: AgeCategory; handicapData?: { handicapStarts: HandicapResult[] } }) {
  const handicapMap = new Map(
    handicapData?.handicapStarts?.map((h) => [h.athleteId, h]) || []
  );

  const sortedAthletes = [...athletes].sort((a, b) => {
    const ha = handicapMap.get(a.athleteId);
    const hb = handicapMap.get(b.athleteId);
    return (ha?.startDelay ?? 999) - (hb?.startDelay ?? 999);
  });

  const disc = "laser_run";
  const printRef = useRef<HTMLDivElement>(null);

  const targetTime =
    ageCategory === "U17" ? "10:30 (630s)"
    : ageCategory === "U15" ? "7:40 (460s)"
    : "13:20 (800s)";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Category: <strong>{ageCategory}</strong> &middot; Target: <strong>{targetTime} = 500 pts</strong> &middot; 1s = 1pt
        </div>
        <ScoresPrintButton onClick={() => printSheet("Laser Run", printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10`}>#</th>
              <th className={`${cellHeader} text-left`}>Athlete</th>
              <th className={`${cellHeader} text-left w-[80px]`}>Country</th>
              <th className={`${cellHeader} text-center w-[90px]`}>Start</th>
              <th className={`${cellHeader} text-center w-[70px]`}>Gate</th>
              <th className={`${cellHeader} text-center w-[60px]`}>Stn</th>
              <th className={`${cellHeader} text-center w-[130px]`}>Finish Time</th>
              <th className={`${cellHeader} text-center w-[100px]`}>Pen. (s)</th>
              <th className={`${cellHeader} text-right w-[110px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {sortedAthletes.map(({ athleteId, athlete }, idx) => {
              const handicap = handicapMap.get(athleteId);
              const ft = getValue(disc, athleteId, "finishTime");
              const p = getValue(disc, athleteId, "penalties");
              const finishSec = ft ? parseLaserRunSeconds(ft) : 0;
              const pts = ft && finishSec > 0
                ? calculateLaserRun({ finishTimeSeconds: finishSec, penaltySeconds: parseInt(p || "0", 10), ageCategory })
                : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellReadonlyStyle}>{athlete.firstName} {athlete.lastName}</td>
                  <td className={`${cellReadonlyStyle} text-[#787774]`}>{athlete.country}</td>
                  <td className={`${cellBase} bg-[#F5F0FA] text-center text-[#6940A5] text-xs`}>
                    {handicap?.startTimeFormatted || "—"}
                    {handicap?.isPackStart && <span className="text-[#9B9A97]"> *</span>}
                  </td>
                  <td className={`${cellBase} bg-[#FAFAF8] text-center text-xs text-[#787774]`}>
                    {handicap?.isPackStart ? "PACK" : handicap?.gateAssignment || "—"}
                  </td>
                  <td className={`${cellBase} bg-[#FAFAF8] text-center text-xs`}>
                    {handicap ? `#${handicap.shootingStation}` : "—"}
                  </td>
                  <td className={`${cellValue} text-center`}>{ft || <span className="text-[#C4C4C0]">—</span>}</td>
                  <td className={`${cellValue} text-center`}>{p || <span className="text-[#C4C4C0]">0</span>}</td>
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── Read-only Riding ───────────────────────────────────────────────────────

function ReadonlyRiding({ athletes, getValue }: ReadonlyEntryProps) {
  const disc = "riding";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Base: <strong>300 pts</strong> (clear round)
        </div>
        <ScoresPrintButton onClick={() => printSheet("Riding", printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10`}>#</th>
              <th className={`${cellHeader} text-left`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[110px]`}>Knockdowns</th>
              <th className={`${cellHeader} text-center w-[120px]`}>Disobediences</th>
              <th className={`${cellHeader} text-center w-[110px]`}>Time Over (s)</th>
              <th className={`${cellHeader} text-center w-[100px]`}>Other</th>
              <th className={`${cellHeader} text-right w-[110px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const k = getValue(disc, athleteId, "knockdowns");
              const d = getValue(disc, athleteId, "disobediences");
              const t = getValue(disc, athleteId, "timeOver");
              const o = getValue(disc, athleteId, "other");
              const hasInput = k || d || t;
              const pts = hasInput
                ? calculateRiding({
                    knockdowns: parseInt(k || "0", 10),
                    disobediences: parseInt(d || "0", 10),
                    timeOverSeconds: parseInt(t || "0", 10),
                    otherPenalties: parseInt(o || "0", 10),
                  })
                : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellReadonlyStyle}>{athlete.firstName} {athlete.lastName}</td>
                  <td className={`${cellReadonlyStyle} text-[#787774]`}>{athlete.country}</td>
                  <td className={`${cellValue} text-center`}>{k || <span className="text-[#C4C4C0]">0</span>}</td>
                  <td className={`${cellValue} text-center`}>{d || <span className="text-[#C4C4C0]">0</span>}</td>
                  <td className={`${cellValue} text-center`}>{t || <span className="text-[#C4C4C0]">0</span>}</td>
                  <td className={`${cellValue} text-center`}>{o || <span className="text-[#C4C4C0]">0</span>}</td>
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── Athletes Tab (with category sub-tabs) ──────────────────────────────────

function AthletesTab({
  ageCategory,
  athletes,
}: {
  ageCategory: string;
  athletes: { athleteId: string; ageCategory: string | null; athlete: Athlete; status: string }[];
}) {
  // Parse comma-separated age categories from the competition
  const categories = ageCategory
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const [activeCategory, setActiveCategory] = useState("_all");
  const [activeGender, setActiveGender] = useState("_all");

  // Build sub-tabs: "All" + one per category
  const categoryTabs = [
    { id: "_all", label: `All (${athletes.length})` },
    ...categories.map((cat) => {
      const count = athletes.filter((a) => (a.ageCategory || a.athlete.ageCategory) === cat).length;
      return { id: cat, label: `${cat} (${count})` };
    }),
  ];

  const maleCount = athletes.filter((a) => a.athlete.gender === "M").length;
  const femaleCount = athletes.filter((a) => a.athlete.gender === "F").length;

  const genderTabs = [
    { id: "_all", label: `All (${athletes.length})` },
    { id: "M", label: `Male (${maleCount})` },
    { id: "F", label: `Female (${femaleCount})` },
  ];

  // Filter athletes by selected category and gender
  let filtered = activeCategory === "_all"
    ? athletes
    : athletes.filter((a) => (a.ageCategory || a.athlete.ageCategory) === activeCategory);
  if (activeGender !== "_all") {
    filtered = filtered.filter((a) => a.athlete.gender === activeGender);
  }

  // Sort alphabetically by last name
  const sorted = [...filtered].sort((a, b) =>
    a.athlete.lastName.localeCompare(b.athlete.lastName)
  );

  return (
    <div>
      {/* Gender + Category filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Gender</span>
          {genderTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGender(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                activeGender === tab.id
                  ? "bg-[#37352F] text-white border-[#37352F]"
                  : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {categories.length > 1 && <div className="hidden sm:block w-px h-6 bg-[#E9E9E7]" />}

        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Category</span>
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                  activeCategory === tab.id
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-[#9B9A97] text-sm">
          No athletes in this category
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-[#E9E9E7] rounded-[4px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F6F3] border-b border-[#E9E9E7]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase w-10">
                    #
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
                    Name
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase w-[80px]">
                    Country
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase w-[80px]">
                    Gender
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase w-[100px]">
                    Category
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
                    Club
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase w-[90px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ athleteId, ageCategory: compAgeCategory, athlete, status }, idx) => (
                  <tr
                    key={athleteId}
                    className="border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#FAFAF8] transition-colors"
                  >
                    <td className="py-2.5 px-3 text-[#9B9A97] font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#37352F]">
                      <Link href={`/athletes/${athleteId}`} className="hover:text-[#0B6E99] hover:underline transition-colors">
                        {athlete.firstName} {athlete.lastName}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-[#787774]">
                      {athlete.country}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#787774]">
                      {athlete.gender}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-[#F0F0ED] text-[#5A5A57]">
                        {compAgeCategory || athlete.ageCategory}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#9B9A97]">
                      {athlete.club || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          status === "checked-in"
                            ? "bg-[#DBEDDB] text-[#0F7B6C]"
                            : status === "absent" || status === "scratched"
                              ? "bg-[#FBE4E4] text-[#E03E3E]"
                              : "bg-[#F0F0ED] text-[#787774]"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-[#E9E9E7] border border-[#E9E9E7] rounded-[4px]">
            {sorted.map(({ athleteId, ageCategory: compAgeCategory, athlete, status }, idx) => (
              <div
                key={athleteId}
                className="px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-[#9B9A97] font-mono flex-shrink-0">{idx + 1}</span>
                    <Link href={`/athletes/${athleteId}`} className="text-sm font-medium text-[#37352F] truncate hover:text-[#0B6E99] hover:underline transition-colors">
                      {athlete.firstName} {athlete.lastName}
                    </Link>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 ml-2 ${
                      status === "checked-in"
                        ? "bg-[#DBEDDB] text-[#0F7B6C]"
                        : status === "absent" || status === "scratched"
                          ? "bg-[#FBE4E4] text-[#E03E3E]"
                          : "bg-[#F0F0ED] text-[#787774]"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="text-[11px] text-[#9B9A97] mt-0.5">
                  {athlete.country} · {athlete.gender} · {compAgeCategory || athlete.ageCategory}
                  {athlete.club && ` · ${athlete.club}`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Schedule Tab ────────────────────────────────────────────────────────────

function ScheduleTab({ events, competitionId }: { events: Event[]; competitionId: string }) {
  const grouped = events.reduce(
    (acc, event) => {
      const day = event.dayLabel || "Unscheduled";
      if (!acc[day]) acc[day] = [];
      acc[day].push(event);
      return acc;
    },
    {} as Record<string, Event[]>
  );

  function formatTime(iso: string | null) {
    if (!iso) return "TBD";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([day, dayEvents]) => (
        <div key={day}>
          <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
            {day}
          </h3>
          <div className="divide-y divide-[#E9E9E7]">
            <div className="hidden md:grid grid-cols-[80px_1fr_1fr] gap-4 pb-2 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
              <span>Start</span>
              <span>Event</span>
              <span>Status</span>
            </div>
            {dayEvents.map((event) => (
              <div key={event.id} className="flex flex-col gap-1 py-3 md:grid md:grid-cols-[80px_1fr_1fr] md:gap-4 md:items-center">
                <div className="flex items-center gap-2 md:block">
                  <span className="text-sm font-mono text-[#787774]">
                    {formatTime(event.scheduledStart)}
                  </span>
                  <StatusBadge status={event.status} />
                </div>
                <Link
                  href={`/competitions/${competitionId}/events/${event.id}`}
                  className="text-sm text-[#0B6E99] hover:underline"
                >
                  {DISCIPLINE_NAMES[event.discipline] || event.discipline}
                </Link>
                <div className="hidden md:flex items-center gap-2">
                  <StatusBadge status={event.status} />
                  {event.completedAt && (
                    <span className="text-xs text-[#9B9A97]">
                      at {formatTime(event.completedAt)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard Tab ─────────────────────────────────────────────────────────

function LeaderboardTab({ competitionId, ageCategory }: { competitionId: string; ageCategory: string }) {
  const { data } = useSWR<{ entries: LeaderboardEntry[] }>(
    `/api/competitions/${competitionId}/leaderboard`,
    fetcher,
    { refreshInterval: 3000 }
  );

  const { data: handicapData } = useSWR<{ handicapStarts: HandicapResult[] }>(
    `/api/competitions/${competitionId}/handicap`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});
  const [activeGender, setActiveGender] = useState("_all");
  const [activeCategory, setActiveCategory] = useState("_all");

  const categories = ageCategory.split(",").map((c) => c.trim()).filter(Boolean);
  const hasMultipleCategories = categories.length > 1;

  useEffect(() => {
    if (data?.entries) {
      const timeout = setTimeout(() => {
        const ranks: Record<string, number> = {};
        data.entries.forEach((e) => {
          ranks[e.athleteId] = e.rank;
        });
        setPrevRanks(ranks);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-[#F7F6F3] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const handicapMap = new Map(
    handicapData?.handicapStarts?.map((h) => [h.athleteId, h]) || []
  );

  // Filter entries
  let filtered = data.entries;
  if (activeGender !== "_all") {
    filtered = filtered.filter((e) => e.gender === activeGender);
  }
  if (activeCategory !== "_all") {
    filtered = filtered.filter((e) => e.ageCategory === activeCategory);
  }

  // Re-rank filtered entries
  const ranked = filtered.map((entry, i) => ({ ...entry, filteredRank: i + 1 }));

  const maleCount = data.entries.filter((e) => e.gender === "M").length;
  const femaleCount = data.entries.filter((e) => e.gender === "F").length;

  const genderTabs = [
    { id: "_all", label: `All (${data.entries.length})` },
    { id: "M", label: `Male (${maleCount})` },
    { id: "F", label: `Female (${femaleCount})` },
  ];

  const categoryTabs = [
    { id: "_all", label: `All (${data.entries.length})` },
    ...categories.map((cat) => {
      const count = data.entries.filter((e) => e.ageCategory === cat).length;
      return { id: cat, label: `${cat} (${count})` };
    }),
  ];

  const isFiltered = activeGender !== "_all" || activeCategory !== "_all";

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Gender</span>
          {genderTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGender(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                activeGender === tab.id
                  ? "bg-[#37352F] text-white border-[#37352F]"
                  : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hasMultipleCategories && <div className="hidden sm:block w-px h-6 bg-[#E9E9E7]" />}

        {hasMultipleCategories && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Category</span>
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                  activeCategory === tab.id
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="hidden sm:block ml-auto text-xs text-[#9B9A97]">
          Auto-refreshing every 3s
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#E9E9E7] rounded-[4px]">
          <p className="text-sm text-[#9B9A97]">No athletes in this category</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase border-b-2 border-[#E9E9E7]">
                  <th className="text-left py-3 px-4 w-16">Rank</th>
                  {isFiltered && <th className="text-left py-3 px-3 w-14 text-[#787774]">Overall</th>}
                  <th className="text-left py-3 px-4">Athlete</th>
                  <th className="text-right py-3 px-4 font-mono">Fencing</th>
                  <th className="text-right py-3 px-4 font-mono">Fencing DE</th>
                  <th className="text-right py-3 px-4 font-mono">Obstacle</th>
                  <th className="text-right py-3 px-4 font-mono">Swimming</th>
                  <th className="text-right py-3 px-4 font-mono">L-Run</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((entry) => {
                  const prevRank = prevRanks[entry.athleteId];
                  const rankChange =
                    prevRank !== undefined ? prevRank - entry.rank : 0;
                  const handicap = handicapMap.get(entry.athleteId);

                  return (
                    <tr
                      key={entry.athleteId}
                      className="border-b border-[#E9E9E7] hover:bg-[#EFEFEF] transition-colors duration-150"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[#37352F] text-base">
                            {isFiltered ? entry.filteredRank : entry.rank}
                          </span>
                          {rankChange > 0 && (
                            <ArrowUp size={14} className="text-[#0F7B6C]" />
                          )}
                          {rankChange < 0 && (
                            <ArrowDown size={14} className="text-[#E03E3E]" />
                          )}
                        </div>
                      </td>
                      {isFiltered && (
                        <td className="py-4 px-3 text-xs text-[#9B9A97] font-mono">
                          #{entry.rank}
                        </td>
                      )}
                      <td className="py-4 px-4">
                        <div>
                          <span className="text-[#37352F] font-medium text-[15px]">
                            {entry.athleteName}
                          </span>
                          <span className="text-[#9B9A97] ml-3 text-xs">
                            {entry.country}
                          </span>
                        </div>
                        {handicap && (
                          <div className="text-xs text-[#6940A5] mt-1">
                            Start: {handicap.startTimeFormatted} · Gate {handicap.gateAssignment} · Stn #{handicap.shootingStation}
                            {handicap.isPackStart && " (Pack)"}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-[#37352F]">
                        {entry.fencingRanking !== null ? Math.round(entry.fencingRanking) : <span className="text-[#9B9A97]">—</span>}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-[#37352F]">
                        {entry.fencingDE !== null ? Math.round(entry.fencingDE) : <span className="text-[#9B9A97]">—</span>}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-[#37352F]">
                        {entry.obstacle !== null ? Math.round(entry.obstacle) : <span className="text-[#9B9A97]">—</span>}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-[#37352F]">
                        {entry.swimming !== null ? Math.round(entry.swimming) : <span className="text-[#9B9A97]">—</span>}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-[#37352F]">
                        {entry.laserRun !== null ? Math.round(entry.laserRun) : <span className="text-[#9B9A97]">—</span>}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-[#37352F] text-base">
                        {Math.round(entry.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {ranked.map((entry) => {
              const prevRank = prevRanks[entry.athleteId];
              const rankChange = prevRank !== undefined ? prevRank - entry.rank : 0;
              const handicap = handicapMap.get(entry.athleteId);
              const disciplines = [
                { label: "Fencing", value: entry.fencingRanking },
                { label: "Fence DE", value: entry.fencingDE },
                { label: "Obstacle", value: entry.obstacle },
                { label: "Swim", value: entry.swimming },
                { label: "L-Run", value: entry.laserRun },
              ];
              return (
                <div key={entry.athleteId} className="border border-[#E9E9E7] rounded-[6px] p-3.5 bg-white">
                  {/* Header: rank + name */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base font-bold text-[#37352F] flex-shrink-0">#{isFiltered ? entry.filteredRank : entry.rank}</span>
                      {isFiltered && <span className="text-[11px] text-[#9B9A97] flex-shrink-0">(#{entry.rank})</span>}
                      {rankChange > 0 && <ArrowUp size={14} className="text-[#0F7B6C] flex-shrink-0" />}
                      {rankChange < 0 && <ArrowDown size={14} className="text-[#E03E3E] flex-shrink-0" />}
                    </div>
                    <span className="text-base font-bold text-[#37352F] flex-shrink-0">{Math.round(entry.total)} pts</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-sm font-medium text-[#37352F]">{entry.athleteName}</span>
                    <span className="text-xs text-[#9B9A97] ml-1.5">{entry.country}</span>
                  </div>
                  {handicap && (
                    <div className="text-xs text-[#6940A5] mb-3">
                      Start: {handicap.startTimeFormatted} · Gate {handicap.gateAssignment} · Stn #{handicap.shootingStation}
                      {handicap.isPackStart && " (Pack)"}
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-1.5">
                    {disciplines.map((d) => (
                      <div key={d.label} className="bg-[#FBFBFA] rounded-[4px] py-1.5 px-1 text-center">
                        <div className="text-[9px] text-[#9B9A97] leading-tight">{d.label}</div>
                        <div className="text-xs font-mono font-medium text-[#37352F] mt-0.5">
                          {d.value !== null ? Math.round(d.value) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Live Feed Tab ───────────────────────────────────────────────────────────

function LiveFeedTab({ competitionId }: { competitionId: string }) {
  const { data: feed } = useSWR<FeedEntry[]>(
    `/api/competitions/${competitionId}/live-feed`,
    fetcher,
    { refreshInterval: 3000 }
  );

  if (!feed) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-[#F7F6F3] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  function formatTimestamp(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[#9B9A97]">Auto-refreshing every 3s</span>
      </div>
      <div className="divide-y divide-[#E9E9E7]">
        {feed.map((entry) => (
          <div
            key={entry.id}
            className="py-3 hover:bg-[#EFEFEF] px-3 -mx-3 rounded-[3px] transition-colors duration-150"
          >
            {/* Desktop layout */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-xs text-[#9B9A97] font-mono w-16 flex-shrink-0">
                {formatTimestamp(entry.timestamp)}
              </span>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: disciplineColors[entry.discipline] || "#9B9A97" }}
              />
              <span className="text-xs text-[#787774] w-24 flex-shrink-0">
                {DISCIPLINE_NAMES[entry.discipline] || entry.discipline}
              </span>
              <span className="text-sm text-[#37352F] font-medium flex-1">
                {entry.athleteName}
                <span className="text-[#9B9A97] text-xs ml-1">{entry.country}</span>
              </span>
              <span className="text-sm text-[#787774] font-mono">{entry.rawInput}</span>
              <span className="text-[#787774] text-xs">→</span>
              <span className="text-sm text-[#37352F] font-semibold font-mono w-16 text-right">
                {Math.round(entry.mpPoints)} pts
              </span>
            </div>
            {/* Mobile layout */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: disciplineColors[entry.discipline] || "#9B9A97" }}
                  />
                  <span className="text-sm font-medium text-[#37352F]">{entry.athleteName}</span>
                  <span className="text-[10px] text-[#9B9A97]">{entry.country}</span>
                </div>
                <span className="text-sm font-bold font-mono text-[#37352F]">
                  {Math.round(entry.mpPoints)} pts
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#787774]">
                <span className="font-mono">{formatTimestamp(entry.timestamp)}</span>
                <span>·</span>
                <span>{DISCIPLINE_NAMES[entry.discipline] || entry.discipline}</span>
                <span>·</span>
                <span className="font-mono">{entry.rawInput}</span>
              </div>
            </div>
          </div>
        ))}
        {feed.length === 0 && (
          <div className="text-center py-8 text-[#9B9A97] text-sm">
            No scores recorded yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─── My Athletes Tab ─────────────────────────────────────────────────────────

function MyAthletesTab({
  competitionId,
  athletes,
}: {
  competitionId: string;
  athletes: { athleteId: string; athlete: Athlete; status: string }[];
}) {
  const [bookmarked, setBookmarked] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`myAthletes_${competitionId}`);
    if (stored) setBookmarked(JSON.parse(stored));
  }, [competitionId]);

  const toggleBookmark = (athleteId: string) => {
    const updated = bookmarked.includes(athleteId)
      ? bookmarked.filter((id) => id !== athleteId)
      : [...bookmarked, athleteId];
    setBookmarked(updated);
    localStorage.setItem(`myAthletes_${competitionId}`, JSON.stringify(updated));
  };

  const { data: leaderboard } = useSWR<{ entries: LeaderboardEntry[] }>(
    `/api/competitions/${competitionId}/leaderboard`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const scoreMap = new Map(
    leaderboard?.entries?.map((e) => [e.athleteId, e]) || []
  );

  const bookmarkedAthletes = athletes.filter((a) =>
    bookmarked.includes(a.athleteId)
  );

  // Sort athlete list: bookmarked ones at top, then alphabetical
  const sortedAthletes = [...athletes].sort((a, b) => {
    const aBookmarked = bookmarked.includes(a.athleteId);
    const bBookmarked = bookmarked.includes(b.athleteId);
    if (aBookmarked && !bBookmarked) return -1;
    if (!aBookmarked && bBookmarked) return 1;
    return a.athlete.lastName.localeCompare(b.athlete.lastName);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm text-[#37352F] font-medium">
          My Athletes ({bookmarkedAthletes.length})
        </h2>
      </div>

      {/* Bookmarked athlete cards */}
      {bookmarkedAthletes.length > 0 && (
        <div className="space-y-4 mb-8">
          {bookmarkedAthletes.map(({ athleteId, athlete }) => {
            const scores = scoreMap.get(athleteId);
            return (
              <div
                key={athleteId}
                className="border border-[#E9E9E7] rounded-[4px] p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => toggleBookmark(athleteId)}
                      className="text-[#DFAB01] hover:text-[#9B9A97] transition-colors flex-shrink-0"
                    >
                      <Star size={16} className="fill-[#DFAB01] text-[#DFAB01]" />
                    </button>
                    <span className="text-[15px] font-medium text-[#37352F] truncate">
                      {athlete.firstName} {athlete.lastName}
                    </span>
                    <span className="text-sm text-[#787774] flex-shrink-0">
                      {athlete.country} · {athlete.ageCategory}
                    </span>
                  </div>
                  {scores && (
                    <span className="text-sm font-semibold text-[#37352F] flex-shrink-0">
                      Rank #{scores.rank} · {Math.round(scores.total)} pts
                    </span>
                  )}
                </div>
                {scores && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 md:gap-2 text-center">
                    {[
                      { label: "Fencing", val: scores.fencingRanking },
                      { label: "Fencing DE", val: scores.fencingDE },
                      { label: "Obstacle", val: scores.obstacle },
                      { label: "Swimming", val: scores.swimming },
                      { label: "L-Run", val: scores.laserRun },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-[#FBFBFA] rounded-[3px] p-1.5 md:p-2">
                        <div className="text-[10px] md:text-xs text-[#9B9A97]">{label}</div>
                        <div className="text-xs md:text-sm font-mono font-medium text-[#37352F]">
                          {val !== null ? Math.round(val) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Athletes list (at the bottom) */}
      <div>
        <p className="text-xs text-[#9B9A97] mb-2">
          Click the star to track an athlete
        </p>
        <div className="divide-y divide-[#E9E9E7] border border-[#E9E9E7] rounded-[4px]">
          {sortedAthletes.map(({ athleteId, athlete }) => {
            const isBookmarked = bookmarked.includes(athleteId);
            return (
              <div
                key={athleteId}
                className="flex items-center gap-3 px-3 py-2 hover:bg-[#EFEFEF] transition-colors"
              >
                <button
                  onClick={() => toggleBookmark(athleteId)}
                  className="text-[#9B9A97] hover:text-[#DFAB01] transition-colors"
                >
                  {isBookmarked ? (
                    <Star size={16} className="fill-[#DFAB01] text-[#DFAB01]" />
                  ) : (
                    <StarOff size={16} />
                  )}
                </button>
                <span className="text-sm text-[#37352F]">
                  {athlete.firstName} {athlete.lastName}
                </span>
                <span className="text-xs text-[#9B9A97]">{athlete.country}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
