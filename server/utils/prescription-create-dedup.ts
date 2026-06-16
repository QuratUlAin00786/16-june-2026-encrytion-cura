/** Coalesce concurrent identical prescription creates into one in-flight operation. */
const inFlightCreates = new Map<string, Promise<unknown>>();

export function buildPrescriptionCreateKey(
  organizationId: number,
  patientId: number,
  doctorId: number,
  prescriptionData: {
    diagnosis?: string;
    medications?: Array<{ name?: string; dosage?: string; frequency?: string }>;
  },
): string {
  const meds = (prescriptionData.medications || [])
    .map((med) => `${med.name ?? ""}|${med.dosage ?? ""}|${med.frequency ?? ""}`)
    .join(";");
  return [
    organizationId,
    patientId,
    doctorId,
    (prescriptionData.diagnosis || "").trim(),
    meds,
  ].join("::");
}

export async function withPrescriptionCreateLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = inFlightCreates.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const task = fn().finally(() => {
    inFlightCreates.delete(key);
  });
  inFlightCreates.set(key, task);
  return task;
}
