"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User, Menu, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useSidebar } from "@/components/SidebarContext";

interface Breadcrumb {
  label: string;
  href?: string;
}

export function TopNav({ breadcrumbs = [] }: { breadcrumbs?: Breadcrumb[] }) {
  const router = useRouter();
  const { user, mutate } = useAuth();
  const { toggleMobile } = useSidebar();
  const fallbackBackHref =
    breadcrumbs.length > 1
      ? [...breadcrumbs].reverse().find((crumb, index) => index > 0 && crumb.href)?.href
      : undefined;

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    mutate({ user: null }, false);
    router.push("/dashboard");
    router.refresh();
  }, [mutate, router]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackBackHref || "/dashboard");
  }, [router, fallbackBackHref]);

  return (
    <header className="h-12 md:h-11 flex items-center justify-between px-3 md:px-4 border-b border-[#E9E9E7] bg-white">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Hamburger button - mobile only */}
        <button
          onClick={toggleMobile}
          className="p-2.5 rounded-[3px] hover:bg-[#EFEFEF] text-[#787774] transition-colors md:hidden flex-shrink-0 -ml-0.5"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {breadcrumbs.length > 1 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 min-h-[40px] md:min-h-0 px-3 py-2 md:px-2 md:py-1 rounded-[4px] border border-[#E9E9E7] text-sm md:text-xs text-[#37352F] md:text-[#787774] hover:bg-[#F7F6F3] hover:border-[#D3D1CB] md:hover:text-[#37352F] transition-colors flex-shrink-0 font-medium md:font-normal"
            aria-label="Go back"
          >
            <ChevronLeft size={18} className="md:w-3.5 md:h-3.5" />
            <span>Back</span>
          </button>
        )}

        <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden flex-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <span className="text-[#D3D1CB] mx-0.5 flex-shrink-0 hidden sm:inline">/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-[#787774] hover:text-[#37352F] transition-colors truncate hidden sm:inline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#37352F] font-medium truncate text-left">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {user ? (
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xs text-[#787774] items-center gap-1.5 hidden sm:flex">
              <User size={13} />
              {user.name}
              <span className="text-[10px] text-[#9B9A97] capitalize">({user.role})</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-[#787774] hover:text-[#E03E3E] flex items-center gap-1 transition-colors"
              title="Log out"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs text-[#787774] hover:text-[#37352F] flex items-center gap-1 transition-colors"
            >
              <LogIn size={13} />
              Login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
