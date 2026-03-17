import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiCall } from "@/lib/api-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileBarChart, Loader2, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

/** Infer value column (kpi_value, value) and label column (brand, name, etc.) from row keys */
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

export default function ReportDetailPage() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const [data, setData] = useState<{
    report_id: string;
    report_name: string;
    description?: string;
    kpis: { kpi_id: string; kpi_name: string; rows: Record<string, unknown>[] }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    apiCall<typeof data>("getReportData", { params: { reportId } })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Report not found</p>
        <Button variant="outline" onClick={() => navigate("/reports")}>
          Back to Reports
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
              <FileBarChart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{data.report_name}</h1>
              <p className="text-xs text-muted-foreground">
                {data.description || "KPI metrics and charts"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/reports")} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Reports
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {data.kpis.map((kpi, idx) => {
          const { valueKey, labelKey } = inferChartKeys(kpi.rows);
          const chartData = kpi.rows.map((r) => ({
            ...r,
            label: String(r[labelKey] ?? ""),
            value: Number(r[valueKey]) || 0,
          }));

          if (chartData.length === 0) {
            return (
              <Card key={kpi.kpi_id} className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {kpi.kpi_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No data available for this KPI.
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={kpi.kpi_id} className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {kpi.kpi_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {chartData.length} data points • {labelKey} vs {valueKey}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
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
                      <Legend />
                      <Bar dataKey="value" name={valueKey} radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Summary stats - only when we have 2+ data points (min/max/avg meaningful) */}
                {chartData.length >= 2 && (
                  <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-border/60">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                      <p className="text-sm font-semibold">
                        {chartData.reduce((s, d) => s + d.value, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Average</p>
                      <p className="text-sm font-semibold">
                        {(
                          chartData.reduce((s, d) => s + d.value, 0) / chartData.length
                        ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Max</p>
                      <p className="text-sm font-semibold">
                        {Math.max(...chartData.map((d) => d.value)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Min</p>
                      <p className="text-sm font-semibold">
                        {Math.min(...chartData.map((d) => d.value)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {data.kpis.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <FileBarChart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No KPIs in this report yet.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
