import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle, Loader2 } from "lucide-react";

type Status = 'pending' | 'running' | 'complete' | 'passed' | 'failed' | 'error' | 'active';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<Status, { icon: React.ElementType; className: string; defaultLabel: string }> = {
  pending: {
    icon: Clock,
    className: "bg-muted text-muted-foreground",
    defaultLabel: "Pending",
  },
  running: {
    icon: Loader2,
    className: "bg-primary/10 text-primary",
    defaultLabel: "Running",
  },
  complete: {
    icon: Check,
    className: "bg-success/10 text-success",
    defaultLabel: "Complete",
  },
  passed: {
    icon: Check,
    className: "bg-success/10 text-success",
    defaultLabel: "Passed",
  },
  failed: {
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive",
    defaultLabel: "Failed",
  },
  error: {
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive",
    defaultLabel: "Error",
  },
  active: {
    icon: Check,
    className: "bg-success/10 text-success",
    defaultLabel: "Active",
  },
};

export function StatusBadge({ status, label, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn("h-3 w-3", status === 'running' && "animate-spin")}
        />
      )}
      {label || config.defaultLabel}
    </span>
  );
}

interface PipelineStatusProps {
  phases: Array<{ name: string; status: Status }>;
  className?: string;
}

export function PipelineStatus({ phases, className }: PipelineStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {phases.map((phase, index) => (
        <div key={phase.name} className="flex items-center">
          <StatusBadge status={phase.status} label={phase.name} />
          {index < phases.length - 1 && (
            <div className="w-8 h-0.5 bg-border mx-2" />
          )}
        </div>
      ))}
    </div>
  );
}