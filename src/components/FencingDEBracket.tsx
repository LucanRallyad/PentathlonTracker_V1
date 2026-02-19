"use client";

import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import type { DEBracket, DEMatch } from "@/lib/scoring/types";
import { getRoundName, getBracketStats } from "@/lib/scoring/fencing-de-bracket";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { Swords, RotateCcw, Loader2, Trophy, ChevronRight, Printer } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

// ─── Types ──────────────────────────────────────────────────────────────────

interface BracketResponse {
  bracket: DEBracket | null;
  canGenerate: boolean;
  eventId: string;
}

interface FencingDEBracketProps {
  competitionId: string;
  competitionName?: string;
  gender: string;
  ageCategory: string;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function FencingDEBracketView({
  competitionId,
  competitionName,
  gender,
  ageCategory,
}: FencingDEBracketProps) {
  // Include gender + ageCategory in the SWR key so it refetches when filters change
  const { data, mutate, isLoading } = useSWR<BracketResponse>(
    `/api/competitions/${competitionId}/fencing-de-bracket?gender=${gender}&ageCategory=${ageCategory}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DEMatch | null>(null);
  const [savingMatch, setSavingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/fencing-de-bracket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gender, ageCategory }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate bracket");
      }
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate bracket");
    } finally {
      setIsGenerating(false);
    }
  }, [competitionId, gender, ageCategory, mutate]);

  const handleReset = useCallback(async () => {
    if (!confirm("Reset the entire DE bracket? This will clear all match results and scores.")) return;
    setIsResetting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/fencing-de-bracket?gender=${gender}&ageCategory=${ageCategory}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to reset bracket");
      setSelectedMatch(null);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset bracket");
    } finally {
      setIsResetting(false);
    }
  }, [competitionId, gender, ageCategory, mutate]);

  const handleSaveMatch = useCallback(
    async (matchId: string, winnerId: string, score1: number, score2: number) => {
      setSavingMatch(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/competitions/${competitionId}/fencing-de-bracket?gender=${gender}&ageCategory=${ageCategory}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId, winnerId, score1, score2 }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save match");
        }
        setSelectedMatch(null);
        await mutate();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save match");
      } finally {
        setSavingMatch(false);
      }
    },
    [competitionId, gender, ageCategory, mutate]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#9B9A97]" />
        <span className="ml-2 text-sm text-[#9B9A97]">Loading bracket...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-sm text-[#9B9A97]">
        Failed to load bracket data
      </div>
    );
  }

  // No bracket exists yet
  if (!data.bracket) {
    return (
      <div className="border border-dashed border-[#E9E9E7] rounded-[4px] py-12 text-center">
        <Swords size={32} className="mx-auto mb-3 text-[#C4C4C0]" />
        <p className="text-sm text-[#787774] mb-1">No DE bracket generated yet for {gender === "M" ? "Male" : "Female"} {ageCategory}</p>
        {data.canGenerate ? (
          <>
            <p className="text-xs text-[#9B9A97] mb-4">
              Generate a seeded bracket from ranking round results ({gender === "M" ? "Male" : "Female"} {ageCategory} athletes)
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#37352F] rounded-[4px] hover:bg-[#2F2E2B] transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Swords size={14} />
              )}
              {isGenerating ? "Generating..." : "Generate Bracket from Ranking Round"}
            </button>
          </>
        ) : (
          <p className="text-xs text-[#9B9A97]">
            Enter ranking round scores first (need at least 2 athletes)
          </p>
        )}
        {error && (
          <p className="mt-3 text-xs text-[#E03E3E]">{error}</p>
        )}
      </div>
    );
  }

  const bracket = data.bracket;
  const stats = getBracketStats(bracket);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
            Tableau: <strong>{bracket.tableauSize}</strong> &middot;
            Athletes: <strong>{bracket.numCompetitors}</strong> &middot;
            Rounds: <strong>{bracket.rounds.length}</strong> &middot;
            Byes: <strong>{stats.byeCount}</strong> &middot;
            Matches: <strong>{stats.completedMatches - stats.byeCount}/{stats.totalMatches - stats.byeCount}</strong>
          </div>
          {stats.isComplete && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0F7B6C] bg-[#E8F4EC] rounded-sm border border-[#B8E2C8]">
              <Trophy size={12} />
              Complete
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PrintBracketButton bracket={bracket} competitionName={competitionName} />
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E03E3E] border border-[#F0C8C8] rounded-[4px] hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
          >
            {isResetting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RotateCcw size={12} />
            )}
            Reset Bracket
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-[#E03E3E] bg-[#FEF2F2] border border-[#F0C8C8] rounded-sm">
          {error}
        </div>
      )}

      {/* Bracket Visualization */}
      <div className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto p-4 bg-[#FAFAF8]">
          <BracketGrid
            bracket={bracket}
            selectedMatch={selectedMatch}
            onSelectMatch={setSelectedMatch}
          />
        </div>
      </div>

      {/* Match Score Entry Panel */}
      {selectedMatch && !selectedMatch.isBye && selectedMatch.athlete1Id && selectedMatch.athlete2Id && (
        <MatchScoreEntry
          match={selectedMatch}
          onSave={handleSaveMatch}
          onCancel={() => setSelectedMatch(null)}
          isSaving={savingMatch}
        />
      )}

      {/* Final Placements Table (when bracket is complete) */}
      {bracket.placements && stats.isComplete && (
        <PlacementsTable placements={bracket.placements} bracket={bracket} />
      )}
    </div>
  );
}

// ─── Bracket Grid ───────────────────────────────────────────────────────────
// Uses calculated absolute Y positions so each match is perfectly centered
// between its two feeder matches.

const MATCH_HEIGHT = 54;   // height of one match card (two athlete rows + border)
const MATCH_GAP = 12;      // vertical gap between first-round matches
const ROUND_WIDTH = 220;   // horizontal width per round column
const HEADER_HEIGHT = 28;  // height of round header

function BracketGrid({
  bracket,
  selectedMatch,
  onSelectMatch,
}: {
  bracket: DEBracket;
  selectedMatch: DEMatch | null;
  onSelectMatch: (match: DEMatch | null) => void;
}) {
  const totalRounds = bracket.rounds.length;
  const firstRoundCount = bracket.rounds[0].length;

  // Calculate total height needed based on first round
  const totalHeight = firstRoundCount * MATCH_HEIGHT + (firstRoundCount - 1) * MATCH_GAP;

  // Calculate Y positions for every match in every round
  // Round 0: evenly spaced from top
  // Round N: centered between the two feeder matches from round N-1
  const matchPositions: number[][] = [];

  // First round positions
  const round0Positions: number[] = [];
  for (let i = 0; i < firstRoundCount; i++) {
    round0Positions.push(i * (MATCH_HEIGHT + MATCH_GAP));
  }
  matchPositions.push(round0Positions);

  // Subsequent rounds: center between feeders
  for (let r = 1; r < totalRounds; r++) {
    const prevPositions = matchPositions[r - 1];
    const roundPositions: number[] = [];

    for (let i = 0; i < bracket.rounds[r].length; i++) {
      // This match is fed by matches at index i*2 and i*2+1 in the previous round
      const feeder1Y = prevPositions[i * 2];
      const feeder2Y = prevPositions[i * 2 + 1];
      // Center vertically between the two feeders (center of feeder1 to center of feeder2)
      const centerY = (feeder1Y + feeder2Y) / 2;
      roundPositions.push(centerY);
    }

    matchPositions.push(roundPositions);
  }

  return (
    <div
      className="flex gap-0 items-start"
      style={{ minWidth: `${totalRounds * ROUND_WIDTH}px` }}
    >
      {bracket.rounds.map((round, roundIdx) => (
        <div
          key={roundIdx}
          className="flex-shrink-0 relative"
          style={{
            width: ROUND_WIDTH,
            height: totalHeight + HEADER_HEIGHT,
          }}
        >
          {/* Round header */}
          <div className="text-center px-2" style={{ height: HEADER_HEIGHT }}>
            <div className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider">
              {getRoundName(roundIdx + 1, totalRounds)}
            </div>
          </div>

          {/* Matches — absolutely positioned */}
          {round.map((match, matchIdx) => (
            <div
              key={match.matchId}
              className="absolute"
              style={{
                top: HEADER_HEIGHT + matchPositions[roundIdx][matchIdx],
                left: 0,
                right: 0,
                paddingLeft: 10,
                paddingRight: 10,
              }}
            >
              <MatchCard
                match={match}
                isSelected={selectedMatch?.matchId === match.matchId}
                onClick={() => {
                  if (!match.isBye && match.athlete1Id && match.athlete2Id) {
                    onSelectMatch(
                      selectedMatch?.matchId === match.matchId ? null : match
                    );
                  }
                }}
                roundIdx={roundIdx}
                totalRounds={totalRounds}
              />
            </div>
          ))}

          {/* Connector lines */}
          {roundIdx < totalRounds - 1 && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: ROUND_WIDTH, height: totalHeight + HEADER_HEIGHT }}
            >
              {round.map((match, matchIdx) => {
                const isEmpty = !match.athlete1Id && !match.athlete2Id;
                if (isEmpty) return null;

                const matchY = HEADER_HEIGHT + matchPositions[roundIdx][matchIdx] + MATCH_HEIGHT / 2;
                const nextMatchIdx = Math.floor(matchIdx / 2);
                const nextMatchY = HEADER_HEIGHT + matchPositions[roundIdx + 1][nextMatchIdx] + MATCH_HEIGHT / 2;

                // Horizontal line from match to column edge
                const lineStartX = ROUND_WIDTH - 10;
                const lineEndX = ROUND_WIDTH;

                return (
                  <g key={match.matchId}>
                    {/* Horizontal stub from match */}
                    <line
                      x1={lineStartX} y1={matchY}
                      x2={lineEndX} y2={matchY}
                      stroke="#D5D5D2" strokeWidth={1}
                    />
                    {/* Vertical connector to merge point */}
                    <line
                      x1={lineEndX} y1={matchY}
                      x2={lineEndX} y2={nextMatchY}
                      stroke="#D5D5D2" strokeWidth={1}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Match Card ─────────────────────────────────────────────────────────────

function MatchCard({
  match,
  isSelected,
  onClick,
  roundIdx,
  totalRounds,
}: {
  match: DEMatch;
  isSelected: boolean;
  onClick: () => void;
  roundIdx: number;
  totalRounds: number;
}) {
  const isClickable = !match.isBye && match.athlete1Id && match.athlete2Id;
  const isComplete = !!match.winnerId;
  const isFinal = roundIdx === totalRounds - 1;

  // Determine if this is an empty future match (waiting for feeders)
  const isEmpty = !match.athlete1Id && !match.athlete2Id;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`
        relative rounded-[4px] border text-[11px] transition-all
        ${isEmpty
          ? "border-dashed border-[#E9E9E7] bg-[#FAFAF8] opacity-40"
          : isSelected
            ? "border-[#0B6E99] bg-white shadow-md ring-1 ring-[#0B6E99]"
            : isComplete
              ? "border-[#D5D5D2] bg-white shadow-sm"
              : match.isBye
                ? "border-[#E9E9E7] bg-[#F7F6F3]"
                : "border-[#D5D5D2] bg-white shadow-sm hover:border-[#0B6E99] hover:shadow-md"
        }
        ${isClickable ? "cursor-pointer" : "cursor-default"}
        ${isFinal ? "border-2" : ""}
      `}
      style={{ width: 200 }}
    >
      {/* Match ID badge */}
      {!isEmpty && (
        <div className="absolute -top-2 left-2 px-1.5 py-0 text-[9px] font-mono text-[#C4C4C0] bg-[#FAFAF8] rounded">
          {match.isBye ? "BYE" : match.matchId}
        </div>
      )}

      {/* Athlete 1 */}
      <AthleteRow
        name={match.athlete1Name}
        seed={match.athlete1Seed}
        score={match.score1}
        isWinner={match.winnerId === match.athlete1Id && match.athlete1Id !== null}
        isLoser={match.winnerId !== null && match.winnerId !== match.athlete1Id && match.athlete1Id !== null}
        isBye={match.isBye}
        isEmpty={!match.athlete1Id}
        position="top"
      />

      {/* Divider */}
      <div className="border-t border-[#E9E9E7]" />

      {/* Athlete 2 */}
      <AthleteRow
        name={match.athlete2Name}
        seed={match.athlete2Seed}
        score={match.score2}
        isWinner={match.winnerId === match.athlete2Id && match.athlete2Id !== null}
        isLoser={match.winnerId !== null && match.winnerId !== match.athlete2Id && match.athlete2Id !== null}
        isBye={match.isBye}
        isEmpty={!match.athlete2Id}
        position="bottom"
      />

    </div>
  );
}

// ─── Athlete Row ────────────────────────────────────────────────────────────

function AthleteRow({
  name,
  seed,
  score,
  isWinner,
  isLoser,
  isBye,
  isEmpty,
  position,
}: {
  name: string | null;
  seed: number | null;
  score: number | null;
  isWinner: boolean;
  isLoser: boolean;
  isBye: boolean;
  isEmpty: boolean;
  position: "top" | "bottom";
}) {
  if (isEmpty && !isBye) {
    return (
      <div className={`flex items-center justify-between px-2 py-1.5 ${position === "top" ? "rounded-t-[3px]" : "rounded-b-[3px]"}`}>
        <span className="text-[10px] text-[#C4C4C0] italic">TBD</span>
      </div>
    );
  }

  if (isBye && !name) {
    return (
      <div className={`flex items-center justify-between px-2 py-1.5 ${position === "top" ? "rounded-t-[3px]" : "rounded-b-[3px]"}`}>
        <span className="text-[10px] text-[#C4C4C0] italic">bye</span>
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center justify-between px-2 py-1.5 gap-1
        ${position === "top" ? "rounded-t-[3px]" : "rounded-b-[3px]"}
        ${isWinner ? "bg-[#E8F4EC]" : ""}
        ${isLoser ? "opacity-50" : ""}
      `}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {seed !== null && (
          <span className="flex-shrink-0 text-[9px] font-mono text-[#9B9A97] w-4 text-right">
            {seed}
          </span>
        )}
        <span
          className={`truncate ${
            isWinner ? "font-semibold text-[#0F7B6C]" : "text-[#37352F]"
          }`}
        >
          {name || (isBye ? "bye" : "TBD")}
        </span>
        {isWinner && <Trophy size={10} className="flex-shrink-0 text-[#0F7B6C]" />}
      </div>
      {score !== null && !isBye && (
        <span
          className={`flex-shrink-0 font-mono font-semibold text-[10px] ${
            isWinner ? "text-[#0F7B6C]" : "text-[#787774]"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Match Score Entry ──────────────────────────────────────────────────────

function MatchScoreEntry({
  match,
  onSave,
  onCancel,
  isSaving,
}: {
  match: DEMatch;
  onSave: (matchId: string, winnerId: string, score1: number, score2: number) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [score1, setScore1] = useState(match.score1?.toString() || "");
  const [score2, setScore2] = useState(match.score2?.toString() || "");

  const s1 = parseInt(score1, 10) || 0;
  const s2 = parseInt(score2, 10) || 0;

  // Winner is determined by higher score; must not be tied
  const canSave = s1 !== s2 && (s1 > 0 || s2 > 0);
  const winnerId = s1 > s2 ? match.athlete1Id! : match.athlete2Id!;

  return (
    <div className="mt-3 p-4 border border-[#0B6E99] bg-[#F0F7FA] rounded-[4px]">
      <div className="flex items-center gap-2 mb-3">
        <Swords size={14} className="text-[#0B6E99]" />
        <span className="text-xs font-semibold text-[#0B6E99] uppercase tracking-wider">
          Enter Match Result
        </span>
        <span className="text-[10px] text-[#787774] font-mono">{match.matchId}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Athlete 1 */}
        <div className="flex-1">
          <div className="text-xs text-[#787774] mb-1">
            <span className="font-mono text-[#9B9A97]">#{match.athlete1Seed}</span>{" "}
            <span className="font-medium text-[#37352F]">{match.athlete1Name}</span>
          </div>
          <input
            type="number"
            min="0"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 text-lg font-mono font-semibold text-center border border-[#D5D5D2] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E99] focus:border-[#0B6E99]"
          />
        </div>

        <div className="text-lg font-bold text-[#C4C4C0] mt-5">vs</div>

        {/* Athlete 2 */}
        <div className="flex-1">
          <div className="text-xs text-[#787774] mb-1">
            <span className="font-mono text-[#9B9A97]">#{match.athlete2Seed}</span>{" "}
            <span className="font-medium text-[#37352F]">{match.athlete2Name}</span>
          </div>
          <input
            type="number"
            min="0"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 text-lg font-mono font-semibold text-center border border-[#D5D5D2] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E99] focus:border-[#0B6E99]"
          />
        </div>
      </div>

      {/* Winner indicator */}
      {canSave && (
        <div className="mt-2 text-xs text-[#0F7B6C] flex items-center gap-1">
          <ChevronRight size={12} />
          Winner: <strong>{s1 > s2 ? match.athlete1Name : match.athlete2Name}</strong>
        </div>
      )}

      {!canSave && s1 === s2 && s1 > 0 && (
        <div className="mt-2 text-xs text-[#D9730D]">
          Scores cannot be tied — fencing DE requires a winner
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onSave(match.matchId, winnerId, s1, s2)}
          disabled={!canSave || isSaving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[4px] hover:bg-[#095A7D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trophy size={14} />
          )}
          {isSaving ? "Saving..." : "Save Result"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-[#F7F6F3] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Placements Table ───────────────────────────────────────────────────────

function PlacementsTable({
  placements,
  bracket,
}: {
  placements: Record<string, number>;
  bracket: DEBracket;
}) {
  // Build a name lookup from the bracket
  const nameMap = new Map<string, { name: string; seed: number }>();
  for (const round of bracket.rounds) {
    for (const match of round) {
      if (match.athlete1Id && match.athlete1Name) {
        nameMap.set(match.athlete1Id, {
          name: match.athlete1Name,
          seed: match.athlete1Seed || 0,
        });
      }
      if (match.athlete2Id && match.athlete2Name) {
        nameMap.set(match.athlete2Id, {
          name: match.athlete2Name,
          seed: match.athlete2Seed || 0,
        });
      }
    }
  }

  // Sort by placement
  const sorted = Object.entries(placements)
    .map(([athleteId, placement]) => ({
      athleteId,
      placement,
      name: nameMap.get(athleteId)?.name || "Unknown",
      seed: nameMap.get(athleteId)?.seed || 0,
      mpPoints: calculateFencingDE({ placement }),
    }))
    .sort((a, b) => a.placement - b.placement);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={14} className="text-[#D9730D]" />
        <span className="text-xs font-semibold text-[#37352F] uppercase tracking-wider">
          Final DE Placements & MP Points
        </span>
      </div>
      <div className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-16">
                Place
              </th>
              <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left">
                Athlete
              </th>
              <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-20">
                Seed
              </th>
              <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-right w-24">
                MP Points
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr key={row.athleteId}>
                <td className="border border-[#D5D5D2] px-3 py-2 text-sm font-mono font-bold text-center text-[#37352F]">
                  {row.placement <= 3 && (
                    <span className="mr-1">
                      {row.placement === 1 ? "🥇" : row.placement === 2 ? "🥈" : "🥉"}
                    </span>
                  )}
                  {row.placement}
                </td>
                <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#37352F] font-medium">
                  {row.name}
                </td>
                <td className="border border-[#D5D5D2] px-3 py-2 text-sm font-mono text-center text-[#787774]">
                  #{row.seed}
                </td>
                <td className={`border border-[#D5D5D2] px-3 py-2 text-sm font-mono font-semibold text-right ${
                  row.mpPoints > 0 ? "text-[#0F7B6C]" : "text-[#9B9A97]"
                }`}>
                  {row.mpPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Print Bracket Button ───────────────────────────────────────────────────

function PrintBracketButton({
  bracket,
  competitionName,
}: {
  bracket: DEBracket;
  competitionName?: string;
}) {
  const handlePrint = useCallback(() => {
    const totalRounds = bracket.rounds.length;

    // Build name map
    const nameMap = new Map<string, { name: string; seed: number }>();
    for (const round of bracket.rounds) {
      for (const match of round) {
        if (match.athlete1Id && match.athlete1Name) {
          nameMap.set(match.athlete1Id, { name: match.athlete1Name, seed: match.athlete1Seed || 0 });
        }
        if (match.athlete2Id && match.athlete2Name) {
          nameMap.set(match.athlete2Id, { name: match.athlete2Name, seed: match.athlete2Seed || 0 });
        }
      }
    }

    // Generate round headers
    const roundHeaders = bracket.rounds
      .map((_, i) => `<th style="text-align:center; padding:8px; font-size:11px; font-weight:600; color:#0B6E99; text-transform:uppercase; letter-spacing:0.04em;">${getRoundName(i + 1, totalRounds)}</th>`)
      .join("");

    // Build match cells per round
    const maxMatches = bracket.rounds[0].length;
    const rows: string[] = [];

    for (let m = 0; m < maxMatches; m++) {
      let row = "";
      for (let r = 0; r < totalRounds; r++) {
        const matchIdx = Math.floor(m / Math.pow(2, r));
        const match = bracket.rounds[r][matchIdx];

        // Only render in the first row that maps to this match
        if (m % Math.pow(2, r) === 0 && match) {
          const a1 = match.athlete1Name || (match.isBye && !match.athlete1Id ? "bye" : "TBD");
          const a2 = match.athlete2Name || (match.isBye && !match.athlete2Id ? "bye" : "TBD");
          const s1 = match.score1 !== null && !match.isBye ? match.score1 : "";
          const s2 = match.score2 !== null && !match.isBye ? match.score2 : "";
          const w1 = match.winnerId === match.athlete1Id ? "font-weight:700; color:#0F7B6C;" : "";
          const w2 = match.winnerId === match.athlete2Id ? "font-weight:700; color:#0F7B6C;" : "";

          row += `<td rowspan="${Math.pow(2, r)}" style="vertical-align:middle; border:1px solid #D5D5D2; padding:4px 8px; font-size:11px;">
            <div style="border:1px solid #E9E9E7; border-radius:3px; overflow:hidden;">
              <div style="display:flex; justify-content:space-between; padding:3px 6px; ${w1}">
                <span>${match.athlete1Seed ? '#' + match.athlete1Seed + ' ' : ''}${a1}</span>
                <span style="font-family:monospace;">${s1}</span>
              </div>
              <div style="border-top:1px solid #E9E9E7;"></div>
              <div style="display:flex; justify-content:space-between; padding:3px 6px; ${w2}">
                <span>${match.athlete2Seed ? '#' + match.athlete2Seed + ' ' : ''}${a2}</span>
                <span style="font-family:monospace;">${s2}</span>
              </div>
            </div>
          </td>`;
        } else if (m % Math.pow(2, r) !== 0) {
          // Cell is merged (rowspan from previous row)
        } else {
          row += `<td style="border:1px solid #E9E9E7; padding:4px;"></td>`;
        }
      }
      rows.push(`<tr>${row}</tr>`);
    }

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Fencing DE Bracket${competitionName ? " - " + competitionName : ""}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding:24px; color:#37352F; }
    h1 { font-size:20px; font-weight:700; margin-bottom:4px; }
    .subtitle { font-size:12px; color:#787774; margin-bottom:16px; }
    .print-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:16px; border-bottom:2px solid #0B6E99; padding-bottom:8px; }
    .print-date { font-size:11px; color:#9B9A97; }
    table { border-collapse:collapse; width:100%; }
    @media print { body { padding:12px; } }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>Fencing DE — Bracket</h1>
      <div class="subtitle">${competitionName || ""} &middot; Tableau of ${bracket.tableauSize} &middot; ${bracket.numCompetitors} athletes</div>
    </div>
    <div class="print-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  <table>
    <thead><tr>${roundHeaders}</tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
    win.document.close();
  }, [bracket, competitionName]);

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-[#F7F6F3] hover:text-[#37352F] transition-colors"
    >
      <Printer size={12} />
      Print Bracket
    </button>
  );
}
