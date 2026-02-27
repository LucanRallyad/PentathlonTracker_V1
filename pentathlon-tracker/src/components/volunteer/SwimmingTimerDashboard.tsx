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
    lapClick: useCallback(() => playBeep(1200, 50), [playBeep]),
    confirmChime: useCallback(() => {
      playBeep(523, 100);
      setTimeout(() => playBeep(659, 150), 120);
    }, [playBeep]),
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

interface Props {
  athleteName: string;
  laneName: string;
  eventName: string;
  onSubmit: (data: {
    finalTimeHundredths: number;
    splits: number[];
    lane: string;
  }) => void;
}

export default function SwimmingTimerDashboard({
  athleteName,
  laneName,
  eventName,
  onSubmit,
}: Props) {
  const [state, setState] = useState<TimerState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [splits, setSplits] = useState<number[]>([]);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const audio = useAudioFeedback();

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
    setSplits([]);
    setState("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [audio, tick]);

  const handleStop = useCallback(() => {
    audio.stopBeep();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setState("stopped");
  }, [audio]);

  const handleLap = useCallback(() => {
    audio.lapClick();
    setSplits((prev) => [...prev, elapsed]);
  }, [audio, elapsed]);

  const handleCancel = useCallback(() => {
    setState("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handleConfirm = useCallback(() => {
    audio.confirmChime();
    setState("confirmed");
    onSubmit({
      finalTimeHundredths: elapsed,
      splits,
      lane: laneName,
    });
  }, [audio, elapsed, splits, laneName, onSubmit]);

  const handleReset = useCallback(() => {
    setElapsed(0);
    setSplits([]);
    setState("idle");
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="bg-blue-600 text-white font-bold text-lg px-3 py-1 rounded">
            {laneName}
          </div>
          <div className="text-right">
            <p className="font-semibold text-base truncate max-w-[200px]">
              {athleteName}
            </p>
            <p className="text-xs text-gray-400">{eventName}</p>
          </div>
        </div>
      </header>

      {/* Timer Display */}
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

        {state === "running" && (
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
            Running
          </p>
        )}
        {state === "stopped" && (
          <p className="text-xs text-red-400 mt-1 uppercase tracking-widest">
            Stopped — Confirm?
          </p>
        )}
        {state === "confirmed" && (
          <p className="text-xs text-blue-400 mt-1 uppercase tracking-widest">
            Submitted
          </p>
        )}
      </div>

      {/* Splits */}
      {splits.length > 0 && (
        <div className="px-4 pb-2 max-h-32 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Splits
          </p>
          <div className="space-y-1">
            {splits.map((s, i) => (
              <div
                key={i}
                className="flex justify-between text-sm font-mono bg-gray-900 rounded px-3 py-1"
              >
                <span className="text-gray-400">Lap {i + 1}</span>
                <span>{formatTime(s)}</span>
              </div>
            ))}
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
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleLap}
                className="py-5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-lg font-bold uppercase min-h-[60px]"
              >
                Lap
              </button>
              <button
                onClick={handleStop}
                className="py-5 rounded-xl bg-red-600 active:bg-red-700 text-white text-lg font-bold uppercase min-h-[60px]"
              >
                Stop
              </button>
            </div>
          </>
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
            onClick={handleReset}
            className="w-full py-4 rounded-xl bg-gray-800 active:bg-gray-700 text-gray-300 text-base font-semibold uppercase min-h-[48px]"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
