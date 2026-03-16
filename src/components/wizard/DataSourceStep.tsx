import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { TableInfo, TablePreview } from "@/types/kpi";
import { ChevronRight, Database, Eye, Columns3, X, Server, Layers, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DefaultService } from "@/api-client";
import { apiCall } from "@/lib/api-config";

interface DataSourceStepProps {
  selectedTable: TableInfo | null;
  onTableSelect: (table: TableInfo) => void;
  tablePreview: TablePreview | null;
  onPreviewLoad: (preview: TablePreview) => void;
  onNext: () => void;
  selectedClusters: any;
  setSelectedClusters: any;
  selectedSchemas: any;
  setSelectedSchemas: any;
  selectedTableIds: any;
  setSelectedTableIds: any;
  previewingTable: any;
  setPreviewingTable: any;
  selectedColumns: any;
  setSelectedColumns: any;
  tablePreviewRows: any;
  setTablePreviewRows: any;
}

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

export function DataSourceStep({
  onTableSelect,
  onNext,
  selectedClusters,
  setSelectedClusters,
  selectedSchemas,
  setSelectedSchemas,
  selectedTableIds,
  setSelectedTableIds,
  previewingTable,
  setPreviewingTable,
  selectedColumns,
  setSelectedColumns,
  tablePreviewRows,
  setTablePreviewRows
}: DataSourceStepProps) {
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  // const [selectedClusters, setSelectedClusters] = useState<string[]>(["poc_workspace"]);
  // const [selectedSchemas, setSelectedSchemas] = useState<string[]>(["gold_plus_datamart"]);
  // const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  // const [previewingTable, setPreviewingTable] = useState<TableWithColumns | null>(null);
  // const [selectedColumns, setSelectedColumns] = useState<ColumnSelection[]>([]);
  const [clusterOpen, setClusterOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([]);
  const [schemas, setSchemas] = useState<{ id: string; name: string; catalogId: string }[]>([]);
  const [availableTables, setAvailableTables] = useState<TableWithColumns[]>([]);
  // const [tablePreviewRows, setTablePreviewRows] = useState<any[]>([]);

  // Load catalogs (treated as "clusters" in the UI)
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const res = await apiCall<{ name: string }[]>("getCatalogs");
        setCatalogs(res.map(c => ({ id: c.name, name: c.name })));
      } catch (err) {
        console.error("Failed to load catalogs", err);
        setCatalogs([]);
      }
    };
    loadCatalogs();
  }, []);

  // Filter schemas based on selected catalogs
  const availableSchemas = useMemo(
    () => schemas.filter(s => selectedClusters.includes(s.catalogId)),
    [schemas, selectedClusters]
  );

  // useEffect(() => {
  //   if (selectedSchemas.length === 0) {
  //     setAvailableTables([]);
  //     return;
  //   }

  //   const fetchTables = async () => {
  //     try {
  //       setIsLoadingTables(true);

  //       const schema = selectedSchemas[0]; // single select
  //       const res = await DefaultService.listTablesDatasourceTablesGet(schema);
  //       setAvailableTables(res.tables ?? []);
  //     } catch (err) {
  //       console.error("Failed to load tables", err);
  //       setAvailableTables([]);
  //     } finally {
  //       setIsLoadingTables(false);
  //     }
  //   };

  //   fetchTables();
  // }, [selectedSchemas]);

  // Load schemas whenever selected catalogs change
  useEffect(() => {
    const loadSchemas = async () => {
      if (!selectedClusters.length) {
        setSchemas([]);
        return;
      }
      try {
        const all: { id: string; name: string; catalogId: string }[] = [];
        for (const catalogId of selectedClusters) {
          const res = await apiCall<{ catalog: string; name: string }[]>("getSchemas", {
            queryParams: { catalog: catalogId },
          });
          res.forEach(s => {
            all.push({
              id: `${catalogId}.${s.name}`,
              name: s.name,
              catalogId,
            });
          });
        }
        setSchemas(all);
      } catch (err) {
        console.error("Failed to load schemas", err);
        setSchemas([]);
      }
    };
    loadSchemas();
  }, [selectedClusters]);

  // Reset schemas when catalogs change vs availableSchemas
  useEffect(() => {
    setSelectedSchemas(prev => prev.filter(s => 
      availableSchemas.some(as => as.id === s)
    ));
  }, [availableSchemas]);

  // Load tables whenever schemas change
  useEffect(() => {
    const loadTables = async () => {
      if (!selectedSchemas.length) {
        setAvailableTables([]);
        return;
      }
      try {
        setIsLoadingTables(true);
        const allTables: TableWithColumns[] = [];
        for (const schemaId of selectedSchemas) {
          const [catalogName, schemaName] = schemaId.split(".");
          // #region agent log
          fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e56ee5'},body:JSON.stringify({sessionId:'e56ee5',location:'DataSourceStep.tsx:loadTables',message:'loading tables for schema',data:{schemaId,catalogName,schemaName},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          try {
            const res = await apiCall<{ tables: any[] }>("getTables", {
              queryParams: { schema: schemaName, catalog: catalogName },
            });
            // #region agent log
            fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e56ee5'},body:JSON.stringify({sessionId:'e56ee5',location:'DataSourceStep.tsx:loadTables',message:'tables loaded',data:{schemaId,count:res.tables?.length},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            const tables = res.tables ?? [];
            tables.forEach(t => {
              allTables.push({
                id: `${schemaId}.${t.id}`,
                name: t.name,
                schema: t.schema,
                columns: (t.columns ?? []) as ColumnInfo[],
              });
            });
          } catch (err) {
            // #region agent log
            fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e56ee5'},body:JSON.stringify({sessionId:'e56ee5',location:'DataSourceStep.tsx:loadTables',message:'FAILED to load tables',data:{schemaId,error:String(err)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            console.error(`Failed to load tables for ${schemaId}`, err);
          }
        }
        // #region agent log
        fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e56ee5'},body:JSON.stringify({sessionId:'e56ee5',location:'DataSourceStep.tsx:loadTables',message:'ALL tables loaded',data:{totalCount:allTables.length,schemas:selectedSchemas},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setAvailableTables(allTables);
      } catch (err) {
        console.error("Failed to load tables", err);
        setAvailableTables([]);
      } finally {
        setIsLoadingTables(false);
      }
    };
    loadTables();
  }, [selectedSchemas]);

  // Reset tables and preview when table list changes
  useEffect(() => {
    setSelectedTableIds(prev => prev.filter(t => 
      availableTables.some(at => at.id === t)
    ));
    if (previewingTable && !availableTables.some(t => t.id === previewingTable.id)) {
      setPreviewingTable(null);
    }
  }, [availableTables, previewingTable]);

  const toggleCluster = (clusterId: string) => {
    setSelectedClusters(prev => 
      prev.includes(clusterId) 
        ? prev.filter(c => c !== clusterId)
        : [...prev, clusterId]
    );
  };

  const toggleSchema = (schemaId: string) => {
    setSelectedSchemas(prev => 
      prev.includes(schemaId) 
        ? prev.filter(s => s !== schemaId)
        : [...prev, schemaId]
    );
  };

  const toggleTable = (tableId: string) => {
    setSelectedTableIds(prev => {
      if (prev.includes(tableId)) {
        // Remove table and its columns
        setSelectedColumns(cols => cols.filter(c => c.tableId !== tableId));
        return prev.filter(t => t !== tableId);
      }
      return [...prev, tableId];
    });
  };

  // const handleTablePreview = (table: TableWithColumns) => {
  //   setPreviewingTable(table);
  //   // Auto-select the table if not already selected
  //   if (!selectedTableIds.includes(table.id)) {
  //     setSelectedTableIds(prev => [...prev, table.id]);
  //   }
  // };
  const handleTablePreview = async (tbl: TableWithColumns, autoSelect = true) => {
    try {
      setIsLoadingPreview(true);
      const parts = tbl.id.split(".");
      const catalogName = parts[0];
      const schemaName = parts[1];

      const res = await apiCall<{ columns: string[]; rows: any[] }>("getTablePreview", {
        queryParams: { schema: schemaName, table: tbl.name, catalog: catalogName },
      });

      const previewTable: TableWithColumns = {
        ...tbl,
        columns: (res.columns || []).map((c: string) => ({
          name: c,
          type: "STRING",
        })),
      };

      setPreviewingTable(previewTable);

      if (autoSelect && !selectedTableIds.includes(tbl.id)) {
        setSelectedTableIds(prev => {
          if (prev.includes(tbl.id)) return prev;
          return [...prev, tbl.id];
        });
        onTableSelect(tbl.id);
      }

      setTablePreviewRows(res.rows || []);

    } catch (err) {
      console.error("Preview load failed", err);
      setPreviewingTable(tbl);
      setTablePreviewRows([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleColumnToggle = (columnName: string) => {
    if (!previewingTable) return;

    setSelectedColumns(prev => {
      const existingTableIndex = prev.findIndex(s => s.tableId === previewingTable.id);
      
      if (existingTableIndex >= 0) {
        const existingColumns = prev[existingTableIndex].columns;
        const columnExists = existingColumns.includes(columnName);
        
        if (columnExists) {
          const newColumns = existingColumns.filter(c => c !== columnName);
          if (newColumns.length === 0) {
            return prev.filter((_, i) => i !== existingTableIndex);
          }
          return prev.map((s, i) => 
            i === existingTableIndex ? { ...s, columns: newColumns } : s
          );
        } else {
          return prev.map((s, i) => 
            i === existingTableIndex ? { ...s, columns: [...existingColumns, columnName] } : s
          );
        }
      } else {
        return [...prev, { tableName: previewingTable.name, tableId: previewingTable.id, columns: [columnName] }];
      }
    });
  };

  const selectAllColumns = () => {
    if (!previewingTable) return;
    const allColumnNames = previewingTable.columns.map(c => c.name);
    setSelectedColumns(prev => {
      const filtered = prev.filter(s => s.tableId !== previewingTable.id);
      return [...filtered, { tableName: previewingTable.name, tableId: previewingTable.id, columns: allColumnNames }];
    });
  };

  const deselectAllColumns = () => {
    if (!previewingTable) return;
    setSelectedColumns(prev => prev.filter(s => s.tableId !== previewingTable.id));
  };

  const isColumnSelected = (columnName: string) => {
    if (!previewingTable) return false;
    const tableSelection = selectedColumns.find(s => s.tableId === previewingTable.id);
    return tableSelection?.columns.includes(columnName) || false;
  };

  const removeColumn = (tableId: string, columnName: string) => {
    setSelectedColumns(prev => {
      return prev.map(s => {
        if (s.tableId === tableId) {
          const newColumns = s.columns.filter(c => c !== columnName);
          return { ...s, columns: newColumns };
        }
        return s;
      }).filter(s => s.columns.length > 0);
    });
  };

  const totalSelectedColumns = selectedColumns.reduce((acc, s) => acc + s.columns.length, 0);
  const allColumnsSelected = previewingTable && 
    selectedColumns.find(s => s.tableId === previewingTable.id)?.columns.length === previewingTable.columns.length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Select Data Source</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose clusters, schemas, tables, and columns for your KPI calculation.
        </p>
      </div>

      {/* Row 1: Cluster and Schema Multi-Select */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-card rounded-lg border border-border">
        {/* Cluster Multi-Select */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-primary" />
            Clusters <span className="text-destructive">*</span>
          </Label>
          <Popover open={clusterOpen} onOpenChange={setClusterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clusterOpen}
                className="w-full justify-between h-9 text-sm font-normal"
              >
                {selectedClusters.length === 0 
                  ? "Select clusters..."
                  : `${selectedClusters.length} cluster${selectedClusters.length > 1 ? 's' : ''} selected`
                }
                <Layers className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search clusters..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No cluster found.</CommandEmpty>
                  <CommandGroup>
                    {catalogs.map((cluster) => (
                      <CommandItem
                        key={cluster.id}
                        value={cluster.id}
                        onSelect={() => toggleCluster(cluster.id)}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedClusters.includes(cluster.id) 
                            ? "bg-primary text-primary-foreground" 
                            : "opacity-50"
                        )}>
                          {selectedClusters.includes(cluster.id) && <Check className="h-3 w-3" />}
                        </div>
                        <Server className="mr-2 h-4 w-4 text-muted-foreground" />
                        {cluster.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedClusters.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedClusters.map(id => {
                const cluster = catalogs.find(c => c.id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1">
                    {cluster?.name}
                    <button onClick={() => toggleCluster(id)} className="hover:bg-destructive/20 rounded p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Schema Multi-Select */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Schemas <span className="text-destructive">*</span>
          </Label>
          <Popover open={schemaOpen} onOpenChange={setSchemaOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={schemaOpen}
                className="w-full justify-between h-9 text-sm font-normal"
                disabled={selectedClusters.length === 0}
              >
                {selectedClusters.length === 0 
                  ? "Select clusters first"
                  : selectedSchemas.length === 0 
                    ? "Select schemas..."
                    : `${selectedSchemas.length} schema${selectedSchemas.length > 1 ? 's' : ''} selected`
                }
                <Layers className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search schemas..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No schema found.</CommandEmpty>
                  {selectedClusters.map(clusterId => {
                    const cluster = catalogs.find(c => c.id === clusterId);
                    const schemas = availableSchemas.filter(s => s.catalogId === clusterId);
                    return (
                      <CommandGroup key={clusterId} heading={cluster?.name}>
                        {schemas.map((schema) => (
                          <CommandItem
                            key={schema.id}
                            value={schema.id}
                            onSelect={() => toggleSchema(schema.id)}
                          >
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              selectedSchemas.includes(schema.id) 
                                ? "bg-primary text-primary-foreground" 
                                : "opacity-50"
                            )}>
                              {selectedSchemas.includes(schema.id) && <Check className="h-3 w-3" />}
                            </div>
                            {schema.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    );
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedSchemas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedSchemas.map(id => {
                const schema = schemas.find(s => s.id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1">
                    {schema?.name ?? id}
                    <button onClick={() => toggleSchema(id)} className="hover:bg-destructive/20 rounded p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Tables List (30%) + Table Preview with Column Selection (70%) */}
      {selectedSchemas.length > 0 && (
        <div className="grid grid-cols-10 gap-3 min-h-[360px]">
          {/* Tables List - 30% */}
          <div className="col-span-3 bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/50">
              <div className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Tables</h3>
                {availableTables.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedTableIds.length}/{availableTables.length}
                  </Badge>
                )}
              </div>
            </div>
            <ScrollArea className="h-[350px]">
              {isLoadingTables ? (
                <div className="p-3 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : availableTables.length > 0 ? (
                <div className="p-2 space-y-1">
                  {availableTables.map((table) => {
                    const [catalogName, schemaName] = table.id.split(".");
                    return (
                    <div
                      key={table.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                        "hover:bg-primary/10",
                        previewingTable?.id === table.id 
                          ? "bg-primary/15 border border-primary/30" 
                          : ""
                      )}
                    >
                      <Checkbox
                        checked={selectedTableIds.includes(table.id)}
                        onCheckedChange={(checked) => {
                          toggleTable(table.id);
                          if (checked) {
                            void handleTablePreview(table, false);
                          }
                        }}
                        className="data-[state=checked]:bg-primary"
                      />
                      <button
                        onClick={() => handleTablePreview(table)}
                        className={cn(
                          "flex-1 text-left flex items-center gap-2 truncate",
                          previewingTable?.id === table.id ? "text-primary font-medium" : "text-foreground"
                        )}
                      >
                        <Database className="h-3.5 w-3.5 flex-shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="truncate">{table.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {catalogName}.{schemaName}
                          </span>
                        </div>
                      </button>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No tables found
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Table Preview with Column Selection - 70% */}
          <div className="col-span-7 bg-card rounded-lg border border-border">
            <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">
                  {previewingTable ? previewingTable.name : 'Table Preview'}
                </h3>
                {previewingTable && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {previewingTable.columns.length} columns
                  </Badge>
                )}
              </div>
              {previewingTable && (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAllColumns}
                    className="h-7 text-xs"
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={deselectAllColumns}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            
            {!previewingTable ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                Click on a table to preview its columns
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-max">
                    <TableHeader className="sticky top-0 bg-muted z-10">
                      <TableRow>
                        {previewingTable.columns.map((col) => (
                          <TableHead 
                            key={col.name} 
                            className={cn(
                              "py-2 text-xs font-medium cursor-pointer hover:bg-primary/10 transition-colors",
                              isColumnSelected(col.name) && "bg-primary/15"
                            )}
                            onClick={() => handleColumnToggle(col.name)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isColumnSelected(col.name)}
                                onCheckedChange={() => handleColumnToggle(col.name)}
                                className="data-[state=checked]:bg-primary"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{col.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{col.type}</span>
                              </div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tablePreviewRows || []).slice(0, 5).map((row, rowIdx) => (
                        <TableRow key={rowIdx} className="hover:bg-muted/50">
                          {previewingTable.columns.map((col) => (
                            <TableCell 
                              key={col.name} 
                              className={cn(
                                "py-2 text-sm font-mono",
                                isColumnSelected(col.name) && "bg-primary/5"
                              )}
                            >
                              {row[col.name] !== undefined ? String(row[col.name]) : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {(!tablePreviewRows || tablePreviewRows.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={previewingTable.columns.length} className="text-center text-muted-foreground py-8">
                            No sample data available for this table
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 🔥 REQUIRED for horizontal scroll in shadcn */}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </div>
        </div>
      )}

      {/* Row 3: Selected Columns Summary */}
      {totalSelectedColumns > 0 && (
        <div className="p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Columns3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Selected Columns</h3>
            <Badge variant="default" className="bg-primary text-primary-foreground">
              {totalSelectedColumns} column{totalSelectedColumns > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-3">
            {selectedColumns.map((selection) => (
              <div key={selection.tableId} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {selection.tableName}
                  <Badge variant="outline" className="ml-1 text-xs">
                    {selection.columns.length}
                  </Badge>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selection.columns.map((col) => (
                    <Badge 
                      key={`${selection.tableId}-${col}`} 
                      variant="secondary"
                      className="text-xs flex items-center gap-1 pr-1 font-mono"
                    >
                      {col}
                      <button
                        onClick={() => removeColumn(selection.tableId, col)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={onNext}
          size="sm"
          disabled={totalSelectedColumns === 0}
          className={cn(
            "gap-1.5",
            totalSelectedColumns > 0 && "bg-primary hover:bg-primary/90"
          )}
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
