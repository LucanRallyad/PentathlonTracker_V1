"use client";

import Link from "next/link";
import Image from "next/image";
import { Shield, UserCircle } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
      <div className="w-full max-w-[400px] px-6">
        {/* Logo & heading */}
        <div className="flex flex-col items-center mb-10">
          <Link href="/dashboard">
            <Image
              src="/logo.jpeg"
              alt="Pentathlon Tracker"
              width={56}
              height={56}
              className="rounded-lg mb-4"
            />
          </Link>
          <h1 className="text-[26px] font-bold text-[#37352F] tracking-tight">
            Pentathlon Tracker
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            Choose how you want to sign in
          </p>
        </div>

        {/* Login options */}
        <div className="space-y-3">
          <Link
            href="/login/admin"
            className="flex items-center gap-4 w-full p-4 border border-[#E9E9E7] rounded-lg hover:border-[#C8C8C5] hover:bg-[#FAFAF8] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#37352F] flex items-center justify-center flex-shrink-0 group-hover:bg-[#2F2E2B] transition-colors">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <div className="text-[15px] font-medium text-[#37352F]">
                Admin Login
              </div>
              <div className="text-xs text-[#9B9A97] mt-0.5">
                Manage competitions, enter scores, and configure settings
              </div>
            </div>
          </Link>

          <Link
            href="/login/athlete"
            className="flex items-center gap-4 w-full p-4 border border-[#E9E9E7] rounded-lg hover:border-[#C8C8C5] hover:bg-[#FAFAF8] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#0B6E99] flex items-center justify-center flex-shrink-0 group-hover:bg-[#095a7d] transition-colors">
              <UserCircle size={20} className="text-white" />
            </div>
            <div>
              <div className="text-[15px] font-medium text-[#37352F]">
                Athlete Login
              </div>
              <div className="text-xs text-[#9B9A97] mt-0.5">
                View your results, track competitions, and see rankings
              </div>
            </div>
          </Link>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="text-xs text-[#787774] hover:text-[#37352F] transition-colors"
          >
            &larr; Continue without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}
