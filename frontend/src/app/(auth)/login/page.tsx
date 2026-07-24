"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, extractApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const schema = z.object({
  email: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-green-100 text-green-700",
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loggedInRole, setLoggedInRole] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const res = await api.post("/auth/login", data);
      const { access_token, refresh_token, user } = res.data;
      setAuth({ token: access_token, refreshToken: refresh_token, user });
      document.cookie = `access_token=${access_token}; path=/; max-age=900`;

      setLoggedInRole(user.role);
      toast.success(`Welcome back, ${user.full_name}!`);

      setTimeout(() => {
        if (user.role === "admin") router.push("/admin/dashboard");
        else if (user.role === "teacher") router.push("/teacher/dashboard");
        else router.push("/student/dashboard");
      }, 400);
    } catch (err) {
      toast.error(extractApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1 text-primary">
          Bharathiyaa Vidyalaya Reader AI
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Sign in to access your dashboard
        </p>

        {loggedInRole && (
          <div className="flex justify-center mb-4">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                ROLE_COLORS[loggedInRole] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              Signing in as {ROLE_LABELS[loggedInRole] ?? loggedInRole}…
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username or Email</label>
            <input
              {...register("email")}
              type="text"
              autoComplete="username"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="username or you@school.edu"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              {...register("password")}
              type="password"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-lg py-2 font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          New user?{" "}
          <a href="/register" className="text-primary hover:underline">
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
