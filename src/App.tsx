import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CreateKPI from "./pages/CreateKPI";
import ReportsPage from "./pages/Reports";
import KpiMetricsPage from "./pages/KpiMetrics";
import ColdStoragePage from "./pages/ColdStorage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/create-kpi" element={<CreateKPI />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/kpi-metrics" element={<KpiMetricsPage />} />
          <Route path="/cold-storage" element={<ColdStoragePage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
