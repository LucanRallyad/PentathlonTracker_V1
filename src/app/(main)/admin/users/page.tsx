"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { Shield, UserCircle, ChevronDown, AlertTriangle } from "lucide-react";

interface UserEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  official: "Official",
  athlete: "Athlete",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[#37352F] text-white",
  official: "bg-[#0B6E99] text-white",
  athlete: "bg-[#F7F6F3] text-[#37352F] border border-[#E9E9E7]",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<{
    userId: string;
    newRole: string;
    userName: string;
  } | null>(null);

  const loadUsers = () => {
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setUsers)
      .catch(() => setError("Failed to load users. You may not have admin access."))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    setConfirmPromote(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update role");
        return;
      }

      // Refresh the list
      loadUsers();
    } catch {
      alert("Failed to update role");
    } finally {
      setChangingRole(null);
    }
  };

  const requestRoleChange = (
    userId: string,
    newRole: string,
    userName: string,
    currentRole: string
  ) => {
    // If promoting to admin, show confirmation
    if (newRole === "admin" && currentRole !== "admin") {
      setConfirmPromote({ userId, newRole, userName });
    } else {
      handleRoleChange(userId, newRole);
    }
  };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const athleteCount = users.filter((u) => u.role === "athlete").length;

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: "User Management" },
        ]}
      />
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[32px] font-bold text-[#37352F] tracking-tight leading-tight">
            User Management
          </h1>
        </div>
        <p className="text-sm text-[#787774] mb-2">
          Manage user roles. Promote athletes to admin or demote admins back to
          athlete.
        </p>
        <div className="flex items-center gap-4 mb-8">
          <span className="text-xs text-[#9B9A97]">
            {users.length} users · {adminCount} admin{adminCount !== 1 ? "s" : ""} · {athleteCount} athlete{athleteCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Confirmation dialog */}
        {confirmPromote && (
          <div className="mb-6 p-4 border border-[#DFAB01] bg-[#FFF8E1] rounded-[4px]">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-[#DFAB01] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#37352F]">
                  Promote {confirmPromote.userName} to Admin?
                </p>
                <p className="text-xs text-[#787774] mt-1">
                  This will give them full admin access: creating competitions,
                  entering scores, managing athletes, and promoting other users.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() =>
                      handleRoleChange(
                        confirmPromote.userId,
                        confirmPromote.newRole
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#37352F] rounded-[4px] hover:bg-[#2F2E2B] transition-colors"
                  >
                    Yes, promote to Admin
                  </button>
                  <button
                    onClick={() => setConfirmPromote(null)}
                    className="px-3 py-1.5 text-xs font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-[#F7F6F3] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <div className="text-sm text-[#E03E3E] bg-[#FBE4E4] px-4 py-3 rounded-md">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-[#F7F6F3] rounded-[4px] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="border border-[#E9E9E7] rounded-[4px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F6F3] border-b border-[#E9E9E7]">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-[130px]">
                    Role
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-[120px]">
                    Joined
                  </th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-[#9B9A97] uppercase tracking-wider w-[160px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#FAFAF8]"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0B6E99] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium text-[#37352F]">
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#787774]">{user.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${
                          ROLE_COLORS[user.role] || ROLE_COLORS.athlete
                        }`}
                      >
                        {user.role === "admin" ? (
                          <Shield size={10} />
                        ) : (
                          <UserCircle size={10} />
                        )}
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#9B9A97]">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="relative inline-block">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            requestRoleChange(
                              user.id,
                              e.target.value,
                              user.name,
                              user.role
                            )
                          }
                          disabled={changingRole === user.id}
                          className="appearance-none text-xs font-medium px-3 py-1.5 pr-7 border border-[#E9E9E7] rounded-[4px] bg-white text-[#37352F] cursor-pointer hover:border-[#C8C8C5] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-[#0B6E99]"
                        >
                          <option value="athlete">Athlete</option>
                          <option value="official">Official</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown
                          size={12}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9B9A97] pointer-events-none"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
