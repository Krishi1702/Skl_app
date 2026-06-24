"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

function hasCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("access_token="));
}

export function useAuthGuard(requiredRole?: "admin" | "teacher" | "student") {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    function verify() {
      const { token: currentToken, user } = useAuthStore.getState();
      if (!currentToken || !hasCookie()) {
        router.replace("/login");
        return;
      }
      if (requiredRole && user?.role !== requiredRole) {
        router.replace("/login");
      }
    }

    // Check on mount (catches stale React state after hard navigation)
    verify();

    // Check on bfcache restore — fires when user presses Back after logging out.
    // The cookie is already gone but the browser may redisplay the cached page
    // without running middleware again.
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) verify();
    }

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [token, router, requiredRole]);
}
