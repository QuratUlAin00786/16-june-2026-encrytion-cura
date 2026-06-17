import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { activeDbSchema } from "../db";
import { storage } from "../storage";
import {
  patientImportAudit,
  patientImportStaging,
  patients,
  users,
} from "@shared/schema";
import { parseLegacyPatientSql, extractLegacyInsertStatements } from "../utils/legacy-sql-parser";
import {
  computePatientSearchHashes,
  formatCnicForStorage,
  isValidEmailFormat,
  isValidNationalIdFormat,
  isValidPhoneFormat,
  normalizePhone,
} from "../utils/patient-search-hashes";
import {
  isEncryptedPatientStorageRow,
  isPatientEncryptionConfigured,
  preparePatientForStorage,
} from "../utils/encryption-sdk";

export type ImportBatchSummary = {
  batchId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  importedRecords: number;
  failedRecords: number;
  existingRecords: number;
  pendingRecords: number;
  /** Patients inserted during the current import request only */
  insertedThisRun?: number;
  /** Duplicates skipped during the current import request only */
  skippedDuplicatesThisRun?: number;
  insertedPatients?: Array<{
    stagingId: number;
    patientDbId: number;
    patientId: string;
    fullName: string;
    email: string;
    phone?: string;
  }>;
  duplicateRows?: StagingRowRecord[];
  databaseSchema?: string;
  message?: string;
};

export type StagingRowRecord = {
  id: number;
  organizationId: number;
  importBatchId: string;
  fullName: string | null;
  cnic: string | null;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  importStatus: string;
  validationStatus: string;
  errorMessage: string | null;
  duplicateReason: string | null;
  importedPatientId: number | null;
};

export type StagingRowUpdate = {
  fullName?: string;
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Patient" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function parseAddressString(address?: string | null) {
  if (!address?.trim()) return {};
  return { street: address.trim(), country: "Pakistan" };
}

async function writeAudit(params: {
  organizationId: number;
  userId?: number;
  action: string;
  fileName?: string;
  importBatchId?: string;
  summary?: Partial<ImportBatchSummary>;
  details?: Record<string, unknown>;
}) {
  await db.insert(patientImportAudit).values({
    organizationId: params.organizationId,
    userId: params.userId ?? null,
    action: params.action,
    fileName: params.fileName ?? null,
    importBatchId: params.importBatchId ?? null,
    totalRecords: params.summary?.totalRecords ?? 0,
    validRecords: params.summary?.validRecords ?? 0,
    invalidRecords: params.summary?.invalidRecords ?? 0,
    duplicateRecords: params.summary?.duplicateRecords ?? 0,
    importedRecords: params.summary?.importedRecords ?? 0,
    failedRecords: params.summary?.failedRecords ?? 0,
    existingRecords: params.summary?.existingRecords ?? 0,
    details: params.details ?? {},
  });
}

export async function findDuplicateByHashes(
  organizationId: number,
  hashes: { cnicHash: string | null; phoneHash: string | null; emailHash: string | null },
): Promise<{ id: number; reason: string } | null> {
  const conditions = [];
  if (hashes.cnicHash) conditions.push(eq(patients.cnicHash, hashes.cnicHash));
  if (hashes.phoneHash) conditions.push(eq(patients.phoneHash, hashes.phoneHash));
  if (hashes.emailHash) conditions.push(eq(patients.emailHash, hashes.emailHash));

  if (conditions.length === 0) return null;

  const [existing] = await db
    .select({ id: patients.id, cnicHash: patients.cnicHash, phoneHash: patients.phoneHash, emailHash: patients.emailHash })
    .from(patients)
    .where(and(eq(patients.organizationId, organizationId), or(...conditions)))
    .limit(1);

  if (!existing) return null;

  const reasons: string[] = [];
  if (hashes.cnicHash && existing.cnicHash === hashes.cnicHash) reasons.push("CNIC");
  if (hashes.phoneHash && existing.phoneHash === hashes.phoneHash) reasons.push("Phone");
  if (hashes.emailHash && existing.emailHash === hashes.emailHash) reasons.push("Email");

  return { id: existing.id, reason: reasons.join(", ") };
}

/** Hash keys for duplicate detection — only real CNIC/NHS, not phone/email synthetic legacy ids. */
export function hashInputFromStagingRow(row: {
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
}): { cnic: string | null; phone: string | null; email: string | null } {
  return {
    cnic: row.cnic?.trim() || null,
    phone: row.phone ?? null,
    email: row.email ?? null,
  };
}

function formatDuplicateDetail(
  row: { cnic?: string | null; phone?: string | null; email?: string | null },
  match: { id: number; reason: string },
): string {
  const fieldLabels = match.reason.split(", ").map((field) => {
    if (field === "Phone" && row.phone?.trim()) return `phone ${row.phone.trim()}`;
    if (field === "Email" && row.email?.trim()) return `email ${row.email.trim()}`;
    if (field === "CNIC" && row.cnic?.trim()) return `CNIC/NHS ${row.cnic.trim()}`;
    if (field.startsWith("Email (")) return `email ${row.email?.trim() || "(linked user)"}`;
    return field.toLowerCase();
  });
  return `Matches existing patient #${match.id} (${fieldLabels.join(", ")}). Change that field or remove the existing patient first.`;
}

async function findExistingByPlaintextContact(
  organizationId: number,
  row: { email?: string | null; phone?: string | null },
): Promise<{ id: number; reason: string } | null> {
  const email = row.email?.trim();
  if (email) {
    const byEmail = await storage.getPatientByEmail(email, organizationId);
    if (byEmail) {
      return { id: byEmail.id, reason: "Email" };
    }
  }

  const phone = row.phone?.trim();
  if (!phone) return null;

  const targetDigits = normalizePhone(phone).slice(-10);
  if (targetDigits.length < 10) return null;

  const orgRows = await db
    .select()
    .from(patients)
    .where(eq(patients.organizationId, organizationId));

  for (const raw of orgRows) {
    if (raw.phoneHash) continue;
    const patient = await storage.normalizePatientFromRow(raw);
    if (!patient?.phone) continue;
    const storedDigits = normalizePhone(patient.phone).slice(-10);
    if (storedDigits === targetDigits) {
      return { id: patient.id, reason: "Phone" };
    }
  }

  return null;
}

/** Hash match first; fall back to plaintext email/phone for legacy rows without hashes. */
export async function findExistingPatientForImport(
  organizationId: number,
  row: { email?: string | null; phone?: string | null; cnic?: string | null },
): Promise<{ id: number; reason: string } | null> {
  const hashes = computePatientSearchHashes(organizationId, hashInputFromStagingRow(row));
  const byHash = await findDuplicateByHashes(organizationId, hashes);
  if (byHash) return byHash;

  const byContact = await findExistingByPlaintextContact(organizationId, row);
  if (byContact) return byContact;

  const email = row.email?.trim();
  if (email) {
    const user = await storage.getUserByEmail(email, organizationId);
    if (user) {
      const existingPatient = await storage.getPatientByUserId(user.id, organizationId);
      if (existingPatient) {
        return { id: existingPatient.id, reason: "Email (patient already linked to user)" };
      }
    }
  }

  return null;
}

export function resolveStagingNationalId(row: {
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
}): string {
  const cnic = row.cnic?.trim();
  if (cnic) return cnic;
  const phone = row.phone?.trim();
  if (phone) return `LEGACY-PH-${normalizePhone(phone)}`;
  const email = row.email?.trim();
  if (email) return `LEGACY-EM-${email.toLowerCase()}`;
  return "";
}

export function validateStagingRow(row: {
  fullName?: string | null;
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.fullName?.trim()) errors.push("Full Name is required");

  const nationalId = resolveStagingNationalId(row);
  const hasNationalId = nationalId && isValidNationalIdFormat(nationalId);
  const hasPhone = Boolean(row.phone?.trim() && isValidPhoneFormat(row.phone));

  if (!hasNationalId && !hasPhone) {
    errors.push("CNIC/NHS/Patient ID or a valid phone number is required");
  } else if (row.cnic?.trim() && !isValidNationalIdFormat(row.cnic)) {
    errors.push("CNIC/NHS/Patient ID format is invalid");
  }

  if (row.phone?.trim() && !isValidPhoneFormat(row.phone)) {
    errors.push("Phone format is invalid");
  }
  if (row.email?.trim() && !isValidEmailFormat(row.email)) {
    errors.push("Email format is invalid");
  }

  return { valid: errors.length === 0, errors };
}

type StagingValidationOutcome = {
  validationStatus: string;
  importStatus: string;
  errorMessage: string | null;
  duplicateReason: string | null;
  importedPatientId?: number | null;
};

async function applyStagingRowValidation(
  organizationId: number,
  row: {
    id: number;
    fullName?: string | null;
    cnic?: string | null;
    phone?: string | null;
    email?: string | null;
    importStatus?: string | null;
  },
  seenHashes: Set<string>,
): Promise<StagingValidationOutcome> {
  if (row.importStatus === "Imported") {
    return {
      validationStatus: "Validated",
      importStatus: "Imported",
      errorMessage: null,
      duplicateReason: null,
    };
  }

  const validation = validateStagingRow(row);
  if (!validation.valid) {
    return {
      validationStatus: "Invalid",
      importStatus: "Failed",
      errorMessage: validation.errors.join("; "),
      duplicateReason: null,
    };
  }

  const hashes = computePatientSearchHashes(organizationId, hashInputFromStagingRow(row));
  const batchKey = [hashes.cnicHash, hashes.phoneHash, hashes.emailHash]
    .filter(Boolean)
    .join("|");
  if (batchKey && seenHashes.has(batchKey)) {
    const detail = formatDuplicateDetail(row, {
      id: 0,
      reason: [
        hashes.cnicHash ? "CNIC" : "",
        hashes.phoneHash ? "Phone" : "",
        hashes.emailHash ? "Email" : "",
      ]
        .filter(Boolean)
        .join(", "),
    }).replace("Matches existing patient #0", "Duplicate row in this file");
    return {
      validationStatus: "Duplicate",
      importStatus: "Duplicate",
      duplicateReason: "Duplicate within import batch (same CNIC, phone, or email)",
      errorMessage: detail,
    };
  }
  if (batchKey) seenHashes.add(batchKey);

  const duplicate = await findExistingPatientForImport(organizationId, row);
  if (duplicate) {
    const detail = formatDuplicateDetail(row, duplicate);
    return {
      validationStatus: "Duplicate",
      importStatus: "Duplicate",
      duplicateReason: detail,
      errorMessage: detail,
      importedPatientId: duplicate.id,
    };
  }

  return {
    validationStatus: "Validated",
    importStatus: "Validated",
    errorMessage: null,
    duplicateReason: null,
    importedPatientId: null,
  };
}

async function attachDuplicateRows(
  organizationId: number,
  batchId: string,
  summary: ImportBatchSummary,
): Promise<ImportBatchSummary> {
  const duplicateRows = await getDuplicateStagingRows(organizationId, batchId);
  return { ...summary, duplicateRows };
}

export async function uploadLegacyPatientSql(params: {
  organizationId: number;
  userId: number;
  fileName: string;
  content: string;
}): Promise<{ batchId: string; totalRecords: number; sqlStatements: string[] }> {
  const parsedRows = parseLegacyPatientSql(params.content);
  const sqlStatements = extractLegacyInsertStatements(params.content);
  const batchId = randomUUID();

  console.log(
    `[PATIENT-IMPORT] Parsed ${parsedRows.length} patient row(s) from ${sqlStatements.length} SQL statement(s)`,
  );

  const stagingRows = parsedRows.map((row) => ({
    organizationId: params.organizationId,
    importBatchId: batchId,
    fullName: row.fullName ?? null,
    cnic: row.cnic ?? row.patientId ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    dateOfBirth: row.dateOfBirth ?? null,
    gender: row.gender ?? null,
    address: row.address ?? null,
    importStatus: "Pending",
    validationStatus: "Pending",
  }));

  const chunkSize = 500;
  for (let i = 0; i < stagingRows.length; i += chunkSize) {
    await db.insert(patientImportStaging).values(stagingRows.slice(i, i + chunkSize));
  }

  await writeAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "upload",
    fileName: params.fileName,
    importBatchId: batchId,
    summary: { batchId, totalRecords: stagingRows.length },
    details: { fileName: params.fileName, sqlStatementCount: sqlStatements.length },
  });

  return { batchId, totalRecords: stagingRows.length, sqlStatements, parsedRecordCount: parsedRows.length };
}

export async function validateImportBatch(
  organizationId: number,
  batchId: string,
  userId: number,
): Promise<ImportBatchSummary> {
  const rows = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
      ),
    );

  const seenHashes = new Set<string>();

  for (const row of rows) {
    if (row.importStatus === "Imported") {
      const hashes = computePatientSearchHashes(organizationId, hashInputFromStagingRow(row));
      const batchKey = [hashes.cnicHash, hashes.phoneHash, hashes.emailHash]
        .filter(Boolean)
        .join("|");
      if (batchKey) seenHashes.add(batchKey);
    }
  }

  for (const row of rows) {
    if (row.importStatus === "Imported") {
      continue;
    }

    const outcome = await applyStagingRowValidation(organizationId, row, seenHashes);
    await db
      .update(patientImportStaging)
      .set({
        validationStatus: outcome.validationStatus,
        importStatus: outcome.importStatus,
        errorMessage: outcome.errorMessage,
        duplicateReason: outcome.duplicateReason,
        importedPatientId: outcome.importedPatientId ?? null,
      })
      .where(eq(patientImportStaging.id, row.id));
  }

  const summary = await attachDuplicateRows(
    organizationId,
    batchId,
    await getImportBatchSummary(organizationId, batchId),
  );
  await writeAudit({
    organizationId,
    userId,
    action: "validate",
    importBatchId: batchId,
    summary,
  });

  return summary;
}

export async function getImportBatchSummary(
  organizationId: number,
  batchId: string,
): Promise<ImportBatchSummary> {
  const rows = await db
    .select({
      importStatus: patientImportStaging.importStatus,
      validationStatus: patientImportStaging.validationStatus,
    })
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
      ),
    );

  const summary: ImportBatchSummary = {
    batchId,
    totalRecords: rows.length,
    validRecords: 0,
    invalidRecords: 0,
    duplicateRecords: 0,
    importedRecords: 0,
    failedRecords: 0,
    existingRecords: 0,
    pendingRecords: 0,
  };

  for (const row of rows) {
    if (row.importStatus === "Imported") summary.importedRecords++;
    else if (row.importStatus === "Duplicate" || row.validationStatus === "Duplicate") {
      summary.duplicateRecords++;
      summary.existingRecords++;
    } else if (row.importStatus === "Failed" || row.validationStatus === "Invalid") {
      summary.failedRecords++;
      summary.invalidRecords++;
    } else if (row.validationStatus === "Validated" || row.importStatus === "Validated") {
      summary.validRecords++;
    } else {
      summary.pendingRecords++;
    }
  }

  return summary;
}

export async function getStagingPreview(
  organizationId: number,
  batchId: string,
  limit?: number,
) {
  const baseQuery = db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
      ),
    )
    .orderBy(asc(patientImportStaging.id));

  if (limit != null && limit > 0) {
    return baseQuery.limit(limit);
  }

  return baseQuery;
}

export async function countStagingRows(
  organizationId: number,
  batchId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
      ),
    );
  return Number(row?.count ?? 0);
}

export async function getDuplicateStagingRows(
  organizationId: number,
  batchId: string,
): Promise<StagingRowRecord[]> {
  const rows = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
        or(
          eq(patientImportStaging.importStatus, "Duplicate"),
          eq(patientImportStaging.validationStatus, "Duplicate"),
        ),
      ),
    );
  return rows as StagingRowRecord[];
}

export async function updateStagingRow(params: {
  organizationId: number;
  batchId: string;
  rowId: number;
  updates: StagingRowUpdate;
}): Promise<StagingRowRecord> {
  const [existing] = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.id, params.rowId),
        eq(patientImportStaging.organizationId, params.organizationId),
        eq(patientImportStaging.importBatchId, params.batchId),
      ),
    );

  if (!existing) {
    throw new Error("Staging row not found");
  }
  if (existing.importStatus === "Imported") {
    throw new Error("Cannot edit a row that is already imported");
  }

  const patch: Record<string, unknown> = {
    validationStatus: "Pending",
    importStatus: "Pending",
    errorMessage: null,
    duplicateReason: null,
    importedPatientId: null,
  };
  if (params.updates.fullName !== undefined) patch.fullName = params.updates.fullName;
  if (params.updates.cnic !== undefined) patch.cnic = params.updates.cnic;
  if (params.updates.phone !== undefined) patch.phone = params.updates.phone;
  if (params.updates.email !== undefined) patch.email = params.updates.email;
  if (params.updates.dateOfBirth !== undefined) patch.dateOfBirth = params.updates.dateOfBirth;
  if (params.updates.gender !== undefined) patch.gender = params.updates.gender;
  if (params.updates.address !== undefined) patch.address = params.updates.address;

  const [updated] = await db
    .update(patientImportStaging)
    .set(patch)
    .where(eq(patientImportStaging.id, params.rowId))
    .returning();

  return updated as StagingRowRecord;
}

export async function validateStagingRowById(params: {
  organizationId: number;
  batchId: string;
  rowId: number;
}): Promise<StagingRowRecord> {
  const [row] = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.id, params.rowId),
        eq(patientImportStaging.organizationId, params.organizationId),
        eq(patientImportStaging.importBatchId, params.batchId),
      ),
    );

  if (!row) {
    throw new Error("Staging row not found");
  }
  if (row.importStatus === "Imported") {
    return row as StagingRowRecord;
  }

  const batchRows = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, params.organizationId),
        eq(patientImportStaging.importBatchId, params.batchId),
      ),
    );

  const seenHashes = new Set<string>();
  for (const other of batchRows) {
    if (other.id === row.id || other.importStatus === "Imported") continue;
    if (other.validationStatus !== "Validated" && other.importStatus !== "Validated") continue;
    const hashes = computePatientSearchHashes(params.organizationId, hashInputFromStagingRow(other));
    const batchKey = [hashes.cnicHash, hashes.phoneHash, hashes.emailHash]
      .filter(Boolean)
      .join("|");
    if (batchKey) seenHashes.add(batchKey);
  }

  const outcome = await applyStagingRowValidation(params.organizationId, row, seenHashes);
  const [updated] = await db
    .update(patientImportStaging)
    .set({
      validationStatus: outcome.validationStatus,
      importStatus: outcome.importStatus,
      errorMessage: outcome.errorMessage,
      duplicateReason: outcome.duplicateReason,
      importedPatientId: outcome.importedPatientId ?? null,
    })
    .where(eq(patientImportStaging.id, params.rowId))
    .returning();

  return updated as StagingRowRecord;
}

export async function importValidatedBatch(params: {
  organizationId: number;
  batchId: string;
  userId: number;
  /** When true (default), re-validates the whole batch before import */
  preValidate?: boolean;
}): Promise<ImportBatchSummary> {
  if (!isPatientEncryptionConfigured()) {
    throw new Error("Patient encryption is not configured");
  }

  if (params.preValidate !== false) {
    await validateImportBatch(params.organizationId, params.batchId, params.userId);
  }

  const rows = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, params.organizationId),
        eq(patientImportStaging.importBatchId, params.batchId),
        eq(patientImportStaging.validationStatus, "Validated"),
        or(
          eq(patientImportStaging.importStatus, "Validated"),
          eq(patientImportStaging.importStatus, "Failed"),
          eq(patientImportStaging.importStatus, "Pending"),
        ),
      ),
    );

  let importedRecords = 0;
  let failedRecords = 0;
  let duplicateRecords = 0;
  const insertedPatients: NonNullable<ImportBatchSummary["insertedPatients"]> = [];

  if (rows.length === 0) {
    const snapshot = await attachDuplicateRows(
      params.organizationId,
      params.batchId,
      await getImportBatchSummary(params.organizationId, params.batchId),
    );
    const noteText = (snapshot.duplicateRows ?? [])
      .slice(0, 5)
      .map((d) => `${d.fullName || "Record"}: ${d.duplicateReason || d.errorMessage || "Duplicate"}`)
      .join(" | ");
    return {
      ...snapshot,
      insertedThisRun: 0,
      skippedDuplicatesThisRun: snapshot.duplicateRecords,
      insertedPatients: [],
      databaseSchema: activeDbSchema,
      message:
        snapshot.duplicateRecords > 0
          ? `No new patients inserted. ${snapshot.duplicateRecords} duplicate record(s) skipped.` +
            (noteText ? ` ${noteText}` : "")
          : `No validated records ready to import. ${snapshot.validRecords} valid, ${snapshot.pendingRecords} pending.`,
    };
  }

  console.log(
    `[PATIENT-IMPORT] Importing ${rows.length} validated row(s) for batch ${params.batchId} (org ${params.organizationId})`,
  );

  for (const row of rows) {
    try {
      const nationalId = resolveStagingNationalId(row);
      const hashes = computePatientSearchHashes(params.organizationId, hashInputFromStagingRow(row));

      const duplicate = await findExistingPatientForImport(params.organizationId, row);
      if (duplicate) {
        duplicateRecords++;
        const detail = formatDuplicateDetail(row, duplicate);
        await db
          .update(patientImportStaging)
          .set({
            importStatus: "Duplicate",
            importedPatientId: duplicate.id,
            duplicateReason: detail,
            errorMessage: detail,
          })
          .where(eq(patientImportStaging.id, row.id));
        continue;
      }

      const { firstName, lastName } = splitFullName(row.fullName || "Unknown Patient");
      const email =
        row.email?.trim() ||
        `legacy-${hashes.cnicHash?.slice(0, 12) || row.id}@import.local`;
      const phone = normalizePhone(row.phone || "");
      const rawNationalId = row.cnic?.trim() || nationalId;
      const cnic = rawNationalId.includes("-") && rawNationalId.length === 13
        ? formatCnicForStorage(rawNationalId)
        : rawNationalId;

      let linkedUserId: number | null = null;
      const existingUser = await storage.getUserByEmail(email, params.organizationId);
      if (existingUser) {
        linkedUserId = existingUser.id;
      } else {
        const globalEmail = await storage.getUserByEmailGlobal(email);
        if (globalEmail && globalEmail.organizationId !== params.organizationId) {
          throw new Error("Email already registered with another organization");
        }
        if (!globalEmail) {
          const passwordHash = await bcrypt.hash("cura123", 10);
          const newUser = await storage.createUser({
            organizationId: params.organizationId,
            email,
            username: email,
            passwordHash,
            firstName,
            lastName,
            role: "patient",
            isActive: true,
            isSaaSOwner: false,
          });
          linkedUserId = newUser.id;
        } else {
          linkedUserId = globalEmail.id;
        }
      }

      const patientCount = await storage.countPatientsInOrganization(params.organizationId);
      const patientId = `P${(patientCount + 1).toString().padStart(6, "0")}`;

      const created = await storage.createPatient({
        organizationId: params.organizationId,
        userId: linkedUserId,
        patientId,
        firstName,
        lastName,
        relation: "Self",
        email,
        phone,
        nhsNumber: cnic,
        dateOfBirth: row.dateOfBirth || "1990-01-01",
        genderAtBirth: row.gender || undefined,
        address: parseAddressString(row.address),
        emergencyContact: {},
        insuranceInfo: {},
        medicalHistory: {
          allergies: [],
          chronicConditions: [],
          medications: [],
          familyHistory: { father: [], mother: [], siblings: [], grandparents: [] },
          socialHistory: {
            smoking: { status: "never" as const },
            alcohol: { status: "never" as const },
            drugs: { status: "never" as const },
            occupation: "",
            maritalStatus: "single" as const,
            education: "",
            exercise: { frequency: "none" as const },
          },
          immunizations: [],
        },
        riskLevel: "low",
        isActive: true,
        isInsured: false,
        createdBy: params.userId,
      });

      const [verified] = await db
        .select({ id: patients.id, patientId: patients.patientId, organizationId: patients.organizationId })
        .from(patients)
        .where(
          and(
            eq(patients.id, created.id),
            eq(patients.organizationId, params.organizationId),
          ),
        )
        .limit(1);

      if (!verified) {
        throw new Error(
          `Insert verification failed: patient id ${created.id} was not found in ${activeDbSchema}.patients`,
        );
      }

      console.log(
        `[PATIENT-IMPORT] Inserted patient dbId=${verified.id} patientId=${verified.patientId} org=${verified.organizationId} schema=${activeDbSchema}`,
      );

      importedRecords++;
      insertedPatients.push({
        stagingId: row.id,
        patientDbId: verified.id,
        patientId: verified.patientId,
        fullName: row.fullName?.trim() || `${firstName} ${lastName}`.trim(),
        email,
        phone: row.phone?.trim() || phone || undefined,
      });
      await db
        .update(patientImportStaging)
        .set({
          importStatus: "Imported",
          importedPatientId: verified.id,
          importedAt: new Date(),
          errorMessage: null,
        })
        .where(eq(patientImportStaging.id, row.id));
    } catch (error) {
      failedRecords++;
      const message = error instanceof Error ? error.message : "Import failed";
      console.error(`[PATIENT-IMPORT] Row ${row.id} import failed:`, message);
      await db
        .update(patientImportStaging)
        .set({
          importStatus: "Failed",
          errorMessage: message,
        })
        .where(eq(patientImportStaging.id, row.id));
    }
  }

  const summary = await getImportBatchSummary(params.organizationId, params.batchId);
  const duplicateRows = await getDuplicateStagingRows(params.organizationId, params.batchId);
  let message: string | undefined;
  if (importedRecords === 0) {
    if (duplicateRecords > 0 || summary.duplicateRecords > 0) {
      const dupCount = Math.max(duplicateRecords, summary.duplicateRecords);
      message = `No new patients inserted — ${dupCount} duplicate record(s) skipped. Edit duplicates in the review dialog and insert remaining.`;
    } else if (failedRecords > 0) {
      message = `Import finished with 0 inserts — ${failedRecords} record(s) failed (see Notes column).`;
    }
  } else {
    const ids = insertedPatients.map((p) => `${p.patientId} (db id ${p.patientDbId})`).join(", ");
    const skipNote =
      duplicateRecords > 0
        ? ` Skipped ${duplicateRecords} duplicate(s).`
        : summary.duplicateRecords > 0
          ? ` ${summary.duplicateRecords} duplicate(s) remain — edit and insert remaining.`
          : "";
    message =
      importedRecords === 1
        ? `Patient inserted into the database successfully (${ids}).${skipNote}`
        : `${importedRecords} patients inserted into the database successfully (${ids}).${skipNote}`;
  }

  await writeAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "import",
    importBatchId: params.batchId,
    summary: {
      ...summary,
      importedRecords: summary.importedRecords,
      failedRecords: summary.failedRecords,
      duplicateRecords: summary.duplicateRecords,
    },
    details: {
      insertedThisRun: importedRecords,
      skippedDuplicatesThisRun: duplicateRecords,
      insertedPatients,
    },
  });

  return {
    ...summary,
    insertedThisRun: importedRecords,
    skippedDuplicatesThisRun: duplicateRecords,
    insertedPatients,
    duplicateRows,
    databaseSchema: activeDbSchema,
    message,
  };
}

export async function encryptExistingPlainPatients(params: {
  organizationId: number;
  userId: number;
}): Promise<{ processed: number; failed: number; skipped: number }> {
  if (!isPatientEncryptionConfigured()) {
    throw new Error("Patient encryption is not configured");
  }

  const rows = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.organizationId, params.organizationId),
        eq(patients.isEncrypted, false),
      ),
    );

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      if (isEncryptedPatientStorageRow(row)) {
        skipped++;
        const hashes = computePatientSearchHashes(params.organizationId, {
          cnic: row.nhsNumber as string,
          phone: row.phone as string,
          email: row.email as string,
        });
        await db
          .update(patients)
          .set({ isEncrypted: true, ...hashes, updatedAt: new Date() })
          .where(eq(patients.id, row.id));
        continue;
      }

      const plaintext = {
        organizationId: row.organizationId,
        userId: row.userId,
        patientId: row.patientId,
        firstName: row.firstName,
        lastName: row.lastName,
        relation: row.relation,
        dateOfBirth: row.dateOfBirth,
        genderAtBirth: row.genderAtBirth,
        email: row.email || `patient-${row.id}@legacy.local`,
        phone: row.phone,
        nhsNumber: row.nhsNumber,
        address: row.address,
        insuranceInfo: row.insuranceInfo,
        emergencyContact: row.emergencyContact,
        medicalHistory: row.medicalHistory,
        communicationPreferences: row.communicationPreferences,
        riskLevel: row.riskLevel,
        flags: row.flags,
        isActive: row.isActive,
        isInsured: row.isInsured,
        createdBy: row.createdBy,
      };

      const hashes = computePatientSearchHashes(params.organizationId, {
        cnic: String(plaintext.nhsNumber ?? ""),
        phone: String(plaintext.phone ?? ""),
        email: String(plaintext.email ?? ""),
      });

      const encrypted = await preparePatientForStorage(plaintext as Record<string, unknown>);
      await db
        .update(patients)
        .set({
          ...(encrypted as Record<string, unknown>),
          isEncrypted: true,
          cnicHash: hashes.cnicHash,
          phoneHash: hashes.phoneHash,
          emailHash: hashes.emailHash,
          updatedAt: new Date(),
        } as typeof patients.$inferInsert)
        .where(eq(patients.id, row.id));

      processed++;
    } catch (error) {
      failed++;
      console.error(`[PATIENT-IMPORT] Encrypt existing failed for patient ${row.id}:`, error);
    }
  }

  await writeAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "encrypt_existing",
    summary: {
      batchId: "",
      totalRecords: rows.length,
      importedRecords: processed,
      failedRecords: failed,
      existingRecords: skipped,
    } as ImportBatchSummary,
    details: { processed, failed, skipped },
  });

  return { processed, failed, skipped };
}

export async function backfillPatientSearchHashes(organizationId: number): Promise<number> {
  const rows = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.organizationId, organizationId),
        or(
          sql`${patients.cnicHash} IS NULL`,
          sql`${patients.phoneHash} IS NULL`,
          sql`${patients.emailHash} IS NULL`,
        ),
      ),
    );

  let updated = 0;
  for (const row of rows) {
    try {
      const decrypted = await storage.getPatient(row.id, organizationId);
      if (!decrypted) continue;
      const hashes = computePatientSearchHashes(organizationId, {
        cnic: decrypted.nhsNumber,
        phone: decrypted.phone,
        email: decrypted.email,
      });
      await db
        .update(patients)
        .set({
          cnicHash: hashes.cnicHash,
          phoneHash: hashes.phoneHash,
          emailHash: hashes.emailHash,
          isEncrypted: true,
        })
        .where(eq(patients.id, row.id));
      updated++;
    } catch {
      /* skip rows that cannot be decrypted */
    }
  }
  return updated;
}

export async function getImportReportRows(
  organizationId: number,
  batchId: string,
  type: "validation" | "errors",
) {
  if (type === "validation") {
    return db
      .select()
      .from(patientImportStaging)
      .where(
        and(
          eq(patientImportStaging.organizationId, organizationId),
          eq(patientImportStaging.importBatchId, batchId),
        ),
      );
  }

  return db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
        or(
          eq(patientImportStaging.importStatus, "Failed"),
          eq(patientImportStaging.validationStatus, "Invalid"),
          eq(patientImportStaging.importStatus, "Duplicate"),
        ),
      ),
    );
}

export function rowsToCsv(
  rows: Array<Record<string, unknown>>,
  columns: string[],
): string {
  const escape = (value: unknown) => {
    const str = value == null ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((col) => escape(row[col])).join(","));
  return [header, ...body].join("\n");
}
