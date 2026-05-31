"use client";
import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { useTeacherSections, useTeacherSectionDashboard } from "@/hooks/use-teacher-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, AlertCircle, Users, Activity, TrendingUp, BookOpen } from "lucide-react";

export default function TeacherReportsPage() {
  const { data: sections } = useTeacherSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  useEffect(() => {
    if (sections?.length && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  const { data: dashboard, isLoading, isError } = useTeacherSectionDashboard(selectedSectionId);

  return (
    <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Reports" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">Section performance overview</p>
          </div>
          {sections && sections.length > 0 && (
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
          )}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Export (PDF/CSV) is not yet available — no export API endpoint exists.
            The data below is the current section summary from the dashboard API.
          </AlertDescription>
        </Alert>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load report data.</AlertDescription>
          </Alert>
        )}

        {!selectedSectionId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Select a section to view its report.</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : dashboard ? (
          <>
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">{dashboard.section.class_name} — Section {dashboard.section.name}</CardTitle>
                <CardDescription>Current week summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Total Students", value: dashboard.summary.total_students, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
                    { label: "Active This Week", value: dashboard.summary.active_students_last_7_days, icon: Activity, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
                    { label: "Sessions This Week", value: dashboard.summary.total_sessions_this_week, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
                    { label: "Lessons Published", value: dashboard.summary.lessons_published, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg ${item.bg} p-4`}>
                      <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
                      <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Average Scores</CardTitle>
                <CardDescription>Current skill averages for this section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Overall", value: dashboard.summary.avg_overall_score },
                    { label: "vs. Last Week", value: dashboard.summary.avg_overall_score_prev_week },
                    { label: "Accuracy", value: dashboard.summary.avg_accuracy_score },
                    { label: "Fluency", value: dashboard.summary.avg_fluency_score },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-4 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-2xl font-bold text-primary">
                        {item.value != null ? `${item.value.toFixed(1)}%` : "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </TeacherLayout>
  );
}
