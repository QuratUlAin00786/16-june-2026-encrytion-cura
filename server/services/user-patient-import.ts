import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { and, asc, eq } from "drizzle-orm";
import { db, activeDbSchema } from "../db";
import { pool } from "../db";
import { storage } from "../storage";
import { patientImportStaging } from "@shared/schema";
import { parseLegacyPatientSql } from "../utils/legacy-sql-parser";
import {
  LEGACY_USER_PATIENT_SQL_TEMPLATE,
  LEGACY_USER_SQL_TEMPLATE,
  parseLegacyUserSql,
} from "../utils/legacy-user-sql-parser";
import {
  findExistingPatientForImport,
  resolveStagingNationalId,
  validateStagingRow,
} from "./patient-import";
import {
  formatCnicForStorage,
  isValidEmailFormat,
  normalizePhone,
} from "../utils/patient-search-hashes";
import { isPatientEncryptionConfigured } from "../utils/encryption-sdk";

function parseAddressString(address?: string | null) {
  if (!address?.trim()) return {};
  try {
    return JSON.parse(address) as Record<string, unknown>;
  } catch {
    return { street: address.trim(), country: "Pakistan" };
  }
}

export type UserPatientPairPreview = {
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
};

export type UserPatientImportSummary = {
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
  pairs?: UserPatientPairPreview[];
  message?: string;
};

type UserStagingRow = {
  id: number;
  organization_id: number;
  import_batch_id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  password_hash: string | null;
  import_status: string;
  validation_status: string;
  error_message: string | null;
  duplicate_reason: string | null;
  imported_user_id: number | null;
  matched_patient_staging_id: number | null;
};

async function ensureUserImportSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_import_staging (
      id serial PRIMARY KEY,
      organization_id integer NOT NULL,
      import_batch_id text NOT NULL,
      email text,
      username text,
      first_name text,
      last_name text,
      role text DEFAULT 'patient',
      password_hash text,
      import_status varchar(20) NOT NULL DEFAULT 'Pending',
      validation_status varchar(20) NOT NULL DEFAULT 'Pending',
      error_message text,
      duplicate_reason text,
      imported_user_id integer,
      matched_patient_staging_id integer,
      created_at timestamp NOT NULL DEFAULT now(),
      imported_at timestamp
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_import_staging_batch
      ON user_import_staging (organization_id, import_batch_id);
  `);
}

function normalizeEmail(email?: string | null): string {
  return email?.trim().toLowerCase() || "";
}

export function getUserPatientSqlTemplates() {
  return {
    usersSql: LEGACY_USER_SQL_TEMPLATE,
    patientsSql: LEGACY_USER_PATIENT_SQL_TEMPLATE,
    usersFields: [
      "organization_id",
      "email",
      "username",
      "password_hash (optional — default cura123)",
      "first_name",
      "last_name",
      "role (must be patient)",
      "is_active",
    ],
    patientsFields: [
      "first_name",
      "last_name",
      "date_of_birth",
      "gender_at_birth",
      "email (must match users.email)",
      "phone",
      "nhs_number",
      "address (JSON)",
      "organization_id",
    ],
  };
}

export async function uploadUserPatientSqlPair(params: {
  organizationId: number;
  userId: number;
  usersFileName: string;
  patientsFileName: string;
  usersContent: string;
  patientsContent: string;
}): Promise<{
  batchId: string;
  userRecords: number;
  patientRecords: number;
}> {
  await ensureUserImportSchema();

  const parsedUsers = parseLegacyUserSql(params.usersContent);
  const parsedPatients = parseLegacyPatientSql(params.patientsContent);
  const batchId = randomUUID();

  for (const row of parsedUsers) {
    await pool.query(
      `INSERT INTO user_import_staging (
        organization_id, import_batch_id, email, username, first_name, last_name, role, password_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.organizationId,
        batchId,
        row.email?.trim() || null,
        row.username?.trim() || row.email?.trim() || null,
        row.firstName?.trim() || null,
        row.lastName?.trim() || null,
        (row.role || "patient").toLowerCase(),
        row.passwordHash || null,
      ],
    );
  }

  const patientStagingRows = parsedPatients.map((row) => ({
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
  for (let i = 0; i < patientStagingRows.length; i += chunkSize) {
    await db.insert(patientImportStaging).values(patientStagingRows.slice(i, i + chunkSize));
  }

  console.log(
    `[USER-PATIENT-IMPORT] Staged ${parsedUsers.length} user(s) and ${parsedPatients.length} patient(s) batch=${batchId}`,
  );

  return {
    batchId,
    userRecords: parsedUsers.length,
    patientRecords: parsedPatients.length,
  };
}

async function loadUserStaging(organizationId: number, batchId: string): Promise<UserStagingRow[]> {
  const { rows } = await pool.query<UserStagingRow>(
    `SELECT * FROM user_import_staging
     WHERE organization_id = $1 AND import_batch_id = $2
     ORDER BY id ASC`,
    [organizationId, batchId],
  );
  return rows;
}

export async function getUserPatientPairPreview(
  organizationId: number,
  batchId: string,
): Promise<UserPatientPairPreview[]> {
  const userRows = await loadUserStaging(organizationId, batchId);
  const patientRows = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
      ),
    )
    .orderBy(asc(patientImportStaging.id));

  const patientsByEmail = new Map<string, (typeof patientRows)[0]>();
  for (const p of patientRows) {
    const key = normalizeEmail(p.email);
    if (key && !patientsByEmail.has(key)) {
      patientsByEmail.set(key, p);
    }
  }

  const pairs: UserPatientPairPreview[] = [];
  const matchedPatientIds = new Set<number>();

  for (const user of userRows) {
    const email = normalizeEmail(user.email);
    const patient = email ? patientsByEmail.get(email) : undefined;
    if (patient) matchedPatientIds.add(patient.id);

    const validationStatus =
      user.validation_status === "Validated" && patient?.validationStatus === "Validated"
        ? "Validated"
        : user.validation_status === "Duplicate" || patient?.validationStatus === "Duplicate"
          ? "Duplicate"
          : user.validation_status === "Invalid" || patient?.validationStatus === "Invalid"
            ? "Invalid"
            : user.validation_status;

    pairs.push({
      userStagingId: user.id,
      patientStagingId: patient?.id ?? 0,
      email: user.email || "",
      userFirstName: user.first_name,
      userLastName: user.last_name,
      patientFullName: patient?.fullName ?? null,
      patientPhone: patient?.phone ?? null,
      validationStatus,
      importStatus: user.import_status,
      errorMessage: user.error_message || patient?.errorMessage || null,
    });
  }

  for (const patient of patientRows) {
    if (matchedPatientIds.has(patient.id)) continue;
    pairs.push({
      userStagingId: 0,
      patientStagingId: patient.id,
      email: patient.email || "",
      userFirstName: null,
      userLastName: null,
      patientFullName: patient.fullName ?? null,
      patientPhone: patient.phone ?? null,
      validationStatus: "Unpaired",
      importStatus: patient.importStatus || "Pending",
      errorMessage: "No matching user row for this patient email",
    });
  }

  return pairs;
}

export async function validateUserPatientBatch(
  organizationId: number,
  batchId: string,
): Promise<UserPatientImportSummary> {
  await ensureUserImportSchema();
  const userRows = await loadUserStaging(organizationId, batchId);
  const patientRows = await db
    .select()
    .from(patientImportStaging)
    .where(
      and(
        eq(patientImportStaging.organizationId, organizationId),
        eq(patientImportStaging.importBatchId, batchId),
      ),
    );

  const patientsByEmail = new Map<string, (typeof patientRows)[0]>();
  for (const p of patientRows) {
    const key = normalizeEmail(p.email);
    if (key) patientsByEmail.set(key, p);
  }

  let pairedRecords = 0;
  let unpairedUsers = 0;
  let validPairs = 0;
  let duplicatePairs = 0;
  const matchedPatientIds = new Set<number>();

  for (const user of userRows) {
    const email = normalizeEmail(user.email);
    if (!email || !isValidEmailFormat(email)) {
      await pool.query(
        `UPDATE user_import_staging SET validation_status='Invalid', import_status='Failed', error_message=$1 WHERE id=$2`,
        ["Valid email is required", user.id],
      );
      unpairedUsers++;
      continue;
    }

    const role = (user.role || "patient").toLowerCase();
    if (role !== "patient") {
      await pool.query(
        `UPDATE user_import_staging SET validation_status='Invalid', import_status='Failed', error_message=$1 WHERE id=$2`,
        [`Role must be patient (got ${role})`, user.id],
      );
      unpairedUsers++;
      continue;
    }

    const existingUser = await storage.getUserByEmail(email, organizationId);
    if (existingUser) {
      duplicatePairs++;
      await pool.query(
        `UPDATE user_import_staging SET validation_status='Duplicate', import_status='Duplicate',
         error_message=$1, duplicate_reason=$1, imported_user_id=$2 WHERE id=$3`,
        [`User email already exists (#${existingUser.id})`, existingUser.id, user.id],
      );
      continue;
    }

    const patient = patientsByEmail.get(email);
    if (!patient) {
      unpairedUsers++;
      await pool.query(
        `UPDATE user_import_staging SET validation_status='Invalid', import_status='Failed', error_message=$1 WHERE id=$2`,
        [`No patient row with matching email ${email}`, user.id],
      );
      continue;
    }

    matchedPatientIds.add(patient.id);
    pairedRecords++;

    const patientValidation = validateStagingRow(patient);
    if (!patientValidation.valid) {
      await pool.query(
        `UPDATE user_import_staging SET validation_status='Invalid', import_status='Failed', error_message=$1, matched_patient_staging_id=$2 WHERE id=$3`,
        [patientValidation.errors.join("; "), patient.id, user.id],
      );
      await db
        .update(patientImportStaging)
        .set({
          validationStatus: "Invalid",
          importStatus: "Failed",
          errorMessage: patientValidation.errors.join("; "),
        })
        .where(eq(patientImportStaging.id, patient.id));
      continue;
    }

    const duplicate = await findExistingPatientForImport(organizationId, patient);
    if (duplicate) {
      duplicatePairs++;
      const msg = `Patient already exists (#${duplicate.id}, ${duplicate.reason})`;
      await pool.query(
        `UPDATE user_import_staging SET validation_status='Duplicate', import_status='Duplicate', error_message=$1, duplicate_reason=$1, matched_patient_staging_id=$2 WHERE id=$3`,
        [msg, patient.id, user.id],
      );
      await db
        .update(patientImportStaging)
        .set({
          validationStatus: "Duplicate",
          importStatus: "Duplicate",
          errorMessage: msg,
        })
        .where(eq(patientImportStaging.id, patient.id));
      continue;
    }

    validPairs++;
    await pool.query(
      `UPDATE user_import_staging SET validation_status='Validated', import_status='Validated', error_message=NULL, duplicate_reason=NULL, matched_patient_staging_id=$1 WHERE id=$2`,
      [patient.id, user.id],
    );
    await db
      .update(patientImportStaging)
      .set({
        validationStatus: "Validated",
        importStatus: "Validated",
        errorMessage: null,
        duplicateReason: null,
      })
      .where(eq(patientImportStaging.id, patient.id));
  }

  let unpairedPatients = 0;
  for (const patient of patientRows) {
    if (!matchedPatientIds.has(patient.id)) {
      unpairedPatients++;
      await db
        .update(patientImportStaging)
        .set({
          validationStatus: "Invalid",
          importStatus: "Failed",
          errorMessage: "No matching user row for this patient email",
        })
        .where(eq(patientImportStaging.id, patient.id));
    }
  }

  const pairs = await getUserPatientPairPreview(organizationId, batchId);
  return {
    batchId,
    userRecords: userRows.length,
    patientRecords: patientRows.length,
    pairedRecords,
    unpairedUsers,
    unpairedPatients,
    validPairs,
    duplicatePairs,
    importedPairs: 0,
    failedPairs: 0,
    pairs,
    message: `${validPairs} pair(s) ready to import`,
  };
}

export async function importUserPatientBatch(params: {
  organizationId: number;
  batchId: string;
  userId: number;
}): Promise<UserPatientImportSummary> {
  if (!isPatientEncryptionConfigured()) {
    throw new Error("Patient encryption is not configured");
  }

  await validateUserPatientBatch(params.organizationId, params.batchId);

  const userRows = await loadUserStaging(params.organizationId, params.batchId);
  let importedPairs = 0;
  let failedPairs = 0;

  for (const user of userRows) {
    if (user.validation_status !== "Validated" || user.import_status === "Imported") {
      continue;
    }
    if (!user.matched_patient_staging_id) continue;

    const [patient] = await db
      .select()
      .from(patientImportStaging)
      .where(eq(patientImportStaging.id, user.matched_patient_staging_id));

    if (!patient || patient.validationStatus !== "Validated") {
      failedPairs++;
      continue;
    }

    try {
      const email = user.email!.trim();
      const firstName = user.first_name?.trim() || patient.fullName?.split(" ")[0] || "Patient";
      const lastName =
        user.last_name?.trim() ||
        patient.fullName?.split(" ").slice(1).join(" ") ||
        "User";

      let passwordHash = user.password_hash?.trim();
      if (!passwordHash || passwordHash.toLowerCase() === "null") {
        passwordHash = await bcrypt.hash("cura123", 10);
      } else if (!passwordHash.startsWith("$2")) {
        passwordHash = await bcrypt.hash(passwordHash, 10);
      }

      const createdUser = await storage.createUser({
        organizationId: params.organizationId,
        email,
        username: user.username?.trim() || email,
        passwordHash,
        firstName,
        lastName,
        role: "patient",
        isActive: true,
        isSaaSOwner: false,
        dateOfBirth: patient.dateOfBirth || undefined,
        genderAtBirth: patient.gender || undefined,
      });

      const nationalId = resolveStagingNationalId(patient);
      const phone = normalizePhone(patient.phone || "");
      const rawNationalId = patient.cnic?.trim() || nationalId;
      const cnic =
        rawNationalId.includes("-") && rawNationalId.length === 13
          ? formatCnicForStorage(rawNationalId)
          : rawNationalId;

      const patientCount = await storage.countPatientsInOrganization(params.organizationId);
      const patientId = `P${(patientCount + 1).toString().padStart(6, "0")}`;

      const createdPatient = await storage.createPatient({
        organizationId: params.organizationId,
        userId: createdUser.id,
        patientId,
        firstName,
        lastName,
        relation: "Self",
        email,
        phone,
        nhsNumber: cnic,
        dateOfBirth: patient.dateOfBirth || "1990-01-01",
        genderAtBirth: patient.gender || undefined,
        address: parseAddressString(patient.address),
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

      await pool.query(
        `UPDATE user_import_staging SET import_status='Imported', imported_user_id=$1, imported_at=now() WHERE id=$2`,
        [createdUser.id, user.id],
      );
      await db
        .update(patientImportStaging)
        .set({
          importStatus: "Imported",
          importedPatientId: createdPatient.id,
          importedAt: new Date(),
        })
        .where(eq(patientImportStaging.id, patient.id));

      importedPairs++;
      console.log(
        `[USER-PATIENT-IMPORT] Created user #${createdUser.id} + patient ${createdPatient.patientId} (db #${createdPatient.id})`,
      );
    } catch (error) {
      failedPairs++;
      const message = error instanceof Error ? error.message : "Import failed";
      await pool.query(
        `UPDATE user_import_staging SET import_status='Failed', error_message=$1 WHERE id=$2`,
        [message, user.id],
      );
      await db
        .update(patientImportStaging)
        .set({ importStatus: "Failed", errorMessage: message })
        .where(eq(patientImportStaging.id, patient.id));
    }
  }

  const summary = await validateUserPatientBatch(params.organizationId, params.batchId);
  return {
    ...summary,
    importedPairs,
    failedPairs,
    message:
      importedPairs > 0
        ? `Imported ${importedPairs} user+patient pair(s) into ${activeDbSchema}.users and ${activeDbSchema}.patients (encrypted).`
        : `No pairs imported. ${failedPairs} failed.`,
  };
}
