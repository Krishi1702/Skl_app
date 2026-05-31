"use client";
import { useParams, useSearchParams } from "next/navigation";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { useStudentProgress } from "@/hooks/use-teacher-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export default function StudentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = (params?.id ?? "") as string;
  const sectionId = searchParams?.get("section") ?? "";

  const { data, isLoading, isError } = useStudentProgress(sectionId, studentId);

  if (isLoading) {
    return (
      <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Students", href: "/teacher/students" }, { label: "Loading..." }]}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </TeacherLayout>
    );
  }

  if (isError || !data) {
    return (
      <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Students", href: "/teacher/students" }, { label: "Error" }]}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load student data. Make sure a valid section is selected (use the ?section= URL parameter).
          </AlertDescription>
        </Alert>
      </TeacherLayout>
    );
  }

  const { student, skill_profile, skill_trend, session_history } = data;
  const initials = student.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const trendChartData = skill_trend.map((t) => ({
    date: format(new Date(t.date), "MMM d"),
    accuracy: t.accuracy_score,
    fluency: t.fluency_score,
    pronunciation: t.pronunciation_score,
    overall: t.overall_score,
  }));

  return (
    <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Students", href: "/teacher/students" }, { label: student.full_name }]}>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl font-bold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{student.full_name}</h1>
                <p className="text-sm text-muted-foreground">{student.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {[
                { label: "Avg Score", value: `${skill_profile.avg_overall_score.toFixed(1)}%` },
                { label: "Accuracy", value: `${skill_profile.avg_accuracy_score.toFixed(1)}%` },
                { label: "Fluency", value: `${skill_profile.avg_fluency_score.toFixed(1)}%` },
                { label: "Pronunciation", value: `${skill_profile.avg_pronunciation_score.toFixed(1)}%` },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            {(skill_profile.strength_tags.length > 0 || skill_profile.weakness_tags.length > 0) && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {skill_profile.strength_tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">Strengths</p>
                    <div className="flex flex-wrap gap-1">
                      {skill_profile.strength_tags.map((tag) => (
                        <Badge key={tag} className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {skill_profile.weakness_tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">Needs Work</p>
                    <div className="flex flex-wrap gap-1">
                      {skill_profile.weakness_tags.map((tag) => (
                        <Badge key={tag} className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Chart */}
        {trendChartData.length > 0 && (
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Progress Over Time</CardTitle>
              <CardDescription>Skill score trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="accuracy" stroke="hsl(221.2 83.2% 53.3%)" strokeWidth={2} dot={false} name="Accuracy" />
                  <Line type="monotone" dataKey="fluency" stroke="hsl(142.1 76.2% 36.3%)" strokeWidth={2} dot={false} name="Fluency" />
                  <Line type="monotone" dataKey="overall" stroke="hsl(38.4 95.6% 53.9%)" strokeWidth={2} dot={false} name="Overall" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Session History */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Session History</CardTitle>
            <CardDescription>All reading sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {session_history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sessions yet</p>
            ) : (
              <div className="space-y-2">
                {session_history.map((session) => (
                  <div key={session.session_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${session.overall_score != null ? "bg-green-500" : "bg-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium">{session.lesson_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(session.completed_at), "MMM d, yyyy 'at' h:mm a")} • Attempt #{session.attempt_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.duration_seconds && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{Math.floor(session.duration_seconds / 60)}:{String(session.duration_seconds % 60).padStart(2, "0")}</span>
                        </div>
                      )}
                      {session.overall_score != null && (
                        <Badge variant="secondary" className="text-xs">{session.overall_score.toFixed(1)}%</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
