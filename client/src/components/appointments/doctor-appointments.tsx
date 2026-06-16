import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Clock, User, Video, Stethoscope, Plus, ArrowRight, Edit, Search, X, Filter, FileText, MapPin, ChevronsUpDown, ChevronLeft, ChevronRight, Check, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { AppointmentInvoiceInfo } from "./AppointmentInvoiceInfo";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import {
  useBookingHolidayCalendar,
  BookingHolidayTimeSlotPanel,
  type BookingHolidayStatus,
} from "@/hooks/use-booking-holiday-calendar";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isDoctorLike } from "@/lib/role-utils";
import { useLocation } from "wouter";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import {
  getAppointmentCardTimeKind,
  appointmentCardTimeBackgroundClass,
  appointmentOngoingBadgeClassName,
  appointmentOngoingBadgePositionClassName,
  sortAppointmentsByCardTimeKind,
  useAppointmentTimeTick,
} from "@/lib/appointment-card-time-style";
import {
  buildPatientOverlapDialogDescription,
  findPatientScheduleOverlap,
} from "@/lib/patient-appointment-overlap";

function formatAppointmentStatusLabelDoc(status: unknown): string {
  const s = String(status ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  if (!s) return "Unknown";
  if (s === "no_show") return "No show";
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeAppointmentStatusForDoc(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function isNonBlockingForRebookDoc(status: unknown): boolean {
  const s = normalizeAppointmentStatusForDoc(status);
  return s === "completed" || s === "cancelled" || s === "canceled" || s === "rescheduled";
}

/** Calendar/list status filter for nurse/doctor schedule view */
type ListStatusFilter =
  | "active"
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "rescheduled"
  | "cancelled"
  | "no_show"
  | "all";

function matchesListStatusFilter(apt: any, filter: ListStatusFilter): boolean {
  const st = normalizeAppointmentStatusForDoc(apt?.status);
  if (filter === "all") return true;
  if (filter === "active") {
    return st === "scheduled" || st === "confirmed" || st === "in_progress";
  }
  if (filter === "cancelled") return st === "cancelled" || st === "canceled";
  return st === filter;
}

const statusColors = {
  scheduled: "#4A7DFF",
  completed: "#BBF7D0", 
  cancelled: "#162B61",
  no_show: "#9B9EAF"
};

function staffAppointmentStatusBadgeStyle(status: string | undefined): React.CSSProperties {
  const norm = String(status || "scheduled")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  const bg =
    statusColors[norm as keyof typeof statusColors] ?? statusColors.scheduled;
  return {
    backgroundColor: bg,
    color: norm === "completed" ? "#000000" : "#ffffff",
  };
}

function getRecordProfilePictureUrl(
  record: { profilePicturePath?: string | null; profile_picture_path?: string | null } | null | undefined,
): string | null {
  const raw = record?.profilePicturePath ?? record?.profile_picture_path;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

function getPatientProfilePictureUrl(patient: any | null | undefined, usersData: any[]): string | null {
  if (!patient) return null;
  const direct = getRecordProfilePictureUrl(patient);
  if (direct) return direct;
  const uid = patient.userId ?? patient.user_id;
  if (uid == null || !Array.isArray(usersData)) return null;
  const linked = usersData.find((u: any) => String(u.id) === String(uid));
  return getRecordProfilePictureUrl(linked);
}

function patientNameInitials(firstName?: string, lastName?: string): string {
  const a = String(firstName ?? "").trim().charAt(0);
  const b = String(lastName ?? "").trim().charAt(0);
  const s = `${a}${b}`.toUpperCase();
  return s || "?";
}

function PatientFaceAvatar({
  patient,
  usersData,
  sizeClassName = "h-7 w-7",
  fallbackTextClassName = "text-[10px]",
}: {
  patient: any | null | undefined;
  usersData: any[];
  sizeClassName?: string;
  fallbackTextClassName?: string;
}) {
  const src = getPatientProfilePictureUrl(patient, usersData);
  const alt = patient
    ? `${String(patient.firstName ?? "").trim()} ${String(patient.lastName ?? "").trim()}`.trim() || "Patient"
    : "Patient";
  return (
    <Avatar className={`${sizeClassName} shrink-0`}>
      {src ? <AvatarImage src={src} alt={alt} /> : null}
      <AvatarFallback
        className={`bg-blue-100 text-blue-700 ${fallbackTextClassName} dark:bg-blue-900 dark:text-blue-200`}
      >
        {patient ? patientNameInitials(patient.firstName, patient.lastName) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export default function DoctorAppointments({ onNewAppointment }: { onNewAppointment?: () => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "day" | "month">("week");
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  /** Default: only scheduled, confirmed, and in-progress (active work). */
  const [listStatusFilter, setListStatusFilter] = useState<ListStatusFilter>("active");

  // Search/Filter states
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterPatientName, setFilterPatientName] = useState<string>("");
  const [filterPatientId, setFilterPatientId] = useState<string>("");
  const [filterNhsNumber, setFilterNhsNumber] = useState<string>("");
  
  // Cancel confirmation modal state
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);
  const [editingStatusAppointmentId, setEditingStatusAppointmentId] = useState<number | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("scheduled");
  const [updatingStatusAppointmentId, setUpdatingStatusAppointmentId] = useState<number | null>(null);
  const [showPatientOverlapConflict, setShowPatientOverlapConflict] = useState(false);
  const [patientOverlapConflictRecord, setPatientOverlapConflictRecord] = useState<any | null>(null);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [weekHolidayNotice, setWeekHolidayNotice] = useState<{
    day: Date;
    status: BookingHolidayStatus;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [detailsAppointment, setDetailsAppointment] = useState<any>(null);
  
  // Edit appointment state
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  
  // Edit appointment type, treatment, and consultation state
  const [editAppointmentType, setEditAppointmentType] = useState<"consultation" | "treatment" | "">("");
  const [editAppointmentSelectedTreatment, setEditAppointmentSelectedTreatment] = useState<any>(null);
  const [editAppointmentSelectedConsultation, setEditAppointmentSelectedConsultation] = useState<any>(null);
  const [openEditAppointmentTypeCombo, setOpenEditAppointmentTypeCombo] = useState(false);
  const [openEditTreatmentCombo, setOpenEditTreatmentCombo] = useState(false);
  const [openEditConsultationCombo, setOpenEditConsultationCombo] = useState(false);
  const [editAppointmentTypeError, setEditAppointmentTypeError] = useState<string>("");
  const [editTreatmentSelectionError, setEditTreatmentSelectionError] = useState<string>("");
  const [editConsultationSelectionError, setEditConsultationSelectionError] = useState<string>("");
  const [showShareBookingDialog, setShowShareBookingDialog] = useState(false);
  const [shareBookingEmail, setShareBookingEmail] = useState("");
  const [isSharingBookingLink, setIsSharingBookingLink] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  // Fetch appointments for this doctor - backend automatically filters by logged-in user's role
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["/api/appointments", "doctor", user?.id],
    staleTime: 30000,
    // Auto-refresh for doctor role: poll every 10 seconds to get new appointments
    refetchInterval: isDoctorLike(user?.role) ? 10000 : false, // 10 seconds = 10000ms
    refetchIntervalInBackground: isDoctorLike(user?.role), // Continue polling even when tab is in background
    enabled: !!user?.id && isDoctorLike(user?.role),
    queryFn: async () => {
      // Backend automatically filters appointments for doctors (returns only their own appointments)
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      return data;
    },
  });

  // Fetch users for patient names and doctor info
  const usersQuery = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
    enabled: !!user?.id,
  });
  const usersData: any[] = Array.isArray(usersQuery.data) ? usersQuery.data : [];
  const usersLoading = usersQuery.isLoading;

  const patientOverlapSelectedProviderDisplayName = useMemo(() => {
    const pid = editingAppointment?.providerId ?? editingAppointment?.provider_id;
    if (pid == null) return "the selected provider";
    const u = usersData?.find((x: any) => String(x.id) === String(pid));
    if (!u) return "the selected provider";
    const n = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return n || "the selected provider";
  }, [
    editingAppointment?.providerId,
    editingAppointment?.provider_id,
    usersData,
  ]);

  const nurseUserRecord = React.useMemo(() => {
    if (!user || user.role !== "nurse" || !usersData || !Array.isArray(usersData)) {
      return null;
    }
    return usersData.find((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase());
  }, [user, usersData]);

  const nurseTitlePrefix = React.useMemo(() => {
    if (!nurseUserRecord) return "Nurse";
    const gender = (nurseUserRecord.gender || "").toLowerCase();
    if (gender === "female") return "Miss/Mrs";
    if (gender === "male") return "Mr";
    return "Nurse";
  }, [nurseUserRecord]);

  // Fetch patients
  const patientsQuery = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    enabled: !!user?.id,
  });
  const patientsData: any[] = Array.isArray(patientsQuery.data) ? patientsQuery.data : [];
  const patientsLoading = patientsQuery.isLoading;

  const { data: treatmentsList = [] } = useQuery({
    queryKey: ["/api/pricing/treatments"],
    staleTime: 60000,
    enabled: !!user?.id && (isAdmin || isDoctorLike(user?.role)),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/treatments");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: consultationServices = [] } = useQuery({
    queryKey: ["/api/pricing/doctors-fees"],
    staleTime: 60000,
    enabled: !!user?.id && (isAdmin || isDoctorLike(user?.role)),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/doctors-fees");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch shifts data for shift-based time slot generation (custom shifts first, then default shifts)
  const { data: shiftsData = [] } = useQuery({
    queryKey: ["/api/shifts"],
    enabled: !!user?.id && isDoctorLike(user?.role),
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/shifts");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("[EDIT-APPOINTMENT] Error fetching shifts:", error);
        return [];
      }
    },
  });

  const { data: defaultShiftsData = [] } = useQuery({
    queryKey: ["/api/default-shifts"],
    staleTime: 60000,
    enabled: !!user?.id && isDoctorLike(user?.role),
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/default-shifts?forBooking=true");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("[EDIT-APPOINTMENT] Error fetching default shifts:", error);
        return [];
      }
    },
  });

  const treatmentsMap = useMemo(() => {
    const map = new Map<number, any>();
    treatmentsList.forEach((treatment: any) => {
      if (treatment?.id) {
        map.set(treatment.id, treatment);
      }
    });
    return map;
  }, [treatmentsList]);

  const consultationMap = useMemo(() => {
    const map = new Map<number, any>();
    consultationServices.forEach((service: any) => {
      if (service?.id) {
        map.set(service.id, service);
      }
    });
    return map;
  }, [consultationServices]);

  const getAppointmentServiceInfo = (appointment: any) => {
    if (!appointment) return null;
    const treatmentId = appointment.treatmentId ?? appointment.treatment_id;
    const consultationId = appointment.consultationId ?? appointment.consultation_id;
    const type = appointment.appointmentType || appointment.type;

    if (treatmentId) {
      const treatment = treatmentsList.find((item: any) => item.id === treatmentId);
      return {
        name: treatment?.name || "Treatment",
        color: treatment?.colorCode || "#10B981",
      };
    }

    if (consultationId) {
      const service = consultationMap.get(consultationId);
      return {
        name: service?.serviceName || "Consultation",
        color: service?.colorCode || "#6366F1",
      };
    }

    if (type) {
      return {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        color: "#6B7280",
      };
    }
    return null;
  };

  const getAppointmentTypeBadgeInfo = (appointment: any) => {
    if (!isAdmin || !appointment) return null;
    if (appointment.appointmentType === "treatment" && appointment.treatmentId) {
      const treatment = treatmentsMap.get(appointment.treatmentId);
      return {
        label: `Treatment: ${treatment?.name || "Treatment"}`,
        color: treatment?.colorCode || "#10B981",
      };
    }
    if (appointment.appointmentType === "consultation" && appointment.consultationId) {
      const service = consultationMap.get(appointment.consultationId);
      return {
        label: `Consultation: ${service?.serviceName || "Consultation"}`,
        color: service?.colorCode || "#6366F1",
      };
    }
    return null;
  };

  const getAppointmentServiceLabel = (appointment: any) => {
    if (!isAdmin || !appointment) return null;
    if (appointment.appointmentType === "treatment" && appointment.treatmentId) {
      const treatment = treatmentsMap.get(appointment.treatmentId);
      return treatment?.name || "Treatment";
    }
    if (appointment.appointmentType === "consultation" && appointment.consultationId) {
      const service = consultationMap.get(appointment.consultationId);
      return service?.serviceName || "Consultation";
    }
    return null;
  };

  const timeSlotToMinutes = (timeSlot: string): number => {
    const [time, period] = timeSlot.split(" ");
    const [hoursStr, minutesStr] = time.split(":");
    let hour24 = parseInt(hoursStr, 10);
    const minute = parseInt(minutesStr, 10);
    if (period === "PM" && hour24 !== 12) hour24 += 12;
    if (period === "AM" && hour24 === 12) hour24 = 0;
    return hour24 * 60 + minute;
  };

  const minutesToTimeSlot = (minutes: number): string => {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const period = hour24 >= 12 ? "PM" : "AM";
    const displayHour = hour24 % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  // Convert scheduledAt to local minutes (e.g., 8:00 PM -> 1200 minutes)
  // Uses getHours() and getMinutes() (NOT getUTCHours()) to extract local time components
  // This ensures booked slots match the appointment time shown in the header
  const scheduledAtToLocalMinutes = (value: any): number | null => {
    try {
      if (!value) return null;
      const dt = parseScheduledAtAsLocal(value instanceof Date ? value : value.toString());
      if (Number.isNaN(dt.getTime())) return null;
      // Use getHours() and getMinutes() to get local time (not UTC)
      // Example: If appointment is stored as "2026-03-24 20:00:00" (8:00 PM),
      // getHours() returns 20, not 1 (which would be UTC)
      return dt.getHours() * 60 + dt.getMinutes();
    } catch {
      return null;
    }
  };

  // Fetch appointments for a specific date to check booked time slots
  // Uses parseScheduledAtAsLocal() to parse scheduledAt as local time
  // Uses getHours() and getMinutes() (not getUTCHours()) to extract local time components
  // This ensures grey slots match the appointment time shown in the header
  const fetchAppointmentsForDate = async (date: Date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();

      // Filter appointments for the selected date (excluding the current appointment being edited)
      // Only include ACTIVE appointments that should block booking.
      // IMPORTANT: "rescheduled" must NOT block (should remain green/available).
      // Uses parseScheduledAtAsLocal() to parse as local time (ignores timezone conversion)
      const dayAppointments = data.filter((apt: any) => {
        const aptDate = format(parseScheduledAtAsLocal(apt.scheduledAt), "yyyy-MM-dd");
        const st = String(apt?.status ?? "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_");
        const isBlocking = st === "scheduled" || st === "confirmed" || st === "in_progress";
        return aptDate === dateStr && apt.id !== editingAppointment?.id && isBlocking;
      });

      // Extract booked 15-minute slots based on appointment duration (same idea as patient modal)
      // Uses scheduledAtToLocalMinutes() which uses getHours() and getMinutes() (not getUTCHours())
      // Example: If appointment is stored as "2026-03-24 20:00:00" (8:00 PM) in database,
      // and API returns "2026-03-24T20:00:00.000Z", parseScheduledAtAsLocal() extracts local components,
      // getHours() returns 20 (8:00 PM local), and grey slots show "8:00 PM" and "8:15 PM" correctly
      const bookedSlotsSet = new Set<string>();
      dayAppointments.forEach((apt: any) => {
        const startMinutes = scheduledAtToLocalMinutes(apt.scheduledAt);
        if (startMinutes === null) return;
        const duration = apt.duration || 30;
        const endMinutes = startMinutes + duration;
        for (let m = startMinutes; m < endMinutes; m += 15) {
          bookedSlotsSet.add(minutesToTimeSlot(m));
        }
      });
      const bookedSlots = Array.from(bookedSlotsSet);

      setBookedTimeSlots(bookedSlots);
      console.log("📅 Booked time slots for", dateStr, ":", bookedSlots);
    } catch (error) {
      console.error("Error fetching appointments for date:", error);
      setBookedTimeSlots([]);
    }
  };

  // Fetch appointments when editing appointment date changes
  React.useEffect(() => {
    if (editingAppointment?.scheduledAt) {
      const selectedDate = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
      fetchAppointmentsForDate(selectedDate);
    }
  }, [editingAppointment?.scheduledAt, editingAppointment?.id]);

  const editPickerDate = useMemo(() => {
    if (!editingAppointment?.scheduledAt) return undefined;
    const d = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [editingAppointment?.scheduledAt]);

  const setEditPickerDate = useCallback(
    (date: Date | undefined) => {
      if (!editingAppointment || !date) return;
      const current = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
      const merged = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        current.getHours(),
        current.getMinutes(),
        current.getSeconds(),
        0,
      );
      setEditingAppointment({
        ...editingAppointment,
        scheduledAt: merged,
      });
      void fetchAppointmentsForDate(merged);
    },
    [editingAppointment],
  );

  const editBookingHoliday = useBookingHolidayCalendar({
    enabled: !!editingAppointment,
    selectedDate: editPickerDate,
    setSelectedDate: setEditPickerDate,
  });

  const scheduleViewHoliday = useBookingHolidayCalendar({
    enabled: true,
    selectedDate,
    setSelectedDate,
  });

  const HOLIDAY_TYPE_LABELS: Record<string, string> = {
    national: "National",
    regional: "Regional",
    company: "Company",
    weekend: "Weekend",
  };

  const weekDayHolidayCardClass = (day: Date) => {
    const status = scheduleViewHoliday.resolveHolidayStatus(day);
    if (!status) return "";
    if (status.holidayType === "national") {
      return "border-amber-400 bg-amber-50/90 dark:bg-amber-900/25 dark:border-amber-600";
    }
    if (status.holidayType === "regional") {
      return "border-orange-400 bg-orange-50/90 dark:bg-orange-900/25 dark:border-orange-600";
    }
    if (status.holidayType === "company") {
      return "border-purple-400 bg-purple-50/90 dark:bg-purple-900/25 dark:border-purple-600";
    }
    return "border-slate-400 bg-slate-50/90 dark:bg-slate-800/40 dark:border-slate-600";
  };

  const handleScheduleDayClick = (day: Date) => {
    const status = scheduleViewHoliday.resolveHolidayStatus(day);
    if (status) {
      setWeekHolidayNotice({ day, status });
      if (scheduleViewHoliday.isDateHolidayBlocked(day)) return;
      if (!status.allowShifts) {
        setSelectedDate(day);
        setWeekHolidayNotice(null);
      }
      return;
    }
    setWeekHolidayNotice(null);
    setSelectedDate(day);
  };

  const monthDayHolidayCellClass = (
    holidayType: BookingHolidayStatus["holidayType"] | undefined,
    isSelected: boolean,
  ) => {
    if (isSelected || !holidayType) return "";
    if (holidayType === "national") {
      return "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-500";
    }
    if (holidayType === "regional") {
      return "bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-500";
    }
    if (holidayType === "company") {
      return "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-500";
    }
    return "bg-slate-100 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600";
  };

  const monthDayHolidayLabelClass = (holidayType: BookingHolidayStatus["holidayType"]) => {
    if (holidayType === "national") return "text-amber-900 dark:text-amber-100";
    if (holidayType === "regional") return "text-orange-900 dark:text-orange-100";
    if (holidayType === "company") return "text-purple-900 dark:text-purple-100";
    return "";
  };

  // Edit appointment mutation
  const editAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      try {
        // Check if token exists
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error("Authentication required. Please log in again.");
        }

        const appointmentId = appointmentData.id;
        // Remove id from payload as it's in the URL
        const { id, ...updatePayload } = appointmentData;

        console.log('🔍 Editing appointment:', {
          id: appointmentId,
          appointmentType: updatePayload.appointmentType,
          treatmentId: updatePayload.treatmentId,
          consultationId: updatePayload.consultationId,
          hasToken: !!token
        });

        // Use PATCH endpoint which supports appointmentType, treatmentId, and consultationId
        const response = await apiRequest(
          "PATCH",
          `/api/appointments/${appointmentId}`,
          updatePayload,
        );

        try {
          return await response.json();
        } catch (jsonError) {
          // If JSON parsing fails but response was successful, return a success indicator
          return { success: true };
        }
      } catch (error: any) {
        // Extract error message from response if available
        let errorMessage = "Failed to update appointment. Please try again.";
        
        if (error?.message) {
          // Check if error message contains JSON response
          const match = error.message.match(/^\d+:\s*(.+)$/);
          if (match) {
            try {
              const errorData = JSON.parse(match[1]);
              errorMessage = errorData.error || error.message;
            } catch {
              // If parsing fails, check if it's a direct error message
              if (error.message.includes('Authentication required') || error.message.includes('401')) {
                errorMessage = "Authentication required. Please log in again.";
              } else {
                errorMessage = error.message;
              }
            }
          } else {
            errorMessage = error.message;
          }
        }
        
        console.error('❌ Edit appointment error:', error);
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      setSuccessMessage("The appointment has been successfully updated.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      setEditingAppointment(null);
      editBookingHoliday.resetHolidayState();
      setEditAppointmentType("");
      setEditAppointmentSelectedTreatment(null);
      setEditAppointmentSelectedConsultation(null);
      setEditAppointmentTypeError("");
      setEditTreatmentSelectionError("");
      setEditConsultationSelectionError("");
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update appointment. Please try again.";
      console.error('❌ Edit appointment mutation error:', error);
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      // Use PATCH like admin does for canceling appointments
      const response = await apiRequest('PATCH', `/api/appointments/${appointmentId}`, {
        status: 'cancelled'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to cancel appointment" }));
        throw new Error(errorData.error || errorData.message || "Failed to cancel appointment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setSuccessMessage("The appointment has been successfully cancelled.");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      console.error("Cancel appointment error:", error);
      const errorMessage = error?.message || error?.error || "Failed to cancel appointment. Please check your permissions.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update appointment status" }));
        throw new Error(errorData.error || errorData.message || "Failed to update appointment status");
      }
      return response.json();
    },
    onMutate: ({ appointmentId }) => {
      setUpdatingStatusAppointmentId(Number(appointmentId));
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update appointment status.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingStatusAppointmentId(null);
    },
  });

  const handleEditAppointment = (appointment: any) => {
    setEditingAppointment(appointment);
    
    // Determine appointment type: check appointmentType, type, or infer from treatmentId/consultationId
    let normalizedAppointmentType = appointment.appointmentType || appointment.type;
    if (!normalizedAppointmentType) {
      // Infer from existing IDs
      if (appointment.treatmentId) {
        normalizedAppointmentType = "treatment";
      } else if (appointment.consultationId) {
        normalizedAppointmentType = "consultation";
      } else {
        normalizedAppointmentType = "consultation"; // Default
      }
    }
    
    setEditAppointmentType(normalizedAppointmentType);
    
    // Find and set selected treatment or consultation
    const treatment = treatmentsList.find((t: any) => t.id === appointment.treatmentId);
    const consultation = consultationServices.find((s: any) => s.id === appointment.consultationId);
    
    setEditAppointmentSelectedTreatment(treatment || null);
    setEditAppointmentSelectedConsultation(consultation || null);
    
    setEditAppointmentTypeError("");
    setEditTreatmentSelectionError("");
    setEditConsultationSelectionError("");
    setOpenEditAppointmentTypeCombo(false);
    setOpenEditTreatmentCombo(false);
    setOpenEditConsultationCombo(false);
  };

  const handleSaveEdit = () => {
    if (!editingAppointment) return;

    // Validate appointment type selection
    if (!editAppointmentType) {
      setEditAppointmentTypeError("Please select an appointment type");
      return;
    }

    // Validate treatment/consultation selection based on type
    if (editAppointmentType === "treatment" && !editAppointmentSelectedTreatment) {
      setEditTreatmentSelectionError("Please select a treatment");
      return;
    }

    if (editAppointmentType === "consultation" && !editAppointmentSelectedConsultation) {
      setEditConsultationSelectionError("Please select a consultation service");
      return;
    }

    const editStart = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
    const editDur =
      editingAppointment.duration != null && Number(editingAppointment.duration) > 0
        ? Number(editingAppointment.duration)
        : 30;
    const editEnd = new Date(editStart.getTime() + editDur * 60 * 1000);
    const overlapEdit = findPatientScheduleOverlap(
      String(editingAppointment.patientId),
      editStart,
      editEnd,
      appointments,
      parseScheduledAtAsLocal,
      { excludeAppointmentId: editingAppointment.id },
    );
    if (overlapEdit.conflict) {
      if (isNonBlockingForRebookDoc((overlapEdit.conflict as any)?.status)) {
        // Allow rebooking over rescheduled/completed/cancelled appointments
      } else {
      setPatientOverlapConflictRecord(overlapEdit.conflict);
      setShowPatientOverlapConflict(true);
      return;
      }
    }

    // Prepare update data - only include fields that should be updated
    const updateData: any = {
      title: editingAppointment.title || "",
      appointmentType: editAppointmentType,
      scheduledAt: (() => {
        const dt = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
        return formatLocalISOString(dt);
      })(),
      status: editingAppointment.status || "scheduled",
      description: editingAppointment.description || "",
    };

    // Set 'type' field only if appointmentType is "consultation"
    // Backend expects type to be: "consultation", "follow_up", or "procedure"
    // When appointmentType is "treatment", we don't set type (it's optional)
    if (editAppointmentType === "consultation") {
      updateData.type = "consultation";
    }

    // Add optional fields if they exist
    if (editingAppointment.duration) {
      updateData.duration = editingAppointment.duration;
    }
    if (editingAppointment.location) {
      updateData.location = editingAppointment.location;
    }
    if (editingAppointment.isVirtual !== undefined) {
      updateData.isVirtual = editingAppointment.isVirtual;
    }

    // Add treatment or consultation ID based on type
    if (editAppointmentType === "treatment" && editAppointmentSelectedTreatment) {
      updateData.treatmentId = editAppointmentSelectedTreatment.id;
      updateData.consultationId = null;
    } else if (editAppointmentType === "consultation" && editAppointmentSelectedConsultation) {
      updateData.consultationId = editAppointmentSelectedConsultation.id;
      updateData.treatmentId = null;
    }

    // Store appointment ID separately (not in payload)
    const appointmentId = editingAppointment.id;

    console.log('💾 Saving appointment update:', {
      id: appointmentId,
      updateData
    });
    
    editAppointmentMutation.mutate({
      id: appointmentId,
      ...updateData,
    });
  };

  const appointments = appointmentsData || [];
  
  // Debug logging for nurses
  if (user?.role === 'nurse') {
    console.log('👩‍⚕️ NURSE APPOINTMENTS DEBUG:', {
      appointmentsDataLength: appointmentsData?.length || 0,
      appointmentsLength: appointments.length,
      appointments: appointments.map((apt: any) => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt,
        patientId: apt.patientId,
        providerId: apt.providerId,
        status: apt.status,
        createdBy: apt.createdBy
      }))
    });
  }

  // Doctor appointments are already filtered by backend based on logged-in user's role
  const doctorAppointments = React.useMemo(() => {
    if (!user || !isDoctorLike(user.role)) return [];
    
    console.log('🩺 DOCTOR APPOINTMENTS: Current user', {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId
    });
    
    console.log('📊 DOCTOR APPOINTMENTS: Fetched data', {
      totalAppointments: appointments.length,
      totalPatients: patientsData?.length || 0
    });

    // For nurses, show all appointments (not just where they are provider)
    // For doctors, backend already filters by role (doctors see only their own appointments)
    // Data is already scoped to correct organizationId by tenant middleware
    if (user?.role === 'nurse') {
      // Nurses should see all appointments in the calendar view
      console.log('✅ NURSE APPOINTMENTS: Showing', appointments.length, 'appointments for nurse ID', user.id);
      return appointments;
    }
    
    console.log('✅ DOCTOR APPOINTMENTS: Showing', appointments.length, 'appointments for doctor ID', user.id, 'in organization', user.organizationId);
    
    return appointments;
  }, [appointments, user, patientsData]);

  const displayAppointments = React.useMemo(() => {
    return doctorAppointments.filter((apt: any) => matchesListStatusFilter(apt, listStatusFilter));
  }, [doctorAppointments, listStatusFilter]);

  // Helper functions - MUST be defined before useMemo that uses them
  const getPatientName = React.useCallback((patientId: number | string | null | undefined) => {
    if (patientId == null || patientId === "") return "Patient not found";
    if (!patientsData || !Array.isArray(patientsData)) return "Patient not found";

    const patient = patientsData.find((p: any) => {
      if (p.id === patientId || String(p.id) === String(patientId)) return true;
      if (p.userId != null && (p.userId === patientId || String(p.userId) === String(patientId)))
        return true;
      if (p.patientId != null && String(p.patientId) === String(patientId)) return true;
      return false;
    });

    if (patient) {
      const name = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
      if (name) return name;
    }

    return "Patient not found";
  }, [patientsData]);

  const getDoctorNameWithSpecialization = React.useCallback((doctorId: number) => {
    if (!usersData || !Array.isArray(usersData)) return `Doctor ${doctorId}`;
    const doctor = usersData.find((u: any) => u.id === doctorId);
    if (!doctor) return `Doctor ${doctorId}`;
    
    const name = `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
    const specialization = doctor.department || doctor.medicalSpecialtyCategory || '';
    
    return specialization ? `${name} (${specialization})` : name;
  }, [usersData]);

  const getCreatedByName = (createdById: number) => {
    if (!usersData || !Array.isArray(usersData)) return `User ${createdById}`;
    const creator = usersData.find((u: any) => u.id === createdById);
    if (!creator) return `User ${createdById}`;
    
    const name = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
    
    // Format role for display (capitalize first letter of each word, replace underscores with spaces)
    const role = creator.role || '';
    const formattedRole = role
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return name ? `${name} (${formattedRole})` : `User ${createdById}`;
  };

  const getPatientSpecialRequirements = (patient: any): string[] => {
    if (!patient) return [];
    const raw = (patient.medicalHistory as any)?.specialRequirements;
    if (!raw || typeof raw !== "object" || raw.hasSpecialRequirements !== "yes") {
      return [];
    }

    const selected = raw.selected && typeof raw.selected === "object" ? raw.selected : {};
    const details = raw.details && typeof raw.details === "object" ? raw.details : {};
    const labels: Record<string, string> = {
      mobility_wheelchair: "Wheelchair user",
      mobility_walking_assistance: "Walking assistance",
      mobility_bed_bound: "Bed-bound",
      mobility_exam_table_help: "Help onto exam table",
      mobility_other: "Mobility other",
      sensory_hearing_impairment: "Hearing impairment",
      sensory_sign_language: "Sign language interpreter",
      sensory_visual_impairment: "Visual impairment",
      sensory_large_print: "Large-print materials",
      sensory_other: "Sensory other",
      communication_language_barrier: "Language barrier",
      communication_interpreter: "Translator/interpreter",
      communication_difficulty_instructions: "Difficulty with instructions",
      communication_other: "Communication other",
      cognitive_dementia: "Dementia/memory issues",
      cognitive_autism: "Autism spectrum",
      cognitive_anxiety: "Anxiety/panic disorder",
      cognitive_quiet_environment: "Needs quiet environment",
      cognitive_other: "Cognitive other",
      medical_diabetes: "Diabetes",
      medical_heart_condition: "Heart condition",
      medical_epilepsy: "Epilepsy/seizures",
      medical_oxygen: "Requires oxygen",
      medical_other: "Medical other",
      alerts_drug_allergy: "Drug allergy",
      alerts_latex_allergy: "Latex allergy",
      alerts_skin_sensitivity: "Skin sensitivity",
      alerts_cosmetic_allergy: "Cosmetic allergy",
      alerts_other: "Medical alert other",
      infection_condition: "Infectious condition",
      infection_isolation: "Isolation precautions",
      infection_other: "Infection control other",
      aesthetic_sensitive_skin: "Sensitive skin",
      aesthetic_reactions_history: "History of cosmetic reactions",
      aesthetic_undergoing_treatments: "Undergoing cosmetic treatments",
      aesthetic_scarring_concern: "Scarring/pigmentation concern",
      aesthetic_keloid_tendency: "Keloid tendency",
      aesthetic_acne_prone: "Acne-prone skin",
      aesthetic_hyperpigmentation: "Hyperpigmentation/melasma",
      aesthetic_minimal_marks: "Preference for minimal marks",
      aesthetic_skincare_medications: "Using skincare meds",
      aesthetic_recent_treatment: "Recent facial/body treatment",
      aesthetic_other: "Aesthetic other",
      personal_prefers_male_doctor: "Prefers male doctor",
      personal_prefers_female_doctor: "Prefers female doctor",
      personal_modesty_privacy: "Modesty/privacy concerns",
      personal_religious_cultural: "Religious/cultural considerations",
      personal_other: "Personal/cultural other",
      assistance_caregiver: "Caregiver assistance",
      assistance_priority: "Priority/urgent care",
      assistance_other_special: "Other special assistance",
      assistance_other: "Special assistance other",
    };

    return Object.entries(selected)
      .filter(([, checked]) => !!checked)
      .map(([key]) => {
        const label = labels[key] || key;
        const detail = details[key];
        return detail ? `${label}: ${detail}` : label;
      });
  };

  const formatAppointmentDate = (dateValue: string | Date) => {
    try {
      let localDate: Date;
      
      if (dateValue instanceof Date) {
        // If it's a Date object, use it directly
        localDate = dateValue;
      } else {
        // If it's a string, extract date directly from ISO string without timezone conversion
        const datePart = dateValue.split("T")[0];
        const [year, month, day] = datePart.split("-").map(Number);
        if (!year || !month || !day) return "Invalid date";
        localDate = new Date(year, month - 1, day);
      }
      
      return format(localDate, "EEEE, MMMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Format date as local ISO string (no timezone conversion; no Z/+offset)
  const formatLocalISOString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Parse scheduledAt WITHOUT applying JS timezone conversion (mirrors patient-appointments.tsx approach)
  const parseScheduledAtAsLocal = (value: string | Date): Date => {
    if (value instanceof Date) return value;
    if (typeof value !== "string") return new Date(value as any);

    // PostgreSQL timestamp without timezone: "YYYY-MM-DD HH:mm:ss"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
      const [datePart, timePart] = value.split(" ");
      const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
      const [hhStr, mmStr, ssStr] = timePart.split(":");
      const hh = parseInt(hhStr || "0", 10);
      const mm = parseInt(mmStr || "0", 10);
      const ss = parseInt((ssStr || "0").split(".")[0], 10);
      if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
        return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0);
      }
    }

    // ISO-like string: extract date+time components as-is (ignore timezone indicators like 'Z' or '+00:00')
    // Handles formats like: "2026-03-24T20:00:00.000Z", "2026-03-24T20:00:00Z", "2026-03-24T20:00:00"
    // Uses getHours() and getMinutes() to extract local time components
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i,
    );
    if (match) {
      const [, yStr, mStr, dStr, hhStr, mmStr, ssStr] = match;
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const d = parseInt(dStr, 10);
      const hh = parseInt(hhStr, 10);
      const mm = parseInt(mmStr, 10);
      const ss = parseInt(ssStr || "0", 10);
      if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
        // Create local Date object using the extracted components (ignoring timezone)
        // This ensures getHours() returns the correct local hour (e.g., 20 for 8:00 PM)
        return new Date(y, m - 1, d, hh, mm, ss, 0);
      }
    }

    // Fallback: if string parsing fails, try standard Date constructor
    // But extract local components to avoid timezone conversion
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      // If it's a valid date, extract local components to avoid timezone issues
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        parsed.getHours(), // Use getHours() not getUTCHours()
        parsed.getMinutes(), // Use getMinutes() not getUTCMinutes()
        parsed.getSeconds(),
        0
      );
    }
    return parsed;
  };

  /** e.g. "12:45 PM – 1:15 PM · 30 minutes" from scheduledAt + duration (default 30 min). */
  const formatAppointmentTimeRange = (appointment: {
    scheduledAt?: string | Date;
    duration?: number | string | null;
  }) => {
    try {
      if (!appointment?.scheduledAt) return "Invalid time";
      const start = parseScheduledAtAsLocal(appointment.scheduledAt);
      if (Number.isNaN(start.getTime())) return "Invalid time";
      const dur =
        appointment.duration != null && Number(appointment.duration) > 0
          ? Number(appointment.duration)
          : 30;
      const end = new Date(start.getTime() + dur * 60 * 1000);
      const durLabel = dur === 1 ? "1 minute" : `${dur} minutes`;
      return `${format(start, "h:mm a")} – ${format(end, "h:mm a")} · ${durLabel}`;
    } catch {
      return "Invalid time";
    }
  };

  const appointmentTimeTick = useAppointmentTimeTick();
  const nowForCardStyle = useMemo(() => new Date(), [appointmentTimeTick]);

  const getNextUpcomingAppointmentId = useCallback(
    (appointmentsList: any[]): number | null => {
      if (!Array.isArray(appointmentsList) || appointmentsList.length === 0) return null;

      const toStartEnd = (apt: any) => {
        const start = apt?.scheduledAt ? parseScheduledAtAsLocal(apt.scheduledAt) : new Date(NaN);
        const dur = apt?.duration != null && Number(apt.duration) > 0 ? Number(apt.duration) : 30;
        const end = new Date(start.getTime() + dur * 60 * 1000);
        return { start, end };
      };

      const all = appointmentsList
        .map((apt: any) => ({ apt, ...toStartEnd(apt) }))
        .filter(({ start }) => !Number.isNaN(start.getTime()))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      const ongoing = all.filter(({ start, end }) => start <= nowForCardStyle && end > nowForCardStyle);

      if (ongoing.length > 0) {
        const maxOngoingEnd = ongoing.reduce((acc, cur) => (cur.end > acc ? cur.end : acc), ongoing[0].end);
        // Use >= so the first slot that starts when the ongoing block ends (back-to-back) counts as "Next".
        const afterOngoing = all.filter(({ start }) => start >= maxOngoingEnd);
        return afterOngoing.length > 0 ? Number(afterOngoing[0].apt.id) : null;
      }

      const upcoming = all.filter(({ start }) => start > nowForCardStyle);
      return upcoming.length > 0 ? Number(upcoming[0].apt.id) : null;
    },
    [nowForCardStyle],
  );

  // Parse shift time to minutes (e.g., "09:30" -> 570)
  const parseShiftTimeToMinutes = (time?: string): number => {
    if (!time) return 0;
    const cleaned = time.split(".")[0];
    const parts = cleaned.split(":").map((part) => parseInt(part, 10));
    if (parts.length < 2 || parts.some((num) => Number.isNaN(num))) return 0;
    const [hours, minutes] = parts;
    return hours * 60 + minutes;
  };

  const getProviderRoleById = (providerId: number | string | null | undefined): string | undefined => {
    if (!providerId || !usersData || !Array.isArray(usersData)) return undefined;
    const provider = usersData.find((u: any) => u.id?.toString() === providerId.toString());
    return provider?.role?.toString();
  };

  // Get provider shift bounds for a given date (custom shifts first, then default shifts)
  const getProviderShiftBounds = (
    providerId: number | string,
    date: Date,
    roleName?: string,
  ): { start: number; end: number } | null => {
    if (!providerId) return null;
    const selectedDateStr = format(date, "yyyy-MM-dd");

    // TIER 1: Custom shifts for this date + provider
    if (shiftsData && Array.isArray(shiftsData)) {
      const customShift = shiftsData.find((shift: any) => {
        if (shift.staffId?.toString() !== providerId.toString()) return false;
        const shiftDateStr =
          shift.date instanceof Date ? format(shift.date, "yyyy-MM-dd") : shift.date?.substring(0, 10);
        return shiftDateStr === selectedDateStr;
      });

      if (customShift) {
        let endMinutes = parseShiftTimeToMinutes(customShift.endTime);
        const endTimeStr = customShift.endTime?.toString().toLowerCase() || "";
        if (endMinutes === 0 && (endTimeStr.includes("00:00") || endTimeStr.includes("24:00"))) {
          endMinutes = 1440;
        } else if (endMinutes === 1439) {
          endMinutes = 1440;
        }
        return {
          start: parseShiftTimeToMinutes(customShift.startTime),
          end: endMinutes,
        };
      }
    }

    // TIER 2: Default shifts (by provider + optional role)
    if (defaultShiftsData && Array.isArray(defaultShiftsData) && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => {
        if (ds.userId?.toString() !== providerId.toString()) return false;
        if (roleName && ds.roleName) {
          return ds.roleName.toLowerCase() === roleName.toLowerCase();
        }
        return true;
      });

      if (defaultShift) {
        const dayName = format(date, "EEEE");
        if ((defaultShift.workingDays || []).includes(dayName)) {
          let endMinutes = parseShiftTimeToMinutes(defaultShift.endTime || "23:59");
          const endTimeStr = (defaultShift.endTime || "23:59").toString().toLowerCase();
          if (endMinutes === 0 && (endTimeStr.includes("00:00") || endTimeStr.includes("24:00"))) {
            endMinutes = 1440;
          } else if (endMinutes === 1439) {
            endMinutes = 1440;
          }
          return {
            start: parseShiftTimeToMinutes(defaultShift.startTime || "00:00"),
            end: endMinutes,
          };
        }
      }
    }

    return null;
  };

  // Generate 15-minute time slots based on shift bounds
  const generateTimeSlotsFromShifts = (
    providerId: number | string | null,
    date: Date,
    roleName?: string,
  ): string[] => {
    if (!providerId || !date) return [];
    const shiftBounds = getProviderShiftBounds(providerId, date, roleName);
    if (!shiftBounds) return [];

    const slots: string[] = [];
    for (let minutes = shiftBounds.start; minutes < shiftBounds.end; minutes += 15) {
      // stop at exact end
      if (minutes + 15 > shiftBounds.end) break;
      const hour24 = Math.floor(minutes / 60);
      const min = minutes % 60;
      const period = hour24 >= 12 ? "PM" : "AM";
      const displayHour = hour24 % 12 || 12;
      slots.push(`${displayHour}:${min.toString().padStart(2, "0")} ${period}`);
    }
    return slots;
  };

  const getAppointmentsForDate = (date: Date) => {
    const filtered = displayAppointments.filter((apt: any) => {
      const appointmentDate = parseScheduledAtAsLocal(apt.scheduledAt);
      return isSameDay(appointmentDate, date);
    });
    
    // Debug logging for nurses
    if (user?.role === 'nurse') {
      console.log('📅 NURSE CALENDAR: getAppointmentsForDate', {
        date: format(date, 'yyyy-MM-dd'),
        totalAppointments: displayAppointments.length,
        filteredCount: filtered.length,
        appointments: filtered.map((apt: any) => ({
          id: apt.id,
          scheduledAt: apt.scheduledAt,
          patientId: apt.patientId,
          providerId: apt.providerId,
          status: apt.status
        }))
      });
    }
    
    return filtered;
  };

  // Categorize appointments into upcoming and past
  const categorizedAppointments = React.useMemo(() => {
    const now = new Date();
    const upcoming = displayAppointments
      .filter((apt: any) => parseScheduledAtAsLocal(apt.scheduledAt).getTime() > now.getTime())
      .sort(
        (a: any, b: any) =>
          parseScheduledAtAsLocal(a.scheduledAt).getTime() - parseScheduledAtAsLocal(b.scheduledAt).getTime(),
      );

    const past = displayAppointments.filter((apt: any) => {
      const aptDate = parseScheduledAtAsLocal(apt.scheduledAt);
      return isPast(aptDate) && !isSameDay(aptDate, now);
    }).sort(
      (a: any, b: any) =>
        parseScheduledAtAsLocal(b.scheduledAt).getTime() - parseScheduledAtAsLocal(a.scheduledAt).getTime(),
    );

    console.log('📅 DOCTOR APPOINTMENTS: Categorized', {
      upcoming: upcoming.length,
      past: past.length
    });

    return { upcoming, past };
  }, [displayAppointments]);

  // Get filtered appointments based on selected filter and search criteria
  const filteredAppointments = React.useMemo(() => {
    let result = [];
    if (appointmentFilter === 'all') {
      result = displayAppointments;
    } else if (appointmentFilter === 'upcoming') {
      result = categorizedAppointments.upcoming;
    } else {
      result = categorizedAppointments.past;
    }

    // Apply search filters (date, patient name, patient ID, NHS number)
    if (filterDate || filterPatientName || filterPatientId || filterNhsNumber) {
      result = result.filter((apt: any) => {
        // Filter by date
        if (filterDate) {
          const aptDate = format(parseScheduledAtAsLocal(apt.scheduledAt), 'yyyy-MM-dd');
          if (aptDate !== filterDate) return false;
        }

        // Filter by patient name
        if (filterPatientName) {
          const patientName = getPatientName(apt.patientId).toLowerCase();
          if (!patientName.includes(filterPatientName.toLowerCase())) return false;
        }

        // Filter by patient ID or NHS number (need to look up in patients table)
        if (filterPatientId || filterNhsNumber) {
          // Find patient record by ID in patients table
          const patient = patientsData?.find((p: any) => p.id === apt.patientId);
          
          if (filterPatientId) {
            if (!patient || !patient.patientId?.toLowerCase().includes(filterPatientId.toLowerCase())) {
              return false;
            }
          }

          if (filterNhsNumber) {
            if (!patient || !patient.nhsNumber?.toLowerCase().includes(filterNhsNumber.toLowerCase())) {
              return false;
            }
          }
        }

        return true;
      });
    }

    console.log('🎯 DOCTOR APPOINTMENTS: Displaying', result.length, 'appointments (filter:', appointmentFilter + ', search filters active:', !!(filterDate || filterPatientName || filterPatientId || filterNhsNumber) + ')');
    return result;
  }, [displayAppointments, categorizedAppointments, appointmentFilter, filterDate, filterPatientName, filterPatientId, filterNhsNumber, patientsData, usersData]);

  // Get next upcoming appointment (only SCHEDULED status)
  const nextAppointment = categorizedAppointments.upcoming.find((apt: any) => apt.status === 'scheduled') || null;
  
  // Get doctor info for next appointment (provider, not creator)
  const nextAppointmentDoctor = React.useMemo(() => {
    if (nextAppointment?.providerId && usersData && Array.isArray(usersData)) {
      return usersData.find((u: any) => u.id === nextAppointment.providerId);
    }
    return null;
  }, [nextAppointment, usersData]);

  // Get patient info for next appointment
  const nextAppointmentPatient = React.useMemo(() => {
    if (nextAppointment?.patientId && patientsData && Array.isArray(patientsData)) {
      // Try multiple matching strategies to find the patient
      return patientsData.find((p: any) => 
        p.userId === nextAppointment.patientId || 
        p.id === nextAppointment.patientId ||
        (p.patientId && p.patientId === nextAppointment.patientId.toString()) ||
        p.id.toString() === nextAppointment.patientId.toString()
      );
    }
    return null;
  }, [nextAppointment, patientsData]);

  // Get creator info for next appointment
  const nextAppointmentCreator = React.useMemo(() => {
    if (nextAppointment?.createdBy && usersData && Array.isArray(usersData)) {
      return usersData.find((u: any) => u.id === nextAppointment.createdBy);
    }
    return null;
  }, [nextAppointment, usersData]);

  const nextAppointmentServiceInfo = React.useMemo(() => {
    if (!nextAppointment) return null;
    return getAppointmentServiceInfo(nextAppointment);
  }, [nextAppointment, treatmentsList, consultationServices]);

  const nextAppointmentAllergies = React.useMemo(() => {
    if (!nextAppointmentPatient) return [];
    return Array.from(
      new Set(
        [
          ...(Array.isArray(nextAppointmentPatient.medicalHistory?.allergies)
            ? nextAppointmentPatient.medicalHistory.allergies
            : []),
          ...(Array.isArray(nextAppointmentPatient.allergies) ? nextAppointmentPatient.allergies : []),
        ]
          .map((item: any) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean),
      ),
    );
  }, [nextAppointmentPatient]);

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthCalendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthCalendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthCalendarDays = eachDayOfInterval({
    start: monthCalendarStart,
    end: monthCalendarEnd,
  });

  const selectedDayHolidayStatus = scheduleViewHoliday.resolveHolidayStatus(selectedDate);

  if (isLoading || usersLoading || patientsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="doctor-appointments-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Stethoscope className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-blue-800">My Schedule</h2>
            <p className="text-gray-600">
              {user?.role === "nurse"
                ? `${nurseTitlePrefix} ${user?.firstName} ${user?.lastName}`
                : `Dr. ${user?.firstName} ${user?.lastName}`}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week View
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("day")}
          >
            Day View
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
            data-testid="button-month-view"
          >
            Month View
          </Button>
          <Button 
            onClick={() => onNewAppointment?.()}
            className="flex items-center gap-2"
            data-testid="button-schedule-appointment"
          >
            <Plus className="h-3 w-3" />
            Schedule Patient
          </Button>
          {/* Share Booking Link (doctor/nurse) */}
          {user && ["doctor", "nurse"].includes(String(user.role || "").toLowerCase()) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareBookingDialog(true)}
              data-testid="button-share-booking-link"
            >
              Share Booking Link
            </Button>
          )}
        </div>
      </div>

      {/* Share Booking Link Dialog */}
      <Dialog open={showShareBookingDialog} onOpenChange={setShowShareBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Booking Link</DialogTitle>
            <DialogDescription>
              This link will be tied to your schedule and can be used once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Patient Email</label>
              <input
                type="email"
                className="w-full border rounded px-2 py-1 text-sm bg-background"
                placeholder="patient@example.com"
                value={shareBookingEmail}
                onChange={(e) => setShareBookingEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowShareBookingDialog(false)} disabled={isSharingBookingLink}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!shareBookingEmail.trim()) {
                  toast({ title: "Email required", description: "Please enter a valid patient email.", variant: "destructive" });
                  return;
                }
                if (!user?.id) return;
                setIsSharingBookingLink(true);
                try {
                  const payload: any = { email: shareBookingEmail.trim(), doctorId: Number(user.id) };
                  const res = await apiRequest("POST", "/api/appointments/share-link", payload);
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error || "Failed to generate link");
                  const fullLink = data.link?.startsWith("http") ? data.link : `${data.link}`;
                  try {
                    await navigator.clipboard.writeText(fullLink);
                    toast({ title: "Link copied", description: "Booking link copied to clipboard and email sent." });
                  } catch {
                    toast({ title: "Link generated", description: fullLink });
                  }
                  setShowShareBookingDialog(false);
                  setShareBookingEmail("");
                } catch (e: any) {
                  toast({ title: "Failed", description: e?.message || "Could not generate link", variant: "destructive" });
                } finally {
                  setIsSharingBookingLink(false);
                }
              }}
              disabled={isSharingBookingLink}
            >
              {isSharingBookingLink ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
          <Button
            variant={appointmentFilter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setAppointmentFilter("upcoming")}
            data-testid="filter-upcoming"
          >
            Upcoming ({categorizedAppointments.upcoming.length})
          </Button>
          <Button
            variant={appointmentFilter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setAppointmentFilter("past")}
            data-testid="filter-past"
          >
            Past ({categorizedAppointments.past.length})
          </Button>
          <Button
            variant={appointmentFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setAppointmentFilter("all")}
            data-testid="filter-all"
          >
            All ({displayAppointments.length})
          </Button>
        </div>
        <Button
          variant={showSearchPanel ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowSearchPanel(!showSearchPanel);
            if (showSearchPanel) {
              // Clear all filters when closing
              setFilterDate("");
              setFilterPatientName("");
              setFilterPatientId("");
              setFilterNhsNumber("");
            }
          }}
          data-testid="button-toggle-search"
        >
          <Filter className="h-4 w-4 mr-1" />
          {showSearchPanel ? "Hide Search" : "Search"}
        </Button>
      </div>

      {/* Search Filters */}
      {showSearchPanel && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Search Appointments</span>
              {(filterDate || filterPatientName || filterPatientId || filterNhsNumber) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterDate("");
                    setFilterPatientName("");
                    setFilterPatientId("");
                    setFilterNhsNumber("");
                  }}
                  className="ml-auto text-xs"
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  placeholder="Filter by date"
                  className="w-full"
                  data-testid="input-filter-date"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Patient Name</label>
                <Input
                  type="text"
                  value={filterPatientName}
                  onChange={(e) => setFilterPatientName(e.target.value)}
                  placeholder="Search by name"
                  className="w-full"
                  data-testid="input-filter-patient-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Patient ID</label>
                <Input
                  type="text"
                  value={filterPatientId}
                  onChange={(e) => setFilterPatientId(e.target.value)}
                  placeholder="Search by patient ID"
                  className="w-full"
                  data-testid="input-filter-patient-id"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">NHS Number</label>
                <Input
                  type="text"
                  value={filterNhsNumber}
                  onChange={(e) => setFilterNhsNumber(e.target.value)}
                  placeholder="Search by NHS number"
                  className="w-full"
                  data-testid="input-filter-nhs-number"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly View */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            const dayHolidayStatus = scheduleViewHoliday.resolveHolidayStatus(day);
            const holidayLabel =
              dayHolidayStatus?.source === "holiday" ? dayHolidayStatus.label : "";
            
            return (
              <Card 
                key={day.toString()} 
                title={holidayLabel || undefined}
                className={cn(
                  "h-96 cursor-pointer transition-colors",
                  weekDayHolidayCardClass(day),
                  isSelected && "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400",
                  isCurrentDay && !dayHolidayStatus && "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600",
                )}
                onClick={() => handleScheduleDayClick(day)}
              >
                <CardHeader className="pb-1 pt-2 px-2">
                  <CardTitle className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {format(day, "EEE")}
                    <br />
                    <span className={`text-base ${isCurrentDay ? 'text-yellow-800 dark:text-yellow-200 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
                      {format(day, "d")}
                    </span>
                    {holidayLabel && (
                      <span className="block text-[9px] font-normal text-amber-800 dark:text-amber-200 truncate mt-0.5">
                        {holidayLabel.length > 10 ? `${holidayLabel.slice(0, 9)}…` : holidayLabel}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-2 pb-2 space-y-1">
                  {(() => {
                    const sorted = sortAppointmentsByCardTimeKind(
                      dayAppointments,
                      nowForCardStyle,
                      parseScheduledAtAsLocal,
                    );
                    const nextId = isToday(day) ? getNextUpcomingAppointmentId(sorted) : null;
                    return sorted.slice(0, 4).map((appointment: any) => {
                      const cardTimeKind = getAppointmentCardTimeKind(
                        appointment,
                        nowForCardStyle,
                        parseScheduledAtAsLocal,
                      );
                      return (
                        <div
                          key={appointment.id}
                          className={`relative overflow-visible p-2 rounded text-xs border-l-4 ${appointmentCardTimeBackgroundClass(
                            cardTimeKind,
                          )}`}
                          style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                          data-testid={`appointment-${appointment.id}`}
                        >
                          {cardTimeKind === "ongoing" && (
                            <Badge
                              className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName} text-[10px] px-1.5 py-0 h-5 leading-none`}
                            >
                              Ongoing
                            </Badge>
                          )}
                          {nextId != null && Number(appointment.id) === Number(nextId) && (
                            <Badge
                              className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName} text-[10px] px-1.5 py-0 h-5 leading-none bg-white text-gray-700 border border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-gray-600`}
                            >
                              Next
                            </Badge>
                          )}
                          {cardTimeKind === "past" && (
                            <Badge
                              className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName} text-[10px] px-1.5 py-0 h-5 leading-none bg-gray-100 text-gray-700 border border-gray-300 dark:bg-slate-700/40 dark:text-gray-200 dark:border-slate-600`}
                            >
                              Passed
                            </Badge>
                          )}
                          <div className="font-medium truncate text-gray-900 dark:text-gray-100 pr-12">
                            {formatAppointmentTimeRange(appointment)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-300 truncate">
                            {getPatientName(appointment.patientId)}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 truncate">{appointment.type}</div>
                        </div>
                      );
                    });
                  })()}
                  {dayAppointments.length > 4 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                      +{dayAppointments.length - 4} more
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-gray-900 dark:text-gray-100">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-bold min-w-[140px] text-center">
                  {format(selectedDate, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setViewMode("day")}>
                View day schedule
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-600 dark:text-gray-300 py-1"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthCalendarDays.map((day) => {
                const dayAppointments = getAppointmentsForDate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                const isCurrentMonth =
                  day.getMonth() === selectedDate.getMonth() &&
                  day.getFullYear() === selectedDate.getFullYear();
                const dayHolidayStatus = scheduleViewHoliday.resolveHolidayStatus(day);
                const holidayLabel =
                  dayHolidayStatus?.source === "holiday" ? dayHolidayStatus.label : "";

                return (
                  <button
                    key={day.toString()}
                    type="button"
                    title={holidayLabel || undefined}
                    onClick={() => handleScheduleDayClick(day)}
                    className={cn(
                      "min-h-[58px] p-1 border rounded-md transition-colors flex flex-col text-left",
                      !isSelected && "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                      isSelected && "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
                      !isSelected &&
                        monthDayHolidayCellClass(dayHolidayStatus?.holidayType, isSelected),
                      !isSelected &&
                        isCurrentDay &&
                        !dayHolidayStatus &&
                        "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500",
                    )}
                  >
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center leading-tight w-full",
                        !isCurrentMonth && !isSelected && "text-gray-300 dark:text-gray-600",
                        isCurrentMonth && !isSelected && "text-gray-900 dark:text-gray-100",
                        isSelected && "text-white",
                      )}
                    >
                      <span className={cn("text-sm font-medium", isSelected && "font-bold")}>
                        {format(day, "d")}
                      </span>
                      {holidayLabel && !isSelected && dayHolidayStatus && (
                        <span
                          className={cn(
                            "text-[9px] font-normal truncate max-w-full px-0.5 opacity-90 mt-0.5",
                            monthDayHolidayLabelClass(dayHolidayStatus.holidayType),
                          )}
                        >
                          {holidayLabel.length > 8 ? `${holidayLabel.slice(0, 7)}…` : holidayLabel}
                        </span>
                      )}
                      {isSelected && (
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-cyan-300 shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-0.5 mt-0.5 flex-1 justify-center items-start">
                      {dayAppointments.slice(0, 3).map((appointment: any) => (
                        <span
                          key={appointment.id}
                          className="w-2 h-2 rounded-full shrink-0 border border-white/80"
                          style={{
                            backgroundColor:
                              statusColors[appointment.status as keyof typeof statusColors] ??
                              statusColors.scheduled,
                          }}
                        />
                      ))}
                      {dayAppointments.length > 3 && (
                        <span
                          className={cn(
                            "text-[9px] font-medium",
                            isSelected ? "text-white/90" : "text-gray-600 dark:text-gray-400",
                          )}
                        >
                          +{dayAppointments.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-700 border border-amber-300" />
                National
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-700 border border-orange-300" />
                Regional
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-700 border border-purple-300" />
                Company
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-600 border border-slate-300" />
                Weekend
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600" />
                Selected
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between text-gray-900 dark:text-gray-100">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
                >
                  Previous Day
                </Button>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                >
                  Next Day
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Select
                  value={listStatusFilter}
                  onValueChange={(v) => setListStatusFilter(v as ListStatusFilter)}
                >
                  <SelectTrigger className="h-8 w-[200px] md:w-[220px]" data-testid="select-doctor-appointments-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Scheduled & ongoing</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No show</SelectItem>
                    <SelectItem value="all">All statuses</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary">
                  {getAppointmentsForDate(selectedDate).length} appointments
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayHolidayStatus && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-sm mb-4",
                  selectedDayHolidayStatus.allowShifts
                    ? "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100"
                    : "border-red-300 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100",
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {HOLIDAY_TYPE_LABELS[selectedDayHolidayStatus.holidayType] ?? "Holiday"}:{" "}
                    {selectedDayHolidayStatus.label}
                  </p>
                  <p className="text-xs mt-1 opacity-90">
                    {selectedDayHolidayStatus.allowShifts
                      ? "Appointments are allowed with a confirmation warning."
                      : "This day is configured as a non-working holiday."}
                    {selectedDayHolidayStatus.isWorkingDay ? " · Marked as a working holiday." : ""}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {(() => {
                const sorted = sortAppointmentsByCardTimeKind(
                  getAppointmentsForDate(selectedDate),
                  nowForCardStyle,
                  parseScheduledAtAsLocal,
                );
                const nextId = isToday(selectedDate) ? getNextUpcomingAppointmentId(sorted) : null;
                return sorted.map((appointment: any) => {
                const patient = patientsData?.find((p: any) => p.id === appointment.patientId);
                const serviceLabel = getAppointmentServiceLabel(appointment);
                
                const appointmentTypeBadge = getAppointmentTypeBadgeInfo(appointment);
                const cardTimeKind = getAppointmentCardTimeKind(
                  appointment,
                  nowForCardStyle,
                  parseScheduledAtAsLocal,
                );
                return (
                  <Card
                    key={appointment.id}
                    className={`relative overflow-visible border-l-4 ${appointmentCardTimeBackgroundClass(cardTimeKind)}`}
                    style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                  >
                    {cardTimeKind === "ongoing" && (
                      <Badge
                        className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName}`}
                      >
                        Ongoing
                      </Badge>
                    )}
                    {nextId != null && Number(appointment.id) === Number(nextId) && (
                      <Badge
                        className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName} bg-white text-gray-700 border border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-gray-600`}
                      >
                        Next
                      </Badge>
                    )}
                    {cardTimeKind === "past" && (
                      <Badge
                        className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName} bg-gray-100 text-gray-700 border border-gray-300 dark:bg-slate-700/40 dark:text-gray-200 dark:border-slate-600`}
                      >
                        Passed
                      </Badge>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <span className="font-medium text-gray-900 dark:text-gray-100">{formatAppointmentTimeRange(appointment)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <PatientFaceAvatar patient={patient} usersData={usersData} />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{getPatientName(appointment.patientId)}</span>
                            </div>
                          {serviceLabel && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Service: {serviceLabel}</p>
                          )}
                          {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") &&
                            appointment.description != null &&
                            String(appointment.description).trim() !== "" && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span className="font-medium text-gray-600 dark:text-gray-300">Description: </span>
                                {String(appointment.description).trim()}
                              </p>
                            )}
                            {patient && (
                              <>
                                {patient.patientId && (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Patient ID: {patient.patientId}</span>
                                  </div>
                                )}
                                {patient.contactNumber && (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Contact: {patient.contactNumber}</span>
                                  </div>
                                )}
                                {patient.email && (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Email: {patient.email}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{appointment.title}</div>
                          <div className="flex flex-wrap justify-end gap-2 mt-2">
                            <Badge 
                              style={staffAppointmentStatusBadgeStyle(appointment.status)}
                            >
                              {appointment.status.toUpperCase()}
                            </Badge>
                            {appointmentTypeBadge && (
                              <Badge 
                                style={{ backgroundColor: appointmentTypeBadge.color, color: "white" }}
                              >
                                {appointmentTypeBadge.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {appointment.description &&
                        user?.role?.toLowerCase() !== "nurse" &&
                        user?.role?.toLowerCase() !== "doctor" && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{appointment.description}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              });
              })()}
              {getAppointmentsForDate(selectedDate).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>No appointments scheduled for this day</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Date Appointments - Show when a date is selected in week view */}
      {viewMode === "week" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-gray-900 dark:text-gray-100">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <Calendar className="h-5 w-5 shrink-0" />
                <span className="break-words">
                  Appointments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
                <Select
                  value={listStatusFilter}
                  onValueChange={(v) => setListStatusFilter(v as ListStatusFilter)}
                >
                  <SelectTrigger className="h-8 w-[200px] md:w-[220px]" data-testid="select-doctor-appointments-status-week">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Scheduled & ongoing</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No show</SelectItem>
                    <SelectItem value="all">All statuses</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary">
                  {getAppointmentsForDate(selectedDate).length} appointment{getAppointmentsForDate(selectedDate).length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const sorted = sortAppointmentsByCardTimeKind(
                  getAppointmentsForDate(selectedDate),
                  nowForCardStyle,
                  parseScheduledAtAsLocal,
                );
                const nextId = isToday(selectedDate) ? getNextUpcomingAppointmentId(sorted) : null;
                return sorted.map((appointment: any) => {
                const doctor = usersData?.find((u: any) => u.id === appointment.providerId);
                // Try multiple matching strategies to find the patient
                const patient = patientsData?.find((p: any) => 
                  p.userId === appointment.patientId || 
                  p.id === appointment.patientId ||
                  (p.patientId && p.patientId === appointment.patientId.toString()) ||
                  p.id.toString() === appointment.patientId.toString()
                );
                const createdBy = usersData?.find((u: any) => u.id === appointment.createdBy);
                const appointmentServiceInfo = getAppointmentServiceInfo(appointment);
                const appointmentTypeBadge = getAppointmentTypeBadgeInfo(appointment);
                const patientAllergies = patient
                  ? Array.from(
                      new Set(
                        [
                          ...(Array.isArray(patient.medicalHistory?.allergies)
                            ? patient.medicalHistory.allergies
                            : []),
                          ...(Array.isArray(patient.allergies) ? patient.allergies : []),
                        ]
                          .map((item: any) => (typeof item === "string" ? item.trim() : ""))
                          .filter(Boolean),
                      ),
                    )
                  : [];
                const patientSpecialRequirements = getPatientSpecialRequirements(patient);
                const cardTimeKind = getAppointmentCardTimeKind(
                  appointment,
                  nowForCardStyle,
                  parseScheduledAtAsLocal,
                );

                return (
                  <Card 
                    key={appointment.id} 
                    className={`relative overflow-visible border-l-4 cursor-pointer ${appointmentCardTimeBackgroundClass(cardTimeKind)}`}
                    style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                    data-testid={`selected-date-appointment-${appointment.id}`}
                    onClick={() => setDetailsAppointment(appointment)}
                  >
                    {cardTimeKind === "ongoing" && (
                      <Badge
                        className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName}`}
                      >
                        Ongoing
                      </Badge>
                    )}
                    {nextId != null && Number(appointment.id) === Number(nextId) && (
                      <Badge
                        className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName} bg-white text-gray-700 border border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-gray-600`}
                      >
                        Next
                      </Badge>
                    )}
                    {cardTimeKind === "past" && (
                      <Badge
                        className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName} bg-gray-100 text-gray-700 border border-gray-300 dark:bg-slate-700/40 dark:text-gray-200 dark:border-slate-600`}
                      >
                        Passed
                      </Badge>
                    )}
                    <CardContent className="p-4">
                      {/* Header with Title and Actions */}
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          {(() => {
                            // For nurse/doctor roles, ALWAYS show computed heading (ignore appointment.title)
                            // so we don't end up with just "Appointment with" when title is set but not useful.
                            if (isDoctorLike(user?.role || "")) {
                              const rolePrefix = user?.role?.toLowerCase() === "nurse" ? "Nurse." : "Dr.";
                              const loggedInUserName = `${rolePrefix} ${user?.firstName || ""} ${user?.lastName || ""}`.trim();
                              const patientName = patient
                                ? `${patient.firstName} ${patient.lastName}`.trim()
                                : getPatientName(appointment.patientId);
                              const duration = appointment.duration || 30;
                              const label = (patientName || "Patient").trim() || "Patient";
                              return (
                                <>
                                  <span className="font-semibold text-gray-600 dark:text-gray-400">
                                    Patient: {label}&apos;s{" "}
                                    <span className="text-xs font-normal">
                                      appointment ({duration} min)
                                    </span>
                                  </span>
                                </>
                              );
                            }

                            // For other roles, keep existing behavior
                            return (
                              appointment.title ||
                              `Appointment with ${patient ? `${patient.firstName} ${patient.lastName}` : "Patient"}`
                            );
                          })()}
                        </h3>
                        <div className="flex items-center gap-2">
                          {appointment.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAppointment(appointment);
                            }}
                              className="h-8 w-8 p-0"
                              data-testid={`button-edit-selected-appointment-${appointment.id}`}
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {appointment.status !== 'cancelled' && isDoctorLike(user?.role || '') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAppointmentToCancel(appointment.id);
                            }}
                              data-testid={`button-cancel-selected-${appointment.id}`}
                            >
                              Cancel Appointment
                            </Button>
                          )}
                          {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") &&
                          editingStatusAppointmentId === Number(appointment.id) ? (
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={statusDraft || String(appointment.status || "scheduled")}
                                  onValueChange={async (value) => {
                                    const next = String(value || "").toLowerCase();
                                    setStatusDraft(next);
                                    await updateAppointmentStatusMutation.mutateAsync({
                                      appointmentId: Number(appointment.id),
                                      status: next,
                                    });
                                    setEditingStatusAppointmentId(null);
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-[160px]" data-testid={`select-status-week-${appointment.id}`}>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="no_show">No Show</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => setEditingStatusAppointmentId(null)}
                                  data-testid={`button-cancel-status-week-${appointment.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              {updatingStatusAppointmentId === Number(appointment.id) && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  Updating status...
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge
                              className={((user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") ? "cursor-pointer select-none inline-flex items-center" : undefined)}
                              style={staffAppointmentStatusBadgeStyle(appointment.status)}
                              onClick={(e) => {
                                if (user?.role?.toLowerCase() !== "nurse" && user?.role?.toLowerCase() !== "doctor") return;
                                e.stopPropagation();
                                setEditingStatusAppointmentId(Number(appointment.id));
                                setStatusDraft(String(appointment.status || "scheduled"));
                              }}
                              data-testid={`badge-status-week-${appointment.id}`}
                            >
                              {String(appointment.status || "scheduled").toUpperCase()}
                              {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") && (
                                <Edit className="h-3 w-3 ml-1 opacity-70" />
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Two Column Grid Layout */}
                      {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="grid grid-cols-2 gap-x-6 items-start">
                            <div className="flex min-h-[1.5rem] items-start justify-start">
                              {appointment.appointmentId ? (
                                <Badge
                                  variant="outline"
                                  className="max-w-full bg-blue-50 text-left text-xs font-medium leading-snug text-blue-700 border-blue-200"
                                >
                                  Appointment ID: {appointment.appointmentId}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex min-h-[1.5rem] items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <PatientFaceAvatar patient={patient} usersData={usersData} />
                              <span className="font-bold">
                                {patient ? `${patient.firstName} ${patient.lastName}` : getPatientName(appointment.patientId)}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 items-center">
                            <div className="flex min-h-[1.5rem] flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                              <Stethoscope className="h-4 w-4 shrink-0 text-gray-400" />
                              <span>Provider:</span>
                              <span className="min-w-0 break-words">
                                {doctor
                                  ? (() => {
                                      if (isDoctorLike(user?.role || "") && doctor.id === user?.id) {
                                        const rolePrefix = user?.role?.toLowerCase() === "nurse" ? "Nurse." : "Dr.";
                                        return `${rolePrefix} ${user?.firstName || ""} ${user?.lastName || ""}`.trim();
                                      }
                                      return `Dr. ${doctor.firstName} ${doctor.lastName}`;
                                    })()
                                  : "N/A"}
                              </span>
                            </div>
                            <div className="min-h-[1.5rem] text-xs text-gray-500 dark:text-gray-400">
                              {patient?.patientId ? <>Patient ID: {patient.patientId}</> : null}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 items-start">
                            <div className="flex min-h-[1.5rem] items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                              <span>{format(parseScheduledAtAsLocal(appointment.scheduledAt), "EEEE, MMMM d, yyyy")}</span>
                            </div>
                            <div className="min-h-[1.5rem] text-xs text-gray-500 dark:text-gray-400">
                              {patient?.email ? <>Email: {patient.email}</> : null}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 items-start">
                            <div className="flex items-center gap-1.5 text-sm leading-snug text-gray-600 dark:text-gray-400">
                              <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                              <span>{formatAppointmentTimeRange(appointment)}</span>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5 text-sm leading-snug text-gray-700 dark:text-gray-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                                <span className="font-semibold">Appointment Type:</span>
                                <span>{appointment.appointmentType || appointment.type || "N/A"}</span>
                              </div>
                              {appointmentTypeBadge ? (
                                <Badge style={{ backgroundColor: appointmentTypeBadge.color, color: "white" }}>
                                  {appointmentTypeBadge.label}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          {patient?.contactNumber ? (
                            <div className="grid grid-cols-2 gap-x-6 items-start">
                              <div className="col-start-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
                                Contact: {patient.contactNumber}
                              </div>
                            </div>
                          ) : null}
                          {appointmentServiceInfo && (
                            <div className="grid grid-cols-2 gap-x-6 items-center gap-y-0 py-0">
                              <div className="col-start-2 flex min-w-0 items-center gap-2 py-0 text-sm leading-snug text-gray-700 dark:text-gray-300">
                                <span
                                  className="inline-flex h-2 w-2 shrink-0 rounded-full border border-gray-300"
                                  style={{ backgroundColor: appointmentServiceInfo.color }}
                                />
                                <span>Service: {appointmentServiceInfo.name}</span>
                              </div>
                            </div>
                          )}
                          {appointment.description != null && String(appointment.description).trim() !== "" && (
                            <div className="flex w-full items-start gap-2 border-t border-gray-100 pt-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                              <span className="min-w-0">
                                <span className="font-semibold">Description: </span>
                                {String(appointment.description).trim()}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{format(parseScheduledAtAsLocal(appointment.scheduledAt), "EEEE, MMMM d, yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold">{formatAppointmentTimeRange(appointment)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <PatientFaceAvatar patient={patient} usersData={usersData} />
                              <span>{patient ? `${patient.firstName} ${patient.lastName}` : getPatientName(appointment.patientId)}</span>
                            </div>
                            {patient && (
                              <>
                                {patient.patientId && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>Patient ID: {patient.patientId}</span>
                                  </div>
                                )}
                                {patient.email && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>Email: {patient.email}</span>
                                  </div>
                                )}
                                {patient.contactNumber && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>Contact: {patient.contactNumber}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold">Appointment Type:</span>
                                <span>{appointment.appointmentType || appointment.type || "N/A"}</span>
                              </div>
                              {appointmentServiceInfo && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                  <span
                                    className="inline-flex h-2 w-2 rounded-full border border-gray-300"
                                    style={{ backgroundColor: appointmentServiceInfo.color }}
                                  />
                                  <span>Service: {appointmentServiceInfo.name}</span>
                                </div>
                              )}
                            </div>
                            {user?.role !== "nurse" && user?.role !== "doctor" && (
                              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{appointment.location || "N/A"}</span>
                              </div>
                            )}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Stethoscope className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold">Provider:</span>
                              <span>
                                {doctor
                                  ? (() => {
                                      if (isDoctorLike(user?.role || "") && doctor.id === user?.id) {
                                        const rolePrefix = user?.role?.toLowerCase() === "nurse" ? "Nurse." : "Dr.";
                                        return `${rolePrefix} ${user?.firstName || ""} ${user?.lastName || ""}`.trim();
                                      }
                                      return `Dr. ${doctor.firstName} ${doctor.lastName}`;
                                    })()
                                  : "N/A"}
                              </span>
                            </div>
                            {doctor && appointment.providerId && user?.role?.toLowerCase() !== "nurse" && user?.role?.toLowerCase() !== "doctor" && (
                              <div className="pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const subdomain = getActiveSubdomain();
                                    setLocation(`/${subdomain}/staff/${appointment.providerId}`);
                                  }}
                                  className="text-xs"
                                >
                                  View Profile
                                </Button>
                              </div>
                            )}
                            {appointmentTypeBadge && (
                              <div className="flex items-center gap-2">
                                <Badge style={{ backgroundColor: appointmentTypeBadge.color, color: "white" }}>
                                  {appointmentTypeBadge.label}
                                </Badge>
                              </div>
                            )}
                            {isDoctorLike(user?.role || "") && appointment.appointmentId && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium">
                                  Appointment ID: {appointment.appointmentId}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {isDoctorLike(user?.role || "") && (patientAllergies.length > 0 || patientSpecialRequirements.length > 0) && (
                        <div className="mt-3 flex w-full flex-wrap gap-2">
                          {patientAllergies.length > 0 && (
                            <Badge className="bg-white border border-yellow-400 text-amber-800 dark:bg-transparent dark:border-yellow-500/60 dark:text-amber-200 whitespace-normal">
                              Allergies: {patientAllergies.join(", ")}
                            </Badge>
                          )}
                          {patientSpecialRequirements.length > 0 && (
                            <Badge className="bg-white border border-gray-300 text-gray-700 dark:bg-transparent dark:border-gray-600 dark:text-gray-200 whitespace-normal">
                              Special Requirements: {patientSpecialRequirements.join(", ")}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Booked By Info */}
                      {createdBy && (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          <User className="h-3 w-3 inline mr-1" />
                          Booked by: {getCreatedByName(createdBy.id)}
                        </div>
                      )}

                      {/* Invoice ID and status (doctor/nurse only) */}
                      <div className="mt-3">
                        <AppointmentInvoiceInfo appointmentId={appointment.appointmentId ?? (appointment as any).appointment_id} />
                      </div>

                      {/* Description if available (not nurse/doctor — they see it after Service above) */}
                      {appointment.description &&
                        user?.role?.toLowerCase() !== "nurse" &&
                        user?.role?.toLowerCase() !== "doctor" && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.description}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              });
              })()}
              {getAppointmentsForDate(selectedDate).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>No appointments scheduled for {format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getAppointmentsForDate(new Date()).length}
              </div>
              <div className="text-sm text-gray-500">Total Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {getAppointmentsForDate(new Date()).filter((apt: any) => apt.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {getAppointmentsForDate(new Date()).filter((apt: any) => apt.status === 'scheduled').length}
              </div>
              <div className="text-sm text-gray-500">Scheduled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {getAppointmentsForDate(new Date()).filter((apt: any) => apt.status === 'cancelled' || apt.status === 'no_show').length}
              </div>
              <div className="text-sm text-gray-500">Cancelled/No-show</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Upcoming Appointment */}
      {nextAppointment && (
        <Card
          className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer"
          onClick={() => setDetailsAppointment(nextAppointment)}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              Next Upcoming Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {(() => {
                  // For nurse/doctor roles, ALWAYS show computed heading (ignore nextAppointment.title)
                  if (isDoctorLike(user?.role || "")) {
                    const rolePrefix = user?.role?.toLowerCase() === "nurse" ? "Nurse." : "Dr.";
                    const loggedInUserName = `${rolePrefix} ${user?.firstName || ""} ${user?.lastName || ""}`.trim();
                    const patientName = nextAppointmentPatient
                      ? `${nextAppointmentPatient.firstName} ${nextAppointmentPatient.lastName}`.trim()
                      : nextAppointment?.patientId
                        ? getPatientName(nextAppointment.patientId)
                        : "";
                    const duration = nextAppointment?.duration || 30;
                    const label = (patientName || "Patient").trim() || "Patient";
                    return (
                      <>
                        <span className="font-semibold text-gray-600 dark:text-gray-400">
                          Patient: {label}&apos;s{" "}
                          <span className="text-xs font-normal">
                            appointment ({duration} min)
                          </span>
                        </span>
                      </>
                    );
                  }

                  // For other roles, keep existing behavior
                  return (
                    nextAppointment.title ||
                    `Appointment with ${nextAppointmentDoctor ? `${nextAppointmentDoctor.firstName} ${nextAppointmentDoctor.lastName}` : "Doctor"}`
                  );
                })()}
              </h3>
              {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") &&
              editingStatusAppointmentId === Number(nextAppointment.id) ? (
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Select
                      value={statusDraft || String(nextAppointment.status || "scheduled")}
                      onValueChange={async (value) => {
                        const next = String(value || "").toLowerCase();
                        setStatusDraft(next);
                        await updateAppointmentStatusMutation.mutateAsync({
                          appointmentId: Number(nextAppointment.id),
                          status: next,
                        });
                        setEditingStatusAppointmentId(null);
                      }}
                    >
                      <SelectTrigger className="h-7 w-[160px]" data-testid={`select-status-next-${nextAppointment.id}`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setEditingStatusAppointmentId(null)}
                      data-testid={`button-cancel-status-next-${nextAppointment.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {updatingStatusAppointmentId === Number(nextAppointment.id) && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Updating status...
                    </span>
                  )}
                </div>
              ) : (
                <Badge
                  className={((user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") ? "cursor-pointer select-none inline-flex items-center" : undefined)}
                  style={staffAppointmentStatusBadgeStyle(nextAppointment.status)}
                  onClick={(e) => {
                    if (user?.role?.toLowerCase() !== "nurse" && user?.role?.toLowerCase() !== "doctor") return;
                    e.stopPropagation();
                    setEditingStatusAppointmentId(Number(nextAppointment.id));
                    setStatusDraft(String(nextAppointment.status || "scheduled"));
                  }}
                  data-testid={`badge-status-next-${nextAppointment.id}`}
                >
                  {String(nextAppointment.status || "scheduled").toUpperCase()}
                  {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") && (
                    <Edit className="h-3 w-3 ml-1 opacity-70" />
                  )}
                </Badge>
              )}
            </div>

            {/* Two Column Grid Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">
                    {format(parseScheduledAtAsLocal(nextAppointment.scheduledAt), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <PatientFaceAvatar
                    patient={nextAppointmentPatient}
                    usersData={usersData}
                    sizeClassName="h-8 w-8"
                    fallbackTextClassName="text-xs"
                  />
                  <span>{nextAppointmentPatient ? `${nextAppointmentPatient.firstName} ${nextAppointmentPatient.lastName}` : 'N/A'}</span>
                </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold">Appointment Type:</span>
                      <span>{nextAppointment.appointmentType || nextAppointment.type || 'N/A'}</span>
                    </div>
                    {nextAppointmentServiceInfo && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span
                          className="inline-flex h-2 w-2 rounded-full border border-gray-300"
                          style={{ backgroundColor: nextAppointmentServiceInfo.color }}
                        />
                        <span>Service: {nextAppointmentServiceInfo.name}</span>
                      </div>
                    )}
                    {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") &&
                      nextAppointment.description != null &&
                      String(nextAppointment.description).trim() !== "" && (
                      <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 mt-1">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          <span className="font-semibold">Description: </span>
                          {String(nextAppointment.description).trim()}
                        </span>
                      </div>
                    )}
                    {isDoctorLike(user?.role || "") && nextAppointmentAllergies.length > 0 && (
                      <div className="w-full mt-2">
                        <Badge className="bg-white border border-yellow-400 text-amber-800 dark:bg-transparent dark:border-yellow-500/60 dark:text-amber-200 whitespace-normal">
                          Allergies: {nextAppointmentAllergies.join(", ")}
                        </Badge>
                      </div>
                    )}
                  </div>
                {user?.role !== 'nurse' && user?.role !== 'doctor' && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>{nextAppointment.location || 'N/A'}</span>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">{formatAppointmentTimeRange(nextAppointment)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  <span>{nextAppointmentDoctor ? `${nextAppointmentDoctor.firstName} ${nextAppointmentDoctor.lastName}` : 'N/A'}</span>
                </div>
                {nextAppointmentServiceInfo && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span
                      className="inline-flex h-2 w-2 rounded-full border border-gray-300"
                      style={{ backgroundColor: nextAppointmentServiceInfo.color }}
                    />
                    <span>Service: {nextAppointmentServiceInfo.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Booked By Info */}
            {nextAppointmentCreator && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                <User className="h-3 w-3 inline mr-1" />
                Booked by: {getCreatedByName(nextAppointmentCreator.id)}
              </div>
            )}

            {/* Invoice ID and status (doctor/nurse only) */}
            <div className="mt-3">
              <AppointmentInvoiceInfo appointmentId={nextAppointment.appointmentId ?? (nextAppointment as any).appointment_id} />
            </div>

            {/* Description if available (not nurse/doctor — shown after Service above) */}
            {nextAppointment.description &&
              user?.role?.toLowerCase() !== "nurse" &&
              user?.role?.toLowerCase() !== "doctor" && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {nextAppointment.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtered Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {appointmentFilter === 'upcoming' && `Upcoming Appointments (${filteredAppointments.length})`}
            {appointmentFilter === 'past' && `Past Appointments (${filteredAppointments.length})`}
            {appointmentFilter === 'all' && `All Appointments (${filteredAppointments.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
          {sortAppointmentsByCardTimeKind(
            filteredAppointments,
            nowForCardStyle,
            parseScheduledAtAsLocal,
          ).map((appointment: any) => {
              const doctor = usersData?.find((u: any) => u.id === appointment.providerId);
              // Try multiple matching strategies to find the patient
              const patient = patientsData?.find((p: any) => 
                p.userId === appointment.patientId || 
                p.id === appointment.patientId ||
                (p.patientId && p.patientId === appointment.patientId.toString()) ||
                p.id.toString() === appointment.patientId.toString()
              );
              const createdBy = usersData?.find((u: any) => u.id === appointment.createdBy);
              const patientAllergies = patient
                ? Array.from(
                    new Set(
                      [
                        ...(Array.isArray(patient.medicalHistory?.allergies)
                          ? patient.medicalHistory.allergies
                          : []),
                        ...(Array.isArray(patient.allergies) ? patient.allergies : []),
                      ]
                        .map((item: any) => (typeof item === "string" ? item.trim() : ""))
                        .filter(Boolean),
                    ),
                  )
                : [];
              const patientSpecialRequirements = getPatientSpecialRequirements(patient);
              
            const appointmentServiceInfo = getAppointmentServiceInfo(appointment);
            const appointmentTypeBadge = getAppointmentTypeBadgeInfo(appointment);
            const cardTimeKind = getAppointmentCardTimeKind(
              appointment,
              nowForCardStyle,
              parseScheduledAtAsLocal,
            );
            return (
                <Card 
                  key={appointment.id} 
                  className={`relative overflow-visible border-l-4 cursor-pointer ${appointmentCardTimeBackgroundClass(cardTimeKind)}`}
                  style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                  data-testid={`filtered-appointment-${appointment.id}`}
                  onClick={() => setDetailsAppointment(appointment)}
                >
                  {cardTimeKind === "ongoing" && (
                    <Badge
                      className={`${appointmentOngoingBadgeClassName} ${appointmentOngoingBadgePositionClassName}`}
                    >
                      Ongoing
                    </Badge>
                  )}
                  <CardContent className="p-4">
                    {/* Header with Title and Actions */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        {(() => {
                          // For nurse/doctor roles, ALWAYS show computed heading (ignore appointment.title)
                          if (isDoctorLike(user?.role || "")) {
                            const rolePrefix = user?.role?.toLowerCase() === "nurse" ? "Nurse." : "Dr.";
                            const loggedInUserName = `${rolePrefix} ${user?.firstName || ""} ${user?.lastName || ""}`.trim();
                            const patientName = patient
                              ? `${patient.firstName} ${patient.lastName}`.trim()
                              : getPatientName(appointment.patientId);
                            const duration = appointment.duration || 30;
                            const label = (patientName || "Patient").trim() || "Patient";
                            return (
                              <>
                                <span className="font-semibold text-gray-600 dark:text-gray-400">
                                  Patient: {label}&apos;s{" "}
                                  <span className="text-xs font-normal">
                                    appointment ({duration} min)
                                  </span>
                                </span>
                              </>
                            );
                          }

                          // For other roles, keep existing behavior
                          return (
                            appointment.title ||
                            `Appointment with ${doctor ? `${doctor.firstName} ${doctor.lastName}` : "Doctor"}`
                          );
                        })()}
                      </h3>
                      <div className="flex items-center gap-2">
                        {appointment.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAppointment(appointment);
                            }}
                            className="h-8 w-8 p-0"
                            data-testid={`button-edit-appointment-${appointment.id}`}
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        {appointment.status !== 'cancelled' && isDoctorLike(user?.role || '') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAppointmentToCancel(appointment.id);
                            }}
                            data-testid={`button-cancel-${appointment.id}`}
                          >
                            Cancel Appointment
                          </Button>
                        )}
                        {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") &&
                        editingStatusAppointmentId === Number(appointment.id) ? (
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <Select
                                value={statusDraft || String(appointment.status || "scheduled")}
                                onValueChange={async (value) => {
                                  const next = String(value || "").toLowerCase();
                                  setStatusDraft(next);
                                  await updateAppointmentStatusMutation.mutateAsync({
                                    appointmentId: Number(appointment.id),
                                    status: next,
                                  });
                                  setEditingStatusAppointmentId(null);
                                }}
                              >
                                <SelectTrigger className="h-7 w-[160px]" data-testid={`select-status-day-${appointment.id}`}>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                  <SelectItem value="no_show">No Show</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => setEditingStatusAppointmentId(null)}
                                data-testid={`button-cancel-status-day-${appointment.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {updatingStatusAppointmentId === Number(appointment.id) && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                Updating status...
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge
                            className={((user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") ? "cursor-pointer select-none inline-flex items-center" : undefined)}
                            style={staffAppointmentStatusBadgeStyle(appointment.status)}
                            onClick={(e) => {
                              if (user?.role?.toLowerCase() !== "nurse" && user?.role?.toLowerCase() !== "doctor") return;
                              e.stopPropagation();
                              setEditingStatusAppointmentId(Number(appointment.id));
                              setStatusDraft(String(appointment.status || "scheduled"));
                            }}
                            data-testid={`badge-status-day-${appointment.id}`}
                          >
                            {String(appointment.status || "scheduled").toUpperCase()}
                            {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") && (
                              <Edit className="h-3 w-3 ml-1 opacity-70" />
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Two Column Grid Layout */}
                    {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="grid grid-cols-2 gap-x-6 items-start">
                          <div className="flex min-h-[1.5rem] items-start justify-start">
                            {appointment.appointmentId ? (
                              <Badge
                                variant="outline"
                                className="max-w-full bg-blue-50 text-left text-xs font-medium leading-snug text-blue-700 border-blue-200"
                              >
                                Appointment ID: {appointment.appointmentId}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex min-h-[1.5rem] items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <PatientFaceAvatar patient={patient} usersData={usersData} />
                            <span className="font-bold">
                              {patient ? `${patient.firstName} ${patient.lastName}` : getPatientName(appointment.patientId)}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 items-center">
                          <div className="flex min-h-[1.5rem] flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                            <Stethoscope className="h-4 w-4 shrink-0 text-gray-400" />
                            <span>Provider:</span>
                            <span className="min-w-0 break-words">
                              {doctor
                                ? (() => {
                                    if (isDoctorLike(user?.role || "") && doctor.id === user?.id) {
                                      const rolePrefix = user?.role?.toLowerCase() === "nurse" ? "Nurse." : "Dr.";
                                      return `${rolePrefix} ${user?.firstName || ""} ${user?.lastName || ""}`.trim();
                                    }
                                    return `Dr. ${doctor.firstName} ${doctor.lastName}`;
                                  })()
                                : "N/A"}
                            </span>
                          </div>
                          <div className="min-h-[1.5rem] text-xs text-gray-500 dark:text-gray-400">
                            {patient?.patientId ? <>Patient ID: {patient.patientId}</> : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 items-start">
                          <div className="flex min-h-[1.5rem] items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                            <span>{format(parseScheduledAtAsLocal(appointment.scheduledAt), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="min-h-[1.5rem] text-xs text-gray-500 dark:text-gray-400">
                            {patient?.email ? <>Email: {patient.email}</> : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 items-start">
                          <div className="flex items-center gap-1.5 text-sm leading-snug text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                            <span>{formatAppointmentTimeRange(appointment)}</span>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1.5 text-sm leading-snug text-gray-700 dark:text-gray-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                              <span className="font-semibold">Appointment Type:</span>
                              <span>{appointment.appointmentType || appointment.type || "N/A"}</span>
                            </div>
                            {appointmentTypeBadge ? (
                              <Badge style={{ backgroundColor: appointmentTypeBadge.color, color: "white" }}>
                                {appointmentTypeBadge.label}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        {patient?.contactNumber ? (
                          <div className="grid grid-cols-2 gap-x-6 items-start">
                            <div className="col-start-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
                              Contact: {patient.contactNumber}
                            </div>
                          </div>
                        ) : null}
                        {appointmentServiceInfo && (
                          <div className="grid grid-cols-2 gap-x-6 items-center gap-y-0 py-0">
                            <div className="col-start-2 flex min-w-0 items-center gap-2 py-0 text-sm leading-snug text-gray-700 dark:text-gray-300">
                              <span
                                className="inline-flex h-2 w-2 shrink-0 rounded-full border border-gray-300"
                                style={{ backgroundColor: appointmentServiceInfo.color }}
                              />
                              <span>Service: {appointmentServiceInfo.name}</span>
                            </div>
                          </div>
                        )}
                        {appointment.description != null && String(appointment.description).trim() !== "" && (
                          <div className="flex w-full items-start gap-2 border-t border-gray-100 pt-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                            <span className="min-w-0">
                              <span className="font-semibold">Description: </span>
                              {String(appointment.description).trim()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{format(parseScheduledAtAsLocal(appointment.scheduledAt), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <PatientFaceAvatar patient={patient} usersData={usersData} />
                            <span>{patient ? `${patient.firstName} ${patient.lastName}` : getPatientName(appointment.patientId)}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold">Appointment Type:</span>
                              <span>{appointment.appointmentType || appointment.type || "N/A"}</span>
                            </div>
                            {appointmentServiceInfo && (
                              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span
                                  className="inline-flex h-2 w-2 rounded-full border border-gray-300"
                                  style={{ backgroundColor: appointmentServiceInfo.color }}
                                />
                                <span>Service: {appointmentServiceInfo.name}</span>
                              </div>
                            )}
                          </div>
                          {user?.role !== "nurse" && user?.role !== "doctor" && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{appointment.location || "N/A"}</span>
                            </div>
                          )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{formatAppointmentTimeRange(appointment)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{doctor ? `${doctor.firstName} ${doctor.lastName}` : "N/A"}</span>
                          </div>
                          {doctor && appointment.providerId && user?.role?.toLowerCase() !== "nurse" && user?.role?.toLowerCase() !== "doctor" && (
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const subdomain = getActiveSubdomain();
                                  setLocation(`/${subdomain}/staff/${appointment.providerId}`);
                                }}
                                className="text-xs"
                              >
                                View Profile
                              </Button>
                            </div>
                          )}
                          {isDoctorLike(user?.role || "") && appointment.appointmentId && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium">
                                {appointment.appointmentId}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isDoctorLike(user?.role || "") && (patientAllergies.length > 0 || patientSpecialRequirements.length > 0) && (
                      <div className="mt-3 flex w-full flex-wrap gap-2">
                        {patientAllergies.length > 0 && (
                          <Badge className="bg-white border border-yellow-400 text-amber-800 dark:bg-transparent dark:border-yellow-500/60 dark:text-amber-200 whitespace-normal">
                            Allergies: {patientAllergies.join(", ")}
                          </Badge>
                        )}
                        {patientSpecialRequirements.length > 0 && (
                          <Badge className="bg-white border border-gray-300 text-gray-700 dark:bg-transparent dark:border-gray-600 dark:text-gray-200 whitespace-normal">
                            Special Requirements: {patientSpecialRequirements.join(", ")}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Booked By Info */}
                    {createdBy && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <User className="h-3 w-3 inline mr-1" />
                        Booked by: {getCreatedByName(createdBy.id)}
                      </div>
                    )}

                    {/* Invoice ID and status (doctor/nurse only) */}
                    <div className="mt-3">
                      <AppointmentInvoiceInfo appointmentId={appointment.appointmentId ?? (appointment as any).appointment_id} />
                    </div>

                    {/* Description if available (not nurse/doctor — they see it after Service above) */}
                    {appointment.description &&
                      user?.role?.toLowerCase() !== "nurse" &&
                      user?.role?.toLowerCase() !== "doctor" && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {filteredAppointments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No {appointmentFilter} appointments found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Appointment Dialog */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Edit Appointment
                    </h2>
                    {editingAppointment?.appointmentId || editingAppointment?.appointment_id || editingAppointment?.id ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs font-medium"
                      >
                        {editingAppointment.appointmentId || editingAppointment.appointment_id || editingAppointment.id}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Update appointment details
                  </p>

                  {/* Appointment Information (match patient edit modal style) */}
                  {editingAppointment?.scheduledAt && (
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Appointment Date &amp; Time
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatAppointmentDate(editingAppointment.scheduledAt)}{" "}
                          {formatAppointmentTimeRange(editingAppointment)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Role
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {(
                            editingAppointment?.assignedRole ||
                            editingAppointment?.role ||
                            user?.role ||
                            ""
                          )
                            ?.toString()
                            .charAt(0)
                            .toUpperCase() +
                            (
                              editingAppointment?.assignedRole ||
                              editingAppointment?.role ||
                              user?.role ||
                              ""
                            )
                              ?.toString()
                              .slice(1)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Provider
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {editingAppointment?.providerId
                            ? getDoctorNameWithSpecialization(Number(editingAppointment.providerId))
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingAppointment(null);
                    editBookingHoliday.resetHolidayState();
                    setEditAppointmentType("");
                    setEditAppointmentSelectedTreatment(null);
                    setEditAppointmentSelectedConsultation(null);
                    setEditAppointmentTypeError("");
                    setEditTreatmentSelectionError("");
                    setEditConsultationSelectionError("");
                  }}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Row 1: Title + Duration (minutes) */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Title */}
                  <div>
                    <Label
                      htmlFor="title"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Title
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      value={editingAppointment.title || ""}
                      onChange={(e) =>
                        setEditingAppointment({
                          ...editingAppointment,
                          title: e.target.value,
                        })
                      }
                      className="mt-1"
                      placeholder="Enter appointment title"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Duration (minutes)
                    </Label>
                    <Select
                      value={String(editingAppointment.duration || 30)}
                      onValueChange={(value) =>
                        setEditingAppointment({
                          ...editingAppointment,
                          duration: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                        <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                        <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                        <SelectItem value="180">180 minutes (3 hours)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Appointment Type + Select Consultation (or Select Treatment) */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Appointment Type
                    </Label>
                    <Popover open={openEditAppointmentTypeCombo} onOpenChange={setOpenEditAppointmentTypeCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openEditAppointmentTypeCombo}
                          className="w-full justify-between mt-1"
                        >
                          {editAppointmentType
                            ? editAppointmentType.charAt(0).toUpperCase() + editAppointmentType.slice(1)
                            : "Select an appointment type"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search appointment type..." />
                          <CommandList>
                            <CommandEmpty>No type found.</CommandEmpty>
                            <CommandGroup>
                              {["consultation", "treatment"].map((type) => (
                                <CommandItem
                                  key={type}
                                  value={type}
                                  onSelect={(currentValue) => {
                                    const normalized = currentValue as "consultation" | "treatment";
                                    setEditAppointmentType(normalized);
                                    setEditAppointmentSelectedTreatment(null);
                                    setEditAppointmentSelectedConsultation(null);
                                    setEditAppointmentTypeError("");
                                    setEditTreatmentSelectionError("");
                                    setEditConsultationSelectionError("");
                                    setOpenEditAppointmentTypeCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      editAppointmentType === type ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {editAppointmentTypeError && (
                      <p className="text-red-500 text-xs mt-1">{editAppointmentTypeError}</p>
                    )}
                  </div>
                  <div>
                    {editAppointmentType === "treatment" && (
                      <>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select Treatment
                        </Label>
                        <Popover open={openEditTreatmentCombo} onOpenChange={setOpenEditTreatmentCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openEditTreatmentCombo}
                              className="w-full justify-between mt-1"
                            >
                              {editAppointmentSelectedTreatment ? editAppointmentSelectedTreatment.name : "Select a treatment"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search treatments..." />
                              <CommandList>
                                <CommandEmpty>No treatments found.</CommandEmpty>
                                <CommandGroup>
                                  {treatmentsList.map((treatment: any) => (
                                    <CommandItem
                                      key={treatment.id}
                                      value={treatment.id.toString()}
                                      onSelect={() => {
                                        setEditAppointmentSelectedTreatment(treatment);
                                        setEditTreatmentSelectionError("");
                                        setOpenEditTreatmentCombo(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span
                                          className="inline-flex h-3 w-3 rounded-full border border-gray-300"
                                          style={{ backgroundColor: treatment.colorCode || "#D1D5DB" }}
                                        />
                                        <span className="flex-1 text-left">{treatment.name}</span>
                                        <span className="text-xs text-gray-500">
                                          {treatment.currency || "GBP"} {treatment.basePrice || 0}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {editAppointmentSelectedTreatment && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 px-0 text-blue-600"
                            onClick={() => setEditAppointmentSelectedTreatment(null)}
                          >
                            Clear selection
                          </Button>
                        )}
                        {editTreatmentSelectionError && (
                          <p className="text-red-500 text-xs mt-1">{editTreatmentSelectionError}</p>
                        )}
                      </>
                    )}
                    {editAppointmentType === "consultation" && (
                      <>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select Consultation
                        </Label>
                        <Popover open={openEditConsultationCombo} onOpenChange={setOpenEditConsultationCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openEditConsultationCombo}
                              className="w-full justify-between mt-1"
                            >
                              {editAppointmentSelectedConsultation ? editAppointmentSelectedConsultation.serviceName || editAppointmentSelectedConsultation.service_name : "Select a consultation"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search consultation..." />
                              <CommandList>
                                <CommandEmpty>No consultations found.</CommandEmpty>
                                <CommandGroup>
                                  {consultationServices.map((service: any) => (
                                    <CommandItem
                                      key={service.id}
                                      value={service.id.toString()}
                                      onSelect={() => {
                                        setEditAppointmentSelectedConsultation(service);
                                        setEditConsultationSelectionError("");
                                        setOpenEditConsultationCombo(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span className="flex-1 text-left">{service.serviceName || service.service_name}</span>
                                        <span className="text-xs text-gray-500">
                                          {service.currency || "GBP"} {service.basePrice || 0}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {editAppointmentSelectedConsultation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 px-0 text-blue-600"
                            onClick={() => setEditAppointmentSelectedConsultation(null)}
                          >
                            Clear selection
                          </Button>
                        )}
                        {editConsultationSelectionError && (
                          <p className="text-red-500 text-xs mt-1">{editConsultationSelectionError}</p>
                        )}
                      </>
                    )}
                    {!editAppointmentType && (
                      <p className="text-xs text-gray-500 mt-1">Select an appointment type to continue</p>
                    )}
                  </div>
                </div>

                {/* Row 3: Status + Description */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Status */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </Label>
                    <Select
                      value={editingAppointment.status || "scheduled"}
                      onValueChange={(value) =>
                        setEditingAppointment({
                          ...editingAppointment,
                          status: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Description
                    </Label>
                    <textarea
                      id="description"
                      value={editingAppointment.description || ""}
                      onChange={(e) =>
                        setEditingAppointment({
                          ...editingAppointment,
                          description: e.target.value,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      rows={3}
                      placeholder="e.g. wheelchair, assistance, special needs"
                    />
                  </div>
                </div>

                {/* Row 4: Select Date * + Select Time Slot * */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Select Date */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Date *
                    </Label>
                    <div className="mt-1 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                      <CalendarComponent
                        mode="single"
                        selected={editPickerDate}
                        onSelect={editBookingHoliday.handleDateSelect}
                        disabled={(date) => editBookingHoliday.isDateHolidayBlocked(date)}
                        className="w-full"
                        {...editBookingHoliday.calendarProps}
                      />
                      {editBookingHoliday.legend}
                    </div>
                  </div>

                  {/* Select Time Slot */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Time Slot *
                    </Label>
                    <div className="mt-1 h-[280px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-700">
                      <BookingHolidayTimeSlotPanel
                        selectedDate={editPickerDate}
                        bookingHoliday={editBookingHoliday}
                        emptyMessage="No time slots available for this date."
                      >
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const providerId = editingAppointment?.providerId || editingAppointment?.provider_id;
                          const roleName =
                            editingAppointment?.assignedRole ||
                            editingAppointment?.role ||
                            getProviderRoleById(providerId);
                          const selectedDate = editingAppointment?.scheduledAt
                            ? new Date(editingAppointment.scheduledAt)
                            : new Date();

                          const slots = generateTimeSlotsFromShifts(providerId, selectedDate, roleName);

                          // Fallback to legacy 9 AM - 5 PM if no shifts are found
                          if (slots.length === 0) {
                            return [
                              "9:00 AM",
                              "9:30 AM",
                              "10:00 AM",
                              "10:30 AM",
                              "11:00 AM",
                              "11:30 AM",
                              "12:00 PM",
                              "12:30 PM",
                              "1:00 PM",
                              "1:30 PM",
                              "2:00 PM",
                              "2:30 PM",
                              "3:00 PM",
                              "3:30 PM",
                              "4:00 PM",
                              "4:30 PM",
                              "5:00 PM",
                            ];
                          }

                          return slots;
                        })().map((timeSlot) => {
                          const currentTime = format(
                            parseScheduledAtAsLocal(editingAppointment.scheduledAt),
                            "h:mm a",
                          );
                          const isSelected = timeSlot === currentTime;
                          const bookedSet = new Set(bookedTimeSlots);
                          const durationMinutes = editingAppointment.duration || 30;
                          const slotsNeeded = Math.ceil(durationMinutes / 15);

                          const slotStartMinutes = timeSlotToMinutes(timeSlot);
                          const selectedStartMinutes = timeSlotToMinutes(currentTime);
                          const selectedEndMinutes = selectedStartMinutes + durationMinutes;
                          const slotEndMinutes = slotStartMinutes + 15;

                          // Orange highlight for all slots that fall within the selected appointment duration
                          const isInSelectedDuration =
                            slotStartMinutes < selectedEndMinutes &&
                            slotEndMinutes > selectedStartMinutes;

                          // Determine if this start time can fit the selected duration without overlaps
                          const providerId = editingAppointment?.providerId || editingAppointment?.provider_id;
                          const roleName =
                            editingAppointment?.assignedRole ||
                            editingAppointment?.role ||
                            getProviderRoleById(providerId);
                          const selectedDate = editingAppointment?.scheduledAt
                            ? new Date(editingAppointment.scheduledAt)
                            : new Date();
                          const shiftBounds = providerId ? getProviderShiftBounds(providerId, selectedDate, roleName) : null;
                          const fitsInShift = shiftBounds
                            ? slotStartMinutes >= shiftBounds.start && slotStartMinutes + durationMinutes <= shiftBounds.end
                            : true;

                          let hasConflict = false;
                          for (let i = 0; i < slotsNeeded; i++) {
                            const m = slotStartMinutes + (i * 15);
                            const label = minutesToTimeSlot(m);
                            if (bookedSet.has(label)) {
                              hasConflict = true;
                              break;
                            }
                          }

                          const isUnavailable = !fitsInShift || hasConflict;

                          return (
                            <Button
                              key={timeSlot}
                              type="button"
                              disabled={isUnavailable}
                              onClick={() => {
                                if (isUnavailable) return;

                                const [time, period] = timeSlot.split(" ");
                                const [hours, minutes] = time.split(":");
                                let hour24 = parseInt(hours);
                                if (period === "PM" && hour24 !== 12)
                                  hour24 += 12;
                                if (period === "AM" && hour24 === 12)
                                  hour24 = 0;

                                const newDate = new Date(
                                  parseScheduledAtAsLocal(editingAppointment.scheduledAt),
                                );
                                newDate.setHours(
                                  hour24,
                                  parseInt(minutes),
                                  0,
                                  0,
                                );
                                setEditingAppointment({
                                  ...editingAppointment,
                                  scheduledAt: newDate,
                                });
                              }}
                              className={`p-2 text-sm rounded border text-center ${
                                isInSelectedDuration
                                  ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                                  : isUnavailable
                                    ? "bg-gray-300 text-gray-600 border-gray-300 cursor-not-allowed"
                                    : "bg-green-500 text-white border-green-500 hover:bg-green-600"
                              }`}
                              title={
                                isUnavailable
                                  ? "Time slot not available for selected duration"
                                  : "Available time slot"
                              }
                            >
                              {timeSlot}
                            </Button>
                          );
                        })}
                      </div>
                      </BookingHolidayTimeSlotPanel>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAppointment(null);
                    editBookingHoliday.resetHolidayState();
                    setEditAppointmentType("");
                    setEditAppointmentSelectedTreatment(null);
                    setEditAppointmentSelectedConsultation(null);
                    setEditAppointmentTypeError("");
                    setEditTreatmentSelectionError("");
                    setEditConsultationSelectionError("");
                  }}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={editAppointmentMutation.isPending}
                  className="px-6 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editAppointmentMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal (doctor/nurse/admin view parity) */}
      <Dialog
        open={detailsAppointment !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsAppointment(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailsAppointment && (() => {
            const patient = patientsData?.find((p: any) =>
              p.userId === detailsAppointment.patientId ||
              p.id === detailsAppointment.patientId ||
              (p.patientId && p.patientId === detailsAppointment.patientId?.toString()) ||
              p.id?.toString() === detailsAppointment.patientId?.toString(),
            );
            const provider = usersData?.find((u: any) => u.id === detailsAppointment.providerId);
            const createdByUser = usersData?.find((u: any) => u.id === detailsAppointment.createdBy);
            const serviceInfo = getAppointmentServiceInfo(detailsAppointment);
            const patientName = patient
              ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
              : getPatientName(detailsAppointment.patientId);
            const patientEmail = patient?.email || "";
            const providerName = provider
              ? `${provider.firstName || ""} ${provider.lastName || ""}`.trim()
              : getDoctorNameWithSpecialization(detailsAppointment.providerId);
            const providerEmail = provider?.email || "";
            const createdByLabel = createdByUser
              ? `${createdByUser.firstName || ""} ${createdByUser.lastName || ""}`.trim()
              : detailsAppointment.createdBy
                ? getCreatedByName(detailsAppointment.createdBy)
                : "N/A";
            const createdByRole = createdByUser?.role ? ` (${createdByUser.role})` : "";
            const createdByEmail = createdByUser?.email ? ` (${createdByUser.email})` : "";

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    Appointment Details
                  </DialogTitle>
                  <DialogDescription className="space-y-1">
                    <div className="text-gray-500 dark:text-gray-400">
                      {formatAppointmentDate(detailsAppointment.scheduledAt)}
                    </div>
                    {detailsAppointment.appointmentId && (
                      <div className="font-semibold text-gray-700 dark:text-gray-300">
                        ID: {detailsAppointment.appointmentId}
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="border rounded-xl p-4 space-y-2 bg-white dark:bg-slate-800">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <span>{(detailsAppointment.status || "scheduled").toUpperCase()}</span>
                    <span>{formatAppointmentTimeRange(detailsAppointment)}</span>
                  </div>
                  <div className="flex items-start gap-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                    <PatientFaceAvatar
                      patient={patient}
                      usersData={usersData}
                      sizeClassName="h-12 w-12"
                      fallbackTextClassName="text-sm"
                    />
                    <p className="min-w-0 flex-1 leading-snug">
                      {patientEmail ? `${patientName} (${patientEmail})` : patientName}
                    </p>
                  </div>
                  {serviceInfo && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">Service: {serviceInfo.name}</p>
                  )}
                  {(user?.role?.toLowerCase() === "nurse" || user?.role?.toLowerCase() === "doctor") &&
                    detailsAppointment.description != null &&
                    String(detailsAppointment.description).trim() !== "" && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Description: {String(detailsAppointment.description).trim()}
                    </p>
                  )}

                  <div className="pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Provider</p>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      {providerEmail ? `${providerName} (${providerEmail})` : providerName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {provider?.medicalSpecialtyCategory || provider?.subSpecialty || provider?.department || "General"}
                    </p>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Created By: {createdByLabel}{createdByRole}{createdByEmail}
                  </p>
                </div>

                <div className="border rounded-xl p-4 bg-gray-50 dark:bg-slate-800/50">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice</p>
                  <AppointmentInvoiceInfo
                    appointmentId={detailsAppointment.appointmentId ?? (detailsAppointment as any).appointment_id}
                  />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Cancel Appointment Confirmation Modal */}
      <Dialog open={appointmentToCancel !== null} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <DialogContent data-testid="dialog-cancel-appointment">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              {user?.role === 'nurse' 
                ? "Are you sure you want to cancel this appointment? The appointment will be marked as cancelled."
                : "Are you sure you want to cancel this appointment? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAppointmentToCancel(null)}
              data-testid="button-cancel-modal"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (appointmentToCancel) {
                  cancelAppointmentMutation.mutate(appointmentToCancel);
                  setAppointmentToCancel(null);
                }
              }}
              disabled={cancelAppointmentMutation.isPending}
              data-testid={user?.role === 'nurse' ? "button-cancel-appointment" : "button-delete-appointment"}
            >
              {user?.role === 'nurse' ? 'Cancel Appointment' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPatientOverlapConflict}
        onOpenChange={(open) => {
          setShowPatientOverlapConflict(open);
          if (!open) setPatientOverlapConflictRecord(null);
        }}
      >
        <DialogContent className="max-h-[min(90vh,90dvh)] max-w-[min(32rem,calc(100vw-2rem))] w-full overflow-y-auto overflow-x-hidden dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
              Appointment Conflict: Patient Already Has an Appointment at This Time
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1 leading-relaxed">
                {buildPatientOverlapDialogDescription(
                  patientOverlapSelectedProviderDisplayName,
                  {
                    selectedProviderId:
                      editingAppointment?.providerId ??
                      editingAppointment?.provider_id,
                    conflictProviderId:
                      patientOverlapConflictRecord?.providerId ??
                      patientOverlapConflictRecord?.provider_id,
                  },
                )}
              </p>
            </DialogDescription>
          </DialogHeader>
          {patientOverlapConflictRecord && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="mb-2 font-semibold text-amber-900 dark:text-amber-200">Conflicting appointment</p>
              <ul className="list-none space-y-1.5">
                {(() => {
                  const c = patientOverlapConflictRecord;
                  const pid = c.providerId ?? c.provider_id;
                  const prov = usersData?.find((u: any) => Number(u.id) === Number(pid));
                  const provName = prov
                    ? `${prov.firstName || ""} ${prov.lastName || ""}`.trim() || "Unknown"
                    : "Unknown provider";
                  const roleLabel = c.assignedRole
                    ? String(c.assignedRole).charAt(0).toUpperCase() + String(c.assignedRole).slice(1)
                    : prov?.role
                      ? String(prov.role)
                      : null;
                  const atLocal = parseScheduledAtAsLocal(c.scheduledAt);
                  const dur = c.duration != null && Number(c.duration) > 0 ? Number(c.duration) : 30;
                  const endAt = new Date(atLocal.getTime() + dur * 60 * 1000);
                  const st = formatAppointmentStatusLabelDoc(c.status);
                  const aptId = c.appointmentId ?? c.appointment_id;
                  return (
                    <>
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Provider: </span>
                        {provName}
                        {roleLabel ? ` (${roleLabel})` : ""}
                      </li>
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Date: </span>
                        {format(atLocal, "EEEE, MMM d, yyyy")}
                      </li>
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Time: </span>
                        {format(atLocal, "h:mm a")} – {format(endAt, "h:mm a")} ({dur} min)
                      </li>
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Status: </span>
                        {st}
                      </li>
                      {aptId ? (
                        <li>
                          <span className="font-medium text-amber-950 dark:text-amber-200">Appointment ID: </span>
                          {aptId}
                        </li>
                      ) : null}
                      {c.title ? (
                        <li>
                          <span className="font-medium text-amber-950 dark:text-amber-200">Title: </span>
                          {c.title}
                        </li>
                      ) : null}
                      {(c.appointmentType || c.appointment_type) && (
                        <li>
                          <span className="font-medium text-amber-950 dark:text-amber-200">Type: </span>
                          {String(c.appointmentType || c.appointment_type)}
                        </li>
                      )}
                    </>
                  );
                })()}
              </ul>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setShowPatientOverlapConflict(false);
                setPatientOverlapConflictRecord(null);
              }}
              data-testid="button-doctor-overlap-conflict-ok"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Week view holiday notice */}
      <Dialog
        open={!!weekHolidayNotice}
        onOpenChange={(open) => {
          if (!open) setWeekHolidayNotice(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {weekHolidayNotice
                ? format(weekHolidayNotice.day, "EEEE, MMMM d, yyyy")
                : "Holiday"}
            </DialogTitle>
            <DialogDescription className="sr-only">Holiday notice for selected day</DialogDescription>
          </DialogHeader>
          {weekHolidayNotice && (
            <div className="space-y-4">
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-sm",
                  weekHolidayNotice.status.allowShifts
                    ? "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100"
                    : "border-red-300 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100",
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {HOLIDAY_TYPE_LABELS[weekHolidayNotice.status.holidayType] ?? "Holiday"}:{" "}
                    {weekHolidayNotice.status.label}
                  </p>
                  <p className="text-xs mt-1 opacity-90">
                    {weekHolidayNotice.status.allowShifts
                      ? "Appointments are allowed with a confirmation warning."
                      : "Appointments cannot be booked on this date."}
                    {weekHolidayNotice.status.isWorkingDay ? " · Marked as a working holiday." : ""}
                  </p>
                </div>
              </div>
              {weekHolidayNotice.status.allowShifts &&
                !scheduleViewHoliday.isDateHolidayBlocked(weekHolidayNotice.day) && (
                  <>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      This date is a configured holiday. Review the notice above, then continue to view this day.
                    </p>
                    <Button
                      type="button"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setSelectedDate(weekHolidayNotice.day);
                        setWeekHolidayNotice(null);
                        if (viewMode === "month") {
                          setViewMode("day");
                        }
                      }}
                    >
                      Continue viewing schedule
                    </Button>
                  </>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeekHolidayNotice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Success
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}