"use client";

import { useState, useCallback, useRef } from "react";
import { TopNav } from "@/components/TopNav";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserPlus,
  Trophy,
  ArrowRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParsedScore {
  fencingRanking?: { victories?: number; totalBouts?: number; points?: number };
  fencingDE?: { placement?: number; points?: number };
  obstacle?: { timeSeconds?: number; points?: number };
  swimming?: { timeRaw?: string; timeHundredths?: number; points?: number };
  laserRun?: { timeRaw?: string; finishTimeSeconds?: number; points?: number };
  riding?: { knockdowns?: number; disobediences?: number; timeOverSeconds?: number; points?: number };
}

interface ParsedAthlete {
  rowIndex: number;
  firstName: string;
  lastName: string;
  country: string;
  gender: string;
  ageCategory: string;
  club: string;
  scores: ParsedScore;
  totalPoints: number;
  existingAthleteId?: string;
  existingAthleteName?: string;
  warnings: string[];
}

interface ParseResult {
  competitionName: string;
  competitionDate: string;
  competitionLocation: string;
  athletes: ParsedAthlete[];
  detectedColumns: Record<string, string>;
  warnings: string[];
  sheetName: string;
  totalRows: number;
}

interface ImportResult {
  competitionId: string;
  competitionName: string;
  athletesCreated: number;
  athletesMatched: number;
  eventsCreated: number;
  scoresCreated: number;
  errors: string[];
}

type Step = "upload" | "preview" | "importing" | "done";

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ImportDataPage() {
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [expandedAthletes, setExpandedAthletes] = useState<Set<number>>(new Set());

  // Editable competition fields
  const [compName, setCompName] = useState("");
  const [compDate, setCompDate] = useState("");
  const [compLocation, setCompLocation] = useState("");
  const [compAgeCategory, setCompAgeCategory] = useState("Senior");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload & Parse ──

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setParsing(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/super-admin/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse file");
        setParsing(false);
        return;
      }

      setParseResult(data as ParseResult);
      setCompName(data.competitionName || file.name.replace(/\.(xlsx?|xls)$/i, ""));
      setCompDate(data.competitionDate || new Date().toISOString().split("T")[0]);
      setCompLocation(data.competitionLocation || "");
      setStep("preview");
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Confirm Import ──

  const handleConfirmImport = useCallback(async () => {
    if (!parseResult) return;

    setStep("importing");
    setProgress(0);

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 90));
    }, 100);

    try {
      const res = await fetch("/api/super-admin/import?action=confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionName: compName,
          competitionDate: compDate,
          competitionLocation: compLocation,
          ageCategory: compAgeCategory,
          athletes: parseResult.athletes,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult(data as ImportResult);
      setStep("done");
    } catch {
      clearInterval(progressInterval);
      setError("Import failed. Please try again.");
      setStep("preview");
    }
  }, [parseResult, compName, compDate, compLocation, compAgeCategory]);

  // ── Reset ──

  const handleReset = useCallback(() => {
    setStep("upload");
    setError("");
    setParseResult(null);
    setImportResult(null);
    setProgress(0);
    setFileName("");
    setExpandedAthletes(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── Toggle athlete detail ──

  const toggleAthlete = useCallback((idx: number) => {
    setExpandedAthletes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── Detect which discipline columns exist ──
  const disciplinesPresent = parseResult
    ? {
        fencingRanking: parseResult.athletes.some((a) => a.scores.fencingRanking),
        fencingDE: parseResult.athletes.some((a) => a.scores.fencingDE),
        obstacle: parseResult.athletes.some((a) => a.scores.obstacle),
        swimming: parseResult.athletes.some((a) => a.scores.swimming),
        laserRun: parseResult.athletes.some((a) => a.scores.laserRun),
        riding: parseResult.athletes.some((a) => a.scores.riding),
      }
    : null;

  const matchedCount = parseResult?.athletes.filter((a) => a.existingAthleteId).length || 0;
  const newCount = (parseResult?.athletes.length || 0) - matchedCount;

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Super Admin", href: "/super-admin/dashboard" },
          { label: "Import Data" },
        ]}
      />

      <div className="max-w-[900px] mx-auto px-6 py-12">
        <h1 className="text-[40px] font-bold text-[#37352F] tracking-tight leading-tight mb-2">
          Import Data
        </h1>
        <p className="text-sm text-[#787774] mb-10">
          Upload Excel files from past competitions to import athletes, scores, and results.
        </p>

        {/* ── Step Indicator ── */}
        <div className="flex items-center gap-3 mb-10">
          {[
            { key: "upload", label: "Upload" },
            { key: "preview", label: "Review" },
            { key: "done", label: "Complete" },
          ].map((s, i) => {
            const isActive =
              s.key === step || (s.key === "preview" && step === "importing");
            const isPast =
              (s.key === "upload" && step !== "upload") ||
              (s.key === "preview" && step === "done");
            return (
              <div key={s.key} className="flex items-center gap-3">
                {i > 0 && (
                  <div
                    className={`h-px w-8 ${isPast || isActive ? "bg-[#0B6E99]" : "bg-[#E9E9E7]"}`}
                  />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      isPast
                        ? "bg-[#0B6E99] text-white"
                        : isActive
                          ? "bg-[#0B6E99] text-white"
                          : "bg-[#E9E9E7] text-[#9B9A97]"
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive || isPast ? "text-[#37352F]" : "text-[#9B9A97]"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-6 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[3px]">
            <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError("")}
                className="text-xs text-red-600 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: Upload                                                        */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {step === "upload" && (
          <div>
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-[6px] p-16 text-center cursor-pointer transition-all
                ${
                  dragOver
                    ? "border-[#0B6E99] bg-[#0B6E99]/5"
                    : "border-[#E9E9E7] bg-[#F7F6F3] hover:border-[#D3D1CB] hover:bg-[#EFEFEF]"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />

              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={40} className="text-[#0B6E99] animate-spin" />
                  <p className="text-sm text-[#37352F] font-medium">
                    Parsing {fileName}...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#0B6E99]/10 flex items-center justify-center">
                    <Upload size={28} className="text-[#0B6E99]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#37352F]">
                      Drop an Excel file here or click to browse
                    </p>
                    <p className="text-xs text-[#9B9A97] mt-1">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Supported Columns Info */}
            <div className="mt-8 border border-[#E9E9E7] rounded-[6px] p-5 bg-white">
              <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                Supported Column Headers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#37352F]">
                <div>
                  <p className="font-medium text-[#787774] mb-1">Athlete Info</p>
                  <p className="text-[#9B9A97]">
                    Name, First Name, Last Name, Country, Gender, Age Category, Club
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#787774] mb-1">Discipline Scores</p>
                  <p className="text-[#9B9A97]">
                    Fencing, Fencing DE, Obstacle, Swimming, Laser Run, Riding
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#787774] mb-1">Time Fields</p>
                  <p className="text-[#9B9A97]">
                    Swim Time, Obstacle Time, LR Time (formats: M:SS.hh, SS.ss)
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#787774] mb-1">Points / Totals</p>
                  <p className="text-[#9B9A97]">
                    Points, Total, Score, Rank, Place
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: Preview & Review                                              */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {(step === "preview" || step === "importing") && parseResult && (
          <div>
            {/* File Info */}
            <div className="flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-[6px] mb-6">
              <FileSpreadsheet size={20} className="text-[#0B6E99] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#37352F] truncate">{fileName}</p>
                <p className="text-xs text-[#9B9A97]">
                  Sheet: {parseResult.sheetName} | {parseResult.athletes.length} athletes
                  found | {parseResult.totalRows} total rows
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-[#787774] hover:text-[#37352F] underline flex-shrink-0"
              >
                Change file
              </button>
            </div>

            {/* Parse Warnings */}
            {parseResult.warnings.length > 0 && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-[3px]">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">
                    Warnings ({parseResult.warnings.length})
                  </span>
                </div>
                <ul className="text-xs text-amber-700 space-y-1 ml-6">
                  {parseResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detected Columns */}
            <div className="mb-6 border border-[#E9E9E7] rounded-[6px] bg-white p-4">
              <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                Detected Columns
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(parseResult.detectedColumns).map(([key, header]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#F7F6F3] border border-[#E9E9E7] rounded-[3px] text-xs"
                  >
                    <CheckCircle2 size={12} className="text-green-600" />
                    <span className="text-[#787774]">{formatColumnKey(key)}</span>
                    <span className="text-[#9B9A97]">({header})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Competition Details (editable) */}
            <div className="mb-6 border border-[#E9E9E7] rounded-[6px] bg-white p-5">
              <h3 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-4">
                Competition Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#37352F] mb-1">
                    Competition Name *
                  </label>
                  <input
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] focus:outline-none focus:border-[#0B6E99] focus:ring-1 focus:ring-[#0B6E99]/20"
                    disabled={step === "importing"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#37352F] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] focus:outline-none focus:border-[#0B6E99] focus:ring-1 focus:ring-[#0B6E99]/20"
                    disabled={step === "importing"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#37352F] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={compLocation}
                    onChange={(e) => setCompLocation(e.target.value)}
                    placeholder="e.g., Dublin, Ireland"
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] placeholder-[#D3D1CB] focus:outline-none focus:border-[#0B6E99] focus:ring-1 focus:ring-[#0B6E99]/20"
                    disabled={step === "importing"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#37352F] mb-1">
                    Age Category
                  </label>
                  <select
                    value={compAgeCategory}
                    onChange={(e) => setCompAgeCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] focus:outline-none focus:border-[#0B6E99] focus:ring-1 focus:ring-[#0B6E99]/20"
                    disabled={step === "importing"}
                  >
                    {["U9", "U11", "U13", "U15", "U17", "U19", "Junior", "Senior", "Masters", "All"].map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Athletes" value={parseResult.athletes.length} icon={<Trophy size={16} />} />
              <StatCard label="Matched" value={matchedCount} icon={<UserCheck size={16} />} color="green" />
              <StatCard label="New" value={newCount} icon={<UserPlus size={16} />} color="blue" />
              <StatCard
                label="Disciplines"
                value={disciplinesPresent ? Object.values(disciplinesPresent).filter(Boolean).length : 0}
                icon={<FileSpreadsheet size={16} />}
              />
            </div>

            {/* Disciplines Found */}
            {disciplinesPresent && (
              <div className="mb-6 flex flex-wrap gap-2">
                {disciplinesPresent.fencingRanking && <DisciplineBadge label="Fencing Ranking" />}
                {disciplinesPresent.fencingDE && <DisciplineBadge label="Fencing DE" />}
                {disciplinesPresent.obstacle && <DisciplineBadge label="Obstacle" />}
                {disciplinesPresent.swimming && <DisciplineBadge label="Swimming" />}
                {disciplinesPresent.laserRun && <DisciplineBadge label="Laser Run" />}
                {disciplinesPresent.riding && <DisciplineBadge label="Riding" />}
              </div>
            )}

            {/* Athletes Table */}
            <div className="border border-[#E9E9E7] rounded-[6px] bg-white overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#E9E9E7] bg-[#F7F6F3]">
                      <th className="text-left px-3 py-2 font-medium text-[#787774]">#</th>
                      <th className="text-left px-3 py-2 font-medium text-[#787774]">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-[#787774]">Country</th>
                      <th className="text-left px-3 py-2 font-medium text-[#787774]">Gender</th>
                      <th className="text-left px-3 py-2 font-medium text-[#787774]">Category</th>
                      {disciplinesPresent?.fencingRanking && (
                        <th className="text-right px-3 py-2 font-medium text-[#787774]">Fencing</th>
                      )}
                      {disciplinesPresent?.fencingDE && (
                        <th className="text-right px-3 py-2 font-medium text-[#787774]">DE</th>
                      )}
                      {disciplinesPresent?.obstacle && (
                        <th className="text-right px-3 py-2 font-medium text-[#787774]">Obstacle</th>
                      )}
                      {disciplinesPresent?.swimming && (
                        <th className="text-right px-3 py-2 font-medium text-[#787774]">Swim</th>
                      )}
                      {disciplinesPresent?.laserRun && (
                        <th className="text-right px-3 py-2 font-medium text-[#787774]">LR</th>
                      )}
                      {disciplinesPresent?.riding && (
                        <th className="text-right px-3 py-2 font-medium text-[#787774]">Riding</th>
                      )}
                      <th className="text-right px-3 py-2 font-medium text-[#787774]">Total</th>
                      <th className="text-center px-3 py-2 font-medium text-[#787774]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.athletes.map((athlete, idx) => (
                      <AthleteRow
                        key={idx}
                        athlete={athlete}
                        index={idx}
                        disciplines={disciplinesPresent!}
                        expanded={expandedAthletes.has(idx)}
                        onToggle={() => toggleAthlete(idx)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Button */}
            {step === "preview" && (
              <div className="flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-[#787774] hover:text-[#37352F] border border-[#E9E9E7] rounded-[3px] hover:bg-[#F7F6F3] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={!compName || !compDate || parseResult.athletes.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={16} />
                  Confirm Import ({parseResult.athletes.length} athletes)
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Importing Progress */}
            {step === "importing" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 size={32} className="text-[#0B6E99] animate-spin" />
                <p className="text-sm text-[#37352F] font-medium">Importing data...</p>
                <div className="w-64 h-2 bg-[#E9E9E7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B6E99] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-[#9B9A97]">{progress}% complete</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* STEP 3: Done                                                          */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {step === "done" && importResult && (
          <div>
            {/* Success Banner */}
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-[6px] text-center">
              <CheckCircle2 size={40} className="text-green-600 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-[#37352F] mb-1">Import Complete</h2>
              <p className="text-sm text-[#787774]">
                Competition &ldquo;{importResult.competitionName}&rdquo; has been created successfully.
              </p>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <StatCard label="Athletes Created" value={importResult.athletesCreated} icon={<UserPlus size={16} />} color="blue" />
              <StatCard label="Athletes Matched" value={importResult.athletesMatched} icon={<UserCheck size={16} />} color="green" />
              <StatCard label="Events Created" value={importResult.eventsCreated} icon={<Trophy size={16} />} />
              <StatCard label="Scores Imported" value={importResult.scoresCreated} icon={<FileSpreadsheet size={16} />} />
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-[6px]">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={16} className="text-red-500" />
                  <span className="text-sm font-medium text-red-800">
                    {importResult.errors.length} error{importResult.errors.length > 1 ? "s" : ""} during import
                  </span>
                </div>
                <ul className="text-xs text-red-700 space-y-1 ml-6 list-disc">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors"
              >
                Import Another File
              </button>
              <a
                href={`/competitions/${importResult.competitionId}`}
                className="px-4 py-2 text-sm text-[#787774] hover:text-[#37352F] border border-[#E9E9E7] rounded-[3px] hover:bg-[#F7F6F3] transition-colors"
              >
                View Competition
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "green" | "blue";
}) {
  const colorClasses = {
    green: "text-green-600",
    blue: "text-[#0B6E99]",
  };

  return (
    <div className="p-3 border border-[#E9E9E7] rounded-[6px] bg-white">
      <div className="flex items-center gap-2 mb-1">
        <span className={color ? colorClasses[color] : "text-[#787774]"}>{icon}</span>
        <span className="text-xs text-[#9B9A97]">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color ? colorClasses[color] : "text-[#37352F]"}`}>
        {value}
      </p>
    </div>
  );
}

function DisciplineBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 bg-[#0B6E99]/10 text-[#0B6E99] text-xs font-medium rounded-[3px]">
      {label}
    </span>
  );
}

function AthleteRow({
  athlete,
  index,
  disciplines,
  expanded,
  onToggle,
}: {
  athlete: ParsedAthlete;
  index: number;
  disciplines: Record<string, boolean>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasWarnings = athlete.warnings.length > 0;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-[#E9E9E7] cursor-pointer hover:bg-[#F7F6F3] transition-colors ${
          hasWarnings ? "bg-amber-50/50" : ""
        }`}
      >
        <td className="px-3 py-2 text-[#9B9A97]">
          <span className="flex items-center gap-1">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {index + 1}
          </span>
        </td>
        <td className="px-3 py-2 font-medium text-[#37352F]">
          {athlete.firstName} {athlete.lastName}
          {athlete.club && (
            <span className="text-[10px] text-[#9B9A97] ml-1">({athlete.club})</span>
          )}
        </td>
        <td className="px-3 py-2 text-[#787774]">{athlete.country || "---"}</td>
        <td className="px-3 py-2 text-[#787774]">{athlete.gender || "---"}</td>
        <td className="px-3 py-2 text-[#787774]">{athlete.ageCategory}</td>
        {disciplines.fencingRanking && (
          <td className="px-3 py-2 text-right text-[#787774]">
            {athlete.scores.fencingRanking?.points ?? "---"}
          </td>
        )}
        {disciplines.fencingDE && (
          <td className="px-3 py-2 text-right text-[#787774]">
            {athlete.scores.fencingDE?.points ?? "---"}
          </td>
        )}
        {disciplines.obstacle && (
          <td className="px-3 py-2 text-right text-[#787774]">
            {athlete.scores.obstacle?.points ?? "---"}
          </td>
        )}
        {disciplines.swimming && (
          <td className="px-3 py-2 text-right text-[#787774]">
            {athlete.scores.swimming?.points ?? "---"}
          </td>
        )}
        {disciplines.laserRun && (
          <td className="px-3 py-2 text-right text-[#787774]">
            {athlete.scores.laserRun?.points ?? "---"}
          </td>
        )}
        {disciplines.riding && (
          <td className="px-3 py-2 text-right text-[#787774]">
            {athlete.scores.riding?.points ?? "---"}
          </td>
        )}
        <td className="px-3 py-2 text-right font-medium text-[#37352F]">
          {athlete.totalPoints || "---"}
        </td>
        <td className="px-3 py-2 text-center">
          {athlete.existingAthleteId ? (
            <span className="inline-flex items-center gap-1 text-green-600" title="Matched to existing athlete">
              <UserCheck size={13} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#0B6E99]" title="Will create new athlete">
              <UserPlus size={13} />
            </span>
          )}
          {hasWarnings && (
            <AlertTriangle size={12} className="text-amber-500 ml-1 inline" />
          )}
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {expanded && (
        <tr className="border-b border-[#E9E9E7] bg-[#F7F6F3]/50">
          <td colSpan={99} className="px-6 py-3">
            <div className="space-y-2 text-xs">
              {/* Match status */}
              {athlete.existingAthleteId ? (
                <p className="text-green-700">
                  <UserCheck size={12} className="inline mr-1" />
                  Matched to existing athlete: {athlete.existingAthleteName}
                </p>
              ) : (
                <p className="text-[#0B6E99]">
                  <UserPlus size={12} className="inline mr-1" />
                  New athlete will be created
                </p>
              )}

              {/* Score details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {athlete.scores.fencingRanking && (
                  <ScoreDetail
                    label="Fencing Ranking"
                    details={[
                      athlete.scores.fencingRanking.victories !== undefined ? `${athlete.scores.fencingRanking.victories} victories` : null,
                      athlete.scores.fencingRanking.totalBouts !== undefined ? `${athlete.scores.fencingRanking.totalBouts} bouts` : null,
                      athlete.scores.fencingRanking.points !== undefined ? `${athlete.scores.fencingRanking.points} pts` : null,
                    ]}
                  />
                )}
                {athlete.scores.fencingDE && (
                  <ScoreDetail
                    label="Fencing DE"
                    details={[
                      athlete.scores.fencingDE.placement !== undefined ? `Placement: ${athlete.scores.fencingDE.placement}` : null,
                      athlete.scores.fencingDE.points !== undefined ? `${athlete.scores.fencingDE.points} pts` : null,
                    ]}
                  />
                )}
                {athlete.scores.obstacle && (
                  <ScoreDetail
                    label="Obstacle"
                    details={[
                      athlete.scores.obstacle.timeSeconds !== undefined ? `Time: ${athlete.scores.obstacle.timeSeconds.toFixed(2)}s` : null,
                      athlete.scores.obstacle.points !== undefined ? `${athlete.scores.obstacle.points} pts` : null,
                    ]}
                  />
                )}
                {athlete.scores.swimming && (
                  <ScoreDetail
                    label="Swimming"
                    details={[
                      athlete.scores.swimming.timeRaw ? `Time: ${athlete.scores.swimming.timeRaw}` : null,
                      athlete.scores.swimming.timeHundredths !== undefined ? `(${athlete.scores.swimming.timeHundredths} hundredths)` : null,
                      athlete.scores.swimming.points !== undefined ? `${athlete.scores.swimming.points} pts` : null,
                    ]}
                  />
                )}
                {athlete.scores.laserRun && (
                  <ScoreDetail
                    label="Laser Run"
                    details={[
                      athlete.scores.laserRun.timeRaw ? `Time: ${athlete.scores.laserRun.timeRaw}` : null,
                      athlete.scores.laserRun.finishTimeSeconds !== undefined ? `(${athlete.scores.laserRun.finishTimeSeconds.toFixed(2)}s)` : null,
                      athlete.scores.laserRun.points !== undefined ? `${athlete.scores.laserRun.points} pts` : null,
                    ]}
                  />
                )}
                {athlete.scores.riding && (
                  <ScoreDetail
                    label="Riding"
                    details={[
                      athlete.scores.riding.knockdowns !== undefined ? `KD: ${athlete.scores.riding.knockdowns}` : null,
                      athlete.scores.riding.disobediences !== undefined ? `Disob: ${athlete.scores.riding.disobediences}` : null,
                      athlete.scores.riding.points !== undefined ? `${athlete.scores.riding.points} pts` : null,
                    ]}
                  />
                )}
              </div>

              {/* Warnings */}
              {athlete.warnings.length > 0 && (
                <div className="flex items-start gap-1.5 text-amber-700">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{athlete.warnings.join("; ")}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ScoreDetail({ label, details }: { label: string; details: (string | null)[] }) {
  const items = details.filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="p-2 bg-white border border-[#E9E9E7] rounded-[3px]">
      <p className="font-medium text-[#787774] mb-0.5">{label}</p>
      <p className="text-[#37352F]">{items.join(" | ")}</p>
    </div>
  );
}

function formatColumnKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
