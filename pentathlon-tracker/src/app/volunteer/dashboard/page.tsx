"use client";

import { useEffect, useState, useCallback } from "react";
import SwimmingTimerDashboard from "@/components/volunteer/SwimmingTimerDashboard";
import FencingRankingDashboard from "@/components/volunteer/FencingRankingDashboard";
import ObstacleTimerDashboard from "@/components/volunteer/ObstacleTimerDashboard";
import ObstacleFlagDashboard from "@/components/volunteer/ObstacleFlagDashboard";
import LaserRunTimerDashboard from "@/components/volunteer/LaserRunTimerDashboard";
import RidingJudgeDashboard from "@/components/volunteer/RidingJudgeDashboard";

interface AthleteInfo {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
}

interface Assignment {
  id: string;
  role: string;
  event: {
    id: string;
    discipline: string;
    competition: { name: string };
  };
  metadata: string | null;
  athleteIds: string | null;
}

interface VolunteerInfo {
  name: string;
  competitionName: string;
  assignment: Assignment | null;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function VolunteerDashboardPage() {
  const [info, setInfo] = useState<VolunteerInfo | null>(null);
  const [athletes, setAthletes] = useState<AthleteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/volunteer/me")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load volunteer info");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setInfo(data);

        let athleteList: AthleteInfo[] = [];

        if (data.assignment?.metadata) {
          try {
            const meta = JSON.parse(data.assignment.metadata);
            if (meta.athletes && Array.isArray(meta.athletes)) {
              athleteList = meta.athletes.map(
                (a: {
                  id: string;
                  firstName?: string;
                  lastName?: string;
                  name?: string;
                }) => ({
                  id: a.id,
                  firstName: a.firstName || "",
                  lastName: a.lastName || "",
                  name:
                    a.name ||
                    `${a.firstName || ""} ${a.lastName || ""}`.trim(),
                  initials: `${(a.firstName || "?")[0]}${(a.lastName || "?")[0]}`,
                }),
              );
            }
          } catch {
            // metadata not athlete-related
          }
        }

        if (athleteList.length === 0 && data.assignment?.athleteIds) {
          try {
            const ids: string[] = JSON.parse(data.assignment.athleteIds);
            athleteList = ids.map((id, i) => ({
              id,
              firstName: "Athlete",
              lastName: `${i + 1}`,
              name: `Athlete ${i + 1}`,
              initials: `A${i + 1}`,
            }));
          } catch {
            // malformed athleteIds
          }
        }

        setAthletes(athleteList);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleSubmitScore = useCallback(
    async (athleteId: string, data: Record<string, unknown>) => {
      if (!info?.assignment) return;
      setSubmitStatus("submitting");
      setSubmitError("");

      try {
        const res = await fetch("/api/volunteer/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: info.assignment.event.id,
            athleteId,
            discipline: info.assignment.event.discipline,
            data,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to submit score");
        }

        setSubmitStatus("success");
        setTimeout(() => setSubmitStatus("idle"), 3000);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Submission failed");
        setSubmitStatus("error");
        setTimeout(() => setSubmitStatus("idle"), 5000);
      }
    },
    [info],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center p-8">
          <h1 className="text-xl font-bold text-red-400 mb-2">
            Session Expired
          </h1>
          <p className="text-gray-400">
            Please use your access link to reconnect.
          </p>
        </div>
      </div>
    );
  }

  if (!info.assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center p-8">
          <h1 className="text-xl font-bold text-white mb-2">
            Welcome, {info.name}
          </h1>
          <p className="text-lg text-gray-300 mb-1">{info.competitionName}</p>
          <div className="mt-6 p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <p className="text-amber-400">Waiting for assignment...</p>
            <p className="text-sm text-amber-500/70 mt-1">
              An administrator will assign you to an event shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const discipline = info.assignment.event.discipline;
  const role = info.assignment.role;
  const meta = info.assignment.metadata
    ? (() => {
        try {
          return JSON.parse(info.assignment!.metadata!);
        } catch {
          return {};
        }
      })()
    : {};

  const firstAthlete = athletes[0];

  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* Submit Status Toast */}
      {submitStatus === "submitting" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Submitting...
        </div>
      )}
      {submitStatus === "success" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          Score submitted successfully
        </div>
      )}
      {submitStatus === "error" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {submitError}
        </div>
      )}

      {/* Swimming Timer */}
      {discipline === "swimming" && role === "timer" && firstAthlete && (
        <SwimmingTimerDashboard
          athleteName={firstAthlete.name}
          laneName={meta.lane || "Lane ?"}
          eventName={info.assignment.event.competition.name}
          onSubmit={(data) =>
            handleSubmitScore(firstAthlete.id, {
              timeHundredths: data.finalTimeHundredths,
              splits: data.splits,
              lane: data.lane,
            })
          }
        />
      )}

      {/* Fencing Ranking Referee */}
      {discipline === "fencing_ranking" &&
        (role === "referee" || role === "recorder") &&
        athletes.length > 0 && (
          <FencingRankingDashboard
            poolName={meta.pool || "Pool ?"}
            athletes={athletes}
            eventName={info.assignment.event.competition.name}
            onSubmit={(data) => {
              const stats: Record<string, { victories: number; totalBouts: number }> = {};
              athletes.forEach((a) => { stats[a.id] = { victories: 0, totalBouts: 0 }; });
              data.results.forEach((r: { winner: string; loser: string }) => {
                if (stats[r.winner]) { stats[r.winner].victories++; stats[r.winner].totalBouts++; }
                if (stats[r.loser]) { stats[r.loser].totalBouts++; }
              });
              Object.entries(stats).forEach(([athleteId, s]) => {
                handleSubmitScore(athleteId, {
                  victories: s.victories,
                  totalBouts: s.totalBouts,
                  poolName: data.poolName,
                  rawResults: data.results,
                });
              });
            }}
          />
        )}

      {/* Obstacle Timer */}
      {discipline === "obstacle" && role === "timer" && athletes.length > 0 && (
        <ObstacleTimerDashboard
          laneName={meta.lane || "Lane ?"}
          athletes={athletes}
          eventName={info.assignment.event.competition.name}
          onSubmit={(data) =>
            handleSubmitScore(data.athleteId, {
              timeSeconds: data.timeHundredths / 100,
              lane: data.lane,
            })
          }
        />
      )}

      {/* Obstacle Flagger */}
      {discipline === "obstacle" && role === "flagger" && athletes.length > 0 && (
        <ObstacleFlagDashboard
          athletes={athletes}
          eventName={info.assignment.event.competition.name}
          onSubmit={(data) =>
            handleSubmitScore(data.athleteId, {
              yellowFlags: data.yellowFlags,
              redFlags: data.redFlags,
              flagLog: data.flagLog,
            })
          }
        />
      )}

      {/* Laser Run Timer */}
      {discipline === "laser_run" && role === "timer" && firstAthlete && (
        <LaserRunTimerDashboard
          athleteName={firstAthlete.name}
          handicapDelay={meta.handicapDelay ?? 0}
          targetPosition={meta.targetPosition ?? 1}
          wave={meta.wave ?? 1}
          gate={meta.gate ?? "A"}
          totalLaps={meta.totalLaps ?? 4}
          startMode={meta.startMode ?? "staggered"}
          eventName={info.assignment.event.competition.name}
          onSubmit={(data) =>
            handleSubmitScore(firstAthlete.id, {
              overallTimeSeconds: data.overallTimeSeconds,
              laps: data.laps,
              shootTimes: data.shootTimes,
              totalShootTimeSeconds: data.totalShootTimeSeconds,
              totalRunTimeSeconds: data.totalRunTimeSeconds,
              handicapStartDelay: data.handicapDelay,
              startMode: data.startMode,
              gateAssignment: data.gate,
              targetPosition: data.targetPosition,
              totalLaps: data.totalLaps,
              wave: data.wave,
            })
          }
        />
      )}

      {/* Riding Judge */}
      {discipline === "riding" && role === "judge" && firstAthlete && (
        <RidingJudgeDashboard
          athleteName={firstAthlete.name}
          eventName={info.assignment.event.competition.name}
          onSubmit={(data) =>
            handleSubmitScore(firstAthlete.id, {
              knockdowns: data.knockdowns,
              disobediences: data.disobediences,
              timeOverSeconds: data.timeOverSeconds,
              otherPenalties: data.otherPenalties,
              courseTimeSeconds: data.courseTimeSeconds,
              totalPenaltyPoints: data.totalPenaltyPoints,
              calculatedPoints: data.calculatedPoints,
            })
          }
        />
      )}

      {/* Fallback: unrecognized discipline/role combo */}
      {!["swimming", "fencing_ranking", "obstacle", "laser_run", "riding"].includes(discipline) && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <header className="bg-gray-900 w-full px-4 py-3 border-b border-gray-800 fixed top-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  {info.competitionName}
                </p>
                <p className="font-semibold text-white">
                  {info.name} — {role}
                </p>
              </div>
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </header>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center mt-16">
            <p className="text-lg font-semibold capitalize text-white">
              {discipline.replace("_", " ")}
            </p>
            <p className="text-sm text-gray-400 mt-1">Role: {role}</p>
            <p className="text-sm text-gray-500 mt-4">
              Dashboard not available for this discipline.
            </p>
          </div>
        </div>
      )}

      {/* Fallback: recognized discipline but no matching role/athletes */}
      {["swimming", "fencing_ranking", "obstacle", "laser_run", "riding"].includes(discipline) &&
        !(
          (discipline === "swimming" && role === "timer" && firstAthlete) ||
          (discipline === "fencing_ranking" && (role === "referee" || role === "recorder") && athletes.length > 0) ||
          (discipline === "obstacle" && role === "timer" && athletes.length > 0) ||
          (discipline === "obstacle" && role === "flagger" && athletes.length > 0) ||
          (discipline === "laser_run" && role === "timer" && firstAthlete) ||
          (discipline === "riding" && role === "judge" && firstAthlete)
        ) && (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center max-w-sm w-full">
              <p className="text-lg font-semibold capitalize mb-2">
                {discipline.replace("_", " ")}
              </p>
              <p className="text-sm text-gray-400 mb-4">Role: {role}</p>
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
                <p className="text-amber-400 text-sm">
                  Waiting for athlete assignment...
                </p>
                <p className="text-xs text-amber-500/70 mt-1">
                  An administrator needs to assign athletes to your role.
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
