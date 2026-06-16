/**
 * Patient PHI storage adapter — all cryptography is performed by
 * @averox/curaemrencryption-crypto-sdk (AveroxCrypto + row sessions).
 * This module only maps patients table columns to SDK encryptField/decryptField calls.
 */
import crypto from "node:crypto";
import {
  AveroxCrypto,
  getSDKMetadata,
  getSupportedAlgorithms,
  BadInputError,
  InvalidTagError,
  AveroxCryptoError,
  RowEncryptionSession,
  RowDecryptionSession,
  type EnvelopeWithKMS,
  type ProvisionedDataKey,
} from "@averox/curaemrencryption-crypto-sdk";

export {
  AveroxCrypto,
  getSDKMetadata,
  getSupportedAlgorithms,
  BadInputError,
  InvalidTagError,
  AveroxCryptoError,
  RowEncryptionSession,
  RowDecryptionSession,
  type EnvelopeWithKMS,
};

/** Domain-separated AAD for whole-patient payload authentication */
const PATIENT_RECORD_AAD = "cura-emr:patient-record:v1";

/** Wrapper key for encrypted jsonb column values */
const ENCRYPTED_JSONB_FIELD_KEY = "__encryptedField";

/** medicalHistory key used to store the encrypted patient payload */
export const ENCRYPTED_PATIENT_PAYLOAD_KEY = "__encryptedPatientPayload";

/** Text columns on patients that store per-field encrypted envelopes */
const PATIENT_ENCRYPTED_TEXT_FIELDS = [
  "firstName",
  "lastName",
  "relation",
  "dateOfBirth",
  "genderAtBirth",
  "email",
  "phone",
  "nhsNumber",
] as const;

/** Jsonb columns on patients that store { __encryptedField: "<envelope>" } */
const PATIENT_ENCRYPTED_JSONB_FIELDS = [
  "address",
  "insuranceInfo",
  "emergencyContact",
  "communicationPreferences",
] as const;

type PatientTextField = (typeof PATIENT_ENCRYPTED_TEXT_FIELDS)[number];
type PatientJsonbField = (typeof PATIENT_ENCRYPTED_JSONB_FIELDS)[number];

/** Optional PHI columns — may be null/legacy plaintext; full row blob is authoritative. */
const OPTIONAL_PATIENT_TEXT_FIELDS = new Set<PatientTextField>([
  "relation",
  "dateOfBirth",
  "genderAtBirth",
  "phone",
  "nhsNumber",
]);

const RAW_ROW_FIELD_ALIASES: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  dateOfBirth: "date_of_birth",
  genderAtBirth: "gender_at_birth",
  nhsNumber: "nhs_number",
  insuranceInfo: "insurance_info",
  emergencyContact: "emergency_contact",
  communicationPreferences: "communication_preferences",
};

let sdkInstance: AveroxCrypto | null = null;

const LOCAL_ENCRYPTED_DEK_PREFIX = "local:v1:";

function vaultConfigFromEnv(): {
  apiEndpoint?: string;
  kekName?: string;
  context?: string;
} {
  return {
    apiEndpoint: process.env.VAULT_API_ENDPOINT?.trim() || undefined,
    kekName: process.env.VAULT_KEK_NAME?.trim() || undefined,
    context:
      process.env.VAULT_CONTEXT?.trim() ||
      process.env.ENCRYPTION_TENANT_ID?.trim() ||
      undefined,
  };
}

function getLocalDekWrappingKey(): Buffer {
  const secret = process.env.FILE_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret || String(secret).length < 16) {
    throw new AveroxCryptoError(
      "LOCAL_DEK_UNAVAILABLE",
      "FILE_SECRET or ENCRYPTION_KEY (min 16 chars) is required when the Inkrypt vault is unavailable.",
    );
  }
  return crypto
    .createHash("sha256")
    .update(`cura-emr:patient-local-dek-wrap:v1:${secret}`)
    .digest();
}

function isLocalEncryptedDek(value: string): boolean {
  return value.startsWith(LOCAL_ENCRYPTED_DEK_PREFIX);
}

function wrapDekForLocalStorage(dekPlaintextBase64: string): string {
  const kek = getLocalDekWrappingKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", kek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(dekPlaintextBase64, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = JSON.stringify({
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ct: ciphertext.toString("base64url"),
  });
  return `${LOCAL_ENCRYPTED_DEK_PREFIX}${Buffer.from(payload, "utf8").toString("base64url")}`;
}

function unwrapLocalEncryptedDek(wrapped: string): string {
  if (!isLocalEncryptedDek(wrapped)) {
    throw new AveroxCryptoError("LOCAL_DEK_INVALID", "Not a locally wrapped DEK");
  }
  const raw = Buffer.from(wrapped.slice(LOCAL_ENCRYPTED_DEK_PREFIX.length), "base64url").toString(
    "utf8",
  );
  const { iv, tag, ct } = JSON.parse(raw) as { iv: string; tag: string; ct: string };
  const kek = getLocalDekWrappingKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    kek,
    Buffer.from(iv, "base64url"),
  ) as crypto.DecipherGCM;
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ct, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

function isVaultUnavailableError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === "BACKEND_DATAKEY_FAILED" || code === "BACKEND_DECRYPT_FAILED") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /Backend datakey|Backend DEK|<!doctype html>/i.test(message);
}

function localDekFallbackEnabled(): boolean {
  const explicit = process.env.PATIENT_ENCRYPTION_USE_LOCAL_DEK;
  if (explicit === "1" || explicit === "true") {
    return true;
  }
  return process.env.PATIENT_ENCRYPTION_FALLBACK_LOCAL_DEK !== "false";
}

async function provisionLocalPatientDataKey(sdk: AveroxCrypto): Promise<ProvisionedDataKey> {
  const keySize = sdk.keySize;
  const dek = crypto.randomBytes(keySize);
  return {
    dek,
    encryptedDEK: wrapDekForLocalStorage(dek.toString("base64")),
  };
}

/** Shared SDK client (vault KEK + envelope encryption from package metadata). */
export function getEncryptionSdk(): AveroxCrypto {
  if (!sdkInstance) {
    const meta = getSDKMetadata() as {
      vaultApiEndpoint?: string;
      vaultKekName?: string;
      metadata?: { tenant?: string };
    };
    const envVault = vaultConfigFromEnv();
    sdkInstance = new AveroxCrypto({
      apiEndpoint: envVault.apiEndpoint || meta.vaultApiEndpoint,
      kekName: envVault.kekName || meta.vaultKekName,
      context: envVault.context || meta.metadata?.tenant,
    });
  }
  return sdkInstance;
}

/** True when SDK vault metadata is present. */
export function isPatientEncryptionConfigured(): boolean {
  try {
    const meta = getSDKMetadata() as {
      vaultApiEndpoint?: string;
      vaultKekName?: string;
      envelopeEncryptionEnabled?: boolean;
      metadata?: { tenant?: string };
    };
    return Boolean(
      meta.vaultApiEndpoint &&
        meta.vaultKekName &&
        meta.metadata?.tenant &&
        meta.envelopeEncryptionEnabled !== false,
    );
  } catch {
    return false;
  }
}

/** Strip empty address parts before jsonb column encryption. */
export function normalizePatientAddressForStorage(
  address: unknown,
): Record<string, string> {
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return {};
  }
  const keys = ["street", "city", "state", "postcode", "country", "building"] as const;
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = (address as Record<string, unknown>)[key];
    if (value != null && String(value).trim() !== "") {
      result[key] = String(value).trim();
    }
  }
  return result;
}

/** Ensures preparePatientForStorage produced required per-column envelopes. */
export function assertEncryptedPatientInsertRow(insertData: Record<string, unknown>): void {
  if (!isEncryptedScalarField(insertData.email)) {
    throw new BadInputError("Patient email was not encrypted for storage");
  }
  if (!isEncryptedScalarField(insertData.firstName)) {
    throw new BadInputError("Patient firstName was not encrypted for storage");
  }
  if (!isEncryptedScalarField(insertData.lastName)) {
    throw new BadInputError("Patient lastName was not encrypted for storage");
  }
  const medicalHistory = insertData.medicalHistory as Record<string, unknown> | undefined;
  const payload = medicalHistory?.[ENCRYPTED_PATIENT_PAYLOAD_KEY];
  if (typeof payload !== "string" || payload.length === 0) {
    throw new BadInputError("Patient encrypted payload is missing from medicalHistory");
  }
}

export function fieldAad(fieldName: string): string {
  return `cura-emr:patient-field:${fieldName}:v1`;
}

function sdkSupportedAlgorithms(): Set<string> {
  return new Set(getSupportedAlgorithms().map((alg) => alg.toUpperCase()));
}

function isSdkEnvelope(o: unknown): o is EnvelopeWithKMS {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const envelope = o as EnvelopeWithKMS;
  const algorithms = sdkSupportedAlgorithms();
  return (
    envelope.v === "2.0" &&
    typeof envelope.alg === "string" &&
    algorithms.has(envelope.alg.toUpperCase()) &&
    typeof envelope.ct === "string" &&
    typeof envelope.iv === "string" &&
    typeof envelope.tag === "string" &&
    typeof envelope.encryptedDEK === "string" &&
    envelope.encryptedDEK.length > 0
  );
}

function parseEnvelope(encryptedData: string): EnvelopeWithKMS {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encryptedData);
  } catch {
    throw new BadInputError("Encrypted patient data is not valid JSON");
  }

  if (!isSdkEnvelope(parsed)) {
    throw new BadInputError("Encrypted patient data has an invalid SDK envelope structure");
  }

  return parsed;
}

/** True when a text column holds an SDK envelope (JSON string or parsed object). */
export function isEncryptedScalarField(value: unknown): boolean {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) {
      return false;
    }
    try {
      return isSdkEnvelope(JSON.parse(trimmed));
    } catch {
      return false;
    }
  }
  return isSdkEnvelope(value);
}

/** Normalize DB/driver values to envelope JSON for decrypt. */
export function patientEnvelopeJsonFromUnknown(stored: unknown): string | null {
  if (typeof stored === "string") {
    const trimmed = stored.trim();
    return isEncryptedScalarField(trimmed) ? trimmed : null;
  }
  if (isSdkEnvelope(stored)) {
    return JSON.stringify(stored);
  }
  return null;
}

function isEmptyObject(value: unknown): boolean {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0
  );
}

function assertSdkConfigured(): void {
  if (!isPatientEncryptionConfigured()) {
    throw new AveroxCryptoError(
      "SDK_NOT_CONFIGURED",
      "Encryption SDK is not configured. Vault metadata is missing from the SDK package.",
    );
  }
}

async function beginPatientRowEncryption(): Promise<RowEncryptionSession> {
  assertSdkConfigured();
  const sdk = getEncryptionSdk();
  if (!localDekFallbackEnabled()) {
    return sdk.beginRowEncryption();
  }
  try {
    return await sdk.beginRowEncryption();
  } catch (error) {
    if (!isVaultUnavailableError(error)) {
      throw error;
    }
    console.warn(
      "[patient-encrypt] Inkrypt vault unavailable — using FILE_SECRET/ENCRYPTION_KEY local DEK wrap",
    );
    const dataKey = await provisionLocalPatientDataKey(sdk);
    return new RowEncryptionSession(sdk, dataKey);
  }
}

async function beginPatientRowDecryptionFromEnvelope(
  rowEnvelope: EnvelopeWithKMS,
): Promise<RowDecryptionSession> {
  const sdk = getEncryptionSdk();
  const encryptedDEK = rowEnvelope.encryptedDEK;
  if (encryptedDEK && isLocalEncryptedDek(encryptedDEK)) {
    const dekPlaintextB64 = unwrapLocalEncryptedDek(encryptedDEK);
    const dek = Buffer.from(dekPlaintextB64, "base64");
    return new RowDecryptionSession(sdk, encryptedDEK, dek);
  }
  return sdk.beginRowDecryptionFromEnvelope(rowEnvelope);
}

/** Single-field encrypt via SDK (provisions its own DEK — prefer row session for full rows). */
async function sdkEncryptField(plaintext: string, aad: string): Promise<EnvelopeWithKMS> {
  assertSdkConfigured();
  return getEncryptionSdk().encryptField(plaintext, aad);
}

/** Single-field decrypt via SDK. */
async function sdkDecryptField(envelope: EnvelopeWithKMS, aad: string): Promise<Buffer> {
  return getEncryptionSdk().decryptField(envelope, aad);
}

/** Encrypts a scalar patient column value (stored as envelope JSON string). */
export async function encryptPatientField(fieldName: string, plaintext: string): Promise<string> {
  const normalized = plaintext.trim();
  if (!normalized) {
    throw new BadInputError(`Field "${fieldName}" must be non-empty to encrypt`);
  }
  const envelope = await sdkEncryptField(normalized, fieldAad(fieldName));
  return JSON.stringify(envelope);
}

async function encryptPatientFieldWithRowSession(
  session: RowEncryptionSession,
  fieldName: string,
  plaintext: string,
): Promise<string> {
  const normalized = plaintext.trim();
  if (!normalized) {
    throw new BadInputError(`Field "${fieldName}" must be non-empty to encrypt`);
  }
  const envelope = await session.encryptField(normalized, fieldAad(fieldName));
  return JSON.stringify(envelope);
}

async function decryptPatientFieldWithRowSession(
  session: RowDecryptionSession,
  fieldName: string,
  encryptedValue: unknown,
): Promise<string> {
  const json =
    typeof encryptedValue === "string" && isEncryptedScalarField(encryptedValue.trim())
      ? encryptedValue.trim()
      : patientEnvelopeJsonFromUnknown(encryptedValue);
  if (!json) {
    throw new BadInputError(`Field "${fieldName}" is not in encrypted envelope format`);
  }
  const envelope = parseEnvelope(json);
  const plaintext = await session.decryptField(envelope, fieldAad(fieldName));
  return plaintext.toString("utf8");
}

/** Decrypts a scalar patient column envelope. */
export async function decryptPatientField(
  fieldName: string,
  encryptedValue: unknown,
): Promise<string> {
  const json =
    typeof encryptedValue === "string" && isEncryptedScalarField(encryptedValue.trim())
      ? encryptedValue.trim()
      : patientEnvelopeJsonFromUnknown(encryptedValue);
  if (!json) {
    throw new BadInputError(`Field "${fieldName}" is not in encrypted envelope format`);
  }

  const envelope = parseEnvelope(json);
  const plaintext = await sdkDecryptField(envelope, fieldAad(fieldName));
  return plaintext.toString("utf8");
}

async function encryptPatientTextColumnWithRowSession(
  session: RowEncryptionSession,
  fieldName: PatientTextField,
  value: unknown,
  required = false,
): Promise<string | null> {
  if (value == null || String(value).trim() === "") {
    if (required) {
      throw new BadInputError(`Field "${fieldName}" is required`);
    }
    return null;
  }
  return encryptPatientFieldWithRowSession(session, fieldName, String(value));
}

async function encryptPatientJsonbColumnWithRowSession(
  session: RowEncryptionSession,
  fieldName: PatientJsonbField,
  value: unknown,
): Promise<Record<string, string>> {
  if (value == null || isEmptyObject(value)) {
    return {};
  }
  const serialized = JSON.stringify(value);
  if (serialized === "{}" || serialized === "null") {
    return {};
  }
  return {
    [ENCRYPTED_JSONB_FIELD_KEY]: await encryptPatientFieldWithRowSession(
      session,
      fieldName,
      serialized,
    ),
  };
}

function getRawColumnValue(rawPatient: Record<string, unknown>, fieldName: string): unknown {
  if (fieldName in rawPatient) {
    return rawPatient[fieldName];
  }
  const snake = RAW_ROW_FIELD_ALIASES[fieldName];
  if (snake && snake in rawPatient) {
    return rawPatient[snake];
  }
  return undefined;
}

function legacyPlaintextColumnValue(stored: unknown): string | null {
  if (stored == null || stored === "") {
    return null;
  }
  if (typeof stored === "number") {
    return String(stored);
  }
  if (typeof stored === "string") {
    const trimmed = stored.trim();
    if (!trimmed || trimmed.startsWith("{")) {
      return null;
    }
    return trimmed;
  }
  return null;
}

async function decryptPatientTextColumnWithRowSession(
  session: RowDecryptionSession,
  fieldName: PatientTextField,
  rawPatient: Record<string, unknown>,
): Promise<unknown> {
  const stored = getRawColumnValue(rawPatient, fieldName);
  const envJson = patientEnvelopeJsonFromUnknown(stored);
  if (!envJson) {
    const legacy = legacyPlaintextColumnValue(stored);
    if (legacy != null) {
      return legacy;
    }
    if (OPTIONAL_PATIENT_TEXT_FIELDS.has(fieldName)) {
      return null;
    }
    throw new BadInputError(`Field "${fieldName}" is not encrypted`);
  }
  return decryptPatientFieldWithRowSession(session, fieldName, envJson);
}

async function decryptPatientJsonbColumnWithRowSession(
  session: RowDecryptionSession,
  fieldName: PatientJsonbField,
  rawPatient: Record<string, unknown>,
): Promise<unknown> {
  const stored = getRawColumnValue(rawPatient, fieldName);
  if (stored == null || isEmptyObject(stored)) {
    return {};
  }
  if (typeof stored !== "object" || Array.isArray(stored)) {
    throw new BadInputError(`Field "${fieldName}" has invalid encrypted jsonb shape`);
  }
  const encrypted = (stored as Record<string, unknown>)[ENCRYPTED_JSONB_FIELD_KEY];
  const encJson = patientEnvelopeJsonFromUnknown(encrypted);
  if (!encJson) {
    throw new BadInputError(`Field "${fieldName}" is not encrypted`);
  }
  try {
    return JSON.parse(await decryptPatientFieldWithRowSession(session, fieldName, encJson));
  } catch (error) {
    if (error instanceof BadInputError) {
      throw error;
    }
    throw new BadInputError(`Decrypted "${fieldName}" is not valid JSON`);
  }
}

/** Encrypts a complete patient object as a single authenticated SDK envelope payload. */
export async function encryptPatientData(
  patient: object,
  rowSession?: RowEncryptionSession,
): Promise<string> {
  if (patient === null || typeof patient !== "object") {
    throw new BadInputError("Patient data must be a non-null object");
  }
  const serialized = JSON.stringify(patient);
  const envelope = rowSession
    ? await rowSession.encryptField(serialized, PATIENT_RECORD_AAD)
    : await sdkEncryptField(serialized, PATIENT_RECORD_AAD);
  return JSON.stringify(envelope);
}

/** Decrypts a patient payload produced by encryptPatientData. */
export async function decryptPatientData(
  encryptedData: string,
  rowSession?: RowDecryptionSession,
): Promise<object> {
  if (!encryptedData || typeof encryptedData !== "string") {
    throw new BadInputError("Encrypted patient data must be a non-empty string");
  }
  const envelope = parseEnvelope(encryptedData);
  const plaintext = rowSession
    ? await rowSession.decryptField(envelope, PATIENT_RECORD_AAD)
    : await sdkDecryptField(envelope, PATIENT_RECORD_AAD);
  try {
    return JSON.parse(plaintext.toString("utf8")) as object;
  } catch {
    throw new BadInputError("Decrypted patient data is not valid JSON");
  }
}

function getMedicalHistoryObject(rawPatient: Record<string, unknown>): Record<string, unknown> | null {
  const medicalHistory = rawPatient.medicalHistory ?? rawPatient.medical_history;
  if (!medicalHistory) return null;
  if (typeof medicalHistory === "object" && medicalHistory !== null) {
    return medicalHistory as Record<string, unknown>;
  }
  if (typeof medicalHistory === "string") {
    try {
      const parsed = JSON.parse(medicalHistory);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/** True when the DB row holds an encrypted patient blob in medicalHistory */
export function isEncryptedPatientStorageRow(rawPatient: unknown): boolean {
  if (!rawPatient || typeof rawPatient !== "object") return false;
  const medicalHistory = getMedicalHistoryObject(rawPatient as Record<string, unknown>);
  const payload = medicalHistory?.[ENCRYPTED_PATIENT_PAYLOAD_KEY];
  return typeof payload === "string" && payload.length > 0;
}

function extractEncryptedPayload(rawPatient: Record<string, unknown>): string {
  const medicalHistory = getMedicalHistoryObject(rawPatient);
  const payload = medicalHistory?.[ENCRYPTED_PATIENT_PAYLOAD_KEY];
  if (typeof payload !== "string" || payload.length === 0) {
    throw new BadInputError("Encrypted patient payload is missing from storage row");
  }
  return payload;
}

/** Decrypt a raw patients table row for display/API use. */
export async function normalizePatientFromDatabaseRow(
  rawPatient: unknown,
): Promise<Record<string, unknown>> {
  if (!rawPatient || typeof rawPatient !== "object") {
    throw new BadInputError("Patient row must be a non-null object");
  }
  return decryptPatientFromStorageRow(rawPatient as Record<string, unknown>);
}

/**
 * Builds a DB row: one DEK per patient via SDK RowEncryptionSession;
 * each PHI column uses session.encryptField (same encryptedDEK, unique IV per column).
 */
export async function preparePatientForStorage(
  patient: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (isEncryptedPatientStorageRow(patient)) {
    throw new BadInputError("Patient record is already encrypted");
  }

  const email = patient.email != null ? String(patient.email).trim() : "";
  if (!email) {
    throw new BadInputError("Patient email is required for encrypted storage");
  }

  const rowSession = await beginPatientRowEncryption();
  try {
    const encryptedPayload = await encryptPatientData({ ...patient, email }, rowSession);

    const [
      firstName,
      lastName,
      relation,
      dateOfBirth,
      genderAtBirth,
      encryptedEmail,
      phone,
      nhsNumber,
      address,
      insuranceInfo,
      emergencyContact,
      communicationPreferences,
    ] = await Promise.all([
      encryptPatientTextColumnWithRowSession(rowSession, "firstName", patient.firstName, true),
      encryptPatientTextColumnWithRowSession(rowSession, "lastName", patient.lastName, true),
      encryptPatientTextColumnWithRowSession(rowSession, "relation", patient.relation),
      encryptPatientTextColumnWithRowSession(rowSession, "dateOfBirth", patient.dateOfBirth),
      encryptPatientTextColumnWithRowSession(rowSession, "genderAtBirth", patient.genderAtBirth),
      encryptPatientFieldWithRowSession(rowSession, "email", email),
      encryptPatientTextColumnWithRowSession(rowSession, "phone", patient.phone),
      encryptPatientTextColumnWithRowSession(rowSession, "nhsNumber", patient.nhsNumber),
      encryptPatientJsonbColumnWithRowSession(rowSession, "address", patient.address),
      encryptPatientJsonbColumnWithRowSession(rowSession, "insuranceInfo", patient.insuranceInfo),
      encryptPatientJsonbColumnWithRowSession(rowSession, "emergencyContact", patient.emergencyContact),
      encryptPatientJsonbColumnWithRowSession(
        rowSession,
        "communicationPreferences",
        patient.communicationPreferences,
      ),
    ]);

    return {
      organizationId: patient.organizationId,
      userId: patient.userId ?? null,
      patientId: patient.patientId,
      firstName,
      lastName,
      relation,
      dateOfBirth,
      genderAtBirth,
      email: encryptedEmail,
      phone,
      nhsNumber,
      address,
      insuranceInfo,
      emergencyContact,
      medicalHistory: { [ENCRYPTED_PATIENT_PAYLOAD_KEY]: encryptedPayload },
      riskLevel: patient.riskLevel ?? "low",
      flags: Array.isArray(patient.flags) ? (patient.flags as unknown[]) : [],
      communicationPreferences,
      isActive: patient.isActive !== false,
      isInsured: patient.isInsured === true,
      createdBy: patient.createdBy ?? null,
    };
  } finally {
    rowSession.close();
  }
}

/** Decrypts an encrypted storage row via SDK RowDecryptionSession (one DEK unwrap per row). */
export async function decryptPatientFromStorageRow(
  rawPatient: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!isEncryptedPatientStorageRow(rawPatient)) {
    throw new BadInputError("Patient row is not encrypted");
  }

  const rowEnvelope = parseEnvelope(extractEncryptedPayload(rawPatient));
  const rowSession = await beginPatientRowDecryptionFromEnvelope(rowEnvelope);

  try {
    const decrypted = (await decryptPatientData(extractEncryptedPayload(rawPatient), rowSession)) as Record<
      string,
      unknown
    >;

    const result: Record<string, unknown> = {
      ...decrypted,
      id: rawPatient.id ?? decrypted.id,
      organizationId: rawPatient.organizationId ?? decrypted.organizationId,
      userId: rawPatient.userId ?? decrypted.userId,
      isActive:
        rawPatient.isActive !== undefined ? rawPatient.isActive : decrypted.isActive,
      isInsured:
        rawPatient.isInsured !== undefined ? rawPatient.isInsured : decrypted.isInsured,
      createdAt: rawPatient.createdAt ?? decrypted.createdAt,
      updatedAt: rawPatient.updatedAt ?? decrypted.updatedAt,
      createdBy: rawPatient.createdBy ?? decrypted.createdBy,
    };

    for (const field of PATIENT_ENCRYPTED_TEXT_FIELDS) {
      const stored = getRawColumnValue(rawPatient, field);
      const hasColumnEnvelope = patientEnvelopeJsonFromUnknown(stored) != null;
      if (!hasColumnEnvelope && OPTIONAL_PATIENT_TEXT_FIELDS.has(field)) {
        const legacy = legacyPlaintextColumnValue(stored);
        if (legacy != null) {
          result[field] = legacy;
        }
        continue;
      }
      result[field] = await decryptPatientTextColumnWithRowSession(rowSession, field, rawPatient);
    }

    for (const field of PATIENT_ENCRYPTED_JSONB_FIELDS) {
      result[field] = await decryptPatientJsonbColumnWithRowSession(rowSession, field, rawPatient);
    }

    return result;
  } finally {
    rowSession.close();
  }
}

/** In-memory search for listings/dropdowns after decryption */
export function patientMatchesSearchQuery(
  patient: Record<string, unknown>,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const fullName = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim().toLowerCase();
  const searchable = [
    fullName,
    patient.patientId,
    patient.email,
    patient.phone,
    patient.nhsNumber,
  ]
    .filter((value) => value != null && String(value).length > 0)
    .map((value) => String(value).toLowerCase());

  return searchable.some((value) => value.includes(normalizedQuery));
}
