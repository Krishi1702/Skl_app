"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { useTeacherSections, useTeacherStudents } from "@/hooks/use-teacher-data";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StudentProgressRow } from "@/types/api";
import { ColumnDef } from "@tanstack/react-table";
import { Flame, ArrowUpRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

export default function TeacherStudentsPage() {
  const searchParams = useSearchParams();
  const paramSection = searchParams?.get("section") ?? "";
  const { data: sections } = useTeacherSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string>(paramSection);

  useEffect(() => {
    if (sections?.length && !selectedSectionId) {
      setSelectedSectionId(paramSection || sections[0].id);
    }
  }, [sections, selectedSectionId, paramSection]);

  const { data, isLoading, isError } = useTeacherStudents(selectedSectionId);

  const columns: ColumnDef<StudentProgressRow>[] = [
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }) => {
        const initials = row.original.student_name.split(" ").map((n) => n[0]).join("").toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium">{row.original.student_name}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "avg_overall_score",
      header: "Avg Score",
      cell: ({ row }) => {
        const score = row.original.avg_overall_score;
        if (score == null) return <span className="text-muted-foreground text-sm">N/A</span>;
        return (
          <div className="flex items-center gap-2 min-w-[130px]">
            <Progress value={score} className="h-1.5 flex-1" />
            <span className="text-sm font-medium w-10 text-right">{score.toFixed(1)}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "total_sessions",
      header: "Sessions",
      cell: ({ row }) => <span className="font-medium">{row.original.total_sessions}</span>,
    },
    {
      accessorKey: "lessons_completed",
      header: "Lessons Done",
      cell: ({ row }) => <span className="font-medium">{row.original.lessons_completed}</span>,
    },
    {
      accessorKey: "current_streak",
      header: "Streak",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Flame className={cn("h-3.5 w-3.5", row.original.current_streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
          <span className="font-medium">{row.original.current_streak}</span>
        </div>
      ),
    },
    {
      accessorKey: "last_session_date",
      header: "Last Active",
      cell: ({ row }) => {
        const date = row.original.last_session_date;
        return (
          <span className="text-muted-foreground text-sm">
            {date ? format(new Date(date), "MMM d") : "Never"}
          </span>
        );
      },
    },
    {
      id: "rank",
      header: "Rank",
      cell: ({ row }) => {
        const rank = row.original.current_rank;
        return rank != null ? (
          <Badge variant="secondary" className="text-xs">#{rank}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link href={`/teacher/students/${row.original.student_id}?section=${selectedSectionId}`}>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View <ArrowUpRight className="h-3 w-3" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Students" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground text-sm mt-1">Track student progress</p>
          </div>
          {sections && sections.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Section:</span>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.class_name} - {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load students. Please refresh.</AlertDescription>
          </Alert>
        )}

        {!selectedSectionId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Select a section to view students.</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            searchKey="student_name"
            searchPlaceholder="Search students..."
          />
        )}
      </div>
    </TeacherLayout>
  );
}
