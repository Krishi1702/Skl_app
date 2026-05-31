/**
 * Student Service — maps to /api/v1/student/* endpoints
 *
 * MISSING / NOT IMPLEMENTED (no API exists):
 * - Student achievements / badges (no endpoint)
 * - Reading level field (not in any API response)
 * - Weekly goal tracking (not in API)
 */

import { apiClient } from "./api-client";
import type {
  StudentDashboard,
  LessonWithStudentProgress,
  ReadingSession,
  StudentWeeklyLeaderboard,
  StudentProgressResponse,
  AssessmentResult,
} from "@/types/api";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getStudentDashboard(): Promise<StudentDashboard> {
  const res = await apiClient.get<StudentDashboard>("/student/dashboard");
  return res.data;
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function getStudentLessons(
  status?: "not_started" | "in_progress" | "completed"
): Promise<{ section_name: string; data: LessonWithStudentProgress[] }> {
  const res = await apiClient.get<{ section_name: string; data: LessonWithStudentProgress[] }>(
    "/student/lessons",
    { params: status ? { status } : undefined }
  );
  return res.data;
}

export async function getStudentLesson(
  lessonId: string
): Promise<LessonWithStudentProgress & { attempts: ReadingSession[] }> {
  const res = await apiClient.get<LessonWithStudentProgress & { attempts: ReadingSession[] }>(
    `/student/lessons/${lessonId}`
  );
  return res.data;
}

export async function getLessonPdfUrl(
  lessonId: string
): Promise<{ url: string; expires_at: string }> {
  const res = await apiClient.get<{ url: string; expires_at: string }>(
    `/student/lessons/${lessonId}/pdf-url`
  );
  return res.data;
}

export async function getLessonSessions(
  lessonId: string
): Promise<{ lesson_id: string; lesson_title: string; data: ReadingSession[] }> {
  const res = await apiClient.get<{
    lesson_id: string;
    lesson_title: string;
    data: ReadingSession[];
  }>(`/student/lessons/${lessonId}/sessions`);
  return res.data;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getStudentLeaderboard(
  week_start?: string
): Promise<StudentWeeklyLeaderboard> {
  const res = await apiClient.get<StudentWeeklyLeaderboard>("/student/leaderboard", {
    params: week_start ? { week_start } : undefined,
  });
  return res.data;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export async function getStudentProgress(days?: number): Promise<StudentProgressResponse> {
  const res = await apiClient.get<StudentProgressResponse>("/student/progress", {
    params: days !== undefined ? { days } : undefined,
  });
  return res.data;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function startSession(
  lesson_id: string,
  language: "english" | "tamil"
): Promise<{ session_id: string; attempt_number: number; started_at: string }> {
  const res = await apiClient.post<{
    session_id: string;
    attempt_number: number;
    started_at: string;
  }>("/student/sessions", { lesson_id, language });
  return res.data;
}

export async function getSession(sessionId: string): Promise<ReadingSession> {
  const res = await apiClient.get<ReadingSession>(`/student/sessions/${sessionId}`);
  return res.data;
}

export async function submitSession(
  sessionId: string,
  formData: FormData
): Promise<{ session_id: string; assessment_status: string; message: string }> {
  const res = await apiClient.post<{
    session_id: string;
    assessment_status: string;
    message: string;
  }>(`/student/sessions/${sessionId}/submit`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function abandonSession(
  sessionId: string
): Promise<{ session_id: string; status: string }> {
  const res = await apiClient.patch<{ session_id: string; status: string }>(
    `/student/sessions/${sessionId}/abandon`
  );
  return res.data;
}

export interface SessionResultResponse {
  session: ReadingSession;
  result: AssessmentResult;
}

export async function getSessionResult(sessionId: string): Promise<{
  status: number;
  data: SessionResultResponse | { assessment_status: string; message: string };
}> {
  const res = await apiClient.get(`/student/sessions/${sessionId}/result`);
  return { status: res.status, data: res.data };
}
