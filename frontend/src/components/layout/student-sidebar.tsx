"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, BarChart3, Trophy, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import schoolLogo from "../../assets/school-logo.jpg";
import Image from "next/image";
const navItems = [
  { href: "/student/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/student/lessons", icon: BookOpen, label: "Lessons" },
  { href: "/student/progress", icon: BarChart3, label: "My Progress" },
  { href: "/student/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/student/achievements", icon: Star, label: "Achievements" },
];

interface StudentSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function StudentSidebar({ open, onClose }: StudentSidebarProps) {
  const pathname = usePathname() ?? "";
  const { user } = useAuthStore();
  const initials = user?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "S";

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
          <div className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center">
            <Image
              src={schoolLogo}
              alt="School Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">BV Reader AI</p>
            <p className="text-xs text-muted-foreground">Student Portal</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                    isActive
                      ? "bg-green-50 text-green-700 font-medium dark:bg-green-950 dark:text-green-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-green-600 dark:text-green-400")} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-green-600" />}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Student"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
