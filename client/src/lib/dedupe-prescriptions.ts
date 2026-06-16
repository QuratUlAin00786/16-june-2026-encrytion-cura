function medicationsFingerprint(medications: unknown): string {
  if (!Array.isArray(medications)) return "";
  return medications
    .map(
      (med: { name?: string; dosage?: string; frequency?: string }) =>
        `${med?.name ?? ""}|${med?.dosage ?? ""}|${med?.frequency ?? ""}`,
    )
    .join(";");
}

/** Collapse burst duplicate rows from multi-submit (same patient/doctor/rx within ~15s). */
export function dedupePrescriptions<T extends {
  id?: number;
  patientId?: number;
  doctorId?: number;
  diagnosis?: string;
  medications?: unknown;
  createdAt?: string | Date;
}>(list: T[]): T[] {
  if (!Array.isArray(list) || list.length <= 1) {
    return Array.isArray(list) ? list : [];
  }

  const byBurstKey = new Map<string, T>();

  for (const rx of list) {
    const createdMs = rx.createdAt ? new Date(rx.createdAt).getTime() : 0;
    const bucket = Number.isFinite(createdMs)
      ? Math.floor(createdMs / 15000)
      : 0;
    const key = [
      rx.patientId,
      rx.doctorId,
      (rx.diagnosis || "").trim(),
      medicationsFingerprint(rx.medications),
      bucket,
    ].join("::");

    const existing = byBurstKey.get(key);
    if (!existing) {
      byBurstKey.set(key, rx);
      continue;
    }

    const rxId = typeof rx.id === "number" ? rx.id : Infinity;
    const existingId =
      typeof existing.id === "number" ? existing.id : Infinity;
    if (rxId < existingId) {
      byBurstKey.set(key, rx);
    }
  }

  return Array.from(byBurstKey.values());
}
