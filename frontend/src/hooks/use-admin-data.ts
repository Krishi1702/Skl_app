"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as adminService from "@/services/admin.service";

export const ADMIN_KEYS = {
  dashboard: ["admin", "dashboard"] as const,
  classes: (params?: object) => ["admin", "classes", params] as const,
  sections: (params?: object) => ["admin", "sections", params] as const,
  section: (id: string) => ["admin", "section", id] as const,
  users: (params?: object) => ["admin", "users", params] as const,
  user: (id: string) => ["admin", "user", id] as const,
  teacherAssignments: (params?: object) => ["admin", "teacher-assignments", params] as const,
  studentAssignments: (params?: object) => ["admin", "student-assignments", params] as const,
} as const;

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard,
    queryFn: adminService.getAdminDashboard,
  });
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export function useClasses(params?: {
  page?: number;
  limit?: number;
  include_inactive?: boolean;
}) {
  return useQuery({
    queryKey: ADMIN_KEYS.classes(params),
    queryFn: () => adminService.getClasses(params),
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminService.createClass(name),
    onSuccess: () => {
      toast.success("Class created");
      qc.invalidateQueries({ queryKey: ["admin", "classes"] });
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.dashboard });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to create class"
      );
    },
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      adminService.updateClass(id, name),
    onSuccess: () => {
      toast.success("Class updated");
      qc.invalidateQueries({ queryKey: ["admin", "classes"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to update class"
      );
    },
  });
}

export function useToggleClassStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminService.toggleClassStatus(id, is_active),
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? "Class activated" : "Class deactivated");
      qc.invalidateQueries({ queryKey: ["admin", "classes"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to update class status"
      );
    },
  });
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export function useSections(params?: {
  page?: number;
  limit?: number;
  class_id?: string;
  include_inactive?: boolean;
}) {
  return useQuery({
    queryKey: ADMIN_KEYS.sections(params),
    queryFn: () => adminService.getSections(params),
  });
}

export function useSectionDetail(id: string) {
  return useQuery({
    queryKey: ADMIN_KEYS.section(id),
    queryFn: () => adminService.getSection(id),
    enabled: !!id,
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { class_id: string; name: string }) => adminService.createSection(data),
    onSuccess: () => {
      toast.success("Section created");
      qc.invalidateQueries({ queryKey: ["admin", "sections"] });
      qc.invalidateQueries({ queryKey: ["admin", "classes"] });
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.dashboard });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to create section"
      );
    },
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      adminService.updateSection(id, name),
    onSuccess: () => {
      toast.success("Section updated");
      qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to update section"
      );
    },
  });
}

export function useToggleSectionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminService.toggleSectionStatus(id, is_active),
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? "Section activated" : "Section deactivated");
      qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to update section status"
      );
    },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function useUsers(params?: {
  page?: number;
  limit?: number;
  role?: "teacher" | "student";
  is_active?: boolean;
  unassigned?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: ADMIN_KEYS.users(params),
    queryFn: () => adminService.getUsers(params),
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ADMIN_KEYS.user(id),
    queryFn: () => adminService.getUser(id),
    enabled: !!id,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: "teacher" | "student" }) =>
      adminService.updateUserRole(id, role),
    onSuccess: () => {
      toast.success("User role updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.dashboard });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to update role"
      );
    },
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminService.toggleUserStatus(id, is_active),
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? "User activated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to update user status"
      );
    },
  });
}

// ─── Teacher Assignments ──────────────────────────────────────────────────────

export function useTeacherAssignments(params?: {
  page?: number;
  limit?: number;
  teacher_id?: string;
  section_id?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ADMIN_KEYS.teacherAssignments(params),
    queryFn: () => adminService.getTeacherAssignments(params),
  });
}

export function useAssignTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { teacher_id: string; section_id: string }) =>
      adminService.assignTeacher(data),
    onSuccess: () => {
      toast.success("Teacher assigned successfully");
      qc.invalidateQueries({ queryKey: ["admin", "teacher-assignments"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "sections"] });
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.dashboard });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to assign teacher"
      );
    },
  });
}

export function useUnassignTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => adminService.unassignTeacher(assignmentId),
    onSuccess: () => {
      toast.success("Teacher unassigned");
      qc.invalidateQueries({ queryKey: ["admin", "teacher-assignments"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "sections"] });
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.dashboard });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to unassign teacher"
      );
    },
  });
}

// ─── Student Assignments ──────────────────────────────────────────────────────

export function useStudentAssignments(params?: {
  page?: number;
  limit?: number;
  section_id?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ADMIN_KEYS.studentAssignments(params),
    queryFn: () => adminService.getStudentAssignments(params),
  });
}

export function useAssignStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { student_id: string; section_id: string }) =>
      adminService.assignStudent(data),
    onSuccess: () => {
      toast.success("Student assigned successfully");
      qc.invalidateQueries({ queryKey: ["admin", "student-assignments"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "sections"] });
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.dashboard });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to assign student"
      );
    },
  });
}

export function useMoveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, new_section_id }: { studentId: string; new_section_id: string }) =>
      adminService.moveStudent(studentId, new_section_id),
    onSuccess: () => {
      toast.success("Student moved to new section");
      qc.invalidateQueries({ queryKey: ["admin", "student-assignments"] });
      qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || err.response?.data?.message || "Failed to move student"
      );
    },
  });
}
