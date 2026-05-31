"use client";
import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { KpiCard } from "@/components/admin/kpi-card";
import { useTeacherSections, useTeacherSectionDashboard } from "@/hooks/use-teacher-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, BookOpen, TrendingUp, Activity, ArrowRight, Trophy, AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function TeacherDashboardPage() {
  const { data: sections, isLoading: sectionsLoading } = useTeacherSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  useEffect(() => {
    if (sections?.length && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  const { data: dashboard, isLoading: dashLoading, isError } = useTeacherSectionDashboard(selectedSectionId);

  const isLoading = sectionsLoading || dashLoading;

  const scoreChange = dashboard
    ? dashboard.summary.avg_overall_score !== null && dashboard.summary.avg_overall_score_prev_week !== null
      ? (dashboard.summary.avg_overall_score - dashboard.summary.avg_overall_score_prev_week).toFixed(1)
      : null
    : null;

  return (
    <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Dashboard" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Overview of your section&apos;s performance</p>
          </div>
          {!sectionsLoading && sections && sections.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Section:</span>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.class_name} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load dashboard data.</AlertDescription>
          </Alert>
        )}

        {sectionsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : !sections?.length ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You are not assigned to any sections yet. Contact your admin.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Total Students"
                value={isLoading ? "–" : dashboard?.summary.total_students ?? "–"}
                icon={Users}
                iconColor="text-blue-600"
                iconBg="bg-blue-100 dark:bg-blue-900"
                loading={isLoading}
              />
              <KpiCard
                title="Active This Week"
                value={isLoading ? "–" : dashboard?.summary.active_students_last_7_days ?? "–"}
                icon={Activity}
                iconColor="text-green-600"
                iconBg="bg-green-100 dark:bg-green-900"
                loading={isLoading}
              />
              <KpiCard
                title="Avg Score"
                value={isLoading ? "–" : dashboard?.summary.avg_overall_score != null ? `${dashboard.summary.avg_overall_score.toFixed(1)}%` : "N/A"}
                change={scoreChange ? `${Number(scoreChange) >= 0 ? "+" : ""}${scoreChange} vs last week` : undefined}
                changePositive={scoreChange ? Number(scoreChange) >= 0 : undefined}
                icon={TrendingUp}
                iconColor="text-purple-600"
                iconBg="bg-purple-100 dark:bg-purple-900"
                loading={isLoading}
              />
              <KpiCard
                title="Sessions This Week"
                value={isLoading ? "–" : dashboard?.summary.total_sessions_this_week ?? "–"}
                icon={BookOpen}
                iconColor="text-orange-600"
                iconBg="bg-orange-100 dark:bg-orange-900"
                loading={isLoading}
              />
            </div>

            {/* Score detail + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Score Breakdown</CardTitle>
                  <CardDescription>Average skill scores for this section</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
                  ) : dashboard ? (
                    <div className="space-y-3">
                      {[
                        { label: "Accuracy", value: dashboard.summary.avg_accuracy_score },
                        { label: "Fluency", value: dashboard.summary.avg_fluency_score },
                        { label: "Lessons Published", value: dashboard.summary.lessons_published, unit: "" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-sm font-bold text-primary">
                            {item.value != null
                              ? item.unit !== ""
                                ? `${item.value}${item.unit ?? "%"}`
                                : item.value
                              : "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Top Students
                    </CardTitle>
                    <CardDescription>This week&apos;s leaderboard</CardDescription>
                  </div>
                  <Link href="/teacher/leaderboard">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Full Board <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
                  ) : dashboard?.top_leaderboard?.length ? (
                    <div className="space-y-2">
                      {dashboard.top_leaderboard.slice(0, 5).map((entry) => {
                        const initials = entry.student_name.split(" ").map((n) => n[0]).join("").toUpperCase();
                        return (
                          <div key={entry.student_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{entry.rank}</span>
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <p className="flex-1 text-sm font-medium truncate">{entry.student_name}</p>
                            <Badge variant="secondary" className="text-xs">{entry.composite_score.toFixed(1)}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No leaderboard data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Upload Lesson", href: "/teacher/lessons", color: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950" },
                    { label: "View Leaderboard", href: "/teacher/leaderboard", color: "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950" },
                    { label: "My Sections", href: "/teacher/sections", color: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950" },
                    { label: "View Students", href: "/teacher/students", color: "bg-green-50 hover:bg-green-100 dark:bg-green-950" },
                  ].map((action) => (
                    <Link key={action.label} href={action.href}>
                      <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${action.color}`}>
                        <span className="text-sm font-medium">{action.label}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}
