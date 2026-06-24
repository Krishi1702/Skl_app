"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as studentService from "@/services/student.service";

export const STUDENT_KEYS = {
  dashboard: ["student", "dashboard"] as const,
  lessons: (status?: string) => ["student", "lessons", status] as const,
  lesson: (lessonId: string) => ["student", "lesson", lessonId] as const,
  lessonPdfUrl: (lessonId: string) => ["student", "lesson-pdf-url", lessonId] as const,
  lessonSessions: (lessonId: string) => ["student", "lesson-sessions", lessonId] as const,
  leaderboard: (week_start?: string) => ["student", "leaderboard", week_start] as const,
  progress: (days?: number) => ["student", "progress", days] as const,
  achievements: ["student", "achievements"] as const,
  sessionResult: (sessionId: string) => ["student", "session-result", sessionId] as const,
} as const;

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useStudentDashboard() {
  return useQuery({
    queryKey: STUDENT_KEYS.dashboard,
    queryFn: studentService.getStudentDashboard,
  });
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export function useStudentLessons(status?: "not_started" | "in_progress" | "completed") {
  return useQuery({
    queryKey: STUDENT_KEYS.lessons(status),
    queryFn: () => studentService.getStudentLessons(status),
    select: (data) => data.data,
  });
}

export function useStudentLesson(lessonId: string) {
  return useQuery({
    queryKey: STUDENT_KEYS.lesson(lessonId),
    queryFn: () => studentService.getStudentLesson(lessonId),
    enabled: !!lessonId,
  });
}

export function useStudentLessonPdfUrl(lessonId: string) {
  return useQuery({
    queryKey: STUDENT_KEYS.lessonPdfUrl(lessonId),
    queryFn: () => studentService.getLessonPdfUrl(lessonId),
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentLessonSessions(lessonId: string) {
  return useQuery({
    queryKey: STUDENT_KEYS.lessonSessions(lessonId),
    queryFn: () => studentService.getLessonSessions(lessonId),
    enabled: !!lessonId,
    select: (data) => data.data,
  });
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export function useStudentLeaderboard(week_start?: string) {
  return useQuery({
    queryKey: STUDENT_KEYS.leaderboard(week_start),
    queryFn: () => studentService.getStudentLeaderboard(week_start),
  });
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function useStudentProgress(days?: number) {
  return useQuery({
    queryKey: STUDENT_KEYS.progress(days),
    queryFn: () => studentService.getStudentProgress(days),
  });
}

export function useStudentAchievements() {
  return useQuery({
    queryKey: STUDENT_KEYS.achievements,
    queryFn: studentService.getStudentAchievements,
  });
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lesson_id,
      language,
    }: {
      lesson_id: string;
      language: "english" | "tamil";
    }) => studentService.startSession(lesson_id, language),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "lessons"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to start session"
      );
    },
  });
}

export function useSubmitSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, formData }: { sessionId: string; formData: FormData }) =>
      studentService.submitSession(sessionId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "lessons"] });
      qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to submit recording"
      );
    },
  });
}

export function useAbandonSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => studentService.abandonSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "lessons"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to abandon session"
      );
    },
  });
}

export function useSessionResult(
  sessionId: string,
  assessmentStatus: string | null
) {
  return useQuery({
    queryKey: STUDENT_KEYS.sessionResult(sessionId),
    queryFn: () => studentService.getSessionResult(sessionId),
    enabled: !!sessionId && !!assessmentStatus && assessmentStatus !== "completed" && assessmentStatus !== "failed",
    refetchInterval: (data) => {
      if (!data) return 3000;
      const d = data as any;
      if (d?.status === 200) return false;
      return 3000;
    },
    retry: false,
  });
}
