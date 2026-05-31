import axios from "axios";

/** Safely extract a human-readable message from an Axios error.
 *  Handles both FastAPI string details and 422 validation arrays. */
export function extractApiError(err: unknown, fallback = "Something went wrong"): string {
  const detail = (err as any)?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e: any) => e.msg ?? String(e)).join(", ");
  return fallback;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  withCredentials: true,
});

// Attach JWT from Zustand store on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("auth-storage");
    if (raw) {
      try {
        const state = JSON.parse(raw);
        const token = state?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {}
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const raw = localStorage.getItem("auth-storage");
        if (raw) {
          const state = JSON.parse(raw);
          const refreshToken = state?.state?.refreshToken;
          if (refreshToken) {
            const res = await axios.post("/api/v1/auth/refresh", { refresh_token: refreshToken });
            const newToken = res.data.access_token;
            // Update store
            const updated = JSON.parse(raw);
            updated.state.token = newToken;
            localStorage.setItem("auth-storage", JSON.stringify(updated));
            document.cookie = `access_token=${newToken}; path=/; max-age=900`;
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
          }
        }
      } catch {
        // Refresh failed — redirect to login
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
