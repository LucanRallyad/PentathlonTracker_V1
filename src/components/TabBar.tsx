"use client";

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border)] -mx-4 px-4 md:mx-0 md:px-0 bg-[var(--card)]">
      <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-t-[calc(var(--radius)-2px)] relative whitespace-nowrap flex-shrink-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
              activeTab === tab.id
                ? "text-[var(--foreground)] bg-[var(--card)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
