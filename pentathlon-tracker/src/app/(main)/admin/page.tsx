"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { CompetitionStatusControl } from "@/components/CompetitionStatusControl";
import { Plus, PenLine, Eye, Users, Trophy, ChevronDown, ChevronRight, Trash2, UserCheck } from "lucide-react";

interface Competition {
  id: string;
  name: string;
  date: string;
  endDate: string;
  location: string;
  status: string;
  ageCategory: string;
  events: { id: string; status: string; discipline: string }[];
  _count: { competitionAthletes: number };
}

export default function AdminDashboard() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  const loadCompetitions = useCallback(() => {
    fetch("/api/competitions")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then(setCompetitions)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  const active = competitions.filter((c) => c.status === "active");
  const upcoming = competitions.filter((c) => c.status === "upcoming");
  const completed = competitions.filter((c) => c.status === "completed");

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Home", href: "/" }, { label: "Admin" }]} />
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">
            Admin Dashboard
          </h1>
          <Link
            href="/admin/competitions/new"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors"
          >
            <Plus size={16} />
            New Competition
          </Link>
        </div>

        {/* Active Competitions */}
        {active.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Active Competitions
            </h2>
            <div className="space-y-3">
              {active.map((comp) => (
                <AdminCompetitionCard key={comp.id} competition={comp} onStatusChange={loadCompetitions} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
              Upcoming Competitions
            </h2>
            <div className="space-y-3">
              {upcoming.map((comp) => (
                <AdminCompetitionCard key={comp.id} competition={comp} onStatusChange={loadCompetitions} />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3 hover:text-[#787774] transition-colors"
            >
              {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Completed Competitions ({completed.length})
            </button>
            {showCompleted && (
              <div className="space-y-3">
                {completed.map((comp) => (
                  <AdminCompetitionCard key={comp.id} competition={comp} onStatusChange={loadCompetitions} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function AdminCompetitionCard({
  competition,
  onStatusChange,
}: {
  competition: Competition;
  onStatusChange: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const inProgressEvents = competition.events.filter((e) => e.status === "in_progress");
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${competition.name}"?\n\nThis will permanently remove the competition, its events, athlete entries, and all related scores.`
    );
    if (!confirmed) return;

    const secondConfirm = window.prompt(
      `Final confirmation: type DELETE to permanently remove "${competition.name}".`
    );
    if (secondConfirm !== "DELETE") {
      window.alert("Deletion cancelled. You must type DELETE exactly.");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: "DELETE",
        credentials: "include", // Include cookies for authentication
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const errorMessage = body?.error || `Failed to delete competition (${res.status})`;
        console.error("Delete competition error:", {
          status: res.status,
          statusText: res.statusText,
          body,
        });
        throw new Error(errorMessage);
      }

      const result = await res.json();
      onStatusChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete competition";
      console.error("Delete competition error:", error);
      window.alert(`Error: ${message}\n\nPlease check the browser console for more details.`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border border-[#E9E9E7] rounded-[4px] p-4 hover:bg-[#FBFBFA] transition-colors">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[15px] font-medium text-[#37352F] truncate">
          {competition.name}
        </span>
        <StatusBadge status={competition.status} />
      </div>

      {/* Subheader info */}
      <div className="text-sm text-[#787774]">
        {competition.location} · {competition.ageCategory} · {competition._count.competitionAthletes} athletes
      </div>
      {inProgressEvents.length > 0 && (
        <div className="text-xs text-[#0F7B6C] mt-1">
          Now: {inProgressEvents.map((e) => e.discipline.replace(/_/g, " ")).join(", ")}
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <CompetitionStatusControl
          competitionId={competition.id}
          status={competition.status}
          onStatusChange={onStatusChange}
          variant="inline"
        />
        <Link
          href={`/admin/competitions/${competition.id}/athletes`}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#37352F] border border-[#E9E9E7] rounded-[3px] hover:bg-[#EFEFEF] transition-colors"
        >
          <Users size={12} />
          Athletes
        </Link>
        <Link
          href={`/admin/competitions/${competition.id}/score-entry`}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0B6E99] border border-[#0B6E99] rounded-[3px] hover:bg-[#DDEBF1] transition-colors"
        >
          <PenLine size={12} />
          Score Entry
        </Link>
        <Link
          href={`/admin/competitions/${competition.id}/results`}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#DFAB01] border border-[#DFAB01] rounded-[3px] hover:bg-[#FFF8E1] transition-colors"
        >
          <Trophy size={12} />
          Results
        </Link>
        <Link
          href={`/admin/competitions/${competition.id}/volunteers`}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F7B6C] border border-[#0F7B6C] rounded-[3px] hover:bg-[#E6F4F1] transition-colors"
        >
          <UserCheck size={12} />
          Volunteers
        </Link>
        <Link
          href={`/competitions/${competition.id}`}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#787774] border border-[#E9E9E7] rounded-[3px] hover:bg-[#EFEFEF] transition-colors"
        >
          <Eye size={12} />
          View
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#B42318] border border-[#F1D1CC] rounded-[3px] hover:bg-[#FFF1EF] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
