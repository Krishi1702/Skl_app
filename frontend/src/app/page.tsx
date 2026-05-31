"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function RootPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const { token, user } = useAuthStore.getState();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (user?.role === "admin") router.replace("/admin/dashboard");
    else if (user?.role === "teacher") router.replace("/teacher/dashboard");
    else if (user?.role === "student") router.replace("/student/dashboard");
    else router.replace("/login");
  }, [mounted, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
