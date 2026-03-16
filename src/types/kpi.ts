export interface KPIMetadata {
  id?: string;
  name: string;
  description: string;
  businessDescription: string;
  owner: string;
  createdAt?: string;
  metadataSignature?: string;
  lineageSignature?: string;
  semanticSignature?: string | null;
  sqlDefinition?: string;
  status?: 'Active' | 'Pending' | 'Draft';
}

export interface TableInfo {
  id: string;
  name: string;
  catalog: string;
  schema: string;
}

export interface TablePreview {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface DataQualityCheck {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
}

export interface PipelinePhase {
  id: 'preparation' | 'validation' | 'creation';
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  steps: PipelineStep[];
}

export interface PipelineStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
}

export interface QueryBuilderConfig {
  selectedColumns: string[];
  metricColumn: string;
  aggregationType: string;
  groupByColumns: string[];
  timeGrain: string;
  filters: QueryFilter[];
}

export interface QueryFilter {
  column: string;
  operator: string;
  value: string;
}

export interface WizardState {
  currentStep: number;
  selectedTable: TableInfo | null;
  tablePreview: TablePreview | null;
  metadata: KPIMetadata;
  queryMode: 'builder' | 'sql';
  queryBuilderConfig: QueryBuilderConfig;
  sqlQuery: string;
  optimizedSQL: string | null;
  queryResult: TablePreview | null;
  pipelinePhases: PipelinePhase[];
  signatures: {
    metadata: string | null;
    lineage: string | null;
  };
  isDuplicate: boolean;
  dataQualityChecks: DataQualityCheck[];
  isComplete: boolean;
}