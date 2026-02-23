"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function AthleteLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (mode === "register") {
      if (!firstName || !lastName) {
        setError("First name and last name are required");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, role: "athlete", name: `${firstName} ${lastName}` };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = `${mode === "login" ? "Login" : "Registration"} failed`;
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch { /* empty body */ }
        setError(msg);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
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
              src="/ares-logo.png"
              alt="Pentathlon Tracker"
              width={48}
              height={48}
              className="rounded-lg mb-4"
            />
          </Link>
          <h1 className="text-[22px] font-semibold text-[#37352F] tracking-tight">
            {mode === "login" ? "Athlete Login" : "Athlete Registration"}
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            {mode === "login"
              ? "Sign in to view your results and competitions"
              : "Create an athlete account to get started"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E9E9E7] rounded-md bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="Connor"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E9E9E7] rounded-md bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                  placeholder="Chow"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#787774] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#E9E9E7] rounded-md bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
              placeholder="you@example.com"
              autoFocus={mode === "login"}
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

          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-[#787774] mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#E9E9E7] rounded-md bg-white text-[#37352F] outline-none focus:border-[#0B6E99] focus:ring-2 focus:ring-[#0B6E9926] transition-all placeholder:text-[#C4C4C0]"
                placeholder="••••••••"
              />
            </div>
          )}

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
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Continue"
                : "Create Account"}
          </button>
        </form>

        {/* Toggle login/register */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-[#0B6E99] hover:text-[#095a7d] transition-colors"
          >
            {mode === "login"
              ? "Don't have an account? Register"
              : "Already have an account? Log in"}
          </button>
        </div>

        {/* Switch to admin login */}
        <div className="text-center mt-4">
          <Link
            href="/login/admin"
            className="text-xs text-[#787774] hover:text-[#37352F] transition-colors"
          >
            Looking for Admin Login? &rarr;
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
