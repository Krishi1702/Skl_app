"use client";
import { StudentLayout } from "@/components/layout/student-layout";
import { useStudentDashboard } from "@/hooks/use-student-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Flame, BookOpen, Trophy, TrendingUp, ArrowRight, Clock, AlertCircle, Target } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { format } from "date-fns";

export default function StudentDashboardPage() {
  const { data: dashboard, isLoading, isError } = useStudentDashboard();
  const { user } = useAuthStore();

  if (isError) {
    return (
      <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Dashboard" }]}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load dashboard. Please refresh.</AlertDescription>
        </Alert>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Dashboard" }]}>
      <div className="space-y-6">
        {/* Hero */}
        <div className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-green-100 text-sm">Welcome back,</p>
              <h1 className="text-2xl font-bold mt-0.5">
                {isLoading ? "..." : (dashboard?.student.full_name?.split(" ")[0] || user?.full_name?.split(" ")[0] || "Student")}!
              </h1>
              {!isLoading && dashboard && (
                <p className="text-green-100 text-sm mt-1">
                  {dashboard.student.class_name} — {dashboard.student.section_name}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {isLoading ? (
                  <Skeleton className="h-8 w-28 bg-white/20" />
                ) : dashboard ? (
                  <>
                    <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                      <Flame className="h-4 w-4 text-orange-300" />
                      <span className="text-sm font-semibold">{dashboard.streak.current_streak} day streak</span>
                    </div>
                    {dashboard.current_rank != null && (
                      <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                        <Trophy className="h-4 w-4 text-yellow-300" />
                        <span className="text-sm font-semibold">Rank #{dashboard.current_rank}</span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
            {!isLoading && dashboard && (
              <div className="hidden md:block text-center bg-white/20 rounded-xl p-4">
                <p className="text-4xl font-black">{dashboard.skill_profile.avg_overall_score.toFixed(0)}%</p>
                <p className="text-green-100 text-xs mt-1">Average Score</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : dashboard ? (
            [
              {
                label: "Lessons",
                value: `${dashboard.progress.lessons_completed}/${dashboard.progress.total_lessons}`,
                sub: `${dashboard.progress.total_lessons} total`,
                icon: BookOpen,
                color: "text-blue-600",
                bg: "bg-blue-100 dark:bg-blue-900",
              },
              {
                label: "Avg Score",
                value: `${dashboard.skill_profile.avg_overall_score.toFixed(0)}%`,
                sub: "All time",
                icon: TrendingUp,
                color: "text-green-600",
                bg: "bg-green-100 dark:bg-green-900",
              },
              {
                label: "My Rank",
                value: dashboard.current_rank != null ? `#${dashboard.current_rank}` : "—",
                sub: "This section",
                icon: Trophy,
                color: "text-yellow-600",
                bg: "bg-yellow-100 dark:bg-yellow-900",
              },
              {
                label: "Streak",
                value: `${dashboard.streak.current_streak}d`,
                sub: `Best: ${dashboard.streak.longest_streak}d`,
                icon: Flame,
                color: "text-orange-600",
                bg: "bg-orange-100 dark:bg-orange-900",
              },
            ].map((item) => (
              <Card key={item.label} className="rounded-xl">
                <CardContent className="p-4">
                  <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </CardContent>
              </Card>
            ))
          ) : null}
        </div>

        {/* Progress + Next Lesson */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <CardTitle className="text-base">Overall Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-20 w-full" /> : dashboard ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-black text-green-600">{dashboard.progress.overall_progress_percent}%</p>
                      <p className="text-xs text-muted-foreground">{dashboard.progress.lessons_completed} of {dashboard.progress.total_lessons} lessons</p>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{dashboard.progress.total_sessions} sessions</p>
                  </div>
                  <Progress value={dashboard.progress.overall_progress_percent} className="h-2" />
                </div>
              ) : null}
              <Link href="/student/lessons" className="mt-4 block">
                <Button size="sm" className="w-full gap-2 mt-4">
                  <BookOpen className="h-4 w-4" /> Start Reading
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Skill Profile */}
          <Card className="rounded-xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Skill Profile</CardTitle>
              <CardDescription>Your current reading skill levels</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[120px] w-full" /> : dashboard ? (
                <div className="space-y-3">
                  {[
                    { label: "Accuracy", value: dashboard.skill_profile.avg_accuracy_score },
                    { label: "Fluency", value: dashboard.skill_profile.avg_fluency_score },
                    { label: "Pronunciation", value: dashboard.skill_profile.avg_pronunciation_score },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm font-bold">{item.value.toFixed(1)}%</span>
                      </div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                  {(dashboard.skill_profile.strength_tags.length > 0 || dashboard.skill_profile.weakness_tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {dashboard.skill_profile.strength_tags.map((t) => (
                        <Badge key={t} className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">{t}</Badge>
                      ))}
                      {dashboard.skill_profile.weakness_tags.map((t) => (
                        <Badge key={t} className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Next Lesson + Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboard?.next_lesson && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Up Next</CardTitle>
                <CardDescription>Your next recommended lesson</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="font-semibold">{dashboard.next_lesson.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{dashboard.next_lesson.language}</p>
                  {dashboard.next_lesson.my_best_score != null && (
                    <p className="text-xs text-muted-foreground">Best: {dashboard.next_lesson.my_best_score.toFixed(1)}%</p>
                  )}
                  <Link href={`/student/lessons/${dashboard.next_lesson.lesson_id}`} className="mt-3 block">
                    <Button size="sm" className="gap-2">
                      Start Now <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Sessions</CardTitle>
                <CardDescription>Your latest reading activities</CardDescription>
              </div>
              <Link href="/student/lessons">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : dashboard?.recent_sessions?.length ? (
                <div className="space-y-2">
                  {dashboard.recent_sessions.map((session) => (
                    <div key={session.session_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-2 w-2 rounded-full flex-shrink-0 bg-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.lesson_title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(session.completed_at), "MMM d")}</span>
                          <span>Attempt #{session.attempt_number}</span>
                        </div>
                      </div>
                      {session.overall_score != null && (
                        <Badge variant="secondary" className="text-xs">{session.overall_score.toFixed(0)}%</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No sessions yet. Start reading!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
}
