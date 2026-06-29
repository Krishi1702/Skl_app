"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Users, School, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/classes", label: "Classes", icon: School },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const { clearAuth, user } = useAuthStore();

  return (
    <aside className="w-56 bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <p className="font-bold text-primary text-sm">BV Reader AI</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{user?.full_name}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition", pathname.startsWith(href) ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100")}>
            <Icon className="w-4 h-4" /> {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <button onClick={clearAuth} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 px-3 py-2 w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
