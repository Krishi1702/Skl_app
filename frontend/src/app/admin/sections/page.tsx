"use client";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable } from "@/components/admin/data-table";
import { useSections, useClasses, useCreateSection, useUpdateSection, useToggleSectionStatus } from "@/hooks/use-admin-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Section } from "@/types/api";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Users, GraduationCap, MoreHorizontal, Pencil, PowerOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createSchema = z.object({ class_id: z.string().min(1), name: z.string().min(1) });
type CreateFormData = z.infer<typeof createSchema>;
const editSchema = z.object({ name: z.string().min(1) });
type EditFormData = z.infer<typeof editSchema>;

export default function SectionsPage() {
  const { data: sectionsData, isLoading, isError } = useSections();
  const { data: classesData } = useClasses();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const toggleStatus = useToggleSectionStatus();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);

  const createForm = useForm<CreateFormData>({ resolver: zodResolver(createSchema) });
  const editForm = useForm<EditFormData>({ resolver: zodResolver(editSchema) });

  const onCreateSubmit = async (data: CreateFormData) => {
    await createSection.mutateAsync(data);
    setCreateOpen(false);
    createForm.reset();
  };

  const onEditSubmit = async (data: EditFormData) => {
    if (!editTarget) return;
    await updateSection.mutateAsync({ id: editTarget.id, name: data.name });
    setEditTarget(null);
    editForm.reset();
  };

  const openEdit = (section: Section) => {
    setEditTarget(section);
    editForm.setValue("name", section.name);
  };

  const columns: ColumnDef<Section>[] = [
    {
      accessorKey: "name",
      header: "Section",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {row.original.name}
          </div>
          <span className="font-medium">{row.original.class_name} - {row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "class_name",
      header: "Class",
      cell: ({ row }) => <Badge variant="outline">{row.original.class_name}</Badge>,
    },
    {
      accessorKey: "student_count",
      header: "Students",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.original.student_count}</span>
        </div>
      ),
    },
    {
      accessorKey: "teacher_count",
      header: "Teachers",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.original.teacher_count}</span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={row.original.is_active ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300" : ""}
          variant={row.original.is_active ? "default" : "secondary"}
        >
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.original.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toggleStatus.mutate({ id: row.original.id, is_active: !row.original.is_active })}
            >
              <PowerOff className="mr-2 h-4 w-4" />
              {row.original.is_active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Sections" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sections</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage class sections</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Section
          </Button>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load sections. Please refresh.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={sectionsData?.data || []}
            searchKey="class_name"
            searchPlaceholder="Search sections..."
          />
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Section</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Controller
                name="class_id"
                control={createForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                    <SelectContent>
                      {classesData?.data?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {createForm.formState.errors.class_id && (
                <p className="text-sm text-destructive">Class is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Section Name</Label>
              <Input id="name" placeholder="e.g., A, B, C" {...createForm.register("name")} />
              {createForm.formState.errors.name && (
                <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createSection.isPending}>
                {createSection.isPending ? "Creating..." : "Create Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Section</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Section Name</Label>
              <Input id="edit-name" placeholder="e.g., A, B, C" {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={updateSection.isPending}>
                {updateSection.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
