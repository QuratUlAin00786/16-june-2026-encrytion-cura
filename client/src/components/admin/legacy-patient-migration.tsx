import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { buildUrl, getTenantSubdomain, apiUpload } from "@/lib/queryClient";
import {
  Upload,
  CheckCircle2,
  Eye,
  UserPlus,
  Lock,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Database,
  AlertTriangle,
  Save,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LegacyUserPatientMigrationPanel } from "@/components/admin/legacy-user-patient-migration";
import { LegacyDataExportPanel } from "@/components/admin/legacy-data-export";

const UPLOADED_SQL_PREVIEW_LIMIT = 200;

type InsertedPatient = {
  stagingId: number;
  patientDbId: number;
  patientId: string;
  fullName: string;
  email: string;
  phone?: string;
};

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
  insertedThisRun?: number;
  insertedPatients?: InsertedPatient[];
  databaseSchema?: string;
  message?: string;
  skippedDuplicatesThisRun?: number;
  duplicateRows?: StagingRow[];
};

type StagingRow = {
  id: number;
  fullName?: string | null;
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  validationStatus?: string | null;
  importStatus?: string | null;
  errorMessage?: string | null;
  duplicateReason?: string | null;
  importedPatientId?: number | null;
};

type DuplicateDraft = {
  fullName: string;
  cnic: string;
  phone: string;
  email: string;
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

function SqlChangesPanel({
  title,
  description,
  sql,
  testId,
}: {
  title: string;
  description: string;
  sql: string;
  testId?: string;
}) {
  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      toast({ title: "SQL copied to clipboard" });
    } catch {
      toast({ title: "Could not copy SQL", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={copySql}>
            <Copy className="h-4 w-4 mr-2" />
            Copy SQL
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] w-full rounded-md border bg-muted/40">
          <pre
            className="p-4 text-xs font-mono whitespace-pre-wrap break-all"
            data-testid={testId}
          >
            {sql}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function LegacyPatientMigrationPanel() {
  return (
    <Tabs defaultValue="patients" className="space-y-4">
      <TabsList>
        <TabsTrigger value="patients">Patient SQL only</TabsTrigger>
        <TabsTrigger value="user-patient">Users + Patients SQL</TabsTrigger>
        <TabsTrigger value="export">Export</TabsTrigger>
      </TabsList>
      <TabsContent value="patients">
        <LegacyPatientSqlImportPanel />
      </TabsContent>
      <TabsContent value="user-patient">
        <LegacyUserPatientMigrationPanel />
      </TabsContent>
      <TabsContent value="export">
        <LegacyDataExportPanel />
      </TabsContent>
    </Tabs>
  );
}

function LegacyPatientSqlImportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [preview, setPreview] = useState<StagingRow[]>([]);
  const [uploadedSqlStatements, setUploadedSqlStatements] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [recentlyInsertedPatients, setRecentlyInsertedPatients] = useState<InsertedPatient[]>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateRows, setDuplicateRows] = useState<StagingRow[]>([]);
  const [duplicateDrafts, setDuplicateDrafts] = useState<Record<number, DuplicateDraft>>({});
  const [savingRowId, setSavingRowId] = useState<number | null>(null);

  const loadDuplicateRows = async (id: string) => {
    const res = await fetch(buildUrl(`/api/patient-import/${encodeURIComponent(id)}/duplicates`), {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) return [] as StagingRow[];
    const data = await res.json();
    return Array.isArray(data) ? (data as StagingRow[]) : [];
  };

  const openDuplicateDialog = (rows: StagingRow[]) => {
    if (rows.length === 0) return;
    setDuplicateRows(rows);
    const drafts: Record<number, DuplicateDraft> = {};
    for (const row of rows) {
      drafts[row.id] = {
        fullName: row.fullName || "",
        cnic: row.cnic || "",
        phone: row.phone || "",
        email: row.email || "",
      };
    }
    setDuplicateDrafts(drafts);
    setDuplicateDialogOpen(true);
  };

  const refreshDuplicateDialog = async (id: string) => {
    const rows = await loadDuplicateRows(id);
    if (rows.length === 0) {
      setDuplicateDialogOpen(false);
      setDuplicateRows([]);
      setDuplicateDrafts({});
      return;
    }
    openDuplicateDialog(rows);
  };

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
    const res = await fetch(
      buildUrl(`/api/patient-import/${encodeURIComponent(id)}/preview?limit=all`),
      {
        headers: authHeaders(),
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error("Failed to load preview");
    const data = await res.json();
    if (Array.isArray(data)) {
      setPreview(data);
      return data as StagingRow[];
    }
    const rows = Array.isArray(data.rows) ? data.rows : [];
    setPreview(rows);
    return rows as StagingRow[];
  };

  const runImport = async (options?: { preValidate?: boolean }) => {
    if (!batchId) return;
    const res = await fetch(
      buildUrl(`/api/patient-import/${encodeURIComponent(batchId)}/import`),
      {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ preValidate: options?.preValidate !== false }),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Import failed");
    setSummary(data);
    await refreshPreview(batchId);

    const insertedThisRun = data.insertedThisRun ?? 0;
    const dupes = (data.duplicateRows ?? []) as StagingRow[];
    if (dupes.length > 0) {
      openDuplicateDialog(dupes);
    }

    if (insertedThisRun > 0) {
      const newPatients = (data.insertedPatients ?? []) as InsertedPatient[];
      if (newPatients.length > 0) {
        setRecentlyInsertedPatients((prev) => [...prev, ...newPatients]);
      }
      const successMessage =
        data.message ||
        (insertedThisRun === 1
          ? "Patient inserted into the database successfully."
          : `${insertedThisRun} patients inserted into the database successfully.`);
      setImportSuccessMessage(successMessage);
      toast({
        title: "Success",
        description:
          newPatients.length > 0
            ? `Added ${newPatients.map((p) => p.patientId).join(", ")}`
            : successMessage,
      });
    } else if (dupes.length > 0) {
      setImportSuccessMessage(null);
      toast({
        title: "Duplicates skipped",
        description: data.message || `${dupes.length} duplicate record(s) need editing before insert.`,
        variant: "destructive",
      });
    } else {
      setImportSuccessMessage(null);
      throw new Error(
        data.message ||
          "No patients were inserted. Validate records first or fix invalid rows.",
      );
    }
  };

  const saveAndRevalidateDuplicate = async (rowId: number) => {
    if (!batchId) return;
    const draft = duplicateDrafts[rowId];
    if (!draft) return;

    setSavingRowId(rowId);
    try {
      const patchRes = await fetch(
        buildUrl(`/api/patient-import/${encodeURIComponent(batchId)}/staging/${rowId}`),
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(draft),
        },
      );
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error || "Failed to save row");

      const valRes = await fetch(
        buildUrl(`/api/patient-import/${encodeURIComponent(batchId)}/staging/${rowId}/validate`),
        { method: "POST", headers: authHeaders(), credentials: "include" },
      );
      const valData = await valRes.json();
      if (!valRes.ok) throw new Error(valData.error || "Failed to re-validate row");

      await refreshSummary(batchId);
      await refreshPreview(batchId);
      await refreshDuplicateDialog(batchId);

      if (valData.validationStatus === "Validated") {
        toast({
          title: "Row ready to import",
          description: `${draft.fullName || "Record"} is now valid. Click "Insert Remaining".`,
        });
      } else {
        toast({
          title: "Still duplicate or invalid",
          description: valData.errorMessage || valData.duplicateReason || "Update phone, email, or CNIC.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Could not update row",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
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
      const res = await apiUpload("/api/patient-import/upload", form);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Upload failed");
      setBatchId(data.batchId);
      setUploadedSqlStatements(Array.isArray(data.sqlStatements) ? data.sqlStatements : []);
      setImportSuccessMessage(null);
      setRecentlyInsertedPatients([]);
      await refreshSummary(data.batchId);
      await refreshPreview(data.batchId);
      toast({
        title: "SQL uploaded",
        description: `${data.totalRecords} patient record(s) staged from ${Array.isArray(data.sqlStatements) ? data.sqlStatements.length : 0} INSERT statement(s). Click Validate Records.`,
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

  const uploadedSqlPreview = uploadedSqlStatements.slice(0, UPLOADED_SQL_PREVIEW_LIMIT).join("\n\n");
  const uploadedSqlTruncated = uploadedSqlStatements.length > UPLOADED_SQL_PREVIEW_LIMIT;

  return (
    <div className="space-y-6">
      {uploadedSqlStatements.length > 0 && (
        <SqlChangesPanel
          title="Parsed SQL from uploaded script"
          description={
            uploadedSqlTruncated
              ? `Showing first ${UPLOADED_SQL_PREVIEW_LIMIT} of ${uploadedSqlStatements.length} INSERT statements detected in script.sql.`
              : `${uploadedSqlStatements.length} INSERT statement(s) parsed from script.sql for staging.`
          }
          sql={uploadedSqlPreview}
          testId="legacy-migration-uploaded-sql"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Legacy Patient Data Migration &amp; Encryption</CardTitle>
          <CardDescription>
            Upload legacy <code>script.sql</code> or PostgreSQL <code>COPY</code> patient dumps
            (`.sql`, `.txt`, `.dump`). Files are parsed safely — SQL is never executed against
            the database. Imported patients use the same encryption pipeline as Add Patient /
            User Management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".sql,.txt,.dump,application/sql,text/plain"
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

      {importSuccessMessage && (
        <div
          className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
          role="status"
          data-testid="patient-import-success-banner"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Success</p>
            <p className="text-sm">{importSuccessMessage}</p>
            <p className="text-xs mt-1 opacity-90">
              Records are encrypted in the database. View decrypted patients in the app Patients page.
            </p>
          </div>
        </div>
      )}

      {recentlyInsertedPatients.length > 0 && (
        <Card data-testid="patient-import-inserted-list">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Newly added patients ({recentlyInsertedPatients.length})
            </CardTitle>
            <CardDescription>
              Encrypted patient records inserted in this session. Use Patient ID in the Patients list.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>DB ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentlyInsertedPatients.map((patient) => (
                  <TableRow key={`${patient.stagingId}-${patient.patientDbId}`}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {patient.patientId}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{patient.patientDbId}
                    </TableCell>
                    <TableCell>{patient.fullName}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.phone || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
          <CardDescription className="text-sm">
            <strong>Workflow:</strong> Upload SQL → <strong>Validate Records</strong> →{" "}
            <strong>Add Patients</strong> (bulk insert; duplicates skipped automatically). Edit
            duplicates in the review popup, then <strong>Insert Remaining</strong>.
          </CardDescription>
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
                  const dupes = (data.duplicateRows ?? []) as StagingRow[];
                  if (dupes.length > 0) {
                    openDuplicateDialog(dupes);
                    toast({
                      title: "Validation complete",
                      description: `${dupes.length} duplicate record(s) found. Edit them in the review dialog.`,
                      variant: "destructive",
                    });
                  }
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
            onClick={async () => {
              try {
                setBusy("import");
                await runImport({ preValidate: true });
              } catch (error) {
                setImportSuccessMessage(null);
                toast({
                  title: "Import did not add patients",
                  description: error instanceof Error ? error.message : "Unknown error",
                  variant: "destructive",
                });
              } finally {
                setBusy(null);
              }
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patients
          </Button>

          {(summary?.duplicateRecords ?? 0) > 0 && (
            <Button
              variant="secondary"
              disabled={!batchId || busy !== null}
              onClick={async () => {
                if (!batchId) return;
                const rows = await loadDuplicateRows(batchId);
                if (rows.length === 0) {
                  toast({ title: "No duplicate rows in this batch" });
                  return;
                }
                openDuplicateDialog(rows);
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Review Duplicates ({summary?.duplicateRecords ?? 0})
            </Button>
          )}

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

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Duplicate records — edit and insert remaining
            </DialogTitle>
            <DialogDescription>
              Valid patients are inserted in bulk; duplicates are skipped. Edit phone, email, or
              CNIC below, save each row, then click <strong>Insert Remaining</strong> to import
              fixed records without re-checking already-imported rows.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 -mr-2">
            <div className="space-y-6">
              {duplicateRows.map((row) => {
                const draft = duplicateDrafts[row.id];
                if (!draft) return null;
                return (
                  <div
                    key={row.id}
                    className="rounded-lg border p-4 space-y-3 bg-muted/30"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Row #{row.id}</Badge>
                      {statusBadge(row.validationStatus)}
                      <span className="text-xs text-muted-foreground flex-1 min-w-[200px]">
                        {row.duplicateReason || row.errorMessage}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`dup-name-${row.id}`}>Full name</Label>
                        <Input
                          id={`dup-name-${row.id}`}
                          value={draft.fullName}
                          onChange={(e) =>
                            setDuplicateDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], fullName: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`dup-cnic-${row.id}`}>CNIC / NHS</Label>
                        <Input
                          id={`dup-cnic-${row.id}`}
                          value={draft.cnic}
                          onChange={(e) =>
                            setDuplicateDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], cnic: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`dup-phone-${row.id}`}>Phone</Label>
                        <Input
                          id={`dup-phone-${row.id}`}
                          value={draft.phone}
                          onChange={(e) =>
                            setDuplicateDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], phone: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`dup-email-${row.id}`}>Email</Label>
                        <Input
                          id={`dup-email-${row.id}`}
                          value={draft.email}
                          onChange={(e) =>
                            setDuplicateDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], email: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingRowId === row.id || busy !== null}
                      onClick={() => void saveAndRevalidateDuplicate(row.id)}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {savingRowId === row.id ? "Saving..." : "Save & Re-validate"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Close
            </Button>
            <Button
              disabled={!batchId || busy !== null}
              onClick={async () => {
                try {
                  setBusy("import-remaining");
                  await runImport({ preValidate: false });
                } catch (error) {
                  toast({
                    title: "Insert remaining failed",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "destructive",
                  });
                } finally {
                  setBusy(null);
                }
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Insert Remaining
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {batchId && (preview.length > 0 || (summary?.totalRecords ?? 0) > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staging Preview</CardTitle>
            <CardDescription>
              Showing {preview.length} of {summary?.totalRecords ?? preview.length} staged record(s).
              {summary && preview.length < summary.totalRecords && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}
                  Some rows may not have loaded — click Refresh.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ScrollArea className="h-[min(70vh,640px)] w-full">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                    <TableHead>CNIC / NHS / ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Import</TableHead>
                  <TableHead>DB Patient</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                    <TableCell>{row.fullName || "—"}</TableCell>
                    <TableCell>{row.cnic || "—"}</TableCell>
                    <TableCell>{row.phone || "—"}</TableCell>
                    <TableCell>{row.email || "—"}</TableCell>
                    <TableCell>{statusBadge(row.validationStatus)}</TableCell>
                    <TableCell>{statusBadge(row.importStatus)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {row.importedPatientId ? `#${row.importedPatientId}` : "—"}
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground whitespace-normal">
                      {row.errorMessage || row.duplicateReason || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
