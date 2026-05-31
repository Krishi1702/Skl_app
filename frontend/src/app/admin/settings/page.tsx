"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <AdminLayout breadcrumbs={[{ label: "Admin" }, { label: "Settings" }]}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform configuration</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            School settings configuration is not yet available. The API does not expose settings
            management endpoints. User account management (activate/deactivate) is available
            on the Teachers and Students pages.
          </AlertDescription>
        </Alert>

        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Available Actions</CardTitle>
            </div>
            <CardDescription>What you can configure through the admin portal</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[
                "Activate / deactivate teacher accounts — Teachers page",
                "Activate / deactivate student accounts — Students page",
                "Activate / deactivate class sections — Sections page",
                "Activate / deactivate classes — Classes page",
                "Assign teachers to sections — Teacher Assignments page",
                "Assign students to sections — Student Assignments page",
                "Move students between sections — Student Assignments page",
              ].map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
