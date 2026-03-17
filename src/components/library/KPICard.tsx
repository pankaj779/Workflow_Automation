import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  Clock, 
  User, 
  Star, 
  ChevronDown, 
  ChevronUp,
  Info,
  Calculator,
  Code,
  Copy,
  Settings,
  FileText,
} from "lucide-react";

interface DownstreamUsage {
  name: string;
  type: 'dashboard' | 'report';
  frequency: string;
}

interface KPICardProps {
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
  viewMode?: 'list' | 'grid';
  onToggleFavorite?: (id: string) => void;
  onClick?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  sales: <TrendingUp className="h-4 w-4" />,
  demand: <FileText className="h-4 w-4" />,
  execution: <Settings className="h-4 w-4" />,
  leading: <Star className="h-4 w-4" />,
  lagging: <Clock className="h-4 w-4" />,
};

export function KPICard({
  id,
  name,
  status,
  frequency,
  owner,
  lastUpdated,
  qualityScore,
  linkedAssets,
  isFavorite,
  definition,
  businessFormula,
  dataSource,
  businessUnit,
  complexity,
  nextUpdate,
  downstreamUsage,
  category,
  viewMode = 'list',
  onToggleFavorite,
  onClick,
}: KPICardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(id);
  };

  if (viewMode === 'grid') {
    return (
      <div 
        className="card-enterprise overflow-hidden flex flex-col h-full cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
        onClick={onClick}
      >
        <div className="px-2.5 py-2.5 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <div className="p-1.5 rounded-md shrink-0 bg-primary/10 text-primary">
              {categoryIcons[category] || <TrendingUp className="h-3.5 w-3.5" />}
            </div>
            <button 
              onClick={handleFavoriteClick}
              className={cn(
                "p-0.5 transition-colors",
                isFavorite ? "text-gold" : "text-muted-foreground hover:text-gold"
              )}
            >
              <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
            </button>
          </div>
          
          {/* Title */}
          <h3 className="font-medium text-xs text-foreground mb-1.5 line-clamp-2">{name}</h3>
          
          {/* Meta */}
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="text-success border-success/40 bg-success/5 text-[10px] px-1.5 py-0 h-4">
              {status}
            </Badge>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {frequency}
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {owner}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-2.5 py-1.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
          Updated {formatDate(lastUpdated)}
        </div>
      </div>
    );
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className="card-enterprise overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {/* Main row - compact */}
      <div className="px-2 py-1.5 flex items-center gap-2">
        {/* Info */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <h3 className="font-medium text-sm text-foreground truncate min-w-[160px]">{name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-success border-success/40 bg-success/5 text-[10px] px-1.5 py-0 h-5">
              {status}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {frequency}
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <User className="h-3 w-3" />
              {owner}
            </span>
            <span className="hidden lg:flex items-center gap-1 text-muted-foreground/70">
              {formatDate(lastUpdated)}
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button 
            onClick={handleFavoriteClick}
            className={cn(
              "p-1 transition-colors",
              isFavorite ? "text-gold" : "text-muted-foreground hover:text-gold"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </button>
          <button 
            onClick={handleExpandClick}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-2 py-2 bg-muted/30 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Definition */}
            <div className="lg:col-span-2">
              <h4 className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                <Info className="h-3 w-3" />
                Definition
              </h4>
              <p className="text-xs text-foreground leading-relaxed">{definition}</p>
            </div>

            {/* Formula */}
            <div>
              <h4 className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                <Calculator className="h-3 w-3" />
                Formula
              </h4>
              <code className="block px-2 py-1.5 bg-background rounded border border-border text-xs font-mono text-primary truncate">
                {businessFormula}
              </code>
            </div>

            {/* Config */}
            <div>
              <h4 className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                <Settings className="h-3 w-3" />
                Config
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium text-foreground">{dataSource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit</span>
                  <span className="font-medium text-foreground">{businessUnit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SQL Section - collapsible within expanded */}
          <details className="mt-3">
            <summary className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground uppercase tracking-wide">
              <Code className="h-3 w-3" />
              SQL Implementation
            </summary>
            <div className="mt-2 bg-foreground/95 rounded-md p-2 text-xs">
              <div className="flex items-center justify-end mb-1">
                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-muted-foreground px-2">
                  <Copy className="h-2.5 w-2.5 mr-1" />
                  Copy
                </Button>
              </div>
              <pre className="text-primary-foreground overflow-x-auto text-[10px] leading-relaxed">
                <code>{`-- ${name}
SELECT date_dim.fiscal_period, SUM(fact.amount) as total
FROM fact_table fact
JOIN date_dim ON fact.date_id = date_dim.id
WHERE date_dim.fiscal_year = YEAR(CURRENT_DATE)
GROUP BY 1 ORDER BY 1`}</code>
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
