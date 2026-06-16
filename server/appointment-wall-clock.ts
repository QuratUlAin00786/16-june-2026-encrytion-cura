/**
 * Parse appointment naive timestamps consistently with the calendar UI
 * (`parseScheduledAtAsLocal` in appointment-calendar.tsx): wall-clock components,
 * no implicit UTC shift for strings without a timezone offset.
 */
export function parseAppointmentWallClock(value: unknown): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    // timestamp without time zone from node-pg: wall-clock digits match UTC getters on the
    // Date (e.g. DB 15:00 → 2026-05-16T15:00:00.000Z). Local getters would shift on non-UTC
    // servers and falsely overlap 10:00 with 15:00 (shown as 9:00–10:30 in US timezones).
    return new Date(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      0,
    );
  }
  if (typeof value !== "string") {
    const d = new Date(value as any);
    return Number.isNaN(d.getTime()) ? d : parseAppointmentWallClock(d);
  }

  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    const [datePart, timePart] = s.split(" ");
    const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
    const [hhStr, mmStr, ssStr] = timePart.split(":");
    const hh = parseInt(hhStr || "0", 10);
    const mm = parseInt(mmStr || "0", 10);
    const ss = parseInt((ssStr || "0").split(".")[0], 10);
    if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
      return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0);
    }
  }

  const isoLike = s.includes("T") && (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s));
  if (isoLike) {
    const [datePart, timePartRaw] = s.split("T");
    const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
    const timePart = (timePartRaw || "").replace("Z", "").replace(/[+-]\d{2}:\d{2}$/, "");
    const [hhStr, mmStr, ssStr] = timePart.split(":");
    const hh = parseInt(hhStr || "0", 10);
    const mm = parseInt(mmStr || "0", 10);
    const ss = parseInt((ssStr || "0").split(".")[0], 10);
    if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
      return new Date(y, m - 1, d, hh, mm, ss, 0);
    }
  }

  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const hh = parseInt(match[4], 10);
    const mm = parseInt(match[5], 10);
    const ss = parseInt(match[6] || "0", 10);
    if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
      return new Date(y, m - 1, d, hh, mm, ss, 0);
    }
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
      0,
    );
  }
  return parsed;
}

export function dayBoundsForScheduledInput(scheduledAt: string | Date): { start: Date; end: Date } | null {
  const wall = parseAppointmentWallClock(scheduledAt);
  if (Number.isNaN(wall.getTime())) return null;
  const y = wall.getFullYear();
  const mo = wall.getMonth();
  const d = wall.getDate();
  return {
    start: new Date(y, mo, d, 0, 0, 0, 0),
    end: new Date(y, mo, d, 23, 59, 59, 999),
  };
}

/** Calendar date + minutes-from-midnight interval (wall clock, no timezone). */
export interface WallClockInterval {
  y: number;
  m: number;
  d: number;
  startMin: number;
  endMin: number;
}

export function wallClockIntervalFromScheduled(
  scheduledAt: unknown,
  durationMins?: number | null,
): WallClockInterval | null {
  const wall = parseAppointmentWallClock(scheduledAt);
  if (Number.isNaN(wall.getTime())) return null;
  const dur =
    durationMins != null && Number(durationMins) > 0 ? Number(durationMins) : 30;
  const startMin = wall.getHours() * 60 + wall.getMinutes();
  return {
    y: wall.getFullYear(),
    m: wall.getMonth() + 1,
    d: wall.getDate(),
    startMin,
    endMin: startMin + dur,
  };
}

/** Half-open overlap on the same calendar day only. */
export function wallClockIntervalsOverlap(a: WallClockInterval, b: WallClockInterval): boolean {
  if (a.y !== b.y || a.m !== b.m || a.d !== b.d) return false;
  return a.startMin < b.endMin && a.endMin > b.startMin;
}

/** Normalize DB driver Date / ISO-Z strings to wall-clock inputs before comparing. */
export function normalizeScheduledAtForWallClock(value: unknown): unknown {
  if (value instanceof Date) {
    return formatAppointmentScheduledAtForApi(value) ?? value;
  }
  return value;
}

export function appointmentWallClockOverlaps(
  newScheduledAt: unknown,
  newDurationMins: number | null | undefined,
  existingScheduledAt: unknown,
  existingDurationMins: number | null | undefined,
): boolean {
  const a = wallClockIntervalFromScheduled(
    normalizeScheduledAtForWallClock(newScheduledAt),
    newDurationMins,
  );
  const b = wallClockIntervalFromScheduled(
    normalizeScheduledAtForWallClock(existingScheduledAt),
    existingDurationMins,
  );
  if (!a || !b) return false;
  return wallClockIntervalsOverlap(a, b);
}

/** API/JSON: naive local timestamp without Z (avoids UTC shift in clients). */
export function formatAppointmentScheduledAtForApi(value: unknown): string | null {
  const wall = parseAppointmentWallClock(value);
  if (Number.isNaN(wall.getTime())) return null;
  const y = wall.getFullYear();
  const mo = String(wall.getMonth() + 1).padStart(2, "0");
  const d = String(wall.getDate()).padStart(2, "0");
  const hh = String(wall.getHours()).padStart(2, "0");
  const mm = String(wall.getMinutes()).padStart(2, "0");
  const ss = String(wall.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d}T${hh}:${mm}:${ss}`;
}

export function wallClockDateStringFromScheduled(scheduledAt: unknown): string | null {
  const wall = parseAppointmentWallClock(scheduledAt);
  if (Number.isNaN(wall.getTime())) return null;
  const mo = String(wall.getMonth() + 1).padStart(2, "0");
  const d = String(wall.getDate()).padStart(2, "0");
  return `${wall.getFullYear()}-${mo}-${d}`;
}

const NON_BLOCKING_APPOINTMENT_STATUSES = new Set([
  "cancelled",
  "canceled",
  "completed",
  "rescheduled",
]);

export function normalizeAppointmentStatusKey(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Active appointments on the same calendar day that truly overlap [newStart, newEnd). */
export function filterActiveWallClockConflicts(
  newScheduledAt: unknown,
  newDurationMins: number,
  existingAppointments: any[] | null | undefined,
): any[] {
  if (!Array.isArray(existingAppointments)) return [];
  const dur = Number(newDurationMins) > 0 ? Number(newDurationMins) : 30;
  return existingAppointments.filter((existing) => {
    const st = normalizeAppointmentStatusKey(existing?.status);
    if (NON_BLOCKING_APPOINTMENT_STATUSES.has(st)) return false;
    const exDur = Number(existing?.duration) > 0 ? Number(existing.duration) : 30;
    return appointmentWallClockOverlaps(newScheduledAt, dur, existing?.scheduledAt, exDur);
  });
}

export function mapAppointmentConflictForApi(row: any): Record<string, unknown> {
  const scheduledAt =
    formatAppointmentScheduledAtForApi(row?.scheduledAt ?? row?.scheduled_at) ??
    row?.scheduledAt ??
    row?.scheduled_at;
  return {
    id: row?.id,
    appointmentId: row?.appointmentId ?? row?.appointment_id,
    scheduledAt,
    duration: row?.duration,
    status: row?.status,
    title: row?.title,
    patientId: row?.patientId ?? row?.patient_id,
    providerId: row?.providerId ?? row?.provider_id,
    createdBy: row?.createdBy ?? row?.created_by,
  };
}
