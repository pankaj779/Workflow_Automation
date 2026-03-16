import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Workflow, Plus, Search, RefreshCw, Sparkles, LayoutGrid, List, Star, Bell, FileBarChart, Snowflake, BarChart3 } from "lucide-react";
import { DraftsDrawer } from "./DraftsDrawer";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

interface DraftKPI {
  id: string;
  name: string;
  step: number;
  stepName: string;
  lastModified: string;
  table: string;
}

interface KPILibraryHeaderProps {
  onCreateNew: () => void;
  lastSync: string;
  drafts?: DraftKPI[];
  onResumeDraft?: (draftId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  favoriteCount: number;
}

export function KPILibraryHeader({
  onCreateNew,
  lastSync,
  drafts = [],
  onResumeDraft = () => {},
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  favoriteCount,
}: KPILibraryHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "KPI Library", icon: LayoutGrid },
    { path: "/reports", label: "Reports", icon: FileBarChart },
    { path: "/kpi-metrics", label: "KPI Metrics", icon: BarChart3 },
    { path: "/cold-storage", label: "Cold Storage", icon: Snowflake },
  ];

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo and title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Workflow className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Workflow Automation Tool</h1>
              <p className="text-xs text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>
                Last sync: {lastSync}
              </p>
            </div>
            <nav className="ml-6 flex items-center gap-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    location.pathname === path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onCreateNew} 
                    size="sm"
                    className="relative gap-1.5 px-4 bg-gradient-to-r from-gold to-gold-light hover:from-gold-light hover:to-gold text-gold-foreground font-semibold shadow-[0_4px_14px_0_hsl(43_96%_50%/0.4)] hover:shadow-[0_6px_20px_0_hsl(43_96%_50%/0.5)] transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    New KPI
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Create a new KPI definition using the guided wizard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {drafts.length > 0 && (
              <DraftsDrawer drafts={drafts} onResumeDraft={onResumeDraft} />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 relative"
                    onClick={() => {
                      // Navigate to KPI metrics or notifications page when added
                      // For now this is a visual bell placeholder.
                    }}
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border border-background" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Notifications (cold storage, reports, and KPI events)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-center">
                  <p className="text-xs">Refresh KPI library from source tables including SQL definitions, metadata signatures, and lineage data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* KPI Library Title */}
        <div className="mt-3 mb-2">
          <h2 className="text-xl font-bold text-foreground">KPI Library</h2>
          <p className="text-xs text-muted-foreground">Discover, explore and manage your organization's key performance indicators</p>
        </div>

        {/* AI-Powered Search Bar */}
        <div className="relative mb-2">
          <div className="relative flex items-center">
            <div className="absolute left-4 flex items-center gap-2 pointer-events-none">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ask AI to find KPIs... e.g., 'Show me all sales KPIs with daily frequency'"
              className="w-full h-12 pl-11 pr-24 text-sm bg-background border-2 border-primary/20 focus:border-primary rounded-xl shadow-sm"
            />
            <div className="absolute right-2 flex items-center gap-2">
              <Button size="sm" className="h-8 gap-1.5 rounded-lg">
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Favorites Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleFavoritesOnly}
                    className={cn(
                      "relative flex items-center justify-center h-8 w-8 rounded-md transition-all",
                      showFavoritesOnly 
                        ? "bg-gold/15 text-gold ring-1 ring-gold" 
                        : "text-muted-foreground hover:text-gold hover:bg-gold/10"
                    )}
                  >
                    <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
                    {favoriteCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-gold text-[9px] font-bold text-gold-foreground">
                        {favoriteCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{showFavoritesOnly ? "Show all KPIs" : "Show favorites only"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Select defaultValue="all-status">
              <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all-freq">
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                <SelectValue placeholder="All Frequencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-freq">All Frequencies</SelectItem>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all-owners">
              <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-owners">All Owners</SelectItem>
                <SelectItem value="me">My KPIs</SelectItem>
                <SelectItem value="team">Team KPIs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <TooltipProvider>
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ToggleGroup 
                      type="single" 
                      value={viewMode} 
                      onValueChange={(value) => value && onViewModeChange(value as 'list' | 'grid')}
                      className="bg-muted rounded-md p-0.5"
                    >
                      <ToggleGroupItem value="list" aria-label="List view" className="h-7 w-7 p-0 data-[state=on]:bg-background">
                        <List className="h-3.5 w-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="grid" aria-label="Grid view" className="h-7 w-7 p-0 data-[state=on]:bg-background">
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Switch between list and grid view</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
