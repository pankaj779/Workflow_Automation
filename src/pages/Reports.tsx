import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { apiCall } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, Plus, ArrowLeft, Loader2, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface KPI {
  id: string;
  name: string;
  category?: string;
}

interface Report {
  report_id: string;
  report_name: string;
  description?: string;
  kpis: { kpi_id: string; name?: string }[];
  created_at?: string;
  created_by?: string;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [searchKpi, setSearchKpi] = useState("");

  const loadData = async () => {
    try {
      const kpiRes = await apiCall<any[]>("getKPIs");
      setKpis(
        (kpiRes || []).map(k => ({
          id: k.id,
          name: k.name,
          category: k.category,
        })),
      );
    } catch (e) {
      console.error("Failed to load KPIs", e);
    }
    try {
      const reportRes = await apiCall<Report[]>("getReports");
      setReports(reportRes || []);
    } catch (e) {
      console.error("Failed to load reports", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleKpi = (id: string) => {
    setSelectedKpiIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedKpiIds.length === 0) return;
    try {
      setIsSaving(true);
      await apiCall<Report>("createReport", {
        body: {
          report_name: name.trim(),
          description: description.trim() || null,
          kpi_ids: selectedKpiIds,
          created_by: user?.email || "unknown",
        },
      });
      toast.success("Report created successfully");
      await loadData();
      setName("");
      setDescription("");
      setSelectedKpiIds([]);
    } catch (e) {
      toast.error("Failed to create report");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (reportId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // #region agent log
    fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f798bc'},body:JSON.stringify({sessionId:'f798bc',runId:'post-fix',hypothesisId:'H9',location:'Reports.tsx:handleDeleteReport',message:'delete report clicked',data:{reportId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      setDeletingReportId(reportId);
      await apiCall("deleteReport", {
        params: { reportId },
      });
      // #region agent log
      fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f798bc'},body:JSON.stringify({sessionId:'f798bc',runId:'post-fix',hypothesisId:'H10',location:'Reports.tsx:handleDeleteReport',message:'delete report api success',data:{reportId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      toast.success("Report deleted");
      await loadData();
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f798bc'},body:JSON.stringify({sessionId:'f798bc',runId:'post-fix',hypothesisId:'H10',location:'Reports.tsx:handleDeleteReport',message:'delete report api failed',data:{reportId,error:e instanceof Error ? e.message : 'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      toast.error("Failed to delete report");
    } finally {
      setDeletingReportId(null);
    }
  };

  const filteredKpis = kpis.filter(k =>
    k.name.toLowerCase().includes(searchKpi.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <FileBarChart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">KPI Reports</h1>
              <p className="text-xs text-muted-foreground">
                Build and manage reports powered by your KPIs
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Library
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr,1fr]">
          {/* Create Report */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">Create New Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Report Name</label>
                <Input
                  placeholder="e.g. Monthly Sales Health"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Description</label>
                <Textarea
                  placeholder="What does this report measure?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Select KPIs
                  {selectedKpiIds.length > 0 && (
                    <span className="ml-2 text-primary font-bold">({selectedKpiIds.length} selected)</span>
                  )}
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search KPIs..."
                    value={searchKpi}
                    onChange={e => setSearchKpi(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="max-h-48 overflow-auto rounded-lg border border-border/60 divide-y divide-border/40">
                  {filteredKpis.map(kpi => (
                    <label
                      key={kpi.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedKpiIds.includes(kpi.id)}
                        onCheckedChange={() => toggleKpi(kpi.id)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className="flex-1 text-sm text-foreground truncate">{kpi.name}</span>
                      {kpi.category && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {kpi.category}
                        </Badge>
                      )}
                    </label>
                  ))}
                  {filteredKpis.length === 0 && kpis.length > 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-4 text-center">No matching KPIs</p>
                  )}
                  {kpis.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                      No KPIs found. Create a KPI first.
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={isSaving || !name.trim() || selectedKpiIds.length === 0}
                className="w-full h-10 gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isSaving ? "Creating..." : "Create Report"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Reports */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Existing Reports
                {reports.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({reports.length})</span>
                )}
              </h2>
            </div>
            {reports.length === 0 ? (
              <Card className="border-dashed border-2 border-border/60">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileBarChart className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No reports yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Create your first report using the form on the left.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <Card
                    key={report.report_id}
                    className="border-border/60 hover:border-primary/40 transition-all hover:shadow-md cursor-pointer"
                    onClick={() => navigate(`/reports/${report.report_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {report.report_name}
                          </h3>
                          {report.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {report.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {report.created_at && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteReport(report.report_id, e)}
                            disabled={deletingReportId === report.report_id}
                            aria-label={`Delete report ${report.report_name}`}
                          >
                            {deletingReportId === report.report_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {report.kpis.map(k => (
                          <Badge key={k.kpi_id} className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                            {k.name || k.kpi_id}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
