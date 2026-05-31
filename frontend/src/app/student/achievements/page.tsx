"use client";
import { StudentLayout } from "@/components/layout/student-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, Flame, BookOpen, Clock } from "lucide-react";

const PLANNED = [
  { icon: Flame, title: "Streak Rewards", description: "Badges for maintaining daily reading streaks" },
  { icon: Star, title: "Score Milestones", description: "Awards for reaching score thresholds" },
  { icon: BookOpen, title: "Lesson Completion", description: "Badges for finishing lessons and sections" },
  { icon: Clock, title: "Consistency Awards", description: "Recognition for regular practice" },
];

export default function AchievementsPage() {
  return (
    <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Achievements" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Badges and milestones for your reading journey
          </p>
        </div>

        {/* Honest notice — no achievements API exists */}
        <Card className="rounded-xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Trophy className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-lg font-semibold">Achievements Not Yet Available</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                The achievements system is not yet implemented on the backend.
                This page will be activated once the{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /student/achievements</code>{" "}
                endpoint is available.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Planned features — clearly labeled as planned, not implemented */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Planned Achievements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANNED.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="rounded-xl opacity-50">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
