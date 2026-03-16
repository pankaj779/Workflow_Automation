import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall } from "@/lib/api-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Snowflake, ArrowLeft, Play, AlertTriangle, Trash2, RotateCcw, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ColdKPI {
  kpi_id: string;
  kpi_name: string;
  owner_team?: string;
  storage_status?: string;
  moved_to_cold_at?: string;
}

export default function ColdStoragePage() {
  const navigate = useNavigate();
  const [coldKpis, setColdKpis] = useState<ColdKPI[]>([]);
  const [allKpis, setAllKpis] = useState<any[]>([]);
  const [selectedKpiId, setSelectedKpiId] = useState<string>("");
  const [choice, setChoice] = useState<"delete" | "move_back" | "keep_cold" | "">("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const kpiRes = await apiCall<any[]>("getKPIs");
      setAllKpis(kpiRes || []);
      const cold = (kpiRes || []).filter((k: any) => k.storage_status === "cold");
      setColdKpis(
        cold.map((r: any) => ({
          kpi_id: r.id,
          kpi_name: r.name,
          owner_team: r.owner,
          storage_status: "cold",
          moved_to_cold_at: r.moved_to_cold_at,
        })),
      );
    } catch (e) {
      console.error("Failed to load KPIs", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunColdStorage = async () => {
    try {
      setIsRunning(true);
      await apiCall("runColdStorage", {
        body: {
          inactive_days_to_cold: 7,
          cold_days_to_decision: 2,
          admin_user_id: "admin",
        },
      });
      toast.success("Cold storage evaluation completed");
      await loadData();
    } catch (e) {
      toast.error("Cold storage job failed");
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleOwnerDecision = async () => {
    if (!selectedKpiId || !choice) return;
    try {
      setIsSubmitting(true);
      await apiCall("ownerDecision", {
        body: {
          kpi_id: selectedKpiId,
          owner_id: "owner",
          choice,
        },
      });
      toast.success("Decision submitted successfully");
      setChoice("");
      await loadData();
    } catch (e) {
      toast.error("Failed to submit decision");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionIcons = {
    delete: <Trash2 className="h-3.5 w-3.5" />,
    move_back: <RotateCcw className="h-3.5 w-3.5" />,
    keep_cold: <Archive className="h-3.5 w-3.5" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Cold Storage</h1>
              <p className="text-xs text-muted-foreground">
                Manage inactive KPIs and lifecycle decisions
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
        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-3">
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Snowflake className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">In Cold Storage</p>
                <p className="text-xl font-bold text-foreground">{coldKpis.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Active KPIs</p>
                <p className="text-xl font-bold text-foreground">
                  {allKpis.filter((k: any) => k.storage_status !== "cold").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total KPIs</p>
                <p className="text-xl font-bold text-foreground">{allKpis.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          {/* Cold KPIs List */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Cold KPIs</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRunColdStorage}
                  disabled={isRunning}
                  className="gap-1.5 h-8"
                >
                  {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  {isRunning ? "Running..." : "Run Evaluation"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-auto">
              {coldKpis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Snowflake className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No KPIs in cold storage</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Run the evaluation job to check for inactive KPIs.
                  </p>
                </div>
              ) : (
                coldKpis.map(k => (
                  <button
                    key={k.kpi_id}
                    onClick={() => setSelectedKpiId(k.kpi_id)}
                    className={`w-full text-left rounded-lg px-4 py-3 transition-all border-2 ${
                      selectedKpiId === k.kpi_id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{k.kpi_name}</span>
                      <Badge variant="destructive" className="text-[10px]">cold</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span>Owner: {k.owner_team || "N/A"}</span>
                      {k.moved_to_cold_at && (
                        <span>Since: {new Date(k.moved_to_cold_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Decision Panel */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Owner Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedKpiId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Archive className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a cold KPI from the list to take action.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Selected KPI</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {coldKpis.find(k => k.kpi_id === selectedKpiId)?.kpi_name || selectedKpiId}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">What should we do with this KPI?</label>
                    <Select value={choice} onValueChange={val => setChoice(val as typeof choice)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Choose an action..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="move_back">
                          <span className="flex items-center gap-2">
                            <RotateCcw className="h-3.5 w-3.5 text-green-500" />
                            Move back to KPI mart
                          </span>
                        </SelectItem>
                        <SelectItem value="keep_cold">
                          <span className="flex items-center gap-2">
                            <Archive className="h-3.5 w-3.5 text-amber-500" />
                            Keep in cold storage
                          </span>
                        </SelectItem>
                        <SelectItem value="delete">
                          <span className="flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            Delete permanently
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleOwnerDecision}
                    disabled={!choice || isSubmitting}
                    className="w-full h-10 gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      choice && actionIcons[choice]
                    )}
                    {isSubmitting ? "Submitting..." : "Submit Decision"}
                  </Button>

                  <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                    Your decision will be sent to the Admin for final approval.
                    The Admin can override your choice if needed.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
