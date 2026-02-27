"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import {
  X, Plus, Trash2, Trophy, Clock, TrendingUp, TrendingDown,
  Swords, PersonStanding, Waves, Crosshair, Activity, Loader2, Zap,
} from "lucide-react";
import { calculateFencingRanking } from "@/lib/scoring/fencing-ranking";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { calculateObstacle } from "@/lib/scoring/obstacle";
import { calculateSwimming, parseSwimmingTime } from "@/lib/scoring/swimming";
import { calculateLaserRun, parseLaserRunTime } from "@/lib/scoring/laser-run";
import { calculateRiding } from "@/lib/scoring/riding";
import type { AgeCategory } from "@/lib/scoring/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScoreHistoryEntry {
  date: string;
  competition: string;
  points: number;
  source?: "competition" | "training";
  // Discipline-specific
  time?: number;
  timeHundredths?: number;
  finishTime?: number;
  victories?: number;
  totalBouts?: number;
  placement?: number;
  knockdowns?: number;
  disobediences?: number;
  notes?: string | null;
  id?: string; // training entry ID for deletion
}

interface PersonalBestInfo {
  points: number | null;
  rawTime?: string;
  rawValue?: number;
  // Split details
  splits?: { label: string; value: string }[];
}

interface DisciplineDetailModalProps {
  discipline: string; // key like "obstacle", "swimming", etc.
  label: string;
  color: string;
  icon: React.ReactNode;
  history: ScoreHistoryEntry[];
  personalBest: PersonalBestInfo;
  isOpen: boolean;
  onClose: () => void;
  onDataAdded?: () => void; // callback to refresh parent data
  canEdit?: boolean; // whether the user can add training data
  ageCategory?: string; // athlete age category for scoring calculations
  gender?: "M" | "F"; // athlete gender for Masters scoring
}

// ─── Auto-Calculate Points ───────────────────────────────────────────────────

/**
 * Parse a time field value that may be in human-readable format or raw numeric.
 * Swimming: accepts "M:SS.hh" (e.g. "1:12.50") or raw hundredths (e.g. "7250")
 * Laser Run / Obstacle: accepts "M:SS" (e.g. "11:30") or raw seconds (e.g. "690")
 */
function parseFieldValue(
  discipline: string,
  key: string,
  value: string
): number {
  if (!value || value.trim() === "") return NaN;

  if (discipline === "swimming" && key === "timeHundredths") {
    if (value.includes(":")) {
      const parsed = parseSwimmingTime(value);
      return parsed > 0 ? parsed : NaN;
    }
    return Number(value);
  }

  if (key === "timeSeconds" && (discipline === "laserRun" || discipline === "obstacle")) {
    if (value.includes(":")) {
      const parsed = parseLaserRunTime(value);
      return parsed > 0 ? parsed : NaN;
    }
    return Number(value);
  }

  return Number(value);
}

function autoCalculatePoints(
  discipline: string,
  data: Record<string, string>,
  ageCategory: string,
  gender?: "M" | "F"
): number | null {
  switch (discipline) {
    case "fencingRanking": {
      const victories = parseInt(data.victories);
      const totalBouts = parseInt(data.totalBouts);
      if (!isNaN(victories) && !isNaN(totalBouts) && totalBouts > 0) {
        return calculateFencingRanking({ victories, totalBouts });
      }
      return null;
    }
    case "fencingDE": {
      const placement = parseInt(data.placement);
      if (!isNaN(placement) && placement > 0) {
        return calculateFencingDE({ placement });
      }
      return null;
    }
    case "obstacle": {
      const timeSeconds = parseFieldValue("obstacle", "timeSeconds", data.timeSeconds);
      if (!isNaN(timeSeconds) && timeSeconds > 0) {
        return calculateObstacle({ timeSeconds });
      }
      return null;
    }
    case "swimming": {
      const timeHundredths = parseFieldValue("swimming", "timeHundredths", data.timeHundredths);
      if (!isNaN(timeHundredths) && timeHundredths > 0) {
        return calculateSwimming({
          timeHundredths,
          ageCategory: ageCategory as AgeCategory,
          gender,
        });
      }
      return null;
    }
    case "laserRun": {
      const timeSeconds = parseFieldValue("laserRun", "timeSeconds", data.timeSeconds);
      if (!isNaN(timeSeconds) && timeSeconds > 0) {
        return calculateLaserRun({
          finishTimeSeconds: timeSeconds,
          ageCategory: ageCategory as AgeCategory,
        });
      }
      return null;
    }
    case "riding": {
      const knockdowns = parseInt(data.knockdowns);
      const disobediences = parseInt(data.disobediences);
      if (!isNaN(knockdowns) && !isNaN(disobediences)) {
        return calculateRiding({
          knockdowns,
          disobediences,
          timeOverSeconds: 0,
        });
      }
      return null;
    }
    default:
      return null;
  }
}

// ─── Discipline Config ───────────────────────────────────────────────────────

const DISCIPLINE_FIELDS: Record<string, { fields: { key: string; label: string; type: string; placeholder: string; required?: boolean }[] }> = {
  fencingRanking: {
    fields: [
      { key: "victories", label: "Victories", type: "number", placeholder: "e.g. 15" },
      { key: "totalBouts", label: "Total Bouts", type: "number", placeholder: "e.g. 25" },
      { key: "points", label: "Points", type: "number", placeholder: "e.g. 250" },
    ],
  },
  fencingDE: {
    fields: [
      { key: "placement", label: "Placement", type: "number", placeholder: "e.g. 3" },
      { key: "points", label: "Points", type: "number", placeholder: "e.g. 220" },
    ],
  },
  obstacle: {
    fields: [
      { key: "timeSeconds", label: "Time", type: "text", placeholder: "e.g. 1:25.50 or 85.50" },
      { key: "points", label: "Points", type: "number", placeholder: "e.g. 290" },
    ],
  },
  swimming: {
    fields: [
      { key: "timeHundredths", label: "Time", type: "text", placeholder: "e.g. 1:12.50" },
      { key: "points", label: "Points", type: "number", placeholder: "e.g. 280" },
    ],
  },
  laserRun: {
    fields: [
      { key: "timeSeconds", label: "Finish Time", type: "text", placeholder: "e.g. 11:30 or 690" },
      { key: "points", label: "Points", type: "number", placeholder: "e.g. 310" },
    ],
  },
  riding: {
    fields: [
      { key: "knockdowns", label: "Knockdowns", type: "number", placeholder: "e.g. 0" },
      { key: "disobediences", label: "Disobediences", type: "number", placeholder: "e.g. 0" },
      { key: "points", label: "Points", type: "number", placeholder: "e.g. 290" },
    ],
  },
};

// ─── Raw Chart Config Per Discipline ─────────────────────────────────────────

interface RawChartConfig {
  label: string;           // Toggle button label (e.g. "Time", "Victories")
  unit: string;            // Short unit for display (e.g. "s", "wins")
  invertY: boolean;        // true = lower is better (drawn higher on chart)
  extractValue: (entry: ScoreHistoryEntry) => number | null;
  formatValue: (val: number) => string;
}

const RAW_CHART_CONFIG: Record<string, RawChartConfig> = {
  obstacle: {
    label: "Time",
    unit: "s",
    invertY: true,
    extractValue: (e) => e.time ?? null,
    formatValue: (v) => v.toFixed(1) + "s",
  },
  swimming: {
    label: "Time",
    unit: "",
    invertY: true,
    extractValue: (e) => e.timeHundredths ?? null,
    formatValue: (v) => formatHundredths(v),
  },
  laserRun: {
    label: "Time",
    unit: "",
    invertY: true,
    extractValue: (e) => e.finishTime ?? null,
    formatValue: (v) => formatSeconds(v),
  },
  fencingRanking: {
    label: "Victories",
    unit: "wins",
    invertY: false,
    extractValue: (e) => e.victories ?? null,
    formatValue: (v) => String(Math.round(v)),
  },
  fencingDE: {
    label: "Placement",
    unit: "",
    invertY: true,
    extractValue: (e) => e.placement ?? null,
    formatValue: (v) => "#" + Math.round(v),
  },
  riding: {
    label: "Penalties",
    unit: "",
    invertY: true,
    extractValue: (e) => {
      if (e.knockdowns == null && e.disobediences == null) return null;
      return (e.knockdowns ?? 0) * 7 + (e.disobediences ?? 0) * 10;
    },
    formatValue: (v) => String(Math.round(v)) + " pts",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHundredths(h: number): string {
  const mins = Math.floor(h / 6000);
  const secs = Math.floor((h % 6000) / 100);
  const hh = h % 100;
  return `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDisciplineRawDisplay(discipline: string, entry: ScoreHistoryEntry): string | null {
  switch (discipline) {
    case "obstacle":
      return entry.time != null ? `${entry.time.toFixed(2)}s` : null;
    case "swimming":
      return entry.timeHundredths != null ? formatHundredths(entry.timeHundredths) : null;
    case "laserRun":
      return entry.finishTime != null ? formatSeconds(entry.finishTime) : null;
    case "fencingRanking":
      return entry.victories != null && entry.totalBouts != null
        ? `${entry.victories}/${entry.totalBouts} wins`
        : null;
    case "fencingDE":
      return entry.placement != null ? `#${entry.placement} placement` : null;
    case "riding":
      return entry.knockdowns != null ? `${entry.knockdowns} KD` : null;
    default:
      return null;
  }
}

// ─── SVG Line Chart ──────────────────────────────────────────────────────────

const LineChart = memo(function LineChart({
  data,
  color,
  height = 180,
  yFormatter,
  invertY = false,
}: {
  data: { label: string; value: number; source: string }[];
  color: string;
  height?: number;
  yFormatter?: (val: number) => string;
  invertY?: boolean; // when true, lower values are drawn higher (good for time-based metrics)
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-[#9B9A97]" style={{ height }}>
        No data to display
      </div>
    );
  }

  const fmtY = yFormatter || ((v: number) => String(Math.round(v)));

  const padding = { top: 20, right: 20, bottom: 30, left: 55 };
  const width = 500;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const normalised = (d.value - minVal) / range;
    return {
      x: padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
      y: invertY
        ? padding.top + normalised * chartH            // lower values → top
        : padding.top + chartH - normalised * chartH,  // higher values → top
      ...d,
    };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Gradient fill path
  const areaBaseY = invertY ? padding.top : padding.top + chartH;
  const areaD = `${pathD} L ${points[points.length - 1].x} ${areaBaseY} L ${points[0].x} ${areaBaseY} Z`;

  // Y-axis labels
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const frac = i / yTicks;
    const val = minVal + range * frac;
    return {
      display: fmtY(val),
      y: invertY
        ? padding.top + frac * chartH
        : padding.top + chartH - frac * chartH,
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="#E9E9E7"
            strokeWidth="0.5"
          />
          <text x={padding.left - 8} y={tick.y + 3} textAnchor="end" fontSize="9" fill="#9B9A97">
            {tick.display}
          </text>
        </g>
      ))}

      {/* Area fill */}
      {data.length > 1 && <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />}

      {/* Line */}
      {data.length > 1 && (
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
          {p.source === "training" && (
            <circle cx={p.x} cy={p.y} r="2" fill={color} opacity="0.5" />
          )}
          {/* X-axis labels */}
          {(data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && (
            <text
              x={p.x}
              y={height - 5}
              textAnchor="middle"
              fontSize="8"
              fill="#9B9A97"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
});

// ─── Main Modal Component ────────────────────────────────────────────────────

export function DisciplineDetailModal({
  discipline,
  label,
  color,
  icon,
  history,
  personalBest,
  isOpen,
  onClose,
  onDataAdded,
  canEdit = true,
  ageCategory = "Senior",
  gender,
}: DisciplineDetailModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [chartView, setChartView] = useState<"points" | "raw">("raw");
  const [deleting, setDeleting] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset form and chart view when discipline changes
  // Default to "raw" (times) for disciplines that have raw data, "points" otherwise
  useEffect(() => {
    setShowAddForm(false);
    setFormData({});
    setChartView(RAW_CHART_CONFIG[discipline] ? "raw" : "points");
  }, [discipline]);

  // Auto-calculate points when raw data fields change
  const autoPoints = useMemo(
    () => autoCalculatePoints(discipline, formData, ageCategory, gender),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      discipline, ageCategory, gender,
      formData.victories, formData.totalBouts, formData.placement,
      formData.timeSeconds, formData.timeHundredths,
      formData.knockdowns, formData.disobediences,
    ]
  );

  useEffect(() => {
    if (autoPoints !== null) {
      setFormData((prev) => ({ ...prev, points: String(autoPoints) }));
    }
  }, [autoPoints]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open (improved for mobile)
  useEffect(() => {
    if (isOpen) {
      // Store original overflow and position values
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      // Lock body scroll
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      
      return () => {
        // Restore original values
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const today = formData.date || new Date().toISOString().split("T")[0];
      const payload: Record<string, unknown> = {
        discipline,
        date: today,
        notes: formData.notes || null,
      };

      const fields = DISCIPLINE_FIELDS[discipline]?.fields || [];
      for (const field of fields) {
        if (formData[field.key]) {
          payload[field.key] = parseFieldValue(discipline, field.key, formData[field.key]);
        }
      }

      const res = await fetch("/api/athlete/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormData({});
        setShowAddForm(false);
        onDataAdded?.();
      }
    } catch (err) {
      console.error("Failed to add training entry:", err);
    } finally {
      setSubmitting(false);
    }
  }, [discipline, formData, submitting, onDataAdded]);

  const handleDelete = useCallback(async (entryId: string) => {
    if (deleting) return;
    setDeleting(entryId);

    try {
      const res = await fetch("/api/athlete/training", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId }),
      });

      if (res.ok) {
        onDataAdded?.();
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
    } finally {
      setDeleting(null);
    }
  }, [deleting, onDataAdded]);

  // Memoize all expensive computations
  const rawConfig = RAW_CHART_CONFIG[discipline] || null;

  const chartData = useMemo(() =>
    [...history]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((entry) => ({
        label: new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        value: entry.points,
        source: entry.source || "competition",
      })),
    [history]
  );

  const rawChartData = useMemo(() => {
    if (!rawConfig) return [];
    return [...history]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce<{ label: string; value: number; source: string }[]>((acc, entry) => {
        const val = rawConfig.extractValue(entry);
        if (val != null) {
          acc.push({
            label: new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            value: val,
            source: entry.source || "competition",
          });
        }
        return acc;
      }, []);
  }, [history, rawConfig]);

  const sortedHistory = useMemo(() =>
    [...history].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [history]
  );

  const trend = useMemo(() =>
    sortedHistory.length >= 2
      ? sortedHistory[0].points - sortedHistory[1].points
      : 0,
    [sortedHistory]
  );

  const statsData = useMemo(() => {
    if (sortedHistory.length === 0) return null;
    const pts = sortedHistory.map((e) => e.points);
    return {
      average: Math.round(pts.reduce((s, p) => s + p, 0) / pts.length),
      highest: Math.max(...pts),
      lowest: Math.min(...pts),
      total: sortedHistory.length,
      competitions: sortedHistory.filter((e) => e.source === "competition").length,
      training: sortedHistory.filter((e) => e.source === "training").length,
    };
  }, [sortedHistory]);

  const fields = useMemo(() => DISCIPLINE_FIELDS[discipline]?.fields || [], [discipline]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-[95vw] max-w-[1100px] max-h-[90vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-[#E9E9E7]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: color + "18", color }}
            >
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#37352F]">{label}</h2>
              <p className="text-xs text-[#9B9A97]">
                {sortedHistory.length} entries recorded
                {trend !== 0 && (
                  <span className={`ml-2 font-medium ${trend > 0 ? "text-[#0F7B6C]" : "text-[#E03E3E]"}`}>
                    {trend > 0 ? "+" : ""}{trend} pts from last
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#F0F0ED] transition-colors text-[#787774]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - Split View */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* ── Left Side: Chart + History ── */}
          <div className="flex-1 overflow-y-auto border-r border-[#E9E9E7] min-w-0">
            {/* Chart */}
            <div className="p-4 md:p-6 border-b border-[#E9E9E7]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
                  {chartView === "points" ? "Points Over Time" : `${rawConfig?.label ?? "Raw"} Over Time`}
                </h3>
                {rawConfig && rawChartData.length > 0 && (
                  <div className="flex items-center bg-[#F0F0ED] rounded-md p-0.5">
                    <button
                      onClick={() => setChartView("raw")}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-[3px] transition-colors ${
                        chartView === "raw"
                          ? "bg-white text-[#37352F] shadow-sm"
                          : "text-[#9B9A97] hover:text-[#787774]"
                      }`}
                    >
                      {rawConfig.label}
                    </button>
                    <button
                      onClick={() => setChartView("points")}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-[3px] transition-colors ${
                        chartView === "points"
                          ? "bg-white text-[#37352F] shadow-sm"
                          : "text-[#9B9A97] hover:text-[#787774]"
                      }`}
                    >
                      Points
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-[#FBFBFA] rounded-[4px] p-3 border border-[#E9E9E7] overflow-x-auto">
                <div className="min-w-[400px] md:min-w-0">
                  {chartView === "points" ? (
                    <LineChart data={chartData} color={color} height={200} />
                  ) : (
                    <LineChart
                      data={rawChartData}
                      color={color}
                      height={200}
                      invertY={rawConfig?.invertY ?? false}
                      yFormatter={rawConfig?.formatValue}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-[#9B9A97]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: color }} />
                  Competition
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />
                  Training
                </span>
              </div>
            </div>

            {/* History List */}
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
                  All Entries
                </h3>
                {canEdit && (
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors"
                    style={{
                      color,
                      backgroundColor: showAddForm ? color + "18" : "transparent",
                    }}
                  >
                    <Plus size={14} />
                    {showAddForm ? "Cancel" : "Add Entry"}
                  </button>
                )}
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="mb-4 p-4 bg-[#FBFBFA] border border-[#E9E9E7] rounded-[4px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={formData.date || new Date().toISOString().split("T")[0]}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[4px] bg-white text-[#37352F] focus:outline-none focus:border-[#0B6E99] transition-colors"
                      />
                    </div>
                    {fields.map((field) => {
                      const isPointsField = field.key === "points";
                      const isAuto = isPointsField && autoPoints !== null;

                      return (
                        <div key={field.key}>
                          <label className="block text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-1">
                            {field.label}
                            {isAuto && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[#0F7B6C] normal-case tracking-normal">
                                <Zap size={9} />
                                auto
                              </span>
                            )}
                          </label>
                          <input
                            type={field.type}
                            step="any"
                            placeholder={isAuto ? "Auto-calculated" : field.placeholder}
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            className={`w-full px-3 py-2 text-sm border rounded-[4px] text-[#37352F] focus:outline-none focus:border-[#0B6E99] transition-colors font-mono ${
                              isAuto
                                ? "border-[#0F7B6C]/30 bg-[#0F7B6C]/5"
                                : "border-[#E9E9E7] bg-white"
                            }`}
                          />
                        </div>
                      );
                    })}
                    <div className="col-span-2">
                      <label className="block text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-1">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Training notes..."
                        value={formData.notes || ""}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[4px] bg-white text-[#37352F] focus:outline-none focus:border-[#0B6E99] transition-colors"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50"
                      style={{ backgroundColor: color }}
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        "Save Entry"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* History Table */}
              {sortedHistory.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[#E9E9E7] rounded-[4px]">
                  <p className="text-sm text-[#9B9A97]">No entries yet</p>
                  {canEdit && (
                    <p className="text-xs text-[#C4C4C0] mt-1">Add training data to start tracking</p>
                  )}
                </div>
              ) : (
                <div className="border border-[#E9E9E7] rounded-[4px] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F7F6F3] border-b border-[#E9E9E7]">
                        <th className="text-left py-2 px-3 text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider">
                          Date
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider">
                          Source
                        </th>
                        <th className="text-right py-2 px-3 text-[10px] font-semibold text-[#787774] uppercase tracking-wider">
                          {RAW_CHART_CONFIG[discipline]?.label || "Raw"}
                        </th>
                        <th className="text-right py-2 px-3 text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider">
                          Points
                        </th>
                        {canEdit && (
                          <th className="w-8" />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((entry, i) => {
                        const rawDisplay = getDisciplineRawDisplay(discipline, entry);
                        const isPersonalBest =
                          personalBest.points !== null && entry.points === personalBest.points;

                        return (
                          <tr
                            key={i}
                            className={`border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#FAFAF8] transition-colors ${
                              isPersonalBest ? "bg-[#FFFDF5]" : ""
                            }`}
                          >
                            <td className="py-2 px-3">
                              <div className="text-[#37352F] font-medium text-xs">
                                {formatDate(entry.date)}
                              </div>
                              {entry.notes && (
                                <div className="text-[10px] text-[#9B9A97] truncate max-w-[120px]">
                                  {entry.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  entry.source === "competition"
                                    ? "bg-[#0B6E99]/10 text-[#0B6E99]"
                                    : "bg-[#0F7B6C]/10 text-[#0F7B6C]"
                                }`}
                              >
                                {entry.source === "competition" ? entry.competition : "Training"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`font-mono font-semibold text-xs ${isPersonalBest ? "text-[#DFAB01]" : "text-[#37352F]"}`}>
                                {rawDisplay || "—"}
                              </span>
                              {isPersonalBest && (
                                <Trophy size={10} className="inline ml-1 text-[#DFAB01]" />
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-xs text-[#9B9A97]">
                              {entry.points} pts
                            </td>
                            {canEdit && (
                              <td className="py-2 px-1">
                                {entry.source === "training" && entry.id && (
                                  <button
                                    onClick={() => handleDelete(entry.id!)}
                                    disabled={deleting === entry.id}
                                    className="p-1 rounded hover:bg-[#E03E3E]/10 text-[#C4C4C0] hover:text-[#E03E3E] transition-colors"
                                    title="Delete entry"
                                  >
                                    {deleting === entry.id ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={12} />
                                    )}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Side: Personal Best + Splits ── */}
          <div className="w-full md:w-[320px] flex-shrink-0 overflow-y-auto bg-[#FBFBFA]">
            <div className="p-4 md:p-6">
              {/* Personal Best */}
              <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                Personal Best
              </h3>

              <div className="border border-[#E9E9E7] rounded-[4px] p-4 bg-white mb-4">
                {personalBest.points !== null ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy size={16} className="text-[#DFAB01]" />
                      <span className="text-xs font-medium text-[#DFAB01]">Personal Record</span>
                    </div>
                    {personalBest.rawTime ? (
                      <>
                        {/* Time-based disciplines: show time prominently */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-[28px] font-bold font-mono" style={{ color }}>
                            {personalBest.rawTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-sm text-[#9B9A97]">
                            {Math.round(personalBest.points)} pts
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Non-time disciplines (fencing, riding): show points prominently */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-[28px] font-bold" style={{ color }}>
                            {Math.round(personalBest.points)}
                          </span>
                          <span className="text-sm text-[#9B9A97]">pts</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-[#C4C4C0]">No personal best recorded</p>
                  </div>
                )}
              </div>

              {/* Splits / Details */}
              {personalBest.splits && personalBest.splits.length > 0 && (
                <>
                  <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                    Best Performance Details
                  </h3>
                  <div className="space-y-2">
                    {personalBest.splits.map((split, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 border border-[#E9E9E7] rounded-[4px] bg-white"
                      >
                        <span className="text-xs text-[#787774]">{split.label}</span>
                        <span className="text-sm font-mono font-medium text-[#37352F]">
                          {split.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Statistics Summary */}
              <div className="mt-6">
                <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                  Statistics
                </h3>
                <div className="space-y-2">
                  {statsData && (
                    <>
                      <StatRow label="Average" value={`${statsData.average} pts`} />
                      <StatRow label="Highest" value={`${statsData.highest} pts`} />
                      <StatRow label="Lowest" value={`${statsData.lowest} pts`} />
                      <StatRow label="Total Entries" value={`${statsData.total}`} />
                      <StatRow label="Competitions" value={`${statsData.competitions}`} />
                      <StatRow label="Training" value={`${statsData.training}`} />
                    </>
                  )}
                </div>
              </div>

              {/* Trend */}
              {sortedHistory.length >= 2 && (
                <div className="mt-6">
                  <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                    Recent Trend
                  </h3>
                  <div className="border border-[#E9E9E7] rounded-[4px] p-3 bg-white">
                    <div className="flex items-center gap-2">
                      {trend > 0 ? (
                        <TrendingUp size={16} className="text-[#0F7B6C]" />
                      ) : trend < 0 ? (
                        <TrendingDown size={16} className="text-[#E03E3E]" />
                      ) : (
                        <TrendingUp size={16} className="text-[#9B9A97]" />
                      )}
                      <span
                        className={`text-sm font-bold ${
                          trend > 0
                            ? "text-[#0F7B6C]"
                            : trend < 0
                            ? "text-[#E03E3E]"
                            : "text-[#9B9A97]"
                        }`}
                      >
                        {trend > 0 ? "+" : ""}
                        {trend} pts
                      </span>
                      <span className="text-xs text-[#9B9A97]">from last entry</span>
                    </div>
                    {/* Last 5 mini bars */}
                    <div className="flex items-end gap-1 mt-3" style={{ height: 32 }}>
                      {sortedHistory
                        .slice(0, 5)
                        .reverse()
                        .map((e, i, arr) => {
                          const maxP = Math.max(...arr.map((a) => a.points), 1);
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-t-sm"
                              style={{
                                height: `${Math.max((e.points / maxP) * 100, 8)}%`,
                                backgroundColor: i === arr.length - 1 ? color : color + "40",
                              }}
                              title={`${e.points} pts`}
                            />
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helper component ──────────────────────────────────────────────────

const StatRow = memo(function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border border-[#E9E9E7] rounded-[4px] bg-white">
      <span className="text-xs text-[#787774]">{label}</span>
      <span className="text-xs font-mono font-medium text-[#37352F]">{value}</span>
    </div>
  );
});

// ─── Icon helper for use by parent ───────────────────────────────────────────

export const DISCIPLINE_ICONS: Record<string, React.ReactNode> = {
  fencingRanking: <Swords size={18} />,
  fencingDE: <Swords size={18} />,
  obstacle: <PersonStanding size={18} />,
  swimming: <Waves size={18} />,
  laserRun: <Crosshair size={18} />,
  riding: <Activity size={18} />,
};
