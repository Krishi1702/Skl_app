"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { KpiCard } from "@/components/admin/kpi-card";
import { useAdminDashboard } from "@/hooks/use-admin-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, GraduationCap, School, BookOpen, Activity, AlertCircle, UserX, BookMarked
} from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useAdminDashboard();

  if (isError) {
    return (
      <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load dashboard data. Please refresh the page.</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">School-wide overview</p>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            title="Total Classes"
            value={isLoading ? "–" : data!.summary.total_classes}
            icon={School}
            iconColor="text-blue-600"
            iconBg="bg-blue-100 dark:bg-blue-900"
            loading={isLoading}
          />
          <KpiCard
            title="Total Sections"
            value={isLoading ? "–" : data!.summary.total_sections}
            icon={BookOpen}
            iconColor="text-purple-600"
            iconBg="bg-purple-100 dark:bg-purple-900"
            loading={isLoading}
          />
          <KpiCard
            title="Total Teachers"
            value={isLoading ? "–" : data!.summary.total_teachers}
            icon={Users}
            iconColor="text-green-600"
            iconBg="bg-green-100 dark:bg-green-900"
            loading={isLoading}
          />
          <KpiCard
            title="Total Students"
            value={isLoading ? "–" : data!.summary.total_students}
            icon={GraduationCap}
            iconColor="text-orange-600"
            iconBg="bg-orange-100 dark:bg-orange-900"
            loading={isLoading}
          />
          <KpiCard
            title="Unassigned Teachers"
            value={isLoading ? "–" : data!.summary.unassigned_teachers}
            icon={UserX}
            iconColor="text-red-600"
            iconBg="bg-red-100 dark:bg-red-900"
            loading={isLoading}
          />
          <KpiCard
            title="Unassigned Students"
            value={isLoading ? "–" : data!.summary.unassigned_students}
            icon={UserX}
            iconColor="text-yellow-600"
            iconBg="bg-yellow-100 dark:bg-yellow-900"
            loading={isLoading}
          />
        </div>

        {/* Weekly Activity */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">This Week&apos;s Activity</CardTitle>
            <CardDescription>Key metrics for the current week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BookMarked className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Lessons Uploaded</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{data!.weekly_activity.lessons_uploaded}</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Sessions Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{data!.weekly_activity.reading_sessions_completed}</p>
                </div>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Active Students</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{data!.weekly_activity.active_students}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unassigned Users */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-500" />
              Unassigned Users
            </CardTitle>
            <CardDescription>Users not yet assigned to a section</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : !data?.unassigned_users?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">All users are assigned.</p>
            ) : (
              <div className="space-y-2">
                {data!.unassigned_users.map((user) => {
                  const initials = user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize text-xs">{user.role}</Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
