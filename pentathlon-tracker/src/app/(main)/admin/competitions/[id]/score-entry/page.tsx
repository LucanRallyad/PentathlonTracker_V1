"use client";

import { useState, useEffect, use, useRef, useCallback, Fragment } from "react";
import useSWR from "swr";
import { TopNav } from "@/components/TopNav";
import { TabBar } from "@/components/TabBar";
import { useScoreUpdates } from "@/lib/useScoreUpdates";
import { DISCIPLINE_NAMES } from "@/lib/scoring/constants";
import {
  calculateFencingRanking,
  getFencingRankingParams,
} from "@/lib/scoring/fencing-ranking";
import { calculateFencingDE } from "@/lib/scoring/fencing-de";
import { calculateObstacle } from "@/lib/scoring/obstacle";
import { calculateSwimming, parseSwimmingTime } from "@/lib/scoring/swimming";
import { calculateLaserRun } from "@/lib/scoring/laser-run";
import { calculateRiding } from "@/lib/scoring/riding";
import type { AgeCategory } from "@/lib/scoring/types";
import { Check, Loader2, Cloud, CloudOff, Save, Printer, ListOrdered, Waves, Radio, Clock, CheckCircle2, Users, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Reorder } from "framer-motion";
import { CompetitionStatusControl } from "@/components/CompetitionStatusControl";
import { FencingDEBracketView } from "@/components/FencingDEBracket";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Fetch failed");
  return r.json();
});

// ─── Shared cell styles (Excel-like) ─────────────────────────────────────────

const cellBase =
  "border border-[#D5D5D2] px-3 py-2 text-sm text-[#37352F] font-mono";
const cellHeader =
  "border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase select-none whitespace-nowrap sticky top-0 z-10";
const cellRowNum =
  "border border-[#D5D5D2] bg-[#F7F6F3] px-2 py-2 text-[11px] text-[#9B9A97] text-center font-mono select-none w-10 min-w-[40px] sticky left-0 z-20";
const cellReadonly =
  "border border-[#D5D5D2] bg-[#FAFAF8] px-3 py-2 text-sm text-[#37352F]";
const cellAthleteName =
  "border border-[#D5D5D2] bg-[#FAFAF8] px-3 py-2 text-sm text-[#37352F] sticky left-[39px] z-20 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]";
const cellComputed =
  "border border-[#D5D5D2] bg-[#F0F7FA] px-3 py-2 text-sm text-[#37352F] font-mono font-semibold text-right";
const inputCell =
  "w-full h-full bg-transparent outline-none text-sm font-mono text-[#37352F] placeholder:text-[#C4C4C0]";

// ─── Print utility ────────────────────────────────────────────────────────────

function printSheet(title: string, tableRef: React.RefObject<HTMLDivElement | null>, subtitle?: string) {
  if (!tableRef.current) return;

  const html = tableRef.current.innerHTML;
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #37352F; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #787774; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #F0F0ED; border: 1px solid #C8C8C5; padding: 6px 10px; text-align: left; font-size: 10px; font-weight: 600; color: #5A5A57; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    td { border: 1px solid #D5D5D2; padding: 6px 10px; font-size: 12px; }
    td input { border: none; background: transparent; font-family: monospace; font-size: 12px; width: 100%; }
    tr:nth-child(even) { background: #FAFAF8; }
    .print-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; border-bottom: 2px solid #37352F; padding-bottom: 8px; }
    .print-date { font-size: 11px; color: #9B9A97; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
    </div>
    <div class="print-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  ${html}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
  win.document.close();
}

function printStartList(
  title: string,
  athletes: { athleteId: string; athlete: { firstName: string; lastName: string; country: string; ageCategory: string; gender: string } }[],
  handicapMap: Map<string, HandicapResult>
) {
  const sorted = [...athletes].sort((a, b) => {
    const ha = handicapMap.get(a.athleteId);
    const hb = handicapMap.get(b.athleteId);
    return (ha?.startDelay ?? 999) - (hb?.startDelay ?? 999);
  });

  const rows = sorted.map(({ athleteId, athlete }, idx) => {
    const h = handicapMap.get(athleteId);
    return `<tr>
      <td style="text-align:center; font-weight:600; color:#787774;">${idx + 1}</td>
      <td style="font-weight:500;">${athlete.firstName} ${athlete.lastName}</td>
      <td>${athlete.country}</td>
      <td>${athlete.ageCategory}</td>
      <td>${athlete.gender === "M" ? "Male" : "Female"}</td>
      <td style="text-align:center; font-weight:600; color:#6940A5;">${h?.startTimeFormatted || "—"}${h?.isPackStart ? " *" : ""}</td>
      <td style="text-align:center;">${h?.isPackStart ? "PACK" : h?.gateAssignment || "—"}</td>
      <td style="text-align:center;">${h ? `#${h.shootingStation}` : "—"}</td>
    </tr>`;
  }).join("");

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title} — Start List</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #37352F; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #787774; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #F5F0FA; border: 1px solid #D5D0E5; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; color: #6940A5; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    td { border: 1px solid #D5D5D2; padding: 8px 10px; font-size: 13px; }
    tr:nth-child(even) { background: #FAFAF8; }
    .print-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; border-bottom: 2px solid #6940A5; padding-bottom: 8px; }
    .print-date { font-size: 11px; color: #9B9A97; }
    .note { font-size: 10px; color: #9B9A97; margin-top: 12px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>Laser Run — Start List</h1>
      <div class="subtitle">${title}</div>
    </div>
    <div class="print-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:center; width:40px;">#</th>
        <th>Athlete</th>
        <th>Country</th>
        <th>Category</th>
        <th>Gender</th>
        <th style="text-align:center;">Start Time</th>
        <th style="text-align:center;">Gate</th>
        <th style="text-align:center;">Station</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note">* = Pack start</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
  win.document.close();
}

// ─── Swim seeding logic & print ───────────────────────────────────────────────

const LANES = 8;
// Lane assignment order: fastest swimmer → lane 4, then 5, 3, 6, 2, 7, 1, 8
const LANE_ORDER = [4, 5, 3, 6, 2, 7, 1, 8];

interface SeededSwimmer {
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  seedTime: string; // formatted time or "NT"
  seedHundredths: number; // 0 = no time
}

interface HeatAssignment {
  lane: number;
  swimmer: SeededSwimmer;
}

interface Heat {
  heatNumber: number;
  assignments: HeatAssignment[];
}

function buildSwimSeeding(
  athletes: {
    athleteId: string;
    athlete: { firstName: string; lastName: string; country: string; ageCategory: string; gender: string };
  }[],
  getValue: (disc: string, athleteId: string, field: string) => string
): Heat[] {
  // Build swimmers with seed times
  const swimmers: SeededSwimmer[] = athletes.map(({ athleteId, athlete }) => {
    const raw = getValue("swimming", athleteId, "time");
    const hundredths = raw ? parseSwimmingHundredths(raw) : 0;

    let seedTime = "NT";
    if (hundredths > 0) {
      const mins = Math.floor(hundredths / 6000);
      const secs = Math.floor((hundredths % 6000) / 100);
      const hh = hundredths % 100;
      seedTime = `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
    }

    return {
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      country: athlete.country,
      ageCategory: athlete.ageCategory,
      gender: athlete.gender,
      seedTime,
      seedHundredths: hundredths,
    };
  });

  // Separate swimmers with times from those without
  const withTime = swimmers.filter((s) => s.seedHundredths > 0).sort((a, b) => a.seedHundredths - b.seedHundredths);
  const noTime = swimmers.filter((s) => s.seedHundredths === 0);

  // Combined order: NT swimmers first (early heats), then timed slowest→fastest
  // But we reverse the timed order so fastest end up in last heat
  const orderedForHeats = [...noTime, ...withTime.slice().reverse()];

  // Split into heats
  const totalHeats = Math.ceil(orderedForHeats.length / LANES);
  const heatGroups: SeededSwimmer[][] = [];

  for (let i = 0; i < totalHeats; i++) {
    heatGroups.push(orderedForHeats.slice(i * LANES, (i + 1) * LANES));
  }

  // Reverse so fastest heat is last (heat groups are currently slowest-first)
  // Actually orderedForHeats already has NT first and fastest last, so heatGroups
  // naturally has: [NT/slowest, ..., fastest]. We just assign heat numbers 1..N.

  const heats: Heat[] = heatGroups.map((group, idx) => {
    // Within each heat, sort by seed time (fastest first for lane assignment)
    const sorted = [...group].sort((a, b) => {
      if (a.seedHundredths === 0 && b.seedHundredths === 0) return 0;
      if (a.seedHundredths === 0) return 1; // NT goes to outer lanes
      if (b.seedHundredths === 0) return -1;
      return a.seedHundredths - b.seedHundredths;
    });

    // Assign lanes: fastest gets center lane (lane 4), then 5, 3, 6, 2, 7, 1, 8
    const assignments: HeatAssignment[] = sorted.map((swimmer, i) => ({
      lane: LANE_ORDER[i],
      swimmer,
    }));

    // Sort by lane number for display
    assignments.sort((a, b) => a.lane - b.lane);

    return {
      heatNumber: idx + 1,
      assignments,
    };
  });

  return heats;
}

function printSwimSeeding(
  title: string,
  athletes: {
    athleteId: string;
    athlete: { firstName: string; lastName: string; country: string; ageCategory: string; gender: string };
  }[],
  getValue: (disc: string, athleteId: string, field: string) => string,
  ageCategory: string
) {
  const heats = buildSwimSeeding(athletes, getValue);
  const isYouth = ageCategory === "U9" || ageCategory === "U11";
  const distance = isYouth ? "50m" : "100m";

  const heatHtml = heats.map((heat) => {
    const rows = heat.assignments.map((a) => `
      <tr>
        <td style="text-align:center; font-weight:600; width:60px;">${a.lane}</td>
        <td style="font-weight:500;">${a.swimmer.firstName} ${a.swimmer.lastName}</td>
        <td>${a.swimmer.country}</td>
        <td>${a.swimmer.ageCategory}</td>
        <td>${a.swimmer.gender === "M" ? "Male" : "Female"}</td>
        <td style="text-align:center; font-family:monospace; font-weight:600; color:${a.swimmer.seedTime === "NT" ? "#9B9A97" : "#0B6E99"};">${a.swimmer.seedTime}</td>
      </tr>
    `).join("");

    return `
      <div class="heat-block">
        <div class="heat-header">Heat ${heat.heatNumber}${heat.heatNumber === heats.length ? " (Fastest)" : heat.heatNumber === 1 && heats.length > 1 ? " (Slowest)" : ""}</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:center; width:60px;">Lane</th>
              <th>Athlete</th>
              <th>Country</th>
              <th>Category</th>
              <th>Gender</th>
              <th style="text-align:center;">Seed Time</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join("");

  // Lane diagram
  const laneLabels = LANE_ORDER.map((l, i) => `Lane ${l} = Seed #${i + 1}`).join("  ·  ");

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title} — Swim Seeding</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #37352F; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #787774; margin-bottom: 4px; }
    .info { font-size: 11px; color: #9B9A97; margin-bottom: 16px; }
    .print-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; border-bottom: 2px solid #0B6E99; padding-bottom: 8px; }
    .print-date { font-size: 11px; color: #9B9A97; }
    .heat-block { margin-bottom: 20px; break-inside: avoid; }
    .heat-header { font-size: 14px; font-weight: 700; color: #0B6E99; padding: 6px 10px; background: #E8F4F8; border: 1px solid #B8DCE9; border-bottom: none; border-radius: 4px 4px 0 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #F0F0ED; border: 1px solid #C8C8C5; padding: 6px 10px; text-align: left; font-size: 10px; font-weight: 600; color: #5A5A57; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    td { border: 1px solid #D5D5D2; padding: 7px 10px; font-size: 12px; }
    tr:nth-child(even) { background: #FAFAF8; }
    .lane-key { font-size: 10px; color: #9B9A97; margin-top: 16px; text-align: center; border-top: 1px solid #E9E9E7; padding-top: 8px; }
    .seeding-note { font-size: 10px; color: #787774; margin-top: 4px; text-align: center; font-style: italic; }
    @media print { body { padding: 12px; } .heat-block { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>Swimming — Heat Seeding</h1>
      <div class="subtitle">${title}</div>
      <div class="info">${distance} · ${heats.length} heat${heats.length !== 1 ? "s" : ""} · 8-lane pool · Regular seeding (fastest in last heat, center lanes)</div>
    </div>
    <div class="print-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  ${heatHtml}
  <div class="lane-key">${laneLabels}</div>
  <div class="seeding-note">NT = No seed time · Regular seeding: fastest swimmers placed in center lanes of final heat</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
  win.document.close();
}

// ─── Print button component ──────────────────────────────────────────────────

function PrintButton({ onClick, label = "Print Sheet" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-[#F7F6F3] hover:text-[#37352F] transition-colors"
    >
      <Printer size={12} />
      {label}
    </button>
  );
}

// ─── SpreadsheetInput with onBlur-based auto-save ────────────────────────────

function SpreadsheetInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  step,
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <td
      className={`${cellBase} p-0 ${
        focused
          ? "ring-2 ring-[#0B6E99] ring-inset border-[#0B6E99] bg-white z-10 relative"
          : "bg-white hover:bg-[#FAFAF8]"
      }`}
    >
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        className={`${inputCell} px-3 py-2`}
        placeholder={placeholder}
      />
    </td>
  );
}

// ─── Grid keyboard navigation hook ──────────────────────────────────────────

function useGridNav(rows: number, cols: number) {
  const gridRef = useRef<HTMLTableElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT") return;

      const cell = target.closest("td");
      const row = cell?.closest("tr");
      if (!cell || !row) return;

      const allRows = gridRef.current?.querySelectorAll("tbody tr");
      if (!allRows) return;

      const rowIdx = Array.from(allRows).indexOf(row);
      const cells = row.querySelectorAll("td input");
      const colIdx = Array.from(cells).indexOf(target as HTMLInputElement);

      let nextRow = rowIdx;
      let nextCol = colIdx;

      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        nextRow = Math.min(rowIdx + 1, rows - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextRow = Math.max(rowIdx - 1, 0);
      } else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        nextCol = colIdx + 1;
        if (nextCol >= cols) {
          nextCol = 0;
          nextRow = Math.min(rowIdx + 1, rows - 1);
        }
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        nextCol = colIdx - 1;
        if (nextCol < 0) {
          nextCol = cols - 1;
          nextRow = Math.max(rowIdx - 1, 0);
        }
      } else {
        return;
      }

      const targetRow = allRows[nextRow];
      const targetInputs = targetRow?.querySelectorAll("input");
      const targetInput = targetInputs?.[nextCol] as HTMLInputElement;
      targetInput?.focus();
      targetInput?.select();
    },
    [rows, cols]
  );

  return { gridRef, handleKeyDown };
}

// ─── Shared parsing helpers ──────────────────────────────────────────────────

function parseSwimmingHundredths(input: string): number {
  return parseSwimmingTime(input);
}

function parseLaserRunSeconds(input: string): number {
  const m = input.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return parseFloat(input) || 0;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Competition {
  id: string;
  name: string;
  status: string;
  ageCategory: string;
  events: {
    id: string;
    discipline: string;
    status: string;
  }[];
  competitionAthletes: {
    athleteId: string;
    ageCategory: string | null;
    athlete: { id: string; firstName: string; lastName: string; country: string; ageCategory: string; gender: string };
  }[];
}

interface HandicapResult {
  athleteId: string;
  startDelay: number;
  rawDelay: number;
  isPackStart: boolean;
  shootingStation: number;
  gateAssignment: string;
  startTimeFormatted: string;
}

// Master state shape: { discipline: { athleteId: { field: value } } }
type MasterValues = Record<string, Record<string, Record<string, string>>>;
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

// ─── AutoSave status indicator ───────────────────────────────────────────────

function AutoSaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs select-none transition-opacity duration-300">
      {status === "pending" && (
        <>
          <CloudOff size={13} className="text-[#D9730D]" />
          <span className="text-[#D9730D]">Unsaved changes</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 size={13} className="animate-spin text-[#0B6E99]" />
          <span className="text-[#0B6E99]">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Cloud size={13} className="text-[#0F7B6C]" />
          <Check size={11} className="text-[#0F7B6C] -ml-1" />
          <span className="text-[#0F7B6C]">All changes saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <CloudOff size={13} className="text-[#E03E3E]" />
          <span className="text-[#E03E3E]">Save failed — retrying...</span>
        </>
      )}
    </div>
  );
}

// ─── Event Status Control ─────────────────────────────────────────────────────

const EVENT_STATUS_OPTIONS = [
  { value: "pending", label: "Upcoming", icon: Clock, color: "text-[#D9730D]", bg: "bg-[#FAEBDD]", border: "border-[#F5D6B3]", activeBg: "bg-[#D9730D]" },
  { value: "in_progress", label: "Live", icon: Radio, color: "text-[#0F7B6C]", bg: "bg-[#DDEDEA]", border: "border-[#B8D8D0]", activeBg: "bg-[#0F7B6C]" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-[#9B9A97]", bg: "bg-[#EBECED]", border: "border-[#D5D5D2]", activeBg: "bg-[#9B9A97]" },
] as const;

function EventStatusControl({
  eventId,
  competitionId,
  currentStatus,
  onStatusChange,
}: {
  eventId: string;
  competitionId: string;
  currentStatus: string;
  onStatusChange: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function setStatus(status: string) {
    if (status === currentStatus || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status }),
      });
      if (res.ok) onStatusChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Status</span>
      {EVENT_STATUS_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentStatus === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            disabled={saving}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[4px] border transition-colors ${
              isActive
                ? `${opt.activeBg} text-white border-transparent`
                : `bg-white ${opt.color} ${opt.border} hover:${opt.bg}`
            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Icon size={12} className={isActive ? "text-white" : ""} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ScoreEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: competition, mutate: mutateCompetition } = useSWR<Competition>(
    `/api/competitions/${id}`,
    fetcher
  );

  const { data: handicapData } = useSWR<{ handicapStarts: HandicapResult[] }>(
    `/api/competitions/${id}/handicap`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [activeDiscipline, setActiveDiscipline] = useState<string>("_all");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeGender, setActiveGender] = useState<string>("");

  // ── Master values state (shared across all tabs) ───────────────────────────
  const [values, setValues] = useState<MasterValues>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Refs for auto-save debounce
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dirtyDisciplines = useRef<Set<string>>(new Set());
  const valuesRef = useRef<MasterValues>(values);
  valuesRef.current = values;

  // Ref to hold the latest autoSaveDiscipline so setValue/flushDiscipline never go stale
  const autoSaveRef = useRef<(disc: string) => void>(() => {});

  // ── Load existing scores from DB on mount ──────────────────────────────────
  useEffect(() => {
    if (!competition || initialLoaded) return;

    async function loadScores() {
      const loaded: MasterValues = {};
      for (const ev of competition!.events) {
        loaded[ev.discipline] = {};
        try {
          const res = await fetch(`/api/scores/${ev.discipline}?eventId=${ev.id}`);
          if (!res.ok) continue;
          const scores = await res.json();
          for (const s of scores) {
            if (!s.athleteId) continue;
            // Only load scores that belong to this event
            if (s.eventId && s.eventId !== ev.id) continue;

            const fields: Record<string, string> = {};
            switch (ev.discipline) {
              case "fencing_ranking":
                if (s.victories != null) fields.victories = String(s.victories);
                break;
              case "fencing_de":
                if (s.placement != null) fields.placement = String(s.placement);
                break;
              case "obstacle":
                if (s.timeSeconds != null) fields.time = String(s.timeSeconds);
                if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
                break;
              case "swimming":
                if (s.timeHundredths != null) {
                  // Convert hundredths back to MM:SS.hh
                  const total = s.timeHundredths;
                  const mins = Math.floor(total / 6000);
                  const secs = Math.floor((total % 6000) / 100);
                  const hh = total % 100;
                  fields.time = `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
                }
                if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
                break;
              case "laser_run":
                if (s.finishTimeSeconds != null) {
                  // Convert seconds back to MM:SS
                  const m = Math.floor(s.finishTimeSeconds / 60);
                  const sec = s.finishTimeSeconds % 60;
                  fields.finishTime = `${m}:${String(sec).padStart(2, "0")}`;
                }
                if (s.penaltySeconds) fields.penalties = String(s.penaltySeconds);
                break;
              case "riding":
                if (s.knockdowns != null) fields.knockdowns = String(s.knockdowns);
                if (s.disobediences) fields.disobediences = String(s.disobediences);
                if (s.timeOverSeconds) fields.timeOver = String(s.timeOverSeconds);
                if (s.otherPenalties) fields.other = String(s.otherPenalties);
                break;
            }
            if (Object.keys(fields).length > 0) {
              loaded[ev.discipline][s.athleteId] = fields;
            }
          }
        } catch {
          // ignore load errors
        }
      }
      setValues(loaded);
      setInitialLoaded(true);
    }

    loadScores();
  }, [competition, initialLoaded]);

  // ── Reload a single discipline's scores from the DB into local state ───────
  // Used when the DE bracket completes and writes FencingDEScore records
  const reloadDisciplineFromDB = useCallback(
    async (disc: string) => {
      if (!competition) return;
      const event = competition.events.find((e) => e.discipline === disc);
      if (!event) return;

      try {
        const res = await fetch(`/api/scores/${disc}?eventId=${event.id}`);
        if (!res.ok) return;
        const scores = await res.json();
        const loaded: Record<string, Record<string, string>> = {};

        for (const s of scores) {
          if (!s.athleteId) continue;
          if (s.eventId && s.eventId !== event.id) continue;

          const fields: Record<string, string> = {};
          switch (disc) {
            case "fencing_ranking":
              if (s.victories != null) fields.victories = String(s.victories);
              break;
            case "fencing_de":
              if (s.placement != null) fields.placement = String(s.placement);
              break;
            case "obstacle":
              if (s.timeSeconds != null) fields.time = String(s.timeSeconds);
              if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
              break;
            case "swimming":
              if (s.timeHundredths != null) {
                const total = s.timeHundredths;
                const mins = Math.floor(total / 6000);
                const secs = Math.floor((total % 6000) / 100);
                const hh = total % 100;
                fields.time = `${mins}:${String(secs).padStart(2, "0")}.${String(hh).padStart(2, "0")}`;
              }
              if (s.penaltyPoints) fields.penalties = String(s.penaltyPoints);
              break;
            case "laser_run":
              if (s.finishTimeSeconds != null) {
                const m = Math.floor(s.finishTimeSeconds / 60);
                const sec = s.finishTimeSeconds % 60;
                fields.finishTime = `${m}:${String(sec).padStart(2, "0")}`;
              }
              if (s.penaltySeconds) fields.penalties = String(s.penaltySeconds);
              break;
            case "riding":
              if (s.knockdowns != null) fields.knockdowns = String(s.knockdowns);
              if (s.disobediences) fields.disobediences = String(s.disobediences);
              if (s.timeOverSeconds) fields.timeOver = String(s.timeOverSeconds);
              if (s.otherPenalties) fields.other = String(s.otherPenalties);
              break;
          }
          if (Object.keys(fields).length > 0) {
            loaded[s.athleteId] = fields;
          }
        }

        // Merge into local state (only update if the discipline isn't currently dirty)
        if (!dirtyDisciplines.current.has(disc)) {
          setValues((prev) => ({
            ...prev,
            [disc]: { ...prev[disc], ...loaded },
          }));
        }
      } catch {
        // ignore reload errors
      }
    },
    [competition]
  );

  // ── SSE: listen for score updates (especially fencing_de from bracket completion)
  useScoreUpdates({
    competitionId: id,
    onUpdate: () => {
      // Reload fencing_de scores from DB (bracket completion writes these)
      reloadDisciplineFromDB("fencing_de");
      // Also refresh the competition data for leaderboard recalc
      mutateCompetition();
    },
    enabled: initialLoaded,
  });

  // ── getValue / setValue ─────────────────────────────────────────────────────

  const getValue = useCallback(
    (disc: string, athleteId: string, field: string): string => {
      return values[disc]?.[athleteId]?.[field] || "";
    },
    [values]
  );

  const setValue = useCallback(
    (disc: string, athleteId: string, field: string, val: string) => {
      setValues((prev) => ({
        ...prev,
        [disc]: {
          ...prev[disc],
          [athleteId]: {
            ...prev[disc]?.[athleteId],
            [field]: val,
          },
        },
      }));

      // Mark discipline as dirty and start debounce
      dirtyDisciplines.current.add(disc);
      setSaveStatus("pending");

      if (saveTimers.current[disc]) {
        clearTimeout(saveTimers.current[disc]);
      }
      saveTimers.current[disc] = setTimeout(() => {
        autoSaveRef.current(disc);
      }, 1500);
    },
    []
  );

  // ── Flush pending saves for a discipline (also called on blur) ─────────────

  const flushDiscipline = useCallback(
    (disc: string) => {
      if (!dirtyDisciplines.current.has(disc)) return;
      if (saveTimers.current[disc]) {
        clearTimeout(saveTimers.current[disc]);
        delete saveTimers.current[disc];
      }
      autoSaveRef.current(disc);
    },
    []
  );

  // ── Auto-save a single discipline ──────────────────────────────────────────

  const autoSaveDiscipline = useCallback(
    async (disc: string) => {
      if (!competition) return;

      const event = competition.events.find((e) => e.discipline === disc);
      if (!event) return;

      const currentValues = valuesRef.current;
      const athleteValues = currentValues[disc] || {};
      const fencingParams = getFencingRankingParams(competition.competitionAthletes.length);
      const handicapMap = new Map(
        handicapData?.handicapStarts?.map((h) => [h.athleteId, h]) || []
      );

      // Build scores array for this discipline
      const entries = Object.entries(athleteValues).filter(([, fields]) =>
        Object.values(fields).some((v) => v.trim() !== "")
      );

      if (entries.length === 0) {
        dirtyDisciplines.current.delete(disc);
        if (dirtyDisciplines.current.size === 0) setSaveStatus("saved");
        return;
      }

      let scores: Record<string, unknown>[];

      switch (disc) {
        case "fencing_ranking":
          scores = entries
            .filter(([, f]) => f.victories?.trim())
            .map(([athleteId, f]) => ({
              athleteId,
              victories: parseInt(f.victories, 10) || 0,
              totalBouts: fencingParams.totalBouts,
            }));
          break;
        case "fencing_de":
          scores = entries
            .filter(([, f]) => f.placement?.trim())
            .map(([athleteId, f]) => ({
              athleteId,
              placement: parseInt(f.placement, 10) || 0,
            }));
          break;
        case "obstacle":
          scores = entries
            .filter(([, f]) => f.time?.trim())
            .map(([athleteId, f]) => ({
              athleteId,
              timeSeconds: parseFloat(f.time) || 0,
              penaltyPoints: parseInt(f.penalties || "0", 10),
            }));
          break;
        case "swimming":
          scores = entries
            .filter(([, f]) => f.time?.trim())
            .map(([athleteId, f]) => ({
              athleteId,
              timeHundredths: parseSwimmingHundredths(f.time),
              penaltyPoints: parseInt(f.penalties || "0", 10),
            }));
          break;
        case "laser_run":
          scores = entries
            .filter(([, f]) => f.finishTime?.trim())
            .map(([athleteId, f]) => {
              const handicap = handicapMap.get(athleteId);
              return {
                athleteId,
                finishTimeSeconds: parseLaserRunSeconds(f.finishTime),
                penaltySeconds: parseInt(f.penalties || "0", 10),
                handicapStartDelay: handicap?.startDelay ?? 0,
                rawDelay: handicap?.rawDelay ?? 0,
                isPackStart: handicap?.isPackStart ?? false,
                shootingStation: handicap?.shootingStation ?? 0,
                gateAssignment: handicap?.gateAssignment ?? "A",
              };
            });
          break;
        case "riding":
          scores = entries
            .filter(
              ([, f]) => f.knockdowns?.trim() || f.disobediences?.trim() || f.timeOver?.trim()
            )
            .map(([athleteId, f]) => ({
              athleteId,
              knockdowns: parseInt(f.knockdowns || "0", 10),
              disobediences: parseInt(f.disobediences || "0", 10),
              timeOverSeconds: parseInt(f.timeOver || "0", 10),
              otherPenalties: parseInt(f.other || "0", 10),
            }));
          break;
        default:
          return;
      }

      if (scores.length === 0) {
        dirtyDisciplines.current.delete(disc);
        if (dirtyDisciplines.current.size === 0) setSaveStatus("saved");
        return;
      }

      setSaveStatus("saving");

      try {
        const res = await fetch(`/api/scores/${disc}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id, scores, competitionId: id }),
        });

        if (!res.ok) throw new Error("Save failed");

        dirtyDisciplines.current.delete(disc);
        if (dirtyDisciplines.current.size === 0) {
          setSaveStatus("saved");
          // Refresh competition data to update leaderboard
          mutateCompetition();
          setTimeout(() => {
            setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
          }, 3000);
        }
      } catch {
        setSaveStatus("error");
        // Retry after 3 seconds
        setTimeout(() => {
          autoSaveDiscipline(disc);
        }, 3000);
      }
    },
    [competition, handicapData, id, mutateCompetition]
  );

  // Keep the ref in sync so setValue/flushDiscipline always call the latest version
  autoSaveRef.current = autoSaveDiscipline;

  // ── Save All (manual) ───────────────────────────────────────────────────────

  const saveAll = useCallback(() => {
    if (!competition) return;
    for (const ev of competition.events) {
      const disc = ev.discipline;
      // Clear any pending debounce timer
      if (saveTimers.current[disc]) {
        clearTimeout(saveTimers.current[disc]);
        delete saveTimers.current[disc];
      }
      // Force-mark dirty and save
      dirtyDisciplines.current.add(disc);
      autoSaveRef.current(disc);
    }
  }, [competition]);

  // ── Cleanup timers on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (!competition) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Loading..." }]} />
        <div className="max-w-[1100px] mx-auto px-6 py-12">
          <div className="h-10 w-48 bg-[#F7F6F3] rounded animate-pulse" />
        </div>
      </>
    );
  }

  // ── Parse age categories from competition ────────────────────────────────
  const categories = competition.ageCategory
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const hasMultipleCategories = categories.length > 1;

  // Helper function to sort age categories (Masters first, Senior, Junior, then descending age)
  const sortAgeCategories = (cats: string[]) => {
    const categoryOrder = ["Masters", "Senior", "Junior", "U19", "U17", "U15", "U13", "U11", "U9"];
    return [...cats].sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  };

  // Build category tabs (no "All" option — must pick a specific category)
  const sortedCategories = sortAgeCategories(categories);
  const categoryTabs = sortedCategories.map((cat) => {
    const count = competition.competitionAthletes.filter(
      (a) => (a.ageCategory || a.athlete.ageCategory) === cat
    ).length;
    return { id: cat, label: `${cat} (${count})` };
  });

  // Gender counts (no "All" option — must pick a specific gender)
  const maleCount = competition.competitionAthletes.filter((a) => a.athlete.gender === "M").length;
  const femaleCount = competition.competitionAthletes.filter((a) => a.athlete.gender === "F").length;
  const hasAnyAthletes = competition.competitionAthletes.length > 0;

  // Only show genders that have athletes
  const genderTabs = [
    ...(maleCount > 0 ? [{ id: "M", label: `Male (${maleCount})` }] : []),
    ...(femaleCount > 0 ? [{ id: "F", label: `Female (${femaleCount})` }] : []),
  ];

  // Auto-select first available gender and category if not yet set
  if (!activeGender && genderTabs.length > 0) {
    setActiveGender(genderTabs[0].id);
  }
  if (!activeCategory && categoryTabs.length > 0) {
    setActiveCategory(categoryTabs[0].id);
  }

  // Use effective values (handle the initial empty state)
  const effectiveGender = activeGender || genderTabs[0]?.id || "M";
  const effectiveCategory = activeCategory || categoryTabs[0]?.id || categories[0] || "Senior";

  // Filter athletes by selected category AND gender (always filtered)
  let filteredAthletes = competition.competitionAthletes;
  filteredAthletes = filteredAthletes.filter((a) => (a.ageCategory || a.athlete.ageCategory) === effectiveCategory);
  filteredAthletes = filteredAthletes.filter((a) => a.athlete.gender === effectiveGender);

  // Build a filtered competition object for AllEventsGrid
  const filteredCompetition = {
    ...competition,
    competitionAthletes: filteredAthletes,
  };

  const allEventsTab = { id: "_all", label: "All Events" };
  const disciplineTabs = competition.events.map((e) => ({
    id: e.discipline,
    label: DISCIPLINE_NAMES[e.discipline] || e.discipline,
  }));
  const tabs = [allEventsTab, ...disciplineTabs];

  const activeEvent = competition.events.find(
    (e) => e.discipline === activeDiscipline
  );

  const isAllView = activeDiscipline === "_all";
  const isAllAthletesView = activeCategory === "_all_athletes";

  // Determine ageCategory for scoring: always use the selected category
  const scoringAgeCategory = effectiveCategory as AgeCategory;

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: competition.name },
          { label: "Score Entry" },
        ]}
      />
      <div className="mx-auto px-6 py-8 max-w-[1400px]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight">
            Score Entry
          </h1>
          <div className="flex items-center gap-3">
            <CompetitionStatusControl
              competitionId={id}
              status={competition.status}
              onStatusChange={() => mutateCompetition()}
              variant="inline"
            />
            <AutoSaveIndicator status={saveStatus} />
            <button
              onClick={saveAll}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#37352F] rounded-[4px] hover:bg-[#2F2E2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={12} />
              {saveStatus === "saving" ? "Saving..." : "Save All"}
            </button>
          </div>
        </div>

        {/* ── Gender + Age category filter bar ── */}
        {hasAnyAthletes && (
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {/* Gender buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Gender</span>
              {genderTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGender(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                    effectiveGender === tab.id
                      ? "bg-[#37352F] text-white border-[#37352F]"
                      : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-[#E9E9E7]" />

            {/* Age category buttons + All Athletes */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mr-1">Category</span>
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                    activeCategory === tab.id && !isAllAthletesView
                      ? "bg-[#37352F] text-white border-[#37352F]"
                      : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {/* Divider before All Athletes */}
              <div className="w-px h-5 bg-[#D5D5D2] mx-0.5" />

              {/* All Athletes button */}
              <button
                onClick={() => setActiveCategory("_all_athletes")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${
                  isAllAthletesView
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F6F3] hover:text-[#37352F] hover:border-[#D3D1CB]"
                }`}
              >
                <Users size={11} />
                All ({competition.competitionAthletes.length})
              </button>
            </div>
          </div>
        )}

        {/* ── Discipline tabs ── */}
        <TabBar
          tabs={tabs}
          activeTab={activeDiscipline || ""}
          onTabChange={setActiveDiscipline}
        />

        {/* ── Event status control (shown for individual disciplines) ── */}
        {activeEvent && !isAllView && (
          <div className="mt-3 flex items-center gap-4">
            <EventStatusControl
              eventId={activeEvent.id}
              competitionId={id}
              currentStatus={activeEvent.status}
              onStatusChange={() => mutateCompetition()}
            />
          </div>
        )}

        {isAllAthletesView ? (
          <div className="mt-6">
            <AllAthletesView
              competition={competition}
              sortedCategories={sortedCategories}
              activeGender={effectiveGender}
              activeDiscipline={activeDiscipline}
              getValue={getValue}
              setValue={setValue}
              flushDiscipline={flushDiscipline}
            />
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="mt-6 text-center py-12 border border-dashed border-[#E9E9E7] rounded-[4px]">
            <p className="text-sm text-[#9B9A97]">No athletes in this category</p>
          </div>
        ) : (
          <div className="mt-6">
            {isAllView ? (
              <AllEventsGrid
                competition={filteredCompetition}
                getValue={getValue}
                setValue={setValue}
                flushDiscipline={flushDiscipline}
              />
            ) : (
              <>
                {activeEvent && activeDiscipline === "fencing_ranking" && (
                  <FencingRankingEntry athletes={filteredAthletes} getValue={getValue} setValue={setValue} flushDiscipline={flushDiscipline} />
                )}
                {activeEvent && activeDiscipline === "fencing_de" && (
                  <FencingDEEntry athletes={filteredAthletes} getValue={getValue} setValue={setValue} flushDiscipline={flushDiscipline} competitionId={id} competitionName={competition.name} gender={effectiveGender} ageCategory={effectiveCategory} />
                )}
                {activeEvent && activeDiscipline === "obstacle" && (
                  <ObstacleEntry athletes={filteredAthletes} getValue={getValue} setValue={setValue} flushDiscipline={flushDiscipline} />
                )}
                {activeEvent && activeDiscipline === "swimming" && (
                  <SwimmingEntry athletes={filteredAthletes} ageCategory={scoringAgeCategory} getValue={getValue} setValue={setValue} flushDiscipline={flushDiscipline} competitionId={id} />
                )}
                {activeEvent && activeDiscipline === "laser_run" && (
                  <LaserRunEntry athletes={filteredAthletes} ageCategory={scoringAgeCategory} handicapData={handicapData} getValue={getValue} setValue={setValue} flushDiscipline={flushDiscipline} />
                )}
                {activeEvent && activeDiscipline === "riding" && (
                  <RidingEntry athletes={filteredAthletes} getValue={getValue} setValue={setValue} flushDiscipline={flushDiscipline} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Shared prop types for discipline components ─────────────────────────────

interface SharedEntryProps {
  athletes: Competition["competitionAthletes"];
  getValue: (disc: string, athleteId: string, field: string) => string;
  setValue: (disc: string, athleteId: string, field: string, val: string) => void;
  flushDiscipline: (disc: string) => void;
}

// ─── All Athletes View (sectioned by age category) ───────────────────────────

function AllAthletesView({
  competition,
  sortedCategories,
  activeGender,
  activeDiscipline,
  getValue,
  setValue,
  flushDiscipline,
}: {
  competition: Competition;
  sortedCategories: string[];
  activeGender: string;
  activeDiscipline: string;
  getValue: (disc: string, athleteId: string, field: string) => string;
  setValue: (disc: string, athleteId: string, field: string, val: string) => void;
  flushDiscipline: (disc: string) => void;
}) {
  const allEvents = competition.events;
  const isAllEventsView = activeDiscipline === "_all";
  const events = isAllEventsView
    ? allEvents
    : allEvents.filter((e) => e.discipline === activeDiscipline);
  const allAthletes = competition.competitionAthletes;
  const printRef = useRef<HTMLDivElement>(null);

  // Filter all athletes by the selected gender, then group by age category
  const genderFiltered = allAthletes.filter((a) => a.athlete.gender === activeGender);

  const sections: {
    category: string;
    athletes: Competition["competitionAthletes"];
  }[] = [];

  for (const cat of sortedCategories) {
    const catAthletes = genderFiltered.filter(
      (a) => (a.ageCategory || a.athlete.ageCategory) === cat
    );
    if (catAthletes.length === 0) continue;
    sections.push({ category: cat, athletes: catAthletes });
  }

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-[#E9E9E7] rounded-[4px]">
        <p className="text-sm text-[#9B9A97]">No {activeGender === "M" ? "male" : "female"} athletes in this competition</p>
      </div>
    );
  }

  // Shared compute function
  function computePoints(discipline: string, raw: string, ageCategory: string, athleteGender?: string): number | null {
    if (!raw || raw.trim() === "") return null;
    const ageCat = ageCategory as AgeCategory;
    switch (discipline) {
      case "fencing_ranking": {
        const v = parseInt(raw, 10);
        if (isNaN(v)) return null;
        // Fencing ranking bouts depend on total athletes in the category section
        // We can't easily know total here, so use a fallback
        return null; // Fencing ranking points displayed from stored values
      }
      case "fencing_de": {
        const p = parseInt(raw, 10);
        if (isNaN(p)) return null;
        return calculateFencingDE({ placement: p });
      }
      case "obstacle": {
        const t = parseFloat(raw);
        if (isNaN(t)) return null;
        return calculateObstacle({ timeSeconds: t, penaltyPoints: 0 });
      }
      case "swimming": {
        const h = parseSwimmingHundredths(raw);
        if (h <= 0) return null;
        return calculateSwimming({ timeHundredths: h, penaltyPoints: 0, ageCategory: ageCat, gender: (athleteGender as "M" | "F") || activeGender as "M" | "F" });
      }
      case "laser_run": {
        const s = parseLaserRunSeconds(raw);
        if (s <= 0) return null;
        return calculateLaserRun({ finishTimeSeconds: s, penaltySeconds: 0, ageCategory: ageCat });
      }
      case "riding": {
        const k = parseInt(raw, 10);
        if (isNaN(k)) return null;
        return calculateRiding({ knockdowns: k, disobediences: 0, timeOverSeconds: 0, otherPenalties: 0 });
      }
      default:
        return null;
    }
  }

  // For fencing ranking, we need separate params per section
  function sectionComputePoints(discipline: string, raw: string, ageCategory: string, sectionAthleteCount: number, athleteGender?: string): number | null {
    if (!raw || raw.trim() === "") return null;
    if (discipline === "fencing_ranking") {
      const v = parseInt(raw, 10);
      if (isNaN(v)) return null;
      const params = getFencingRankingParams(sectionAthleteCount);
      return calculateFencingRanking({ victories: v, totalBouts: params.totalBouts });
    }
    return computePoints(discipline, raw, ageCategory, athleteGender);
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-[#787774]">
          <Users size={14} />
          <span>
            <strong>{genderFiltered.length}</strong> {activeGender === "M" ? "male" : "female"} athletes across{" "}
            <strong>{sections.length}</strong> {sections.length === 1 ? "category" : "categories"}
          </span>
        </div>
        <PrintButton onClick={() => printSheet(`${competition.name} — All Athletes`, printRef, "All age categories & genders")} />
      </div>

      <div ref={printRef} className="space-y-8">
        {sections.map((section) => {
          return (
            <div key={section.category}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#37352F]">{section.category}</span>
                  <span className="text-xs text-[#9B9A97]">
                    ({section.athletes.length} athlete{section.athletes.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex-1 h-px bg-[#E9E9E7]" />
              </div>

              {/* Section table */}
              <div className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
                <table className="w-full border-collapse" style={{ minWidth: `${400 + events.length * 150}px` }}>
                  <thead>
                    <tr>
                      <th className={`${cellHeader} text-center w-10 sticky left-0 z-30`} rowSpan={2}>#</th>
                      <th className={`${cellHeader} text-left sticky left-[39px] z-30 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`} rowSpan={2}>Athlete</th>
                      <th className={`${cellHeader} text-left w-[80px]`} rowSpan={2}>Country</th>
                      {events.map((ev) => (
                        <th key={ev.discipline} className={`${cellHeader} text-center`} colSpan={2}>
                          {ALL_EVENTS_LABELS[ev.discipline] || ev.discipline}
                        </th>
                      ))}
                      {isAllEventsView && (
                        <th className={`${cellHeader} text-center bg-[#E8EDF0]`} rowSpan={2}>
                          Total Pts
                        </th>
                      )}
                    </tr>
                    <tr>
                      {events.map((ev) => (
                        <Fragment key={ev.discipline}>
                          <th className={`${cellHeader} text-center text-[10px] w-[150px]`}>
                            {ALL_EVENTS_INPUT_META[ev.discipline]?.hint || "input"}
                          </th>
                          <th className={`${cellHeader} text-center text-[10px] w-[100px] bg-[#EBF0F0]`}>
                            pts
                          </th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.athletes.map(({ athleteId, athlete }, idx) => {
                      let totalPts = 0;
                      let hasAny = false;

                      const cells = events.map((ev) => {
                        const meta = ALL_EVENTS_INPUT_META[ev.discipline];
                        const raw = getValue(ev.discipline, athleteId, meta?.field || "value");
                        const pts = sectionComputePoints(ev.discipline, raw, section.category, section.athletes.length, athlete.gender);
                        if (pts !== null) {
                          totalPts += Math.round(pts);
                          hasAny = true;
                        }
                        return { discipline: ev.discipline, raw, pts };
                      });

                      return (
                        <tr key={athleteId}>
                          <td className={cellRowNum}>{idx + 1}</td>
                          <td className={cellAthleteName}>
                            <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                            <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                          </td>
                          <td className={`${cellReadonly} text-[#787774]`}>
                            {athlete.country}
                          </td>
                          {cells.map((c) => {
                            const meta = ALL_EVENTS_INPUT_META[c.discipline];
                            return (
                              <Fragment key={c.discipline}>
                                <SpreadsheetInput
                                  value={c.raw}
                                  onChange={(val) => setValue(c.discipline, athleteId, meta?.field || "value", val)}
                                  onBlur={() => flushDiscipline(c.discipline)}
                                  placeholder={meta?.placeholder || ""}
                                  type={meta?.type || "text"}
                                  step={meta?.step}
                                />
                                <td className={`${cellBase} bg-[#F5F8FA] text-center font-semibold ${c.pts !== null ? "text-[#37352F]" : "text-[#C4C4C0]"}`}>
                                  {c.pts !== null ? Math.round(c.pts) : "—"}
                                </td>
                              </Fragment>
                            );
                          })}
                          {isAllEventsView && (
                            <td className={`border border-[#C8C8C5] bg-[#E8F4EC] px-3 py-2 text-sm font-bold font-mono text-center ${hasAny ? "text-[#37352F]" : "text-[#C4C4C0]"}`}>
                              {hasAny ? totalPts : "—"}
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
      </div>
    </div>
  );
}

// ─── All Events Unified Grid ─────────────────────────────────────────────────

const ALL_EVENTS_LABELS: Record<string, string> = {
  fencing_ranking: "Fencing (Rank)",
  fencing_de: "Fencing (DE)",
  obstacle: "Obstacle",
  swimming: "Swimming",
  laser_run: "Laser Run",
  riding: "Riding",
};

const ALL_EVENTS_INPUT_META: Record<string, { placeholder: string; hint: string; type: string; step?: string; field: string }> = {
  fencing_ranking: { placeholder: "Victories", hint: "wins", type: "number", field: "victories" },
  fencing_de: { placeholder: "Placement", hint: "place", type: "number", field: "placement" },
  obstacle: { placeholder: "Time (s)", hint: "sec", type: "number", step: "0.01", field: "time" },
  swimming: { placeholder: "MM:SS.hh", hint: "time", type: "text", field: "time" },
  laser_run: { placeholder: "MM:SS", hint: "finish", type: "text", field: "finishTime" },
  riding: { placeholder: "Penalties", hint: "pen", type: "number", field: "knockdowns" },
};

function AllEventsGrid({
  competition,
  getValue,
  setValue,
  flushDiscipline,
}: {
  competition: Competition;
  getValue: (disc: string, athleteId: string, field: string) => string;
  setValue: (disc: string, athleteId: string, field: string, val: string) => void;
  flushDiscipline: (disc: string) => void;
}) {
  const athletes = competition.competitionAthletes;
  const events = competition.events;
  const ageCategory = competition.ageCategory as AgeCategory;
  const fencingParams = getFencingRankingParams(athletes.length);
  const printRef = useRef<HTMLDivElement>(null);

  const { gridRef, handleKeyDown } = useGridNav(athletes.length, events.length);

  function computePoints(discipline: string, raw: string, athleteGender?: string): number | null {
    if (!raw || raw.trim() === "") return null;
    switch (discipline) {
      case "fencing_ranking": {
        const v = parseInt(raw, 10);
        if (isNaN(v)) return null;
        return calculateFencingRanking({ victories: v, totalBouts: fencingParams.totalBouts });
      }
      case "fencing_de": {
        const p = parseInt(raw, 10);
        if (isNaN(p)) return null;
        return calculateFencingDE({ placement: p });
      }
      case "obstacle": {
        const t = parseFloat(raw);
        if (isNaN(t)) return null;
        return calculateObstacle({ timeSeconds: t, penaltyPoints: 0 });
      }
      case "swimming": {
        const h = parseSwimmingHundredths(raw);
        if (h <= 0) return null;
        return calculateSwimming({ timeHundredths: h, penaltyPoints: 0, ageCategory, gender: (athleteGender as "M" | "F") || "M" });
      }
      case "laser_run": {
        const s = parseLaserRunSeconds(raw);
        if (s <= 0) return null;
        return calculateLaserRun({ finishTimeSeconds: s, penaltySeconds: 0, ageCategory });
      }
      case "riding": {
        const k = parseInt(raw, 10);
        if (isNaN(k)) return null;
        return calculateRiding({ knockdowns: k, disobediences: 0, timeOverSeconds: 0, otherPenalties: 0 });
      }
      default:
        return null;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <PrintButton onClick={() => printSheet(`${competition.name} — All Events`, printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table
          ref={gridRef}
          onKeyDown={handleKeyDown}
          className="w-full border-collapse"
          style={{ minWidth: `${400 + events.length * 150}px` }}
        >
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10 sticky left-0 z-30 border-r-0`} rowSpan={2}>#</th>
              <th className={`${cellHeader} text-left sticky left-[40px] z-30 min-w-[120px]`} rowSpan={2}>Athlete</th>
              <th className={`${cellHeader} text-left w-[80px]`} rowSpan={2}>Country</th>
              {events.map((ev) => (
                <th key={ev.discipline} className={`${cellHeader} text-center`} colSpan={2}>
                  {ALL_EVENTS_LABELS[ev.discipline] || ev.discipline}
                </th>
              ))}
              <th className={`${cellHeader} text-center bg-[#E8EDF0]`} rowSpan={2}>
                Total Pts
              </th>
            </tr>
            <tr>
              {events.map((ev) => (
                <Fragment key={ev.discipline}>
                  <th className={`${cellHeader} text-center text-[10px] w-[150px]`}>
                    {ALL_EVENTS_INPUT_META[ev.discipline]?.hint || "input"}
                  </th>
                  <th className={`${cellHeader} text-center text-[10px] w-[100px] bg-[#EBF0F0]`}>
                    pts
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              let totalPts = 0;
              let hasAny = false;

              const cells = events.map((ev) => {
                const meta = ALL_EVENTS_INPUT_META[ev.discipline];
                const raw = getValue(ev.discipline, athleteId, meta?.field || "value");
                const pts = computePoints(ev.discipline, raw, athlete.gender);
                if (pts !== null) {
                  totalPts += Math.round(pts);
                  hasAny = true;
                }
                return { discipline: ev.discipline, raw, pts };
              });

              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellAthleteName}>
                    <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                    <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                  </td>
                  <td className={`${cellReadonly} text-[#787774]`}>
                    {athlete.country}
                  </td>
                  {cells.map((c) => {
                    const meta = ALL_EVENTS_INPUT_META[c.discipline];
                    return (
                      <Fragment key={c.discipline}>
                        <SpreadsheetInput
                          value={c.raw}
                          onChange={(val) => setValue(c.discipline, athleteId, meta?.field || "value", val)}
                          onBlur={() => flushDiscipline(c.discipline)}
                          placeholder={meta?.placeholder || ""}
                          type={meta?.type || "text"}
                          step={meta?.step}
                        />
                        <td className={`${cellBase} bg-[#F5F8FA] text-center font-semibold ${c.pts !== null ? "text-[#37352F]" : "text-[#C4C4C0]"}`}>
                          {c.pts !== null ? Math.round(c.pts) : "—"}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className={`border border-[#C8C8C5] bg-[#E8F4EC] px-3 py-2 text-sm font-bold font-mono text-center ${hasAny ? "text-[#37352F]" : "text-[#C4C4C0]"}`}>
                    {hasAny ? totalPts : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fencing Ranking Entry ──────────────────────────────────────────────────

function FencingRankingEntry({ athletes, getValue, setValue, flushDiscipline }: SharedEntryProps) {
  const params = getFencingRankingParams(athletes.length);
  const { gridRef, handleKeyDown } = useGridNav(athletes.length, 1);
  const disc = "fencing_ranking";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Competitors: <strong>{athletes.length}</strong> &middot; Total Bouts:{" "}
          <strong>{params.totalBouts}</strong> &middot; Threshold:{" "}
          <strong>{params.victoriesFor250}</strong> &middot; Pts/Victory:{" "}
          <strong>{params.valuePerVictory}</strong>
        </div>
        <PrintButton onClick={() => printSheet("Fencing Ranking", printRef)} />
      </div>

      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table ref={gridRef} onKeyDown={handleKeyDown} className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10 sticky left-0 z-30`}>#</th>
              <th className={`${cellHeader} text-left sticky left-[39px] z-30 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[140px]`}>Victories</th>
              <th className={`${cellHeader} text-center w-[100px]`}>Losses</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const v = getValue(disc, athleteId, "victories");
              const victories = parseInt(v, 10);
              const hasVictories = v.trim() !== "" && !isNaN(victories);
              const losses = hasVictories ? params.totalBouts - victories : null;
              const pts = hasVictories
                ? calculateFencingRanking({ victories, totalBouts: params.totalBouts })
                : null;
              return (
                <tr key={athleteId} className="group">
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellAthleteName}>
                    <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                    <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                  </td>
                  <td className={`${cellReadonly} text-[#787774]`}>{athlete.country}</td>
                  <SpreadsheetInput
                    value={v}
                    onChange={(val) => setValue(disc, athleteId, "victories", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <td className={`${cellBase} bg-[#FAFAF8] text-center ${losses !== null ? "text-[#37352F]" : "text-[#C4C4C0]"}`}>
                    {losses !== null ? losses : "—"}
                  </td>
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fencing DE Entry (Bracket + Manual Modes) ──────────────────────────────

function FencingDEEntry({ athletes, getValue, setValue, flushDiscipline, competitionId, competitionName, gender, ageCategory }: SharedEntryProps & { competitionId: string; competitionName?: string; gender: string; ageCategory: string }) {
  const [mode, setMode] = useState<"bracket" | "manual">("bracket");

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex mb-3">
        <div className="inline-flex rounded-[4px] border border-[#E9E9E7] overflow-hidden w-full md:w-auto">
          <button
            onClick={() => setMode("bracket")}
            className={`flex-1 md:flex-none px-4 py-2.5 md:py-1.5 text-sm md:text-xs font-medium transition-colors ${
              mode === "bracket"
                ? "bg-[#37352F] text-white"
                : "bg-white text-[#787774] hover:bg-[#F7F6F3] hover:text-[#37352F]"
            }`}
          >
            Bracket View
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 md:flex-none px-4 py-2.5 md:py-1.5 text-sm md:text-xs font-medium transition-colors border-l border-[#E9E9E7] ${
              mode === "manual"
                ? "bg-[#37352F] text-white"
                : "bg-white text-[#787774] hover:bg-[#F7F6F3] hover:text-[#37352F]"
            }`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {mode === "bracket" ? (
        <FencingDEBracketView competitionId={competitionId} competitionName={competitionName} gender={gender} ageCategory={ageCategory} />
      ) : (
        <FencingDEManualEntry athletes={athletes} getValue={getValue} setValue={setValue} flushDiscipline={flushDiscipline} />
      )}
    </div>
  );
}

// ─── Fencing DE Manual Entry (original placement spreadsheet) ───────────────

function FencingDEManualEntry({ athletes, getValue, setValue, flushDiscipline }: SharedEntryProps) {
  const { gridRef, handleKeyDown } = useGridNav(athletes.length, 1);
  const disc = "fencing_de";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <PrintButton onClick={() => printSheet("Fencing DE", printRef)} />
      </div>
      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table ref={gridRef} onKeyDown={handleKeyDown} className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10 sticky left-0 z-30`}>#</th>
              <th className={`${cellHeader} text-left sticky left-[39px] z-30 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[140px]`}>Placement</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const p = getValue(disc, athleteId, "placement");
              const pts = p ? calculateFencingDE({ placement: parseInt(p, 10) || 0 }) : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellAthleteName}>
                    <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                    <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                  </td>
                  <td className={`${cellReadonly} text-[#787774]`}>{athlete.country}</td>
                  <SpreadsheetInput
                    value={p}
                    onChange={(val) => setValue(disc, athleteId, "placement", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Obstacle Entry ──────────────────────────────────────────────────────────

function ObstacleEntry({ athletes, getValue, setValue, flushDiscipline }: SharedEntryProps) {
  const { gridRef, handleKeyDown } = useGridNav(athletes.length, 2);
  const disc = "obstacle";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Base: <strong>15.00s = 400 pts</strong> &middot; 0.33s per point
        </div>
        <PrintButton onClick={() => printSheet("Obstacle", printRef)} />
      </div>

      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table ref={gridRef} onKeyDown={handleKeyDown} className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10 sticky left-0 z-30`}>#</th>
              <th className={`${cellHeader} text-left sticky left-[39px] z-30 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[140px]`}>Time (s)</th>
              <th className={`${cellHeader} text-center w-[120px]`}>Penalties</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const t = getValue(disc, athleteId, "time");
              const p = getValue(disc, athleteId, "penalties");
              const pts = t
                ? calculateObstacle({ timeSeconds: parseFloat(t) || 0, penaltyPoints: parseInt(p || "0", 10) })
                : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellAthleteName}>
                    <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                    <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                  </td>
                  <td className={`${cellReadonly} text-[#787774]`}>{athlete.country}</td>
                  <SpreadsheetInput
                    value={t}
                    onChange={(val) => setValue(disc, athleteId, "time", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="15.00"
                    type="number"
                    step="0.01"
                  />
                  <SpreadsheetInput
                    value={p}
                    onChange={(val) => setValue(disc, athleteId, "penalties", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Swimming Entry ──────────────────────────────────────────────────────────

function SwimmingEntry({
  athletes,
  ageCategory,
  getValue,
  setValue,
  flushDiscipline,
  competitionId,
}: SharedEntryProps & { ageCategory: AgeCategory; competitionId: string }) {
  const { gridRef, handleKeyDown } = useGridNav(athletes.length, 2);
  const disc = "swimming";
  const isYouth = ageCategory === "U9" || ageCategory === "U11";
  const printRef = useRef<HTMLDivElement>(null);
  const [showSeeding, setShowSeeding] = useState(false);

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          {isYouth ? "50m" : "100m"} &middot; Base:{" "}
          <strong>{isYouth ? "0:45.00" : "1:10.00"} = 250 pts</strong> &middot;{" "}
          {isYouth ? "0.50" : "0.20"}s per point
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSeeding(!showSeeding)}
            className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
              showSeeding
                ? "text-white bg-[#0B6E99] border border-[#0B6E99]"
                : "text-[#0B6E99] border border-[#B8DCE9] hover:bg-[#E8F4F8]"
            }`}
          >
            <Waves size={12} />
            {showSeeding ? "Hide Seeding" : "Swim Seeding"}
          </button>
          <PrintButton onClick={() => printSheet("Swimming", printRef)} />
        </div>
      </div>

      {showSeeding && (
        <div className="mb-4">
          <SwimSeedingPanel competitionId={competitionId} ageCategory={ageCategory} />
        </div>
      )}

      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table ref={gridRef} onKeyDown={handleKeyDown} className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10 sticky left-0 z-30`}>#</th>
              <th className={`${cellHeader} text-left sticky left-[39px] z-30 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[220px]`}>Time (MM:SS.hh)</th>
              <th className={`${cellHeader} text-center w-[120px]`}>Penalties</th>
              <th className={`${cellHeader} text-right w-[120px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const t = getValue(disc, athleteId, "time");
              const p = getValue(disc, athleteId, "penalties");
              const hundredths = t ? parseSwimmingHundredths(t) : 0;
              const pts = t && hundredths > 0
                ? calculateSwimming({ timeHundredths: hundredths, penaltyPoints: parseInt(p || "0", 10), ageCategory, gender: (athlete.gender as "M" | "F") || "M" })
                : null;
              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellAthleteName}>
                    <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                    <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                  </td>
                  <td className={`${cellReadonly} text-[#787774]`}>{athlete.country}</td>
                  <SpreadsheetInput
                    value={t}
                    onChange={(val) => setValue(disc, athleteId, "time", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="1:10.00"
                  />
                  <SpreadsheetInput
                    value={p}
                    onChange={(val) => setValue(disc, athleteId, "penalties", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Swim Seeding Panel (Editable, Print, Publish) ──────────────────────────

interface SeedingAssignment {
  lane: number;
  athleteId: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  seedTime: string;
  seedHundredths: number;
}

interface SeedingHeat {
  heatNumber: number;
  gender?: string;
  assignments: SeedingAssignment[];
}

interface SeedingConfig {
  published: boolean;
  heats: SeedingHeat[];
}

function SwimSeedingPanel({ competitionId, ageCategory }: { competitionId: string; ageCategory: string }) {
  const { data, mutate, isLoading } = useSWR<{ seeding: SeedingConfig | null; eventId: string }>(
    `/api/competitions/${competitionId}/swim-seeding`,
    fetcher
  );

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localHeats, setLocalHeats] = useState<SeedingHeat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualSeedTimes, setManualSeedTimes] = useState<Record<string, string>>({});
  const [showManualSeeds, setShowManualSeeds] = useState(false);

  // Sync local heats from server data
  useEffect(() => {
    if (data?.seeding?.heats && !localHeats) {
      setLocalHeats(data.seeding.heats);
    }
  }, [data, localHeats]);

  // Collect all athletes from heats for the manual seed time card
  const allAthletes = useCallback(() => {
    const heats = localHeats || data?.seeding?.heats;
    if (!heats) return [];
    const athletes: SeedingAssignment[] = [];
    for (const heat of heats) {
      for (const a of heat.assignments) {
        if (!athletes.find(x => x.athleteId === a.athleteId)) {
          athletes.push(a);
        }
      }
    }
    return athletes.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
  }, [localHeats, data]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      // Convert manual seed time strings to hundredths
      const manualHundredths: Record<string, number> = {};
      for (const [athleteId, timeStr] of Object.entries(manualSeedTimes)) {
        if (timeStr.trim()) {
          const h = parseSwimmingTime(timeStr);
          if (h > 0) manualHundredths[athleteId] = h;
        }
      }

      const res = await fetch(`/api/competitions/${competitionId}/swim-seeding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualSeedTimes: Object.keys(manualHundredths).length > 0 ? manualHundredths : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to generate seeding");
      }
      const result = await res.json();
      setLocalHeats(result.seeding.heats);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }, [competitionId, mutate, manualSeedTimes]);

  const handleSave = useCallback(async () => {
    if (!localHeats) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/swim-seeding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heats: localHeats }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [competitionId, localHeats, mutate]);

  const handlePublish = useCallback(async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { published: publish };
      if (localHeats) body.heats = localHeats;
      const res = await fetch(`/api/competitions/${competitionId}/swim-seeding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }, [competitionId, localHeats, mutate]);

  const handlePrint = useCallback(() => {
    const heats = localHeats || data?.seeding?.heats;
    if (!heats) return;

    const isYouth = ageCategory === "U9" || ageCategory === "U11";
    const distance = isYouth ? "50m" : "100m";

    const heatHtml = heats.map((heat) => {
      const rows = heat.assignments.map((a) => `
        <tr>
          <td style="text-align:center; font-weight:600; width:60px;">${a.lane}</td>
          <td style="font-weight:500;">${a.firstName} ${a.lastName}</td>
          <td>${a.country}</td>
          <td>${a.ageCategory}</td>
          <td>${a.gender === "M" ? "Male" : "Female"}</td>
          <td style="text-align:center; font-family:monospace; font-weight:600; color:${a.seedTime === "NT" ? "#9B9A97" : "#0B6E99"};">${a.seedTime}</td>
        </tr>
      `).join("");

      return `
        <div class="heat-block">
          <div class="heat-header">Heat ${heat.heatNumber}${heat.gender ? ` — ${heat.gender === "F" ? "Women" : "Men"}` : ""}${heat.heatNumber === heats.length ? " (Fastest)" : heat.heatNumber === 1 && heats.length > 1 ? " (Slowest)" : ""}</div>
          <table>
            <thead>
              <tr>
                <th style="text-align:center; width:60px;">Lane</th>
                <th>Athlete</th>
                <th>Country</th>
                <th>Category</th>
                <th>Gender</th>
                <th style="text-align:center;">Seed Time</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join("");

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Swim Seeding</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding:24px; color:#37352F; }
    h1 { font-size:20px; font-weight:700; margin-bottom:2px; }
    .subtitle { font-size:12px; color:#787774; margin-bottom:4px; }
    .info { font-size:11px; color:#9B9A97; margin-bottom:16px; }
    .print-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:16px; border-bottom:2px solid #0B6E99; padding-bottom:8px; }
    .print-date { font-size:11px; color:#9B9A97; }
    .heat-block { margin-bottom:20px; break-inside:avoid; }
    .heat-header { font-size:14px; font-weight:700; color:#0B6E99; padding:6px 10px; background:#E8F4F8; border:1px solid #B8DCE9; border-bottom:none; border-radius:4px 4px 0 0; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { background:#F0F0ED; border:1px solid #C8C8C5; padding:6px 10px; text-align:left; font-size:10px; font-weight:600; color:#5A5A57; text-transform:uppercase; letter-spacing:0.04em; }
    td { border:1px solid #D5D5D2; padding:7px 10px; font-size:12px; }
    tr:nth-child(even) { background:#FAFAF8; }
    @media print { body { padding:12px; } .heat-block { break-inside:avoid; } }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>Swimming — Heat Seeding</h1>
      <div class="info">${distance} · ${heats.length} heat${heats.length !== 1 ? "s" : ""} · 8-lane pool</div>
    </div>
    <div class="print-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  ${heatHtml}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
    win.document.close();
  }, [localHeats, data, ageCategory]);

  // Handle drag reorder within a heat
  const handleReorder = useCallback((heatIdx: number, newAssignments: SeedingAssignment[]) => {
    if (!localHeats) return;
    const newHeats = JSON.parse(JSON.stringify(localHeats)) as SeedingHeat[];
    // Reassign lane numbers based on new drag order
    const laneNumbers = newHeats[heatIdx].assignments.map(a => a.lane).sort((a, b) => a - b);
    newHeats[heatIdx].assignments = newAssignments.map((a, i) => ({
      ...a,
      lane: laneNumbers[i],
    }));
    setLocalHeats(newHeats);
  }, [localHeats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-[#9B9A97]" />
        <span className="ml-2 text-xs text-[#9B9A97]">Loading seeding...</span>
      </div>
    );
  }

  const seeding = data?.seeding;
  const heats = localHeats || seeding?.heats;

  if (!heats || heats.length === 0) {
    return (
      <div className="border border-dashed border-[#B8DCE9] rounded-[4px] py-8 text-center bg-[#F0F7FA]">
        <Waves size={28} className="mx-auto mb-2 text-[#B8DCE9]" />
        <p className="text-sm text-[#787774] mb-1">No swim seeding generated yet</p>
        <p className="text-xs text-[#9B9A97] mb-3">Generate seeding from athlete profile best times</p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[4px] hover:bg-[#095A7D] transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Waves size={14} />}
          {generating ? "Generating..." : "Generate Seeding"}
        </button>
        {error && <p className="mt-2 text-xs text-[#E03E3E]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="border border-[#B8DCE9] rounded-[4px] bg-[#F0F7FA] p-4">
      {/* Controls */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Waves size={16} className="text-[#0B6E99]" />
          <span className="text-sm font-semibold text-[#0B6E99]">Swim Seeding</span>
          {seeding?.published && (
            <span className="px-2 py-0.5 text-[10px] font-medium text-[#0F7B6C] bg-[#E8F4EC] border border-[#B8E2C8] rounded-sm">
              Published
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-white transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Waves size={12} />}
            Regenerate
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-medium text-white bg-[#37352F] rounded-[4px] hover:bg-[#2F2E2B] transition-colors disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-white transition-colors"
          >
            <Printer size={12} />
            Print
          </button>
          <button
            onClick={() => handlePublish(!seeding?.published)}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50 ${
              seeding?.published
                ? "text-[#D9730D] border border-[#F0D5B8] hover:bg-[#FEF3E6]"
                : "text-[#0F7B6C] border border-[#B8E2C8] hover:bg-[#E8F4EC]"
            }`}
          >
            {seeding?.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-[#E03E3E] bg-[#FEF2F2] border border-[#F0C8C8] rounded-sm">
          {error}
        </div>
      )}

      {/* Manual Seed Times Card */}
      <div className="mb-3 bg-white border border-[#D5D5D2] rounded-sm overflow-hidden">
        <button
          onClick={() => setShowManualSeeds(!showManualSeeds)}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#F7F6F3] border-b border-[#E9E9E7] hover:bg-[#EFEFEF] transition-colors"
        >
          <span className="text-xs font-semibold text-[#37352F]">Manual Seed Times</span>
          {showManualSeeds ? <ChevronUp size={14} className="text-[#787774]" /> : <ChevronDown size={14} className="text-[#787774]" />}
        </button>
        {showManualSeeds && (
          <div className="p-3">
            <p className="text-[11px] text-[#9B9A97] mb-2">
              Override seed times before regenerating. Format: M:SS.hh, M:SS, or seconds. Leave blank to use database times.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className={`${cellHeader} text-left`}>Athlete</th>
                    <th className={`${cellHeader} text-left w-[60px]`}>Country</th>
                    <th className={`${cellHeader} text-center w-[50px]`}>Gender</th>
                    <th className={`${cellHeader} text-center w-[100px]`}>Current Seed</th>
                    <th className={`${cellHeader} text-center w-[120px]`}>Manual Override</th>
                  </tr>
                </thead>
                <tbody>
                  {allAthletes().map((a) => (
                    <tr key={a.athleteId}>
                      <td className={`${cellReadonly} text-[12px]`}>{a.firstName} {a.lastName}</td>
                      <td className={`${cellReadonly} text-[#787774]`}>{a.country}</td>
                      <td className={`${cellReadonly} text-center text-[#787774]`}>{a.gender}</td>
                      <td className={`${cellBase} text-center font-mono ${a.seedTime === "NT" ? "text-[#9B9A97]" : "text-[#0B6E99]"}`}>
                        {a.seedTime}
                      </td>
                      <td className={cellBase}>
                        <input
                          type="text"
                          value={manualSeedTimes[a.athleteId] || ""}
                          onChange={(e) => setManualSeedTimes(prev => ({ ...prev, [a.athleteId]: e.target.value }))}
                          placeholder="e.g. 1:15.30"
                          className="w-full px-2 py-1 text-xs text-center font-mono border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] transition-colors"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[#9B9A97] mt-2">
              Click &quot;Regenerate&quot; above to apply manual seed times.
            </p>
          </div>
        )}
      </div>

      {/* Heats */}
      <div className="space-y-3">
        {heats.map((heat, heatIdx) => (
          <div key={heat.heatNumber} className="bg-white border border-[#D5D5D2] rounded-sm overflow-hidden">
            <div className="px-3 py-2 bg-[#E8F4F8] border-b border-[#B8DCE9] flex items-center gap-2">
              <span className="text-xs font-semibold text-[#0B6E99]">
                Heat {heat.heatNumber}
                {heat.heatNumber === heats.length && heats.length > 1 ? " (Fastest)" : ""}
                {heat.heatNumber === 1 && heats.length > 1 ? " (Slowest)" : ""}
              </span>
              {heat.gender && (
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-sm ${
                  heat.gender === "F"
                    ? "text-[#AD1A72] bg-[#F8E8F0] border border-[#E8B8D0]"
                    : "text-[#0B6E99] bg-[#E8F4F8] border border-[#B8DCE9]"
                }`}>
                  {heat.gender === "F" ? "Women" : "Men"}
                </span>
              )}
            </div>
            {/* Header row */}
            <div className="flex items-center border-b border-[#E9E9E7] bg-[#F0F0ED]">
              <div className="w-8 flex-shrink-0" />
              <div className="w-14 flex-shrink-0 px-2 py-1.5 text-[10px] font-semibold text-[#5A5A57] uppercase tracking-wider text-center">Lane</div>
              <div className="flex-1 px-2 py-1.5 text-[10px] font-semibold text-[#5A5A57] uppercase tracking-wider">Athlete</div>
              <div className="w-[70px] flex-shrink-0 px-2 py-1.5 text-[10px] font-semibold text-[#5A5A57] uppercase tracking-wider">Country</div>
              <div className="w-[100px] flex-shrink-0 px-2 py-1.5 text-[10px] font-semibold text-[#5A5A57] uppercase tracking-wider text-center">Seed Time</div>
            </div>
            {/* Draggable rows */}
            <Reorder.Group
              axis="y"
              values={heat.assignments}
              onReorder={(newOrder) => handleReorder(heatIdx, newOrder)}
              className="list-none p-0 m-0"
            >
              {heat.assignments.map((a) => (
                <Reorder.Item
                  key={a.athleteId}
                  value={a}
                  style={{ touchAction: "none" }}
                  className="flex items-center border-b border-[#E9E9E7] bg-white hover:bg-[#FAFAF8] cursor-grab active:cursor-grabbing active:bg-[#F0F7FA] active:shadow-sm transition-colors"
                >
                  <div className="w-8 flex-shrink-0 flex items-center justify-center text-[#C4C4C0] hover:text-[#787774]">
                    <GripVertical size={14} />
                  </div>
                  <div className="w-14 flex-shrink-0 px-2 py-2 text-center font-bold text-xs">{a.lane}</div>
                  <div className="flex-1 px-2 py-2 text-xs font-medium text-[#37352F]">{a.firstName} {a.lastName}</div>
                  <div className="w-[70px] flex-shrink-0 px-2 py-2 text-xs text-[#787774]">{a.country}</div>
                  <div className={`w-[100px] flex-shrink-0 px-2 py-2 text-xs text-center font-mono ${a.seedTime === "NT" ? "text-[#9B9A97]" : "text-[#0B6E99] font-semibold"}`}>
                    {a.seedTime}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Laser Run Entry ─────────────────────────────────────────────────────────

function LaserRunEntry({
  athletes,
  ageCategory,
  handicapData,
  getValue,
  setValue,
  flushDiscipline,
}: SharedEntryProps & {
  ageCategory: AgeCategory;
  handicapData?: { handicapStarts: HandicapResult[] };
}) {
  const handicapMap = new Map(
    handicapData?.handicapStarts?.map((h) => [h.athleteId, h]) || []
  );

  const sortedAthletes = [...athletes].sort((a, b) => {
    const ha = handicapMap.get(a.athleteId);
    const hb = handicapMap.get(b.athleteId);
    return (ha?.startDelay ?? 999) - (hb?.startDelay ?? 999);
  });

  const { gridRef, handleKeyDown } = useGridNav(sortedAthletes.length, 2);
  const disc = "laser_run";
  const printRef = useRef<HTMLDivElement>(null);
  const compName = "Laser Run"; // used for print titles

  const targetTime =
    ageCategory === "U17"
      ? "10:30 (630s)"
      : ageCategory === "U15"
        ? "7:40 (460s)"
        : "13:20 (800s)";

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Category: <strong>{ageCategory}</strong> &middot; Target:{" "}
          <strong>{targetTime} = 500 pts</strong> &middot; 1s = 1pt
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => printStartList(compName, sortedAthletes, handicapMap)}
            className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-medium text-[#6940A5] border border-[#D5D0E5] rounded-[4px] hover:bg-[#F5F0FA] transition-colors"
          >
            <ListOrdered size={12} />
            Print Start List
          </button>
          <PrintButton onClick={() => printSheet("Laser Run", printRef)} />
        </div>
      </div>

      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table ref={gridRef} onKeyDown={handleKeyDown} className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10 sticky left-0 z-30`}>#</th>
              <th className={`${cellHeader} text-left sticky left-[39px] z-30 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>Athlete</th>
              <th className={`${cellHeader} text-left w-[80px]`}>Country</th>
              <th className={`${cellHeader} text-center w-[90px]`}>Start</th>
              <th className={`${cellHeader} text-center w-[70px]`}>Gate</th>
              <th className={`${cellHeader} text-center w-[60px]`}>Stn</th>
              <th className={`${cellHeader} text-center w-[130px]`}>Finish Time</th>
              <th className={`${cellHeader} text-center w-[100px]`}>Pen. (s)</th>
              <th className={`${cellHeader} text-right w-[110px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {sortedAthletes.map(({ athleteId, athlete }, idx) => {
              const handicap = handicapMap.get(athleteId);
              const ft = getValue(disc, athleteId, "finishTime");
              const p = getValue(disc, athleteId, "penalties");
              const finishSec = ft ? parseLaserRunSeconds(ft) : 0;
              const pts = ft && finishSec > 0
                ? calculateLaserRun({ finishTimeSeconds: finishSec, penaltySeconds: parseInt(p || "0", 10), ageCategory })
                : null;

              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellAthleteName}>
                    <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                    <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                  </td>
                  <td className={`${cellReadonly} text-[#787774]`}>{athlete.country}</td>
                  <td className={`${cellBase} bg-[#F5F0FA] text-center text-[#6940A5] text-xs`}>
                    {handicap?.startTimeFormatted || "—"}
                    {handicap?.isPackStart && <span className="text-[#9B9A97]"> *</span>}
                  </td>
                  <td className={`${cellBase} bg-[#FAFAF8] text-center text-xs text-[#787774]`}>
                    {handicap?.isPackStart ? "PACK" : handicap?.gateAssignment || "—"}
                  </td>
                  <td className={`${cellBase} bg-[#FAFAF8] text-center text-xs`}>
                    {handicap ? `#${handicap.shootingStation}` : "—"}
                  </td>
                  <SpreadsheetInput
                    value={ft}
                    onChange={(val) => setValue(disc, athleteId, "finishTime", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="13:20"
                  />
                  <SpreadsheetInput
                    value={p}
                    onChange={(val) => setValue(disc, athleteId, "penalties", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Riding Entry ────────────────────────────────────────────────────────────

function RidingEntry({ athletes, getValue, setValue, flushDiscipline }: SharedEntryProps) {
  const { gridRef, handleKeyDown } = useGridNav(athletes.length, 4);
  const disc = "riding";
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <div className="text-xs text-[#787774] bg-[#F7F6F3] px-3 py-1.5 rounded-sm border border-[#E9E9E7]">
          Base: <strong>300 pts</strong> (clear round)
        </div>
        <PrintButton onClick={() => printSheet("Riding", printRef)} />
      </div>

      <div ref={printRef} className="border border-[#C8C8C5] rounded-sm overflow-hidden shadow-sm overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table ref={gridRef} onKeyDown={handleKeyDown} className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className={`${cellHeader} text-center w-10 sticky left-0 z-30`}>#</th>
              <th className={`${cellHeader} text-left sticky left-[39px] z-30 min-w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>Athlete</th>
              <th className={`${cellHeader} text-left`}>Country</th>
              <th className={`${cellHeader} text-center w-[110px]`}>Knockdowns</th>
              <th className={`${cellHeader} text-center w-[120px]`}>Disobediences</th>
              <th className={`${cellHeader} text-center w-[110px]`}>Time Over (s)</th>
              <th className={`${cellHeader} text-center w-[100px]`}>Other</th>
              <th className={`${cellHeader} text-right w-[110px]`}>MP Points</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(({ athleteId, athlete }, idx) => {
              const k = getValue(disc, athleteId, "knockdowns");
              const d = getValue(disc, athleteId, "disobediences");
              const t = getValue(disc, athleteId, "timeOver");
              const o = getValue(disc, athleteId, "other");
              const hasInput = k || d || t;
              const pts = hasInput
                ? calculateRiding({
                    knockdowns: parseInt(k || "0", 10),
                    disobediences: parseInt(d || "0", 10),
                    timeOverSeconds: parseInt(t || "0", 10),
                    otherPenalties: parseInt(o || "0", 10),
                  })
                : null;

              return (
                <tr key={athleteId}>
                  <td className={cellRowNum}>{idx + 1}</td>
                  <td className={cellAthleteName}>
                    <span className="hidden md:inline">{athlete.firstName} {athlete.lastName}</span>
                    <span className="md:hidden font-semibold">{athlete.firstName} {athlete.lastName?.charAt(0)}.</span>
                  </td>
                  <td className={`${cellReadonly} text-[#787774]`}>{athlete.country}</td>
                  <SpreadsheetInput
                    value={k}
                    onChange={(val) => setValue(disc, athleteId, "knockdowns", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <SpreadsheetInput
                    value={d}
                    onChange={(val) => setValue(disc, athleteId, "disobediences", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <SpreadsheetInput
                    value={t}
                    onChange={(val) => setValue(disc, athleteId, "timeOver", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <SpreadsheetInput
                    value={o}
                    onChange={(val) => setValue(disc, athleteId, "other", val)}
                    onBlur={() => flushDiscipline(disc)}
                    placeholder="0"
                    type="number"
                  />
                  <td className={cellComputed}>{pts !== null ? Math.round(pts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
