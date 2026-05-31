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
import { MoreHorizontal, PowerOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function StudentsPage() {
  const { data, isLoading, isError } = useUsers({ role: "student" });
  const toggleStatus = useToggleUserStatus();

  const columns: ColumnDef<AdminUserView>[] = [
    {
      accessorKey: "full_name",
      header: "Student",
      cell: ({ row }) => {
        const initials = row.original.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.original.full_name}</p>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "section",
      header: "Section",
      cell: ({ row }) => {
        const sec = row.original.assigned_section;
        if (!sec) return <span className="text-xs text-muted-foreground">Unassigned</span>;
        return (
          <Badge variant="outline" className="text-xs">
            {sec.class_name} {sec.section_name}
          </Badge>
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
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Students" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage student accounts. New students register via the /register page.
          </p>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load students. Please refresh.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            searchKey="full_name"
            searchPlaceholder="Search students..."
          />
        )}
      </div>
    </AdminLayout>
  );
}
