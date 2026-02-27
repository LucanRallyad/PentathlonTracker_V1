"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import {
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Target,
  Printer,
  Zap,
  Check,
  Radio,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Assignment {
  targetPosition: number;
  athleteId: string;
  athleteName: string;
  wave: number;
  rank: number;
  points: number;
}

interface LaserRunConfig {
  targetCount?: number;
  assignments?: Assignment[];
  released?: boolean;
  releasedAt?: string;
  startMode?: "staggered" | "mass";
  totalLaps?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LaserRunTargetsPage() {
  const { id } = useParams<{ id: string }>();

  const [config, setConfig] = useState<LaserRunConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [targetCount, setTargetCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Release modal
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseStartMode, setReleaseStartMode] = useState<"staggered" | "mass">("staggered");
  const [releaseTotalLaps, setReleaseTotalLaps] = useState(4);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState("");

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitions/${id}/laser-run-targets`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.targetCount) setTargetCount(data.targetCount);
        if (data.totalLaps) setReleaseTotalLaps(data.totalLaps);
        if (data.startMode) setReleaseStartMode(data.startMode);
      } else if (res.status !== 404) {
        const data = await res.json();
        setError(data.error || "Failed to load config");
      }
    } catch {
      setError("Failed to load laser run config");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ── Generate assignments ─────────────────────────────────────────────────

  async function handleGenerate() {
    if (targetCount < 1) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/competitions/${id}/laser-run-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCount }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to generate assignments");
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  }

  // ── Move assignment up/down ──────────────────────────────────────────────

  function moveAssignment(index: number, direction: "up" | "down") {
    const assignments = [...(config.assignments || [])];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= assignments.length) return;

    [assignments[index], assignments[swapIdx]] = [assignments[swapIdx], assignments[index]];

    const tc = config.targetCount || targetCount;
    const reindexed = assignments.map((a, idx) => ({
      ...a,
      targetPosition: (idx % tc) + 1,
      wave: Math.floor(idx / tc) + 1,
    }));

    setConfig({ ...config, assignments: reindexed });
  }

  // ── Save manual reorder ──────────────────────────────────────────────────

  async function handleSaveOrder() {
    if (!config.assignments?.length) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/competitions/${id}/laser-run-targets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: config.assignments }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save order");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  // ── Release ──────────────────────────────────────────────────────────────

  async function handleRelease() {
    setReleasing(true);
    setReleaseError("");
    try {
      const res = await fetch(`/api/competitions/${id}/laser-run-targets/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startMode: releaseStartMode, totalLaps: releaseTotalLaps }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setShowReleaseModal(false);
      } else {
        const data = await res.json();
        setReleaseError(data.error || "Failed to release");
      }
    } catch {
      setReleaseError("Network error");
    } finally {
      setReleasing(false);
    }
  }

  // ── Print ────────────────────────────────────────────────────────────────

  function handlePrint() {
    window.print();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  const assignments = config.assignments || [];
  const waves = [...new Set(assignments.map((a) => a.wave))].sort((a, b) => a - b);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Loading..." }]} />
        <div className="max-w-[960px] mx-auto px-6 py-12">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#9B9A97]" />
            <span className="text-sm text-[#9B9A97]">Loading laser run targets...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: "Laser Run Targets" },
        ]}
      />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight">
              Laser Run Target Assignments
            </h1>
            <p className="text-sm text-[#787774] mt-1">
              {assignments.length} athlete{assignments.length !== 1 ? "s" : ""} ·{" "}
              {waves.length} wave{waves.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge */}
            {config.released ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#DBEDDB] text-[#0F7B6C]">
                <Check size={12} />
                Released
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F7F6F3] text-[#787774]">
                <Radio size={12} />
                Draft
              </span>
            )}

            {assignments.length > 0 && (
              <>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#37352F] bg-[#F7F6F3] rounded-[3px] hover:bg-[#EFEFEF] transition-colors"
                >
                  <Printer size={14} />
                  Print
                </button>
                {!config.released && (
                  <button
                    onClick={() => {
                      setShowReleaseModal(true);
                      setReleaseError("");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0F7B6C] rounded-[3px] hover:bg-[#0a6358] transition-colors"
                  >
                    <Zap size={14} />
                    Release
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-[#E03E3E] bg-[#FBE4E4] px-3 py-2 rounded-[3px]">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* ── Generate Panel ── */}
        <section className="border border-[#E9E9E7] rounded-[4px] bg-[#FBFBFA] p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#D9730D]" />
            <h2 className="text-sm font-medium text-[#37352F]">Generate Target Assignments</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-[#787774] mb-1">
                Number of Targets
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={targetCount}
                onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32 px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#D9730D] rounded-[3px] hover:bg-[#c2670c] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Generate Assignments
            </button>
          </div>

          <p className="text-xs text-[#9B9A97]">
            Athletes are ranked by cumulative points from prior events. Rank 1 gets Target 1, wrapping into waves.
          </p>
        </section>

        {/* ── Assignments Table ── */}
        {assignments.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
                Assignments ({assignments.length})
              </h2>
              {!config.released && (
                <button
                  onClick={handleSaveOrder}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Order
                </button>
              )}
            </div>

            {waves.map((waveNum) => {
              const waveAssignments = assignments.filter((a) => a.wave === waveNum);
              return (
                <div key={waveNum} className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#787774] tracking-wide uppercase">
                    Wave {waveNum}
                  </h3>
                  <div className="border border-[#C8C8C5] rounded-sm overflow-x-auto shadow-sm">
                    <table className="w-full border-collapse min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[60px]">
                            Target
                          </th>
                          <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left">
                            Athlete
                          </th>
                          <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[60px]">
                            Rank
                          </th>
                          <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[100px]">
                            Handicap
                          </th>
                          <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[60px]">
                            Wave
                          </th>
                          {!config.released && (
                            <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[80px]">
                              Reorder
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {waveAssignments.map((a) => {
                          const globalIdx = assignments.findIndex(
                            (x) => x.athleteId === a.athleteId && x.wave === a.wave
                          );
                          return (
                            <tr key={`${a.athleteId}-${a.wave}`} className="hover:bg-[#FAFAF8] transition-colors">
                              <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#37352F] font-bold text-center tabular-nums">
                                {a.targetPosition}
                              </td>
                              <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#37352F] font-medium">
                                {a.athleteName}
                              </td>
                              <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774] text-center tabular-nums">
                                #{a.rank}
                              </td>
                              <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774] text-center tabular-nums">
                                {a.points.toFixed(0)} pts
                              </td>
                              <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774] text-center tabular-nums">
                                {a.wave}
                              </td>
                              {!config.released && (
                                <td className="border border-[#D5D5D2] px-2 py-2">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button
                                      onClick={() => moveAssignment(globalIdx, "up")}
                                      disabled={globalIdx === 0}
                                      className="p-1 rounded text-[#9B9A97] hover:text-[#37352F] disabled:opacity-25 disabled:cursor-default transition-colors"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      onClick={() => moveAssignment(globalIdx, "down")}
                                      disabled={globalIdx === assignments.length - 1}
                                      className="p-1 rounded text-[#9B9A97] hover:text-[#37352F] disabled:opacity-25 disabled:cursor-default transition-colors"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Empty state ── */}
        {assignments.length === 0 && !loading && (
          <div className="text-center py-12 border border-dashed border-[#E9E9E7] rounded-[4px]">
            <Target size={24} className="mx-auto text-[#C4C4C0] mb-2" />
            <p className="text-sm text-[#9B9A97]">No target assignments yet</p>
            <p className="text-xs text-[#C4C4C0] mt-1">
              Set the number of targets and click &quot;Generate Assignments&quot;
            </p>
          </div>
        )}
      </div>

      {/* ── Release Modal ── */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowReleaseModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-[#37352F] mb-4">Release Target Assignments</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-2">Start Mode</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="startMode"
                      value="staggered"
                      checked={releaseStartMode === "staggered"}
                      onChange={() => setReleaseStartMode("staggered")}
                      className="accent-[#0B6E99]"
                    />
                    <span className="text-sm text-[#37352F]">Staggered</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="startMode"
                      value="mass"
                      checked={releaseStartMode === "mass"}
                      onChange={() => setReleaseStartMode("mass")}
                      className="accent-[#0B6E99]"
                    />
                    <span className="text-sm text-[#37352F]">Mass Start</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">Total Laps</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={releaseTotalLaps}
                  onChange={(e) => setReleaseTotalLaps(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all"
                />
              </div>

              {releaseError && (
                <div className="text-sm text-[#E03E3E] bg-[#FBE4E4] px-3 py-2 rounded-[3px]">
                  {releaseError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleRelease}
                  disabled={releasing}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0F7B6C] rounded-[3px] hover:bg-[#0a6358] transition-colors disabled:opacity-50"
                >
                  {releasing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Zap size={14} />
                  )}
                  {releasing ? "Releasing..." : "Release Assignments"}
                </button>
                <button
                  onClick={() => setShowReleaseModal(false)}
                  className="px-4 py-2 text-sm text-[#787774] hover:text-[#37352F] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
