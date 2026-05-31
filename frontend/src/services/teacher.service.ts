/**
 * Teacher Service — maps to /api/v1/teacher/* endpoints
 *
 * MISSING / NOT IMPLEMENTED (no API exists):
 * - PDF/Excel report export (no export endpoint)
 * - Weekly session trend chart (no per-day time-series endpoint)
 * - Lesson drag-and-drop bulk reorder requires explicit PUT reorder call (implemented)
 */

import { apiClient } from "./api-client";
import type {
  Section,
  LessonWithStats,
  Lesson,
  TeacherSectionDashboard,
  StudentProgressRow,
  StudentProgressDetail,
  WeeklyLeaderboard,
  PaginatedResponse,
} from "@/types/api";

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function getTeacherSections(): Promise<{ data: Section[] }> {
  const res = await apiClient.get<{ data: Section[] }>("/teacher/sections");
  return res.data;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getSectionDashboard(
  sectionId: string
): Promise<TeacherSectionDashboard> {
  const res = await apiClient.get<TeacherSectionDashboard>(
    `/teacher/sections/${sectionId}/dashboard`
  );
  return res.data;
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getSectionStudents(
  sectionId: string,
  params?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    search?: string;
  }
): Promise<PaginatedResponse<StudentProgressRow>> {
  const res = await apiClient.get<PaginatedResponse<StudentProgressRow>>(
    `/teacher/sections/${sectionId}/students`,
    { params }
  );
  return res.data;
}

export async function getStudentProgress(
  sectionId: string,
  studentId: string,
  days?: number
): Promise<StudentProgressDetail> {
  const res = await apiClient.get<StudentProgressDetail>(
    `/teacher/sections/${sectionId}/students/${studentId}/progress`,
    { params: days !== undefined ? { days } : undefined }
  );
  return res.data;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getSectionLeaderboard(
  sectionId: string,
  week_start?: string
): Promise<WeeklyLeaderboard> {
  const res = await apiClient.get<WeeklyLeaderboard>(
    `/teacher/sections/${sectionId}/leaderboard`,
    { params: week_start ? { week_start } : undefined }
  );
  return res.data;
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function getSectionLessons(
  sectionId: string,
  params?: { is_published?: boolean }
): Promise<{ data: LessonWithStats[] }> {
  const res = await apiClient.get<{ data: LessonWithStats[] }>(
    `/teacher/sections/${sectionId}/lessons`,
    { params }
  );
  return res.data;
}

export async function uploadLesson(
  sectionId: string,
  formData: FormData
): Promise<Lesson> {
  const res = await apiClient.post<Lesson>(
    `/teacher/sections/${sectionId}/lessons`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

export async function updateLesson(
  sectionId: string,
  lessonId: string,
  data: {
    title?: string;
    description?: string;
    language?: "english" | "tamil";
    is_published?: boolean;
  }
): Promise<Lesson> {
  const res = await apiClient.patch<Lesson>(
    `/teacher/sections/${sectionId}/lessons/${lessonId}`,
    data
  );
  return res.data;
}

export async function deleteLesson(
  sectionId: string,
  lessonId: string,
  force?: boolean
): Promise<void> {
  await apiClient.delete(`/teacher/sections/${sectionId}/lessons/${lessonId}`, {
    params: force !== undefined ? { force } : undefined,
  });
}

export async function reorderLessons(
  sectionId: string,
  order: string[]
): Promise<{ message: string }> {
  const res = await apiClient.put<{ message: string }>(
    `/teacher/sections/${sectionId}/lessons/reorder`,
    { order }
  );
  return res.data;
}

export async function getLessonPdfUrl(
  sectionId: string,
  lessonId: string
): Promise<{ url: string; expires_at: string }> {
  const res = await apiClient.get<{ url: string; expires_at: string }>(
    `/teacher/sections/${sectionId}/lessons/${lessonId}/pdf-url`
  );
  return res.data;
}
