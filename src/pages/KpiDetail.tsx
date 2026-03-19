import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiCall } from "@/lib/api-config";
import { DefaultService } from "@/api-client";
import { apiConfig } from "@/lib/api-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BarChart3,
  Info,
  Code,
  Copy,
  FileText,
  User,
  Calendar,
  Clock,
  Snowflake,
  Star,
  Activity,
  FileBarChart,
  Plus,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function inferChartKeys(rows: Record<string, unknown>[]) {
  if (!rows.length) return { valueKey: "kpi_value", labelKey: "brand" };
  const keys = Object.keys(rows[0]);
  const valueKey =
    keys.find((k) => k.toLowerCase() === "kpi_value" || k.toLowerCase() === "value") || keys[keys.length - 1];
  const labelKey =
    keys.find((k) =>
      ["brand", "name", "category", "label", "dimension", "segment"].includes(k.toLowerCase()),
    ) || keys[0];
  return { valueKey, labelKey };
}

interface KPIDetail {
  kpi_id: string;
  kpi_name: string;
  description?: string;
  business_formula?: string;
  sql_definition?: string;
  data_source?: string;
  business_unit?: string;
  status?: string;
  frequency?: string;
  owner_team?: string;
  lastUpdated?: string;
  updated_at?: string;
  isFavorite?: boolean;
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
  report_names?: { report_id: string; report_name: string }[];
}

interface ReportWithData {
  report_id: string;
  report_name: string;
  description?: string;
  kpis: { kpi_id: string; kpi_name: string; rows: Record<string, unknown>[] }[];
}

export default function KpiDetailPage() {
  const navigate = useNavigate();
  const { kpiId } = useParams<{ kpiId: string }>();
  const [kpi, setKpi] = useState<KPIDetail | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reportCharts, setReportCharts] = useState<ReportWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`${apiConfig.baseUrl}/me`).then((r) => r.json());
        setCurrentUserEmail(res.email || "");
      } catch {
        // ignore
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!kpiId) return;
    async function load() {
      setLoading(true);
      try {
        const [detailRes, metricsRes] = await Promise.all([
          apiCall<KPIDetail>("getKPIDetail", { params: { kpiId } }),
          apiCall<Metrics>("getKPIMetrics", { params: { kpiId } }),
        ]);
        setKpi(detailRes);
        setMetrics(metricsRes);

        if (metricsRes?.report_names?.length) {
          const reportsData = await Promise.all(
            metricsRes.report_names.map((r) =>
              apiCall<ReportWithData>("getReportData", { params: { reportId: r.report_id } }).catch(() => null),
            ),
          );
          setReportCharts(reportsData.filter((r): r is ReportWithData => r !== null));
        } else {
          setReportCharts([]);
        }
      } catch (e) {
        console.error("Failed to load KPI", e);
        setKpi(null);
        setMetrics(null);
        setReportCharts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [kpiId]);

  const handleCopySQL = () => {
    const sqlText = kpi?.sql_definition || "No SQL definition available";
    navigator.clipboard.writeText(sqlText);
    toast.success("SQL copied to clipboard");
  };

  const handleToggleFavorite = async () => {
    if (!kpiId || !currentUserEmail) return;
    try {
      await DefaultService.toggleFavoriteKpisKpiIdFavoritePost(kpiId, currentUserEmail);
      setKpi((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
      toast.success("Favorite updated");
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const formatDate = (d: string | undefined) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--");

  const getUsageColor = (pct: number) => (pct >= 75 ? "text-green-500" : pct >= 40 ? "text-amber-500" : "text-red-500");
  const getUsageLabel = (pct: number) => (pct >= 75 ? "High Usage" : pct >= 40 ? "Moderate" : "Low Usage");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">KPI not found</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">{kpi.kpi_name}</h1>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-1 transition-colors ${kpi.isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
                >
                  <Star className={`h-4 w-4 ${kpi.isFavorite ? "fill-current" : ""}`} />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-success border-success/40 bg-success/5 text-[10px]">
                  {kpi.status || "Active"}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {kpi.frequency || "N/A"}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {kpi.owner_team || "N/A"}
                </span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Library
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* KPI Definition & Config */}
        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Definition & Formula
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1.5 uppercase">Definition</h4>
                <p className="text-sm text-foreground leading-relaxed">{kpi.description || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1.5 uppercase">Business Formula</h4>
                <code className="block px-3 py-2 bg-muted rounded-md border border-border text-sm font-mono text-primary">
                  {kpi.business_formula || "N/A"}
                </code>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1.5 uppercase">Configuration</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Data Source</span>
                    <span className="font-medium text-foreground truncate ml-2">{kpi.data_source || "N/A"}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Business Unit</span>
                    <span className="font-medium text-foreground">{kpi.business_unit || "N/A"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Code className="h-4 w-4" />
                SQL Implementation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={handleCopySQL} className="h-7 text-xs">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-foreground/95 rounded-lg p-3">
                <pre className="text-primary-foreground overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap">
                  <code>{`-- ${kpi.kpi_name}\n${kpi.sql_definition || "No SQL definition available"}`}</code>
                </pre>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Last updated: {formatDate(kpi.updated_at || kpi.lastUpdated)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports using this KPI + Metrics */}
        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileBarChart className="h-4 w-4" />
                Reports Using This KPI
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {metrics?.reports_using ?? 0} of {metrics?.total_reports ?? 0} report(s)
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics?.report_names && metrics.report_names.length > 0 ? (
                <div className="space-y-2">
                  {metrics.report_names.map((r) => (
                    <Button
                      key={r.report_id}
                      variant="outline"
                      className="w-full justify-between h-auto py-2.5"
                      onClick={() => navigate(`/reports/${r.report_id}`)}
                    >
                      <span className="truncate">{r.report_name}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-2" />
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No reports use this KPI yet.</p>
              )}
              <Button
                variant="default"
                className="w-full gap-2"
                onClick={() => navigate(`/reports?preselectKpi=${kpiId}`)}
              >
                <Plus className="h-4 w-4" />
                Create Report
              </Button>
            </CardContent>
          </Card>

          {metrics && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Usage & Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-[11px] text-muted-foreground">Usage Rating</p>
                    <p className={`text-lg font-bold ${getUsageColor(metrics.usage_percentage)}`}>
                      {metrics.usage_percentage.toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-[11px] text-muted-foreground">Used in Reports</p>
                    <p className="text-lg font-bold text-foreground">
                      {metrics.reports_using} / {metrics.total_reports}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-[11px] text-muted-foreground">Cold Moves</p>
                    <p className="text-lg font-bold text-foreground">{metrics.cold_move_count}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-[11px] text-muted-foreground">Status</p>
                    <Badge variant={metrics.storage_status === "cold" ? "destructive" : "outline"} className="capitalize">
                      {metrics.storage_status || "active"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Health score</span>
                    <Badge variant="outline" className={`text-[10px] ${getUsageColor(metrics.usage_percentage)}`}>
                      {getUsageLabel(metrics.usage_percentage)}
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metrics.usage_percentage >= 75 ? "bg-green-500" : metrics.usage_percentage >= 40 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.usage_percentage}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{metrics.owner_team || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{metrics.created_at ? new Date(metrics.created_at).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{metrics.last_used_at ? new Date(metrics.last_used_at).toLocaleDateString() : "Never"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Snowflake className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{metrics.cold_move_count} time(s)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Report Charts */}
        {reportCharts.length > 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Charts in Reports</CardTitle>
              <p className="text-xs text-muted-foreground">This KPI in each report</p>
            </CardHeader>
            <CardContent className="space-y-8">
              {reportCharts.map((report) => {
                const kpiData = report.kpis.find((k) => k.kpi_id === kpiId);
                if (!kpiData?.rows?.length) return null;
                const { valueKey, labelKey } = inferChartKeys(kpiData.rows);
                const chartData = kpiData.rows.map((r) => ({
                  ...r,
                  label: String(r[labelKey] ?? ""),
                  value: Number(r[valueKey]) || 0,
                }));
                return (
                  <div key={report.report_id}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">{report.report_name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigate(`/reports/${report.report_id}`)}
                      >
                        View full report
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis
                            dataKey="value"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [value.toLocaleString(), valueKey]}
                            labelFormatter={(label) => `${labelKey}: ${label}`}
                          />
                          <Bar dataKey="value" name={valueKey} radius={[4, 4, 0, 0]} maxBarSize={48}>
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
