import { cn } from "@/lib/utils";
import { Layers, CheckCircle2, FolderOpen, Calendar, TrendingUp } from "lucide-react";

interface StatItem {
  label: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
}

interface KPIStatsBarProps {
  stats: {
    totalKPIs?: number;
    activeKPIs?: number;
    categories?: number;
    thisMonth?: number;
    thisWeek?: number;
    changes?: {
      totalKPIs?: number;
      activeKPIs?: number;
      categories?: number;
      thisMonth?: number;
      thisWeek?: number;
    };
  } | null;
}

const defaultStats = {
  totalKPIs: 0,
  activeKPIs: 0,
  categories: 0,
  thisMonth: 0,
  thisWeek: 0,
  changes: {
    totalKPIs: 0,
    activeKPIs: 0,
    categories: 0,
    thisMonth: 0,
    thisWeek: 0,
  },
};

export function KPIStatsBar({ stats: statsProp }: KPIStatsBarProps) {
  const stats = statsProp ?? defaultStats;
  const changes = stats.changes ?? defaultStats.changes;
  const items: StatItem[] = [
    {
      label: "Total KPIs",
      value: stats.totalKPIs ?? 0,
      change: changes.totalKPIs,
      changeLabel: "from last period",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      label: "Active KPIs",
      value: stats.activeKPIs ?? 0,
      change: changes.activeKPIs,
      changeLabel: "from last period",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      label: "This Week",
      value: stats.thisWeek ?? 0,
      change: changes.thisWeek,
      changeLabel: "from last period",
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      label: "This Month",
      value: stats.thisMonth ?? 0,
      change: changes.thisMonth,
      changeLabel: "from last period",
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((item, index) => (
        <div key={item.label} className="card-enterprise p-3">
          <div className="flex items-start justify-between">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              {item.icon}
            </div>
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-semibold text-foreground">{item.value}</span>
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
          </div>
          {item.change !== undefined && (
            <p className="text-[10px] text-success mt-1.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{item.change}% {item.changeLabel}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}