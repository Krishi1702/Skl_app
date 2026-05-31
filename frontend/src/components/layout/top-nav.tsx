"use client";
import { Bell, Search, Moon, Sun, LogOut, User, Settings, ChevronRight, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopNavProps {
  breadcrumbs?: BreadcrumbItem[];
  onMenuClick?: () => void;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  teacher: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  student: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export function TopNav({ breadcrumbs, onMenuClick }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex items-center px-4 lg:px-6 gap-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm flex-1 min-w-0">
        {breadcrumbs?.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
            {item.href ? (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors truncate">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground truncate">{item.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {/* Search */}
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none">{user?.full_name || "User"}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <p className="font-medium">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full w-fit capitalize font-medium ${roleColors[user?.role || "student"]}`}>
                  {user?.role}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
