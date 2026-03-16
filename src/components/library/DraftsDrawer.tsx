import { FileEdit, Clock, ChevronRight, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface DraftKPI {
  id: string;
  name: string;
  step: number;
  stepName: string;
  last_edited_at: string;
  table: string;
}

interface DraftsDrawerProps {
  drafts: DraftKPI[];
  onResumeDraft: (draftId: string) => void;
}

export function DraftsDrawer({ drafts, onResumeDraft }: DraftsDrawerProps) {
  if (drafts.length === 0) return null;

  return (
    <Sheet>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-dashed"
              >
                <FileEdit className="h-3.5 w-3.5" />
                Drafts
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {drafts.length}
                </Badge>
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">View and resume incomplete KPI definitions</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-muted-foreground" />
            Draft KPIs
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          <div className="space-y-3 pr-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="group p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => onResumeDraft(draft.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {draft.name || 'Untitled KPI'}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs mb-2">
                      Step {draft.step}: {draft.stepName}
                    </Badge>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Table2 className="h-3 w-3" />
                        {draft.table}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(draft.last_edited_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Resume
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}