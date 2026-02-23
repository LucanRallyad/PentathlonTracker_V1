"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let msg = "Login failed";
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch {
          /* empty body */
        }
        setError(msg);
        setLoading(false);
        return;
      }

      // Verify the logged-in user actually has admin role (including super_admin)
      const data = await res.json();
      if (data.user?.role !== "admin" && data.user?.role !== "official" && data.user?.role !== "super_admin") {
        // Log them out immediately — they used the wrong login page
        await fetch("/api/auth/logout", { method: "POST" });
        setError("This account does not have admin privileges. Use the Athlete Login instead.");
        setLoading(false);
        return;
      }

      // Redirect super_admin to their dashboard, others to admin dashboard
      if (data.user?.role === "super_admin") {
        router.push("/super-admin/dashboard");
      } else {
        // Redirect super_admin to their dashboard, others to admin dashboard
      if (data.user?.role === "super_admin") {
        router.push("/super-admin/dashboard");
      } else {
        router.push("/admin");
      }
      }
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
      <div className="w-full max-w-[360px] px-6">
        {/* Logo & heading */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <Image
              src="/logo.jpeg"
              alt="Pentathlon Tracker"
              width={48}
              height={48}
              className="rounded-lg mb-4"
            />
          </Link>
          <h1 className="text-[22px] font-semibold text-[#37352F] tracking-tight">
            Admin Login
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            Sign in to manage competitions and enter scores
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#787774] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#E9E9E7] rounded-md bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
              placeholder="admin@example.com"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#787774] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#E9E9E7] rounded-md bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-[#E03E3E] bg-[#FBE4E4] px-3 py-2.5 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#37352F] rounded-md hover:bg-[#2F2E2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div className="mt-6 p-3 bg-[#F7F6F3] rounded-md border border-[#E9E9E7]">
          <p className="text-[11px] text-[#9B9A97] text-center leading-relaxed">
            Admin accounts can only be created by an existing administrator.
            Contact your organization&apos;s admin to get access.
          </p>
        </div>

        {/* Switch to athlete login */}
        <div className="text-center mt-4">
          <Link
            href="/login/athlete"
            className="text-xs text-[#787774] hover:text-[#37352F] transition-colors"
          >
            Looking for Athlete Login? &rarr;
          </Link>
        </div>

        {/* Back link */}
        <div className="text-center mt-2">
          <Link
            href="/login"
            className="text-xs text-[#787774] hover:text-[#37352F] transition-colors"
          >
            &larr; Back
          </Link>
        </div>
      </div>
    </div>
  );
}
