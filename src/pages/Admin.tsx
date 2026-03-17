import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall } from "@/lib/api-config";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Shield,
  LayoutGrid,
  Snowflake,
  Play,
  Trash2,
  Check,
  X,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Send,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

interface AdminStats {
  total_kpis: number;
  active_kpis: number;
  cold_kpis: number;
  deleted_kpis: number;
  pending_approvals: number;
  awaiting_owner_decision: number;
  owner_no_response: number;
}

interface PendingDecision {
  decision_id: string;
  kpi_id: string;
  kpi_name: string;
  owner_choice: string;
  requested_by: string;
  requested_at: string | null;
}

interface NoOwnerResponseDecision {
  decision_id: string;
  kpi_id: string;
  kpi_name: string;
  requested_by: string;
  requested_at: string | null;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [decisions, setDecisions] = useState<PendingDecision[]>([]);
  const [noResponseDecisions, setNoResponseDecisions] = useState<NoOwnerResponseDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCold, setRunningCold] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [warningDecisionId, setWarningDecisionId] = useState<string | null>(null);
  const [actingDecisionId, setActingDecisionId] = useState<string | null>(null);
  const [warnPopoverOpen, setWarnPopoverOpen] = useState<string | null>(null);
  const [customWarningText, setCustomWarningText] = useState("");

  const loadAdminData = async () => {
    try {
      const [statsRes, approvalsRes, noResponseRes] = await Promise.all([
        apiCall<AdminStats>("getAdminStats"),
        apiCall<{ decisions: PendingDecision[] }>("getAdminPendingApprovals"),
        apiCall<{ decisions: NoOwnerResponseDecision[] }>("getAdminNoOwnerResponse"),
      ]);
      setStats(statsRes || null);
      setDecisions((approvalsRes?.decisions || []) as PendingDecision[]);
      setNoResponseDecisions((noResponseRes?.decisions || []) as NoOwnerResponseDecision[]);
    } catch (e) {
      if ((e as any)?.message?.includes("403") || (e as Error)?.message?.includes("403")) {
        toast.error("Admin access required");
        navigate("/");
      }
      setStats(null);
      setDecisions([]);
      setNoResponseDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading || !user) return;
    if (!user.isAdmin) {
      toast.error("Admin access required");
      navigate("/");
      return;
    }
    loadAdminData();
  }, [user?.isAdmin, userLoading]);

  const handleRunColdStorage = async () => {
    try {
      setRunningCold(true);
      const payload = {
        inactive_minutes_to_cold: 10,
        cold_minutes_to_decision: 5,
        reminder_minutes_interval: 1,
      };
      await apiCall("runColdStorage", {
        body: payload,
      });
      toast.success("Cold storage evaluation completed");
      await loadAdminData();
    } catch (e) {
      toast.error("Cold storage job failed");
      console.error(e);
    } finally {
      setRunningCold(false);
    }
  };

  const handleApprove = async (decisionId: string, approve: boolean) => {
    try {
      setApproving(decisionId);
      await apiCall("approveDecision", {
        body: {
          decision_id: decisionId,
          approve,
          approver_id: user?.email,
        },
      });
      toast.success(approve ? "Approved" : "Rejected");
      await loadAdminData();
    } catch (e) {
      toast.error("Action failed");
      console.error(e);
    } finally {
      setApproving(null);
    }
  };

  const handleWarnOwner = async (decisionId: string, customMessage?: string) => {
    try {
      setWarningDecisionId(decisionId);
      await apiCall("adminWarnOwner", {
        body: { decision_id: decisionId, ...(customMessage && { custom_message: customMessage }) },
      });
      toast.success(customMessage ? "Custom warning sent" : "Default warning sent to owner");
      setWarnPopoverOpen(null);
      setCustomWarningText("");
      await loadAdminData();
    } catch (e) {
      toast.error("Failed to send warning");
      console.error(e);
    } finally {
      setWarningDecisionId(null);
    }
  };

  const handleAdminAction = async (decisionId: string, action: "delete" | "move_back" | "keep_cold") => {
    try {
      setActingDecisionId(decisionId);
      await apiCall("adminAction", { body: { decision_id: decisionId, action } });
      toast.success(`Action "${action.replace("_", " ")}" applied`);
      await loadAdminData();
    } catch (e) {
      toast.error("Action failed");
      console.error(e);
    } finally {
      setActingDecisionId(null);
    }
  };

  if (userLoading || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Cold storage, approvals, and KPI overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cold-storage")}
              className="gap-1.5"
            >
              <Snowflake className="h-3.5 w-3.5" />
              Cold Storage
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Library
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <LayoutGrid className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total KPIs</p>
                <p className="text-xl font-bold text-foreground">{stats?.total_kpis ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-foreground">{stats?.active_kpis ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Snowflake className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Cold</p>
                <p className="text-xl font-bold text-foreground">{stats?.cold_kpis ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Deleted</p>
                <p className="text-xl font-bold text-foreground">{stats?.deleted_kpis ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Pending Approval</p>
                <p className="text-xl font-bold text-foreground">{stats?.pending_approvals ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Awaiting Owner</p>
                <p className="text-xl font-bold text-foreground">
                  {stats?.awaiting_owner_decision ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Owner No Response</p>
                <p className="text-xl font-bold text-foreground">
                  {stats?.owner_no_response ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Run Cold Storage */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cold Storage</CardTitle>
            <p className="text-xs text-muted-foreground">
              Cold storage runs automatically every minute. Use this only for an immediate manual run.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRunColdStorage}
              disabled={runningCold}
              variant="outline"
              className="gap-2"
            >
              {runningCold ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runningCold ? "Running..." : "Run Now (Manual)"}
            </Button>
          </CardContent>
        </Card>

        {/* Owner No Response */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Owner No Response</CardTitle>
            <p className="text-xs text-muted-foreground">
              Owner did not respond within the timeout. Send a warning or take action yourself.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : noResponseDecisions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No decisions awaiting owner response past timeout.
              </div>
            ) : (
              <div className="space-y-3">
                {noResponseDecisions.map((d) => (
                  <div
                    key={d.decision_id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.kpi_name}</p>
                      <p className="text-xs text-muted-foreground">
                        KPI: {d.kpi_id} • Owner: {d.requested_by}
                      </p>
                      {d.requested_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested: {new Date(d.requested_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Popover
                        open={warnPopoverOpen === d.decision_id}
                        onOpenChange={(open) => {
                          setWarnPopoverOpen(open ? d.decision_id : null);
                          if (!open) setCustomWarningText("");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Send className="h-3.5 w-3.5" />
                            Send Warning
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="space-y-3">
                            <p className="text-sm font-medium">Send warning to owner</p>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full gap-1"
                              onClick={() => handleWarnOwner(d.decision_id)}
                              disabled={warningDecisionId === d.decision_id}
                            >
                              {warningDecisionId === d.decision_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Send default warning
                            </Button>
                            <div className="border-t pt-3">
                              <label className="text-xs text-muted-foreground">Or write custom message:</label>
                              <Textarea
                                placeholder="Type your custom warning..."
                                className="mt-1.5 min-h-[60px]"
                                value={customWarningText}
                                onChange={(e) => setCustomWarningText(e.target.value)}
                              />
                              <Button
                                size="sm"
                                variant="default"
                                className="mt-2 w-full gap-1"
                                onClick={() => handleWarnOwner(d.decision_id, customWarningText)}
                                disabled={warningDecisionId === d.decision_id || !customWarningText.trim()}
                              >
                                {warningDecisionId === d.decision_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                Send custom warning
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1"
                            disabled={actingDecisionId === d.decision_id}
                          >
                            {actingDecisionId === d.decision_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoreVertical className="h-3.5 w-3.5" />
                            )}
                            Take Action
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAdminAction(d.decision_id, "move_back")}>
                            Move back to active
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAdminAction(d.decision_id, "keep_cold")}>
                            Keep in cold
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAdminAction(d.decision_id, "delete")}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete KPI
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <p className="text-xs text-muted-foreground">
              Owner has made a decision; approve or reject.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : decisions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No pending approvals.
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((d) => (
                  <div
                    key={d.decision_id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.kpi_name}</p>
                      <p className="text-xs text-muted-foreground">
                        KPI: {d.kpi_id} • Owner: {d.requested_by} • Choice: {d.owner_choice}
                      </p>
                      {d.requested_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested: {new Date(d.requested_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1"
                        onClick={() => handleApprove(d.decision_id, true)}
                        disabled={approving === d.decision_id}
                      >
                        {approving === d.decision_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => handleApprove(d.decision_id, false)}
                        disabled={approving === d.decision_id}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
