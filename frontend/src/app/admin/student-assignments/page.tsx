"use client";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable } from "@/components/admin/data-table";
import {
  useStudentAssignments, useAssignStudent, useMoveStudent,
  useUsers, useSections, useClasses,
} from "@/hooks/use-admin-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StudentAssignment } from "@/types/api";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Calendar, ArrowRightLeft, AlertCircle, School, BookOpen } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const assignSchema = z.object({
  student_id: z.string().min(1, "Student is required"),
  section_id: z.string().min(1, "Section is required"),
});
const moveSchema = z.object({
  section_id: z.string().min(1, "Section is required"),
});
type AssignFormData = z.infer<typeof assignSchema>;
type MoveFormData = z.infer<typeof moveSchema>;

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function StudentAssignmentsPage() {
  const { data: assignmentsData, isLoading, isError } = useStudentAssignments({ is_active: true });
  const { data: studentsData } = useUsers({ role: "student" });
  const { data: classesData } = useClasses();
  const { data: sectionsData } = useSections();

  const assignStudent = useAssignStudent();
  const moveStudent = useMoveStudent();

  const [assignOpen, setAssignOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<StudentAssignment | null>(null);

  // Class filter inside dialogs
  const [assignFilterClassId, setAssignFilterClassId] = useState("");
  const [moveFilterClassId, setMoveFilterClassId] = useState("");

  const assignForm = useForm<AssignFormData>({ resolver: zodResolver(assignSchema) });
  const moveForm = useForm<MoveFormData>({ resolver: zodResolver(moveSchema) });

  const onAssignSubmit = async (data: AssignFormData) => {
    await assignStudent.mutateAsync(data);
    setAssignOpen(false);
    assignForm.reset();
    setAssignFilterClassId("");
  };

  const onMoveSubmit = async (data: MoveFormData) => {
    if (!moveTarget) return;
    await moveStudent.mutateAsync({ studentId: moveTarget.student_id, new_section_id: data.section_id });
    setMoveTarget(null);
    moveForm.reset();
    setMoveFilterClassId("");
  };

  const filteredSectionsForAssign = sectionsData?.data?.filter(
    (s) => s.is_active && (!assignFilterClassId || s.class_id === assignFilterClassId)
  ) ?? [];

  const filteredSectionsForMove = sectionsData?.data?.filter(
    (s) =>
      s.is_active &&
      s.id !== moveTarget?.section_id &&
      (!moveFilterClassId || s.class_id === moveFilterClassId)
  ) ?? [];

  const columns: ColumnDef<StudentAssignment>[] = [
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }) => {
        const name = row.original.student_name;
        const email = row.original.student_email;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{name ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{email ?? ""}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "class_name",
      header: "Class",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <School className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{row.original.class_name ?? "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "section_name",
      header: "Section",
      cell: ({ row }) => (
        <Badge variant="secondary" className="gap-1">
          <BookOpen className="h-3 w-3" />
          {row.original.section_name ?? "—"}
        </Badge>
      ),
    },
    {
      accessorKey: "assigned_at",
      header: "Assigned On",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span className="text-sm">
            {row.original.assigned_at
              ? format(new Date(row.original.assigned_at), "MMM d, yyyy")
              : "—"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 h-8"
          onClick={() => {
            setMoveTarget(row.original);
            setMoveFilterClassId("");
          }}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" /> Move
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Student Assignments" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Student Assignments</h1>
            <p className="text-muted-foreground text-sm mt-1">Assign students to class sections</p>
          </div>
          <Button onClick={() => setAssignOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Assign Student
          </Button>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load assignments. Please refresh.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={assignmentsData?.data ?? []}
            searchKey="student_name"
            searchPlaceholder="Search by student name..."
          />
        )}
      </div>

      {/* ── Assign Dialog ── */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) { assignForm.reset(); setAssignFilterClassId(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Student to Section</DialogTitle>
          </DialogHeader>
          <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Controller
                name="student_id"
                control={assignForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentsData?.data?.filter((s) => s.is_active).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {assignForm.formState.errors.student_id && (
                <p className="text-xs text-destructive">{assignForm.formState.errors.student_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Filter by Class <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select
                value={assignFilterClassId}
                onValueChange={(v) => setAssignFilterClassId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All classes</SelectItem>
                  {classesData?.data?.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Section</Label>
              <Controller
                name="section_id"
                control={assignForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSectionsForAssign.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No active sections found</div>
                      ) : (
                        filteredSectionsForAssign.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="font-medium">{s.class_name}</span>
                            <span className="text-muted-foreground"> — {s.name}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {assignForm.formState.errors.section_id && (
                <p className="text-xs text-destructive">{assignForm.formState.errors.section_id.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setAssignOpen(false); assignForm.reset(); setAssignFilterClassId(""); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignStudent.isPending}>
                {assignStudent.isPending ? "Assigning…" : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Move Dialog ── */}
      <Dialog
        open={!!moveTarget}
        onOpenChange={(open) => {
          if (!open) { setMoveTarget(null); moveForm.reset(); setMoveFilterClassId(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move {moveTarget?.student_name ?? "Student"} to Another Section</DialogTitle>
          </DialogHeader>
          {moveTarget && (
            <p className="text-sm text-muted-foreground -mt-2">
              Currently in <strong>{moveTarget.class_name} — {moveTarget.section_name}</strong>
            </p>
          )}
          <form onSubmit={moveForm.handleSubmit(onMoveSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Filter by Class <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select
                value={moveFilterClassId}
                onValueChange={(v) => setMoveFilterClassId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All classes</SelectItem>
                  {classesData?.data?.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>New Section</Label>
              <Controller
                name="section_id"
                control={moveForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSectionsForMove.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No other sections found</div>
                      ) : (
                        filteredSectionsForMove.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="font-medium">{s.class_name}</span>
                            <span className="text-muted-foreground"> — {s.name}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {moveForm.formState.errors.section_id && (
                <p className="text-xs text-destructive">{moveForm.formState.errors.section_id.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setMoveTarget(null); moveForm.reset(); setMoveFilterClassId(""); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={moveStudent.isPending}>
                {moveStudent.isPending ? "Moving…" : "Move Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
