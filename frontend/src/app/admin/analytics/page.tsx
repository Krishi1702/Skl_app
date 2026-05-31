"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useAdminDashboard } from "@/hooks/use-admin-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, AlertCircle, School, Users, GraduationCap, BookOpen, Activity, BookMarked, UserX } from "lucide-react";

export default function AnalyticsPage() {
  const { data, isLoading, isError } = useAdminDashboard();

  return (
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Analytics" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">School performance overview</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Historical charts and trend analytics are not yet available — the API does not expose
            time-series data. The stats below are current snapshot values from the dashboard API.
          </AlertDescription>
        </Alert>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load analytics data. Please refresh.</AlertDescription>
          </Alert>
        )}

        {/* Summary stats */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">School Summary</CardTitle>
            <CardDescription>Current snapshot of school-wide metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Classes", value: data!.summary.total_classes, icon: School, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
                  { label: "Total Sections", value: data!.summary.total_sections, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
                  { label: "Total Teachers", value: data!.summary.total_teachers, icon: Users, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
                  { label: "Total Students", value: data!.summary.total_students, icon: GraduationCap, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
                  { label: "Unassigned Teachers", value: data!.summary.unassigned_teachers, icon: UserX, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
                  { label: "Unassigned Students", value: data!.summary.unassigned_students, icon: UserX, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-lg ${item.bg} p-4 flex items-center gap-3`}>
                    <item.icon className={`h-6 w-6 ${item.color} flex-shrink-0`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">This Week&apos;s Activity</CardTitle>
            <CardDescription>Activity counts for the current week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 text-center">
                  <BookMarked className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600">{data!.weekly_activity.lessons_uploaded}</p>
                  <p className="text-xs text-muted-foreground mt-1">Lessons Uploaded</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
                  <Activity className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-600">{data!.weekly_activity.reading_sessions_completed}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sessions Completed</p>
                </div>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-4 text-center">
                  <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-purple-600">{data!.weekly_activity.active_students}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active Students</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
