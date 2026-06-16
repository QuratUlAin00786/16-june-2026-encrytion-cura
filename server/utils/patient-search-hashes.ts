import crypto from "node:crypto";

export type PatientSearchHashInput = {
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function normalizeCnic(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hashValue(organizationId: number, field: string, normalized: string): string {
  if (!normalized) return "";
  const salt =
    process.env.PATIENT_HASH_SALT?.trim() || `cura-emr:patient-hash:v1:${organizationId}`;
  return crypto
    .createHash("sha256")
    .update(`${salt}:${field}:${normalized}`)
    .digest("hex");
}

export function computePatientSearchHashes(
  organizationId: number,
  input: PatientSearchHashInput,
): { cnicHash: string | null; phoneHash: string | null; emailHash: string | null } {
  const cnicNorm = input.cnic ? normalizeCnic(String(input.cnic)) : "";
  const phoneNorm = input.phone ? normalizePhone(String(input.phone)) : "";
  const emailNorm = input.email ? normalizeEmail(String(input.email)) : "";

  return {
    cnicHash: cnicNorm ? hashValue(organizationId, "cnic", cnicNorm) : null,
    phoneHash: phoneNorm ? hashValue(organizationId, "phone", phoneNorm) : null,
    emailHash: emailNorm ? hashValue(organizationId, "email", emailNorm) : null,
  };
}

/** CNIC: xxxxx-xxxxxxx-x */
export function isValidCnicFormat(value: string): boolean {
  const trimmed = value.trim();
  return /^\d{5}-\d{7}-\d$/i.test(trimmed) || /^\d{13}$/.test(normalizeCnic(trimmed));
}

/** Pakistan mobile: 03xxxxxxxxx */
export function isValidPhoneFormat(value: string): boolean {
  const normalized = normalizePhone(value);
  return /^03\d{9}$/.test(normalized);
}

export function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatCnicForStorage(value: string): string {
  const digits = normalizeCnic(value);
  if (digits.length !== 13) return value.trim();
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}
