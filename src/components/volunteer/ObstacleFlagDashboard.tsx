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
  variant?: "mobile" | "desktop";
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
  variant = "mobile",
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
  const isDesktop = variant === "desktop";

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

  const flagCounters = (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#FBF3DB] border border-[#DFAB01]/20 rounded-[4px] p-4 text-center">
        <p className="text-[#DFAB01] text-4xl font-bold font-mono">{yellowCount}</p>
        <p className="text-[#DFAB01]/80 text-xs uppercase mt-1 font-medium">Yellow</p>
      </div>
      <div className="bg-[#FBE4E4] border border-[#E03E3E]/20 rounded-[4px] p-4 text-center">
        <p className="text-[#E03E3E] text-4xl font-bold font-mono">{redCount}</p>
        <p className="text-[#E03E3E]/80 text-xs uppercase mt-1 font-medium">Red</p>
      </div>
    </div>
  );

  const flagButtons = (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={handleYellow}
        className={`rounded-[4px] bg-[#DFAB01] active:bg-[#c49800] text-white text-base font-semibold uppercase ${isDesktop ? "py-4 min-h-[48px]" : "py-5 min-h-[56px]"}`}
      >
        Yellow Flag
      </button>
      <button
        onClick={handleRed}
        className={`rounded-[4px] bg-[#E03E3E] active:bg-[#c43333] text-white text-base font-semibold uppercase ${isDesktop ? "py-4 min-h-[48px]" : "py-5 min-h-[56px]"}`}
      >
        Red Flag
      </button>
    </div>
  );

  const logPanel = (
    <div className={isDesktop ? "flex-1 overflow-y-auto" : "max-h-28 overflow-y-auto"}>
      <p className="text-xs text-[#9B9A97] uppercase tracking-wider mb-1">Flag Log</p>
      <div className="space-y-1">
        {flagLog.map((entry, i) => (
          <div
            key={i}
            className={`text-sm px-3 py-1.5 rounded-[4px] border ${
              entry.type === "yellow"
                ? "bg-[#FBF3DB] text-[#DFAB01] border-[#DFAB01]/20"
                : "bg-[#FBE4E4] text-[#E03E3E] border-[#E03E3E]/20"
            }`}
          >
            {entry.type === "yellow" ? "Yellow" : "Red"} Flag
            <span className="text-[#9B9A97] ml-2 text-xs">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const completedPanel = (
    <div>
      <p className="text-xs text-[#9B9A97] uppercase tracking-wider mb-1">Completed</p>
      <div className="space-y-2">
        {completedResults.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-[#F7F6F3] rounded-[4px] px-4 py-2"
          >
            <span className="text-[#787774] text-sm">{i + 1}. {r.name}</span>
            <div className="flex gap-3 text-sm">
              {r.yellow > 0 && <span className="text-[#DFAB01] font-medium">{r.yellow} yellow</span>}
              {r.red > 0 && <span className="text-[#E03E3E] font-medium">{r.red} red</span>}
              {r.yellow === 0 && r.red === 0 && <span className="text-[#0F7B6C] font-medium">Clean</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── All Done ─── */
  if (allDone) {
    return (
      <div className={`flex flex-col ${isDesktop ? "min-h-[600px] rounded-[4px] border border-[#E9E9E7] overflow-hidden" : "min-h-screen"} bg-[#FBFBFA] text-[#37352F]`}>
        <header className="bg-white px-4 py-3 border-b border-[#E9E9E7]">
          <p className="font-semibold text-base">Flagger</p>
          <p className="text-xs text-[#9B9A97]">{eventName}</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className={`bg-white rounded-[4px] border border-[#E9E9E7] p-6 text-center w-full ${isDesktop ? "max-w-lg" : "max-w-sm"}`}>
            <div className="w-12 h-12 rounded-full bg-[#DDEDEA] flex items-center justify-center mx-auto mb-4">
              <span className="text-[#0F7B6C] text-2xl font-bold">&#10003;</span>
            </div>
            <h2 className="text-lg font-semibold mb-4">All Athletes Flagged</h2>
            {completedPanel}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Desktop Layout ─── */
  if (isDesktop) {
    return (
      <div className="flex flex-row min-h-[600px] bg-[#FBFBFA] text-[#37352F] rounded-[4px] border border-[#E9E9E7] overflow-hidden">
        {/* Left — Controls */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white px-6 py-4 border-b border-[#E9E9E7]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-base">Flagger</p>
                <p className="text-xs text-[#9B9A97]">{eventName}</p>
              </div>
              <div className="text-right text-xs text-[#787774]">
                {currentIndex + 1} of {athletes.length}
              </div>
            </div>
          </header>

          <div className="px-6 pt-6 pb-4 text-center">
            <p className="text-xl font-semibold text-[#37352F]">{currentAthlete?.name}</p>
          </div>

          {!athleteConfirmed && (
            <div className="flex-1 flex items-center justify-center px-6">
              <button
                onClick={() => { audio.next(); setAthleteConfirmed(true); }}
                className="w-full max-w-md py-4 rounded-[4px] bg-[#0B6E99] active:bg-[#095a7d] text-white text-lg font-semibold uppercase min-h-[48px]"
              >
                Confirm Athlete Ready
              </button>
            </div>
          )}

          {athleteConfirmed && !submitted && (
            <div className="flex-1 flex flex-col px-6">
              <div className="mb-4">{flagCounters}</div>
              <div className="mb-4">{flagButtons}</div>
              <div className="mt-auto pb-6">
                <button
                  onClick={handleSubmitAndNext}
                  className="w-full py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white text-base font-semibold uppercase min-h-[48px]"
                >
                  Submit & Next
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6 text-center w-full max-w-sm">
                <div className="w-12 h-12 rounded-full bg-[#DDEDEA] flex items-center justify-center mx-auto mb-3">
                  <span className="text-[#0F7B6C] text-2xl font-bold">&#10003;</span>
                </div>
                <p className="text-base font-semibold mb-1">Recorded</p>
                <p className="text-sm text-[#787774] mb-4">{yellowCount} yellow, {redCount} red</p>
                <button
                  onClick={handleNext}
                  className="w-full py-4 rounded-[4px] bg-[#0B6E99] active:bg-[#095a7d] text-white text-lg font-semibold uppercase min-h-[48px]"
                >
                  Next Athlete &#8594;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right — Log + Completed */}
        <div className="w-[340px] border-l border-[#E9E9E7] bg-white flex flex-col">
          <div className="flex-1 p-5 overflow-y-auto">
            {flagLog.length > 0 ? logPanel : (
              <p className="text-sm text-[#9B9A97] text-center py-8">No flags recorded yet</p>
            )}
          </div>
          {completedResults.length > 0 && (
            <div className="p-5 border-t border-[#E9E9E7]">
              {completedPanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Mobile Layout (original) ─── */
  return (
    <div className="flex flex-col min-h-screen bg-[#FBFBFA] text-[#37352F]">
      <header className="bg-white px-4 py-3 border-b border-[#E9E9E7]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-base">Flagger</p>
            <p className="text-xs text-[#9B9A97]">{eventName}</p>
          </div>
          <div className="text-right text-xs text-[#787774]">
            {currentIndex + 1} of {athletes.length}
          </div>
        </div>
      </header>

      <div className="px-4 pt-6 pb-4 text-center">
        <p className="text-lg font-semibold text-[#37352F]">{currentAthlete?.name}</p>
      </div>

      {!athleteConfirmed && (
        <div className="flex-1 flex items-center justify-center px-4">
          <button
            onClick={() => { audio.next(); setAthleteConfirmed(true); }}
            className="w-full py-5 rounded-[4px] bg-[#0B6E99] active:bg-[#095a7d] text-white text-lg font-semibold uppercase min-h-[56px]"
          >
            Confirm Athlete Ready
          </button>
        </div>
      )}

      {athleteConfirmed && !submitted && (
        <>
          <div className="px-4 mb-4">{flagCounters}</div>
          <div className="px-4 mb-4">{flagButtons}</div>
          {flagLog.length > 0 && <div className="px-4 mb-4">{logPanel}</div>}
          <div className="mt-auto p-4 pb-safe">
            <button
              onClick={handleSubmitAndNext}
              className="w-full py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white text-base font-semibold uppercase min-h-[56px]"
            >
              Submit & Next
            </button>
          </div>
        </>
      )}

      {submitted && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6 text-center w-full max-w-sm">
            <div className="w-12 h-12 rounded-full bg-[#DDEDEA] flex items-center justify-center mx-auto mb-3">
              <span className="text-[#0F7B6C] text-2xl font-bold">&#10003;</span>
            </div>
            <p className="text-base font-semibold mb-1">Recorded</p>
            <p className="text-sm text-[#787774] mb-6">{yellowCount} yellow, {redCount} red</p>
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-[4px] bg-[#0B6E99] active:bg-[#095a7d] text-white text-lg font-semibold uppercase min-h-[56px]"
            >
              Next Athlete &#8594;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
