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
  variant?: "mobile" | "desktop";
  onSubmit: (data: {
    overallTimeSeconds: number;
    laps: { lap: number; splitTimestamp: number; type: "run" | "shoot" }[];
    shootTimes: { visit: number; shootTimeSeconds: number; timedOut: boolean }[];
    totalShootTimeSeconds: number;
    totalRunTimeSeconds: number;
    handicapDelay: number;
    startMode: string;
    gate: string;
    targetPosition: number;
    totalLaps: number;
    wave: number;
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
  variant = "mobile",
  onSubmit,
}: Props) {
  const [mainState, setMainState] = useState<MainState>("idle");
  const [mainElapsed, setMainElapsed] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [shootElapsed, setShootElapsed] = useState(0);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const [currentLap, setCurrentLap] = useState(1);
  const isDesktop = variant === "desktop";

  const mainStartRef = useRef(0);
  const mainPausedAtRef = useRef(0);
  const mainRafRef = useRef<number>(0);
  const shootStartRef = useRef(0);
  const shootRafRef = useRef<number>(0);
  const shootElapsedRef = useRef(0);
  const currentLapRef = useRef(1);

  const audio = useAudioFeedback();

  const mainTick = useCallback(() => {
    const now = performance.now();
    setMainElapsed((now - mainStartRef.current) / 1000);
    mainRafRef.current = requestAnimationFrame(mainTick);
  }, []);

  const shootTick = useCallback(() => {
    const now = performance.now();
    const elapsed = (now - shootStartRef.current) / 1000;
    if (elapsed >= SHOOT_MAX_SECONDS) {
      setShootElapsed(SHOOT_MAX_SECONDS);
      shootElapsedRef.current = SHOOT_MAX_SECONDS;
      setShooting(false);
      if (shootRafRef.current) cancelAnimationFrame(shootRafRef.current);
      audio.shootTimeout();
      setLaps((prev) => [
        ...prev,
        { lapNumber: currentLapRef.current, type: "shoot", splitSeconds: SHOOT_MAX_SECONDS },
      ]);
      return;
    }
    setShootElapsed(elapsed);
    shootElapsedRef.current = elapsed;
    shootRafRef.current = requestAnimationFrame(shootTick);
  }, [audio]);

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
    currentLapRef.current = 1;
    setMainState("running");
    mainRafRef.current = requestAnimationFrame(mainTick);
  }, [audio, mainTick]);

  const handleStop = useCallback(() => {
    audio.stopBeep();
    if (mainRafRef.current) cancelAnimationFrame(mainRafRef.current);
    if (shootRafRef.current) cancelAnimationFrame(shootRafRef.current);
    mainPausedAtRef.current = performance.now();
    setShooting(false);
    setMainState("stopped");
  }, [audio]);

  const handleRunLap = useCallback(() => {
    audio.lapBeep();
    setLaps((prev) => [
      ...prev,
      { lapNumber: currentLapRef.current, type: "run", splitSeconds: mainElapsed },
    ]);
    setCurrentLap((c) => {
      currentLapRef.current = c + 1;
      return c + 1;
    });
  }, [audio, mainElapsed]);

  const handleShootLap = useCallback(() => {
    audio.shootStart();
    shootStartRef.current = performance.now();
    setShootElapsed(0);
    shootElapsedRef.current = 0;
    setShooting(true);
    shootRafRef.current = requestAnimationFrame(shootTick);
  }, [audio, shootTick]);

  const handleStopShoot = useCallback(() => {
    audio.shootStop();
    if (shootRafRef.current) cancelAnimationFrame(shootRafRef.current);
    setShooting(false);
    const finalShootElapsed = shootElapsedRef.current;
    setLaps((prev) => [
      ...prev,
      { lapNumber: currentLapRef.current, type: "shoot", splitSeconds: finalShootElapsed },
    ]);
  }, [audio]);

  const handleCancel = useCallback(() => {
    const pauseDuration = performance.now() - mainPausedAtRef.current;
    mainStartRef.current += pauseDuration;
    setMainState("running");
    mainRafRef.current = requestAnimationFrame(mainTick);
  }, [mainTick]);

  const handleConfirm = useCallback(() => {
    audio.confirmChime();
    const shootLaps = laps.filter((l) => l.type === "shoot");
    const totalShoot = shootLaps.reduce((s, l) => s + l.splitSeconds, 0);

    const apiLaps = laps.map((l) => ({
      lap: l.lapNumber,
      splitTimestamp: l.splitSeconds,
      type: l.type,
    }));

    const apiShootTimes = shootLaps.map((l, i) => ({
      visit: i + 1,
      shootTimeSeconds: l.splitSeconds,
      timedOut: l.splitSeconds >= SHOOT_MAX_SECONDS,
    }));

    setMainState("confirmed");
    onSubmit({
      overallTimeSeconds: mainElapsed,
      laps: apiLaps,
      shootTimes: apiShootTimes,
      totalShootTimeSeconds: totalShoot,
      totalRunTimeSeconds: Math.max(0, mainElapsed - totalShoot),
      handicapDelay,
      startMode,
      gate,
      targetPosition,
      totalLaps,
      wave,
    });
  }, [
    audio,
    laps,
    mainElapsed,
    handicapDelay,
    startMode,
    gate,
    targetPosition,
    totalLaps,
    wave,
    onSubmit,
  ]);

  const isRunning = mainState === "running" && !shooting;
  const isShooting = mainState === "running" && shooting;

  const timerColorClass =
    mainState === "running"
      ? shooting
        ? "text-[#D9730D]"
        : "text-[#0F7B6C]"
      : mainState === "stopped"
        ? "text-[#E03E3E]"
        : mainState === "confirmed"
          ? "text-[#0B6E99]"
          : "text-[#37352F]";

  const shootPanel = (
    <div className={`${isShooting ? "bg-[#FAEBDD] border-[#D9730D]/20" : "bg-[#F7F6F3] border-[#E9E9E7]"} border rounded-[4px] px-6 py-4 text-center`}>
      <p className={`text-xs uppercase tracking-wider mb-1 font-medium ${isShooting ? "text-[#D9730D]" : "text-[#9B9A97]"}`}>
        {isShooting ? "Shooting" : "Shoot Timer"}
      </p>
      <p className={`text-3xl font-mono font-bold ${isShooting ? "text-[#D9730D]" : "text-[#9B9A97]"}`}>
        {isShooting ? `${shootElapsed.toFixed(1)}s` : "Ready"}
      </p>
      {isShooting && (
        <div className="w-full bg-[#E9E9E7] rounded-full h-1.5 mt-2">
          <div
            className="bg-[#D9730D] h-1.5 rounded-full transition-all"
            style={{
              width: `${Math.min((shootElapsed / SHOOT_MAX_SECONDS) * 100, 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );

  const lapSplits = (
    <div className={isDesktop ? "flex-1 overflow-y-auto" : "max-h-28 overflow-y-auto"}>
      <p className="text-xs text-[#9B9A97] uppercase tracking-wider mb-1">Lap Splits</p>
      <div className="space-y-1">
        {laps
          .filter((l) => l.type === "run")
          .map((l, i) => (
            <div
              key={i}
              className="flex justify-between items-center text-sm font-mono bg-white rounded-[4px] border border-[#E9E9E7] px-3 py-2 sm:py-1.5"
            >
              <span className="text-[#787774]">Lap {l.lapNumber}</span>
              <span className="text-[#37352F] text-base sm:text-sm font-semibold">{formatTimeSeconds(l.splitSeconds)}</span>
            </div>
          ))}
      </div>
    </div>
  );

  const controls = (
    <div className={`space-y-3 ${isDesktop ? "max-w-md mx-auto w-full" : ""}`}>
      {mainState === "idle" && (
        <button
          onClick={handleStart}
          className={`w-full py-4 rounded-[4px] bg-[#0F7B6C] active:bg-[#0a6358] text-white text-lg font-semibold uppercase tracking-wider ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
        >
          Start
        </button>
      )}
      {isRunning && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRunLap}
              className={`py-4 rounded-[4px] bg-[#0B6E99] active:bg-[#095a7d] text-white text-base font-semibold uppercase ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
            >
              Run Lap
            </button>
            <button
              onClick={handleShootLap}
              className={`py-4 rounded-[4px] bg-[#D9730D] active:bg-[#c46509] text-white text-base font-semibold uppercase ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
            >
              Shoot Lap
            </button>
          </div>
          <button
            onClick={handleStop}
            className={`w-full py-3.5 rounded-[4px] bg-[#E03E3E] active:bg-[#c43333] text-white text-base font-semibold uppercase ${isDesktop ? "min-h-[40px]" : "min-h-[48px]"}`}
          >
            Stop
          </button>
        </>
      )}
      {isShooting && (
        <button
          onClick={handleStopShoot}
          className={`w-full py-4 rounded-[4px] bg-[#D9730D] active:bg-[#c46509] text-white text-lg font-semibold uppercase tracking-wider animate-pulse ${isDesktop ? "min-h-[48px]" : "min-h-[56px]"}`}
        >
          Stop Shoot
        </button>
      )}
      {mainState === "stopped" && (
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
      {mainState === "confirmed" && (
        <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4 text-center">
          <p className="text-sm text-[#787774]">Score submitted</p>
        </div>
      )}
    </div>
  );

  /* ─── Desktop Layout ─── */
  if (isDesktop) {
    return (
      <div className="flex flex-row min-h-[600px] bg-[#FBFBFA] text-[#37352F] rounded-[4px] border border-[#E9E9E7] overflow-hidden">
        {/* Left — Main Timer + Controls */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white px-6 py-4 border-b border-[#E9E9E7]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-[#37352F]">{athleteName}</p>
                <p className="text-xs text-[#9B9A97]">{eventName}</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p className="text-[#787774]">Wave {wave} · Gate {gate} · T{targetPosition}</p>
                {startMode === "staggered" && handicapDelay > 0 && (
                  <p className="text-[#D9730D] font-medium">Handicap: +{handicapDelay}s</p>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div
              className={`font-mono font-bold tracking-wider transition-colors ${timerColorClass}`}
              style={{ fontSize: "clamp(56px, 6vw, 100px)" }}
            >
              {formatTimeSeconds(mainElapsed)}
            </div>
            <p className="text-sm text-[#787774] mt-2">
              Lap {Math.min(currentLap, totalLaps)} of {totalLaps}
            </p>
            {mainState === "stopped" && (
              <p className="text-xs text-[#E03E3E] mt-2 uppercase tracking-widest font-medium">Stopped — Confirm?</p>
            )}
            {mainState === "confirmed" && (
              <p className="text-xs text-[#0B6E99] mt-2 uppercase tracking-widest font-medium">Submitted</p>
            )}
          </div>

          <div className="px-6 pb-6">{controls}</div>
        </div>

        {/* Right — Shoot Timer + Lap Splits */}
        <div className="w-[340px] border-l border-[#E9E9E7] bg-white flex flex-col">
          <div className="p-5 border-b border-[#E9E9E7]">
            {shootPanel}
          </div>
          <div className="flex-1 p-5 overflow-y-auto">
            {laps.length > 0 && mainState !== "confirmed" ? (
              lapSplits
            ) : (
              <p className="text-sm text-[#9B9A97] text-center py-6">No splits yet</p>
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
          <div>
            <p className="font-semibold text-sm truncate max-w-[200px] text-[#37352F]">{athleteName}</p>
            <p className="text-xs text-[#9B9A97]">{eventName}</p>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <p className="text-[#787774]">Wave {wave} · Gate {gate} · T{targetPosition}</p>
            {startMode === "staggered" && handicapDelay > 0 && (
              <p className="text-[#D9730D] font-medium">Handicap: +{handicapDelay}s</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          className={`font-mono font-bold tracking-wider transition-colors ${timerColorClass}`}
          style={{ fontSize: "clamp(42px, 12vw, 72px)" }}
        >
          {formatTimeSeconds(mainElapsed)}
        </div>
        <p className="text-sm text-[#787774] mt-2">
          Lap {Math.min(currentLap, totalLaps)} of {totalLaps}
        </p>

        {isShooting && (
          <div className="mt-4 bg-[#FAEBDD] border border-[#D9730D]/20 rounded-[4px] px-6 py-3 text-center">
            <p className="text-xs text-[#D9730D] uppercase tracking-wider mb-1 font-medium">Shooting</p>
            <p className="text-3xl font-mono font-bold text-[#D9730D]">{shootElapsed.toFixed(1)}s</p>
            <div className="w-full bg-[#E9E9E7] rounded-full h-1.5 mt-2">
              <div
                className="bg-[#D9730D] h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min((shootElapsed / SHOOT_MAX_SECONDS) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {mainState === "stopped" && (
          <p className="text-xs text-[#E03E3E] mt-2 uppercase tracking-widest font-medium">Stopped — Confirm?</p>
        )}
        {mainState === "confirmed" && (
          <p className="text-xs text-[#0B6E99] mt-2 uppercase tracking-widest font-medium">Submitted</p>
        )}
      </div>

      {laps.length > 0 && mainState !== "confirmed" && (
        <div className="px-4 pb-2">{lapSplits}</div>
      )}

      <div className="p-4 pb-safe">{controls}</div>
    </div>
  );
}
