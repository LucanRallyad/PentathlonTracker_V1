"use client";

import { cn } from "@/lib/utils";

const statusStyles: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: "bg-[#0F7B6C]", text: "text-[#0F7B6C]", bg: "bg-[#DDEDEA]" },
  in_progress: { dot: "bg-[#0F7B6C]", text: "text-[#0F7B6C]", bg: "bg-[#DDEDEA]" },
  upcoming: { dot: "bg-[#D9730D]", text: "text-[#D9730D]", bg: "bg-[#FAEBDD]" },
  pending: { dot: "bg-[#D9730D]", text: "text-[#D9730D]", bg: "bg-[#FAEBDD]" },
  completed: { dot: "bg-[#9B9A97]", text: "text-[#9B9A97]", bg: "bg-[#EBECED]" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || statusStyles.pending;
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-xs font-medium",
        style.bg,
        style.text
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      {label}
    </span>
  );
}
