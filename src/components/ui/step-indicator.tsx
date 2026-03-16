import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: number;
  name: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  onStepClick?: (stepId: number) => void;
}

export function StepIndicator({ steps, currentStep, className, onStepClick }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;
          const isClickable = onStepClick && (isComplete || isCurrent);

          return (
            <li key={step.id} className="flex-1 relative">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center w-full",
                  isClickable && "cursor-pointer group",
                  !isClickable && isPending && "cursor-not-allowed"
                )}
              >
                {/* Connector Line */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2",
                      isComplete ? "bg-primary" : "bg-border"
                    )}
                    style={{ width: 'calc(100% - 2rem)', right: 'calc(50% + 1rem)' }}
                  />
                )}

                {/* Step Circle */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                    isComplete && "bg-success border-success text-success-foreground",
                    isCurrent && "bg-primary border-primary text-primary-foreground ring-2 ring-primary/20",
                    isPending && "bg-card border-border text-muted-foreground",
                    isClickable && "group-hover:ring-2 group-hover:ring-primary/30"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{step.id}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCurrent && "text-primary",
                      isComplete && "text-foreground",
                      isPending && "text-muted-foreground",
                      isClickable && "group-hover:text-primary"
                    )}
                  >
                    {step.name}
                  </span>
                  {step.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface MiniStepIndicatorProps {
  total: number;
  current: number;
  className?: string;
}

export function MiniStepIndicator({ total, current, className }: MiniStepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            index + 1 === current ? "w-8 bg-primary" : "w-2",
            index + 1 < current && "bg-primary",
            index + 1 > current && "bg-border"
          )}
        />
      ))}
    </div>
  );
}