// Mock data for development and demonstration

export const mockKPICategories = [
  { id: 'all', name: 'All Categories', icon: 'grid', count: 156 },
  { id: 'sales', name: 'Sales', icon: 'trending-up', count: 42 },
  { id: 'demand', name: 'Demand', icon: 'bar-chart', count: 28 },
  { id: 'execution', name: 'Execution', icon: 'settings', count: 35 },
  { id: 'leading', name: 'Leading', icon: 'zap', count: 24 },
  { id: 'lagging', name: 'Lagging', icon: 'clock', count: 18 },
];

export const mockKPILibraryStats = {
  totalKPIs: 156,
  activeKPIs: 142,
  categories: 8,
  thisMonth: 24,
  changes: {
    totalKPIs: 12,
    activeKPIs: 8,
    categories: 2,
    thisMonth: 24,
  },
};

export const mockThisMonthKPIs = [
  { id: 'KPI-101', name: 'Weekly Sales Velocity', category: 'sales', createdDate: '2025-02-03', owner: 'Analytics Team' },
  { id: 'KPI-102', name: 'Demand Forecast Accuracy', category: 'demand', createdDate: '2025-02-02', owner: 'Demand Planning' },
  { id: 'KPI-103', name: 'Order Fill Rate', category: 'execution', createdDate: '2025-02-01', owner: 'Supply Chain' },
  { id: 'KPI-104', name: 'Pipeline Conversion Rate', category: 'leading', createdDate: '2025-01-30', owner: 'Sales Ops' },
  { id: 'KPI-105', name: 'Customer Retention Rate', category: 'lagging', createdDate: '2025-01-29', owner: 'CX Team' },
];

export const mockDraftKPIs = [
  { 
    id: 'DRAFT-001', 
    name: 'Customer Churn Rate', 
    step: 2, 
    stepName: 'Metadata',
    lastModified: '2025-02-05T09:30:00Z',
    table: 'customer_orders'
  },
  { 
    id: 'DRAFT-002', 
    name: 'Weekly Inventory Levels', 
    step: 3, 
    stepName: 'Logic',
    lastModified: '2025-02-04T16:45:00Z',
    table: 'product_inventory'
  },
  { 
    id: 'DRAFT-003', 
    name: '', 
    step: 1, 
    stepName: 'Data Source',
    lastModified: '2025-02-04T11:20:00Z',
    table: 'sales_transactions'
  },
];

export const mockOptimizedQueryResult = {
  columns: ['period', 'product_category', 'region', 'unique_customers', 'total_revenue', 'avg_order_value'],
  rows: [
    { period: '2024-01', product_category: 'Electronics', region: 'South', unique_customers: 52, total_revenue: 142500.00, avg_order_value: 2740.38 },
    { period: '2024-01', product_category: 'Electronics', region: 'East', unique_customers: 44, total_revenue: 112000.00, avg_order_value: 2545.45 },
    { period: '2024-01', product_category: 'Apparel', region: 'North', unique_customers: 61, total_revenue: 52800.00, avg_order_value: 865.57 },
    { period: '2024-01', product_category: 'Home', region: 'West', unique_customers: 35, total_revenue: 38500.00, avg_order_value: 1100.00 },
  ],
};

export const mockKPILibraryItems = [
  {
    id: 'KPI-001',
    name: 'Net Sales Revenue',
    status: 'Active',
    frequency: 'Daily',
    owner: 'Sales Analytics Team',
    lastUpdated: '2025-01-15T13:30:00Z',
    qualityScore: 94,
    linkedAssets: 3,
    category: 'sales',
    isFavorite: true,
    definition: 'Comprehensive metric measuring net sales revenue performance across all business units, calculated after deducting returns, allowances, and discounts from gross sales revenue.',
    businessFormula: 'Net Sales Revenue = Gross Sales - Returns - Allowances - Discounts',
    dataSource: 'ERP System',
    businessUnit: 'Global Sales',
    complexity: 'moderate',
    nextUpdate: '2025-01-16T13:30:00Z',
    downstreamUsage: [
      { name: 'Executive Dashboard', type: 'dashboard' as const, frequency: 'Real-time' },
      { name: 'Monthly Sales Report', type: 'report' as const, frequency: 'Monthly' },
    ],
  },
  {
    id: 'KPI-002',
    name: 'Market Share Percentage',
    status: 'Active',
    frequency: 'Monthly',
    owner: 'Market Intelligence Team',
    lastUpdated: '2025-01-14T17:30:00Z',
    qualityScore: 87,
    linkedAssets: 2,
    category: 'demand',
    isFavorite: true,
    definition: 'Percentage of total market sales captured by the organization within defined therapeutic areas.',
    businessFormula: 'Market Share = (Company Sales / Total Market Sales) × 100',
    dataSource: 'IQVIA Data',
    businessUnit: 'Commercial Strategy',
    complexity: 'high',
    nextUpdate: '2025-02-14T17:30:00Z',
    downstreamUsage: [
      { name: 'Quarterly Business Review', type: 'report' as const, frequency: 'Quarterly' },
    ],
  },
  {
    id: 'KPI-003',
    name: 'Inventory Turnover Ratio',
    status: 'Active',
    frequency: 'Weekly',
    owner: 'Supply Chain Team',
    lastUpdated: '2025-01-15T11:30:00Z',
    qualityScore: 78,
    linkedAssets: 4,
    category: 'execution',
    isFavorite: false,
    definition: 'Measures how efficiently inventory is managed by comparing cost of goods sold to average inventory.',
    businessFormula: 'Inventory Turnover = Cost of Goods Sold / Average Inventory',
    dataSource: 'SAP',
    businessUnit: 'Supply Chain',
    complexity: 'moderate',
    nextUpdate: '2025-01-22T11:30:00Z',
    downstreamUsage: [
      { name: 'Supply Chain Dashboard', type: 'dashboard' as const, frequency: 'Real-time' },
      { name: 'Weekly Operations Report', type: 'report' as const, frequency: 'Weekly' },
    ],
  },
  {
    id: 'KPI-004',
    name: 'Clinical Trial Enrollment Rate',
    status: 'Active',
    frequency: 'Daily',
    owner: 'Clinical Operations',
    lastUpdated: '2025-01-15T14:30:00Z',
    qualityScore: 92,
    linkedAssets: 2,
    category: 'leading',
    isFavorite: false,
    definition: 'Rate of patient enrollment in active clinical trials compared to target enrollment goals.',
    businessFormula: 'Enrollment Rate = (Enrolled Patients / Target Enrollment) × 100',
    dataSource: 'CTMS',
    businessUnit: 'R&D',
    complexity: 'low',
    nextUpdate: '2025-01-16T14:30:00Z',
    downstreamUsage: [
      { name: 'Clinical Progress Dashboard', type: 'dashboard' as const, frequency: 'Real-time' },
    ],
  },
  {
    id: 'KPI-005',
    name: 'Manufacturing Quality Index',
    status: 'Active',
    frequency: 'Real-time',
    owner: 'Quality Assurance Team',
    lastUpdated: '2025-01-15T15:45:00Z',
    qualityScore: 96,
    linkedAssets: 3,
    category: 'lagging',
    isFavorite: true,
    definition: 'Composite score measuring overall manufacturing quality including defect rates, compliance, and process stability.',
    businessFormula: 'Quality Index = Weighted Average of (Defect Rate, Compliance Score, Stability Score)',
    dataSource: 'MES',
    businessUnit: 'Manufacturing',
    complexity: 'high',
    nextUpdate: '2025-01-15T16:45:00Z',
    downstreamUsage: [
      { name: 'Quality Control Dashboard', type: 'dashboard' as const, frequency: 'Real-time' },
      { name: 'Batch Release Report', type: 'report' as const, frequency: 'Daily' },
    ],
  },
];

export const mockTargetTables = [
  { id: 'kpi_master', name: 'kpi_master', catalog: 'poc_workspace', schema: 'gold_plus_datamart' },
  { id: 'facts-table', name: 'facts_table', catalog: 'poc_workspace', schema: 'gold_plus_datamart' },
  { id: 'metrics-store', name: 'metrics_store', catalog: 'poc_workspace', schema: 'silver_datamart' },
  { id: 'kpi-staging', name: 'KPI_Staging_Table', catalog: 'poc_workspace', schema: 'bronze_datamart' },
];

export const mockClusters = [
  { id: 'poc_workspace', name: 'POC Workspace' },
  { id: 'analytics_prod', name: 'Analytics Production' },
  { id: 'commercial_hub', name: 'Commercial Data Hub' },
  { id: 'supply_chain', name: 'Supply Chain Analytics' },
  { id: 'finance_reporting', name: 'Finance & Reporting' },
];

export const mockSchemas = [
  // Enterprise Data Warehouse
  { id: 'gold_plus_datamart', name: 'gold_plus_datamart', clusterId: 'poc_workspace' },
  { id: 'edw_silver', name: 'silver_refined', clusterId: 'poc_workspace' },
  { id: 'edw_bronze', name: 'bronze_raw', clusterId: 'poc_workspace' },
  // Analytics Production
  { id: 'analytics_metrics', name: 'metrics_store', clusterId: 'analytics_prod' },
  { id: 'analytics_agg', name: 'aggregated_views', clusterId: 'analytics_prod' },
  { id: 'analytics_ml', name: 'ml_features', clusterId: 'analytics_prod' },
  // Commercial Hub
  { id: 'commercial_sales', name: 'sales_data', clusterId: 'commercial_hub' },
  { id: 'commercial_crm', name: 'crm_analytics', clusterId: 'commercial_hub' },
  { id: 'commercial_marketing', name: 'marketing_insights', clusterId: 'commercial_hub' },
  // Supply Chain
  { id: 'sc_inventory', name: 'inventory_mgmt', clusterId: 'supply_chain' },
  { id: 'sc_logistics', name: 'logistics_ops', clusterId: 'supply_chain' },
  { id: 'sc_procurement', name: 'procurement', clusterId: 'supply_chain' },
  // Finance
  { id: 'fin_gl', name: 'general_ledger', clusterId: 'finance_reporting' },
  { id: 'fin_ar', name: 'accounts_receivable', clusterId: 'finance_reporting' },
  { id: 'fin_planning', name: 'financial_planning', clusterId: 'finance_reporting' },
];

export const mockTablesExtended: Record<string, Array<{ id: string; name: string; schema: string; columns: Array<{ name: string; type: string }> }>> = {
  // Enterprise DW - Gold
  'gold_plus_datamart': [{"id":"facts_table","name":"facts_table","schema":"gold_plus_datamart","columns":[{"name":"kpi_id","type":"string"},{"name":"kpi_name","type":"string"},{"name":"description","type":"string"},{"name":"business_desc","type":"string"},{"name":"owner","type":"string"},{"name":"sql_definition","type":"string"},{"name":"metadata_signature","type":"string"},{"name":"lineage_signature","type":"string"},{"name":"created_at","type":"timestamp"},{"name":"source_table","type":"string"},{"name":"selected_columns","type":"string"},{"name":"column_metadata_json","type":"string"},{"name":"brand","type":"string"},{"name":"kpi_value","type":"double"}]},{"id":"kpi_audit_log","name":"kpi_audit_log","schema":"gold_plus_datamart","columns":[{"name":"audit_id","type":"string"},{"name":"kpi_id","type":"string"},{"name":"action","type":"string"},{"name":"changed_by","type":"string"},{"name":"changed_at","type":"timestamp"},{"name":"old_value","type":"string"},{"name":"new_value","type":"string"}]},{"id":"kpi_categories","name":"kpi_categories","schema":"gold_plus_datamart","columns":[{"name":"category","type":"string"},{"name":"display_order","type":"int"},{"name":"is_active","type":"boolean"}]},{"id":"kpi_drafts","name":"kpi_drafts","schema":"gold_plus_datamart","columns":[{"name":"draft_id","type":"string"},{"name":"user_id","type":"string"},{"name":"kpi_name","type":"string"},{"name":"description","type":"string"},{"name":"business_formula","type":"string"},{"name":"sql_definition","type":"string"},{"name":"data_source","type":"string"},{"name":"business_unit","type":"string"},{"name":"category","type":"string"},{"name":"frequency","type":"string"},{"name":"owner_team","type":"string"},{"name":"step_number","type":"int"},{"name":"step_status","type":"string"},{"name":"last_edited_at","type":"timestamp"},{"name":"created_at","type":"timestamp"},{"name":"is_deleted","type":"boolean"}]},{"id":"kpi_master","name":"kpi_master","schema":"gold_plus_datamart","columns":[{"name":"kpi_id","type":"string"},{"name":"kpi_name","type":"string"},{"name":"description","type":"string"},{"name":"business_formula","type":"string"},{"name":"sql_definition","type":"string"},{"name":"category","type":"string"},{"name":"status","type":"string"},{"name":"frequency","type":"string"},{"name":"owner_team","type":"string"},{"name":"data_source","type":"string"},{"name":"business_unit","type":"string"},{"name":"complexity","type":"string"},{"name":"quality_score","type":"double"},{"name":"linked_assets","type":"int"},{"name":"next_update","type":"date"},{"name":"is_published","type":"boolean"},{"name":"is_deleted","type":"boolean"},{"name":"created_at","type":"timestamp"},{"name":"updated_at","type":"timestamp"},{"name":"metadata_signature","type":"string"},{"name":"lineage_signature","type":"string"},{"name":"source_table","type":"string"},{"name":"selected_columns","type":"string"},{"name":"column_metadata_json","type":"string"}]},{"id":"kpi_validation_table","name":"kpi_validation_table","schema":"gold_plus_datamart","columns":[{"name":"kpi_id","type":"string"},{"name":"kpi_name","type":"string"},{"name":"description","type":"string"},{"name":"business_desc","type":"string"},{"name":"owner","type":"string"},{"name":"sql_definition","type":"string"},{"name":"metadata_signature","type":"string"},{"name":"lineage_signature","type":"string"},{"name":"created_at","type":"timestamp_ntz"},{"name":"source_table","type":"string"},{"name":"selected_columns","type":"string"},{"name":"column_metadata_json","type":"string"},{"name":"brand","type":"string"},{"name":"kpi","type":"string"},{"name":"value","type":"string"},{"name":"date","type":"string"},{"name":"vs_plan","type":"string"},{"name":"target_type","type":"string"},{"name":"vs_plan2","type":"string"},{"name":"vs_sum_of_plan","type":"string"},{"name":"total_value_sum","type":"string"},{"name":"row_set","type":"string"},{"name":"type","type":"string"},{"name":"kpigroup","type":"string"},{"name":"time_bucket","type":"string"},{"name":"start_date","type":"string"},{"name":"end_date","type":"string"},{"name":"year","type":"string"},{"name":"quarter","type":"string"},{"name":"month","type":"string"},{"name":"week","type":"string"},{"name":"rx_line","type":"string"},{"name":"competitor_brand","type":"string"},{"name":"event_type","type":"string"},{"name":"specialty","type":"string"},{"name":"ldl_band","type":"string"},{"name":"hcp_role","type":"string"},{"name":"contact_channel","type":"string"},{"name":"kpi_value","type":"decimal(16,14)"}]},{"id":"kpi_values","name":"kpi_values","schema":"gold_plus_datamart","columns":[{"name":"kpi_id","type":"string"},{"name":"date_key","type":"date"},{"name":"fiscal_year","type":"int"},{"name":"fiscal_period","type":"string"},{"name":"week_number","type":"int"},{"name":"dimension_1","type":"string"},{"name":"dimension_2","type":"string"},{"name":"kpi_value","type":"double"},{"name":"target_value","type":"double"},{"name":"previous_value","type":"double"},{"name":"created_at","type":"timestamp"},{"name":"metadata_signature","type":"string"},{"name":"lineage_signature","type":"string"},{"name":"source_table","type":"string"},{"name":"fiscal_year","type":"int"}]},{"id":"repatha_final_merged","name":"repatha_final_merged","schema":"gold_plus_datamart","columns":[{"name":"brand","type":"string"},{"name":"type","type":"string"},{"name":"kpigroup","type":"string"},{"name":"kpi","type":"string"},{"name":"time_bucket","type":"string"},{"name":"target_type","type":"bigint"},{"name":"value","type":"decimal(29,9)"},{"name":"start_date","type":"string"},{"name":"end_date","type":"string"},{"name":"date","type":"string"},{"name":"year","type":"bigint"},{"name":"quarter","type":"string"},{"name":"month","type":"string"},{"name":"week","type":"bigint"},{"name":"rx_line","type":"string"},{"name":"competitor_brand","type":"bigint"},{"name":"event_type","type":"string"},{"name":"specialty","type":"bigint"},{"name":"ldl_band","type":"bigint"},{"name":"hcp_role","type":"string"},{"name":"contact_channel","type":"string"}]},{"id":"user_favorite_kpis","name":"user_favorite_kpis","schema":"gold_plus_datamart","columns":[{"name":"user_id","type":"string"},{"name":"kpi_id","type":"string"},{"name":"created_at","type":"timestamp"}]}],
  // Enterprise DW - Silver
  'edw_silver': [
    { id: 'orders_cleaned', name: 'orders_cleaned', schema: 'edw_silver', columns: [
      { name: 'order_id', type: 'BIGINT' }, { name: 'customer_id', type: 'VARCHAR(20)' }, { name: 'order_timestamp', type: 'TIMESTAMP' },
      { name: 'status', type: 'VARCHAR(20)' }, { name: 'amount', type: 'DECIMAL(12,2)' }
    ]},
    { id: 'customers_enriched', name: 'customers_enriched', schema: 'edw_silver', columns: [
      { name: 'customer_id', type: 'VARCHAR(20)' }, { name: 'full_name', type: 'VARCHAR(100)' }, { name: 'email', type: 'VARCHAR(100)' },
      { name: 'phone', type: 'VARCHAR(20)' }, { name: 'lifetime_value', type: 'DECIMAL(12,2)' }
    ]},
  ],
  // Enterprise DW - Bronze
  'edw_bronze': [
    { id: 'raw_orders', name: 'raw_orders_ingested', schema: 'edw_bronze', columns: [
      { name: 'raw_id', type: 'VARCHAR(50)' }, { name: 'payload', type: 'JSON' }, { name: 'source_system', type: 'VARCHAR(30)' },
      { name: 'ingested_at', type: 'TIMESTAMP' }, { name: 'batch_id', type: 'VARCHAR(20)' }
    ]},
  ],
  // Analytics - Metrics Store
  'analytics_metrics': [
    { id: 'daily_revenue', name: 'daily_revenue_metrics', schema: 'analytics_metrics', columns: [
      { name: 'metric_date', type: 'DATE' }, { name: 'revenue', type: 'DECIMAL(15,2)' }, { name: 'orders_count', type: 'INT' },
      { name: 'avg_order_value', type: 'DECIMAL(10,2)' }, { name: 'unique_customers', type: 'INT' }, { name: 'region', type: 'VARCHAR(30)' }
    ]},
    { id: 'weekly_kpis', name: 'weekly_kpi_summary', schema: 'analytics_metrics', columns: [
      { name: 'week_start', type: 'DATE' }, { name: 'week_end', type: 'DATE' }, { name: 'total_sales', type: 'DECIMAL(15,2)' },
      { name: 'growth_rate', type: 'DECIMAL(6,3)' }, { name: 'customer_acquisition', type: 'INT' }, { name: 'churn_rate', type: 'DECIMAL(5,3)' }
    ]},
    { id: 'monthly_performance', name: 'monthly_performance', schema: 'analytics_metrics', columns: [
      { name: 'year_month', type: 'VARCHAR(7)' }, { name: 'net_revenue', type: 'DECIMAL(15,2)' }, { name: 'gross_margin', type: 'DECIMAL(6,3)' },
      { name: 'operating_expenses', type: 'DECIMAL(15,2)' }, { name: 'ebitda', type: 'DECIMAL(15,2)' }
    ]},
  ],
  // Analytics - Aggregated Views
  'analytics_agg': [
    { id: 'customer_360', name: 'customer_360_view', schema: 'analytics_agg', columns: [
      { name: 'customer_id', type: 'VARCHAR(20)' }, { name: 'total_orders', type: 'INT' }, { name: 'total_spend', type: 'DECIMAL(15,2)' },
      { name: 'avg_order_value', type: 'DECIMAL(10,2)' }, { name: 'first_purchase', type: 'DATE' }, { name: 'last_purchase', type: 'DATE' },
      { name: 'days_since_last_order', type: 'INT' }, { name: 'preferred_channel', type: 'VARCHAR(30)' }
    ]},
    { id: 'product_performance', name: 'product_performance_agg', schema: 'analytics_agg', columns: [
      { name: 'product_id', type: 'VARCHAR(20)' }, { name: 'units_sold', type: 'INT' }, { name: 'revenue', type: 'DECIMAL(15,2)' },
      { name: 'return_rate', type: 'DECIMAL(5,3)' }, { name: 'avg_rating', type: 'DECIMAL(3,2)' }
    ]},
  ],
  // Analytics - ML Features
  'analytics_ml': [
    { id: 'churn_features', name: 'churn_prediction_features', schema: 'analytics_ml', columns: [
      { name: 'customer_id', type: 'VARCHAR(20)' }, { name: 'recency_days', type: 'INT' }, { name: 'frequency', type: 'INT' },
      { name: 'monetary_value', type: 'DECIMAL(12,2)' }, { name: 'tenure_months', type: 'INT' }, { name: 'churn_probability', type: 'DECIMAL(5,4)' }
    ]},
  ],
  // Commercial - Sales
  'commercial_sales': [
    { id: 'sales_pipeline', name: 'sales_pipeline', schema: 'commercial_sales', columns: [
      { name: 'opportunity_id', type: 'VARCHAR(20)' }, { name: 'account_id', type: 'VARCHAR(20)' }, { name: 'stage', type: 'VARCHAR(30)' },
      { name: 'amount', type: 'DECIMAL(15,2)' }, { name: 'probability', type: 'DECIMAL(5,2)' }, { name: 'close_date', type: 'DATE' },
      { name: 'owner_id', type: 'VARCHAR(20)' }, { name: 'created_date', type: 'DATE' }
    ]},
    { id: 'quota_attainment', name: 'quota_attainment', schema: 'commercial_sales', columns: [
      { name: 'rep_id', type: 'VARCHAR(20)' }, { name: 'period', type: 'VARCHAR(10)' }, { name: 'quota', type: 'DECIMAL(15,2)' },
      { name: 'actual', type: 'DECIMAL(15,2)' }, { name: 'attainment_pct', type: 'DECIMAL(6,3)' }, { name: 'territory', type: 'VARCHAR(50)' }
    ]},
    { id: 'bookings_forecast', name: 'bookings_forecast', schema: 'commercial_sales', columns: [
      { name: 'forecast_date', type: 'DATE' }, { name: 'best_case', type: 'DECIMAL(15,2)' }, { name: 'commit', type: 'DECIMAL(15,2)' },
      { name: 'pipeline', type: 'DECIMAL(15,2)' }, { name: 'closed_won', type: 'DECIMAL(15,2)' }
    ]},
  ],
  // Commercial - CRM
  'commercial_crm': [
    { id: 'account_health', name: 'account_health_score', schema: 'commercial_crm', columns: [
      { name: 'account_id', type: 'VARCHAR(20)' }, { name: 'health_score', type: 'INT' }, { name: 'engagement_level', type: 'VARCHAR(20)' },
      { name: 'nps_score', type: 'INT' }, { name: 'support_tickets', type: 'INT' }, { name: 'last_contact', type: 'DATE' }
    ]},
    { id: 'contact_activity', name: 'contact_activity_log', schema: 'commercial_crm', columns: [
      { name: 'activity_id', type: 'BIGINT' }, { name: 'contact_id', type: 'VARCHAR(20)' }, { name: 'activity_type', type: 'VARCHAR(30)' },
      { name: 'activity_date', type: 'DATE' }, { name: 'outcome', type: 'VARCHAR(50)' }, { name: 'rep_id', type: 'VARCHAR(20)' }
    ]},
  ],
  // Commercial - Marketing
  'commercial_marketing': [
    { id: 'campaign_performance', name: 'campaign_performance', schema: 'commercial_marketing', columns: [
      { name: 'campaign_id', type: 'VARCHAR(20)' }, { name: 'campaign_name', type: 'VARCHAR(100)' }, { name: 'channel', type: 'VARCHAR(30)' },
      { name: 'impressions', type: 'BIGINT' }, { name: 'clicks', type: 'INT' }, { name: 'conversions', type: 'INT' },
      { name: 'spend', type: 'DECIMAL(12,2)' }, { name: 'revenue_attributed', type: 'DECIMAL(15,2)' }
    ]},
  ],
  // Supply Chain - Inventory
  'sc_inventory': [
    { id: 'stock_levels', name: 'current_stock_levels', schema: 'sc_inventory', columns: [
      { name: 'sku', type: 'VARCHAR(30)' }, { name: 'warehouse_id', type: 'VARCHAR(10)' }, { name: 'quantity_on_hand', type: 'INT' },
      { name: 'quantity_reserved', type: 'INT' }, { name: 'reorder_point', type: 'INT' }, { name: 'last_updated', type: 'TIMESTAMP' }
    ]},
    { id: 'inventory_turnover', name: 'inventory_turnover', schema: 'sc_inventory', columns: [
      { name: 'sku', type: 'VARCHAR(30)' }, { name: 'period', type: 'VARCHAR(10)' }, { name: 'avg_inventory', type: 'DECIMAL(12,2)' },
      { name: 'cogs', type: 'DECIMAL(15,2)' }, { name: 'turnover_ratio', type: 'DECIMAL(6,3)' }, { name: 'days_on_hand', type: 'INT' }
    ]},
  ],
  // Supply Chain - Logistics
  'sc_logistics': [
    { id: 'shipment_tracking', name: 'shipment_tracking', schema: 'sc_logistics', columns: [
      { name: 'shipment_id', type: 'VARCHAR(30)' }, { name: 'order_id', type: 'BIGINT' }, { name: 'carrier', type: 'VARCHAR(30)' },
      { name: 'ship_date', type: 'DATE' }, { name: 'delivery_date', type: 'DATE' }, { name: 'status', type: 'VARCHAR(20)' },
      { name: 'origin_warehouse', type: 'VARCHAR(10)' }, { name: 'destination_zip', type: 'VARCHAR(10)' }
    ]},
    { id: 'delivery_metrics', name: 'delivery_performance_metrics', schema: 'sc_logistics', columns: [
      { name: 'period', type: 'VARCHAR(10)' }, { name: 'on_time_rate', type: 'DECIMAL(5,3)' }, { name: 'avg_transit_days', type: 'DECIMAL(4,1)' },
      { name: 'damage_rate', type: 'DECIMAL(5,4)' }, { name: 'return_shipments', type: 'INT' }
    ]},
  ],
  // Supply Chain - Procurement
  'sc_procurement': [
    { id: 'purchase_orders', name: 'purchase_orders', schema: 'sc_procurement', columns: [
      { name: 'po_id', type: 'VARCHAR(20)' }, { name: 'vendor_id', type: 'VARCHAR(20)' }, { name: 'order_date', type: 'DATE' },
      { name: 'expected_date', type: 'DATE' }, { name: 'total_value', type: 'DECIMAL(15,2)' }, { name: 'status', type: 'VARCHAR(20)' }
    ]},
    { id: 'vendor_scorecard', name: 'vendor_scorecard', schema: 'sc_procurement', columns: [
      { name: 'vendor_id', type: 'VARCHAR(20)' }, { name: 'vendor_name', type: 'VARCHAR(100)' }, { name: 'quality_score', type: 'INT' },
      { name: 'delivery_score', type: 'INT' }, { name: 'cost_score', type: 'INT' }, { name: 'overall_rating', type: 'DECIMAL(3,2)' }
    ]},
  ],
  // Finance - GL
  'fin_gl': [
    { id: 'gl_balances', name: 'gl_account_balances', schema: 'fin_gl', columns: [
      { name: 'account_code', type: 'VARCHAR(20)' }, { name: 'account_name', type: 'VARCHAR(100)' }, { name: 'period', type: 'VARCHAR(10)' },
      { name: 'debit', type: 'DECIMAL(15,2)' }, { name: 'credit', type: 'DECIMAL(15,2)' }, { name: 'balance', type: 'DECIMAL(15,2)' }
    ]},
    { id: 'trial_balance', name: 'trial_balance_summary', schema: 'fin_gl', columns: [
      { name: 'period_end', type: 'DATE' }, { name: 'total_assets', type: 'DECIMAL(18,2)' }, { name: 'total_liabilities', type: 'DECIMAL(18,2)' },
      { name: 'equity', type: 'DECIMAL(18,2)' }, { name: 'net_income', type: 'DECIMAL(15,2)' }
    ]},
  ],
  // Finance - AR
  'fin_ar': [
    { id: 'aging_report', name: 'ar_aging_report', schema: 'fin_ar', columns: [
      { name: 'customer_id', type: 'VARCHAR(20)' }, { name: 'current_balance', type: 'DECIMAL(15,2)' }, { name: 'days_30', type: 'DECIMAL(15,2)' },
      { name: 'days_60', type: 'DECIMAL(15,2)' }, { name: 'days_90', type: 'DECIMAL(15,2)' }, { name: 'over_90', type: 'DECIMAL(15,2)' }
    ]},
    { id: 'collections', name: 'collections_summary', schema: 'fin_ar', columns: [
      { name: 'period', type: 'VARCHAR(10)' }, { name: 'total_invoiced', type: 'DECIMAL(18,2)' }, { name: 'total_collected', type: 'DECIMAL(18,2)' },
      { name: 'dso', type: 'DECIMAL(5,1)' }, { name: 'collection_rate', type: 'DECIMAL(5,3)' }
    ]},
  ],
  // Finance - Planning
  'fin_planning': [
    { id: 'budget_vs_actual', name: 'budget_vs_actual', schema: 'fin_planning', columns: [
      { name: 'cost_center', type: 'VARCHAR(20)' }, { name: 'period', type: 'VARCHAR(10)' }, { name: 'budget', type: 'DECIMAL(15,2)' },
      { name: 'actual', type: 'DECIMAL(15,2)' }, { name: 'variance', type: 'DECIMAL(15,2)' }, { name: 'variance_pct', type: 'DECIMAL(6,3)' }
    ]},
    { id: 'forecast_model', name: 'rolling_forecast', schema: 'fin_planning', columns: [
      { name: 'forecast_version', type: 'VARCHAR(20)' }, { name: 'period', type: 'VARCHAR(10)' }, { name: 'revenue_forecast', type: 'DECIMAL(18,2)' },
      { name: 'expense_forecast', type: 'DECIMAL(18,2)' }, { name: 'ebit_forecast', type: 'DECIMAL(15,2)' }
    ]},
  ],
};



export const mockTables = [
  { id: 'sales_transactions', name: 'sales_transactions', catalog: 'poc_workspace', schema: 'gold_plus_datamart' },
  { id: 'customer_orders', name: 'customer_orders', catalog: 'poc_workspace', schema: 'gold_plus_datamart' },
  { id: 'product_inventory', name: 'product_inventory', catalog: 'poc_workspace', schema: 'gold_plus_datamart' },
  { id: 'user_sessions', name: 'user_sessions', catalog: 'poc_workspace', schema: 'gold_plus_datamart' },
  { id: 'revenue_metrics', name: 'revenue_metrics', catalog: 'poc_workspace', schema: 'gold_plus_datamart' },
];

export const mockTablePreview = {
  columns: ['id', 'customer_id', 'order_date', 'amount', 'product_category', 'region', 'status'],
  rows: [
    { id: 1, customer_id: 'C001', order_date: '2024-01-15', amount: 1250.00, product_category: 'Electronics', region: 'North', status: 'Completed' },
    { id: 2, customer_id: 'C002', order_date: '2024-01-15', amount: 890.50, product_category: 'Apparel', region: 'South', status: 'Completed' },
    { id: 3, customer_id: 'C003', order_date: '2024-01-16', amount: 2340.00, product_category: 'Electronics', region: 'East', status: 'Pending' },
    { id: 4, customer_id: 'C001', order_date: '2024-01-16', amount: 450.25, product_category: 'Home', region: 'North', status: 'Completed' },
    { id: 5, customer_id: 'C004', order_date: '2024-01-17', amount: 1890.00, product_category: 'Electronics', region: 'West', status: 'Completed' },
    { id: 6, customer_id: 'C005', order_date: '2024-01-17', amount: 675.00, product_category: 'Apparel', region: 'South', status: 'Processing' },
    { id: 7, customer_id: 'C002', order_date: '2024-01-18', amount: 3200.00, product_category: 'Electronics', region: 'East', status: 'Completed' },
    { id: 8, customer_id: 'C006', order_date: '2024-01-18', amount: 125.50, product_category: 'Home', region: 'North', status: 'Completed' },
    { id: 9, customer_id: 'C003', order_date: '2024-01-19', amount: 980.00, product_category: 'Apparel', region: 'West', status: 'Pending' },
    { id: 10, customer_id: 'C007', order_date: '2024-01-19', amount: 4500.00, product_category: 'Electronics', region: 'South', status: 'Completed' },
  ],
};

export const mockKPIStats = {
  total: 247,
  createdToday: 12,
  createdThisWeek: 48,
  createdThisMonth: 156,
};

export const mockRecentKPIs: Array<{ id: string; name: string; owner: string; createdAt: string; status: 'Active' | 'Pending' | 'Draft' }> = [
  { id: 'KPI-001', name: 'Monthly Revenue Growth', owner: 'John Smith', createdAt: '2024-01-19T14:30:00Z', status: 'Active' },
  { id: 'KPI-002', name: 'Customer Acquisition Rate', owner: 'Sarah Johnson', createdAt: '2024-01-19T10:15:00Z', status: 'Active' },
  { id: 'KPI-003', name: 'Average Order Value', owner: 'Mike Chen', createdAt: '2024-01-18T16:45:00Z', status: 'Active' },
  { id: 'KPI-004', name: 'Inventory Turnover Ratio', owner: 'Emily Davis', createdAt: '2024-01-18T09:20:00Z', status: 'Pending' },
  { id: 'KPI-005', name: 'Customer Lifetime Value', owner: 'John Smith', createdAt: '2024-01-17T15:00:00Z', status: 'Active' },
];

export const mockDataQualityChecks = [
  { name: 'NULL Detection', description: 'Check for NULL values in critical columns', status: 'pending' as const },
  { name: 'Row Count Validation', description: 'Verify minimum row count threshold', status: 'pending' as const },
  { name: 'Type Alignment', description: 'Validate data type consistency', status: 'pending' as const },
  { name: 'Duplicate Detection', description: 'Identify duplicate group entries', status: 'pending' as const },
];

export const mockOptimizedSQL = `-- Optimized Query
SELECT 
    DATE_TRUNC('month', order_date) AS period,
    product_category,
    region,
    COUNT(DISTINCT customer_id) AS unique_customers,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_order_value
FROM poc_workspace.gold_plus_datamart.sales_transactions
WHERE status = 'Completed'
    AND order_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY 
    DATE_TRUNC('month', order_date),
    product_category,
    region
ORDER BY period DESC, total_revenue DESC;`;

export const mockQueryResult = {
  columns: ['period', 'product_category', 'region', 'unique_customers', 'total_revenue', 'avg_order_value'],
  rows: [
    { period: '2024-01', product_category: 'Electronics', region: 'South', unique_customers: 45, total_revenue: 125000.00, avg_order_value: 2777.78 },
    { period: '2024-01', product_category: 'Electronics', region: 'East', unique_customers: 38, total_revenue: 98500.00, avg_order_value: 2592.11 },
    { period: '2024-01', product_category: 'Apparel', region: 'North', unique_customers: 52, total_revenue: 45000.00, avg_order_value: 865.38 },
    { period: '2024-01', product_category: 'Home', region: 'West', unique_customers: 29, total_revenue: 32000.00, avg_order_value: 1103.45 },
  ],
};

export const kpiCategories = [
  { value: 'sales', label: 'Sales' },
  { value: 'demand', label: 'Demand' },
  { value: 'execution', label: 'Execution' },
  { value: 'leading', label: 'Leading' },
  { value: 'lagging', label: 'Lagging' },
];

export const aggregationTypes = [
  { value: 'SUM', label: 'Sum' },
  { value: 'AVG', label: 'Average' },
  { value: 'COUNT', label: 'Count' },
  { value: 'COUNT_DISTINCT', label: 'Count Distinct' },
  { value: 'MIN', label: 'Minimum' },
  { value: 'MAX', label: 'Maximum' },
];

export const timeGrains = [
  { value: 'DAY', label: 'Daily' },
  { value: 'WEEK', label: 'Weekly' },
  { value: 'MONTH', label: 'Monthly' },
  { value: 'QUARTER', label: 'Quarterly' },
  { value: 'YEAR', label: 'Yearly' },
];

// Sample data rows for table previews
export const mockTableSampleData: Record<string, Array<Record<string, string | number>>> = {
  'fact_sales': [
    { sale_id: 100001, customer_key: 1024, product_key: 501, sale_date: '2024-01-15', quantity: 3, unit_price: 249.99, total_amount: 749.97, discount_pct: 0.00, region_code: 'US-WEST' },
    { sale_id: 100002, customer_key: 1156, product_key: 203, sale_date: '2024-01-15', quantity: 1, unit_price: 899.00, total_amount: 899.00, discount_pct: 10.00, region_code: 'US-EAST' },
    { sale_id: 100003, customer_key: 1089, product_key: 501, sale_date: '2024-01-16', quantity: 2, unit_price: 249.99, total_amount: 499.98, discount_pct: 0.00, region_code: 'EU-NORTH' },
    { sale_id: 100004, customer_key: 1201, product_key: 712, sale_date: '2024-01-16', quantity: 5, unit_price: 49.99, total_amount: 249.95, discount_pct: 5.00, region_code: 'US-SOUTH' },
    { sale_id: 100005, customer_key: 1024, product_key: 305, sale_date: '2024-01-17', quantity: 1, unit_price: 1299.00, total_amount: 1299.00, discount_pct: 15.00, region_code: 'US-WEST' },
  ],
  'fact_orders': [
    { order_id: 200001, customer_key: 1024, order_date: '2024-01-14', ship_date: '2024-01-16', order_status: 'Delivered', total_value: 749.97, shipping_cost: 12.99, channel: 'Web' },
    { order_id: 200002, customer_key: 1156, order_date: '2024-01-14', ship_date: '2024-01-17', order_status: 'Delivered', total_value: 899.00, shipping_cost: 0.00, channel: 'Mobile App' },
    { order_id: 200003, customer_key: 1089, order_date: '2024-01-15', ship_date: '2024-01-18', order_status: 'In Transit', total_value: 499.98, shipping_cost: 24.99, channel: 'Web' },
    { order_id: 200004, customer_key: 1201, order_date: '2024-01-15', ship_date: '2024-01-16', order_status: 'Delivered', total_value: 249.95, shipping_cost: 8.99, channel: 'Retail' },
    { order_id: 200005, customer_key: 1024, order_date: '2024-01-16', ship_date: '', order_status: 'Processing', total_value: 1299.00, shipping_cost: 0.00, channel: 'Web' },
  ],
  'dim_customer': [
    { customer_key: 1024, customer_id: 'CUST-1024', customer_name: 'Acme Corporation', segment: 'Enterprise', region: 'North America', country: 'USA', tier: 'Platinum', created_date: '2021-03-15' },
    { customer_key: 1089, customer_id: 'CUST-1089', customer_name: 'TechStart GmbH', segment: 'Mid-Market', region: 'Europe', country: 'Germany', tier: 'Gold', created_date: '2022-06-20' },
    { customer_key: 1156, customer_id: 'CUST-1156', customer_name: 'Global Retail Inc', segment: 'Enterprise', region: 'North America', country: 'Canada', tier: 'Platinum', created_date: '2020-11-08' },
    { customer_key: 1201, customer_id: 'CUST-1201', customer_name: 'QuickShop LLC', segment: 'SMB', region: 'North America', country: 'USA', tier: 'Silver', created_date: '2023-01-22' },
    { customer_key: 1245, customer_id: 'CUST-1245', customer_name: 'Asia Pacific Trading', segment: 'Enterprise', region: 'Asia Pacific', country: 'Singapore', tier: 'Gold', created_date: '2022-09-14' },
  ],
  'daily_revenue_metrics': [
    { metric_date: '2024-01-15', revenue: 125430.50, orders_count: 342, avg_order_value: 366.76, unique_customers: 298, region: 'US-WEST' },
    { metric_date: '2024-01-15', revenue: 98750.25, orders_count: 276, avg_order_value: 357.79, unique_customers: 241, region: 'US-EAST' },
    { metric_date: '2024-01-16', revenue: 142890.00, orders_count: 389, avg_order_value: 367.33, unique_customers: 334, region: 'US-WEST' },
    { metric_date: '2024-01-16', revenue: 87650.75, orders_count: 245, avg_order_value: 357.76, unique_customers: 212, region: 'EU-NORTH' },
    { metric_date: '2024-01-17', revenue: 156200.00, orders_count: 412, avg_order_value: 379.13, unique_customers: 356, region: 'US-WEST' },
  ],
  'sales_pipeline': [
    { opportunity_id: 'OPP-5001', account_id: 'ACCT-1024', stage: 'Negotiation', amount: 250000.00, probability: 75.00, close_date: '2024-02-28', owner_id: 'REP-101', created_date: '2023-11-15' },
    { opportunity_id: 'OPP-5002', account_id: 'ACCT-1089', stage: 'Proposal', amount: 125000.00, probability: 50.00, close_date: '2024-03-15', owner_id: 'REP-102', created_date: '2023-12-01' },
    { opportunity_id: 'OPP-5003', account_id: 'ACCT-1156', stage: 'Discovery', amount: 500000.00, probability: 25.00, close_date: '2024-04-30', owner_id: 'REP-101', created_date: '2024-01-05' },
    { opportunity_id: 'OPP-5004', account_id: 'ACCT-1201', stage: 'Closed Won', amount: 75000.00, probability: 100.00, close_date: '2024-01-10', owner_id: 'REP-103', created_date: '2023-10-20' },
    { opportunity_id: 'OPP-5005', account_id: 'ACCT-1245', stage: 'Qualification', amount: 180000.00, probability: 10.00, close_date: '2024-05-31', owner_id: 'REP-102', created_date: '2024-01-08' },
  ],
};