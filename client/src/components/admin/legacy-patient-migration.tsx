import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { buildUrl, getTenantSubdomain } from "@/lib/queryClient";
import {
  Upload,
  CheckCircle2,
  Eye,
  UserPlus,
  Lock,
  Download,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";

type ImportSummary = {
  batchId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  importedRecords: number;
  failedRecords: number;
  existingRecords: number;
  pendingRecords: number;
};

type StagingRow = {
  id: number;
  fullName?: string | null;
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
  validationStatus?: string | null;
  importStatus?: string | null;
  errorMessage?: string | null;
  duplicateReason?: string | null;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return {
    "X-Tenant-Subdomain": getTenantSubdomain(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function statusBadge(status?: string | null) {
  const value = String(status || "Pending");
  const variant =
    value === "Validated" || value === "Imported"
      ? "default"
      : value === "Duplicate"
        ? "secondary"
        : value === "Failed" || value === "Invalid"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{value}</Badge>;
}

export function LegacyPatientMigrationPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [preview, setPreview] = useState<StagingRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refreshSummary = async (id: string) => {
    const res = await fetch(buildUrl(`/api/patient-import/${encodeURIComponent(id)}/summary`), {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load summary");
    const data = await res.json();
    setSummary(data);
    return data as ImportSummary;
  };

  const refreshPreview = async (id: string) => {
    const res = await fetch(buildUrl(`/api/patient-import/${encodeURIComponent(id)}/preview?limit=100`), {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load preview");
    const data = await res.json();
    setPreview(Array.isArray(data) ? data : []);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Select script.sql", variant: "destructive" });
      return;
    }
    try {
      setBusy("upload");
      const form = new FormData();
      form.append("file", selectedFile);
      const res = await fetch(buildUrl("/api/patient-import/upload"), {
        method: "POST",
        headers: authHeaders(),
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setBatchId(data.batchId);
      await refreshSummary(data.batchId);
      await refreshPreview(data.batchId);
      toast({
        title: "SQL uploaded",
        description: `${data.totalRecords} records staged for validation`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (
    key: string,
    action: () => Promise<void>,
    successTitle: string,
  ) => {
    try {
      setBusy(key);
      await action();
      toast({ title: successTitle });
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const downloadReport = async (type: "validation" | "errors") => {
    if (!batchId) return;
    const res = await fetch(
      buildUrl(`/api/patient-import/${encodeURIComponent(batchId)}/report/${type}`),
      { headers: authHeaders(), credentials: "include" },
    );
    if (!res.ok) throw new Error("Failed to download report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "errors" ? "patient-import-errors.csv" : "patient-import-validation.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: "Total Records Found", value: summary?.totalRecords ?? 0 },
    { label: "Valid Records", value: summary?.validRecords ?? 0 },
    { label: "Invalid Records", value: summary?.invalidRecords ?? 0 },
    { label: "Duplicate Records", value: summary?.duplicateRecords ?? 0 },
    { label: "Imported Records", value: summary?.importedRecords ?? 0 },
    { label: "Failed Records", value: summary?.failedRecords ?? 0 },
    { label: "Already Existing", value: summary?.existingRecords ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Legacy Patient Data Migration &amp; Encryption</CardTitle>
          <CardDescription>
            Upload legacy <code>script.sql</code> patient INSERT statements. Files are parsed safely —
            SQL is never executed against the database. Imported patients use the same encryption
            pipeline as Add Patient / User Management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".sql"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button onClick={handleUpload} disabled={busy === "upload" || !selectedFile}>
              <Upload className="h-4 w-4 mr-2" />
              {busy === "upload" ? "Uploading..." : "Upload SQL Script"}
            </Button>
          </div>

          {batchId && (
            <p className="text-sm text-muted-foreground">
              Batch ID: <span className="font-mono">{batchId}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!batchId || busy !== null}
            onClick={() =>
              runAction(
                "validate",
                async () => {
                  const res = await fetch(
                    buildUrl(`/api/patient-import/${encodeURIComponent(batchId!)}/validate`),
                    { method: "POST", headers: authHeaders(), credentials: "include" },
                  );
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Validation failed");
                  setSummary(data);
                  await refreshPreview(batchId!);
                },
                "Validation complete",
              )
            }
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Validate Records
          </Button>

          <Button
            variant="outline"
            disabled={!batchId || busy !== null}
            onClick={() =>
              runAction(
                "preview",
                async () => {
                  await refreshPreview(batchId!);
                  await refreshSummary(batchId!);
                },
                "Preview refreshed",
              )
            }
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Records
          </Button>

          <Button
            disabled={!batchId || busy !== null}
            onClick={() =>
              runAction(
                "import",
                async () => {
                  const res = await fetch(
                    buildUrl(`/api/patient-import/${encodeURIComponent(batchId!)}/import`),
                    { method: "POST", headers: authHeaders(), credentials: "include" },
                  );
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Import failed");
                  setSummary(data);
                  await refreshPreview(batchId!);
                },
                "Import complete",
              )
            }
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patients
          </Button>

          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              runAction(
                "encrypt",
                async () => {
                  const res = await fetch(buildUrl("/api/patient-import/encrypt-existing"), {
                    method: "POST",
                    headers: { ...authHeaders(), "Content-Type": "application/json" },
                    credentials: "include",
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Encryption failed");
                  toast({
                    title: "Encryption finished",
                    description: `Processed ${data.processed}, failed ${data.failed}, skipped ${data.skipped}`,
                  });
                },
                "Existing patients encrypted",
              )
            }
          >
            <Lock className="h-4 w-4 mr-2" />
            Encrypt Existing Patients
          </Button>

          <Button
            variant="outline"
            disabled={!batchId || busy !== null}
            onClick={() => runAction("report-val", () => downloadReport("validation"), "Validation report downloaded")}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Validation Report
          </Button>

          <Button
            variant="outline"
            disabled={!batchId || busy !== null}
            onClick={() => runAction("report-err", () => downloadReport("errors"), "Error report downloaded")}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download Error Report
          </Button>

          <Button
            variant="ghost"
            disabled={!batchId || busy !== null}
            onClick={() =>
              runAction(
                "refresh",
                async () => {
                  await refreshSummary(batchId!);
                  await refreshPreview(batchId!);
                },
                "Summary refreshed",
              )
            }
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staging Preview</CardTitle>
            <CardDescription>First {preview.length} records in this batch</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>CNIC</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Import</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.fullName || "—"}</TableCell>
                    <TableCell>{row.cnic || "—"}</TableCell>
                    <TableCell>{row.phone || "—"}</TableCell>
                    <TableCell>{row.email || "—"}</TableCell>
                    <TableCell>{statusBadge(row.validationStatus)}</TableCell>
                    <TableCell>{statusBadge(row.importStatus)}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {row.errorMessage || row.duplicateReason || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
