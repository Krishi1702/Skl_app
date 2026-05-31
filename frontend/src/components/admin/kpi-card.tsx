import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
}

export function KpiCard({ title, value, change, changePositive = true, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", loading }: KpiCardProps) {
  if (loading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {change && (
              <p className={cn("text-xs mt-1", changePositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {changePositive ? "↑" : "↓"} {change}
              </p>
            )}
          </div>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
