import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  Plus,
  FileText,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  ChevronsUpDown,
  Check,
  Stethoscope,
  Loader2,
} from "lucide-react";
import { format, isSameDay, isToday, isFuture, isPast } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useBookingHolidayCalendar,
  BookingHolidayTimeSlotPanel,
} from "@/hooks/use-booking-holiday-calendar";
import {
  getAppointmentCardTimeKind,
  appointmentOngoingBadgePositionClassName,
  appointmentOngoingBadgeClassName,
  appointmentCardTimeBackgroundClass,
  sortAppointmentsByCardTimeKind,
  useAppointmentTimeTick,
} from "@/lib/appointment-card-time-style";
import { addMinutes } from "date-fns";

const statusColors = {
  scheduled: "#4A7DFF",
  completed: "#6CFFEB",
  cancelled: "#162B61",
  no_show: "#9B9EAF",
};

function formatStatusLabelPatientAppointments(status: unknown): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "UNKNOWN";
  return raw.replace(/\s+/g, "_").toUpperCase();
}

function getRecordProfilePictureUrl(
  record: { profilePicturePath?: string | null; profile_picture_path?: string | null } | null | undefined,
): string | null {
  const raw = record?.profilePicturePath ?? record?.profile_picture_path;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

function getPatientRecordPictureUrl(patient: any | null | undefined, usersData: any[]): string | null {
  if (!patient) return null;
  const direct = getRecordProfilePictureUrl(patient);
  if (direct) return direct;
  const uid = patient.userId ?? patient.user_id;
  if (uid == null || !Array.isArray(usersData)) return null;
  const linked = usersData.find((u: any) => String(u.id) === String(uid));
  return getRecordProfilePictureUrl(linked);
}

function profileNameInitials(firstName?: string, lastName?: string): string {
  const a = String(firstName ?? "").trim().charAt(0);
  const b = String(lastName ?? "").trim().charAt(0);
  const s = `${a}${b}`.toUpperCase();
  return s || "?";
}

function UserProfileAvatar({
  user,
  sizeClassName = "h-9 w-9",
  fallbackClassName = "text-xs",
}: {
  user: any | null | undefined;
  sizeClassName?: string;
  fallbackClassName?: string;
}) {
  const src = getRecordProfilePictureUrl(user);
  const alt =
    user != null
      ? `${String(user.firstName ?? "").trim()} ${String(user.lastName ?? "").trim()}`.trim() || "Provider"
      : "Provider";
  return (
    <Avatar className={`${sizeClassName} shrink-0`}>
      {src ? <AvatarImage src={src} alt={alt} /> : null}
      <AvatarFallback
        className={`bg-blue-100 text-blue-700 ${fallbackClassName} dark:bg-blue-900 dark:text-blue-200`}
      >
        {user ? profileNameInitials(user.firstName, user.lastName) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function PatientRecordAvatar({
  patient,
  usersData,
  sizeClassName = "h-9 w-9",
  fallbackClassName = "text-xs",
}: {
  patient: any | null | undefined;
  usersData: any[];
  sizeClassName?: string;
  fallbackClassName?: string;
}) {
  const users = Array.isArray(usersData) ? usersData : [];
  const src = getPatientRecordPictureUrl(patient, users);
  const alt =
    patient != null
      ? `${String(patient.firstName ?? "").trim()} ${String(patient.lastName ?? "").trim()}`.trim() || "Patient"
      : "Patient";
  return (
    <Avatar className={`${sizeClassName} shrink-0`}>
      {src ? <AvatarImage src={src} alt={alt} /> : null}
      <AvatarFallback
        className={`bg-blue-100 text-blue-700 ${fallbackClassName} dark:bg-blue-900 dark:text-blue-200`}
      >
        {patient ? profileNameInitials(patient.firstName, patient.lastName) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function getStatusBadgePresentation(status: unknown): { className: string; style?: React.CSSProperties } {
  const s = String(status ?? "").toLowerCase().trim().replace(/\s+/g, "_");
  if (s === "in_progress") {
    return {
      className:
        "bg-white text-yellow-700 border border-yellow-400 dark:bg-transparent dark:text-yellow-300 dark:border-yellow-700",
    };
  }
  if (s === "completed") {
    return {
      className:
        "bg-white text-green-700 border border-green-500 dark:bg-transparent dark:text-green-300 dark:border-green-700",
    };
  }
  if (s === "rescheduled") {
    return {
      className:
        "bg-gray-100 text-gray-900 border border-black/60 dark:bg-slate-800/40 dark:text-gray-100 dark:border-gray-500/70",
    };
  }

  const key = s as keyof typeof statusColors;
  const bg = statusColors[key];
  if (bg) {
    return { className: "text-white border-0", style: { backgroundColor: bg } };
  }
  return { className: "bg-gray-100 text-gray-800 border border-gray-300 dark:bg-slate-700/40 dark:text-gray-200 dark:border-slate-600" };
}

function formatAppointmentTimeRangeLikeCalendar(
  appointment: { scheduledAt?: string | Date; duration?: number },
  parseScheduledAtLocal: (v: string | Date) => Date,
): string {
  try {
    const start = parseScheduledAtLocal(appointment.scheduledAt ?? "");
    if (Number.isNaN(start.getTime())) return "Time unavailable";
    const dur =
      appointment.duration != null && Number(appointment.duration) > 0
        ? Number(appointment.duration)
        : 30;
    const end = addMinutes(start, dur);
    return `${format(start, "h:mm a")} TO ${format(end, "h:mm a")} • ${dur} min`;
  } catch {
    return "Time unavailable";
  }
}

export default function PatientAppointments({
  onNewAppointment,
}: {
  onNewAppointment?: () => void;
}) {
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "upcoming" | "past"
  >("all");
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<
    number | null
  >(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<
    number | null
  >(null);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  
  // Edit appointment form states
  const [editAppointmentType, setEditAppointmentType] = useState<"consultation" | "treatment" | "">("");
  const [editSelectedTreatment, setEditSelectedTreatment] = useState<any>(null);
  const [editSelectedConsultation, setEditSelectedConsultation] = useState<any>(null);
  const [openEditAppointmentTypeCombo, setOpenEditAppointmentTypeCombo] = useState(false);
  const [openEditTreatmentCombo, setOpenEditTreatmentCombo] = useState(false);
  const [openEditConsultationCombo, setOpenEditConsultationCombo] = useState(false);

  // Patient filter states
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [dateTimeFilter, setDateTimeFilter] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  /** Patient-only: filter list by profile relation (Self, Son, …). Empty = all. */
  const [relationFilter, setRelationFilter] = useState<string>("");
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Insufficient time error modal state
  const [showInsufficientTimeModal, setShowInsufficientTimeModal] = useState(false);
  const [insufficientTimeMessage, setInsufficientTimeMessage] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const appointmentTimeTick = useAppointmentTimeTick();
  const nowForCardStyle = React.useMemo(() => new Date(), [appointmentTimeTick]);

  // Keep ongoing badge styling aligned with appointment-calendar.tsx

  // Helper function to normalize status values for case-insensitive filtering
  const normalizeStatus = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, '_');

  // Fetch users early to avoid temporal-dead-zone issues in downstream hooks/memos
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 300000, // 5 minutes cache
    retry: false,
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
  });

  // Fetch patients to find the current user's patient record
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    retry: false,
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
      return data;
    },
  });

  // Fetch appointments for this patient - backend automatically filters for patient role
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: [
      "/api/appointments",
      user?.role === "patient" ? "patient-filtered" : "all",
    ],
    staleTime: 30000,
    refetchInterval: 60000,
    enabled: !!user,
    queryFn: async () => {
      // For patient users, the backend automatically filters by patient ID
      // No need to pass patientId explicitly as backend uses the authenticated user's patient record
      const response = await apiRequest("GET", "/api/appointments");
      const data = await response.json();
      return data;
    },
  });

  const { data: treatmentsList = [] } = useQuery({
    queryKey: ["/api/pricing/treatments"],
    staleTime: 300000,
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/treatments");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch shifts data for shift validation
  const { data: shiftsData = [] } = useQuery({
    queryKey: ["/api/shifts"],
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

  // Fetch default shifts for fallback when no custom shifts exist
  const { data: defaultShiftsData = [] } = useQuery({
    queryKey: ["/api/default-shifts"],
    staleTime: 60000,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/default-shifts?forBooking=true');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("[EDIT-APPOINTMENT] Error fetching default shifts:", error);
        return [];
      }
    },
  });

  const { data: consultationServices = [] } = useQuery({
    queryKey: ["/api/pricing/doctors-fees"],
    staleTime: 300000,
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/doctors-fees");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const treatmentsMap = React.useMemo(() => {
    const map = new Map<number, any>();
    treatmentsList.forEach((treatment: any) => {
      if (treatment?.id) {
        map.set(treatment.id, treatment);
      }
    });
    return map;
  }, [treatmentsList]);

  const consultationMap = React.useMemo(() => {
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
      const treatment = treatmentsMap.get(treatmentId);
      return {
        name: treatment?.name || "Treatment",
        color: treatment?.colorCode || "#10B981",
        type: type || "treatment",
      };
    }
    if (consultationId) {
      const service = consultationMap.get(consultationId);
      return {
        name: service?.serviceName || "Consultation",
        color: service?.colorCode || "#6366F1",
        type: type || "consultation",
      };
    }
    if (type) {
      return {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        color: "#6B7280",
        type,
      };
    }
    return null;
  };

  // Fetch doctors for doctor specialty data (faster than medical-staff)
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ["/api/doctors"],
    staleTime: 300000, // 5 minutes cache for better performance
    retry: false,
    enabled: !!user,
  });

  // Fetch roles from roles table for role filter
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
    staleTime: 300000,
    retry: false,
    enabled: !!user && user.role === 'patient',
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/roles');
      return response.json();
    },
  });

  // Combined loading state
  const isLoading =
    patientsLoading ||
    appointmentsLoading ||
    doctorsLoading ||
    usersLoading ||
    rolesLoading;

  const normalizeEmail = (e?: string | null) => String(e ?? "").trim().toLowerCase();

  /** Patient rows for this login (same `userId` as auth user). */
  const patientsForLoggedInUser = React.useMemo(() => {
    if (!user || user.role !== "patient" || !patientsData || !Array.isArray(patientsData)) return [];
    return patientsData.filter((p: any) => Number(p.userId) === Number(user.id));
  }, [user, patientsData]);

  /**
   * True when at least one patient row is explicitly linked to this user account
   * with the same email as `users.email` (typical "Self" / account holder).
   * Then we include appointments for every patient profile sharing that `userId` (family).
   */
  const patientAccountLinkedByEmail = React.useMemo(() => {
    if (!user?.email || patientsForLoggedInUser.length === 0) return false;
    const u = normalizeEmail(user.email);
    return patientsForLoggedInUser.some((p: any) => normalizeEmail(p.email) === u);
  }, [user?.email, patientsForLoggedInUser]);

  // Primary patient row for this login: prefer "Self", else first profile with same userId
  const currentPatient = React.useMemo(() => {
    if (patientsForLoggedInUser.length === 0) return null;
    const self = patientsForLoggedInUser.find(
      (p: any) => String(p.relation ?? "").trim().toLowerCase() === "self",
    );
    return self ?? patientsForLoggedInUser[0];
  }, [patientsForLoggedInUser]);

  /** All `patients.id` values whose appointments this user may see. */
  const linkedPatientIds = React.useMemo(() => {
    if (!user || user.role !== "patient") return new Set<number>();
    if (patientAccountLinkedByEmail) {
      return new Set(patientsForLoggedInUser.map((p: any) => Number(p.id)));
    }
    if (currentPatient?.id != null) return new Set([Number(currentPatient.id)]);
    return new Set<number>();
  }, [user, patientAccountLinkedByEmail, patientsForLoggedInUser, currentPatient]);

  const patientByIdMap = React.useMemo(() => {
    const m = new Map<number, any>();
    if (!patientsData || !Array.isArray(patientsData)) return m;
    for (const p of patientsData) {
      if (p?.id != null) m.set(Number(p.id), p);
    }
    return m;
  }, [patientsData]);

  const formatRelationBadge = (relation?: string | null) => {
    const r = String(relation ?? "").trim();
    if (!r) return "";
    return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  };

  /** Distinct relations for profiles linked to this patient login (for filter dropdown). */
  const relationFilterOptions = React.useMemo(() => {
    if (!user || user.role !== "patient" || linkedPatientIds.size === 0) return [];
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const id of linkedPatientIds) {
      const p = patientByIdMap.get(id);
      const raw = String(p?.relation ?? "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push(raw);
    }
    const rank = (rel: string) => {
      const x = rel.toLowerCase();
      if (x === "self") return 0;
      if (x === "spouse") return 1;
      return 50;
    };
    return labels.sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }, [user, linkedPatientIds, patientByIdMap]);

  // Filter appointments to show all appointments created by any role
  // filtered by patient_id and organization_id (matching subdomain)
  const appointments = React.useMemo(() => {
    // If we're loading or no data, return empty array
    if (!appointmentsData) return [];
    
    // Show all appointments from all roles (no role-based filtering)
    let filtered = appointmentsData;
    
    // For patient role: one profile, or whole family when userId + email match users row
    if (user?.role === "patient" && linkedPatientIds.size > 0) {
      filtered = filtered.filter((apt: any) => linkedPatientIds.has(Number(apt.patientId)));
    }
    
    // Appointments are already filtered by organizationId at the backend level via tenant middleware
    // This ensures only appointments from the active user's organization (matching subdomain) are shown
    return filtered;
  }, [appointmentsData, user?.role, linkedPatientIds]);

  const getDoctorSpecialtyData = (providerId: number) => {
    const doctorsResponse = doctorsData as any;
    if (!doctorsResponse?.doctors || !Array.isArray(doctorsResponse.doctors))
      return { name: "", category: "", subSpecialty: "", role: "" };
    const provider = doctorsResponse.doctors.find(
      (u: any) => u.id === providerId,
    );
    return provider
      ? {
          name: `${provider.firstName} ${provider.lastName}`,
          category: provider.medicalSpecialtyCategory || "",
          subSpecialty: provider.subSpecialty || "",
          role: provider.role || "",
        }
      : { name: "", category: "", subSpecialty: "", role: "" };
  };

  // Get provider with role information from usersData
  const getProviderWithRole = (providerId: number) => {
    if (!usersData || !Array.isArray(usersData)) return null;
    const provider = usersData.find((u: any) => u.id === providerId);
    if (!provider) return null;
    
    const providerRole = provider.role?.toLowerCase();
    const titlePrefix = providerRole === 'nurse' ? 'Nurse' : providerRole === 'doctor' ? 'Dr.' : '';
    const fullName = `${provider.firstName || ''} ${provider.lastName || ''}`.trim();
    
    return {
      ...provider,
      displayName: titlePrefix ? `${titlePrefix} ${fullName}` : fullName,
      role: providerRole,
    };
  };

  // Filter treatments based on selected provider (role and ID/name) for Edit Appointment modal
  const filteredTreatmentsForEdit = React.useMemo(() => {
    try {
      if (!editingAppointment?.providerId) {
        return treatmentsList;
      }

      // Safely check if usersData is available before using it
      const currentUsersData = usersData;
      if (!currentUsersData || !Array.isArray(currentUsersData)) {
        return treatmentsList;
      }

      const provider = getProviderWithRole(editingAppointment.providerId);
      if (!provider) {
        return treatmentsList;
      }

      const providerRole = provider.role?.toLowerCase() || "";
      const providerId = editingAppointment.providerId.toString();
      const providerFullName = `${provider.firstName || ""} ${provider.lastName || ""}`.trim().toLowerCase();

      return treatmentsList.filter((treatment: any) => {
        // Check role match
        const treatmentRole = (treatment.doctorRole || treatment.doctor_role || "").toString().toLowerCase();
        const roleMatch = !treatmentRole || treatmentRole === providerRole;
        if (!roleMatch) return false;

        // Check provider ID match
        const treatmentDoctorId = treatment.doctorId || treatment.doctor_id;
        if (treatmentDoctorId && treatmentDoctorId.toString() === providerId) {
          return true;
        }

        // Check provider name match
        const treatmentDoctorName = (treatment.doctorName || "").toString().trim().toLowerCase();
        if (treatmentDoctorName && treatmentDoctorName === providerFullName) {
          return true;
        }

        // If no doctorId or doctorName specified, show it (fallback for treatments without specific provider)
        if (!treatmentDoctorId && !treatmentDoctorName) {
          return roleMatch;
        }

        return false;
      });
    } catch (error) {
      // If usersData is not available yet, return all treatments
      return treatmentsList;
    }
  }, [treatmentsList, editingAppointment?.providerId]);

  // Filter consultations based on selected provider (role and ID/name) for Edit Appointment modal
  const filteredConsultationsForEdit = React.useMemo(() => {
    try {
      if (!editingAppointment?.providerId) {
        return consultationServices;
      }

      // Safely check if usersData is available before using it
      const currentUsersData = usersData;
      if (!currentUsersData || !Array.isArray(currentUsersData)) {
        return consultationServices;
      }

      const provider = getProviderWithRole(editingAppointment.providerId);
      if (!provider) {
        return consultationServices;
      }

      const providerRole = provider.role?.toLowerCase() || "";
      const providerId = editingAppointment.providerId.toString();
      const providerFullName = `${provider.firstName || ""} ${provider.lastName || ""}`.trim().toLowerCase();

      return consultationServices.filter((service: any) => {
        // Check role match
        const serviceRole = (service.doctorRole || service.doctor_role || "").toString().toLowerCase();
        const roleMatch = !serviceRole || serviceRole === providerRole;
        if (!roleMatch) return false;

        // Check provider ID match
        const serviceDoctorId = service.doctorId || service.doctor_id;
        if (serviceDoctorId && serviceDoctorId.toString() === providerId) {
          return true;
        }

        // Check provider name match
        const serviceDoctorName = (service.doctorName || "").toString().trim().toLowerCase();
        if (serviceDoctorName && serviceDoctorName === providerFullName) {
          return true;
        }

        // If no doctorId or doctorName specified, show it (fallback for consultations without specific provider)
        if (!serviceDoctorId && !serviceDoctorName) {
          return roleMatch;
        }

        return false;
      });
    } catch (error) {
      // If usersData is not available yet, return all consultations
      return consultationServices;
    }
  }, [consultationServices, editingAppointment?.providerId]);

  // Format appointment title with role prefix
  const formatAppointmentTitle = (appointment: any) => {
    if (!appointment.title) return appointment.title;
    
    // Check if title contains provider name pattern
    if (appointment.providerId) {
      const provider = getProviderWithRole(appointment.providerId);
      if (provider) {
        // Replace "Appointment with [name]" with "Appointment with [role] [name]"
        const title = appointment.title;
        const providerName = `${provider.firstName || ''} ${provider.lastName || ''}`.trim();
        if (title.includes(providerName) && !title.includes(provider.displayName)) {
          return title.replace(providerName, provider.displayName);
        }
        // If title is just the name, add "Appointment with" prefix
        if (title === providerName || title === `${provider.firstName} ${provider.lastName}`) {
          return `Appointment with ${provider.displayName}`;
        }
      }
    }
    
    return appointment.title;
  };

  // Get creator name from created_by field
  const getCreatorName = (createdBy: number | null | undefined) => {
    if (!createdBy || !usersData || !Array.isArray(usersData)) {
      return null;
    }
    const creator = usersData.find((u: any) => u.id === createdBy);
    if (!creator) return null;
    
    // Handle missing first or last names gracefully
    const firstName = creator.firstName || '';
    const lastName = creator.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Format role for display (capitalize first letter of each word, replace underscores with spaces)
    const role = creator.role || '';
    const formattedRole = role
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return fullName ? `${fullName} (${formattedRole})` : 'Unknown User';
  };

  // Fetch appointments for selected date to check availability
  // Follow the same logic as appointment-calendar.tsx for consistency
  const fetchAppointmentsForDate = async (date: Date): Promise<string[]> => {
    if (!date || !editingAppointment?.providerId) {
      setBookedTimeSlots([]);
      return [];
    }

    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await apiRequest("GET", "/api/appointments");
      const data = await response.json();

      console.log(`[EDIT-APPOINTMENT] ===== FETCHING APPOINTMENTS FOR DATE =====`);
      console.log(`[EDIT-APPOINTMENT] Selected date: ${dateStr}`);
      console.log(`[EDIT-APPOINTMENT] Provider ID: ${editingAppointment.providerId}`);
      console.log(`[EDIT-APPOINTMENT] Total appointments from API:`, data.length);
      console.log(`[EDIT-APPOINTMENT] Sample appointments (first 5):`, data.slice(0, 5).map((apt: any) => ({
        id: apt.id,
        providerId: apt.providerId,
        scheduledAt: apt.scheduledAt,
        status: apt.status,
        duration: apt.duration
      })));

      // Filter appointments for the selected date and provider
      // Use parseScheduledAtAsLocal to correctly parse dates and compare them
      const dayAppointments = data.filter((apt: any) => {
        // Exclude the appointment being edited from conflict checks
        if (editingAppointment && apt.id === editingAppointment.id) {
          console.log('[EDIT-APPOINTMENT] Excluding current editing appointment:', apt.id);
          return false;
        }
        
        // Exclude cancelled appointments - treat them as available slots
        if (apt.status === 'cancelled') {
          console.log('[EDIT-APPOINTMENT] Excluding cancelled appointment:', apt.id);
          return false;
        }
        
        // Only check appointments for the relevant provider
        if (apt.providerId !== editingAppointment.providerId) {
          return false;
        }
        
        // CRITICAL: Parse scheduledAt using the SAME function as time extraction
        // This ensures date comparison works correctly regardless of date format
        const aptDate = parseScheduledAtAsLocal(apt.scheduledAt);
        const aptDateString = format(aptDate, "yyyy-MM-dd");
        
        console.log('[EDIT-APPOINTMENT] Checking appointment date:', {
          appointmentId: apt.id,
          scheduledAtRaw: apt.scheduledAt,
          parsedDate: aptDate.toString(),
          aptDateString,
          selectedDateString: dateStr,
          matches: aptDateString === dateStr
        });
        
        // Only check appointments on the same date (using parsed date, not string extraction)
        if (aptDateString !== dateStr) {
          return false;
        }
        
        return true;
      });

      console.log(`[EDIT-APPOINTMENT] Filtered appointments for date:`, dayAppointments.length);

      // Extract booked time slots based on appointment duration
      // Follow the same logic as appointment-calendar.tsx - check all slots that overlap with appointments
      const bookedSlotsSet = new Set<string>();
      
      dayAppointments.forEach((apt: any) => {
        // CRITICAL: Parse scheduledAt as local time to avoid timezone conversion
        // Use the SAME logic as orange slots (parseScheduledAtAsLocal + getHours/getMinutes)
        const aptDate = parseScheduledAtAsLocal(apt.scheduledAt);
        
        // Extract local time components using the SAME methods as orange slot logic
        // This ensures consistency - if orange slots work, grey slots will work too
        const aptHour = aptDate.getHours(); // Local hour (same as selectedDate.getHours() for orange)
        const aptMinute = aptDate.getMinutes(); // Local minute (same as selectedDate.getMinutes() for orange)
        const aptStartMinutes = aptHour * 60 + aptMinute;
        const aptDuration = apt.duration || 30; // Default to 30 if duration not set
        const aptEndMinutes = aptStartMinutes + aptDuration;
        
        console.log(`[EDIT-APPOINTMENT] Processing booked appointment (SAME LOGIC AS ORANGE):`, {
          appointmentId: apt.id,
          scheduledAtRaw: apt.scheduledAt,
          scheduledAtType: typeof apt.scheduledAt,
          parsedDate: aptDate.toString(),
          parsedDateISO: aptDate.toISOString(),
          localHour: aptHour,
          localMinute: aptMinute,
          utcHour: aptDate.getUTCHours(), // For comparison
          utcMinute: aptDate.getUTCMinutes(), // For comparison
          localTime: `${aptHour}:${aptMinute.toString().padStart(2, '0')}`,
          duration: aptDuration,
          startMinutes: aptStartMinutes,
          endMinutes: aptEndMinutes,
          note: 'Using getHours() (local) not getUTCHours() - same as orange slot logic'
        });
        
        // Generate all 15-minute slots that overlap with this appointment
        // Use the EXACT SAME logic as orange slots for consistency
        for (let slotMinutes = aptStartMinutes; slotMinutes < aptEndMinutes; slotMinutes += 15) {
          const slotHour = Math.floor(slotMinutes / 60);
          const slotMin = slotMinutes % 60;
          
          // Convert to 12-hour format (SAME as orange slot formatting)
          const period = slotHour >= 12 ? 'PM' : 'AM';
          const displayHours = slotHour % 12 || 12;
          const displayMinutes = slotMin === 0 ? '00' : slotMin.toString().padStart(2, '0');
          const slotString = `${displayHours}:${displayMinutes} ${period}`;
          
          console.log(`[EDIT-APPOINTMENT] Adding booked slot:`, {
            slotString,
            slotHour,
            slotMin,
            fromAppointment: apt.id,
            appointmentTime: `${aptHour}:${aptMinute.toString().padStart(2, '0')}`
          });
          
          bookedSlotsSet.add(slotString);
        }
      });

      const bookedSlots = Array.from(bookedSlotsSet).sort();
      console.log(`[EDIT-APPOINTMENT] ===== FINAL BOOKED TIME SLOTS =====`);
      console.log(`[EDIT-APPOINTMENT] Total booked slots: ${bookedSlots.length}`);
      console.log(`[EDIT-APPOINTMENT] Booked time slots:`, bookedSlots);
      console.log(`[EDIT-APPOINTMENT] Appointments processed: ${dayAppointments.length}`);
      console.log(`[EDIT-APPOINTMENT] ===========================================`);

      setBookedTimeSlots(bookedSlots);
      return bookedSlots;
    } catch (error) {
      console.error("[EDIT-APPOINTMENT] Error fetching appointments for date:", error);
      setBookedTimeSlots([]);
      return [];
    }
  };

  // Fetch appointments when editing appointment date or provider changes
  React.useEffect(() => {
    if (editingAppointment?.scheduledAt) {
      // Parse scheduledAt as local time to avoid timezone conversion
      const selectedDate = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
      fetchAppointmentsForDate(selectedDate);
    }
  }, [editingAppointment?.scheduledAt, editingAppointment?.id, editingAppointment?.providerId]);

  // Edit appointment mutation
  const editAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      try {
        console.log('[PATIENT-APPOINTMENTS] Updating appointment:', {
          id: appointmentData.id,
          appointmentType: appointmentData.appointmentType,
          treatmentId: appointmentData.treatmentId,
          consultationId: appointmentData.consultationId,
          duration: appointmentData.duration,
          scheduledAt: appointmentData.scheduledAt,
          fullData: appointmentData
        });
        
      const response = await apiRequest(
        "PUT",
        `/api/appointments/${appointmentData.id}`,
        appointmentData,
      );

      try {
        return await response.json();
      } catch (jsonError) {
        // If JSON parsing fails but response was successful, return a success indicator
        return { success: true };
        }
      } catch (error: any) {
        console.error('[PATIENT-APPOINTMENTS] Update error:', error);
        // Extract error details from error message (format: "500: {...}")
        let errorDetails = error?.message || "Unknown error";
        try {
          // Try to parse JSON from error message
          const match = errorDetails.match(/\{.*\}/);
          if (match) {
            const errorJson = JSON.parse(match[0]);
            errorDetails = errorJson.error || errorJson.details || errorDetails;
            if (errorJson.details && process.env.NODE_ENV === 'development') {
              errorDetails += ` (Details: ${errorJson.details})`;
            }
          }
        } catch (parseError) {
          // If parsing fails, use the original error message
        }
        const enhancedError = new Error(errorDetails);
        (enhancedError as any).originalError = error;
        throw enhancedError;
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
      setEditSelectedTreatment(null);
      setEditSelectedConsultation(null);
    },
    onError: (error: any) => {
      console.error('[PATIENT-APPOINTMENTS] Update failed:', error);
      console.error('[PATIENT-APPOINTMENTS] Original error:', error?.originalError);
      const errorMessage = error?.message || error?.originalError?.message || "Failed to update appointment. Please try again.";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/appointments/${appointmentId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage("The appointment has been successfully deleted.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel appointment mutation for patient users
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest(
        "PUT",
        `/api/appointments/${appointmentId}`,
        { status: "cancelled" }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel appointment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage("The appointment has been successfully cancelled.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error) => {
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditAppointment = (appointment: any) => {
    // Ensure scheduledAt is a proper Date object in local time
    // Also store the original string to avoid timezone conversion when displaying
    // Store the original scheduledAt to identify the existing appointment time (grey)
    console.log('[EDIT-APPOINTMENT] Original appointment data:', {
      scheduledAt: appointment.scheduledAt,
      scheduledAtType: typeof appointment.scheduledAt,
      isDate: appointment.scheduledAt instanceof Date,
      scheduledAtString: appointment.scheduledAt?.toString()
    });
    
    // Store original scheduledAt for comparison (to show grey for existing time)
    let originalScheduledAt: Date | null = null;
    if (appointment.scheduledAt) {
      if (appointment.scheduledAt instanceof Date) {
        originalScheduledAt = new Date(appointment.scheduledAt);
      } else if (typeof appointment.scheduledAt === 'string') {
        originalScheduledAt = new Date(appointment.scheduledAt);
      }
    }
    
    const appointmentCopy = { 
      ...appointment, 
      _originalScheduledAt: null as string | null,
      _originalScheduledAtDate: originalScheduledAt as Date | null
    };
    if (appointment.scheduledAt) {
      let date: Date;
      let originalString: string | null = null;
      
      // Always extract time from the original string if available to avoid timezone conversion
      if (appointment.scheduledAt instanceof Date) {
        // If it's already a Date object, we can't get the original string
        // This shouldn't happen if data comes from API, but handle it anyway
        console.warn('[EDIT-APPOINTMENT] scheduledAt is already a Date object, cannot preserve original string');
        const existingDate = appointment.scheduledAt;
        date = new Date(
          existingDate.getFullYear(),
          existingDate.getMonth(),
          existingDate.getDate(),
          existingDate.getHours(),
          existingDate.getMinutes(),
          existingDate.getSeconds(),
          0
        );
      } else if (typeof appointment.scheduledAt === 'string') {
        // Store the original string for display purposes - this is the key to avoiding timezone conversion
        originalString = appointment.scheduledAt;
        console.log('[EDIT-APPOINTMENT] Original string stored:', originalString);
        
        // Extract time components directly from the string
        if (appointment.scheduledAt.endsWith('Z')) {
          // Extract date and time from UTC string: "2026-03-19T09:30:00.000Z"
          // Treat the UTC time as local time (no conversion)
          const [datePart, timePart] = appointment.scheduledAt.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [timeOnly] = timePart.split('.');
          const [hours, minutes, seconds = 0] = timeOnly.split(':').map(Number);
          
          console.log('[EDIT-APPOINTMENT] Extracted from UTC string:', { year, month, day, hours, minutes });
          
          // Create a local date with these exact components (no timezone conversion)
          date = new Date(year, month - 1, day, hours, minutes, seconds || 0, 0);
        } else {
          // Non-UTC string, parse it
          const parsedDate = new Date(appointment.scheduledAt);
          // Extract components to create a local date (avoiding any conversion)
          date = new Date(
            parsedDate.getFullYear(),
            parsedDate.getMonth(),
            parsedDate.getDate(),
            parsedDate.getHours(),
            parsedDate.getMinutes(),
            parsedDate.getSeconds(),
            0
          );
        }
      } else {
        date = new Date(appointment.scheduledAt);
      }
      
      if (!isNaN(date.getTime())) {
        appointmentCopy.scheduledAt = date;
        appointmentCopy._originalScheduledAt = originalString;
        console.log('[EDIT-APPOINTMENT] Final date object:', {
          date: date.toString(),
          hours: date.getHours(),
          minutes: date.getMinutes(),
          originalString: originalString
        });
      }
    }
    setEditingAppointment(appointmentCopy);
    // Initialize edit form states
    const normalizedAppointmentType = appointment.appointmentType || "consultation";
    setEditAppointmentType(normalizedAppointmentType);
    setEditSelectedTreatment(
      treatmentsList.find((treatment: any) => treatment.id === appointment.treatmentId) || null
    );
    setEditSelectedConsultation(
      consultationServices.find((service: any) => service.id === appointment.consultationId) || null
    );
    setOpenEditAppointmentTypeCombo(false);
    setOpenEditTreatmentCombo(false);
    setOpenEditConsultationCombo(false);
  };

  const handleDeleteAppointment = (appointmentId: number) => {
    setDeletingAppointmentId(appointmentId);
  };

  const handleCancelAppointment = (appointmentId: number) => {
    setCancellingAppointmentId(appointmentId);
  };

  const confirmCancelAppointment = () => {
    if (cancellingAppointmentId) {
      cancelAppointmentMutation.mutate(cancellingAppointmentId);
      setCancellingAppointmentId(null);
    }
  };

  const closeCancelModal = () => {
    setCancellingAppointmentId(null);
  };

  const confirmDeleteAppointment = () => {
    if (deletingAppointmentId) {
      deleteAppointmentMutation.mutate(deletingAppointmentId);
      setDeletingAppointmentId(null);
    }
  };

  const cancelDeleteAppointment = () => {
    setDeletingAppointmentId(null);
  };

  // Parse shift time to minutes (e.g., "09:30" -> 570)
  const parseShiftTimeToMinutes = (time?: string): number => {
    if (!time) return 0;
    const cleaned = time.split(".")[0];
    const parts = cleaned.split(":").map((part) => parseInt(part, 10));
    if (parts.length < 2 || parts.some((num) => Number.isNaN(num))) return 0;
    const [hours, minutes] = parts;
    return hours * 60 + minutes;
  };

  // Get provider shift bounds for a given date (custom shifts first, then default shifts)
  // Checks by role name and provider ID
  const getProviderShiftBounds = (
    providerId: number | string, 
    date: Date,
    roleName?: string
  ): { start: number; end: number } | null => {
    if (!providerId) return null;
    const selectedDateStr = format(date, "yyyy-MM-dd");

    // TIER 1: Check for custom shifts for this date and provider
    if (shiftsData && Array.isArray(shiftsData)) {
      const customShift = shiftsData.find((shift: any) => {
        if (shift.staffId?.toString() !== providerId.toString()) return false;
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
        console.log('[SHIFT-VALIDATION] Using custom shift:', {
          providerId,
          roleName,
          date: selectedDateStr,
          startTime: customShift.startTime,
          endTime: customShift.endTime,
          startMinutes: parseShiftTimeToMinutes(customShift.startTime),
          endMinutes
        });
        return {
          start: parseShiftTimeToMinutes(customShift.startTime),
          end: endMinutes,
        };
      }
    }

    // TIER 2: If no custom shifts, fall back to default shifts from doctor_default_shifts
    // Filter by role name if provided
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => {
        // Match by provider ID
        if (ds.userId?.toString() !== providerId.toString()) return false;
        // If role name is provided, also check role match
        if (roleName && ds.roleName) {
          return ds.roleName.toLowerCase() === roleName.toLowerCase();
        }
        return true;
      });
      
      if (defaultShift) {
        const dayName = format(date, "EEEE");
        if ((defaultShift.workingDays || []).includes(dayName)) {
          let endMinutes = parseShiftTimeToMinutes(defaultShift.endTime || "23:59");
          // Handle midnight - if end time is 00:00, treat as 1440 (end of day)
          // Also handle 23:59 as effectively midnight (1440) to allow last 15-min slot
          const endTimeStr = (defaultShift.endTime || '23:59').toString().toLowerCase();
          if (endMinutes === 0 && (endTimeStr.includes('00:00') || endTimeStr.includes('24:00'))) {
            endMinutes = 1440;
          } else if (endMinutes === 1439) { // 23:59 - treat as midnight to allow 11:45 PM slot
            endMinutes = 1440;
          }
          console.log('[SHIFT-VALIDATION] Using default shift:', {
            providerId,
            roleName,
            date: selectedDateStr,
            dayName,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            startMinutes: parseShiftTimeToMinutes(defaultShift.startTime || '00:00'),
            endMinutes
          });
          return {
            start: parseShiftTimeToMinutes(defaultShift.startTime || '00:00'),
            end: endMinutes,
          };
        }
      }
    }

    console.log('[SHIFT-VALIDATION] No shift found for provider:', providerId, 'role:', roleName, 'on date:', selectedDateStr);
    return null; // No shift found
  };

  // Generate time slots based on shift boundaries (custom shifts first, then default shifts by role)
  const generateTimeSlotsFromShifts = (
    providerId: number | string | null,
    date: Date,
    roleName?: string
  ): string[] => {
    if (!providerId || !date) {
      console.log('[TIME-SLOTS] Missing providerId or date, returning empty slots');
      return [];
    }

    // Get shift bounds using the same logic as getProviderShiftBounds
    const shiftBounds = getProviderShiftBounds(providerId, date, roleName);
    
    if (!shiftBounds) {
      console.log('[TIME-SLOTS] No shift bounds found, returning empty slots');
      return [];
    }

    console.log('[TIME-SLOTS] Generating slots from shift bounds:', {
      providerId,
      roleName,
      date: format(date, 'yyyy-MM-dd'),
      startMinutes: shiftBounds.start,
      endMinutes: shiftBounds.end,
      startTime: `${Math.floor(shiftBounds.start / 60)}:${(shiftBounds.start % 60).toString().padStart(2, '0')}`,
      endTime: `${Math.floor(shiftBounds.end / 60)}:${(shiftBounds.end % 60).toString().padStart(2, '0')}`
    });

    const timeSlots: string[] = [];
    let currentMinutes = shiftBounds.start;

    // Generate 15-minute interval slots between start and end time
    while (currentMinutes < shiftBounds.end) {
      const hour24 = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      
      // Convert to 12-hour format
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 < 12 ? 'AM' : 'PM';
      const timeString = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
      
      timeSlots.push(timeString);
      
      // Move to next 15-minute slot
      currentMinutes += 15;
    }

    console.log('[TIME-SLOTS] Generated', timeSlots.length, 'time slots:', timeSlots.slice(0, 5), '...', timeSlots.slice(-5));
    return timeSlots;
  };

  // Check if sufficient consecutive time slots are available for the selected duration
  // This version accepts bookedSlots as a parameter for validation and checks shift boundaries
  const checkConsecutiveSlotsAvailableWithSlots = (
    date: Date, 
    startTime: Date, 
    duration: number,
    originalScheduledAt: Date | null,
    originalDuration: number,
    bookedSlots: string[],
    providerId: number | string | null,
    roleName?: string
  ): { available: boolean; availableMinutes: number } => {
    if (!date || !startTime || !duration) {
      console.log('[TIME-VALIDATION] Missing required parameters:', { date, startTime, duration });
      return { available: true, availableMinutes: duration };
    }
    
    // Get shift bounds for the provider (checks custom shifts first, then default shifts by role)
    const shiftBounds = providerId ? getProviderShiftBounds(providerId, date, roleName) : null;
    
    // Calculate how many 15-minute slots we need
    const slotsNeeded = Math.ceil(duration / 15);
    
    // Get the start time in minutes (24-hour format)
    const startHour24 = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const startTotalMinutes = startHour24 * 60 + startMinutes;
    const endTotalMinutes = startTotalMinutes + duration;
    
    console.log('[TIME-VALIDATION] ========== VALIDATION DETAILS ==========');
    console.log('[TIME-VALIDATION] Time calculations:', {
      duration,
      slotsNeeded,
      startTime: `${startHour24}:${startMinutes.toString().padStart(2, '0')}`,
      startTotalMinutes,
      endTotalMinutes,
      bookedSlots: bookedSlots.length,
      bookedSlotsList: bookedSlots.slice(0, 10), // Show first 10 for debugging
      originalScheduledAt: originalScheduledAt ? `${originalScheduledAt.getHours()}:${originalScheduledAt.getMinutes().toString().padStart(2, '0')}` : null,
      shiftBounds: shiftBounds ? { 
        start: shiftBounds.start, 
        startTime: `${Math.floor(shiftBounds.start / 60)}:${(shiftBounds.start % 60).toString().padStart(2, '0')}`,
        end: shiftBounds.end,
        endTime: `${Math.floor(shiftBounds.end / 60)}:${(shiftBounds.end % 60).toString().padStart(2, '0')}`
      } : null,
      providerId,
      roleName
    });
    
    // Check if the appointment fits within shift boundaries
    if (shiftBounds) {
      // Check if start time is within shift
      if (startTotalMinutes < shiftBounds.start) {
        console.log('[TIME-VALIDATION] Start time is before shift start');
        return { 
          available: false, 
          availableMinutes: Math.max(0, shiftBounds.start - startTotalMinutes) 
        };
      }
      
      // Check if end time is within shift
      if (endTotalMinutes > shiftBounds.end) {
        const availableMinutes = Math.max(0, shiftBounds.end - startTotalMinutes);
        console.log('[TIME-VALIDATION] End time exceeds shift end', {
          endTotalMinutes,
          shiftEnd: shiftBounds.end,
          availableMinutes
        });
        return { 
          available: false, 
          availableMinutes: availableMinutes 
        };
      }
    }
    
    // Get original appointment's time slots (to exclude from check)
    const originalSlotsSet = new Set<string>();
    if (originalScheduledAt) {
      const originalHour24 = originalScheduledAt.getHours();
      const originalMinutes = originalScheduledAt.getMinutes();
      const originalStartMinutes = originalHour24 * 60 + originalMinutes;
      const originalSlotsNeeded = Math.ceil(originalDuration / 15);
      
      for (let i = 0; i < originalSlotsNeeded; i++) {
        const slotMinutes = originalStartMinutes + (i * 15);
        const slotHour = Math.floor(slotMinutes / 60);
        const slotMinute = slotMinutes % 60;
        
        // Convert to 12-hour format
        let displayHour = slotHour % 12;
        if (displayHour === 0) displayHour = 12;
        const slotPeriod = slotHour >= 12 ? 'PM' : 'AM';
        const slotTimeString = `${displayHour}:${slotMinute.toString().padStart(2, '0')} ${slotPeriod}`;
        originalSlotsSet.add(slotTimeString);
      }
    }
    
    // Check each consecutive 15-minute slot
    let availableSlots = 0;
    let firstUnavailableReason = '';
    
    for (let i = 0; i < slotsNeeded; i++) {
      const slotMinutes = startTotalMinutes + (i * 15);
      const slotHour = Math.floor(slotMinutes / 60);
      const slotMinute = slotMinutes % 60;
      const slotEndMinutes = slotMinutes + 15; // Each slot is 15 minutes
      
      // Check if this slot is within shift boundaries
      if (shiftBounds) {
        if (slotMinutes < shiftBounds.start) {
          console.log('[TIME-VALIDATION] Slot before shift start:', {
            slotMinutes,
            shiftStart: shiftBounds.start
          });
          firstUnavailableReason = 'shift_start';
          break; // Stop at first slot before shift start
        }
        
        // Allow slot if it ends exactly at or before shift end time
        // If shift ends at 5:00 PM (1020 min), 4:45 PM (1005 min) + 15 = 1020 min is allowed
        if (slotEndMinutes > shiftBounds.end) {
          console.log('[TIME-VALIDATION] Slot exceeds shift end:', {
            slotMinutes,
            slotEndMinutes,
            shiftEnd: shiftBounds.end,
            availableSlots: i
          });
          // Calculate how many minutes are available until shift end
          // availableSlots already contains the count of slots before this one
          firstUnavailableReason = 'shift_end';
          break; // Stop at first slot that exceeds shift end
        }
      }
      
      // Convert to 12-hour format for checking against bookedTimeSlots
      let displayHour = slotHour % 12;
      if (displayHour === 0) displayHour = 12;
      const slotPeriod = slotHour >= 12 ? 'PM' : 'AM';
      const slotTimeString = `${displayHour}:${slotMinute.toString().padStart(2, '0')} ${slotPeriod}`;
      
      // Check if this slot is booked (excluding the current appointment's original time)
      const isOriginalSlot = originalSlotsSet.has(slotTimeString);
      const isBooked = bookedSlots.includes(slotTimeString);
      
      if (!isBooked || isOriginalSlot) {
        // Slot is available (either not booked, or it's the original appointment's slot)
        availableSlots++;
      } else {
        // Slot is booked by another appointment
        console.log('[TIME-VALIDATION] Slot unavailable (booked):', slotTimeString, { isBooked, isOriginalSlot });
        firstUnavailableReason = 'booked';
        break; // Stop at first unavailable slot
      }
    }
    
    // Calculate available minutes
    let availableMinutes = availableSlots * 15;
    
    // If we hit shift end boundary, calculate exact minutes available
    if (firstUnavailableReason === 'shift_end' && shiftBounds) {
      // Calculate how many minutes from the start time until shift end
      const minutesUntilShiftEnd = Math.max(0, shiftBounds.end - startTotalMinutes);
      // Round down to nearest 15-minute increment (since we work with 15-minute slots)
      availableMinutes = Math.floor(minutesUntilShiftEnd / 15) * 15;
      console.log('[TIME-VALIDATION] Shift end calculation:', {
        startTotalMinutes,
        shiftEnd: shiftBounds.end,
        minutesUntilShiftEnd,
        availableMinutes
      });
    }
    
    // Ensure availableMinutes is at least 0
    availableMinutes = Math.max(0, availableMinutes);
    
    const isAvailable = availableSlots === slotsNeeded;
    
    console.log('[TIME-VALIDATION] Result:', {
      availableSlots,
      slotsNeeded,
      availableMinutes,
      isAvailable,
      firstUnavailableReason,
      duration,
      endTotalMinutes,
      shiftBounds: shiftBounds ? { start: shiftBounds.start, end: shiftBounds.end } : null
    });
    
    return {
      available: isAvailable,
      availableMinutes: availableMinutes,
    };
  };

  const handleSaveEdit = async () => {
    if (editingAppointment) {
      console.log('[SAVE-EDIT] Starting validation...', {
        scheduledAt: editingAppointment.scheduledAt,
        duration: editingAppointment.duration
      });
      
      // Ensure we have the latest booked slots for the selected date
      // Parse scheduledAt as local time to avoid timezone conversion
      const selectedDate = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
      const latestBookedSlots = await fetchAppointmentsForDate(selectedDate);
      
      // Validate sufficient time availability before saving
      const duration = editingAppointment.duration || 30;
      // Parse scheduledAt as local time to avoid timezone conversion
      const selectedTime = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
      
      // Get original appointment time (to exclude from validation)
      const originalScheduledAt = (editingAppointment as any)._originalScheduledAtDate as Date | null;
      const originalDuration = editingAppointment.duration || 30;
      
      // Get provider ID and role for shift validation
      const providerId = editingAppointment.providerId || editingAppointment.provider_id;
      const provider = providerId ? getProviderWithRole(providerId) : null;
      const roleName = provider?.role;
      
      console.log('[SAVE-EDIT] Provider info:', { providerId, roleName, provider });
      
      // Use the latest booked slots for validation
      const tempBookedSlots = latestBookedSlots;
      
      // Check if there are enough consecutive slots available
      // This checks both booked slots and shift boundaries
      const timeCheck = checkConsecutiveSlotsAvailableWithSlots(
        selectedDate, 
        selectedTime, 
        duration,
        originalScheduledAt,
        originalDuration,
        tempBookedSlots,
        providerId,
        roleName
      );
      
      console.log('[SAVE-EDIT] Time validation result:', timeCheck);
      
      if (!timeCheck.available) {
        // Format the selected time for the error message
        const timeString = formatTime(selectedTime);
        const errorMessage = `Only ${timeCheck.availableMinutes} minutes are available at ${timeString}. Please select another time slot.`;
        
        console.log('[SAVE-EDIT] Insufficient time - showing error:', errorMessage);
        
        setInsufficientTimeMessage(errorMessage);
        setShowInsufficientTimeModal(true);
        return; // Don't save if insufficient time
      }
      
      console.log('[SAVE-EDIT] Time validation passed, proceeding with save...');
      
      const normalizedAppointmentType = editAppointmentType || editingAppointment.appointmentType || "consultation";
      const treatmentId = normalizedAppointmentType === "treatment" ? (editSelectedTreatment?.id || editingAppointment.treatmentId || null) : null;
      const consultationId = normalizedAppointmentType === "consultation" ? (editSelectedConsultation?.id || editingAppointment.consultationId || null) : null;
      
      // Format scheduledAt properly - use local time without timezone conversion
      // CRITICAL: Do NOT use toISOString() or any UTC methods - they cause timezone conversion
      let scheduledAt = editingAppointment.scheduledAt;
      
      console.log('[SAVE-EDIT] Formatting scheduledAt (NO timezone conversion):', {
        original: scheduledAt,
        originalType: typeof scheduledAt,
        isDate: scheduledAt instanceof Date
      });
      
      if (scheduledAt instanceof Date) {
        // Format as local ISO string (YYYY-MM-DDTHH:mm:ss) without timezone conversion
        // DO NOT use scheduledAt.toISOString() - it converts to UTC!
        scheduledAt = formatLocalISOString(scheduledAt);
      } else if (typeof scheduledAt === 'string') {
        // If it's already a string, parse it as local time (no timezone conversion) and format
        // DO NOT use new Date(scheduledAt) directly if it has timezone - use parseScheduledAtAsLocal
        const date = parseScheduledAtAsLocal(scheduledAt);
        if (!isNaN(date.getTime())) {
          scheduledAt = formatLocalISOString(date);
        } else {
          console.error('[SAVE-EDIT] Failed to parse scheduledAt string:', scheduledAt);
        }
      }
      
      console.log('[SAVE-EDIT] Final scheduledAt string (sent to backend):', {
        scheduledAt,
        hasTimezone: scheduledAt.includes('Z') || /[+-]\d{2}:\d{2}$/.test(scheduledAt),
        note: 'Should be FALSE - no timezone indicator means backend treats as local time'
      });
      
      // Ensure all required fields are present
      const updateData: any = {
        id: editingAppointment.id,
      };
      
      // Only include fields that are being updated (not undefined)
      if (editingAppointment.title !== undefined) updateData.title = editingAppointment.title;
      if (editingAppointment.description !== undefined) updateData.description = editingAppointment.description;
      // Always include scheduledAt (required for date/time updates)
      if (scheduledAt) {
        updateData.scheduledAt = scheduledAt;
        console.log('[SAVE-EDIT] Including scheduledAt in update:', {
          original: editingAppointment.scheduledAt,
          originalType: typeof editingAppointment.scheduledAt,
          formatted: scheduledAt,
          parsedBack: parseScheduledAtAsLocal(scheduledAt),
          parsedBackFormatted: formatTime(parseScheduledAtAsLocal(scheduledAt))
        });
      }
      if (editingAppointment.duration !== undefined) updateData.duration = editingAppointment.duration || 30;
      if (editingAppointment.status !== undefined) updateData.status = editingAppointment.status;
      if (editingAppointment.type !== undefined) updateData.type = editingAppointment.type;
      if (normalizedAppointmentType) updateData.appointmentType = normalizedAppointmentType;
      // Always include treatmentId and consultationId (can be null to clear)
      updateData.treatmentId = treatmentId;
      updateData.consultationId = consultationId;
      if (editingAppointment.location !== undefined) updateData.location = editingAppointment.location;
      if (editingAppointment.isVirtual !== undefined) updateData.isVirtual = editingAppointment.isVirtual || false;
      
      console.log('[PATIENT-APPOINTMENTS] Saving appointment update:', updateData);
      editAppointmentMutation.mutate(updateData);
    }
  };

  // Helper function to format date as local ISO string (without timezone conversion)
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
    const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    
    console.log('[FORMAT-LOCAL-ISO] Formatting date without timezone:', {
      inputDate: date.toString(),
      localComponents: { year, month, day, hours, minutes, seconds },
      formatted: result,
      // Verify no timezone conversion by comparing with UTC methods
      utcHours: date.getUTCHours(),
      localHours: date.getHours(),
      timezoneOffset: date.getTimezoneOffset()
    });
    
    return result;
  };

  // Parse scheduledAt values WITHOUT applying JS timezone conversion.
  // This is the SAME function used for both orange slots (current appointment) and grey slots (booked appointments)
  // Handles multiple formats: PostgreSQL timestamp, ISO with timezone, ISO without timezone
  const parseScheduledAtAsLocal = (value: string | Date): Date => {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value !== "string") {
      return new Date(value as any);
    }

    // Handle PostgreSQL timestamp format: "2026-03-24 15:00:00" (space-separated, no timezone)
    // This is the format returned by the database when stored as timestamp without timezone
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
      const [datePart, timePart] = value.split(' ');
      const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
      const [hhStr, mmStr, ssStr] = timePart.split(":");
      const hh = parseInt(hhStr || "0", 10);
      const mm = parseInt(mmStr || "0", 10);
      const ss = parseInt((ssStr || "0").split(".")[0], 10);
      if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
        const result = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0);
        console.log('[PARSE-LOCAL] Parsed PostgreSQL format (space-separated):', {
          input: value,
          components: { y, m, d, hh, mm, ss },
          result: result.toString(),
          resultHours: result.getHours(),
          resultLocalTime: `${result.getHours()}:${result.getMinutes().toString().padStart(2, '0')}`
        });
        return result;
      }
    }

    // Handle ISO format with timezone: "2026-03-26T00:00:00.000Z" or "2026-03-26T15:00:00.000Z"
    // Extract components and treat them as local time (no UTC conversion)
    const isoLike = value.includes("T") && (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value));
    if (isoLike) {
      const [datePart, timePartRaw] = value.split("T");
      const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
      // Remove timezone indicators (Z or +/-HH:mm)
      const timePart = (timePartRaw || "").replace("Z", "").replace(/[+-]\d{2}:\d{2}$/, "");
      const [hhStr, mmStr, ssStr] = timePart.split(":");
      const hh = parseInt(hhStr || "0", 10);
      const mm = parseInt(mmStr || "0", 10);
      const ss = parseInt((ssStr || "0").split(".")[0], 10);
      if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
        const result = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0);
        console.log('[PARSE-LOCAL] Parsed ISO format with timezone (treating as local):', {
          input: value,
          components: { y, m, d, hh, mm, ss },
          result: result.toString(),
          resultHours: result.getHours(),
          resultLocalTime: `${result.getHours()}:${result.getMinutes().toString().padStart(2, '0')}`,
          note: 'Treating UTC time components as local time (no conversion)'
        });
        return result;
      }
    }

    // Handle ISO format without timezone: "2026-03-26T00:00:00" (no Z, no offset)
    if (value.includes("T") && !value.includes("Z") && !/[+-]\d{2}:\d{2}$/.test(value)) {
      const [datePart, timePartRaw] = value.split("T");
      const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
      const [timeOnly] = timePartRaw.split(".");
      const [hhStr, mmStr, ssStr] = timeOnly.split(":");
      const hh = parseInt(hhStr || "0", 10);
      const mm = parseInt(mmStr || "0", 10);
      const ss = parseInt(ssStr || "0", 10);
      if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
        const result = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0);
        console.log('[PARSE-LOCAL] Parsed ISO format without timezone:', {
          input: value,
          components: { y, m, d, hh, mm, ss },
          result: result.toString(),
          resultHours: result.getHours()
        });
        return result;
      }
    }

    // Fallback: plain strings (already local) or non-ISO formats
    const result = new Date(value);
    console.log('[PARSE-LOCAL] Using fallback Date constructor:', {
      input: value,
      result: result.toString(),
      resultHours: result.getHours()
    });
    return result;
  };

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

  const formatTime = (timeString: string | Date) => {
    try {
      // Handle both string and Date object
      const date = parseScheduledAtAsLocal(timeString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return "Invalid time";
    }
  };

  const formatDate = (timeString: string | Date) => {
    try {
      // Handle both string and Date object
      const date = parseScheduledAtAsLocal(timeString);
      return format(date, "EEEE, MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Get filtered users by selected role
  const filteredUsersByRole = React.useMemo(() => {
    if (!roleFilter || !usersData || !Array.isArray(usersData)) return [];
    // Case-insensitive comparison to handle any uppercase/lowercase mismatches
    return usersData.filter((u: any) => u.role?.toLowerCase() === roleFilter.toLowerCase());
  }, [roleFilter, usersData]);

  // Filter appointments based on patient filters (for patient role)
  const getPatientFilteredAppointments = React.useMemo(() => {
    if (user?.role !== "patient") return appointments;

    // Start with appointments already filtered by linked patient id(s) for this login
    let filtered = appointments;

    // Filter by provider (based on role selection)
    if (providerFilter) {
      filtered = filtered.filter((apt: any) => {
        return apt.providerId === parseInt(providerFilter);
      });
    }

    // Filter by date if selected (compare only date, not time)
    if (dateTimeFilter) {
      filtered = filtered.filter((apt: any) => {
        const aptDateTime = parseScheduledAtAsLocal(apt.scheduledAt);
        const filterDate = new Date(dateTimeFilter);
        return isSameDay(aptDateTime, filterDate);
      });
    }

    if (relationFilter) {
      const want = relationFilter.toLowerCase();
      filtered = filtered.filter((apt: any) => {
        const p = patientByIdMap.get(Number(apt.patientId));
        return String(p?.relation ?? "").trim().toLowerCase() === want;
      });
    }

    return filtered;
  }, [
    appointments,
    providerFilter,
    dateTimeFilter,
    relationFilter,
    patientByIdMap,
    user?.role,
  ]);

  /** "Next" for today only — same rules as appointment calendar (after any ongoing block). */
  const nextUpcomingAppointmentId = React.useMemo(() => {
    const list = getPatientFilteredAppointments.filter((apt: any) =>
      isToday(parseScheduledAtAsLocal(apt.scheduledAt)),
    );
    if (!list.length) return null;
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
    const sorted = [...list].sort(
      (a, b) =>
        parseScheduledAtAsLocal(a.scheduledAt).getTime() - parseScheduledAtAsLocal(b.scheduledAt).getTime(),
    );
    const ongoing = sorted
      .map((apt: any) => ({ apt, ...toStartEnd(apt) }))
      .filter(({ apt }) => isActiveForOngoing(apt))
      .filter(({ start, end }) => !Number.isNaN(start.getTime()) && start <= nowForCardStyle && end > nowForCardStyle);
    const all = sorted
      .map((apt: any) => ({ apt, ...toStartEnd(apt) }))
      .filter(({ apt }) => isActiveForOngoing(apt))
      .filter(({ start }) => !Number.isNaN(start.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    if (ongoing.length > 0) {
      const maxOngoingEnd = ongoing.reduce((acc, cur) => (cur.end > acc ? cur.end : acc), ongoing[0].end);
      const afterOngoing = all.filter(({ start }) => start >= maxOngoingEnd);
      if (afterOngoing.length > 0) return Number(afterOngoing[0].apt.id);
    }
    const upcoming = all.filter(({ start }) => start > nowForCardStyle);
    return upcoming.length > 0 ? Number(upcoming[0].apt.id) : null;
  }, [getPatientFilteredAppointments, nowForCardStyle]);

  // Filter and sort appointments by date for the logged-in patient
  const base = user?.role === "patient" ? getPatientFilteredAppointments : appointments;
  const filteredAppointments = sortAppointmentsByCardTimeKind(
    base.filter((apt: any) => {
      const appointmentDate = parseScheduledAtAsLocal(apt.scheduledAt);

      if (selectedFilter === "upcoming") {
        return isFuture(appointmentDate) || isToday(appointmentDate);
      } else if (selectedFilter === "past") {
        return isPast(appointmentDate) && !isToday(appointmentDate);
      }
      return true;
    }),
    nowForCardStyle,
    parseScheduledAtAsLocal,
  );

  // Get upcoming appointments for the logged-in patient
  const upcomingAppointments = appointments.filter((apt: any) => {
    const appointmentDate = parseScheduledAtAsLocal(apt.scheduledAt);
    return (isFuture(appointmentDate) || isToday(appointmentDate)) && apt.status?.toLowerCase() === 'scheduled';
  });

  const nextAppointment =
    upcomingAppointments.length > 0
      ? upcomingAppointments.sort(
          (a: any, b: any) =>
            parseScheduledAtAsLocal(a.scheduledAt).getTime() -
            parseScheduledAtAsLocal(b.scheduledAt).getTime(),
        )[0]
      : null;

  // Upcoming Appointments function with full functionality for dashboard
  const getUpcomingAppointmentsDetails = () => {
    const now = new Date();

    // Filter and sort upcoming appointments
    const sortedUpcomingAppointments = appointments
      .filter((appointment: any) => {
        const appointmentDate = parseScheduledAtAsLocal(appointment.scheduledAt);
        return appointmentDate > now || isToday(appointmentDate);
      })
      .sort((a: any, b: any) => {
        return (
          parseScheduledAtAsLocal(a.scheduledAt).getTime() - parseScheduledAtAsLocal(b.scheduledAt).getTime()
        );
      });

    // Enhanced appointment details for dashboard display
    const enhancedAppointments = sortedUpcomingAppointments.map(
      (appointment: any) => {
        const doctorData = getDoctorSpecialtyData(appointment.providerId);

        return {
          id: appointment.id,
          title: appointment.title || "Medical Consultation",
          doctorName: doctorData.name,
          doctorCategory: doctorData.category,
          doctorSubSpecialty: doctorData.subSpecialty,
          scheduledDate: formatDate(appointment.scheduledAt),
          scheduledTime: formatTime(appointment.scheduledAt),
          rawDateTime: appointment.scheduledAt,
          status: appointment.status,
          statusColor:
            statusColors[appointment.status as keyof typeof statusColors] ||
            "#4A7DFF",
          location: appointment.location || "",
          isVirtual: appointment.isVirtual || false,
          patientId: appointment.patientId,
          providerId: appointment.providerId,
          notes: appointment.notes || "",
          type: appointment.type || "consultation",
        };
      },
    );

    return {
      appointments: enhancedAppointments,
      count: enhancedAppointments.length,
      nextAppointment: enhancedAppointments[0] || null,
      hasUpcomingAppointments: enhancedAppointments.length > 0,
      remainingAppointments: enhancedAppointments.slice(1),
      upcomingInNext7Days: enhancedAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.rawDateTime);
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return aptDate <= weekFromNow;
      }),
      summary: {
        totalUpcoming: enhancedAppointments.length,
        nextInDays:
          enhancedAppointments.length > 0
            ? Math.ceil(
                (new Date(enhancedAppointments[0].rawDateTime).getTime() -
                  now.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null,
        doctorNames: [
          ...new Set(
            enhancedAppointments
              .map((apt: any) => apt.doctorName)
              .filter(Boolean),
          ),
        ],
        appointmentTypes: [
          ...new Set(enhancedAppointments.map((apt: any) => apt.type)),
        ],
      },
    };
  };

  // Get detailed upcoming appointments data
  const upcomingAppointmentsDetails = getUpcomingAppointmentsDetails();

  // Get unique medical specialties and sub-specialties for patient filter
  const getPatientFilterOptions = React.useMemo(() => {
    const doctorsResponse = doctorsData as any;
    if (!doctorsResponse?.doctors || !Array.isArray(doctorsResponse.doctors)) {
      return { specialties: [], subSpecialties: [] };
    }

    const specialties = Array.from(
      new Set(
        doctorsResponse.doctors
          .map((doctor: any) => doctor.medicalSpecialtyCategory)
          .filter(Boolean),
      ),
    ) as string[];

    const subSpecialties = Array.from(
      new Set(
        doctorsResponse.doctors
          .map((doctor: any) => doctor.subSpecialty)
          .filter(Boolean),
      ),
    ) as string[];

    return { specialties, subSpecialties };
  }, [doctorsData]);

  // Show loading state when all data is loading
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden" data-testid="patient-appointments-view">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">
              My Appointments
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
          {user?.role === "patient" && relationFilterOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="relation-filter" className="text-sm text-muted-foreground whitespace-nowrap sr-only sm:not-sr-only sm:inline">
                Relation
              </Label>
              <Select
                value={relationFilter || "__all__"}
                onValueChange={(v) => setRelationFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger id="relation-filter" className="h-9 w-[min(100vw-8rem,11rem)]" data-testid="select-relation-filter">
                  <SelectValue placeholder="All relations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All relations</SelectItem>
                  {relationFilterOptions.map((r) => (
                    <SelectItem key={r} value={r.toLowerCase()}>
                      {formatRelationBadge(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {user?.role === "patient" && (
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
              {showAdvancedFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          )}
          <Button
            onClick={() => onNewAppointment?.()}
            className="flex items-center gap-2"
            data-testid="button-book-appointment"
          >
            <Plus className="h-3 w-3" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Next Appointment Card */}
      {nextAppointment && (
        <Card className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg text-blue-800 dark:text-blue-300">
                Next Appointment
              </CardTitle>
              {user?.role === "patient" &&
                (() => {
                  const np = patientByIdMap.get(Number(nextAppointment.patientId));
                  const rl = formatRelationBadge(np?.relation);
                  return rl ? (
                    <Badge variant="secondary" className="text-xs font-medium">
                      {rl}
                    </Badge>
                  ) : null;
                })()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-lg text-gray-900 dark:text-gray-100">
                    {formatDate(nextAppointment.scheduledAt)} at{" "}
                    {formatTime(nextAppointment.scheduledAt)}
                  </span>
                </div>

                {getDoctorSpecialtyData(nextAppointment.providerId).name && (
                  <div className="flex items-center gap-2 min-w-0">
                    <UserProfileAvatar
                      user={getProviderWithRole(nextAppointment.providerId)}
                      sizeClassName="h-10 w-10"
                      fallbackClassName="text-xs"
                    />
                    <div className="flex min-w-0 items-center gap-2">
                      <Stethoscope className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-300">
                        {getDoctorSpecialtyData(nextAppointment.providerId).name}
                      </span>
                    </div>
                  </div>
                )}

                {getDoctorSpecialtyData(nextAppointment.providerId)
                  .subSpecialty && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {
                        getDoctorSpecialtyData(nextAppointment.providerId)
                          .subSpecialty
                      }
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">{formatAppointmentTitle(nextAppointment)}</span>
                </div>
                {nextAppointment.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-700 dark:text-gray-300">{nextAppointment.location}</span>
                  </div>
                )}
                {nextAppointment.isVirtual && (
                  <div className="flex items-center space-x-2">
                    <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-700 dark:text-gray-300">Virtual Appointment</span>
                  </div>
                )}
              </div>
              {(() => {
                const pres = getStatusBadgePresentation(nextAppointment.status);
                return (
                  <Badge
                    style={pres.style}
                    className={cn("shrink-0 text-sm", pres.className)}
                  >
                    {formatStatusLabelPatientAppointments(nextAppointment.status)}
                  </Badge>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col gap-3">
        {/* Always show Upcoming/Past/All buttons for all users */}
        <div className="flex space-x-2">
          <Button
            variant={selectedFilter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("upcoming")}
            data-testid="button-filter-upcoming"
          >
            Upcoming ({upcomingAppointments.length})
          </Button>
          <Button
            variant={selectedFilter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("past")}
            data-testid="button-filter-past"
          >
            Past (
            {
              appointments.filter((apt: any) => {
                const appointmentDate = new Date(apt.scheduledAt);
                return isPast(appointmentDate) && !isToday(appointmentDate);
              }).length
            }
            )
          </Button>
          <Button
            variant={selectedFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("all")}
            data-testid="button-filter-all"
          >
            All ({appointments.length})
          </Button>
        </div>

        {/* Additional patient-specific filters */}
        {user?.role === "patient" && showAdvancedFilters && (
          <Card className="border-blue-200 dark:border-blue-700 bg-blue-50/30 dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {/* Role Filter */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Role</Label>
                    <Select value={roleFilter} onValueChange={(value) => {
                      setRoleFilter(value);
                      setProviderFilter("");
                    }}>
                      <SelectTrigger data-testid="select-role-filter">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesData && Array.isArray(rolesData) ? rolesData
                          .filter((role: any) => role.name !== 'patient')
                          .map((role: any) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.name}
                              data-testid={`option-role-${role.name}`}
                            >
                              {role.displayName || role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                            </SelectItem>
                          )) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Provider Name Filter */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Provider Name
                    </Label>
                    <Select 
                      value={providerFilter} 
                      onValueChange={setProviderFilter}
                      disabled={!roleFilter}
                    >
                      <SelectTrigger data-testid="select-provider-filter">
                        <SelectValue placeholder={!roleFilter ? "Select role first" : "Select provider"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsersByRole.map((provider: any) => (
                          <SelectItem 
                            key={provider.id} 
                            value={provider.id.toString()}
                            data-testid={`option-provider-${provider.id}`}
                          >
                            {provider.firstName} {provider.lastName}
                          </SelectItem>
                        ))}
                        {roleFilter && filteredUsersByRole.length === 0 && (
                          <SelectItem value="none" disabled data-testid="option-provider-none">
                            No providers found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Date
                    </Label>
                    <input
                      type="date"
                      value={dateTimeFilter}
                      onChange={(e) => setDateTimeFilter(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 [&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:brightness-0 [&::-webkit-calendar-picker-indicator]:dark:contrast-100"
                      data-testid="input-filter-datetime"
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRoleFilter("");
                      setProviderFilter("");
                      setDateTimeFilter("");
                      setRelationFilter("");
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appointments List */}
      <div
        className={cn(
          // Keep cards from stretching across very wide screens
          "space-y-4 overflow-x-hidden min-w-0 w-full max-w-5xl mx-auto",
        )}
      >
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                No {selectedFilter !== "all" ? selectedFilter : ""} appointments
                found
              </h3>
              <p className="text-gray-400 dark:text-gray-500">
                {selectedFilter === "upcoming"
                  ? "You don't have any upcoming appointments scheduled."
                  : selectedFilter === "past"
                    ? "No past appointments to display."
                    : "You haven't scheduled any appointments yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment: any) => {
            const cardTimeKind = getAppointmentCardTimeKind(
              appointment,
              nowForCardStyle,
              parseScheduledAtAsLocal,
            );
            const serviceInfo = getAppointmentServiceInfo(appointment);
            const aptPatient =
              user?.role === "patient"
                ? patientByIdMap.get(Number(appointment.patientId))
                : null;
            const relationLabel = formatRelationBadge(aptPatient?.relation);

            return (
              <Card
                key={appointment.id}
                className={cn(
                  // Allow top-right badges to sit slightly outside the card.
                  // (Badge uses negative top/right, so `overflow-hidden` would clip it.)
                  "relative overflow-visible border rounded-lg pt-6 w-full max-w-full",
                  appointmentCardTimeBackgroundClass(cardTimeKind),
                  "ring-inset hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-600",
                )}
                data-testid={`appointment-${appointment.id}`}
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
                      // Render fully inside card (avoid clipping by parent overflow)
                      "absolute z-20 top-2 right-2 shadow-sm h-5 px-2 py-0 text-[10px] leading-5",
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
                  return (
                    st !== "cancelled" &&
                    st !== "canceled" &&
                    st !== "rescheduled" &&
                    st !== "no_show"
                  );
                })() && (
                  <Badge
                    className={cn(
                      "absolute z-20 top-2 right-2 shadow-sm",
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
                        "absolute z-20 top-2 right-2 shadow-sm",
                        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 text-xs",
                      )}
                    >
                      Next
                    </Badge>
                  )}
                <CardContent className="p-4 sm:p-5 min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-0 truncate">
                            {formatAppointmentTitle(appointment)}
                          </h3>
                          {user?.role === "patient" && relationLabel && (
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium shrink-0"
                              data-testid={`badge-relation-${appointment.id}`}
                            >
                              {relationLabel}
                            </Badge>
                          )}
                          {user?.role === "patient" && appointment.appointmentId && (
                            <Badge
                              variant="outline"
                              className="bg-transparent text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 text-xs font-medium shrink-0 max-w-full break-all"
                              data-testid={`badge-appointment-id-${appointment.id}`}
                            >
                              {appointment.appointmentId}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {normalizeStatus(appointment.status) !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAppointment(appointment)}
                              className="h-8 w-8 p-0"
                              data-testid={`button-edit-appointment-${appointment.id}`}
                            >
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                          )}
                          {/* Cancel Appointment button for patient users */}
                          {user?.role === "patient" && appointment.status === "scheduled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="border-red-500 dark:border-red-600 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                              data-testid={`button-cancel-appointment-${appointment.id}`}
                              title="Cancel Appointment"
                            >
                              Cancel Appointment
                            </Button>
                          )}
                          {user?.role !== "patient" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteAppointment(appointment.id)
                              }
                              className="h-8 w-8 p-0"
                              data-testid={`button-delete-appointment-${appointment.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          )}
                          {(() => {
                            const pres = getStatusBadgePresentation(appointment.status);
                            return (
                              <Badge
                                style={pres.style}
                                className={cn("shrink-0", pres.className)}
                              >
                                {formatStatusLabelPatientAppointments(appointment.status)}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                        {/* Left column */}
                        <div className="space-y-3 min-w-0">
                          {/* Date + Time + Duration */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 min-w-0 truncate">
                              {formatDate(appointment.scheduledAt)}{" "}
                              <span className="text-gray-400 dark:text-gray-500">•</span>{" "}
                              <span className="font-medium">
                                {formatAppointmentTimeRangeLikeCalendar(
                                  appointment,
                                  parseScheduledAtAsLocal,
                                )}
                              </span>
                            </span>
                          </div>

                          {/* Provider */}
                          {getDoctorSpecialtyData(appointment.providerId).name && (
                            <div className="flex items-center gap-2 min-w-0">
                              <UserProfileAvatar user={getProviderWithRole(appointment.providerId)} />
                              <div className="flex min-w-0 items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                <span className="text-sm text-gray-700 dark:text-gray-300 min-w-0 truncate">
                                  {getDoctorSpecialtyData(appointment.providerId).name}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Dermatologist (subSpecialty) */}
                          {user?.role === "patient" &&
                            getDoctorSpecialtyData(appointment.providerId).subSpecialty && (
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {getDoctorSpecialtyData(appointment.providerId).subSpecialty}
                                </span>
                              </div>
                            )}

                          {/* Location (e.g. Neurosurgery) */}
                          {appointment.location && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {appointment.location}
                              </span>
                            </div>
                          )}

                          {/* Patient-only: Service + Appointment Type under provider + dermatologist */}
                        </div>

                        {/* Right column */}
                        <div className="space-y-3 min-w-0">
                          {/* Patient */}
                          <div className="flex items-center gap-2 min-w-0">
                            <PatientRecordAvatar
                              patient={aptPatient ?? currentPatient}
                              usersData={usersData ?? []}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 min-w-0 truncate">
                              {aptPatient
                                ? `${aptPatient.firstName ?? ""} ${aptPatient.lastName ?? ""}`.trim() || "Patient"
                                : currentPatient
                                  ? `${currentPatient.firstName} ${currentPatient.lastName}`
                                  : "Patient"}
                            </span>
                          </div>

                          {/* Category (e.g. Skin, Hair & Appearance) */}
                          {user?.role === "patient" &&
                            getDoctorSpecialtyData(appointment.providerId).category && (
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {getDoctorSpecialtyData(appointment.providerId).category}
                                </span>
                              </div>
                            )}

                          {/* Patient-only: Service + Appointment Type after category */}
                          {user?.role === "patient" && serviceInfo && (
                            <div className="flex flex-col items-start gap-1 pt-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex h-2 w-2 rounded-full border border-gray-300 dark:border-gray-600"
                                  style={{ backgroundColor: serviceInfo.color }}
                                />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Service: {serviceInfo.name}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Appointment Type:{" "}
                                {(serviceInfo.type || "consultation")
                                  .toString()
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (char: string) => char.toUpperCase())}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {appointment.isVirtual && (
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          <span className="text-sm text-blue-600 dark:text-blue-400">
                            Virtual Appointment
                          </span>
                        </div>
                      )}

                      {appointment.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                          {appointment.description}
                        </p>
                      )}

                      {appointment.createdBy && getCreatorName(appointment.createdBy) && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <User className="h-3 w-3" />
                          <span>
                            Booked by: {getCreatorName(appointment.createdBy)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col my-auto">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Edit Appointment
                  </h2>
                    {/* Appointment ID - Badge - After Edit Appointment text */}
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
                    Update appointment details for {user?.firstName}{" "}
                    {user?.lastName}
                  </p>
                  
                  {/* Appointment Information */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
                    {/* Appointment Date & Time - First */}
                    {editingAppointment?.scheduledAt && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Appointment Date & Time
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {(() => {
                            // Use the exact same logic as the appointment card
                            // The appointment card uses formatDate(appointment.scheduledAt) and formatTime(appointment.scheduledAt)
                            // So we should use the same scheduledAt value directly, not convert it
                            
                            // First, try to get the original appointment from appointmentsData to match the card exactly
                            let scheduledAtToUse = editingAppointment.scheduledAt;
                            if (appointmentsData && Array.isArray(appointmentsData)) {
                              const originalAppointment = appointmentsData.find((apt: any) => apt.id === editingAppointment.id);
                              if (originalAppointment && originalAppointment.scheduledAt) {
                                // Use the exact same scheduledAt as the appointment card uses
                                scheduledAtToUse = originalAppointment.scheduledAt;
                              }
                            }
                            
                            // Use formatDate and formatTime exactly as the appointment card does
                            // This ensures the time matches: "4:30 PM" in card = "4:30 PM" in popup
                            return `${formatDate(scheduledAtToUse)} at ${formatTime(scheduledAtToUse)}`;
                          })()}
                        </p>
                      </div>
                    )}
                    
                    {/* Provider Information */}
                    {editingAppointment?.providerId && getProviderWithRole(editingAppointment.providerId) && (
                      <div className="flex flex-wrap items-start gap-3">
                        <UserProfileAvatar
                          user={getProviderWithRole(editingAppointment.providerId)}
                          sizeClassName="h-10 w-10"
                          fallbackClassName="text-sm"
                        />
                        <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Role
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {getProviderWithRole(editingAppointment.providerId)?.role
                                ? getProviderWithRole(editingAppointment.providerId)!.role.charAt(0).toUpperCase() +
                                  getProviderWithRole(editingAppointment.providerId)!.role.slice(1)
                                : "Not set"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Provider
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {getProviderWithRole(editingAppointment.providerId)?.displayName || "Unknown"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingAppointment(null);
                    editBookingHoliday.resetHolidayState();
                    setEditAppointmentType("");
                    setEditSelectedTreatment(null);
                    setEditSelectedConsultation(null);
                  }}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* ROW 1: Title and Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Title */}
                  <div>
                    <Label
                      htmlFor="title"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Title
                    </Label>
                    <input
                      id="title"
                      type="text"
                      value={editingAppointment.title || ""}
                      onChange={(e) =>
                        setEditingAppointment({
                          ...editingAppointment,
                          title: e.target.value,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter appointment title"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Duration (minutes)
                    </Label>
                    <Select
                      value={(editingAppointment.duration || 30).toString()}
                      onValueChange={(value) =>
                        setEditingAppointment({
                          ...editingAppointment,
                          duration: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select duration" />
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

                {/* ROW 2: Status and Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                      placeholder="e.g. wheelchair, assistance, special needs"
                    />
                  </div>
                </div>

                {/* ROW 3: Appointment Type and Select Treatment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Appointment Type */}
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
                          {editAppointmentType ? editAppointmentType.charAt(0).toUpperCase() + editAppointmentType.slice(1) : "Select appointment type"}
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
                                    setEditSelectedTreatment(null);
                                    setEditSelectedConsultation(null);
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
                  </div>

                  {/* Select Treatment or Consultation based on Appointment Type */}
                  {editAppointmentType === "treatment" && (
                    <div>
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
                            {editSelectedTreatment ? editSelectedTreatment.name : "Select a treatment"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search treatments..." />
                            <CommandList>
                              {filteredTreatmentsForEdit.length === 0 ? (
                                <CommandItem disabled>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading treatments...
                                </CommandItem>
                              ) : (
                                <>
                                  <CommandEmpty>No treatments found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredTreatmentsForEdit.map((treatment: any) => (
                                      <CommandItem
                                        key={treatment.id}
                                        value={treatment.id.toString()}
                                        onSelect={() => {
                                          setEditSelectedTreatment(treatment);
                                          setOpenEditTreatmentCombo(false);
                                        }}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <span
                                            className="inline-flex h-3 w-3 rounded-full border border-gray-300"
                                            style={{ backgroundColor: treatment.colorCode || "#D1D5DB" }}
                                          />
                                          <span className="flex-1 text-left">{treatment.name}</span>
                                          {treatment.basePrice && (
                                            <span className="text-xs text-gray-500">
                                              {treatment.currency || "£"} {treatment.basePrice}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {editSelectedTreatment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 px-0 text-blue-600 dark:text-blue-400"
                          onClick={() => setEditSelectedTreatment(null)}
                        >
                          Clear selection
                        </Button>
                      )}
                    </div>
                  )}

                  {editAppointmentType === "consultation" && (
                    <div>
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
                            {editSelectedConsultation ? editSelectedConsultation.serviceName : "Select a consultation"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search consultations..." />
                            <CommandList>
                              {filteredConsultationsForEdit.length === 0 ? (
                                <CommandItem disabled>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading consultations...
                                </CommandItem>
                              ) : (
                                <>
                                  <CommandEmpty>No consultations found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredConsultationsForEdit.map((service: any) => (
                                      <CommandItem
                                        key={service.id}
                                        value={service.id.toString()}
                                        onSelect={() => {
                                          setEditSelectedConsultation(service);
                                          setOpenEditConsultationCombo(false);
                                        }}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <span
                                            className="inline-flex h-3 w-3 rounded-full border border-gray-300"
                                            style={{ backgroundColor: service.colorCode || "#6366F1" }}
                                          />
                                          <span className="flex-1 text-left">{service.serviceName}</span>
                                          {service.fee && (
                                            <span className="text-xs text-gray-500">
                                              {service.currency || "£"} {service.fee}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {editSelectedConsultation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 px-0 text-blue-600 dark:text-blue-400"
                          onClick={() => setEditSelectedConsultation(null)}
                        >
                          Clear selection
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* ROW 4: Select Date and Select Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                    <div className="mt-1 h-[280px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-700 relative z-0">
                      <BookingHolidayTimeSlotPanel
                        selectedDate={editPickerDate}
                        bookingHoliday={editBookingHoliday}
                        emptyMessage="No time slots available for this date."
                      >
                      <div className="grid grid-cols-2 gap-2 relative z-0">
                        {(() => {
                          // Generate time slots based on shift boundaries (custom shifts first, then default shifts by role)
                          const providerId = editingAppointment?.providerId || editingAppointment?.provider_id;
                          const provider = providerId ? getProviderWithRole(providerId) : null;
                          const roleName = provider?.role;
                          // Parse scheduledAt as local time to avoid timezone conversion
                          const selectedDate = editingAppointment?.scheduledAt ? parseScheduledAtAsLocal(editingAppointment.scheduledAt) : new Date();
                          
                          // Generate time slots from shifts
                          const timeSlots = generateTimeSlotsFromShifts(providerId, selectedDate, roleName);
                          
                          // Fallback to default 9 AM - 5 PM if no shifts found
                          if (timeSlots.length === 0) {
                            console.log('[TIME-SLOTS] No shifts found, using default 9 AM - 5 PM');
                            for (let hour = 9; hour <= 17; hour++) {
                              for (let minute = 0; minute < 60; minute += 15) {
                                if (hour === 17 && minute > 0) break; // Stop at 5:00 PM
                                const period = hour >= 12 ? 'PM' : 'AM';
                                const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                                const timeSlot = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
                                timeSlots.push(timeSlot);
                              }
                            }
                          }
                          
                          return timeSlots;
                        })().map((timeSlot) => {
                          // Get duration in minutes (default to 30 if not set)
                          const duration = editingAppointment.duration || 30;
                          
                          // Convert time slot string to total minutes (slot start time)
                          // Each displayed slot represents a 15-minute period starting at that time
                          const [time, period] = timeSlot.split(" ");
                          const [hours, minutes] = time.split(":").map(Number);
                          let slotHour24 = hours;
                          if (period === "PM" && hours !== 12) slotHour24 += 12;
                          if (period === "AM" && hours === 12) slotHour24 = 0;
                          const slotStartMinutes = slotHour24 * 60 + minutes;
                          const slotEndMinutes = slotStartMinutes + 15; // Each displayed slot is 15 minutes
                          
                          // Get the selected appointment's time in minutes
                          // Parse scheduledAt as local time to avoid timezone conversion
                          const selectedDate = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
                          const selectedHour24 = selectedDate.getHours();
                          const selectedMinutes = selectedDate.getMinutes();
                          const selectedStartMinutes = selectedHour24 * 60 + selectedMinutes;
                          const selectedEndMinutes = selectedStartMinutes + duration;
                          
                          // Check if this 15-minute slot overlaps with the selected appointment duration
                          // A slot is selected if it overlaps: slot_start < appointment_end AND slot_end > appointment_start
                          // This ensures all slots that fall within the appointment duration are highlighted in orange
                          const isSelected = slotStartMinutes < selectedEndMinutes && slotEndMinutes > selectedStartMinutes;
                          
                          // Check if this is the original appointment time (should be grey, not orange)
                          const originalScheduledAt = (editingAppointment as any)._originalScheduledAtDate;
                          let isOriginalTime = false;
                          if (originalScheduledAt instanceof Date) {
                            const originalHour24 = originalScheduledAt.getHours();
                            const originalMinutes = originalScheduledAt.getMinutes();
                            const originalStartMinutes = originalHour24 * 60 + originalMinutes;
                            const originalDuration = editingAppointment.duration || 30;
                            const originalEndMinutes = originalStartMinutes + originalDuration;
                            // Check if this slot overlaps with the original appointment time
                            isOriginalTime = slotStartMinutes < originalEndMinutes && slotEndMinutes > originalStartMinutes;
                          }
                          
                          // A time slot is booked if it's in the bookedTimeSlots array AND it's not part of the current selection
                          // This allows the current appointment's time slots to remain selectable
                          const isBooked = bookedTimeSlots.includes(timeSlot) && !isSelected && !isOriginalTime;
                          
                          // Determine if this is a newly selected slot (orange) vs original time (grey)
                          const isNewlySelected = isSelected && !isOriginalTime;

                          return (
                            <button
                              key={timeSlot}
                              type="button"
                              disabled={isBooked}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isBooked) return;

                                const [time, period] = timeSlot.split(" ");
                                const [hours, minutes] = time.split(":");
                                let hour24 = parseInt(hours);
                                if (period === "PM" && hour24 !== 12)
                                  hour24 += 12;
                                if (period === "AM" && hour24 === 12)
                                  hour24 = 0;

                                // Parse the current scheduledAt as local time (no timezone conversion)
                                const currentDate = parseScheduledAtAsLocal(editingAppointment.scheduledAt);
                                // Create new Date with LOCAL time components (no timezone conversion)
                                // Using Date constructor with individual components creates a LOCAL date
                                const newDate = new Date(
                                  currentDate.getFullYear(),
                                  currentDate.getMonth(),
                                  currentDate.getDate(),
                                  hour24, // Local hour (1 for 1:00 AM)
                                  parseInt(minutes), // Local minutes
                                  0, // Local seconds
                                  0 // Local milliseconds
                                );
                                
                                // Verify no timezone conversion occurred
                                const formattedForSave = formatLocalISOString(newDate);
                                
                                console.log('[TIME-SLOT] Selected time slot (NO timezone conversion):', {
                                  timeSlot,
                                  hour24,
                                  minutes: parseInt(minutes),
                                  originalScheduledAt: editingAppointment.scheduledAt,
                                  currentDate: currentDate.toString(),
                                  newDate: newDate.toString(),
                                  newDateLocalHours: newDate.getHours(), // Should match hour24
                                  newDateUTCHours: newDate.getUTCHours(), // May differ - this is expected
                                  formattedForSave, // Will be sent to backend
                                  formattedTime: formatTime(newDate),
                                  note: 'newDate.getHours() should equal hour24 (no conversion)'
                                });
                                
                                setEditingAppointment({
                                  ...editingAppointment,
                                  scheduledAt: newDate,
                                });
                              }}
                              className={`p-2 text-sm rounded border text-center relative z-10 ${
                                isNewlySelected
                                  ? "bg-yellow-500 text-white border-yellow-500"
                                  : isOriginalTime
                                    ? "bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600"
                                  : isBooked
                                      ? "bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600 cursor-not-allowed"
                                      : "bg-green-500 text-white border-green-500 hover:bg-green-600 cursor-pointer"
                              }`}
                              title={
                                isBooked
                                  ? "Time slot already booked"
                                  : "Available time slot"
                              }
                            >
                              {timeSlot}
                              {isBooked && (
                                <span className="block text-xs mt-1">
                                  Booked
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      </BookingHolidayTimeSlotPanel>
                    </div>
                  </div>
                </div>
                  </div>

              {/* Action Buttons - Sticky footer */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 sm:pb-6 z-10">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAppointment(null);
                    editBookingHoliday.resetHolidayState();
                    setEditAppointmentType("");
                    setEditSelectedTreatment(null);
                    setEditSelectedConsultation(null);
                  }}
                  className="px-4 sm:px-6 text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveEdit();
                  }}
                  disabled={editAppointmentMutation.isPending}
                  className="px-4 sm:px-6 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm sm:text-base relative z-20"
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

      {/* Delete Confirmation Modal */}
      {deletingAppointmentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Are you sure you want to delete this appointment?
              </h3>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={cancelDeleteAppointment}
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteAppointment}
                  disabled={deleteAppointmentMutation.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  data-testid="button-confirm-delete"
                >
                  {deleteAppointmentMutation.isPending ? "Deleting..." : "OK"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Confirmation Dialog */}
      <Dialog open={!!cancellingAppointmentId} onOpenChange={closeCancelModal}>
        <DialogContent className="max-h-[min(90vh,90dvh)] max-w-[min(28rem,calc(100vw-2rem))] w-full overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Do you want to cancel this appointment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeCancelModal}>
              No
            </Button>
            <Button 
              onClick={confirmCancelAppointment}
              disabled={cancelAppointmentMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {cancelAppointmentMutation.isPending ? "Cancelling..." : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appointment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {upcomingAppointments.length}
              </div>
              <div className="text-sm text-gray-500">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  appointments.filter((apt: any) => apt.status === "completed")
                    .length
                }
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {appointments.length}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-h-[min(90vh,90dvh)] max-w-[min(28rem,calc(100vw-2rem))] w-full overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            {/* Green Check Circle Icon */}
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            
            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {successMessage.includes("cancelled") 
                ? "Appointment Cancelled Successfully" 
                : successMessage.includes("updated") 
                ? "Appointment Updated Successfully" 
                : "Appointment Deleted Successfully"}
            </h2>
            
            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300">
              {successMessage}
            </p>
            
            {/* Close Button */}
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insufficient Time Available Modal */}
      <Dialog open={showInsufficientTimeModal} onOpenChange={setShowInsufficientTimeModal}>
        <DialogContent className="max-h-[min(90vh,90dvh)] max-w-[min(28rem,calc(100vw-2rem))] w-full overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            {/* Red Warning Icon */}
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <X className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            
            {/* Title */}
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
              Insufficient Time Available
            </h2>
            
            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300">
              {insufficientTimeMessage}
            </p>
            
            {/* OK Button */}
            <Button
              onClick={() => {
                setShowInsufficientTimeModal(false);
                setInsufficientTimeMessage("");
              }}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white w-full"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
