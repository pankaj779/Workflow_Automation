import { useEffect, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Workflow, Plus, Search, RefreshCw, Sparkles, LayoutGrid, List, Star, Bell, FileBarChart, Snowflake, BarChart3, Shield, Trash2 } from "lucide-react";
import { DraftsDrawer } from "./DraftsDrawer";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { apiCall } from "@/lib/api-config";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

interface AppNotification {
  notification_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at?: string;
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
  const { user } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const loadNotifications = async () => {
    if (!user?.email) return;
    // #region agent log
    fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f798bc'},body:JSON.stringify({sessionId:'f798bc',runId:'post-fix',hypothesisId:'H7',location:'KPILibraryHeader.tsx:loadNotifications',message:'loading notifications for current user',data:{hasEmail:Boolean(user?.email)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      const rows = await apiCall<AppNotification[]>("listNotifications", {
        queryParams: { user_id: user.email },
      });
      setNotifications(Array.isArray(rows) ? rows : []);
    } catch {
      setNotifications([]);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f798bc'},body:JSON.stringify({sessionId:'f798bc',runId:'post-fix',hypothesisId:'H8',location:'KPILibraryHeader.tsx:markNotificationRead',message:'marking notification as read',data:{notificationId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      await apiCall("markNotificationRead", {
        params: { notificationId },
      });
      await loadNotifications();
    } catch {
      // no-op
    }
  };

  const deleteNotification = async (notificationId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // #region agent log
    fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f798bc'},body:JSON.stringify({sessionId:'f798bc',runId:'post-fix',hypothesisId:'H12',location:'KPILibraryHeader.tsx:deleteNotification',message:'delete notification clicked',data:{notificationId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      await apiCall("deleteNotification", {
        params: { notificationId },
        queryParams: user?.email ? { user_id: user.email } : undefined,
      });
      await loadNotifications();
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.email]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navItems = [
    { path: "/", label: "KPI Library", icon: LayoutGrid },
    { path: "/reports", label: "Reports", icon: FileBarChart },
    { path: "/kpi-metrics", label: "KPI Metrics", icon: BarChart3 },
    { path: "/cold-storage", label: "Cold Storage", icon: Snowflake },
    ...(user?.isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
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
                  <span className="inline-block">
                    <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 relative"
                          onClick={() => loadNotifications()}
                        >
                          <Bell className="h-4 w-4" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary border border-background text-[9px] text-primary-foreground flex items-center justify-center">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[360px] p-0">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-sm font-medium">Notifications</p>
                        <p className="text-[11px] text-muted-foreground">Cold storage and KPI events</p>
                      </div>
                      <div className="max-h-[320px] overflow-auto">
                        {notifications.length === 0 ? (
                          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.notification_id}
                              onClick={() => markNotificationRead(n.notification_id)}
                              className={cn(
                                "w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors",
                                !n.is_read && "bg-primary/5",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-foreground line-clamp-2">{n.title}</p>
                                {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                              {n.created_at && (
                                <p className="text-[10px] text-muted-foreground/80 mt-1">
                                  {new Date(n.created_at).toLocaleString()}
                                </p>
                              )}
                              <div className="mt-1 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => deleteNotification(n.notification_id, e)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      </PopoverContent>
                    </Popover>
                  </span>
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
