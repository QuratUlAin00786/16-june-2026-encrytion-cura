import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope,
  User,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Edit,
  ChevronsUpDown,
  Check,
  CheckCircle,
  CreditCard,
  FileText,
} from "lucide-react";

import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo, useEffect, useCallback, FormEvent } from "react";
import { isDoctorLike } from "@/lib/role-utils";
import type { User as Doctor, Appointment } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  buildPatientOverlapDialogDescription,
  findPatientScheduleOverlap,
  buildLocalIntervalFromDateAndTimeSlot,
  patientStatusBlocksScheduleOverlap,
} from "@/lib/patient-appointment-overlap";
import { format } from "date-fns";
import { useBookingHolidayCalendar } from "@/hooks/use-booking-holiday-calendar";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

type BookingServiceInfo = {
  name: string;
  price?: string;
  amount?: string;
  currency?: string;
  code?: string;
  color?: string;
};

const formatDecimalString = (value?: number | string | null): string => {
  if (value === undefined || value === null || value === "") {
    return "0.00";
  }
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || Number.isNaN(numeric)) {
    return "0.00";
  }
  return numeric.toFixed(2);
};

const buildInvoiceDefaults = (appointment: any, serviceInfo: BookingServiceInfo | null, userRole?: string) => {
  // Extract date directly from scheduledAt string to avoid timezone conversion issues
  // scheduledAt format is typically "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DDTHH:mm:ss.sssZ"
  let serviceDate: string;
  if (appointment?.scheduledAt) {
    // Extract date part directly from string (first 10 characters: YYYY-MM-DD)
    // This avoids any timezone conversion issues
    const scheduledAtStr = appointment.scheduledAt.toString();
    if (scheduledAtStr.includes('T')) {
      // Extract date part before 'T' - this is the actual date without timezone conversion
      serviceDate = scheduledAtStr.split('T')[0];
    } else if (scheduledAtStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      // If it's already in YYYY-MM-DD format, use it directly
      serviceDate = scheduledAtStr.substring(0, 10);
    } else {
      // Fallback: parse as date but use UTC methods to avoid timezone shift
      const dateObj = new Date(appointment.scheduledAt);
      // Use UTC methods to get the exact date without timezone conversion
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      serviceDate = `${year}-${month}-${day}`;
    }
  } else {
    // Fallback to current date if no scheduledAt
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    serviceDate = `${year}-${month}-${day}`;
  }

  // Invoice date should be current date, while service date and due date should be appointment date
  const invoiceDate = new Date().toISOString().split("T")[0]; // Current date for invoice date
  const dueDate = serviceDate; // Due date should be the same as service date (appointment date)

  const amount = serviceInfo?.amount || "50.00";
  const serviceDescription =
    serviceInfo?.name || appointment?.title || "General Consultation";
  const serviceCode = serviceInfo?.code || "CONS-001";

  return {
    serviceDate,
    invoiceDate, // Same as appointment scheduledAt date
    dueDate, // Same as appointment scheduledAt date
    serviceCode,
    serviceDescription,
    amount,
    insuranceProvider: "None (Patient Self-Pay)",
    notes: "",
    paymentMethod: "Not Selected", // Default to "Not Selected" instead of "Online Payment"
  };
};

interface DoctorListProps {
  onSelectDoctor?: (doctor: Doctor) => void;
  showAppointmentButton?: boolean;
  filterRole?: string;
  filterSearch?: string;
  filterSpecialty?: string;
  patientSearch?: string;
}

const departmentColors = {
  Cardiology: "bg-red-100 text-red-800",
  "General Medicine": "bg-blue-100 text-blue-800",
  Pediatrics: "bg-green-100 text-green-800",
  Orthopedics: "bg-purple-100 text-purple-800",
  Neurology: "bg-indigo-100 text-indigo-800",
  Dermatology: "bg-yellow-100 text-yellow-800",
  Psychiatry: "bg-pink-100 text-pink-800",
  Surgery: "bg-gray-100 text-gray-800",
  Emergency: "bg-orange-100 text-orange-800",
  Administration: "bg-slate-100 text-slate-800",
};

const roleColors = {
  doctor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  nurse: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  receptionist: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

// Helper function to get the correct tenant subdomain
function getTenantSubdomain(): string {
  const storedSubdomain = localStorage.getItem('user_subdomain');
  if (storedSubdomain) {
    return storedSubdomain;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }

  const hostname = window.location.hostname;
  if (hostname.includes('.replit.app') || hostname.includes('localhost') || hostname.includes('replit.dev') || hostname.includes('127.0.0.1')) {
    return 'demo';
  }

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0] || 'demo';
  }

  return 'demo';
}

function getStaffProfilePictureUrl(staff: { profilePicturePath?: string | null; profile_picture_path?: string | null }): string | null {
  const raw = staff?.profilePicturePath ?? staff?.profile_picture_path;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

/** Patient rows often omit profile paths; resolve from linked user (`/api/users`). */
function getListItemProfilePictureUrl(item: any, usersForAvatars: any[]): string | null {
  const direct = getStaffProfilePictureUrl(item);
  if (direct) return direct;
  const uid = item?.userId ?? item?.user_id;
  if (uid == null || !Array.isArray(usersForAvatars)) return null;
  const linked = usersForAvatars.find((u: any) => String(u.id) === String(uid));
  return getStaffProfilePictureUrl(linked);
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Parse scheduledAt without UTC shift (matches naive DB timestamps used across booking UIs). */
/** Only active bookings block same-service duplicate; completed/cancelled allow a new one. */
const SERVICE_DUPLICATE_BLOCKING_STATUSES = new Set(["scheduled", "confirmed"]);

function normalizeAppointmentStatusForDup(status: unknown): string {
  return String(status ?? "")
    .toLowerCase()
    .trim();
}

function isServiceDuplicateBlockingStatus(status: unknown): boolean {
  return SERVICE_DUPLICATE_BLOCKING_STATUSES.has(normalizeAppointmentStatusForDup(status));
}

function formatAppointmentStatusLabel(status: unknown): string {
  const s = normalizeAppointmentStatusForDup(status);
  if (!s) return "Unknown";
  if (s === "no_show") return "No show";
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDuplicateProviderDisplayNameFromStaff(
  staff: any[] | undefined,
  providerId: number | string | null | undefined,
): string {
  if (providerId == null) return "the selected provider";
  const u = staff?.find((s: any) => Number(s.id) === Number(providerId));
  if (!u) return "Unknown provider";
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Provider";
  const r = String(u.role || "").toLowerCase();
  if (r === "nurse") return `Nurse ${name}`;
  if (r === "doctor" || isDoctorLike(u.role)) return `Dr. ${name}`;
  return name;
}

function parseScheduledAtAsLocalDoctorList(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value !== "string") {
    return new Date(value as any);
  }

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

  const isoLike = value.includes("T") && (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value));
  if (isoLike) {
    const [datePart, timePartRaw] = value.split("T");
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

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i);
  if (match) {
    const [, yStr, mStr, dStr, hhStr, mmStr, ssStr] = match;
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    const ss = parseInt(ssStr || "0", 10);
    if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
      return new Date(y, m - 1, d, hh, mm, ss, 0);
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
      0
    );
  }
  return parsed;
}

function findDuplicateServiceAppointmentDoctorList(
  appointmentsList: any[],
  patientId: number,
  providerId: number,
  selectedDateStr: string,
  normType: "treatment" | "consultation",
  treatmentId: number | null,
  consultationId: number | null
): any | null {
  if (!appointmentsList?.length) return null;
  if (normType === "treatment" && (treatmentId == null || Number.isNaN(Number(treatmentId)))) return null;
  if (normType === "consultation" && (consultationId == null || Number.isNaN(Number(consultationId)))) return null;

  return (
    appointmentsList.find((apt: any) => {
      if (!isServiceDuplicateBlockingStatus(apt.status)) return false;
      const aptPatientId = apt.patient_id ?? apt.patientId;
      const aptProviderId = apt.provider_id ?? apt.providerId;
      if (Number(aptPatientId) !== Number(patientId)) return false;
      if (Number(aptProviderId) !== Number(providerId)) return false;
      const aptDateStr = format(parseScheduledAtAsLocalDoctorList(apt.scheduledAt), "yyyy-MM-dd");
      if (aptDateStr !== selectedDateStr) return false;
      const aptKind = String(apt.appointmentType || apt.appointment_type || "").toLowerCase();
      const aptTid = apt.treatmentId ?? apt.treatment_id;
      const aptCid = apt.consultationId ?? apt.consultation_id;
      if (normType === "treatment") {
        return aptKind === "treatment" && Number(aptTid) === Number(treatmentId);
      }
      return aptKind === "consultation" && Number(aptCid) === Number(consultationId);
    }) ?? null
  );
}

function tryParseDuplicate409Message(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const m = msg.match(/^409:\s*([\s\S]+)$/);
  if (!m) return null;
  try {
    const body = JSON.parse(m[1]);
    if (body?.code === "DUPLICATE_APPOINTMENT_SERVICE" && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function DoctorList({
  onSelectDoctor,
  showAppointmentButton = false,
  filterRole = "all",
  filterSearch = "",
  filterSpecialty = "",
  patientSearch = "",
}: DoctorListProps) {
  const [, setLocation] = useLocation();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Booking dialog state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBookingDoctor, setSelectedBookingDoctor] =
    useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [appointmentType, setAppointmentType] = useState<"consultation" | "treatment">("consultation");
  const [duration, setDuration] = useState("30");
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDescription, setAppointmentDescription] = useState("");
  const [appointmentLocation, setAppointmentLocation] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState<any | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);
  const [appointmentTypeError, setAppointmentTypeError] = useState("");
  const [treatmentSelectionError, setTreatmentSelectionError] = useState("");
  const [consultationSelectionError, setConsultationSelectionError] = useState("");
  const [openTreatmentCombo, setOpenTreatmentCombo] = useState(false);
  const [openConsultationCombo, setOpenConsultationCombo] = useState(false);

  const bookingHoliday = useBookingHolidayCalendar({
    enabled: isBookingOpen,
    selectedDate,
    setSelectedDate,
  });

  // Confirmation dialog state
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Insufficient time alert state
  const [showInsufficientTimeModal, setShowInsufficientTimeModal] = useState(false);
  const [insufficientTimeMessage, setInsufficientTimeMessage] = useState("");

  // Duplicate / scheduling conflict dialogs (match appointment-calendar booking UX)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateConflictAppointment, setDuplicateConflictAppointment] = useState<any | null>(null);
  const [duplicateFallbackText, setDuplicateFallbackText] = useState("");
  const [duplicateResolveStatus, setDuplicateResolveStatus] = useState("completed");
  const [showSchedulingConflictModal, setShowSchedulingConflictModal] = useState(false);
  const [schedulingConflictRecord, setSchedulingConflictRecord] = useState<any | null>(null);
  const [schedulingConflictKind, setSchedulingConflictKind] = useState<"patient" | "doctor">("patient");

  // Track currently booking slot to prevent duplicates
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    serviceDate: new Date().toISOString().split("T")[0],
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    serviceCode: "CONS-001",
    serviceDescription: "General Consultation",
    amount: "50.00",
    insuranceProvider: "None (Patient Self-Pay)",
    notes: "",
    paymentMethod: "Online Payment",
  });
  const [stripeClientSecret, setStripeClientSecret] = useState<string>("");
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPatientBookingFlow = user?.role === "patient";
  const [shiftWarning, setShiftWarning] = useState("");

  const resetBookingForm = () => {
    setSelectedDate(undefined);
    setSelectedTimeSlot("");
    setAppointmentType("consultation");
    setDuration("30");
    setAppointmentTitle("");
    setAppointmentDescription("");
    setAppointmentLocation("");
    setSelectedTreatment(null);
    setSelectedConsultation(null);
    setAppointmentTypeError("");
    setTreatmentSelectionError("");
    setConsultationSelectionError("");
    setSelectedPatient("");
    bookingHoliday.resetHolidayState();
  };

  const appointmentTypeLabel = appointmentType === "treatment" ? "Treatment" : "Consultation";

  const selectedServiceInfo = useMemo(() => {
    if (appointmentType === "treatment" && selectedTreatment) {
      return {
        label: selectedTreatment.name,
        price: `${selectedTreatment.currency || "GBP"} ${selectedTreatment.basePrice}`,
        color: selectedTreatment.colorCode || "#10B981",
      };
    }
    if (appointmentType === "consultation" && selectedConsultation) {
      return {
        label: selectedConsultation.serviceName || selectedConsultation.service_name || "Consultation",
        price: `${selectedConsultation.currency || "GBP"} ${selectedConsultation.price || 0}`,
        color: selectedConsultation.colorCode || "#6366F1",
      };
    }
    return null;
  }, [appointmentType, selectedConsultation, selectedTreatment]);

  const {
    data: medicalStaffResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/medical-staff");
      const data = await response.json();
      return data;
    },
    enabled: true,
  });

  const medicalStaff = medicalStaffResponse?.staff || [];
  const totalDoctors = medicalStaffResponse?.totalDoctors || 0;
  const availableDoctors = medicalStaffResponse?.availableDoctors || 0;

  // Fetch doctor's appointments to show their patients (for doctor role only)
  const { data: doctorAppointments } = useQuery({
    queryKey: ["/api/appointments", "doctor-patients", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/appointments");
      const data = await response.json();
      return data;
    },
    enabled: isDoctorLike(user?.role),
  });

  const { data: usersForPatientAvatarsData } = useQuery({
    queryKey: ["/api/users", "doctor-list-patient-avatars"],
    staleTime: 60000,
    enabled: isDoctorLike(user?.role),
  });
  const usersForPatientAvatars: any[] = Array.isArray(usersForPatientAvatarsData)
    ? usersForPatientAvatarsData
    : [];

  // Fetch patients for dropdown
  const { data: patients } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
      return data;
    },
    enabled: isBookingOpen,
  });

  // Fetch all shifts for the selected doctor to determine available dates
  const { data: allDoctorShifts } = useQuery({
    queryKey: ["/api/shifts/doctor", selectedBookingDoctor?.id],
    staleTime: 30000,
    enabled: isBookingOpen && !!selectedBookingDoctor?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/shifts?staffId=${selectedBookingDoctor!.id}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch default shifts for fallback when custom shifts don't exist
  const { data: defaultShiftsData = [] } = useQuery({
    queryKey: ["/api/default-shifts", "forBooking"],
    staleTime: 60000,
    enabled: isBookingOpen && !!user,
    retry: false,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/default-shifts?forBooking=true');
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return data;
      } catch (error) {
        return [];
      }
    },
  });

  const hasFutureShiftsForDoctor = useCallback(() => {
    const doctorId = selectedBookingDoctor?.id?.toString();
    if (!doctorId) return false;

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const customShiftAvailable = allDoctorShifts?.some((shift: any) => {
      if (shift.staffId?.toString() !== doctorId) return false;
      const shiftDateStr = shift.date?.substring(0, 10);
      if (!shiftDateStr) return false;
      if (shiftDateStr > todayStr) return true;
      if (shiftDateStr < todayStr) return false;
      return shift.endTime >= currentTime;
    });

    const dayNameToIndex: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const todayIndex = dayNameToIndex[format(now, "EEEE").toLowerCase()];

    const defaultShiftAvailable = defaultShiftsData?.some((shift: any) => {
      if (shift.userId?.toString() !== doctorId) return false;
      const workingDays = (shift.workingDays || []).map((day: string) => {
        return dayNameToIndex[day.toLowerCase()] ?? -1;
      });
      return workingDays.some((dayIndex: number) => {
        if (dayIndex === -1) return false;
        return (
          dayIndex > todayIndex ||
          (dayIndex === todayIndex && shift.endTime >= currentTime)
        );
      });
    });

    return Boolean(customShiftAvailable || defaultShiftAvailable);
  }, [allDoctorShifts, defaultShiftsData, selectedBookingDoctor]);

  // Fetch shifts for the selected date and doctor
  const { data: shiftsData } = useQuery({
    queryKey: ["/api/shifts", selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    staleTime: 30000,
    enabled: !!selectedDate && isBookingOpen,
    queryFn: async () => {
      const dateStr = format(selectedDate!, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/shifts?date=${dateStr}`);
      const data = await response.json();
      return data;
    },
  });

  useEffect(() => {
    if (!isBookingOpen || !selectedBookingDoctor?.id) {
      setShiftWarning("");
      return;
    }

    const normalizedRole = (user?.role || "").toLowerCase();
    if (!["admin", "doctor", "nurse"].includes(normalizedRole)) {
      setShiftWarning("");
      return;
    }

    if (hasFutureShiftsForDoctor()) {
      setShiftWarning("");
    } else {
      setShiftWarning("please create shifts from Shift Management");
    }
  }, [isBookingOpen, selectedBookingDoctor?.id, user?.role, hasFutureShiftsForDoctor]);

  // Fetch all appointments for availability checking
  const { data: appointments } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    enabled: isBookingOpen,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      return data;
    },
  });

  const { data: treatmentsList = [] } = useQuery({
    queryKey: ["/api/pricing/treatments"],
    staleTime: 60000,
    enabled: isBookingOpen,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/treatments");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: consultationServices = [] } = useQuery({
    queryKey: ["/api/pricing/doctors-fees"],
    staleTime: 60000,
    enabled: isBookingOpen,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/doctors-fees");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const doctorTreatments = useMemo(() => {
    if (!selectedBookingDoctor) return treatmentsList;
    const doctorId = selectedBookingDoctor.id;
    return treatmentsList.filter((treatment: any) => {
      if (treatment.doctor_id !== undefined && Number(treatment.doctor_id) === doctorId) {
        return true;
      }
      if (treatment.doctorId !== undefined && Number(treatment.doctorId) === doctorId) {
        return true;
      }
      return false;
    });
  }, [selectedBookingDoctor, treatmentsList]);

  const doctorConsultations = useMemo(() => {
    if (!selectedBookingDoctor) return consultationServices;
    const doctorId = selectedBookingDoctor.id;
    return consultationServices.filter((service: any) => {
      if (service.doctor_id !== undefined && Number(service.doctor_id) === doctorId) {
        return true;
      }
      if (service.doctorId !== undefined && Number(service.doctorId) === doctorId) {
        return true;
      }
      return false;
    });
  }, [selectedBookingDoctor, consultationServices]);

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

  const getDuplicateAppointmentServiceLabel = useCallback(
    (apt: any) => {
      if (!apt) return "N/A";
      const k = String(apt.appointmentType || apt.appointment_type || "").toLowerCase();
      if (k === "treatment") {
        const tid = apt.treatmentId ?? apt.treatment_id;
        const name = treatmentsList.find((t: any) => Number(t.id) === Number(tid))?.name;
        return name || "treatment";
      }
      if (k === "consultation") {
        const cid = apt.consultationId ?? apt.consultation_id;
        const name = consultationServices.find((s: any) => Number(s.id) === Number(cid))?.serviceName;
        return name || "consultation";
      }
      return "N/A";
    },
    [treatmentsList, consultationServices],
  );

  const bookingSelectedProviderDisplayName = useMemo(
    () => formatDuplicateProviderDisplayNameFromStaff(medicalStaff, selectedBookingDoctor?.id),
    [medicalStaff, selectedBookingDoctor?.id],
  );

  const getBookingServiceInfo = (appointment: any): BookingServiceInfo | null => {
    if (!appointment) return null;
    if (appointment.appointmentType === "treatment" && appointment.treatmentId) {
      const treatment = treatmentsMap.get(appointment.treatmentId);
      if (!treatment) return null;
      const amount = formatDecimalString(treatment.basePrice);
      const priceLabel = treatment.currency ? `${treatment.currency} ${amount}` : amount;
      const code =
        treatment.metadata?.serviceCode ||
        treatment.metadata?.code ||
        `TRT-${String(treatment.id ?? 0).padStart(3, "0")}`;
      return {
        name: treatment.name || "Treatment",
        price: priceLabel,
        amount,
        currency: treatment.currency,
        code,
        color: treatment.colorCode || "#10B981",
      };
    }
    if (appointment.appointmentType === "consultation" && appointment.consultationId) {
      const service = consultationMap.get(appointment.consultationId);
      if (!service) return null;
      const amount = formatDecimalString(service.basePrice);
      const priceLabel = service.currency ? `${service.currency} ${amount}` : amount;
      const code =
        service.serviceCode ||
        `CONS-${String(service.id ?? 0).padStart(3, "0")}`;
      return {
        name: service.serviceName || "Consultation",
        price: priceLabel,
        amount,
        currency: service.currency,
        code,
        color: service.colorCode || "#6366F1",
      };
    }
    return null;
  };

  const bookingSummaryServiceInfo = useMemo(
    () => getBookingServiceInfo(pendingAppointmentData),
    [pendingAppointmentData, treatmentsMap, consultationMap],
  );

  // Auto-select first available date when booking dialog opens and data is loaded
  const [hasAutoSelectedDate, setHasAutoSelectedDate] = useState(false);

  // Convert time slot string to 24-hour format
  const timeSlotTo24Hour = (timeSlot: string): string => {
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);

    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };

  // Check if a time slot is available
  const isTimeSlotAvailable = (date: Date, timeSlot: string) => {
    if (!date || !timeSlot || !appointments) return true;

    const selectedDateString = format(date, 'yyyy-MM-dd');
    const slot24Hour = timeSlotTo24Hour(timeSlot);

    // Check if this slot is currently being booked
    if (bookingInProgress) {
      const bookingKey = `${selectedDateString}_${slot24Hour}_${selectedBookingDoctor?.id}`;
      if (bookingInProgress === bookingKey) {
        return false;
      }
    }

    // Convert the time slot to minutes (this represents the START time of the slot)
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    const slotStartMinutes = hour24 * 60 + minutes;
    const slotEndMinutes = slotStartMinutes + 15;

    // Check if this slot overlaps with any existing appointment for this doctor
    const isBooked = appointments.some((apt: any) => {
      // Only check appointments for the selected doctor
      if (selectedBookingDoctor && apt.providerId !== selectedBookingDoctor.id) {
        return false;
      }

      // Parse the scheduledAt directly without timezone conversion
      const aptDateString = apt.scheduledAt.substring(0, 10);

      // Only check appointments on the same date
      if (aptDateString !== selectedDateString) return false;

      // Extract time in 24-hour format
      const timeString = apt.scheduledAt.substring(11, 16);
      const [aptHour, aptMinute] = timeString.split(':').map(Number);
      const aptStartMinutes = aptHour * 60 + aptMinute;
      const aptDuration = apt.duration || 30;
      const aptEndMinutes = aptStartMinutes + aptDuration;

      // Check if this 15-minute slot overlaps with the existing appointment
      return slotStartMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes;
    });

    return !isBooked;
  };

  // Check if sufficient consecutive time is available for the selected duration
  const checkSufficientTime = (startTimeSlot: string, durationMinutes: number): { available: boolean; availableMinutes: number } => {
    if (!selectedDate || !selectedBookingDoctor) return { available: false, availableMinutes: 0 };

    const startTime24 = timeSlotTo24Hour(startTimeSlot);
    const [startHour, startMinute] = startTime24.split(':').map(Number);

    // Generate all 15-minute slots needed for the duration
    const slotsNeeded = Math.ceil(durationMinutes / 15);
    let availableMinutes = 0;

    for (let i = 0; i < slotsNeeded; i++) {
      let currentMinute = startMinute + (i * 15);
      let currentHour = startHour;

      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }

      // Convert to 12-hour format to match timeSlots array
      const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
      const period = currentHour < 12 ? 'AM' : 'PM';
      const timeSlotStr = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;

      // Check if this slot exists and is available
      if (!timeSlots.includes(timeSlotStr) || !isTimeSlotAvailable(selectedDate, timeSlotStr)) {
        return { available: false, availableMinutes };
      }

      availableMinutes += 15;
    }

    return { available: true, availableMinutes };
  };

  // Generate time slots based on shifts from database (15-minute intervals)
  // Two-tier system: Use custom shifts first, fall back to default shifts if no custom shift exists
  const timeSlots = useMemo(() => {
    // If no doctor or date selected, return empty array
    if (!selectedBookingDoctor || !selectedDate) {
      return [];
    }

    let shiftsToUse: any[] = [];

    // First, check if there are custom shifts for the selected date
    if (shiftsData) {
      const customShifts = shiftsData.filter((shift: any) =>
        shift.staffId === selectedBookingDoctor.id
      );

      if (customShifts.length > 0) {
        shiftsToUse = customShifts;
      }
    }

    // If no custom shifts, fall back to default shifts
    if (shiftsToUse.length === 0 && defaultShiftsData && defaultShiftsData.length > 0) {
      const dayOfWeek = format(selectedDate, 'EEEE');

      const defaultShift = defaultShiftsData.find((shift: any) =>
        shift.userId === selectedBookingDoctor.id
      );

      // Only use default shift if the selected date's day is in working days
      if (defaultShift && defaultShift.workingDays && defaultShift.workingDays.includes(dayOfWeek)) {
        shiftsToUse = [defaultShift];
      }
    }

    // If still no shifts found, return empty array
    if (shiftsToUse.length === 0) {
      return [];
    }

    const allSlots: string[] = [];

    // Generate time slots for each shift (15-minute intervals)
    for (const shift of shiftsToUse) {
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const period = currentHour < 12 ? 'AM' : 'PM';
        const timeString = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;

        if (!allSlots.includes(timeString)) {
          allSlots.push(timeString);
        }

        currentMinute += 15;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }
    }

    // Sort slots chronologically
    allSlots.sort((a, b) => {
      const timeA = timeSlotTo24Hour(a);
      const timeB = timeSlotTo24Hour(b);
      return timeA.localeCompare(timeB);
    });

    return allSlots;
  }, [selectedBookingDoctor, selectedDate, shiftsData, defaultShiftsData]);

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      workingDays: string[];
      workingHours: { start: string; end: string };
    }) => {
      const response = await apiRequest("PATCH", `/api/users/${data.userId}`, {
        workingDays: data.workingDays,
        workingHours: data.workingHours,
      });
      return await response.json();
    },
    onSuccess: (updatedUserData) => {
      toast({
        title: "Schedule Updated",
        description: "Doctor's schedule has been updated successfully.",
      });

      // Update the selectedDoctor with fresh data from server
      if (selectedDoctor && updatedUserData) {
        const newDoctor = {
          ...selectedDoctor,
          workingDays: updatedUserData.workingDays || [],
          workingHours: updatedUserData.workingHours || {
            start: "09:00",
            end: "17:00",
          },
        };
        setSelectedDoctor(newDoctor);

        // Also update the form fields to show the new values
        setWorkingDays(updatedUserData.workingDays || []);
        setStartTime(updatedUserData.workingHours?.start || "09:00");
        setEndTime(updatedUserData.workingHours?.end || "17:00");
      }

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/medical-staff"] });

      // Close the dialog after brief delay to show the update
      setTimeout(() => {
        setIsScheduleOpen(false);
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  const createAppointmentAndInvoiceMutation = useMutation({
    mutationFn: async ({ appointmentData, invoiceData }: { appointmentData: any; invoiceData: any }) => {
      const appointmentResponse = await apiRequest("POST", "/api/appointments", {
        ...appointmentData,
        createdBy: user?.id,
      });
      const appointment = await appointmentResponse.json();

      // Use appointment_id from the created appointment as serviceId in invoice
      // Also ensure service date and due date use the actual appointment date (schedule_at)
      // Due date should always be the same as service date (dateOfService)
      const appointmentDate = appointment.scheduledAt || appointmentData.scheduledAt;
      let serviceDate = invoiceData.dateOfService;

      // Extract date from appointment scheduledAt if available
      // Use UTC methods to avoid timezone conversion issues
      if (appointmentDate) {
        const scheduledAtStr = appointmentDate.toString();
        if (scheduledAtStr.includes('T')) {
          // Extract date part before 'T' - this is the actual date without timezone conversion
          serviceDate = scheduledAtStr.split('T')[0];
        } else if (scheduledAtStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          // If it's already in YYYY-MM-DD format, use it directly
          serviceDate = scheduledAtStr.substring(0, 10);
        } else {
          // Fallback: parse as date but use UTC methods to avoid timezone shift
          const dateObj = new Date(appointmentDate);
          const year = dateObj.getUTCFullYear();
          const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getUTCDate()).padStart(2, '0');
          serviceDate = `${year}-${month}-${day}`;
        }
      }

      // Due date should always be the same as service date (dateOfService)
      const dueDate = serviceDate;

      // Ensure all required fields are explicitly included in the invoice data
      const invoiceDataWithServiceId = {
        ...invoiceData,
        serviceId: appointment.appointmentId || appointment.appointment_id,
        dateOfService: serviceDate, // Use actual appointment date
        dueDate: dueDate, // Due date should always be the same as service date (dateOfService)
        // Explicitly ensure these fields are included (don't rely on spread alone)
        serviceType: invoiceData.serviceType || "appointments", // Ensure serviceType is set
        doctorId: invoiceData.doctorId !== undefined && invoiceData.doctorId !== null ? Number(invoiceData.doctorId) : (appointment.providerId || appointment.provider_id ? Number(appointment.providerId || appointment.provider_id) : null), // Ensure doctorId is set from appointment if not in invoiceData
        createdBy: invoiceData.createdBy || user?.id || null, // Ensure createdBy is set
      };

      const invoiceResponse = await apiRequest("POST", "/api/invoices", invoiceDataWithServiceId);
      const invoice = await invoiceResponse.json();

      return { appointment, invoice };
    },
    onSuccess: async ({ appointment, invoice }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/appointments", selectedBookingDoctor?.id, selectedDate],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });

      setShowInvoiceModal(false);
      setPendingAppointmentData(null);
      setIsConfirmationOpen(false);
      setBookingInProgress(null);
      resetBookingForm();
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setIsBookingOpen(false);
      setInvoiceForm({
        serviceDate: new Date().toISOString().split("T")[0],
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        serviceCode: "CONS-001",
        serviceDescription: "General Consultation",
        amount: "50.00",
        insuranceProvider: "None (Patient Self-Pay)",
        notes: "",
        paymentMethod: "Online Payment",
      });

      try {
        const paymentIntentResponse = await apiRequest("POST", "/api/billing/create-payment-intent", {
          invoiceId: invoice.id,
          amount: parseFloat(invoice.totalAmount || invoice.subtotal || "0"),
          description: `Appointment booking - Invoice #${invoice.id}`,
        });
        const paymentData = await paymentIntentResponse.json();

        if (paymentData.clientSecret) {
          setCreatedInvoiceId(invoice.id);
          setStripeClientSecret(paymentData.clientSecret);
        } else {
          // Show success modal instead of toast for patient users
          setIsSuccessModalOpen(true);
        }
      } catch (paymentError) {
        console.error("Failed to create payment intent:", paymentError);
        // Show success modal instead of toast for patient users
        setIsSuccessModalOpen(true);
      }
    },
    onError: (error: any) => {
      console.error("Creation error:", error);
      const dupMsg = tryParseDuplicate409Message(error);
      if (dupMsg) {
        setDuplicateConflictAppointment(null);
        setDuplicateFallbackText(dupMsg);
        setShowDuplicateModal(true);
        setShowInvoiceModal(false);
        setIsConfirmationOpen(false);
        setPendingAppointmentData(null);
        setBookingInProgress(null);
        return;
      }
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create appointment and invoice. Please try again.",
        variant: "destructive",
      });
      setShowInvoiceModal(false);
      setIsConfirmationOpen(false);
      setPendingAppointmentData(null);
      setIsBookingOpen(false);
      setBookingInProgress(null);
    },
  });

  // Appointment booking mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest(
        "POST",
        "/api/appointments",
        appointmentData,
      );
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh appointment data and availability
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({
        queryKey: [
          "/api/appointments",
          selectedBookingDoctor?.id,
          selectedDate,
        ],
      });

      // Clear booking in progress
      setBookingInProgress(null);

      // Close confirmation dialog and show success modal
      setIsConfirmationOpen(false);
      setIsBookingOpen(false);
      setIsSuccessModalOpen(true);
      resetBookingForm();
    },
    onError: (error: any) => {
      const dupMsg = tryParseDuplicate409Message(error);
      if (dupMsg) {
        setDuplicateConflictAppointment(null);
        setDuplicateFallbackText(dupMsg);
        setShowDuplicateModal(true);
        setBookingInProgress(null);
        setIsConfirmationOpen(false);
        return;
      }
      toast({
        title: "Booking Failed",
        description:
          error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });

      // Clear booking in progress
      setBookingInProgress(null);
      setIsConfirmationOpen(false);
    },
  });

  const confirmMutationPending = isPatientBookingFlow
    ? createAppointmentAndInvoiceMutation.isPending
    : bookAppointmentMutation.isPending;

  const openScheduleDialog = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setWorkingDays(doctor.workingDays || []);
    const hours =
      (doctor.workingHours as { start?: string; end?: string }) || {};
    setStartTime(hours.start || "09:00");
    setEndTime(hours.end || "17:00");
    setIsScheduleOpen(true);
  };

  type BookingPrecheckResult =
    | { kind: "ok" }
    | { kind: "duplicate_service"; record: any }
    | { kind: "scheduling_patient"; record: any }
    | { kind: "scheduling_doctor"; record: any };

  /** Same calendar-date + same treatment/consultation as duplicate_service; time overlap → scheduling_* */
  const evaluateBookingConflicts = (): BookingPrecheckResult => {
    if (!selectedPatient || !selectedDate || !selectedTimeSlot || !selectedBookingDoctor || !appointments) {
      return { kind: "ok" };
    }

    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    const patientId = parseInt(selectedPatient, 10);
    const providerId = selectedBookingDoctor.id;

    const treatmentIdForDup =
      appointmentType === "treatment" ? (selectedTreatment?.id != null ? Number(selectedTreatment.id) : null) : null;
    const consultationIdForDup =
      appointmentType === "consultation"
        ? (selectedConsultation?.id != null ? Number(selectedConsultation.id) : null)
        : null;

    const duplicateServiceApt = findDuplicateServiceAppointmentDoctorList(
      appointments,
      patientId,
      providerId,
      selectedDateStr,
      appointmentType,
      treatmentIdForDup,
      consultationIdForDup,
    );

    if (duplicateServiceApt) {
      return { kind: "duplicate_service", record: duplicateServiceApt };
    }

    const durationMin = parseInt(duration, 10) || 30;
    const interval = buildLocalIntervalFromDateAndTimeSlot(selectedDate, selectedTimeSlot, durationMin);

    let patientTimeConflict: any | undefined;
    if (interval) {
      const { conflict } = findPatientScheduleOverlap(
        String(patientId),
        interval.start,
        interval.end,
        appointments,
        parseScheduledAtAsLocalDoctorList,
        { excludeAppointmentId: null },
      );
      patientTimeConflict = conflict ?? undefined;
    }
    if (!patientTimeConflict) {
      const [hours, minutes] = selectedTimeSlot.split(":").map(Number);
      const selectedTimeMinutes = hours * 60 + minutes;
      const selectedEndMinutes = selectedTimeMinutes + durationMin;
      patientTimeConflict = appointments.find((apt: any) => {
        if (!patientStatusBlocksScheduleOverlap(apt.status)) return false;
        const aptPatientId = apt.patient_id ?? apt.patientId;
        const aptDateStr =
          typeof apt.scheduledAt === "string"
            ? apt.scheduledAt.substring(0, 10)
            : format(parseScheduledAtAsLocalDoctorList(apt.scheduledAt), "yyyy-MM-dd");
        if (Number(aptPatientId) !== Number(patientId) || aptDateStr !== selectedDateStr) return false;
        const aptTimeStr =
          typeof apt.scheduledAt === "string"
            ? apt.scheduledAt.substring(11, 16)
            : format(parseScheduledAtAsLocalDoctorList(apt.scheduledAt), "HH:mm");
        const [aptHour, aptMinute] = aptTimeStr.split(":").map(Number);
        const aptStartMinutes = aptHour * 60 + aptMinute;
        const aptDur = apt.duration != null && Number(apt.duration) > 0 ? Number(apt.duration) : 30;
        const aptEndMinutes = aptStartMinutes + aptDur;
        return selectedTimeMinutes < aptEndMinutes && selectedEndMinutes > aptStartMinutes;
      });
    }

    if (patientTimeConflict) {
      return { kind: "scheduling_patient", record: patientTimeConflict };
    }

    const [hoursD, minutesD] = selectedTimeSlot.split(":").map(Number);
    const selectedTimeMinutesD = hoursD * 60 + minutesD;
    const selectedEndMinutesD = selectedTimeMinutesD + durationMin;

    const doctorTimeConflict = appointments.find((apt: any) => {
      if (!patientStatusBlocksScheduleOverlap(apt.status)) return false;
      const aptProviderId = apt.provider_id ?? apt.providerId;
      const aptDateStr =
        typeof apt.scheduledAt === "string"
          ? apt.scheduledAt.substring(0, 10)
          : format(parseScheduledAtAsLocalDoctorList(apt.scheduledAt), "yyyy-MM-dd");
      if (Number(aptProviderId) !== Number(providerId) || aptDateStr !== selectedDateStr) return false;
      const aptTimeStr =
        typeof apt.scheduledAt === "string"
          ? apt.scheduledAt.substring(11, 16)
          : format(parseScheduledAtAsLocalDoctorList(apt.scheduledAt), "HH:mm");
      const [aptHour, aptMinute] = aptTimeStr.split(":").map(Number);
      const aptStartMinutes = aptHour * 60 + aptMinute;
      const aptDur = apt.duration != null && Number(apt.duration) > 0 ? Number(apt.duration) : 30;
      const aptEndMinutes = aptStartMinutes + aptDur;
      return selectedTimeMinutesD < aptEndMinutes && selectedEndMinutesD > aptStartMinutes;
    });

    if (doctorTimeConflict) {
      return { kind: "scheduling_doctor", record: doctorTimeConflict };
    }

    return { kind: "ok" };
  };

  // Handle "Book Appointment" button click - validate first, then show confirmation dialog
  const handleBookAppointmentClick = () => {
    setAppointmentTypeError("");
    setTreatmentSelectionError("");
    setConsultationSelectionError("");

    if (!appointmentType) {
      setAppointmentTypeError("Please select an appointment type.");
      return;
    }

    if (appointmentType === "treatment" && !selectedTreatment) {
      setTreatmentSelectionError("Please select treatment type.");
      return;
    }

    if (appointmentType === "consultation" && !selectedConsultation) {
      setConsultationSelectionError("Please select a consultation.");
      return;
    }

    const conflictResult = evaluateBookingConflicts();

    if (conflictResult.kind === "duplicate_service") {
      setDuplicateConflictAppointment(conflictResult.record);
      setDuplicateFallbackText("");
      setDuplicateResolveStatus("completed");
      setShowDuplicateModal(true);
      return;
    }

    if (conflictResult.kind === "scheduling_patient") {
      setSchedulingConflictKind("patient");
      setSchedulingConflictRecord(conflictResult.record);
      setShowSchedulingConflictModal(true);
      return;
    }

    if (conflictResult.kind === "scheduling_doctor") {
      setSchedulingConflictKind("doctor");
      setSchedulingConflictRecord(conflictResult.record);
      setShowSchedulingConflictModal(true);
      return;
    }

    const appointmentData = buildAppointmentPayload();
    if (!appointmentData) {
      return;
    }

    setPendingAppointmentData(appointmentData);
    const serviceInfo = getBookingServiceInfo(appointmentData);
    setInvoiceForm(buildInvoiceDefaults(appointmentData, serviceInfo, user?.role));

    if (user?.role === "patient") {
      setIsBookingOpen(false);
      setShowInvoiceModal(true);
      return;
    }

    // Close booking dialog and show confirmation summary
    setIsBookingOpen(false);
    setIsConfirmationOpen(true);
  };

  const buildAppointmentPayload = () => {
    if (
      !selectedPatient ||
      !selectedDate ||
      !selectedTimeSlot ||
      !selectedBookingDoctor
    ) {
      return null;
    }

    const [hours, minutes] = selectedTimeSlot.split(":").map(Number);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minuteStr = String(minutes).padStart(2, "0");
    const scheduledAtString = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00`;
    const appointmentLabel = appointmentType === "treatment" ? "Treatment" : "Consultation";
    const appointmentPayloadType = appointmentType === "treatment" ? "procedure" : "consultation";

    return {
      patientId: parseInt(selectedPatient),
      providerId: selectedBookingDoctor.id,
      title:
        appointmentTitle ||
        `${appointmentLabel} with ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`,
      description: appointmentDescription || `${appointmentLabel} appointment`,
      scheduledAt: scheduledAtString,
      duration: parseInt(duration),
      type: appointmentPayloadType,
      location:
        appointmentLocation ||
        `${selectedBookingDoctor.department || "General"} Department`,
      status: "scheduled",
      isVirtual: false,
      createdBy: user?.id,
      appointmentType,
      treatmentId:
        appointmentType === "treatment" ? selectedTreatment?.id || null : null,
      consultationId:
        appointmentType === "consultation"
          ? selectedConsultation?.id || null
          : null,
    };
  };

  const resolveDuplicateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      return response.json();
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      const st = normalizeAppointmentStatusForDup(variables.status);
      if (st === "completed" || st === "cancelled") {
        setShowDuplicateModal(false);
        setDuplicateConflictAppointment(null);
        setDuplicateFallbackText("");
        const appointmentData = buildAppointmentPayload();
        if (appointmentData) {
          setPendingAppointmentData(appointmentData);
          const serviceInfo = getBookingServiceInfo(appointmentData);
          setInvoiceForm(buildInvoiceDefaults(appointmentData, serviceInfo, user?.role));
          if (user?.role === "patient") {
            setShowInvoiceModal(true);
          } else {
            setIsConfirmationOpen(true);
          }
        }
        toast({
          title: "Status updated",
          description: "Review and confirm the new appointment below.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update appointment status.",
        variant: "destructive",
      });
    },
  });

  const handleBookAppointment = () => {
    if (
      !selectedPatient ||
      !selectedDate ||
      !selectedTimeSlot ||
      !selectedBookingDoctor
    ) {
      return;
    }

    const appointmentData = buildAppointmentPayload();
    if (!appointmentData) {
      return;
    }

    // Convert selectedTimeSlot from 24-hour format (HH:MM) to 12-hour format for validation
    const [hours, minutes] = selectedTimeSlot.split(":").map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours < 12 ? 'AM' : 'PM';
    const timeSlot12Hour = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;

    // Validate sufficient time is available for the selected duration
    const { available, availableMinutes } = checkSufficientTime(timeSlot12Hour, parseInt(duration));

    if (!available) {
      setInsufficientTimeMessage(
        `Only ${availableMinutes} minutes are available at ${timeSlot12Hour}. Please select another time slot.`
      );
      setShowInsufficientTimeModal(true);
      return;
    }

    // Create the appointment datetime string without timezone conversion
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minuteStr = String(minutes).padStart(2, "0");

    const scheduledAtString = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00`;
    const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

    // Mark this slot as being booked to prevent duplicates
    const bookingKey = `${selectedDateString}_${selectedTimeSlot}_${selectedBookingDoctor.id}`;
    setBookingInProgress(bookingKey);

    const patient = patients?.find((p: any) => p.id === appointmentData.patientId || p.id.toString() === selectedPatient || p.patientId === selectedPatient);

    if (user?.role === "patient") {
      if (!patient) {
        toast({
          title: "Patient Missing",
          description: "Unable to locate the patient record for invoicing.",
          variant: "destructive",
        });
        setBookingInProgress(null);
        return;
      }

      const amount = parseFloat(invoiceForm.amount || "0");

      // Set invoice status based on payment method (follow admin strategy):
      // - Cash payments: "paid" (since paidAmount equals totalAmount)
      // - All other cases (including Stripe/Online payments not paid): "unpaid" status
      const isCashPayment = invoiceForm.paymentMethod === "Cash";
      const paidAmount = isCashPayment ? invoiceForm.amount : "0";

      let invoiceStatus: string;
      if (isCashPayment && parseFloat(paidAmount) === amount) {
        invoiceStatus = "paid";
      } else {
        // Default to "unpaid" for all non-cash payments or unpaid invoices
        invoiceStatus = "unpaid";
      }

      // Fix payment method: If status is "unpaid", paymentMethod should always be "Not Selected" (like admin role)
      let finalPaymentMethod = invoiceForm.paymentMethod;
      if (invoiceStatus === "unpaid") {
        finalPaymentMethod = "Not Selected";
      }

      // Extract appointment date from appointmentData for correct service date and due date
      // Invoice date should be current date, while service date and due date should be appointment date
      const appointmentScheduledAt = appointmentData?.scheduledAt;
      let finalServiceDate = invoiceForm.serviceDate;

      if (appointmentScheduledAt) {
        const scheduledAtStr = appointmentScheduledAt.toString();
        if (scheduledAtStr.includes('T')) {
          // Extract date part before 'T' - this is the actual date without timezone conversion
          finalServiceDate = scheduledAtStr.split('T')[0];
        } else if (scheduledAtStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          // If it's already in YYYY-MM-DD format, use it directly
          finalServiceDate = scheduledAtStr.substring(0, 10);
        } else {
          // Fallback: parse as date but use UTC methods to avoid timezone shift
          const dateObj = new Date(appointmentScheduledAt);
          const year = dateObj.getUTCFullYear();
          const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getUTCDate()).padStart(2, '0');
          finalServiceDate = `${year}-${month}-${day}`;
        }
      }

      // Due date should always be the same as service date (dateOfService)
      const finalDueDate = finalServiceDate;

      // Get doctor/provider ID from appointmentData - ensure we get it from multiple sources
      const doctorId = appointmentData?.providerId ||
        (appointmentData as any)?.doctorId ||
        selectedBookingDoctor?.id ||
        null;

      // Ensure doctorId is always a number if available
      const finalDoctorId = doctorId ? Number(doctorId) : null;

      const invoiceData = {
        patientId: patient.patientId || patient.id.toString(),
        patientName: `${patient.firstName} ${patient.lastName}`,
        nhsNumber: patient.nhsNumber || "",
        dateOfService: finalServiceDate, // Use actual appointment date
        invoiceDate: new Date().toISOString().split("T")[0], // Invoice date should be current date
        dueDate: finalDueDate, // Due date should always be the same as service date (dateOfService)
        status: invoiceStatus,
        invoiceType: "payment",
        serviceType: "appointments", // Set service type to "appointments" for patient bookings - REQUIRED
        paymentMethod: finalPaymentMethod, // "Not Selected" if unpaid, otherwise original value
        doctorId: finalDoctorId, // Always include doctorId if available (follow admin strategy) - REQUIRED
        createdBy: user?.id || null, // Add logged-in user ID to created_by column - REQUIRED
        subtotal: invoiceForm.amount,
        tax: "0",
        discount: "0",
        totalAmount: invoiceForm.amount,
        paidAmount: paidAmount, // Use calculated paidAmount (0 for unpaid, amount for cash)
        items: [
          {
            code: invoiceForm.serviceCode,
            description: invoiceForm.serviceDescription,
            quantity: 1,
            unitPrice: amount,
            total: amount,
            serviceType: "appointments" // Include serviceType in items as well
          },
        ],
        insuranceProvider: invoiceForm.insuranceProvider,
        notes: invoiceForm.notes,
      };

      createAppointmentAndInvoiceMutation.mutate({
        appointmentData,
        invoiceData,
      });
      return;
    }

    bookAppointmentMutation.mutate(appointmentData);
  };

  const openBookingDialog = (doctor: Doctor) => {
    resetBookingForm();
    setSelectedBookingDoctor(doctor);
    // Auto-select the logged-in patient if user is a patient
    if (patients && patients.length > 0) {
      if (user?.role === 'patient') {
        // Find the patient record matching the logged-in user by email
        const currentPatient = patients.find((patient: any) =>
          patient.email && user?.email && patient.email.toLowerCase() === user.email.toLowerCase()
        ) || patients.find((patient: any) =>
          patient.firstName && user?.firstName && patient.lastName && user?.lastName &&
          patient.firstName.toLowerCase() === user.firstName.toLowerCase() &&
          patient.lastName.toLowerCase() === user.lastName.toLowerCase()
        );

        if (currentPatient) {
          setSelectedPatient(currentPatient.id.toString());
        } else {
          setSelectedPatient(patients[0].id.toString());
        }
      } else {
        // For non-patient users, select the first patient
        setSelectedPatient(patients[0].id.toString());
      }
    } else {
      setSelectedPatient("");
    }
    setSelectedDate(undefined);
    setSelectedTimeSlot("");
    setAppointmentType("consultation");
    setDuration("30");
    setAppointmentTitle("");
    setAppointmentDescription("");
    setAppointmentLocation("");
    setBookingInProgress(null);
    setIsBookingOpen(true);
  };

  const handleScheduleUpdate = () => {
    if (!selectedDoctor) return;

    updateScheduleMutation.mutate({
      userId: selectedDoctor.id,
      workingDays,
      workingHours: { start: startTime, end: endTime },
    });
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  // Check if a date has shifts in the database (custom shifts OR default shifts)
  const hasShiftsOnDate = (date: Date): boolean => {
    if (!selectedBookingDoctor) return false;

    const dateStr = format(date, 'yyyy-MM-dd');

    // First check if there are custom shifts for this specific date
    if (allDoctorShifts) {
      const hasCustomShift = allDoctorShifts.some((shift: any) => {
        const shiftDateStr = shift.date.substring(0, 10);
        return shiftDateStr === dateStr && shift.staffId === selectedBookingDoctor.id;
      });

      if (hasCustomShift) {
        return true;
      }
    }

    // If no custom shift, check if there's a default shift with this day in working days
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const dayOfWeek = format(date, 'EEEE'); // Get day name (e.g., "Monday")

      const defaultShift = defaultShiftsData.find((shift: any) =>
        shift.userId === selectedBookingDoctor.id
      );

      if (defaultShift && defaultShift.workingDays && defaultShift.workingDays.includes(dayOfWeek)) {
        return true;
      }
    }

    return false;
  };

  // Auto-select first available date when booking dialog opens and data is loaded
  useEffect(() => {
    if (isBookingOpen && selectedBookingDoctor) {
      // Reset selectedDate and auto-select flag when doctor changes or dialog opens
      setSelectedDate(undefined);
      setHasAutoSelectedDate(false);

      // Wait a bit for data to load
      const timeoutId = setTimeout(() => {
        // Find the first available date starting from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check up to 60 days ahead
        for (let i = 0; i < 60; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);

          if (hasShiftsOnDate(checkDate) && !bookingHoliday.isDateHolidayBlocked(checkDate)) {
            setSelectedDate(checkDate);
            setHasAutoSelectedDate(true);
            break;
          }
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }

    // Reset auto-select flag when dialog closes
    if (!isBookingOpen && hasAutoSelectedDate) {
      setHasAutoSelectedDate(false);
    }
  }, [isBookingOpen, selectedBookingDoctor, allDoctorShifts, defaultShiftsData, bookingHoliday.isDateHolidayBlocked]);

  // Format time to 12-hour format for display
  const formatTime = (time: string): string => {
    if (!time) return "";

    // Handle 24-hour format like "14:30"
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes || '00'} ${ampm}`;
  };

  // Filter to show available staff or patients based on user role
  // For patient role: show all users except admin and patient
  // For doctor role: show patients who have appointments with them
  // For admin role: show only doctors who are available today
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // For doctors: extract unique patients from their appointments
  const doctorPatients = useMemo(() => {
    if (!isDoctorLike(user?.role) || !user || !doctorAppointments || !patients) {
      return [];
    }

    // Get unique patient IDs from doctor's appointments
    const patientIds = new Set(
      doctorAppointments
        .filter((apt: any) => apt.providerId === user.id)
        .map((apt: any) => apt.patientId)
    );

    // Get patients who have appointments with this doctor
    let filteredPatients = patients.filter((patient: any) => patientIds.has(patient.id));

    // Apply patient search filter if provided
    if (patientSearch && patientSearch.trim() !== "") {
      const searchLower = patientSearch.toLowerCase().trim();
      filteredPatients = filteredPatients.filter((patient: any) => {
        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
        const email = (patient.email || '').toLowerCase();
        const age = (patient.age || '').toString();
        const id = (patient.id || '').toString();
        const nhsNumber = (patient.nhsNumber || '').toLowerCase();
        const phone = (patient.phone || '').toLowerCase();
        const city = (patient.city || '').toLowerCase();
        const country = (patient.country || '').toLowerCase();

        return fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          age.includes(searchLower) ||
          id.includes(searchLower) ||
          nhsNumber.includes(searchLower) ||
          phone.includes(searchLower) ||
          city.includes(searchLower) ||
          country.includes(searchLower);
      });
    }

    return filteredPatients;
  }, [user, doctorAppointments, patients, patientSearch]);

  // Predefined medical specialty categories for filtering
  const medicalSpecialtyCategories = [
    "General & Primary Care",
    "Surgical Specialties",
    "Heart & Circulation",
    "Women's Health",
    "Children's Health",
    "Brain & Nervous System",
    "Skin, Hair & Appearance",
    "Eye & Vision",
    "Teeth & Mouth",
    "Digestive System",
    "Kidneys & Urinary Tract",
    "Respiratory System",
    "Cancer",
    "Endocrine & Hormones",
    "Muscles & Joints",
    "Blood & Immunity",
    "Others"
  ];

  const availableStaff = useMemo(() => {
    // If logged-in user is a doctor, show their patients
    if (isDoctorLike(user?.role)) {
      return doctorPatients;
    }

    // If logged-in user is a patient, show all users except patient, admin, sample_taker, lab_technician
    if (user?.role === 'patient') {
      return medicalStaff.filter((doctor: Doctor) => {
        // Exclude patient, admin, sample_taker, lab_technician roles
        if (doctor.role === 'admin' || doctor.role === 'patient' || doctor.role === 'sample_taker' || doctor.role === 'lab_technician') {
          return false;
        }

        // Apply role filter if a specific role is selected
        if (filterRole !== 'all' && filterRole !== '' && doctor.role !== filterRole) {
          return false;
        }

        // Apply specialty/subcategory filter based on role
        if (filterSpecialty && filterSpecialty !== 'all' && filterSpecialty !== '') {
          if (['doctor', 'nurse', 'dentist', 'dental_nurse', 'phlebotomist'].includes(filterRole)) {
            // For doctors, nurses, dentists, dental nurses, and phlebotomists, filter by medicalSpecialtyCategory
            if (doctor.medicalSpecialtyCategory !== filterSpecialty) {
              return false;
            }
          } else if (['lab_technician', 'aesthetician', 'optician', 'paramedic', 'physiotherapist', 'pharmacist'].includes(filterRole)) {
            // For other roles, filter by subSpecialty
            if (doctor.subSpecialty !== filterSpecialty) {
              return false;
            }
          }
        }

        return true;
      });
    }

    // For admin role: show all users except patient, admin, sample_taker, lab_technician, with role filter and search
    if (user?.role === 'admin') {
      return medicalStaff.filter((staff: Doctor) => {
        // Exclude patient, admin, sample_taker, lab_technician roles
        if (staff.role === 'patient' || staff.role === 'admin' || staff.role === 'sample_taker' || staff.role === 'lab_technician') {
          return false;
        }

        // Apply role filter if a specific role is selected
        if (filterRole !== 'all' && filterRole !== '' && staff.role !== filterRole) {
          return false;
        }

        // Apply specialty/subcategory filter based on role
        if (filterSpecialty && filterSpecialty !== 'all' && filterSpecialty !== '') {
          if (['doctor', 'nurse', 'dentist', 'dental_nurse', 'phlebotomist'].includes(filterRole)) {
            // For doctors, nurses, dentists, dental nurses, and phlebotomists, filter by medicalSpecialtyCategory
            if (staff.medicalSpecialtyCategory !== filterSpecialty) {
              return false;
            }
          } else if (['lab_technician', 'aesthetician', 'optician', 'paramedic', 'physiotherapist', 'pharmacist'].includes(filterRole)) {
            // For other roles, filter by subSpecialty
            if (staff.subSpecialty !== filterSpecialty) {
              return false;
            }
          }
        }

        // Apply search filter
        if (filterSearch.trim()) {
          const query = filterSearch.toLowerCase();
          const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
          const email = (staff.email || '').toLowerCase();
          const specialization = (staff.medicalSpecialtyCategory || '').toLowerCase();
          const department = (staff.department || '').toLowerCase();

          const matches =
            fullName.includes(query) ||
            email.includes(query) ||
            specialization.includes(query) ||
            department.includes(query);

          if (!matches) {
            return false;
          }
        }

        return true;
      });
    }

    // For other roles: show only doctors who are available today
    return medicalStaff.filter((doctor: Doctor) => {
      if (!isDoctorLike(doctor.role)) {
        return false;
      }
      // If no working days are set, staff is considered available (like mobile users)
      if (!doctor.workingDays || doctor.workingDays.length === 0) {
        return true;
      }
      // If working days are set, check if today is included
      return doctor.workingDays.includes(today);
    });
  }, [user, doctorPatients, medicalStaff, filterRole, filterSearch, filterSpecialty, today]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableStaff.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            {isDoctorLike(user?.role) ? (
              <>
                <p>No patients with appointments</p>
                <p className="text-sm text-gray-400 mt-1">
                  You don't have any patients with appointments yet
                </p>
              </>
            ) : (
              <>
                <p>No available medical staff</p>
                <p className="text-sm text-gray-400 mt-1">
                  All staff are currently off duty
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {availableStaff.map((item: any) => (
            <div
              key={item.id}
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex-shrink-0">
                  <Avatar className="h-12 w-12">
                    {(() => {
                      const src = getListItemProfilePictureUrl(item, usersForPatientAvatars);
                      return src ? (
                        <AvatarImage
                          src={src}
                          alt={`${String(item.firstName ?? "").trim()} ${String(item.lastName ?? "").trim()}`.trim() || "Staff profile"}
                        />
                      ) : null;
                    })()}
                    <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                      {getInitials(item.firstName, item.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
                  {/* Row 1: Name */}
                  <div className="mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-wrap">
                      {item.firstName} {item.lastName}
                    </h4>
                  </div>

                  {/* Row 2: Email */}
                  {item.email && (
                    <div className="w-full">
                      <span className="text-sm text-gray-600 dark:text-gray-300 block truncate">
                        {item.email}
                      </span>
                    </div>
                  )}

                  {/* Row 3: Role Badge - Show for admin and patient users */}
                  {(user?.role === 'admin' || user?.role === 'patient') && item.role && (
                    <div className="w-full">
                      <Badge className={cn(
                        roleColors[item.role?.toLowerCase() as keyof typeof roleColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                        "max-w-full truncate inline-block capitalize font-medium"
                      )}>
                        {item.role}
                      </Badge>
                    </div>
                  )}

                  {/* For Doctor View: Show Patient-specific information */}
                  {isDoctorLike(user?.role) && (
                    <>
                      {/* Patient ID */}
                      {item.patientId && (
                        <div className="w-full">
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 max-w-full truncate inline-block">
                            ID: {item.patientId}
                          </Badge>
                        </div>
                      )}

                      {/* Phone Number */}
                      {(item.phone || item.phoneNumber) && (
                        <div className="flex items-start gap-1 w-full">
                          <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 min-w-0">
                            📱 {item.phone || item.phoneNumber}
                          </span>
                        </div>
                      )}

                      {/* Date of Birth / Age */}
                      {item.dateOfBirth && (
                        <div className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400 w-full">
                          <span className="flex-1 min-w-0">
                            Age: {new Date().getFullYear() - new Date(item.dateOfBirth).getFullYear()} years
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* For Admin/Patient View: Show Doctor-specific information */}
                  {user?.role !== 'doctor' && (
                    <>
                      {/* Row 3: Medical Specialty Category */}
                      {item.medicalSpecialtyCategory && (
                        <div className="w-full">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 max-w-full truncate inline-block">
                            {item.medicalSpecialtyCategory}
                          </Badge>
                        </div>
                      )}

                      {/* Row 4: Sub-specialty */}
                      {item.subSpecialty && (
                        <div className="w-full">
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700 max-w-full truncate inline-block"
                          >
                            {item.subSpecialty}
                          </Badge>
                        </div>
                      )}


                      {/* Row 6: Last Active */}
                      {item.lastLoginAt && (
                        <div className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400 w-full">
                          <Clock className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="flex-1 min-w-0">
                            Last active:{" "}
                            {new Date(item.lastLoginAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Row 7: Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {/* Show Book button: 
                        - For admin/patient users viewing staff (original behavior)
                        - For doctor/nurse users viewing patients (new requirement) */}
                    {showAppointmentButton && (
                      (user?.role !== 'doctor' && user?.role !== 'nurse') || 
                      (isDoctorLike(user?.role) && item.role === 'patient')
                    ) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // For doctor/nurse viewing patients, navigate to calendar with patientId
                          if (isDoctorLike(user?.role) && item.role === 'patient') {
                            const subdomain = getTenantSubdomain();
                            setLocation(`/${subdomain}/calendar?patientId=${item.id}`);
                          } else {
                            openBookingDialog(item);
                          }
                        }}
                        className="flex-shrink-0"
                      >
                        Book
                      </Button>
                    )}
                    {user?.role !== 'patient' && !isDoctorLike(user?.role) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openScheduleDialog(item);
                        }}
                        className="flex-shrink-0 hidden"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Schedule
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white hover:bg-gray-50 border border-gray-200 flex-shrink-0 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        const subdomain = getTenantSubdomain();
                        const isPatientRow =
                          String(item?.role ?? "")
                            .trim()
                            .toLowerCase() === "patient";
                        const profilePath = isPatientRow
                          ? `/${subdomain}/patients/${item.id}`
                          : `/${subdomain}/staff/${item.id}`;
                        setLocation(profilePath);
                      }}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Schedule Edit Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Schedule - Dr. {selectedDoctor?.firstName}{" "}
              {selectedDoctor?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Working Days */}
            <div>
              <Label className="text-base font-medium">Working Days</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={workingDays.includes(day)}
                      onCheckedChange={() => toggleWorkingDay(day)}
                    />
                    <Label htmlFor={day} className="text-sm">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Current Schedule Display */}
            {selectedDoctor && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium mb-1">Current Schedule:</p>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDoctor.workingDays &&
                    selectedDoctor.workingDays.length > 0 ? (
                    <>
                      <p>Days: {selectedDoctor.workingDays.join(", ")}</p>
                      {selectedDoctor.workingHours && (
                        <p>
                          Hours:{" "}
                          {formatTime(selectedDoctor.workingHours.start || "")}{" "}
                          - {formatTime(selectedDoctor.workingHours.end || "")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>No schedule set (Always available)</p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsScheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleUpdate}
                disabled={updateScheduleMutation.isPending}
              >
                {updateScheduleMutation.isPending
                  ? "Updating..."
                  : "Update Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Payment Dialog */}
      <Dialog open={!!stripeClientSecret} onOpenChange={(open) => {
        // Prevent closing on outside click - only close via X button or Cancel
        if (open) {
          // Keep dialog open
          return;
        }
        // If open is false, ignore it - user must click X or Cancel button
        // Only close via explicit button handlers
      }}>
        <DialogContent
          className="max-w-md max-h-[550px] flex flex-col"
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on Escape key
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 overflow-y-auto flex-1" style={{ maxHeight: '550px' }}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please complete your payment to confirm the appointment booking.
            </p>
            {stripeClientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                <StripePaymentForm
                  onSuccess={async () => {
                    // Update invoice status to paid and payment details
                    if (createdInvoiceId) {
                      try {
                        // Get the invoice to get the total amount
                        const invoiceResponse = await apiRequest('GET', `/api/billing/invoices/${createdInvoiceId}`);
                        const invoice = await invoiceResponse.json();
                        const totalAmount = parseFloat(invoice.totalAmount || invoice.subtotal || "0");

                        // Update invoice to paid status with payment details
                        await apiRequest("PATCH", `/api/billing/invoices/${createdInvoiceId}`, {
                          status: "paid",
                          paymentMethod: "Online Payment",
                          paidAmount: totalAmount.toString()
                        });

                        // Invalidate queries to refresh the billing page
                        queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/billing"] });

                        console.log("✅ Invoice status updated to paid with payment details");
                      } catch (error) {
                        console.error("❌ Failed to update invoice status:", error);
                      }
                    }
                    setStripeClientSecret("");
                    setCreatedInvoiceId(null);
                    setIsSuccessModalOpen(true);
                  }}
                  onCancel={() => {
                    setStripeClientSecret("");
                    setCreatedInvoiceId(null);
                    // Show success modal instead of toast for patient users
                    setIsSuccessModalOpen(true);
                  }}
                />
              </Elements>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog
        open={isBookingOpen}
        onOpenChange={(open) => {
          // Allow closing via close button (X) or Cancel button
          // Backdrop and Escape key closing are prevented via onPointerDownOutside and onEscapeKeyDown
          setIsBookingOpen(open);
        }}
      >
        <DialogContent
          className="max-w-6xl max-h-[90vh] overflow-y-auto"
          aria-describedby="booking-dialog-description"
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click - only close via X button or Cancel
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on Escape key - only close via X button or Cancel
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {isDoctorLike(user?.role) 
                ? `Book Appointment with ${user?.role === 'nurse' ? 'Nurse' : 'Dr.'} ${user?.firstName || ''} ${user?.lastName || ''}`
                : (() => {
                    // Fix duplicate "Dr." prefix - check if doctor name already includes it
                    const doctorName = selectedBookingDoctor 
                      ? `${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`
                      : 'John Smith';
                    // Remove any existing "Dr." prefix to avoid duplication
                    const cleanName = doctorName.replace(/^Dr\.\s*/i, '');
                    return `Book Appointment with Dr. ${cleanName}`;
                  })()}
            </DialogTitle>
          </DialogHeader>
          {shiftWarning && (
            <Alert className="mb-4 bg-yellow-50 text-yellow-900 border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <AlertDescription className="flex-1">{shiftWarning}</AlertDescription>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const targetSubdomain = getTenantSubdomain();
                    setLocation(`/${targetSubdomain}/shifts?tab=default-shifts`);
                  }}
                >
                  Create Shifts
                </Button>
              </div>
            </Alert>
          )}
          <div id="booking-dialog-description" className="sr-only">
            Schedule a new appointment by selecting specialty, doctor, date, and time slot.
          </div>

          <div className="space-y-4">
            {/* First Row - Title (optional) and Duration (minutes) */}
            {user?.role !== "admin" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Title (optional)</Label>
                  <Input
                    type="text"
                    placeholder="Enter appointment title"
                    value={appointmentTitle}
                    onChange={(e) => setAppointmentTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Duration (minutes)</Label>
                  <Select
                    value={duration}
                    onValueChange={setDuration}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                      <SelectItem value="180">180 minutes (3 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* For admin users, show Duration in first row */}
            {user?.role === "admin" && (
              <div>
                <Label className="text-sm font-medium">Duration (minutes)</Label>
                <Select
                  value={duration}
                  onValueChange={setDuration}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                    <SelectItem value="180">180 minutes (3 hours)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Second Row - Appointment Type and Select Consultation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Appointment Type</Label>
                <Select
                  value={appointmentType}
                  onValueChange={(value) => {
                    const normalized = value as "consultation" | "treatment";
                    setAppointmentType(normalized);
                    setSelectedTreatment(null);
                    setSelectedConsultation(null);
                    setTreatmentSelectionError("");
                    setConsultationSelectionError("");
                    setAppointmentTypeError("");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="treatment">Treatment</SelectItem>
                  </SelectContent>
                </Select>
                {appointmentTypeError && (
                  <p className="text-red-500 text-xs mt-1">{appointmentTypeError}</p>
                )}
              </div>
              <div>
                {appointmentType === "treatment" && (
                  <div>
                    <Label className="text-sm font-medium">Select Treatment</Label>
                    <Popover open={openTreatmentCombo} onOpenChange={setOpenTreatmentCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openTreatmentCombo}
                          className="w-full justify-between mt-1"
                        >
                          {selectedTreatment ? selectedTreatment.name : "Select a treatment"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search treatments..." />
                          <CommandList>
                            <CommandEmpty>
                              {selectedBookingDoctor
                                ? `No treatments available for Dr. ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}.`
                                : "No treatments found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {doctorTreatments.map((treatment: any) => (
                                <CommandItem
                                  key={treatment.id}
                                  value={String(treatment.id)}
                                  onSelect={() => {
                                    setSelectedTreatment(treatment);
                                    setTreatmentSelectionError("");
                                    setOpenTreatmentCombo(false);
                                  }}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <span
                                      className="inline-flex h-3 w-3 rounded-full border border-gray-300"
                                      style={{
                                        backgroundColor: treatment.colorCode || "#D1D5DB",
                                      }}
                                    />
                                    <span className="flex-1 text-left">{treatment.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {treatment.currency || "GBP"} {treatment.basePrice}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {treatmentSelectionError && (
                      <p className="text-red-500 text-xs mt-1">{treatmentSelectionError}</p>
                    )}
                  </div>
                )}

                {appointmentType === "consultation" && (
                  <div>
                    <Label className="text-sm font-medium">Select Consultation</Label>
                    <Popover open={openConsultationCombo} onOpenChange={setOpenConsultationCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openConsultationCombo}
                          className="w-full justify-between mt-1"
                        >
                          {selectedConsultation ? selectedConsultation.serviceName || selectedConsultation.service_name : "Select a consultation"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search consultations..." />
                          <CommandList>
                            <CommandEmpty>
                              {selectedBookingDoctor
                                ? `No consultations available for Dr. ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}.`
                                : "No consultations found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {doctorConsultations.map((service: any) => (
                                <CommandItem
                                  key={service.id}
                                  value={String(service.id)}
                                  onSelect={() => {
                                    setSelectedConsultation(service);
                                    setConsultationSelectionError("");
                                    setOpenConsultationCombo(false);
                                  }}
                                >
                                  <div className="flex items-center gap-2 w-full justify-between">
                                    <span className="flex-1 text-left">{service.serviceName || service.service_name}</span>
                                    <span className="text-xs text-gray-500">
                                      {service.currency || "GBP"} {service.price}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {consultationSelectionError && (
                      <p className="text-red-500 text-xs mt-1">{consultationSelectionError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Third Row - Description */}
            {user?.role !== "admin" && (
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Input
                  type="text"
                  placeholder="e.g. wheelchair, assistance, special needs"
                  value={appointmentDescription}
                  onChange={(e) => setAppointmentDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Second Row - Doctor/Nurse and Patient Information */}
            <div className="grid grid-cols-2 gap-4">
              {/* Doctor/Nurse Information */}
              <div>
                <Label className="text-sm font-medium mb-1 block">
                  {isDoctorLike(user?.role) 
                    ? (user?.role === 'nurse' ? 'Nurse Information' : 'Doctor Information')
                    : 'Doctor Information'}
                </Label>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 h-40">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {isDoctorLike(user?.role) 
                          ? (user?.role === 'nurse' 
                              ? `Nurse ${user?.firstName || ''} ${user?.lastName || ''}`
                              : `Dr. ${user?.firstName || ''} ${user?.lastName || ''}`)
                          : (() => {
                              // Fix duplicate "Dr." prefix - remove any existing prefix from doctor name
                              const doctorName = selectedBookingDoctor 
                                ? `${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`
                                : 'John Smith';
                              // Remove any existing "Dr." prefix to avoid duplication
                              const cleanName = doctorName.replace(/^Dr\.\s*/i, '');
                              return `Dr. ${cleanName}`;
                            })()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {isDoctorLike(user?.role)
                          ? ((user as any)?.medicalSpecialtyCategory || (user as any)?.department || 'General & Primary Care')
                          : (selectedBookingDoctor?.medicalSpecialtyCategory || 'General & Primary Care')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {isDoctorLike(user?.role)
                          ? ((user as any)?.subSpecialty || 'General Practitioner (GP) / Family Physician')
                          : (selectedBookingDoctor?.subSpecialty || 'General Practitioner (GP) / Family Physician')}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>📧</span>
                          <span className="truncate">
                            {isDoctorLike(user?.role)
                              ? (user?.email || '')
                              : (selectedBookingDoctor?.email || 'doctor@cura.com')}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {isDoctorLike(user?.role)
                            ? `${user?.role === 'nurse' ? 'Nurse' : 'Doctor'} ID: ${user?.id ? String(user.id).padStart(6, '0') : '000000'}`
                            : `Doctor ID: ${selectedBookingDoctor ? String(selectedBookingDoctor.id).padStart(6, '0') : '000041'}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Information */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Patient Information</Label>
                {user?.role === 'admin' ? (
                  /* Admin: Show patient dropdown with search */
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 h-40">
                    <Select
                      value={selectedPatient}
                      onValueChange={setSelectedPatient}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients && patients.length > 0 ? (
                          patients.map((patient: any) => (
                            <SelectItem
                              key={patient.id}
                              value={patient.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                                  {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                                </div>
                                <span>
                                  {patient.firstName} {patient.lastName} (OP{String(patient.id).padStart(6, '0')})
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-patients" disabled>
                            No patients available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  /* Non-Admin: Show patient information card */
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 h-40">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName?.charAt(0) || 'S'}{patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName?.charAt(0) || 'a'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName || 'Shabana'} {patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName || 'ali'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          OP{String(patients?.find((p: any) => p.id.toString() === selectedPatient)?.id || '00025').padStart(6, '0')}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>📞</span>
                        <span className="truncate">{patients?.find((p: any) => p.id.toString() === selectedPatient)?.phone || '+923115459791'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>📧</span>
                        <span className="truncate">{patients?.find((p: any) => p.id.toString() === selectedPatient)?.email || 'patient2@cura.com'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>🏥</span>
                        <span className="truncate">NHS: {patients?.find((p: any) => p.id.toString() === selectedPatient)?.nhsNumber || '312312123'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>📍</span>
                        <span className="truncate">{patients?.find((p: any) => p.id.toString() === selectedPatient)?.address?.city || 'guyg'}, {patients?.find((p: any) => p.id.toString() === selectedPatient)?.address?.country || 'United Kingdom'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Third Row - Date and Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* Select Date */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Select Date</Label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 h-[320px] overflow-y-auto">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={bookingHoliday.handleDateSelect}
                    disabled={bookingHoliday.buildDateDisabled(hasShiftsOnDate)}
                    className="w-full rounded-md"
                    {...bookingHoliday.calendarProps}
                  />
                  {bookingHoliday.legend}
                </div>
              </div>

              {/* Select Time Slot */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Select Time Slot</Label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 h-[320px] overflow-y-auto">
                  {!selectedDate ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 text-sm">Time slots will appear here</p>
                    </div>
                  ) : bookingHoliday.needsHolidayAcknowledgement && !bookingHoliday.holidayAcknowledged ? (
                    <div className="flex flex-col justify-center h-full px-1">
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
                  ) : timeSlots.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm font-medium">Time slot not available</p>
                        <p className="text-gray-400 text-xs mt-1">{format(selectedDate, 'MMMM dd, yyyy')}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {bookingHoliday.banner}
                      <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => {
                        const isAvailable = isTimeSlotAvailable(selectedDate, slot);
                        const isSelected = selectedTimeSlot === timeSlotTo24Hour(slot);

                        return (
                          <Button
                            key={slot}
                            variant={isSelected ? "default" : "outline"}
                            className={`h-10 text-xs font-medium ${!isAvailable
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300"
                              : isSelected
                                ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                                : "bg-green-500 hover:bg-green-600 text-white border-green-500"
                              }`}
                            disabled={!isAvailable}
                            onClick={() => {
                              if (!selectedDate) return;
                              setSelectedTimeSlot(timeSlotTo24Hour(slot));
                            }}
                          >
                            {slot}
                          </Button>
                        );
                      })}
                    </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden Patient Selection (needed for booking) */}
            <div className="hidden">
              <Select
                value={selectedPatient}
                onValueChange={setSelectedPatient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((patient: any) => (
                    <SelectItem
                      key={patient.id}
                      value={patient.id.toString()}
                    >
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsBookingOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !selectedPatient ||
                !selectedDate ||
                !selectedTimeSlot
              }
              onClick={handleBookAppointmentClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Book Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={isConfirmationOpen}
        onOpenChange={(open) => {
          // Prevent closing on outside click - only close via X button or Cancel
          // Don't allow closing via onOpenChange (which triggers on backdrop click)
          if (open) {
            setIsConfirmationOpen(true);
          }
          // If open is false, ignore it - user must click X or Cancel button
          // Reset booking progress only when explicitly closed via button
        }}
      >
        <DialogContent
          className="max-w-2xl"
          aria-describedby="confirmation-dialog-description"
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on Escape key
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Appointment Booking Confirmation</DialogTitle>
          </DialogHeader>
          <div id="confirmation-dialog-description" className="sr-only">
            Review and confirm your appointment booking details before submission.
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-medium">Booking Summary</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Appointment Type</Label>
                    <p className="text-sm font-medium">{appointmentTypeLabel}</p>
                    {selectedServiceInfo && (
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-flex h-2 w-2 rounded-full border border-gray-300"
                          style={{ backgroundColor: selectedServiceInfo.color }}
                        />
                        <span className="text-xs text-gray-500">
                          {selectedServiceInfo.label} • {selectedServiceInfo.price}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Patient</Label>
                    <p className="text-sm font-medium">
                      {selectedPatient
                        ? `${patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName} ${patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName}`
                        : "Not selected"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</Label>
                    <p className="text-sm font-medium">{selectedDate ? format(selectedDate, "PPP") : "Not selected"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Duration</Label>
                    <p className="text-sm font-medium">{duration} minutes</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Doctor</Label>
                    <p className="text-sm font-medium">
                      {selectedBookingDoctor
                        ? `Dr. ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`
                        : "Not selected"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Time</Label>
                    <p className="text-sm font-medium">{selectedTimeSlot ? formatTime(selectedTimeSlot) : "Not selected"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {user?.role === "patient" && (
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700 mt-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Service</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {invoiceForm.serviceDescription}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Service Code</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {invoiceForm.serviceCode}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {invoiceForm.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Insurance Provider</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {invoiceForm.insuranceProvider}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-blue-600 dark:text-blue-300">£{invoiceForm.amount}</span>
                </div>
                {invoiceForm.notes && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 block text-sm mb-1">Notes</span>
                    <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-600 p-2 rounded">
                      {invoiceForm.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmationOpen(false);
                if (isPatientBookingFlow) {
                  setShowInvoiceModal(true);
                } else {
                  setIsBookingOpen(true);
                }
              }}
              disabled={confirmMutationPending}
            >
              Go Back
            </Button>
            <Button
              onClick={handleBookAppointment}
              disabled={confirmMutationPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPatientBookingFlow
                ? confirmMutationPending
                  ? "Processing..."
                  : "Confirm & Pay"
                : confirmMutationPending
                  ? "Confirming..."
                  : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Creation Modal */}
      <Dialog
        open={showInvoiceModal}
        onOpenChange={(open) => {
          // Prevent closing on outside click - only close via X button or Cancel
          // Don't allow closing via onOpenChange (which triggers on backdrop click)
          if (open) {
            setShowInvoiceModal(true);
          }
          // If open is false, ignore it - user must click X or Cancel button
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click - only close via X button or Cancel
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on Escape key - only close via X button or Cancel
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Patient</Label>
                <Input
                  value={
                    (() => {
                      const patient =
                        patients?.find((p: any) => p.id.toString() === selectedPatient) ||
                        patients?.find((p: any) => p.patientId === selectedPatient);
                      return patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
                    })()
                  }
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Doctor</Label>
                <Input
                  value={
                    selectedBookingDoctor
                      ? `Dr. ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`
                      : "Doctor"
                  }
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Service Date</Label>
                <Input
                  type="date"
                  value={invoiceForm.serviceDate}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceForm.invoiceDate}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Due Date</Label>
                <Input
                  type="date"
                  value={invoiceForm.dueDate}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Services & Procedures</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Input
                    value={invoiceForm.serviceCode}
                    disabled
                    className="mt-1 bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <Input
                    value={invoiceForm.serviceDescription}
                    disabled
                    className="mt-1 bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceForm.amount}
                    disabled
                    className="mt-1 bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Insurance Provider</Label>
                <Input
                  value={invoiceForm.insuranceProvider}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Payment Method</Label>
                <Input
                  value={invoiceForm.paymentMethod}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white">Notes</Label>
              <Textarea
                value={invoiceForm.notes}
                rows={3}
                className="mt-1 bg-gray-50 dark:bg-gray-700"
                disabled
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">£{invoiceForm.amount}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowInvoiceModal(false);
                setIsBookingOpen(true);
                setPendingAppointmentData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowInvoiceModal(false);
                setIsConfirmationOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Review Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-md" aria-describedby="success-dialog-description">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 dark:text-green-400">Success!</DialogTitle>
          </DialogHeader>
          <div id="success-dialog-description" className="sr-only">
            Appointment booking confirmation message.
          </div>

          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            {user?.role === "patient" ? (
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Your appointment has been created. You can complete payment later from the billing section.
              </p>
            ) : (
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Appointment with Dr. {selectedBookingDoctor?.firstName} {selectedBookingDoctor?.lastName} has been scheduled successfully.
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setIsSuccessModalOpen(false);
                resetBookingForm();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insufficient Time Alert Dialog */}
      <AlertDialog open={showInsufficientTimeModal} onOpenChange={setShowInsufficientTimeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Time Available</AlertDialogTitle>
            <AlertDialogDescription>
              {insufficientTimeMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowInsufficientTimeModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate appointment — same provider + patient + date + treatment/consultation (aligned with calendar) */}
      <Dialog
        open={showDuplicateModal}
        onOpenChange={(open) => {
          setShowDuplicateModal(open);
          if (!open) {
            setDuplicateConflictAppointment(null);
            setDuplicateFallbackText("");
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,90dvh)] max-w-[min(32rem,calc(100vw-2rem))] w-full overflow-y-auto overflow-x-hidden dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
              Duplicate Appointment
            </DialogTitle>
            {duplicateConflictAppointment ? (
              <DialogDescription asChild>
                <div className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1 space-y-3 leading-relaxed">
                  {(() => {
                    const d = duplicateConflictAppointment;
                    const pid = d.patientId ?? d.patient_id;
                    const patient = patients?.find(
                      (p: any) =>
                        String(p.id) === String(pid) ||
                        String(p.userId) === String(pid) ||
                        String(p.patientId) === String(pid),
                    );
                    const patientName = patient
                      ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
                      : "This patient";
                    const provId = d.providerId ?? d.provider_id;
                    const providerLine = formatDuplicateProviderDisplayNameFromStaff(medicalStaff, provId);
                    const atLocal = parseScheduledAtAsLocalDoctorList(d.scheduledAt);
                    const formattedDate = format(atLocal, "PPP");
                    const formattedTime = format(atLocal, "p");
                    const kind = String(d.appointmentType || d.appointment_type || "").toLowerCase();
                    const svc = getDuplicateAppointmentServiceLabel(d);
                    const kindPhrase =
                      kind === "treatment" ? `for treatment ${svc}` : `for consultation ${svc}`;
                    const statusLabel = formatAppointmentStatusLabel(d.status ?? d.dup_status);
                    return (
                      <>
                        <p>
                          You have already created an appointment with{" "}
                          <span className="font-medium">{providerLine}</span>, patient{" "}
                          <span className="font-medium">{patientName}</span>, on{" "}
                          <span className="font-medium">{formattedDate}</span> at{" "}
                          <span className="font-medium">{formattedTime}</span>, status{" "}
                          <span className="font-medium">{statusLabel}</span>, {kindPhrase}.
                        </p>
                        <p>
                          Patient <span className="font-medium">{patientName}</span> already has an appointment with{" "}
                          <span className="font-medium">{providerLine}</span> on {formattedDate} at {formattedTime},
                          status <span className="font-medium">{statusLabel}</span>, {kindPhrase}.
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          Please select another treatment, another date, or update the existing appointment.
                        </p>
                      </>
                    );
                  })()}
                </div>
              </DialogDescription>
            ) : duplicateFallbackText ? (
              <DialogDescription asChild>
                <div className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1 space-y-3">
                  {duplicateFallbackText.split(/\n\n+/).map((block, idx) => (
                    <p key={idx}>{block.trim()}</p>
                  ))}
                </div>
              </DialogDescription>
            ) : (
              <DialogDescription className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1">
                This appointment matches an existing booking for the same treatment or consultation on this date.
              </DialogDescription>
            )}
          </DialogHeader>

          {duplicateConflictAppointment && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="mb-2 font-semibold text-amber-900 dark:text-amber-200">Existing appointment</p>
              <ul className="list-none space-y-1.5">
                {(() => {
                  const c = duplicateConflictAppointment;
                  const patientRowPid = c.patientId ?? c.patient_id;
                  const patientRow = patients?.find(
                    (p: any) =>
                      String(p.id) === String(patientRowPid) ||
                      String(p.userId) === String(patientRowPid) ||
                      String(p.patientId) === String(patientRowPid),
                  );
                  const patientRowName = patientRow
                    ? `${patientRow.firstName || ""} ${patientRow.lastName || ""}`.trim()
                    : "Unknown patient";
                  const pid = c.providerId ?? c.provider_id;
                  const prov = medicalStaff?.find((u: any) => Number(u.id) === Number(pid));
                  const provDisplay = formatDuplicateProviderDisplayNameFromStaff(medicalStaff, pid);
                  const roleLabel = c.assignedRole
                    ? String(c.assignedRole).charAt(0).toUpperCase() + String(c.assignedRole).slice(1)
                    : prov?.role
                      ? String(prov.role)
                      : null;
                  const atLocal = parseScheduledAtAsLocalDoctorList(c.scheduledAt);
                  const dur = c.duration != null && Number(c.duration) > 0 ? Number(c.duration) : 30;
                  const endAt = new Date(atLocal.getTime() + dur * 60 * 1000);
                  const st = formatAppointmentStatusLabel(c.status ?? c.dup_status);
                  const aptId = c.appointmentId ?? c.appointment_id;
                  const aptKind = String(c.appointmentType || c.appointment_type || "").toLowerCase();
                  const svcLabel = getDuplicateAppointmentServiceLabel(c);
                  const typeLine =
                    aptKind === "treatment"
                      ? `treatment — ${svcLabel}`
                      : aptKind === "consultation"
                        ? `consultation — ${svcLabel}`
                        : aptKind || "N/A";
                  return (
                    <>
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Patient: </span>
                        {patientRowName}
                      </li>
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Provider: </span>
                        {provDisplay}
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
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Type: </span>
                        {typeLine}
                      </li>
                    </>
                  );
                })()}
              </ul>
            </div>
          )}

          {(user?.role === "admin" || isDoctorLike(user?.role)) &&
            duplicateConflictAppointment &&
            Number.isFinite(Number(duplicateConflictAppointment.id)) &&
            isServiceDuplicateBlockingStatus(
              duplicateConflictAppointment.status ?? duplicateConflictAppointment.dup_status,
            ) && (
              <div className="mt-2 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <Label className="text-sm font-medium leading-snug text-amber-950 dark:text-amber-100">
                  Please change the existing appointment&apos;s status to <strong>Completed</strong> or{" "}
                  <strong>Cancelled</strong>. After updating, you can review and confirm the new appointment in the
                  summary popup.
                </Label>
                <Select value={duplicateResolveStatus} onValueChange={setDuplicateResolveStatus}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    resolveDuplicateStatusMutation.isPending ||
                    !["completed", "cancelled"].includes(
                      normalizeAppointmentStatusForDup(duplicateResolveStatus),
                    )
                  }
                  onClick={() => {
                    const id = Number(duplicateConflictAppointment.id);
                    if (!Number.isFinite(id)) return;
                    resolveDuplicateStatusMutation.mutate({
                      id,
                      status: duplicateResolveStatus,
                    });
                  }}
                >
                  {resolveDuplicateStatusMutation.isPending
                    ? "Updating..."
                    : "Update status & open appointment summary"}
                </Button>
              </div>
            )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => {
                setShowDuplicateModal(false);
                setDuplicateConflictAppointment(null);
                setDuplicateFallbackText("");
              }}
              variant="default"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSchedulingConflictModal}
        onOpenChange={(open) => {
          setShowSchedulingConflictModal(open);
          if (!open) setSchedulingConflictRecord(null);
        }}
      >
        <DialogContent className="max-h-[min(90vh,90dvh)] max-w-[min(32rem,calc(100vw-2rem))] w-full overflow-y-auto overflow-x-hidden dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
              Patient has Already an appointment with another doctor
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1 leading-relaxed">
                {schedulingConflictKind === "patient"
                  ? buildPatientOverlapDialogDescription(bookingSelectedProviderDisplayName, {
                      selectedProviderId: selectedBookingDoctor?.id,
                      conflictProviderId:
                        schedulingConflictRecord?.providerId ?? schedulingConflictRecord?.provider_id,
                    })
                  : `You are trying to book an appointment with ${bookingSelectedProviderDisplayName}, but this time overlaps with another appointment already scheduled for this provider. Please choose a different time slot.`}
              </p>
            </DialogDescription>
          </DialogHeader>
          {schedulingConflictRecord && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="mb-2 font-semibold text-amber-900 dark:text-amber-200">Conflicting appointment</p>
              <ul className="space-y-1.5 list-none">
                {(() => {
                  const c = schedulingConflictRecord;
                  const pid = c.providerId ?? c.provider_id;
                  const prov = medicalStaff?.find((u: any) => Number(u.id) === Number(pid));
                  const provDisplay = formatDuplicateProviderDisplayNameFromStaff(medicalStaff, pid);
                  const roleLabel = c.assignedRole
                    ? String(c.assignedRole).charAt(0).toUpperCase() + String(c.assignedRole).slice(1)
                    : prov?.role
                      ? String(prov.role)
                      : null;
                  const atLocal = parseScheduledAtAsLocalDoctorList(c.scheduledAt);
                  const dur = c.duration != null && Number(c.duration) > 0 ? Number(c.duration) : 30;
                  const endAt = new Date(atLocal.getTime() + dur * 60 * 1000);
                  const st = formatAppointmentStatusLabel(c.status);
                  const aptId = c.appointmentId ?? c.appointment_id;
                  const svcLabel = getDuplicateAppointmentServiceLabel(c);
                  const aptKind = String(c.appointmentType || c.appointment_type || "").toLowerCase();
                  const typeLine =
                    aptKind === "treatment"
                      ? `treatment — ${svcLabel}`
                      : aptKind === "consultation"
                        ? `consultation — ${svcLabel}`
                        : String(c.appointmentType || c.appointment_type || "N/A");
                  return (
                    <>
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Provider: </span>
                        {provDisplay}
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
                      <li>
                        <span className="font-medium text-amber-950 dark:text-amber-200">Type: </span>
                        {typeLine}
                      </li>
                    </>
                  );
                })()}
              </ul>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setShowSchedulingConflictModal(false);
                setSchedulingConflictRecord(null);
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </Card>
  );
}

function StripePaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred while processing the payment.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        const response = await apiRequest("POST", "/api/billing/process-payment", {
          paymentIntentId: paymentIntent.id,
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format from server");
        }

        const result = await response.json();
        if (result.success) {
          toast({
            title: "Payment Successful",
            description: "Your payment has been processed.",
          });
          onSuccess();
        } else {
          const errorMessage = result.error || "Payment processing failed";
          toast({
            title: "Payment Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast({
        title: "Payment Failed",
        description: "An error occurred while processing your payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <PaymentElement />
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-black hover:bg-black/90 text-white"
        >
          {isProcessing ? "Processing..." : "Complete Payment"}
        </Button>
      </div>
    </form>
  );
}
