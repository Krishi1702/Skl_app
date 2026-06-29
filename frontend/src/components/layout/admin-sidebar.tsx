"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, School, UserCheck, UserCog,
  BarChart3, Settings, GraduationCap, X, BookMarked
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/classes", icon: School, label: "Classes" },
  { href: "/admin/sections", icon: BookMarked, label: "Sections" },
  { href: "/admin/teachers", icon: Users, label: "Teachers" },
  { href: "/admin/students", icon: GraduationCap, label: "Students" },
  { href: "/admin/teacher-assignments", icon: UserCheck, label: "Teacher Assignments" },
  { href: "/admin/student-assignments", icon: UserCog, label: "Student Assignments" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname() ?? "";
  const { user } = useAuthStore();
  const initials = user?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "A";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-60 bg-background border-r flex flex-col transition-transform duration-300",
        "lg:translate-x-0 lg:relative lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b gap-3">
          <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">BV Reader AI</p>
            <p className="text-xs text-muted-foreground">Admin Portal</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                    isActive
                      ? "bg-purple-50 text-purple-700 font-medium dark:bg-purple-950 dark:text-purple-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-purple-600 dark:text-purple-400")} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-purple-600" />}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
