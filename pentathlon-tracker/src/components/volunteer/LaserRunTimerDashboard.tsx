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
    lapBeep: useCallback(() => playBeep(1200, 50), [playBeep]),
    shootStart: useCallback(() => playBeep(440, 100), [playBeep]),
    shootStop: useCallback(() => playBeep(550, 80, 2), [playBeep]),
    shootTimeout: useCallback(() => playBeep(300, 400), [playBeep]),
    confirmChime: useCallback(() => {
      playBeep(523, 100);
      setTimeout(() => playBeep(659, 150), 120);
    }, [playBeep]),
  };
}

function formatTimeSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

type MainState = "idle" | "running" | "stopped" | "confirmed";

interface LapRecord {
  lapNumber: number;
  type: "run" | "shoot";
  splitSeconds: number;
}

interface Props {
  athleteName: string;
  handicapDelay: number;
  targetPosition: number;
  wave: number;
  gate: string;
  totalLaps: number;
  startMode: "staggered" | "mass";
  eventName: string;
  onSubmit: (data: {
    overallTimeSeconds: number;
    laps: LapRecord[];
    totalShootTimeSeconds: number;
    totalRunTimeSeconds: number;
    handicapDelay: number;
    startMode: string;
    gate: string;
    targetPosition: number;
  }) => void;
}

const SHOOT_MAX_SECONDS = 50;

export default function LaserRunTimerDashboard({
  athleteName,
  handicapDelay,
  targetPosition,
  wave,
  gate,
  totalLaps,
  startMode,
  eventName,
  onSubmit,
}: Props) {
  const [mainState, setMainState] = useState<MainState>("idle");
  const [mainElapsed, setMainElapsed] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [shootElapsed, setShootElapsed] = useState(0);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const [currentLap, setCurrentLap] = useState(1);

  const mainStartRef = useRef(0);
  const mainRafRef = useRef<number>(0);
  const shootStartRef = useRef(0);
  const shootRafRef = useRef<number>(0);

  const audio = useAudioFeedback();

  // Main timer tick
  const mainTick = useCallback(() => {
    const now = performance.now();
    setMainElapsed((now - mainStartRef.current) / 1000);
    mainRafRef.current = requestAnimationFrame(mainTick);
  }, []);

  // Shoot timer tick with 50s auto-stop
  const shootTick = useCallback(() => {
    const now = performance.now();
    const elapsed = (now - shootStartRef.current) / 1000;
    if (elapsed >= SHOOT_MAX_SECONDS) {
      setShootElapsed(SHOOT_MAX_SECONDS);
      setShooting(false);
      audio.shootTimeout();
      setLaps((prev) => [
        ...prev,
        { lapNumber: currentLap, type: "shoot", splitSeconds: SHOOT_MAX_SECONDS },
      ]);
      return;
    }
    setShootElapsed(elapsed);
    shootRafRef.current = requestAnimationFrame(shootTick);
  }, [audio, currentLap]);

  useEffect(() => {
    return () => {
      if (mainRafRef.current) cancelAnimationFrame(mainRafRef.current);
      if (shootRafRef.current) cancelAnimationFrame(shootRafRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    audio.startBeep();
    mainStartRef.current = performance.now();
    setMainElapsed(0);
    setLaps([]);
    setCurrentLap(1);
    setMainState("running");
    mainRafRef.current = requestAnimationFrame(mainTick);
  }, [audio, mainTick]);

  const handleStop = useCallback(() => {
    audio.stopBeep();
    if (mainRafRef.current) cancelAnimationFrame(mainRafRef.current);
    if (shootRafRef.current) cancelAnimationFrame(shootRafRef.current);
    setShooting(false);
    setMainState("stopped");
  }, [audio]);

  const handleRunLap = useCallback(() => {
    audio.lapBeep();
    setLaps((prev) => [
      ...prev,
      { lapNumber: currentLap, type: "run", splitSeconds: mainElapsed },
    ]);
    setCurrentLap((c) => c + 1);
  }, [audio, currentLap, mainElapsed]);

  const handleShootLap = useCallback(() => {
    audio.shootStart();
    shootStartRef.current = performance.now();
    setShootElapsed(0);
    setShooting(true);
    shootRafRef.current = requestAnimationFrame(shootTick);
  }, [audio, shootTick]);

  const handleStopShoot = useCallback(() => {
    audio.shootStop();
    if (shootRafRef.current) cancelAnimationFrame(shootRafRef.current);
    setShooting(false);
    setLaps((prev) => [
      ...prev,
      { lapNumber: currentLap, type: "shoot", splitSeconds: shootElapsed },
    ]);
  }, [audio, currentLap, shootElapsed]);

  const handleCancel = useCallback(() => {
    setMainState("running");
    mainRafRef.current = requestAnimationFrame(mainTick);
  }, [mainTick]);

  const handleConfirm = useCallback(() => {
    audio.confirmChime();
    const shootLaps = laps.filter((l) => l.type === "shoot");
    const totalShoot = shootLaps.reduce((s, l) => s + l.splitSeconds, 0);
    setMainState("confirmed");
    onSubmit({
      overallTimeSeconds: mainElapsed,
      laps,
      totalShootTimeSeconds: totalShoot,
      totalRunTimeSeconds: mainElapsed - totalShoot,
      handicapDelay,
      startMode,
      gate,
      targetPosition,
    });
  }, [
    audio,
    laps,
    mainElapsed,
    handicapDelay,
    startMode,
    gate,
    targetPosition,
    onSubmit,
  ]);

  const isRunning = mainState === "running" && !shooting;
  const isShooting = mainState === "running" && shooting;

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
          <div className="text-right text-xs space-y-0.5">
            <p className="text-gray-400">
              Wave {wave} · Gate {gate} · T{targetPosition}
            </p>
            {startMode === "staggered" && handicapDelay > 0 && (
              <p className="text-amber-400">
                Handicap: +{handicapDelay}s
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          className={`font-mono font-bold tracking-wider transition-colors ${
            mainState === "running"
              ? shooting
                ? "text-orange-400"
                : "text-green-400"
              : mainState === "stopped"
                ? "text-red-400"
                : mainState === "confirmed"
                  ? "text-blue-400"
                  : "text-white"
          }`}
          style={{ fontSize: "clamp(42px, 12vw, 72px)" }}
        >
          {formatTimeSeconds(mainElapsed)}
        </div>

        {/* Lap Counter */}
        <p className="text-sm text-gray-400 mt-2">
          Lap {Math.min(currentLap, totalLaps)} of {totalLaps}
        </p>

        {/* Shoot Sub-Timer (inline) */}
        {isShooting && (
          <div className="mt-4 bg-orange-900/30 border border-orange-700/50 rounded-xl px-6 py-3 text-center">
            <p className="text-xs text-orange-400 uppercase tracking-wider mb-1">
              Shooting
            </p>
            <p className="text-3xl font-mono font-bold text-orange-300">
              {shootElapsed.toFixed(1)}s
            </p>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min((shootElapsed / SHOOT_MAX_SECONDS) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {mainState === "stopped" && (
          <p className="text-xs text-red-400 mt-2 uppercase tracking-widest">
            Stopped — Confirm?
          </p>
        )}
        {mainState === "confirmed" && (
          <p className="text-xs text-blue-400 mt-2 uppercase tracking-widest">
            Submitted
          </p>
        )}
      </div>

      {/* Lap Splits */}
      {laps.length > 0 && mainState !== "confirmed" && (
        <div className="px-4 pb-2 max-h-28 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Lap Splits
          </p>
          <div className="space-y-1">
            {laps
              .filter((l) => l.type === "run")
              .map((l, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm font-mono bg-gray-900 rounded px-3 py-1"
                >
                  <span className="text-gray-400">Lap {l.lapNumber}</span>
                  <span>{formatTimeSeconds(l.splitSeconds)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 space-y-3 pb-safe">
        {mainState === "idle" && (
          <button
            onClick={handleStart}
            className="w-full py-5 rounded-xl bg-green-600 active:bg-green-700 text-white text-xl font-bold uppercase tracking-wider min-h-[60px]"
          >
            Start
          </button>
        )}

        {isRunning && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRunLap}
                className="py-5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-lg font-bold uppercase min-h-[60px]"
              >
                Run Lap
              </button>
              <button
                onClick={handleShootLap}
                className="py-5 rounded-xl bg-orange-500 active:bg-orange-600 text-white text-lg font-bold uppercase min-h-[60px]"
              >
                Shoot Lap
              </button>
            </div>
            <button
              onClick={handleStop}
              className="w-full py-4 rounded-xl bg-red-600 active:bg-red-700 text-white text-lg font-bold uppercase min-h-[56px]"
            >
              Stop
            </button>
          </>
        )}

        {isShooting && (
          <button
            onClick={handleStopShoot}
            className="w-full py-5 rounded-xl bg-orange-600 active:bg-orange-700 text-white text-xl font-bold uppercase tracking-wider min-h-[60px] animate-pulse"
          >
            Stop Shoot
          </button>
        )}

        {mainState === "stopped" && (
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

        {mainState === "confirmed" && (
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-400">Score submitted</p>
          </div>
        )}
      </div>
    </div>
  );
}
