import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RecentKPI {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
  status: 'Active' | 'Pending' | 'Draft';
}

interface RecentKPIsTableProps {
  kpis: RecentKPI[];
  isLoading?: boolean;
  className?: string;
}

export function RecentKPIsTable({ kpis, isLoading, className }: RecentKPIsTableProps) {
  if (isLoading) {
    return (
      <div className={cn("card-enterprise overflow-hidden", className)}>
        <div className="p-6 border-b border-border/50">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-40 bg-muted rounded animate-pulse flex-1" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-28 bg-muted rounded animate-pulse" />
              <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("card-enterprise overflow-hidden", className)}>
      <div className="p-6 border-b border-border/50">
        <h3 className="text-lg font-semibold text-foreground">Recent KPIs</h3>
        <p className="text-sm text-muted-foreground mt-1">Latest metrics created across the platform</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            <TableHead className="font-semibold">ID</TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Owner</TableHead>
            <TableHead className="font-semibold">Created</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kpis.map((kpi) => (
            <TableRow key={kpi.id} className="hover:bg-secondary/20 cursor-pointer transition-colors">
              <TableCell className="font-mono text-sm text-muted-foreground">{kpi.id}</TableCell>
              <TableCell className="font-medium">{kpi.name}</TableCell>
              <TableCell className="text-muted-foreground">{kpi.owner}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(kpi.createdAt), 'MMM d, yyyy h:mm a')}
              </TableCell>
              <TableCell>
                <StatusBadge 
                  status={kpi.status === 'Active' ? 'active' : kpi.status === 'Pending' ? 'pending' : 'pending'} 
                  label={kpi.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}