"use client";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable } from "@/components/admin/data-table";
import {
  useTeacherAssignments, useAssignTeacher, useUnassignTeacher,
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
import type { TeacherAssignment } from "@/types/api";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Calendar, School, BookOpen, Trash2, AlertCircle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const schema = z.object({
  teacher_id: z.string().min(1, "Teacher is required"),
  section_id: z.string().min(1, "Section is required"),
});
type FormData = z.infer<typeof schema>;

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function TeacherAssignmentsPage() {
  const { data: assignmentsData, isLoading, isError } = useTeacherAssignments({ is_active: true });
  const { data: teachersData } = useUsers({ role: "teacher" });
  const { data: classesData } = useClasses();
  const { data: sectionsData } = useSections();

  const assignTeacher = useAssignTeacher();
  const unassignTeacher = useUnassignTeacher();

  const [dialogOpen, setDialogOpen] = useState(false);
  // Class filter inside the assign dialog to narrow down sections
  const [filterClassId, setFilterClassId] = useState("");

  const { handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await assignTeacher.mutateAsync(data);
    setDialogOpen(false);
    reset();
    setFilterClassId("");
  };

  const filteredSections = sectionsData?.data?.filter(
    (s) => s.is_active && (!filterClassId || s.class_id === filterClassId)
  ) ?? [];

  const columns: ColumnDef<TeacherAssignment>[] = [
    {
      accessorKey: "teacher_name",
      header: "Teacher",
      cell: ({ row }) => {
        const name = row.original.teacher_name;
        const email = row.original.teacher_email;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
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
          className="text-destructive hover:text-destructive text-xs gap-1 h-8"
          onClick={() => {
            const label = `${row.original.teacher_name ?? "this teacher"} from ${row.original.class_name ?? ""} ${row.original.section_name ?? ""}`;
            if (confirm(`Remove ${label.trim()}?`)) {
              unassignTeacher.mutate(row.original.id);
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Teacher Assignments" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Teacher Assignments</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Assign teachers to class sections
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Assign Teacher
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
            searchKey="teacher_name"
            searchPlaceholder="Search by teacher name..."
          />
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { reset(); setFilterClassId(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Teacher to Section</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Teacher */}
            <div className="space-y-1.5">
              <Label>Teacher</Label>
              <Controller
                name="teacher_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachersData?.data
                        ?.filter((t) => t.is_active)
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.teacher_id && (
                <p className="text-xs text-destructive">{errors.teacher_id.message}</p>
              )}
            </div>

            {/* Class filter — narrows the section list */}
            <div className="space-y-1.5">
              <Label>Filter by Class <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select
                value={filterClassId}
                onValueChange={(v) => setFilterClassId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All classes</SelectItem>
                  {classesData?.data
                    ?.filter((c) => c.is_active)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section — grouped by class name */}
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Controller
                name="section_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSections.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No active sections found
                        </div>
                      ) : (
                        filteredSections.map((s) => (
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
              {errors.section_id && (
                <p className="text-xs text-destructive">{errors.section_id.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); reset(); setFilterClassId(""); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assignTeacher.isPending}>
                {assignTeacher.isPending ? "Assigning…" : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
