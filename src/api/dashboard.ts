const BASE_URL = "http://127.0.0.1:8000";

export interface DashboardSummaryResponse {
  total_kpis: number;
  active_kpis: number;
  weekly_created: number;
  monthly_created: number;
}

export interface DashboardStats {
  totalKPIs: number;
  activeKPIs: number;
  categories: number;   // mapped from weekly_created
  thisMonth: number;    // mapped from monthly_created
  changes: {
    totalKPIs: number;
    activeKPIs: number;
    categories: number;
    thisMonth: number;
  };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${BASE_URL}/dashboard/summary`);

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard summary");
  }

  const data: DashboardSummaryResponse = await res.json();

  return {
    totalKPIs: data.total_kpis,
    activeKPIs: data.active_kpis,
    categories: data.weekly_created,
    thisMonth: data.monthly_created,

    // ⚠️ For now we don’t have history → set 0
    changes: {
      totalKPIs: 0,
      activeKPIs: 0,
      categories: 0,
      thisMonth: 0,
    },
  };
}