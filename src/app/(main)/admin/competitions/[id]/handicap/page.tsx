"use client";

import { use } from "react";
import useSWR from "swr";
import { TopNav } from "@/components/TopNav";
import { CompetitionStatusControl } from "@/components/CompetitionStatusControl";
import { getLaserRunTargetTime, getLaserRunConfig } from "@/lib/scoring/constants";
import type { AgeCategory } from "@/lib/scoring/types";
import { Printer } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export default function HandicapDisplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: compData, mutate: mutateComp } = useSWR(`/api/competitions/${id}`, fetcher);
  const { data: handicapData } = useSWR<{
    ageCategory: string;
    competitionType: string;
    handicapStarts: HandicapResult[];
  }>(`/api/competitions/${id}/handicap`, fetcher, { refreshInterval: 5000 });

  if (!compData || !handicapData) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Loading..." }]} />
        <div className="max-w-[900px] mx-auto px-6 py-12">
          <div className="h-64 bg-[#F7F6F3] rounded animate-pulse" />
        </div>
      </>
    );
  }

  const ageCategory = handicapData.ageCategory as AgeCategory;
  const config = getLaserRunConfig(ageCategory);
  const targetTime = getLaserRunTargetTime(ageCategory);
  const targetMinSec = `${Math.floor(targetTime / 60)}:${(targetTime % 60).toString().padStart(2, "0")}`;

  const staggered = handicapData.handicapStarts.filter((h) => !h.isPackStart);
  const packStarters = handicapData.handicapStarts.filter((h) => h.isPackStart);

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: compData.name, href: `/admin` },
          { label: "Handicap Start" },
        ]}
      />
      <div className="max-w-[900px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold text-[#37352F] tracking-tight mb-2">
            LASER RUN — HANDICAP START TIMES
          </h1>
          <p className="text-sm text-[#787774]">
            {ageCategory} {handicapData.competitionType} · {handicapData.handicapStarts.length} Athletes
          </p>
          <p className="text-sm text-[#6940A5] font-medium mt-1">
            Target Time: {targetMinSec} ({targetTime}s) = 500 pts
          </p>
          {config && (
            <p className="text-xs text-[#9B9A97] mt-1">
              {config.runningSequences} running + {config.shootingSequences} shooting
            </p>
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <CompetitionStatusControl
            competitionId={id}
            status={compData.status}
            onStatusChange={() => mutateComp()}
            variant="inline"
          />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787774] border border-[#E9E9E7] rounded-[3px] hover:bg-[#EFEFEF] transition-colors print:hidden"
          >
            <Printer size={14} />
            Print Start List
          </button>
        </div>

        {/* Staggered Start Table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase border-b border-[#E9E9E7]">
              <th className="text-left py-2 w-20">Start</th>
              <th className="text-center py-2 w-16">Gate</th>
              <th className="text-center py-2 w-16">Station</th>
              <th className="text-left py-2">Athlete</th>
              <th className="text-right py-2 w-20">Pts</th>
              <th className="text-right py-2 w-20">Gap</th>
            </tr>
          </thead>
          <tbody>
            {staggered.map((h, i) => (
              <tr key={h.athleteId} className="border-b border-[#E9E9E7]">
                <td className="py-3 font-mono font-semibold text-[#37352F]">
                  {h.startTimeFormatted}
                </td>
                <td className="py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      h.gateAssignment === "A"
                        ? "bg-[#DDEBF1] text-[#0B6E99]"
                        : h.gateAssignment === "B"
                          ? "bg-[#FAEBDD] text-[#D9730D]"
                          : "bg-[#FBE4E4] text-[#E03E3E]"
                    }`}
                  >
                    {h.gateAssignment}
                  </span>
                </td>
                <td className="py-3 text-center font-mono text-[#787774]">
                  #{h.shootingStation}
                </td>
                <td className="py-3 text-[#37352F] font-medium">
                  {h.athleteName}
                </td>
                <td className="py-3 text-right font-mono text-[#37352F]">
                  {Math.round(h.cumulativePoints)}
                </td>
                <td className="py-3 text-right font-mono text-[#787774]">
                  {i === 0 ? (
                    <span className="text-[#0F7B6C] font-semibold">LEADER</span>
                  ) : (
                    `+${h.startTimeFormatted}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pack Start */}
        {packStarters.length > 0 && (
          <div className="border-t-2 border-[#E9E9E7] pt-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-[#37352F]">
                1:30 PACK START
              </span>
              <span className="text-xs text-[#9B9A97]">
                (raw delay &gt; 90s)
              </span>
            </div>
            <div className="space-y-2">
              {packStarters.map((h) => (
                <div
                  key={h.athleteId}
                  className="flex items-center gap-4 py-2 px-3 bg-[#FBFBFA] rounded-[3px]"
                >
                  <span className="text-xs font-mono text-[#787774] w-12">
                    Stn #{h.shootingStation}
                  </span>
                  <span className="text-sm text-[#37352F] font-medium flex-1">
                    {h.athleteName}
                  </span>
                  <span className="text-sm font-mono text-[#787774]">
                    {Math.round(h.cumulativePoints)} pts
                  </span>
                  <span className="text-xs font-mono text-[#9B9A97]">
                    +{Math.floor(h.rawDelay / 60)}:{(h.rawDelay % 60).toString().padStart(2, "0")}*
                  </span>
                </div>
              ))}
              <p className="text-xs text-[#9B9A97] mt-2 italic">
                * raw delay, capped at 1:30
              </p>
            </div>
          </div>
        )}

        {/* Gate Legend */}
        <div className="mt-8 p-4 bg-[#FBFBFA] rounded-[4px] border border-[#E9E9E7]">
          <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-2">
            Gate Legend
          </h3>
          <div className="flex gap-6 text-sm text-[#787774]">
            <span>
              <span className="inline-block w-5 h-5 rounded text-center text-xs leading-5 bg-[#DDEBF1] text-[#0B6E99] font-medium mr-1">
                A
              </span>
              Primary gate
            </span>
            <span>
              <span className="inline-block w-5 h-5 rounded text-center text-xs leading-5 bg-[#FAEBDD] text-[#D9730D] font-medium mr-1">
                B
              </span>
              Secondary gate
            </span>
            <span>
              <span className="inline-block w-5 h-5 rounded text-center text-xs leading-5 bg-[#FBE4E4] text-[#E03E3E] font-medium mr-1">
                P
              </span>
              Penalty gate
            </span>
          </div>
          <p className="text-xs text-[#9B9A97] mt-2">
            Athletes assemble at gates 1 min before start
          </p>
        </div>
      </div>
    </>
  );
}
