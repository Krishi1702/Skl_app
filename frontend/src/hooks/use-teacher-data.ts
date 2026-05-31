"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as teacherService from "@/services/teacher.service";

export const TEACHER_KEYS = {
  sections: ["teacher", "sections"] as const,
  dashboard: (sectionId: string) => ["teacher", "dashboard", sectionId] as const,
  students: (sectionId: string, params?: object) =>
    ["teacher", "students", sectionId, params] as const,
  studentProgress: (sectionId: string, studentId: string, days?: number) =>
    ["teacher", "student-progress", sectionId, studentId, days] as const,
  leaderboard: (sectionId: string, week_start?: string) =>
    ["teacher", "leaderboard", sectionId, week_start] as const,
  lessons: (sectionId: string, params?: object) =>
    ["teacher", "lessons", sectionId, params] as const,
  pdfUrl: (sectionId: string, lessonId: string) =>
    ["teacher", "pdf-url", sectionId, lessonId] as const,
} as const;

// ─── Sections ─────────────────────────────────────────────────────────────────

export function useTeacherSections() {
  return useQuery({
    queryKey: TEACHER_KEYS.sections,
    queryFn: teacherService.getTeacherSections,
    select: (data) => data.data,
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useTeacherSectionDashboard(sectionId: string) {
  return useQuery({
    queryKey: TEACHER_KEYS.dashboard(sectionId),
    queryFn: () => teacherService.getSectionDashboard(sectionId),
    enabled: !!sectionId,
  });
}

// ─── Students ─────────────────────────────────────────────────────────────────

export function useTeacherStudents(
  sectionId: string,
  params?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    search?: string;
  }
) {
  return useQuery({
    queryKey: TEACHER_KEYS.students(sectionId, params),
    queryFn: () => teacherService.getSectionStudents(sectionId, params),
    enabled: !!sectionId,
  });
}

export function useStudentProgress(sectionId: string, studentId: string, days?: number) {
  return useQuery({
    queryKey: TEACHER_KEYS.studentProgress(sectionId, studentId, days),
    queryFn: () => teacherService.getStudentProgress(sectionId, studentId, days),
    enabled: !!sectionId && !!studentId,
  });
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export function useTeacherLeaderboard(sectionId: string, week_start?: string) {
  return useQuery({
    queryKey: TEACHER_KEYS.leaderboard(sectionId, week_start),
    queryFn: () => teacherService.getSectionLeaderboard(sectionId, week_start),
    enabled: !!sectionId,
  });
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export function useTeacherLessons(
  sectionId: string,
  params?: { is_published?: boolean }
) {
  return useQuery({
    queryKey: TEACHER_KEYS.lessons(sectionId, params),
    queryFn: () => teacherService.getSectionLessons(sectionId, params),
    enabled: !!sectionId,
    select: (data) => data.data,
  });
}

export function useLessonPdfUrl(sectionId: string, lessonId: string) {
  return useQuery({
    queryKey: TEACHER_KEYS.pdfUrl(sectionId, lessonId),
    queryFn: () => teacherService.getLessonPdfUrl(sectionId, lessonId),
    enabled: !!sectionId && !!lessonId,
    staleTime: 5 * 60 * 1000, // 5 min — URL expires after a while
  });
}

export function useUploadLesson(sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => teacherService.uploadLesson(sectionId, formData),
    onSuccess: () => {
      toast.success("Lesson uploaded successfully");
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", sectionId] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to upload lesson"
      );
    },
  });
}

export function useUpdateLesson(sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      data,
    }: {
      lessonId: string;
      data: {
        title?: string;
        description?: string;
        language?: "english" | "tamil";
        is_published?: boolean;
      };
    }) => teacherService.updateLesson(sectionId, lessonId, data),
    onSuccess: () => {
      toast.success("Lesson updated");
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", sectionId] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to update lesson"
      );
    },
  });
}

export function useDeleteLesson(sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, force }: { lessonId: string; force?: boolean }) =>
      teacherService.deleteLesson(sectionId, lessonId, force),
    onSuccess: () => {
      toast.success("Lesson deleted");
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", sectionId] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to delete lesson"
      );
    },
  });
}

export function useReorderLessons(sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: string[]) => teacherService.reorderLessons(sectionId, order),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", sectionId] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to reorder lessons"
      );
    },
  });
}
