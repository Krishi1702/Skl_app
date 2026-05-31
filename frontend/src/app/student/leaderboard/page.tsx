"use client";
import { useState } from "react";
import { StudentLayout } from "@/components/layout/student-layout";
import { useStudentLeaderboard } from "@/hooks/use-student-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";

const rankIcons = [
  { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900" },
  { icon: Medal, color: "text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
  { icon: Award, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900" },
];

function getWeekStart(offset: number): string {
  const d = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), offset);
  return format(d, "yyyy-MM-dd");
}

export default function StudentLeaderboardPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = weekOffset === 0 ? undefined : getWeekStart(weekOffset);
  const { data: leaderboard, isLoading } = useStudentLeaderboard(weekStart);

  const entries = leaderboard?.entries ?? [];
  const topThree = entries.slice(0, 3);

  return (
    <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Leaderboard" }]}>
      <div className="space-y-6">
        {/* Header + week nav */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {leaderboard?.section_name
                ? `${leaderboard.section_name} — weekly ranking`
                : "See how you rank among your classmates"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((o) => o - 1)}
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[90px] text-center">
              {weekOffset === 0
                ? "This week"
                : leaderboard?.week_start
                ? format(new Date(leaderboard.week_start), "MMM d")
                : "—"}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
              disabled={weekOffset === 0}
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* My rank banner — from real API my_rank field */}
        {!isLoading && leaderboard?.my_rank && (
          <Card className="rounded-xl bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Your Rank This Week</p>
                <p className="text-2xl font-bold text-primary">#{leaderboard.my_rank}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card className="rounded-xl border-dashed">
            <CardContent className="py-16 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No entries for this week yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete a reading session to appear on the leaderboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Podium — Top 3 from entries */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {topThree.map((entry, i) => {
                  const rank = rankIcons[i];
                  const RankIcon = rank.icon;
                  const initials = entry.student_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <Card
                      key={entry.student_id}
                      className={`rounded-xl text-center ${
                        i === 0
                          ? "ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-lg"
                          : ""
                      } ${
                        entry.is_current_user
                          ? "ring-2 ring-green-400 dark:ring-green-500"
                          : ""
                      }`}
                    >
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        {i === 0 && <div className="text-2xl">👑</div>}
                        <div
                          className={`h-8 w-8 rounded-full ${rank.bg} flex items-center justify-center`}
                        >
                          <RankIcon className={`h-4 w-4 ${rank.color}`} />
                        </div>
                        <Avatar className="h-12 w-12">
                          <AvatarFallback
                            className={`text-sm font-bold ${
                              entry.is_current_user
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">
                            {entry.student_name.split(" ")[0]}
                          </p>
                          {entry.is_current_user && (
                            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 mt-0.5">
                              You
                            </Badge>
                          )}
                          <p className="text-2xl font-bold text-primary mt-1">
                            {entry.composite_score.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.sessions_completed} sessions
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full Rankings — all entries from real API */}
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Full Rankings</CardTitle>
                <CardDescription>Sorted by composite score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {entries.map((entry) => {
                  const initials = entry.student_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <div
                      key={entry.student_id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        entry.is_current_user
                          ? "bg-green-50 dark:bg-green-950 ring-1 ring-green-200 dark:ring-green-800"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-7 text-center">
                        {entry.rank <= 3 ? (
                          <span className="text-lg">
                            {["🥇", "🥈", "🥉"][entry.rank - 1]}
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">
                            #{entry.rank}
                          </span>
                        )}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={`text-xs ${
                            entry.is_current_user
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{entry.student_name}</p>
                          {entry.is_current_user && (
                            <Badge
                              variant="outline"
                              className="text-xs h-4 border-green-500 text-green-600 dark:text-green-400"
                            >
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Progress value={entry.avg_overall_score} className="h-1 w-20" />
                          <span className="text-xs text-muted-foreground">
                            {entry.avg_overall_score.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">
                            {entry.composite_score.toFixed(1)}
                          </p>
                          <div className="flex items-center gap-1 text-muted-foreground justify-end">
                            <BookOpen className="h-3 w-3" />
                            <span className="text-xs">{entry.sessions_completed}</span>
                          </div>
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
    </StudentLayout>
  );
}
