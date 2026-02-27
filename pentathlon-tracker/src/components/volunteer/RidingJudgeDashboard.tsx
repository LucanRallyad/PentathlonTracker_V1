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
      <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
        <div>
          <p className="font-semibold text-sm">{label}</p>
          <p className={`text-xs ${color}`}>−{penalty} pts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audio.faultBeep();
              onDec();
            }}
            disabled={value <= 0}
            className="w-12 h-12 rounded-full bg-gray-800 active:bg-gray-700 text-xl font-bold disabled:opacity-30 min-w-[48px] min-h-[48px]"
          >
            −
          </button>
          <span className="text-2xl font-mono font-bold w-8 text-center">
            {value}
          </span>
          <button
            onClick={() => {
              audio.faultBeep();
              onInc();
            }}
            className="w-12 h-12 rounded-full bg-gray-800 active:bg-gray-700 text-xl font-bold min-w-[48px] min-h-[48px]"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
        <div className="text-green-400 text-6xl mb-4">✓</div>
        <h2 className="text-xl font-bold mb-2">Score Submitted</h2>
        <p className="text-gray-400 text-sm mb-4">{athleteName}</p>
        <div className="bg-gray-900 rounded-xl p-4 w-full max-w-xs text-center">
          <p className="text-4xl font-bold text-yellow-400">{calculatedPoints}</p>
          <p className="text-xs text-gray-500 mt-1">points (of 300)</p>
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
            <p className="font-bold text-base truncate max-w-[200px]">
              {athleteName}
            </p>
            <p className="text-xs text-gray-400">{eventName}</p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold font-mono ${calculatedPoints < 200 ? "text-red-400" : calculatedPoints < 280 ? "text-yellow-400" : "text-green-400"}`}
            >
              {calculatedPoints}
            </p>
            <p className="text-xs text-gray-500">/ 300</p>
          </div>
        </div>
      </header>

      {/* Course Timer */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Course Time
          </p>
          <p
            className={`font-mono font-bold text-3xl ${
              timerState === "running" ? "text-green-400" : timerState === "stopped" ? "text-white" : "text-gray-600"
            }`}
          >
            {formatTime(elapsed)}
          </p>
          <div className="flex gap-3 mt-3 justify-center">
            {timerState === "idle" && (
              <button
                onClick={handleStart}
                className="px-8 py-2 rounded-lg bg-green-600 active:bg-green-700 text-white font-bold uppercase text-sm min-h-[48px]"
              >
                Start
              </button>
            )}
            {timerState === "running" && (
              <button
                onClick={handleStop}
                className="px-8 py-2 rounded-lg bg-red-600 active:bg-red-700 text-white font-bold uppercase text-sm min-h-[48px]"
              >
                Stop
              </button>
            )}
            {timerState === "stopped" && (
              <button
                onClick={handleStart}
                className="px-6 py-2 rounded-lg bg-gray-800 active:bg-gray-700 text-gray-300 font-semibold text-sm min-h-[48px]"
              >
                Restart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fault Counters */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto pb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-2">
          Penalties
        </p>

        <CounterRow
          label="Knockdowns"
          value={knockdowns}
          onInc={() => setKnockdowns((v) => v + 1)}
          onDec={() => setKnockdowns((v) => Math.max(0, v - 1))}
          penalty={knockdownPenalty}
          color="text-red-400"
        />

        <CounterRow
          label="Disobediences"
          value={disobediences}
          onInc={() => setDisobediences((v) => v + 1)}
          onDec={() => setDisobediences((v) => Math.max(0, v - 1))}
          penalty={disobediencePenalty}
          color="text-orange-400"
        />

        <CounterRow
          label="Time Over (sec)"
          value={timeOver}
          onInc={() => setTimeOver((v) => v + 1)}
          onDec={() => setTimeOver((v) => Math.max(0, v - 1))}
          penalty={timeOverPenalty}
          color="text-yellow-400"
        />

        <CounterRow
          label="Other Penalties"
          value={otherPenalties}
          onInc={() => setOtherPenalties((v) => v + 1)}
          onDec={() => setOtherPenalties((v) => Math.max(0, v - 1))}
          penalty={otherPenaltyPoints}
          color="text-purple-400"
        />

        {/* Penalty Summary */}
        <div className="bg-gray-900/50 rounded-xl px-4 py-3 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Penalty</span>
            <span className="text-red-400 font-mono">−{totalPenalty}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Final Score</span>
            <span className="text-yellow-400 font-bold font-mono">
              {calculatedPoints} / 300
            </span>
          </div>
        </div>
      </div>

      {/* Confirm */}
      <div className="p-4 pb-safe">
        <button
          onClick={handleConfirm}
          disabled={timerState === "running"}
          className="w-full py-5 rounded-xl bg-green-600 active:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white text-lg font-bold uppercase min-h-[60px]"
        >
          Confirm Score
        </button>
      </div>
    </div>
  );
}
