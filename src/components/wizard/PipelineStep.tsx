import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataQualityCheck, PipelinePhase } from "@/types/kpi";
import { mockDataQualityChecks } from "@/lib/mock-data";
import {
  ChevronLeft,
  ChevronRight,
  FileSignature,
  GitBranch,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Database,
  Sparkles,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DefaultService } from "@/api-client";

// interface PipelineStepProps {
//   onComplete: (signatures: { metadata: string; lineage: string }, isDuplicate: boolean) => void;
//   onBack: () => void;
// }

type PhaseStatus = 'pending' | 'running' | 'complete' | 'error' | "failed";

interface PipelineStepProps {
  sql: string;
  table: string;
  columns: string[];
  semanticPrompt?: string | null;
  kpiName?: string;
  description?: string;
  category?: string;
  frequency?: string;
  ownerTeam?: string;
  businessUnit?: string;
  complexity?: string;
  metadata: any;

  onComplete: (
    signatures: { metadata: string; lineage: string; semantic?: string | null },
    isDuplicate: boolean
  ) => void;

  onBack: () => void;
}

export function PipelineStep({
  sql,
  table,
  columns,
  semanticPrompt,
  onComplete,
  onBack,
  metadata
}: PipelineStepProps) {
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);
  const [phase1Status, setPhase1Status] = useState<PhaseStatus>('pending');
  const [phase2Status, setPhase2Status] = useState<PhaseStatus>('pending');
  const [phase3Status, setPhase3Status] = useState<PhaseStatus>('pending');
  
  const [signatures, setSignatures] = useState<{ metadata: string | null; lineage: string | null; semantic: string | null }>({
    metadata: null,
    lineage: null,
    semantic: null
  });
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ matchedType?: string; matchedSignature?: string; existingKpis?: string[] } | null>(null);
  const [dataQualityChecks, setDataQualityChecks] = useState<DataQualityCheck[]>(mockDataQualityChecks);
  const [insertResults, setInsertResults] = useState<{ validation: number; facts: number } | null>(null);

  // const runPhase1 = () => {
  //   setPhase1Status('running');
    
  //   // Simulate signature generation
  //   setTimeout(() => {
  //     setSignatures({
  //       metadata: 'sig_' + Math.random().toString(36).substring(2, 15),
  //       lineage: 'lin_' + Math.random().toString(36).substring(2, 15),
  //     });
  //     setIsDuplicate(false);
  //     setPhase1Status('complete');
  //   }, 2000);
  // };

  const runPhase1 = async () => {
    if (!sql) return;

    try {
      setPhase1Status("running");
      setDuplicateInfo(null);

      const res = await DefaultService.queryPreparationKpiQueryPreparationPost({
        sql,
        source_table: table,
        columns,
        prompt: semanticPrompt ?? undefined,
      });

      // 🔴 Handle duplicate FIRST
      if (res?.duplicate) {
        setIsDuplicate(true);
        setDuplicateInfo({
          matchedType: res?.matched_signature_type,
          matchedSignature: res?.matched_signature,
          existingKpis: (res?.existing_kpis ?? []).map((k: { kpi_name?: string }) => k.kpi_name).filter(Boolean),
        });
        setPhase1Status("failed"); // ← mark phase as failed
        return; // stop further execution
      }

      // ✅ Normal success case
      setSignatures({
        metadata: res?.metadata_signature ?? null,
        semantic: res?.semantic_signature ?? null,
        lineage: res?.lineage_signature ?? null,
      });

      setDuplicateInfo(null);
      setPhase1Status("complete");

    } catch (err) {
      console.error("Query preparation failed", err);
      setPhase1Status("error");
    }
  };

  // const runPhase2 = () => {
  //   setPhase2Status('running');
  //   setCurrentPhase(2);
    
  //   // Run checks sequentially with delays
  //   const checks = [...mockDataQualityChecks];
  //   let index = 0;
    
  //   const runNextCheck = () => {
  //     if (index < checks.length) {
  //       setDataQualityChecks(prev => 
  //         prev.map((c, i) => i === index ? { ...c, status: 'running' as const } : c)
  //       );
        
  //       setTimeout(() => {
  //         setDataQualityChecks(prev =>
  //           prev.map((c, i) => i === index ? { ...c, status: 'passed' as const, message: 'All checks passed' } : c)
  //         );
  //         index++;
  //         runNextCheck();
  //       }, 800);
  //     } else {
  //       setPhase2Status('complete');
  //     }
  //   };
    
  //   runNextCheck();
  // };

  const runPhase2 = async () => {
    if (!sql || !signatures.metadata || !signatures.lineage) return;

    try {
      setPhase2Status("running");
      setCurrentPhase(2);

      /** STEP-1: call backend */
      const res = await DefaultService.runDqChecksKpiDataQualityPost({
        sql,
        metadata_signature: signatures.metadata,
        lineage_signature: signatures.lineage,
        semantic_signature: signatures.semantic
      });

      if (!res?.checks) throw new Error("Invalid DQ response");

      /** STEP-2: convert backend → UI model */
      const normalizedChecks: DataQualityCheck[] = res.checks.map((c: any) => ({
        name: c.name,
        description: c.message ?? "",
        status: "pending",
        message: c.message,
      }));

      setDataQualityChecks(normalizedChecks);

      /** STEP-3: animate sequential validation */
      for (let i = 0; i < normalizedChecks.length; i++) {
        // mark running
        setDataQualityChecks(prev =>
          prev.map((chk, idx) =>
            idx === i ? { ...chk, status: "running" } : chk
          )
        );

        await new Promise(r => setTimeout(r, 600));

        const backendStatus = res.checks[i].status;

        setDataQualityChecks(prev =>
          prev.map((chk, idx) =>
            idx === i
              ? {
                  ...chk,
                  status: backendStatus === "passed" ? "passed" : "failed",
                }
              : chk
          )
        );

        // stop immediately if failed
        if (backendStatus !== "passed") {
          setPhase2Status("error");
          return;
        }
      }

      /** STEP-4: mark phase success */
      if (res.passed) {
        setPhase2Status("complete");
      } else {
        setPhase2Status("error");
      }

    } catch (err) {
      console.error("DQ checks failed", err);
      setPhase2Status("error");
    }
  };
  
  // const runPhase3 = () => {
  //   setPhase3Status('running');
  //   setCurrentPhase(3);
    
  //   setTimeout(() => {
  //     setInsertResults({ validation: 1, facts: 1 });
  //     setPhase3Status('complete');
  //     onComplete(
  //       { metadata: signatures.metadata!, lineage: signatures.lineage! },
  //       isDuplicate
  //     );
  //   }, 2500);
  // };
  const runPhase3 = async () => {
    if (!sql || !signatures.metadata || !signatures.lineage) return;

    try {
      setPhase3Status("running");
      setCurrentPhase(3);

      const res = await DefaultService.publishFinalKpiKpiPublishFinalPost({
        kpi_name: metadata.name,
        description: metadata.description,
        business_formula: metadata.businessDescription,
        sql,
        category: metadata.category,
        frequency: "Weekly",
        owner_team: metadata.owner,
        data_source: table,
        "business_unit": "NA",
        "complexity": "Low",
        quality_score: 100,
        linked_assets: 0,
        metadata_signature: signatures.metadata,
        lineage_signature: signatures.lineage,
        semantic_signature: signatures.semantic
      });

      setInsertResults({
        validation: res?.rows_inserted ?? 0,
        facts: res?.rows_inserted ?? 0,
      });

      setPhase3Status("complete");

      onComplete(
        { metadata: signatures.metadata, lineage: signatures.lineage, semantic: signatures.semantic },
        isDuplicate
      );

    } catch (err) {
      console.error("KPI publish failed", err);
      setPhase3Status("error");
    }
  };

  const getPhaseIcon = (status: PhaseStatus) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Execution Pipeline</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Execute the validation pipeline to register your KPI.
        </p>
      </div>

      {/* Pipeline Progress */}
      <div className="flex items-center justify-between p-4 card-enterprise">
        {[
          { id: 1, name: 'Query Preparation', status: phase1Status },
          { id: 2, name: 'Data Quality', status: phase2Status },
          { id: 3, name: 'KPI Creation', status: phase3Status },
        ].map((phase, index) => (
          <div key={phase.id} className="flex items-center">
            <div className="flex items-center gap-3">
              {getPhaseIcon(phase.status)}
              <div>
                <p className={cn(
                  "font-medium text-sm",
                  phase.status === 'complete' && "text-success",
                  phase.status === 'running' && "text-primary",
                  phase.status === 'pending' && "text-muted-foreground",
                  phase.status === 'failed' && "text-destructive"
                )}>
                  Phase {phase.id}
                </p>
                <p className="text-xs text-muted-foreground">{phase.name}</p>
              </div>
            </div>
            {index < 2 && (
              <div className={cn(
                "w-24 h-0.5 mx-4",
                phase.status === 'complete' ? (phase.status === 'failed' ? 'bg-destructive' : "bg-success") : "bg-border"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Phase 1: Query Preparation */}
      <div
        className={cn(
          "card-enterprise p-6 space-y-6 transition-all",
          phase1Status === "complete" && "border-success/30 bg-success/5",
          (phase1Status === "failed" || phase1Status === "error") &&
            "border-destructive/30 bg-destructive/5"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Phase 1: Query Preparation</h3>
              <p className="text-sm text-muted-foreground">
                Generate signatures and check for duplicates
              </p>
            </div>
          </div>

          <StatusBadge
            status={
              phase1Status === "complete"
                ? "passed"
                : phase1Status === "failed" || phase1Status === "error"
                ? "failed"
                : phase1Status
            }
          />
        </div>

        {/* RUN BUTTON */}
        {phase1Status === "pending" && (
          <Button onClick={runPhase1} className="gap-2 gradient-primary hover:opacity-90">
            <Play className="h-4 w-4" />
            Run Query Preparation
          </Button>
        )}

        {/* RUNNING */}
        {phase1Status === "running" && (
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">
              Generating signatures and validating query...
            </span>
          </div>
        )}

        {/* SUCCESS */}
        {phase1Status === "complete" && signatures.metadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileSignature className="h-4 w-4 text-primary" />
                Metadata Signature
              </div>
              <code className="text-xs font-mono text-muted-foreground break-all">
                {signatures.metadata}
              </code>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GitBranch className="h-4 w-4 text-primary" />
                Lineage Signature
              </div>
              <code className="text-xs font-mono text-muted-foreground break-all">
                {signatures.lineage}
              </code>
            </div>

            {signatures.semantic && (
              <div className="p-4 bg-secondary/30 rounded-lg space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Semantic Signature
                </div>
                <code className="text-xs font-mono text-muted-foreground break-all">
                  {signatures.semantic}
                </code>
              </div>
            )}

            <div
              className={cn(
                "md:col-span-2 p-4 rounded-lg flex items-center gap-3",
                isDuplicate ? "bg-destructive/10" : "bg-success/10"
              )}
            >
              {isDuplicate ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Duplicate KPI detected — cannot proceed
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium text-success">
                    No duplicate detected — ready to proceed
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* FAILED / ERROR MESSAGE */}
        {(phase1Status === "failed" || phase1Status === "error") && (
          <div className="p-4 bg-destructive/10 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {phase1Status === "failed" ? "Duplicate KPI found — a KPI with the same signature already exists" : "Query preparation failed — please check the backend logs"}
              </span>
            </div>
            {phase1Status === "failed" && duplicateInfo && (
              <div className="ml-8 space-y-1 text-xs">
                {duplicateInfo.matchedType && duplicateInfo.matchedSignature && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Matched {duplicateInfo.matchedType} signature:</span>{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono break-all">{duplicateInfo.matchedSignature}</code>
                  </p>
                )}
                {duplicateInfo.existingKpis && duplicateInfo.existingKpis.length > 0 && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Existing KPI(s):</span> {duplicateInfo.existingKpis.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* NEXT BUTTON — ONLY ENABLE WHEN TRUE SUCCESS */}
        {phase1Status === "complete" && !isDuplicate && phase2Status === "pending" && (
          <Button onClick={runPhase2} className="gap-2 gradient-primary hover:opacity-90">
            <Shield className="h-4 w-4" />
            Next: Data Quality Checks
          </Button>
        )}
      </div>

      {/* Phase 2: Data Quality */}
      {(currentPhase >= 2 || phase2Status !== 'pending') && (
        <div className={cn(
          "card-enterprise p-6 space-y-6 transition-all animate-fade-in",
          phase2Status === 'complete' && "border-success/30 bg-success/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Phase 2: Data Quality Validation</h3>
                <p className="text-sm text-muted-foreground">Run quality checks on the query output</p>
              </div>
            </div>
            <StatusBadge status={phase2Status === 'complete' ? 'passed' : phase2Status} />
          </div>

          <div className="space-y-3">
            {dataQualityChecks.map((check, index) => (
              <div
                key={check.name}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-all",
                  check.status === 'passed' && "bg-success/5 border-success/20",
                  check.status === 'running' && "bg-primary/5 border-primary/20",
                  check.status === 'pending' && "bg-secondary/30 border-border/50"
                )}
              >
                <div className="flex items-center gap-3">
                  {check.status === 'passed' && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {check.status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  {check.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/50" />}
                  {check.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
                <StatusBadge status={check.status} showIcon={false} />
              </div>
            ))}
          </div>

          {phase2Status === 'complete' && phase3Status === 'pending' && (
            <Button onClick={runPhase3} className="gap-2 gradient-primary hover:opacity-90">
              <Database className="h-4 w-4" />
              Next: KPI Creation
            </Button>
          )}
        </div>
      )}

      {/* Phase 3: KPI Creation */}
      {(currentPhase >= 3 || phase3Status !== 'pending') && (
        <div className={cn(
          "card-enterprise p-6 space-y-6 transition-all animate-fade-in",
          phase3Status === 'complete' && "border-success/30 bg-success/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Database className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">Phase 3: KPI Creation</h3>
                <p className="text-sm text-muted-foreground">Insert KPI into validation and facts tables</p>
              </div>
            </div>
            <StatusBadge status={phase3Status === 'complete' ? 'passed' : phase3Status} />
          </div>

          {phase3Status === 'running' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Inserting KPI records into tables...</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse-subtle" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          {phase3Status === 'complete' && insertResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-success/10 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-sm">KPI_Validation_Table</p>
                    <p className="text-xs text-muted-foreground">{insertResults.validation} row inserted</p>
                  </div>
                </div>
                <div className="p-4 bg-success/10 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-sm">facts_table</p>
                    <p className="text-xs text-muted-foreground">{insertResults.facts} row inserted</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-success/10 to-accent/10 rounded-xl border border-success/20">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-success/20">
                    <Sparkles className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-success">Pipeline Complete!</h4>
                    <p className="text-sm text-muted-foreground">
                      KPI successfully added to consolidated tables.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border/50">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {phase3Status === 'complete' && (
          <Button className="gap-2 px-6 gradient-primary hover:opacity-90">
            View KPI Summary
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}