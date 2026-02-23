"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
}

export function AdminGuard({ children }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">("loading");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) return { user: null };
        return r.json();
      })
      .then((data) => {
        const role = data.user?.role;
        if (role === "super_admin" || role === "admin" || role === "official") {
          setStatus("authorized");
        } else {
          setStatus("denied");
        }
      })
      .catch(() => setStatus("denied"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-[#9B9A97]" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-[360px]">
          <div className="w-12 h-12 rounded-full bg-[#FBE4E4] flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-[#E03E3E]" />
          </div>
          <h2 className="text-xl font-bold text-[#37352F] mb-2">Access Denied</h2>
          <p className="text-sm text-[#787774] mb-6">
            You need admin privileges to access this area. If you believe this is
            an error, contact your organization&apos;s administrator.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-[#787774] border border-[#E9E9E7] rounded-[4px] hover:bg-[#F7F6F3] transition-colors"
            >
              Go Home
            </Link>
            <Link
              href="/login/admin"
              className="px-4 py-2 text-sm font-medium text-white bg-[#37352F] rounded-[4px] hover:bg-[#2F2E2B] transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
