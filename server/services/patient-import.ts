import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  patientImportAudit,
  patientImportStaging,
  patients,
  users,
} from "@shared/schema";
import { parseLegacyPatientSql } from "../utils/legacy-sql-parser";
import {
  computePatientSearchHashes,
  formatCnicForStorage,
  isValidCnicFormat,
  isValidEmailFormat,
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

function validateStagingRow(row: {
  fullName?: string | null;
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.fullName?.trim()) errors.push("Full Name is required");
  if (!row.cnic?.trim()) errors.push("CNIC is required");
  else if (!isValidCnicFormat(row.cnic)) errors.push("CNIC format must be xxxxx-xxxxxxx-x");
  if (!row.phone?.trim()) errors.push("Phone is required");
  else if (!isValidPhoneFormat(row.phone)) errors.push("Phone format must be 03xxxxxxxxx");
  if (row.email?.trim() && !isValidEmailFormat(row.email)) {
    errors.push("Email format is invalid");
  }

  return { valid: errors.length === 0, errors };
}

export async function uploadLegacyPatientSql(params: {
  organizationId: number;
  userId: number;
  fileName: string;
  content: string;
}): Promise<{ batchId: string; totalRecords: number }> {
  const parsedRows = parseLegacyPatientSql(params.content);
  const batchId = randomUUID();

  const stagingRows = parsedRows.map((row) => ({
    organizationId: params.organizationId,
    importBatchId: batchId,
    fullName: row.fullName ?? null,
    cnic: row.cnic ?? null,
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
    details: { fileName: params.fileName },
  });

  return { batchId, totalRecords: stagingRows.length };
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

  let validRecords = 0;
  let invalidRecords = 0;
  let duplicateRecords = 0;
  const seenHashes = new Set<string>();

  for (const row of rows) {
    const validation = validateStagingRow(row);
    if (!validation.valid) {
      invalidRecords++;
      await db
        .update(patientImportStaging)
        .set({
          validationStatus: "Invalid",
          importStatus: "Failed",
          errorMessage: validation.errors.join("; "),
        })
        .where(eq(patientImportStaging.id, row.id));
      continue;
    }

    const hashes = computePatientSearchHashes(organizationId, {
      cnic: row.cnic,
      phone: row.phone,
      email: row.email,
    });
    const batchKey = [hashes.cnicHash, hashes.phoneHash, hashes.emailHash]
      .filter(Boolean)
      .join("|");
    if (batchKey && seenHashes.has(batchKey)) {
      duplicateRecords++;
      await db
        .update(patientImportStaging)
        .set({
          validationStatus: "Duplicate",
          importStatus: "Duplicate",
          duplicateReason: "Duplicate within import batch",
          errorMessage: "Duplicate within import batch",
        })
        .where(eq(patientImportStaging.id, row.id));
      continue;
    }
    if (batchKey) seenHashes.add(batchKey);

    const duplicate = await findDuplicateByHashes(organizationId, hashes);
    if (duplicate) {
      duplicateRecords++;
      await db
        .update(patientImportStaging)
        .set({
          validationStatus: "Duplicate",
          importStatus: "Duplicate",
          duplicateReason: `Existing patient #${duplicate.id} (${duplicate.reason})`,
          errorMessage: `Duplicate: ${duplicate.reason}`,
        })
        .where(eq(patientImportStaging.id, row.id));
      continue;
    }

    validRecords++;
    await db
      .update(patientImportStaging)
      .set({
        validationStatus: "Validated",
        importStatus: "Validated",
        errorMessage: null,
        duplicateReason: null,
      })
      .where(eq(patientImportStaging.id, row.id));
  }

  const summary = await getImportBatchSummary(organizationId, batchId);
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
  limit = 100,
) {
  return db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
      ),
    )
    .limit(limit);
}

export async function importValidatedBatch(params: {
  organizationId: number;
  batchId: string;
  userId: number;
}): Promise<ImportBatchSummary> {
  if (!isPatientEncryptionConfigured()) {
    throw new Error("Patient encryption is not configured");
  }

  const rows = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, params.organizationId),
        eq(patientImportStaging.importBatchId, params.batchId),
        eq(patientImportStaging.validationStatus, "Validated"),
      ),
    );

  let importedRecords = 0;
  let failedRecords = 0;
  let duplicateRecords = 0;

  for (const row of rows) {
    try {
      const hashes = computePatientSearchHashes(params.organizationId, {
        cnic: row.cnic,
        phone: row.phone,
        email: row.email,
      });

      const duplicate = await findDuplicateByHashes(params.organizationId, hashes);
      if (duplicate) {
        duplicateRecords++;
        await db
          .update(patientImportStaging)
          .set({
            importStatus: "Duplicate",
            duplicateReason: `Existing patient #${duplicate.id} (${duplicate.reason})`,
            errorMessage: `Skipped duplicate (${duplicate.reason})`,
          })
          .where(eq(patientImportStaging.id, row.id));
        continue;
      }

      const { firstName, lastName } = splitFullName(row.fullName || "Unknown Patient");
      const email =
        row.email?.trim() ||
        `legacy-${hashes.cnicHash?.slice(0, 12) || row.id}@import.local`;
      const phone = normalizePhone(row.phone || "");
      const cnic = formatCnicForStorage(row.cnic || "");

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

      importedRecords++;
      await db
        .update(patientImportStaging)
        .set({
          importStatus: "Imported",
          importedPatientId: created.id,
          importedAt: new Date(),
          errorMessage: null,
        })
        .where(eq(patientImportStaging.id, row.id));
    } catch (error) {
      failedRecords++;
      const message = error instanceof Error ? error.message : "Import failed";
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
  await writeAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "import",
    importBatchId: params.batchId,
    summary: {
      ...summary,
      importedRecords,
      failedRecords: summary.failedRecords,
      duplicateRecords: summary.duplicateRecords,
    },
  });

  return summary;
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
