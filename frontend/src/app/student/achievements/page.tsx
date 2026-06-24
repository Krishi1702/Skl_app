"use client";
import { StudentLayout } from "@/components/layout/student-layout";
import { useStudentAchievements } from "@/hooks/use-student-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Flame, BookOpen, Star, Trophy, Target, Zap, Mic, Award,
  Play, Lock, AlertCircle, CheckCircle2,
} from "lucide-react";
import type { Achievement } from "@/types/api";

// ── Icon mapping ─────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  flame: Flame,
  play: Play,
  book: BookOpen,
  "book-open": BookOpen,
  star: Star,
  trophy: Trophy,
  target: Target,
  zap: Zap,
  mic: Mic,
  award: Award,
};

// ── Category styling ─────────────────────────────────────────────────────────
const CATEGORY_STYLE: Record<string, { bg: string; text: string; ring: string; badge: string }> = {
  streak:   { bg: "bg-orange-100 dark:bg-orange-900",  text: "text-orange-600 dark:text-orange-400",  ring: "ring-orange-400",  badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  sessions: { bg: "bg-blue-100 dark:bg-blue-900",      text: "text-blue-600 dark:text-blue-400",      ring: "ring-blue-400",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  lessons:  { bg: "bg-green-100 dark:bg-green-900",    text: "text-green-600 dark:text-green-400",    ring: "ring-green-400",   badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  score:    { bg: "bg-yellow-100 dark:bg-yellow-900",  text: "text-yellow-600 dark:text-yellow-400",  ring: "ring-yellow-400",  badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  skill:    { bg: "bg-purple-100 dark:bg-purple-900",  text: "text-purple-600 dark:text-purple-400",  ring: "ring-purple-400",  badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const CATEGORY_LABEL: Record<string, string> = {
  streak: "Streak", sessions: "Sessions", lessons: "Lessons", score: "Score", skill: "Skills",
};

// ── Earned badge card ─────────────────────────────────────────────────────────
function EarnedCard({ a }: { a: Achievement }) {
  const style = CATEGORY_STYLE[a.category] ?? CATEGORY_STYLE.score;
  const Icon = ICON_MAP[a.icon] ?? Star;
  return (
    <Card className={`rounded-xl ring-2 ${style.ring} shadow-sm`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${style.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{a.title}</p>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
          <Badge className={`mt-2 text-xs ${style.badge}`}>{CATEGORY_LABEL[a.category]}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Locked badge card ─────────────────────────────────────────────────────────
function LockedCard({ a }: { a: Achievement }) {
  const style = CATEGORY_STYLE[a.category] ?? CATEGORY_STYLE.score;
  const Icon = ICON_MAP[a.icon] ?? Star;
  const pct = a.target > 0 ? Math.round((a.progress / a.target) * 100) : 0;
  return (
    <Card className="rounded-xl opacity-70">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0 relative">
          <Icon className={`h-5 w-5 ${style.text} opacity-50`} />
          <Lock className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-muted-foreground bg-background rounded-full p-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{a.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{a.progress} / {a.target}</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AchievementsPage() {
  const { data, isLoading, isError } = useStudentAchievements();

  const earned = data?.earned ?? [];
  const locked = data?.locked ?? [];
  const total_earned = data?.total_earned ?? 0;
  const total_available = data?.total_available ?? 0;

  // Group locked by category for display
  const lockedByCategory = locked.reduce<Record<string, Achievement[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Achievements" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Badges and milestones earned on your reading journey
            </p>
          </div>
          {!isLoading && data && (
            <div className="flex items-center gap-2 rounded-xl border px-4 py-2 bg-muted/30">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-semibold">
                {total_earned} / {total_available} earned
              </span>
            </div>
          )}
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load achievements. Please refresh.</AlertDescription>
          </Alert>
        )}

        {/* Overall progress bar */}
        {!isLoading && data && (
          <Card className="rounded-xl">
            <CardContent className="p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {total_earned} of {total_available} badges
                </span>
              </div>
              <Progress
                value={total_available > 0 ? (total_earned / total_available) * 100 : 0}
                className="h-3"
              />
              <div className="flex gap-3 mt-3 flex-wrap">
                {Object.entries(CATEGORY_LABEL).map(([key, label]) => {
                  const earnedInCat = earned.filter(a => a.category === key).length;
                  const totalInCat = [...earned, ...locked].filter(a => a.category === key).length;
                  const style = CATEGORY_STYLE[key];
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <span className={`inline-block h-2 w-2 rounded-full ${style.bg.split(" ")[0].replace("bg-", "bg-")}`} />
                      <span className="text-muted-foreground">{label}: {earnedInCat}/{totalInCat}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* No achievements yet */}
        {!isLoading && earned.length === 0 && (
          <Card className="rounded-xl border-dashed">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No badges earned yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your first reading session to start earning badges!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Earned badges */}
        {!isLoading && earned.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Earned ({earned.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {earned.map(a => <EarnedCard key={a.id} a={a} />)}
            </div>
          </div>
        )}

        {/* Locked badges grouped by category */}
        {!isLoading && locked.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Locked ({locked.length})
            </h2>
            {Object.entries(lockedByCategory).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${CATEGORY_STYLE[category]?.text}`}>
                    {CATEGORY_LABEL[category]}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map(a => <LockedCard key={a.id} a={a} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
