"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable } from "@/components/admin/data-table";
import { useUsers, useToggleUserStatus } from "@/hooks/use-admin-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AdminUserView } from "@/types/api";
import { ColumnDef } from "@tanstack/react-table";
import { Mail, MoreHorizontal, PowerOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function TeachersPage() {
  const { data, isLoading, isError } = useUsers({ role: "teacher" });
  const toggleStatus = useToggleUserStatus();

  const columns: ColumnDef<AdminUserView>[] = [
    {
      accessorKey: "full_name",
      header: "Teacher",
      cell: ({ row }) => {
        const initials = row.original.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.original.full_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />{row.original.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "assigned_sections",
      header: "Assigned Sections",
      cell: ({ row }) => {
        const sections = row.original.assigned_sections;
        if (!sections?.length) return <span className="text-xs text-muted-foreground">Unassigned</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {sections.slice(0, 2).map((s) => (
              <Badge key={s.section_id} variant="secondary" className="text-xs">
                {s.class_name} {s.section_name}
              </Badge>
            ))}
            {sections.length > 2 && (
              <Badge variant="outline" className="text-xs">+{sections.length - 2}</Badge>
            )}
          </div>
        );
      },
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
      header: "Joined",
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
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Teachers" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage teacher accounts. New teachers register via the /register page.
          </p>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load teachers. Please refresh.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            searchKey="full_name"
            searchPlaceholder="Search teachers..."
          />
        )}
      </div>
    </AdminLayout>
  );
}
