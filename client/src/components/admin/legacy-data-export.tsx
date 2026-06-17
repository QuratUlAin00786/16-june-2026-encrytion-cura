import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Download, Lock, Users, UserRound, Upload, Loader2 } from "lucide-react";

type ExportKind = "patients-full" | "patients-import" | "users-full" | "users-import";

function parseFilenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1]?.trim() || fallback;
}

async function downloadExport(endpoint: string, fallbackFilename: string): Promise<number> {
  const res = await apiRequest("GET", endpoint);
  if (!res.ok) {
    let message = "Export failed";
    try {
      const data = await res.json();
      message = data.error || data.details || message;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }
    throw new Error(message);
  }

  const recordCount = Number(res.headers.get("X-Export-Record-Count") || "0");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = parseFilenameFromDisposition(
    res.headers.get("Content-Disposition"),
    fallbackFilename,
  );
  a.click();
  URL.revokeObjectURL(url);
  return recordCount;
}

const EXPORT_CONFIG: Record<
  ExportKind,
  { endpoint: string; fallback: string; label: string; description: string }
> = {
  "patients-full": {
    endpoint: "/api/patient-import/export/patients.sql",
    fallback: "patients-export.sql",
    label: "patients",
    description: "Full backup with all columns (decrypted PHI).",
  },
  "patients-import": {
    endpoint: "/api/patient-import/export/patients.sql?format=import",
    fallback: "patients-import.sql",
    label: "patients",
    description: "Import-compatible SQL for Patient SQL only or Users + Patients tabs.",
  },
  "users-full": {
    endpoint: "/api/patient-import/export/users.sql",
    fallback: "users-export.sql",
    label: "users",
    description: "Full backup with all user columns.",
  },
  "users-import": {
    endpoint: "/api/patient-import/export/users.sql?format=import",
    fallback: "users-import.sql",
    label: "patient users",
    description: "Patient-role users only — pair with patients-import SQL by email.",
  },
};

type ExportActionButtonProps = {
  kind: ExportKind;
  label: string;
  icon: ReactNode;
  busy: ExportKind | null;
  onExport: (kind: ExportKind) => void;
};

function ExportActionButton({ kind, label, icon, busy, onExport }: ExportActionButtonProps) {
  const isLoading = busy === kind;
  const isBlocked = busy !== null;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full justify-start bg-background",
        isLoading && "border-primary ring-1 ring-primary/30",
      )}
      disabled={isBlocked}
      aria-busy={isLoading}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isBlocked) onExport(kind);
      }}
    >
      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : icon}
      {isLoading ? "Exporting..." : label}
    </Button>
  );
}

export function LegacyDataExportPanel() {
  const [busy, setBusy] = useState<ExportKind | null>(null);

  const handleExport = async (kind: ExportKind) => {
    if (busy !== null) return;

    const config = EXPORT_CONFIG[kind];
    try {
      setBusy(kind);
      const count = await downloadExport(config.endpoint, config.fallback);
      toast({
        title: "Export downloaded",
        description: `${count || "All"} ${config.label} record(s). ${config.description}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export database records
          </CardTitle>
          <CardDescription>
            Download INSERT statements for your organization. Use{" "}
            <strong>Import-compatible</strong> exports to re-upload on the Patient SQL only or
            Users + Patients SQL tabs. Patient PHI is decrypted before export when encryption is
            enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div>
              <p className="text-base font-medium flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Patients table
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Export patients after decryption if encrypted is applied.
              </p>
            </div>
            <div className="space-y-2">
              <ExportActionButton
                kind="patients-full"
                label="Full backup (.sql)"
                icon={<Lock className="h-4 w-4 mr-2" />}
                busy={busy}
                onExport={handleExport}
              />
              <ExportActionButton
                kind="patients-import"
                label="Import-compatible (.sql)"
                icon={<Upload className="h-4 w-4 mr-2" />}
                busy={busy}
                onExport={handleExport}
              />
              <p className="text-xs text-muted-foreground">
                Import-compatible columns: first_name, last_name, date_of_birth, gender_at_birth,
                email, phone, nhs_number, address, organization_id
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div>
              <p className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users table
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Export users (plaintext). Import-compatible export includes patient-role users only.
              </p>
            </div>
            <div className="space-y-2">
              <ExportActionButton
                kind="users-full"
                label="Full backup (.sql)"
                icon={<Download className="h-4 w-4 mr-2" />}
                busy={busy}
                onExport={handleExport}
              />
              <ExportActionButton
                kind="users-import"
                label="Import-compatible (.sql)"
                icon={<Upload className="h-4 w-4 mr-2" />}
                busy={busy}
                onExport={handleExport}
              />
              <p className="text-xs text-muted-foreground">
                Import-compatible columns: organization_id, email, username, password_hash,
                first_name, last_name, role, is_active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
