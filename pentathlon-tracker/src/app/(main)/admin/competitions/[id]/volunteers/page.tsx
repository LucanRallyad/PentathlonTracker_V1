"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import {
  Plus,
  X,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Trash2,
  ShieldAlert,
  Users,
  ClipboardList,
  Loader2,
  AlertTriangle,
  UserX,
  Zap,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Competition {
  id: string;
  name: string;
  status: string;
  volunteerAccessEnabled: boolean;
  showPreliminaryScores: boolean;
}

interface Event {
  id: string;
  discipline: string;
  scheduledStart: string | null;
}

interface VolunteerAssignment {
  id: string;
  eventId: string;
  role: string;
  event?: Event;
}

interface Volunteer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  accessToken: string;
  status: string;
  createdAt: string;
  lastActiveAt: string | null;
  assignments: VolunteerAssignment[];
}

interface PreliminaryScore {
  id: string;
  eventId: string;
  athleteId: string;
  volunteerId: string;
  discipline: string;
  data: string;
  status: string;
  submittedAt: string;
  athlete?: { firstName: string; lastName: string };
  volunteer?: { name: string };
  event?: { discipline: string };
}

interface ProposedAssignment {
  volunteerId: string;
  volunteerName: string;
  eventId: string;
  role: string;
  athleteIds: string[] | null;
  metadata: Record<string, unknown> | null;
}

const DISCIPLINE_LABELS: Record<string, string> = {
  fencing_ranking: "Fencing (Ranking)",
  fencing_de: "Fencing (DE)",
  obstacle: "Obstacle",
  swimming: "Swimming",
  laser_run: "Laser Run",
  riding: "Riding",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function VolunteersPage() {
  const { id } = useParams<{ id: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [preliminaryScores, setPreliminaryScores] = useState<PreliminaryScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add volunteer modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Auto-assign
  const [selectedEventId, setSelectedEventId] = useState("");
  const [proposedAssignments, setProposedAssignments] = useState<ProposedAssignment[]>([]);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState("");

  // Pending verification
  const [showPreliminary, setShowPreliminary] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Revoke all confirmation
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  // Clipboard feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toggling volunteer access
  const [togglingAccess, setTogglingAccess] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [compRes, eventsRes, volRes] = await Promise.all([
        fetch(`/api/competitions/${id}`),
        fetch(`/api/competitions/${id}/events`),
        fetch(`/api/competitions/${id}/volunteers`),
      ]);

      if (!compRes.ok) throw new Error("Failed to load competition");

      const comp = await compRes.json();
      const evts = eventsRes.ok ? await eventsRes.json() : [];
      const vols = volRes.ok ? await volRes.json() : [];

      setCompetition(comp);
      setEvents(evts);
      setVolunteers(vols);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchPreliminaryScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitions/${id}/preliminary-scores`);
      if (res.ok) {
        const data = await res.json();
        setPreliminaryScores(data);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (showPreliminary) fetchPreliminaryScores();
  }, [showPreliminary, fetchPreliminaryScores]);

  // ── Toggle volunteer access ──────────────────────────────────────────────

  async function toggleVolunteerAccess() {
    if (!competition) return;
    setTogglingAccess(true);
    try {
      const res = await fetch(`/api/competitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerAccessEnabled: !competition.volunteerAccessEnabled }),
      });
      if (res.ok) {
        setCompetition({ ...competition, volunteerAccessEnabled: !competition.volunteerAccessEnabled });
      }
    } catch {
      /* ignore */
    } finally {
      setTogglingAccess(false);
    }
  }

  // ── Add volunteer ────────────────────────────────────────────────────────

  async function handleAddVolunteer(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");

    if (!addForm.name.trim()) {
      setAddError("Name is required.");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/competitions/${id}/volunteers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim() || null,
          phone: addForm.phone.trim() || null,
        }),
      });

      if (res.ok) {
        const vol = await res.json();
        setVolunteers((prev) => [...prev, { ...vol, assignments: vol.assignments || [] }]);
        setAddForm({ name: "", email: "", phone: "" });
        setShowAddModal(false);
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to add volunteer.");
      }
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  // ── Revoke / Restore volunteer ───────────────────────────────────────────

  async function toggleVolunteerStatus(volunteerId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "revoked" : "active";
    try {
      const res = await fetch(`/api/competitions/${id}/volunteers/${volunteerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === volunteerId ? { ...v, status: newStatus } : v))
        );
      }
    } catch {
      /* ignore */
    }
  }

  // ── Delete volunteer ─────────────────────────────────────────────────────

  async function deleteVolunteer(volunteerId: string) {
    try {
      const res = await fetch(`/api/competitions/${id}/volunteers/${volunteerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVolunteers((prev) => prev.filter((v) => v.id !== volunteerId));
      }
    } catch {
      /* ignore */
    }
  }

  // ── Copy access link ─────────────────────────────────────────────────────

  function copyAccessLink(volunteer: Volunteer) {
    const link = `${window.location.origin}/volunteer/${volunteer.accessToken}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(volunteer.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // ── Revoke all ───────────────────────────────────────────────────────────

  async function handleRevokeAll() {
    setRevokingAll(true);
    try {
      const res = await fetch(`/api/competitions/${id}/volunteers/revoke-all`, {
        method: "POST",
      });
      if (res.ok) {
        setVolunteers((prev) => prev.map((v) => ({ ...v, status: "revoked" })));
        setShowRevokeAllConfirm(false);
      }
    } catch {
      /* ignore */
    } finally {
      setRevokingAll(false);
    }
  }

  // ── Auto-assign ──────────────────────────────────────────────────────────

  async function handleAutoAssign() {
    if (!selectedEventId) return;
    setAutoAssigning(true);
    setAutoAssignError("");
    try {
      const res = await fetch(`/api/competitions/${id}/volunteers/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      if (res.ok) {
        const data = await res.json();
        setProposedAssignments(data.proposed || []);
      } else {
        const data = await res.json();
        setAutoAssignError(data.error || "Auto-assign failed.");
      }
    } catch {
      setAutoAssignError("Network error.");
    } finally {
      setAutoAssigning(false);
    }
  }

  function moveAssignment(index: number, direction: "up" | "down") {
    setProposedAssignments((prev) => {
      const next = [...prev];
      const swapIdx = direction === "up" ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
      return next;
    });
  }

  async function handleLaunchAssignments() {
    if (!selectedEventId || proposedAssignments.length === 0) return;
    setLaunching(true);
    setAutoAssignError("");
    try {
      const res = await fetch(`/api/competitions/${id}/volunteers/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId, assignments: proposedAssignments }),
      });
      if (res.ok) {
        setProposedAssignments([]);
        fetchData();
      } else {
        const data = await res.json();
        setAutoAssignError(data.error || "Launch failed.");
      }
    } catch {
      setAutoAssignError("Network error.");
    } finally {
      setLaunching(false);
    }
  }

  // ── Verify / Reject preliminary scores ───────────────────────────────────

  async function verifyScore(scoreId: string) {
    setVerifyingId(scoreId);
    try {
      const res = await fetch(`/api/preliminary-scores/${scoreId}/verify`, {
        method: "PATCH",
      });
      if (res.ok) {
        setPreliminaryScores((prev) =>
          prev.map((s) => (s.id === scoreId ? { ...s, status: "verified" } : s))
        );
      }
    } catch {
      /* ignore */
    } finally {
      setVerifyingId(null);
    }
  }

  async function rejectScore(scoreId: string) {
    setRejectingId(scoreId);
    try {
      const res = await fetch(`/api/preliminary-scores/${scoreId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      if (res.ok) {
        setPreliminaryScores((prev) =>
          prev.map((s) => (s.id === scoreId ? { ...s, status: "rejected" } : s))
        );
        setShowRejectModal(null);
        setRejectionReason("");
      }
    } catch {
      /* ignore */
    } finally {
      setRejectingId(null);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function getAssignmentSummary(assignments: VolunteerAssignment[]) {
    if (assignments.length === 0) return "Unassigned";
    return assignments
      .map((a) => {
        const disc = a.event?.discipline || a.eventId;
        return `${DISCIPLINE_LABELS[disc] || disc} (${a.role})`;
      })
      .join(", ");
  }

  const activeVolunteers = volunteers.filter((v) => v.status === "active");
  const pendingScores = preliminaryScores.filter((s) => s.status === "preliminary");

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading || !competition) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Loading..." }]} />
        <div className="max-w-[960px] mx-auto px-6 py-12">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#9B9A97]" />
            <span className="text-sm text-[#9B9A97]">Loading volunteer management...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Error" }]} />
        <div className="max-w-[960px] mx-auto px-6 py-12">
          <div className="flex items-center gap-2 text-[#E03E3E]">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: competition.name, href: `/admin/competitions/${id}/score-entry` },
          { label: "Volunteers" },
        ]}
      />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight">
              Volunteer Management
            </h1>
            <p className="text-sm text-[#787774] mt-1">
              {volunteers.length} volunteer{volunteers.length !== 1 ? "s" : ""} · {activeVolunteers.length} active
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Volunteer access toggle */}
            <button
              onClick={toggleVolunteerAccess}
              disabled={togglingAccess}
              className={`
                flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-[3px] transition-colors
                ${competition.volunteerAccessEnabled
                  ? "bg-[#DBEDDB] text-[#0F7B6C] hover:bg-[#c8e3c8]"
                  : "bg-[#F7F6F3] text-[#787774] hover:bg-[#EFEFEF]"
                }
              `}
            >
              {competition.volunteerAccessEnabled ? (
                <>
                  <Eye size={14} />
                  Access Enabled
                </>
              ) : (
                <>
                  <EyeOff size={14} />
                  Access Disabled
                </>
              )}
            </button>

            {/* Revoke all */}
            {activeVolunteers.length > 0 && (
              <button
                onClick={() => setShowRevokeAllConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#E03E3E] bg-[#FBE4E4] rounded-[3px] hover:bg-[#f5cdcd] transition-colors"
              >
                <UserX size={14} />
                Revoke All
              </button>
            )}
          </div>
        </div>

        {/* ── Volunteer List ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase">
              Volunteers ({volunteers.length})
            </h2>
            <button
              onClick={() => {
                setShowAddModal(true);
                setAddForm({ name: "", email: "", phone: "" });
                setAddError("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors"
            >
              <Plus size={14} />
              Add Volunteer
            </button>
          </div>

          {volunteers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#E9E9E7] rounded-[4px]">
              <Users size={24} className="mx-auto text-[#C4C4C0] mb-2" />
              <p className="text-sm text-[#9B9A97]">No volunteers added yet</p>
              <p className="text-xs text-[#C4C4C0] mt-1">
                Click &quot;Add Volunteer&quot; to get started
              </p>
            </div>
          ) : (
            <div className="border border-[#C8C8C5] rounded-sm overflow-x-auto shadow-sm">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left">
                      Name
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left">
                      Contact
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[80px]">
                      Status
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left">
                      Assignment
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[110px]">
                      Last Active
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[140px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map((vol) => (
                    <tr key={vol.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#37352F] font-medium">
                        {vol.name}
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774]">
                        {vol.email || vol.phone || "—"}
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            vol.status === "active"
                              ? "bg-[#DBEDDB] text-[#0F7B6C]"
                              : "bg-[#FBE4E4] text-[#E03E3E]"
                          }`}
                        >
                          {vol.status === "active" ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774]">
                        <span className="truncate block max-w-[200px]">
                          {getAssignmentSummary(vol.assignments)}
                        </span>
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-xs text-[#9B9A97] text-center">
                        {formatDate(vol.lastActiveAt)}
                      </td>
                      <td className="border border-[#D5D5D2] px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => copyAccessLink(vol)}
                            className="p-1.5 rounded-[3px] text-[#9B9A97] hover:text-[#0B6E99] hover:bg-[#E8F4FA] transition-colors"
                            title="Copy access link"
                          >
                            {copiedId === vol.id ? <Check size={14} className="text-[#0F7B6C]" /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => toggleVolunteerStatus(vol.id, vol.status)}
                            className={`p-1.5 rounded-[3px] transition-colors ${
                              vol.status === "active"
                                ? "text-[#9B9A97] hover:text-[#E03E3E] hover:bg-[#FBE4E4]"
                                : "text-[#9B9A97] hover:text-[#0F7B6C] hover:bg-[#DBEDDB]"
                            }`}
                            title={vol.status === "active" ? "Revoke access" : "Restore access"}
                          >
                            <ShieldAlert size={14} />
                          </button>
                          <button
                            onClick={() => deleteVolunteer(vol.id)}
                            className="p-1.5 rounded-[3px] text-[#9B9A97] hover:text-[#E03E3E] hover:bg-[#FBE4E4] transition-colors"
                            title="Delete volunteer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Auto-Assign Panel ── */}
        <section className="border border-[#E9E9E7] rounded-[4px] bg-[#FBFBFA] p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#D9730D]" />
            <h2 className="text-sm font-medium text-[#37352F]">Auto-Assign Volunteers</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-medium text-[#787774] mb-1">Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setProposedAssignments([]);
                  setAutoAssignError("");
                }}
                className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all"
              >
                <option value="">Select an event...</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {DISCIPLINE_LABELS[evt.discipline] || evt.discipline}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAutoAssign}
              disabled={!selectedEventId || autoAssigning || activeVolunteers.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#D9730D] rounded-[3px] hover:bg-[#c2670c] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {autoAssigning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Auto Assign
            </button>
          </div>

          {activeVolunteers.length === 0 && (
            <p className="text-xs text-[#9B9A97]">Add active volunteers before auto-assigning.</p>
          )}

          {autoAssignError && (
            <div className="text-sm text-[#E03E3E] bg-[#FBE4E4] px-3 py-2 rounded-[3px]">
              {autoAssignError}
            </div>
          )}

          {/* Proposed assignments list */}
          {proposedAssignments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-[#787774]">
                Proposed Assignments — reorder then launch
              </h3>
              <div className="border border-[#E9E9E7] rounded-[3px] bg-white divide-y divide-[#E9E9E7]">
                {proposedAssignments.map((pa, idx) => (
                  <div
                    key={`${pa.volunteerId}-${idx}`}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveAssignment(idx, "up")}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-[#9B9A97] hover:text-[#37352F] disabled:opacity-25 disabled:cursor-default transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveAssignment(idx, "down")}
                        disabled={idx === proposedAssignments.length - 1}
                        className="p-0.5 rounded text-[#9B9A97] hover:text-[#37352F] disabled:opacity-25 disabled:cursor-default transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#37352F] truncate">
                        {pa.volunteerName}
                      </div>
                      <div className="text-xs text-[#9B9A97]">
                        Role: {pa.role}
                      </div>
                    </div>
                    <span className="text-xs text-[#9B9A97] tabular-nums">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleLaunchAssignments}
                  disabled={launching}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors disabled:opacity-50"
                >
                  {launching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Launch Assignments
                </button>
                <button
                  onClick={() => setProposedAssignments([])}
                  className="text-xs text-[#787774] hover:text-[#37352F] transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Pending Verification ── */}
        <section className="border border-[#E9E9E7] rounded-[4px] bg-[#FBFBFA] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-[#6940A5]" />
              <h2 className="text-sm font-medium text-[#37352F]">Pending Verification</h2>
              {pendingScores.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#6940A5] text-white text-[10px] font-bold">
                  {pendingScores.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowPreliminary(!showPreliminary)}
              className="text-xs text-[#0B6E99] hover:text-[#095a7d] transition-colors font-medium"
            >
              {showPreliminary ? "Hide" : "Show"}
            </button>
          </div>

          {showPreliminary && (
            <>
              {pendingScores.length === 0 ? (
                <div className="text-center py-6">
                  <Check size={20} className="mx-auto text-[#0F7B6C] mb-2" />
                  <p className="text-sm text-[#9B9A97]">No scores pending verification</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingScores.map((score) => {
                    let parsedData: Record<string, unknown> = {};
                    try {
                      parsedData = JSON.parse(score.data);
                    } catch {
                      /* ignore */
                    }

                    return (
                      <div
                        key={score.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-[3px]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#37352F]">
                              {score.athlete?.firstName} {score.athlete?.lastName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F0ED] text-[#787774] font-medium">
                              {DISCIPLINE_LABELS[score.discipline] || score.discipline}
                            </span>
                          </div>
                          <div className="text-xs text-[#9B9A97] mt-0.5">
                            Submitted by {score.volunteer?.name || "Unknown"} · {formatDate(score.submittedAt)}
                          </div>
                          <div className="text-xs text-[#787774] mt-1 font-mono">
                            {Object.entries(parsedData)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => verifyScore(score.id)}
                            disabled={verifyingId === score.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0F7B6C] rounded-[3px] hover:bg-[#0a6358] transition-colors disabled:opacity-50"
                          >
                            {verifyingId === score.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            Verify
                          </button>
                          <button
                            onClick={() => {
                              setShowRejectModal(score.id);
                              setRejectionReason("");
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#E03E3E] bg-[#FBE4E4] rounded-[3px] hover:bg-[#f5cdcd] transition-colors"
                          >
                            <X size={12} />
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── Add Volunteer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#37352F]">Add Volunteer</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-[3px] text-[#9B9A97] hover:text-[#37352F] hover:bg-[#F7F6F3] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVolunteer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  Name <span className="text-[#E03E3E]">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="John Smith"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {addError && (
                <div className="text-sm text-[#E03E3E] bg-[#FBE4E4] px-3 py-2 rounded-[3px]">
                  {addError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {adding ? "Adding..." : "Add Volunteer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-[#787774] hover:text-[#37352F] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Revoke All Confirmation Dialog ── */}
      {showRevokeAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowRevokeAllConfirm(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FBE4E4]">
                <AlertTriangle size={20} className="text-[#E03E3E]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#37352F]">Revoke All Access</h3>
                <p className="text-xs text-[#787774]">This will revoke access for all {activeVolunteers.length} active volunteer{activeVolunteers.length !== 1 ? "s" : ""}.</p>
              </div>
            </div>
            <p className="text-sm text-[#787774] mb-4">
              Volunteers will no longer be able to submit scores. You can restore individual access later.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#E03E3E] rounded-[3px] hover:bg-[#c83535] transition-colors disabled:opacity-50"
              >
                {revokingAll ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserX size={14} />
                )}
                {revokingAll ? "Revoking..." : "Revoke All"}
              </button>
              <button
                onClick={() => setShowRevokeAllConfirm(false)}
                className="px-4 py-2 text-sm text-[#787774] hover:text-[#37352F] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Score Modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowRejectModal(null);
              setRejectionReason("");
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-[#37352F] mb-3">Reject Score</h3>
            <div>
              <label className="block text-xs font-medium text-[#787774] mb-1">
                Reason <span className="text-[#E03E3E]">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0] resize-none"
                rows={3}
                placeholder="e.g. Incorrect time format"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => rejectScore(showRejectModal)}
                disabled={rejectingId === showRejectModal || !rejectionReason.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#E03E3E] rounded-[3px] hover:bg-[#c83535] transition-colors disabled:opacity-50"
              >
                {rejectingId === showRejectModal ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <X size={14} />
                )}
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason("");
                }}
                className="px-4 py-2 text-sm text-[#787774] hover:text-[#37352F] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
