"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import {
  Search,
  Copy,
  Eye,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Filter,
} from "lucide-react";

interface VolunteerAssignment {
  id: string;
  role: string;
  event: { id: string; discipline: string };
}

interface Volunteer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  accessToken: string;
  competitionId: string;
  status: string;
  createdAt: string;
  lastActiveAt: string | null;
  assignments: VolunteerAssignment[];
}

interface Competition {
  id: string;
  name: string;
}

interface GroupedVolunteers {
  competition: Competition;
  volunteers: Volunteer[];
}

export default function AdminVolunteersPage() {
  const [groups, setGroups] = useState<GroupedVolunteers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all");
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const compRes = await fetch("/api/competitions");
      if (!compRes.ok) return;
      const competitions: Competition[] = await compRes.json();

      const results = await Promise.all(
        competitions.map(async (comp) => {
          try {
            const res = await fetch(`/api/competitions/${comp.id}/volunteers`);
            if (!res.ok) return { competition: comp, volunteers: [] };
            const volunteers: Volunteer[] = await res.json();
            return { competition: comp, volunteers };
          } catch {
            return { competition: comp, volunteers: [] };
          }
        })
      );

      const nonEmpty = results.filter((g) => g.volunteers.length > 0);
      setGroups(nonEmpty);
      setExpandedComps(new Set(nonEmpty.map((g) => g.competition.id)));
    } catch (err) {
      console.error("Failed to load volunteers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

  const filtered = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        volunteers: g.volunteers.filter((v) => {
          const matchesSearch =
            !search ||
            v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.email?.toLowerCase().includes(search.toLowerCase()) ||
            v.phone?.toLowerCase().includes(search.toLowerCase());
          const matchesStatus =
            statusFilter === "all" || v.status === statusFilter;
          return matchesSearch && matchesStatus;
        }),
      }))
      .filter((g) => g.volunteers.length > 0);
  }, [groups, search, statusFilter]);

  const stats = useMemo(() => {
    const all = groups.flatMap((g) => g.volunteers);
    return {
      total: all.length,
      active: all.filter((v) => v.status === "active").length,
      revoked: all.filter((v) => v.status === "revoked").length,
    };
  }, [groups]);

  const toggleComp = (id: string) => {
    setExpandedComps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyLink = async (volunteer: Volunteer) => {
    const link = `${window.location.origin}/volunteer/${volunteer.accessToken}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(volunteer.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const assignmentLabel = (v: Volunteer) => {
    if (!v.assignments.length) return "Unassigned";
    return v.assignments
      .map((a) => `${a.role} — ${a.event.discipline.replace(/_/g, " ")}`)
      .join(", ");
  };

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Volunteers" },
        ]}
      />
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">
            All Volunteers
          </h1>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 mb-6">
          <div className="border border-[#E9E9E7] rounded-[4px] px-4 py-2.5 bg-[#F7F6F3]">
            <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
              Total
            </div>
            <div className="text-lg font-semibold text-[#37352F]">
              {stats.total}
            </div>
          </div>
          <div className="border border-[#E9E9E7] rounded-[4px] px-4 py-2.5 bg-[#F7F6F3]">
            <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
              Active
            </div>
            <div className="text-lg font-semibold text-[#0F7B6C]">
              {stats.active}
            </div>
          </div>
          <div className="border border-[#E9E9E7] rounded-[4px] px-4 py-2.5 bg-[#F7F6F3]">
            <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
              Revoked
            </div>
            <div className="text-lg font-semibold text-[#E03E3E]">
              {stats.revoked}
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B9A97]"
            />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] placeholder:text-[#9B9A97] focus:outline-none focus:border-[#0B6E99] transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-[#9B9A97]" />
            {(["all", "active", "revoked"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-[3px] border transition-colors capitalize ${
                  statusFilter === s
                    ? "border-[#0B6E99] text-[#0B6E99] bg-[#DDEBF1]"
                    : "border-[#E9E9E7] text-[#787774] hover:bg-[#F7F6F3]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-sm text-[#9B9A97] py-12 text-center">
            Loading volunteers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-[#9B9A97] py-12 text-center border border-[#E9E9E7] rounded-[4px]">
            {search || statusFilter !== "all"
              ? "No volunteers match your filters."
              : "No volunteers found across any competition."}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((group) => (
              <div
                key={group.competition.id}
                className="border border-[#E9E9E7] rounded-[4px] overflow-hidden"
              >
                {/* Competition header */}
                <button
                  onClick={() => toggleComp(group.competition.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#F7F6F3] hover:bg-[#EFEFEF] transition-colors text-left"
                >
                  {expandedComps.has(group.competition.id) ? (
                    <ChevronDown size={14} className="text-[#787774]" />
                  ) : (
                    <ChevronRight size={14} className="text-[#787774]" />
                  )}
                  <span className="text-sm font-medium text-[#37352F]">
                    {group.competition.name}
                  </span>
                  <span className="text-xs text-[#9B9A97] ml-1">
                    ({group.volunteers.length} volunteer
                    {group.volunteers.length !== 1 ? "s" : ""})
                  </span>
                </button>

                {/* Table */}
                {expandedComps.has(group.competition.id) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F7F6F3] border-t border-[#E9E9E7]">
                          <th className="text-left px-4 py-2 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
                            Name
                          </th>
                          <th className="text-left px-4 py-2 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
                            Email / Phone
                          </th>
                          <th className="text-left px-4 py-2 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left px-4 py-2 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
                            Assignment
                          </th>
                          <th className="text-left px-4 py-2 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
                            Last Active
                          </th>
                          <th className="text-right px-4 py-2 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.volunteers.map((v) => (
                          <tr
                            key={v.id}
                            className="border-t border-[#E9E9E7] hover:bg-[#FBFBFA] transition-colors"
                          >
                            <td className="px-4 py-2.5 text-[#37352F] font-medium whitespace-nowrap">
                              {v.name}
                            </td>
                            <td className="px-4 py-2.5 text-[#787774] whitespace-nowrap">
                              {v.email || v.phone || "—"}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-sm ${
                                  v.status === "active"
                                    ? "bg-[#DBEDDB] text-[#0F7B6C]"
                                    : "bg-[#FBE4E4] text-[#E03E3E]"
                                }`}
                              >
                                {v.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-[#787774] max-w-[200px] truncate">
                              {assignmentLabel(v)}
                            </td>
                            <td className="px-4 py-2.5 text-[#9B9A97] whitespace-nowrap">
                              {formatDate(v.lastActiveAt)}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => copyLink(v)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[3px] hover:bg-[#EFEFEF] transition-colors"
                                >
                                  <Copy size={11} />
                                  {copiedId === v.id ? "Copied!" : "Copy Link"}
                                </button>
                                <Link
                                  href={`/admin/competitions/${group.competition.id}/volunteers`}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0B6E99] border border-[#0B6E99] rounded-[3px] hover:bg-[#DDEBF1] transition-colors"
                                >
                                  <Eye size={11} />
                                  View
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
