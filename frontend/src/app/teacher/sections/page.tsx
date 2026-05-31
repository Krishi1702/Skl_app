"use client";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { useTeacherSections } from "@/hooks/use-teacher-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, BookOpen, GraduationCap, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function TeacherSectionsPage() {
  const { data: sections, isLoading, isError } = useTeacherSections();

  return (
    <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "My Sections" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Sections</h1>
          <p className="text-muted-foreground text-sm mt-1">Sections assigned to you</p>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load sections. Please refresh.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : sections?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No sections assigned</p>
            <p className="text-sm text-muted-foreground">Contact your admin to get assigned to sections</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections?.map((section) => (
              <Card key={section.id} className="rounded-xl hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="font-bold text-blue-700 dark:text-blue-300">{section.name}</span>
                    </div>
                    <Badge
                      variant={section.is_active ? "default" : "secondary"}
                      className={section.is_active ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300" : ""}
                    >
                      {section.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{section.class_name} — {section.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Students</p>
                      <p className="text-sm font-bold">{section.student_count}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Teachers</p>
                      <p className="text-sm font-bold">{section.teacher_count}</p>
                    </div>
                    {section.lesson_count !== undefined && (
                      <div className="flex flex-col items-center gap-1">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Lessons</p>
                        <p className="text-sm font-bold">{section.lesson_count}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link href={`/teacher/students?section=${section.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                        <Users className="h-3 w-3" /> Students
                      </Button>
                    </Link>
                    <Link href={`/teacher/lessons?section=${section.id}`} className="flex-1">
                      <Button size="sm" className="w-full gap-1 text-xs">
                        <BookOpen className="h-3 w-3" /> Lessons
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
