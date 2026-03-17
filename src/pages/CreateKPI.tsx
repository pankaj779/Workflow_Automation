import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StepIndicator } from "@/components/ui/step-indicator";
import { DataSourceStep } from "@/components/wizard/DataSourceStep";
import { MetadataStep } from "@/components/wizard/MetadataStep";
import { LogicStep } from "@/components/wizard/LogicStep";
import { PipelineStep } from "@/components/wizard/PipelineStep";
import { CompletionStep } from "@/components/wizard/CompletionStep";
import { ExitConfirmationDialog } from "@/components/wizard/ExitConfirmationDialog";
import { WizardState, TableInfo, TablePreview, KPIMetadata, QueryBuilderConfig } from "@/types/kpi";
import { mockOptimizedSQL, mockQueryResult, mockTablePreview } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart3, X } from "lucide-react";
import { apiConfig } from "@/lib/api-config";

const steps = [
  { id: 1, name: "Data Source", description: "Select table" },
  { id: 2, name: "Metadata", description: "KPI details" },
  { id: 3, name: "Logic", description: "Define query" },
  { id: 4, name: "Pipeline", description: "Execute" },
  { id: 5, name: "Complete", description: "Summary" },
];

const initialQueryBuilderConfig: QueryBuilderConfig = {
  selectedColumns: [],
  metricColumn: "",
  aggregationType: "",
  groupByColumns: [],
  timeGrain: "",
  filters: [],
};

const initialMetadata: KPIMetadata = {
  name: "",
  description: "",
  businessDescription: "",
  owner: "",
};

interface ColumnInfo {
  name: string;
  type: string;
}

interface TableWithColumns {
  id: string;
  name: string;
  schema: string;
  columns: ColumnInfo[];
}

interface ColumnSelection {
  tableName: string;
  tableId: string;
  columns: string[];
}

export default function CreateKPI() {
  const navigate = useNavigate();

  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [previewingTable, setPreviewingTable] = useState<TableWithColumns | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<ColumnSelection[]>([]);
  const [tablePreviewRows, setTablePreviewRows] = useState<any[]>([]);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [tablePreview, setTablePreview] = useState<TablePreview | null>(null);
  const [metadata, setMetadata] = useState<KPIMetadata>(initialMetadata);
  const [queryMode, setQueryMode] = useState<'builder' | 'sql'>('sql');
  const [queryBuilderConfig, setQueryBuilderConfig] = useState<QueryBuilderConfig>(initialQueryBuilderConfig);
  const [sqlQuery, setSqlQuery] = useState("");
  const [optimizedSQL, setOptimizedSQL] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<TablePreview | null>(null);
  const [signatures, setSignatures] = useState<{ metadata: string; lineage: string; semantic?: string | null }>({ metadata: "", lineage: "", semantic: null });
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedTargetTables, setSelectedTargetTables] = useState<string[]>([]);
  const [dynamicTargetTables, setDynamicTargetTables] = useState<{id:string;name:string;catalog:string;schema:string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState("");
  const [geniePrompt, setGeniePrompt] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClusters.length || !selectedSchemas.length) {
      setDynamicTargetTables([]);
      return;
    }
    const loadTargets = async () => {
      const all: {id:string;name:string;catalog:string;schema:string}[] = [];
      for (const schemaId of selectedSchemas) {
        const [cat, sch] = schemaId.split(".");
        try {
          const res = await fetch(`${apiConfig.baseUrl}/datasource/tables?schema=${sch}&catalog=${cat}`).then(r => r.json());
          (res.tables ?? []).forEach((t: any) => {
            const uniqueId = `${cat}.${sch}.${t.name}`;
            all.push({ id: uniqueId, name: t.name, catalog: cat, schema: sch });
          });
        } catch {}
      }
      setDynamicTargetTables(all);
      if (all.length > 0 && selectedTargetTables.length === 0) {
        const kpiMaster = all.find(t => t.name === "kpi_master");
        if (kpiMaster) setSelectedTargetTables([kpiMaster.id]);
        else if (all.length > 0) setSelectedTargetTables([all[0].id]);
      }
    };
    loadTargets();
  }, [selectedSchemas, selectedClusters]);

  useEffect(() => {
    fetch(`${apiConfig.baseUrl}/me`)
      .then(r => r.json())
      .then(data => {
        if (data.email) {
          setMetadata(prev => ({ ...prev, owner: prev.owner || data.email }));
        }
      })
      .catch(() => {});
  }, []);

  const hasProgress = selectedTable !== null || metadata.name !== "" || sqlQuery !== "";

  // Show dialog when close button is clicked
  const handleCloseClick = () => {
    if (hasProgress && !isComplete) {
      setShowExitDialog(true);
    } else {
      navigate('/');
    }
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    navigate('/');
  };

  const handleCancelExit = () => {
    setShowExitDialog(false);
  };

  const handleOptimize = () => {
    setOptimizedSQL(mockOptimizedSQL);
  };

  const handleRunQuery = (data) => {
    setQueryResult(data);
  };

  const handlePipelineComplete = (sigs: { metadata: string; lineage: string; semantic?: string | null }, duplicate: boolean) => {
    setSignatures(sigs);
    setIsDuplicate(duplicate);
    setMetadata(prev => ({
      ...prev,
      id: 'KPI-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      metadataSignature: sigs.metadata,
      lineageSignature: sigs.lineage,
      semanticSignature: sigs.semantic,
    }));
    setIsComplete(true);
    setCurrentStep(5);
  };

  const handleStepClick = (stepId: number) => {
    // Only allow navigation to completed steps or current step
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  const canNavigateToStep = (stepId: number): boolean => {
    switch (stepId) {
      case 1: return true;
      case 2: return !!selectedTable;
      case 3: return !!selectedTable && !!metadata.name && !!metadata.description;
      case 4: return !!queryResult;
      case 5: return isComplete;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Create New KPI</h1>
                <p className="text-xs text-muted-foreground">Configure your metric definition</p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloseClick}
                    className="text-muted-foreground hover:text-destructive hover:border-destructive gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Exit
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Exit wizard and return to KPI library</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <StepIndicator 
            steps={steps} 
            currentStep={currentStep} 
            onStepClick={handleStepClick}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 max-w-full">
        {currentStep === 1 && (
          <DataSourceStep
            selectedTable={selectedTable}
            onTableSelect={setSelectedTable}
            tablePreview={tablePreview}
            onPreviewLoad={setTablePreview}
            onNext={() => setCurrentStep(2)}
            selectedClusters={selectedClusters}
            setSelectedClusters={setSelectedClusters}
            selectedSchemas={selectedSchemas}
            setSelectedSchemas={setSelectedSchemas}
            selectedTableIds={selectedTableIds}
            setSelectedTableIds={setSelectedTableIds}
            previewingTable={previewingTable}
            setPreviewingTable={setPreviewingTable}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
            tablePreviewRows={tablePreviewRows}
            setTablePreviewRows={setTablePreviewRows}
          />
        )}

        {currentStep === 2 && (
          <MetadataStep
            metadata={metadata}
            onMetadataChange={setMetadata}
            targetTables={dynamicTargetTables}
            selectedTargetTables={selectedTargetTables}
            onTargetTablesChange={setSelectedTargetTables}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {/* {console.log(selectedColumns[0].columns)} */}
        {currentStep === 3 && (
          <LogicStep
            tableColumns={selectedColumns.length > 0 ? selectedColumns[0].columns : (tablePreview?.columns || mockTablePreview.columns)}
            initialSelectedColumns={selectedColumns}
            queryMode={queryMode}
            onQueryModeChange={setQueryMode}
            queryBuilderConfig={queryBuilderConfig}
            onQueryBuilderChange={setQueryBuilderConfig}
            sqlQuery={sqlQuery}
            onSQLChange={setSqlQuery}
            optimizedSQL={optimizedSQL}
            onOptimize={handleOptimize}
            queryResult={queryResult}
            onRunQuery={handleRunQuery}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
            selectedTable={selectedTable}
            setSelectedQueryV2={setSelectedQuery}
            tablePreviewRows={tablePreviewRows}
            onGeniePromptUsed={setGeniePrompt}
            semanticPrompt={geniePrompt}
          />
        )}

        {currentStep === 4 && (
          <PipelineStep
            onComplete={handlePipelineComplete}
            onBack={() => setCurrentStep(3)}
            sql={selectedQuery}
            table={selectedTargetTables[0]}
            columns={[]}
            metadata={{ ...metadata, category: selectedCategory }}
            semanticPrompt={geniePrompt}
          />
        )}

        {currentStep === 5 && isComplete && (
          <CompletionStep
            metadata={metadata}
            signatures={signatures}
            sqlDefinition={optimizedSQL || sqlQuery || mockOptimizedSQL}
          />
        )}
      </main>

      <ExitConfirmationDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirm={handleConfirmExit}
      />
    </div>
  );
}