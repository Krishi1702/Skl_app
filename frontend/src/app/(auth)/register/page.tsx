"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, extractApiError } from "@/lib/api";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "teacher"], { required_error: "Please select a role" }),
});

type FormData = z.infer<typeof schema>;

const ROLES: { value: "student" | "teacher"; label: string; description: string }[] = [
  { value: "student", label: "Student", description: "I'm here to practise reading" },
  { value: "teacher", label: "Teacher", description: "I manage lessons and track progress" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const selectedRole = watch("role");

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await api.post("/auth/register", data);
      toast.success("Account created! Awaiting admin approval.");
      router.push("/login");
    } catch (err) {
      toast.error(extractApiError(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1">Create Account</h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          An admin will approve your account before you can log in.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              {...register("full_name")}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Priya Sharma"
            />
            {errors.full_name && (
              <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@school.edu"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              {...register("password")}
              type="password"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Minimum 8 characters"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium mb-2">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("role", value, { shouldValidate: true })}
                  className={`border-2 rounded-lg p-3 text-left transition-colors ${
                    selectedRole === value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </button>
              ))}
            </div>
            {errors.role && (
              <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-lg py-2 font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
