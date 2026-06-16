/**
 * Patient double-booking prevention: same patient cannot have overlapping
 * scheduled/confirmed windows with any provider. Uses local-time intervals.
 */

export const PATIENT_OVERLAP_MESSAGE =
  "This patient already has an appointment scheduled during this time. Please choose a different time slot.";

/**
 * Paragraph for the "Patient has Already an appointment with another doctor" modal: names the provider the user is
 * booking with and explains the conflict. When the overlapping appointment is with
 * the same provider, uses "already booked with" that doctor; otherwise explains
 * patient overlap with another provider's appointment.
 */
export function buildPatientOverlapDialogDescription(
  selectedProviderDisplayName: string,
  options?: {
    conflictProviderId?: number | string | null | undefined;
    selectedProviderId?: number | string | null | undefined;
    conflictProviderDisplayName?: string | null | undefined;
  },
): string {
  const name =
    selectedProviderDisplayName.trim() || "the selected provider";
  const confPid = options?.conflictProviderId;
  const selPid = options?.selectedProviderId;
  const conflictNameRaw = options?.conflictProviderDisplayName ?? "";
  const conflictName = String(conflictNameRaw).trim();
  const sameDoctor =
    confPid != null &&
    selPid != null &&
    String(confPid) === String(selPid);

  if (sameDoctor) {
    return `You are trying to book an appointment with ${name}, but the selected date and time are already booked with ${name}. Please choose a different time slot.`;
  }
  if (conflictName) {
    return `You are trying to book an appointment with ${name}, but the selected date and time overlap with another appointment already scheduled for this patient with ${conflictName}. Please choose a different time slot.`;
  }
  return `You are trying to book an appointment with ${name}, but the selected date and time overlap with another appointment already scheduled for this patient with a different provider. Please choose a different time slot.`;
}

/** Bookings that occupy the patient's calendar for overlap checks. */
const PATIENT_SCHEDULE_OVERLAP_STATUSES = new Set(["scheduled", "confirmed"]);

function normalizeStatusForOverlap(status: unknown): string {
  return String(status ?? "")
    .toLowerCase()
    .trim();
}

export function patientStatusBlocksScheduleOverlap(status: unknown): boolean {
  return PATIENT_SCHEDULE_OVERLAP_STATUSES.has(normalizeStatusForOverlap(status));
}

export function getExistingAppointmentIntervalMs(
  apt: any,
  parseLocal: (v: string | Date) => Date,
): { startMs: number; endMs: number } | null {
  const start = parseLocal(apt.scheduledAt);
  if (Number.isNaN(start.getTime())) return null;
  const dur =
    apt.duration != null && Number(apt.duration) > 0
      ? Number(apt.duration)
      : 30;
  return { startMs: start.getTime(), endMs: start.getTime() + dur * 60 * 1000 };
}

/** Half-open overlap; touching endpoints do not overlap (back-to-back allowed). */
export function appointmentIntervalsOverlapMs(
  newStartMs: number,
  newEndMs: number,
  exStartMs: number,
  exEndMs: number,
): boolean {
  return newStartMs < exEndMs && newEndMs > exStartMs;
}

/** Build [start, end) from calendar date + slot label (e.g. "11:45 AM") and duration in minutes. */
export function buildLocalIntervalFromDateAndTimeSlot(
  appointmentDate: Date,
  timeSlotStr: string,
  durationMinutes: number,
): { start: Date; end: Date } | null {
  const trimmed = timeSlotStr.trim();
  const upper = trimmed.toUpperCase();
  const hasAmPm = upper.includes("AM") || upper.includes("PM");
  if (!hasAmPm) {
    const m = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hour24 = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    if ([hour24, minutes].some((n) => Number.isNaN(n))) return null;
    const start = new Date(appointmentDate);
    start.setHours(hour24, minutes, 0, 0);
    return {
      start,
      end: new Date(start.getTime() + durationMinutes * 60 * 1000),
    };
  }
  const spaceIdx = trimmed.lastIndexOf(" ");
  if (spaceIdx <= 0) return null;
  const time = trimmed.slice(0, spaceIdx);
  const period = trimmed.slice(spaceIdx + 1).toUpperCase();
  const [hStr, mStr] = time.split(":");
  let hour24 = parseInt(hStr, 10);
  const minutes = parseInt(mStr || "0", 10);
  if ([hour24, minutes].some((n) => Number.isNaN(n))) return null;
  if (period.startsWith("P") && hour24 !== 12) hour24 += 12;
  if (period.startsWith("A") && hour24 === 12) hour24 = 0;
  const start = new Date(appointmentDate);
  start.setHours(hour24, minutes, 0, 0);
  return {
    start,
    end: new Date(start.getTime() + durationMinutes * 60 * 1000),
  };
}

const NON_BLOCKING_OVERLAP_STATUSES = new Set([
  "cancelled",
  "canceled",
  "completed",
  "rescheduled",
]);

function normalizeOverlapStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Keep only rows whose wall-clock interval overlaps [scheduledAt, scheduledAt + duration). */
export function filterAppointmentRowsByWallClockOverlap(
  scheduledAt: string,
  durationMinutes: number,
  rows: any[] | null | undefined,
  parseLocal: (v: string | Date) => Date,
): any[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const newStart = parseLocal(scheduledAt);
  const newDur = Number(durationMinutes) > 0 ? Number(durationMinutes) : 30;
  const newEnd = new Date(newStart.getTime() + newDur * 60 * 1000);
  const n0 = newStart.getTime();
  const n1 = newEnd.getTime();
  if (Number.isNaN(n0) || Number.isNaN(n1) || n1 <= n0) return [];

  return rows.filter((apt) => {
    const st = normalizeOverlapStatus(apt?.status);
    if (NON_BLOCKING_OVERLAP_STATUSES.has(st)) return false;
    const iv = getExistingAppointmentIntervalMs(apt, parseLocal);
    if (!iv) return false;
    return appointmentIntervalsOverlapMs(n0, n1, iv.startMs, iv.endMs);
  });
}

export function findPatientScheduleOverlap(
  patientIdStr: string,
  newStart: Date,
  newEnd: Date,
  appointments: any[] | undefined,
  parseLocal: (v: string | Date) => Date,
  options: { excludeAppointmentId?: number | null },
): { conflict: any | null } {
  if (!appointments?.length) return { conflict: null };
  const n0 = newStart.getTime();
  const n1 = newEnd.getTime();
  if (n1 <= n0) return { conflict: null };
  for (const apt of appointments) {
    if (
      options.excludeAppointmentId != null &&
      Number(apt.id) === Number(options.excludeAppointmentId)
    ) {
      continue;
    }
    const aptPatient = apt.patientId ?? apt.patient_id;
    if (String(aptPatient) !== String(patientIdStr)) continue;
    if (!patientStatusBlocksScheduleOverlap(apt.status)) continue;
    const iv = getExistingAppointmentIntervalMs(apt, parseLocal);
    if (!iv) continue;
    if (appointmentIntervalsOverlapMs(n0, n1, iv.startMs, iv.endMs)) {
      return { conflict: apt };
    }
  }
  return { conflict: null };
}
