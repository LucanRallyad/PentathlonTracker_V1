"use client";
import { useState, useRef, useCallback, useEffect } from "react";

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
    startBeep: useCallback(() => playBeep(880, 150), [playBeep]),
    stopBeep: useCallback(() => playBeep(660, 100, 2), [playBeep]),
    confirmChime: useCallback(() => {
      playBeep(523, 100);
      setTimeout(() => playBeep(659, 150), 120);
    }, [playBeep]),
    nextBeep: useCallback(() => playBeep(1000, 80), [playBeep]),
  };
}

function formatTime(hundredths: number): string {
  const totalSeconds = Math.floor(hundredths / 100);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const cs = hundredths % 100;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

type TimerState = "idle" | "running" | "stopped" | "confirmed";

interface Athlete {
  id: string;
  name: string;
}

interface Props {
  laneName: string;
  athletes: Athlete[];
  eventName: string;
  onSubmit: (data: {
    athleteId: string;
    timeHundredths: number;
    lane: string;
  }) => void;
}

export default function ObstacleTimerDashboard({
  laneName,
  athletes,
  eventName,
  onSubmit,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<TimerState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [completedResults, setCompletedResults] = useState<
    { athleteId: string; name: string; time: number }[]
  >([]);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const rafRef = useRef<number>(0);
  const audio = useAudioFeedback();

  const currentAthlete = athletes[currentIndex];
  const nextAthlete = athletes[currentIndex + 1];
  const allDone = currentIndex >= athletes.length;

  const tick = useCallback(() => {
    const now = performance.now();
    const diff = now - startTimeRef.current;
    setElapsed(Math.floor(diff / 10));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    audio.startBeep();
    startTimeRef.current = performance.now();
    setElapsed(0);
    setState("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [audio, tick]);

  const handleStop = useCallback(() => {
    audio.stopBeep();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    pausedAtRef.current = performance.now();
    setState("stopped");
  }, [audio]);

  const handleCancel = useCallback(() => {
    const pauseDuration = performance.now() - pausedAtRef.current;
    startTimeRef.current += pauseDuration;
    setState("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handleConfirm = useCallback(() => {
    if (!currentAthlete) return;
    audio.confirmChime();
    onSubmit({
      athleteId: currentAthlete.id,
      timeHundredths: elapsed,
      lane: laneName,
    });
    setCompletedResults((prev) => [
      ...prev,
      { athleteId: currentAthlete.id, name: currentAthlete.name, time: elapsed },
    ]);
    setState("confirmed");
  }, [audio, currentAthlete, elapsed, laneName, onSubmit]);

  const handleNext = useCallback(() => {
    audio.nextBeep();
    setCurrentIndex((prev) => prev + 1);
    setElapsed(0);
    setState("idle");
  }, [audio]);

  if (allDone) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FBFBFA] text-[#37352F]">
        <header className="bg-white px-4 py-3 border-b border-[#E9E9E7]">
          <p className="font-semibold text-base">{laneName}</p>
          <p className="text-xs text-[#9B9A97]">{eventName}</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6 text-center w-full max-w-sm">
            <div className="w-12 h-12 rounded-full bg-[#DDEDEA] flex items-center justify-center mx-auto mb-4">
              <span className="text-[#0F7B6C] text-2xl font-bold">&#10003;</span>
            </div>
            <h2 className="text-lg font-semibold mb-4">Lane Complete</h2>
            <div className="space-y-2">
              {completedResults.map((r, i) => (
                <div
                  key={r.athleteId}
                  className="flex justify-between bg-[#F7F6F3] rounded-[4px] px-4 py-2"
                >
                  <span className="text-[#787774] text-sm">
                    {i + 1}. {r.name}
                  </span>
                  <span className="font-mono text-sm text-[#37352F]">{formatTime(r.time)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FBFBFA] text-[#37352F]">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-[#E9E9E7]">
        <div className="flex items-center justify-between">
          <div className="bg-[#FAEBDD] text-[#D9730D] font-semibold text-sm px-3 py-1 rounded-[3px]">
            {laneName}
          </div>
          <div className="text-right">
            <p className="text-xs text-[#9B9A97]">{eventName}</p>
            <p className="text-xs text-[#787774]">
              {currentIndex + 1} of {athletes.length}
            </p>
          </div>
        </div>
      </header>

      {/* Current Athlete */}
      <div className="px-4 pt-4">
        <p className="text-center text-base font-semibold text-[#37352F]">
          {currentAthlete?.name}
        </p>
      </div>

      {/* Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          className={`font-mono font-bold tracking-wider transition-colors ${
            state === "running"
              ? "text-[#0F7B6C]"
              : state === "stopped"
                ? "text-[#E03E3E]"
                : state === "confirmed"
                  ? "text-[#0B6E99]"
                  : "text-[#37352F]"
          }`}
          style={{ fontSize: "clamp(48px, 14vw, 80px)" }}
        >
          {formatTime(elapsed)}
        </div>
        {state === "stopped" && (
          <p className="text-xs text-[#E03E3E] mt-1 uppercase tracking-widest font-medium">
            Stopped — Confirm?
          </p>
        )}
        {state === "confirmed" && (
          <p className="text-xs text-[#0B6E99] mt-1 uppercase tracking-widest font-medium">
            Recorded
          </p>
        )}
      </div>

      {/* Next Up Preview */}
      {nextAthlete && state !== "running" && (
        <div className="px-4 pb-2">
          <div className="bg-white rounded-[4px] border border-[#E9E9E7] px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-[#9B9A97] uppercase">Next up</span>
            <span className="text-sm text-[#37352F]">{nextAthlete.name}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 space-y-3 pb-safe">
        {state === "idle" && (
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white text-lg font-semibold uppercase tracking-wider min-h-[56px]"
          >
            Start
          </button>
        )}

        {state === "running" && (
          <button
            onClick={handleStop}
            className="w-full py-4 rounded-[4px] bg-[#E03E3E] active:bg-[#c43333] text-white text-lg font-semibold uppercase tracking-wider min-h-[56px]"
          >
            Stop
          </button>
        )}

        {state === "stopped" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCancel}
              className="py-4 rounded-[4px] bg-[#F7F6F3] active:bg-[#E8E7E4] text-[#37352F] border border-[#E9E9E7] text-base font-semibold uppercase min-h-[56px]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white text-base font-semibold uppercase min-h-[56px]"
            >
              Confirm
            </button>
          </div>
        )}

        {state === "confirmed" && (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-[4px] bg-[#0B6E99] active:bg-[#095a7d] text-white text-lg font-semibold uppercase tracking-wider min-h-[56px]"
          >
            Next Athlete &#8594;
          </button>
        )}
      </div>

      {/* Completed List */}
      {completedResults.length > 0 && (
        <div className="px-4 pb-4 max-h-28 overflow-y-auto">
          <p className="text-xs text-[#9B9A97] uppercase tracking-wider mb-1">
            Completed
          </p>
          {completedResults.map((r, i) => (
            <div
              key={r.athleteId}
              className="flex justify-between text-sm font-mono bg-white rounded-[4px] border border-[#E9E9E7] px-3 py-1.5 mb-1"
            >
              <span className="text-[#787774]">
                {i + 1}. {r.name}
              </span>
              <span className="text-[#37352F]">{formatTime(r.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
