"use client";
import { useState } from "react";
import { StudentLayout } from "@/components/layout/student-layout";
import { useStudentProgress } from "@/hooks/use-student-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Star, Award, AlertCircle, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import { format } from "date-fns";

const DAY_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function StudentProgressPage() {
  const [days, setDays] = useState(30);
  const { data: progress, isLoading, isError } = useStudentProgress(days);

  const trendChartData = (progress?.trend ?? []).map((t) => ({
    date: format(new Date(t.date), "MMM d"),
    accuracy: Number(t.accuracy_score.toFixed(1)),
    fluency: Number(t.fluency_score.toFixed(1)),
    pronunciation: Number(t.pronunciation_score.toFixed(1)),
    overall: Number(t.overall_score.toFixed(1)),
  }));

  return (
    <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "My Progress" }]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">My Progress</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track your reading improvement over time
            </p>
          </div>
          {/* Days selector */}
          <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
            {DAY_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDays(value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  days === value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load progress data. Please try again.</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards — from real API summary object */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : progress ? (
            <>
              <Card className="rounded-xl">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center shrink-0">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Score</p>
                    <p className="text-2xl font-bold">
                      {progress.summary.best_overall_score !== null
                        ? `${Number(progress.summary.best_overall_score).toFixed(1)}%`
                        : "–"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Most Improved Skill</p>
                    <p className="text-base font-bold capitalize">
                      {progress.summary.most_improved_skill ?? "–"}
                    </p>
                    {progress.summary.most_improved_delta !== null && (
                      <Badge
                        className={`mt-1 text-xs ${
                          progress.summary.most_improved_delta >= 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {progress.summary.most_improved_delta >= 0 ? "+" : ""}
                        {Number(progress.summary.most_improved_delta).toFixed(1)} pts
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data Points</p>
                    <p className="text-2xl font-bold">{progress.trend.length}</p>
                    <p className="text-xs text-muted-foreground">sessions in {days} days</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Skill Trend Chart — from real API trend[] */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Score Trends</CardTitle>
            <CardDescription>
              Accuracy, fluency, pronunciation, and overall score per session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : trendChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[280px] gap-3">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No sessions found in the last {days} days
                </p>
                <p className="text-xs text-muted-foreground">
                  Complete a reading session to see your progress here
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={trendChartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="hsl(221.2 83.2% 53.3%)"
                    strokeWidth={2.5}
                    dot={false}
                    name="Overall"
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(142.1 76.2% 36.3%)"
                    strokeWidth={2}
                    dot={false}
                    name="Accuracy"
                  />
                  <Line
                    type="monotone"
                    dataKey="fluency"
                    stroke="hsl(38.4 95.6% 53.9%)"
                    strokeWidth={2}
                    dot={false}
                    name="Fluency"
                  />
                  <Line
                    type="monotone"
                    dataKey="pronunciation"
                    stroke="hsl(280 65% 60%)"
                    strokeWidth={2}
                    dot={false}
                    name="Pronunciation"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
