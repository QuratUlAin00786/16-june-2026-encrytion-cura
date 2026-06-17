import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Upload, CheckCircle2, UserPlus, Users, Database, RefreshCw } from "lucide-react";

type UserPatientSummary = {
  batchId: string;
  userRecords: number;
  patientRecords: number;
  pairedRecords: number;
  unpairedUsers: number;
  unpairedPatients: number;
  validPairs: number;
  duplicatePairs: number;
  importedPairs: number;
  failedPairs: number;
  message?: string;
  pairs?: Array<{
    userStagingId: number;
    patientStagingId: number;
    email: string;
    userFirstName: string | null;
    userLastName: string | null;
    patientFullName: string | null;
    patientPhone: string | null;
    validationStatus: string;
    importStatus: string;
    errorMessage: string | null;
  }>;
};

type SqlTemplates = {
  usersSql: string;
  patientsSql: string;
  usersFields: string[];
  patientsFields: string[];
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
      : value === "Duplicate" || value === "Unpaired"
        ? "secondary"
        : value === "Failed" || value === "Invalid"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{value}</Badge>;
}

export function LegacyUserPatientMigrationPanel() {
  const usersFileRef = useRef<HTMLInputElement>(null);
  const patientsFileRef = useRef<HTMLInputElement>(null);
  const [usersFile, setUsersFile] = useState<File | null>(null);
  const [patientsFile, setPatientsFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<UserPatientSummary | null>(null);
  const [templates, setTemplates] = useState<SqlTemplates | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch(buildUrl("/api/patient-import/user-patient/templates"), {
      headers: authHeaders(),
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => setTemplates(data))
      .catch(() => undefined);
  }, []);

  const refreshPreview = async (id: string) => {
    const res = await fetch(
      buildUrl(`/api/patient-import/${encodeURIComponent(id)}/user-patient-preview`),
      { headers: authHeaders(), credentials: "include" },
    );
    if (!res.ok) throw new Error("Failed to load preview");
    const data = await res.json();
    setSummary((prev) =>
      prev
        ? { ...prev, pairs: data.pairs }
        : {
            batchId: id,
            userRecords: 0,
            patientRecords: 0,
            pairedRecords: 0,
            unpairedUsers: 0,
            unpairedPatients: 0,
            validPairs: 0,
            duplicatePairs: 0,
            importedPairs: 0,
            failedPairs: 0,
            pairs: data.pairs,
          },
    );
  };

  const handleUpload = async () => {
    if (!usersFile || !patientsFile) {
      toast({ title: "Select both SQL files", variant: "destructive" });
      return;
    }
    try {
      setBusy("upload");
      const form = new FormData();
      form.append("usersFile", usersFile);
      form.append("patientsFile", patientsFile);
      const res = await apiUpload("/api/patient-import/upload-user-patient-pair", form);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setBatchId(data.batchId);
      setSummary({
        batchId: data.batchId,
        userRecords: data.userRecords,
        patientRecords: data.patientRecords,
        pairedRecords: 0,
        unpairedUsers: 0,
        unpairedPatients: 0,
        validPairs: 0,
        duplicatePairs: 0,
        importedPairs: 0,
        failedPairs: 0,
      });
      await refreshPreview(data.batchId);
      toast({
        title: "SQL files uploaded",
        description: `${data.userRecords} user(s) + ${data.patientRecords} patient(s) staged. Emails must match between files.`,
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

  const pairs = summary?.pairs ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users + Patients SQL Import
          </CardTitle>
          <CardDescription>
            Same flow as <strong>Add New User</strong> with role <strong>patient</strong>: creates a{" "}
            <code>users</code> row (login) and an encrypted <code>patients</code> row linked by{" "}
            <code>user_id</code>. Upload two SQL files — rows are matched by <strong>email</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">users.sql</p>
              <Input
                ref={usersFileRef}
                type="file"
                accept=".sql,.txt,.dump"
                onChange={(e) => setUsersFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">patients.sql</p>
              <Input
                ref={patientsFileRef}
                type="file"
                accept=".sql,.txt,.dump"
                onChange={(e) => setPatientsFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Button onClick={handleUpload} disabled={busy === "upload" || !usersFile || !patientsFile}>
            <Upload className="h-4 w-4 mr-2" />
            {busy === "upload" ? "Uploading..." : "Upload Users + Patients SQL"}
          </Button>
          {batchId && (
            <p className="text-sm text-muted-foreground font-mono">Batch ID: {batchId}</p>
          )}
        </CardContent>
      </Card>

      {templates && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">users table fields</CardTitle>
              <CardDescription className="text-xs">
                {templates.usersFields.join(" · ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 rounded border bg-muted/40">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap">{templates.usersSql}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">patients table fields (encrypted on import)</CardTitle>
              <CardDescription className="text-xs">
                {templates.patientsFields.join(" · ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 rounded border bg-muted/40">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                  {templates.patientsSql}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Users", value: summary.userRecords },
            { label: "Patients", value: summary.patientRecords },
            { label: "Valid Pairs", value: summary.validPairs },
            { label: "Duplicates", value: summary.duplicatePairs },
            { label: "Imported", value: summary.importedPairs },
            { label: "Unpaired", value: summary.unpairedUsers + summary.unpairedPatients },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!batchId || busy !== null}
            onClick={async () => {
              try {
                setBusy("validate");
                const res = await fetch(
                  buildUrl(
                    `/api/patient-import/${encodeURIComponent(batchId!)}/validate-user-patient`,
                  ),
                  { method: "POST", headers: authHeaders(), credentials: "include" },
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Validation failed");
                setSummary(data);
                toast({ title: "Validation complete", description: data.message });
              } catch (error) {
                toast({
                  title: "Validation failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  variant: "destructive",
                });
              } finally {
                setBusy(null);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Validate Pairs
          </Button>
          <Button
            disabled={!batchId || busy !== null}
            onClick={async () => {
              try {
                setBusy("import");
                const res = await fetch(
                  buildUrl(
                    `/api/patient-import/${encodeURIComponent(batchId!)}/import-user-patient`,
                  ),
                  { method: "POST", headers: authHeaders(), credentials: "include" },
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Import failed");
                setSummary(data);
                toast({
                  title: data.importedPairs > 0 ? "Success" : "Import finished",
                  description: data.message,
                  variant: data.importedPairs > 0 ? "default" : "destructive",
                });
              } catch (error) {
                toast({
                  title: "Import failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  variant: "destructive",
                });
              } finally {
                setBusy(null);
              }
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Users + Patients
          </Button>
          <Button
            variant="ghost"
            disabled={!batchId || busy !== null}
            onClick={async () => {
              try {
                setBusy("refresh");
                await refreshPreview(batchId!);
              } finally {
                setBusy(null);
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {pairs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Paired staging preview ({pairs.length})
            </CardTitle>
            <CardDescription>
              Each row shows user + patient matched by email — same as Add New User (patient role).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ScrollArea className="h-[min(60vh,520px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>User name</TableHead>
                    <TableHead>Patient name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairs.map((row) => (
                    <TableRow key={`${row.userStagingId}-${row.patientStagingId}-${row.email}`}>
                      <TableCell className="font-mono text-xs">{row.email || "—"}</TableCell>
                      <TableCell>
                        {[row.userFirstName, row.userLastName].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>{row.patientFullName || "—"}</TableCell>
                      <TableCell>{row.patientPhone || "—"}</TableCell>
                      <TableCell>{statusBadge(row.validationStatus)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs whitespace-normal">
                        {row.errorMessage || "—"}
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
