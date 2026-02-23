"use client";

import { useState, memo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Trophy,
  Users,
  Shield,
  PenLine,
  Settings,
  ChevronLeft,
  ChevronRight,
  Target,
  UserCircle,
  Medal,
  UserCog,
  X,
  BarChart3,
  DollarSign,
  Crown,
  GitCompare,
  TrendingUp,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import { useSidebar } from "@/components/SidebarContext";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, isLoading: loaded } = useAuth();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "official";
  const isAthlete = user?.role === "athlete";
  const isLoggedIn = !!user;

  // ── Public nav (always visible) ──
  const publicItems: SidebarItem[] = [
    { label: "Home", href: "/dashboard", icon: <Target size={18} /> },
    { label: "Competitions", href: "/competitions", icon: <Trophy size={18} /> },
    { label: "Athletes", href: "/athletes", icon: <Users size={18} /> },
    { label: "Rankings", href: "/rankings", icon: <TrendingUp size={18} /> },
    { label: "Comparison", href: "/comparison", icon: <GitCompare size={18} /> },
  ];

  // ── Athlete nav (logged-in athletes) ──
  const athleteItems: SidebarItem[] = [
    { label: "My Profile", href: "/profile", icon: <UserCircle size={18} /> },
  ];

  // ── Admin nav (admin/official only) ──
  const adminItems: SidebarItem[] = [
    { label: "Admin", href: "/admin", icon: <Shield size={18} /> },
    { label: "Score Entry", href: "/admin/score-entry", icon: <PenLine size={18} /> },
    { label: "Results", href: "/admin/results", icon: <Medal size={18} /> },
    { label: "Users", href: "/admin/users", icon: <UserCog size={18} /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings size={18} /> },
  ];

  // ── Super Admin nav (super_admin only) ──
  const superAdminItems: SidebarItem[] = [
    { label: "Dashboard", href: "/super-admin/dashboard", icon: <BarChart3 size={18} /> },
    { label: "Finances", href: "/super-admin/finances", icon: <DollarSign size={18} /> },
    { label: "Accounts", href: "/super-admin/accounts", icon: <Crown size={18} /> },
    { label: "Import Data", href: "/super-admin/import", icon: <Upload size={18} /> },
  ];

  const sidebarContent = (isMobile: boolean) => {
    const isCollapsed = isMobile ? false : collapsed;

    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-[#E9E9E7]">
          {(!isCollapsed || isMobile) && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logo.jpeg"
                alt="Pentathlon Tracker"
                width={24}
                height={24}
                className="rounded-sm"
              />
              <span className="text-sm font-semibold text-[#37352F] tracking-tight">
                Pentathlon
              </span>
            </Link>
          )}
          {isMobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-[3px] hover:bg-[#EFEFEF] text-[#787774] transition-colors"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="p-1 rounded-[3px] hover:bg-[#EFEFEF] text-[#787774] transition-colors"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {/* Public */}
          <div className="space-y-0.5 px-2">
            {publicItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                active={pathname === item.href || pathname.startsWith(item.href + "/")}
                collapsed={isCollapsed}
              />
            ))}
          </div>

          {/* Athlete section */}
          {isAthlete && (
            <>
              <div className="my-3 mx-3 border-t border-[#E9E9E7]" />
              {!isCollapsed && (
                <div className="px-4 mb-1">
                  <span className="text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider">
                    My Account
                  </span>
                </div>
              )}
              <div className="space-y-0.5 px-2">
                {athleteItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={pathname === item.href || pathname.startsWith(item.href + "/")}
                    collapsed={isCollapsed}
                  />
                ))}
              </div>
            </>
          )}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="my-3 mx-3 border-t border-[#E9E9E7]" />
              {!isCollapsed && (
                <div className="px-4 mb-1">
                  <span className="text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider">
                    Administration
                  </span>
                </div>
              )}
              <div className="space-y-0.5 px-2">
                {adminItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={pathname === item.href || pathname.startsWith(item.href + "/")}
                    collapsed={isCollapsed}
                  />
                ))}
              </div>
            </>
          )}

          {/* Super Admin section */}
          {isSuperAdmin && (
            <>
              <div className="my-3 mx-3 border-t border-[#E9E9E7]" />
              {!isCollapsed && (
                <div className="px-4 mb-1">
                  <span className="text-[10px] font-medium text-[#9B9A97] uppercase tracking-wider">
                    Admin Dashboard
                  </span>
                </div>
              )}
              <div className="space-y-0.5 px-2">
                {superAdminItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={pathname === item.href || pathname.startsWith(item.href + "/")}
                    collapsed={isCollapsed}
                  />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer: user info (logged in only) */}
        {!loaded && isLoggedIn && (
          <div className="border-t border-[#E9E9E7] px-2 py-2">
            <div className={cn("flex items-center gap-2 px-2 py-1.5", isCollapsed && "justify-center")}>
              <div className="w-6 h-6 rounded-full bg-[#0B6E99] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {user.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#37352F] truncate">{user.name}</div>
                  <div className="text-[10px] text-[#9B9A97] capitalize">{user.role?.replace('_', ' ')}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar (unchanged) ── */}
      <aside
        className={cn(
          "min-h-screen sticky top-0 flex-col border-r border-[#E9E9E7] bg-[#F7F6F3] transition-all duration-200 hidden md:flex",
          collapsed ? "w-12" : "w-56"
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile sidebar (drawer overlay) ── */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#F7F6F3] border-r border-[#E9E9E7] shadow-xl transition-transform duration-200 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
}

const NavItem = memo(function NavItem({
  item,
  active,
  collapsed,
}: {
  item: SidebarItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-2 py-1.5 rounded-[3px] text-sm transition-colors duration-150",
        active
          ? "bg-[#EFEFEF] text-[#37352F] font-semibold"
          : "text-[#787774] hover:bg-[#EFEFEF] hover:text-[#37352F]"
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
});
