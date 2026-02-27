"use client";

import { useState, useCallback } from "react";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import { TopNav } from "@/components/TopNav";
import { Monitor, RotateCcw, Copy, Check } from "lucide-react";

import SwimmingTimerDashboard from "@/components/volunteer/SwimmingTimerDashboard";
import FencingRankingDashboard from "@/components/volunteer/FencingRankingDashboard";
import ObstacleTimerDashboard from "@/components/volunteer/ObstacleTimerDashboard";
import ObstacleFlagDashboard from "@/components/volunteer/ObstacleFlagDashboard";
import LaserRunTimerDashboard from "@/components/volunteer/LaserRunTimerDashboard";
import RidingJudgeDashboard from "@/components/volunteer/RidingJudgeDashboard";

const TABS = [
  { key: "swimming", label: "Swimming" },
  { key: "fencing", label: "Fencing" },
  { key: "obstacle-timer", label: "Obstacle Timer" },
  { key: "obstacle-flagger", label: "Obstacle Flagger" },
  { key: "laser-run", label: "Laser Run" },
  { key: "riding", label: "Riding" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const MOCK_FENCING_ATHLETES = [
  { id: "1", name: "Alice", initials: "AL" },
  { id: "2", name: "Bob", initials: "BO" },
  { id: "3", name: "Charlie", initials: "CH" },
  { id: "4", name: "Diana", initials: "DI" },
];

const MOCK_OBSTACLE_ATHLETES = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
  { id: "3", name: "Charlie" },
];

export default function VolunteerViewsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("swimming");
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback((data: unknown) => {
    setLastSubmission(JSON.stringify(data, null, 2));
  }, []);

  const handleReset = useCallback(() => {
    setResetKey((k) => k + 1);
    setLastSubmission(null);
  }, []);

  const handleCopy = useCallback(() => {
    if (!lastSubmission) return;
    navigator.clipboard.writeText(lastSubmission).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [lastSubmission]);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setLastSubmission(null);
    setResetKey((k) => k + 1);
  }, []);

  function renderDashboard() {
    switch (activeTab) {
      case "swimming":
        return (
          <SwimmingTimerDashboard
            key={resetKey}
            athleteName="Jane Smith"
            laneName="Lane 3"
            eventName="Demo Competition"
            onSubmit={handleSubmit}
          />
        );
      case "fencing":
        return (
          <FencingRankingDashboard
            key={resetKey}
            poolName="Pool A"
            athletes={MOCK_FENCING_ATHLETES}
            eventName="Demo Competition"
            onSubmit={handleSubmit}
          />
        );
      case "obstacle-timer":
        return (
          <ObstacleTimerDashboard
            key={resetKey}
            laneName="Lane 1"
            athletes={MOCK_OBSTACLE_ATHLETES}
            eventName="Demo Competition"
            onSubmit={handleSubmit}
          />
        );
      case "obstacle-flagger":
        return (
          <ObstacleFlagDashboard
            key={resetKey}
            athletes={MOCK_OBSTACLE_ATHLETES}
            eventName="Demo Competition"
            onSubmit={handleSubmit}
          />
        );
      case "laser-run":
        return (
          <LaserRunTimerDashboard
            key={resetKey}
            athleteName="Jane Smith"
            handicapDelay={15}
            targetPosition={3}
            wave={1}
            gate="A"
            totalLaps={4}
            startMode="staggered"
            eventName="Demo Competition"
            onSubmit={handleSubmit}
          />
        );
      case "riding":
        return (
          <RidingJudgeDashboard
            key={resetKey}
            athleteName="Jane Smith"
            eventName="Demo Competition"
            onSubmit={handleSubmit}
          />
        );
    }
  }

  return (
    <SuperAdminGuard>
      <TopNav
        breadcrumbs={[
          { label: "Super Admin", href: "/super-admin/dashboard" },
          { label: "Volunteer Views" },
        ]}
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0B6E99] to-[#0B6E99]/70 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#37352F]">
              Volunteer Dashboard Previews
            </h1>
            <p className="text-sm text-[#787774]">
              Interactive demos of each volunteer dashboard as seen on a mobile device
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mt-6 mb-6 flex items-center gap-1 overflow-x-auto pb-1 sticky top-0 bg-[#F7F6F3] z-20 -mx-4 px-4 py-2 border-b border-[#E9E9E7]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-1.5 rounded-[4px] text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-[#37352F] text-white"
                  : "text-[#787774] hover:bg-[#E9E9E7] hover:text-[#37352F]"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="ml-auto flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-[#787774] hover:bg-[#E9E9E7] hover:text-[#37352F] transition-colors"
              title="Reset dashboard state"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          </div>
        </div>

        {/* Phone Frame + Submission Panel */}
        <div className="flex flex-col items-center gap-6">
          {/* Phone Frame */}
          <div className="relative">
            {/* Phone bezel */}
            <div
              className="relative rounded-[40px] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] shadow-2xl overflow-hidden"
              style={{ width: 387, height: 780 }}
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[120px] h-[28px] bg-[#1a1a1a] rounded-b-2xl flex items-center justify-center">
                <div className="w-[60px] h-[4px] rounded-full bg-[#333]" />
              </div>

              {/* Screen area */}
              <div
                className="bg-white rounded-[34px] overflow-hidden"
                style={{ width: 375, height: 768 }}
              >
                <div className="h-full overflow-y-auto overscroll-contain">
                  {renderDashboard()}
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] rounded-full bg-[#555] z-30" />
          </div>

          {/* Submitted Data Panel */}
          <div className="w-full max-w-[420px]">
            <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E9E9E7] bg-[#F7F6F3]">
                <p className="text-xs font-semibold text-[#37352F] uppercase tracking-wider">
                  Submitted Data
                </p>
                {lastSubmission && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-[#787774] hover:text-[#37352F] transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-green-600" />
                        <span className="text-green-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="p-4 max-h-[280px] overflow-y-auto">
                {lastSubmission ? (
                  <pre className="text-xs text-[#37352F] font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {lastSubmission}
                  </pre>
                ) : (
                  <p className="text-sm text-[#9B9A97] text-center py-6">
                    Interact with the dashboard above and submit data to see it here
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
