"use client";
import { useState, useCallback, useRef, useMemo } from "react";

function useAudioFeedback() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback(
    (frequency: number, duration: number, count = 1) => {
      const ctx = getCtx();
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        gain.gain.value = 0.3;
        const startTime = ctx.currentTime + i * (duration / 1000 + 0.05);
        osc.start(startTime);
        osc.stop(startTime + duration / 1000);
      }
    },
    [getCtx],
  );

  return {
    tap: useCallback(() => playBeep(1000, 40), [playBeep]),
    confirm: useCallback(() => {
      playBeep(523, 100);
      setTimeout(() => playBeep(659, 150), 120);
    }, [playBeep]),
    submit: useCallback(() => {
      playBeep(523, 80);
      setTimeout(() => playBeep(659, 80), 100);
      setTimeout(() => playBeep(784, 150), 200);
    }, [playBeep]),
  };
}

/**
 * Standard fencing bout order for round-robin pools.
 * For N fencers, returns pairs as [a, b] (1-indexed).
 */
function generateBoutOrder(n: number): [number, number][] {
  const orders: Record<number, [number, number][]> = {
    3: [
      [1, 2],
      [2, 3],
      [1, 3],
    ],
    4: [
      [1, 4],
      [2, 3],
      [1, 3],
      [2, 4],
      [3, 4],
      [1, 2],
    ],
    5: [
      [1, 2],
      [3, 4],
      [5, 1],
      [2, 3],
      [5, 4],
      [1, 3],
      [2, 5],
      [4, 1],
      [3, 5],
      [4, 2],
    ],
    6: [
      [1, 2],
      [4, 5],
      [2, 3],
      [5, 6],
      [3, 1],
      [6, 4],
      [2, 5],
      [1, 4],
      [5, 3],
      [4, 2],
      [6, 1],
      [3, 4],
      [2, 6],
      [5, 1],
      [6, 3],
    ],
    7: [
      [1, 4],
      [2, 5],
      [3, 6],
      [7, 1],
      [4, 5],
      [6, 2],
      [7, 3],
      [1, 5],
      [4, 6],
      [2, 7],
      [5, 3],
      [1, 6],
      [4, 7],
      [5, 2],
      [3, 1],
      [6, 7],
      [2, 4],
      [3, 7],
      [6, 5],
      [1, 2],
      [7, 4],
    ],
  };

  if (orders[n]) return orders[n];

  // Fallback: generate all pairs
  const bouts: [number, number][] = [];
  for (let i = 1; i <= n; i++) {
    for (let j = i + 1; j <= n; j++) {
      bouts.push([i, j]);
    }
  }
  return bouts;
}

interface Athlete {
  id: string;
  name: string;
  initials: string;
}

type BoutResult = {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
};

interface Props {
  poolName: string;
  athletes: Athlete[];
  eventName: string;
  onSubmit: (data: {
    poolName: string;
    results: BoutResult[];
    matrix: Record<string, Record<string, { victory: boolean; score: number }>>;
  }) => void;
}

export default function FencingRankingDashboard({
  poolName,
  athletes,
  eventName,
  onSubmit,
}: Props) {
  const boutOrder = useMemo(
    () => generateBoutOrder(athletes.length),
    [athletes.length],
  );
  const [results, setResults] = useState<Record<string, BoutResult>>({});
  const [activeBout, setActiveBout] = useState<{
    a: number;
    b: number;
    boutIndex: number;
  } | null>(null);
  const [scoringAId, setScoringAId] = useState("");
  const [scoringBId, setScoringBId] = useState("");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const audio = useAudioFeedback();

  const boutKey = (a: number, b: number) => `${a}-${b}`;
  const completedCount = Object.keys(results).length;
  const totalBouts = boutOrder.length;
  const progress = totalBouts > 0 ? (completedCount / totalBouts) * 100 : 0;

  const openScoring = useCallback(
    (a: number, b: number, boutIndex: number) => {
      audio.tap();
      const athleteA = athletes[a - 1];
      const athleteB = athletes[b - 1];
      setScoringAId(athleteA.id);
      setScoringBId(athleteB.id);
      setScoreA(0);
      setScoreB(0);
      setActiveBout({ a, b, boutIndex });
    },
    [athletes, audio],
  );

  const recordResult = useCallback(
    (winnerId: string) => {
      if (!activeBout) return;
      audio.confirm();
      const loserId = winnerId === scoringAId ? scoringBId : scoringAId;
      const wScore = winnerId === scoringAId ? scoreA : scoreB;
      const lScore = winnerId === scoringAId ? scoreB : scoreA;

      const key = boutKey(activeBout.a, activeBout.b);
      setResults((prev) => ({
        ...prev,
        [key]: {
          winner: winnerId,
          loser: loserId,
          winnerScore: wScore,
          loserScore: lScore,
        },
      }));
      setActiveBout(null);
    },
    [activeBout, scoringAId, scoringBId, scoreA, scoreB, audio],
  );

  const handleSubmitAll = useCallback(() => {
    audio.submit();
    const matrix: Record<
      string,
      Record<string, { victory: boolean; score: number }>
    > = {};
    for (const r of Object.values(results)) {
      if (!matrix[r.winner]) matrix[r.winner] = {};
      if (!matrix[r.loser]) matrix[r.loser] = {};
      matrix[r.winner][r.loser] = { victory: true, score: r.winnerScore };
      matrix[r.loser][r.winner] = { victory: false, score: r.loserScore };
    }
    setSubmitted(true);
    onSubmit({ poolName, results: Object.values(results), matrix });
  }, [audio, results, poolName, onSubmit]);

  // Compute V/D record per athlete for the matrix header
  const athleteStats = useMemo(() => {
    const stats: Record<string, { v: number; d: number }> = {};
    athletes.forEach((a) => (stats[a.id] = { v: 0, d: 0 }));
    Object.values(results).forEach((r) => {
      if (stats[r.winner]) stats[r.winner].v++;
      if (stats[r.loser]) stats[r.loser].d++;
    });
    return stats;
  }, [athletes, results]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
        <div className="text-green-400 text-6xl mb-4">✓</div>
        <h2 className="text-xl font-bold mb-2">Pool Submitted</h2>
        <p className="text-gray-400 text-sm">{poolName} — {completedCount} bouts recorded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-lg">{poolName}</p>
            <p className="text-xs text-gray-400">{eventName}</p>
          </div>
          <div className="text-right text-sm">
            <span className="text-gray-400">
              {completedCount}/{totalBouts}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Bout List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Bout Order
          </p>
          {boutOrder.map(([a, b], i) => {
            const key = boutKey(a, b);
            const result = results[key];
            const athleteA = athletes[a - 1];
            const athleteB = athletes[b - 1];
            if (!athleteA || !athleteB) return null;

            return (
              <button
                key={key}
                onClick={() => !result && openScoring(a, b, i)}
                disabled={!!result}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg min-h-[48px] text-left transition-colors ${
                  result
                    ? "bg-gray-900/50 opacity-60"
                    : "bg-gray-900 active:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6">{i + 1}.</span>
                  <span
                    className={
                      result?.winner === athleteA.id
                        ? "text-green-400 font-semibold"
                        : ""
                    }
                  >
                    {athleteA.name}
                  </span>
                  <span className="text-gray-600 text-xs">vs</span>
                  <span
                    className={
                      result?.winner === athleteB.id
                        ? "text-green-400 font-semibold"
                        : ""
                    }
                  >
                    {athleteB.name}
                  </span>
                </div>
                {result ? (
                  <span className="text-xs text-gray-500">
                    {result.winnerScore}–{result.loserScore}
                  </span>
                ) : (
                  <span className="text-xs text-blue-400">Score →</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Matrix Grid */}
        <div className="p-4 overflow-x-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Pool Matrix
          </p>
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                <th className="p-1 text-left text-gray-500">#</th>
                {athletes.map((a, i) => (
                  <th key={a.id} className="p-1 text-center text-gray-400 w-10">
                    {i + 1}
                  </th>
                ))}
                <th className="p-1 text-center text-gray-400">V</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((rowA, ri) => (
                <tr key={rowA.id}>
                  <td className="p-1 text-gray-400 whitespace-nowrap">
                    {ri + 1}. {rowA.initials}
                  </td>
                  {athletes.map((colA, ci) => {
                    if (ri === ci) {
                      return (
                        <td
                          key={colA.id}
                          className="p-1 text-center bg-gray-800"
                        >
                          ×
                        </td>
                      );
                    }
                    const k1 = boutKey(ri + 1, ci + 1);
                    const k2 = boutKey(ci + 1, ri + 1);
                    const r = results[k1] || results[k2];
                    if (!r) {
                      return (
                        <td
                          key={colA.id}
                          className="p-1 text-center text-gray-700 cursor-pointer"
                          onClick={() => {
                            const bIdx = boutOrder.findIndex(
                              ([x, y]) =>
                                (x === ri + 1 && y === ci + 1) ||
                                (x === ci + 1 && y === ri + 1),
                            );
                            if (bIdx >= 0) {
                              const [ba, bb] = boutOrder[bIdx];
                              openScoring(ba, bb, bIdx);
                            }
                          }}
                        >
                          –
                        </td>
                      );
                    }
                    const isVictory = r.winner === rowA.id;
                    const myScore = isVictory ? r.winnerScore : r.loserScore;
                    return (
                      <td
                        key={colA.id}
                        className={`p-1 text-center font-mono ${isVictory ? "text-green-400" : "text-red-400"}`}
                      >
                        {isVictory ? "V" : "D"}
                        {myScore}
                      </td>
                    );
                  })}
                  <td className="p-1 text-center font-semibold text-yellow-400">
                    {athleteStats[rowA.id]?.v ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Button */}
      {completedCount === totalBouts && (
        <div className="p-4 pb-safe">
          <button
            onClick={handleSubmitAll}
            className="w-full py-4 rounded-xl bg-green-600 active:bg-green-700 text-white text-lg font-bold uppercase min-h-[56px]"
          >
            Submit Pool Results
          </button>
        </div>
      )}

      {/* Scoring Modal */}
      {activeBout && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 pb-safe max-h-[80vh] overflow-y-auto">
            <p className="text-center text-xs text-gray-500 uppercase tracking-wider mb-4">
              Bout {activeBout.boutIndex + 1}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Athlete A */}
              <div className="text-center">
                <p className="font-semibold text-sm mb-3 truncate">
                  {athletes[activeBout.a - 1]?.name}
                </p>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <button
                    onClick={() => setScoreA(Math.max(0, scoreA - 1))}
                    className="w-10 h-10 rounded-full bg-gray-800 active:bg-gray-700 text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="text-3xl font-mono font-bold w-10 text-center">
                    {scoreA}
                  </span>
                  <button
                    onClick={() => setScoreA(scoreA + 1)}
                    className="w-10 h-10 rounded-full bg-gray-800 active:bg-gray-700 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => recordResult(scoringAId)}
                  className="w-full py-3 rounded-lg bg-green-700 active:bg-green-800 text-white font-bold uppercase text-sm min-h-[48px]"
                >
                  Victory
                </button>
              </div>

              {/* Athlete B */}
              <div className="text-center">
                <p className="font-semibold text-sm mb-3 truncate">
                  {athletes[activeBout.b - 1]?.name}
                </p>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <button
                    onClick={() => setScoreB(Math.max(0, scoreB - 1))}
                    className="w-10 h-10 rounded-full bg-gray-800 active:bg-gray-700 text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="text-3xl font-mono font-bold w-10 text-center">
                    {scoreB}
                  </span>
                  <button
                    onClick={() => setScoreB(scoreB + 1)}
                    className="w-10 h-10 rounded-full bg-gray-800 active:bg-gray-700 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => recordResult(scoringBId)}
                  className="w-full py-3 rounded-lg bg-green-700 active:bg-green-800 text-white font-bold uppercase text-sm min-h-[48px]"
                >
                  Victory
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveBout(null)}
              className="w-full py-3 rounded-lg bg-gray-800 active:bg-gray-700 text-gray-400 font-semibold uppercase text-sm min-h-[48px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
