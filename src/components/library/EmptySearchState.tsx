import { SearchX } from "lucide-react";

interface EmptySearchStateProps {
  searchQuery: string;
}

export function EmptySearchState({ searchQuery }: EmptySearchStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="p-4 rounded-full bg-muted mb-4">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No KPIs Found</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        No KPIs match your search for "<span className="font-medium text-foreground">{searchQuery}</span>". 
        Try adjusting your search terms or filters.
      </p>
    </div>
  );
}
