"use client";

import { useState, useCallback } from "react";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import { TopNav } from "@/components/TopNav";
import {
  Monitor,
  RotateCcw,
  Copy,
  Check,
  ArrowLeft,
  Timer,
  Swords,
  Flag,
  Crosshair,
  ClipboardCheck,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import SwimmingTimerDashboard from "@/components/volunteer/SwimmingTimerDashboard";
import FencingRankingDashboard from "@/components/volunteer/FencingRankingDashboard";
import ObstacleTimerDashboard from "@/components/volunteer/ObstacleTimerDashboard";
import ObstacleFlagDashboard from "@/components/volunteer/ObstacleFlagDashboard";
import LaserRunTimerDashboard from "@/components/volunteer/LaserRunTimerDashboard";
import RidingJudgeDashboard from "@/components/volunteer/RidingJudgeDashboard";

const TABS = [
  {
    key: "swimming",
    label: "Swimming Timer",
    description: "Lane timing & splits",
    icon: Timer,
    iconBg: "bg-[#DDEBF1]",
    iconColor: "text-[#0B6E99]",
  },
  {
    key: "fencing",
    label: "Fencing Ranking",
    description: "Pool bout scoring",
    icon: Swords,
    iconBg: "bg-[#EDE4F0]",
    iconColor: "text-[#6940A5]",
  },
  {
    key: "obstacle-timer",
    label: "Obstacle Timer",
    description: "Obstacle course timing",
    icon: Timer,
    iconBg: "bg-[#FAEBDD]",
    iconColor: "text-[#D9730D]",
  },
  {
    key: "obstacle-flagger",
    label: "Obstacle Flagger",
    description: "Penalty flag tracking",
    icon: Flag,
    iconBg: "bg-[#FBF3DB]",
    iconColor: "text-[#DFAB01]",
  },
  {
    key: "laser-run",
    label: "Laser Run",
    description: "Run & shoot dual timer",
    icon: Crosshair,
    iconBg: "bg-[#DDEDEA]",
    iconColor: "text-[#0F7B6C]",
  },
  {
    key: "riding",
    label: "Riding Judge",
    description: "Penalty scoring",
    icon: ClipboardCheck,
    iconBg: "bg-[#FBE4E4]",
    iconColor: "text-[#E03E3E]",
  },
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
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

  const handleSelect = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setLastSubmission(null);
    setResetKey((k) => k + 1);
  }, []);

  const handleBack = useCallback(() => {
    setActiveTab(null);
    setLastSubmission(null);
  }, []);

  const variant = isDesktop ? "desktop" : "mobile";

  function renderDashboard() {
    switch (activeTab) {
      case "swimming":
        return (
          <SwimmingTimerDashboard
            key={resetKey}
            athleteName="Jane Smith"
            laneName="Lane 3"
            eventName="Demo Competition"
            variant={variant}
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
            variant={variant}
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
            variant={variant}
            onSubmit={handleSubmit}
          />
        );
      case "obstacle-flagger":
        return (
          <ObstacleFlagDashboard
            key={resetKey}
            athletes={MOCK_OBSTACLE_ATHLETES}
            eventName="Demo Competition"
            variant={variant}
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
            variant={variant}
            onSubmit={handleSubmit}
          />
        );
      case "riding":
        return (
          <RidingJudgeDashboard
            key={resetKey}
            athleteName="Jane Smith"
            eventName="Demo Competition"
            variant={variant}
            onSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  }

  const activeTabInfo = TABS.find((t) => t.key === activeTab);

  const submittedDataPanel = (
    <div className="w-full">
      <div className="bg-white border border-[#E9E9E7] rounded-[4px] overflow-hidden">
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
                  <Check size={12} className="text-[#0F7B6C]" />
                  <span className="text-[#0F7B6C]">Copied</span>
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
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {lastSubmission ? (
            <pre className="text-xs text-[#37352F] font-mono whitespace-pre-wrap break-all leading-relaxed">
              {lastSubmission}
            </pre>
          ) : (
            <p className="text-sm text-[#9B9A97] text-center py-6">
              Interact with the dashboard and submit data to see it here
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <SuperAdminGuard>
      <TopNav
        breadcrumbs={[
          { label: "Super Admin", href: "/super-admin/dashboard" },
          { label: "Volunteer Views" },
        ]}
      />

      <div className="max-w-[1100px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-[4px] bg-[#DDEBF1] flex items-center justify-center">
            <Monitor className="w-5 h-5 text-[#0B6E99]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#37352F]">
              Volunteer Dashboard Previews
            </h1>
            <p className="text-sm text-[#787774]">
              Interactive demos of each volunteer dashboard
            </p>
          </div>
        </div>

        {/* ─── Selection Screen ─── */}
        {activeTab === null && (
          <div className="mt-8">
            <p className="text-sm text-[#9B9A97] mb-4 uppercase tracking-wider font-medium">
              Select a dashboard to preview
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleSelect(tab.key)}
                    className="bg-white rounded-[4px] border border-[#E9E9E7] p-5 sm:p-5 min-h-[88px] sm:min-h-0 text-left hover:border-[#0B6E99]/40 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 sm:w-10 sm:h-10 rounded-[4px] ${tab.iconBg} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`w-6 h-6 sm:w-5 sm:h-5 ${tab.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#37352F] text-base sm:text-sm group-hover:text-[#0B6E99] transition-colors">
                          {tab.label}
                        </p>
                        <p className="text-sm sm:text-xs text-[#9B9A97] mt-0.5">
                          {tab.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Active Dashboard View ─── */}
        {activeTab !== null && (
          <div className="mt-6">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 sm:min-h-0 sm:px-3 sm:py-1.5 rounded-[4px] text-base sm:text-sm font-medium text-[#37352F] sm:text-[#787774] border border-[#E9E9E7] sm:border-transparent hover:bg-[#F7F6F3] sm:hover:bg-[#E9E9E7] hover:text-[#37352F] transition-colors"
              >
                <ArrowLeft size={20} className="sm:w-[15px] sm:h-[15px]" />
                Back
              </button>

              {activeTabInfo && (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-[3px] ${activeTabInfo.iconBg} flex items-center justify-center`}
                  >
                    <activeTabInfo.icon
                      className={`w-3.5 h-3.5 ${activeTabInfo.iconColor}`}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#37352F]">
                    {activeTabInfo.label}
                  </span>
                </div>
              )}

              <div className="ml-auto">
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

            {/* Dashboard + Submitted Data */}
            {isDesktop ? (
              /* Desktop: side-by-side layout */
              <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">{renderDashboard()}</div>
                <div className="w-[340px] flex-shrink-0 sticky top-4">
                  {submittedDataPanel}
                </div>
              </div>
            ) : (
              /* Mobile: stacked layout */
              <div className="space-y-4">
                <div>{renderDashboard()}</div>
                {submittedDataPanel}
              </div>
            )}
          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}
