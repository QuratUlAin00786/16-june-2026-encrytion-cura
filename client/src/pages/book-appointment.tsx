import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, startOfDay } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Loader2 } from "lucide-react";
import {
  useBookingHolidayCalendar,
  BookingHolidayTimeSlotPanel,
} from "@/hooks/use-booking-holiday-calendar";

function getSubdomainFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 1 && parts[0] !== "api") {
    return parts[0];
  }
  return null;
}

export default function PublicBookAppointmentPage() {
  const [location, setLocation] = useLocation();
  const subdomain = useMemo(() => getSubdomainFromPath(location), [location]);
  const { toast } = useToast();

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tokenParam = searchParams.get("token") || "";
  const doctorIdParam = searchParams.get("doctorId") || "";

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Array<{ id: number; name: string; role?: string }>>([]);
  const [prefill, setPrefill] = useState<{ email?: string; doctorId?: number } | null>(null);
  const emailLockedByToken = useMemo(() => !!(tokenParam && prefill?.email), [tokenParam, prefill]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [serviceOptions, setServiceOptions] = useState<Array<{ id: number; name: string; base_price?: string; currency?: string }>>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [duration, setDuration] = useState<string>("30");
  const [time, setTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slotConflictMessage, setSlotConflictMessage] = useState<string>("");
  const [duplicationData, setDuplicationData] = useState<any | null>(null);
  const [showDuplicationDialog, setShowDuplicationDialog] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showEditExistingDialog, setShowEditExistingDialog] = useState(false);
  const [editExistingDate, setEditExistingDate] = useState<string>("");
  const [editExistingTime, setEditExistingTime] = useState<string>("");
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [editAllSlots, setEditAllSlots] = useState<string[]>([]);
  const [editBookedSlots, setEditBookedSlots] = useState<string[]>([]);
  const [editSlotsLoading, setEditSlotsLoading] = useState(false);
  const [showEditSummaryDialog, setShowEditSummaryDialog] = useState(false);
  const [editSummary, setEditSummary] = useState<{
    appointmentId: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    duration?: number;
  } | null>(null);
  const [redirectToLoginAfterEdit, setRedirectToLoginAfterEdit] = useState(false);
  const [showRescheduleEmailSentDialog, setShowRescheduleEmailSentDialog] = useState(false);
  const [rescheduleEmailRecipients, setRescheduleEmailRecipients] = useState<string[]>([]);
  const [rescheduleEmailRecipientNames, setRescheduleEmailRecipientNames] = useState<string[]>([]);

  const getNext15Minutes = (hhmm: string): string => {
    const [hhStr, mmStr] = hhmm.split(":");
    let hh = parseInt(hhStr || "0", 10);
    let mm = parseInt(mmStr || "0", 10);
    mm += 15;
    if (mm >= 60) {
      mm -= 60;
      hh = (hh + 1) % 24;
    }
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const hhmmToMinutes = (hhmm: string): number => {
    const [hh, mm] = String(hhmm || "0:0").split(":");
    const h = parseInt(hh || "0", 10);
    const m = parseInt(mm || "0", 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
  };
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showAlreadyBookedDialog, setShowAlreadyBookedDialog] = useState(false);
  const [alreadyBookedDetails, setAlreadyBookedDetails] = useState<any>(null);
  const [rescheduleTargetAppointmentId, setRescheduleTargetAppointmentId] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<{
    appointmentId: string;
    doctorName: string;
    serviceName: string;
    date: string;
    time: string;
    duration: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [logoOk, setLogoOk] = useState(true);

  const normalizeBookedDetails = (input: any) => {
    if (!input) return null;
    if (typeof input === "string") {
      try {
        return JSON.parse(input);
      } catch {
        return null;
      }
    }
    return input;
  };

  const to12Hour = (hhmm?: string | null) => {
    const value = String(hhmm || "").trim();
    if (!value.includes(":")) return value;
    const [hhStr, mmStr] = value.split(":");
    const hh = parseInt(hhStr || "0", 10);
    const mm = (mmStr || "00").slice(0, 2);
    const isAm = hh < 12;
    const displayH = hh % 12 === 0 ? 12 : hh % 12;
    return `${displayH}:${mm} ${isAm ? "AM" : "PM"}`;
  };

  const dateToLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const ymdToLocalDate = (ymd: string): Date | undefined => {
    const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return undefined;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if ([y, mo, d].some((n) => Number.isNaN(n))) return undefined;
    return new Date(y, mo - 1, d, 0, 0, 0, 0);
  };

  const selectedBookingDate = useMemo(
    () => (date ? ymdToLocalDate(date) : undefined),
    [date],
  );

  const setSelectedBookingDate = useCallback(
    (d: Date | undefined) => {
      if (!d) {
        setDate("");
        setTime("");
        return;
      }
      setDate(dateToLocalYMD(d));
      setTime("");
    },
    [],
  );

  const publicBookingHoliday = useBookingHolidayCalendar({
    enabled: !!subdomain,
    selectedDate: selectedBookingDate,
    setSelectedDate: setSelectedBookingDate,
    holidayCalendarUrl: subdomain
      ? (from, to) =>
          `/api/public/${encodeURIComponent(subdomain)}/holiday-calendar?from=${from}&to=${to}`
      : undefined,
  });

  const isPublicBookingDateDisabled = useCallback(
    (d: Date) => {
      const today = startOfDay(new Date());
      if (isBefore(startOfDay(d), today)) return true;
      return publicBookingHoliday.isDateHolidayBlocked(d);
    },
    [publicBookingHoliday.isDateHolidayBlocked],
  );

  // Duplicate check is performed only on "Book Appointment" click (handleSubmit),
  // so the popup always reflects the chosen service + time slot.

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!subdomain) return;
      setLoading(true);
      try {
        // Load doctors for org (public)
        const res = await apiRequest("GET", `/api/public/${encodeURIComponent(subdomain)}/doctors`);
        const data = await res.json();
        if (!cancelled) {
          setDoctors(
            (data?.doctors || []).map((d: any) => ({
              id: d.id,
              name: d.name || `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || `Dr. ${d.id}`,
              role: d.role,
            })),
          );
        }
        // If token present, validate & prefill
        if (tokenParam) {
          try {
            const tokenRes = await apiRequest("GET", `/api/public/${encodeURIComponent(subdomain)}/booking-token/${encodeURIComponent(tokenParam)}`);
            const tokenData = await tokenRes.json();
            if (tokenData?.valid) {
              // If token already booked, block booking and show summary + redirect on OK.
              if (String(tokenData.status || "").toLowerCase() === "booked") {
                const normalized =
                  normalizeBookedDetails(tokenData.bookedDetails) ||
                  normalizeBookedDetails((tokenData as any).booked_details) ||
                  null;
                setAlreadyBookedDetails(
                  normalized || {
                    appointmentId: tokenData.appointmentId ?? (tokenData as any).appointment_id ?? null,
                    doctorId: tokenData.doctorId ?? (tokenData as any).doctor_id ?? null,
                    date: null,
                    time: null,
                  },
                );
                setShowAlreadyBookedDialog(true);
                return;
              }
              if (!cancelled) {
                setPrefill({ email: tokenData.email || "", doctorId: tokenData.doctorId || undefined });
                if (tokenData.email) setEmail(tokenData.email);
                if (tokenData.doctorId) {
                  const nextDoctorId = String(tokenData.doctorId);
                  setDoctorId(nextDoctorId);
                  // Best-effort role preselect from doctors list once loaded
                  const found = (data?.doctors || []).find((d: any) => String(d.id) === nextDoctorId);
                  if (found?.role) setRole(String(found.role).toLowerCase());
                }
              }
            }
          } catch {}
        } else if (doctorIdParam) {
          setDoctorId(doctorIdParam);
        }
      } catch (e: any) {
        console.error("Failed to load doctors/org info:", e);
        toast({ title: "Error", description: "Failed to load organization data", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [subdomain, tokenParam, doctorIdParam, toast]);

  const refetchSlots = useCallback(
    async (opts?: {
      setLoadingState?: boolean;
      cancelledRef?: () => boolean;
      dateOverride?: string;
      doctorIdOverride?: string;
      durationOverride?: string | number;
    }) => {
      const isCancelled = opts?.cancelledRef || (() => false);
      const effectiveDoctorId = opts?.doctorIdOverride ?? doctorId;
      const effectiveDate = opts?.dateOverride ?? date;
      const effectiveDuration = opts?.durationOverride ?? duration;
      if (!subdomain || !effectiveDoctorId || !effectiveDate) {
        setAvailableSlots([]);
        setAllSlots([]);
        setBookedSlots([]);
        return;
      }
      if (opts?.setLoadingState) setSlotsLoading(true);
      try {
        const params = new URLSearchParams({
          doctorId: String(effectiveDoctorId),
          date: String(effectiveDate),
          duration: String(effectiveDuration || 30),
        });
        const res = await apiRequest("GET", `/api/public/${encodeURIComponent(subdomain)}/availability?${params.toString()}`);
        const data = await res.json();
        if (!isCancelled()) {
          const nextAvailable = Array.isArray(data?.slots) ? data.slots : [];
          setAvailableSlots(nextAvailable);
          const nextAllSlots = Array.isArray(data?.allSlots)
            ? data.allSlots
            : Array.isArray(data?.slots)
              ? data.slots
              : [];
          setAllSlots(nextAllSlots);
          const booked15 = Array.isArray(data?.bookedSlots15)
            ? data.bookedSlots15
            : Array.isArray(data?.bookedSlots)
              ? data.bookedSlots
              : [];
          setBookedSlots(booked15);
          setSlotConflictMessage("");
          // Clear selected time if no longer available
          if (time && !nextAvailable.includes(time)) setTime("");
        }
      } catch {
        if (!isCancelled()) {
          setAvailableSlots([]);
          setAllSlots([]);
          setBookedSlots([]);
        }
      } finally {
        if (opts?.setLoadingState && !isCancelled()) setSlotsLoading(false);
      }
    },
    [subdomain, doctorId, date, duration, time],
  );

  useEffect(() => {
    let cancelled = false;
    const loadSlots = async () => {
      await refetchSlots({ setLoadingState: true, cancelledRef: () => cancelled });
    };
    loadSlots();
    return () => { cancelled = true; };
  }, [refetchSlots]);

  useEffect(() => {
    let cancelled = false;
    const loadServices = async () => {
      if (!subdomain || !appointmentType) {
        setServiceOptions([]);
        setServiceId("");
        return;
      }
      setServicesLoading(true);
      try {
        // Map legacy/public-facing "procedure" to backend "treatment"
        const normalizedType = appointmentType === "procedure" ? "treatment" : appointmentType;
        const params = new URLSearchParams({ type: normalizedType });
        if (doctorId) params.set("doctorId", doctorId);
        const res = await apiRequest("GET", `/api/public/${encodeURIComponent(subdomain)}/services?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          const items = Array.isArray(data?.items) ? data.items : [];
          setServiceOptions(items);
          if (serviceId && !items.some((i: any) => String(i.id) === serviceId)) setServiceId("");
        }
      } catch {
        if (!cancelled) setServiceOptions([]);
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    };
    loadServices();
    return () => { cancelled = true; };
  }, [subdomain, appointmentType, doctorId, serviceId]);

  const filteredDoctors = useMemo(() => {
    const normalizedRole = role.trim().toLowerCase();
    if (!normalizedRole) return doctors;
    return doctors.filter((d) => String(d.role || "").toLowerCase() === normalizedRole);
  }, [doctors, role]);

  // If role changes and selected doctor doesn't match, clear doctor & dependent selections
  useEffect(() => {
    if (!role) return;
    if (!doctorId) return;
    const normalizedRole = role.trim().toLowerCase();
    const selected = doctors.find((d) => String(d.id) === doctorId);
    if (selected && String(selected.role || "").toLowerCase() !== normalizedRole) {
      setDoctorId("");
      setServiceId("");
      setTime("");
    }
  }, [role, doctorId, doctors]);

  const disabled =
    submitting ||
    !name.trim() ||
    !phone.trim() ||
    !role ||
    !doctorId ||
    !date ||
    !appointmentType ||
    !serviceId ||
    !time;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Full name is required.";
    if (!phone.trim()) next.phone = "Phone is required.";
    if (!role) next.role = "Role is required.";
    if (!doctorId) next.doctorId = "Please select a provider.";
    if (!appointmentType) next.appointmentType = "Please select appointment type.";
    if (!serviceId) next.serviceId = "Please select a service.";
    if (!date) next.date = "Please select a date.";
    if (!duration) next.duration = "Please select duration.";
    if (!time) next.time = "Please select a time slot.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const ensureCanCreateNewAppointmentOrToast = (): boolean => {
    // Use the same validation rules as the normal booking button.
    setHasSubmitted(true);
    const ok = validate();
    if (!ok) {
      toast({
        title: "Missing details",
        description: "Please select a valid date/time and service before continuing.",
        variant: "destructive",
      });
    }
    return ok;
  };

  const ensurePublicIdentityOrToast = (): boolean => {
    // Public PATCH requires email or phone for identity verification.
    const hasEmail = !!email.trim();
    const hasPhone = !!phone.trim();
    if (hasEmail || hasPhone) return true;
    toast({
      title: "Missing contact details",
      description: "Please enter your email or phone to update an existing appointment.",
      variant: "destructive",
    });
    return false;
  };

  const resetBookingForm = () => {
    // Clear validation + transient UI state so the form is clean for the next booking.
    setHasSubmitted(false);
    setErrors({});
    setSlotConflictMessage("");
    setDuplicationData(null);
    setShowDuplicationDialog(false);
    setShowSummaryDialog(false);
    setShowEditExistingDialog(false);
    setShowEditSummaryDialog(false);
    setEditSummary(null);
    setRedirectToLoginAfterEdit(false);
    setIsSavingEdit(false);

    setName("");
    setPhone("");
    setEmail("");
    setRole("");
    setDoctorId("");
    setDate("");
    setTime("");
    setAppointmentType("");
    setServiceId("");
    setDescription("");
    setDuration("30");

    setAvailableSlots([]);
    setAllSlots([]);
    setBookedSlots([]);
  };

  const handleSubmit = () => {
    (async () => {
      if (!subdomain) {
        toast({ title: "Missing subdomain", description: "Invalid booking URL", variant: "destructive" });
        return;
      }
      setHasSubmitted(true);
      if (!validate()) return;

      // Pre-check duplicate before opening summary
      try {
        const precheckPayload = {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          doctorId: doctorId ? Number(doctorId) : null,
          date,
          appointmentType: appointmentType === "procedure" ? "treatment" : appointmentType,
          treatmentId:
            (appointmentType === "treatment" || appointmentType === "procedure") && serviceId
              ? Number(serviceId)
              : null,
          consultationId:
            appointmentType === "consultation" && serviceId ? Number(serviceId) : null,
        };
        if (precheckPayload.doctorId && date) {
          const res = await apiRequest("POST", `/api/public/${encodeURIComponent(subdomain)}/appointments/check-duplicate`, precheckPayload);
          const data = await res.json();
          if (!res.ok && (String(data?.code || "").includes("DUPLICATE_PATIENT_SAME_DAY") || String(data?.code || "").includes("DUPLICATE_APPOINTMENT_SERVICE"))) {
            setDuplicationData(data);
            setShowDuplicationDialog(true);
            return;
          }
          if (data?.duplicate) {
            setDuplicationData(data);
            setShowDuplicationDialog(true);
            return;
          }
        }
      } catch (err: any) {
        const msg = String(err?.message || "").toUpperCase();
        if (msg.includes("DUPLICATE_PATIENT_SAME_DAY") || msg.includes("DUPLICATE_APPOINTMENT_SERVICE") || msg.includes("409")) {
          // Show duplication dialog on any 409 from precheck
          try {
            const jsonStart = msg.indexOf("{");
            const obj = jsonStart >= 0 ? JSON.parse(err.message.slice(jsonStart)) : null;
            if (obj?.existingAppointment) setDuplicationData(obj);
          } catch {}
          setShowDuplicationDialog(true);
          return;
        }
      }

      setShowSummaryDialog(true);
    })();
  };

  const createPublicAppointment = async (opts?: { suppressConfirmationEmail?: boolean; rescheduleOfAppointmentId?: string }) => {
    if (!subdomain) {
      throw new Error("Invalid booking URL");
    }
    const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        doctorId: Number(doctorId),
        date,
        time,
        appointmentType,
        duration: Number(duration),
        consultationId: appointmentType === "consultation" ? Number(serviceId) : null,
        treatmentId: appointmentType === "treatment" ? Number(serviceId) : null,
        token: tokenParam || null,
        description: description.trim() || null,
        suppressConfirmationEmail: opts?.suppressConfirmationEmail === true,
        rescheduleOfAppointmentId: opts?.rescheduleOfAppointmentId || null,
      };
    const res = await apiRequest("POST", `/api/public/${encodeURIComponent(subdomain)}/appointments`, payload);
    const data = await res.json();
    if (!res.ok) {
      // Include status code so callers can reliably detect 409 conflicts, etc.
      const msg = data?.error || "Failed to book appointment";
      throw new Error(`${res.status}: ${msg}`);
    }
    return data;
  };

  const handleConfirmBooking = async () => {
    if (!subdomain) {
      toast({ title: "Missing subdomain", description: "Invalid booking URL", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // If the booking link has already been used, allow the user to reschedule the
      // originally booked appointment by creating a new one and marking the old as rescheduled.
      if (rescheduleTargetAppointmentId) {
        await handleReplaceExistingAppointment(rescheduleTargetAppointmentId);
        return;
      }

      const data = await createPublicAppointment();
      const selectedDoctor = doctors.find((d) => String(d.id) === doctorId)?.name || "Selected doctor";
      const selectedService = serviceOptions.find((s) => String(s.id) === serviceId)?.name || "Selected service";
      setBookedAppointment({
        appointmentId: String(data?.appointmentId || ""),
        doctorName: selectedDoctor,
        serviceName: selectedService,
        date,
        time,
        duration,
      });
      setShowSummaryDialog(false);
      const checkoutUrl = String(data?.checkoutUrl || "").trim();
      if (checkoutUrl) {
        // Redirect guest to Stripe Checkout (clinic's connected Stripe account)
        window.location.href = checkoutUrl;
        return;
      }
      toast({
        title: "Payment not configured",
        description: "This clinic does not have online payment enabled for the selected service, so the appointment was booked without payment.",
      });
      setShowSuccessDialog(true);
      // Clear the form immediately after a successful non-checkout booking.
      resetBookingForm();
    } catch (e: any) {
      const message = String(e?.message || "Unable to book appointment");
      if (message.includes("409") || message.toLowerCase().includes("selected slot is unavailable")) {
        setSlotConflictMessage("This time slot is already booked. Please select another time.");
        // Immediately refresh availability so the UI updates to show the slot as booked (grey)
        await refetchSlots();
      }
      if (message.includes("DUPLICATE_PATIENT_SAME_DAY")) {
        try {
          const jsonStart = message.indexOf("{");
          const obj = jsonStart >= 0 ? JSON.parse(message.slice(jsonStart)) : null;
          if (obj?.existingAppointment) {
            setDuplicationData(obj);
          }
        } catch {}
        setShowDuplicationDialog(true);
      }
      if (message.includes("BOOKING_LINK_ALREADY_USED") || message.toLowerCase().includes("already been used")) {
        try {
          const details = (e?.message || "").includes("{") ? JSON.parse(String(e.message).split(":").slice(1).join(":").trim()) : null;
          if (details?.bookedDetails) {
            const normalized = normalizeBookedDetails(details.bookedDetails) || details.bookedDetails;
            setAlreadyBookedDetails(normalized);
            setShowAlreadyBookedDialog(true);
            // Persist so reopening the link can show the popup too.
            try {
              const key = `publicBooking:alreadyUsed:${subdomain || ""}:${tokenParam || ""}`;
              sessionStorage.setItem(key, JSON.stringify(normalized));
            } catch {}
          } else {
            setShowAlreadyBookedDialog(true);
          }
        } catch {
          setShowAlreadyBookedDialog(true);
        }
        // As requested: instead of showing a booking error, redirect to login.
        window.location.href = "/auth/login";
        return;
      }
      toast({ title: "Booking failed", description: e?.message || "Unable to book appointment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const extractAppointmentId = (input: any): string | null => {
    if (!input) return null;
    if (typeof input === "string" || typeof input === "number") {
      const s = String(input).trim();
      return s ? s : null;
    }
    if (typeof input === "object") {
      const candidate =
        (input as any)?.appointment_id ??
        (input as any)?.appointmentId ??
        (input as any)?.id ??
        null;
      if (candidate == null) return null;
      const s = String(candidate).trim();
      return s ? s : null;
    }
    return null;
  };

  const handleReplaceExistingAppointment = async (appointmentIdOverride?: any) => {
    // Instead of updating the existing appointment (PATCHing date/time), we mark it as rescheduled
    // and create a brand-new appointment with the currently selected service + slot.
    if (!subdomain) {
      toast({ title: "Missing subdomain", description: "Invalid booking URL", variant: "destructive" });
      return;
    }
    const apptId =
      extractAppointmentId(appointmentIdOverride) ||
      extractAppointmentId(duplicationData?.existingAppointment) ||
      extractAppointmentId(duplicationData?.existingAppointment?.appointment_id) ||
      extractAppointmentId(alreadyBookedDetails?.appointmentId) ||
      extractAppointmentId(alreadyBookedDetails?.appointment_id) ||
      null;
    if (!apptId) {
      toast({ title: "Missing appointment", description: "No existing appointment to reschedule.", variant: "destructive" });
      return;
    }
    if (!ensurePublicIdentityOrToast()) return;
    if (!ensureCanCreateNewAppointmentOrToast()) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      // 1) Mark the existing appointment as rescheduled first.
      // This is required because the public booking endpoint blocks same-service duplicates for scheduled/confirmed,
      // so we must reschedule the existing record before creating the new one.
      const rescheduleRes1 = await apiRequest(
        "PATCH",
        `/api/public/${encodeURIComponent(subdomain)}/appointments/${encodeURIComponent(apptId)}`,
        {
          email: email.trim() || null,
          phone: phone.trim() || null,
          status: "rescheduled",
        },
      );
      const ct1 = rescheduleRes1.headers.get("content-type") || "";
      const body1 = ct1.includes("application/json") ? await rescheduleRes1.json() : await rescheduleRes1.text();
      if (!rescheduleRes1.ok) {
        const msg = typeof body1 === "string" ? body1 : (body1?.error || "Failed to reschedule existing appointment");
        throw new Error(msg);
      }

      // 2) Create the new appointment.
      const data = await createPublicAppointment({ suppressConfirmationEmail: true, rescheduleOfAppointmentId: String(apptId) });
      const createdAppointmentId = String(data?.appointmentId || "").trim();

      // 3) Trigger reschedule notification email including both old + new appointment IDs/details.
      if (createdAppointmentId) {
        const rescheduleRes2 = await apiRequest(
          "PATCH",
          `/api/public/${encodeURIComponent(subdomain)}/appointments/${encodeURIComponent(apptId)}`,
          {
            email: email.trim() || null,
            phone: phone.trim() || null,
            status: "rescheduled",
            newAppointmentId: createdAppointmentId,
            sendRescheduleEmail: true,
          },
        );
        const ct2 = rescheduleRes2.headers.get("content-type") || "";
        const body2 = ct2.includes("application/json") ? await rescheduleRes2.json() : await rescheduleRes2.text();
        if (!rescheduleRes2.ok) {
          console.warn("[Public booking] reschedule email trigger failed:", body2);
        } else {
          const attempted = Array.isArray((body2 as any)?.rescheduleEmail?.attempted)
            ? (body2 as any).rescheduleEmail.attempted
            : [];
          const results = Array.isArray((body2 as any)?.rescheduleEmail?.results)
            ? (body2 as any).rescheduleEmail.results
            : [];
          const anyFailed = results.some((r: any) => r && r.ok === false);

          // If backend didn't return diagnostics, treat as failure so we don't silently claim success.
          const hasDiagnostics = "rescheduleEmail" in (body2 as any);

          if (!hasDiagnostics || attempted.length === 0 || anyFailed) {
            toast({
              title: "Email not sent",
              description: "Appointment was rescheduled, but email notification failed. Please contact the clinic.",
              variant: "destructive",
            });
          } else {
            setRescheduleEmailRecipients(attempted);
            // Display names (not email addresses) in the UI.
            const selectedDoctor = doctors.find((d) => String(d.id) === doctorId)?.name || "Selected doctor";
            const names: string[] = [];
            const patientName = name.trim();
            if (patientName) names.push(patientName);
            if (selectedDoctor) names.push(selectedDoctor);
            setRescheduleEmailRecipientNames(names);
            setShowRescheduleEmailSentDialog(true);
          }
        }
      }

      // 4) Continue with the normal UI flow (checkout redirect or success dialog).
      const selectedDoctor = doctors.find((d) => String(d.id) === doctorId)?.name || "Selected doctor";
      const selectedService = serviceOptions.find((s) => String(s.id) === serviceId)?.name || "Selected service";
      setBookedAppointment({
        appointmentId: createdAppointmentId,
        doctorName: selectedDoctor,
        serviceName: selectedService,
        date,
        time,
        duration,
      });
      setShowDuplicationDialog(false);
      setShowSummaryDialog(false);
      setShowAlreadyBookedDialog(false);
      setRescheduleTargetAppointmentId(null);
      const checkoutUrl = String(data?.checkoutUrl || "").trim();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      toast({
        title: "Appointment rescheduled",
        description: "The existing appointment was rescheduled and a new appointment was created.",
      });
      setShowSuccessDialog(true);
      // Clear the form after reschedule+new booking (non-checkout).
      resetBookingForm();
    } catch (e: any) {
      toast({
        title: "Replace failed",
        description: e?.message || "Unable to reschedule existing appointment and book a new one.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <Header hideSignOut showLogo />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Book an Appointment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the details below to schedule your visit with the clinic.
          </p>
        </div>
        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/60 pb-4 mb-2">
            <CardTitle className="text-lg font-semibold">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-6">
                {/* Row 1: Full Name + Email + Phone */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                    {hasSubmitted && errors.name && (
                      <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                    )}
                </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    {emailLockedByToken ? (
                      <div className="h-10 px-3 flex items-center rounded-md border bg-muted/40 text-sm text-foreground">
                        {email || "-"}
                      </div>
                    ) : (
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Appointment confirmation will be sent on this email
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7XXX XXXXXX"
                    />
                    {hasSubmitted && errors.phone && (
                      <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Row 2: Role + Doctor + Duration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <Select
                      value={role}
                      onValueChange={(v) => {
                        setRole(v);
                        if (hasSubmitted) setTimeout(() => validate(), 0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasSubmitted && errors.role && (
                      <p className="text-xs text-red-600 mt-1">{errors.role}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Doctor</label>
                    <Select
                      value={doctorId}
                      onValueChange={(v) => {
                        setDoctorId(v);
                        if (hasSubmitted) setTimeout(() => validate(), 0);
                      }}
                      disabled={!role}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={role ? "Select provider" : "Select role first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDoctors.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasSubmitted && errors.doctorId && (
                      <p className="text-xs text-red-600 mt-1">{errors.doctorId}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration</label>
                    <Select
                      value={duration}
                      onValueChange={(v) => {
                        setDuration(v);
                        if (hasSubmitted) setTimeout(() => validate(), 0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
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
                    {hasSubmitted && errors.duration && (
                      <p className="text-xs text-red-600 mt-1">{errors.duration}</p>
                    )}
                  </div>
                </div>

                {/* Row 3: Appointment Type + Service + Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Appointment Type</label>
                    <Select
                      value={appointmentType}
                      onValueChange={(v) => {
                        setAppointmentType(v);
                        if (hasSubmitted) setTimeout(() => validate(), 0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="treatment">Treatment</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasSubmitted && errors.appointmentType && (
                      <p className="text-xs text-red-600 mt-1">{errors.appointmentType}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {appointmentType === "consultation" ? "Consultation Service" : "Treatment Service"}
                    </label>
                    <Select
                      value={serviceId}
                      onValueChange={(v) => {
                        setServiceId(v);
                        if (hasSubmitted) setTimeout(() => validate(), 0);
                      }}
                      disabled={!appointmentType || servicesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={servicesLoading ? "Loading services..." : "Select service"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceOptions.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                            {s.base_price != null ? ` - ${s.currency || "GBP"} ${s.base_price}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasSubmitted && errors.serviceId && (
                      <p className="text-xs text-red-600 mt-1">{errors.serviceId}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. wheelchair, assistance, special needs"
                      rows={3}
                    />
                </div>
                </div>

                {/* Row 4: Select Date + Select Time Slot (calendar style) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Date</label>
                    <div className="border rounded-lg p-3 bg-gray-50 overflow-y-auto">
                      <CalendarComponent
                        mode="single"
                        selected={selectedBookingDate}
                        onSelect={(d) => {
                          publicBookingHoliday.handleDateSelect(d);
                          if (hasSubmitted) setTimeout(() => validate(), 0);
                        }}
                        disabled={isPublicBookingDateDisabled}
                        className="rounded-md w-full"
                        {...publicBookingHoliday.calendarProps}
                        classNames={{
                          ...publicBookingHoliday.calendarProps.classNames,
                          month: "space-y-4 w-full",
                          table: "w-full table-fixed border-collapse",
                          head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                          cell:
                            "h-10 w-full text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day:
                            "h-10 w-full p-0 font-normal aria-selected:opacity-100 inline-flex flex-col items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
                        }}
                      />
                      {publicBookingHoliday.legend}
                    </div>
                    {hasSubmitted && errors.date && (
                      <p className="text-xs text-red-600 mt-2">{errors.date}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium">Select Time Slot</label>
                      {slotsLoading && (
                        <span className="text-xs text-muted-foreground">Loading available slots…</span>
                      )}
                    </div>
                    <div className="border rounded-lg bg-gray-50 h-[360px] overflow-hidden flex flex-col">
                      <BookingHolidayTimeSlotPanel
                        selectedDate={selectedBookingDate}
                        bookingHoliday={publicBookingHoliday}
                        emptyMessage="Time slots will appear here"
                      >
                      <div className="p-3 border-b bg-muted/30">
                        <div className="text-xs font-medium mb-1">Legend</div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="inline-block h-3 w-3 rounded bg-emerald-500" />
                            <span>Available</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="inline-block h-3 w-3 rounded bg-gray-400" />
                            <span>Booked</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 overflow-y-auto flex-1">
                        {allSlots.length === 0 && !slotsLoading ? (
                          <div className="flex items-center justify-center h-full min-h-[120px]">
                            <p className="text-gray-400 text-sm">No available time slots for this date.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {allSlots.map((slot) => {
                              const isBooked = bookedSlots.includes(slot);
                              const isAvailable = availableSlots.includes(slot) && !isBooked;
                              const isSelected = time === slot;
                              const label = (() => {
                                const [hh, mm] = slot.split(":");
                                let h = parseInt(hh, 10);
                                const am = h < 12;
                                const displayH = h % 12 === 0 ? 12 : h % 12;
                                return `${displayH.toString().padStart(1, "0")}:${mm} ${am ? "AM" : "PM"}`;
                              })();
                              return (
                                <Button
                                  key={slot}
                                  variant="outline"
                                  className={`h-10 text-xs font-medium ${
                                    !isAvailable
                                      ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300"
                                      : isSelected
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                                  }`}
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    if (!isAvailable) return;
                                    setTime(slot);
                                    setSlotConflictMessage("");
                                    if (hasSubmitted) setTimeout(() => validate(), 0);
                                  }}
                                >
                                  {label}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      </BookingHolidayTimeSlotPanel>
                    </div>
                    {hasSubmitted && errors.time && (
                      <p className="text-xs text-red-600 mt-2">{errors.time}</p>
                    )}
                    {!!slotConflictMessage && (
                      <p className="text-xs text-red-600 mt-2">{slotConflictMessage}</p>
                    )}
                    {!slotsLoading && bookedSlots.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Grey slots are already booked.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/60 mt-2">
                  <div>
                    {!!tokenParam && (
                      <p className="text-xs text-muted-foreground">
                        This booking link was shared with you by the clinic.
                      </p>
                    )}
                  </div>
                  <Button onClick={handleSubmit} disabled={disabled}>
                    {submitting ? "Booking..." : "Book Appointment"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDuplicationDialog} onOpenChange={setShowDuplicationDialog}>
        <DialogContent hideCloseButton>
          <DialogHeader>
            <DialogTitle>Appointment duplication detected</DialogTitle>
            <DialogDescription>
              An appointment already exists for the selected service. You can reschedule the existing one and book this new slot.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Existing</div>
              {duplicationData?.existingAppointment ? (
                <div className="space-y-1">
                  <div><span className="font-medium">Appointment ID:</span> {duplicationData.existingAppointment.appointment_id}</div>
                  <div><span className="font-medium">Service:</span> {duplicationData.existingAppointment.service_name || "-"}</div>
                  <div><span className="font-medium">Date:</span> {duplicationData.existingAppointment.scheduled_date || String(duplicationData.existingAppointment.scheduled_at).split("T")[0]}</div>
                  <div><span className="font-medium">Time:</span> {to12Hour(duplicationData.existingAppointment.scheduled_time || String(duplicationData.existingAppointment.scheduled_at).split("T")[1]?.slice(0,5))}</div>
                  <div><span className="font-medium">Duration:</span> {duplicationData.existingAppointment.duration} minutes</div>
                </div>
              ) : (
                <div className="text-muted-foreground">No existing appointment details.</div>
              )}
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">New booking</div>
              <div className="space-y-1">
                <div><span className="font-medium">Service:</span> {serviceOptions.find((s) => String(s.id) === serviceId)?.name || "-"}</div>
                <div><span className="font-medium">Date:</span> {date || "-"}</div>
                <div><span className="font-medium">Time:</span> {to12Hour(time) || "-"}</div>
                <div><span className="font-medium">Duration:</span> {duration || "-"} minutes</div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowDuplicationDialog(false)}>Back</Button>
            <Button
              disabled={submitting}
              onClick={handleReplaceExistingAppointment}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rescheduling…
                </span>
              ) : (
                "Reschedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule email sent dialog */}
      <Dialog open={showRescheduleEmailSentDialog} onOpenChange={setShowRescheduleEmailSentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Email Sent</DialogTitle>
            <DialogDescription>
              The rescheduled appointment email was sent successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recipients</div>
              {rescheduleEmailRecipientNames.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {rescheduleEmailRecipientNames.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground">—</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowRescheduleEmailSentDialog(false);
                setRescheduleEmailRecipients([]);
                setRescheduleEmailRecipientNames([]);
                window.location.href = "/auth/login";
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Appointment Summary Dialog */}
      <Dialog open={showEditSummaryDialog} onOpenChange={setShowEditSummaryDialog}>
        <DialogContent
          className="max-w-md"
          hideCloseButton
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Update Appointment Summary</DialogTitle>
            <DialogDescription>Your appointment has been updated.</DialogDescription>
          </DialogHeader>
          {editSummary && (
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Appointment ID:</span> {editSummary.appointmentId}</p>
              <div className="mt-2 rounded-md border p-3">
                <p className="font-medium mb-1">Previous</p>
                <p>Date: {editSummary.oldDate}</p>
                <p>Time: {to12Hour(editSummary.oldTime)}</p>
              </div>
              <div className="mt-2 rounded-md border p-3">
                <p className="font-medium mb-1">New</p>
                <p>Date: {editSummary.newDate}</p>
                <p>Time: {to12Hour(editSummary.newTime)}</p>
                {!!editSummary.duration && <p>Duration: {editSummary.duration} minutes</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setShowEditSummaryDialog(false);
                setEditSummary(null);
                if (redirectToLoginAfterEdit) {
                  window.location.href = "/auth/login";
                }
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Existing Appointment Dialog */}
      <Dialog open={showEditExistingDialog} onOpenChange={setShowEditExistingDialog}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Appointment</DialogTitle>
            <DialogDescription>Update appointment details for {name || "guest"}</DialogDescription>
          </DialogHeader>
          {duplicationData?.existingAppointment?.appointment_id ? (
            <div className="text-sm text-muted-foreground -mt-2">
              <span className="font-medium text-foreground">Appointment ID:</span>{" "}
              {duplicationData.existingAppointment.appointment_id}
            </div>
          ) : null}

          {/* Provider summary row */}
          <div className="mb-2 grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="text-sm font-semibold">{role ? role.charAt(0).toUpperCase() + role.slice(1) : "Doctor"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Provider</p>
              <p className="text-sm font-semibold">
                {doctors.find((d) => String(d.id) === doctorId)?.name || "Selected provider"}
              </p>
            </div>
          </div>

          {/* Top row: Title (derived), Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={`Appointment with ${name || "Guest"}`}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <Select value={duration} onValueChange={(v) => setDuration(v)}>
                      <SelectTrigger>
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

          {/* Second row: Type + Service, Status + Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
              <label className="block text-sm font-medium mb-1">Appointment Type</label>
              <Select value={appointmentType} onValueChange={(v) => setAppointmentType(v)}>
                      <SelectTrigger>
                  <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">
                  {appointmentType === "consultation" ? "Select Consultation" : "Select Treatment"}
                </label>
                <Select
                  value={serviceId}
                  onValueChange={(v) => setServiceId(v)}
                  disabled={!appointmentType || servicesLoading}
                >
                      <SelectTrigger>
                    <SelectValue placeholder={servicesLoading ? "Loading services..." : "Select service"} />
                      </SelectTrigger>
                      <SelectContent>
                    {serviceOptions.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                {!!serviceId && (
                  <Button variant="ghost" size="sm" className="px-0 mt-1" onClick={() => setServiceId("")}>
                    Clear selection
                  </Button>
                    )}
                  </div>
                </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value="scheduled" onValueChange={() => { /* keep scheduled for public */ }} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes for the clinic"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Availability fetch for edit dialog */}
          {useEffect(() => {
            let cancelled = false;
            const load = async () => {
              if (!subdomain || !doctorId || !(editExistingDate || date)) {
                if (!cancelled) {
                  setEditSlots([]); setEditAllSlots([]); setEditBookedSlots([]);
                }
                return;
              }
              setEditSlotsLoading(true);
              try {
                const params = new URLSearchParams({
                  doctorId: String(doctorId),
                  date: String(editExistingDate || date),
                  duration: String(duration || 30),
                });
                if (duplicationData?.existingAppointment?.appointment_id) {
                  params.set("excludeAppointmentId", String(duplicationData.existingAppointment.appointment_id));
                }
                const res = await apiRequest("GET", `/api/public/${encodeURIComponent(subdomain)}/availability?${params.toString()}`);
                const data = await res.json();
                if (!cancelled) {
                  setEditSlots(Array.isArray(data?.slots) ? data.slots : []);
                  const nextAll = Array.isArray(data?.allSlots) ? data.allSlots : (Array.isArray(data?.slots) ? data.slots : []);
                  setEditAllSlots(nextAll);
                  const booked15 = Array.isArray(data?.bookedSlots15) ? data.bookedSlots15 : (Array.isArray(data?.bookedSlots) ? data.bookedSlots : []);
                  setEditBookedSlots(booked15);
                }
              } catch {
                if (!cancelled) {
                  setEditSlots([]); setEditAllSlots([]); setEditBookedSlots([]);
                }
              } finally {
                if (!cancelled) setEditSlotsLoading(false);
              }
            };
            load();
            return () => { cancelled = true; };
          // eslint-disable-next-line react-hooks/exhaustive-deps
          }, [showEditExistingDialog, subdomain, doctorId, editExistingDate, duration])}

          {/* Third row: Date + Time Slots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Date *</label>
              <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                <CalendarComponent
                  mode="single"
                  selected={editExistingDate ? new Date(`${editExistingDate}T00:00:00`) : (date ? new Date(`${date}T00:00:00`) : undefined)}
                  onSelect={(d: any) => {
                    if (!d) return;
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    const ds = `${y}-${m}-${dd}`;
                    setEditExistingDate(ds);
                    // Clear time if not available for new date
                    if (editExistingTime && !editSlots.includes(editExistingTime)) setEditExistingTime("");
                  }}
                  className="rounded-md w-full"
                  classNames={{
                    month: "space-y-4 w-full",
                    table: "w-full table-fixed border-collapse",
                    head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                    cell:
                      "h-10 w-full text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day:
                      "h-10 w-full p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select Time Slot *</label>
              <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-xs font-medium text-gray-700 mb-1">Legend:</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div><span>Available</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded"></div><span>Current</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded"></div><span>Selected</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-500 rounded opacity-60"></div><span>Booked/Blocked</span></div>
                </div>
              </div>
              <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                {editSlotsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading slots…</p>
                ) : editAllSlots.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-500 text-sm font-medium">Time slot not available</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {editAllSlots.map((slot) => {
                      const isBooked = editBookedSlots.includes(slot);
                      // Determine the original (current) slot from existing appointment (timezone-safe fields when available)
                      const originalSlot = (() => {
                        const t = duplicationData?.existingAppointment?.scheduled_time;
                        if (t) return String(t);
                        const src = duplicationData?.existingAppointment?.scheduled_at;
                        if (!src) return "";
                        const d = new Date(src);
                        const hh = String(d.getHours()).padStart(2, "0");
                        const mm = String(d.getMinutes()).padStart(2, "0");
                        return `${hh}:${mm}`;
                      })();
                      const durMin = Number(duration || duplicationData?.existingAppointment?.duration || 30);
                      const originalStart = hhmmToMinutes(originalSlot);
                      const selectedStart = editExistingTime ? hhmmToMinutes(editExistingTime) : null;
                      const slotMin = hhmmToMinutes(slot);

                      const isInOriginalWindow = !editExistingTime && slotMin >= originalStart && slotMin < (originalStart + durMin);
                      const isInSelectedWindow = !!editExistingTime && selectedStart != null && slotMin >= selectedStart && slotMin < (selectedStart + durMin);
                      const label = (() => {
                        const [hh, mm] = slot.split(":");
                        let h = parseInt(hh, 10);
                        const am = h < 12;
                        const displayH = h % 12 === 0 ? 12 : h % 12;
                        return `${displayH.toString().padStart(1, "0")}:${mm} ${am ? "AM" : "PM"}`;
                      })();
                      const isUnavailable = isBooked;
                      const variantClass = isUnavailable
                        ? "bg-gray-500 text-white cursor-not-allowed opacity-60"
                        : isInOriginalWindow
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : isInSelectedWindow
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white";
                      return (
                        <Button
                          key={slot}
                          variant="outline"
                          className={`h-10 text-xs font-medium border-0 ${variantClass}`}
                          disabled={isUnavailable}
                          onClick={() => setEditExistingTime(slot)}
                        >
                          {label}
                  </Button>
                      );
                    })}
                </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditExistingDialog(false)}>Cancel</Button>
            <Button
              disabled={isSavingEdit}
              onClick={async () => {
                if (!duplicationData?.existingAppointment || !subdomain) return;
                setIsSavingEdit(true);
                try {
                  const apptId = duplicationData.existingAppointment.appointment_id;
                  // Derive effective date/time to ensure updates even if fields unchanged
                  const originalDt = new Date(duplicationData.existingAppointment.scheduled_at);
                  const originalDateStr = `${originalDt.getFullYear()}-${String(originalDt.getMonth() + 1).padStart(2, "0")}-${String(originalDt.getDate()).padStart(2, "0")}`;
                  const originalTimeStr = `${String(originalDt.getHours()).padStart(2, "0")}:${String(originalDt.getMinutes()).padStart(2, "0")}`;
                  const effectiveDate = editExistingDate || date || originalDateStr;
                  const effectiveTime = editExistingTime || time || originalTimeStr;
                  // Always send full editable fields so DB update is consistent
                  const payload: any = {
                    email: email || null,
                    phone: phone || null,
                    doctorId: doctorId ? Number(doctorId) : undefined,
                    date: effectiveDate,
                    time: effectiveTime,
                  // Align with backend expectations
                  appointmentType: appointmentType === "procedure" ? "treatment" : appointmentType,
                    duration: duration ? Number(duration) : undefined,
                    consultationId:
                      (appointmentType === "consultation") && serviceId ? Number(serviceId) : undefined,
                    treatmentId:
                      (appointmentType === "treatment" || appointmentType === "procedure") && serviceId ? Number(serviceId) : undefined,
                    description: description || undefined,
                  };
                  const res = await apiRequest("PATCH", `/api/public/${encodeURIComponent(subdomain)}/appointments/${encodeURIComponent(apptId)}`, payload);
                  const ct = res.headers.get("content-type") || "";
                  const body = ct.includes("application/json") ? await res.json() : await res.text();
                  if (!res.ok) {
                    const message = typeof body === "string" ? body : (body?.error || "Failed to update appointment");
                    throw new Error(message);
                  }
                  // If server returns updated DB values, trust them (timezone-safe)
                  const dbDate = typeof body !== "string" ? body?.updated?.scheduled_date : null;
                  const dbTime = typeof body !== "string" ? body?.updated?.scheduled_time : null;
                  if (dbDate && dbTime) {
                    setDate(String(dbDate));
                    // Do NOT auto-select the new time on the public page (it should appear booked/grey)
                    setTime("");
                    setEditExistingDate(String(dbDate));
                    setEditExistingTime(String(dbTime));
                    if (duplicationData?.existingAppointment) {
                      const updated = {
                        ...duplicationData.existingAppointment,
                        scheduled_date: String(dbDate),
                        scheduled_time: String(dbTime),
                        scheduled_at: `${String(dbDate)} ${String(dbTime)}:00`,
                      };
                      setDuplicationData({ ...duplicationData, existingAppointment: updated });
                    }
                  }
                  const nextDbDate = dbDate ? String(dbDate) : effectiveDate;
                  const nextDbTime = dbTime ? String(dbTime) : effectiveTime;
                  toast({
                    title: "Appointment updated",
                    description: `Appointment ${apptId} updated to ${nextDbDate} ${to12Hour(nextDbTime)}.`,
                  });
                  setShowEditExistingDialog(false);
                  setRedirectToLoginAfterEdit(true);
                  // Refresh availability to reflect change
                  await refetchSlots({ dateOverride: nextDbDate, doctorIdOverride: String(doctorId), durationOverride: duration });
                  // Always show success summary (DB-confirmed) then redirect to login on OK
                  // Update local state to reflect latest DB values immediately
                  setDate(nextDbDate);
                  // Clear selection so the new window renders as booked/grey, not "selected green"
                  setTime("");
                  setEditExistingDate(nextDbDate);
                  setEditExistingTime(nextDbTime);
                  if (duplicationData?.existingAppointment) {
                    const updated = {
                      ...duplicationData.existingAppointment,
                      scheduled_at: `${nextDbDate} ${nextDbTime}:00`,
                      scheduled_date: nextDbDate,
                      scheduled_time: nextDbTime,
                    };
                    setDuplicationData({ ...duplicationData, existingAppointment: updated });
                  }
                  // Immediately mark the edited slots as booked locally (grayed) for current date/provider
                  if (nextDbDate === date) {
                    const oldSlot1 = originalTimeStr;
                    const oldSlot2 = getNext15Minutes(originalTimeStr);
                    const slot1 = nextDbTime;
                    const slot2 = getNext15Minutes(nextDbTime);
                    // New time becomes booked (grey)
                    setBookedSlots((prev) =>
                      Array.from(new Set([...(prev || []).filter((s) => s !== oldSlot1 && s !== oldSlot2), slot1, slot2])),
                    );
                    // Old time becomes available (green) optimistically; new time removed from available
                    setAvailableSlots((prev) => {
                      const next = (prev || []).filter((s) => s !== slot1 && s !== slot2);
                      if (!next.includes(oldSlot1)) next.push(oldSlot1);
                      if (!next.includes(oldSlot2)) next.push(oldSlot2);
                      // Keep ordering stable-ish (HH:MM sort)
                      return next.sort((a, b) => a.localeCompare(b));
                    });
                    // Clear current selection so updated slots appear grey (not selected)
                    if (time === slot1 || time === slot2) setTime("");
                  }
                  setEditSummary({
                    appointmentId: apptId,
                    oldDate: originalDateStr,
                    oldTime: originalTimeStr,
                    newDate: nextDbDate,
                    newTime: nextDbTime,
                    duration: duration ? Number(duration) : undefined,
                  });
                  setShowEditSummaryDialog(true);
                } catch (err: any) {
                  toast({ title: "Update failed", description: err?.message || "Unable to update appointment", variant: "destructive" });
                } finally {
                  setIsSavingEdit(false);
                }
              }}
            >
              Update Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Summary</DialogTitle>
            <DialogDescription>
              Please review your details before confirming the booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Appointment ID:</span> Will be generated after confirmation</p>
            <p><span className="font-medium">Patient:</span> {name || "-"}</p>
            <p><span className="font-medium">Phone:</span> {phone || "-"}</p>
            <p><span className="font-medium">Email:</span> {email || "-"}</p>
            <p><span className="font-medium">Doctor:</span> {doctors.find((d) => String(d.id) === doctorId)?.name || "-"}</p>
            <p><span className="font-medium">Type:</span> {appointmentType || "-"}</p>
            <p><span className="font-medium">Service:</span> {serviceOptions.find((s) => String(s.id) === serviceId)?.name || "-"}</p>
            <p><span className="font-medium">Date:</span> {date || "-"}</p>
            <p><span className="font-medium">Time:</span> {time || "-"}</p>
            <p><span className="font-medium">Duration:</span> {duration} minutes</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)} disabled={submitting}>
              Back
            </Button>
            <Button onClick={handleConfirmBooking} disabled={submitting}>
              {submitting ? "Confirming..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Booked</DialogTitle>
            <DialogDescription>
              Your appointment has been scheduled successfully.
            </DialogDescription>
          </DialogHeader>
          {bookedAppointment && (
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Appointment ID:</span> {bookedAppointment.appointmentId || "-"}</p>
              <p><span className="font-medium">Doctor:</span> {bookedAppointment.doctorName}</p>
              <p><span className="font-medium">Service:</span> {bookedAppointment.serviceName}</p>
              <p><span className="font-medium">When:</span> {format(new Date(`${bookedAppointment.date}T${bookedAppointment.time}`), "PPpp")}</p>
              <p><span className="font-medium">Duration:</span> {bookedAppointment.duration} minutes</p>
              </div>
            )}
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                setBookedAppointment(null);
                toast({ title: "Success", description: "Appointment booked successfully." });
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAlreadyBookedDialog} onOpenChange={setShowAlreadyBookedDialog}>
        <DialogContent
          className="max-w-md"
          hideCloseButton
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>You have already booked an appointment</DialogTitle>
            <DialogDescription>
              This booking link was already used. You can still reschedule the existing appointment using this page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Appointment ID:</span> {alreadyBookedDetails?.appointmentId || alreadyBookedDetails?.appointment_id || "-"}</p>
            <p><span className="font-medium">Doctor:</span> {alreadyBookedDetails?.doctorName || alreadyBookedDetails?.doctor_name || "-"}</p>
            <p><span className="font-medium">Type:</span> {alreadyBookedDetails?.appointmentType || alreadyBookedDetails?.appointment_type || "-"}</p>
            <p><span className="font-medium">Service:</span> {alreadyBookedDetails?.serviceName || alreadyBookedDetails?.service_name || "-"}</p>
            <p><span className="font-medium">Date:</span> {alreadyBookedDetails?.date || "-"}</p>
            <p><span className="font-medium">Time:</span> {alreadyBookedDetails?.time || "-"}</p>
            <p><span className="font-medium">Duration:</span> {(alreadyBookedDetails?.duration != null) ? `${alreadyBookedDetails.duration} minutes` : "-"}</p>
      </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const id = String(alreadyBookedDetails?.appointmentId || alreadyBookedDetails?.appointment_id || "").trim();
                if (!id) {
                  toast({ title: "Missing appointment", description: "No existing appointment to reschedule.", variant: "destructive" });
                  return;
                }
                setRescheduleTargetAppointmentId(id);
                setShowAlreadyBookedDialog(false);
                toast({
                  title: "Reschedule mode",
                  description: "Select a new date/time and click Book Appointment to reschedule.",
                });
              }}
            >
              Reschedule
            </Button>
            <Button
              onClick={() => {
                setShowAlreadyBookedDialog(false);
                // Redirect to login page (universal login)
                window.location.href = "/auth/login";
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

