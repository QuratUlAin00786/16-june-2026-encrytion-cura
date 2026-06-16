import { useEffect, useState } from "react";

/** Time-relative visual state for an appointment card (independent of DB status). */
export type AppointmentCardTimeKind = "upcoming" | "ongoing" | "past";

function isCancelledAppointmentStatus(status: unknown): boolean {
  const s = String(status ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  return s === "cancelled" || s === "canceled";
}

/**
 * Compares local "now" to the appointment window [start, start+duration).
 * - Same calendar day as today: before start → upcoming; inside → ongoing; after end → past.
 * - Appointment on a future calendar day → upcoming (white).
 * - Appointment on a past calendar day → past (grey).
 * - Cancelled appointments are never shown as ongoing (no green), even if the slot contains "now".
 */
export function getAppointmentCardTimeKind(
  appointment: { scheduledAt: string | Date; duration?: number; status?: unknown },
  now: Date,
  parseScheduledAtLocal: (v: string | Date) => Date
): AppointmentCardTimeKind {
  const start = parseScheduledAtLocal(appointment.scheduledAt);
  const dur =
    appointment.duration != null && Number(appointment.duration) > 0
      ? Number(appointment.duration)
      : 30;
  const end = new Date(start.getTime() + dur * 60 * 1000);

  const aptDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let kind: AppointmentCardTimeKind;
  if (aptDay < today) kind = "past";
  else if (aptDay > today) kind = "upcoming";
  else {
    const t = now.getTime();
    if (t < start.getTime()) kind = "upcoming";
    else if (t >= end.getTime()) kind = "past";
    else kind = "ongoing";
  }

  if (isCancelledAppointmentStatus(appointment.status) && kind === "ongoing") {
    return "past";
  }
  return kind;
}

const CARD_TIME_KIND_ORDER: Record<AppointmentCardTimeKind, number> = {
  ongoing: 0,
  upcoming: 1,
  past: 2,
};

/** Ongoing first, then upcoming, then past; within each group, earlier start time first. */
export function sortAppointmentsByCardTimeKind<
  T extends { scheduledAt: string | Date; duration?: number; status?: unknown },
>(
  appointments: T[],
  now: Date,
  parseScheduledAtLocal: (v: string | Date) => Date,
): T[] {
  return [...appointments].sort((a, b) => {
    const ka = getAppointmentCardTimeKind(a, now, parseScheduledAtLocal);
    const kb = getAppointmentCardTimeKind(b, now, parseScheduledAtLocal);
    const tier = CARD_TIME_KIND_ORDER[ka] - CARD_TIME_KIND_ORDER[kb];
    if (tier !== 0) return tier;
    return (
      parseScheduledAtLocal(a.scheduledAt).getTime() - parseScheduledAtLocal(b.scheduledAt).getTime()
    );
  });
}

/** Badge for in-window (time) running state only; use with getAppointmentCardTimeKind === "ongoing". */
export const appointmentOngoingBadgeClassName =
  "bg-green-100/90 text-green-900 border border-green-200/80 text-xs font-semibold uppercase tracking-wide " +
  "dark:bg-green-950/35 dark:text-green-100 dark:border-green-800/60";

/**
 * Top-right of a `relative` appointment container, nudged outside the box. Pair with {@link appointmentOngoingBadgeClassName}.
 */
export const appointmentOngoingBadgePositionClassName =
  "absolute z-20 -top-2 -right-2 shadow-sm";

export function appointmentCardTimeBackgroundClass(kind: AppointmentCardTimeKind): string {
  switch (kind) {
    case "ongoing":
      // Use white border in light mode for cleaner cards
      return "bg-green-50 dark:bg-green-950/20 border-white/80 dark:border-green-900/45";
    case "past":
      // Keep passed appointments readable (white background like others)
      return "bg-white dark:bg-slate-800 border-white dark:border-slate-700";
    case "upcoming":
    default:
      return "bg-white dark:bg-slate-800 border-white dark:border-gray-700";
  }
}

/**
 * Re-renders the host component on an interval so time-based card styles stay current.
 */
export function useAppointmentTimeTick(intervalMs = 30000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
}
