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
    faultBeep: useCallback(() => playBeep(500, 80), [playBeep]),
    confirmChime: useCallback(() => {
      playBeep(523, 100);
      setTimeout(() => playBeep(659, 150), 120);
    }, [playBeep]),
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

const PENALTY_POINTS = {
  knockdown: 28,
  disobedience1: 40,
  disobedience2: 60,
  disobedience3: 100, // elimination-equivalent
  timeOverPerSecond: 4,
  otherPenalty: 20,
};

function CounterRow({
  label,
  value,
  onInc,
  onDec,
  penalty,
  color,
}: {
  label: string;
  value: number;
  onInc: () => void;
  onDec: () => void;
  penalty: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between bg-white rounded-[4px] border border-[#E9E9E7] px-4 py-3">
      <div>
        <p className="font-semibold text-sm text-[#37352F]">{label}</p>
        <p className={`text-xs ${color}`}>&minus;{penalty} pts</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onDec}
          disabled={value <= 0}
          className="w-12 h-12 rounded-full bg-[#F7F6F3] active:bg-[#E8E7E4] border border-[#E9E9E7] text-xl font-bold text-[#37352F] disabled:opacity-30 min-w-[48px] min-h-[48px]"
        >
          &minus;
        </button>
        <span className="text-2xl font-mono font-bold w-8 text-center text-[#37352F]">
          {value}
        </span>
        <button
          onClick={onInc}
          className="w-12 h-12 rounded-full bg-[#F7F6F3] active:bg-[#E8E7E4] border border-[#E9E9E7] text-xl font-bold text-[#37352F] min-w-[48px] min-h-[48px]"
        >
          +
        </button>
      </div>
    </div>
  );
}

type TimerState = "idle" | "running" | "stopped";

interface Props {
  athleteName: string;
  eventName: string;
  onSubmit: (data: {
    knockdowns: number;
    disobediences: number;
    timeOverSeconds: number;
    otherPenalties: number;
    courseTimeSeconds: number;
    totalPenaltyPoints: number;
    calculatedPoints: number;
  }) => void;
}

export default function RidingJudgeDashboard({
  athleteName,
  eventName,
  onSubmit,
}: Props) {
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [knockdowns, setKnockdowns] = useState(0);
  const [disobediences, setDisobediences] = useState(0);
  const [timeOver, setTimeOver] = useState(0);
  const [otherPenalties, setOtherPenalties] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const startRef = useRef(0);
  const rafRef = useRef<number>(0);
  const audio = useAudioFeedback();

  const tick = useCallback(() => {
    const now = performance.now();
    setElapsed((now - startRef.current) / 1000);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Calculate penalties live
  const knockdownPenalty = knockdowns * PENALTY_POINTS.knockdown;
  let disobediencePenalty = 0;
  if (disobediences >= 3) {
    disobediencePenalty =
      PENALTY_POINTS.disobedience1 +
      PENALTY_POINTS.disobedience2 +
      PENALTY_POINTS.disobedience3 +
      (disobediences - 3) * PENALTY_POINTS.disobedience3;
  } else if (disobediences === 2) {
    disobediencePenalty =
      PENALTY_POINTS.disobedience1 + PENALTY_POINTS.disobedience2;
  } else if (disobediences === 1) {
    disobediencePenalty = PENALTY_POINTS.disobedience1;
  }
  const timeOverPenalty = timeOver * PENALTY_POINTS.timeOverPerSecond;
  const otherPenaltyPoints = otherPenalties * PENALTY_POINTS.otherPenalty;
  const totalPenalty =
    knockdownPenalty + disobediencePenalty + timeOverPenalty + otherPenaltyPoints;
  const calculatedPoints = Math.max(0, 300 - totalPenalty);

  const handleStart = useCallback(() => {
    audio.startBeep();
    startRef.current = performance.now();
    setElapsed(0);
    setTimerState("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [audio, tick]);

  const handleStop = useCallback(() => {
    audio.stopBeep();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimerState("stopped");
  }, [audio]);

  const handleConfirm = useCallback(() => {
    audio.confirmChime();
    setSubmitted(true);
    onSubmit({
      knockdowns,
      disobediences,
      timeOverSeconds: timeOver,
      otherPenalties,
      courseTimeSeconds: elapsed,
      totalPenaltyPoints: totalPenalty,
      calculatedPoints,
    });
  }, [
    audio,
    knockdowns,
    disobediences,
    timeOver,
    otherPenalties,
    elapsed,
    totalPenalty,
    calculatedPoints,
    onSubmit,
  ]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FBFBFA] text-[#37352F] p-6">
        <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-[#DDEDEA] flex items-center justify-center mx-auto mb-4">
            <span className="text-[#0F7B6C] text-2xl font-bold">&#10003;</span>
          </div>
          <h2 className="text-lg font-semibold mb-1">Score Submitted</h2>
          <p className="text-sm text-[#787774] mb-4">{athleteName}</p>
          <div className="bg-[#FBF3DB] border border-[#DFAB01]/20 rounded-[4px] p-4">
            <p className="text-4xl font-bold text-[#D9730D]">{calculatedPoints}</p>
            <p className="text-xs text-[#787774] mt-1">points (of 300)</p>
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
          <div>
            <p className="font-semibold text-sm truncate max-w-[200px] text-[#37352F]">
              {athleteName}
            </p>
            <p className="text-xs text-[#9B9A97]">{eventName}</p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold font-mono ${calculatedPoints < 200 ? "text-[#E03E3E]" : calculatedPoints < 280 ? "text-[#D9730D]" : "text-[#0F7B6C]"}`}
            >
              {calculatedPoints}
            </p>
            <p className="text-xs text-[#9B9A97]">/ 300</p>
          </div>
        </div>
      </header>

      {/* Course Timer */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4 text-center">
          <p className="text-xs text-[#9B9A97] uppercase tracking-wider mb-1">
            Course Time
          </p>
          <p
            className={`font-mono font-bold text-3xl ${
              timerState === "running" ? "text-[#0F7B6C]" : timerState === "stopped" ? "text-[#37352F]" : "text-[#9B9A97]"
            }`}
          >
            {formatTime(elapsed)}
          </p>
          <div className="flex gap-3 mt-3 justify-center">
            {timerState === "idle" && (
              <button
                onClick={handleStart}
                className="px-8 py-2 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white font-semibold uppercase text-sm min-h-[48px]"
              >
                Start
              </button>
            )}
            {timerState === "running" && (
              <button
                onClick={handleStop}
                className="px-8 py-2 rounded-[4px] bg-[#E03E3E] active:bg-[#c43333] text-white font-semibold uppercase text-sm min-h-[48px]"
              >
                Stop
              </button>
            )}
            {timerState === "stopped" && (
              <button
                onClick={handleStart}
                className="px-6 py-2 rounded-[4px] bg-[#F7F6F3] active:bg-[#E8E7E4] text-[#37352F] border border-[#E9E9E7] font-semibold text-sm min-h-[48px]"
              >
                Restart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fault Counters */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto pb-2">
        <p className="text-xs text-[#9B9A97] uppercase tracking-wider mt-2">
          Penalties
        </p>

        <CounterRow
          label="Knockdowns"
          value={knockdowns}
          onInc={() => { audio.faultBeep(); setKnockdowns((v) => v + 1); }}
          onDec={() => { audio.faultBeep(); setKnockdowns((v) => Math.max(0, v - 1)); }}
          penalty={knockdownPenalty}
          color="text-[#E03E3E]"
        />

        <CounterRow
          label="Disobediences"
          value={disobediences}
          onInc={() => { audio.faultBeep(); setDisobediences((v) => v + 1); }}
          onDec={() => { audio.faultBeep(); setDisobediences((v) => Math.max(0, v - 1)); }}
          penalty={disobediencePenalty}
          color="text-[#D9730D]"
        />

        <CounterRow
          label="Time Over (sec)"
          value={timeOver}
          onInc={() => { audio.faultBeep(); setTimeOver((v) => v + 1); }}
          onDec={() => { audio.faultBeep(); setTimeOver((v) => Math.max(0, v - 1)); }}
          penalty={timeOverPenalty}
          color="text-[#DFAB01]"
        />

        <CounterRow
          label="Other Penalties"
          value={otherPenalties}
          onInc={() => { audio.faultBeep(); setOtherPenalties((v) => v + 1); }}
          onDec={() => { audio.faultBeep(); setOtherPenalties((v) => Math.max(0, v - 1)); }}
          penalty={otherPenaltyPoints}
          color="text-[#6940A5]"
        />

        {/* Penalty Summary */}
        <div className="bg-[#F7F6F3] rounded-[4px] border border-[#E9E9E7] px-4 py-3 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#787774]">Total Penalty</span>
            <span className="text-[#E03E3E] font-mono">&minus;{totalPenalty}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-[#787774]">Final Score</span>
            <span className="text-[#D9730D] font-bold font-mono">
              {calculatedPoints} / 300
            </span>
          </div>
        </div>
      </div>

      {/* Confirm */}
      <div className="p-4 pb-safe">
        <button
          onClick={handleConfirm}
          disabled={timerState !== "stopped"}
          className="w-full py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] disabled:bg-[#F7F6F3] disabled:text-[#9B9A97] disabled:border disabled:border-[#E9E9E7] text-white text-base font-semibold uppercase min-h-[56px]"
        >
          Confirm Score
        </button>
      </div>
    </div>
  );
}
