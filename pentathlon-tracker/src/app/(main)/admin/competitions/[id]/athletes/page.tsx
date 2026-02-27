"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { TopNav } from "@/components/TopNav";
import { Plus, Search, X, UserPlus, Trash2, Link2, Unlink } from "lucide-react";
import { CompetitionStatusControl } from "@/components/CompetitionStatusControl";

const AGE_CATEGORIES = ["U9", "U11", "U13", "U15", "U17", "U19", "Junior", "Senior", "Masters"];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  country: "",
  gender: "M",
  ageCategory: "Senior",
  club: "",
};

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  gender: string;
  club: string | null;
  userId: string | null;
}

interface CompetitionAthlete {
  id: string;
  athleteId: string;
  ageCategory: string | null;
  status: string;
  athlete: Athlete;
}

interface Competition {
  id: string;
  name: string;
  status: string;
}

export default function ManageAthletesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [roster, setRoster] = useState<CompetitionAthlete[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Athlete[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form state — always visible
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tracks whether the form was populated from an existing athlete
  // null = brand new athlete, string = existing athlete's ID
  const [linkedAthleteId, setLinkedAthleteId] = useState<string | null>(null);
  // Snapshot of original values when an existing athlete was loaded
  const [linkedOriginal, setLinkedOriginal] = useState<typeof EMPTY_FORM | null>(null);

  // ── Refetch competition status ────────────────────────────────────────────
  const refetchCompetition = useCallback(() => {
    fetch(`/api/competitions/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((comp) => { if (comp) setCompetition(comp); })
      .catch(console.error);
  }, [id]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`/api/competitions/${id}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/competitions/${id}/athletes`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([comp, athletes]) => {
        setCompetition(comp);
        setRoster(athletes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // ── Search as user types ───────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/athletes/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const rosterIds = new Set(roster.map((r) => r.athleteId));
          setSearchResults(data.filter((a: Athlete) => !rosterIds.has(a.id)));
        }
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, roster]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Select search result → auto-add to competition ─────────────────────────
  async function selectAthlete(athlete: Athlete) {
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/competitions/${id}/athletes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.id, ageCategory: athlete.ageCategory }),
      });
      if (res.ok) {
        const entry = await res.json();
        setRoster((prev) => [...prev, entry]);
        setSearchQuery("");
        setSearchResults([]);
        setShowSearch(false);
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to add athlete.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Check if form was modified from the linked athlete ─────────────────────
  function formWasModified(): boolean {
    if (!linkedOriginal) return true; // no original → always "new"
    return (
      form.firstName !== linkedOriginal.firstName ||
      form.lastName !== linkedOriginal.lastName ||
      form.country !== linkedOriginal.country ||
      form.gender !== linkedOriginal.gender ||
      form.ageCategory !== linkedOriginal.ageCategory ||
      form.club !== linkedOriginal.club
    );
  }

  // ── Clear / reset ──────────────────────────────────────────────────────────
  function clearForm() {
    setForm({ ...EMPTY_FORM });
    setLinkedAthleteId(null);
    setLinkedOriginal(null);
    setFormError("");
  }

  // ── Check if only the age category was changed from the linked athlete ──
  function onlyAgeCategoryChanged(): boolean {
    if (!linkedOriginal) return false;
    return (
      form.firstName === linkedOriginal.firstName &&
      form.lastName === linkedOriginal.lastName &&
      form.country === linkedOriginal.country &&
      form.gender === linkedOriginal.gender &&
      form.club === linkedOriginal.club &&
      form.ageCategory !== linkedOriginal.ageCategory
    );
  }

  // ── Submit: add existing or create new ─────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.firstName || !form.lastName || !form.country) {
      setFormError("First name, last name, and country are required.");
      return;
    }

    setSubmitting(true);
    try {
      let body: Record<string, unknown>;

      if (linkedAthleteId && !formWasModified()) {
        // Nothing changed — just link the existing athlete
        body = { athleteId: linkedAthleteId, ageCategory: form.ageCategory };
      } else if (linkedAthleteId && onlyAgeCategoryChanged()) {
        // Only age category changed — reuse the same athlete with the new age category
        body = { athleteId: linkedAthleteId, ageCategory: form.ageCategory };
      } else {
        // Find-or-create athlete with the provided details
        // The API will deduplicate by firstName+lastName+country+gender
        body = {
          firstName: form.firstName,
          lastName: form.lastName,
          country: form.country,
          gender: form.gender,
          ageCategory: form.ageCategory,
          club: form.club || null,
        };
      }

      const res = await fetch(`/api/competitions/${id}/athletes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const entry = await res.json();
        setRoster((prev) => [...prev, entry]);
        clearForm();
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to add athlete.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Remove ─────────────────────────────────────────────────────────────────
  async function removeAthlete(athleteId: string) {
    const res = await fetch(`/api/competitions/${id}/athletes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies for authentication
      body: JSON.stringify({ athleteId }),
    });
    if (res.ok) {
      setRoster((prev) => prev.filter((r) => r.athleteId !== athleteId));
    }
  }

  // ── Link / Unlink athlete to user account ─────────────────────────────────
  const [linkingAthleteId, setLinkingAthleteId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkingInProgress, setLinkingInProgress] = useState(false);

  async function handleLink(athleteId: string) {
    if (!linkEmail.trim()) {
      setLinkError("Enter the athlete's account email");
      return;
    }
    setLinkingInProgress(true);
    setLinkError("");
    try {
      const res = await fetch(`/api/athletes/${athleteId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: linkEmail.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRoster((prev) =>
          prev.map((r) =>
            r.athleteId === athleteId
              ? { ...r, athlete: { ...r.athlete, userId: updated.userId } }
              : r
          )
        );
        setLinkingAthleteId(null);
        setLinkEmail("");
      } else {
        const data = await res.json();
        setLinkError(data.error || "Failed to link");
      }
    } catch {
      setLinkError("Network error");
    } finally {
      setLinkingInProgress(false);
    }
  }

  async function handleUnlink(athleteId: string) {
    try {
      const res = await fetch(`/api/athletes/${athleteId}/link`, { method: "DELETE" });
      if (res.ok) {
        setRoster((prev) =>
          prev.map((r) =>
            r.athleteId === athleteId
              ? { ...r, athlete: { ...r.athlete, userId: null } }
              : r
          )
        );
      }
    } catch {
      /* ignore */
    }
  }

  // ── Derive button label ────────────────────────────────────────────────────
  const buttonLabel = "Add to Competition";

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading || !competition) {
    return (
      <>
        <TopNav breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Loading..." }]} />
        <div className="max-w-[800px] mx-auto px-6 py-12">
          <div className="h-10 w-48 bg-[#F7F6F3] rounded animate-pulse" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: competition.name, href: `/admin/competitions/${id}/score-entry` },
          { label: "Athletes" },
        ]}
      />
      <div className="max-w-[800px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-[32px] font-bold text-[#37352F] tracking-tight leading-tight">
              Manage Athletes
            </h1>
            <p className="text-sm text-[#787774] mt-1">
              {roster.length} athlete{roster.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <CompetitionStatusControl
            competitionId={id}
            status={competition.status}
            onStatusChange={refetchCompetition}
            variant="inline"
          />
        </div>

        {/* ── Add / Search / Form area ── */}
        <div className="mb-8 border border-[#E9E9E7] rounded-[4px] bg-[#FBFBFA] p-4 space-y-4">
          <h2 className="text-sm font-medium text-[#37352F]">Add Athlete</h2>

          {/* Search bar */}
          <div className="relative" ref={searchRef}>
            <div className="flex items-center border border-[#E9E9E7] rounded-[4px] bg-white overflow-hidden focus-within:border-[#0B6E99] focus-within:ring-2 focus-within:ring-[#0B6E9926] transition-all">
              <Search size={16} className="ml-3 text-[#9B9A97] flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-[#37352F] placeholder:text-[#C4C4C0]"
                placeholder="Search existing athletes to add..."
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowSearch(false);
                  }}
                  className="pr-3 text-[#9B9A97] hover:text-[#37352F]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searching && (
              <div className="absolute right-3 top-3 text-xs text-[#9B9A97]">Searching...</div>
            )}

            {showSearch && searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-[#E9E9E7] rounded-[4px] shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => selectAthlete(athlete)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F7F6F3] transition-colors border-b border-[#E9E9E7] last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#37352F]">
                        {athlete.firstName} {athlete.lastName}
                      </div>
                      <div className="text-xs text-[#9B9A97]">
                        {athlete.country} · {athlete.ageCategory} · {athlete.gender}
                        {athlete.club ? ` · ${athlete.club}` : ""}
                      </div>
                    </div>
                    <span className="text-xs text-[#0B6E99] flex-shrink-0 font-medium">{submitting ? "Adding..." : "+ Add"}</span>
                  </button>
                ))}
              </div>
            )}

            {showSearch && searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-[#E9E9E7] rounded-[4px] shadow-lg px-4 py-3 text-sm text-[#9B9A97]">
                No existing athletes found. Fill in the form to create a new one.
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-[#E9E9E7]" />
            <span className="text-xs text-[#9B9A97]">or create new athlete</span>
            <div className="flex-1 border-t border-[#E9E9E7]" />
          </div>

          {/* Linked athlete banner */}
          {linkedAthleteId && (
            <div className="flex items-center justify-between bg-[#E8F4EC] border border-[#B8DBCA] rounded-[3px] px-3 py-2">
              <span className="text-xs text-[#0F7B6C]">
                Pre-filled from existing athlete.{" "}
                {!formWasModified()
                  ? "No changes — will link the existing record."
                  : onlyAgeCategoryChanged()
                    ? "Age category updated for this competition — same athlete profile will be used."
                    : "Name/country/gender match will be checked — duplicates are prevented automatically."}
              </span>
              <button
                onClick={clearForm}
                className="text-xs text-[#787774] hover:text-[#37352F] underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Form fields — always visible */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  First Name <span className="text-[#E03E3E]">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  Last Name <span className="text-[#E03E3E]">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  Country <span className="text-[#E03E3E]">*</span>
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="CAN"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">Age Category</label>
                <select
                  value={form.ageCategory}
                  onChange={(e) => setForm({ ...form, ageCategory: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all"
                >
                  {AGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#787774] mb-1">Club (optional)</label>
              <input
                type="text"
                value={form.club}
                onChange={(e) => setForm({ ...form, club: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                placeholder="Calgary Pentathlon Club"
              />
            </div>

            {formError && (
              <div className="text-sm text-[#E03E3E] bg-[#FBE4E4] px-3 py-2 rounded-[3px]">
                {formError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {submitting ? "Adding..." : buttonLabel}
              </button>
              {(form.firstName || form.lastName || form.country || linkedAthleteId) && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="text-xs text-[#787774] hover:text-[#37352F] transition-colors"
                >
                  Clear form
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Current roster ── */}
        <div>
          <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
            Competition Roster ({roster.length})
          </h2>

          {roster.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#E9E9E7] rounded-[4px]">
              <UserPlus size={24} className="mx-auto text-[#C4C4C0] mb-2" />
              <p className="text-sm text-[#9B9A97]">No athletes added yet</p>
              <p className="text-xs text-[#C4C4C0] mt-1">
                Search for an existing athlete or fill in the form to create one
              </p>
            </div>
          ) : (
            <div className="border border-[#C8C8C5] rounded-sm overflow-x-auto shadow-sm">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-10">
                      #
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left">
                      Name
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left w-[80px]">
                      Country
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[70px]">
                      Gender
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[90px]">
                      Category
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-left">
                      Club
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[90px]">
                      Account
                    </th>
                    <th className="border border-[#C8C8C5] bg-[#F0F0ED] px-3 py-2 text-[11px] font-semibold text-[#5A5A57] tracking-wide uppercase text-center w-[60px]">
                      
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="border border-[#D5D5D2] bg-[#F7F6F3] px-2 py-2 text-[11px] text-[#9B9A97] text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#37352F] font-medium">
                        {entry.athlete.firstName} {entry.athlete.lastName}
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774]">
                        {entry.athlete.country}
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774] text-center">
                        {entry.athlete.gender}
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#787774] text-center">
                        {entry.ageCategory || entry.athlete.ageCategory}
                      </td>
                      <td className="border border-[#D5D5D2] px-3 py-2 text-sm text-[#9B9A97]">
                        {entry.athlete.club || "—"}
                      </td>
                      <td className="border border-[#D5D5D2] px-2 py-2 text-center">
                        {entry.athlete.userId ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#DBEDDB] text-[#0F7B6C]">
                              <Link2 size={10} />
                              Linked
                            </span>
                            <button
                              onClick={() => handleUnlink(entry.athleteId)}
                              className="p-0.5 rounded text-[#9B9A97] hover:text-[#E03E3E] transition-colors"
                              title="Unlink from user account"
                            >
                              <Unlink size={11} />
                            </button>
                          </div>
                        ) : linkingAthleteId === entry.athleteId ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="email"
                              value={linkEmail}
                              onChange={(e) => setLinkEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); handleLink(entry.athleteId); }
                                if (e.key === "Escape") { setLinkingAthleteId(null); setLinkEmail(""); setLinkError(""); }
                              }}
                              className="w-full px-2 py-1 text-[11px] border border-[#E9E9E7] rounded bg-white outline-none focus:border-[#0B6E99] text-[#37352F]"
                              placeholder="athlete@email.com"
                              autoFocus
                            />
                            {linkError && <span className="text-[10px] text-[#E03E3E]">{linkError}</span>}
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleLink(entry.athleteId)}
                                disabled={linkingInProgress}
                                className="px-2 py-0.5 text-[10px] font-medium bg-[#0B6E99] text-white rounded hover:bg-[#095a7d] disabled:opacity-50"
                              >
                                {linkingInProgress ? "..." : "Link"}
                              </button>
                              <button
                                onClick={() => { setLinkingAthleteId(null); setLinkEmail(""); setLinkError(""); }}
                                className="px-2 py-0.5 text-[10px] text-[#787774] border border-[#E9E9E7] rounded hover:bg-[#F7F6F3]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setLinkingAthleteId(entry.athleteId); setLinkEmail(""); setLinkError(""); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F6F3] text-[#9B9A97] hover:bg-[#EFEFEF] hover:text-[#787774] transition-colors"
                            title="Link to user account"
                          >
                            <Link2 size={10} />
                            Link
                          </button>
                        )}
                      </td>
                      <td className="border border-[#D5D5D2] px-2 py-2 text-center">
                        <button
                          onClick={() => removeAthlete(entry.athleteId)}
                          className="p-1 rounded-[3px] text-[#9B9A97] hover:text-[#E03E3E] hover:bg-[#FBE4E4] transition-colors"
                          title="Remove from competition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
