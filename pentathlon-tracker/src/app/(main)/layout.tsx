"use client";

import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/SidebarContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </SidebarProvider>
  );
}
