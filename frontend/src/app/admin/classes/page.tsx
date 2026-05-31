"use client";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable } from "@/components/admin/data-table";
import { useClasses, useCreateClass, useUpdateClass, useToggleClassStatus } from "@/hooks/use-admin-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Class } from "@/types/api";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, MoreHorizontal, Pencil, School, AlertCircle, PowerOff } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(1, "Class name is required") });
type CreateFormData = z.infer<typeof createSchema>;

export default function ClassesPage() {
  const { data, isLoading, isError } = useClasses();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const toggleStatus = useToggleClassStatus();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Class | null>(null);

  const createForm = useForm<CreateFormData>({ resolver: zodResolver(createSchema) });
  const editForm = useForm<CreateFormData>({ resolver: zodResolver(createSchema) });

  const onCreateSubmit = async (data: CreateFormData) => {
    await createClass.mutateAsync(data.name);
    setCreateOpen(false);
    createForm.reset();
  };

  const onEditSubmit = async (data: CreateFormData) => {
    if (!editTarget) return;
    await updateClass.mutateAsync({ id: editTarget.id, name: data.name });
    setEditTarget(null);
    editForm.reset();
  };

  const openEdit = (cls: Class) => {
    setEditTarget(cls);
    editForm.setValue("name", cls.name);
  };

  const columns: ColumnDef<Class>[] = [
    {
      accessorKey: "name",
      header: "Class Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <School className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "section_count",
      header: "Sections",
      cell: ({ row }) => <Badge variant="secondary">{row.original.section_count} sections</Badge>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.is_active ? "default" : "secondary"}
          className={row.original.is_active ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300" : ""}
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
      header: "",
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
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Classes" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Classes</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage school classes</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Class
          </Button>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load classes. Please refresh.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            searchKey="name"
            searchPlaceholder="Search classes..."
          />
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input id="name" placeholder="e.g., Class 6" {...createForm.register("name")} />
              {createForm.formState.errors.name && (
                <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createClass.isPending}>
                {createClass.isPending ? "Creating..." : "Create Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Class Name</Label>
              <Input id="edit-name" placeholder="e.g., Class 6" {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={updateClass.isPending}>
                {updateClass.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
