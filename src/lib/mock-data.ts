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

