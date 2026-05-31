"use client";
import { useSearchParams } from "next/navigation";
import { StudentLayout } from "@/components/layout/student-layout";
import { useStudentLessons } from "@/hooks/use-student-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Globe, CheckCircle2, PlayCircle, Lock, Star, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusConfig = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900" },
  not_started: { label: "Not Started", icon: Lock, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function StudentLessonsPage() {
  const searchParams = useSearchParams();
  const statusParam = (searchParams?.get("status") ?? undefined) as "not_started" | "in_progress" | "completed" | undefined;

  const { data: lessons, isLoading, isError } = useStudentLessons(statusParam);

  const completedCount = lessons?.filter(l => l.completion_status === "completed").length || 0;
  const totalCount = lessons?.length || 0;

  return (
    <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Lessons" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Lessons</h1>
            <p className="text-muted-foreground text-sm mt-1">Reading materials assigned to your class</p>
          </div>
          {!isLoading && !statusParam && (
            <div className="text-right">
              <p className="text-sm font-medium">{completedCount} / {totalCount} done</p>
              <Progress value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0} className="h-1.5 w-24 mt-1" />
            </div>
          )}
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load lessons. Please refresh.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : lessons?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No lessons available</p>
            <p className="text-sm text-muted-foreground">Your teacher hasn&apos;t published any lessons yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons?.map((lesson) => {
              const status = statusConfig[lesson.completion_status as keyof typeof statusConfig] || statusConfig.not_started;
              const StatusIcon = status.icon;
              return (
                <Card key={lesson.id} className="rounded-xl hover:shadow-md transition-all group overflow-hidden">
                  <div className={cn("h-2 w-full",
                    lesson.completion_status === "completed" ? "bg-green-500" :
                    lesson.completion_status === "in_progress" ? "bg-blue-500" : "bg-muted"
                  )} />
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-green-700 dark:text-green-300" />
                      </div>
                      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", status.bg)}>
                        <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
                      </div>
                    </div>
                    <p className="font-semibold text-sm leading-snug mt-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {lesson.title}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {lesson.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {lesson.language === "english" ? "English" : "Tamil"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs",
                          lesson.completion_status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""
                        )}
                      >
                        {status.label}
                      </Badge>
                    </div>
                    {lesson.my_best_score !== null && (
                      <div className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">Best Score</span>
                            <span className="font-medium">{lesson.my_best_score}%</span>
                          </div>
                          <Progress value={lesson.my_best_score} className="h-1" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {lesson.my_attempt_count > 0 ? `${lesson.my_attempt_count} attempt${lesson.my_attempt_count !== 1 ? "s" : ""}` : "Not attempted"}
                      </span>
                      <Link href={`/student/lessons/${lesson.id}`}>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          variant={lesson.completion_status === "completed" ? "outline" : "default"}
                        >
                          {lesson.completion_status === "completed" ? "Practice Again" : lesson.completion_status === "in_progress" ? "Continue" : "Start"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
