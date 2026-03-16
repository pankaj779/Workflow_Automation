import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  User,
  Star,
  Info,
  Calculator,
  Code,
  Copy,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DownstreamUsage {
  name: string;
  type: 'dashboard' | 'report';
  frequency: string;
}

interface KPIDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: {
    id: string;
    name: string;
    status: string;
    frequency: string;
    owner: string;
    lastUpdated: string;
    qualityScore: number;
    linkedAssets: number;
    isFavorite: boolean;
    definition: string;
    businessFormula: string;
    dataSource: string;
    businessUnit: string;
    complexity: string;
    nextUpdate: string;
    downstreamUsage: DownstreamUsage[];
    category: string;
  } | null;
  onToggleFavorite?: (id: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  sales: <TrendingUp className="h-5 w-5" />,
  demand: <FileText className="h-5 w-5" />,
  execution: <Settings className="h-5 w-5" />,
  leading: <Star className="h-5 w-5" />,
  lagging: <Clock className="h-5 w-5" />,
};

export function KPIDetailModal({ open, onOpenChange, kpi, onToggleFavorite }: KPIDetailModalProps) {
  if (!kpi) return null;

  const formatDate = (dateString: string) => {
    if(!dateString) return "--";

    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCopySQL = () => {
    const sqlText = kpi.sqlDefinition || "No SQL definition available";
    navigator.clipboard.writeText(sqlText);
    toast.success("SQL copied to clipboard");
  };

  const handleFavoriteClick = () => {
    onToggleFavorite?.(kpi.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              {categoryIcons[kpi.category] || <TrendingUp className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-semibold">{kpi.name}</DialogTitle>
                <button
                  onClick={handleFavoriteClick}
                  className={cn(
                    "p-1 transition-colors",
                    kpi.isFavorite ? "text-gold" : "text-muted-foreground hover:text-gold"
                  )}
                >
                  <Star className={cn("h-4 w-4", kpi.isFavorite && "fill-current")} />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-success border-success/40 bg-success/5 text-xs">
                  {kpi.status}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {kpi.frequency}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {kpi.owner}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Definition */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              <Info className="h-3.5 w-3.5" />
              Definition
            </h4>
            <p className="text-sm text-foreground leading-relaxed">{kpi.definition}</p>
          </div>

          {/* Formula */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              <Calculator className="h-3.5 w-3.5" />
              Business Formula
            </h4>
            <code className="block px-3 py-2 bg-muted rounded-md border border-border text-sm font-mono text-primary">
              {kpi.businessFormula}
            </code>
          </div>

          {/* Config */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              <Settings className="h-3.5 w-3.5" />
              Configuration
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Data Source</span>
                <span className="font-medium text-foreground">{kpi.dataSource}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Business Unit</span>
                <span className="font-medium text-foreground">{kpi.businessUnit}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Complexity</span>
                <span className="font-medium text-foreground">{kpi.complexity}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Next Update</span>
                <span className="font-medium text-foreground">{formatDate(kpi.nextUpdate)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Quality Score</span>
                <span className="font-medium text-foreground">{kpi.qualityScore}%</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Linked Assets</span>
                <span className="font-medium text-foreground">{kpi.linkedAssets}</span>
              </div>
            </div>
          </div>

          {/* SQL Implementation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Code className="h-3.5 w-3.5" />
                SQL Implementation
              </h4>
              <Button variant="ghost" size="sm" onClick={handleCopySQL} className="h-7 text-xs">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="bg-foreground/95 rounded-lg p-3">
              <pre className="text-primary-foreground overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap">
                <code>{`-- ${kpi.name}\n${kpi.sqlDefinition || "No SQL definition available"}`}</code>
              </pre>
            </div>
          </div>

          {/* Last Updated */}
          <div className="pt-3 border-t border-border text-xs text-muted-foreground">
            Last updated: {formatDate(kpi.lastUpdated)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
