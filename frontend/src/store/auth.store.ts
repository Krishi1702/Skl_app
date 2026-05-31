import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  is_active: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (payload: { token: string; refreshToken: string; user: User }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: ({ token, refreshToken, user }) => set({ token, refreshToken, user }),
      clearAuth: () => {
        document.cookie = "access_token=; path=/; max-age=0";
        set({ token: null, refreshToken: null, user: null });
      },
    }),
    { name: "auth-storage" }
  )
);
