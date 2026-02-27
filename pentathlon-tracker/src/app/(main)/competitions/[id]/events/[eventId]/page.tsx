"use client";

import { useState, use } from "react";
import useSWR from "swr";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { TabBar } from "@/components/TabBar";
import { DISCIPLINE_NAMES } from "@/lib/scoring/constants";
import { Download } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EventData {
  id: string;
  discipline: string;
  status: string;
  competitionId: string;
  competition: {
    name: string;
    ageCategory: string;
  };
}

export default function EventPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id, eventId } = use(params);
  const [activeTab, setActiveTab] = useState("results");

  const { data: competition } = useSWR(`/api/competitions/${id}`, fetcher);
  const { data: leaderboard } = useSWR(
    `/api/competitions/${id}/leaderboard`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const event = competition?.events?.find((e: EventData) => e.id === eventId);

  if (!event || !competition) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/" }, { label: "Loading..." }]} />
        <div className="max-w-[900px] mx-auto px-6 py-12">
          <div className="h-10 w-48 bg-[#F7F6F3] rounded animate-pulse" />
        </div>
      </>
    );
  }

  const disciplineName = DISCIPLINE_NAMES[event.discipline] || event.discipline;

  const tabs = [
    { id: "results", label: "Results" },
    { id: "athletes", label: "Athletes" },
    { id: "format", label: "Format" },
  ];

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: competition.name, href: `/competitions/${id}` },
          { label: disciplineName },
        ]}
      />
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">
          {disciplineName}
        </h1>
        <p className="text-sm text-[#787774] mt-2 mb-8 flex items-center gap-2">
          <StatusBadge status={event.status} />
          <span>
            {competition.competitionAthletes?.length || 0} athletes
          </span>
        </p>

        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === "results" && (
            <ResultsTab
              discipline={event.discipline}
              entries={leaderboard?.entries || []}
            />
          )}
          {activeTab === "athletes" && (
            <AthletesTab athletes={competition.competitionAthletes || []} />
          )}
          {activeTab === "format" && (
            <FormatTab
              discipline={event.discipline}
              ageCategory={competition.ageCategory}
              athleteCount={competition.competitionAthletes?.length || 0}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ResultsTab({
  discipline,
  entries,
}: {
  discipline: string;
  entries: {
    athleteId: string;
    athleteName: string;
    country: string;
    fencingRanking: number | null;
    fencingDE: number | null;
    obstacle: number | null;
    swimming: number | null;
    laserRun: number | null;
    total: number;
  }[];
}) {
  const getPoints = (entry: typeof entries[0]) => {
    switch (discipline) {
      case "fencing_ranking": return entry.fencingRanking;
      case "fencing_de": return entry.fencingDE;
      case "obstacle": return entry.obstacle;
      case "swimming": return entry.swimming;
      case "laser_run": return entry.laserRun;
      default: return null;
    }
  };

  const sorted = [...entries]
    .filter((e) => getPoints(e) !== null)
    .sort((a, b) => (getPoints(b) ?? 0) - (getPoints(a) ?? 0));

  const handleExportCSV = () => {
    const header = "Place,Athlete,Country,MP Points\n";
    const rows = sorted
      .map((e, i) => `${i + 1},${e.athleteName},${e.country},${Math.round(getPoints(e) ?? 0)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${discipline}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#37352F]">
          Results ({sorted.length} athletes)
        </h3>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-xs text-[#787774] hover:text-[#37352F] transition-colors"
        >
          <Download size={14} />
          Download CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase border-b border-[#E9E9E7]">
              <th className="text-left py-2 pr-3 w-16">Place</th>
              <th className="text-left py-2 pr-3">Athlete</th>
              <th className="text-left py-2 pr-3 w-20">Country</th>
              <th className="text-right py-2 w-24">MP Points</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => (
              <tr
                key={entry.athleteId}
                className="border-b border-[#E9E9E7] hover:bg-[#EFEFEF] transition-colors"
              >
                <td className="py-2.5 pr-3 font-medium text-[#37352F]">{i + 1}</td>
                <td className="py-2.5 pr-3 text-[#37352F]">{entry.athleteName}</td>
                <td className="py-2.5 pr-3 text-[#787774]">{entry.country}</td>
                <td className="py-2.5 text-right font-mono font-semibold text-[#37352F]">
                  {Math.round(getPoints(entry) ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AthletesTab({
  athletes,
}: {
  athletes: { athleteId: string; athlete: { firstName: string; lastName: string; country: string; ageCategory: string }; status: string }[];
}) {
  const checkedIn = athletes.filter((a) => a.status === "checked-in").length;
  const absent = athletes.filter((a) => a.status === "absent").length;

  return (
    <div>
      <p className="text-xs text-[#9B9A97] mb-4">
        {athletes.length} Athletes · {checkedIn} checked-in · {absent} absent
      </p>
      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase border-b border-[#E9E9E7]">
            <th className="text-left py-2 pr-3 w-12">Status</th>
            <th className="text-left py-2 pr-3">Athlete</th>
            <th className="text-left py-2 pr-3">Country</th>
            <th className="text-left py-2">Category</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map(({ athleteId, athlete, status }) => (
            <tr
              key={athleteId}
              className="border-b border-[#E9E9E7] hover:bg-[#EFEFEF] transition-colors"
            >
              <td className="py-2.5 pr-3">
                {status === "checked-in" ? (
                  <span className="text-[#0F7B6C]">✓</span>
                ) : (
                  <span className="text-[#E03E3E]">✗</span>
                )}
              </td>
              <td className="py-2.5 pr-3 text-[#37352F]">
                {athlete.firstName} {athlete.lastName}
              </td>
              <td className="py-2.5 pr-3 text-[#787774]">{athlete.country}</td>
              <td className="py-2.5 text-[#787774]">{athlete.ageCategory}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function FormatTab({
  discipline,
  ageCategory,
  athleteCount,
}: {
  discipline: string;
  ageCategory: string;
  athleteCount: number;
}) {
  const totalBouts = athleteCount - 1;
  const victoriesFor250 = Math.round(totalBouts * 0.7);

  const formatBlocks: Record<string, React.ReactNode> = {
    fencing_ranking: (
      <>
        <FormulaBlock
          color="#DFAB01"
          title="Scoring Formula"
          formula="MP points = 250 + (victories - threshold) × value"
          details={[
            `Threshold = round(total_bouts × 0.70)`,
            `Value per victory: from lookup table (3-8 pts)`,
            `This competition: ${athleteCount} athletes`,
            `Total bouts: ${totalBouts}`,
            `Victories for 250: ${victoriesFor250}`,
          ]}
        />
      </>
    ),
    fencing_de: (
      <FormulaBlock
        color="#DFAB01"
        title="Scoring Formula"
        formula="Points by placement (fixed table)"
        details={[
          "1st=250, 2nd=244, 3rd=238, 4th=236",
          "5th=230, 6th=228, 7th=226, 8th=224",
          "9th=218, 10th=216, 11th=214, 12th=212",
          "Eliminated in initial bout = 0 points",
        ]}
      />
    ),
    obstacle: (
      <FormulaBlock
        color="#D9730D"
        title="Scoring Formula"
        formula="MP points = 400 - round((time - 15.00) / 0.33)"
        details={[
          "Base time: 15.00 seconds = 400 MP points",
          "Each 0.33 seconds above base = -1 point",
          "",
          "Penalties:",
          "• First obstacle failure: -10 pts",
          "• Second failure on same obstacle: Elimination",
        ]}
      />
    ),
    swimming: (
      <FormulaBlock
        color="#0B6E99"
        title="Scoring Formula"
        formula="MP points = 250 - floor((time - 1:10.00) / 0.20)"
        details={[
          `Distance: ${ageCategory === "U9" || ageCategory === "U11" ? "50m" : "100m"} Freestyle`,
          `Base time: ${ageCategory === "U9" || ageCategory === "U11" ? "0:45.00" : "1:10.00"} = 250 MP points`,
          `Each ${ageCategory === "U9" || ageCategory === "U11" ? "0.50" : "0.20"} seconds = 1 MP point`,
          "Times banded: .00-.19, .20-.39, .40-.59, .60-.79, .80-.99",
        ]}
      />
    ),
    laser_run: (
      <>
        <FormulaBlock
          color="#6940A5"
          title="Scoring Formula"
          formula="MP points = 500 + (target_time - finish_time)"
          details={[
            "1 second = 1 MP point",
            "Senior/Junior/U19: Target 13:20 (800s) = 500 pts",
            "4 × 600m running + 4 × 5-hit shooting at 10m",
            "",
            "Shooting: 5 hits per series, 50s max",
            "Target zone: 59.5mm diameter",
          ]}
        />
        <FormulaBlock
          color="#6940A5"
          title="Handicap Start"
          formula="Leader starts at 0:00 · 1 MP deficit = 1 second delay"
          details={[
            "Sum all prior event points per athlete",
            "Gate A (primary) / Gate B (secondary) / P (penalty)",
            "Station # = start position (leader = #1)",
            "90+ seconds behind → pack start at 1:30",
            "",
            "First across the finish line wins overall.",
          ]}
        />
      </>
    ),
    riding: (
      <FormulaBlock
        color="#AD1A72"
        title="Scoring Formula (Masters Only)"
        formula="MP points = 300 - total_penalty_points"
        details={[
          "Knockdown: -7 pts each",
          "Disobedience: -10 pts each",
          "Time over: -1 pt per second",
          "Dress infringement: -10 pts each",
        ]}
      />
    ),
  };

  return <div className="space-y-4">{formatBlocks[discipline]}</div>;
}

function FormulaBlock({
  color,
  title,
  formula,
  details,
}: {
  color: string;
  title: string;
  formula: string;
  details: string[];
}) {
  return (
    <div
      className="rounded-[4px] p-4"
      style={{
        borderLeft: `3px solid ${color}`,
        backgroundColor: `${color}10`,
      }}
    >
      <h4 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-2">
        {title}
      </h4>
      <p className="text-sm font-mono text-[#37352F] font-medium mb-3">{formula}</p>
      <div className="space-y-0.5">
        {details.map((d, i) =>
          d === "" ? (
            <div key={i} className="h-2" />
          ) : (
            <p key={i} className="text-sm text-[#787774]">
              {d}
            </p>
          )
        )}
      </div>
    </div>
  );
}
