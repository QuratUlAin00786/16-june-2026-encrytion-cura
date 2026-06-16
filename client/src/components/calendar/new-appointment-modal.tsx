import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, User, Mail, Phone } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentSchema, AppointmentFormData } from "./appointment-form-schema";
import { useAuth } from "@/hooks/use-auth";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated: () => void;
}

export function NewAppointmentModal({ isOpen, onClose, onAppointmentCreated }: NewAppointmentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [currentPatientDetails, setCurrentPatientDetails] = useState<any>(null);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const [staffShifts, setStaffShifts] = useState<any[]>([]);
  const [defaultShifts, setDefaultShifts] = useState<any[]>([]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      console.log("🚀 MUTATION START - Sending appointment data:", appointmentData);
      const result = await apiRequest("POST", "/api/appointments", appointmentData);
      console.log("✅ MUTATION SUCCESS - API returned:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🎉 MUTATION onSuccess triggered with data:", data);
      
      // Invalidate appointments cache to refresh the calendar
      console.log("♻️ Invalidating React Query cache...");
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      // Force immediate refetch to ensure appointments list updates
      console.log("🔄 Forcing immediate refetch of appointments...");
      queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      
      // Reset form
      form.reset({
        patientId: "",
        providerId: "",
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "09:00",
        duration: "30",
        type: "consultation",
        department: "Cardiology",
        location: "",
        isVirtual: false
      });
      
      // Close modal and notify parent
      console.log("🔄 Calling onAppointmentCreated callback...");
      onClose();
      onAppointmentCreated();
      
      // Show success toast
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Appointment scheduled successfully - ID: " + ((data as any)?.id || 'Unknown')
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("❌ MUTATION ERROR:", error);
      
      // Show detailed validation error if available
      const errorMessage = error.message || "Failed to create appointment";
      
      toast({
        title: "Appointment Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      providerId: "",
      title: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      time: "09:00",
      duration: "30",
      type: "consultation",
      department: "Cardiology",
      location: "",
      isVirtual: false,
      appointmentType: "consultation",
      providerRole: "",
      treatmentId: "",
      consultationId: ""
    }
  });

  const formData = form.watch();

  const getNormalizedDoctorId = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const getNormalizedDoctorRole = (value?: string | null) => {
    if (!value) {
      return "";
    }
    return value.toString().trim().toLowerCase();
  };

  const normalizeText = (value?: string | null) =>
    value ? value.toString().trim().toLowerCase() : "";

  const selectedProviderName = useMemo(() => {
    const providerId = getNormalizedDoctorId(formData.providerId);
    if (providerId === null) {
      return "";
    }
    const provider = allProviders.find((p) => p.id === providerId);
    if (!provider) {
      return "";
    }
    return normalizeText(`${provider.firstName || ""} ${provider.lastName || ""}`);
  }, [formData.providerId, allProviders]);

  useEffect(() => {
    if (formData.appointmentType === "treatment") {
      if (form.getValues("consultationId")) {
        form.setValue("consultationId", "");
      }
    } else {
      if (form.getValues("treatmentId")) {
        form.setValue("treatmentId", "");
      }
    }
  }, [formData.appointmentType, form]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const uniquePatients = data ? data.filter((patient: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => p.id === patient.id)
      ) : [];
      setPatients(uniquePatients);

      // If user is a patient, find their details and auto-populate
      if (user?.role === 'patient' && uniquePatients.length > 0) {
        console.log("🔍 APPOINTMENT-MODAL: Looking for patient matching user:", { 
          userEmail: user.email, 
          userName: `${user.firstName} ${user.lastName}`,
          userId: user.id 
        });
        console.log("📋 APPOINTMENT-MODAL: Available patients:", uniquePatients.map(p => ({ 
          id: p.id,
          userId: p.userId,
          email: p.email, 
          name: `${p.firstName} ${p.lastName}` 
        })));

        // CRITICAL FIX: Match by userId field in patient record
        // The patient record has: id=3 (patient record ID), userId=13 (user ID)
        // We want to match userId=13 to get patient record ID=3
        const currentPatient = uniquePatients.find((patient: any) => {
          console.log(`🔍 APPOINTMENT-MODAL: Checking patient ID ${patient.id}, userId: ${patient.userId}, user.id: ${user.id}, match: ${patient.userId === user.id}`);
          return patient.userId === user.id;
        });
        
        if (currentPatient) {
          console.log("✅ APPOINTMENT-MODAL: Found matching patient:", currentPatient);
          console.log("✅ APPOINTMENT-MODAL: Patient record ID (correct):", currentPatient.id);
          console.log("✅ APPOINTMENT-MODAL: Patient userId (matches user.id):", currentPatient.userId);
          setCurrentPatientDetails(currentPatient);
          // Auto-populate the form with patient RECORD ID (not user ID)
          form.setValue("patientId", currentPatient.id.toString());
          console.log("✅ APPOINTMENT-MODAL: Form patientId value set to:", currentPatient.id.toString());
        } else {
          console.log("❌ APPOINTMENT-MODAL: No matching patient found for user:", user);
          console.log("❌ APPOINTMENT-MODAL: Available patients:", uniquePatients);
          setCurrentPatientDetails(null);
        }
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatients([]);
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/medical-staff', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Raw medical staff response:", data);
      
      // The API returns {staff: [...]} structure
      const staffArray = data?.staff || [];
      const uniqueProviders = staffArray.filter((provider: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => `${p.firstName} ${p.lastName}` === `${provider.firstName} ${provider.lastName}`)
      );
      
      console.log("Processed providers:", uniqueProviders);
      setAllProviders(uniqueProviders);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setAllProviders([]);
    }
  };

  const { data: treatmentsData = [] } = useQuery({
    queryKey: ["/api/pricing/treatments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/treatments");
      if (!response.ok) {
        throw new Error("Failed to fetch treatments");
      }
      return await response.json();
    },
    enabled: !!user,
  });

  const providerRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    allProviders.forEach((provider) => {
      if (provider.role) {
        rolesSet.add(provider.role.toLowerCase());
      }
    });
    return Array.from(rolesSet);
  }, [allProviders]);

  const filteredProviders = useMemo(() => {
    const base = formData.providerRole ? availableProviders : availableProviders;
    if (!formData.providerRole) {
      return availableProviders;
    }
    return availableProviders.filter(
      (provider) =>
        provider.role?.toLowerCase() === formData.providerRole.toLowerCase(),
    );
  }, [availableProviders, formData.providerRole]);
  const availableTreatments = useMemo(() => {
    if (!user) return [];
    const roleLower = user.role?.toLowerCase();
    const normalizedRole = roleLower || "";

    const selectedProviderId = getNormalizedDoctorId(formData.providerId);
    const selectedRole = getNormalizedDoctorRole(formData.providerRole);

    const baseTreatments = normalizedRole === "doctor"
      ? (treatmentsData || []).filter((treatment: any) => {
          const entryDoctorId = getNormalizedDoctorId(
            treatment.doctorId ?? treatment.doctor_id,
          );
          const entryRole = getNormalizedDoctorRole(
            treatment.doctorRole ?? treatment.doctor_role,
          );
          const matchesById =
            entryDoctorId !== null && entryDoctorId === user.id;
          const matchesByRole =
            entryRole && entryRole === normalizedRole;
          return matchesById || matchesByRole;
        })
      : treatmentsData || [];

    return baseTreatments.filter((treatment: any) => {
      const entryDoctorId = getNormalizedDoctorId(
        treatment.doctorId ?? treatment.doctor_id,
      );
      const entryRole = getNormalizedDoctorRole(
        treatment.doctorRole ?? treatment.doctor_role,
      );
      const entryDoctorName = normalizeText(
        treatment.doctorName ?? treatment.doctor_name,
      );
      const matchesProviderByName =
        selectedProviderName &&
        entryDoctorName === selectedProviderName;
      const matchesProvider =
        selectedProviderId === null ||
        entryDoctorId === selectedProviderId ||
        matchesProviderByName;
      const matchesRole = !selectedRole || entryRole === selectedRole;
      return matchesProvider && matchesRole;
    });
  }, [treatmentsData, user, formData.providerId, formData.providerRole]);

  const filteredConsultationServices = useMemo(() => {
    const selectedProviderId = getNormalizedDoctorId(formData.providerId);
    const selectedRole = getNormalizedDoctorRole(formData.providerRole);

    return (consultationServicesData || []).filter((service: any) => {
      const entryDoctorId = getNormalizedDoctorId(
        service.doctorId ?? service.doctor_id,
      );
      const entryRole = getNormalizedDoctorRole(
        service.doctorRole ?? service.doctor_role,
      );
      const entryDoctorName = normalizeText(
        service.doctorName ?? service.doctor_name,
      );
      const matchesProviderByName =
        selectedProviderName &&
        entryDoctorName === selectedProviderName;
      const matchesProvider =
        selectedProviderId === null ||
        entryDoctorId === selectedProviderId ||
        matchesProviderByName;
      const matchesRole = !selectedRole || entryRole === selectedRole;
      return matchesProvider && matchesRole;
    });
  }, [consultationServicesData, formData.providerId, formData.providerRole]);

  const { data: consultationServicesData = [] } = useQuery({
    queryKey: ["/api/pricing/doctors-fees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/doctors-fees");
      if (!response.ok) {
        throw new Error("Failed to fetch consultation services");
      }
      return await response.json();
    },
    enabled: !!user,
  });

  // Fetch appointments for selected date and doctor to check time slot availability
  const fetchAppointmentsForDate = async (date: string, doctorId: string) => {
    if (!date || !doctorId) {
      setBookedTimeSlots([]);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/appointments', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // CRITICAL DEBUG: Check raw API response
      console.log(`🚨 RAW API RESPONSE - Total appointments:`, data.length, data);
      
      // Filter appointments for the selected date and doctor with "Scheduled" status
      const dayAppointments = data.filter((apt: any) => {
        const aptDateTime = new Date(apt.scheduledAt);
        const aptDate = aptDateTime.toISOString().split('T')[0];
        const isCorrectDate = aptDate === date;
        const isCorrectDoctor = apt.providerId === parseInt(doctorId);
        const isScheduled = apt.status === 'scheduled';
        
        console.log(`[NEW_TIME_SLOTS] Appointment ${apt.id} STATUS DEBUG:`, {
          aptDate,
          selectedDate: date,
          isCorrectDate,
          doctorId: apt.providerId,
          selectedDoctor: parseInt(doctorId),
          isCorrectDoctor,
          status: apt.status,
          statusType: typeof apt.status,
          statusLowercase: apt.status?.toLowerCase(),
          isScheduled,
          scheduledAt: apt.scheduledAt,
          fullAppointment: apt
        });
        
        return isCorrectDate && isCorrectDoctor && isScheduled;
      });

      // Extract booked time slots
      const bookedSlots = dayAppointments.map((apt: any) => {
        const aptTime = new Date(apt.scheduledAt);
        const hours = aptTime.getHours();
        const minutes = aptTime.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes === 0 ? '00' : minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm}`;
      });

      setBookedTimeSlots(bookedSlots);
      console.log("📅 Booked time slots for", date, "with doctor", doctorId, ":", bookedSlots);
    } catch (error) {
      console.error("Error fetching appointments for date:", error);
      setBookedTimeSlots([]);
    }
  };

  const fetchStaffShifts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/shifts', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📋 Fetched staff shifts:", data);
      
      // Map staffId to userId and date to shiftDate for compatibility
      const mappedShifts = data.map((shift: any) => ({
        ...shift,
        userId: shift.staffId,
        shiftDate: shift.date ? new Date(shift.date).toISOString().split('T')[0] : null
      }));
      
      setStaffShifts(mappedShifts);
    } catch (err) {
      console.error("Error fetching staff shifts:", err);
      setStaffShifts([]);
    }
  };

  const fetchDefaultShifts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/default-shifts?forBooking=true', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📋 TWO-TIER SHIFT: Fetched default shifts from API:", data);
      console.log("📋 TWO-TIER SHIFT: Default shifts count:", Array.isArray(data) ? data.length : 'not an array');
      
      // Ensure we have an array
      const shiftsArray = Array.isArray(data) ? data : [];
      setDefaultShifts(shiftsArray);
    } catch (err) {
      console.error("Error fetching default shifts:", err);
      setDefaultShifts([]);
    }
  };

  const getProviderShiftForDate = (providerId: number, date: string) => {
    console.log(`🔍 TWO-TIER SHIFT: Looking for shift - Provider ${providerId}, Date ${date}`);
    console.log(`🔍 TWO-TIER SHIFT: Available staff shifts:`, staffShifts.length);
    console.log(`🔍 TWO-TIER SHIFT: Available default shifts:`, defaultShifts.length);
    
    // Priority 1: Check staff_shifts for custom shift on this specific date
    const customShift = staffShifts.find((shift: any) => 
      shift.userId === providerId && shift.shiftDate === date
    );
    
    if (customShift) {
      console.log(`🎯 TWO-TIER SHIFT: Found CUSTOM shift for provider ${providerId} on ${date}:`, customShift);
      return {
        type: 'custom',
        startTime: customShift.startTime,
        endTime: customShift.endTime,
        isWorking: true
      };
    }
    
    // Priority 2: Check doctor_default_shifts for default schedule
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`📅 TWO-TIER SHIFT: Checking default shifts for day: ${dayOfWeek}`);
    
    const defaultShift = defaultShifts.find((shift: any) => {
      const matchesUser = shift.userId === providerId;
      const hasWorkingDays = shift.workingDays && Array.isArray(shift.workingDays);
      const includesDay = hasWorkingDays && shift.workingDays.includes(dayOfWeek);
      
      console.log(`  Checking shift ${shift.id}: userId=${shift.userId} (match: ${matchesUser}), workingDays=${JSON.stringify(shift.workingDays)}, includes ${dayOfWeek}: ${includesDay}`);
      
      return matchesUser && includesDay;
    });
    
    if (defaultShift) {
      console.log(`📅 TWO-TIER SHIFT: Found DEFAULT shift for provider ${providerId} on ${dayOfWeek}:`, defaultShift);
      return {
        type: 'default',
        startTime: defaultShift.startTime,
        endTime: defaultShift.endTime,
        isWorking: true
      };
    }
    
    console.log(`❌ TWO-TIER SHIFT: No shift found for provider ${providerId} on ${date} (${dayOfWeek})`);
    return null;
  };

  const filterAvailableProviders = () => {
    if (!formData.date || !formData.time || allProviders.length === 0) {
      setAvailableProviders(allProviders);
      return;
    }

    const appointmentDate = new Date(formData.date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    console.log("📅 TWO-TIER SHIFT: Filtering providers for:", formData.date, dayOfWeek, "at", formData.time);
    
    const availableOnThisDateTime = allProviders.filter(provider => {
      // Use two-tier shift system: staff_shifts → doctor_default_shifts
      const shift = getProviderShiftForDate(provider.id, formData.date);
      
      if (!shift) {
        console.log(`❌ ${provider.firstName} ${provider.lastName} - No shift found for ${formData.date}`);
        return false;
      }
      
      // Check if appointment time falls within shift hours
      const appointmentTime = formData.time;
      const startTime = shift.startTime;
      const endTime = shift.endTime;

      if (appointmentTime < startTime || appointmentTime > endTime) {
        console.log(`❌ ${provider.firstName} ${provider.lastName} - Not available at ${appointmentTime} (${shift.type} shift: ${startTime}-${endTime})`);
        return false;
      }

      console.log(`✅ ${provider.firstName} ${provider.lastName} - Available (${shift.type} shift: ${startTime}-${endTime})`);
      return true;
    });

    console.log(`🔍 TWO-TIER SHIFT: Found ${availableOnThisDateTime.length} available providers out of ${allProviders.length}`);
    setAvailableProviders(availableOnThisDateTime);
    
    // Clear selected provider if they're no longer available
    if (formData.providerId && !availableOnThisDateTime.find(p => p.id === parseInt(formData.providerId))) {
      form.setValue("providerId", "");
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form completely when modal opens to prevent multiple selections
      form.reset({
        patientId: "",
        providerId: "",
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "09:00",
        duration: "30",
        type: "consultation",
        department: "Cardiology",
        location: "",
        isVirtual: false
      });
      
      // Clear previous patient details to prevent stale data
      setCurrentPatientDetails(null);
      
      fetchPatients();
      fetchProviders();
      fetchStaffShifts();
      fetchDefaultShifts();
    }
  }, [isOpen]);

  // Filter available providers when date, time, or shifts data changes
  useEffect(() => {
    filterAvailableProviders();
  }, [formData.date, formData.time, allProviders, staffShifts, defaultShifts]);

  // Fetch appointments when date or doctor changes
  useEffect(() => {
    if (formData.date && formData.providerId) {
      fetchAppointmentsForDate(formData.date, formData.providerId);
    } else {
      setBookedTimeSlots([]);
    }
  }, [formData.date, formData.providerId]);

  const onSubmit = (data: AppointmentFormData) => {
    console.log("🔍 FORM VALIDATION - Form data:", data);

    // Check if selected provider is in available list
    if (data.providerId && !availableProviders.find(p => p.id === parseInt(data.providerId))) {
      form.setError("providerId", {
        type: "manual",
        message: "Selected provider is not available at this time"
      });
      return;
    }

    // Fix timezone conversion: Keep time in user's local timezone 
    // Create a proper date object without timezone conversion
    const [year, month, day] = data.date.split('-');
    const [hours, minutes] = data.time.split(':');
    
    // Create date in local timezone and format as ISO string for consistent storage
    const appointmentDate = new Date(
      parseInt(year), 
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day), 
      parseInt(hours), 
      parseInt(minutes)
    );
    
    // Convert to ISO string but keep the local time (no timezone conversion)
    const localDateTime = `${data.date}T${data.time}:00.000Z`;
    
    console.log("🕐 TIMEZONE DEBUG:", {
      selectedDate: data.date,
      selectedTime: data.time,
      finalDateTime: localDateTime,
      dateObject: appointmentDate.toString()
    });
    
    // The patientId field now contains the database ID (as string)
    const patientDatabaseId = parseInt(data.patientId);
    
    if (data.appointmentType === "treatment" && !data.treatmentId) {
      form.setError("treatmentId", {
        type: "required",
        message: "Please select a treatment",
      });
      return;
    }

    if (data.appointmentType === "consultation" && !data.consultationId) {
      form.setError("consultationId", {
        type: "required",
        message: "Please select a consultation service",
      });
      return;
    }

    const appointmentData: any = {
      patientId: patientDatabaseId, // Use numeric database ID directly
      providerId: parseInt(data.providerId),
      title: data.title || `${data.type} appointment`,
      description: data.description || "",
      scheduledAt: localDateTime,
      duration: parseInt(data.duration),
      type: data.type,
      status: "scheduled", // Required field - set default status
      location: data.isVirtual ? "Virtual" : (data.location || `${data.department || 'General'} Department`),
      isVirtual: data.isVirtual
    };

    appointmentData.appointmentType = data.appointmentType;
    appointmentData.providerRole = data.providerRole || null;
    if (data.appointmentType === "treatment") {
      appointmentData.treatmentId = data.treatmentId ? parseInt(data.treatmentId) : null;
      appointmentData.consultationId = null;
    } else {
      appointmentData.consultationId = data.consultationId ? parseInt(data.consultationId) : null;
      appointmentData.treatmentId = null;
    }
    
    console.log("Appointment data being sent:", appointmentData);

    createAppointmentMutation.mutate(appointmentData);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold dark:text-white">Schedule New Appointment</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              data-testid="button-close"
            >
              ✕
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Fill in the details below to schedule a new patient appointment.
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    {user?.role === 'patient' ? (
                      <>
                        <FormLabel className="required">My Information</FormLabel>
                        {currentPatientDetails ? (
                          <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
                            <div className="flex items-center space-x-3">
                              <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                              <div className="flex-1">
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                  {currentPatientDetails.firstName} {currentPatientDetails.lastName}
                                </div>
                                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                                  {currentPatientDetails.email && (
                                    <div className="flex items-center space-x-1">
                                      <Mail className="h-3 w-3" />
                                      <span>{currentPatientDetails.email}</span>
                                    </div>
                                  )}
                                  {currentPatientDetails.phone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="h-3 w-3" />
                                      <span>{currentPatientDetails.phone}</span>
                                    </div>
                                  )}
                                  <div className="text-xs opacity-75">
                                    Patient ID: {currentPatientDetails.patientId || `P${currentPatientDetails.id?.toString().padStart(6, '0')}`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                            <div className="text-gray-600 dark:text-gray-300">Loading your information...</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <FormLabel className="required">Patient Information</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-patient">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients.map((patient: any) => (
                              <SelectItem key={`patient-${patient.id}`} value={patient.id.toString()}>
                                {patient.firstName} {patient.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="required">Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-provider">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select available provider..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredProviders.map((provider: any) => (
                          <SelectItem key={provider.id} value={provider.id.toString()}>
                            Dr. {provider.firstName} {provider.lastName}
                            {provider.department && ` - ${provider.department}`}
                            {provider.specialization && ` (${provider.specialization})`}
                            {provider.workingHours?.start && provider.workingHours?.end 
                              ? ` | ${provider.workingHours.start}-${provider.workingHours.end}`
                              : ''}
                          </SelectItem>
                        ))}
                        {availableProviders.length === 0 && formData.date && formData.time && (
                          <SelectItem value="no-providers" disabled>No providers available at this time</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="providerRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} data-testid="select-provider-role">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providerRoles.length ? (
                          providerRoles.map((role) => (
                            <SelectItem key={`role-${role}`} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-roles" disabled>
                            No provider roles available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="required">Appointment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-appointment-type">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select appointment type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="treatment">Treatment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formData.appointmentType === "treatment" && (
                <FormField
                  control={form.control}
                  name="treatmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Select Treatment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-treatment">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a treatment..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {availableTreatments.length === 0 ? (
                          <SelectItem value="no-treatments" disabled>
                            {user?.role === "doctor"
                              ? "No treatments assigned to your role"
                              : "No treatments available"}
                          </SelectItem>
                        ) : (
                            availableTreatments.map((treatment: any) => (
                              <SelectItem key={`treatment-${treatment.id}`} value={treatment.id.toString()}>
                                <div className="flex justify-between">
                                  <span>{treatment.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {treatment.currency || "GBP"} {treatment.basePrice}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {formData.appointmentType === "consultation" && (
                <FormField
                  control={form.control}
                  name="consultationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Select Consultation</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-consultation">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a consultation..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredConsultationServices.map((service: any) => (
                            <SelectItem key={`consultation-${service.id}`} value={service.id.toString()}>
                              <div className="flex justify-between">
                                <span>{service.service_name}</span>
                                <span className="text-xs text-gray-500">
                                  {service.currency || "GBP"} {service.price}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Neurology">Neurology</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Oncology">Oncology</SelectItem>
                      <SelectItem value="Dermatology">Dermatology</SelectItem>
                      <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                      <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                      <SelectItem value="Radiology">Radiology</SelectItem>
                      <SelectItem value="General Medicine">General Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="required">Select Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="required">Select Time Slot *</FormLabel>
                    <FormControl>
                      <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
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
                          ].map((timeSlot) => {
                            const isSelected = field.value === timeSlot.replace(" ", "").toLowerCase();
                            const isBooked = bookedTimeSlots.includes(timeSlot);
                            
                            // Convert time slot to 24-hour format for comparison with shift hours
                            const [time, period] = timeSlot.split(" ");
                            const [hours, minutes] = time.split(":");
                            let hour24 = parseInt(hours);
                            if (period === "PM" && hour24 !== 12) hour24 += 12;
                            if (period === "AM" && hour24 === 12) hour24 = 0;
                            const timeSlot24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;
                            
                            // Check if time slot is within doctor's shift hours
                            let isWithinShift = true;
                            let shiftInfo = null;
                            
                            if (formData.providerId && formData.date) {
                              const shift = getProviderShiftForDate(parseInt(formData.providerId), formData.date);
                              shiftInfo = shift;
                              
                              if (shift) {
                                isWithinShift = timeSlot24 >= shift.startTime && timeSlot24 <= shift.endTime;
                              } else {
                                // No shift found for this doctor on this date - disable all slots
                                isWithinShift = false;
                              }
                            }
                            
                            const isDisabled = isBooked || !isWithinShift;
                            
                            return (
                              <button
                                key={timeSlot}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  if (isDisabled) return;
                                  field.onChange(timeSlot24);
                                }}
                                className={`p-2 text-sm rounded border text-center ${
                                  isDisabled
                                    ? "bg-gray-400 text-gray-600 border-gray-400 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600"
                                }`}
                                title={
                                  isBooked 
                                    ? "Time slot already booked" 
                                    : !isWithinShift 
                                    ? `Outside doctor's working hours${shiftInfo ? ` (${shiftInfo.startTime}-${shiftInfo.endTime})` : ''}`
                                    : "Available time slot"
                                }
                              >
                                {timeSlot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {availableProviders.length === 0 && formData.date && formData.time && allProviders.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ No providers are available at the selected date and time. Please choose a different time.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-duration">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-type">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="routine_checkup">Check-up</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Appointment title..." data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Additional notes..." 
                      className="h-20" 
                      data-testid="textarea-description" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Room number or location..." data-testid="input-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isVirtual"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-virtual"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Virtual appointment</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit"
                disabled={createAppointmentMutation.isPending}
                data-testid="button-submit"
              >
                {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}