"use client";

import { useState, useCallback } from "react";
import { Play, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface CompetitionStatusControlProps {
  competitionId: string;
  status: string;
  /** Called after a successful status change so the parent can refetch */
  onStatusChange: () => void;
  /** "inline" = compact row for cards, "header" = larger buttons for page headers */
  variant?: "inline" | "header";
}

export function CompetitionStatusControl({
  competitionId,
  status,
  onStatusChange,
  variant = "header",
}: CompetitionStatusControlProps) {
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"launch" | "finish" | null>(null);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      setUpdating(true);
      try {
        const res = await fetch(`/api/competitions/${competitionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to update status");
        } else {
          onStatusChange();
        }
      } catch {
        alert("Network error — please try again");
      } finally {
        setUpdating(false);
        setConfirmAction(null);
      }
    },
    [competitionId, onStatusChange]
  );

  const isInline = variant === "inline";

  // Nothing to show for completed competitions
  if (status === "completed") {
    return isInline ? null : <StatusBadge status={status} />;
  }

  // ── Upcoming → Launch ──────────────────────────────────────────────────────
  if (status === "upcoming") {
    if (confirmAction === "launch") {
      return (
        <div className="flex items-center gap-2">
          <span className={`${isInline ? "text-xs" : "text-sm"} text-[#787774]`}>
            Launch this competition?
          </span>
          <button
            onClick={() => handleStatusChange("active")}
            disabled={updating}
            className={`${
              isInline ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-sm"
            } font-medium text-white bg-[#0F7B6C] rounded-[3px] hover:bg-[#0a5f54] transition-colors disabled:opacity-50`}
          >
            {updating ? "Launching..." : "Confirm"}
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            disabled={updating}
            className={`${
              isInline ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-sm"
            } text-[#787774] border border-[#E9E9E7] rounded-[3px] hover:bg-[#EFEFEF] transition-colors`}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setConfirmAction("launch")}
        className={`flex items-center gap-1.5 ${
          isInline ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
        } font-medium text-white bg-[#0F7B6C] rounded-[3px] hover:bg-[#0a5f54] transition-colors`}
      >
        <Play size={isInline ? 12 : 14} />
        {isInline ? "Launch" : "Launch Competition"}
      </button>
    );
  }

  // ── Active → Finish ────────────────────────────────────────────────────────
  if (status === "active") {
    if (confirmAction === "finish") {
      return (
        <div className="flex items-center gap-2">
          <span className={`${isInline ? "text-xs" : "text-sm"} text-[#787774]`}>
            Finish this competition?
          </span>
          <button
            onClick={() => handleStatusChange("completed")}
            disabled={updating}
            className={`${
              isInline ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-sm"
            } font-medium text-white bg-[#37352F] rounded-[3px] hover:bg-[#2a2926] transition-colors disabled:opacity-50`}
          >
            {updating ? "Finishing..." : "Confirm"}
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            disabled={updating}
            className={`${
              isInline ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-sm"
            } text-[#787774] border border-[#E9E9E7] rounded-[3px] hover:bg-[#EFEFEF] transition-colors`}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setConfirmAction("finish")}
        className={`flex items-center gap-1.5 ${
          isInline ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
        } font-medium text-white bg-[#37352F] rounded-[3px] hover:bg-[#2a2926] transition-colors`}
      >
        <CheckCircle2 size={isInline ? 12 : 14} />
        {isInline ? "Finish" : "Finish Competition"}
      </button>
    );
  }

  return null;
}
