"use client";
import { useState, useRef, useCallback } from "react";

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
    yellowFlag: useCallback(() => playBeep(600, 200), [playBeep]),
    redFlag: useCallback(() => playBeep(400, 300, 2), [playBeep]),
    confirm: useCallback(() => {
      playBeep(523, 100);
      setTimeout(() => playBeep(659, 150), 120);
    }, [playBeep]),
    next: useCallback(() => playBeep(1000, 80), [playBeep]),
  };
}

interface Athlete {
  id: string;
  name: string;
}

interface FlagEntry {
  type: "yellow" | "red";
  timestamp: number;
}

interface Props {
  athletes: Athlete[];
  eventName: string;
  onSubmit: (data: {
    athleteId: string;
    yellowFlags: number;
    redFlags: number;
    flagLog: FlagEntry[];
  }) => void;
}

export default function ObstacleFlagDashboard({
  athletes,
  eventName,
  onSubmit,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [yellowCount, setYellowCount] = useState(0);
  const [redCount, setRedCount] = useState(0);
  const [flagLog, setFlagLog] = useState<FlagEntry[]>([]);
  const [athleteConfirmed, setAthleteConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completedResults, setCompletedResults] = useState<
    { name: string; yellow: number; red: number }[]
  >([]);
  const audio = useAudioFeedback();

  const currentAthlete = athletes[currentIndex];
  const allDone = currentIndex >= athletes.length;

  const handleYellow = useCallback(() => {
    audio.yellowFlag();
    setYellowCount((c) => c + 1);
    setFlagLog((prev) => [...prev, { type: "yellow", timestamp: Date.now() }]);
  }, [audio]);

  const handleRed = useCallback(() => {
    audio.redFlag();
    setRedCount((c) => c + 1);
    setFlagLog((prev) => [...prev, { type: "red", timestamp: Date.now() }]);
  }, [audio]);

  const handleSubmitAndNext = useCallback(() => {
    if (!currentAthlete) return;
    audio.confirm();
    onSubmit({
      athleteId: currentAthlete.id,
      yellowFlags: yellowCount,
      redFlags: redCount,
      flagLog,
    });
    setCompletedResults((prev) => [
      ...prev,
      { name: currentAthlete.name, yellow: yellowCount, red: redCount },
    ]);
    setSubmitted(true);
  }, [audio, currentAthlete, yellowCount, redCount, flagLog, onSubmit]);

  const handleNext = useCallback(() => {
    audio.next();
    setCurrentIndex((prev) => prev + 1);
    setYellowCount(0);
    setRedCount(0);
    setFlagLog([]);
    setAthleteConfirmed(false);
    setSubmitted(false);
  }, [audio]);

  if (allDone) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-950 text-white">
        <header className="bg-gray-900 px-4 py-3 border-b border-gray-800">
          <p className="font-bold text-lg">Flagger</p>
          <p className="text-xs text-gray-400">{eventName}</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-green-400 text-6xl mb-4">✓</div>
          <h2 className="text-xl font-bold mb-4">All Athletes Flagged</h2>
          <div className="w-full space-y-2">
            {completedResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2"
              >
                <span className="text-gray-400">
                  {i + 1}. {r.name}
                </span>
                <div className="flex gap-3 text-sm">
                  {r.yellow > 0 && (
                    <span className="text-yellow-400">🟡 {r.yellow}</span>
                  )}
                  {r.red > 0 && (
                    <span className="text-red-400">🔴 {r.red}</span>
                  )}
                  {r.yellow === 0 && r.red === 0 && (
                    <span className="text-green-400">Clean</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Flagger</p>
            <p className="text-xs text-gray-400">{eventName}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            {currentIndex + 1} of {athletes.length}
          </div>
        </div>
      </header>

      {/* Current Athlete */}
      <div className="px-4 pt-6 pb-4 text-center">
        <p className="text-xl font-bold">{currentAthlete?.name}</p>
      </div>

      {/* Confirm Athlete Gate */}
      {!athleteConfirmed && (
        <div className="flex-1 flex items-center justify-center px-4">
          <button
            onClick={() => {
              audio.next();
              setAthleteConfirmed(true);
            }}
            className="w-full py-6 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-xl font-bold uppercase min-h-[60px]"
          >
            Confirm Athlete Ready
          </button>
        </div>
      )}

      {/* Flagging Interface */}
      {athleteConfirmed && !submitted && (
        <>
          {/* Flag Counters */}
          <div className="px-4 grid grid-cols-2 gap-4 mb-4">
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 text-center">
              <p className="text-yellow-400 text-4xl font-bold font-mono">
                {yellowCount}
              </p>
              <p className="text-yellow-500 text-xs uppercase mt-1">Yellow</p>
            </div>
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-center">
              <p className="text-red-400 text-4xl font-bold font-mono">
                {redCount}
              </p>
              <p className="text-red-500 text-xs uppercase mt-1">Red</p>
            </div>
          </div>

          {/* Flag Buttons */}
          <div className="px-4 grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleYellow}
              className="py-6 rounded-xl bg-yellow-500 active:bg-yellow-600 text-black text-lg font-bold uppercase min-h-[60px]"
            >
              Yellow Flag
            </button>
            <button
              onClick={handleRed}
              className="py-6 rounded-xl bg-red-600 active:bg-red-700 text-white text-lg font-bold uppercase min-h-[60px]"
            >
              Red Flag
            </button>
          </div>

          {/* Flag Log */}
          {flagLog.length > 0 && (
            <div className="px-4 mb-4 max-h-28 overflow-y-auto">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Flag Log
              </p>
              <div className="space-y-1">
                {flagLog.map((entry, i) => (
                  <div
                    key={i}
                    className={`text-sm px-3 py-1 rounded ${
                      entry.type === "yellow"
                        ? "bg-yellow-900/20 text-yellow-400"
                        : "bg-red-900/20 text-red-400"
                    }`}
                  >
                    {entry.type === "yellow" ? "🟡 Yellow" : "🔴 Red"} Flag
                    <span className="text-gray-600 ml-2 text-xs">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="mt-auto p-4 pb-safe">
            <button
              onClick={handleSubmitAndNext}
              className="w-full py-5 rounded-xl bg-green-600 active:bg-green-700 text-white text-lg font-bold uppercase min-h-[60px]"
            >
              Submit & Next
            </button>
          </div>
        </>
      )}

      {/* Post-Submit */}
      {submitted && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-green-400 text-5xl mb-3">✓</div>
          <p className="text-lg font-semibold mb-1">Recorded</p>
          <p className="text-sm text-gray-400 mb-6">
            {yellowCount} yellow, {redCount} red
          </p>
          <button
            onClick={handleNext}
            className="w-full py-5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-xl font-bold uppercase min-h-[60px]"
          >
            Next Athlete →
          </button>
        </div>
      )}
    </div>
  );
}
