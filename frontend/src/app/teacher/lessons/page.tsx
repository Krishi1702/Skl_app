"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import {
  useTeacherSections, useTeacherLessons, useUploadLesson,
  useUpdateLesson, useDeleteLesson
} from "@/hooks/use-teacher-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LessonWithStats } from "@/types/api";
import {
  Plus, BookOpen, Globe, FileText, Eye, EyeOff, MoreHorizontal,
  Upload, AlertCircle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  language: z.enum(["english", "tamil"]),
  pdf: z.instanceof(File, { message: "PDF file is required" }),
});
type FormData = z.infer<typeof schema>;

const statusColor = {
  success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function TeacherLessonsPage() {
  const searchParams = useSearchParams();
  const paramSection = searchParams?.get("section") ?? "";
  const { data: sections } = useTeacherSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string>(paramSection);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (sections?.length && !selectedSectionId) {
      setSelectedSectionId(paramSection || sections[0].id);
    }
  }, [sections, selectedSectionId, paramSection]);

  const { data: lessons, isLoading, isError } = useTeacherLessons(selectedSectionId);
  const uploadLesson = useUploadLesson(selectedSectionId);
  const updateLesson = useUpdateLesson(selectedSectionId);
  const deleteLesson = useDeleteLesson(selectedSectionId);

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { language: "english", description: "" },
  });

  const pdfFile = watch("pdf");

  const onSubmit = async (data: FormData) => {
    const fd = new FormData();
    fd.append("title", data.title);
    if (data.description) fd.append("description", data.description);
    fd.append("language", data.language);
    fd.append("pdf", data.pdf);
    await uploadLesson.mutateAsync(fd);
    setDialogOpen(false);
    reset();
  };

  const handleTogglePublish = async (lesson: LessonWithStats) => {
    await updateLesson.mutateAsync({
      lessonId: lesson.id,
      data: { is_published: !lesson.is_published },
    });
  };

  const handleDelete = async (lesson: LessonWithStats) => {
    if (!confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`)) return;
    await deleteLesson.mutateAsync({ lessonId: lesson.id, force: false });
  };

  return (
    <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Lessons" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Lessons</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage reading materials</p>
          </div>
          <div className="flex items-center gap-2">
            {sections && sections.length > 0 && (
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.class_name} - {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => setDialogOpen(true)} disabled={!selectedSectionId}>
              <Plus className="mr-2 h-4 w-4" /> Add Lesson
            </Button>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load lessons. Please refresh.</AlertDescription>
          </Alert>
        )}

        {!selectedSectionId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Select a section to view lessons.</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : lessons?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No lessons yet</p>
            <p className="text-sm text-muted-foreground">Upload a PDF to create your first lesson</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Lesson
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons?.map((lesson) => (
              <Card key={lesson.id} className="rounded-xl hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTogglePublish(lesson)}>
                          {lesson.is_published ? (
                            <><EyeOff className="mr-2 h-4 w-4" />Unpublish</>
                          ) : (
                            <><Eye className="mr-2 h-4 w-4" />Publish</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(lesson)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="font-semibold text-sm leading-snug mt-2 line-clamp-2">{lesson.title}</p>
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
                    <Badge className={`text-xs ${statusColor[lesson.pdf_extraction_status]}`} variant="secondary">
                      {lesson.pdf_extraction_status === "success" ? "Ready" : lesson.pdf_extraction_status === "pending" ? "Processing" : "Failed"}
                    </Badge>
                    <Badge
                      variant={lesson.is_published ? "default" : "secondary"}
                      className={`text-xs ${lesson.is_published ? "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300" : ""}`}
                    >
                      {lesson.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {lesson.uploaded_by_name}</span>
                    <span>{format(new Date(lesson.created_at), "MMM d, yyyy")}</span>
                  </div>
                  {lesson.avg_score != null && (
                    <p className="text-xs text-muted-foreground">
                      {lesson.attempt_count} attempts • avg {lesson.avg_score.toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload New Lesson</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Lesson title" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" placeholder="Brief description..." rows={3} {...register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf">PDF File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setValue("pdf", file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => document.getElementById("pdf")?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {pdfFile ? pdfFile.name : "Choose PDF"}
                </Button>
              </div>
              {errors.pdf && <p className="text-sm text-destructive">{errors.pdf.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={uploadLesson.isPending}>
                {uploadLesson.isPending ? "Uploading..." : "Upload Lesson"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
}
