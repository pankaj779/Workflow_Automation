import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPIMetadata } from "@/types/kpi";
import { kpiCategories } from "@/lib/mock-data";
import { ChevronLeft, ChevronRight, Info, Database, Settings, Tag } from "lucide-react";

interface TargetTable {
  id: string;
  name: string;
  catalog: string;
  schema: string;
}

interface MetadataStepProps {
  metadata: KPIMetadata;
  onMetadataChange: (metadata: KPIMetadata) => void;
  targetTables: TargetTable[];
  selectedTargetTables: string[];
  onTargetTablesChange: (ids: string[]) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MetadataStep({ 
  metadata, 
  onMetadataChange, 
  targetTables,
  selectedTargetTables,
  onTargetTablesChange,
  selectedCategory,
  onCategoryChange,
  onNext, 
  onBack 
}: MetadataStepProps) {
  const isValid = metadata.name.trim() && metadata.description.trim() && selectedCategory;

  const handleChange = (field: keyof KPIMetadata, value: string) => {
    onMetadataChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Define KPI Metadata</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Provide essential details for documentation, governance, and discovery.
        </p>
      </div>

      {/* Configuration Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* KPI Category */}
        <div className="card-enterprise p-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground">KPI Category <span className="text-destructive">*</span></h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Classify this KPI for better organization and discovery.
          </p>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {kpiCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Storage */}
        <div className="card-enterprise p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground">Target Storage</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Select destination table for this KPI.
          </p>
          <Select 
            value={selectedTargetTables[0] || ''} 
            onValueChange={(v) => onTargetTablesChange([v])}
          >
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Select table..." />
            </SelectTrigger>
            <SelectContent>
              {targetTables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  <div className="flex flex-col">
                    <span>{table.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{table.catalog}.{table.schema}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metadata Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="kpiName" className="text-xs font-medium">
            KPI Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="kpiName"
            value={metadata.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g., Net Sales Revenue"
            className="bg-background h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs font-medium">
            Definition <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={metadata.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe what this KPI measures and its technical definition..."
            className="bg-background min-h-[70px] resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessDescription" className="text-xs font-medium">
            Formula (Business Description)
          </Label>
          <Textarea
            id="businessDescription"
            value={metadata.businessDescription}
            onChange={(e) => handleChange("businessDescription", e.target.value)}
            placeholder="Explain the business formula and context for this metric..."
            className="bg-background min-h-[70px] resize-none text-sm"
          />
          {/* <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="h-2.5 w-2.5" />
            Auto-filled based on KPI logic when available
          </p> */}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner" className="text-xs font-medium">
            Owner
          </Label>
          <Input
            id="owner"
            value={metadata.owner}
            readOnly
            className="bg-muted cursor-not-allowed text-muted-foreground h-8 text-sm"
          />
          {/* <p className="text-[10px] text-muted-foreground">Auto-filled from logged-in user</p> */}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          size="sm"
          disabled={!isValid}
          className="gap-1.5"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}