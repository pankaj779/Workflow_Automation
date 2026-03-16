import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall } from "@/lib/api-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowLeft, User, Calendar, Snowflake, TrendingUp, Activity, Clock } from "lucide-react";

interface KPI {
  id: string;
  name: string;
}

interface Metrics {
  kpi_id: string;
  kpi_name: string;
  owner_team?: string;
  created_at?: string;
  last_used_at?: string;
  storage_status?: string;
  cold_move_count: number;
  reports_using: number;
  total_reports: number;
  usage_percentage: number;
}

export default function KpiMetricsPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedKpiId, setSelectedKpiId] = useState<string>("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const kpiRes = await apiCall<any[]>("getKPIs");
        const items = (kpiRes || []).map(k => ({ id: k.id, name: k.name }));
        setKpis(items);
        if (items.length > 0) {
          setSelectedKpiId(items[0].id);
        }
      } catch (e) {
        console.error("Failed to load KPIs", e);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedKpiId) return;
    async function loadMetrics() {
      setIsLoading(true);
      try {
        const res = await apiCall<Metrics>("getKPIMetrics", {
          params: { kpiId: selectedKpiId },
        });
        setMetrics(res);
      } catch (e) {
        console.error("Failed to load KPI metrics", e);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, [selectedKpiId]);

  const getUsageColor = (pct: number) => {
    if (pct >= 75) return "text-green-500";
    if (pct >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getUsageLabel = (pct: number) => {
    if (pct >= 75) return "High Usage";
    if (pct >= 40) return "Moderate";
    return "Low Usage";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">KPI Insights</h1>
              <p className="text-xs text-muted-foreground">
                Deep analytics on KPI usage, health, and lifecycle
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Library
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* KPI Selector */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">Analyze KPI:</label>
              <Select value={selectedKpiId} onValueChange={setSelectedKpiId}>
                <SelectTrigger className="w-full sm:w-80 h-10">
                  <SelectValue placeholder="Choose a KPI to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {kpis.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kpis.length === 0 && (
                <p className="text-xs text-muted-foreground">No KPIs available. Create one first.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Activity className="h-6 w-6 text-primary animate-pulse" />
            <span className="ml-2 text-sm text-muted-foreground">Loading metrics...</span>
          </div>
        )}

        {metrics && !isLoading && (
          <>
            {/* Stats Cards Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Usage Rating</p>
                      <p className={`text-xl font-bold ${getUsageColor(metrics.usage_percentage)}`}>
                        {metrics.usage_percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Used in Reports</p>
                      <p className="text-xl font-bold text-foreground">
                        {metrics.reports_using}
                        <span className="text-xs font-normal text-muted-foreground ml-1">/ {metrics.total_reports}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Snowflake className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Cold Moves</p>
                      <p className="text-xl font-bold text-foreground">{metrics.cold_move_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Activity className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Status</p>
                      <Badge
                        variant={metrics.storage_status === "cold" ? "destructive" : "outline"}
                        className="mt-0.5 capitalize"
                      >
                        {metrics.storage_status || "active"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed View */}
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Usage Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Usage across reports</span>
                      <Badge variant="outline" className={`text-[10px] ${getUsageColor(metrics.usage_percentage)}`}>
                        {getUsageLabel(metrics.usage_percentage)}
                      </Badge>
                    </div>
                    <Progress value={metrics.usage_percentage} className="h-3 rounded-full" />
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      This KPI is used in <strong>{metrics.reports_using}</strong> out of <strong>{metrics.total_reports}</strong> total reports
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Owner</p>
                        <p className="text-sm font-medium text-foreground">{metrics.owner_team || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Created</p>
                        <p className="text-sm font-medium text-foreground">
                          {metrics.created_at ? new Date(metrics.created_at).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Last Used</p>
                        <p className="text-sm font-medium text-foreground">
                          {metrics.last_used_at ? new Date(metrics.last_used_at).toLocaleDateString() : "Never"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30">
                      <Snowflake className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Cold Moves</p>
                        <p className="text-sm font-medium text-foreground">{metrics.cold_move_count} time(s)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Health Score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center py-4">
                    <div className="relative w-28 h-28">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-secondary" />
                        <circle
                          cx="60" cy="60" r="50" fill="none"
                          strokeWidth="10"
                          strokeDasharray={`${metrics.usage_percentage * 3.14} 314`}
                          strokeLinecap="round"
                          className={metrics.usage_percentage >= 75 ? "stroke-green-500" : metrics.usage_percentage >= 40 ? "stroke-amber-500" : "stroke-red-500"}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">
                          {metrics.usage_percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold mt-3 ${getUsageColor(metrics.usage_percentage)}`}>
                      {getUsageLabel(metrics.usage_percentage)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    {metrics.usage_percentage >= 75
                      ? "This KPI is widely used and provides high business value."
                      : metrics.usage_percentage >= 40
                      ? "This KPI has moderate usage. Consider promoting it in more reports."
                      : "This KPI has low usage and may be a candidate for cold storage review."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {!metrics && !isLoading && selectedKpiId && (
          <Card className="border-dashed border-2 border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No metrics available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Metrics will appear once reports are created using this KPI.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
