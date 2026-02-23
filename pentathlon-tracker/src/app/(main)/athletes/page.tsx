"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/lib/useAuth";
import { Search, Plus, X } from "lucide-react";
import Link from "next/link";

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  ageCategory: string;
  club: string | null;
  gender: string;
  userId: string | null;
  _count?: { competitionAthletes: number };
}

const AGE_CATEGORIES = ["U9", "U11", "U13", "U15", "U17", "U19", "Junior", "Senior", "Masters"];

export default function AthletesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "", lastName: "", country: "CA", gender: "M", ageCategory: "Senior", club: "",
  });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const url = search
      ? `/api/athletes?search=${encodeURIComponent(search)}`
      : "/api/athletes";
    fetch(url)
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then(setAthletes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  async function handleCreateAthlete(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.firstName || !createForm.lastName) {
      setCreateError("First name and last name are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          club: createForm.club || null,
        }),
      });
      if (res.ok) {
        const newAthlete = await res.json();
        setAthletes((prev) => [{ ...newAthlete, _count: { competitionAthletes: 0 } }, ...prev]);
        setCreateForm({ firstName: "", lastName: "", country: "CA", gender: "M", ageCategory: "Senior", club: "" });
        setShowCreateForm(false);
      } else {
        const data = await res.json();
        setCreateError(data.error || "Failed to create athlete.");
      }
    } catch {
      setCreateError("Network error.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Home", href: "/" }, { label: "Athletes" }]} />
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="flex items-center justify-between mb-6 md:mb-12">
          <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">
            Athletes
          </h1>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[4px] hover:bg-[#095a7d] transition-colors"
            >
              {showCreateForm ? <X size={14} /> : <Plus size={14} />}
              {showCreateForm ? "Cancel" : "Create New Athlete"}
            </button>
          )}
        </div>

        {/* Create New Athlete Form */}
        {showCreateForm && (
          <div className="mb-6 border border-[#E9E9E7] rounded-[4px] bg-[#FBFBFA] p-4">
            <h2 className="text-sm font-medium text-[#37352F] mb-3">Create New Athlete</h2>
            <form onSubmit={handleCreateAthlete} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#787774] mb-1">First Name</label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] transition-colors"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#787774] mb-1">Last Name</label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] transition-colors"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#787774] mb-1">Country</label>
                  <input
                    type="text"
                    value={createForm.country}
                    onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) }))}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] transition-colors"
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#787774] mb-1">Gender</label>
                  <select
                    value={createForm.gender}
                    onChange={(e) => setCreateForm((f) => ({ ...f, gender: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] transition-colors"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#787774] mb-1">Age Category</label>
                  <select
                    value={createForm.ageCategory}
                    onChange={(e) => setCreateForm((f) => ({ ...f, ageCategory: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] transition-colors"
                  >
                    {AGE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">Club (optional)</label>
                <input
                  type="text"
                  value={createForm.club}
                  onChange={(e) => setCreateForm((f) => ({ ...f, club: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] outline-none focus:border-[#0B6E99] transition-colors"
                  placeholder="Club name"
                />
              </div>

              {createError && (
                <div className="text-sm text-[#E03E3E] bg-[#FBE4E4] px-3 py-2 rounded-[3px]">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {creating ? "Creating..." : "Create Athlete"}
              </button>
            </form>
          </div>
        )}

        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9A97]"
          />
          <input
            type="text"
            placeholder="Search athletes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border-0 border-b border-transparent focus:border-[#E9E9E7] outline-none text-[#37352F] placeholder:text-[#9B9A97] transition-colors"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-[#F7F6F3] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase border-b border-[#E9E9E7]">
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-left py-2 pr-3 w-20">Country</th>
                  <th className="text-left py-2 pr-3 w-24">Category</th>
                  <th className="text-left py-2 pr-3 w-12">Gender</th>
                  <th className="text-left py-2 pr-3">Club</th>
                  <th className="text-center py-2 w-28">Competitions</th>
                </tr>
              </thead>
              <tbody>
                {athletes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-[#9B9A97]">
                      {search ? "No athletes match your search" : "No athletes found"}
                    </td>
                  </tr>
                )}
                {athletes.map((athlete) => (
                  <tr
                    key={athlete.id}
                    className="border-b border-[#E9E9E7] hover:bg-[#EFEFEF] transition-colors duration-150"
                  >
                    <td className="py-2.5 pr-3 font-medium">
                      <Link
                        href={`/athletes/${athlete.id}`}
                        className="text-[#37352F] hover:text-[#0B6E99] transition-colors hover:underline"
                      >
                        {athlete.firstName} {athlete.lastName}
                      </Link>
                      {athlete.userId && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 text-[9px] font-medium bg-[#DBEDDB] text-[#0F7B6C] rounded-full align-middle">
                          Account
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-[#787774]">{athlete.country}</td>
                    <td className="py-2.5 pr-3 text-[#787774]">{athlete.ageCategory}</td>
                    <td className="py-2.5 pr-3 text-[#787774]">{athlete.gender}</td>
                    <td className="py-2.5 pr-3 text-[#9B9A97]">{athlete.club || "—"}</td>
                    <td className="py-2.5 text-center text-[#787774]">
                      {athlete._count?.competitionAthletes ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="md:hidden">
              {athletes.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#9B9A97]">
                  {search ? "No athletes match your search" : "No athletes found"}
                </div>
              ) : (
                <div className="divide-y divide-[#E9E9E7]">
                  {athletes.map((athlete) => (
                    <Link
                      key={athlete.id}
                      href={`/athletes/${athlete.id}`}
                      className="block py-3 hover:bg-[#EFEFEF] -mx-2 px-2 rounded-[3px] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#37352F] flex items-center gap-2">
                            <span className="truncate">{athlete.firstName} {athlete.lastName}</span>
                            {athlete.userId && (
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-[#DBEDDB] text-[#0F7B6C] rounded-full flex-shrink-0">
                                Account
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#9B9A97] mt-0.5">
                            {athlete.country} · {athlete.ageCategory} · {athlete.gender}
                            {athlete.club && ` · ${athlete.club}`}
                          </div>
                        </div>
                        <div className="text-xs text-[#787774] flex-shrink-0 ml-2">
                          {athlete._count?.competitionAthletes ?? 0} comp{(athlete._count?.competitionAthletes ?? 0) !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
