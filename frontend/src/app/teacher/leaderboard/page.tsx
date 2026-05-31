"use client";
import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { useTeacherSections, useTeacherLeaderboard } from "@/hooks/use-teacher-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Medal, Award, BookOpen, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";

const rankIcons = [
  { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900" },
  { icon: Medal, color: "text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
  { icon: Award, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900" },
];

export default function TeacherLeaderboardPage() {
  const { data: sections } = useTeacherSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (sections?.length && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  const weekStart = format(
    startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const { data: leaderboard, isLoading, isError } = useTeacherLeaderboard(
    selectedSectionId,
    weekOffset !== 0 ? weekStart : undefined
  );

  const entries = leaderboard?.entries ?? [];
  const topThree = entries.slice(0, 3);

  return (
    <TeacherLayout breadcrumbs={[{ label: "Teacher" }, { label: "Leaderboard" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Student Leaderboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {leaderboard ? `${leaderboard.section_name} • ${format(new Date(leaderboard.week_start), "MMM d")} – ${format(new Date(leaderboard.week_end), "MMM d, yyyy")}` : "Top performing students"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                This Week
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset === 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load leaderboard. Please refresh.</AlertDescription>
          </Alert>
        )}

        {!selectedSectionId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Select a section to view the leaderboard.</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No data for this week</p>
            <p className="text-sm text-muted-foreground">Students need to complete sessions to appear here</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <div className="grid grid-cols-3 gap-4">
                {topThree.map((entry, i) => {
                  const rank = rankIcons[i];
                  const RankIcon = rank.icon;
                  const initials = entry.student_name.split(" ").map((n) => n[0]).join("").toUpperCase();
                  return (
                    <Card key={entry.student_id} className={`rounded-xl text-center ${i === 0 ? "ring-2 ring-yellow-400 dark:ring-yellow-500" : ""}`}>
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        <div className={`h-8 w-8 rounded-full ${rank.bg} flex items-center justify-center mt-2`}>
                          <RankIcon className={`h-4 w-4 ${rank.color}`} />
                        </div>
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{entry.student_name}</p>
                          <p className="text-2xl font-bold text-primary mt-0.5">{entry.composite_score.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">{entry.sessions_completed} sessions</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full Rankings */}
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Full Rankings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {entries.map((entry) => {
                  const initials = entry.student_name.split(" ").map((n) => n[0]).join("").toUpperCase();
                  return (
                    <div key={entry.student_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 text-center">
                        <span className={`text-sm font-bold ${entry.rank <= 3 ? "text-yellow-500" : "text-muted-foreground"}`}>
                          #{entry.rank}
                        </span>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{entry.student_name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <Progress value={entry.avg_overall_score} className="h-1 w-24" />
                          <span className="text-xs text-muted-foreground">{entry.avg_overall_score.toFixed(1)}% avg</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{entry.composite_score.toFixed(1)}</p>
                        <div className="flex items-center gap-1 text-muted-foreground justify-end">
                          <BookOpen className="h-3 w-3" />
                          <span className="text-xs">{entry.sessions_completed}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}
