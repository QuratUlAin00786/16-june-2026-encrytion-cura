import type { Patient, User } from "@shared/schema";
import { storage } from "../storage";
import { activeDbSchema } from "../db";
import { ENCRYPTED_PATIENT_PAYLOAD_KEY } from "../utils/encryption-sdk";
import {
  LEGACY_PATIENT_IMPORT_COLUMNS,
  LEGACY_USER_IMPORT_COLUMNS,
} from "../utils/legacy-user-sql-parser";
import { buildImportInsertStatements, buildInsertStatements } from "../utils/sql-export";

export type LegacyExportFormat = "full" | "import";

export type LegacyExportResult = {
  sql: string;
  recordCount: number;
  skippedCount: number;
  filename: string;
  format: LegacyExportFormat;
};

const PATIENT_EXPORT_COLUMNS = [
  "id",
  "organization_id",
  "user_id",
  "patient_id",
  "first_name",
  "last_name",
  "relation",
  "date_of_birth",
  "gender_at_birth",
  "email",
  "phone",
  "nhs_number",
  "address",
  "insurance_info",
  "emergency_contact",
  "medical_history",
  "risk_level",
  "flags",
  "communication_preferences",
  "is_active",
  "is_insured",
  "created_by",
  "created_at",
  "updated_at",
] as const;

const USER_EXPORT_COLUMNS = [
  "id",
  "organization_id",
  "email",
  "stripe_customer_id",
  "username",
  "password_hash",
  "first_name",
  "last_name",
  "role",
  "professional_registration_id",
  "profile_picture_path",
  "department",
  "medical_specialty_category",
  "sub_specialty",
  "working_days",
  "working_hours",
  "permissions",
  "is_active",
  "is_saas_owner",
  "last_login_at",
  "created_at",
  "date_of_birth",
  "gender_at_birth",
] as const;

function exportHeader(params: {
  tableName: string;
  organizationId: number;
  recordCount: number;
  skippedCount: number;
  note: string;
  format: LegacyExportFormat;
}): string {
  const generatedAt = new Date().toISOString();
  const skippedLine =
    params.skippedCount > 0
      ? `-- Skipped (could not decrypt): ${params.skippedCount}\n`
      : "";
  const formatLine =
    params.format === "import"
      ? "-- Format: import-compatible (for Legacy Patient Migration upload tabs)\n"
      : "-- Format: full backup (all columns)\n";
  return `-- Cura EMR ${params.tableName} export
-- Generated: ${generatedAt}
-- Schema: ${activeDbSchema}
-- Organization ID: ${params.organizationId}
-- Records: ${params.recordCount}
${formatLine}${skippedLine}-- ${params.note}

`;
}

function stripEncryptedPayloadFromMedicalHistory(
  medicalHistory: Patient["medicalHistory"],
): Patient["medicalHistory"] {
  if (!medicalHistory || typeof medicalHistory !== "object") return medicalHistory ?? {};
  const copy = { ...(medicalHistory as Record<string, unknown>) };
  delete copy[ENCRYPTED_PATIENT_PAYLOAD_KEY];
  return copy as Patient["medicalHistory"];
}

function formatAddressForImport(address: Patient["address"]): string | null {
  if (!address || typeof address !== "object") return null;
  const keys = Object.keys(address).filter((key) => {
    const value = (address as Record<string, unknown>)[key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
  if (keys.length === 0) return null;
  return JSON.stringify(address);
}

function patientToExportRow(patient: Patient): unknown[] {
  return [
    patient.id,
    patient.organizationId,
    patient.userId ?? null,
    patient.patientId,
    patient.firstName,
    patient.lastName,
    patient.relation ?? null,
    patient.dateOfBirth ?? null,
    patient.genderAtBirth ?? null,
    patient.email ?? null,
    patient.phone ?? null,
    patient.nhsNumber ?? null,
    patient.address ?? {},
    patient.insuranceInfo ?? {},
    patient.emergencyContact ?? {},
    stripEncryptedPayloadFromMedicalHistory(patient.medicalHistory),
    patient.riskLevel ?? "low",
    patient.flags ?? [],
    patient.communicationPreferences ?? {},
    patient.isActive ?? true,
    patient.isInsured ?? false,
    patient.createdBy ?? null,
    patient.createdAt ?? null,
    patient.updatedAt ?? null,
  ];
}

function patientToImportRow(patient: Patient): unknown[] {
  return [
    patient.firstName,
    patient.lastName,
    patient.dateOfBirth ?? null,
    patient.genderAtBirth ?? null,
    patient.email ?? null,
    patient.phone ?? null,
    patient.nhsNumber ?? null,
    formatAddressForImport(patient.address),
    patient.organizationId,
  ];
}

function userToExportRow(user: User): unknown[] {
  return [
    user.id,
    user.organizationId,
    user.email,
    user.stripeCustomerId ?? null,
    user.username,
    user.passwordHash,
    user.firstName,
    user.lastName,
    user.role,
    user.professionalRegistrationId ?? null,
    user.profilePicturePath ?? null,
    user.department ?? null,
    user.medicalSpecialtyCategory ?? null,
    user.subSpecialty ?? null,
    user.workingDays ?? [],
    user.workingHours ?? {},
    user.permissions ?? {},
    user.isActive ?? true,
    user.isSaaSOwner ?? false,
    user.lastLoginAt ?? null,
    user.createdAt ?? null,
    user.dateOfBirth ?? null,
    user.genderAtBirth ?? null,
  ];
}

function userToImportRow(user: User): unknown[] {
  return [
    user.organizationId,
    user.email,
    user.username,
    user.passwordHash || null,
    user.firstName,
    user.lastName,
    user.role,
    user.isActive ?? true,
  ];
}

function parseExportFormat(raw: unknown): LegacyExportFormat {
  return String(raw || "").toLowerCase() === "import" ? "import" : "full";
}

export function resolveLegacyExportFormat(query: Record<string, unknown>): LegacyExportFormat {
  return parseExportFormat(query.format);
}

export async function exportPatientsSql(
  organizationId: number,
  format: LegacyExportFormat = "full",
): Promise<LegacyExportResult> {
  const patients = await storage.getPatientsByOrganization(organizationId);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "import") {
    const exportRows = patients.map(patientToImportRow);
    const sql =
      exportHeader({
        tableName: "patients",
        organizationId,
        recordCount: exportRows.length,
        skippedCount: 0,
        format,
        note:
          "Decrypted PHI. Matches Patient SQL only / Users + Patients upload templates. Re-import assigns new IDs.",
      }) +
      buildImportInsertStatements(
        "patients",
        [...LEGACY_PATIENT_IMPORT_COLUMNS],
        exportRows,
      );

    return {
      sql,
      recordCount: exportRows.length,
      skippedCount: 0,
      format,
      filename: `patients-import-org${organizationId}-${stamp}.sql`,
    };
  }

  const exportRows = patients.map(patientToExportRow);
  const sql =
    exportHeader({
      tableName: "patients",
      organizationId,
      recordCount: exportRows.length,
      skippedCount: 0,
      format,
      note: "PHI decrypted from encrypted storage where applicable. Hash columns omitted.",
    }) + buildInsertStatements("patients", [...PATIENT_EXPORT_COLUMNS], exportRows);

  return {
    sql,
    recordCount: exportRows.length,
    skippedCount: 0,
    format,
    filename: `patients-export-org${organizationId}-${stamp}.sql`,
  };
}

export async function exportUsersSql(
  organizationId: number,
  format: LegacyExportFormat = "full",
): Promise<LegacyExportResult> {
  const allUsers = await storage.getUsersByOrganization(organizationId);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "import") {
    const patientUsers = allUsers.filter((user) => user.role === "patient");
    const exportRows = patientUsers.map(userToImportRow);
    const sql =
      exportHeader({
        tableName: "users",
        organizationId,
        recordCount: exportRows.length,
        skippedCount: 0,
        format,
        note:
          "Patient-role users only. Pair with patients-import SQL by email on Users + Patients tab.",
      }) +
      buildImportInsertStatements("users", [...LEGACY_USER_IMPORT_COLUMNS], exportRows);

    return {
      sql,
      recordCount: exportRows.length,
      skippedCount: 0,
      format,
      filename: `users-import-org${organizationId}-${stamp}.sql`,
    };
  }

  const exportRows = allUsers.map(userToExportRow);
  const sql =
    exportHeader({
      tableName: "users",
      organizationId,
      recordCount: exportRows.length,
      skippedCount: 0,
      format,
      note: "Users table is stored in plaintext; exported as-is for this organization.",
    }) + buildInsertStatements("users", [...USER_EXPORT_COLUMNS], exportRows);

  return {
    sql,
    recordCount: exportRows.length,
    skippedCount: 0,
    format,
    filename: `users-export-org${organizationId}-${stamp}.sql`,
  };
}
