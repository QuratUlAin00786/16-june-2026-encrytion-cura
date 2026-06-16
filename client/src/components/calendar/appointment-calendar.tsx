import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Clock, MapPin, User, Users, Video, Stethoscope, FileText, Plus, Save, X, Mic, Square, Edit, Trash2, Receipt, ExternalLink, PoundSterling } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { useDayRender, type DayProps } from "react-day-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const anatomicalDiagramImage = "/anatomical-diagram-clean.svg";
const facialDiagramImage = "/clean-facial-diagram.png";
const formatAppointmentTimeUTC = (iso?: string) => {
  if (!iso) return undefined;
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return undefined;
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  const minuteString = minutes.toString().padStart(2, "0");
  return `${twelveHour}:${minuteString} ${period}`;
};

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

function isNonBlockingForRebook(status: unknown): boolean {
  const s = normalizeAppointmentStatusForDup(status)
    .replace(/\s+/g, "_");
  return s === "completed" || s === "cancelled" || s === "canceled" || s === "rescheduled";
}

/** Completed/cancelled/rescheduled must not block new bookings or appear as provider conflicts. */
function filterBlockingProviderConflicts(rows: any[] | null | undefined): any[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((c) => !isNonBlockingForRebook(c?.status));
}

import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getTenantSubdomain } from "@/lib/queryClient";
import { TREATMENT_NAME_OPTIONS } from "@/lib/treatment-name-options";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Appointment } from "@/types";
import ConsultationNotes from "@/components/medical/consultation-notes";
import { FullConsultationInterface } from "@/components/consultation/full-consultation-interface";
import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useTenant } from "@/hooks/use-tenant";
import { cn } from "@/lib/utils";
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
  buildLocalIntervalFromDateAndTimeSlot,
  filterAppointmentRowsByWallClockOverlap,
} from "@/lib/patient-appointment-overlap";
import { useLocation } from "wouter";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { isDoctorLike } from "@/lib/role-utils";

/** Parse scheduledAt without UTC shift (matches DB naive timestamps used across this calendar). */
function parseScheduledAtAsLocal(value: string | Date): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    // Match server + ISO-Z string parsing: wall-clock digits from DB/driver (UTC getters).
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

const statusColors = {
  scheduled: "text-white",
  completed: "text-white",
  cancelled: "text-white",
  no_show: "text-white",
  in_progress: "text-emerald-700"
  ,rescheduled: "text-black"
};

const statusBgColors = {
  scheduled: "#4A7DFF",  // Bluewave
  completed: "#BBF7D0",  // Light Green
  in_progress: "#DCFCE7", // Lighter Green
  cancelled: "#162B61",  // Midnight
  no_show: "#9B9EAF",     // Steel
  rescheduled: "#F3F4F6"  // Light gray
};

const typeColors = {
  consultation: "text-white",
  follow_up: "text-white",
  procedure: "text-white"
};

const typeBgColors = {
  consultation: "#7279FB",  // Electric Lilac
  follow_up: "#C073FF",     // Electric Violet
  procedure: "#4A7DFF"      // Bluewave
};

type ServiceFilterContext = {
  role?: string;
  selectedRoleLower?: string;
  providerId?: string;
  providerNameLower?: string;
};

const matchesDoctorSelection = (item: any, context: ServiceFilterContext): boolean => {
  if (!item || !context) return false;

  const entryRole = (item.doctorRole || item.doctor_role || "").toString().trim().toLowerCase();
  const contextRole = (context.role || "").toLowerCase();
  const contextSelectedRole = (context.selectedRoleLower || contextRole).toLowerCase();
  const roleMatch =
    !entryRole || entryRole === contextRole || entryRole === contextSelectedRole;
  if (!roleMatch) return false;

  const doctorId = item.doctorId ?? item.doctor_id;
  const doctorName = (item.doctorName || item.doctor_name || "").toString().trim().toLowerCase();

  if (!context.providerId && !context.providerNameLower) {
    return true;
  }

  if (context.providerId && doctorId != null && String(doctorId) === String(context.providerId)) {
    return true;
  }

  if (context.providerNameLower && doctorName && doctorName === context.providerNameLower) {
    return true;
  }

  if (doctorId == null && !doctorName) {
    return true;
  }

  return false;
};

const capitalizeRoleLabel = (value?: string) => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

// Wrapper component to fetch patient data and pass to FullConsultationInterface
function FullConsultationWrapper({ patientId, show, onOpenChange }: { patientId: number; show: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: patient, isLoading } = useQuery({
    queryKey: ['/api/patients', patientId],
    enabled: show && !!patientId,
  });

  if (!show) return null;

  // Always render the consultation interface, even during loading
  // This ensures the dialog shows properly and doesn't appear empty to the user
  return (
    <FullConsultationInterface
      open={show}
      onOpenChange={onOpenChange}
      patient={patient || undefined}
    />
  );
}

// Fetch and display invoice for one appointment (admin only, used in list cards under "Appointments for ...")
function AppointmentCardInvoice({ appointmentId }: { appointmentId: string | null }) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["/api/invoices/by-service", "appointments", appointmentId],
    enabled: !!appointmentId,
    retry: false,
    queryFn: async () => {
      if (!appointmentId) return null;
      try {
        const params = new URLSearchParams({ serviceType: "appointments", appointmentId });
        const response = await apiRequest("GET", `/api/invoices/by-service?${params.toString()}`);
        const data = await response.json();
        return data;
      } catch (err: any) {
        if (err?.message?.includes("404") || err?.message?.includes("not found")) return null;
        throw err;
      }
    },
  });

  if (!appointmentId || isLoading || !invoice) return null;

  const statusLabel = String(invoice.status ?? "—").toLowerCase();
  const statusBadgeClass =
    statusLabel === "paid"
      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-[10px] font-semibold px-2 py-0.5"
      : statusLabel === "overdue"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 text-[10px] font-semibold px-2 py-0.5"
        : statusLabel === "unpaid"
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0 text-[10px] font-semibold px-2 py-0.5"
          : statusLabel === "sent"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-[10px] font-semibold px-2 py-0.5"
            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-0 text-[10px] font-semibold px-2 py-0.5";

  return (
    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
        <PoundSterling className="h-3 w-3 text-green-600 shrink-0" />
        {invoice.invoiceNumber ?? `#${invoice.id}`}
      </span>
      <Badge className={statusBadgeClass}>{statusLabel}</Badge>
    </div>
  );
}

export default function AppointmentCalendar({ onNewAppointment }: { onNewAppointment?: () => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [isEditingAppointmentStatus, setIsEditingAppointmentStatus] = useState(false);
  const [appointmentStatusDraft, setAppointmentStatusDraft] = useState<string>("");
  const [editingListAppointmentId, setEditingListAppointmentId] = useState<number | null>(null);
  const [listAppointmentStatusDraft, setListAppointmentStatusDraft] = useState<string>("");
  const [updatingStatusAppointmentId, setUpdatingStatusAppointmentId] = useState<number | null>(null);
  const [showProviderTimeConflict, setShowProviderTimeConflict] = useState(false);
  const [providerTimeConflicts, setProviderTimeConflicts] = useState<any[]>([]);
  const [pendingCreateAppointmentPayload, setPendingCreateAppointmentPayload] = useState<any | null>(null);
  const [updatingConflictAppointmentId, setUpdatingConflictAppointmentId] = useState<number | null>(null);
  const [showShareBookingDialog, setShowShareBookingDialog] = useState(false);
  const [shareBookingEmail, setShareBookingEmail] = useState("");
  const [shareBookingDoctorId, setShareBookingDoctorId] = useState<string>("");
  const [isSharingBookingLink, setIsSharingBookingLink] = useState(false);
  const [dialogStable, setDialogStable] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [appointmentToDelete, setAppointmentToDelete] = useState<{ id: number; title: string } | null>(null);
  const [, setLocation] = useLocation();

  const { user } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = useRolePermissions();

  // Real-time appointment updates via Server-Sent Events
  useEffect(() => {
    if (!user || !tenant) return;

    console.log("[Calendar SSE] Setting up real-time connection...");
    // EventSource doesn't support custom headers, so pass token as query parameter
    const token = localStorage.getItem('auth_token');
    const streamUrl = token 
      ? `/api/appointments/stream?token=${encodeURIComponent(token)}`
      : `/api/appointments/stream`;
    const eventSource = new EventSource(streamUrl, {});

    eventSource.onopen = () => {
      console.log("[Calendar SSE] Connected to appointment stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Calendar SSE] Received appointment event:", data);

        // Handle different appointment events
        if (data.type === 'appointment.created' || data.type === 'appointment.updated' || data.type === 'appointment.deleted') {
          // Invalidate appointments query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
          
          // Show notification
          const eventAction = data.type.split('.')[1];
          toast({
            title: "Appointment Updated",
            description: `An appointment has been ${eventAction} in real-time.`,
          });
        }
      } catch (error) {
        console.error("[Calendar SSE] Error parsing event data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[Calendar SSE] Connection error:", error);
    };

    return () => {
      console.log("[Calendar SSE] Closing connection");
      eventSource.close();
    };
  }, [user, tenant, queryClient, toast]);
  
  // Anatomical Analysis State
  const [showAnatomicalViewer, setShowAnatomicalViewer] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State for ConsultationNotes modal
  const [showConsultationNotes, setShowConsultationNotes] = useState(false);
  // State for Full Consultation interface
  const [showFullConsultation, setShowFullConsultation] = useState(false);
  // State for new appointment modal
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [createdAppointmentDetails, setCreatedAppointmentDetails] = useState<any>(null);
  const [validationErrorMessage, setValidationErrorMessage] = useState<string>("");
  const [showValidationError, setShowValidationError] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateAppointmentDetails, setDuplicateAppointmentDetails] = useState<string>("");
  const [duplicateAppointment, setDuplicateAppointment] = useState<any>(null);
  const [showPatientOverlapConflict, setShowPatientOverlapConflict] = useState(false);
  const [patientOverlapConflictRecord, setPatientOverlapConflictRecord] = useState<any | null>(null);
  const [duplicateResolveStatus, setDuplicateResolveStatus] = useState<string>("completed");
  const [pendingDuplicateCreatePayload, setPendingDuplicateCreatePayload] = useState<any | null>(null);
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | undefined>(undefined);
  const [newApptPickerMonth, setNewApptPickerMonth] = useState<Date>(() => new Date());
  const [newApptHolidayAcknowledged, setNewApptHolidayAcknowledged] = useState(false);
  const [newSelectedTimeSlot, setNewSelectedTimeSlot] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [patientError, setPatientError] = useState<string>("");
  const [providerError, setProviderError] = useState<string>("");
  const [openRoleCombo, setOpenRoleCombo] = useState(false);
  const [openProviderCombo, setOpenProviderCombo] = useState(false);
  const [openPatientCombo, setOpenPatientCombo] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState<any>({
    title: "",
    type: "consultation",
    patientId: "",
    description: "",
  });
  const [shiftWarning, setShiftWarning] = useState("");
  const [missingDateTimeWarning, setMissingDateTimeWarning] = useState("");
  const [appointmentType, setAppointmentType] = useState<"consultation" | "treatment" | "">("");
  const [appointmentSelectedTreatment, setAppointmentSelectedTreatment] = useState<any>(null);
  const [appointmentSelectedConsultation, setAppointmentSelectedConsultation] = useState<any>(null);
  const [openAppointmentTypeCombo, setOpenAppointmentTypeCombo] = useState(false);
  const [openTreatmentCombo, setOpenTreatmentCombo] = useState(false);
  const [openConsultationCombo, setOpenConsultationCombo] = useState(false);
  const [appointmentTypeError, setAppointmentTypeError] = useState<string>("");
  const [treatmentSelectionError, setTreatmentSelectionError] = useState<string>("");
  const [consultationSelectionError, setConsultationSelectionError] = useState<string>("");

  const appointmentServicePreview = useMemo(() => {
    if (!appointmentType) return null;
    if (appointmentType === "treatment" && appointmentSelectedTreatment) {
      return {
        name: appointmentSelectedTreatment.name,
        color: appointmentSelectedTreatment.colorCode || "#D1D5DB",
        price:
          appointmentSelectedTreatment.currency && appointmentSelectedTreatment.basePrice
            ? `${appointmentSelectedTreatment.currency} ${appointmentSelectedTreatment.basePrice}`
            : undefined,
      };
    }
    if (appointmentType === "consultation" && appointmentSelectedConsultation) {
      return {
        name: appointmentSelectedConsultation.serviceName,
        color: appointmentSelectedConsultation.colorCode || "#6366F1",
        price:
          appointmentSelectedConsultation.currency && appointmentSelectedConsultation.basePrice
            ? `${appointmentSelectedConsultation.currency} ${appointmentSelectedConsultation.basePrice}`
            : undefined,
      };
    }
    return null;
  }, [appointmentType, appointmentSelectedTreatment, appointmentSelectedConsultation]);

  const resetNewAppointmentForm = () => {
    setNewAppointmentDate(undefined);
    setNewSelectedTimeSlot("");
    setSelectedRole("");
    setSelectedProviderId("");
    setSelectedDuration(30);
    setNewAppointmentData({
      title: "",
      type: "consultation",
      patientId: "",
      description: "",
    });
    setAppointmentType("");
    setAppointmentSelectedTreatment(null);
    setAppointmentSelectedConsultation(null);
    setAppointmentTypeError("");
    setTreatmentSelectionError("");
    setConsultationSelectionError("");
    setPatientError("");
    setProviderError("");
  };
  const resetEditAppointmentForm = () => {
    setEditingAppointment(null);
    setEditAppointmentDate(undefined);
    setEditSelectedTimeSlot("");
    setEditAppointmentType("");
    setEditAppointmentSelectedTreatment(null);
    setEditAppointmentSelectedConsultation(null);
    setEditAppointmentTypeError("");
    setEditTreatmentSelectionError("");
    setEditConsultationSelectionError("");
  };

  // State for edit appointment modal
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editAppointmentDate, setEditAppointmentDate] = useState<Date | undefined>(undefined);
  const [editSelectedTimeSlot, setEditSelectedTimeSlot] = useState<string>("");
  const [editAppointmentType, setEditAppointmentType] = useState<"consultation" | "treatment" | "">("");
  const [editAppointmentSelectedTreatment, setEditAppointmentSelectedTreatment] = useState<any>(null);
  const [editAppointmentSelectedConsultation, setEditAppointmentSelectedConsultation] = useState<any>(null);
  const [openEditAppointmentTypeCombo, setOpenEditAppointmentTypeCombo] = useState(false);
  const [openEditTreatmentCombo, setOpenEditTreatmentCombo] = useState(false);
  const [openEditConsultationCombo, setOpenEditConsultationCombo] = useState(false);
  const [editAppointmentTypeError, setEditAppointmentTypeError] = useState<string>("");
  const [editTreatmentSelectionError, setEditTreatmentSelectionError] = useState<string>("");
  const [editConsultationSelectionError, setEditConsultationSelectionError] = useState<string>("");
  const [showInsufficientTimeWarning, setShowInsufficientTimeWarning] = useState(false);
  const [insufficientTimeMessage, setInsufficientTimeMessage] = useState<string>("");
  const [editBookedTimeSlots, setEditBookedTimeSlots] = useState<string[]>([]);
  
  
  // State for appointment ID filter (admin only)
  const [appointmentIdFilter, setAppointmentIdFilter] = useState<string>("all");
  const [appointmentIdPopoverOpen, setAppointmentIdPopoverOpen] = useState(false);

  // Admin: default show all statuses (use dropdown to narrow)
  const [adminStatusFilter, setAdminStatusFilter] = useState<
    "active" | "scheduled" | "in_progress" | "completed" | "cancelled" | "rescheduled" | "no_show" | "all"
  >("all");


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

const timeSlotToMinutes = (timeSlot: string): number => {
  const [time, period] = timeSlot.split(" ");
  const [hours, minutes] = time.split(":").map((part) => parseInt(part, 10));
  let normalizedHour = hours;
  if (period === "PM" && hours !== 12) normalizedHour += 12;
  if (period === "AM" && hours === 12) normalizedHour = 0;
  return normalizedHour * 60 + (Number.isNaN(minutes) ? 0 : minutes);
};

const parseShiftTimeToMinutes = (time?: string): number => {
  if (!time) return 0;
  const cleaned = time.split(".")[0];
  const parts = cleaned.split(":").map((part) => parseInt(part, 10));
  if (parts.length < 2 || parts.some((num) => Number.isNaN(num))) return 0;
  const [hours, minutes] = parts;
  return hours * 60 + minutes;
};

  // Check if time slot is within staff's working hours/shift
  // If providerIdOverride is provided (Edit Appointment), use it instead of selectedProviderId (New Appointment)
  const isTimeSlotInShift = (
    timeSlot: string,
    date: Date,
    providerIdOverride?: number | string | null,
  ): boolean => {
    const providerId =
      providerIdOverride !== undefined && providerIdOverride !== null
        ? providerIdOverride.toString()
        : selectedProviderId;

    if (!providerId || !usersData) return true;
    
    const provider = usersData.find((user: any) => user.id.toString() === providerId);
    if (!provider) return true;
    
    const slotMinutes = timeSlotToMinutes(timeSlot);
    const slotDuration = 15; // 15-minute slots
    
    // TIER 1: Check for custom shifts for this date and provider
    if (shiftsData && Array.isArray(shiftsData)) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      const providerShift = shiftsData.find((shift: any) => {
        const shiftDateStr = shift.date instanceof Date 
          ? format(shift.date, 'yyyy-MM-dd')
          : shift.date.substring(0, 10);
        return shift.staffId.toString() === providerId && shiftDateStr === selectedDateStr;
      });
      
      if (providerShift) {
        // Use the custom shift times
        const startMinutes = parseShiftTimeToMinutes(providerShift.startTime);
        let endMinutes = parseShiftTimeToMinutes(providerShift.endTime);
        
        // Handle midnight (00:00) - treat as end of day (1440 minutes)
        // Also handle 23:59 as effectively midnight (1440) to allow last 15-min slot (11:45 PM)
        const endTimeStr = providerShift.endTime?.toString().toLowerCase() || '';
        if (endMinutes === 0 && (slotMinutes >= 720 || endTimeStr.includes('00:00') || endTimeStr.includes('24:00'))) {
          endMinutes = 1440;
        } else if (endMinutes === 1439) { // 23:59 - treat as midnight to allow 11:45 PM slot
          endMinutes = 1440;
        }
        
        // Allow slot if it starts within shift and ends exactly at or before shift end time
        // If shift ends at 7:00 AM (420 min), 6:45 AM (405 min) + 15 = 420 min is allowed
        // If shift ends at 12:00 AM (1440 min), 11:45 PM (1425 min) + 15 = 1440 min is allowed
        // Only disable if slot + duration would go BEYOND the end time
        const slotEndMinutes = slotMinutes + slotDuration;
        return slotMinutes >= startMinutes && slotEndMinutes <= endMinutes;
      }
    }
    
    // TIER 2: If no custom shifts, fall back to default shifts from doctor_default_shifts
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId.toString() === providerId
      );
      
      if (defaultShift) {
        const dayOfWeek = format(date, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        
        // Check if this day is a working day
        if (workingDays.includes(dayOfWeek)) {
        const startMinutes = parseShiftTimeToMinutes(defaultShift.startTime || '00:00');
        let endMinutes = parseShiftTimeToMinutes(defaultShift.endTime || '23:59');
        
        // Handle midnight (00:00) - treat as end of day (1440 minutes)
        // Also handle 23:59 as effectively midnight (1440) to allow last 15-min slot (11:45 PM)
        const endTimeStr = (defaultShift.endTime || '23:59').toString().toLowerCase();
        if (endMinutes === 0 && (slotMinutes >= 720 || endTimeStr.includes('00:00') || endTimeStr.includes('24:00'))) {
          endMinutes = 1440;
        } else if (endMinutes === 1439) { // 23:59 - treat as midnight to allow 11:45 PM slot
          endMinutes = 1440;
        }
        
        // Allow slot if it starts within shift and ends exactly at or before shift end time
        // If shift ends at 7:00 AM (420 min), 6:45 AM (405 min) + 15 = 420 min is allowed
        // If shift ends at 12:00 AM (1440 min), 11:45 PM (1425 min) + 15 = 1440 min is allowed
        const slotEndMinutes = slotMinutes + slotDuration;
        return slotMinutes >= startMinutes && slotEndMinutes <= endMinutes;
        }
        
        return false; // Not a working day
      }
    }
    
    // Fallback to generic working hours if no shift found (legacy support)
    if (!provider.workingHours || !provider.workingDays) return true;
    
    // Check if the selected date falls on a working day
    const dayName = format(date, 'EEEE'); // e.g., "Monday"
    if (!provider.workingDays.includes(dayName)) return false;
    
    // Check if time slot is within working hours
    const startMinutes = parseShiftTimeToMinutes(provider.workingHours.start || '00:00');
    let endMinutes = parseShiftTimeToMinutes(provider.workingHours.end || '23:59');
    
    // Handle midnight (00:00) - treat as end of day (1440 minutes)
    // Also handle 23:59 as effectively midnight (1440) to allow last 15-min slot (11:45 PM)
    const endTimeStr = (provider.workingHours.end || '23:59').toString().toLowerCase();
    if (endMinutes === 0 && (slotMinutes >= 720 || endTimeStr.includes('00:00') || endTimeStr.includes('24:00'))) {
      endMinutes = 1440;
    } else if (endMinutes === 1439) { // 23:59 - treat as midnight to allow 11:45 PM slot
      endMinutes = 1440;
    }
    
    // Allow slot if it starts within shift and ends exactly at or before shift end time
    // If shift ends at 7:00 AM (420 min), 6:45 AM (405 min) + 15 = 420 min is allowed
    // If shift ends at 12:00 AM (1440 min), 11:45 PM (1425 min) + 15 = 1440 min is allowed
    const slotEndMinutes = slotMinutes + slotDuration;
    return slotMinutes >= startMinutes && slotEndMinutes <= endMinutes;
  };

  const getProviderShiftBounds = (date: Date, providerIdOverride?: number | string | null) => {
    const providerId =
      providerIdOverride !== undefined && providerIdOverride !== null
        ? providerIdOverride.toString()
        : selectedProviderId;

    if (!providerId || !usersData) return null;
    const selectedDateStr = format(date, "yyyy-MM-dd");

    if (shiftsData && Array.isArray(shiftsData)) {
      const customShift = shiftsData.find((shift: any) => {
        if (shift.staffId?.toString() !== providerId) return false;
        const shiftDateStr =
          shift.date instanceof Date ? format(shift.date, "yyyy-MM-dd") : shift.date?.substring(0, 10);
        return shiftDateStr === selectedDateStr;
      });
      if (customShift) {
        let endMinutes = parseShiftTimeToMinutes(customShift.endTime);
        // Handle midnight - if end time is 00:00, treat as 1440 (end of day)
        // Also handle 23:59 as effectively midnight (1440) to allow last 15-min slot
        const endTimeStr = customShift.endTime?.toString().toLowerCase() || '';
        if (endMinutes === 0 && (endTimeStr.includes('00:00') || endTimeStr.includes('24:00'))) {
          endMinutes = 1440;
        } else if (endMinutes === 1439) { // 23:59 - treat as midnight to allow 11:45 PM slot
          endMinutes = 1440;
        }
        return {
          start: parseShiftTimeToMinutes(customShift.startTime),
          end: endMinutes,
        };
      }
    }

    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => ds.userId.toString() === providerId);
      if (defaultShift) {
        const dayName = format(date, "EEEE");
        if ((defaultShift.workingDays || []).includes(dayName)) {
          let endMinutes = parseShiftTimeToMinutes(defaultShift.endTime || "23:59");
          // Handle midnight - if end time is 00:00, treat as 1440 (end of day)
          // Also handle 23:59 as effectively midnight (1440) to allow last 15-min slot
          const endTimeStr = (defaultShift.endTime || "23:59").toString().toLowerCase();
          if (endMinutes === 0 && (endTimeStr.includes('00:00') || endTimeStr.includes('24:00'))) {
            endMinutes = 1440;
          } else if (endMinutes === 1439) { // 23:59 - treat as midnight to allow 11:45 PM slot
            endMinutes = 1440;
          }
          return {
            start: parseShiftTimeToMinutes(defaultShift.startTime || "00:00"),
            end: endMinutes,
          };
        }
      }
    }

    const provider = usersData.find((user: any) => user.id.toString() === providerId);
    if (provider?.workingHours) {
      let endMinutes = parseShiftTimeToMinutes(provider.workingHours.end || "23:59");
      // Handle midnight - if end time is 00:00, treat as 1440 (end of day)
      // Also handle 23:59 as effectively midnight (1440) to allow last 15-min slot
      const endTimeStr = (provider.workingHours.end || "23:59").toString().toLowerCase();
      if (endMinutes === 0 && (endTimeStr.includes('00:00') || endTimeStr.includes('24:00'))) {
        endMinutes = 1440;
      } else if (endMinutes === 1439) { // 23:59 - treat as midnight to allow 11:45 PM slot
        endMinutes = 1440;
      }
      return {
        start: parseShiftTimeToMinutes(provider.workingHours.start || "00:00"),
        end: endMinutes,
      };
    }

    return null;
  };

  /** Duplicate row ids to ignore while the reschedule/duplicate modal is open (see isTimeSlotAvailable). */
  const computeRescheduleExcludeAppointmentKeys = (): Set<string> => {
    const rescheduleExcludeKeys = new Set<string>();
    const addRescheduleEx = (v: unknown) => {
      if (v == null || v === "") return;
      rescheduleExcludeKeys.add(String(v));
    };
    if (duplicateAppointment) {
      let excludeDup = false;
      if (newAppointmentDate && newSelectedTimeSlot) {
        const newIv = buildLocalIntervalFromDateAndTimeSlot(
          newAppointmentDate,
          newSelectedTimeSlot,
          selectedDuration || 30,
        );
        if (newIv && !Number.isNaN(newIv.start.getTime()) && !Number.isNaN(newIv.end.getTime())) {
          const dupRaw = parseScheduledAtAsLocal(
            duplicateAppointment.scheduledAt ?? duplicateAppointment.scheduled_at,
          );
          if (!Number.isNaN(dupRaw.getTime())) {
            const dupDurRaw = Number(duplicateAppointment.duration);
            const dupDur = Number.isFinite(dupDurRaw) && dupDurRaw > 0 ? dupDurRaw : 30;
            const dupStartNorm = new Date(
              dupRaw.getFullYear(),
              dupRaw.getMonth(),
              dupRaw.getDate(),
              dupRaw.getHours(),
              dupRaw.getMinutes(),
              0,
              0,
            );
            const dupEnd = new Date(dupStartNorm.getTime() + dupDur * 60 * 1000);
            const ns = newIv.start.getTime();
            const ne = newIv.end.getTime();
            const ds = dupStartNorm.getTime();
            const de = dupEnd.getTime();
            const overlap = ns < de && ne > ds;
            const oldFullyBeforeOrTouchesNewStart = de <= ns;
            excludeDup = overlap || oldFullyBeforeOrTouchesNewStart;
          }
        }
      }
      if (excludeDup) {
        addRescheduleEx(duplicateAppointment.id);
        addRescheduleEx(duplicateAppointment.appointment_id);
      }
    }
    return rescheduleExcludeKeys;
  };

  /**
   * True if this 15-minute row [slotStart, slotEnd) overlaps a blocking appointment for the same calendar day.
   * Used for "booked/grey" styling — not for "cannot fit full duration starting here" (that stays on click via checkConsecutiveSlotsAvailable).
   */
  const timeSlotHasBookingOverlap = (date: Date, timeSlot: string): boolean => {
    if (!date || !timeSlot || !appointments) return false;

    const selectedDateString = format(date, "yyyy-MM-dd");
    const [time, period] = timeSlot.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let hour24 = hours;
    if (period === "PM" && hours !== 12) hour24 += 12;
    if (period === "AM" && hours === 12) hour24 = 0;
    const slotStartMinutes = hour24 * 60 + minutes;
    const slotEndMinutes = slotStartMinutes + 15;

    const slotStartDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour24,
      minutes,
      0,
      0,
    );
    const slotEndDate = new Date(slotStartDate.getTime() + 15 * 60 * 1000);
    const rescheduleExcludeKeys = computeRescheduleExcludeAppointmentKeys();

    return appointments.some((apt: any) => {
      if (editingAppointment && apt.id === editingAppointment.id) {
        return false;
      }

      const aptRowId = apt.id != null ? String(apt.id) : "";
      const aptBizId = (apt as any).appointment_id != null ? String((apt as any).appointment_id) : "";
      if ((aptRowId && rescheduleExcludeKeys.has(aptRowId)) || (aptBizId && rescheduleExcludeKeys.has(aptBizId))) {
        return false;
      }

      const st = String(apt.status ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
      if (st === "cancelled" || st === "canceled" || st === "completed" || st === "rescheduled") {
        return false;
      }

      const providerToCheck = editingAppointment
        ? Number(editingAppointment.providerId ?? (editingAppointment as any).provider_id)
        : selectedProviderId
          ? Number(selectedProviderId)
          : null;
      const patientToCheck =
        user?.role === "patient"
          ? editingAppointment
            ? (editingAppointment.patientId ?? (editingAppointment as any).patient_id ?? null)
            : newAppointmentData?.patientId
              ? parseInt(newAppointmentData.patientId)
              : null
          : null;
      const aptProviderId = Number(apt?.providerId ?? (apt as any).provider_id);

      const aptDate = parseScheduledAtAsLocal(apt.scheduledAt);
      if (Number.isNaN(aptDate.getTime())) return false;
      if (format(aptDate, "yyyy-MM-dd") !== selectedDateString) return false;

      const aptStartDate = new Date(
        aptDate.getFullYear(),
        aptDate.getMonth(),
        aptDate.getDate(),
        aptDate.getHours(),
        aptDate.getMinutes(),
        0,
        0,
      );
      const rawDur = Number(apt?.duration);
      const aptDurationMins = Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 30;
      const aptEndDate = new Date(aptStartDate.getTime() + aptDurationMins * 60 * 1000);

      const hasConflict = slotStartDate < aptEndDate && slotEndDate > aptStartDate;
      if (!hasConflict) return false;

      const isProviderConflict = Boolean(providerToCheck && aptProviderId === providerToCheck);
      const isPatientConflict =
        patientToCheck != null && Number(apt.patientId ?? (apt as any).patient_id) === Number(patientToCheck);
      if (!isProviderConflict && !isPatientConflict) return false;

      console.log("[Availability Check] ❌ CONFLICT DETECTED:", {
        slot: timeSlot,
        slotRange: `${slotStartMinutes}-${slotEndMinutes} mins`,
        providerChecking: providerToCheck,
        patientChecking: patientToCheck,
        conflictingAppointment: {
          id: apt.id,
          providerId: aptProviderId,
          patientId: apt.patientId ?? (apt as any).patient_id,
          time: `${aptStartDate.getHours().toString().padStart(2, "0")}:${aptStartDate.getMinutes().toString().padStart(2, "0")}`,
          duration: aptDurationMins,
        },
      });
      return true;
    });
  };

  // Function to check if a time slot is available and within shift
  const isTimeSlotAvailable = (date: Date, timeSlot: string) => {
    if (!date || !timeSlot || !appointments) return true;

    const providerForShift = editingAppointment
      ? editingAppointment.providerId
      : selectedProviderId
        ? parseInt(selectedProviderId)
        : null;

    if (providerForShift && !isTimeSlotInShift(timeSlot, date, providerForShift)) {
      console.log("[Availability Check] Slot not in shift for provider:", providerForShift, "Time:", timeSlot);
      const shiftBounds = getProviderShiftBounds(date, providerForShift);
      if (shiftBounds) {
        const slotMins = timeSlotToMinutes(timeSlot);
        console.log("[Availability Check] Shift bounds:", {
          start: shiftBounds.start,
          end: shiftBounds.end,
          slotMinutes: slotMins,
          slotEndMinutes: slotMins + 15,
          wouldFit: slotMins + 15 <= shiftBounds.end,
        });
      }
      return false;
    }

    const selectedDateString = format(date, "yyyy-MM-dd");
    console.log(
      "[Availability Check] Checking slot:",
      timeSlot,
      "for provider:",
      providerForShift || "ALL",
      "on date:",
      selectedDateString,
    );

    return !timeSlotHasBookingOverlap(date, timeSlot);
  };

  // Fetch booked time slots for Edit Appointment (grey slots), like patient Edit modal:
  // - same provider
  // - same day
  // - exclude the appointment being edited
  // - exclude cancelled
  const fetchEditBookedTimeSlotsForDate = async (date: Date): Promise<string[]> => {
    try {
      if (!editingAppointment?.providerId) {
        setEditBookedTimeSlots([]);
        return [];
      }

      const dateStr = format(date, "yyyy-MM-dd");
      const response = await apiRequest("GET", "/api/appointments");
      const data = await response.json();

      const providerId = editingAppointment.providerId;

      const dayAppointments = (Array.isArray(data) ? data : []).filter((apt: any) => {
        if (!apt?.scheduledAt) return false;
        if (apt.id === editingAppointment.id) return false;
        if ((apt.status || "").toLowerCase() === "cancelled") return false;
        if (apt.providerId !== providerId) return false;

        const aptDate = parseScheduledAtAsLocal(apt.scheduledAt);
        if (Number.isNaN(aptDate.getTime())) return false;
        return format(aptDate, "yyyy-MM-dd") === dateStr;
      });

      const minutesToTimeSlot = (minutesFromMidnight: number): string => {
        const hh24 = Math.floor(minutesFromMidnight / 60);
        const mm = minutesFromMidnight % 60;
        const period = hh24 >= 12 ? "PM" : "AM";
        const displayHours = hh24 % 12 || 12;
        return `${displayHours}:${mm.toString().padStart(2, "0")} ${period}`;
      };

      const bookedSlotsSet = new Set<string>();
      dayAppointments.forEach((apt: any) => {
        const aptDate = parseScheduledAtAsLocal(apt.scheduledAt);
        if (Number.isNaN(aptDate.getTime())) return;
        const start = new Date(
          aptDate.getFullYear(),
          aptDate.getMonth(),
          aptDate.getDate(),
          aptDate.getHours(),
          aptDate.getMinutes(),
          0,
          0,
        );
        const rawDur = Number(apt?.duration);
        const duration = Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 30;
        const end = new Date(start.getTime() + duration * 60 * 1000);
        for (let t = start.getTime(); t < end.getTime(); t += 15 * 60 * 1000) {
          const cur = new Date(t);
          const m = cur.getHours() * 60 + cur.getMinutes();
          bookedSlotsSet.add(minutesToTimeSlot(m));
        }
      });

      const bookedSlots = Array.from(bookedSlotsSet);
      setEditBookedTimeSlots(bookedSlots);
      return bookedSlots;
    } catch (e) {
      console.error("[Edit Appointment] Failed to fetch booked slots:", e);
      setEditBookedTimeSlots([]);
      return [];
    }
  };

  useEffect(() => {
    if (!showEditAppointment) return;
    if (!editAppointmentDate) return;
    if (!editingAppointment?.providerId) return;
    fetchEditBookedTimeSlotsForDate(editAppointmentDate);
  }, [showEditAppointment, editAppointmentDate, editingAppointment?.id, editingAppointment?.providerId]);

  // Function to check if consecutive slots are available for the selected duration
  const checkConsecutiveSlotsAvailable = (date: Date, startTimeSlot: string, duration: number): { available: boolean; availableMinutes: number } => {
    if (!date || !startTimeSlot) return { available: true, availableMinutes: duration };
    
    // Calculate how many 15-minute slots we need
    const slotsNeeded = duration / 15;
    
    // Convert start time slot to minutes
    const [time, period] = startTimeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    let currentSlotMinutes = hour24 * 60 + minutes;
    
    // Check each consecutive 15-minute slot
    let availableSlots = 0;
    for (let i = 0; i < slotsNeeded; i++) {
      const slotHour = Math.floor(currentSlotMinutes / 60);
      const slotMinute = currentSlotMinutes % 60;
      
      // Convert back to 12-hour format for checking
      let displayHour = slotHour % 12;
      if (displayHour === 0) displayHour = 12;
      const slotPeriod = slotHour >= 12 ? 'PM' : 'AM';
      const slotTimeString = `${displayHour}:${slotMinute.toString().padStart(2, '0')} ${slotPeriod}`;
      
      // Check if this slot is available
      if (isTimeSlotAvailable(date, slotTimeString)) {
        availableSlots++;
        currentSlotMinutes += 15;
      } else {
        break; // Stop at first unavailable slot
      }
    }
    
    const availableMinutes = availableSlots * 15;
    const shiftBounds = getProviderShiftBounds(date);
    const slotStartMinutes = timeSlotToMinutes(startTimeSlot);
    const remainingMinutes = shiftBounds
      ? Math.max(0, shiftBounds.end - slotStartMinutes)
      : availableMinutes;

    return {
      available: availableSlots === slotsNeeded,
      availableMinutes: Math.min(availableMinutes, remainingMinutes),
    };
  };

  // Define muscle coordinates for interactive highlighting
  const muscleCoordinates = {
    frontalis: { x: 350, y: 180 },
    temporalis: { x: 280, y: 220 },
    corrugator: { x: 320, y: 200 },
    procerus: { x: 350, y: 220 },
    orbicularis_oculi: { x: 320, y: 240 },
    levator_labii: { x: 340, y: 280 },
    zygomaticus_major: { x: 380, y: 310 },
    zygomaticus_minor: { x: 370, y: 290 },
    masseter: { x: 400, y: 350 },
    buccinator: { x: 380, y: 340 },
    orbicularis_oris: { x: 350, y: 380 },
    mentalis: { x: 350, y: 420 },
    depressor_anguli: { x: 370, y: 400 },
    platysma: { x: 350, y: 450 }
  };

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest("DELETE", `/api/appointments/${appointmentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Delete appointment error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('[APPOINTMENT-CALENDAR] Mutation function called with data:', data);
      try {
        const response = await apiRequest("POST", "/api/appointments", data);
        const result = await response.json();
        console.log('[APPOINTMENT-CALENDAR] API response received:', result);
        return result;
      } catch (error: any) {
        console.error('[APPOINTMENT-CALENDAR] API request failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[APPOINTMENT-CALENDAR] Mutation onSuccess called:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      const finalAppointmentType = data.appointmentType || appointmentType || "consultation";
      setCreatedAppointmentDetails({
        ...data,
        appointmentType: finalAppointmentType,
      });
      // Don't close dialogs here - let the inline callbacks handle it
    },
    onError: (error: any) => {
      console.error("[APPOINTMENT-CALENDAR] Mutation onError called:", error);
      // Error handling is done in the inline onError callback
    },
  });

  // Edit appointment mutation
  const editAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowEditAppointment(false);
      setShowEditSuccessModal(true);
    },
    onError: (error) => {
      console.error("Edit appointment error:", error);
      toast({
        title: "Update Failed", 
        description: "Failed to update the appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resolveDuplicateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      return response.json();
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      const st = normalizeAppointmentStatusForDup(variables.status);
      if (st === "completed" || st === "cancelled" || st === "rescheduled") {
        setShowDuplicateWarning(false);
        setDuplicateAppointment(null);
        setDuplicateAppointmentDetails("");
        setPendingDuplicateCreatePayload(null);
        setShowConfirmationDialog(true);
        toast({
          title: "Status updated",
          description: "Review and confirm the new appointment below.",
        });
      }
    },
    onError: (error: any) => {
      console.error("resolveDuplicateStatusMutation error:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Could not update appointment status.",
        variant: "destructive",
      });
    },
  });

  const rescheduleAndCreateAppointmentMutation = useMutation({
    mutationFn: async ({ existingId, createPayload }: { existingId: number; createPayload: any }) => {
      await apiRequest("PATCH", `/api/appointments/${existingId}`, { status: "rescheduled" });
      const res = await apiRequest("POST", "/api/appointments", {
        ...createPayload,
        status: "scheduled",
        rescheduledFromId: existingId,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      setShowDuplicateWarning(false);
      setDuplicateAppointment(null);
      setDuplicateAppointmentDetails("");
      setPendingDuplicateCreatePayload(null);
      toast({ title: "Appointment rescheduled" });
    },
    onError: (error: any) => {
      toast({
        title: "Reschedule failed",
        description: error?.message || "Unable to reschedule appointment.",
        variant: "destructive",
      });
    },
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status: 'cancelled' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      });
    },
    onError: (error) => {
      console.error("Cancel appointment error:", error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel the appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update appointment status");
      }
      return response.json();
    },
    onMutate: ({ appointmentId }) => {
      setUpdatingStatusAppointmentId(Number(appointmentId));
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      setSelectedAppointment((prev: any) => ({ ...(prev ?? {}), ...(data ?? {}) }));
      toast({ title: "Status updated", description: "Appointment status has been updated." });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update appointment status.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingStatusAppointmentId(null);
    },
  });

  const updateConflictAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update appointment status");
      }
      return response.json();
    },
    onMutate: ({ id }) => setUpdatingConflictAppointmentId(Number(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update appointment status.",
        variant: "destructive",
      });
    },
    onSettled: () => setUpdatingConflictAppointmentId(null),
  });

  const autoResolvedProviderConflictRef = useRef<Record<string, boolean>>({});

  const tryAutoResolveProviderConflictsAndRetry = useCallback(
    async (opts: { providerId: number; scheduledAt: string; conflicts: any[]; pendingPayload: any }) => {
      // Only auto-resolve in production for admins (status update requires edit permission).
      if (!(import.meta as any)?.env?.PROD) return false;
      if (user?.role !== "admin") return false;

      const key = `${String(opts.providerId)}|${String(opts.scheduledAt)}`;
      if (autoResolvedProviderConflictRef.current[key]) return false;
      autoResolvedProviderConflictRef.current[key] = true;

      const conflicts = filterBlockingProviderConflicts(Array.isArray(opts.conflicts) ? opts.conflicts : []);
      const blocking = conflicts
        .map((c: any) => ({
          id: Number(c?.id ?? c?.appointment_id ?? c?.appointmentId),
          status: String(c?.status ?? "").toLowerCase(),
        }))
        .filter((c) => c.id && !Number.isNaN(c.id))
        .filter((c) => c.status === "scheduled" || c.status === "confirmed" || c.status === "in_progress");

      if (blocking.length === 0) return false;

      try {
        // Mark all blocking overlaps as completed (fast path).
        await Promise.all(
          blocking.map((c) => updateConflictAppointmentStatusMutation.mutateAsync({ id: c.id, status: "completed" })),
        );
        setShowProviderTimeConflict(false);
        setProviderTimeConflicts([]);
        setPendingCreateAppointmentPayload(null);

        // Retry booking once after resolving conflicts
        createAppointmentMutation.mutate(opts.pendingPayload);
        return true;
      } catch (e) {
        console.warn("[Calendar] Auto-resolve provider conflicts failed:", e);
        return false;
      }
    },
    [createAppointmentMutation, updateConflictAppointmentStatusMutation, user?.role],
  );

  const buildLocalProviderConflicts = useCallback(
    (opts: {
      providerId: number;
      scheduledAt: string;
      duration?: number | string | null;
      appointmentsList?: any[] | null;
    }) => {
      const providerId = Number(opts.providerId);
      if (!providerId || !opts.scheduledAt) return [];
      const newStart = parseScheduledAtAsLocal(opts.scheduledAt);
      const newDur = opts.duration != null && Number(opts.duration) > 0 ? Number(opts.duration) : 30;
      const newEnd = new Date(newStart.getTime() + newDur * 60 * 1000);
      if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) return [];

      const getProviderId = (a: any) =>
        Number(
          a?.providerId ??
            a?.provider_id ??
            a?.doctorId ??
            a?.doctor_id ??
            a?.staffId ??
            a?.staff_id ??
            a?.userId ??
            a?.user_id,
        );
      const getPatientId = (a: any) => Number(a?.patientId ?? a?.patient_id);

      const cached = queryClient.getQueryData<any[]>(["/api/appointments"]);
      const list = Array.isArray(opts.appointmentsList) ? opts.appointmentsList : (Array.isArray(cached) ? cached : []);
      const now = new Date();
      const normalizeStatus = (raw: any) =>
        String(raw || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");
      return list
        .filter((a: any) => getProviderId(a) === providerId)
        .filter((a: any) => {
          const st = normalizeStatus(a?.status);
          return st !== "completed" && st !== "cancelled" && st !== "canceled" && st !== "rescheduled";
        })
        .map((a: any) => {
          const at = a?.scheduledAt ?? a?.scheduled_at;
          const start = at ? parseScheduledAtAsLocal(at) : new Date(NaN);
          const dur = a?.duration != null && Number(a.duration) > 0 ? Number(a.duration) : 30;
          const end = new Date(start.getTime() + dur * 60 * 1000);
          return { a, start, end };
        })
        .filter(({ start, end }) => !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()))
        .filter(({ start, end }) => !(start <= now && now < end))
        .filter(({ start, end }) => newStart < end && newEnd > start)
        .map(({ a }) => ({
          id: a.id ?? a.appointment_id,
          appointmentId: a.appointmentId ?? a.appointment_id,
          scheduledAt: a.scheduledAt ?? a.scheduled_at,
          duration: a.duration,
          status: a.status,
          title: a.title,
          patientId: getPatientId(a),
          providerId: getProviderId(a),
          createdBy: a.createdBy ?? a.created_by,
        }));
    },
    [queryClient],
  );

  const fetchConflictDetailsFromServer = useCallback(
    async (payload: any) => {
      const patientId = Number(payload?.patientId);
      const providerId = Number(payload?.providerId);
      const scheduledAt = String(payload?.scheduledAt || "");
      const duration =
        payload?.duration != null && Number(payload.duration) > 0 ? Number(payload.duration) : 30;
      if (!patientId || !providerId || !scheduledAt) return [];

      try {
        const res = await apiRequest("POST", "/api/appointments/check-conflicts", {
          patientId,
          providerId,
          scheduledAt,
          duration,
        });
        const data = await res.json();
        const providerConflict = Array.isArray(data?.providerConflict) ? data.providerConflict : [];
        const mapped = providerConflict.map((c: any) => ({
          id: c.id ?? c.appointment_id,
          appointmentId: c.appointmentId ?? c.appointment_id,
          scheduledAt: c.scheduledAt ?? c.scheduled_at,
          duration: c.duration,
          status: c.status,
          title: c.title,
          patientId: c.patientId ?? c.patient_id,
          providerId: c.providerId ?? c.provider_id,
          createdBy: c.createdBy ?? c.created_by,
        }));
        return filterBlockingProviderConflicts(
          filterAppointmentRowsByWallClockOverlap(
            scheduledAt,
            duration,
            mapped,
            parseScheduledAtAsLocal,
          ),
        );
      } catch {
        return [];
      }
    },
    [buildLocalProviderConflicts],
  );

  // Check for appointment conflicts before creation
  const checkAppointmentConflicts = async (
    patientId: number,
    providerId: number,
    scheduledAt: string,
    duration: number,
  ): Promise<{ hasConflict: boolean; message: string; patientConflict?: any[]; providerConflict?: any[] }> => {
    try {
      const response = await apiRequest("POST", "/api/appointments/check-conflicts", {
        patientId,
        providerId,
        scheduledAt,
        duration,
      });
      const result = await response.json();

      const mapRow = (c: any) => ({
        id: c.id ?? c.appointment_id,
        appointmentId: c.appointmentId ?? c.appointment_id,
        scheduledAt: c.scheduledAt ?? c.scheduled_at,
        duration: c.duration,
        status: c.status,
        title: c.title,
        patientId: c.patientId ?? c.patient_id,
        providerId: c.providerId ?? c.provider_id,
        createdBy: c.createdBy ?? c.created_by,
      });

      const patientConflictRaw = Array.isArray(result.patientConflict)
        ? result.patientConflict.map(mapRow)
        : [];
      const providerConflictRaw = Array.isArray(result.providerConflict)
        ? result.providerConflict.map(mapRow)
        : [];

      // Same wall-clock overlap as green/grey slots — ignore same-day rows that do not overlap in time.
      const patientConflict = filterAppointmentRowsByWallClockOverlap(
        scheduledAt,
        duration,
        patientConflictRaw,
        parseScheduledAtAsLocal,
      );
      const providerConflict = filterAppointmentRowsByWallClockOverlap(
        scheduledAt,
        duration,
        providerConflictRaw,
        parseScheduledAtAsLocal,
      );

      if (patientConflict.length > 0) {
        return {
          hasConflict: true,
          message:
            "This patient already has an appointment at this date and time with another doctor.",
          patientConflict,
          providerConflict,
        };
      }
      if (providerConflict.length > 0) {
        return {
          hasConflict: true,
          message:
            "This doctor already has an appointment at this date and time with another patient.",
          patientConflict,
          providerConflict,
        };
      }

      return { hasConflict: false, message: "", patientConflict: [], providerConflict: [] };
    } catch (error) {
      console.error("Error checking appointment conflicts:", error);
      return { hasConflict: false, message: "", patientConflict: [], providerConflict: [] };
    }
  };

  // Handle delete appointment
  const handleDeleteAppointment = (appointmentId: number, appointmentTitle: string) => {
    // Only show modal for admin role
    if (user?.role === 'admin') {
      setAppointmentToDelete({ id: appointmentId, title: appointmentTitle });
    } else {
      // For non-admin roles, use the old window.confirm as fallback
      if (window.confirm(`Are you sure you want to delete "${appointmentTitle}"? This action cannot be undone.`)) {
        deleteAppointmentMutation.mutate(appointmentId);
      }
    }
  };

  // Confirm delete appointment
  const confirmDeleteAppointment = () => {
    if (appointmentToDelete) {
      deleteAppointmentMutation.mutate(appointmentToDelete.id);
      setAppointmentToDelete(null);
    }
  };

  // Cancel delete appointment
  const cancelDeleteAppointment = () => {
    setAppointmentToDelete(null);
  };

  // Handle cancel appointment
  const handleCancelAppointment = (appointmentId: number) => {
    cancelAppointmentMutation.mutate(appointmentId);
  };

  // Handle edit appointment
  const handleEditAppointment = async (appointment: any) => {
    // *** CHANGE 1: Refetch appointments from database to ensure we have latest data for conflict checking ***
    console.log('[Edit Appointment] Fetching latest appointments data from database...');
    await refetch();
    console.log('[Edit Appointment] Appointments data refreshed');
    
    setEditingAppointment(appointment);
    const normalizedAppointmentType = appointment.appointmentType || "consultation";
    setEditAppointmentType(normalizedAppointmentType);
    setEditAppointmentSelectedTreatment(
      treatmentsList.find((treatment: any) => treatment.id === appointment.treatmentId) || null
    );
    setEditAppointmentSelectedConsultation(
      consultationServices.find((service: any) => service.id === appointment.consultationId) || null
    );
    setEditAppointmentTypeError("");
    setEditTreatmentSelectionError("");
    setEditConsultationSelectionError("");
    setOpenEditAppointmentTypeCombo(false);
    setOpenEditTreatmentCombo(false);
    setOpenEditConsultationCombo(false);
    
    // *** FIX: Parse scheduledAt as local time (no timezone conversion) ***
    // Use parseScheduledAtAsLocal to handle all date formats correctly
    const appointmentDate = parseScheduledAtAsLocal(appointment.scheduledAt);
    
    if (!isNaN(appointmentDate.getTime())) {
      setEditAppointmentDate(appointmentDate);
      
      // Convert to 12-hour format for display using local time components
      const hours = appointmentDate.getHours(); // Use getHours() not getUTCHours()
      const minutes = appointmentDate.getMinutes(); // Use getMinutes() not getUTCMinutes()
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      setEditSelectedTimeSlot(timeString);
      
      console.log('[Edit Appointment] Opening edit dialog with appointment:', {
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        parsedDate: appointmentDate.toString(),
        selectedDate: appointmentDate,
        selectedTimeSlot: timeString,
        localHours: hours,
        localMinutes: minutes
      });
    }
    
    setShowEditAppointment(true);
  };

  // Generate comprehensive treatment plan
  const generateTreatmentPlan = async () => {
    if (!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment) {
      toast({
        title: "Missing Information",
        description: "Please select muscle group, analysis type, and treatment before generating plan.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPlan(true);
    
    // Get provider info to determine title
    const provider = usersData?.find((u: any) => u.id === selectedAppointment.providerId);
    const providerRole = provider?.role?.toLowerCase();
    const titlePrefix = providerRole === 'nurse' ? 'Nurse' : 'Dr.';
    
    const treatmentPlan = `
COMPREHENSIVE FACIAL MUSCLE TREATMENT PLAN

Patient: ${getPatientName(selectedAppointment.patientId)}
Date: ${new Date().toLocaleDateString()}
Muscle Group: ${selectedMuscleGroup.replace('_', ' ').toUpperCase()}
Analysis Type: ${selectedAnalysisType}
Treatment: ${selectedTreatment}

ASSESSMENT:
The ${selectedMuscleGroup.replace('_', ' ')} shows signs requiring ${selectedAnalysisType} intervention. 
Based on clinical examination, ${selectedTreatment} is recommended as the primary treatment approach.

TREATMENT PROTOCOL:
1. Initial Assessment: Complete facial muscle evaluation
2. Targeted Therapy: ${selectedTreatment} sessions focusing on ${selectedMuscleGroup.replace('_', ' ')}
3. Monitoring: Regular follow-up appointments to track progress
4. Home Care: Patient education on proper muscle care techniques

EXPECTED OUTCOMES:
- Improved muscle function and symmetry
- Reduced symptoms and discomfort
- Enhanced facial expression capabilities
- Long-term muscle health maintenance

FOLLOW-UP SCHEDULE:
- Week 2: Progress evaluation
- Month 1: Treatment effectiveness assessment
- Month 3: Long-term outcome review

Prepared by: ${titlePrefix} ${getProviderName(selectedAppointment.providerId)}
Medical License: [License Number]
    `;

    setGeneratedTreatmentPlan(treatmentPlan);
    setIsGeneratingPlan(false);
    
    toast({
      title: "Treatment Plan Generated",
      description: "Comprehensive treatment plan has been created successfully.",
    });
  };

  // Save anatomical analysis
  const saveAnatomicalAnalysis = async () => {
    if (!generatedTreatmentPlan) {
      toast({
        title: "No Treatment Plan",
        description: "Please generate a treatment plan before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAnalysis(true);
    
    const analysisData = {
      patientId: selectedAppointment.patientId,
      appointmentId: selectedAppointment.id,
      muscleGroup: selectedMuscleGroup,
      analysisType: selectedAnalysisType,
      treatment: selectedTreatment,
      treatmentPlan: generatedTreatmentPlan,
      analysisDate: new Date().toISOString(),
      providerId: selectedAppointment.providerId
    };

    try {
      const response = await fetch('/api/anatomical-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-Subdomain': 'cura'
        },
        credentials: 'include',
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setIsSavingAnalysis(false);
      setShowAnatomicalViewer(false);
      
      // Reset analysis state
      setSelectedMuscleGroup("");
      setSelectedAnalysisType("");
      setSelectedTreatment("");
      setGeneratedTreatmentPlan("");
      
      toast({
        title: "Analysis Saved",
        description: "Anatomical analysis has been saved to patient records.",
      });
    } catch (error) {
      setIsSavingAnalysis(false);
      toast({
        title: "Save Failed",
        description: "Failed to save anatomical analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Voice transcription states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  // Check for speech recognition support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      setIsTranscriptionSupported(true);
      const recognitionInstance = new (window as any).webkitSpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      setRecognition(recognitionInstance);
    }
  }, []);

  const startRecording = () => {
    if (recognition) {
      setIsRecording(true);
      recognition.start();
      
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        toast({
          title: "Recording Error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive",
        });
      };
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  // Role-based permissions helper using useRolePermissions hook
  const canEditAppointments = () => {
    return canEdit('appointments');
  };

  const canDeleteAppointments = () => {
    return canDelete('appointments');
  };

  const canCreateAppointments = () => {
    return canCreate('appointments');
  };

  const canViewAppointmentDetails = () => {
    if (!user) return false;
    // Everyone can view appointment details (filtered by backend already)
    return true;
  };

  // Fetch appointments
  const { data: appointmentsData, isLoading, refetch, error } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    // Auto-refresh for admin/nurse/doctor roles: poll every 10 seconds to get new appointments
    refetchInterval: (user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)) ? 10000 : 60000, // 10 seconds for admin/nurse/doctor, 60 seconds for others
    refetchIntervalInBackground: (user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)), // Continue polling even when tab is in background
    retry: 3,
    retryDelay: 1000,
    queryFn: async () => {
      console.log("[Calendar] Fetching appointments...");
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      console.log("[Calendar] Appointments data received:", data);
      return data;
    },
  });

  // Fetch users for patient and provider names
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
    queryFn: async () => {
      console.log("[Calendar] Fetching users data...");
      const response = await apiRequest('GET', '/api/users');
      const data = await response.json();
      console.log("[Calendar] Users data received:", data);
      return data;
    },
  });

  // Fetch patients
  const { data: patientsData, isLoading: isPatientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    queryFn: async () => {
      console.log("[Calendar] Fetching patients data...");
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      console.log("[Calendar] Patients data received:", data);
      return data;
    },
  });

  const getPatientRelation = (patient: any): string => {
    const rel = String(patient?.relation ?? "").trim();
    return rel || "Self";
  };

  const getSelfEmailForUserId = (userId: number | string | null | undefined): string => {
    if (!patientsData || !Array.isArray(patientsData) || userId == null) return "";
    const self = patientsData.find((p: any) => String(p?.userId) === String(userId) && String(p?.relation ?? "").toLowerCase() === "self");
    return String(self?.email ?? "").trim();
  };

  const getDisplayEmailForPatient = (patient: any): string => {
    const relation = String(patient?.relation ?? "").toLowerCase();
    const email = String(patient?.email ?? "").trim();
    if (relation === "self") return email;
    // For non-self family members, display Self email for the same userId
    return getSelfEmailForUserId(patient?.userId) || email;
  };

  const patientRelationRank = (relation?: string | null) => {
    if (!relation) return 50;
    const r = String(relation).toLowerCase();
    if (r === "self") return 0;
    if (r === "spouse") return 10;
    if (r === "father") return 20;
    if (r === "mother") return 21;
    if (r === "son") return 30;
    if (r === "daughter") return 31;
    if (r === "other") return 40;
    return 45;
  };

  const patientDropdownGroups = (() => {
    if (!patientsData || !Array.isArray(patientsData)) return [];
    const map = new Map<number | string, any[]>();
    for (const p of patientsData) {
      const key = p?.userId ?? `no-user-${p?.id ?? Math.random()}`;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }

    const groups = Array.from(map.values()).map((members) => {
      const sorted = [...members].sort((a, b) => {
        const rr = patientRelationRank(a?.relation) - patientRelationRank(b?.relation);
        if (rr !== 0) return rr;
        const na = `${a?.firstName ?? ""} ${a?.lastName ?? ""}`.trim().toLowerCase();
        const nb = `${b?.firstName ?? ""} ${b?.lastName ?? ""}`.trim().toLowerCase();
        return na.localeCompare(nb);
      });

      const main = sorted.find((m) => String(m?.relation ?? "").toLowerCase() === "self") ?? sorted[0];
      const relatives = sorted.filter((m) => m !== main);
      return { main, relatives };
    });

    groups.sort((a, b) => {
      const na = `${a.main?.firstName ?? ""} ${a.main?.lastName ?? ""}`.trim().toLowerCase();
      const nb = `${b.main?.firstName ?? ""} ${b.main?.lastName ?? ""}`.trim().toLowerCase();
      return na.localeCompare(nb);
    });

    return groups;
  })();

  const [showAddTreatmentDialog, setShowAddTreatmentDialog] = useState(false);
  const [showCreateTreatmentMetadataDialog, setShowCreateTreatmentMetadataDialog] =
    useState(false);
  const [newTreatmentInfo, setNewTreatmentInfo] = useState({
    name: "",
    colorCode: "#2563eb",
  });
  const [treatmentNameComboboxOpen, setTreatmentNameComboboxOpen] = useState(false);
  const [isSavingTreatmentInfo, setIsSavingTreatmentInfo] = useState(false);
  const [bulkTreatmentSelections, setBulkTreatmentSelections] = useState<Record<string, { selected: boolean; price: string }>>({});
  const [bulkDefaultPrice, setBulkDefaultPrice] = useState("");
  const [isSavingTreatment, setIsSavingTreatment] = useState(false);
  const [treatmentError, setTreatmentError] = useState("");

  const [treatmentForm, setTreatmentForm] = useState<{
    doctorRole: string;
    doctorName: string;
    doctorId: number | null;
  }>({
    doctorRole: "",
    doctorName: "",
    doctorId: null,
  });

  const { data: treatmentsInfoList = [], isLoading: loadingTreatmentsInfo } = useQuery<any[]>({
    queryKey: ["/api/treatments-info"],
    staleTime: 60000,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/treatments-info");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: showNewAppointment || showAddTreatmentDialog,
  });

  const openAddTreatmentsPopup = () => {
    const providerIdNum = selectedProviderId ? parseInt(String(selectedProviderId), 10) : NaN;
    const provider = Array.isArray(filteredUsers)
      ? filteredUsers.find((u: any) => String(u?.id) === String(selectedProviderId))
      : null;

    setTreatmentError("");
    setBulkDefaultPrice("");
    setBulkTreatmentSelections({});
    setTreatmentForm({
      doctorRole: selectedRole || "",
      doctorName: provider ? `${provider.firstName} ${provider.lastName}` : "",
      doctorId: Number.isNaN(providerIdNum) ? null : providerIdNum,
    });
    setShowAddTreatmentDialog(true);
  };

  const assignTreatmentToDoctor = async (
    info: { name?: string; colorCode?: string },
    price: string,
  ): Promise<"added" | "skipped" | "invalid"> => {
    if (!treatmentForm.doctorId) return "invalid";
    const priceTrimmed = price.trim();
    if (
      priceTrimmed === "" ||
      Number.isNaN(parseFloat(priceTrimmed)) ||
      parseFloat(priceTrimmed) < 0
    ) {
      return "invalid";
    }

    const freshRes = await apiRequest("GET", "/api/pricing/treatments");
    const fresh = await freshRes.json();
    const treatmentsToCheck: any[] = Array.isArray(fresh) ? fresh : [];

    const doctorIdNorm = treatmentForm.doctorId ?? null;
    const doctorNameNorm = String(treatmentForm.doctorName ?? "").trim().toLowerCase();
    const doctorRoleNorm = String(treatmentForm.doctorRole ?? "").trim().toLowerCase();
    const isSameDoctor = (t: any) => {
      if (doctorIdNorm != null && t?.doctorId != null) {
        return Number(t.doctorId) === Number(doctorIdNorm);
      }
      return (
        String(t?.doctorName ?? "").trim().toLowerCase() === doctorNameNorm &&
        String(t?.doctorRole ?? "").trim().toLowerCase() === doctorRoleNorm
      );
    };

    const nameKey = String(info?.name ?? "").trim().toLowerCase();
    const alreadyExists = treatmentsToCheck
      .filter(isSameDoctor)
      .some((t: any) => String(t?.name ?? "").trim().toLowerCase() === nameKey);
    if (alreadyExists) return "skipped";

    const payload: any = {
      name: String(info.name ?? "").trim(),
      basePrice: priceTrimmed,
      colorCode: info.colorCode || "#000000",
      doctorRole: treatmentForm.doctorRole || null,
      doctorName: treatmentForm.doctorName || null,
      doctorId: treatmentForm.doctorId,
      currency: currencyCodeForTreatments,
    };
    await apiRequest("POST", "/api/pricing/treatments", payload);
    return "added";
  };

  const handleSaveTreatmentMetadata = async () => {
    if (!newTreatmentInfo.name.trim()) {
      toast({
        title: "Missing name",
        description: "Please provide a treatment name before saving.",
        variant: "destructive",
      });
      return;
    }
    if (!treatmentForm.doctorId) {
      setTreatmentError("Please select a role and name first.");
      return;
    }

    setTreatmentError("");
    setIsSavingTreatmentInfo(true);
    try {
      const response = await apiRequest("POST", "/api/treatments-info", {
        name: newTreatmentInfo.name.trim(),
        colorCode: newTreatmentInfo.colorCode,
      });
      if (!response.ok) {
        let errorMessage = "Failed to create treatment entry";
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage);
      }

      const created = await response.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/treatments-info"] });
      await queryClient.refetchQueries({ queryKey: ["/api/treatments-info"] });

      const createdId =
        created?.id != null ? String(created.id) : null;
      const priceVal = bulkDefaultPrice.trim();

      if (createdId) {
        setBulkTreatmentSelections((prev) => ({
          ...prev,
          [createdId]: { selected: true, price: priceVal },
        }));
      }

      let assignResult: "added" | "skipped" | "invalid" = "invalid";
      if (priceVal !== "") {
        assignResult = await assignTreatmentToDoctor(
          {
            name: created?.name || newTreatmentInfo.name.trim(),
            colorCode: created?.colorCode || newTreatmentInfo.colorCode,
          },
          priceVal,
        );
        if (assignResult === "added" || assignResult === "skipped") {
          await queryClient.invalidateQueries({ queryKey: ["/api/pricing/treatments"] });
          await queryClient.refetchQueries({ queryKey: ["/api/pricing/treatments"] });
        }
      }

      setShowCreateTreatmentMetadataDialog(false);
      setNewTreatmentInfo({ name: "", colorCode: "#2563eb" });
      setTreatmentNameComboboxOpen(false);

      if (assignResult === "added") {
        toast({
          title: "Treatment created and assigned",
          description: `"${newTreatmentInfo.name.trim()}" was assigned to ${treatmentForm.doctorName}.`,
        });
      } else if (assignResult === "skipped") {
        toast({
          title: "Treatment created",
          description: `"${newTreatmentInfo.name.trim()}" already exists for ${treatmentForm.doctorName}.`,
        });
      } else if (priceVal === "") {
        toast({
          title: "Treatment created",
          description: `"${newTreatmentInfo.name.trim()}" is selected. Enter a price and click Add Selected Treatments to assign to ${treatmentForm.doctorName}.`,
        });
      } else {
        toast({
          title: "Treatment created",
          description: `"${newTreatmentInfo.name.trim()}" was saved. Set a valid default price to assign automatically.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to create treatment",
        description: err?.message || "Unable to save the treatment metadata",
        variant: "destructive",
      });
    } finally {
      setIsSavingTreatmentInfo(false);
    }
  };

  const handleBulkTreatmentSave = async () => {
    if (!treatmentForm.doctorId) {
      setTreatmentError("Please select a role and name first.");
      return;
    }
    const selected = Object.entries(bulkTreatmentSelections).filter(([, v]) => v.selected && v.price.trim() !== "");
    if (selected.length === 0) {
      setTreatmentError("Select at least one treatment and enter a price for each.");
      return;
    }
    const invalid = selected.filter(([, v]) => Number.isNaN(parseFloat(v.price)) || parseFloat(v.price) < 0);
    if (invalid.length > 0) {
      setTreatmentError("All selected treatments must have a valid price (number ≥ 0).");
      return;
    }

    setTreatmentError("");
    setIsSavingTreatment(true);
    try {
      // fetch fresh treatments so we can avoid duplicates for that doctor
      const freshRes = await apiRequest("GET", "/api/pricing/treatments");
      const fresh = await freshRes.json();
      const treatmentsToCheck: any[] = Array.isArray(fresh) ? fresh : [];

      const doctorIdNorm = treatmentForm.doctorId ?? null;
      const doctorNameNorm = String(treatmentForm.doctorName ?? "").trim().toLowerCase();
      const doctorRoleNorm = String(treatmentForm.doctorRole ?? "").trim().toLowerCase();
      const isSameDoctor = (t: any) => {
        if (doctorIdNorm != null && t?.doctorId != null) return Number(t.doctorId) === Number(doctorIdNorm);
        return (
          String(t?.doctorName ?? "").trim().toLowerCase() === doctorNameNorm &&
          String(t?.doctorRole ?? "").trim().toLowerCase() === doctorRoleNorm
        );
      };
      const existingNamesForDoctor = new Set(
        treatmentsToCheck.filter(isSameDoctor).map((t: any) => String(t?.name ?? "").trim().toLowerCase())
      );

      let addedCount = 0;
      let skippedCount = 0;
      for (const [infoId, { price }] of selected) {
        const info = (treatmentsInfoList || []).find((i: any) => String(i?.id) === String(infoId));
        if (!info) continue;
        const nameKey = String(info?.name ?? "").trim().toLowerCase();
        if (existingNamesForDoctor.has(nameKey)) {
          skippedCount += 1;
          continue;
        }
        const payload: any = {
          name: String(info.name ?? "").trim(),
          basePrice: price.trim(),
          colorCode: info.colorCode || "#000000",
          doctorRole: treatmentForm.doctorRole || null,
          doctorName: treatmentForm.doctorName || null,
          doctorId: treatmentForm.doctorId,
          currency: currencyCodeForTreatments,
        };
        await apiRequest("POST", "/api/pricing/treatments", payload);
        addedCount += 1;
        existingNamesForDoctor.add(nameKey);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/pricing/treatments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/pricing/treatments"] });
      setShowAddTreatmentDialog(false);
      setBulkTreatmentSelections({});
      toast({
        title: "Treatments updated",
        description:
          addedCount === 0 && skippedCount > 0
            ? "All selected treatments already exist. No new treatments were added."
            : `${addedCount} treatment${addedCount !== 1 ? "s" : ""} added.${skippedCount ? ` ${skippedCount} skipped (already existed).` : ""}`,
      });
    } catch (err: any) {
      setTreatmentError(err?.message || "Failed to add treatments.");
      toast({ title: "Error", description: err?.message || "Failed to add treatments.", variant: "destructive" });
    } finally {
      setIsSavingTreatment(false);
    }
  };

  // Fetch roles from the roles table filtered by organization_id
  const { data: rolesData = [] } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/roles");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Roles fetch error:", error);
        return [];
      }
    },
  });

  // Fetch invoice for selected appointment (admin only; match by appointment_id only - do not use numeric id for service_id)
  const aptId = selectedAppointment?.appointmentId ?? (selectedAppointment as any)?.appointment_id;
  const appointmentIdStr = (aptId != null && String(aptId).trim()) ? String(aptId).trim() : null;
  const { data: appointmentInvoice, isLoading: appointmentInvoiceLoading } = useQuery({
    queryKey: ["/api/invoices/by-service", "appointments", appointmentIdStr],
    enabled: !!showAppointmentDetails && !!selectedAppointment && !!appointmentIdStr && user?.role === "admin",
    retry: false,
    queryFn: async () => {
      if (!appointmentIdStr) return null;
      try {
        const params = new URLSearchParams({ serviceType: "appointments", appointmentId: appointmentIdStr });
        const response = await apiRequest("GET", `/api/invoices/by-service?${params.toString()}`);
        const data = await response.json();
        return data;
      } catch (err: any) {
        if (err?.message?.includes("404") || err?.message?.includes("not found")) return null;
        throw err;
      }
    },
  });

  const { data: treatmentsList = [], isLoading: isTreatmentsLoading } = useQuery({
    queryKey: ["/api/pricing/treatments"],
    enabled: showNewAppointment || user?.role === "admin",
    staleTime: 60000,
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/pricing/treatments");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Treatments fetch error:", error);
        return [];
      }
    },
  });

  const currencyCodeForTreatments =
    Array.isArray(treatmentsList) && treatmentsList.length > 0
      ? String((treatmentsList[0] as any)?.currency ?? "GBP")
      : "GBP";

  const { data: consultationServices = [], isLoading: isConsultationsLoading } = useQuery({
    queryKey: ["/api/pricing/doctors-fees"],
    enabled: showNewAppointment || user?.role === "admin",
    staleTime: 60000,
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/pricing/doctors-fees");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Consultation services fetch error:", error);
        return [];
      }
    },
  });

  const currencyCodeForConsultations =
    Array.isArray(consultationServices) && consultationServices.length > 0
      ? String((consultationServices[0] as any)?.currency ?? "GBP")
      : "GBP";

  const [showAddConsultationDialog, setShowAddConsultationDialog] = useState(false);
  const [isSavingConsultations, setIsSavingConsultations] = useState(false);
  const [consultationError, setConsultationError] = useState("");
  const [consultationActive, setConsultationActive] = useState(true);
  const [consultationForm, setConsultationForm] = useState<{
    doctorRole: string;
    doctorName: string;
    doctorId: number | null;
  }>({ doctorRole: "", doctorName: "", doctorId: null });

  const [multipleConsultationServices, setMultipleConsultationServices] = useState<
    Array<{ serviceName: string; serviceCode: string; category: string; basePrice: string }>
  >([{ serviceName: "", serviceCode: "", category: "", basePrice: "" }]);

  const openAddConsultationsPopup = () => {
    const providerIdNum = selectedProviderId ? parseInt(String(selectedProviderId), 10) : NaN;
    const provider = Array.isArray(filteredUsers)
      ? filteredUsers.find((u: any) => String(u?.id) === String(selectedProviderId))
      : null;

    setConsultationError("");
    setConsultationActive(true);
    setMultipleConsultationServices([{ serviceName: "", serviceCode: "", category: "", basePrice: "" }]);
    setConsultationForm({
      doctorRole: selectedRole || "",
      doctorName: provider ? `${provider.firstName} ${provider.lastName}` : "",
      doctorId: Number.isNaN(providerIdNum) ? null : providerIdNum,
    });
    setShowAddConsultationDialog(true);
  };

  const handleSaveConsultations = async () => {
    if (!consultationForm.doctorId) {
      setConsultationError("Please select a role and name first.");
      return;
    }

    const validServices = multipleConsultationServices.filter(
      (s) => String(s.serviceName || "").trim() && String(s.basePrice || "").trim(),
    );
    if (validServices.length === 0) {
      setConsultationError("Please add at least one service with name and price.");
      return;
    }

    const invalid = validServices.filter((s) => Number.isNaN(parseFloat(s.basePrice)) || parseFloat(s.basePrice) < 0);
    if (invalid.length > 0) {
      setConsultationError("All services must have a valid price (number ≥ 0).");
      return;
    }

    setConsultationError("");
    setIsSavingConsultations(true);
    try {
      // Optional duplicate check (same endpoint used in Billing)
      try {
        const body = { serviceNames: validServices.map((s) => String(s.serviceName || "").trim()), doctorId: consultationForm.doctorId };
        await apiRequest("POST", "/api/pricing/doctors-fees/check-duplicates", body as any);
      } catch {
        // ignore; backend may not enforce here
      }

      for (const service of validServices) {
        const payload: any = {
          serviceName: String(service.serviceName || "").trim(),
          serviceCode: String(service.serviceCode || "").trim() || null,
          category: String(service.category || "").trim() || null,
          doctorId: consultationForm.doctorId,
          doctorName: consultationForm.doctorName,
          doctorRole: consultationForm.doctorRole,
          basePrice: parseFloat(service.basePrice) || 0,
          isActive: !!consultationActive,
          currency: currencyCodeForConsultations,
          version: 1,
        };
        await apiRequest("POST", "/api/pricing/doctors-fees", payload);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/pricing/doctors-fees"] });
      await queryClient.refetchQueries({ queryKey: ["/api/pricing/doctors-fees"] });
      setShowAddConsultationDialog(false);
      toast({ title: "Doctor fees added", description: `${validServices.length} service(s) added successfully.` });
    } catch (err: any) {
      setConsultationError(err?.message || "Failed to add doctor fees.");
      toast({ title: "Error", description: err?.message || "Failed to add doctor fees.", variant: "destructive" });
    } finally {
      setIsSavingConsultations(false);
    }
  };

  const treatmentsMap = useMemo(() => {
    const map = new Map<number, { color: string; name: string }>();
    treatmentsList.forEach((treatment: any) => {
      if (treatment?.id) {
        map.set(treatment.id, {
          color: treatment.colorCode || "#D1D5DB",
          name: treatment.name || "Treatment",
        });
      }
    });
    return map;
  }, [treatmentsList]);

  const consultationMap = useMemo(() => {
    const map = new Map<number, { name: string; color: string }>();
    consultationServices.forEach((service: any) => {
      if (service?.id) {
        map.set(service.id, {
          name: service.serviceName || "Consultation",
          color: service.colorCode || "#6366F1",
        });
      }
    });
    return map;
  }, [consultationServices]);

  /** Provider line for duplicate copy (Dr./Nurse prefix by role). */
  const formatDuplicateProviderDisplayName = useCallback((providerId: number | string | null | undefined) => {
    if (providerId == null || providerId === "") return "the selected provider";
    const u = usersData?.find((x: any) => Number(x.id) === Number(providerId));
    if (!u) return "the selected provider";
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Provider";
    const r = String(u.role || "").toLowerCase();
    if (r === "nurse") return `Nurse ${name}`;
    if (r === "doctor" || isDoctorLike(u.role)) return `Dr. ${name}`;
    return name;
  }, [usersData]);

  /** Treatment/consultation label for duplicate card + sentences. */
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
    [treatmentsList, consultationServices]
  );

  const findDuplicateServiceAppointment = useCallback(
    (patientIdStr: string, appointmentsList?: any[]) => {
      const list = appointmentsList ?? appointmentsData;
      if (!list || !newAppointmentDate || !selectedProviderId || !appointmentType) return null;
      const selectedDateStr = format(newAppointmentDate, "yyyy-MM-dd");
      const normType = appointmentType as "treatment" | "consultation";
      const tid = normType === "treatment" ? appointmentSelectedTreatment?.id ?? null : null;
      const cid = normType === "consultation" ? appointmentSelectedConsultation?.id ?? null : null;

      if (normType === "treatment" && tid == null) return null;
      if (normType === "consultation" && cid == null) return null;

      return (
        list.find((apt: any) => {
          if (!isServiceDuplicateBlockingStatus(apt.status)) return false;
          const aptDateStr = format(parseScheduledAtAsLocal(apt.scheduledAt), "yyyy-MM-dd");
          const aptPatient = apt.patientId ?? apt.patient_id;
          const aptProvider = apt.providerId ?? apt.provider_id;
          if (String(aptPatient) !== patientIdStr) return false;
          if (String(aptProvider) !== selectedProviderId) return false;
          if (aptDateStr !== selectedDateStr) return false;
          const aptKind = String(apt.appointmentType || apt.appointment_type || "").toLowerCase();
          if (normType === "treatment") {
            const aptTid = apt.treatmentId ?? apt.treatment_id;
            return aptKind === "treatment" && Number(aptTid) === Number(tid);
          }
          const aptCid = apt.consultationId ?? apt.consultation_id;
          return aptKind === "consultation" && Number(aptCid) === Number(cid);
        }) ?? null
      );
    },
    [
      appointmentsData,
      newAppointmentDate,
      selectedProviderId,
      appointmentType,
      appointmentSelectedTreatment,
      appointmentSelectedConsultation,
    ]
  );

  // Patient-only duplicate detection: same patient + provider + same service, any date/time
  const findDuplicateServiceAppointmentAnyDate = useCallback(
    (patientIdStr: string, appointmentsList?: any[]) => {
      const list = appointmentsList ?? appointmentsData;
      if (!list || !selectedProviderId || !appointmentType) return null;
      const normType = appointmentType as "treatment" | "consultation";
      const tid = normType === "treatment" ? appointmentSelectedTreatment?.id ?? null : null;
      const cid = normType === "consultation" ? appointmentSelectedConsultation?.id ?? null : null;

      if (normType === "treatment" && tid == null) return null;
      if (normType === "consultation" && cid == null) return null;

      return (
        list.find((apt: any) => {
          if (!isServiceDuplicateBlockingStatus(apt.status)) return false;
          const aptPatient = apt.patientId ?? apt.patient_id;
          const aptProvider = apt.providerId ?? apt.provider_id;
          if (String(aptPatient) !== patientIdStr) return false;
          if (String(aptProvider) !== selectedProviderId) return false;
          const aptKind = String(apt.appointmentType || apt.appointment_type || "").toLowerCase();
          if (normType === "treatment") {
            const aptTid = apt.treatmentId ?? apt.treatment_id;
            return aptKind === "treatment" && Number(aptTid) === Number(tid);
          }
          const aptCid = apt.consultationId ?? apt.consultation_id;
          return aptKind === "consultation" && Number(aptCid) === Number(cid);
        }) ?? null
      );
    },
    [
      appointmentsData,
      selectedProviderId,
      appointmentType,
      appointmentSelectedTreatment,
      appointmentSelectedConsultation,
    ],
  );

  useEffect(() => {
    if (!editingAppointment) return;
    if (
      editAppointmentType === "treatment" &&
      editingAppointment.treatmentId &&
      !editAppointmentSelectedTreatment
    ) {
      const match = treatmentsList.find((treatment: any) => treatment.id === editingAppointment.treatmentId);
      if (match) {
        setEditAppointmentSelectedTreatment(match);
      }
    }
    if (
      editAppointmentType === "consultation" &&
      editingAppointment.consultationId &&
      !editAppointmentSelectedConsultation
    ) {
      const match = consultationServices.find((service: any) => service.id === editingAppointment.consultationId);
      if (match) {
        setEditAppointmentSelectedConsultation(match);
      }
    }
  }, [
    editingAppointment,
    editAppointmentType,
    treatmentsList,
    consultationServices,
    editAppointmentSelectedTreatment,
    editAppointmentSelectedConsultation,
  ]);

  // Fetch all shifts for the selected provider to determine available dates
  const { data: allProviderShifts } = useQuery({
    queryKey: ["/api/shifts/provider", selectedProviderId],
    staleTime: 30000,
    enabled: !!selectedProviderId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/shifts?staffId=${selectedProviderId}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch shifts for the selected date when provider is selected
  const { data: shiftsData } = useQuery({
    queryKey: ["/api/shifts", newAppointmentDate ? format(newAppointmentDate, 'yyyy-MM-dd') : null],
    staleTime: 30000,
    enabled: !!newAppointmentDate,
    queryFn: async () => {
      const dateStr = format(newAppointmentDate!, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/shifts?date=${dateStr}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch default shifts for fallback when no custom shifts exist
  const { data: defaultShiftsData = [] } = useQuery({
    queryKey: ["/api/default-shifts"],
    staleTime: 60000,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/default-shifts?forBooking=true');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const hasAnyShiftForProvider = useCallback(
    (providerId: string) => {
      if (!providerId) return false;

      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      const isCustomShiftRelevant = (shift: any) => {
        if (!shift || shift.staffId?.toString() !== providerId) return false;
        const shiftDateStr =
          shift.date instanceof Date
            ? format(shift.date, "yyyy-MM-dd")
            : shift.date?.substring(0, 10);

        if (!shiftDateStr) return false;

        if (shiftDateStr > todayStr) return true;
        if (shiftDateStr < todayStr) return false;

        return shift.endTime >= currentTime;
      };

      const hasCustom = allProviderShifts?.some(isCustomShiftRelevant);

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

      const hasDefaultShift = defaultShiftsData?.some((shift: any) => {
        if (!shift || shift.userId?.toString() !== providerId) return false;
        const workingDays = (shift.workingDays || []).map((day: string) => {
          return dayNameToIndex[day.toLowerCase()] ?? -1;
        });
        const dayInFuture = workingDays.some((dayIndex: number) => {
          if (dayIndex === -1) return false;
          return (
            dayIndex > todayIndex ||
            (dayIndex === todayIndex && shift.endTime >= currentTime)
          );
        });
        return dayInFuture;
      });

      return Boolean(hasCustom || hasDefaultShift);
    },
    [allProviderShifts, defaultShiftsData],
  );

  // Generate time slots with two-tier system: custom shifts OR default shifts
  const timeSlots = useMemo(() => {
    // If no provider or date selected, return empty array
    if (!selectedProviderId || !newAppointmentDate) {
      return [];
    }

    // TIER 1: Check for custom shifts for the selected provider AND date
    const selectedDateStr = format(newAppointmentDate, 'yyyy-MM-dd');
    let providerShifts = shiftsData?.filter((shift: any) => {
      // Filter by staff ID
      if (shift.staffId.toString() !== selectedProviderId) return false;
      
      // Filter by selected date
      const shiftDateStr = shift.date instanceof Date 
        ? format(shift.date, 'yyyy-MM-dd')
        : shift.date.substring(0, 10);
      
      return shiftDateStr === selectedDateStr;
    }) || [];

    console.log(`[TIME_SLOTS] Provider ${selectedProviderId}, Date: ${format(newAppointmentDate, 'yyyy-MM-dd EEEE')}`);
    console.log(`[TIME_SLOTS] Custom shifts found: ${providerShifts.length}`, providerShifts);

    // TIER 2: If no custom shifts, use default shifts from doctor_default_shifts
    if (providerShifts.length === 0 && defaultShiftsData.length > 0) {
      console.log('[TIME_SLOTS] No custom shifts, checking default shifts...');
      
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId.toString() === selectedProviderId
      );

      if (defaultShift) {
        const dayOfWeek = format(newAppointmentDate, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        
        console.log(`[TIME_SLOTS] Day: ${dayOfWeek}, Working days:`, workingDays);
        
        if (workingDays.includes(dayOfWeek)) {
          providerShifts = [{
            staffId: defaultShift.userId,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            date: newAppointmentDate,
            isDefault: true
          }];
          console.log('[TIME_SLOTS] Using default shift:', providerShifts[0]);
        } else {
          console.log('[TIME_SLOTS] Not a working day');
        }
      } else {
        console.log('[TIME_SLOTS] No default shift found');
      }
    }

    // If still no shifts found, return empty array
    if (!providerShifts || providerShifts.length === 0) {
      console.log('[TIME_SLOTS] No shifts available');
      return [];
    }

    const allSlots: string[] = [];

    // Generate time slots for each shift
    for (const shift of providerShifts) {
      // Parse start and end times from shift
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      // Generate 15-minute interval slots between start and end time
      // Use < instead of <= because we can't start an appointment AT the end time
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const period = currentHour < 12 ? 'AM' : 'PM';
        const timeString = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;
        
        // Only add if not already in the array (avoid duplicates from overlapping shifts)
        if (!allSlots.includes(timeString)) {
          allSlots.push(timeString);
        }

        // Move to next 15-minute slot
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

    console.log(`[TIME SLOTS] Generated ${allSlots.length} slots for provider ${selectedProviderId}:`, allSlots);
    console.log(`[TIME SLOTS] From ${providerShifts.length} shifts:`, providerShifts);

    // Filter out past time slots if the selected date is today
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    
    if (selectedDateStr === todayStr) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const filteredSlots = allSlots.filter(slot => {
        const slot24h = timeSlotTo24Hour(slot);
        return slot24h > currentTime;
      });
      
      console.log(`[TIME SLOTS] Filtered past time slots. Before: ${allSlots.length}, After: ${filteredSlots.length}`);
      return filteredSlots;
    }

    return allSlots;
  }, [selectedProviderId, newAppointmentDate, shiftsData, defaultShiftsData, selectedDuration]);

  useEffect(() => {
    if (user?.role !== "admin" || !showNewAppointment) {
      return;
    }

    if (!selectedProviderId) {
      setShiftWarning("");
      return;
    }

    if (!hasAnyShiftForProvider(selectedProviderId)) {
      setShiftWarning("please create shifts from Shift Management");
    } else {
      setShiftWarning("");
    }
  }, [
    showNewAppointment,
    user?.role,
    selectedProviderId,
    hasAnyShiftForProvider,
  ]);

  // *** CHANGE 4: Fetch shifts for EDIT appointment date ***
  const { data: editShiftsData } = useQuery({
    queryKey: ["/api/shifts", editAppointmentDate ? format(editAppointmentDate, 'yyyy-MM-dd') : null, "edit"],
    staleTime: 30000,
    enabled: !!editAppointmentDate && !!editingAppointment,
    queryFn: async () => {
      const dateStr = format(editAppointmentDate!, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/shifts?date=${dateStr}`);
      const data = await response.json();
      console.log('[EDIT TIME_SLOTS] Fetched shifts for date:', dateStr, data);
      return data;
    },
  });

  // *** CHANGE 4: Generate time slots for EDIT appointment dialog ***
  const editTimeSlots = useMemo(() => {
    // If no editing appointment or date selected, return empty array
    if (!editingAppointment || !editAppointmentDate) {
      console.log('[EDIT TIME_SLOTS] No editing appointment or date');
      return [];
    }

    // TIER 1: Check for custom shifts for the provider AND date
    const selectedDateStr = format(editAppointmentDate, 'yyyy-MM-dd');
    let providerShifts = editShiftsData?.filter((shift: any) => {
      // Filter by staff ID from the editing appointment's provider
      if (shift.staffId !== editingAppointment.providerId) return false;
      
      // Filter by selected date
      const shiftDateStr = shift.date instanceof Date 
        ? format(shift.date, 'yyyy-MM-dd')
        : shift.date.substring(0, 10);
      
      return shiftDateStr === selectedDateStr;
    }) || [];

    console.log(`[EDIT TIME_SLOTS] Provider ${editingAppointment.providerId}, Date: ${format(editAppointmentDate, 'yyyy-MM-dd EEEE')}`);
    console.log(`[EDIT TIME_SLOTS] Custom shifts found: ${providerShifts.length}`, providerShifts);

    // TIER 2: If no custom shifts, use default shifts from doctor_default_shifts
    if (providerShifts.length === 0 && defaultShiftsData.length > 0) {
      console.log('[EDIT TIME_SLOTS] No custom shifts, checking default shifts...');
      
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId === editingAppointment.providerId
      );

      if (defaultShift) {
        const dayOfWeek = format(editAppointmentDate, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        
        console.log(`[EDIT TIME_SLOTS] Day: ${dayOfWeek}, Working days:`, workingDays);
        
        if (workingDays.includes(dayOfWeek)) {
          providerShifts = [{
            staffId: defaultShift.userId,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            date: editAppointmentDate,
            isDefault: true
          }];
          console.log('[EDIT TIME_SLOTS] Using default shift:', providerShifts[0]);
        } else {
          console.log('[EDIT TIME_SLOTS] Not a working day');
        }
      } else {
        console.log('[EDIT TIME_SLOTS] No default shift found');
      }
    }

    // If still no shifts found, return empty array
    if (!providerShifts || providerShifts.length === 0) {
      console.log('[EDIT TIME_SLOTS] No shifts available');
      return [];
    }

    const allSlots: string[] = [];

    // Generate time slots for each shift
    for (const shift of providerShifts) {
      // Parse start and end times from shift
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      // Generate 15-minute interval slots between start and end time
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const period = currentHour < 12 ? 'AM' : 'PM';
        const timeString = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;
        
        // Only add if not already in the array
        if (!allSlots.includes(timeString)) {
          allSlots.push(timeString);
        }

        // Move to next 15-minute slot
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

    console.log(`[EDIT TIME_SLOTS] Generated ${allSlots.length} slots for provider ${editingAppointment.providerId}:`, allSlots);

    return allSlots;
  }, [editingAppointment, editAppointmentDate, editShiftsData, defaultShiftsData]);

  const isDataLoaded = !isUsersLoading && !isPatientsLoading;

  // Get filtered users by selected role
  const filteredUsers = usersData?.filter((user: any) => {
    if (!selectedRole) return false;
    return user.role === selectedRole;
  }) || [];

  const patientOverlapSelectedProviderIdForMessage = useMemo(() => {
    if (editingAppointment) {
      return editingAppointment.providerId ?? editingAppointment.provider_id;
    }
    return selectedProviderId;
  }, [editingAppointment, selectedProviderId]);

  const patientOverlapSelectedProviderDisplayName = useMemo(() => {
    const pid = patientOverlapSelectedProviderIdForMessage;
    if (pid == null || pid === "") return "the selected provider";
    const u = usersData?.find((x: any) => String(x.id) === String(pid));
    if (!u) return "the selected provider";
    const n = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return n || "the selected provider";
  }, [patientOverlapSelectedProviderIdForMessage, usersData]);

  const patientOverlapConflictProviderDisplayName = useMemo(() => {
    const pid =
      patientOverlapConflictRecord?.providerId ??
      patientOverlapConflictRecord?.provider_id ??
      null;
    if (pid == null || pid === "") return "";
    const u = usersData?.find((x: any) => String(x.id) === String(pid));
    if (!u) return "";
    const n = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return n;
  }, [patientOverlapConflictRecord, usersData]);

  // Map roles to dropdown options format from roles table, excluding 'patient', 'admin', and 'Administrator'
  const availableRoles = rolesData
    .filter((role: any) => {
      const roleName = (role.name || '').toLowerCase();
      return !['patient', 'admin', 'administrator'].includes(roleName);
    })
    .map((role: any) => role.name)
    .sort((a: string, b: string) => {
      // Sort alphabetically when user is admin
      if (user?.role === 'admin') {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      }
      return 0;
    });

  // Format date as local ISO string (no timezone conversion; no Z/+offset)
  // Format: "YYYY-MM-DDTHH:mm:ss" (no timezone indicator, backend should treat as-is)
  // IMPORTANT: Uses getHours(), getMinutes(), etc. (local time) NOT getUTCHours(), getUTCMinutes() (UTC)
  const formatLocalISOString = (date: Date): string => {
    // Use LOCAL time methods (not UTC methods) to avoid timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0'); // Local hours, not UTC
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Local minutes, not UTC
    const seconds = String(date.getSeconds()).padStart(2, '0'); // Local seconds, not UTC
    
    // Return without timezone indicator (no Z, no +/- offset)
    // Backend will parse this as local time components
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Helper functions
  const getPatientRecord = (patientId: number | string) => {
    if (!patientsData || !Array.isArray(patientsData)) return null;
    return (
      patientsData.find((p: any) =>
        p.id === patientId ||
        p.id === Number(patientId) ||
        String(p.id) === String(patientId) ||
        p.userId === patientId ||
        p.userId === Number(patientId) ||
        String(p.userId) === String(patientId)
      ) || null
    );
  };

  const getPatientName = (patientId: number | string) => {
    if (!patientsData || !Array.isArray(patientsData)) {
      console.warn(`[Calendar] patientsData not available, returning fallback for patientId: ${patientId}`);
      return "Patient not found";
    }
    // Try multiple matching strategies:
    // 1. Match by patient.id (primary)
    // 2. Match by patient.userId (in case patientId is actually a userId)
    // 3. Try both number and string comparison to handle type mismatches
    const patient = patientsData.find((p: any) => 
      p.id === patientId || 
      p.id === Number(patientId) || 
      String(p.id) === String(patientId) ||
      p.userId === patientId ||
      p.userId === Number(patientId) ||
      String(p.userId) === String(patientId)
    );
    if (patient) {
      const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      if (name) {
        return name;
      }
    }
    console.warn(`[Calendar] Patient not found for patientId: ${patientId}, patientsData length: ${patientsData.length}`);
    // Return "Patient not found" when patient record is not available or deleted
    return "Patient not found";
  };

  const getPatientAllergiesLabel = (patientId: number | string): string | null => {
    const patient = getPatientRecord(patientId);
    if (!patient) return null;

    const medicalHistoryAllergies = Array.isArray(patient.medicalHistory?.allergies)
      ? patient.medicalHistory.allergies
      : [];
    const directAllergies = Array.isArray(patient.allergies) ? patient.allergies : [];

    const normalized = [...medicalHistoryAllergies, ...directAllergies]
      .map((item: any) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

    const uniqueAllergies = Array.from(new Set(normalized));
    if (uniqueAllergies.length === 0) return null;
    return uniqueAllergies.join(", ");
  };

  const getPatientSpecialRequirementsLabel = (patientId: number | string): string | null => {
    const patient = getPatientRecord(patientId);
    const specialRequirements = (patient?.medicalHistory as any)?.specialRequirements;
    if (!specialRequirements || typeof specialRequirements !== "object") return null;
    if (specialRequirements.hasSpecialRequirements !== "yes") return null;

    const selected =
      specialRequirements.selected && typeof specialRequirements.selected === "object"
        ? specialRequirements.selected
        : {};
    const details =
      specialRequirements.details && typeof specialRequirements.details === "object"
        ? specialRequirements.details
        : {};

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

    const selectedItems = Object.entries(selected)
      .filter(([, checked]) => !!checked)
      .map(([key]) => {
        const label = labels[key] || key;
        const detail = details[key];
        return detail ? `${label}: ${detail}` : label;
      });

    if (selectedItems.length === 0) return null;
    return selectedItems.join(", ");
  };

  const selectedProvider = useMemo(() => {
    if (!selectedProviderId) return null;
    return filteredUsers.find((user: any) => user.id.toString() === selectedProviderId) || null;
  }, [filteredUsers, selectedProviderId]);

  const getProviderName = (providerId: number) => {
    if (!usersData || !Array.isArray(usersData)) return `Provider ${providerId}`;
    const provider = usersData.find((u: any) => u.id === providerId);
    console.log(`[Calendar] Looking up provider ${providerId}:`, provider);
    return provider ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim() : `Provider ${providerId}`;
  };

  const selectedProviderNameLower = selectedProvider
    ? `${selectedProvider.firstName || ""} ${selectedProvider.lastName || ""}`.trim().toLowerCase()
    : "";

  const editProviderInfo = useMemo(() => {
    if (!editingAppointment) return null;
    const provider = usersData?.find((user: any) => user.id === editingAppointment.providerId);
    const providerFullName = provider
      ? `${provider.firstName || ""} ${provider.lastName || ""}`.trim()
      : "";
    const fallbackName = providerFullName || `Provider ${editingAppointment.providerId ?? "Unknown"}`;
    const rawRole =
      provider?.role ||
      editingAppointment.assignedRole ||
      editingAppointment.providerRole ||
      editingAppointment.doctorRole ||
      "";
    const normalizedRole = rawRole.toString().trim().toLowerCase();
    return {
      providerId: editingAppointment.providerId?.toString() || "",
      role: normalizedRole,
      providerName: fallbackName,
      providerNameLower: providerFullName.toLowerCase(),
    };
  }, [editingAppointment, usersData]);

  const newAppointmentFilterContext = useMemo<ServiceFilterContext | null>(() => {
    if (!showNewAppointment || !selectedRole || !selectedProviderId) return null;
    const providerRole = selectedProvider?.role?.toString().trim().toLowerCase() || "";
    return {
      role: providerRole || selectedRole.toLowerCase().trim(),
      selectedRoleLower: selectedRole.toLowerCase().trim(),
      providerId: selectedProviderId,
      providerNameLower: selectedProviderNameLower,
    };
  }, [
    showNewAppointment,
    selectedRole,
    selectedProviderId,
    selectedProviderNameLower,
    selectedProvider,
  ]);

  const editAppointmentFilterContext = useMemo<ServiceFilterContext | null>(() => {
    if (!showEditAppointment || !editProviderInfo) return null;
    return {
      role: editProviderInfo.role,
      providerId: editProviderInfo.providerId,
      providerNameLower: editProviderInfo.providerNameLower,
    };
  }, [showEditAppointment, editProviderInfo]);

  const activeServiceFilterContext = editAppointmentFilterContext || newAppointmentFilterContext;

  const filteredTreatmentsForSelection = useMemo(() => {
    if (!activeServiceFilterContext) return [];
    return treatmentsList.filter((treatment: any) =>
      matchesDoctorSelection(treatment, activeServiceFilterContext)
    );
  }, [treatmentsList, activeServiceFilterContext]);

  const filteredConsultationsForSelection = useMemo(() => {
    if (!activeServiceFilterContext) return [];
    return consultationServices.filter((service: any) =>
      matchesDoctorSelection(service, activeServiceFilterContext)
    );
  }, [consultationServices, activeServiceFilterContext]);

  const availableAppointmentTypes = useMemo((): ("consultation" | "treatment")[] => {
    if (!activeServiceFilterContext) return [];
    return ["consultation", "treatment"];
  }, [activeServiceFilterContext]);

  const resetNewAppointmentServiceSelection = useCallback(() => {
    setAppointmentType("");
    setAppointmentSelectedTreatment(null);
    setAppointmentSelectedConsultation(null);
    setAppointmentTypeError("");
    setTreatmentSelectionError("");
    setConsultationSelectionError("");
  }, []);

  const hasNewAppointmentProviderContext = Boolean(selectedRole && selectedProviderId);

  const getCreatedByUser = (createdById: number | null | undefined) => {
    if (!createdById || !usersData || !Array.isArray(usersData)) return null;
    const creator = usersData.find((u: any) => u.id === createdById);
    return creator ? { name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(), role: creator.role } : null;
  };

  // Check if a date has shifts (custom or default)
  const hasShiftsOnDate = (date: Date): boolean => {
    if (!selectedProviderId) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check for custom shifts first
    const hasCustomShift = allProviderShifts?.some((shift: any) => {
      const shiftDateStr = shift.date.substring(0, 10);
      return shiftDateStr === dateStr && shift.staffId.toString() === selectedProviderId;
    });
    
    if (hasCustomShift) return true;
    
    // Check for default shifts - if the day is a working day
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId.toString() === selectedProviderId
      );
      
      if (defaultShift) {
        const dayOfWeek = format(date, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        return workingDays.includes(dayOfWeek);
      }
    }
    
    return false;
  };

  // *** FIX: Check if a date has shifts for EDIT mode (uses editing appointment's provider) ***
  const hasShiftsOnDateForEdit = (date: Date): boolean => {
    if (!editingAppointment) return false;
    
    const providerId = editingAppointment.providerId;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check for custom shifts first in allProviderShifts
    const hasCustomShift = allProviderShifts?.some((shift: any) => {
      const shiftDateStr = shift.date.substring(0, 10);
      return shiftDateStr === dateStr && shift.staffId === providerId;
    });
    
    if (hasCustomShift) return true;
    
    // Check for default shifts - if the day is a working day
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId === providerId
      );
      
      if (defaultShift) {
        const dayOfWeek = format(date, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        return workingDays.includes(dayOfWeek);
      }
    }
    
    return false;
  };

  // Process and validate appointments - show appointments even if patient data is still loading  
  const appointments = (appointmentsData && Array.isArray(appointmentsData) ? appointmentsData.filter((apt: any) => {
    const isValid = apt && apt.id && apt.scheduledAt;
    if (!isValid) {
      console.warn('[Calendar] Invalid appointment filtered out:', apt);
    }
    return isValid;
  }) : [])
    .map((apt: any) => {
      try {
        // Use patientName from backend if available, otherwise try to get it from patientsData
        const patientName = apt.patientName || getPatientName(apt.patientId);
        const providerName = apt.providerName || getProviderName(apt.providerId);
        const processed = {
          ...apt,
          patientName,
          providerName,
          // Ensure scheduledAt is valid
          scheduledAt: apt.scheduledAt
        };
        console.log("[Calendar] Processed appointment:", processed.id, processed.title, processed.patientName, processed.scheduledAt);
        return processed;
      } catch (error) {
        console.error('[Calendar] Error processing appointment:', apt.id, error);
        return null;
      }
    })
    .filter((apt: any) => apt !== null)
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  
  console.log("[Calendar] Final processed appointments count:", appointments.length);
  console.log("[Calendar] All appointments:", appointments.map((apt: any) => ({ id: apt.id, title: apt.title, scheduledAt: apt.scheduledAt })));

  useEffect(() => {
    if (!showProviderTimeConflict) return;
    if (providerTimeConflicts.length > 0) return;
    if (!pendingCreateAppointmentPayload?.providerId || !pendingCreateAppointmentPayload?.scheduledAt) return;

    const inferred = filterBlockingProviderConflicts(
      buildLocalProviderConflicts({
        providerId: Number(pendingCreateAppointmentPayload.providerId),
        scheduledAt: String(pendingCreateAppointmentPayload.scheduledAt || ""),
        duration: pendingCreateAppointmentPayload.duration,
        appointmentsList: appointments,
      }),
    );
    if (inferred.length > 0) {
      setProviderTimeConflicts(inferred);
      return;
    }

    (async () => {
      const serverConflicts = await fetchConflictDetailsFromServer(pendingCreateAppointmentPayload);
      if (serverConflicts.length > 0) {
        setProviderTimeConflicts(serverConflicts);
      } else {
        setShowProviderTimeConflict(false);
        setPendingCreateAppointmentPayload(null);
      }
    })();
  }, [
    showProviderTimeConflict,
    providerTimeConflicts.length,
    pendingCreateAppointmentPayload,
    buildLocalProviderConflicts,
    appointments,
    fetchConflictDetailsFromServer,
  ]);
  
  // Compute unique appointment IDs for the filter dropdown (admin only)
  const uniqueAppointmentIds = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    const ids = appointments
      .map((apt: any) => apt.appointmentId)
      .filter((id: string | undefined) => id !== undefined && id !== null && id !== "");
    return Array.from(new Set(ids)).sort();
  }, [appointments]);
  
  // Data processing complete
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const holidayCalendarRange = useMemo(
    () => ({
      from: format(calendarStart, "yyyy-MM-dd"),
      to: format(calendarEnd, "yyyy-MM-dd"),
    }),
    [calendarStart, calendarEnd],
  );

  const { data: holidayCalendarData } = useQuery({
    queryKey: ["/api/holiday-calendar", holidayCalendarRange.from, holidayCalendarRange.to],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/holiday-calendar?from=${holidayCalendarRange.from}&to=${holidayCalendarRange.to}`,
      );
      if (!response.ok) throw new Error("Failed to load holidays");
      return response.json() as Promise<{
        settings?: {
          weekendDays?: string[];
          weekendsNonWorking?: boolean;
        };
        holidays?: Array<{
          holidayDate: string;
          name: string;
          holidayType: string;
          allowShifts?: boolean;
          isWorkingDay?: boolean;
        }>;
      }>;
    },
    staleTime: 60_000,
  });

  const holidayCalendarSettings = holidayCalendarData?.settings;

  type CalendarDayHolidayStatus = {
    label: string;
    holidayType: "national" | "regional" | "company" | "weekend";
    source: "holiday" | "weekend";
  };

  const calendarHolidayByDate = useMemo(() => {
    const map = new Map<string, CalendarDayHolidayStatus>();
    for (const h of holidayCalendarData?.holidays ?? []) {
      const key = String(h.holidayDate).split("T")[0];
      const type = (h.holidayType === "regional" || h.holidayType === "company"
        ? h.holidayType
        : "national") as CalendarDayHolidayStatus["holidayType"];
      map.set(key, { label: h.name, holidayType: type, source: "holiday" });
    }
    return map;
  }, [holidayCalendarData?.holidays]);

  const isConfiguredWeekend = useCallback(
    (date: Date) => {
      if (!holidayCalendarSettings?.weekendsNonWorking) return false;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[date.getDay()];
      return (holidayCalendarSettings.weekendDays ?? ["Saturday", "Sunday"]).includes(dayName);
    },
    [holidayCalendarSettings],
  );

  const resolveCalendarDayStatus = useCallback(
    (date: Date): CalendarDayHolidayStatus | null => {
      const key = format(date, "yyyy-MM-dd");
      const explicit = calendarHolidayByDate.get(key);
      if (explicit) return explicit;
      if (isConfiguredWeekend(date)) {
        return { label: "", holidayType: "weekend", source: "weekend" };
      }
      return null;
    },
    [calendarHolidayByDate, isConfiguredWeekend],
  );

  const calendarDayHolidayCellClass = (
    holidayType: CalendarDayHolidayStatus["holidayType"] | undefined,
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

  const calendarDayHolidayLabelClass = (holidayType: CalendarDayHolidayStatus["holidayType"]) => {
    if (holidayType === "national") return "text-amber-900 dark:text-amber-100";
    if (holidayType === "regional") return "text-orange-900 dark:text-orange-100";
    if (holidayType === "company") return "text-purple-900 dark:text-purple-100";
    return "";
  };

  useEffect(() => {
    if (showNewAppointment) {
      setNewApptPickerMonth(newAppointmentDate ?? new Date());
    }
  }, [showNewAppointment, newAppointmentDate]);

  const newApptHolidayRange = useMemo(() => {
    const monthStart = startOfMonth(newApptPickerMonth);
    const monthEnd = endOfMonth(newApptPickerMonth);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return {
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };
  }, [newApptPickerMonth]);

  const { data: newApptHolidayData } = useQuery({
    queryKey: ["/api/holiday-calendar", "new-appointment", newApptHolidayRange.from, newApptHolidayRange.to],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/holiday-calendar?from=${newApptHolidayRange.from}&to=${newApptHolidayRange.to}`,
      );
      if (!response.ok) throw new Error("Failed to load holidays");
      return response.json() as Promise<{
        settings?: {
          weekendDays?: string[];
          weekendsNonWorking?: boolean;
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
    enabled: showNewAppointment,
    staleTime: 60_000,
  });

  type NewApptHolidayStatus = {
    label: string;
    holidayType: string;
    allowShifts: boolean;
    isWorkingDay: boolean;
    isNonWorking: boolean;
    source: "holiday" | "weekend";
  };

  const NEW_APPT_HOLIDAY_TYPE_LABELS: Record<string, string> = {
    national: "National",
    regional: "Regional",
    company: "Company",
    weekend: "Weekend",
  };

  const newApptHolidayByDate = useMemo(() => {
    const map = new Map<string, NewApptHolidayStatus>();
    const defaultAllow = newApptHolidayData?.settings?.defaultAllowShiftsOnHolidays ?? false;
    for (const h of newApptHolidayData?.holidays ?? []) {
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
  }, [newApptHolidayData?.holidays, newApptHolidayData?.settings?.defaultAllowShiftsOnHolidays]);

  const resolveNewApptHolidayStatus = useCallback(
    (date: Date): NewApptHolidayStatus | null => {
      const dateKey = format(date, "yyyy-MM-dd");
      const explicit = newApptHolidayByDate.get(dateKey);
      if (explicit) return explicit;

      const settings = newApptHolidayData?.settings;
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
    [newApptHolidayByDate, newApptHolidayData?.settings],
  );

  const isNewApptDateHolidayBlocked = useCallback(
    (date: Date) => {
      const status = resolveNewApptHolidayStatus(date);
      if (!status) return false;
      if (status.source === "holiday") return !status.allowShifts;
      return status.isNonWorking && !status.allowShifts;
    },
    [resolveNewApptHolidayStatus],
  );

  const newApptSelectedHolidayStatus = useMemo(
    () => (newAppointmentDate ? resolveNewApptHolidayStatus(newAppointmentDate) : null),
    [newAppointmentDate, resolveNewApptHolidayStatus],
  );

  useEffect(() => {
    setNewApptHolidayAcknowledged(false);
  }, [newAppointmentDate]);

  useEffect(() => {
    if (!showNewAppointment) {
      setNewApptHolidayAcknowledged(false);
    }
  }, [showNewAppointment]);

  const isNewApptConfiguredWeekend = useCallback(
    (date: Date) => {
      const settings = newApptHolidayData?.settings;
      if (!settings?.weekendsNonWorking) return false;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[date.getDay()];
      return (settings.weekendDays ?? ["Saturday", "Sunday"]).includes(dayName);
    },
    [newApptHolidayData?.settings],
  );

  const NewAppointmentPickerDay = useCallback(
    function NewAppointmentPickerDay(props: DayProps) {
      const buttonRef = useRef<HTMLButtonElement>(null);
      const dayRender = useDayRender(props.date, props.displayMonth, buttonRef);
      const dateKey = format(props.date, "yyyy-MM-dd");
      const holidayStatus = newApptHolidayByDate.get(dateKey);
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
                calendarDayHolidayLabelClass(holidayType),
              )}
            >
              {holidayLabel.length > 7 ? `${holidayLabel.slice(0, 6)}…` : holidayLabel}
            </span>
          )}
        </>
      );

      if (dayRender.isHidden) {
        return <></>;
      }

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
    [newApptHolidayByDate],
  );

  const newApptHolidayCalendarProps = useMemo(
    () => ({
      month: newApptPickerMonth,
      onMonthChange: setNewApptPickerMonth,
      modifiers: {
        nationalHoliday: (date: Date) =>
          newApptHolidayByDate.get(format(date, "yyyy-MM-dd"))?.holidayType === "national",
        regionalHoliday: (date: Date) =>
          newApptHolidayByDate.get(format(date, "yyyy-MM-dd"))?.holidayType === "regional",
        companyHoliday: (date: Date) =>
          newApptHolidayByDate.get(format(date, "yyyy-MM-dd"))?.holidayType === "company",
        configWeekend: (date: Date) => {
          const key = format(date, "yyyy-MM-dd");
          if (newApptHolidayByDate.has(key)) return false;
          return isNewApptConfiguredWeekend(date);
        },
      },
      classNames: {
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700 rounded-md",
        day_today:
          "bg-blue-100 text-blue-700 aria-selected:bg-blue-600 aria-selected:text-white rounded-md",
      },
      components: {
        Day: NewAppointmentPickerDay,
      },
    }),
    [newApptPickerMonth, newApptHolidayByDate, isNewApptConfiguredWeekend, NewAppointmentPickerDay],
  );

  const newApptHolidayLegend = (
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

  const newApptHolidayBanner = newApptSelectedHolidayStatus ? (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-sm mb-3",
        newApptSelectedHolidayStatus.allowShifts
          ? "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100"
          : "border-red-300 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100",
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">
          {NEW_APPT_HOLIDAY_TYPE_LABELS[newApptSelectedHolidayStatus.holidayType] ?? "Holiday"}:{" "}
          {newApptSelectedHolidayStatus.label}
        </p>
        <p className="text-xs mt-1 opacity-90">
          {newApptSelectedHolidayStatus.allowShifts
            ? "Appointments are allowed with a confirmation warning."
            : "Appointments cannot be booked on this date."}
          {newApptSelectedHolidayStatus.isWorkingDay ? " · Marked as a working holiday." : ""}
        </p>
      </div>
    </div>
  ) : null;

  const isNewApptDateDisabled = useCallback(
    (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return true;
      if (isNewApptDateHolidayBlocked(date)) return true;
      return !hasShiftsOnDate(date);
    },
    [isNewApptDateHolidayBlocked, hasShiftsOnDate],
  );

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt: any) => {
      // Extract date without timezone conversion: "2025-11-17T22:45:00" -> "2025-11-17"
      const aptDateString = apt.scheduledAt.substring(0, 10);
      const selectedDateString = format(date, 'yyyy-MM-dd');
      const result = aptDateString === selectedDateString;
      return result;
    });
  };

  /** Month grid dots: treatments always use pricing `colorCode`; only consultations use fixed blue. */
  const CONSULTATION_DOT_COLOR = "#4A7DFF";
  const TREATMENT_DOT_FALLBACK = "#D1D5DB";

  const getAppointmentDotColor = (appointment: any) => {
    const aptType = String(appointment?.appointmentType || appointment?.appointment_type || "").toLowerCase();
    const tid = appointment?.treatmentId ?? appointment?.treatment_id;
    const cid = appointment?.consultationId ?? appointment?.consultation_id;

    if (aptType === "consultation") {
      return CONSULTATION_DOT_COLOR;
    }

    if (aptType === "treatment" && tid != null && !Number.isNaN(Number(tid))) {
      return treatmentsMap.get(Number(tid))?.color ?? TREATMENT_DOT_FALLBACK;
    }

    if (tid != null && !Number.isNaN(Number(tid))) {
      return treatmentsMap.get(Number(tid))?.color ?? TREATMENT_DOT_FALLBACK;
    }

    if (cid != null && !Number.isNaN(Number(cid))) {
      return CONSULTATION_DOT_COLOR;
    }

    const st = appointment?.status as keyof typeof statusBgColors;
    if (st && statusBgColors[st] && st !== "scheduled") {
      return statusBgColors[st];
    }
    return TREATMENT_DOT_FALLBACK;
  };

  const getAppointmentServiceInfo = (appointment: any) => {
    if (!appointment) return null;
    if (appointment.appointmentType === "treatment" && appointment.treatmentId) {
      const treatment = treatmentsMap.get(appointment.treatmentId);
      if (treatment) {
        return { label: treatment.name, color: treatment.color };
      }
      return { label: "Treatment", color: "#10B981" };
    }
    if (appointment.appointmentType === "consultation" && appointment.consultationId) {
      const consultation = consultationMap.get(appointment.consultationId);
      if (consultation) {
        return { label: consultation.name, color: consultation.color };
      }
      return { label: "Consultation", color: "#6366F1" };
    }
    return null;
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate).filter((apt: any) => {
    const st = String(apt?.status ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");

    // Never show "in_progress" appointments whose time window has already ended.
    // (Keep list focused on scheduled + currently ongoing.)
    if (st === "in_progress") {
      const startAt = apt?.scheduledAt ? parseScheduledAtAsLocal(apt.scheduledAt) : new Date(NaN);
      const dur = apt?.duration != null && Number(apt.duration) > 0 ? Number(apt.duration) : 30;
      const endAt = new Date(startAt.getTime() + dur * 60 * 1000);
      const now = new Date();
      if (!Number.isNaN(endAt.getTime()) && now >= endAt) {
        return false;
      }
    }

    // Apply appointment ID filter for admin users
    const matchesAppointmentId = appointmentIdFilter === "all" || apt.appointmentId === appointmentIdFilter;
    if (!matchesAppointmentId) return false;

    // Admin default: show only active statuses unless user selects otherwise
    if (user?.role === "admin") {
      if (adminStatusFilter === "all") return true;
      if (adminStatusFilter === "active") {
        return st === "scheduled" || st === "confirmed" || st === "in_progress";
      }
      if (adminStatusFilter === "scheduled") return st === "scheduled" || st === "confirmed";
      return st === adminStatusFilter;
    }

    return true;
  });

  const appointmentTimeTick = useAppointmentTimeTick();
  const nowForCardStyle = useMemo(() => new Date(), [appointmentTimeTick]);
  const sortedSelectedDateAppointments = useMemo(
    () =>
      sortAppointmentsByCardTimeKind(
        selectedDateAppointments,
        nowForCardStyle,
        parseScheduledAtAsLocal,
      ),
    [selectedDateAppointments, nowForCardStyle],
  );

  /** Admin: persist "ongoing" (time window) as `in_progress`, aligned with card time logic (not only server SQL/UTC). */
  const adminAutoPromoteOngoingLockRef = useRef(new Set<number>());
  useEffect(() => {
    if (user?.role !== "admin") return;
    if (!Array.isArray(appointments) || appointments.length === 0) return;
    const now = nowForCardStyle;

    for (const id of [...adminAutoPromoteOngoingLockRef.current]) {
      const apt = appointments.find((a: any) => Number(a.id) === id);
      if (!apt) {
        adminAutoPromoteOngoingLockRef.current.delete(id);
        continue;
      }
      const st = String(apt?.status ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
      const kind = getAppointmentCardTimeKind(apt, now, parseScheduledAtAsLocal);
      if (st === "in_progress" || kind !== "ongoing") {
        adminAutoPromoteOngoingLockRef.current.delete(id);
      }
    }

    for (const apt of appointments) {
      const id = Number(apt?.id);
      if (!Number.isFinite(id)) continue;
      const st = String(apt?.status ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
      if (st !== "scheduled" && st !== "confirmed") continue;
      if (getAppointmentCardTimeKind(apt, now, parseScheduledAtAsLocal) !== "ongoing") continue;
      if (adminAutoPromoteOngoingLockRef.current.has(id)) continue;

      adminAutoPromoteOngoingLockRef.current.add(id);
      void (async () => {
        try {
          const response = await apiRequest("PATCH", `/api/appointments/${id}`, {
            status: "in_progress",
          });
          if (!response.ok) {
            const t = await response.text();
            throw new Error(t || response.statusText);
          }
          await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
        } catch (e) {
          console.warn("[Calendar] Admin auto-promote ongoing → in_progress failed:", e);
          adminAutoPromoteOngoingLockRef.current.delete(id);
        }
      })();
    }
  }, [user?.role, appointments, nowForCardStyle, queryClient]);

  const nextUpcomingAppointmentId = useMemo(() => {
    // "Next" only applies when viewing today's schedule, not a future (or past) calendar date.
    if (!isToday(selectedDate)) return null;
    if (!Array.isArray(sortedSelectedDateAppointments) || sortedSelectedDateAppointments.length === 0) return null;
    const toStartEnd = (apt: any) => {
      const start = apt?.scheduledAt ? parseScheduledAtAsLocal(apt.scheduledAt) : new Date(NaN);
      const dur = apt?.duration != null && Number(apt.duration) > 0 ? Number(apt.duration) : 30;
      const end = new Date(start.getTime() + dur * 60 * 1000);
      return { start, end };
    };

    const isActiveForOngoing = (apt: any) => {
      const st = String(apt?.status ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
      return st === "scheduled" || st === "confirmed" || st === "in_progress";
    };

    const ongoing = sortedSelectedDateAppointments
      .map((apt: any) => ({ apt, ...toStartEnd(apt) }))
      .filter(({ apt }) => isActiveForOngoing(apt))
      .filter(({ start, end }) => !Number.isNaN(start.getTime()) && start <= nowForCardStyle && end > nowForCardStyle);

    const all = sortedSelectedDateAppointments
      .map((apt: any) => ({ apt, ...toStartEnd(apt) }))
      .filter(({ apt }) => isActiveForOngoing(apt))
      .filter(({ start }) => !Number.isNaN(start.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Preferred: if something is ongoing, "Next" means first appointment after the last ongoing ends.
    if (ongoing.length > 0) {
      const maxOngoingEnd = ongoing.reduce((acc, cur) => (cur.end > acc ? cur.end : acc), ongoing[0].end);
      // >= so back-to-back slots (next start === previous end) still get the "Next" badge.
      const afterOngoing = all.filter(({ start }) => start >= maxOngoingEnd);
      if (afterOngoing.length > 0) return Number(afterOngoing[0].apt.id);
    }

    // Fallback: first upcoming after now.
    const upcoming = all.filter(({ start }) => start > nowForCardStyle);
    return upcoming.length > 0 ? Number(upcoming[0].apt.id) : null;
  }, [selectedDate, sortedSelectedDateAppointments, nowForCardStyle]);

  if (isLoading) {
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

  const formatTime = (timeString: string) => {
    try {
      // Remove 'Z' to treat as local time and avoid timezone conversion
      const cleanTimeString = timeString.replace('Z', '');
      const date = new Date(cleanTimeString);
      return format(date, "h:mm a");
    } catch (error) {
      return "Invalid time";
    }
  };

  /** Admin: e.g. "12:45 PM – 1:15 PM · 30 minutes" from scheduledAt + duration (default 30 min). */
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

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            {format(selectedDate, "MMMM yyyy")}
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
            >
              Next
            </Button>
            {canCreateAppointments() && (
              <Button 
                onClick={() => {
                  if (user?.role === 'admin') {
                    setShowNewAppointment(true);
                  } else {
                    onNewAppointment?.();
                  }
                }}
                className="flex items-center gap-2"
                data-testid="button-new-appointment"
              >
                <Plus className="h-3 w-3" />
                New Appointment
              </Button>
            )}
            {user && user.role !== 'patient' && (
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => setShowShareBookingDialog(true)}
                data-testid="button-share-booking-link"
              >
                Share Booking Link
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-4 mb-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-600 dark:text-gray-300 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isCurrentMonth =
                day.getMonth() === selectedDate.getMonth() &&
                day.getFullYear() === selectedDate.getFullYear();
              const dayHolidayStatus = resolveCalendarDayStatus(day);
              const holidayLabel =
                dayHolidayStatus?.source === "holiday" ? dayHolidayStatus.label : "";
              
              return (
                <div
                  key={day.toString()}
                  title={holidayLabel || undefined}
                  className={cn(
                    "min-h-[58px] p-1 border rounded-md cursor-pointer transition-colors flex flex-col",
                    !isSelected && "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                    isSelected && "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
                    !isSelected &&
                      calendarDayHolidayCellClass(dayHolidayStatus?.holidayType, isSelected),
                    !isSelected &&
                      isCurrentDay &&
                      !dayHolidayStatus &&
                      "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500",
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center leading-tight",
                      !isCurrentMonth && !isSelected && "text-gray-300 dark:text-gray-600",
                      isCurrentMonth && !isSelected && "text-gray-900 dark:text-gray-100",
                      isSelected && "text-white",
                    )}
                  >
                    <span className="text-sm font-medium">{format(day, "d")}</span>
                    {holidayLabel && !isSelected && dayHolidayStatus && (
                      <span
                        className={cn(
                          "text-[9px] font-normal truncate max-w-full px-0.5 opacity-90 mt-0.5",
                          calendarDayHolidayLabelClass(dayHolidayStatus.holidayType),
                        )}
                      >
                        {holidayLabel.length > 8 ? `${holidayLabel.slice(0, 7)}…` : holidayLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-0.5 flex-1 justify-center">
                    {dayAppointments.slice(0, 3).map((appointment: any) => (
                      <div
                        key={appointment.id}
                        className="w-3 h-3 rounded-full cursor-pointer border border-white shadow-sm"
                        style={{
                          backgroundColor: getAppointmentDotColor(appointment)
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(appointment);
                          setShowAppointmentDetails(true);
                        }}
                        title={`${
                          user?.role === "admin"
                            ? formatAppointmentTimeRange(appointment)
                            : formatTime(appointment.scheduledAt)
                        } - ${appointment.patientName}`}
                      />
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        +{dayAppointments.length - 3}
                      </div>
                    )}
                  </div>
                </div>
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

      {/* Share Booking Link Dialog */}
      <Dialog open={showShareBookingDialog} onOpenChange={setShowShareBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Booking Link</DialogTitle>
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
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Doctor (optional)</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm bg-background"
                value={shareBookingDoctorId}
                onChange={(e) => setShareBookingDoctorId(e.target.value)}
              >
                <option value="">Any</option>
                {(usersData || [])
                  .filter((u: any) => ['doctor', 'nurse'].includes(String(u.role || '').toLowerCase()))
                  .map((u: any) => (
                    <option key={u.id} value={String(u.id)}>
                      {`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || `User #${u.id}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowShareBookingDialog(false)} disabled={isSharingBookingLink}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!shareBookingEmail.trim()) {
                  toast({ title: "Email required", description: "Please enter a valid patient email.", variant: "destructive" });
                  return;
                }
                setIsSharingBookingLink(true);
                try {
                  const payload: any = { email: shareBookingEmail.trim() };
                  if (shareBookingDoctorId) payload.doctorId = Number(shareBookingDoctorId);
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
                  setShareBookingDoctorId("");
                } catch (e: any) {
                  toast({ title: "Failed", description: e?.message || "Could not generate link", variant: "destructive" });
                } finally {
                  setIsSharingBookingLink(false);
                }
              }}
              disabled={isSharingBookingLink}
            >
              {isSharingBookingLink ? "Sending..." : "Send Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Selected Date Appointments */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
              <Calendar className="h-5 w-5 mr-2" />
              Appointments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
            {user?.role === "admin" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Status</span>
                <Select value={adminStatusFilter} onValueChange={(v) => setAdminStatusFilter(v as any)}>
                  <SelectTrigger className="h-8 w-[220px]" data-testid="select-admin-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Scheduled / In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedDateAppointments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No appointments scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {sortedSelectedDateAppointments.map((appointment: any) => {
                const serviceInfo = getAppointmentServiceInfo(appointment);
                const cardTimeKind = getAppointmentCardTimeKind(
                  appointment,
                  nowForCardStyle,
                  parseScheduledAtAsLocal,
                );
                return (
                  <div
                    key={appointment.id}
                    className={cn(
                      "relative flex items-center justify-between overflow-visible p-4 pt-8 border rounded-lg",
                      appointmentCardTimeBackgroundClass(cardTimeKind),
                      "ring-inset hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-600",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {(() => {
                      const st = String(appointment?.status ?? "")
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, "_");
                      const allowOngoing =
                        st === "scheduled" || st === "confirmed" || st === "in_progress";
                      return allowOngoing && cardTimeKind === "ongoing";
                    })() && (
                      <Badge
                        className={cn(
                          appointmentOngoingBadgeClassName,
                          appointmentOngoingBadgePositionClassName,
                        )}
                      >
                        Ongoing
                      </Badge>
                    )}
                    {(() => {
                      if (cardTimeKind !== "past") return false;
                      const st = String(appointment?.status ?? "")
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, "_");
                      // Show "Completed" badge for past appointments (grey background) unless explicitly non-completed outcomes.
                      return st !== "cancelled" && st !== "canceled" && st !== "rescheduled" && st !== "no_show";
                    })() && (
                      <Badge
                        className={cn(
                          appointmentOngoingBadgePositionClassName,
                          "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-slate-700/40 dark:text-gray-200 dark:border-slate-600 text-xs",
                        )}
                      >
                        Passed
                      </Badge>
                    )}
                    {nextUpcomingAppointmentId != null &&
                      Number(appointment.id) === Number(nextUpcomingAppointmentId) && (
                        <Badge
                          className={cn(
                            appointmentOngoingBadgePositionClassName,
                            "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 text-xs",
                          )}
                        >
                          Next
                        </Badge>
                      )}
                    {user?.role === 'admin' && appointment.appointmentId && (
                      <Badge
                        className="absolute top-1.5 left-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        ID: {appointment.appointmentId}
                      </Badge>
                    )}
                    <div 
                      className="flex items-center space-x-4 flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setShowAppointmentDetails(true);
                      }}
                    >
                      <div className="flex flex-col">
                        {user?.role === "admin" && editingListAppointmentId === Number(appointment.id) ? (
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <Select
                                value={listAppointmentStatusDraft || String(appointment.status || "scheduled")}
                                onValueChange={async (value) => {
                                  const next = String(value || "").toLowerCase();
                                  setListAppointmentStatusDraft(next);
                                  await updateAppointmentStatusMutation.mutateAsync({
                                    appointmentId: Number(appointment.id),
                                    status: next,
                                  });
                                  setEditingListAppointmentId(null);
                                }}
                              >
                                <SelectTrigger className="h-7 w-[160px]" data-testid={`select-status-${appointment.id}`}>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                  <SelectItem value="no_show">No Show</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingListAppointmentId(null);
                                }}
                                data-testid={`button-cancel-status-edit-${appointment.id}`}
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
                            className={cn(
                              user?.role === "admin" && "cursor-pointer select-none",
                              String(appointment.status || "")
                                .toLowerCase()
                                .trim()
                                .replace(/\s+/g, "_") === "rescheduled" &&
                                "border border-gray-600 bg-gray-100 text-black",
                            )}
                            style={{
                              backgroundColor:
                                statusBgColors[appointment.status as keyof typeof statusBgColors] ||
                                statusBgColors.scheduled,
                              color:
                                String(appointment.status || "")
                                  .toLowerCase()
                                  .trim()
                                  .replace(/\s+/g, "_") === "completed"
                                  ? "#000000"
                                  : String(appointment.status || "")
                                        .toLowerCase()
                                        .trim()
                                        .replace(/\s+/g, "_") === "in_progress"
                                    ? "#047857"
                                  : String(appointment.status || "")
                                        .toLowerCase()
                                        .trim()
                                        .replace(/\s+/g, "_") === "rescheduled"
                                    ? "#000000"
                                  : "#ffffff",
                            }}
                            onClick={(e) => {
                              if (user?.role !== "admin") return;
                              e.stopPropagation();
                              setEditingListAppointmentId(Number(appointment.id));
                              setListAppointmentStatusDraft(String(appointment.status || "scheduled"));
                            }}
                            data-testid={`badge-status-${appointment.id}`}
                          >
                            {String(appointment.status || "scheduled").replace("_", " ").toUpperCase()}
                            {user?.role === "admin" && <Edit className="h-3 w-3 ml-1 opacity-70" />}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {user?.role === "admin"
                              ? formatAppointmentTimeRange(appointment)
                              : formatTime(appointment.scheduledAt)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {appointment.patientName || getPatientName(appointment.patientId) || "Patient not found"}
                          </span>
                        </div>
                      {serviceInfo && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <span
                            className="inline-flex h-2 w-2 rounded-full"
                            style={{ backgroundColor: serviceInfo.color }}
                          />
                          Service: {serviceInfo.label}
                        </p>
                      )}
                      {user?.role === "admin" &&
                        appointment.description != null &&
                        String(appointment.description).trim() !== "" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Description: {String(appointment.description).trim()}
                          </p>
                        )}
                        {user?.role !== "admin" && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {appointment.duration || 30} minutes
                            </span>
                          </div>
                        )}
                        {user?.role === "admin" && (
                          <div className="w-full mt-2 flex flex-wrap gap-2">
                            {(() => {
                              const allergies = getPatientAllergiesLabel(appointment.patientId);
                              return allergies ? (
                                <Badge className="text-[10px] px-2 py-0.5 bg-white border border-yellow-400 text-amber-800 dark:bg-transparent dark:border-yellow-500/60 dark:text-amber-200 whitespace-normal">
                                  Allergies: {allergies}
                                </Badge>
                              ) : null;
                            })()}
                            {(() => {
                              const specialRequirements = getPatientSpecialRequirementsLabel(appointment.patientId);
                              return specialRequirements ? (
                                <Badge className="text-[10px] px-2 py-0.5 bg-white border border-gray-300 text-gray-700 dark:bg-transparent dark:border-gray-600 dark:text-gray-200 whitespace-normal">
                                  Special Requirements: {specialRequirements}
                                </Badge>
                              ) : null;
                            })()}
                          </div>
                        )}
                        {user?.role === "admin" && (
                          <AppointmentCardInvoice
                            appointmentId={appointment.appointmentId ?? (appointment as any).appointment_id ?? null}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-4">
                     
                        {(() => {
                          const provider = usersData?.find((u: any) => u.id === appointment.providerId);
                          const providerRole = provider?.role?.toLowerCase();
                          const titlePrefix = providerRole === 'nurse' ? 'Nurse' : 'Dr.';
                          return (
                            <div className="font-medium text-gray-900 dark:text-gray-100">{titlePrefix} {appointment.providerName}</div>
                          );
                        })()}
                        {user?.role === 'admin' && (() => {
                          const provider = usersData?.find((u: any) => u.id === appointment.providerId);
                          return provider && (provider.medicalSpecialtyCategory || provider.subSpecialty || provider.department) ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {provider.medicalSpecialtyCategory && <div>{provider.medicalSpecialtyCategory}</div>}
                              {provider.subSpecialty && <div>{provider.subSpecialty}</div>}
                              {!provider.medicalSpecialtyCategory && !provider.subSpecialty && provider.department && <div>{provider.department}</div>}
                            </div>
                          ) : null;
                        })()}
                        {(() => {
                          const createdBy = getCreatedByUser(appointment.createdBy);
                          return createdBy ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Created By: {createdBy.name} ({createdBy.role})
                            </div>
                          ) : null;
                        })()}
                        {user?.role !== "admin" &&
                          user?.role?.toLowerCase() !== "nurse" &&
                          user?.role?.toLowerCase() !== "doctor" &&
                          appointment.providerId &&
                          (() => {
                          const provider = usersData?.find((u: any) => u.id === appointment.providerId);
                          return provider ? (
                            <div className="mt-2">
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
                          ) : null;
                        })()}
                      </div>
                      {appointment.status !== 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelAppointment(appointment.id);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 border-red-300 dark:border-red-700"
                          data-testid={`cancel-appointment-${appointment.id}`}
                        >
                          Cancel Appointment
                        </Button>
                      )}
                      <div className="flex items-center space-x-1">
                        {canEditAppointments() && appointment.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAppointment(appointment);
                            }}
                            className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            data-testid={`edit-appointment-${appointment.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteAppointments() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAppointment(appointment.id, appointment.title);
                            }}
                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                            data-testid={`delete-appointment-${appointment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
        <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent
          className="max-w-2xl"
          onInteractOutside={(e) => {
            if (user?.role === "admin") e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (user?.role === "admin") e.preventDefault();
          }}
        >
          {selectedAppointment && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-blue-800 dark:text-blue-200">
                  Appointment Details
                </DialogTitle>
                  <DialogDescription>
                    {selectedAppointment.displayDate ||
                      selectedAppointment.appointmentDate ||
                      format(new Date(selectedAppointment.scheduledAt), "EEEE, MMMM d, yyyy")}
                  </DialogDescription>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    ID: {selectedAppointment.appointmentId || `APT-${selectedAppointment.id}`}
                  </p>
              </DialogHeader>
              
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mt-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      {!isEditingAppointmentStatus ? (
                        <Badge
                          variant="outline"
                          className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-pointer select-none"
                          onClick={() => {
                            if (user?.role !== "admin") return;
                            setAppointmentStatusDraft(String(selectedAppointment.status || "scheduled"));
                            setIsEditingAppointmentStatus(true);
                          }}
                          data-testid="badge-appointment-status"
                        >
                          <span>{String(selectedAppointment.status || "scheduled").toUpperCase()}</span>
                          {user?.role === "admin" && (
                            <Edit className="h-3 w-3 ml-1 opacity-70" />
                          )}
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <Select
                              value={appointmentStatusDraft || "scheduled"}
                              onValueChange={async (value) => {
                                const next = String(value || "").toLowerCase();
                                setAppointmentStatusDraft(next);
                                if (!selectedAppointment?.id) return;
                                await updateAppointmentStatusMutation.mutateAsync({
                                  appointmentId: Number(selectedAppointment.id),
                                  status: next,
                                });
                                setIsEditingAppointmentStatus(false);
                              }}
                            >
                              <SelectTrigger className="h-7 w-[160px]" data-testid="select-appointment-status">
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
                              onClick={() => setIsEditingAppointmentStatus(false)}
                              data-testid="button-cancel-status-edit"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {updatingStatusAppointmentId === Number(selectedAppointment.id) && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              Updating status...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span>
                      {user?.role === "admin" && selectedAppointment.scheduledAt
                        ? formatAppointmentTimeRange(selectedAppointment)
                        : selectedAppointment.startTime ||
                          selectedAppointment.time ||
                          selectedAppointment.timeSlot ||
                          formatAppointmentTimeUTC(selectedAppointment.scheduledAt) ||
                          "Time not set"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {(() => {
                        const patientName = selectedAppointment.patientName || getPatientName(selectedAppointment.patientId);
                        // Find patient to get email
                        const patient = patientsData?.find((p: any) => 
                          p.id === selectedAppointment.patientId || 
                          p.id === Number(selectedAppointment.patientId) || 
                          String(p.id) === String(selectedAppointment.patientId) ||
                          p.userId === selectedAppointment.patientId ||
                          p.userId === Number(selectedAppointment.patientId) ||
                          String(p.userId) === String(selectedAppointment.patientId)
                        );
                        const patientEmail = patient?.email || "";
                        return patientEmail ? `${patientName} (${patientEmail})` : patientName;
                      })()}
                    </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Service: {selectedAppointment.service || selectedAppointment.appointmentType || "N/A"}
                      </p>
                      {user?.role === "admin" &&
                        selectedAppointment.description != null &&
                        String(selectedAppointment.description).trim() !== "" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Description: {String(selectedAppointment.description).trim()}
                          </p>
                        )}
                    {user?.role !== "admin" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedAppointment.duration || 30} minutes
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Provider</p>
                      <p className="text-sm text-gray-800 dark:text-gray-100">
                        {(() => {
                          const providerName = selectedAppointment.providerName ||
                            getProviderName(selectedAppointment.providerId) ||
                            "Unknown Provider";
                          // Find provider to get email
                          const provider = usersData?.find((u: any) => u.id === selectedAppointment.providerId);
                          const providerEmail = provider?.email || "";
                          return providerEmail ? `${providerName} (${providerEmail})` : providerName;
                        })()}
                      </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedAppointment.providerSpecialty || selectedAppointment.specialty || "General"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created By: {(() => {
                        const creator = getCreatedByUser(selectedAppointment.createdBy);
                        if (creator) {
                          // Find creator to get email
                          const creatorUser = usersData?.find((u: any) => u.id === selectedAppointment.createdBy);
                          const creatorEmail = creatorUser?.email || "";
                          return creatorEmail ? `${creator.name} (${creator.role}) (${creatorEmail})` : `${creator.name} (${creator.role})`;
                        }
                        // If created by patient, try to get patient email
                        const createdByPatient = patientsData?.find((p: any) => 
                          p.id === selectedAppointment.createdBy || 
                          p.userId === selectedAppointment.createdBy
                        );
                        const createdByPatientEmail = createdByPatient?.email || "";
                        const createdByName = selectedAppointment.createdByName || `${getPatientName(selectedAppointment.createdBy)} (patient)` || "N/A";
                        return createdByPatientEmail ? `${createdByName} (${createdByPatientEmail})` : createdByName;
                      })()}
                    </p>
                  </div>
                </div>

              {user?.role === "admin" && (
                <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-indigo-500" />
                      Invoice
                    </span>
                    {appointmentInvoice && (() => {
                      const st = String(appointmentInvoice.status ?? "").toLowerCase();
                      const cls =
                        st === "paid"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs font-semibold"
                          : st === "overdue"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 text-xs font-semibold"
                            : st === "unpaid"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0 text-xs font-semibold"
                              : st === "sent"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-xs font-semibold"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-0 text-xs font-semibold";
                      return <Badge className={cls}>{st || "—"}</Badge>;
                    })()}
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3 bg-white dark:bg-slate-900/30">
                    {appointmentInvoiceLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading invoice…
                      </div>
                    ) : appointmentInvoice ? (
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          <tr>
                            <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400 w-1/2">Invoice No.</td>
                            <td className="py-1.5 font-medium text-gray-900 dark:text-white text-right">
                              {appointmentInvoice.invoiceNumber ?? `#${appointmentInvoice.id}`}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">Status</td>
                            <td className="py-1.5 text-right">
                              {(() => {
                                const st = String(appointmentInvoice.status ?? "").toLowerCase();
                                const cls =
                                  st === "paid"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs font-semibold"
                                    : st === "overdue"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 text-xs font-semibold"
                                      : st === "unpaid"
                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0 text-xs font-semibold"
                                        : st === "sent"
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-xs font-semibold"
                                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-0 text-xs font-semibold";
                                return <Badge className={cls}>{st || "—"}</Badge>;
                              })()}
                            </td>
                          </tr>
                          {appointmentInvoice.totalAmount != null && (
                            <tr>
                              <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">Total Amount</td>
                              <td className="py-1.5 font-semibold text-gray-900 dark:text-white text-right">
                                £{Number(appointmentInvoice.totalAmount).toFixed(2)}
                              </td>
                            </tr>
                          )}
                          {appointmentInvoice.paidAmount != null && parseFloat(appointmentInvoice.paidAmount) > 0 && (
                            <tr>
                              <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">Paid Amount</td>
                              <td className="py-1.5 font-semibold text-green-700 dark:text-green-400 text-right">
                                £{Number(appointmentInvoice.paidAmount).toFixed(2)}
                              </td>
                            </tr>
                          )}
                          {(appointmentInvoice.invoiceDate ?? (appointmentInvoice as any).invoice_date) != null && (
                            <tr>
                              <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">Invoice Date</td>
                              <td className="py-1.5 text-gray-700 dark:text-gray-300 text-right">
                                {format(new Date((appointmentInvoice.invoiceDate ?? (appointmentInvoice as any).invoice_date) as string), "dd MMM yyyy")}
                              </td>
                            </tr>
                          )}
                          {(appointmentInvoice.dueDate ?? (appointmentInvoice as any).due_date) != null && (
                            <tr>
                              <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">Due Date</td>
                              <td className="py-1.5 text-gray-700 dark:text-gray-300 text-right">
                                {format(new Date((appointmentInvoice.dueDate ?? (appointmentInvoice as any).due_date) as string), "dd MMM yyyy")}
                              </td>
                            </tr>
                          )}
                          {appointmentInvoice.paymentMethod && appointmentInvoice.paymentMethod !== "Not Selected" && (
                            <tr>
                              <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">Payment Method</td>
                              <td className="py-1.5 text-gray-700 dark:text-gray-300 text-right capitalize">
                                {appointmentInvoice.paymentMethod}
                              </td>
                            </tr>
                          )}
                          {(appointmentInvoice.createdBy ?? (appointmentInvoice as any).created_by) != null && (
                            <tr>
                              <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">Created By</td>
                              <td className="py-1.5 text-gray-700 dark:text-gray-300 text-right">
                                {(() => {
                                  const createdById = appointmentInvoice.createdBy ?? (appointmentInvoice as any).created_by;
                                  const creator = getCreatedByUser(createdById);
                                  return creator ? `${creator.name} (${creator.role})` : `User #${createdById}`;
                                })()}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <div className="space-y-2 py-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No invoice found for this appointment.</p>
                        <button
                          type="button"
                          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          onClick={() => {
                            const sub = getActiveSubdomain() || getTenantSubdomain() || "demo";
                            const patient = patientsData?.find((p: any) =>
                              p.id === selectedAppointment.patientId ||
                              p.id === Number(selectedAppointment.patientId) ||
                              String(p.id) === String(selectedAppointment.patientId) ||
                              p.userId === selectedAppointment.patientId ||
                              p.userId === Number(selectedAppointment.patientId) ||
                              String(p.userId) === String(selectedAppointment.patientId)
                            );
                            const patientId = patient?.patientId || selectedAppointment.patientId || "";
                            const serviceDate = selectedAppointment.scheduledAt
                              ? new Date(selectedAppointment.scheduledAt).toISOString().split("T")[0]
                              : new Date().toISOString().split("T")[0];
                            const appointmentId = selectedAppointment.id || selectedAppointment.appointmentId || "";
                            const params = new URLSearchParams({
                              tab: "invoices",
                              createInvoice: "true",
                              patientId: String(patientId),
                              appointmentId: String(appointmentId),
                              serviceDate,
                            });
                            setLocation(`/${sub}/billing?${params.toString()}`);
                            setShowAppointmentDetails(false);
                          }}
                        >
                          Click here to add invoice
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 mt-6">
                {selectedAppointment.description?.trim() ? (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</Label>
                    <p className="mt-1">{selectedAppointment.description}</p>
                  </div>
                ) : null}
                
                {selectedAppointment.location?.trim() ? (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{selectedAppointment.location}</span>
                    {selectedAppointment.isVirtual && (
                      <Badge variant="outline" className="ml-2">
                        <Video className="h-3 w-3 mr-1" />
                        Virtual
                      </Badge>
                    )}
                  </div>
                ) : selectedAppointment.isVirtual ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="ml-2">
                      <Video className="h-3 w-3 mr-1" />
                      Virtual
                    </Badge>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="destructive"
                  className="px-4 py-2 font-semibold"
                  onClick={async () => {
                    try {
                      await apiRequest("DELETE", `/api/appointments/${selectedAppointment.id}`);
                      setShowAppointmentDetails(false);
                      refetch();
                      toast({
                        title: "Appointment Deleted",
                        description: "The appointment has been successfully deleted",
                      });
                    } catch (error) {
                      console.error("Error deleting appointment:", error);
                      
                      // Check if it's already deleted (404 error)
                      if ((error as any)?.message?.includes('404') || (error as any)?.message?.includes('not found')) {
                        setShowAppointmentDetails(false);
                        refetch();
                        toast({
                          title: "Appointment Deleted",
                          description: "The appointment has been successfully deleted",
                        });
                      } else {
                        toast({
                          title: "Error",
                          description: "Failed to delete appointment. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }
                  }}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  className="px-4 py-2"
                  onClick={() => setShowAppointmentDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Professional Anatomical Analysis Dialog */}
      <Dialog open={showAnatomicalViewer} onOpenChange={setShowAnatomicalViewer}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🔬</span>
              </div>
              Professional Anatomical Analysis
            </DialogTitle>
            <p className="text-gray-600 text-sm">Advanced facial muscle analysis with optimized container spacing</p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Optimized Image Container - Fits Snugly Around Content */}
            <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg" style={{ width: 'fit-content', margin: '0 auto' }}>
              <div className="relative" style={{ width: '700px', height: '800px' }}>
                <img 
                  key={currentImageIndex}
                  src={currentImageIndex === 0 ? anatomicalDiagramImage : facialDiagramImage}
                  alt={currentImageIndex === 0 ? "Facial muscle anatomy diagram with detailed muscle labels" : "Facial Anatomy Reference Diagram"}
                  className="rounded-lg transition-opacity duration-300"
                  style={{
                    height: '800px',
                    width: '700px',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    backgroundColor: 'white',
                    display: 'block'
                  }}
                />
                
                {/* Interactive muscle points overlaid on image */}
                {Object.entries(muscleCoordinates).map(([muscle, coords]) => (
                  <div
                    key={muscle}
                    className={`absolute w-4 h-4 rounded-full cursor-pointer transition-all duration-200 border-2 ${
                      selectedMuscleGroup === muscle 
                        ? 'bg-red-500 border-red-600 scale-150 shadow-lg' 
                        : 'bg-blue-500 border-blue-600 hover:bg-blue-400 hover:scale-125'
                    }`}
                    style={{
                      left: `${coords.x}px`,
                      top: `${coords.y}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}
                    onClick={() => setSelectedMuscleGroup(muscle)}
                    title={muscle.replace('_', ' ').toUpperCase()}
                  />
                ))}
              </div>
            </div>

            {/* Image Toggle Controls */}
            <div className="flex justify-center space-x-4">
              <Button
                variant={currentImageIndex === 0 ? "default" : "outline"}
                onClick={() => setCurrentImageIndex(0)}
                className="flex items-center space-x-2"
              >
                <span>🔬</span>
                <span>Detailed Anatomy</span>
              </Button>
              <Button
                variant={currentImageIndex === 1 ? "default" : "outline"}
                onClick={() => setCurrentImageIndex(1)}
                className="flex items-center space-x-2"
              >
                <span>📊</span>
                <span>Reference Diagram</span>
              </Button>
            </div>

            {/* Analysis Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <Label className="text-blue-800 font-semibold">Selected Muscle Group</Label>
                <div className="p-3 bg-white rounded border border-blue-300">
                  {selectedMuscleGroup ? (
                    <span className="text-blue-700 font-medium">
                      {selectedMuscleGroup.replace('_', ' ').toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-gray-500">Click on a muscle point above</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-blue-800 font-semibold">Analysis Type</Label>
                <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Select analysis type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength_assessment">Strength Assessment</SelectItem>
                    <SelectItem value="mobility_evaluation">Mobility Evaluation</SelectItem>
                    <SelectItem value="symmetry_analysis">Symmetry Analysis</SelectItem>
                    <SelectItem value="function_testing">Function Testing</SelectItem>
                    <SelectItem value="nerve_conduction">Nerve Conduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-blue-800 font-semibold">Treatment</Label>
                <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical_therapy">Physical Therapy</SelectItem>
                    <SelectItem value="botox_injection">Botox Injection</SelectItem>
                    <SelectItem value="muscle_stimulation">Electrical Muscle Stimulation</SelectItem>
                    <SelectItem value="massage_therapy">Massage Therapy</SelectItem>
                    <SelectItem value="surgical_intervention">Surgical Intervention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Treatment Plan Generation */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <Button
                  onClick={generateTreatmentPlan}
                  disabled={isGeneratingPlan || !selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                >
                  {isGeneratingPlan ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Treatment Plan
                    </>
                  )}
                </Button>
              </div>

              {generatedTreatmentPlan && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-800">Generated Treatment Plan</h3>
                    <Button
                      onClick={saveAnatomicalAnalysis}
                      disabled={isSavingAnalysis}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingAnalysis ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Analysis
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded border">
                    {generatedTreatmentPlan}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* ConsultationNotes Modal */}
      {showConsultationNotes && selectedAppointment && (
        <Dialog open={showConsultationNotes} onOpenChange={setShowConsultationNotes}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <ConsultationNotes
              patientId={selectedAppointment.patientId}
              patientName={selectedAppointment.patientName}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Full Consultation Interface Modal */}
      {showFullConsultation && selectedAppointment && (
        <FullConsultationWrapper
          patientId={selectedAppointment.patientId}
          show={showFullConsultation}
          onOpenChange={setShowFullConsultation}
        />
      )}

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto dark:border-gray-700 dark:bg-slate-800">
          <div className="p-2">
            <DialogHeader className="mb-6">
              <DialogTitle className="fs-3 font-bold text-blue-800 dark:text-blue-200">
                Create New Appointment
              </DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                Fill in the details to create a new appointment
              </DialogDescription>
            </DialogHeader>
          
          {user?.role === 'admin' && shiftWarning && (
            <Alert className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <AlertDescription className="flex-1">{shiftWarning}</AlertDescription>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const subdomain = localStorage.getItem("user_subdomain") || getTenantSubdomain();
                    window.location.href = `/${subdomain}/shifts?tab=default-shifts`;
                  }}
                >
                  Create Shifts
                </Button>
              </div>
            </Alert>
          )}

          {user?.role === 'admin' && !shiftWarning && missingDateTimeWarning && (
            <Alert className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 shadow-sm">
              <AlertDescription>{missingDateTimeWarning}</AlertDescription>
            </Alert>
          )}
            
            {user?.role === 'admin' ? (
              /* Admin Layout - Full Width with Rows */
              <div className="space-y-6">
                {/* Row 1: Select Role and Select Name */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Select Role
                    </Label>
                    <Popover open={openRoleCombo} onOpenChange={setOpenRoleCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openRoleCombo}
                          className="w-full justify-between mt-1"
                          data-testid="select-role"
                        >
                          {selectedRole
                            ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)
                            : "Choose a role..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search role..." />
                          <CommandList>
                            <CommandEmpty>No role found.</CommandEmpty>
                            <CommandGroup>
                              {availableRoles.map((role: string) => (
                                <CommandItem
                                  key={role}
                                  value={role}
                                  onSelect={(currentValue) => {
                                    setSelectedRole(currentValue);
                                    setSelectedProviderId(""); // Reset provider when role changes
                                    setProviderError(""); // Clear provider error
                                    resetNewAppointmentServiceSelection();
                                    setOpenRoleCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedRole === role ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Select Name
                    </Label>
                    <Popover open={openProviderCombo} onOpenChange={setOpenProviderCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openProviderCombo}
                          className="w-full justify-between mt-1"
                          data-testid="select-name"
                          disabled={!selectedRole}
                        >
                          {selectedProviderId && filteredUsers
                            ? (() => {
                                const provider = filteredUsers.find((u: any) => u.id.toString() === selectedProviderId);
                                return provider ? `${provider.firstName} ${provider.lastName}` : "Select a name...";
                              })()
                            : selectedRole ? "Select a name..." : "Select a role first"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search name..." />
                          <CommandList>
                            <CommandEmpty>No provider found.</CommandEmpty>
                            <CommandGroup>
                              {filteredUsers.map((user: any) => (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.firstName} ${user.lastName}`}
                                  onSelect={() => {
                                    setSelectedProviderId(user.id.toString());
                                    setProviderError(""); // Clear error when provider is selected
                                    resetNewAppointmentServiceSelection();
                                    setOpenProviderCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedProviderId === user.id.toString() ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {user.firstName} {user.lastName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {providerError && (
                      <p className="text-red-500 text-sm mt-1">{providerError}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Appointment Type</Label>
                    <Popover
                      open={openAppointmentTypeCombo}
                      onOpenChange={(open) => {
                        if (!hasNewAppointmentProviderContext) return;
                        setOpenAppointmentTypeCombo(open);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openAppointmentTypeCombo}
                          className="w-full justify-between mt-1"
                          data-testid="select-appointment-type"
                          disabled={!hasNewAppointmentProviderContext}
                        >
                          {appointmentType
                            ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
                            : hasNewAppointmentProviderContext
                              ? "Select an appointment type"
                              : "Select role and name first"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search appointment type..." />
                          <CommandList>
                            <CommandEmpty>No type found.</CommandEmpty>
                            <CommandGroup>
                              {availableAppointmentTypes.map((type) => (
                                <CommandItem
                                  key={type}
                                  value={type}
                                  onSelect={(currentValue) => {
                                    const normalized = currentValue as "consultation" | "treatment";
                                    setAppointmentType(normalized);
                                    setAppointmentSelectedTreatment(null);
                                    setAppointmentSelectedConsultation(null);
                                    setAppointmentTypeError("");
                                    setTreatmentSelectionError("");
                                    setConsultationSelectionError("");
                                    setOpenAppointmentTypeCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      appointmentType === type ? "opacity-100" : "opacity-0"
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
                    {appointmentTypeError && (
                      <p className="text-red-500 text-xs mt-1">{appointmentTypeError}</p>
                    )}
                    {!hasNewAppointmentProviderContext && (
                      <p className="text-xs text-gray-500 mt-1">Choose role and name to load appointment types.</p>
                    )}
                  </div>
                  <div>
                    {appointmentType === "treatment" && (
                      <>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Select Treatment</Label>
                        <Popover
                          open={openTreatmentCombo}
                          onOpenChange={(open) => {
                            if (!hasNewAppointmentProviderContext) return;
                            setOpenTreatmentCombo(open);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openTreatmentCombo}
                              className="w-full justify-between mt-1"
                              data-testid="select-treatment"
                              disabled={!hasNewAppointmentProviderContext}
                            >
                              {appointmentSelectedTreatment ? appointmentSelectedTreatment.name : "Select a treatment"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search treatments..." />
                              <CommandList>
                                {isTreatmentsLoading && (
                                  <CommandItem disabled>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading treatments...
                                  </CommandItem>
                                )}
                                <CommandEmpty>No treatments found.</CommandEmpty>
                                {!isTreatmentsLoading &&
                                  filteredTreatmentsForSelection.length === 0 &&
                                  selectedRole &&
                                  selectedProviderId && (
                                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenTreatmentCombo(false);
                                          openAddTreatmentsPopup();
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                                      >
                                        Add new treatments for this role and name
                                      </button>
                                    </div>
                                  )}
                                <CommandGroup>
                                    {filteredTreatmentsForSelection.map((treatment: any) => (
                                    <CommandItem
                                      key={treatment.id}
                                      value={`${treatment.name ?? ""} ${treatment.currency ?? ""} ${treatment.basePrice ?? ""}`.trim()}
                                      onSelect={() => {
                                        setAppointmentSelectedTreatment(treatment);
                                        setTreatmentSelectionError("");
                                        setOpenTreatmentCombo(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span
                                          className="inline-flex h-3 w-3 rounded-full border border-gray-300"
                                          style={{ backgroundColor: treatment.colorCode || "#D1D5DB" }}
                                        />
                                        <span className="flex-1 text-left">{treatment.name}</span>
                                        <span className="text-xs text-gray-500">
                                          {treatment.currency} {treatment.basePrice}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {(selectedRole && selectedProviderId) || appointmentSelectedTreatment ? (
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {selectedRole && selectedProviderId ? (
                              <button
                                type="button"
                                onClick={() => openAddTreatmentsPopup()}
                                className="text-sm text-blue-600 hover:text-blue-700 underline"
                                data-testid="link-add-treatments"
                              >
                                Add new treatments for this role and name
                              </button>
                            ) : (
                              <span />
                            )}
                            {appointmentSelectedTreatment ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-0 text-blue-600"
                                onClick={() => setAppointmentSelectedTreatment(null)}
                              >
                                Clear selection
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                        {treatmentSelectionError && (
                          <p className="text-red-500 text-xs mt-1">{treatmentSelectionError}</p>
                        )}
                      </>
                    )}
                    {appointmentType === "consultation" && (
                      <>
                        <Label className="text-sm font-medium text-gray-600">Select Consultation</Label>
                        <Popover
                          open={openConsultationCombo}
                          onOpenChange={(open) => {
                            if (!hasNewAppointmentProviderContext) return;
                            setOpenConsultationCombo(open);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openConsultationCombo}
                              className="w-full justify-between mt-1"
                              data-testid="select-consultation"
                              disabled={!hasNewAppointmentProviderContext}
                            >
                              {appointmentSelectedConsultation ? appointmentSelectedConsultation.serviceName : "Select a consultation"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search consultation..." />
                              <CommandList>
                                {isConsultationsLoading && (
                                  <CommandItem disabled>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading consultations...
                                  </CommandItem>
                                )}
                                <CommandEmpty>No consultations found.</CommandEmpty>
                                {!isConsultationsLoading &&
                                  filteredConsultationsForSelection.length === 0 &&
                                  selectedRole &&
                                  selectedProviderId && (
                                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenConsultationCombo(false);
                                          openAddConsultationsPopup();
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                                      >
                                        Add new consultations for this role and name
                                      </button>
                                    </div>
                                  )}
                                <CommandGroup>
                                  {filteredConsultationsForSelection.map((service: any) => (
                                    <CommandItem
                                      key={service.id}
                                      value={`${service.serviceName ?? ""} ${service.currency ?? ""} ${service.basePrice ?? ""}`.trim()}
                                      onSelect={() => {
                                        setAppointmentSelectedConsultation(service);
                                        setConsultationSelectionError("");
                                        setOpenConsultationCombo(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span className="flex-1 text-left">{service.serviceName}</span>
                                        <span className="text-xs text-gray-500">
                                          {service.currency} {service.basePrice}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedRole && selectedProviderId && (
                          <button
                            type="button"
                            onClick={() => openAddConsultationsPopup()}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                            data-testid="link-add-consultations"
                          >
                            Add new consultations for this role and name
                          </button>
                        )}
                        {appointmentSelectedConsultation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 px-0 text-blue-600"
                            onClick={() => setAppointmentSelectedConsultation(null)}
                          >
                            Clear selection
                          </Button>
                        )}
                        {consultationSelectionError && (
                          <p className="text-red-500 text-xs mt-1">{consultationSelectionError}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Row 2: Patient and Duration */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Patient</Label>
                    <Popover open={openPatientCombo} onOpenChange={setOpenPatientCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPatientCombo}
                          className="w-full justify-between mt-1"
                          data-testid="select-patient"
                        >
                          {newAppointmentData.patientId && patientsData
                            ? (() => {
                                const patient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                                return patient ? `${patient.firstName} ${patient.lastName} (${patient.patientId})` : "Select a patient";
                              })()
                            : "Select a patient"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search patient..." />
                          <CommandList>
                            <CommandEmpty>No patient found.</CommandEmpty>
                            <CommandGroup>
                              {patientDropdownGroups.flatMap(({ main, relatives }) => {
                                const rows = [
                                  { patient: main, isChild: false },
                                  ...relatives.map((p) => ({ patient: p, isChild: true })),
                                ];
                                return rows.map(({ patient, isChild }) => (
                                  <CommandItem
                                    key={patient.id}
                                    value={`${patient.firstName} ${patient.lastName} ${patient.patientId}`}
                                    onSelect={() => {
                                      setNewAppointmentData({ ...newAppointmentData, patientId: patient.id.toString() });
                                      setPatientError(""); // Clear error when patient is selected
                                      setOpenPatientCombo(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        newAppointmentData.patientId === patient.id.toString() ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    <span className="truncate">
                                      {isChild ? "↳ " : ""}
                                      {patient.firstName} {patient.lastName} ({patient.patientId})
                                    </span>
                                  </CommandItem>
                                ));
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {patientError && (
                      <p className="text-red-500 text-sm mt-1">{patientError}</p>
                    )}
                    {newAppointmentData.patientId && patientsData && (() => {
                      const selectedPatient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                      if (!selectedPatient) return null;
                      const email = getDisplayEmailForPatient(selectedPatient);
                      const relation = getPatientRelation(selectedPatient);
                      return (
                        <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/40 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                <span className="font-medium">Email:</span> {email || "-"}
                              </p>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {relation}
                            </Badge>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </Label>
                    <Select 
                      value={selectedDuration.toString()}
                      onValueChange={(value) => {
                        setSelectedDuration(parseInt(value));
                        setNewSelectedTimeSlot(""); // Reset time slot when duration changes
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-duration">
                        <SelectValue />
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

                {/* Row 3: Select Date and Select Time Slot */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Date Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Date</Label>
                    <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                      <CalendarComponent
                        mode="single"
                        selected={newAppointmentDate}
                        onSelect={(date) => {
                          if (!date) {
                            setNewAppointmentDate(undefined);
                            return;
                          }
                          if (isNewApptDateHolidayBlocked(date)) return;
                          setNewAppointmentDate(date);
                        }}
                        disabled={isNewApptDateDisabled}
                        className="rounded-md"
                        {...newApptHolidayCalendarProps}
                      />
                      {newApptHolidayLegend}
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Time Slot</Label>
                    <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                      {!newAppointmentDate ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-400 text-sm">Time slots will appear here</p>
                        </div>
                      ) : newApptSelectedHolidayStatus && !newApptHolidayAcknowledged ? (
                        <div className="flex flex-col justify-center h-full px-1">
                          {newApptHolidayBanner}
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            This date is a configured holiday. Review the notice above, then continue to choose a time slot.
                          </p>
                          <Button
                            type="button"
                            className="w-full"
                            onClick={() => setNewApptHolidayAcknowledged(true)}
                          >
                            Continue to time slots
                          </Button>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <p className="text-gray-500 text-sm font-medium">Time slot not available</p>
                            <p className="text-gray-400 text-xs mt-1">{format(newAppointmentDate, 'MMMM dd, yyyy')}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {newApptHolidayBanner}
                          <div className="grid grid-cols-2 gap-2">
                          {timeSlots.map((slot) => {
                            const providerForShift = selectedProviderId ? parseInt(selectedProviderId, 10) : null;
                            const inShift =
                              !!newAppointmentDate &&
                              (!providerForShift || isTimeSlotInShift(slot, newAppointmentDate, providerForShift));
                            const overlapsBooked =
                              !!newAppointmentDate && timeSlotHasBookingOverlap(newAppointmentDate, slot);
                            const looksUnavailable = !inShift || overlapsBooked;
                            const isSelected = newSelectedTimeSlot === slot;

                            return (
                              <Button
                                key={slot}
                                variant={isSelected ? "default" : "outline"}
                                className={`h-10 text-xs font-medium ${
                                  looksUnavailable
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300"
                                    : isSelected
                                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                                      : "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                }`}
                                disabled={looksUnavailable}
                                onClick={() => {
                                  if (!newAppointmentDate) return;
                                  
                                  // Validate if consecutive slots are available for the selected duration
                                  const validation = checkConsecutiveSlotsAvailable(newAppointmentDate, slot, selectedDuration);
                                  
                                  if (!validation.available) {
                                    // Show modal for admin users
                                    if (user?.role === 'admin') {
                                      setValidationErrorMessage(`Only ${validation.availableMinutes} minutes are available at ${slot}. Please select another time slot.`);
                                      setShowValidationError(true);
                                    } else {
                                      toast({
                                        title: "Insufficient Time Available",
                                        description: `Only ${validation.availableMinutes} minutes are available at ${slot}. Please select another time slot.`,
                                        variant: "destructive",
                                      });
                                    }
                                    return;
                                  }
                                  
                                  setNewSelectedTimeSlot(slot);
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
              </div>
            ) : (
              /* Non-Admin Layout - Original 3-column layout */
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Selection Fields */}
                <div className="col-span-2 space-y-6">
                  {/* Patient Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Patient</Label>
                    <Select 
                      value={newAppointmentData.patientId}
                      onValueChange={(value) => {
                        setNewAppointmentData({ ...newAppointmentData, patientId: value });
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-patient">
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patientDropdownGroups.flatMap(({ main, relatives }) => {
                          const rows = [
                            { patient: main, isChild: false },
                            ...relatives.map((p) => ({ patient: p, isChild: true })),
                          ];
                          return rows.map(({ patient, isChild }) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {isChild ? "↳ " : ""}
                              {patient.firstName} {patient.lastName} ({patient.patientId})
                            </SelectItem>
                          ));
                        })}
                      </SelectContent>
                    </Select>
                    {newAppointmentData.patientId && patientsData && (() => {
                      const selectedPatient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                      if (!selectedPatient) return null;
                      const email = getDisplayEmailForPatient(selectedPatient);
                      const relation = getPatientRelation(selectedPatient);
                      return (
                        <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/40 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                <span className="font-medium">Email:</span> {email || "-"}
                              </p>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {relation}
                            </Badge>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Role and Name Selection Row */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Select Role
                      </Label>
                      <Select 
                        value={selectedRole}
                        onValueChange={(value) => {
                          setSelectedRole(value);
                          setSelectedProviderId("");
                          resetNewAppointmentServiceSelection();
                        }}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-role">
                          <SelectValue placeholder="Choose a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role: string) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Select Name
                      </Label>
                      <Select 
                        value={selectedProviderId}
                        onValueChange={(value) => {
                          setSelectedProviderId(value);
                          resetNewAppointmentServiceSelection();
                        }}
                        disabled={!selectedRole}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-name">
                          <SelectValue placeholder={selectedRole ? "Select a name..." : "Select a role first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUsers.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Appointment Type & Service */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Appointment Type</Label>
                      <Select
                        value={appointmentType}
                        onValueChange={(value) => {
                          const normalized = value as "consultation" | "treatment";
                          setAppointmentType(normalized);
                          setAppointmentSelectedTreatment(null);
                          setAppointmentSelectedConsultation(null);
                          setAppointmentTypeError("");
                          setTreatmentSelectionError("");
                          setConsultationSelectionError("");
                        }}
                        disabled={!hasNewAppointmentProviderContext}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-appointment-type">
                          <SelectValue
                            placeholder={
                              hasNewAppointmentProviderContext
                                ? "Select an appointment type"
                                : "Select role and name first"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAppointmentTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {appointmentTypeError && (
                        <p className="text-red-500 text-xs mt-1">{appointmentTypeError}</p>
                      )}
                    </div>
                    <div>
                      {appointmentType === "treatment" && (
                        <>
                          <Label className="text-sm font-medium text-gray-600">Select Treatment</Label>
                          <Select
                            value={appointmentSelectedTreatment?.id?.toString() || ""}
                            onValueChange={(value) => {
                              const treatment = filteredTreatmentsForSelection.find(
                                (t: any) => t.id.toString() === value,
                              );
                              setAppointmentSelectedTreatment(treatment || null);
                              setTreatmentSelectionError("");
                            }}
                            disabled={!hasNewAppointmentProviderContext}
                          >
                            <SelectTrigger className="mt-1" data-testid="select-treatment">
                              <SelectValue placeholder="Select a treatment" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredTreatmentsForSelection.map((treatment: any) => (
                                <SelectItem key={treatment.id} value={treatment.id.toString()}>
                                  {treatment.name} ({treatment.currency} {treatment.basePrice})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {treatmentSelectionError && (
                            <p className="text-red-500 text-xs mt-1">{treatmentSelectionError}</p>
                          )}
                        </>
                      )}
                      {appointmentType === "consultation" && (
                        <>
                          <Label className="text-sm font-medium text-gray-600">Select Consultation</Label>
                          <Select
                            value={appointmentSelectedConsultation?.id?.toString() || ""}
                            onValueChange={(value) => {
                              const service = filteredConsultationsForSelection.find(
                                (s: any) => s.id.toString() === value,
                              );
                              setAppointmentSelectedConsultation(service || null);
                              setConsultationSelectionError("");
                            }}
                            disabled={!hasNewAppointmentProviderContext}
                          >
                            <SelectTrigger className="mt-1" data-testid="select-consultation">
                              <SelectValue placeholder="Select a consultation" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredConsultationsForSelection.map((service: any) => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                  {service.serviceName} ({service.currency} {service.basePrice})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {consultationSelectionError && (
                            <p className="text-red-500 text-xs mt-1">{consultationSelectionError}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Duration Selector */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </Label>
                    <Select 
                      value={selectedDuration.toString()}
                      onValueChange={(value) => {
                        setSelectedDuration(parseInt(value));
                        setNewSelectedTimeSlot("");
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Date</Label>
                    <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                      <CalendarComponent
                        mode="single"
                        selected={newAppointmentDate}
                        onSelect={(date) => {
                          if (!date) {
                            setNewAppointmentDate(undefined);
                            return;
                          }
                          if (isNewApptDateHolidayBlocked(date)) return;
                          setNewAppointmentDate(date);
                        }}
                        disabled={isNewApptDateDisabled}
                        className="rounded-md"
                        {...newApptHolidayCalendarProps}
                      />
                      {newApptHolidayLegend}
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Time Slot</Label>
                    <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                      {!newAppointmentDate ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-400 text-sm">Time slots will appear here</p>
                        </div>
                      ) : newApptSelectedHolidayStatus && !newApptHolidayAcknowledged ? (
                        <div className="flex flex-col justify-center h-full px-1">
                          {newApptHolidayBanner}
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            This date is a configured holiday. Review the notice above, then continue to choose a time slot.
                          </p>
                          <Button
                            type="button"
                            className="w-full"
                            onClick={() => setNewApptHolidayAcknowledged(true)}
                          >
                            Continue to time slots
                          </Button>
                        </div>
                      ) : (
                      <>
                      {newApptHolidayBanner}
                      <div className="grid grid-cols-2 gap-2">
                          {timeSlots.map((slot) => {
                            const providerForShift = selectedProviderId ? parseInt(selectedProviderId, 10) : null;
                            const inShift =
                              !!newAppointmentDate &&
                              (!providerForShift || isTimeSlotInShift(slot, newAppointmentDate, providerForShift));
                            const overlapsBooked =
                              !!newAppointmentDate && timeSlotHasBookingOverlap(newAppointmentDate, slot);
                            const looksUnavailable = !inShift || overlapsBooked;
                            const isSelected = newSelectedTimeSlot === slot;

                          return (
                            <Button
                              key={slot}
                              variant={isSelected ? "default" : "outline"}
                              className={`h-10 text-xs font-medium ${
                                looksUnavailable
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300"
                                  : isSelected
                                    ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                                    : "bg-green-500 hover:bg-green-600 text-white border-green-500"
                              }`}
                              disabled={looksUnavailable}
                              onClick={() => {
                                if (!newAppointmentDate) return;
                                
                                // Validate if consecutive slots are available for the selected duration
                                const validation = checkConsecutiveSlotsAvailable(newAppointmentDate, slot, selectedDuration);
                                
                                if (!validation.available) {
                                  toast({
                                    title: "Insufficient Time Available",
                                    description: `Only ${validation.availableMinutes} minutes are available at ${slot}. Please select another time slot.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setNewSelectedTimeSlot(slot);
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

                {/* Right Column - Patient Info & Booking Summary */}
                <div className="space-y-6">
                  {/* Patient Information */}
                  {newAppointmentData.patientId && patientsData && (() => {
                    const selectedPatient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                    if (!selectedPatient) return null;
                    
                    return (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Patient Information</h3>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            {selectedPatient.firstName?.charAt(0)}{selectedPatient.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 space-y-1 text-sm">
                            <p className="font-semibold text-gray-900">
                              {selectedPatient.firstName} {selectedPatient.lastName}
                            </p>
                            <p className="text-gray-600 text-xs">
                              {selectedPatient.patientId}
                            </p>
                            {selectedPatient.phone && (
                              <p className="text-gray-600 text-xs flex items-center gap-1">
                                📞 {selectedPatient.phone}
                              </p>
                            )}
                            {selectedPatient.email && (
                              <p className="text-gray-600 text-xs flex items-center gap-1">
                                ✉️ {selectedPatient.email}
                              </p>
                            )}
                            {selectedPatient.nhsNumber && (
                              <p className="text-gray-600 text-xs">
                                NHS: {selectedPatient.nhsNumber}
                              </p>
                            )}
                            {selectedPatient.address && (selectedPatient.address.city || selectedPatient.address.postcode) && (
                              <p className="text-gray-600 text-xs">
                                📍 {selectedPatient.address.city}, {selectedPatient.address.postcode}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Booking Summary */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Booking Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-500 text-xs">Role</p>
                          <p className="font-medium text-gray-900">
                            {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : "Not selected"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Duration</p>
                          <p className="font-medium text-gray-900">{selectedDuration} minutes</p>
                        </div>
                      </div>
                    
                    <div>
                      <p className="text-gray-500 text-xs">Appointment Type</p>
                      <p className="font-medium text-gray-900">
                        {appointmentType
                          ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
                          : "Not selected"}
                      </p>
                    </div>
                    {appointmentServicePreview && (
                      <div>
                        <p className="text-gray-500 text-xs">Service</p>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-3 w-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: appointmentServicePreview.color }}
                          />
                          <span className="font-medium">
                            {appointmentServicePreview.name}
                            {appointmentServicePreview.price ? ` • ${appointmentServicePreview.price}` : ""}
                          </span>
                        </div>
                      </div>
                    )}
                      
                      <div>
                        <p className="text-gray-500 text-xs">Patient</p>
                        <p className="font-medium text-gray-900">
                          {newAppointmentData.patientId && patientsData 
                            ? (() => {
                                const patient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                                return patient ? `${patient.firstName} ${patient.lastName}` : "Not selected";
                              })()
                            : "Not selected"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500 text-xs">Provider</p>
                        <p className="font-medium text-gray-900">
                          {selectedProviderId && usersData
                            ? (() => {
                                const provider = usersData.find((u: any) => u.id.toString() === selectedProviderId);
                                return provider ? `${provider.firstName} ${provider.lastName}` : "Not selected";
                              })()
                            : "Not selected"}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-500 text-xs">Date</p>
                          <p className="font-medium text-gray-900">
                            {newAppointmentDate ? format(newAppointmentDate, 'MMM dd, yyyy') : "Not selected"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Time</p>
                          <p className="font-medium text-gray-900">
                            {newSelectedTimeSlot || "Not selected"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewAppointment(false);
                    resetNewAppointmentForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    // Clear previous errors
                    setPatientError("");
                    setProviderError("");
                    
                    // Validate fields and set inline errors
                    let hasError = false;
                    
                    if (!newAppointmentData.patientId) {
                      setPatientError("Please select a patient.");
                      hasError = true;
                    }
                    
                    if (!selectedProviderId) {
                      setProviderError("Please select a provider.");
                      hasError = true;
                    } else {
                      const hasShifts = hasAnyShiftForProvider(selectedProviderId);
                      if (!hasShifts) {
                        setShiftWarning("please create shifts from Shift Management");
                        setMissingDateTimeWarning("");
                        hasError = true;
                      } else {
                        setShiftWarning("");
                      }
                    }
                    
                    if (!selectedRole) {
                      toast({
                        title: "Missing Information",
                        description: "Please select a role.",
                        variant: "destructive",
                      });
                      hasError = true;
                    }
                    
                    if (!newAppointmentDate || !newSelectedTimeSlot) {
                      toast({
                        title: "Missing Information",
                        description: "Please select both date and time slot.",
                        variant: "destructive",
                      });
                      setMissingDateTimeWarning("Missing Information Please select both date and time slot.");
                      hasError = true;
                    } else {
                      setMissingDateTimeWarning("");
                    }
                    
                    if (hasError) {
                      return;
                    }

                    // Must select appointment type and corresponding option BEFORE opening summary
                    setAppointmentTypeError("");
                    setTreatmentSelectionError("");
                    setConsultationSelectionError("");
                    if (!appointmentType) {
                      setAppointmentTypeError("Please select an appointment type.");
                      return;
                    }
                    if (appointmentType === "treatment" && !appointmentSelectedTreatment) {
                      setTreatmentSelectionError("Please select a treatment.");
                      return;
                    }
                    if (appointmentType === "consultation" && !appointmentSelectedConsultation) {
                      setConsultationSelectionError("Please select a consultation.");
                      return;
                    }

                    await refetch();

                    // Same patient cannot overlap scheduled/confirmed windows with any provider
                    const freshAppointments = queryClient.getQueryData<any[]>(["/api/appointments"]);
                    const appointmentsForOverlap = Array.isArray(freshAppointments)
                      ? freshAppointments
                      : Array.isArray(appointmentsData)
                        ? appointmentsData
                        : [];

                    if (
                      newAppointmentData.patientId &&
                      newAppointmentDate &&
                      newSelectedTimeSlot &&
                      Array.isArray(appointmentsForOverlap)
                    ) {
                      const interval = buildLocalIntervalFromDateAndTimeSlot(
                        newAppointmentDate,
                        newSelectedTimeSlot,
                        selectedDuration,
                      );
                      if (interval) {
                        const { conflict } = findPatientScheduleOverlap(
                          String(newAppointmentData.patientId),
                          interval.start,
                          interval.end,
                          appointmentsForOverlap,
                          parseScheduledAtAsLocal,
                          {},
                        );
                        if (conflict) {
                          setPatientOverlapConflictRecord(conflict);
                          setShowPatientOverlapConflict(true);
                          return;
                        }
                      }
                    }
                    
                    // Patient: Same doctor + patient + same treatment/consultation — if an active appointment exists at any datetime, prompt reschedule
                    if (user?.role === "patient" && appointmentsData && newAppointmentDate && selectedProviderId) {
                      let patientDbId = newAppointmentData.patientId;
                      if (!patientDbId && patientsData && user?.id) {
                        const patientRecord = patientsData.find(
                          (p: any) =>
                            p.userId === user.id ||
                            p.email?.toLowerCase() === user.email?.toLowerCase()
                        );
                        if (patientRecord) {
                          patientDbId = patientRecord.id.toString();
                        }
                      }

                      if (patientDbId) {
                        const foundDup = findDuplicateServiceAppointmentAnyDate(
                          String(patientDbId),
                          appointmentsForOverlap,
                        );
                        if (foundDup) {
                          setDuplicateAppointmentDetails("");
                          setDuplicateAppointment(foundDup);
                          setShowDuplicateWarning(true);
                          return;
                        }
                      }
                    }

                    if (user?.role !== "patient" && appointmentsForOverlap && newAppointmentDate) {
                      const foundDup = findDuplicateServiceAppointment(
                        String(newAppointmentData.patientId),
                        appointmentsForOverlap,
                      );
                      if (foundDup) {
                        setDuplicateAppointmentDetails("");
                        setDuplicateAppointment(foundDup);
                        if (user?.role === "admin" || isDoctorLike(user?.role)) {
                          setDuplicateResolveStatus("completed");
                        }
                        setShowDuplicateWarning(true);
                        return;
                      }
                    }
                    
                    setShowConfirmationDialog(true);
                  }}
                >
                  Create Appointment
                </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Treatment (Bulk) Dialog - reused from Billing */}
      <Dialog open={showAddTreatmentDialog} onOpenChange={setShowAddTreatmentDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Add Treatment</DialogTitle>
            <DialogDescription>
              Select one or more treatments, set prices (or apply a default price), then add them for the chosen role and name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 flex flex-col min-h-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="apt-bulk-treatmentRole">Role <span className="text-red-500">*</span></Label>
                <Input
                  id="apt-bulk-treatmentRole"
                  value={treatmentForm.doctorRole}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="apt-bulk-treatmentDoctorName">Select Name <span className="text-red-500">*</span></Label>
                <Input
                  id="apt-bulk-treatmentDoctorName"
                  value={treatmentForm.doctorName}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="apt-select-all-treatments"
                  checked={(treatmentsInfoList || []).length > 0 && (treatmentsInfoList || []).every((info: any) => bulkTreatmentSelections[String(info.id)]?.selected)}
                  onCheckedChange={(checked) => {
                    setBulkTreatmentSelections((prev) =>
                      (treatmentsInfoList || []).reduce((acc: Record<string, { selected: boolean; price: string }>, info: any) => ({
                        ...acc,
                        [String(info.id)]: { selected: !!checked, price: prev[String(info.id)]?.price ?? "" },
                      }), {}),
                    );
                  }}
                />
                <label htmlFor="apt-select-all-treatments" className="text-sm font-medium cursor-pointer">
                  Select all treatments
                </label>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Label htmlFor="apt-bulk-default-price" className="text-sm text-gray-500 whitespace-nowrap">
                  Default price ({currencyCodeForTreatments}):
                </Label>
                <Input
                  id="apt-bulk-default-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 50"
                  className="w-24 h-8 text-sm"
                  value={bulkDefaultPrice}
                  onChange={(e) => setBulkDefaultPrice(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    const val = bulkDefaultPrice.trim();
                    if (val === "") return;
                    setBulkTreatmentSelections((prev) =>
                      (treatmentsInfoList || []).reduce((acc: Record<string, { selected: boolean; price: string }>, info: any) => ({
                        ...acc,
                        [String(info.id)]: { selected: prev[String(info.id)]?.selected ?? false, price: val },
                      }), {}),
                    );
                  }}
                >
                  Apply to all
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewTreatmentInfo({ name: "", colorCode: "#2563eb" });
                  setTreatmentNameComboboxOpen(false);
                  setShowCreateTreatmentMetadataDialog(true);
                }}
                disabled={isSavingTreatmentInfo || !treatmentForm.doctorId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Treatment
              </Button>
            </div>

            <div className="border rounded-md max-h-[320px] overflow-y-auto space-y-1 p-2">
              {loadingTreatmentsInfo ? (
                <p className="text-sm text-gray-500 py-2">Loading treatments...</p>
              ) : (treatmentsInfoList || []).length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  No treatments configured. Click &quot;Create New Treatment&quot; above or add entries under Pricing → Treatments metadata.
                </p>
              ) : (
                (treatmentsInfoList || []).map((info: any) => {
                  const id = String(info.id);
                  const sel = bulkTreatmentSelections[id] ?? { selected: false, price: "" };
                  return (
                    <div key={info.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <Checkbox
                        checked={sel.selected}
                        onCheckedChange={(checked) =>
                          setBulkTreatmentSelections((prev) => ({ ...prev, [id]: { ...sel, selected: !!checked } }))
                        }
                      />
                      <span className="flex-1 text-sm truncate" title={info.name}>{info.name}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        className="w-24 h-8 text-sm"
                        value={sel.price}
                        onChange={(e) =>
                          setBulkTreatmentSelections((prev) => ({ ...prev, [id]: { ...sel, price: e.target.value } }))
                        }
                      />
                    </div>
                  );
                })
              )}
            </div>

            {treatmentError && <p className="text-sm text-red-500">{treatmentError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddTreatmentDialog(false)} disabled={isSavingTreatment}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkTreatmentSave}
              disabled={isSavingTreatment || isSavingTreatmentInfo}
            >
              {isSavingTreatment ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add Selected Treatments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateTreatmentMetadataDialog}
        onOpenChange={(open) => {
          if (!isSavingTreatmentInfo) {
            setShowCreateTreatmentMetadataDialog(open);
            if (!open) {
              setTreatmentNameComboboxOpen(false);
              setNewTreatmentInfo({ name: "", colorCode: "#2563eb" });
            }
          }
        }}
      >
        <DialogContent className="max-w-md dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Create Treatment Metadata</DialogTitle>
            <DialogDescription>
              Create a new treatment metadata entry with a name and color for categorization.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="apt-treatmentInfoName">Treatment Name</Label>
              <Popover
                open={treatmentNameComboboxOpen}
                onOpenChange={setTreatmentNameComboboxOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="apt-treatmentInfoName"
                    variant="outline"
                    role="combobox"
                    aria-expanded={treatmentNameComboboxOpen}
                    className="w-full justify-between font-normal h-10"
                  >
                    <span className={newTreatmentInfo.name ? "" : "text-muted-foreground"}>
                      {newTreatmentInfo.name || "Select or type treatment name..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search or type custom treatment..."
                      value={newTreatmentInfo.name}
                      onValueChange={(value) =>
                        setNewTreatmentInfo((prev) => ({ ...prev, name: value }))
                      }
                    />
                    <CommandEmpty>
                      No match. Use your typed text as custom treatment name.
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {TREATMENT_NAME_OPTIONS.filter((option) =>
                        option.toLowerCase().includes(newTreatmentInfo.name.toLowerCase()),
                      ).map((option) => (
                        <CommandItem
                          key={option}
                          value={option}
                          onSelect={() => {
                            setNewTreatmentInfo((prev) => ({ ...prev, name: option }));
                            setTreatmentNameComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              newTreatmentInfo.name === option ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="apt-treatmentInfoColor">Color</Label>
              <Input
                id="apt-treatmentInfoColor"
                type="color"
                value={newTreatmentInfo.colorCode}
                onChange={(e) =>
                  setNewTreatmentInfo({
                    ...newTreatmentInfo,
                    colorCode: e.target.value,
                  })
                }
                className="h-10 w-16 p-0"
              />
            </div>
            {treatmentForm.doctorName && (
              <p className="text-sm text-muted-foreground">
                Will be assigned to {treatmentForm.doctorName}
                {bulkDefaultPrice.trim() ? ` at ${currencyCodeForTreatments} ${bulkDefaultPrice.trim()}` : " when a default price is set, or select it below after saving."}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateTreatmentMetadataDialog(false)}
              disabled={isSavingTreatmentInfo}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTreatmentMetadata} disabled={isSavingTreatmentInfo}>
              {isSavingTreatmentInfo ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Treatment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Doctor Fee (Consultations) Dialog - reused from Billing */}
      <Dialog open={showAddConsultationDialog} onOpenChange={setShowAddConsultationDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Add Doctor Fee</DialogTitle>
            <DialogDescription>Add a new doctor fee to your pricing list.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {(() => {
              const fees = Array.isArray(consultationServices) ? consultationServices : [];
              const doctorId = consultationForm.doctorId;
              const filtered = doctorId != null ? fees.filter((f: any) => Number(f?.doctorId) === Number(doctorId)) : [];
              if (filtered.length === 0) return null;
              return (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Existing Doctor Fees in Database</Label>
                  <div className="border rounded-md overflow-hidden max-h-56 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-sm font-medium">Service Name</th>
                          <th className="text-left p-2 text-sm font-medium">Code</th>
                          <th className="text-left p-2 text-sm font-medium">Category</th>
                          <th className="text-left p-2 text-sm font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((fee: any) => (
                          <tr key={fee.id} className="border-t">
                            <td className="p-2 text-sm">{fee.serviceName}</td>
                            <td className="p-2 text-sm">{fee.serviceCode || "-"}</td>
                            <td className="p-2 text-sm">{fee.category || "-"}</td>
                            <td className="p-2 text-sm">
                              {fee.currency || currencyCodeForConsultations} {fee.basePrice ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Role <span className="text-red-500">*</span></Label>
                <Input value={consultationForm.doctorRole} readOnly className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <Label>Select Name <span className="text-red-500">*</span></Label>
                <Input value={consultationForm.doctorName} readOnly className="bg-muted cursor-not-allowed" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Add Custom Doctor Fee</Label>
              <div className="border rounded-md overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-sm font-medium">Service Name *</th>
                      <th className="text-left p-2 text-sm font-medium">Service Code</th>
                      <th className="text-left p-2 text-sm font-medium">Category</th>
                      <th className="text-left p-2 text-sm font-medium">Base Price ({currencyCodeForConsultations}) *</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {multipleConsultationServices.map((service, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <Input
                            value={service.serviceName}
                            onChange={(e) => {
                              const updated = [...multipleConsultationServices];
                              updated[index].serviceName = e.target.value;
                              const words = e.target.value.trim().split(/\s+/);
                              const initials = words.map((w) => w.charAt(0).toUpperCase()).join("");
                              if (initials) updated[index].serviceCode = `${initials}001`;
                              setMultipleConsultationServices(updated);
                            }}
                            placeholder="e.g., General Consultation"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={service.serviceCode}
                            onChange={(e) => {
                              const updated = [...multipleConsultationServices];
                              updated[index].serviceCode = e.target.value;
                              setMultipleConsultationServices(updated);
                            }}
                            placeholder="e.g., GC001"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={service.category}
                            onChange={(e) => {
                              const updated = [...multipleConsultationServices];
                              updated[index].category = e.target.value;
                              setMultipleConsultationServices(updated);
                            }}
                            placeholder="e.g., Diagnostic"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={service.basePrice}
                            onChange={(e) => {
                              const updated = [...multipleConsultationServices];
                              updated[index].basePrice = e.target.value;
                              setMultipleConsultationServices(updated);
                            }}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-2">
                          {multipleConsultationServices.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = multipleConsultationServices.filter((_, i) => i !== index);
                                setMultipleConsultationServices(updated);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMultipleConsultationServices((prev) => [...prev, { serviceName: "", serviceCode: "", category: "", basePrice: "" }])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Service
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={consultationActive} onCheckedChange={setConsultationActive} />
              <span className="text-sm">Active</span>
            </div>

            {consultationError && <p className="text-sm text-red-500">{consultationError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddConsultationDialog(false)} disabled={isSavingConsultations}>
              Cancel
            </Button>
            <Button onClick={handleSaveConsultations} disabled={isSavingConsultations}>
              {isSavingConsultations ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent className="max-w-2xl dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-800 dark:text-blue-300">Appointment Summary</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">Please review the appointment details before confirming</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Patient Information */}
            {newAppointmentData.patientId && patientsData && (() => {
              const selectedPatient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
              if (!selectedPatient) return null;
              
              return (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Patient Information</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {selectedPatient.firstName?.charAt(0)}{selectedPatient.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 text-xs">{selectedPatient.patientId}</p>
                      {selectedPatient.phone && (
                        <p className="text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1">
                          📞 {selectedPatient.phone}
                        </p>
                      )}
                      {selectedPatient.email && (
                        <p className="text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1">
                          ✉️ {selectedPatient.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Booking Summary */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Role</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Duration</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{selectedDuration} minutes</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Appointment Type</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {appointmentType
                        ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
                        : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {appointmentType === "treatment"
                        ? "Treatment"
                        : appointmentType === "consultation"
                          ? "Consultation"
                          : "Service"}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {appointmentServicePreview?.name || "Not selected"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Provider</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedProviderId && usersData
                      ? (() => {
                          const provider = usersData.find((u: any) => u.id.toString() === selectedProviderId);
                          return provider ? `${provider.firstName} ${provider.lastName}` : "Not selected";
                        })()
                      : "Not selected"}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {newAppointmentDate ? format(newAppointmentDate, 'MMM dd, yyyy') : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Time</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {newSelectedTimeSlot || "Not selected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmationDialog(false);
              }}
            >
              Go Back
            </Button>
              <Button
                onClick={async () => {
                  // Must select appointment type and corresponding option
                  if (!appointmentType) {
                    setAppointmentTypeError("Please select an appointment type.");
                    return;
                  }
                  if (appointmentType === "treatment" && !appointmentSelectedTreatment) {
                    setTreatmentSelectionError("Please select a treatment.");
                    return;
                  }
                  if (
                    appointmentType === "consultation" &&
                    !appointmentSelectedConsultation
                  ) {
                    setConsultationSelectionError("Please select a consultation.");
                    return;
                  }

                  await refetch();
                  const freshForConfirm = queryClient.getQueryData<any[]>(["/api/appointments"]);
                  const appointmentsForConfirm = Array.isArray(freshForConfirm)
                    ? freshForConfirm
                    : Array.isArray(appointmentsData)
                      ? appointmentsData
                      : [];

                  // Create new datetime without timezone conversion
                  const selectedDate = format(newAppointmentDate!, "yyyy-MM-dd");
                  const [time, period] = newSelectedTimeSlot.split(" ");
                  const [hours, minutes] = time.split(":");
                  let hour24 = parseInt(hours);
                  
                  if (period === "PM" && hour24 !== 12) {
                    hour24 += 12;
                  } else if (period === "AM" && hour24 === 12) {
                    hour24 = 0;
                  }
                  
                  // Validate that the appointment time is not in the past
                  const now = new Date();
                  const appointmentDateTime = new Date(`${selectedDate}T${hour24.toString().padStart(2, "0")}:${minutes}:00`);
                  
                  if (appointmentDateTime < now) {
                    toast({
                      title: "Invalid Appointment Time",
                      description: "Cannot schedule appointments in the past. Please select a current or future time slot.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const newScheduledAt = `${selectedDate}T${hour24.toString().padStart(2, "0")}:${minutes}:00`;
                  
                  // Check for conflicts in the database before creating
                  const appointmentDateForCheck = newAppointmentDate!;
                  const durationCheck = checkConsecutiveSlotsAvailable(appointmentDateForCheck, newSelectedTimeSlot, selectedDuration);
                  if (!durationCheck.available) {
                    setValidationErrorMessage(
                      `Only ${durationCheck.availableMinutes} minutes are available at ${newSelectedTimeSlot}. Please choose a ${durationCheck.availableMinutes} minute duration.`
                    );
                    setShowValidationError(true);
                    return;
                  }

                  const newStartConfirm = parseScheduledAtAsLocal(newScheduledAt);
                  const newEndConfirm = new Date(newStartConfirm.getTime() + selectedDuration * 60 * 1000);
                  const overlapConfirm = findPatientScheduleOverlap(
                    String(newAppointmentData.patientId),
                    newStartConfirm,
                    newEndConfirm,
                    appointmentsForConfirm,
                    parseScheduledAtAsLocal,
                    {},
                  );
                  if (overlapConfirm.conflict) {
                    if (isNonBlockingForRebook(overlapConfirm.conflict?.status)) {
                      // allow rebooking over completed/cancelled/canceled appointments
                    } else {
                    setPatientOverlapConflictRecord(overlapConfirm.conflict);
                    setShowPatientOverlapConflict(true);
                    return;
                    }
                  }

                  const patientName = patientsData?.find(
                    (p: any) => p.id.toString() === newAppointmentData.patientId,
                  );
                  const generatedTitle = `${patientName?.firstName || "Patient"} - ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Appointment`;
                  const normalizedAppointmentType = appointmentType || "consultation";
                  const treatmentId =
                    normalizedAppointmentType === "treatment"
                      ? appointmentSelectedTreatment?.id || null
                      : null;
                  const consultationId =
                    normalizedAppointmentType === "consultation"
                      ? appointmentSelectedConsultation?.id || null
                      : null;

                  const conflictResult = await checkAppointmentConflicts(
                    parseInt(newAppointmentData.patientId),
                    parseInt(selectedProviderId),
                    newScheduledAt,
                    selectedDuration,
                  );

                  if (conflictResult.hasConflict) {
                    const patientConflict = Array.isArray(conflictResult.patientConflict)
                      ? conflictResult.patientConflict
                      : [];
                    const providerConflict = Array.isArray(conflictResult.providerConflict)
                      ? conflictResult.providerConflict
                      : [];
                    if (patientConflict.length > 0) {
                      const first = patientConflict[0];
                      if (!isNonBlockingForRebook(first?.status)) {
                        setPatientOverlapConflictRecord({
                          ...first,
                          id: first.id ?? first.appointment_id,
                          appointmentId: first.appointmentId ?? first.appointment_id,
                          providerId: first.providerId ?? first.provider_id,
                          patientId: first.patientId ?? first.patient_id,
                          scheduledAt: first.scheduledAt ?? first.scheduled_at,
                        });
                        setShowPatientOverlapConflict(true);
                        return;
                      }
                    } else if (providerConflict.length > 0) {
                      const pendingPayload = {
                        patientId: parseInt(newAppointmentData.patientId),
                        providerId: parseInt(selectedProviderId),
                        assignedRole: selectedRole,
                        title: generatedTitle,
                        type: normalizedAppointmentType === "treatment" ? "procedure" : "consultation",
                        appointmentType: normalizedAppointmentType,
                        treatmentId,
                        treatment_id: treatmentId,
                        consultationId,
                        consultation_id: consultationId,
                        status: "scheduled",
                        scheduledAt: newScheduledAt,
                        duration: selectedDuration,
                        description: "",
                        createdBy: user?.id,
                      };
                      setPendingCreateAppointmentPayload(pendingPayload);
                      setProviderTimeConflicts(providerConflict);
                      setShowProviderTimeConflict(true);
                      setShowConfirmationDialog(false);
                      return;
                    }
                  }

                  console.log('[APPOINTMENT-CALENDAR] Creating appointment with data:', {
                    patientId: parseInt(newAppointmentData.patientId),
                    providerId: parseInt(selectedProviderId),
                    assignedRole: selectedRole,
                    title: generatedTitle,
                    type: normalizedAppointmentType === "treatment" ? "procedure" : "consultation",
                    appointmentType: normalizedAppointmentType,
                    treatmentId,
                    consultationId,
                    status: "scheduled",
                    scheduledAt: newScheduledAt,
                    duration: selectedDuration,
                    createdBy: user?.id,
                  });

                  createAppointmentMutation.mutate({
                    patientId: parseInt(newAppointmentData.patientId),
                    providerId: parseInt(selectedProviderId),
                    assignedRole: selectedRole,
                    title: generatedTitle,
                    type: normalizedAppointmentType === "treatment" ? "procedure" : "consultation",
                    appointmentType: normalizedAppointmentType,
                    treatmentId,
                    treatment_id: treatmentId,
                    consultationId,
                    consultation_id: consultationId,
                    status: "scheduled",
                    scheduledAt: newScheduledAt,
                    duration: selectedDuration,
                    description: "",
                    createdBy: user?.id,
                  }, {
                    onSuccess: (data) => {
                      console.log('[APPOINTMENT-CALENDAR] Appointment created successfully:', data);
                      setShowConfirmationDialog(false);
                      setShowNewAppointment(false);
                      setShowSuccessModal(true);
                      // NOTE: Do not call `onNewAppointment()` here.
                      // In some parent pages this callback re-opens the "Schedule New Appointment" dialog,
                      // which is not desired after a successful booking.
                    },
                    onError: (error: any) => {
                      console.error('[APPOINTMENT-CALENDAR] Failed to create appointment:', error);
                      const raw = String(error?.message || "");
                      const m = raw.match(/^409:\s*([\s\S]+)$/);
                      if (m) {
                        try {
                          const payload = JSON.parse(m[1]);
                          // Some server branches incorrectly return a raw array of appointments on 409.
                          // Normalize it into our conflict modal shape.
                          if (Array.isArray(payload)) {
                            const providerIdNum = parseInt(selectedProviderId);
                            const durationNum = Number(selectedDuration || 30);
                            const inferred = filterBlockingProviderConflicts(
                              buildLocalProviderConflicts({
                                providerId: providerIdNum,
                                scheduledAt: newScheduledAt,
                                duration: durationNum,
                                appointmentsList: payload,
                              }),
                            );
                            const pendingPayload = {
                              patientId: parseInt(newAppointmentData.patientId),
                              providerId: parseInt(selectedProviderId),
                              assignedRole: selectedRole,
                              title: generatedTitle,
                              type: normalizedAppointmentType === "treatment" ? "procedure" : "consultation",
                              appointmentType: normalizedAppointmentType,
                              treatmentId,
                              treatment_id: treatmentId,
                              consultationId,
                              consultation_id: consultationId,
                              status: "scheduled",
                              scheduledAt: newScheduledAt,
                              duration: selectedDuration,
                              description: "",
                              createdBy: user?.id,
                            };
                            if (inferred.length === 0) {
                              toast({
                                title: "Unable to book",
                                description:
                                  "The server reported a conflict, but there is no active overlapping appointment (completed/cancelled slots do not count). Refresh the calendar and try again.",
                                variant: "destructive",
                              });
                              setShowConfirmationDialog(false);
                              return;
                            }
                            setPendingCreateAppointmentPayload(pendingPayload);
                            setProviderTimeConflicts(inferred);
                            setShowProviderTimeConflict(true);
                            setShowConfirmationDialog(false);

                            void tryAutoResolveProviderConflictsAndRetry({
                              providerId: providerIdNum,
                              scheduledAt: newScheduledAt,
                              conflicts: inferred,
                              pendingPayload,
                            });
                            return;
                          }
                          if (payload.code === "PROVIDER_TIME_CONFLICT" && Array.isArray(payload.conflicts)) {
                            const pendingPayload = {
                              patientId: parseInt(newAppointmentData.patientId),
                              providerId: parseInt(selectedProviderId),
                              assignedRole: selectedRole,
                              title: generatedTitle,
                              type: normalizedAppointmentType === "treatment" ? "procedure" : "consultation",
                              appointmentType: normalizedAppointmentType,
                              treatmentId,
                              treatment_id: treatmentId,
                              consultationId,
                              consultation_id: consultationId,
                              status: "scheduled",
                              scheduledAt: newScheduledAt,
                              duration: selectedDuration,
                              description: "",
                              createdBy: user?.id,
                            };
                            const mergedAppointmentsList = (() => {
                              const cached = queryClient.getQueryData<any[]>(["/api/appointments"]);
                              if (Array.isArray(cached) && cached.length > 0) return cached;
                              return Array.isArray(appointments) ? appointments : [];
                            })();
                            const fromServerRows = filterBlockingProviderConflicts(payload.conflicts);
                            const conflicts = filterBlockingProviderConflicts(
                              buildLocalProviderConflicts({
                                providerId: parseInt(selectedProviderId),
                                scheduledAt: newScheduledAt,
                                duration: selectedDuration,
                                appointmentsList:
                                  fromServerRows.length > 0 ? fromServerRows : mergedAppointmentsList,
                              }),
                            );
                            if (conflicts.length === 0) {
                              toast({
                                title: "No time overlap",
                                description:
                                  "The server reported a conflict, but nothing overlaps your selected time (e.g. 10:00 AM vs 3:00 PM). Refresh the page and try again — if this persists, the server needs the latest appointment fix deployed.",
                              });
                              setShowConfirmationDialog(false);
                              return;
                            }
                            setPendingCreateAppointmentPayload(pendingPayload);
                            setProviderTimeConflicts(conflicts);
                            setShowProviderTimeConflict(true);
                            setShowConfirmationDialog(false);

                            // Production auto-fix: mark overlapping appointments completed then retry.
                            void tryAutoResolveProviderConflictsAndRetry({
                              providerId: parseInt(selectedProviderId),
                              scheduledAt: newScheduledAt,
                              conflicts,
                              pendingPayload,
                            });
                            return;
                          }
                          if (payload.code === "DUPLICATE_APPOINTMENT_SERVICE" && payload.message) {
                            const ex = payload.existingAppointment;
                            setPendingDuplicateCreatePayload({
                              patientId: parseInt(newAppointmentData.patientId),
                              providerId: parseInt(selectedProviderId),
                              assignedRole: selectedRole,
                              title: generatedTitle,
                              type: normalizedAppointmentType === "treatment" ? "procedure" : "consultation",
                              appointmentType: normalizedAppointmentType,
                              treatmentId,
                              treatment_id: treatmentId,
                              consultationId,
                              consultation_id: consultationId,
                              status: "scheduled",
                              scheduledAt: newScheduledAt,
                              duration: selectedDuration,
                              description: "",
                              createdBy: user?.id,
                            });
                            setDuplicateAppointment(
                              ex
                                ? {
                                    ...ex,
                                    id: ex.id ?? ex.appointment_id,
                                    status: ex.dup_status ?? ex.status,
                                    scheduledAt: ex.scheduled_at ?? ex.scheduledAt,
                                  }
                                : null
                            );
                            setDuplicateAppointmentDetails(ex ? "" : payload.message);
                            if (user?.role === "admin" || isDoctorLike(user?.role)) {
                              setDuplicateResolveStatus("completed");
                            }
                            setShowDuplicateWarning(true);
                            setShowConfirmationDialog(false);
                            return;
                          }
                        } catch {
                          /* fall through */
                        }
                      }
                      toast({
                        title: "Creation Failed",
                        description:
                          raw.replace(/^409:\s*/, "").slice(0, 500) ||
                          "Failed to create the appointment. Please check the console for details.",
                        variant: "destructive",
                      });
                    }
                  });
                }}
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </span>
                ) : (
                  "Confirm"
                )}
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Provider time conflict: only opened when providerTimeConflicts.length > 0 (see create onError). */}
      <Dialog
        open={showProviderTimeConflict}
        onOpenChange={(open) => {
          setShowProviderTimeConflict(open);
          if (!open) {
            setProviderTimeConflicts([]);
            setPendingCreateAppointmentPayload(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {providerTimeConflicts.length > 0
                ? `Overlapping appointments (${providerTimeConflicts.length})`
                : "Overlapping appointments"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Conflicting appointments for the selected provider and time. Change status on each row if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto">
            {providerTimeConflicts.map((c: any) => {
              const start = c?.scheduledAt ? parseScheduledAtAsLocal(c.scheduledAt) : null;
              const dur = c?.duration != null && Number(c.duration) > 0 ? Number(c.duration) : 30;
              const end = start ? new Date(start.getTime() + dur * 60 * 1000) : null;
              const timeLabel =
                start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
                  ? `${format(start, "EEEE, MMM d, yyyy")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")} · ${dur} min`
                  : "—";
              const apptId = c?.appointmentId || `#${c?.id ?? "—"}`;
              const patient = patientsData?.find((p: any) => Number(p.id) === Number(c?.patientId));
              const patientName = patient
                ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
                : (c?.patientId ? `Patient ID: ${c.patientId}` : "—");
              const provider = usersData?.find((u: any) => Number(u.id) === Number(c?.providerId));
              const providerName = provider
                ? `${provider.firstName || ""} ${provider.lastName || ""}`.trim()
                : (c?.providerId ? `Provider ID: ${c.providerId}` : "—");

              return (
                <div key={String(c?.id ?? apptId)} className="border rounded-md p-3 bg-gray-50 dark:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{apptId}</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">{timeLabel}</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">Patient: {patientName}</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">Provider: {providerName}</div>
                    </div>
                    <div className="w-[200px] shrink-0">
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Status</div>
                      <Select
                        value={String(c?.status || "scheduled")}
                        onValueChange={async (value) => {
                          const next = String(value || "").toLowerCase();
                          const idNum = Number(c?.id);
                          if (!idNum) return;
                          await updateConflictAppointmentStatusMutation.mutateAsync({ id: idNum, status: next });
                          setProviderTimeConflicts((prev) =>
                            prev.map((x: any) => (Number(x?.id) === idNum ? { ...x, status: next } : x)),
                          );
                        }}
                      >
                        <SelectTrigger className="h-8" data-testid={`select-admin-conflict-status-${c?.id}`}>
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
                      {updatingConflictAppointmentId === Number(c?.id) && (
                        <div className="text-[10px] text-gray-500 mt-1">Updating…</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowProviderTimeConflict(false);
                setProviderTimeConflicts([]);
                setPendingCreateAppointmentPayload(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const allResolved = providerTimeConflicts.every((c: any) =>
                  ["completed", "cancelled"].includes(String(c?.status || "").toLowerCase()),
                );
                if (!pendingCreateAppointmentPayload) return;
                if (providerTimeConflicts.length > 0 && !allResolved) return;
                setShowProviderTimeConflict(false);
                createAppointmentMutation.mutate(pendingCreateAppointmentPayload);
              }}
              disabled={
                updatingConflictAppointmentId != null ||
                !pendingCreateAppointmentPayload ||
                (providerTimeConflicts.length > 0 &&
                  !providerTimeConflicts.every((c: any) =>
                    ["completed", "cancelled"].includes(String(c?.status || "").toLowerCase()),
                  ))
              }
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              Continue booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Error Dialog */}
      <Dialog open={showValidationError} onOpenChange={setShowValidationError}>
        <DialogContent className="max-w-md dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">Insufficient Time Available</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{validationErrorMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowValidationError(false);
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="sr-only">Appointment Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center py-6">
            {/* Green checkmark icon */}
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-6">
              <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
              Appointment Successful!
            </h2>

            {/* Subtitle */}
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your appointment has been processed successfully
            </p>

            {/* Appointment Details */}
            {createdAppointmentDetails && (
              <div className="w-full bg-gray-50 dark:bg-slate-700/50 dark:border dark:border-gray-600 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Appointment ID:</span>
                  <span className="text-gray-900 dark:text-gray-100">{createdAppointmentDetails.appointmentId}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Patient Name:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {getPatientName(createdAppointmentDetails.patientId)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Date & Time:</span>
                  <span className="text-gray-900 dark:text-gray-100 text-right">
                    {createdAppointmentDetails.scheduledAt
                      ? user?.role === "admin"
                        ? `${format(parseScheduledAtAsLocal(createdAppointmentDetails.scheduledAt), "MM/dd/yyyy")} · ${formatAppointmentTimeRange(createdAppointmentDetails)}`
                        : format(new Date(createdAppointmentDetails.scheduledAt), "MM/dd/yyyy, h:mm a")
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Type:</span>
                  <span className="text-gray-900 dark:text-gray-100 capitalize">
                    {(createdAppointmentDetails.appointmentType || createdAppointmentDetails.type || 'N/A').replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* Done Button */}
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setShowNewAppointment(false);
                setNewAppointmentDate(undefined);
                setNewSelectedTimeSlot("");
                setSelectedRole("");
                setSelectedProviderId("");
                setSelectedDuration(30);
                setNewAppointmentData({
                  title: "",
                  type: "consultation",
                  patientId: "",
                  description: "",
                });
                setCreatedAppointmentDetails(null);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-success-done"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Success Modal */}
      <Dialog open={showEditSuccessModal} onOpenChange={setShowEditSuccessModal}>
        <DialogContent className="max-w-md dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 dark:text-green-400">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">Appointment updated successfully.</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowEditSuccessModal(false);
                setEditingAppointment(null);
                setEditAppointmentDate(undefined);
                setEditSelectedTimeSlot("");
              }}
              data-testid="button-edit-success-ok"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Appointment Warning Dialog */}
      <Dialog
        open={showDuplicateWarning}
        onOpenChange={(open) => {
          setShowDuplicateWarning(open);
          if (!open) {
            setDuplicateAppointment(null);
            setDuplicateAppointmentDetails("");
            setPendingDuplicateCreatePayload(null);
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,90dvh)] max-w-5xl w-full overflow-y-auto overflow-x-hidden dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
              Rescheduled Appointment
            </DialogTitle>
            {duplicateAppointmentDetails ? (
              <DialogDescription asChild>
                <div className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1 space-y-3">
                  {duplicateAppointmentDetails.split(/\n\n+/).map((block, idx) => (
                    <p key={idx}>{block.trim()}</p>
                  ))}
                </div>
              </DialogDescription>
            ) : user?.role === "patient" ? (
              <DialogDescription className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1">
                Appointment already exists. Please edit it instead of creating new appointment.
              </DialogDescription>
            ) : (
              <DialogDescription className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1">
                This appointment matches an existing booking for the same treatment or consultation on this date.
              </DialogDescription>
            )}
          </DialogHeader>

          {duplicateAppointment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {duplicateAppointment && (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="mb-2 font-semibold text-amber-900 dark:text-amber-200">Existing appointment</p>
                  <ul className="list-none space-y-1.5">
                    {(() => {
                      const c = duplicateAppointment;
                      const patientRowPid = c.patientId ?? c.patient_id;
                      const patientRow = patientsData?.find(
                        (p: any) =>
                          String(p.id) === String(patientRowPid) ||
                          String(p.userId) === String(patientRowPid) ||
                          String(p.patientId) === String(patientRowPid),
                      );
                      const patientRowName = patientRow
                        ? `${patientRow.firstName || ""} ${patientRow.lastName || ""}`.trim()
                        : "Unknown patient";
                      const pid = c.providerId ?? c.provider_id;
                      const prov = usersData?.find((u: any) => Number(u.id) === Number(pid));
                      const provDisplay = formatDuplicateProviderDisplayName(pid);
                      const roleLabel = c.assignedRole
                        ? String(c.assignedRole).charAt(0).toUpperCase() + String(c.assignedRole).slice(1)
                        : prov?.role
                          ? String(prov.role)
                          : null;
                      const atLocal = parseScheduledAtAsLocal(c.scheduledAt);
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

              {(() => {
                const n =
                  pendingDuplicateCreatePayload ||
                  (() => {
                    if (!newAppointmentDate || !newSelectedTimeSlot || !selectedProviderId || !newAppointmentData?.patientId) {
                      return null;
                    }
                    const selectedDate = format(newAppointmentDate, "yyyy-MM-dd");
                    const [time, period] = newSelectedTimeSlot.split(" ");
                    const [hours, minutes] = time.split(":");
                    let hour24 = parseInt(hours);
                    if (period === "PM" && hour24 !== 12) hour24 += 12;
                    else if (period === "AM" && hour24 === 12) hour24 = 0;
                    const newScheduledAt = `${selectedDate}T${hour24.toString().padStart(2, "0")}:${minutes}:00`;
                    const normalizedAppointmentType = appointmentType || "consultation";
                    return {
                      patientId: parseInt(newAppointmentData.patientId),
                      providerId: parseInt(selectedProviderId),
                      assignedRole: selectedRole,
                      title: newAppointmentData?.title || "",
                      appointmentType: normalizedAppointmentType,
                      scheduledAt: newScheduledAt,
                      duration: selectedDuration,
                    };
                  })();
                if (!n) return null;
                return (
                <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-100">
                  <p className="mb-2 font-semibold text-slate-800 dark:text-slate-200">New appointment (to be created)</p>
                  <ul className="list-none space-y-1.5">
                    {(() => {
                      const patientRow = patientsData?.find((p: any) => String(p.id) === String(n.patientId));
                      const patientRowName = patientRow
                        ? `${patientRow.firstName || ""} ${patientRow.lastName || ""}`.trim()
                        : `Patient ID: ${n.patientId}`;
                      const provDisplay = formatDuplicateProviderDisplayName(n.providerId);
                      const atLocal = parseScheduledAtAsLocal(n.scheduledAt);
                      const dur = n.duration != null && Number(n.duration) > 0 ? Number(n.duration) : 30;
                      const endAt = new Date(atLocal.getTime() + dur * 60 * 1000);
                      const svcName = appointmentServicePreview?.name || "Selected service";
                      const typeLine =
                        String(n.appointmentType || "").toLowerCase() === "treatment"
                          ? `treatment — ${svcName}`
                          : String(n.appointmentType || "").toLowerCase() === "consultation"
                            ? `consultation — ${svcName}`
                            : String(n.appointmentType || "N/A");
                      return (
                        <>
                          <li>
                            <span className="font-medium">Patient: </span>
                            {patientRowName}
                          </li>
                          <li>
                            <span className="font-medium">Provider: </span>
                            {provDisplay}
                          </li>
                          <li>
                            <span className="font-medium">Date: </span>
                            {format(atLocal, "EEEE, MMM d, yyyy")}
                          </li>
                          <li>
                            <span className="font-medium">Time: </span>
                            {format(atLocal, "h:mm a")} – {format(endAt, "h:mm a")} ({dur} min)
                          </li>
                          <li>
                            <span className="font-medium">Status: </span>
                            Scheduled
                          </li>
                          {n.title ? (
                            <li>
                              <span className="font-medium">Title: </span>
                              {n.title}
                            </li>
                          ) : null}
                          <li>
                            <span className="font-medium">Type: </span>
                            {typeLine}
                          </li>
                        </>
                      );
                    })()}
                  </ul>
                </div>
                );
              })()}
            </div>
          )}

          {duplicateAppointment &&
            Number.isFinite(Number(duplicateAppointment.id)) &&
            isServiceDuplicateBlockingStatus(
              duplicateAppointment.status ?? duplicateAppointment.dup_status,
            ) && (
              <div className="mt-2 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <Label className="text-sm font-medium leading-snug text-amber-950 dark:text-amber-100">
                  Click <strong>Reschedule</strong> to mark the existing appointment as rescheduled and create the new one as scheduled.
                </Label>
                <Button
                  type="button"
                  className="w-full"
                  disabled={rescheduleAndCreateAppointmentMutation.isPending}
                  onClick={() => {
                    const id = Number(duplicateAppointment.id);
                    if (!Number.isFinite(id)) return;

                    const normalizedAppointmentType = appointmentType || "consultation";
                    const treatmentId =
                      normalizedAppointmentType === "treatment"
                        ? appointmentSelectedTreatment?.id || null
                        : null;
                    const consultationId =
                      normalizedAppointmentType === "consultation"
                        ? appointmentSelectedConsultation?.id || null
                        : null;

                    if (!newAppointmentDate || !newSelectedTimeSlot || !selectedProviderId || !newAppointmentData?.patientId) {
                      toast({
                        title: "Missing details",
                        description: "Please select patient, provider, date, and time before rescheduling.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const selectedDate = format(newAppointmentDate, "yyyy-MM-dd");
                    const [time, period] = newSelectedTimeSlot.split(" ");
                    const [hours, minutes] = time.split(":");
                    let hour24 = parseInt(hours);
                    if (period === "PM" && hour24 !== 12) hour24 += 12;
                    else if (period === "AM" && hour24 === 12) hour24 = 0;
                    const newScheduledAt = `${selectedDate}T${hour24.toString().padStart(2, "0")}:${minutes}:00`;

                    const patientName = patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                    const generatedTitle = `${patientName?.firstName || "Patient"} - ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Appointment`;

                    const createPayload =
                      pendingDuplicateCreatePayload ||
                      ({
                        patientId: parseInt(newAppointmentData.patientId),
                        providerId: parseInt(selectedProviderId),
                        assignedRole: selectedRole,
                        title: generatedTitle,
                        type: normalizedAppointmentType === "treatment" ? "procedure" : "consultation",
                        appointmentType: normalizedAppointmentType,
                        treatmentId,
                        treatment_id: treatmentId,
                        consultationId,
                        consultation_id: consultationId,
                        scheduledAt: newScheduledAt,
                        duration: selectedDuration,
                        description: "",
                        createdBy: user?.id,
                      } as any);

                    rescheduleAndCreateAppointmentMutation.mutate({
                      existingId: id,
                      createPayload,
                    });
                  }}
                >
                  {rescheduleAndCreateAppointmentMutation.isPending ? "Rescheduling..." : "Reschedule"}
                </Button>
              </div>
            )}

          <div className="flex justify-end gap-2 pt-2">
            {user?.role === "patient" && duplicateAppointment && (
              <Button
                variant="default"
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setDuplicateAppointmentDetails("");
                  handleEditAppointment(duplicateAppointment);
                }}
                data-testid="button-edit-duplicate-appointment"
              >
                Edit Appointment
              </Button>
            )}
            <Button
              onClick={() => {
                setShowDuplicateWarning(false);
                setDuplicateAppointment(null);
                setDuplicateAppointmentDetails("");
              }}
              data-testid="button-duplicate-warning-ok"
              variant={user?.role === "patient" ? "outline" : "default"}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient schedule overlap (double-booking) — same time window, any provider */}
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
                    selectedProviderId: patientOverlapSelectedProviderIdForMessage || undefined,
                    conflictProviderId:
                      patientOverlapConflictRecord?.providerId ??
                      patientOverlapConflictRecord?.provider_id,
                    conflictProviderDisplayName: patientOverlapConflictProviderDisplayName || undefined,
                  },
                )}
              </p>
            </DialogDescription>
          </DialogHeader>
          {patientOverlapConflictRecord && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="mb-2 font-semibold text-amber-900 dark:text-amber-200">Conflicting appointment</p>
              <ul className="space-y-1.5 list-none">
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
                setShowPatientOverlapConflict(false);
                setPatientOverlapConflictRecord(null);
              }}
              data-testid="button-patient-overlap-conflict-ok"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditAppointment} onOpenChange={setShowEditAppointment}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto dark:border-gray-700 dark:bg-slate-800">
          {editingAppointment && (
            <div className="p-2">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-bold text-blue-800 dark:text-blue-200">
                  Edit Appointment
                </DialogTitle>
                <DialogDescription>
                  Update appointment details for {getPatientName(editingAppointment.patientId)}
                </DialogDescription>
              </DialogHeader>
              {editProviderInfo && (
                <div className="mb-4 flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Role
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {capitalizeRoleLabel(editProviderInfo.role) || "Role not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Provider
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {editProviderInfo.providerName}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {/* Title and Duration Row */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Title</Label>
                    <Input 
                      defaultValue={editingAppointment.title}
                      onChange={(e) => {
                        setEditingAppointment({ ...editingAppointment, title: e.target.value });
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Duration (minutes)</Label>
                    <Select 
                      defaultValue={String(editingAppointment.duration || 30)}
                      onValueChange={(value) => {
                        setEditingAppointment({ ...editingAppointment, duration: parseInt(value) });
                      }}
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

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Appointment Type</Label>
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
                              {availableAppointmentTypes.map((type) => (
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
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Select Treatment</Label>
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
                                {isTreatmentsLoading && (
                                  <CommandItem disabled>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading treatments...
                                  </CommandItem>
                                )}
                                <CommandEmpty>No treatments found.</CommandEmpty>
                                <CommandGroup>
                                  {filteredTreatmentsForSelection.map((treatment: any) => (
                                    <CommandItem
                                      key={treatment.id}
                                      value={`${treatment.name ?? ""} ${treatment.currency ?? ""} ${treatment.basePrice ?? ""}`.trim()}
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
                                          {treatment.currency} {treatment.basePrice}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedRole && selectedProviderId && (
                          <button
                            type="button"
                            onClick={() => openAddTreatmentsPopup()}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                            data-testid="link-add-treatments-edit"
                          >
                            Add new treatments for this role and name
                          </button>
                        )}
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
                        <Label className="text-sm font-medium text-gray-600">Select Consultation</Label>
                        <Popover open={openEditConsultationCombo} onOpenChange={setOpenEditConsultationCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openEditConsultationCombo}
                              className="w-full justify-between mt-1"
                            >
                              {editAppointmentSelectedConsultation ? editAppointmentSelectedConsultation.serviceName : "Select a consultation"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search consultation..." />
                              <CommandList>
                                {isConsultationsLoading && (
                                  <CommandItem disabled>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading consultations...
                                  </CommandItem>
                                )}
                                <CommandEmpty>No consultations found.</CommandEmpty>
                                {!isConsultationsLoading &&
                                  filteredConsultationsForSelection.length === 0 &&
                                  selectedRole &&
                                  selectedProviderId && (
                                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenEditConsultationCombo(false);
                                          openAddConsultationsPopup();
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                                      >
                                        Add new consultations for this role and name
                                      </button>
                                    </div>
                                  )}
                                <CommandGroup>
                                  {filteredConsultationsForSelection.map((service: any) => (
                                    <CommandItem
                                      key={service.id}
                                      value={`${service.serviceName ?? ""} ${service.currency ?? ""} ${service.basePrice ?? ""}`.trim()}
                                      onSelect={() => {
                                        setEditAppointmentSelectedConsultation(service);
                                        setEditConsultationSelectionError("");
                                        setOpenEditConsultationCombo(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span className="flex-1 text-left">{service.serviceName}</span>
                                        <span className="text-xs text-gray-500">
                                          {service.currency} {service.basePrice}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedRole && selectedProviderId && (
                          <button
                            type="button"
                            onClick={() => openAddConsultationsPopup()}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                            data-testid="link-add-consultations-edit"
                          >
                            Add new consultations for this role and name
                          </button>
                        )}
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

                {/* Status and Description Row */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <Select 
                      defaultValue={editingAppointment.status}
                      onValueChange={(value) => {
                        setEditingAppointment({ ...editingAppointment, status: value });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</Label>
                    <Textarea 
                      defaultValue={editingAppointment.description || ''}
                      onChange={(e) => {
                        setEditingAppointment({ ...editingAppointment, description: e.target.value });
                      }}
                      className="mt-1"
                      rows={3}
                      placeholder="e.g. wheelchair, assistance, special needs"
                    />
                  </div>
                </div>

                {/* Date and Time Selection - Side by Side Layout */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Date Selection */}
                  <div>
                    <Label className="text-lg font-semibold text-gray-800 mb-3 block">Select Date *</Label>
                    <div className="border rounded-lg p-4 bg-gray-50 h-[300px] overflow-y-auto">
                      <CalendarComponent
                        mode="single"
                        selected={editAppointmentDate}
                        onSelect={(date) => {
                          setEditAppointmentDate(date);
                          if (date && editSelectedTimeSlot) {
                            const timeSlot = editSelectedTimeSlot;
                            // Parse time slot to get hours and minutes
                            const [time, period] = timeSlot.split(' ');
                            const [hours, minutes] = time.split(':').map(Number);
                            const hour24 = period === 'AM' ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
                            
                            // Create new date with correct local time (no timezone conversion)
                            const newDateTime = new Date(date);
                            newDateTime.setHours(hour24, minutes, 0, 0);
                            // DO NOT use toISOString() - it converts to UTC!
                            // Store as Date object in state, will be formatted when saving
                            setEditingAppointment({ ...editingAppointment, scheduledAt: newDateTime });
                          }
                        }}
                        disabled={(date: Date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (date < today) return true;
                          
                          // *** FIX: Use hasShiftsOnDateForEdit for Edit mode to check editing appointment's provider ***
                          return !hasShiftsOnDateForEdit(date);
                        }}
                        className="rounded-md"
                        initialFocus
                      />
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <Label className="text-lg font-semibold text-gray-800 mb-3 block">Select Time Slot *</Label>
                    {/* Color Legend */}
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs font-medium text-gray-700 mb-1">Legend:</div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-500 rounded"></div>
                          <span>Current</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span>Selected</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-gray-600 rounded opacity-60"></div>
                          <span>Booked/Blocked</span>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-gray-50 h-[300px] overflow-y-auto">
                      {/* *** CHANGE 5: Use editTimeSlots instead of timeSlots *** */}
                      {editTimeSlots.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No available time slots for this date. Please select a different date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {editTimeSlots.map((slot) => {
                            const providerForShift = editingAppointment?.providerId;
                            const isInShift =
                              !!editAppointmentDate && providerForShift
                                ? isTimeSlotInShift(slot, editAppointmentDate, providerForShift)
                                : true;
                            const isBooked = editBookedTimeSlots.includes(slot);
                            const isUnavailable = !isInShift || isBooked;

                            // Get the original appointment time slot (read as local time)
                            const originalTimeSlot = (() => {
                              const date = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
                              const hours = date.getHours();
                              const minutes = date.getMinutes();
                              const period = hours >= 12 ? "PM" : "AM";
                              const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                              return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
                            })();

                            // Patient-style selection: highlight the whole selected duration range in orange.
                            // If user hasn't clicked a new slot yet, use the original slot as the start.
                            const startSlot = editSelectedTimeSlot || originalTimeSlot;
                            const duration = editingAppointment.duration || 30;
                            const startMinutes = timeSlotToMinutes(startSlot);
                            const slotMinutes = timeSlotToMinutes(slot);
                            const isInSelectedDuration =
                              slotMinutes >= startMinutes && slotMinutes < startMinutes + duration;
                            
                            return (
                              <Button
                                key={slot}
                                variant="outline"
                                className={`h-12 text-sm font-medium ${
                                  isInSelectedDuration
                                    ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                                    : isUnavailable
                                      ? "bg-gray-600 text-white cursor-not-allowed border-gray-700 opacity-60"
                                      : "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                }`}
                                disabled={isUnavailable}
                                onClick={() => {
                                  if (isUnavailable) return;
                                  // Validate if enough consecutive slots are available for the appointment duration
                                  const availabilityCheck = checkConsecutiveSlotsAvailable(editAppointmentDate!, slot, duration);
                                  
                                  if (!availabilityCheck.available) {
                                    // Show warning dialog with available time
                                    setInsufficientTimeMessage(
                                      `Only ${availabilityCheck.availableMinutes} minutes are available at ${slot}. Please select another time slot.`
                                    );
                                    setShowInsufficientTimeWarning(true);
                                    return;
                                  }
                                  
                                  setEditSelectedTimeSlot(slot);
                                  if (editAppointmentDate) {
                                    // Parse time slot to get hours and minutes
                                    const [time, period] = slot.split(' ');
                                    const [hours, minutes] = time.split(':').map(Number);
                                    const hour24 = period === 'AM' ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
                                    
                                    // Create new date with correct local time (no timezone conversion)
                                    const newDateTime = new Date(editAppointmentDate);
                                    newDateTime.setHours(hour24, minutes, 0, 0);
                                    // DO NOT use toISOString() - it converts to UTC!
                                    // Store as Date object in state, will be formatted when saving
                                    setEditingAppointment({ ...editingAppointment, scheduledAt: newDateTime });
                                  }
                                }}
                              >
                                {slot}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditAppointment(false);
                      setEditingAppointment(null);
                      setEditAppointmentDate(undefined);
                      setEditSelectedTimeSlot("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!editAppointmentType) {
                        setEditAppointmentTypeError("Select an appointment type.");
                        return;
                      }
                      if (editAppointmentType === "treatment" && !editAppointmentSelectedTreatment) {
                        setEditTreatmentSelectionError("Please select a treatment.");
                        return;
                      }
                      if (editAppointmentType === "consultation" && !editAppointmentSelectedConsultation) {
                        setEditConsultationSelectionError("Please select a consultation.");
                        return;
                      }

                      // *** CHANGE 3: Validate date and time slot selection ***
                      if (!editAppointmentDate || !editSelectedTimeSlot) {
                        toast({
                          title: "Missing Information",
                          description: "Please select both date and time slot.",
                          variant: "destructive",
                        });
                        return;
                      }

                      await refetch();
                      
                      // *** CHANGE 3: Check for appointment conflicts before saving ***
                      const isSlotAvailable = isTimeSlotAvailable(editAppointmentDate, editSelectedTimeSlot);
                      
                      if (!isSlotAvailable) {
                        console.log('[Edit Appointment] Validation failed - slot not available');
                        toast({
                          title: "Time Slot Unavailable",
                          description: "This time slot is already booked or blocked. Please select a different time.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      console.log('[Edit Appointment] Validation passed - proceeding with update');
                      
                      // Create new datetime without timezone conversion
                      // Parse time slot to get hours and minutes
                      const [time, period] = editSelectedTimeSlot.split(' ');
                      const [hours, minutes] = time.split(':').map(Number);
                      let hour24 = hours;
                      
                      if (period === 'PM' && hours !== 12) {
                        hour24 += 12;
                      } else if (period === 'AM' && hours === 12) {
                        hour24 = 0;
                      }
                      
                      // Create Date object with local time components (no timezone conversion)
                      const newDateTime = new Date(editAppointmentDate);
                      newDateTime.setHours(hour24, minutes, 0, 0);
                      
                      // Format as local ISO string (no timezone conversion)
                      // DO NOT use toISOString() - it converts to UTC!
                      const scheduledAtString = formatLocalISOString(newDateTime);
                      
                      console.log('[Edit Appointment] Submitting update:', {
                        appointmentId: editingAppointment.id,
                        selectedDate: format(editAppointmentDate, 'yyyy-MM-dd'),
                        selectedTimeSlot: editSelectedTimeSlot,
                        hour24,
                        minutes,
                        scheduledAtString,
                        hasTimezone: scheduledAtString.includes('Z') || /[+-]\d{2}:\d{2}$/.test(scheduledAtString),
                        note: 'Should be FALSE - no timezone indicator means backend treats as local time'
                      });
                      
                      const normalizedEditAppointmentType = editAppointmentType || "consultation";
                      const treatmentId =
                        normalizedEditAppointmentType === "treatment"
                          ? editAppointmentSelectedTreatment?.id || null
                          : null;
                      const consultationId =
                        normalizedEditAppointmentType === "consultation"
                          ? editAppointmentSelectedConsultation?.id || null
                          : null;

                      const editStartAt = parseScheduledAtAsLocal(scheduledAtString);
                      const editDurMin =
                        editingAppointment.duration != null && Number(editingAppointment.duration) > 0
                          ? Number(editingAppointment.duration)
                          : 30;
                      const editEndAt = new Date(editStartAt.getTime() + editDurMin * 60 * 1000);
                      const freshEdit = queryClient.getQueryData<any[]>(["/api/appointments"]);
                      const appointmentsForEditOverlap = Array.isArray(freshEdit)
                        ? freshEdit
                        : Array.isArray(appointmentsData)
                          ? appointmentsData
                          : [];
                      const overlapEdit = findPatientScheduleOverlap(
                        String(editingAppointment.patientId),
                        editStartAt,
                        editEndAt,
                        appointmentsForEditOverlap,
                        parseScheduledAtAsLocal,
                        { excludeAppointmentId: editingAppointment.id },
                      );
                      if (overlapEdit.conflict) {
                        setPatientOverlapConflictRecord(overlapEdit.conflict);
                        setShowPatientOverlapConflict(true);
                        return;
                      }

                      editAppointmentMutation.mutate({
                        id: editingAppointment.id,
                        data: {
                          title: editingAppointment.title,
                          type: editingAppointment.type,
                          status: editingAppointment.status,
                          appointmentType: normalizedEditAppointmentType,
                          treatmentId,
                          consultationId,
                          // *** FIX: Send timezone-naive ISO string (backend will convert to PostgreSQL format) ***
                          scheduledAt: scheduledAtString,
                          description: editingAppointment.description,
                          duration: editingAppointment.duration,
                        }
                      });
                    }}
                    disabled={editAppointmentMutation.isPending}
                  >
                    {editAppointmentMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Appointment Confirmation Modal - Admin Only */}
      {user?.role === 'admin' && (
        <Dialog open={appointmentToDelete !== null} onOpenChange={(open) => !open && setAppointmentToDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{appointmentToDelete?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={cancelDeleteAppointment}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteAppointment}
                disabled={deleteAppointmentMutation.isPending}
              >
                {deleteAppointmentMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Insufficient Time Available Warning Dialog */}
      <Dialog open={showInsufficientTimeWarning} onOpenChange={setShowInsufficientTimeWarning}>
        <DialogContent className="max-w-md dark:border-gray-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">Insufficient Time Available</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{insufficientTimeMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowInsufficientTimeWarning(false);
                setInsufficientTimeMessage("");
              }}
              className="bg-blue-500 hover:bg-blue-600"
              data-testid="button-insufficient-time-ok"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}