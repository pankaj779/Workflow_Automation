// API Configuration Registry
// Central configuration for all backend API endpoints

export interface APIEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
}

export interface APIConfig {
  baseUrl: string;
  endpoints: {
    // Data Source APIs
    getTables: APIEndpoint;
    getTablePreview: APIEndpoint;
    getCatalogs: APIEndpoint;
    getSchemas: APIEndpoint;
    
    // KPI Creation APIs
    validateKPI: APIEndpoint;
    createKPI: APIEndpoint;
    optimizeSQL: APIEndpoint;
    executeQuery: APIEndpoint;
    
    // Pipeline APIs
    generateSignatures: APIEndpoint;
    checkDuplicates: APIEndpoint;
    runDataQuality: APIEndpoint;
    insertKPIValidation: APIEndpoint;
    insertFactsTable: APIEndpoint;
    
    // Dashboard APIs
    getKPIStats: APIEndpoint;
    getRecentKPIs: APIEndpoint;

    // Reports & Metrics
    getDashboardSummary: APIEndpoint;
    getKPIs: APIEndpoint;
    getDrafts: APIEndpoint;
    toggleFavorite: APIEndpoint;
    getReports: APIEndpoint;
    getReportData: APIEndpoint;
    createReport: APIEndpoint;
    updateReport: APIEndpoint;
    deleteReport: APIEndpoint;
    getKPIMetrics: APIEndpoint;
    getKPIValues: APIEndpoint;

    // Cold Storage & Notifications
    runColdStorage: APIEndpoint;
    ownerDecision: APIEndpoint;
    approveDecision: APIEndpoint;
    listNotifications: APIEndpoint;
    markNotificationRead: APIEndpoint;
    deleteNotification: APIEndpoint;

    // Admin (RBAC)
    getAdminStats: APIEndpoint;
    getAdminPendingApprovals: APIEndpoint;
    getAdminNoOwnerResponse: APIEndpoint;
    adminWarnOwner: APIEndpoint;
    adminAction: APIEndpoint;
  };
}

// Environment-based configuration
const environment = import.meta.env.MODE || 'development';

const configs: Record<string, APIConfig> = {
  development: {
    baseUrl: 'http://127.0.0.1:8000',
    endpoints: {
      getTables: { url: '/datasource/tables', method: 'GET', description: 'Fetch available tables' },
      getTablePreview: { url: '/datasource/preview', method: 'GET', description: 'Get top 10 rows of table' },
      getCatalogs: { url: '/datasource/catalogs', method: 'GET', description: 'Fetch catalogs' },
      getSchemas: { url: '/datasource/schemas', method: 'GET', description: 'Fetch schemas' },
      
      validateKPI: { url: '/kpi/validate', method: 'POST', description: 'Validate KPI metadata' },
      createKPI: { url: '/kpi/create', method: 'POST', description: 'Create new KPI' },
      optimizeSQL: { url: '/sql/optimize', method: 'POST', description: 'Optimize SQL query' },
      executeQuery: { url: '/sql/execute', method: 'POST', description: 'Execute SQL query' },
      
      generateSignatures: { url: '/pipeline/signatures', method: 'POST', description: 'Generate metadata and lineage signatures' },
      checkDuplicates: { url: '/pipeline/duplicates', method: 'POST', description: 'Check for duplicate KPIs' },
      runDataQuality: { url: '/pipeline/quality', method: 'POST', description: 'Run data quality checks' },
      insertKPIValidation: { url: '/pipeline/insert-validation', method: 'POST', description: 'Insert to KPI_Validation_Table' },
      insertFactsTable: { url: '/pipeline/insert-facts', method: 'POST', description: 'Insert to facts_table' },
      
      getKPIStats: { url: '/dashboard/stats', method: 'GET', description: 'Get KPI statistics' },
      getRecentKPIs: { url: '/dashboard/recent', method: 'GET', description: 'Get recent KPIs' },

      // ===== FastAPI KPI Library & new features =====
      getDashboardSummary: {
        url: '/dashboard/summary',
        method: 'GET',
        description: 'Get dashboard KPI summary',
      },

      getKPIs: {
        url: '/kpis',
        method: 'GET',
        description: 'Get all KPIs',
      },

      getDrafts: {
        url: '/drafts',
        method: 'GET',
        description: 'Get user draft KPIs',
      },

      toggleFavorite: {
        url: '/kpis/:kpiId/favorite',
        method: 'POST',
        description: 'Toggle KPI favorite',
      },

      getReports: {
        url: '/reports',
        method: 'GET',
        description: 'List reports with their KPIs',
      },
      getReportData: {
        url: '/reports/:reportId/data',
        method: 'GET',
        description: 'Get report with KPI data for charts',
      },
      createReport: {
        url: '/reports',
        method: 'POST',
        description: 'Create a new report',
      },
      updateReport: {
        url: '/reports/:reportId',
        method: 'PUT',
        description: 'Update an existing report',
      },
      deleteReport: {
        url: '/reports/:reportId',
        method: 'DELETE',
        description: 'Soft-delete a report',
      },
      getKPIMetrics: {
        url: '/kpis/:kpiId/metrics',
        method: 'GET',
        description: 'Get usage and cold-storage metrics for a KPI',
      },
      getKPIValues: {
        url: '/kpis/:kpiId/values',
        method: 'GET',
        description: 'Get KPI metric values for charts',
      },

      runColdStorage: {
        url: '/cold-storage/run',
        method: 'POST',
        description: 'Run cold storage job',
      },
      ownerDecision: {
        url: '/cold-storage/owner-decision',
        method: 'POST',
        description: 'Submit KPI owner decision for a cold KPI',
      },
      approveDecision: {
        url: '/cold-storage/approve',
        method: 'POST',
        description: 'Admin approves or rejects a cold storage decision',
      },
      listNotifications: {
        url: '/notifications',
        method: 'GET',
        description: 'List notifications for a user',
      },
      markNotificationRead: {
        url: '/notifications/:notificationId/read',
        method: 'POST',
        description: 'Mark a notification as read',
      },
      deleteNotification: {
        url: '/notifications/:notificationId',
        method: 'DELETE',
        description: 'Delete a notification',
      },
      getAdminStats: {
        url: '/admin/stats',
        method: 'GET',
        description: 'Admin dashboard stats',
      },
      getAdminPendingApprovals: {
        url: '/admin/pending-approvals',
        method: 'GET',
        description: 'Pending cold storage approvals',
      },
      getAdminNoOwnerResponse: {
        url: '/admin/no-owner-response',
        method: 'GET',
        description: 'Decisions where owner did not respond within timeout',
      },
      adminWarnOwner: {
        url: '/cold-storage/admin-warn-owner',
        method: 'POST',
        description: 'Admin sends warning to KPI owner',
      },
      adminAction: {
        url: '/cold-storage/admin-action',
        method: 'POST',
        description: 'Admin takes direct action on cold storage decision',
      },
    },
  },
  production: {
    baseUrl: '',  // empty = same origin when deployed on Databricks
    endpoints: {
      getTables: { url: '/datasource/tables', method: 'GET', description: 'Fetch available tables' },
      getTablePreview: { url: '/datasource/preview', method: 'GET', description: 'Get top 10 rows of table' },
      getCatalogs: { url: '/datasource/catalogs', method: 'GET', description: 'Fetch catalogs' },
      getSchemas: { url: '/datasource/schemas', method: 'GET', description: 'Fetch schemas' },

      validateKPI: { url: '/kpi/validate', method: 'POST', description: 'Validate KPI metadata' },
      createKPI: { url: '/kpi/create', method: 'POST', description: 'Create new KPI' },
      optimizeSQL: { url: '/sql/optimize', method: 'POST', description: 'Optimize SQL query' },
      executeQuery: { url: '/sql/execute', method: 'POST', description: 'Execute SQL query' },

      generateSignatures: { url: '/pipeline/signatures', method: 'POST', description: 'Generate metadata and lineage signatures' },
      checkDuplicates: { url: '/pipeline/duplicates', method: 'POST', description: 'Check for duplicate KPIs' },
      runDataQuality: { url: '/pipeline/quality', method: 'POST', description: 'Run data quality checks' },
      insertKPIValidation: { url: '/pipeline/insert-validation', method: 'POST', description: 'Insert to KPI_Validation_Table' },
      insertFactsTable: { url: '/pipeline/insert-facts', method: 'POST', description: 'Insert to facts_table' },

      getKPIStats: { url: '/dashboard/stats', method: 'GET', description: 'Get KPI statistics' },
      getRecentKPIs: { url: '/dashboard/recent', method: 'GET', description: 'Get recent KPIs' },

      getDashboardSummary: { url: '/dashboard/summary', method: 'GET', description: 'Get dashboard KPI summary' },
      getKPIs: { url: '/kpis', method: 'GET', description: 'Get all KPIs' },
      getDrafts: { url: '/drafts', method: 'GET', description: 'Get user draft KPIs' },
      toggleFavorite: { url: '/kpis/:kpiId/favorite', method: 'POST', description: 'Toggle KPI favorite' },
      getReports: { url: '/reports', method: 'GET', description: 'List reports with their KPIs' },
      getReportData: { url: '/reports/:reportId/data', method: 'GET', description: 'Get report with KPI data for charts' },
      createReport: { url: '/reports', method: 'POST', description: 'Create a new report' },
      updateReport: { url: '/reports/:reportId', method: 'PUT', description: 'Update an existing report' },
      deleteReport: { url: '/reports/:reportId', method: 'DELETE', description: 'Soft-delete a report' },
      getKPIMetrics: { url: '/kpis/:kpiId/metrics', method: 'GET', description: 'Get usage and cold-storage metrics for a KPI' },
      getKPIValues: { url: '/kpis/:kpiId/values', method: 'GET', description: 'Get KPI metric values for charts' },
      runColdStorage: { url: '/cold-storage/run', method: 'POST', description: 'Run cold storage job' },
      ownerDecision: { url: '/cold-storage/owner-decision', method: 'POST', description: 'Submit KPI owner decision for a cold KPI' },
      approveDecision: { url: '/cold-storage/approve', method: 'POST', description: 'Admin approves or rejects a cold storage decision' },
      listNotifications: { url: '/notifications', method: 'GET', description: 'List notifications for a user' },
      markNotificationRead: { url: '/notifications/:notificationId/read', method: 'POST', description: 'Mark a notification as read' },
      deleteNotification: { url: '/notifications/:notificationId', method: 'DELETE', description: 'Delete a notification' },
      getAdminStats: { url: '/admin/stats', method: 'GET', description: 'Admin dashboard stats' },
      getAdminPendingApprovals: { url: '/admin/pending-approvals', method: 'GET', description: 'Pending cold storage approvals' },
      getAdminNoOwnerResponse: { url: '/admin/no-owner-response', method: 'GET', description: 'Owner no response decisions' },
      adminWarnOwner: { url: '/cold-storage/admin-warn-owner', method: 'POST', description: 'Admin warns owner' },
      adminAction: { url: '/cold-storage/admin-action', method: 'POST', description: 'Admin takes action' },
    },
  },
};

export const apiConfig = configs[environment] || configs.development;

// Helper function to build full URL
export function buildApiUrl(endpointKey: keyof APIConfig['endpoints'], params?: Record<string, string>): string {
  const endpoint = apiConfig.endpoints[endpointKey];
  let url = `${apiConfig.baseUrl}${endpoint.url}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }
  
  return url;
}

// Generic API call function
export async function apiCall<T>(
  endpointKey: keyof APIConfig['endpoints'],
  options?: {
    params?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const endpoint = apiConfig.endpoints[endpointKey];
  let url = buildApiUrl(endpointKey, options?.params);

  if (options?.queryParams) {
    const qs = new URLSearchParams(options.queryParams).toString();
    url += (url.includes('?') ? '&' : '?') + qs;
  }

  // #region agent log
  fetch('http://127.0.0.1:7286/ingest/b2dab708-5d2c-4f6e-88c4-af170d1372cc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e56ee5'},body:JSON.stringify({sessionId:'e56ee5',location:'api-config.ts:apiCall',message:'apiCall',data:{endpointKey,url,method:endpoint.method},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const response = await fetch(url, {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
}