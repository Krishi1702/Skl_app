/**
 * Admin Service — maps to /api/v1/admin/* endpoints
 *
 * MISSING / NOT IMPLEMENTED (no API exists):
 * - Historical charts / time-series data (no endpoint)
 * - Analytics trends (no endpoint)
 * - Bulk teacher/student assignment (no batch endpoint)
 * - PDF/Excel export (no export endpoint)
 * - Real-time session counts (no WebSocket)
 * - School-wide performance trends (no endpoint)
 */

import { apiClient } from "./api-client";
import type {
  AdminDashboard,
  Class,
  Section,
  AdminUserView,
  TeacherAssignment,
  StudentAssignment,
  PaginatedResponse,
} from "@/types/api";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const res = await apiClient.get<AdminDashboard>("/admin/dashboard");
  return res.data;
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export async function getClasses(params?: {
  page?: number;
  limit?: number;
  include_inactive?: boolean;
}): Promise<PaginatedResponse<Class>> {
  const res = await apiClient.get<PaginatedResponse<Class>>("/admin/classes", { params });
  return res.data;
}

export async function createClass(name: string): Promise<Class> {
  const res = await apiClient.post<Class>("/admin/classes", { name });
  return res.data;
}

export async function updateClass(id: string, name: string): Promise<Class> {
  const res = await apiClient.put<Class>(`/admin/classes/${id}`, { name });
  return res.data;
}

export async function toggleClassStatus(id: string, is_active: boolean): Promise<Class> {
  const res = await apiClient.patch<Class>(`/admin/classes/${id}/status`, { is_active });
  return res.data;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function getSections(params?: {
  page?: number;
  limit?: number;
  class_id?: string;
  include_inactive?: boolean;
}): Promise<PaginatedResponse<Section>> {
  const res = await apiClient.get<PaginatedResponse<Section>>("/admin/sections", { params });
  return res.data;
}

export async function getSection(id: string): Promise<Section> {
  const res = await apiClient.get<Section>(`/admin/sections/${id}`);
  return res.data;
}

export async function createSection(data: { class_id: string; name: string }): Promise<Section> {
  const res = await apiClient.post<Section>("/admin/sections", data);
  return res.data;
}

export async function updateSection(id: string, name: string): Promise<Section> {
  const res = await apiClient.put<Section>(`/admin/sections/${id}`, { name });
  return res.data;
}

export async function toggleSectionStatus(id: string, is_active: boolean): Promise<Section> {
  const res = await apiClient.patch<Section>(`/admin/sections/${id}/status`, { is_active });
  return res.data;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(params?: {
  page?: number;
  limit?: number;
  role?: "teacher" | "student";
  is_active?: boolean;
  unassigned?: boolean;
  search?: string;
}): Promise<PaginatedResponse<AdminUserView>> {
  const res = await apiClient.get<PaginatedResponse<AdminUserView>>("/admin/users", { params });
  return res.data;
}

export async function getUser(id: string): Promise<AdminUserView> {
  const res = await apiClient.get<AdminUserView>(`/admin/users/${id}`);
  return res.data;
}

export async function updateUserRole(
  id: string,
  role: "teacher" | "student"
): Promise<AdminUserView> {
  const res = await apiClient.patch<AdminUserView>(`/admin/users/${id}/role`, { role });
  return res.data;
}

export async function toggleUserStatus(id: string, is_active: boolean): Promise<AdminUserView> {
  const res = await apiClient.patch<AdminUserView>(`/admin/users/${id}/status`, { is_active });
  return res.data;
}

// ─── Teacher Assignments ──────────────────────────────────────────────────────

export async function getTeacherAssignments(params?: {
  page?: number;
  limit?: number;
  teacher_id?: string;
  section_id?: string;
  is_active?: boolean;
}): Promise<PaginatedResponse<TeacherAssignment>> {
  const res = await apiClient.get<PaginatedResponse<TeacherAssignment>>(
    "/admin/assignments/teachers",
    { params }
  );
  return res.data;
}

export async function assignTeacher(data: {
  teacher_id: string;
  section_id: string;
}): Promise<TeacherAssignment> {
  const res = await apiClient.post<TeacherAssignment>("/admin/assignments/teachers", data);
  return res.data;
}

export async function unassignTeacher(assignmentId: string): Promise<void> {
  await apiClient.delete(`/admin/assignments/teachers/${assignmentId}`);
}

// ─── Student Assignments ──────────────────────────────────────────────────────

export async function getStudentAssignments(params?: {
  page?: number;
  limit?: number;
  section_id?: string;
  is_active?: boolean;
}): Promise<PaginatedResponse<StudentAssignment>> {
  const res = await apiClient.get<PaginatedResponse<StudentAssignment>>(
    "/admin/assignments/students",
    { params }
  );
  return res.data;
}

export async function assignStudent(data: {
  student_id: string;
  section_id: string;
}): Promise<StudentAssignment> {
  const res = await apiClient.post<StudentAssignment>("/admin/assignments/students", data);
  return res.data;
}

export async function moveStudent(
  studentId: string,
  new_section_id: string
): Promise<StudentAssignment> {
  const res = await apiClient.put<StudentAssignment>(
    `/admin/assignments/students/${studentId}/move`,
    { new_section_id }
  );
  return res.data;
}
