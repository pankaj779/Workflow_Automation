import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KPIMetadata } from "@/types/kpi";
import { format } from "date-fns";
import {
  CheckCircle2,
  Copy,
  Download,
  Home,
  Plus,
  FileCode,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  FileText,
  GitBranch,
  FileSignature,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface CompletionStepProps {
  metadata: KPIMetadata;
  signatures: { metadata: string; lineage: string; semantic?: string | null };
  sqlDefinition: string;
}

export function CompletionStep({ metadata, signatures, sqlDefinition }: CompletionStepProps) {
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopyId = () => {
    navigator.clipboard.writeText(metadata.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const metadataFields = [
    { label: 'KPI ID', value: metadata.id, icon: FileText, copyable: true },
    { label: 'Owner', value: metadata.owner, icon: User },
    { label: 'Created', value: format(new Date(metadata.createdAt || new Date()), 'PPpp'), icon: Calendar },
    { label: 'KPI Name', value: metadata.name, icon: FileText },
    { label: 'Description', value: metadata.description, icon: FileText },
    { label: 'Business Description', value: metadata.businessDescription || 'N/A', icon: FileText },
    { label: 'Metadata Signature', value: signatures.metadata, icon: FileSignature, mono: true },
    { label: 'Lineage Signature', value: signatures.lineage, icon: GitBranch, mono: true },
    { label: 'Semantic Signature', value: signatures.semantic || 'N/A', icon: Sparkles, mono: true },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">KPI Created Successfully</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your KPI has been validated and stored in the consolidated tables.
          </p>
        </div>
      </div>

      {/* Metadata Summary */}
      <div className="card-enterprise overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-secondary/30">
          <h3 className="text-lg font-semibold">KPI Metadata Summary</h3>
        </div>
        <div className="divide-y divide-border/50">
          {metadataFields.map((field) => (
            <div key={field.label} className="flex items-start gap-4 p-4 hover:bg-secondary/20 transition-colors">
              <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                <field.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
                <p className={cn(
                  "mt-1 text-foreground break-words",
                  field.mono && "font-mono text-sm"
                )}>
                  {field.value}
                </p>
              </div>
              {field.copyable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyId}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SQL Definition Toggle */}
      <div className="card-enterprise overflow-hidden">
        <button
          onClick={() => setShowSQL(!showSQL)}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCode className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">SQL Definition</span>
          </div>
          {showSQL ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        {showSQL && (
          <div className="p-4 border-t border-border/50 bg-foreground/5">
            <pre className="font-mono text-sm overflow-x-auto whitespace-pre-wrap">
              {sqlDefinition}
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center pt-6">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button
          onClick={() => navigate('/create-kpi')}
          className="gap-2 gradient-primary hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Another KPI
        </Button>
      </div>
    </div>
  );
}