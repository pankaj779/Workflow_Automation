import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { KPILibraryHeader } from "@/components/library/KPILibraryHeader";
import { KPIStatsBar } from "@/components/library/KPIStatsBar";
import { KPICategoryTabs } from "@/components/library/KPICategoryTabs";
import { KPICard } from "@/components/library/KPICard";
import { EmptySearchState } from "@/components/library/EmptySearchState";
import { CardSkeleton } from "@/components/ui/skeleton-loader";
import { mockKPILibraryStats, mockKPICategories, mockKPILibraryItems, mockDraftKPIs } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { DefaultService } from "@/api-client";
import { apiConfig } from "@/lib/api-config";

const CATEGORY_ICONS: Record<string, string> = {
  sales: "trending-up",
  demand: "bar-chart",
  execution: "settings",
  leading: "zap",
  lagging: "clock",
};


const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // const [stats] = useState(mockKPILibraryStats);
  // const [categories] = useState(mockKPICategories);
  // const [kpiItems, setKpiItems] = useState(mockKPILibraryItems);
  // const [draftKPIs] = useState(mockDraftKPIs);
  const [stats, setStats] = useState<any>(null);
  const [kpiItems, setKpiItems] = useState<any[]>([]);
  const [draftKPIs, setDraftKPIs] = useState<any[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const categories = useMemo(() => {
  if (!kpiItems.length) {
    return [{ id: "all", name: "All Categories", icon: "grid", count: 0 }];
  }

  const counts: Record<string, number> = {};
    kpiItems.forEach((kpi) => {
      const cat = kpi.category?.toLowerCase() || "uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const dynamicCategories = Object.entries(counts).map(([id, count]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      icon: CATEGORY_ICONS[id] || "grid",
      count,
    }));

    return [
      {
        id: "all",
        name: "All Categories",
        icon: "grid",
        count: kpiItems.length,
      },
      ...dynamicCategories,
    ];
  }, [kpiItems]);



  const handleResumeDraft = (draftId: string) => {
    console.log('Resuming draft:', draftId);
    navigate('/create-kpi');
  };

  // const handleToggleFavorite = (kpiId: string) => {
  //   setKpiItems(prev => 
  //     prev.map(kpi => 
  //       kpi.id === kpiId ? { ...kpi, isFavorite: !kpi.isFavorite } : kpi
  //     )
  //   );
  //   // Also update selected KPI if it's open in modal
  //   if (selectedKPI?.id === kpiId) {
  //     setSelectedKPI(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
  //   }
  // };

  const handleToggleFavorite = async (kpiId: string) => {
    await DefaultService.toggleFavoriteKpisKpiIdFavoritePost(kpiId, currentUserEmail);

    setKpiItems(prev =>
      prev.map(kpi =>
        kpi.id === kpiId ? { ...kpi, isFavorite: !kpi.isFavorite } : kpi
      )
    );

  };
  const handleCardClick = (kpi: typeof mockKPILibraryItems[0]) => {
    navigate(`/kpis/${kpi.id}`);
  };

  const favoriteKPIs = useMemo(() => 
    kpiItems.filter(kpi => kpi.isFavorite), 
    [kpiItems]
  );

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setIsLoading(false);
  //   }, 800);
  //   return () => clearTimeout(timer);
  // }, []);
  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch(`${apiConfig.baseUrl}/me`).then(r => r.json());
        const email = meRes.email || "";
        setCurrentUserEmail(email);

        const [summary, kpis, drafts] = await Promise.all([
          DefaultService.getDashboardSummaryDashboardSummaryGet(),
          DefaultService.listKpisKpisGet(email),
          DefaultService.listDraftsDraftsGet(email),
        ]);

        const safeSummary = summary && typeof summary === "object"
          ? {
              totalKPIs: summary.totalKPIs ?? 0,
              activeKPIs: summary.activeKPIs ?? 0,
              categories: summary.categories ?? 0,
              thisMonth: summary.thisMonth ?? (summary as any).changeMetrics?.thisMonth ?? 0,
              thisWeek: summary.thisWeek ?? (summary as any).changeMetrics?.thisWeek ?? 0,
              changes: summary.changes ?? {
                totalKPIs: 0,
                activeKPIs: 0,
                categories: 0,
                thisMonth: 0,
                thisWeek: 0,
              },
            }
          : null;
        setStats(safeSummary);

        setKpiItems(Array.isArray(kpis) ? kpis : []);
        setDraftKPIs(Array.isArray(drafts) ? drafts : []);
      } catch (_) {
        setStats({
          totalKPIs: 0,
          activeKPIs: 0,
          categories: 0,
          thisMonth: 0,
          thisWeek: 0,
          changes: {
            totalKPIs: 0,
            activeKPIs: 0,
            categories: 0,
            thisMonth: 0,
            thisWeek: 0,
          },
        });
        setKpiItems([]);
        setDraftKPIs([]);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  // Filter by category, search, and favorites
  const filteredKPIs = useMemo(() => {
    let result = kpiItems;
    
    // Filter by favorites first
    if (showFavoritesOnly) {
      result = result.filter(kpi => kpi.isFavorite);
    }
    
    // Filter by category
    if (activeCategory !== "all") {
      result = result.filter(kpi => kpi.category === activeCategory);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(kpi => 
        kpi.name.toLowerCase().includes(query) ||
        kpi.definition.toLowerCase().includes(query) ||
        kpi.owner.toLowerCase().includes(query) ||
        kpi.category.toLowerCase().includes(query) ||
        kpi.frequency.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [kpiItems, activeCategory, searchQuery, showFavoritesOnly]);

  const hasNoResults = (searchQuery.trim() || showFavoritesOnly) && filteredKPIs.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <KPILibraryHeader
        onCreateNew={() => navigate('/create-kpi')}
        lastSync="2 mins ago"
        drafts={draftKPIs}
        onResumeDraft={handleResumeDraft}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
        favoriteCount={kpiItems.filter(k => k.isFavorite).length}
      />

      <main className="container mx-auto px-4 py-3 space-y-3">
        {/* Stats */}
        <section>
          {isLoading || !stats ? <CardSkeleton /> : <KPIStatsBar stats={stats} />}
        </section>

        {/* Category Tabs */}
        <section>
          <KPICategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </section>

        {/* No Results State */}
        {hasNoResults ? (
          <EmptySearchState searchQuery={showFavoritesOnly ? "favorites" : searchQuery} />
        ) : (
          <>
            {/* KPI List */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-foreground">
                  {showFavoritesOnly 
                    ? "Favorite KPIs" 
                    : activeCategory === "all" 
                      ? "All KPIs" 
                      : categories.find(c => c.id === activeCategory)?.name || "KPIs"}
                </h2>
                <span className="text-xs text-muted-foreground">{filteredKPIs.length} items</span>
              </div>
              {isLoading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredKPIs.map((kpi) => (
                    <KPICard 
                      key={kpi.id} 
                      {...kpi} 
                      viewMode={viewMode}
                      onToggleFavorite={handleToggleFavorite}
                      onClick={() => handleCardClick(kpi)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredKPIs.map((kpi) => (
                    <KPICard 
                      key={kpi.id} 
                      {...kpi} 
                      viewMode={viewMode}
                      onToggleFavorite={handleToggleFavorite}
                      onClick={() => handleCardClick(kpi)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

    </div>
  );
};

export default Index;
