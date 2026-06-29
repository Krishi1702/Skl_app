"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, Trophy, FileText, Layers, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/teacher/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/teacher/sections", icon: Layers, label: "My Sections" },
  { href: "/teacher/lessons", icon: BookOpen, label: "Lessons" },
  { href: "/teacher/students", icon: Users, label: "Students" },
  { href: "/teacher/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/teacher/reports", icon: FileText, label: "Reports" },
];

interface TeacherSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function TeacherSidebar({ open, onClose }: TeacherSidebarProps) {
  const pathname = usePathname() ?? "";
  const { user } = useAuthStore();
  const initials = user?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "T";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-60 bg-background border-r flex flex-col transition-transform duration-300",
        "lg:translate-x-0 lg:relative lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 flex items-center px-4 border-b gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">BV Reader AI</p>
            <p className="text-xs text-muted-foreground">Teacher Portal</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/teacher/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-blue-600 dark:text-blue-400")} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Teacher"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
