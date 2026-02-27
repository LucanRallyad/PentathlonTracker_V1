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
  variant?: "mobile" | "desktop";
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
  variant = "mobile",
  onSubmit,
}: Props) {
  const [state, setState] = useState<TimerState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [splits, setSplits] = useState<number[]>([]);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const rafRef = useRef<number>(0);
  const audio = useAudioFeedback();
  const isDesktop = variant === "desktop";

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
    pausedAtRef.current = performance.now();
    setState("stopped");
  }, [audio]);

  const handleLap = useCallback(() => {
    audio.lapClick();
    setSplits((prev) => [...prev, elapsed]);
  }, [audio, elapsed]);

  const handleCancel = useCallback(() => {
    const pauseDuration = performance.now() - pausedAtRef.current;
    startTimeRef.current += pauseDuration;
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

  const timerColorClass =
    state === "running"
      ? "text-[#0F7B6C]"
      : state === "stopped"
        ? "text-[#E03E3E]"
        : state === "confirmed"
          ? "text-[#0B6E99]"
          : "text-[#37352F]";

  const statusLabel =
    state === "running" ? (
      <p className="text-xs text-[#0F7B6C] mt-1 uppercase tracking-widest font-medium">Running</p>
    ) : state === "stopped" ? (
      <p className="text-xs text-[#E03E3E] mt-1 uppercase tracking-widest font-medium">Stopped — Confirm?</p>
    ) : state === "confirmed" ? (
      <p className="text-xs text-[#0B6E99] mt-1 uppercase tracking-widest font-medium">Submitted</p>
    ) : null;

  const controls = (
    <div className={`space-y-3 ${isDesktop ? "max-w-md mx-auto w-full" : ""}`}>
      {state === "idle" && (
        <button
          onClick={handleStart}
          className={`w-full py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white text-lg font-semibold uppercase tracking-wider ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
        >
          Start
        </button>
      )}
      {state === "running" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleLap}
            className={`py-4 rounded-[4px] bg-[#0B6E99] active:bg-[#095a7d] text-white text-base font-semibold uppercase ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
          >
            Lap
          </button>
          <button
            onClick={handleStop}
            className={`py-4 rounded-[4px] bg-[#E03E3E] active:bg-[#c43333] text-white text-base font-semibold uppercase ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
          >
            Stop
          </button>
        </div>
      )}
      {state === "stopped" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCancel}
            className={`py-4 rounded-[4px] bg-[#F7F6F3] active:bg-[#E8E7E4] text-[#37352F] border border-[#E9E9E7] text-base font-semibold uppercase ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white text-base font-semibold uppercase ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
          >
            Confirm
          </button>
        </div>
      )}
      {state === "confirmed" && (
        <button
          onClick={handleReset}
          className={`w-full py-3.5 rounded-[4px] bg-[#F7F6F3] active:bg-[#E8E7E4] text-[#787774] border border-[#E9E9E7] text-sm font-semibold uppercase ${isDesktop ? "min-h-[40px]" : "min-h-[48px]"}`}
        >
          Done
        </button>
      )}
    </div>
  );

  const splitsPanel = (
    <div className={`${isDesktop ? "flex-1 overflow-y-auto" : "max-h-32 overflow-y-auto"}`}>
      <p className="text-xs text-[#9B9A97] uppercase tracking-wider mb-1">Splits</p>
      <div className="space-y-1">
        {splits.map((s, i) => (
          <div
            key={i}
            className="flex justify-between text-sm font-mono bg-white rounded-[4px] border border-[#E9E9E7] px-3 py-1.5"
          >
            <span className="text-[#787774]">Lap {i + 1}</span>
            <span className="text-[#37352F]">{formatTime(s)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── Desktop Layout ─── */
  if (isDesktop) {
    return (
      <div className="flex flex-row min-h-[600px] bg-[#FBFBFA] text-[#37352F] rounded-[4px] border border-[#E9E9E7] overflow-hidden">
        {/* Left Panel — Timer + Controls */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white px-6 py-4 border-b border-[#E9E9E7]">
            <div className="flex items-center justify-between">
              <div className="bg-[#DDEBF1] text-[#0B6E99] font-semibold text-sm px-3 py-1 rounded-[3px]">
                {laneName}
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-[#37352F]">{athleteName}</p>
                <p className="text-xs text-[#9B9A97]">{eventName}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div
              className={`font-mono font-bold tracking-wider transition-colors ${timerColorClass}`}
              style={{ fontSize: "clamp(64px, 6vw, 120px)" }}
            >
              {formatTime(elapsed)}
            </div>
            {statusLabel}
          </div>

          <div className="px-6 pb-6">{controls}</div>
        </div>

        {/* Right Panel — Info + Splits */}
        <div className="w-[340px] border-l border-[#E9E9E7] bg-white flex flex-col">
          <div className="p-5 border-b border-[#E9E9E7]">
            <p className="text-[11px] text-[#9B9A97] uppercase tracking-wider mb-1">Athlete</p>
            <p className="font-semibold text-[#37352F]">{athleteName}</p>
            <p className="text-xs text-[#787774] mt-0.5">{eventName} · {laneName}</p>
          </div>
          <div className="flex-1 p-5 overflow-y-auto">
            {splits.length > 0 ? (
              splitsPanel
            ) : (
              <p className="text-sm text-[#9B9A97] text-center py-8">No splits recorded yet</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Mobile Layout (original) ─── */
  return (
    <div className="flex flex-col min-h-screen bg-[#FBFBFA] text-[#37352F]">
      <header className="bg-white px-4 py-3 border-b border-[#E9E9E7]">
        <div className="flex items-center justify-between">
          <div className="bg-[#DDEBF1] text-[#0B6E99] font-semibold text-sm px-3 py-1 rounded-[3px]">
            {laneName}
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm truncate max-w-[200px] text-[#37352F]">{athleteName}</p>
            <p className="text-xs text-[#9B9A97]">{eventName}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          className={`font-mono font-bold tracking-wider transition-colors ${timerColorClass}`}
          style={{ fontSize: "clamp(48px, 14vw, 80px)" }}
        >
          {formatTime(elapsed)}
        </div>
        {statusLabel}
      </div>

      {splits.length > 0 && <div className="px-4 pb-2">{splitsPanel}</div>}

      <div className="p-4 pb-safe">{controls}</div>
    </div>
  );
}
