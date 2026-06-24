"use client";
import { useRef, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable } from "@/components/admin/data-table";
import { useUsers, useToggleUserStatus, useImportUsers } from "@/hooks/use-admin-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AdminUserView } from "@/types/api";
import type { ImportResult } from "@/services/admin.service";
import { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, FileSpreadsheet, MoreHorizontal, PowerOff, Upload } from "lucide-react";
import { format } from "date-fns";

export default function StudentsPage() {
  const { data, isLoading, isError } = useUsers({ role: "student" });
  const toggleStatus = useToggleUserStatus();
  const importUsers = useImportUsers();

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!importFile) return;
    const result = await importUsers.mutateAsync({ role: "student", file: importFile });
    setImportResult(result);
  };

  const handleClose = () => {
    setImportOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage student accounts and section assignments.
            </p>
          </div>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Add Students
          </Button>
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

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
          </DialogHeader>

          {!importResult ? (
            <>
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file with columns:{" "}
                <span className="font-medium text-foreground">
                  Name, Email/Username, Password, Class, Section
                </span>
                . Students are auto-assigned to the specified class and section.
              </p>

              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                {importFile ? (
                  <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to choose file</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV or Excel (.csv, .xlsx)</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importFile || importUsers.isPending}
                >
                  {importUsers.isPending ? "Importing..." : "Import"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                {importResult.created > 0 && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Successfully imported {importResult.created} student{importResult.created !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-sm font-medium text-destructive mb-2">
                      {importResult.errors.length} row{importResult.errors.length !== 1 ? "s" : ""} had errors:
                    </p>
                    <ul className="text-xs text-destructive space-y-1 max-h-40 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <li key={i}>Row {e.row}: {e.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {importResult.created === 0 && importResult.errors.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No rows were processed.</p>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
