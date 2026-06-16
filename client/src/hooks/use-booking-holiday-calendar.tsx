import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { useDayRender, type DayProps } from "react-day-picker";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export type BookingHolidayStatus = {
  label: string;
  holidayType: string;
  allowShifts: boolean;
  isWorkingDay: boolean;
  isNonWorking: boolean;
  source: "holiday" | "weekend";
};

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  national: "National",
  regional: "Regional",
  company: "Company",
  weekend: "Weekend",
};

function holidayLabelClass(holidayType: string) {
  if (holidayType === "national") return "text-amber-900 dark:text-amber-100";
  if (holidayType === "regional") return "text-orange-900 dark:text-orange-100";
  if (holidayType === "company") return "text-purple-900 dark:text-purple-100";
  return "";
}

export function useBookingHolidayCalendar(options: {
  enabled: boolean;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  /** When set, fetches holidays from this URL builder instead of authenticated /api/holiday-calendar */
  holidayCalendarUrl?: (from: string, to: string) => string;
}) {
  const { enabled, selectedDate, setSelectedDate, holidayCalendarUrl } = options;
  const [pickerMonth, setPickerMonth] = useState<Date>(() => new Date());
  const [holidayAcknowledged, setHolidayAcknowledged] = useState(false);

  useEffect(() => {
    if (enabled) {
      setPickerMonth(selectedDate ?? new Date());
    }
  }, [enabled, selectedDate]);

  useEffect(() => {
    setHolidayAcknowledged(false);
  }, [selectedDate]);

  useEffect(() => {
    if (!enabled) {
      setHolidayAcknowledged(false);
    }
  }, [enabled]);

  const holidayRange = useMemo(() => {
    const monthStart = startOfMonth(pickerMonth);
    const monthEnd = endOfMonth(pickerMonth);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return {
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };
  }, [pickerMonth]);

  const holidayFetchPath = holidayCalendarUrl
    ? holidayCalendarUrl(holidayRange.from, holidayRange.to)
    : `/api/holiday-calendar?from=${holidayRange.from}&to=${holidayRange.to}`;

  const { data: holidayData } = useQuery({
    queryKey: [holidayFetchPath, "booking", holidayRange.from, holidayRange.to],
    queryFn: async () => {
      const response = await apiRequest("GET", holidayFetchPath);
      if (!response.ok) throw new Error("Failed to load holidays");
      return response.json() as Promise<{
        settings?: {
          weekendDays?: string[];
          weekendsNonWorking?: boolean;
          defaultAllowShiftsOnHolidays?: boolean;
        };
        holidays?: Array<{
          holidayDate: string;
          name: string;
          holidayType: string;
          allowShifts: boolean;
          isWorkingDay: boolean;
        }>;
      }>;
    },
    enabled,
    staleTime: 60_000,
  });

  const holidayByDate = useMemo(() => {
    const map = new Map<string, BookingHolidayStatus>();
    const defaultAllow = holidayData?.settings?.defaultAllowShiftsOnHolidays ?? false;
    for (const h of holidayData?.holidays ?? []) {
      const key = String(h.holidayDate).split("T")[0];
      const allowShifts = h.allowShifts ?? defaultAllow;
      map.set(key, {
        label: h.name,
        holidayType: h.holidayType,
        allowShifts,
        isWorkingDay: h.isWorkingDay,
        isNonWorking: !h.isWorkingDay,
        source: "holiday",
      });
    }
    return map;
  }, [holidayData?.holidays, holidayData?.settings?.defaultAllowShiftsOnHolidays]);

  const isConfiguredWeekend = useCallback(
    (date: Date) => {
      const settings = holidayData?.settings;
      if (!settings?.weekendsNonWorking) return false;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[date.getDay()];
      return (settings.weekendDays ?? ["Saturday", "Sunday"]).includes(dayName);
    },
    [holidayData?.settings],
  );

  const resolveHolidayStatus = useCallback(
    (date: Date): BookingHolidayStatus | null => {
      const dateKey = format(date, "yyyy-MM-dd");
      const explicit = holidayByDate.get(dateKey);
      if (explicit) return explicit;

      const settings = holidayData?.settings;
      if (!settings?.weekendsNonWorking) return null;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[date.getDay()];
      if (!(settings.weekendDays ?? ["Saturday", "Sunday"]).includes(dayName)) return null;

      const allowShifts = settings.defaultAllowShiftsOnHolidays ?? false;
      return {
        label: `${dayName} (weekend)`,
        holidayType: "weekend",
        allowShifts,
        isWorkingDay: false,
        isNonWorking: true,
        source: "weekend",
      };
    },
    [holidayByDate, holidayData?.settings],
  );

  const isDateHolidayBlocked = useCallback(
    (date: Date) => {
      const status = resolveHolidayStatus(date);
      if (!status) return false;
      if (status.source === "holiday") return !status.allowShifts;
      return status.isNonWorking && !status.allowShifts;
    },
    [resolveHolidayStatus],
  );

  const selectedHolidayStatus = useMemo(
    () => (selectedDate ? resolveHolidayStatus(selectedDate) : null),
    [selectedDate, resolveHolidayStatus],
  );

  const PickerDay = useCallback(
    function BookingHolidayPickerDay(props: DayProps) {
      const buttonRef = useRef<HTMLButtonElement>(null);
      const dayRender = useDayRender(props.date, props.displayMonth, buttonRef);
      const dateKey = format(props.date, "yyyy-MM-dd");
      const holidayStatus = holidayByDate.get(dateKey);
      const holidayLabel = holidayStatus?.label;
      const holidayType = holidayStatus?.holidayType;
      const isSelected = !!dayRender.activeModifiers?.selected;
      const showHolidayLabel =
        !!holidayLabel && holidayStatus?.source === "holiday" && !isSelected;

      const dayContent = (
        <>
          <span className="text-sm leading-none">{props.date.getDate()}</span>
          {showHolidayLabel && holidayType && (
            <span
              className={cn(
                "text-[8px] leading-none truncate max-w-[2.25rem] mt-0.5 font-normal",
                holidayLabelClass(holidayType),
              )}
            >
              {holidayLabel.length > 7 ? `${holidayLabel.slice(0, 6)}…` : holidayLabel}
            </span>
          )}
        </>
      );

      if (dayRender.isHidden) return <></>;
      if (!dayRender.isButton) {
        return <div {...dayRender.divProps}>{dayContent}</div>;
      }

      return (
        <td {...dayRender.cellProps}>
          <button
            ref={buttonRef}
            {...dayRender.buttonProps}
            title={holidayLabel}
            className={cn(
              dayRender.buttonProps.className,
              "flex flex-col items-center justify-center h-auto min-h-9 w-9 py-0.5 font-normal",
              dayRender.activeModifiers?.nationalHoliday &&
                !isSelected &&
                "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100 rounded-md",
              dayRender.activeModifiers?.regionalHoliday &&
                !isSelected &&
                "bg-orange-100 text-orange-900 dark:bg-orange-900/40 rounded-md",
              dayRender.activeModifiers?.companyHoliday &&
                !isSelected &&
                "bg-purple-100 text-purple-900 dark:bg-purple-900/40 rounded-md",
              dayRender.activeModifiers?.configWeekend &&
                !isSelected &&
                !dayRender.activeModifiers?.nationalHoliday &&
                !dayRender.activeModifiers?.regionalHoliday &&
                !dayRender.activeModifiers?.companyHoliday &&
                "bg-slate-100 text-slate-700 dark:bg-slate-700/60 rounded-md",
            )}
          >
            {dayContent}
          </button>
        </td>
      );
    },
    [holidayByDate],
  );

  const calendarProps = useMemo(
    () => ({
      month: pickerMonth,
      onMonthChange: setPickerMonth,
      modifiers: {
        nationalHoliday: (date: Date) =>
          holidayByDate.get(format(date, "yyyy-MM-dd"))?.holidayType === "national",
        regionalHoliday: (date: Date) =>
          holidayByDate.get(format(date, "yyyy-MM-dd"))?.holidayType === "regional",
        companyHoliday: (date: Date) =>
          holidayByDate.get(format(date, "yyyy-MM-dd"))?.holidayType === "company",
        configWeekend: (date: Date) => {
          const key = format(date, "yyyy-MM-dd");
          if (holidayByDate.has(key)) return false;
          return isConfiguredWeekend(date);
        },
      },
      classNames: {
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700 rounded-md",
        day_today:
          "bg-blue-100 text-blue-700 aria-selected:bg-blue-600 aria-selected:text-white rounded-md",
      },
      components: { Day: PickerDay },
    }),
    [pickerMonth, holidayByDate, isConfiguredWeekend, PickerDay],
  );

  const legend = (
    <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-[10px] text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-300" />
        National
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded bg-orange-200 border border-orange-300" />
        Regional
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded bg-purple-200 border border-purple-300" />
        Company
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300" />
        Weekend
      </span>
    </div>
  );

  const banner = selectedHolidayStatus ? (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-sm mb-3",
        selectedHolidayStatus.allowShifts
          ? "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100"
          : "border-red-300 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100",
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">
          {HOLIDAY_TYPE_LABELS[selectedHolidayStatus.holidayType] ?? "Holiday"}:{" "}
          {selectedHolidayStatus.label}
        </p>
        <p className="text-xs mt-1 opacity-90">
          {selectedHolidayStatus.allowShifts
            ? "Appointments are allowed with a confirmation warning."
            : "Appointments cannot be booked on this date."}
          {selectedHolidayStatus.isWorkingDay ? " · Marked as a working holiday." : ""}
        </p>
      </div>
    </div>
  ) : null;

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        setSelectedDate(undefined);
        return;
      }
      if (isDateHolidayBlocked(date)) return;
      setSelectedDate(date);
    },
    [isDateHolidayBlocked, setSelectedDate],
  );

  const buildDateDisabled = useCallback(
    (hasShiftsOnDate: (date: Date) => boolean) => (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return true;
      if (isDateHolidayBlocked(date)) return true;
      return !hasShiftsOnDate(date);
    },
    [isDateHolidayBlocked],
  );

  const needsHolidayAcknowledgement =
    !!selectedHolidayStatus && !!selectedHolidayStatus.allowShifts;

  return {
    calendarProps,
    legend,
    banner,
    selectedHolidayStatus,
    resolveHolidayStatus,
    holidayAcknowledged,
    setHolidayAcknowledged,
    handleDateSelect,
    buildDateDisabled,
    isDateHolidayBlocked,
    needsHolidayAcknowledgement,
    resetHolidayState: () => setHolidayAcknowledged(false),
  };
}

export type BookingHolidayCalendarApi = ReturnType<typeof useBookingHolidayCalendar>;

export function BookingHolidayTimeSlotPanel({
  selectedDate,
  bookingHoliday,
  emptyMessage = "Time slots will appear here",
  children,
}: {
  selectedDate: Date | undefined;
  bookingHoliday: BookingHolidayCalendarApi;
  emptyMessage?: string;
  children: ReactNode;
}) {
  if (!selectedDate) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  if (bookingHoliday.needsHolidayAcknowledgement && !bookingHoliday.holidayAcknowledged) {
    return (
      <div className="flex flex-col justify-center h-full min-h-[200px] px-1">
        {bookingHoliday.banner}
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          This date is a configured holiday. Review the notice above, then continue to choose a time slot.
        </p>
        <Button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => bookingHoliday.setHolidayAcknowledged(true)}
        >
          Continue to time slots
        </Button>
      </div>
    );
  }

  return (
    <>
      {bookingHoliday.banner}
      {children}
    </>
  );
}
