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
      <div className="flex flex-col min-h-screen bg-gray-950 text-white">
        <header className="bg-gray-900 px-4 py-3 border-b border-gray-800">
          <p className="font-bold text-lg">{laneName}</p>
          <p className="text-xs text-gray-400">{eventName}</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-green-400 text-6xl mb-4">✓</div>
          <h2 className="text-xl font-bold mb-4">Lane Complete</h2>
          <div className="w-full space-y-2">
            {completedResults.map((r, i) => (
              <div
                key={r.athleteId}
                className="flex justify-between bg-gray-900 rounded-lg px-4 py-2"
              >
                <span className="text-gray-400">
                  {i + 1}. {r.name}
                </span>
                <span className="font-mono">{formatTime(r.time)}</span>
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
          <div className="bg-orange-600 text-white font-bold text-lg px-3 py-1 rounded">
            {laneName}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{eventName}</p>
            <p className="text-xs text-gray-500">
              {currentIndex + 1} of {athletes.length}
            </p>
          </div>
        </div>
      </header>

      {/* Current Athlete */}
      <div className="px-4 pt-4">
        <p className="text-center text-lg font-semibold">
          {currentAthlete?.name}
        </p>
      </div>

      {/* Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          className={`font-mono font-bold tracking-wider transition-colors ${
            state === "running"
              ? "text-green-400"
              : state === "stopped"
                ? "text-red-400"
                : state === "confirmed"
                  ? "text-blue-400"
                  : "text-white"
          }`}
          style={{ fontSize: "clamp(48px, 14vw, 80px)" }}
        >
          {formatTime(elapsed)}
        </div>
        {state === "stopped" && (
          <p className="text-xs text-red-400 mt-1 uppercase tracking-widest">
            Stopped — Confirm?
          </p>
        )}
        {state === "confirmed" && (
          <p className="text-xs text-blue-400 mt-1 uppercase tracking-widest">
            Recorded
          </p>
        )}
      </div>

      {/* Next Up Preview */}
      {nextAthlete && state !== "running" && (
        <div className="px-4 pb-2">
          <div className="bg-gray-900 rounded-lg px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase">Next up</span>
            <span className="text-sm text-gray-300">{nextAthlete.name}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 space-y-3 pb-safe">
        {state === "idle" && (
          <button
            onClick={handleStart}
            className="w-full py-5 rounded-xl bg-green-600 active:bg-green-700 text-white text-xl font-bold uppercase tracking-wider min-h-[60px]"
          >
            Start
          </button>
        )}

        {state === "running" && (
          <button
            onClick={handleStop}
            className="w-full py-5 rounded-xl bg-red-600 active:bg-red-700 text-white text-xl font-bold uppercase tracking-wider min-h-[60px]"
          >
            Stop
          </button>
        )}

        {state === "stopped" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCancel}
              className="py-5 rounded-xl bg-gray-700 active:bg-gray-600 text-white text-lg font-bold uppercase min-h-[60px]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="py-5 rounded-xl bg-green-600 active:bg-green-700 text-white text-lg font-bold uppercase min-h-[60px]"
            >
              Confirm
            </button>
          </div>
        )}

        {state === "confirmed" && (
          <button
            onClick={handleNext}
            className="w-full py-5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-xl font-bold uppercase tracking-wider min-h-[60px]"
          >
            Next Athlete →
          </button>
        )}
      </div>

      {/* Completed List */}
      {completedResults.length > 0 && (
        <div className="px-4 pb-4 max-h-28 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Completed
          </p>
          {completedResults.map((r, i) => (
            <div
              key={r.athleteId}
              className="flex justify-between text-sm font-mono bg-gray-900 rounded px-3 py-1 mb-1"
            >
              <span className="text-gray-400">
                {i + 1}. {r.name}
              </span>
              <span>{formatTime(r.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
