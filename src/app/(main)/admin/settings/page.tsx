"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { LogOut, User, Shield, Trash2 } from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeMessage, setWipeMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) return { user: null };
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handleWipeData = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL competitions and athlete profiles? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsWiping(true);
    setWipeMessage("");

    try {
      const response = await fetch("/api/admin/wipe-data", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to wipe data" }));
        setWipeMessage(`Error: ${errorData.error || "Failed to wipe data"}`);
        return;
      }

      const data = await response.json();
      setWipeMessage("✓ All data has been wiped successfully");
    } catch (error) {
      setWipeMessage("Error: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Admin", href: "/admin" },
          { label: "Settings" },
        ]}
      />
      <div className="max-w-[600px] mx-auto px-6 py-12">
        <h1 className="text-[40px] font-bold text-[#37352F] tracking-tight mb-10 leading-tight">
          Settings
        </h1>

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
            <div className="h-16 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Account info */}
            <section>
              <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                Account
              </h2>
              <div className="border border-[#E9E9E7] rounded-[4px] divide-y divide-[#E9E9E7]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <User size={16} className="text-[#787774]" />
                  <div>
                    <div className="text-sm font-medium text-[#37352F]">
                      {user?.name || "—"}
                    </div>
                    <div className="text-xs text-[#9B9A97]">Display name</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-4 text-center text-[#787774] text-sm">@</span>
                  <div>
                    <div className="text-sm font-medium text-[#37352F]">
                      {user?.email || "—"}
                    </div>
                    <div className="text-xs text-[#9B9A97]">Email address</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Shield size={16} className="text-[#787774]" />
                  <div>
                    <div className="text-sm font-medium text-[#37352F] capitalize">
                      {user?.role || "—"}
                    </div>
                    <div className="text-xs text-[#9B9A97]">Role</div>
                  </div>
                </div>
                <button
                  onClick={handleWipeData}
                  disabled={isWiping}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#FBE4E4] transition-colors rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} className="text-[#E03E3E]" />
                  <div>
                    <div className="text-sm font-medium text-[#E03E3E]">
                      {isWiping ? "Wiping..." : "Wipe all data"}
                    </div>
                    <div className="text-xs text-[#9B9A97]">
                      Delete all competitions and athletes
                    </div>
                  </div>
                </button>
                {wipeMessage && (
                  <div className="px-4 py-3">
                    <div className="text-sm text-[#37352F]">{wipeMessage}</div>
                  </div>
                )}
              </div>
            </section>

            {/* Actions */}
            <section>
              <h2 className="text-xs font-medium text-[#9B9A97] tracking-[0.02em] uppercase mb-3">
                Actions
              </h2>
              <div className="border border-[#E9E9E7] rounded-[4px]">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#FBE4E4] transition-colors rounded-[4px]"
                >
                  <LogOut size={16} className="text-[#E03E3E]" />
                  <div>
                    <div className="text-sm font-medium text-[#E03E3E]">
                      Log out
                    </div>
                    <div className="text-xs text-[#9B9A97]">
                      Sign out of your account
                    </div>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
