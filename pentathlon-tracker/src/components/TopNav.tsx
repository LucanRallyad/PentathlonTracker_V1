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
    <header className="h-11 flex items-center justify-between px-3 md:px-4 border-b border-[#E9E9E7] bg-white">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger button - mobile only */}
        <button
          onClick={toggleMobile}
          className="p-2.5 rounded-[3px] hover:bg-[#EFEFEF] text-[#787774] transition-colors md:hidden flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {breadcrumbs.length > 1 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-2 py-2 md:py-1 rounded-[3px] border border-[#E9E9E7] text-sm md:text-xs text-[#787774] hover:bg-[#F7F6F3] hover:text-[#37352F] transition-colors flex-shrink-0 min-h-[44px] md:min-h-0"
            aria-label="Go back"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <span className="text-[#D3D1CB] mx-0.5 flex-shrink-0">/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-[#787774] hover:text-[#37352F] transition-colors truncate hidden sm:inline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#37352F] font-medium truncate">{crumb.label}</span>
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
              className="p-2.5 md:p-1 text-sm md:text-xs text-[#787774] hover:text-[#E03E3E] flex items-center justify-center gap-1 transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
              title="Log out"
            >
              <LogOut size={18} className="md:hidden" />
              <LogOut size={13} className="hidden md:block" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm md:text-xs text-[#787774] hover:text-[#37352F] flex items-center gap-1 transition-colors p-2 md:p-0 min-h-[44px] md:min-h-0"
            >
              <LogIn size={16} className="md:hidden" />
              <LogIn size={13} className="hidden md:block" />
              Login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
