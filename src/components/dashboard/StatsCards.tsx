import { TrendingUp, Calendar, CalendarDays, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "card-enterprise p-6 transition-all duration-300 hover:shadow-enterprise-lg hover:-translate-y-1",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <TrendingUp className={cn("h-3 w-3", !trend.isPositive && "rotate-180")} />
              <span>{trend.isPositive ? '+' : ''}{trend.value}% from last period</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

interface StatsCardsProps {
  stats: {
    total: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  };
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-enterprise p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-10 bg-muted rounded-xl animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total KPIs"
        value={stats.total}
        description="All time metrics created"
        icon={Database}
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="Created Today"
        value={stats.createdToday}
        description="New metrics today"
        icon={Calendar}
      />
      <StatCard
        title="This Week"
        value={stats.createdThisWeek}
        description="Last 7 days"
        icon={CalendarDays}
        trend={{ value: 8, isPositive: true }}
      />
      <StatCard
        title="This Month"
        value={stats.createdThisMonth}
        description="Last 30 days"
        icon={TrendingUp}
        trend={{ value: 24, isPositive: true }}
      />
    </div>
  );
}