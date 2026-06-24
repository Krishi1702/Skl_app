"use client";
import { useState } from "react";
import { StudentSidebar } from "./student-sidebar";
import { TopNav } from "./top-nav";
import { useAuthGuard } from "@/hooks/use-auth-guard";

interface StudentLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function StudentLayout({ children, breadcrumbs }: StudentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useAuthGuard("student");

  return (
    <div className="flex h-screen bg-background">
      <StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
