import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'card' | 'table' | 'button' | 'circle';
  lines?: number;
}

export function SkeletonLoader({ className, variant = 'text', lines = 1 }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div className={cn("rounded-xl border border-border/50 bg-card p-6 space-y-4", className)}>
        <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
        <div className="h-8 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn("rounded-xl border border-border/50 bg-card overflow-hidden", className)}>
        <div className="bg-muted/50 p-4 border-b border-border/50">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 w-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-4 w-24 bg-muted rounded animate-pulse" style={{ animationDelay: `${(i + j) * 100}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'button') {
    return <div className={cn("h-10 w-32 bg-muted rounded-lg animate-pulse", className)} />;
  }

  if (variant === 'circle') {
    return <div className={cn("h-12 w-12 bg-muted rounded-full animate-pulse", className)} />;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted rounded animate-pulse"
          style={{
            width: i === lines - 1 && lines > 1 ? '60%' : '100%',
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="bg-secondary/50 p-4 border-b border-border/50">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 w-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div
                key={j}
                className="h-4 w-24 bg-muted rounded animate-pulse"
                style={{ animationDelay: `${(i + j) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="h-10 w-20 bg-muted rounded animate-pulse" />
      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
    </div>
  );
}

export function StepSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      <div className="space-y-4">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}