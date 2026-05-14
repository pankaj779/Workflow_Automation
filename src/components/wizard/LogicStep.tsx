import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TablePreview, QueryBuilderConfig } from "@/types/kpi";
import { mockOptimizedSQL, mockQueryResult, mockOptimizedQueryResult, aggregationTypes, timeGrains, mockTablePreview } from "@/lib/mock-data";
import { ChevronLeft, ChevronRight, Code, Wand2, Play, Sparkles, Columns, Clock, Layers, Copy, Check, Bot, Send, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { DefaultService } from "@/api-client";
import { apiCall } from "@/lib/api-config";
import { toast } from "sonner";

/** UC table id for Genie metadata must be catalog.schema.table (3+ segments). Schema-only paths must not be sent. */
function qualifiesAsGenieTableId(id: string): boolean {
  return id.split(".").filter(Boolean).length >= 3;
}

function looksLikeListTablesPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  if (!p.includes("table") && !p.includes("tables")) return false;
  return (
    /\b(list|show|display|enumerate|give\s+me)\b/.test(p) ||
    /\bwhat\s+(are|is)\b/.test(p) ||
    /\ball\s+(the\s+)?tables\b/.test(p)
  );
}

 interface LogicStepProps {
   tableColumns: string[];
   initialSelectedColumns?: any;   // 👈 add this
   queryMode: 'builder' | 'sql';
   onQueryModeChange: (mode: 'builder' | 'sql') => void;
   queryBuilderConfig: QueryBuilderConfig;
   onQueryBuilderChange: (config: QueryBuilderConfig) => void;
   sqlQuery: string;
   onSQLChange: (sql: string) => void;
   optimizedSQL: string | null;
   onOptimize: () => void;
   queryResult: TablePreview | null;
   onRunQuery: (result: TablePreview) => void;
   onNext: () => void;
   onBack: () => void;
   selectedTable: string | { id: string; name: string; catalog: string; schema: string } | null;
   setSelectedQueryV2: (sql: string) => void;
   tablePreviewRows: any;
   selectedColumns?: { tableName: string; tableId: string; columns: string[] }[];
   onGeniePromptUsed?: (prompt: string) => void;
   semanticPrompt?: string | null;
 }
 
 export function LogicStep({
   tableColumns,
   initialSelectedColumns,
   queryMode,
   onQueryModeChange,
   queryBuilderConfig,
   onQueryBuilderChange,
   sqlQuery,
   onSQLChange,
   optimizedSQL,
   onOptimize,
   queryResult,
   onRunQuery,
   onNext,
   onBack,
   selectedTable,
   setSelectedQueryV2,
   tablePreviewRows,
   selectedColumns = [],
   onGeniePromptUsed,
   semanticPrompt
 }: LogicStepProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningOptimized, setIsRunningOptimized] = useState(false);
  const [copiedOptimized, setCopiedOptimized] = useState(false);
  const [editableOptimizedSQL, setEditableOptimizedSQL] = useState<string | null>(null);
  const [optimizationScore, setOptimizationScore] = useState<number | null>(null);
  const [optimizationChanges, setOptimizationChanges] = useState<string[]>([]);
  const [optimizedQueryResult, setOptimizedQueryResult] = useState<TablePreview | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<'original' | 'optimized' | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [multiTablePreview, setMultiTablePreview] = useState<{ tableName: string; columns: string[]; rows: Record<string, unknown>[] }[]>([]);
  const [multiTableLoading, setMultiTableLoading] = useState(false);
 
   // Generate query preview from builder config
   const builderQueryPreview = useMemo(() => {
    const { metricColumn, aggregationType, selectedColumns, groupByColumns, timeGrain } = queryBuilderConfig;

    if (!metricColumn || !aggregationType) return null;

    // 🔹 SELECT parts
    const selectParts: string[] = [];

    // time grain (only if user selected AND column exists in groupBy)
    if (timeGrain && groupByColumns.length > 0) {
      const timeCol = groupByColumns[0]; // assume first group column is date
      selectParts.push(`DATE_TRUNC('${timeGrain.toLowerCase()}', ${timeCol}) AS period`);
    }

    // group by columns
    if (groupByColumns.length > 0) {
      selectParts.push(...groupByColumns);
    }

    // aggregation (safe cast to DOUBLE to avoid STRING crash)
    selectParts.push(
      `${aggregationType}(TRY_CAST(${metricColumn} AS DOUBLE)) AS metric_value`
    );

    // 🔹 GROUP BY clause
    const groupByClause =
      groupByColumns.length > 0
        ? `\nGROUP BY ${groupByColumns.join(', ')}`
        : '';

    const tblName = typeof selectedTable === 'string'
      ? (selectedTable.split('.').pop() || selectedTable)
      : (selectedTable?.name ?? '');
    return `SELECT
      ${selectParts.join(',\n  ')}
    FROM poc_workspace.gold_plus_datamart.${tblName}${groupByClause}
    ORDER BY metric_value DESC`;
  }, [queryBuilderConfig, selectedTable]);
  
  const cleanSQL = (sql: string) => sql.trim().replace(/;+\s*$/, "");
  
  useEffect(() => {
    if (initialSelectedColumns?.length) {
      onQueryBuilderChange({
        ...queryBuilderConfig,
        selectedColumns: initialSelectedColumns,
      });
    }
  }, [initialSelectedColumns]);

  // Fetch preview when Sample Data dialog opens (from selectedColumns or selectedTable)
  useEffect(() => {
    if (!sampleDialogOpen) {
      setMultiTablePreview([]);
      return;
    }
    const tablesToFetch: { tableId: string; tableName: string; columns: string[] }[] = [];
    if (selectedColumns?.length) {
      selectedColumns.forEach((s) => tablesToFetch.push({ tableId: s.tableId, tableName: s.tableName, columns: s.columns }));
    } else if (typeof selectedTable === "string" && selectedTable.includes(".")) {
      const parts = selectedTable.split(".");
      tablesToFetch.push({ tableId: selectedTable, tableName: parts[parts.length - 1] || selectedTable, columns: tableColumns || [] });
    }
    if (!tablesToFetch.length) {
      setMultiTablePreview([]);
      return;
    }
    const fetchAll = async () => {
      setMultiTableLoading(true);
      try {
        const results: { tableName: string; columns: string[]; rows: Record<string, unknown>[] }[] = [];
        for (const sel of tablesToFetch) {
          const parts = sel.tableId.split(".");
          const catalog = parts[0] || "";
          const schema = parts[1] || "";
          const table = parts.length >= 3 ? parts.slice(2).join(".") : (parts[parts.length - 1] || sel.tableName);
          try {
            const res = await apiCall<{ columns: string[]; rows: Record<string, unknown>[] }>("getTablePreview", {
              queryParams: { catalog, schema, table },
            });
            const cols = res.columns || [];
            const displayCols = sel.columns?.length ? sel.columns.filter((c) => cols.includes(c)) : cols;
            const rows = (res.rows || []).map((r) => {
              const out: Record<string, unknown> = {};
              displayCols.forEach((c) => (out[c] = r[c]));
              return out;
            });
            results.push({ tableName: sel.tableName, columns: displayCols.length ? displayCols : (sel.columns || cols), rows });
          } catch {
            results.push({ tableName: sel.tableName, columns: sel.columns || [], rows: [] });
          }
        }
        setMultiTablePreview(results);
      } catch {
        setMultiTablePreview([]);
      } finally {
        setMultiTableLoading(false);
      }
    };
    fetchAll();
  }, [sampleDialogOpen, selectedColumns, selectedTable, tableColumns]);
  //  const handleOptimize = () => {
  //    setIsOptimizing(true);
  //    setTimeout(() => {
  //      onOptimize();
  //      setEditableOptimizedSQL(mockOptimizedSQL);
  //      setIsOptimizing(false);
  //    }, 1200);
  //  };

  const executeSQL = async (sql: string) => {
    const cleaned = cleanSQL(sql);
    if (!cleaned) return null;

    const res = await DefaultService.executeQueryQueryRunPost({
      sql: cleaned,
      limit: 10,
    });

    return {
      columns: res.columns ?? [],
      rows: res.rows ?? [],
    };
  };

  const handleOptimize = async () => {
    const cleaned = cleanSQL(sqlQuery);
    if (!cleaned) return;

    try {
      setIsOptimizing(true);

      const intentPrompt = semanticPrompt || (aiPrompt.trim() || null);
      const res = await DefaultService.optimizeQueryQueryOptimizePost(
        cleaned,
        intentPrompt ? { prompt: intentPrompt } : undefined
      );

      if (res?.optimized_sql) {
        setEditableOptimizedSQL(res.optimized_sql);
        setOptimizationScore(res?.optimization_score ?? null);
        setOptimizationChanges(Array.isArray(res?.changes_made) ? res.changes_made : []);
      }

    } catch (err) {
      console.error("Optimize failed", err);
    } finally {
      setIsOptimizing(false);
    }
  };
 
  //  const handleRun = () => {
  //    setIsRunning(true);
  //    setTimeout(() => {
  //      onRunQuery();
  //      setIsRunning(false);
  //    }, 1500);
  //  };
  // const handleRun = async () => {
  //   const cleaned = cleanSQL(sqlQuery);
  //   if (!cleaned) return;

  //   try {
  //     setIsRunning(true);
  //     const res = await DefaultService.executeQueryQueryRunPost({"sql": cleaned, "limit": 10});
  //     // expected:
  //     // { columns: string[], rows: object[] }

  //     if (res) {
  //       onRunQuery({
  //         columns: res.columns ?? [],
  //         rows: res.rows ?? [],
  //       });
  //     }

  //   } catch (err) {
  //     console.error("Query execution failed", err);
  //   } finally {
  //     setIsRunning(false);
  //   }
  // };
  const handleRun = async () => {
    if (!sqlQuery.trim()) return;

    try {
      setIsRunning(true);

      const result = await executeSQL(sqlQuery);
      if (result) onRunQuery(result);

    } catch (err) {
      console.error("Query execution failed", err);
    } finally {
      setIsRunning(false);
    }
  };


  // const handleRunOptimized = () => {
  //   setIsRunningOptimized(true);
  //   setTimeout(() => {
  //     setOptimizedQueryResult(mockOptimizedQueryResult);
  //     setIsRunningOptimized(false);
  //   }, 1500);
  // };
  const handleRunOptimized = async () => {
    const cleaned = cleanSQL(editableOptimizedSQL || "");
    if (!cleaned) return;

    try {
      setIsRunningOptimized(true);
      const res = await DefaultService.executeQueryQueryRunPost({"sql": cleaned, "limit": 10});

      setOptimizedQueryResult({
        columns: res.columns ?? [],
        rows: res.rows ?? [],
      });

    } catch (err) {
      console.error("Optimized query execution failed", err);
    } finally {
      setIsRunningOptimized(false);
    }
  };
 
  const handleCopyOptimized = () => {
     if (editableOptimizedSQL) {
       navigator.clipboard.writeText(editableOptimizedSQL);
       setCopiedOptimized(true);
       setTimeout(() => setCopiedOptimized(false), 2000);
     }
  };

  const handleRunBuilder = async () => {
    if (!builderQueryPreview) return;

    try {
      setIsRunning(true);

      const result = await executeSQL(builderQueryPreview);
      if (result) onRunQuery(result);

    } catch (err) {
      console.error("Builder query execution failed", err);
    } finally {
      setIsRunning(false);
    }
  };

 
   const handleColumnToggle = (column: string) => {
     const newColumns = queryBuilderConfig.selectedColumns.includes(column)
       ? queryBuilderConfig.selectedColumns.filter((c) => c !== column)
       : [...queryBuilderConfig.selectedColumns, column];
     onQueryBuilderChange({ ...queryBuilderConfig, selectedColumns: newColumns });
   };
 
   const handleGroupByToggle = (column: string) => {
     const newGroupBy = queryBuilderConfig.groupByColumns.includes(column)
       ? queryBuilderConfig.groupByColumns.filter((c) => c !== column)
       : [...queryBuilderConfig.groupByColumns, column];
     onQueryBuilderChange({ ...queryBuilderConfig, groupByColumns: newGroupBy });
   };
 
   const hasValidQuery = queryMode === 'sql' 
     ? sqlQuery.trim().length > 10 
     : queryBuilderConfig.metricColumn && queryBuilderConfig.aggregationType;
 
  // const handleAIGenerate = () => {
  //   if (!aiPrompt.trim()) return;
  //   setIsGenerating(true);
  //   setTimeout(() => {
  //     // Simulate AI generating SQL from natural language
  //     const generatedSQL = `-- Generated from: "${aiPrompt}"
  //       SELECT 
  //           DATE_TRUNC('month', order_date) AS period,
  //           product_category,
  //           SUM(amount) AS total_revenue,
  //           COUNT(DISTINCT customer_id) AS unique_customers
  //       FROM poc_workspace.gold_plus_datamart.sales_transactions
  //       WHERE status = 'Completed'
  //       GROUP BY 1, 2
  //       ORDER BY period DESC, total_revenue DESC;`;
  //     onSQLChange(generatedSQL);
  //     setIsGenerating(false);
  //     setShowAIAssistant(false);
  //     setAiPrompt("");
  //   }, 1500);
  // };

  // Extract table name: backend expects table name only. DataSourceStep passes tbl.id (e.g. "catalog.schema.table_name")
  const tableNameForGenie = (() => {
    if (!selectedTable) return "";
    if (typeof selectedTable === "string") {
      const parts = selectedTable.split(".");
      return parts.length >= 3 ? parts[parts.length - 1] : parts[parts.length - 1] || selectedTable;
    }
    return (selectedTable && "name" in selectedTable ? selectedTable.name : "") as string;
  })();

  // Extract catalog.schema.table from prompt (e.g. "poc_workspace.gold_plus_datamart.repatha_final_merged")
  const tableIdsFromPrompt = useMemo(() => {
    const matches = aiPrompt.match(/\b([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\b/g);
    return matches ? [...new Set(matches)] : [];
  }, [aiPrompt]);

  const hasTableForGenie =
    !!tableNameForGenie ||
    (selectedColumns?.length ?? 0) > 0 ||
    (typeof selectedTable === "string" && !!selectedTable?.includes(".")) ||
    tableIdsFromPrompt.length > 0 ||
    looksLikeListTablesPrompt(aiPrompt);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!hasTableForGenie) {
      toast.error(
        "Select a base table in step 1 (full catalog.schema.table), use the query builder tables, \"list/show tables …\" in your prompt, or mention catalog.schema.table in the prompt."
      );
      return;
    }

    const fromColumns =
      selectedColumns?.length > 0
        ? [...new Set(selectedColumns.map((s) => s.tableId).filter(qualifiesAsGenieTableId))]
        : [];
    const fromSelected =
      typeof selectedTable === "string" && qualifiesAsGenieTableId(selectedTable) ? [selectedTable] : [];
    const tableIds =
      fromColumns.length > 0 ? fromColumns : fromSelected.length > 0 ? fromSelected : tableIdsFromPrompt;

    try {
      setIsGenerating(true);

      const body: { prompt: string; table: string; table_identifiers?: string[] } = {
        prompt: aiPrompt,
        table: tableNameForGenie || (tableIds[0] ? tableIds[0].split(".").pop() || "" : "") || "",
      };
      if (tableIds.length > 0) {
        body.table_identifiers = tableIds;
      }
      const res = await DefaultService.generateSqlWithGenieQueryGeniePost(body);

      // 👉 API returns: { sql, space_id }
      if (res?.sql) {
        onSQLChange(res.sql);
        toast.success("SQL generated successfully");
      }

      // Store Genie prompt for semantic signature (prompt-based duplicate detection)
      if (aiPrompt.trim() && onGeniePromptUsed) {
        onGeniePromptUsed(aiPrompt.trim());
      }

      // (optional) store space_id later for lineage/debug
      console.log("Genie space_id:", res?.space_id);

      setShowAIAssistant(false);
      setAiPrompt("");

    } catch (err: unknown) {
      console.error("Genie generation failed", err);
      let msg = "Genie generation failed";
      if (err && typeof err === "object" && "body" in err) {
        const b = (err as { body?: unknown }).body;
        if (b && typeof b === "object" && "detail" in b) {
          const d = (b as { detail?: unknown }).detail;
          msg = typeof d === "string" ? d : Array.isArray(d) ? (d as { msg?: string }[]).map((x) => x?.msg || String(x)).join("; ") : String(d);
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Define KPI Logic</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build your query using the visual builder or write custom SQL.
          </p>
        </div>
        <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <Eye className="h-3.5 w-3.5" />
              View Sample Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Sample Data Preview</DialogTitle>
            </DialogHeader>
            {(selectedColumns?.length >= 1 || (typeof selectedTable === "string" && selectedTable?.includes("."))) ? (
              <ScrollArea className="h-[400px] rounded-md border">
                {multiTableLoading ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    Loading previews...
                  </div>
                ) : (
                  <div className="space-y-6 p-4">
                    {multiTablePreview.map((tbl, tIdx) => (
                      <div key={tIdx}>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          {tbl.tableName} ({tbl.columns.length} columns)
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {tbl.columns.map((col) => (
                                <TableHead key={col} className="whitespace-nowrap font-medium">
                                  {col}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(tbl.rows || []).slice(0, 5).map((row, idx) => (
                              <TableRow key={idx}>
                                {tbl.columns.map((col) => (
                                  <TableCell key={col} className="text-xs whitespace-nowrap">
                                    {String(row[col] ?? "-")}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {(!tbl.rows || tbl.rows.length === 0) && (
                          <p className="text-xs text-muted-foreground py-2">No rows</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Showing first {Math.min((tbl.rows || []).length, 5)} rows.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(tableColumns || []).map((col) => (
                        <TableHead key={col} className="whitespace-nowrap font-medium">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tablePreviewRows || []).map((row, idx) => (
                      <TableRow key={idx}>
                        {(tableColumns || []).map((col) => (
                          <TableCell key={col} className="text-xs whitespace-nowrap">
                            {String(row[col] ?? "-")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {(selectedColumns?.length >= 1 || (typeof selectedTable === "string" && selectedTable?.includes(".")))
                ? `Showing preview for ${selectedColumns?.length || 1} table(s).`
                : `Showing first ${(tablePreviewRows || []).length} rows from the selected table.`}
            </p>
          </DialogContent>
        </Dialog>
      </div>
 
       <Tabs value={queryMode} onValueChange={(v) => onQueryModeChange(v as 'builder' | 'sql')} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-xs grid-cols-2 h-9">
           <TabsTrigger value="builder" className="gap-1.5 text-xs">
             <Wand2 className="h-3.5 w-3.5" />
             Query Builder
           </TabsTrigger>
           <TabsTrigger value="sql" className="gap-1.5 text-xs">
             <Code className="h-3.5 w-3.5" />
             SQL Editor
           </TabsTrigger>
            </TabsList>
          </div>
 
         {/* Query Builder Mode */}
         <TabsContent value="builder" className="mt-3 space-y-3">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
             {/* Left: Configuration */}
             <div className="space-y-3">
               {/* Column Selection */}
               <div className="card-enterprise p-3">
                 <div className="flex items-center gap-1.5 mb-3">
                   <Columns className="h-4 w-4 text-primary" />
                   <h3 className="text-sm font-medium">Select Columns</h3>
                 </div>
                 <div className="flex flex-wrap gap-1.5">
                   {tableColumns.map((col) => (
                     <Badge
                       key={col}
                       variant={queryBuilderConfig.selectedColumns.includes(col) ? "default" : "outline"}
                       className={cn(
                         "cursor-pointer text-xs transition-all",
                         queryBuilderConfig.selectedColumns.includes(col) && "bg-primary"
                       )}
                       onClick={() => handleColumnToggle(col)}
                     >
                       {col}
                     </Badge>
                   ))}
                 </div>
               </div>
 
               {/* Aggregation */}
               <div className="card-enterprise p-3">
                 <div className="flex items-center gap-1.5 mb-2">
                   <Layers className="h-4 w-4 text-primary" />
                   <h3 className="text-sm font-medium">Aggregation</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <Label className="text-xs">Metric Column</Label>
                     <Select
                       value={queryBuilderConfig.metricColumn}
                       onValueChange={(v) => onQueryBuilderChange({ ...queryBuilderConfig, metricColumn: v })}
                     >
                       <SelectTrigger className="h-8 text-xs bg-background">
                         <SelectValue placeholder="Select..." />
                       </SelectTrigger>
                       <SelectContent>
                         {tableColumns.map((col) => (
                           <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-xs">Aggregation Type</Label>
                     <Select
                       value={queryBuilderConfig.aggregationType}
                       onValueChange={(v) => onQueryBuilderChange({ ...queryBuilderConfig, aggregationType: v })}
                     >
                       <SelectTrigger className="h-8 text-xs bg-background">
                         <SelectValue placeholder="Select..." />
                       </SelectTrigger>
                       <SelectContent>
                         {aggregationTypes.map((agg) => (
                           <SelectItem key={agg.value} value={agg.value} className="text-xs">{agg.label}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               </div>
 
               {/* Time & Grouping */}
               <div className="card-enterprise p-3">
                 <div className="flex items-center gap-1.5 mb-2">
                   <Clock className="h-4 w-4 text-primary" />
                   <h3 className="text-sm font-medium">Time & Grouping</h3>
                 </div>
                 <div className="space-y-2">
                   <div className="space-y-1.5">
                     <Label className="text-xs">Time Grain</Label>
                     <Select
                       value={queryBuilderConfig.timeGrain}
                       onValueChange={(v) => onQueryBuilderChange({ ...queryBuilderConfig, timeGrain: v })}
                     >
                       <SelectTrigger className="h-8 text-xs bg-background">
                         <SelectValue placeholder="Select..." />
                       </SelectTrigger>
                       <SelectContent>
                         {timeGrains.map((grain) => (
                           <SelectItem key={grain.value} value={grain.value} className="text-xs">{grain.label}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-xs">Group By</Label>
                     <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[36px]">
                       {tableColumns.map((col) => (
                         <Badge
                            key={col}
                            variant={queryBuilderConfig.groupByColumns.includes(col) ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer text-[10px]",
                              queryBuilderConfig.groupByColumns.includes(col) &&
                                "bg-primary text-primary-foreground"
                            )}
                            onClick={() => handleGroupByToggle(col)}
                          >
                            {col}
                          </Badge>

                       ))}
                     </div>
                   </div>
                 </div>
               </div>
             </div>
 
             {/* Right: Query Preview */}
             <div className="space-y-3">
               <div className="card-enterprise p-3 h-full flex flex-col">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5">
                     <Code className="h-4 w-4 text-primary" />
                     <h3 className="text-sm font-medium">Generated Query</h3>
                   </div>
                   <Badge variant="outline" className="text-[10px] font-mono">
                     Preview
                   </Badge>
                 </div>
                 <pre className="flex-1 p-3 bg-foreground/95 rounded-lg text-xs font-mono text-primary-foreground overflow-auto min-h-[200px]">
                   <code>{builderQueryPreview || '-- Configure options to generate query'}</code>
                 </pre>
                 <Button
                   onClick={handleRunBuilder}
                   disabled={!hasValidQuery || isRunning}
                   className="mt-3 w-full gap-1.5"
                   size="sm"
                 >
                   {isRunning ? (
                     <>
                       <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                       Running...
                     </>
                   ) : (
                     <>
                       <Play className="h-3.5 w-3.5" />
                       Run Query
                     </>
                   )}
                 </Button>
               </div>
             </div>
           </div>
         </TabsContent>
 
         {/* SQL Editor Mode - Side by Side */}
         <TabsContent value="sql" className="mt-3">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
             {/* Left: User Input */}
             <div className="card-enterprise p-3">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-1.5">
                   <Code className="h-4 w-4 text-primary" />
                   <h3 className="text-sm font-medium">Your Query</h3>
                 </div>
                 <Badge variant="outline" className="text-[10px] font-mono">
                   Input
                 </Badge>
               </div>
               
               {/* Inline AI Assistant Bar */}
               {showAIAssistant ? (
                 <div className="mb-3 flex items-center gap-2 p-2 rounded-lg border-2 border-primary/40 bg-primary/5">
                   <Bot className="h-4 w-4 text-primary shrink-0" />
                   <Input
                     value={aiPrompt}
                     onChange={(e) => setAiPrompt(e.target.value)}
                     placeholder="@ for objects, ↑↓ for history"
                     className="flex-1 h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') handleAIGenerate();
                       if (e.key === 'Escape') {
                         setShowAIAssistant(false);
                         setAiPrompt("");
                       }
                     }}
                     autoFocus
                   />
                   <div className="flex items-center gap-1.5 shrink-0">
                     <Button
                       variant="outline"
                       size="sm"
                       className="h-7 text-xs"
                       onClick={() => {
                         setShowAIAssistant(false);
                         setAiPrompt("");
                       }}
                     >
                       Cancel <span className="ml-1 text-[10px] opacity-60">ESC</span>
                     </Button>
                     <Button
                       size="sm"
                       className="h-7 text-xs gap-1"
                       onClick={handleAIGenerate}
                       disabled={!aiPrompt.trim() || isGenerating || !hasTableForGenie}
                     >
                       {isGenerating ? (
                         <>
                           <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                         </>
                       ) : (
                         <>
                           Generate <span className="text-[10px] opacity-80">↵</span>
                         </>
                       )}
                     </Button>
                   </div>
                 </div>
               ) : (
                 <button
                   onClick={() => setShowAIAssistant(true)}
                   className="mb-3 w-full flex items-center gap-2 p-2 rounded-lg border border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                 >
                   <Bot className="h-4 w-4 text-primary" />
                   <span className="text-xs text-muted-foreground">Ask AI to generate SQL...</span>
                   <span className="ml-auto text-[10px] text-muted-foreground">@ for objects, ↑↓ for history</span>
                 </button>
               )}

               <Textarea
                 value={sqlQuery}
                 onChange={(e) => onSQLChange(e.target.value)}
                 placeholder={`-- Enter your SQL query
                    SELECT 
                        DATE_TRUNC('month', order_date) AS period,
                        SUM(amount) AS total_revenue
                    FROM sales_transactions
                    WHERE status = 'Completed'
                    GROUP BY 1
                    ORDER BY 1 DESC;`}
                 className="font-mono text-xs min-h-[280px] bg-foreground/95 text-primary-foreground border-0 resize-none"
               />
               <div className="flex gap-2 mt-3">
                 <Button
                   onClick={handleOptimize}
                   disabled={!sqlQuery.trim() || isOptimizing}
                   variant="outline"
                   size="sm"
                   className="flex-1 gap-1.5"
                 >
                   {isOptimizing ? (
                     <>
                       <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                       Optimizing...
                     </>
                   ) : (
                     <>
                       <Sparkles className="h-3.5 w-3.5" />
                       Optimize
                     </>
                   )}
                 </Button>
                 <Button
                   onClick={handleRun}
                   disabled={!hasValidQuery || isRunning}
                   size="sm"
                   className="flex-1 gap-1.5"
                 >
                   {isRunning ? (
                     <>
                       <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                       Running...
                     </>
                   ) : (
                     <>
                       <Play className="h-3.5 w-3.5" />
                       Run Query
                     </>
                   )}
                 </Button>
               </div>
             </div>
 
             {/* Right: Optimized Output */}
             <div className="card-enterprise p-4">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-1.5">
                   <Sparkles className="h-4 w-4 text-success" />
                   <h3 className="text-sm font-medium">Optimized Query</h3>
                 </div>
                 <div className="flex items-center gap-2 flex-wrap">
                   {editableOptimizedSQL && optimizationScore !== null && (
                     <Badge
                       variant="outline"
                       className={cn(
                         "text-[10px] font-mono",
                         optimizationScore >= 60 ? "text-success border-success/50 bg-success/10" :
                         optimizationScore >= 20 ? "text-amber-600 border-amber-500/50 bg-amber-500/10" :
                         "text-muted-foreground border-muted"
                       )}
                     >
                       Score: {optimizationScore}%
                     </Badge>
                   )}
                   <Badge variant="outline" className="text-[10px] font-mono text-success border-success/40">
                     AI Enhanced
                   </Badge>
                   {editableOptimizedSQL && (
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-7 w-7"
                       onClick={handleCopyOptimized}
                     >
                       {copiedOptimized ? (
                         <Check className="h-3.5 w-3.5 text-success" />
                       ) : (
                         <Copy className="h-3.5 w-3.5" />
                       )}
                     </Button>
                   )}
                 </div>
               </div>
               {editableOptimizedSQL && optimizationChanges.length > 0 && (
                 <div className="mb-3 p-2 rounded-md bg-muted/50 border border-border/50">
                   <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Changes made:</p>
                   <ul className="text-[10px] text-foreground space-y-0.5 list-disc list-inside">
                     {optimizationChanges.slice(0, 5).map((c, i) => (
                       <li key={i}>{c}</li>
                     ))}
                   </ul>
                 </div>
               )}
               <Textarea
                 value={editableOptimizedSQL || ''}
                 onChange={(e) => setEditableOptimizedSQL(e.target.value)}
                 placeholder="Click 'Optimize' to generate an enhanced query..."
                 className="font-mono text-xs min-h-[330px] bg-success/5 border-success/20 resize-none"
                 readOnly={!editableOptimizedSQL}
               />
               {editableOptimizedSQL && (
                <Button
                  onClick={handleRunOptimized}
                  disabled={isRunningOptimized}
                  size="sm"
                  className="w-full mt-3 gap-1.5 bg-success hover:bg-success/90"
                >
                  {isRunningOptimized ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Run Optimized Query
                    </>
                  )}
                </Button>
               )}
             </div>
           </div>
         </TabsContent>
       </Tabs>
 
      {/* Side by Side Query Results */}
      {(queryResult || optimizedQueryResult) && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <Play className="h-4 w-4 text-primary" />
              Query Results Comparison
            </h3>
            {queryResult && optimizedQueryResult && (
              <p className="text-xs text-muted-foreground">
                Select a query to use for KPI creation
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Query Results */}
            <div 
              className={cn(
                "space-y-2 p-3 rounded-lg border-2 transition-all cursor-pointer",
                selectedQuery === 'original' 
                  ? "border-primary bg-primary/5" 
                  : "border-transparent hover:border-muted-foreground/20",
                !queryResult && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => queryResult && setSelectedQuery('original')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedQuery === 'original' ? "border-primary" : "border-muted-foreground/40"
                  )}>
                    {selectedQuery === 'original' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                  <Code className="h-3 w-3 mr-1" />
                  Your Query
                </Badge>
                </div>
                {queryResult && (
                  <span className="text-[10px] text-muted-foreground">{queryResult.rows.length} rows</span>
                )}
              </div>
              <div className="card-enterprise overflow-hidden">
                {queryResult ? (
                  <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                          {queryResult.columns.map((col) => (
                            <TableHead key={col} className="text-xs font-medium whitespace-nowrap py-2">
                              {col}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResult.rows.map((row, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/50">
                            {queryResult.columns.map((col) => (
                              <TableCell key={col} className="whitespace-nowrap font-mono text-xs py-2">
                                {typeof row[col] === 'number' 
                                  ? row[col].toLocaleString() 
                                  : String(row[col])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    Run your query to see results
                  </div>
                )}
              </div>
            </div>

            {/* Optimized Query Results */}
            <div 
              className={cn(
                "space-y-2 p-3 rounded-lg border-2 transition-all cursor-pointer",
                selectedQuery === 'optimized' 
                  ? "border-success bg-success/5" 
                  : "border-transparent hover:border-muted-foreground/20",
                !optimizedQueryResult && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => optimizedQueryResult && setSelectedQuery('optimized')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedQuery === 'optimized' ? "border-success" : "border-muted-foreground/40"
                  )}>
                    {selectedQuery === 'optimized' && (
                      <div className="w-2 h-2 rounded-full bg-success" />
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] text-success border-success/40">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Optimized Query
                </Badge>
                </div>
                {optimizedQueryResult && (
                  <span className="text-[10px] text-muted-foreground">{optimizedQueryResult.rows.length} rows</span>
                )}
              </div>
              <div className="card-enterprise overflow-hidden border-success/20">
                {optimizedQueryResult ? (
                  <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-success/5">
                        <TableRow>
                          {optimizedQueryResult.columns.map((col) => (
                            <TableHead key={col} className="text-xs font-medium whitespace-nowrap py-2">
                              {col}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {optimizedQueryResult.rows.map((row, idx) => (
                          <TableRow key={idx} className="hover:bg-success/5">
                            {optimizedQueryResult.columns.map((col) => (
                              <TableCell key={col} className="whitespace-nowrap font-mono text-xs py-2">
                                {typeof row[col] === 'number' 
                                  ? row[col].toLocaleString() 
                                  : String(row[col])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    Run optimized query to compare results
                  </div>
                )}
              </div>
             </div>
           </div>
         </div>
       )}
 
       {/* Navigation */}
       <div className="flex justify-between pt-4 border-t border-border">
         <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
           <ChevronLeft className="h-4 w-4" />
           Back
         </Button>
         <div className="flex items-center gap-3">
           {selectedQuery && (
             <span className="text-xs text-muted-foreground">
               Using: <span className="font-medium text-foreground">{selectedQuery === 'original' ? 'Your Query' : 'Optimized Query'}</span>
             </span>
           )}
         <Button
           onClick={() => {
             const chosen =
               queryMode === "builder"
                 ? cleanSQL(builderQueryPreview)
                 : selectedQuery === "original"
                   ? cleanSQL(sqlQuery)
                   : cleanSQL(editableOptimizedSQL);
             setSelectedQueryV2(chosen);
             onNext();
           }}
           size="sm"
            disabled={!selectedQuery}
            className={cn("gap-1.5", selectedQuery && "bg-primary hover:bg-primary/90")}
         >
           Continue
           <ChevronRight className="h-4 w-4" />
         </Button>
         </div>
       </div>
     </div>
   );
 }