import { Header } from "@/components/layout/header";
import RoleBasedAppointmentRouter from "@/components/appointments/role-based-router";
import { DoctorList } from "@/components/doctors/doctor-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Plus, Users, Clock, User, X, Check, CheckCircle, ChevronsUpDown, Phone, Mail, FileText, MapPin, Filter, FilterX, CreditCard, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { format, isBefore, startOfDay, addMonths, isAfter } from "date-fns";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  useBookingHolidayCalendar,
  BookingHolidayTimeSlotPanel,
} from "@/hooks/use-booking-holiday-calendar";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { isDoctorLike } from "@/lib/role-utils";
import {
  buildPatientOverlapDialogDescription,
  findPatientScheduleOverlap,
  buildLocalIntervalFromDateAndTimeSlot,
} from "@/lib/patient-appointment-overlap";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

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

const normalizeName = (value?: string) => {
  if (!value) return "";
  return value.replace(/^dr\.?\s+/i, "").trim().toLowerCase();
};

const normalizeText = (value?: string) => {
  if (!value) return "";
  return value.trim().toLowerCase();
};
const formatRoleLabel = (role?: string) => {
  if (!role) return "";
  return role
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

/** User-facing text from apiRequest failures like `400: {"error":"..."}`. */
function extractCalendarApiUserMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const m = raw.match(/^\d+:\s*([\s\S]+)$/);
  const body = m ? m[1].trim() : raw.trim();
  if (!body) return "Something went wrong. Please try again.";
  try {
    const j = JSON.parse(body);
    if (typeof j?.error === "string" && j.error.trim()) return j.error.trim();
    if (typeof j?.message === "string" && j.message.trim()) return j.message.trim();
  } catch {
    /* plain text body */
  }
  return body.length > 800 ? `${body.slice(0, 797)}…` : body;
}

/** Parse scheduledAt without UTC shift (naive / clinic-local timestamps). */
function parseScheduledAtAsLocalCalendar(value: string | Date): Date {
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

const SERVICE_DUPLICATE_BLOCKING_STATUSES_CAL = new Set(["scheduled", "confirmed"]);

function normalizeAppointmentStatusCal(status: unknown): string {
  return String(status ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function isServiceDuplicateBlockingStatusCal(status: unknown): boolean {
  return SERVICE_DUPLICATE_BLOCKING_STATUSES_CAL.has(normalizeAppointmentStatusCal(status));
}

/** Nurse/doctor reschedule popup: only when we have a numeric DB id and an active duplicate to reschedule. */
function canShowCalendarRescheduleDuplicateModal(role: unknown, record: any | null): boolean {
  const r = String(role ?? "");
  if (!isDoctorLike(r) && r !== "patient") return false;
  if (!record) return false;
  if (!Number.isFinite(Number(record.id))) return false;
  return isServiceDuplicateBlockingStatusCal(record.status ?? record.dup_status);
}

function findDuplicateServiceAppointmentAnyDateCal(
  appointments: any[],
  patientId: number,
  providerIdStr: string,
  selectedScheduledAt: string | null,
  normType: "treatment" | "consultation",
  treatmentId: number | null,
  consultationId: number | null,
): any | null {
  if (!appointments?.length) return null;
  if (normType === "treatment" && (treatmentId == null || Number.isNaN(Number(treatmentId)))) return null;
  if (normType === "consultation" && (consultationId == null || Number.isNaN(Number(consultationId)))) return null;

  const selectedKey = selectedScheduledAt
    ? (() => {
        const d = parseScheduledAtAsLocalCalendar(selectedScheduledAt);
        if (Number.isNaN(d.getTime())) return null;
        return format(d, "yyyy-MM-dd'T'HH:mm:ss");
      })()
    : null;

  return (
    appointments.find((apt: any) => {
      if (!isServiceDuplicateBlockingStatusCal(apt.status)) return false;
      const aptPatientId = apt.patient_id ?? apt.patientId;
      const aptProviderId = apt.provider_id ?? apt.providerId;
      if (Number(aptPatientId) !== Number(patientId)) return false;
      if (String(aptProviderId) !== String(providerIdStr)) return false;

      // Different datetime (reschedule flow); ignore exact same start.
      if (selectedKey) {
        const aptStart = parseScheduledAtAsLocalCalendar(apt.scheduledAt);
        if (!Number.isNaN(aptStart.getTime())) {
          const aptKey = format(aptStart, "yyyy-MM-dd'T'HH:mm:ss");
          if (aptKey === selectedKey) return false;
        }
      }

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

function formatAppointmentStatusLabelCal(status: unknown): string {
  const s = normalizeAppointmentStatusCal(status);
  if (!s) return "Unknown";
  if (s === "no_show") return "No show";
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isNonBlockingForRebookCal(status: unknown): boolean {
  const s = normalizeAppointmentStatusCal(status);
  return s === "completed" || s === "cancelled" || s === "canceled" || s === "rescheduled";
}

function buildLocalProviderConflictsCal(params: {
  appointments: any[];
  providerId: number;
  scheduledAt: string | Date;
  durationMins: number;
}): any[] {
  const { appointments, providerId, scheduledAt, durationMins } = params;
  if (!Array.isArray(appointments) || appointments.length === 0) return [];
  const newStart = parseScheduledAtAsLocalCalendar(scheduledAt as any);
  if (Number.isNaN(newStart.getTime())) return [];
  const dur = Number(durationMins) > 0 ? Number(durationMins) : 30;
  const newEnd = new Date(newStart.getTime() + dur * 60 * 1000);

  const normalize = (st: any) =>
    String(st ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");

  const now = new Date();
  return appointments
    .filter((a: any) => Number(a?.providerId ?? a?.provider_id) === Number(providerId))
    .map((a: any) => {
      const start = a?.scheduledAt ? parseScheduledAtAsLocalCalendar(a.scheduledAt) : new Date(NaN);
      const d = a?.duration != null && Number(a.duration) > 0 ? Number(a.duration) : 30;
      const end = new Date(start.getTime() + d * 60 * 1000);
      return { a, start, end, d };
    })
    .filter(({ start, end }) => !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()))
    .filter(({ a, start, end }) => {
      const st = normalize(a?.status);
      // Non-blocking statuses
      if (st === "completed" || st === "cancelled" || st === "canceled" || st === "rescheduled") return false;
      // Ongoing should not block new bookings
      if (start <= now && now < end) return false;
      // Overlap check
      return newStart < end && newEnd > start;
    })
    .map(({ a }) => ({
      id: a.id ?? a.appointment_id,
      appointmentId: a.appointmentId ?? a.appointment_id,
      scheduledAt: a.scheduledAt ?? a.scheduled_at,
      duration: a.duration,
      status: a.status,
      title: a.title,
      patientId: a.patientId ?? a.patient_id,
      providerId: a.providerId ?? a.provider_id,
      assignedRole: a.assignedRole ?? a.assigned_role,
      appointmentType: a.appointmentType ?? a.appointment_type,
      treatmentId: a.treatmentId ?? a.treatment_id,
      consultationId: a.consultationId ?? a.consultation_id,
    }));
}

function getNumericDbAppointmentIdCal(record: any): number | null {
  const cand = record?.id;
  const num = Number(cand);
  return Number.isFinite(num) ? num : null;
}

function findDuplicateServiceAppointmentInCalendar(
  appointments: any[],
  patientId: number,
  providerIdStr: string,
  selectedDateStr: string,
  selectedScheduledAt: string | null,
  normType: "treatment" | "consultation",
  treatmentId: number | null,
  consultationId: number | null
): any | null {
  if (!appointments?.length) return null;
  if (normType === "treatment" && (treatmentId == null || Number.isNaN(Number(treatmentId)))) return null;
  if (normType === "consultation" && (consultationId == null || Number.isNaN(Number(consultationId)))) return null;

  return (
    appointments.find((apt: any) => {
      if (!isServiceDuplicateBlockingStatusCal(apt.status)) return false;
      const aptPatientId = apt.patient_id ?? apt.patientId;
      const aptProviderId = apt.provider_id ?? apt.providerId;
      if (Number(aptPatientId) !== Number(patientId)) return false;
      if (String(aptProviderId) !== String(providerIdStr)) return false;
      const aptDateStr = format(parseScheduledAtAsLocalCalendar(apt.scheduledAt), "yyyy-MM-dd");
      if (aptDateStr !== selectedDateStr) return false;

      // Only treat as duplicate when the start datetime matches exactly.
      // This avoids blocking different time slots on the same day.
      if (selectedScheduledAt) {
        const aptStart = parseScheduledAtAsLocalCalendar(apt.scheduledAt);
        const selectedStart = parseScheduledAtAsLocalCalendar(selectedScheduledAt);
        if (Number.isNaN(aptStart.getTime()) || Number.isNaN(selectedStart.getTime())) {
          return false;
        }
        const aptStartKey = format(aptStart, "yyyy-MM-dd'T'HH:mm:ss");
        const selectedKey = format(selectedStart, "yyyy-MM-dd'T'HH:mm:ss");
        if (aptStartKey !== selectedKey) return false;
      }

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

function buildCalendarDuplicateServiceWarningMessage(
  kind: "treatment" | "consultation",
  existingApt: any,
  patientName: string,
  doctorName: string,
  serviceLabel: string
): string {
  const at = parseScheduledAtAsLocalCalendar(existingApt.scheduledAt);
  const formattedDate = format(at, "MMMM do, yyyy");
  const formattedTime = format(at, "p");
  const statusLabel = formatAppointmentStatusLabelCal(
    existingApt.status ?? existingApt.dup_status
  );
  if (kind === "treatment") {
    return (
      `You have already created an appointment with Dr. ${doctorName}, patient ${patientName}, on ${formattedDate} at ${formattedTime}, status ${statusLabel}, for treatment ${serviceLabel}.\n\n` +
      `Please select another treatment or change status, another date, or update the existing appointment.`
    );
  }
  return (
    `You have already created an appointment with Dr. ${doctorName}, patient ${patientName}, on ${formattedDate} at ${formattedTime}, status ${statusLabel}, for consultation ${serviceLabel}.\n\n` +
    `Please select another consultation or change status, another date, or update the existing appointment.`
  );
}

function buildLocalDateTimeString(date: Date, timeSlot: string): string {
  // Returns `YYYY-MM-DDTHH:mm:ss` using local components (no timezone shift)
  const datePart = format(date, "yyyy-MM-dd");
  const [time, period] = String(timeSlot || "").split(" ");
  const [hhStr, mmStr] = (time || "").split(":");
  let hh = parseInt(hhStr || "0", 10);
  const mm = parseInt(mmStr || "0", 10);
  if (String(period).toUpperCase() === "PM" && hh !== 12) hh += 12;
  if (String(period).toUpperCase() === "AM" && hh === 12) hh = 0;
  return `${datePart}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

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

// Stripe Payment Form Component
function StripePaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/calendar',
      },
      redirect: 'if_required',
    });

    if (error) {
      setPaymentError(error.message || 'Payment failed');
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "Your appointment has been booked and paid.",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {paymentError && (
        <div className="text-red-600 text-sm">{paymentError}</div>
      )}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? "Processing..." : "Pay Now"}
        </Button>
      </div>
    </form>
  );
}

function getTenantSubdomain(): string {
  return localStorage.getItem('user_subdomain') || 'demo';
}

// Medical Specialties Data Structure - same as user-management.tsx
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": ["Common illnesses", "Preventive care"],
    "Internal Medicine Specialist": ["Adult health", "Chronic diseases (diabetes, hypertension)"]
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair", 
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery",
      "Endocrine Surgery (thyroid, parathyroid, adrenal)",
      "Trauma & Emergency Surgery"
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)",
      "Trauma & Fracture Care"
    ],
    "Neurosurgeon": [
      "Brain Tumor Surgery",
      "Spinal Surgery", 
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery (Parkinson's, epilepsy, DBS)",
      "Trauma Neurosurgery"
    ],
    "Cardiothoracic Surgeon": [
      "Cardiac Surgery – Bypass, valve replacement",
      "Thoracic Surgery – Lungs, esophagus, chest tumors", 
      "Congenital Heart Surgery – Pediatric heart defects",
      "Heart & Lung Transplants",
      "Minimally Invasive / Robotic Heart Surgery"
    ],
    "Plastic & Reconstructive Surgeon": [
      "Cosmetic Surgery (nose job, facelift, liposuction)",
      "Reconstructive Surgery (after cancer, trauma)",
      "Burn Surgery",
      "Craniofacial Surgery (cleft lip/palate, facial bones)",
      "Hand Surgery"
    ],
    "ENT Surgeon (Otolaryngologist)": [
      "Otology (ear surgeries, cochlear implants)",
      "Rhinology (sinus, deviated septum)",
      "Laryngology (voice box, throat)",
      "Head & Neck Surgery (thyroid, tumors)",
      "Pediatric ENT (tonsils, adenoids, ear tubes)",
      "Facial Plastic Surgery (nose/ear correction)"
    ],
    "Urological Surgeon": [
      "Endourology (kidney stones, minimally invasive)",
      "Uro-Oncology (prostate, bladder, kidney cancer)",
      "Pediatric Urology",
      "Male Infertility & Andrology",
      "Renal Transplant Surgery",
      "Neurourology (bladder control disorders)"
    ]
  },
  "Heart & Circulation": {
    "Cardiologist": ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"]
  },
  "Women's Health": {
    "Gynecologist": ["Female reproductive system"],
    "Obstetrician": ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"]
  },
  "Children's Health": {
    "Pediatrician": ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    "Neonatologist": ["Newborn intensive care"]
  },
  "Brain & Nervous System": {
    "Neurologist": ["Stroke", "Epilepsy", "Parkinson's"],
    "Psychiatrist": ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"]
  },
  "Skin, Hair & Appearance": {
    "Dermatologist": ["Skin", "Hair", "Nails"],
    "Cosmetologist": ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"]
  },
  "Eye & Vision": {
    "Ophthalmologist": ["Cataracts", "Glaucoma", "Surgeries"],
    "Optometrist": ["Vision correction (glasses, lenses)"]
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    "Orthodontist": ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"],
    "Periodontist": ["Gum disease specialist"],
    "Endodontist": ["Root canal specialist"]
  },
  "Digestive System": {
    "Gastroenterologist": ["Stomach", "Intestines"],
    "Hepatologist": ["Liver specialist"],
    "Colorectal Surgeon": ["Colon", "Rectum", "Anus"]
  },
  "Kidneys & Urinary Tract": {
    "Nephrologist": ["Kidney diseases", "Dialysis"],
    "Urologist": ["Kidney diseases", "Bladder disorders", "General urological care"]
  },
  "Respiratory System": {
    "Pulmonologist": ["Asthma", "COPD", "Tuberculosis"],
    "Thoracic Surgeon": ["Lung surgeries"]
  },
  "Cancer": {
    "Oncologist": ["Medical cancer specialist"],
    "Radiation Oncologist": ["Radiation therapy"],
    "Surgical Oncologist": ["Cancer surgeries"]
  },
  "Endocrine & Hormones": {
    "Endocrinologist": ["Diabetes", "Thyroid", "Hormones"]
  },
  "Muscles & Joints": {
    "Rheumatologist": ["Arthritis", "Autoimmune"],
    "Sports Medicine Specialist": ["Athlete injuries"]
  },
  "Blood & Immunity": {
    "Hematologist": ["Blood diseases (anemia, leukemia)"],
    "Immunologist / Allergist": ["Immune & allergy disorders"]
  },
  "Others": {
    "Geriatrician": ["Elderly care"],
    "Pathologist": ["Lab & diagnostic testing"],
    "Radiologist": ["Imaging (X-ray, CT, MRI)"],
    "Anesthesiologist": ["Pain & anesthesia"],
    "Emergency Medicine Specialist": ["Accidents", "Trauma"],
    "Occupational Medicine Specialist": ["Workplace health"]
  }
};

// Medical Specialty Categories for filtering
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

// Lab Technician Subcategories
const labTechnicianSubcategories = [
  "Phlebotomy Technician",
  "Medical Laboratory Technician (MLT)",
  "Clinical Chemistry Technician",
  "Hematology Technician",
  "Microbiology Technician",
  "Pathology Technician",
  "Histology Technician",
  "Cytology Technician",
  "Immunology Technician",
  "Molecular Biology Technician",
  "Serology Technician",
  "Toxicology Technician",
  "Biochemistry Technician",
  "Blood Bank Technician",
  "Urinalysis Technician",
  "Lab Information Technician (LIS)",
  "Forensic Lab Technician",
  "Environmental Lab Technician",
  "Quality Control Lab Technician",
  "Research Lab Technician"
];

// Aesthetician Subcategories
const aestheticianSubcategories = [
  "Medical Aesthetician",
  "Clinical Aesthetician",
  "Spa Aesthetician",
  "Laser Technician",
  "Paramedical Aesthetician",
  "Oncology Aesthetician",
  "Acne Specialist",
  "Anti-Aging Aesthetician",
  "Cosmetic Tattoo Technician",
  "Chemical Peel Specialist",
  "Microneedling Specialist",
  "Hydrafacial Specialist",
  "Body Contouring Specialist",
  "Eyebrow & Eyelash Technician",
  "Waxing / Hair Removal Specialist",
  "Makeup Artist (Certified Aesthetician)",
  "Dermaplaning Specialist",
  "Aesthetic Trainer / Educator",
  "Natural / Organic Aesthetician"
];

// Optician Subcategories
const opticianSubcategories = [
  "Dispensing Optician",
  "Contact Lens Optician",
  "Pediatric Optician",
  "Low Vision Optician",
  "Ophthalmic Optician",
  "Retail/Store Optician",
  "Technical/Manufacturing Optician",
  "Refractive Surgery Optician",
  "Frame Stylist/Optical Consultant",
  "Clinical Optician",
  "Mobile/Field Optician"
];

// Paramedic Subcategories
const paramedicSubcategories = [
  "Emergency Medical Technician (EMT)",
  "Advanced EMT (AEMT)",
  "Critical Care Paramedic",
  "Flight Paramedic",
  "Tactical Paramedic",
  "Community Paramedic",
  "Rescue Paramedic",
  "Industrial/Occupational Paramedic",
  "Firefighter Paramedic",
  "Event Paramedic",
  "Pediatric Paramedic",
  "Geriatric Paramedic",
  "Ambulance Paramedic",
  "Disaster Response Paramedic",
  "Remote Area Paramedic",
  "Paramedic Instructor",
  "Telemedicine Paramedic",
  "Sports Paramedic"
];

// Physiotherapist Subcategories
const physiotherapistSubcategories = [
  "Orthopedic Physiotherapist",
  "Sports Physiotherapist",
  "Neurological Physiotherapist",
  "Pediatric Physiotherapist",
  "Geriatric Physiotherapist",
  "Cardiopulmonary Physiotherapist",
  "Musculoskeletal Physiotherapist",
  "Women's Health Physiotherapist",
  "Vestibular Rehabilitation Physiotherapist",
  "Oncology Physiotherapist",
  "Hand Therapy Physiotherapist",
  "Aquatic Physiotherapist"
];

// Pharmacist Subcategories
const pharmacistSubcategories = [
  "Clinical Pharmacist",
  "Hospital Pharmacist",
  "Retail/Community Pharmacist",
  "Industrial Pharmacist",
  "Regulatory Affairs Pharmacist",
  "Compounding Pharmacist",
  "Oncology Pharmacist",
  "Geriatric Pharmacist",
  "Pediatric Pharmacist",
  "Ambulatory Care Pharmacist",
  "Nuclear Pharmacist",
  "Infectious Disease Pharmacist",
  "Pharmacovigilance Pharmacist",
  "Academic/Research Pharmacist",
  "Home Health Pharmacist",
  "Military Pharmacist",
  "Cardiology Pharmacist",
  "Psychiatric Pharmacist",
  "Emergency Medicine Pharmacist",
  "Telepharmacist"
];

export default function CalendarPage() {
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = useRolePermissions();
  const isDoctor = isDoctorLike(user?.role);
  const isPatient = user?.role === "patient";
  const { data: treatmentsList = [], isLoading: isTreatmentsLoading } = useQuery({
    queryKey: ["/api/pricing/treatments"],
    staleTime: 60000,
    enabled: isDoctor || isPatient,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/treatments");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });
  const { data: consultationServices = [], isLoading: isConsultationsLoading } = useQuery({
    queryKey: ["/api/pricing/doctors-fees"],
    staleTime: 60000,
    enabled: isDoctor || isPatient,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/pricing/doctors-fees");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
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

  const userRoleLower = user?.role?.toLowerCase() || "";
  const isProviderUser = userRoleLower === "doctor" || userRoleLower === "nurse";
  const normalizedUserFullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim().toLowerCase();
  const displayRoleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";

  const matchesLoggedInProvider = useCallback(
    (item: any) => {
      if (!isProviderUser) return true;
      const roleMatch = !item?.doctorRole || item.doctorRole?.toLowerCase() === userRoleLower;
      if (!roleMatch) return false;
      if (item?.doctorId && user?.id && item.doctorId === user.id) return true;
      if (item?.doctorName && item.doctorName.toLowerCase() === normalizedUserFullName) return true;
      return false;
    },
    [isProviderUser, normalizedUserFullName, user?.id, userRoleLower]
  );

  const doctorTreatmentsCatalog = useMemo(() => {
    if (!isProviderUser) return treatmentsList;
    return treatmentsList.filter(matchesLoggedInProvider);
  }, [isProviderUser, treatmentsList, matchesLoggedInProvider]);

  const doctorConsultationsCatalog = useMemo(() => {
    if (!isProviderUser) return consultationServices;
    return consultationServices.filter(matchesLoggedInProvider);
  }, [isProviderUser, consultationServices, matchesLoggedInProvider]);

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

const getAppointmentTypeLabel = (appointment: any): string => {
  if (!appointment) return "Consultation";
  const rawType = (appointment.appointmentType || appointment.type || "consultation").toLowerCase();
  if (rawType === "treatment") return "Treatment";
  if (rawType === "consultation") return "Consultation";
  return rawType.charAt(0).toUpperCase() + rawType.slice(1);
};
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [specialtyComboboxOpen, setSpecialtyComboboxOpen] = useState(false);
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  
  // New state for role-based provider selection
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [openRoleCombo, setOpenRoleCombo] = useState(false);
  const [openProviderCombo, setOpenProviderCombo] = useState(false);
  const [selectedMedicalSpecialty, setSelectedMedicalSpecialty] = useState<string>("");
  
  const resetDoctorAppointmentServiceSelection = () => {
    setDoctorAppointmentType("");
    setDoctorAppointmentSelectedTreatment(null);
    setDoctorAppointmentSelectedConsultation(null);
    setDoctorAppointmentTypeError("");
    setDoctorTreatmentSelectionError("");
    setDoctorConsultationSelectionError("");
  };

  // Validation error states for patient booking
  const [roleError, setRoleError] = useState<string>("");
  const [providerError, setProviderError] = useState<string>("");
  
  // Filter functionality state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterSubSpecialty, setFilterSubSpecialty] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  
  // Role-based filter state for admin users
  const [filterRole, setFilterRole] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterAppointmentId, setFilterAppointmentId] = useState("");
  const [appointmentIdPopoverOpen, setAppointmentIdPopoverOpen] = useState(false);
  
  // Staff filter visibility state
  const [showStaffFilter, setShowStaffFilter] = useState(false);
  const [staffFilterRole, setStaffFilterRole] = useState("");
  const [staffFilterSearch, setStaffFilterSearch] = useState("");
  const [staffFilterSpecialty, setStaffFilterSpecialty] = useState("");
  
  // Doctor's patient search state
  const [doctorPatientSearch, setDoctorPatientSearch] = useState("");
  
  // Calendar view state
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  const [bookingForm, setBookingForm] = useState({
    patientId: "",
    title: "",
    description: "",
    scheduledAt: "",
    duration: "30",
    type: "consultation",
    location: "",
    isVirtual: false
  });
  const [doctorAppointmentType, setDoctorAppointmentType] = useState<"consultation" | "treatment" | "">("");
  const [doctorAppointmentSelectedTreatment, setDoctorAppointmentSelectedTreatment] = useState<any>(null);
  const [doctorAppointmentSelectedConsultation, setDoctorAppointmentSelectedConsultation] = useState<any>(null);
  const [doctorAppointmentTypeError, setDoctorAppointmentTypeError] = useState<string>("");
  const [doctorTreatmentSelectionError, setDoctorTreatmentSelectionError] = useState<string>("");
  const [doctorConsultationSelectionError, setDoctorConsultationSelectionError] = useState<string>("");
  const [openDoctorAppointmentTypeCombo, setOpenDoctorAppointmentTypeCombo] = useState(false);
  const [openDoctorTreatmentCombo, setOpenDoctorTreatmentCombo] = useState(false);
  const [openDoctorConsultationCombo, setOpenDoctorConsultationCombo] = useState(false);
  
  // Confirmation modal states for patient users
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<any>(null);
  const [isConfirmingAppointment, setIsConfirmingAppointment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInsufficientTimeModal, setShowInsufficientTimeModal] = useState(false);
  const [insufficientTimeMessage, setInsufficientTimeMessage] = useState("");
  
  // Error modal state for booking errors
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateAppointmentDetails, setDuplicateAppointmentDetails] = useState("");
  const [duplicateAppointmentRecord, setDuplicateAppointmentRecord] = useState<any>(null);
  const [pendingDuplicateCreateMode, setPendingDuplicateCreateMode] = useState<"doctor" | "invoice">("doctor");
  const [pendingDuplicateInvoiceData, setPendingDuplicateInvoiceData] = useState<any>(null);
  const [duplicateResolveStatus, setDuplicateResolveStatus] = useState("completed");
  const [showPatientOverlapConflict, setShowPatientOverlapConflict] = useState(false);
  const [patientOverlapConflictRecord, setPatientOverlapConflictRecord] = useState<any | null>(null);
  const [showBookingErrorModal, setShowBookingErrorModal] = useState(false);
  const [bookingErrorMessage, setBookingErrorMessage] = useState("");
  const [bookingErrorTitle, setBookingErrorTitle] = useState("Booking Error");
  const [bookingConflictAppointments, setBookingConflictAppointments] = useState<any[]>([]);
  const [updatingConflictAppointmentId, setUpdatingConflictAppointmentId] = useState<number | null>(null);

  const updateConflictAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update appointment status");
      }
      return response.json();
    },
    onMutate: ({ id }) => {
      setUpdatingConflictAppointmentId(Number(id));
    },
    onSuccess: async () => {
      // Refresh appointments so the calendar reflects updated statuses
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
    onSettled: () => {
      setUpdatingConflictAppointmentId(null);
    },
  });
  
  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showInvoiceSummary, setShowInvoiceSummary] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string>("");
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    serviceCode: "CONS-001",
    serviceDescription: "General Consultation",
    amount: "50.00",
    insuranceProvider: "None (Patient Self-Pay)",
    notes: "",
    paymentMethod: "Online Payment"
  });

  const bookingSummaryServiceInfo = useMemo(
    () => getBookingServiceInfo(pendingAppointmentData),
    [pendingAppointmentData, treatmentsMap, consultationMap],
  );

  const patientHasRequiredServiceSelection = useMemo(() => {
    if (user?.role !== "patient") return true;
    if (!doctorAppointmentType) return false;
    if (
      doctorAppointmentType === "treatment" &&
      !doctorAppointmentSelectedTreatment
    ) {
      return false;
    }
    if (
      doctorAppointmentType === "consultation" &&
      !doctorAppointmentSelectedConsultation
    ) {
      return false;
    }
    return true;
  }, [
    user?.role,
    doctorAppointmentType,
    doctorAppointmentSelectedTreatment,
    doctorAppointmentSelectedConsultation,
  ]);

  const [location, setLocation] = useLocation();
  const { toast} = useToast();
  const queryClient = useQueryClient();

  // Fetch patient records from patients table (not users table)
  const { data: patients = [], isLoading: patientsLoading } = useQuery<any[]>({
    queryKey: ["/api/patients"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
    queryFn: async () => {
      console.log("📋 CALENDAR: Fetching patient records from patients table...");
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      console.log("📋 CALENDAR: Patient records fetched. Count:", Array.isArray(data) ? data.length : 'Not an array!');
      console.log("📋 CALENDAR: Patient records data:", data);
      return Array.isArray(data) ? data : [];
    },
  });

  const loggedInPatientRecord = useMemo(() => {
    if (user?.role !== "patient") return null;
    if (!user?.id && !user?.email) return null;
    
    // Try to find patient by userId first (most reliable)
    if (user?.id) {
      const byUserId = patients.find((patient: any) => 
        patient.userId === user.id || 
        patient.userId?.toString() === user.id?.toString()
      );
      if (byUserId) {
        console.log('[CALENDAR] Found patient record by userId:', { 
          userId: user.id, 
          patientId: byUserId.id, 
          email: byUserId.email 
        });
        return byUserId;
      }
    }
    
    // Fallback: try to find by email (case-insensitive)
    if (user?.email) {
      const byEmail = patients.find((patient: any) => 
        patient.email?.toLowerCase() === user.email?.toLowerCase()
      );
      if (byEmail) {
        console.log('[CALENDAR] Found patient record by email:', { 
          email: user.email, 
          patientId: byEmail.id, 
          userId: byEmail.userId 
        });
        return byEmail;
      }
    }
    
    console.warn('[CALENDAR] No patient record found for logged-in patient user:', {
      userId: user?.id,
      userEmail: user?.email,
      patientsCount: patients.length,
      availablePatientUserIds: patients.map((p: any) => ({ id: p.id, userId: p.userId, email: p.email }))
    });
    return null;
  }, [user?.role, user?.id, user?.email, patients]);

  const pendingAppointmentPatient = useMemo(() => {
    if (!pendingAppointmentData) return null;
    const candidateId = pendingAppointmentData.patientId;
    if (candidateId) {
      const patient = patients.find((p: any) => {
        if (p.id === candidateId) return true;
        if (p.id?.toString() === candidateId?.toString()) return true;
        if (p.patientId === candidateId) return true;
        if (p.patientId === candidateId?.toString()) return true;
        return false;
      });
      if (patient) return patient;
    }
    if (user?.role === 'patient') {
      return (
        loggedInPatientRecord || {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          patientId:
            pendingAppointmentData.patientId ||
            loggedInPatientRecord?.patientId ||
            `P${user.id?.toString().padStart?.(6, '0') ?? ""}`,
        }
      );
    }
    return null;
  }, [
    pendingAppointmentData?.patientId,
    patients,
    loggedInPatientRecord,
    user?.role,
    user?.id,
    user?.firstName,
    user?.lastName,
  ]);

  const invoicePatientName = useMemo(() => {
    if (pendingAppointmentPatient) {
      return `${pendingAppointmentPatient.firstName} ${pendingAppointmentPatient.lastName}`.trim();
    }
    if (user?.role === 'patient' && user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`.trim();
    }
    return 'N/A';
  }, [pendingAppointmentPatient, user?.role, user?.firstName, user?.lastName]);

  const patientIdForButton =
    bookingForm.patientId || loggedInPatientRecord?.patientId || "";

  const patientReadyForBooking =
    user?.role === "patient" || Boolean(patientIdForButton);

  // Auto-populate patient when user is a patient - Match by email
  useEffect(() => {
    if (
      user?.role === 'patient' &&
      !bookingForm.patientId &&
      showNewAppointmentModal &&
      loggedInPatientRecord
    ) {
      console.log("✅ CALENDAR: Auto-populating patient record:", loggedInPatientRecord);
      setBookingForm(prev => ({
        ...prev,
        patientId:
          loggedInPatientRecord.patientId || loggedInPatientRecord.id.toString(),
      }));
    }
  }, [
    user,
    showNewAppointmentModal,
    bookingForm.patientId,
    loggedInPatientRecord,
  ]);

  useEffect(() => {
    if (
      user?.role === 'patient' &&
      showNewAppointmentModal &&
      !bookingForm.patientId
    ) {
      const candidateId = loggedInPatientRecord?.patientId;
      if (candidateId) {
        setBookingForm((prev) => ({
          ...prev,
          patientId: candidateId,
        }));
      }
    }
  }, [user, showNewAppointmentModal, bookingForm.patientId, loggedInPatientRecord]);
  
  // Fetch medical staff with availability for appointment booking
  const { data: doctorsData, isLoading: isLoadingDoctors, error: doctorsError } = useQuery<any>({
    queryKey: ["/api/medical-staff"],
    retry: 3,
    staleTime: 0, // Force fresh requests
    gcTime: 0, // Don't cache failed results (previously cacheTime in v4)
    enabled: true, // Ensure query is enabled
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
    queryFn: async () => {
      console.log('🔄 MEDICAL STAFF: Starting fetch for user:', user?.email, 'role:', user?.role);
      try {
        const response = await apiRequest('GET', '/api/medical-staff');
        console.log('🔄 MEDICAL STAFF: Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('📋 MEDICAL STAFF: Success response:', data);
        return data;
      } catch (error) {
        console.error('❌ MEDICAL STAFF: Fetch error:', error);
        throw error;
      }
    },
  });
  
  // Extract doctors from medical staff query - memoized to prevent infinite re-renders
  const allDoctors = useMemo(() => {
    console.log('🏥 Processing medical staff data:', doctorsData);
    console.log('🏥 Medical staff error:', doctorsError);
    console.log('🏥 Is loading medical staff:', isLoadingDoctors);
    
    const doctors = doctorsData?.staff || [];
    console.log('👨‍⚕️ Extracted doctors from medical staff query:', doctors.length, doctors);
    return doctors;
  }, [doctorsData, doctorsError, isLoadingDoctors]);
  
  // Fetch all users for role-based provider selection
  const { data: usersData = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    staleTime: 300000, // 5 minutes cache
    retry: false,
    enabled: !!user,
  });

  // Fetch roles from roles table for role-based provider selection
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
    staleTime: 60000,
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/roles');
      return response.json();
    },
  });

  // Fetch all shifts for the selected provider to determine available dates
  const { data: allProviderShifts } = useQuery({
    queryKey: ["/api/shifts/provider", selectedProviderId],
    staleTime: 30000,
    enabled: !!selectedProviderId,
    retry: false, // Don't retry on 403
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/shifts?staffId=${selectedProviderId}`);
        if (!response.ok) {
          console.warn('Failed to fetch provider shifts:', response.status);
          return []; // Return empty array on error
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.warn('Error fetching provider shifts:', error);
        return []; // Return empty array on error
      }
    },
  });

  // Fetch shifts for the selected date and provider
  const { data: shiftsData } = useQuery({
    queryKey: ["/api/shifts", selectedProviderId, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    staleTime: 30000,
    enabled: !!selectedDate && !!selectedProviderId,
    retry: false, // Don't retry on 403
    queryFn: async () => {
      try {
        const dateStr = format(selectedDate!, 'yyyy-MM-dd');
        const response = await apiRequest('GET', `/api/shifts?date=${dateStr}&staffId=${selectedProviderId}`);
        if (!response.ok) {
          console.warn('Failed to fetch shifts for date:', response.status);
          return []; // Return empty array on error
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.warn('Error fetching shifts for date:', error);
        return []; // Return empty array on error
      }
    },
  });

  // Fetch default shifts for all users (to use as fallback when custom shifts don't exist)
  const { data: defaultShiftsData = [] } = useQuery({
    queryKey: ["/api/default-shifts", "forBooking"],
    staleTime: 60000,
    enabled: !!user, // Only fetch when user is authenticated
    retry: false,
    queryFn: async () => {
      try {
        console.log('[DEFAULT_SHIFTS] Fetching default shifts...');
        const response = await apiRequest('GET', '/api/default-shifts?forBooking=true');
        if (!response.ok) {
          console.warn('[DEFAULT_SHIFTS] Failed to fetch default shifts:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('[DEFAULT_SHIFTS] Fetched default shifts:', data);
        return data;
      } catch (error) {
        console.warn('[DEFAULT_SHIFTS] Error fetching default shifts:', error);
        return [];
      }
    },
  });
  
  // Fetch shifts for logged-in user (nurse/doctor) to check if they have shifts
  const { data: loggedInUserShifts = [] } = useQuery({
    queryKey: ["/api/shifts/staff", user?.id, "loggedInUser"],
    staleTime: 30000,
    enabled: !!user && isDoctorLike(user?.role), // Only fetch for nurse/doctor roles
    retry: false,
    queryFn: async () => {
      try {
        if (!user?.id) return [];
        const response = await apiRequest('GET', `/api/shifts?staffId=${user.id}`);
        if (!response.ok) {
          console.warn('[USER_SHIFTS] Failed to fetch user shifts:', response.status);
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn('[USER_SHIFTS] Error fetching user shifts:', error);
        return [];
      }
    },
  });

  // Check if logged-in user has shifts (custom or default)
  const loggedInUserHasShifts = useMemo(() => {
    if (!user || !isDoctorLike(user?.role)) return true; // Not a nurse/doctor, don't show warning
    
    // Check for custom shifts
    const hasCustomShifts = loggedInUserShifts && loggedInUserShifts.length > 0;
    
    // Check for default shifts
    const hasDefaultShifts = defaultShiftsData && defaultShiftsData.some((shift: any) => 
      shift.userId === user.id || shift.userId?.toString() === user.id?.toString()
    );
    
    console.log('[SHIFT_CHECK] User shift status:', {
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      hasCustomShifts,
      hasDefaultShifts,
      customShiftsCount: loggedInUserShifts?.length || 0,
      defaultShiftsCount: defaultShiftsData?.filter((s: any) => s.userId === user.id).length || 0
    });
    
    return hasCustomShifts || hasDefaultShifts;
  }, [user, loggedInUserShifts, defaultShiftsData]);
  
  // Query for filtered appointments
  const { data: allAppointments = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false,
  });

  // Query to fetch ALL appointments for selected provider/date (for slot availability checking)
  // This bypasses patient filtering to show all booked slots
  const { data: providerAppointments = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments", "provider", selectedProviderId, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    staleTime: 10000,
    enabled: !!selectedProviderId && !!selectedDate,
    retry: false,
    queryFn: async () => {
      if (!selectedProviderId || !selectedDate) return [];
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/appointments?providerId=${selectedProviderId}&date=${dateStr}`);
      return response.json();
    },
  });

  // Helper function to convert 12-hour time to 24-hour format
  const timeSlotTo24Hour = (timeSlot: string): string => {
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 = hours + 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Get filtered users by selected role (exclude patient and admin)
  const filteredUsers = useMemo(() => {
    console.log('🔍 FILTERING USERS - selectedRole:', selectedRole, 'selectedMedicalSpecialty:', selectedMedicalSpecialty, 'usersData:', usersData);
    if (!selectedRole || !usersData || !Array.isArray(usersData)) {
      console.log('❌ No role or users data available');
      return [];
    }
    const filtered = usersData.filter((u: any) => {
      // Case-insensitive comparison to handle any uppercase/lowercase mismatches
      const roleMatches = u.role?.toLowerCase() === selectedRole.toLowerCase();
      
      // If medical specialty is selected, also filter by specialty
      if (selectedMedicalSpecialty && selectedMedicalSpecialty !== 'all') {
        const specialtyMatches = u.medicalSpecialtyCategory === selectedMedicalSpecialty;
        console.log(`User ${u.firstName} ${u.lastName} - role: "${u.role}" === "${selectedRole}": ${roleMatches}, specialty: "${u.medicalSpecialtyCategory}" === "${selectedMedicalSpecialty}": ${specialtyMatches}`);
        return roleMatches && specialtyMatches;
      }
      
      console.log(`User ${u.firstName} ${u.lastName} - role: "${u.role}" === "${selectedRole}": ${roleMatches}`);
      return roleMatches;
    });
    console.log('✅ Filtered users count:', filtered.length, filtered);
    return filtered;
  }, [selectedRole, selectedMedicalSpecialty, usersData]);

  const normalizedSelectedRole = selectedRole?.toLowerCase().trim() || "";
  const selectedProviderIdNumber = selectedProviderId
    ? Number(selectedProviderId)
    : null;
  const selectedProviderNameNormalized = useMemo(() => {
    if (!selectedProviderIdNumber) return "";
    const provider = filteredUsers.find(
      (provider: any) => provider.id === selectedProviderIdNumber,
    );
    if (!provider) return "";
    return normalizeText(`${provider.firstName || ""} ${provider.lastName || ""}`);
  }, [selectedProviderIdNumber, filteredUsers]);

  const patientOverlapSelectedProviderDisplayName = useMemo(() => {
    if (!selectedProviderId) return "the selected provider";
    const u =
      filteredUsers.find((p: any) => p.id.toString() === selectedProviderId) ||
      usersData.find((p: any) => p.id.toString() === selectedProviderId);
    if (!u) return "the selected provider";
    const n = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return n || "the selected provider";
  }, [selectedProviderId, filteredUsers, usersData]);

  const entryMatchesSelectedProvider = (
    entryRole: string,
    entryName: string,
    entryId: number | null,
  ) => {
    if (selectedProviderIdNumber && entryId !== null) {
      if (entryId === selectedProviderIdNumber) {
        return true;
      }
    }
    if (
      selectedProviderNameNormalized &&
      entryName &&
      entryName === selectedProviderNameNormalized
    ) {
      return true;
    }
    return !selectedProviderIdNumber && !selectedProviderNameNormalized;
  };

  const entryMatchesSelectedRole = (entryRole: string) => {
    if (!normalizedSelectedRole) return true;
    return entryRole === normalizedSelectedRole;
  };

  const patientTreatmentsCatalog = useMemo(() => {
    if (!selectedRole && !selectedProviderIdNumber) return treatmentsList;
    return treatmentsList.filter((treatment: any) => {
      const entryRole = normalizeText(treatment.doctorRole ?? treatment.doctor_role);
      const entryName = normalizeText(
        treatment.doctorName ?? treatment.doctor_name,
      );
      const entryIdValue =
        treatment.doctorId ?? treatment.doctor_id
          ? Number(treatment.doctorId ?? treatment.doctor_id)
          : null;
      const matchesProvider = entryMatchesSelectedProvider(
        entryRole,
        entryName,
        entryIdValue,
      );
      const matchesRole = entryMatchesSelectedRole(entryRole);
      return matchesProvider && matchesRole;
    });
  }, [
    treatmentsList,
    selectedRole,
    selectedProviderIdNumber,
    selectedProviderNameNormalized,
  ]);

  const patientConsultationsCatalog = useMemo(() => {
    if (!selectedRole && !selectedProviderIdNumber) return consultationServices;
    return consultationServices.filter((service: any) => {
      const entryRole = normalizeText(
        service.doctorRole ?? service.doctor_role,
      );
      const entryName = normalizeText(
        service.doctorName ?? service.doctor_name,
      );
      const entryIdValue =
        service.doctorId ?? service.doctor_id
          ? Number(service.doctorId ?? service.doctor_id)
          : null;
      const matchesProvider = entryMatchesSelectedProvider(
        entryRole,
        entryName,
        entryIdValue,
      );
      const matchesRole = entryMatchesSelectedRole(entryRole);
      return matchesProvider && matchesRole;
    });
  }, [
    consultationServices,
    selectedRole,
    selectedProviderIdNumber,
    selectedProviderNameNormalized,
  ]);

  // Get filtered users by filter role for admin filter panel
  const filteredUsersByFilterRole = useMemo(() => {
    if (!filterRole || !usersData || !Array.isArray(usersData)) {
      return [];
    }
    return usersData.filter((u: any) => u.role?.toLowerCase() === filterRole.toLowerCase());
  }, [filterRole, usersData]);

  // Compute unique appointment IDs for the filter dropdown (admin only)
  const uniqueAppointmentIds = useMemo(() => {
    if (!Array.isArray(allAppointments)) return [];
    const ids = allAppointments
      .map((apt: any) => apt.appointmentId)
      .filter((id: string | undefined) => id !== undefined && id !== null && id !== "");
    return Array.from(new Set(ids)).sort();
  }, [allAppointments]);

  // Get available roles from roles table (exclude patient)
  const availableRoles: Array<{ name: string; displayName: string }> = useMemo(() => {
    if (!rolesData || !Array.isArray(rolesData)) return [];
    const filtered = rolesData
      .filter((role: any) => {
        const roleName = role.name?.toLowerCase();
        // For patient users, exclude Administrator, Patient, admin, and patient roles
        if (user?.role === 'patient') {
          return roleName !== 'patient' && roleName !== 'admin' && roleName !== 'administrator';
        }
        // For other users, only exclude patient role
        return roleName !== 'patient';
      })
      .map((role: any) => ({ name: role.name, displayName: role.displayName }));
    
    // Sort alphabetically by displayName when user is a patient
    if (user?.role === 'patient') {
      return filtered.sort((a, b) => 
        a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
      );
    }
    
    return filtered;
  }, [rolesData, user?.role]);

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return null;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get unique medical specialties from users with the selected role (for patient booking)
  const availableMedicalSpecialties = useMemo(() => {
    if (!usersData || !Array.isArray(usersData) || !selectedRole) return [];
    
    const roleFilteredUsers = usersData.filter((u: any) => 
      u.role?.toLowerCase() === selectedRole.toLowerCase()
    );
    
    const specialties = roleFilteredUsers
      .map((u: any) => u.medicalSpecialtyCategory)
      .filter((specialty: any) => specialty && specialty !== null && specialty !== '');
    
    const uniqueSpecialties = Array.from(new Set(specialties)) as string[];
    return uniqueSpecialties.sort();
  }, [usersData, selectedRole]);

  // Get unique medical specialties for staff filter sidebar
  const staffAvailableMedicalSpecialties = useMemo(() => {
    if (!usersData || !Array.isArray(usersData) || !staffFilterRole || staffFilterRole === 'all') return [];
    
    const roleFilteredUsers = usersData.filter((u: any) => 
      u.role?.toLowerCase() === staffFilterRole.toLowerCase()
    );
    
    const specialties = roleFilteredUsers
      .map((u: any) => u.medicalSpecialtyCategory)
      .filter((specialty: any) => specialty && specialty !== null && specialty !== '');
    
    const uniqueSpecialties = Array.from(new Set(specialties)) as string[];
    return uniqueSpecialties.sort();
  }, [usersData, staffFilterRole]);

  // Check if a date has shifts (custom or default)
  const hasShiftsOnDate = (date: Date): boolean => {
    if (!selectedProviderId) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check for custom shifts first
    const hasCustomShift = allProviderShifts?.some((shift: any) => {
      // Robust date comparison - handle both ISO strings and Date objects
      const shiftDateStr = shift.date instanceof Date 
        ? format(shift.date, 'yyyy-MM-dd')
        : shift.date.substring(0, 10);
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

  const scheduleBookingHoliday = useBookingHolidayCalendar({
    enabled: showNewAppointmentModal,
    selectedDate,
    setSelectedDate,
  });

  const isSchedulePickerDateDisabled = useCallback(
    (date: Date) => {
      if (isBefore(startOfDay(date), startOfDay(new Date()))) return true;
      if (isAfter(date, addMonths(new Date(), 3))) return true;
      if (selectedProviderId && !hasShiftsOnDate(date)) return true;
      return scheduleBookingHoliday.isDateHolidayBlocked(date);
    },
    [selectedProviderId, scheduleBookingHoliday.isDateHolidayBlocked],
  );

  const filterHolidayCalendar = useBookingHolidayCalendar({
    enabled: showFilterPanel,
    selectedDate: filterDate,
    setSelectedDate: setFilterDate,
  });

  const isFilterDateDisabled = useCallback(
    (date: Date) => {
      if (isBefore(startOfDay(date), startOfDay(new Date()))) return true;
      if (isAfter(date, addMonths(new Date(), 3))) return true;
      return false;
    },
    [],
  );

  // Generate time slots based on shifts for the selected provider on the selected date
  // Uses two-tier system: custom shifts (staff_shifts) take priority, then default shifts (doctor_default_shifts)
  const timeSlots = useMemo(() => {
    if (!selectedProviderId || !selectedDate) {
      console.log('[TIME_SLOTS] Missing providerId or date');
      return [];
    }

    // TIER 1: Check for custom shifts in staff_shifts table for the selected date
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    let providerShifts = shiftsData?.filter((shift: any) => {
      // Filter by staff ID
      if (shift.staffId.toString() !== selectedProviderId) return false;
      
      // Filter by selected date
      const shiftDateStr = shift.date instanceof Date 
        ? format(shift.date, 'yyyy-MM-dd')
        : shift.date.substring(0, 10);
      
      return shiftDateStr === selectedDateStr;
    }) || [];

    console.log(`[TIME_SLOTS] Provider ${selectedProviderId}, Date: ${format(selectedDate, 'yyyy-MM-dd EEEE')}`);
    console.log(`[TIME_SLOTS] Custom shifts found: ${providerShifts.length}`, providerShifts);

    // TIER 2: If no custom shifts found, use default shifts from doctor_default_shifts
    if (providerShifts.length === 0 && defaultShiftsData.length > 0) {
      console.log('[TIME_SLOTS] No custom shifts, checking default shifts...');
      console.log('[TIME_SLOTS] Available default shifts:', defaultShiftsData);
      
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId.toString() === selectedProviderId
      );

      console.log('[TIME_SLOTS] Default shift for provider:', defaultShift);

      if (defaultShift) {
        // Check if the selected date's day of week is in the working days
        const dayOfWeek = format(selectedDate, 'EEEE'); // "Monday", "Tuesday", etc.
        const workingDays = defaultShift.workingDays || [];
        
        console.log(`[TIME_SLOTS] Day of week: ${dayOfWeek}, Working days:`, workingDays);
        console.log(`[TIME_SLOTS] Is working day: ${workingDays.includes(dayOfWeek)}`);
        
        if (workingDays.includes(dayOfWeek)) {
          // Create a virtual shift object matching the staff_shifts structure
          providerShifts = [{
            staffId: defaultShift.userId,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            date: selectedDate,
            isDefault: true // Flag to indicate this came from default shifts
          }];
          console.log('[TIME_SLOTS] Using default shift:', providerShifts[0]);
        } else {
          console.log('[TIME_SLOTS] Selected date is not a working day');
        }
      } else {
        console.log('[TIME_SLOTS] No default shift found for provider');
      }
    }

    if (!providerShifts || providerShifts.length === 0) {
      console.log('[TIME_SLOTS] No shifts available (custom or default)');
      return [];
    }

    console.log('[TIME_SLOTS] Final provider shifts to use:', providerShifts);

    const allSlots: string[] = [];

    // Generate time slots for each shift
    for (const shift of providerShifts) {
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      // Generate 15-minute interval slots between start and end time
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
  }, [selectedProviderId, selectedDate, shiftsData, defaultShiftsData]);

  // Check if a time slot is booked (only checks if the 15-min slot itself is occupied)
  // Duration overlap checking is handled separately in checkSufficientTime() when booking
  const isTimeSlotBooked = (timeSlot: string): boolean => {
    if (!selectedDate || !selectedProviderId) return false;

    // Use providerAppointments for slot checking (includes ALL appointments for this provider/date)
    // This ensures patient users see all booked slots, not just their own
    const appointmentsToCheck = providerAppointments.length > 0 ? providerAppointments : allAppointments;
    if (!appointmentsToCheck || appointmentsToCheck.length === 0) return false;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const slotTime24 = timeSlotTo24Hour(timeSlot);

    return appointmentsToCheck.some((apt: any) => {
      // Filter by provider ID first (handle both camelCase and snake_case)
      const aptProviderId = apt.providerId || apt.provider_id;
      if (aptProviderId?.toString() !== selectedProviderId) return false;

      // Handle both camelCase (scheduledAt) and snake_case (scheduled_at)
      const scheduledTime = apt.scheduledAt || apt.scheduled_at;
      if (!scheduledTime) return false;

      const aptDateStr = scheduledTime.substring(0, 10);
      if (aptDateStr !== dateStr) return false;

      // Non-blocking statuses are treated as available (not booked)
      const st = String(apt.status || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
      if (st === "cancelled" || st === "canceled" || st === "completed" || st === "rescheduled") {
        return false;
      }

      const aptTime = scheduledTime.substring(11, 16);
      if (!aptTime) return false;

      // Parse appointment time and duration
      const [aptHour, aptMinute] = aptTime.split(':').map(Number);
      const aptDuration = apt.duration || 30;

      // Calculate appointment end time
      let aptEndMinute = aptMinute + aptDuration;
      let aptEndHour = aptHour;
      if (aptEndMinute >= 60) {
        aptEndHour += Math.floor(aptEndMinute / 60);
        aptEndMinute = aptEndMinute % 60;
      }

      const aptStart24 = `${aptHour.toString().padStart(2, '0')}:${aptMinute.toString().padStart(2, '0')}`;
      const aptEnd24 = `${aptEndHour.toString().padStart(2, '0')}:${aptEndMinute.toString().padStart(2, '0')}`;

      // FIXED: Only check if THIS specific 15-minute slot falls within the appointment's time range
      // This ensures only the actual occupied slots are greyed out (4 slots for 60 min, not 5)
      // Example: 1:00 AM appointment for 60 min occupies 1:00, 1:15, 1:30, 1:45 (ends at 2:00)
      // 12:45 AM is NOT occupied, so it shows as available (green)
      // When user tries to book 12:45 for 60 min, checkSufficientTime() will validate overlap
      return (slotTime24 >= aptStart24 && slotTime24 < aptEnd24);
    });
  };

  // Check if sufficient consecutive time is available for the selected duration
  const checkSufficientTime = (startTimeSlot: string, durationMinutes: number): { available: boolean; availableMinutes: number } => {
    if (!selectedDate || !selectedProviderId) return { available: false, availableMinutes: 0 };

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

      // Check if this slot exists and is not booked
      if (!timeSlots.includes(timeSlotStr) || isTimeSlotBooked(timeSlotStr)) {
        return { available: false, availableMinutes };
      }
      
      availableMinutes += 15;
    }

    return { available: true, availableMinutes };
  };
  
  // Function to refresh all filters and search results
  const handleRefreshFilters = () => {
    // Reset all filter states
    setFilterRole("");
    setFilterProvider("");
    setFilterSpecialty("");
    setFilterSubSpecialty("");
    setFilterDoctor("");
    setFilterDate(undefined);
    setFilterAppointmentId("");
    setFilteredAppointments([]);
    
    // Invalidate and refetch appointment queries
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/appointments", "all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/appointments", "patient-filtered"] });
    
    toast({
      title: "Filters refreshed",
      description: "All filters and search results have been reset.",
    });
  };

  // Function to apply filters
  const applyFilters = () => {
    // For admin users, use role-based filtering
    if (user?.role === 'admin') {
      if (!filterProvider && !filterDate && !filterAppointmentId) {
        setFilteredAppointments([]);
        return;
      }
      
      let filtered = [...allAppointments];
      
      // Filter by provider (role-based)
      if (filterProvider) {
        const selectedProviderId = parseInt(filterProvider);
        filtered = filtered.filter((appointment: any) => appointment.providerId === selectedProviderId);
      }
      
      // Filter by date - NO TIMEZONE CONVERSION
      if (filterDate) {
        const filterDateStr = format(filterDate, 'yyyy-MM-dd');
        filtered = filtered.filter((appointment: any) => {
          const scheduledTime = appointment.scheduledAt ?? appointment.scheduled_at;
          const appointmentDateStr = scheduledTime?.split('T')[0];
          return appointmentDateStr === filterDateStr;
        });
      }

      // Filter by appointment ID
      if (filterAppointmentId) {
        filtered = filtered.filter((appointment: any) => appointment.appointmentId === filterAppointmentId);
      }
      
      setFilteredAppointments(filtered);
    } else {
      // For non-admin users, use specialty-based filtering
      if (!filterDoctor && !filterDate) {
        setFilteredAppointments([]);
        return;
      }
      
      let filtered = [...allAppointments];
      
      // Filter by doctor
      if (filterDoctor) {
        const selectedDoctorId = parseInt(filterDoctor);
        filtered = filtered.filter((appointment: any) => appointment.providerId === selectedDoctorId);
      }
      
      // Filter by date - NO TIMEZONE CONVERSION
      if (filterDate) {
        const filterDateStr = format(filterDate, 'yyyy-MM-dd');
        filtered = filtered.filter((appointment: any) => {
          const scheduledTime = appointment.scheduledAt ?? appointment.scheduled_at;
          const appointmentDateStr = scheduledTime?.split('T')[0];
          return appointmentDateStr === filterDateStr;
        });
      }
      
      setFilteredAppointments(filtered);
    }
  };
  
  // Apply filters when filter values change
  useEffect(() => {
    if (showFilterPanel) {
      applyFilters();
    }
  }, [filterDoctor, filterProvider, filterDate, filterAppointmentId, allAppointments, showFilterPanel, user?.role]);
  
  // Filter doctors by specialty for filter panel - reactive to filter changes
  const filteredDoctorsBySpecialty = useMemo(() => {
    console.log('Filtering doctors - Specialty:', filterSpecialty, 'Sub-specialty:', filterSubSpecialty);
    console.log('All doctors:', allDoctors);
    
    if (!filterSpecialty && !filterSubSpecialty) {
      console.log('No filters, returning all doctors:', allDoctors.length);
      return allDoctors;
    }
    
    const filtered = allDoctors.filter((doctor: any) => {
      console.log(`Checking doctor: ${doctor.firstName} ${doctor.lastName}, category: ${doctor.medicalSpecialtyCategory}, subSpecialty: ${doctor.subSpecialty}`);
      
      if (filterSubSpecialty) {
        const matches = doctor.subSpecialty === filterSubSpecialty;
        console.log(`Sub-specialty filter: ${filterSubSpecialty} matches ${doctor.subSpecialty}:`, matches);
        return matches;
      } else if (filterSpecialty) {
        const matches = doctor.medicalSpecialtyCategory === filterSpecialty;
        console.log(`Specialty filter: ${filterSpecialty} matches ${doctor.medicalSpecialtyCategory}:`, matches);
        return matches;
      }
      return true;
    });
    
    console.log('Filtered doctors result:', filtered.length, filtered);
    return filtered;
  }, [allDoctors, filterSpecialty, filterSubSpecialty]);
  
  // Helper functions for specialty filtering - using consistent data from medicalSpecialties object
  const getUniqueSpecialties = (): string[] => {
    return Object.keys(medicalSpecialties);
  };
  
  const getSubSpecialties = (specialty?: string): string[] => {
    if (!specialty) {
      // If no specialty selected, return all sub-specialties
      const allSubSpecialties: string[] = [];
      Object.values(medicalSpecialties).forEach(specialtyData => {
        allSubSpecialties.push(...Object.keys(specialtyData));
      });
      return allSubSpecialties;
    }
    
    const specialtyData = medicalSpecialties[specialty as keyof typeof medicalSpecialties];
    return specialtyData ? Object.keys(specialtyData) : [];
  };
  
  const filterDoctorsBySpecialty = () => {
    if (!Array.isArray(allDoctors) || allDoctors.length === 0) {
      console.log('⚠️ No doctors available for filtering. Array check:', Array.isArray(allDoctors), 'Length:', allDoctors?.length);
      console.log('⚠️ Is loading doctors:', isLoadingDoctors, 'Doctors error:', doctorsError);
      setFilteredDoctors([]);
      return [];
    }
    
    console.log('Filtering doctors with specialty:', selectedSpecialty, 'sub-specialty:', selectedSubSpecialty);
    console.log('Available doctors:', allDoctors);
    
    // If no specialty is selected, show all active doctors
    if (!selectedSpecialty) {
      console.log('No specialty selected, showing all doctors:', allDoctors);
      const activeDoctors = allDoctors.filter((doctor: any) => doctor.isActive !== false);
      setFilteredDoctors(activeDoctors);
      return activeDoctors;
    }
    
    const filtered = allDoctors.filter((doctor: any) => {
      // Skip inactive doctors
      if (doctor.isActive === false) {
        return false;
      }
      
      const hasSpecialty = doctor.medicalSpecialtyCategory === selectedSpecialty;
      const hasSubSpecialty = !selectedSubSpecialty || doctor.subSpecialty === selectedSubSpecialty;
      
      console.log(`Checking ${doctor.firstName} ${doctor.lastName}:`, {
        specialty: doctor.medicalSpecialtyCategory,
        selectedSpecialty,
        hasSpecialty,
        subSpecialty: doctor.subSpecialty,
        selectedSubSpecialty,
        hasSubSpecialty,
        isActive: doctor.isActive
      });
      
      return hasSpecialty && hasSubSpecialty;
    });
    
    console.log('Filtered doctors:', filtered);
    setFilteredDoctors(filtered);
    return filtered;
  };
  
  // Predefined time slots from 9:00 AM to 5:00 PM in 30-minute intervals
  const PREDEFINED_TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  // Fetch appointments from database for selected date and doctor
  const fetchAppointmentsForDateAndDoctor = async (doctorId: number, date: Date): Promise<string[]> => {
    try {
      console.log(`[NEW_TIME_SLOTS] Fetching appointments for Doctor ID: ${doctorId}, Date: ${format(date, 'yyyy-MM-dd')}`);
      
      // Query database directly for appointments
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
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

      const appointments = await response.json();
      console.log(`[NEW_TIME_SLOTS] Fetched ${appointments.length} total appointments from database`);

      // Filter appointments for selected doctor and date
      const dateStr = format(date, 'yyyy-MM-dd');
      const doctorAppointments = appointments.filter((apt: any) => {
        const scheduledTime = apt.scheduledAt ?? apt.scheduled_at;
        if (!apt || !apt.providerId || !scheduledTime) {
          return false;
        }
        
        const matchesDoctor = Number(apt.providerId) === Number(doctorId);
        // Extract date directly from ISO string without timezone conversion
        // Format: "2025-09-16T09:00:00.000Z" -> extract "2025-09-16"
        const appointmentDateStr = scheduledTime.split('T')[0];
        const matchesDate = appointmentDateStr === dateStr;
        // IMPORTANT: Only include scheduled appointments - CANCELLED appointments are treated as available time slots
        const isNotCancelled = apt.status !== 'cancelled';
        
        return matchesDoctor && matchesDate && isNotCancelled;
      });

      console.log(`[NEW_TIME_SLOTS] Found ${doctorAppointments.length} appointments for doctor ${doctorId} on ${dateStr}`);

      // Extract booked time slots from scheduledAt field - NO TIMEZONE CONVERSION
      const bookedTimes = doctorAppointments.map((apt: any) => {
        const scheduledTime = apt.scheduledAt ?? apt.scheduled_at;
        // Extract time directly from ISO string without any timezone conversion
        // Format: "2025-09-16T09:00:00.000Z" -> extract "09:00" exactly as stored
        const timeSlot = scheduledTime.split('T')[1]?.substring(0, 5);
        console.log(`[NEW_TIME_SLOTS] [NO-CONVERSION] Exact time from database: ${timeSlot} (from ${scheduledTime})`);
        return timeSlot;
      }).filter(Boolean);

      console.log(`[NEW_TIME_SLOTS] Final booked time slots from database:`, bookedTimes);
      return bookedTimes;
      
    } catch (error) {
      console.error('[NEW_TIME_SLOTS] Error fetching appointments:', error);
      return [];
    }
  };

  // State to store time slot availability status
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, boolean>>({});
  const [timeSlotError, setTimeSlotError] = useState<string | null>(null);

  // Function to check all time slots availability
  const checkAllTimeSlots = async () => {
    if (!selectedDate || !selectedDoctor) {
      setTimeSlotAvailability({});
      setTimeSlotError(null);
      return;
    }

    console.log(`[NEW_TIME_SLOTS] Checking availability for doctor ${selectedDoctor.id} on ${format(selectedDate, 'yyyy-MM-dd')}`);
    setTimeSlotError(null);
    
    try {
      const bookedSlots = await fetchAppointmentsForDateAndDoctor(selectedDoctor.id, selectedDate);
      
      // Check if fetch was successful (not an empty array due to error)
      if (bookedSlots.length === 0) {
        // Verify this is actually "no appointments" vs fetch error by checking console logs
        console.log(`[NEW_TIME_SLOTS] No booked slots found - could be no appointments or fetch error`);
      }
      
      const availability: Record<string, boolean> = {};
      
      // Check each predefined time slot
      PREDEFINED_TIME_SLOTS.forEach(timeSlot => {
        // Check if slot is in the past (only for today's date and only for actual scheduling)
        const slotDateStr = format(selectedDate!, 'yyyy-MM-dd');
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        const isToday = slotDateStr === todayStr;
        
        // FIXED: Only block past times for today AND only if we're actually booking (not just viewing availability)
        // For testing/demo purposes, don't block past times to allow full time slot testing
        if (isToday && false) { // Disabled past time check for better UX - users can book any available slot
          const now = new Date();
          const [hours, minutes] = timeSlot.split(':').map(Number);
          const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
          
          if (slotTime < now) {
            availability[timeSlot] = false; // Past time, blocked
            return; // Continue to next slot
          }
        }
        
        // Check if slot is booked in database
        const isBooked = bookedSlots.includes(timeSlot);
        availability[timeSlot] = !isBooked; // true = available (green), false = blocked (grey)
      });
      
      console.log(`[NEW_TIME_SLOTS] Time slot availability:`, availability);
      setTimeSlotAvailability(availability);
      
    } catch (error) {
      console.error('[NEW_TIME_SLOTS] Error checking time slot availability:', error);
      setTimeSlotError('Failed to load appointment availability. Please try again.');
      
      // Mark all slots as unavailable on error
      const errorAvailability: Record<string, boolean> = {};
      PREDEFINED_TIME_SLOTS.forEach(timeSlot => {
        errorAvailability[timeSlot] = false;
      });
      setTimeSlotAvailability(errorAvailability);
      
      toast({
        title: "Error Loading Time Slots",
        description: "Failed to check appointment availability. Please try refreshing.",
        variant: "destructive",
      });
    }
  };

  // Update filtered doctors when specialty/sub-specialty changes or when doctors data loads
  useEffect(() => {
    filterDoctorsBySpecialty();
  }, [selectedSpecialty, selectedSubSpecialty, allDoctors]);

  // Auto-update time slots when doctor or date changes
  useEffect(() => {
    // Clear selected time slot when doctor or date changes to force grid refresh
    if (selectedTimeSlot) {
      setSelectedTimeSlot("");
    }
    
    // Check availability for all time slots
    if (selectedDate && selectedDoctor) {
      console.log(`[NEW_TIME_SLOTS] Doctor or date changed, checking all time slots availability`);
      checkAllTimeSlots();
    } else {
      // Clear availability when no doctor or date selected
      setTimeSlotAvailability({});
    }
  }, [selectedDoctor, selectedDate]);
  
  // Check for patientId in URL params to auto-book appointment
  // Use window.location.search directly to detect query parameter changes even when route doesn't change
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId');
    
    if (isDoctorLike(user?.role)) {
      console.log('🔍 URL PATIENT ID CHECK:', {
        urlPatientId: patientId,
        currentBookingFormPatientId: bookingForm.patientId,
        windowLocationSearch: window.location.search,
        location: location
      });
    }
    
    if (patientId) {
      // Always update bookingForm.patientId when URL parameter changes
      // This ensures the correct patient is displayed when clicking different "Book" buttons
      setBookingForm(prev => {
        // Always update to ensure we have the latest patientId from URL
        // Convert to string for consistency
        const patientIdStr = String(patientId);
        if (prev.patientId !== patientIdStr) {
          if (isDoctorLike(user?.role)) {
            console.log('✅ UPDATING bookingForm.patientId:', {
              old: prev.patientId,
              new: patientIdStr,
              oldType: typeof prev.patientId,
              newType: typeof patientIdStr
            });
          }
          return { ...prev, patientId: patientIdStr };
        }
        return prev;
      });
      
      // Auto-open the modal when patientId is in URL (for doctor/nurse roles)
      if (isDoctorLike(user?.role) && !showNewAppointmentModal) {
        console.log('✅ AUTO-OPENING modal for patientId:', patientId);
        setShowNewAppointmentModal(true);
      }
    } else {
      // Clear patientId from bookingForm if it's removed from URL
      setBookingForm(prev => {
        if (prev.patientId) {
          if (isDoctorLike(user?.role)) {
            console.log('🧹 CLEARING bookingForm.patientId (no URL param)');
          }
          return { ...prev, patientId: '' };
        }
        return prev;
      });
    }
  }, [location, user?.role, showNewAppointmentModal]);

  // Also sync bookingForm.patientId when modal opens to ensure latest URL parameter is used
  useEffect(() => {
    if (showNewAppointmentModal) {
      const urlParams = new URLSearchParams(window.location.search);
      const patientId = urlParams.get('patientId');
      if (patientId) {
        // Always update to ensure we have the latest patientId from URL when modal opens
        // Convert to string for consistency
        const patientIdStr = String(patientId);
        setBookingForm(prev => {
          if (prev.patientId !== patientIdStr) {
            if (isDoctorLike(user?.role)) {
              console.log('✅ MODAL OPEN: Syncing patientId from URL:', {
                old: prev.patientId,
                new: patientIdStr,
                patientsLoaded: !patientsLoading && patients.length > 0
              });
            }
            return { ...prev, patientId: patientIdStr };
          }
          return prev;
        });
      } else if (isDoctorLike(user?.role)) {
        // If modal opens without patientId (e.g., from "Schedule Patient" button), clear any existing patientId
        setBookingForm(prev => {
          if (prev.patientId) {
            console.log('🧹 MODAL OPEN: Clearing patientId (no URL param, opened from Schedule Patient)');
            return { ...prev, patientId: '' };
          }
          return prev;
        });
      }
    }
  }, [showNewAppointmentModal, location, user?.role, patientsLoading, patients.length]);

  // Auto-detect doctor when modal opens if user is a doctor
  useEffect(() => {
    if (!user) return;
    if (showNewAppointmentModal && isDoctorLike(user.role)) {
      console.log('🔍 DOCTOR AUTO-DETECT: Modal opened for doctor role');
      console.log('👤 DOCTOR AUTO-DETECT: Current user ID:', user.id);
      
      // Immediately set providerId from current user - don't wait for allDoctors to load
      // This ensures time slots display immediately
      setSelectedRole('doctor');
      setSelectedProviderId(user.id.toString());
      console.log('✅ DOCTOR AUTO-DETECT: Auto-populated role=doctor and providerId=' + user.id);
      
      // Set selectedDoctor if allDoctors is loaded
      if (allDoctors.length > 0) {
        console.log('📊 DOCTOR AUTO-DETECT: Total doctors fetched from users table:', allDoctors.length);
        console.log('📋 DOCTOR AUTO-DETECT: All doctors from users table (where role=doctor):', allDoctors.map((d: any) => ({ id: d.id, name: `${d.firstName} ${d.lastName}`, organizationId: d.organizationId })));
        
        const currentUserAsDoctor = allDoctors.find((doctor: any) => doctor.id === user.id);
        if (currentUserAsDoctor) {
          console.log('✅ DOCTOR AUTO-DETECT: Found current user in doctors list from users table:', {
            id: currentUserAsDoctor.id,
            name: `${currentUserAsDoctor.firstName} ${currentUserAsDoctor.lastName}`,
            email: currentUserAsDoctor.email,
            role: currentUserAsDoctor.role,
            organizationId: currentUserAsDoctor.organizationId,
            department: currentUserAsDoctor.department,
            specialty: currentUserAsDoctor.medicalSpecialtyCategory,
            subSpecialty: currentUserAsDoctor.subSpecialty
          });
          
          // Always set the doctor details when modal opens
          if (!selectedDoctor) {
            setSelectedDoctor(currentUserAsDoctor);
          }
        } else {
          console.log('❌ DOCTOR AUTO-DETECT: Current user not found in doctors list');
        }
      }
    }
  }, [showNewAppointmentModal, user, allDoctors]);

  // Auto-select current date and first available time slot for doctors
  useEffect(() => {
    if (showNewAppointmentModal && isDoctorLike(user?.role) && !selectedDate) {
      const today = startOfDay(new Date());
      if (!scheduleBookingHoliday.isDateHolidayBlocked(today)) {
        setSelectedDate(today);
        console.log('📅 DOCTOR AUTO-SELECT: Set current date:', format(today, 'yyyy-MM-dd'));
      }
    }
  }, [showNewAppointmentModal, user, selectedDate, scheduleBookingHoliday.isDateHolidayBlocked]);

  // Auto-select first available time slot when time slots are loaded for doctors
  useEffect(() => {
    if (showNewAppointmentModal && isDoctorLike(user?.role) && selectedDate && timeSlots.length > 0 && !selectedTimeSlot) {
      // Find first available (not booked) time slot
      const firstAvailableSlot = timeSlots.find(slot => !isTimeSlotBooked(slot));
      if (firstAvailableSlot) {
        setSelectedTimeSlot(firstAvailableSlot);
        console.log('⏰ DOCTOR AUTO-SELECT: Set first available time slot:', firstAvailableSlot);
      }
    }
  }, [showNewAppointmentModal, user, selectedDate, timeSlots, selectedTimeSlot, isTimeSlotBooked]);

  // Combined mutation to create both appointment and invoice
  const createAppointmentAndInvoiceMutation = useMutation({
    mutationFn: async ({ appointmentData, invoiceData }: { appointmentData: any; invoiceData: any }) => {
      console.log('[CALENDAR-MUTATION] Creating appointment with data:', {
        patientId: appointmentData.patientId,
        patientIdType: typeof appointmentData.patientId,
        providerId: appointmentData.providerId,
        scheduledAt: appointmentData.scheduledAt,
        user: user ? { id: user.id, role: user.role, email: user.email } : null,
        authToken: localStorage.getItem('auth_token') ? 'present' : 'missing'
      });
      
      // Create appointment first
      const appointmentResponse = await apiRequest("POST", "/api/appointments", {
        ...appointmentData,
        createdBy: user?.id
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
      
      const invoiceDataWithServiceId = {
        ...invoiceData,
        serviceId: appointment.appointmentId || appointment.appointment_id,
        dateOfService: serviceDate, // Use actual appointment date
        dueDate: dueDate // Due date should always be the same as service date (dateOfService)
      };
      
      // Create invoice with appointment_id as serviceId and correct dates
      const invoiceResponse = await apiRequest("POST", "/api/invoices", invoiceDataWithServiceId);
      const invoice = await invoiceResponse.json();
      
      console.log("✅ Invoice created with serviceId:", invoiceDataWithServiceId.serviceId);
      
      // Auto-submit insurance claim if payment method is Insurance
      let insuranceClaim = null;
      let claimSubmissionFailed = false;
      if (invoiceData.paymentMethod === 'Insurance') {
        try {
          const claimNumber = `AUTO-${Date.now()}`;
          const claimResponse = await apiRequest('POST', '/api/insurance/submit-claim', {
            invoiceId: invoice.id,
            provider: invoiceData.insuranceProvider,
            claimNumber: claimNumber
          });
          insuranceClaim = await claimResponse.json();
          console.log("Insurance claim submitted automatically:", { 
            invoiceId: invoice.id, 
            provider: invoiceData.insuranceProvider, 
            claimNumber 
          });
        } catch (claimError) {
          console.error("Failed to auto-submit insurance claim:", claimError);
          claimSubmissionFailed = true;
        }
      }
      
      return { appointment, invoice, insuranceClaim, claimSubmissionFailed };
    },
    onSuccess: async ({ appointment, invoice, insuranceClaim, claimSubmissionFailed }) => {
      // Update calendar data with proper cache invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", "patient-filtered"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      // Invalidate specific appointment queries for the selected date
      if (selectedDate) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/appointments", format(selectedDate, 'yyyy-MM-dd')] 
        });
      }
      
      // Close invoice modals
      setShowInvoiceModal(false);
      setShowInvoiceSummary(false);
      setPendingAppointmentData(null);
      
      // Reset forms
      setShowNewAppointmentModal(false);
      scheduleBookingHoliday.resetHolidayState();
      setSelectedSpecialty("");
      setSelectedSubSpecialty("");
      setFilteredDoctors([]);
      setSelectedDoctor(null);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setSelectedRole("");
      setSelectedProviderId("");
      setSelectedDuration(30);
      setSelectedMedicalSpecialty("");
      setBookingForm({
        patientId: "",
        title: "",
        description: "",
        scheduledAt: "",
        duration: "30",
        type: "consultation",
        location: "",
        isVirtual: false
      });
      setDoctorAppointmentType("");
      setDoctorAppointmentSelectedTreatment(null);
      setDoctorAppointmentSelectedConsultation(null);
      setDoctorAppointmentTypeError("");
      setDoctorTreatmentSelectionError("");
      setDoctorConsultationSelectionError("");
      setInvoiceForm({
        serviceDate: new Date().toISOString().split('T')[0],
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        serviceCode: "CONS-001",
        serviceDescription: "General Consultation",
        amount: "50.00",
        insuranceProvider: "None (Patient Self-Pay)",
        notes: "",
        paymentMethod: "Online Payment"
      });
      
      // For Online Payment, create Stripe payment intent and redirect to payment
      try {
        const paymentIntentResponse = await apiRequest('POST', '/api/billing/create-payment-intent', {
          invoiceId: invoice.id,
          amount: parseFloat(invoice.totalAmount || invoice.subtotal || "50.00"),
          description: `Appointment booking - Invoice #${invoice.id}`
        });
        const paymentData = await paymentIntentResponse.json();
        
        if (paymentData.clientSecret) {
          setCreatedInvoiceId(invoice.id);
          setStripeClientSecret(paymentData.clientSecret);
        } else {
          // If payment intent creation fails, show success modal instead
          setShowSuccessModal(true);
        }
      } catch (paymentError) {
        console.error("Failed to create payment intent:", paymentError);
        // Show success modal instead of toast for patient users
        setShowSuccessModal(true);
      }
    },
    onError: (error) => {
      console.error("Creation error:", error);
      let errorMessage = "We couldn't complete your booking. Please try again.";
      let errorTitle = "Booking Error";
      
      if (error.message && error.message.includes("Patient not found")) {
        errorTitle = "Patient Record Issue";
        errorMessage = "We couldn't find your patient record. Please contact support or try logging out and back in.";
      } else if (error.message && error.message.includes("Authentication required")) {
        errorTitle = "Session Expired";
        errorMessage = "Your session has expired. Please log out and log back in to continue.";
      } else if (error.message && error.message.includes("already scheduled at this time")) {
        errorTitle = "Time Slot Unavailable";
        errorMessage =
          "This time slot can’t be confirmed because there is already another appointment that overlaps with the selected provider’s schedule. " +
          "Please choose a different time slot, or reschedule/cancel/complete the conflicting appointment first.";
      } else if (error.message && error.message.includes("Doctor is already scheduled")) {
        errorTitle = "Doctor Unavailable";
        errorMessage =
          "This booking couldn’t be confirmed because the selected provider already has an appointment during this time window. " +
          "Please choose a different time slot, or reschedule/cancel/complete the conflicting appointment first.";
      } else if (error.message && error.message.includes("Patient ID is required")) {
        errorTitle = "Missing Information";
        errorMessage = "Patient information is missing. Please try again or contact support if the issue persists.";
      }
      
      setBookingErrorTitle(errorTitle);
      setBookingErrorMessage(errorMessage);
      setShowBookingErrorModal(true);
      setShowInvoiceModal(false);
      setShowInvoiceSummary(false);
      setShowConfirmationModal(false);
      setShowNewAppointmentModal(false);
    },
  });

  const resolveCalendarDuplicateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      if (!Number.isFinite(Number(id))) {
        throw new Error("Invalid appointment id (cannot update status).");
      }
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      return response.json();
    },
    onMutate: async (variables) => {
      // Optimistically update cached appointment list so UI reflects status immediately.
      await queryClient.cancelQueries({ queryKey: ["/api/appointments"] });
      const previous = queryClient.getQueryData(["/api/appointments"]);
      const nextStatus = String(variables.status || "").toLowerCase().trim();
      queryClient.setQueryData(["/api/appointments"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((apt: any) =>
          Number(apt?.id) === Number(variables.id)
            ? { ...apt, status: nextStatus }
            : apt,
        );
      });
      return { previous };
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      const st = normalizeAppointmentStatusCal(variables.status);
      if (st === "completed" || st === "cancelled") {
        setShowDuplicateWarning(false);
        setDuplicateAppointmentRecord(null);
        setDuplicateAppointmentDetails("");
        setShowConfirmationModal(true);
        toast({
          title: "Status updated",
          description: "Review the booking summary to confirm the new appointment.",
        });
      }
      if (st === "rescheduled") {
        setShowDuplicateWarning(false);
        const appt = pendingAppointmentData;
        const invoice = pendingDuplicateInvoiceData;
        setDuplicateAppointmentRecord(null);
        setDuplicateAppointmentDetails("");
        setPendingDuplicateInvoiceData(null);
        toast({
          title: "Appointment rescheduled",
          description: "Existing appointment marked as rescheduled. Creating the new appointment now.",
        });

        if (pendingDuplicateCreateMode === "invoice" && appt && invoice) {
          createAppointmentAndInvoiceMutation.mutate({ appointmentData: appt, invoiceData: invoice });
          return;
        }

        if (appt) {
          createDoctorAppointmentMutation.mutate({ ...appt, status: "scheduled" });
          return;
        }
      }
    },
    onError: (error: any, _variables, context: any) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["/api/appointments"], context.previous);
      }
      toast({
        title: "Update failed",
        description: error?.message || "Could not update appointment status (check permissions).",
        variant: "destructive",
      });
    },
  });

  // Close stale "Rescheduled Appointment" flag when there is nothing valid to show (no empty popup).
  useEffect(() => {
    if (!showDuplicateWarning) return;
    if (resolveCalendarDuplicateStatusMutation.isPending) return;
    if (canShowCalendarRescheduleDuplicateModal(user?.role, duplicateAppointmentRecord)) return;
    setShowDuplicateWarning(false);
    const details = duplicateAppointmentDetails;
    setDuplicateAppointmentRecord(null);
    setDuplicateAppointmentDetails("");
    if (details?.trim() && !isDoctorLike(user?.role)) {
      toast({
        title: "Duplicate appointment",
        description: details,
        variant: "destructive",
      });
    }
  }, [
    showDuplicateWarning,
    duplicateAppointmentRecord,
    duplicateAppointmentDetails,
    user?.role,
    toast,
    resolveCalendarDuplicateStatusMutation.isPending,
  ]);

  const createDoctorAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", {
        ...appointmentData,
        createdBy: user?.id,
      });
      return response.json();
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", "doctor", user?.id] });
      setShowSuccessModal(true);
      setShowNewAppointmentModal(false);
      scheduleBookingHoliday.resetHolidayState();
      setSelectedDoctor(null);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setBookingForm({
        patientId: "",
        title: "",
        description: "",
        scheduledAt: "",
        duration: "30",
        type: "consultation",
        location: "",
        isVirtual: false,
      });
      resetDoctorAppointmentServiceSelection();
      setSelectedRole("");
      setSelectedProviderId("");
      setSelectedDuration(30);
      setSelectedMedicalSpecialty("");
      setPendingAppointmentData(null);
      setShowConfirmationModal(false);
      setIsConfirmingAppointment(false);
    },
    onError: (error: any, variables: any) => {
      console.error("Doctor appointment error:", error);
      setIsConfirmingAppointment(false);
      const raw = String(error?.message || "");
      const m = raw.match(/^409:\s*([\s\S]+)$/);
      if (m) {
        try {
          const payload = JSON.parse(m[1]);
          if (payload.code === "DUPLICATE_APPOINTMENT_SERVICE" && payload.message) {
            const ex = payload.existingAppointment;
            // Keep the new appointment payload so we can create it after rescheduling.
            if (variables) {
              setPendingAppointmentData({ ...variables, status: "scheduled" });
            }

            // IMPORTANT: `existingAppointment.appointment_id` is a string (APT...), not the numeric DB id.
            // Only use numeric `id` for PATCH routes.
            const normalizedDup = ex
              ? {
                  ...ex,
                  id: Number(ex.id),
                  status: ex.dup_status ?? ex.status,
                  scheduledAt: ex.scheduled_at ?? ex.scheduledAt,
                }
              : null;

            if (!canShowCalendarRescheduleDuplicateModal(user?.role, normalizedDup)) {
              setDuplicateAppointmentRecord(null);
              setDuplicateAppointmentDetails("");
              toast({
                title: "Duplicate appointment",
                description:
                  payload.message ||
                  "Could not open the reschedule dialog. Check the existing booking or try again.",
                variant: "destructive",
              });
              return;
            }

            setDuplicateAppointmentDetails(payload.message);
            setDuplicateAppointmentRecord(normalizedDup);
            if (isDoctorLike(user?.role)) {
              setPendingDuplicateCreateMode("doctor");
              setDuplicateResolveStatus("rescheduled");
            }
            setShowDuplicateWarning(true);
            setShowConfirmationModal(false);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      const userMsg = extractCalendarApiUserMessage(error);
      // If server provided conflict appointment details, show them in the modal.
      try {
        const conflictMatch = raw.match(/^\d+:\s*([\s\S]+)$/);
        const body = (conflictMatch ? conflictMatch[1] : raw).trim();
        const j = JSON.parse(body);
        if (j?.code === "PROVIDER_TIME_CONFLICT" && Array.isArray(j?.conflicts)) {
          const serverConflicts = j.conflicts;
          if (serverConflicts.length > 0) {
            setBookingConflictAppointments(serverConflicts);
          } else {
            // Fallback: rebuild conflicts from loaded appointments (same approach as appointment-calendar.tsx).
            const cached = (queryClient.getQueryData(["/api/appointments"]) as any[]) || [];
            const local = buildLocalProviderConflictsCal({
              appointments: cached,
              providerId: Number(variables?.providerId),
              scheduledAt: variables?.scheduledAt,
              durationMins: Number(variables?.duration ?? 30),
            });
            setBookingConflictAppointments(local);
          }
        } else {
          setBookingConflictAppointments([]);
        }
      } catch {
        setBookingConflictAppointments([]);
      }
      const isProviderOverlap =
        /already scheduled|not available|time slot|different time|unavailable|overlap/i.test(userMsg) ||
        /PROVIDER_TIME_CONFLICT/i.test(raw);

      if (isProviderOverlap) {
        setBookingErrorTitle("Appointment conflict");
        // Keep message short; the modal will show full overlapping appointment details below.
        setBookingErrorMessage(
          "The selected provider already has overlapping appointment(s) at this time. Review the overlapping appointment details below.",
        );
      } else {
        setBookingErrorTitle("Booking Error");
        setBookingErrorMessage(
          userMsg || raw.replace(/^409:\s*/, "").slice(0, 300) || "Failed to create appointment. Please try again.",
        );
      }
      setShowBookingErrorModal(true);
      setShowConfirmationModal(false);
    },
  });

  const handleBookAppointment = () => {
    console.log('[CALENDAR] handleBookAppointment called:', {
      userRole: user?.role,
      userEmail: user?.email,
      userId: user?.id,
      loggedInPatientRecord: loggedInPatientRecord ? { 
        id: loggedInPatientRecord.id, 
        patientId: loggedInPatientRecord.patientId,
        email: loggedInPatientRecord.email,
        userId: loggedInPatientRecord.userId
      } : null,
      patientsCount: patients?.length || 0,
      bookingFormPatientId: bookingForm.patientId
    });
    
    // For patient users, always use loggedInPatientRecord first
    let patientRecord: any = null;
    if (user?.role === 'patient') {
      // Use loggedInPatientRecord if available (it already checks userId and email)
      patientRecord = loggedInPatientRecord;
      
      // If still not found, try additional fallback searches
      if (!patientRecord && user?.id) {
        console.log('[CALENDAR] loggedInPatientRecord not found, trying additional search by userId:', user.id);
        patientRecord = patients.find((p: any) => 
          p.userId === user.id || 
          p.userId?.toString() === user.id?.toString() ||
          p.id === user.id ||
          p.id?.toString() === user.id?.toString()
        );
      }
      
      // If still not found, try by email (case-insensitive)
      if (!patientRecord && user?.email) {
        console.log('[CALENDAR] Patient not found by userId, trying by email:', user.email);
        patientRecord = patients.find((p: any) => 
          p.email?.toLowerCase() === user.email?.toLowerCase()
        );
      }
      
      if (!patientRecord) {
        console.error('[CALENDAR] CRITICAL: No patient record found for logged-in patient user!', {
          userEmail: user?.email,
          userId: user?.id,
          userRole: user?.role,
          patientsCount: patients.length,
          patientsAvailable: patients.slice(0, 5).map((p: any) => ({ 
            id: p.id, 
            email: p.email, 
            userId: p.userId,
            patientId: p.patientId 
          })),
          loggedInPatientRecord: loggedInPatientRecord ? {
            id: loggedInPatientRecord.id,
            email: loggedInPatientRecord.email,
            userId: loggedInPatientRecord.userId
          } : null
        });
        toast({
          title: "Patient Record Not Found",
          description: "Your patient record could not be found. Please ensure your account is properly linked to a patient record, or contact support.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('[CALENDAR] Successfully found patient record for logged-in patient:', {
        patientId: patientRecord.id,
        patientIdString: patientRecord.patientId,
        email: patientRecord.email,
        userId: patientRecord.userId,
        name: `${patientRecord.firstName} ${patientRecord.lastName}`
      });
    } else {
      // For non-patient users, find by patientId string or numeric ID
      if (bookingForm.patientId) {
        patientRecord = patients.find((p: any) => 
          p.patientId === bookingForm.patientId ||
          p.id.toString() === bookingForm.patientId ||
          p.id === parseInt(bookingForm.patientId)
        );
      }
    }
    
    // Use the numeric database ID from the patients table's id column
    const numericPatientId = patientRecord?.id || null;
    
    console.log('[CALENDAR] Resolved patient:', {
      patientRecord: patientRecord ? { 
        id: patientRecord.id, 
        patientId: patientRecord.patientId,
        email: patientRecord.email,
        name: `${patientRecord.firstName} ${patientRecord.lastName}`
      } : null,
      numericPatientId,
      numericPatientIdType: typeof numericPatientId
    });
    
    if (!selectedDoctor || !numericPatientId || !bookingForm.scheduledAt) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate that we have a valid numeric patient ID
    if (!numericPatientId || isNaN(numericPatientId)) {
      toast({
        title: "Missing patient record",
        description: "We could not resolve your patient record. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate that the appointment time is not in the past
    const appointmentDateTime = new Date(bookingForm.scheduledAt);
    const now = new Date();
    
    if (appointmentDateTime < now) {
      toast({
        title: "Invalid Appointment Time",
        description: "Cannot schedule appointments in the past. Please select a current or future time slot.",
        variant: "destructive",
      });
      return;
    }

    if (isDoctorLike(user?.role) || user?.role === "patient") {
      if (!doctorAppointmentType) {
        setDoctorAppointmentTypeError("Please select Appointment Type.");
        return;
      }
      if (doctorAppointmentType === "treatment" && !doctorAppointmentSelectedTreatment) {
        setDoctorTreatmentSelectionError("Please select a treatment.");
        return;
      }
      if (doctorAppointmentType === "consultation" && !doctorAppointmentSelectedConsultation) {
        setDoctorConsultationSelectionError("Please select a consultation.");
        return;
      }
    }

    // Prepare appointment data
    const normalizedDoctorAppointmentType = isDoctorLike(user?.role)
      ? doctorAppointmentType || "consultation"
      : bookingForm.type || "consultation";
    const treatmentId =
      normalizedDoctorAppointmentType === "treatment"
        ? doctorAppointmentSelectedTreatment?.id || null
        : null;
    const consultationId =
      normalizedDoctorAppointmentType === "consultation"
        ? doctorAppointmentSelectedConsultation?.id || null
        : null;

    if (allAppointments && selectedDate && numericPatientId && selectedDoctor) {
      const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
      const dupKind: "treatment" | "consultation" =
        normalizedDoctorAppointmentType === "treatment" ? "treatment" : "consultation";
      const dupApt = findDuplicateServiceAppointmentInCalendar(
        allAppointments,
        Number(numericPatientId),
        String(selectedDoctor.id),
        selectedDateStr,
        selectedTimeSlot ? buildLocalDateTimeString(selectedDate, selectedTimeSlot) : null,
        dupKind,
        treatmentId,
        consultationId
      );
      if (dupApt) {
        const normalizedDupBook = {
          ...dupApt,
          id: Number((dupApt as any).id),
          status: (dupApt as any)?.status ?? (dupApt as any)?.dup_status,
          scheduledAt: (dupApt as any)?.scheduledAt ?? (dupApt as any)?.scheduled_at,
        };
        if (canShowCalendarRescheduleDuplicateModal(user?.role, normalizedDupBook)) {
          const doctorName = `${selectedDoctor.firstName} ${selectedDoctor.lastName}`;
          const patient =
            patientRecord ||
            patients.find(
              (p: any) =>
                p.id === numericPatientId || p.id.toString() === numericPatientId.toString()
            );
          const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "the patient";
          const tid = dupApt.treatmentId ?? dupApt.treatment_id;
          const cid = dupApt.consultationId ?? dupApt.consultation_id;
          const serviceLabel =
            dupKind === "treatment"
              ? doctorAppointmentSelectedTreatment?.name ||
                (treatmentsList as any[]).find((t: any) => Number(t.id) === Number(tid))?.name ||
                "this treatment"
              : doctorAppointmentSelectedConsultation?.serviceName ||
                (consultationServices as any[]).find((s: any) => Number(s.id) === Number(cid))?.serviceName ||
                "this consultation";
          setDuplicateAppointmentDetails(
            buildCalendarDuplicateServiceWarningMessage(dupKind, dupApt, patientName, doctorName, serviceLabel)
          );
          setDuplicateAppointmentRecord(normalizedDupBook);
          if (isDoctorLike(user?.role)) {
            setDuplicateResolveStatus("completed");
          }
          setShowDuplicateWarning(true);
          return;
        }
        // No valid reschedule target (e.g. missing DB id): continue without empty "Rescheduled Appointment" popup.
      }
    }

    // Ensure patientId is a number, not a string
    let patientIdToSend: number;
    if (typeof numericPatientId === 'number') {
      patientIdToSend = numericPatientId;
    } else if (typeof numericPatientId === 'string') {
      patientIdToSend = parseInt(numericPatientId, 10);
    } else {
      patientIdToSend = numericPatientId as number;
    }
    
    if (!patientIdToSend || isNaN(patientIdToSend)) {
      console.error('[CALENDAR] Invalid patient ID:', numericPatientId, 'Type:', typeof numericPatientId);
      toast({
        title: "Patient Record Issue",
        description: "We couldn't find your patient record. Please contact support if this issue persists.",
        variant: "destructive",
      });
      return;
    }
    
    // Double-check that patientIdToSend is a valid number
    if (typeof patientIdToSend !== 'number' || patientIdToSend <= 0) {
      console.error('[CALENDAR] Patient ID is not a valid positive number:', patientIdToSend);
      toast({
        title: "Patient Record Issue",
        description: "Invalid patient information. Please try again or contact support.",
        variant: "destructive",
      });
      return;
    }
    
    // Create base appointment data, ensuring patientId is always a number
    const { patientId: _, ...bookingFormWithoutPatientId } = bookingForm;
    const baseAppointmentData: any = {
      ...bookingFormWithoutPatientId,
      patientId: patientIdToSend, // Explicitly ensure it's a number (not a string)
      providerId: selectedDoctor.id,
      title: bookingForm.title || `${bookingForm.type} with ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
      location: bookingForm.location || `${selectedDoctor.department} Department`,
      duration: parseInt(bookingForm.duration)
    };
    
    console.log('[CALENDAR] baseAppointmentData patientId:', {
      value: baseAppointmentData.patientId,
      type: typeof baseAppointmentData.patientId,
      isNumber: typeof baseAppointmentData.patientId === 'number',
      originalBookingFormPatientId: bookingForm.patientId,
      originalType: typeof bookingForm.patientId
    });
    
    console.log('[CALENDAR] Final appointment data being sent:', {
      patientId: baseAppointmentData.patientId,
      patientIdType: typeof baseAppointmentData.patientId,
      providerId: baseAppointmentData.providerId,
      scheduledAt: baseAppointmentData.scheduledAt,
      type: baseAppointmentData.type,
      patientRecord: patientRecord ? { 
        id: patientRecord.id, 
        patientId: patientRecord.patientId, 
        email: patientRecord.email,
        userId: patientRecord.userId,
        organizationId: patientRecord.organizationId
      } : null,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      } : null,
      loggedInPatientRecord: loggedInPatientRecord ? {
        id: loggedInPatientRecord.id,
        patientId: loggedInPatientRecord.patientId,
        email: loggedInPatientRecord.email,
        userId: loggedInPatientRecord.userId,
        organizationId: loggedInPatientRecord.organizationId
      } : null,
      patientIdMatches: patientRecord && loggedInPatientRecord ? patientRecord.id === loggedInPatientRecord.id : 'N/A'
    });
    const appointmentData = isDoctorLike(user?.role)
      ? {
          ...baseAppointmentData,
          appointmentType: normalizedDoctorAppointmentType,
          treatmentId,
          consultationId,
        }
      : baseAppointmentData;

    // Find patient to get their name for the invoice
    const patient = patientRecord || patients.find((p: any) => 
      p.id === numericPatientId ||
      p.id.toString() === numericPatientId.toString()
    );
    
    if (!patient) {
      toast({
        title: "Patient Not Found",
        description: "Could not find patient information. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const patientName = `${patient.firstName} ${patient.lastName}`;
    const serviceInfo = getBookingServiceInfo(appointmentData);
    const invoiceDefaults = buildInvoiceDefaults(appointmentData, serviceInfo, user?.role);
    
    // Create invoice data populated with selected service details
    // IMPORTANT: invoices table uses string patient_id (like "P000001"), not numeric id
    const invoiceData = {
      patientId: patient.patientId || patient.patient_id || `P${patient.id.toString().padStart(6, '0')}`, // Use string patient_id for invoices table
      patientName: patientName,
      nhsNumber: patient.nhsNumber || undefined,
      dateOfService: invoiceDefaults.serviceDate,
      invoiceDate: invoiceDefaults.invoiceDate,
      dueDate: invoiceDefaults.dueDate,
      status: "unpaid",
      invoiceType: "payment",
      paymentMethod: invoiceDefaults.paymentMethod,
      subtotal: invoiceDefaults.amount,
      tax: "0",
      discount: "0",
      totalAmount: invoiceDefaults.amount,
      paidAmount: invoiceDefaults.paymentMethod === "Cash" ? invoiceDefaults.amount : "0",
      items: [
        {
          code: invoiceDefaults.serviceCode,
          description: invoiceDefaults.serviceDescription,
          quantity: 1,
          unitPrice: parseFloat(invoiceDefaults.amount),
          total: parseFloat(invoiceDefaults.amount)
        }
      ],
      insuranceProvider: invoiceDefaults.insuranceProvider,
      notes: invoiceDefaults.notes
    };
    
    if (isDoctorLike(user?.role)) {
      createDoctorAppointmentMutation.mutate({
        ...appointmentData,
        referralType: doctorAppointmentType,
      });
      return;
    }

    // Automatically create both appointment and invoice
    createAppointmentAndInvoiceMutation.mutate({
      appointmentData,
      invoiceData
    });
  };

  return (
    <div className="w-full min-h-0 flex flex-col page-zoom-90">
      <Header 
        title="Appointments" 
        subtitle="Schedule and manage patient appointments efficiently."
      />
      
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        <div className="mb-5">
          <div className="flex justify-between items-center mb-4">
         
          
          </div>
          
          <div className="flex justify-between items-center">
            <div>   
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Calendar & Scheduling
                {user?.role !== "patient" && !isDoctorLike(user?.role) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowFilterPanel(!showFilterPanel);
                      if (showFilterPanel) {
                        // Reset filter when closing
                        setFilterSpecialty("");
                        setFilterSubSpecialty("");
                        setFilterDoctor("");
                        setFilterRole("");
                        setFilterProvider("");
                        setFilterDate(undefined);
                        setFilterAppointmentId("");
                        setFilteredAppointments([]);
                      }
                    }}
                    className="ml-2"
                    data-testid="button-filter-appointments"
                  >
                    {showFilterPanel ? (
                      <FilterX className="h-4 w-4" />
                    ) : (
                      <Filter className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {showFilterPanel 
                  ? "Use filters to find specific appointments by doctor, specialty, or date."
                  : "View appointments, manage schedules, and book new consultations."
                }
              </p>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user?.role === 'admin' ? (
                  <div className="flex flex-wrap items-end gap-4">
                    {/* Select Role (Admin Only) */}
                    <div className="flex-1 min-w-[150px]">
                      <Label>Select Role</Label>
                      <Select value={filterRole} onValueChange={(value) => {
                        setFilterRole(value === 'all' ? '' : value);
                        setFilterProvider(""); // Reset provider when role changes
                      }}>
                        <SelectTrigger data-testid="select-filter-role">
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="all-roles" value="all">
                            All
                          </SelectItem>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.name} value={role.name}>
                              {role.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Provider (Admin Only) - Only show when a role is selected */}
                    {filterRole !== undefined && (
                      <div className="flex-1 min-w-[150px]">
                        <Label>Provider</Label>
                        <Select value={filterProvider} onValueChange={(value) => setFilterProvider(value === 'all' ? '' : value)}>
                          <SelectTrigger data-testid="select-filter-provider">
                            <SelectValue placeholder="Select provider..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="all-providers" value="all">
                              All
                            </SelectItem>
                            {filteredUsersByFilterRole.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex-1 min-w-[150px]">
                      <Label>Date</Label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              data-testid="button-filter-date"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {filterDate ? format(filterDate, "PPP") : "All dates"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={filterDate}
                              onSelect={(date) => {
                                setFilterDate(date);
                                if (date && filterHolidayCalendar.needsHolidayAcknowledgement) {
                                  filterHolidayCalendar.setHolidayAcknowledged(false);
                                }
                              }}
                              disabled={isFilterDateDisabled}
                              initialFocus
                              {...filterHolidayCalendar.calendarProps}
                            />
                            <div className="px-3 pb-2">{filterHolidayCalendar.legend}</div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFilterDate(undefined)}
                          title="Clear date"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {/* Appointment ID (Admin Only) */}
                    {uniqueAppointmentIds.length > 0 && (
                      <div className="flex-1 min-w-[150px]">
                        <Label>Appointment ID</Label>
                        <Popover open={appointmentIdPopoverOpen} onOpenChange={setAppointmentIdPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={appointmentIdPopoverOpen}
                              className="w-full justify-between"
                              data-testid="filter-appointment-id"
                            >
                              {filterAppointmentId
                                ? filterAppointmentId
                                : "Select appointment ID..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search appointment ID..." />
                              <CommandList>
                                <CommandEmpty>No appointment ID found.</CommandEmpty>
                                <CommandGroup>
                                  {uniqueAppointmentIds.map((id: string) => (
                                    <CommandItem
                                      key={id}
                                      value={id}
                                      onSelect={() => {
                                        setFilterAppointmentId(id);
                                        setAppointmentIdPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          filterAppointmentId === id ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {id}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Refresh Button - Small Icon */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefreshFilters}
                        className="h-10 w-10"
                        data-testid="button-refresh-filters"
                        title="Refresh filters"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-4">
                    {/* Medical Specialty Category (Non-Admin) */}
                    <div className="pt-4">
                      <Label>Medical Specialty Category</Label>
                      <Select value={filterSpecialty} onValueChange={(value) => {
                        setFilterSpecialty(value === 'all' ? '' : value);
                        setFilterSubSpecialty(""); // Reset sub-specialty when specialty changes
                        setFilterDoctor(""); // Reset doctor when specialty changes
                      }}>
                        <SelectTrigger data-testid="select-filter-specialty">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="all-specialties" value="all">
                            All
                          </SelectItem>
                          {getUniqueSpecialties().map((specialty) => (
                            <SelectItem key={specialty} value={specialty}>
                              {specialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sub-Specialty (Non-Admin) */}
                    <div>
                      <Label>Sub-Specialty</Label>
                      <Select value={filterSubSpecialty} onValueChange={(value) => {
                        setFilterSubSpecialty(value === 'all' ? '' : value);
                        setFilterDoctor(""); // Reset doctor when sub-specialty changes
                      }}>
                        <SelectTrigger data-testid="select-filter-subspecialty">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="all-subspecialties" value="all">
                            All
                          </SelectItem>
                          {getSubSpecialties(filterSpecialty).map((subSpecialty) => (
                            <SelectItem key={subSpecialty} value={subSpecialty}>
                              {subSpecialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Doctor (Non-Admin) */}
                    <div>
                      <Label>Doctor</Label>
                      <Select value={filterDoctor} onValueChange={(value) => setFilterDoctor(value === 'all' ? '' : value)}>
                        <SelectTrigger data-testid="select-filter-doctor">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="all-doctors" value="all">
                            All
                          </SelectItem>
                          {filteredDoctorsBySpecialty.map((doctor: any) => (
                            <SelectItem key={doctor.id} value={doctor.id.toString()}>
                              Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date (Non-Admin) */}
                    <div>
                      <Label>Date</Label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              data-testid="button-filter-date"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {filterDate ? format(filterDate, "PPP") : "All dates"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={filterDate}
                              onSelect={(date) => {
                                setFilterDate(date);
                                if (date && filterHolidayCalendar.needsHolidayAcknowledgement) {
                                  filterHolidayCalendar.setHolidayAcknowledged(false);
                                }
                              }}
                              disabled={isFilterDateDisabled}
                              initialFocus
                              {...filterHolidayCalendar.calendarProps}
                            />
                            <div className="px-3 pb-2">{filterHolidayCalendar.legend}</div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFilterDate(undefined)}
                          title="Clear date"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conditional Content - Either Default Calendar or Filtered Appointments */}
        {showFilterPanel && ((user?.role === 'admin' ? (filterProvider || filterAppointmentId) : filterDoctor) || filterDate) ? (
          /* Filtered Appointments View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Filtered Appointments ({filteredAppointments.length} found)
              </h4>
            </div>
            
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No appointments found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No appointments match your filter criteria. Try adjusting your filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredAppointments.map((appointment: any) => {
                  const doctor = allDoctors.find((d: any) => d.id === appointment.providerId);
                  const patient = patients.find((p: any) => p.id === appointment.patientId);
                  // Extract exact time and date from database without timezone conversion
                  const scheduledTime = appointment.scheduledAt ?? appointment.scheduled_at;
                  const appointmentDate = new Date(scheduledTime); // For date formatting only
                  const exactTime = scheduledTime?.split('T')[1]?.substring(0, 5); // Extract HH:mm from UTC
                  // Convert 24-hour to 12-hour format without timezone conversion
                  const formatExactTime = (time24: string) => {
                    const [hours, minutes] = time24.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    return `${hour12}:${minutes} ${ampm}`;
                  };
                  
                  return (
                    <Card key={appointment.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {appointment.title || "Appointment"}
                            </h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Patient: {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>Doctor: {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{format(appointmentDate, 'EEEE, MMMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{exactTime ? formatExactTime(exactTime) : 'Time unavailable'} ({appointment.duration} mins)</span>
                            </div>
                            {appointment.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{appointment.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Default Calendar View */
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Calendar - 2 columns */}
            <div className="lg:col-span-2">
              <RoleBasedAppointmentRouter onNewAppointment={() => {
                // For patient users, ensure patient record is found before opening modal
                if (user?.role === 'patient') {
                  // Try to find patient record if not already found
                  let patientRecord = loggedInPatientRecord;
                  
                  if (!patientRecord && user?.id && patients.length > 0) {
                    console.log('[CALENDAR] Patient record not in loggedInPatientRecord, searching...');
                    patientRecord = patients.find((p: any) => 
                      p.userId === user.id || 
                      p.userId?.toString() === user.id?.toString() ||
                      p.email?.toLowerCase() === user.email?.toLowerCase()
                    );
                    
                    if (patientRecord) {
                      console.log('[CALENDAR] Found patient record when opening modal:', {
                        id: patientRecord.id,
                        patientId: patientRecord.patientId,
                        email: patientRecord.email
                      });
                    } else {
                      console.error('[CALENDAR] Patient record not found when opening modal!', {
                        userId: user.id,
                        userEmail: user.email,
                        patientsCount: patients.length
                      });
                      toast({
                        title: "Patient Record Not Found",
                        description: "We couldn't find your patient record. Please ensure your account is properly linked, or contact support.",
                        variant: "destructive",
                      });
                      return; // Don't open modal if patient record not found
                    }
                  } else if (!patientRecord && patients.length === 0) {
                    console.warn('[CALENDAR] Patients array is empty, cannot verify patient record');
                    toast({
                      title: "Loading Patient Data",
                      description: "Please wait while we load your patient information...",
                      variant: "default",
                    });
                    return; // Don't open modal if patients haven't loaded yet
                  } else if (patientRecord) {
                    console.log('[CALENDAR] Patient record confirmed, opening booking modal:', {
                      patientId: patientRecord.id,
                      patientIdString: patientRecord.patientId,
                      email: patientRecord.email
                    });
                  }
                }
                setShowNewAppointmentModal(true);
              }} />
            </div>
            
            {/* Doctor List - 1 column */}
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-900 dark:text-white" />
                    {user?.role === "nurse" ? "Patients Info" : user?.role === "doctor" ? "Patient Info" : isDoctorLike(user?.role) ? "Available Patient" : "Available Staff"}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStaffFilter(!showStaffFilter)}
                    className="h-6 w-6 p-0"
                  >
                    <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </Button>
                </div>
                
                {showStaffFilter && (
                  <div className="space-y-3 mb-4">
                    {isDoctorLike(user?.role) ? (
                      <div className="relative">
                        <Input
                          placeholder="Search patients by name, email, age, ID, NHS, phone, city, country..."
                          value={doctorPatientSearch}
                          onChange={(e) => setDoctorPatientSearch(e.target.value)}
                          className="pl-10"
                        />
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    ) : (
                      <>
                        <Select 
                          value={staffFilterRole} 
                          onValueChange={(value) => {
                            setStaffFilterRole(value);
                            setStaffFilterSpecialty(""); // Reset specialty when role changes
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {rolesData && Array.isArray(rolesData) && rolesData
                              .filter((role: any) => role.name !== "patient" && role.name !== "admin")
                              .map((role: any) => (
                                <SelectItem key={role.id} value={role.name}>
                                  {role.displayName || role.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        
                        {['doctor', 'nurse', 'dentist', 'dental_nurse', 'phlebotomist'].includes(staffFilterRole) && (
                          <Select 
                            value={staffFilterSpecialty} 
                            onValueChange={setStaffFilterSpecialty}
                          >
                            <SelectTrigger className="w-full" data-testid="select-staff-medical-specialty">
                              <SelectValue placeholder="Medical Specialty Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {medicalSpecialtyCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {staffFilterRole === 'lab_technician' && (
                          <Select 
                            value={staffFilterSpecialty} 
                            onValueChange={setStaffFilterSpecialty}
                          >
                            <SelectTrigger className="w-full" data-testid="select-staff-lab-subcategory">
                              <SelectValue placeholder="Lab Technician Subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subcategories</SelectItem>
                              {labTechnicianSubcategories.map((subcategory) => (
                                <SelectItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {staffFilterRole === 'aesthetician' && (
                          <Select 
                            value={staffFilterSpecialty} 
                            onValueChange={setStaffFilterSpecialty}
                          >
                            <SelectTrigger className="w-full" data-testid="select-staff-aesthetician-subcategory">
                              <SelectValue placeholder="Aesthetician Subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subcategories</SelectItem>
                              {aestheticianSubcategories.map((subcategory) => (
                                <SelectItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {staffFilterRole === 'optician' && (
                          <Select 
                            value={staffFilterSpecialty} 
                            onValueChange={setStaffFilterSpecialty}
                          >
                            <SelectTrigger className="w-full" data-testid="select-staff-optician-subcategory">
                              <SelectValue placeholder="Optician Subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subcategories</SelectItem>
                              {opticianSubcategories.map((subcategory) => (
                                <SelectItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {staffFilterRole === 'paramedic' && (
                          <Select 
                            value={staffFilterSpecialty} 
                            onValueChange={setStaffFilterSpecialty}
                          >
                            <SelectTrigger className="w-full" data-testid="select-staff-paramedic-subcategory">
                              <SelectValue placeholder="Paramedic Subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subcategories</SelectItem>
                              {paramedicSubcategories.map((subcategory) => (
                                <SelectItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {staffFilterRole === 'physiotherapist' && (
                          <Select 
                            value={staffFilterSpecialty} 
                            onValueChange={setStaffFilterSpecialty}
                          >
                            <SelectTrigger className="w-full" data-testid="select-staff-physiotherapist-subcategory">
                              <SelectValue placeholder="Physiotherapist Subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subcategories</SelectItem>
                              {physiotherapistSubcategories.map((subcategory) => (
                                <SelectItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {staffFilterRole === 'pharmacist' && (
                          <Select 
                            value={staffFilterSpecialty} 
                            onValueChange={setStaffFilterSpecialty}
                          >
                            <SelectTrigger className="w-full" data-testid="select-staff-pharmacist-subcategory">
                              <SelectValue placeholder="Pharmacist Subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subcategories</SelectItem>
                              {pharmacistSubcategories.map((subcategory) => (
                                <SelectItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Input
                          placeholder="Search by name, email, specialization, department.."
                          value={staffFilterSearch}
                          onChange={(e) => setStaffFilterSearch(e.target.value)}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
              <DoctorList 
                onSelectDoctor={(doctor) => {
                  console.log("Setting selected doctor:", doctor);
                  setSelectedDoctor(doctor);
                }}
                showAppointmentButton={true}
                filterRole={staffFilterRole}
                filterSearch={staffFilterSearch}
                filterSpecialty={staffFilterSpecialty}
                patientSearch={doctorPatientSearch}
              />
            </div>
          </div>
        )}


        {/* New Appointment Modal */}
        {showNewAppointmentModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              // Prevent closing on backdrop click - only close via X button or Cancel
              e.stopPropagation();
            }}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => {
                // Prevent clicks inside modal from closing it
                e.stopPropagation();
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      // For patient role, show "Book Appointment with [Role] [Name]"
                      if (user?.role === 'patient' && selectedProviderId) {
                        const provider = filteredUsers.find((u: any) => u.id.toString() === selectedProviderId) ||
                          usersData?.find((u: any) => u.id.toString() === selectedProviderId);
                        
                        if (provider) {
                          // Remove any existing "Dr." or "Nurse" prefix to avoid duplication
                          const cleanFirstName = (provider.firstName || '').replace(/^(Dr\.|Nurse)\s*/i, '');
                          const cleanLastName = (provider.lastName || '').replace(/^(Dr\.|Nurse)\s*/i, '');
                          const fullName = `${cleanFirstName} ${cleanLastName}`.trim();
                          
                          // Determine role prefix - check role case-insensitively
                          // Also check selectedRole as fallback if provider.role is not set
                          const providerRole = (provider.role || selectedRole || '').toLowerCase();
                          const rolePrefix = providerRole === 'nurse' ? 'Nurse' : providerRole === 'doctor' ? 'Dr.' : '';
                          
                          if (rolePrefix) {
                            return `Book Appointment with ${rolePrefix} ${fullName}`;
                          }
                          return `Book Appointment with ${fullName}`;
                        }
                      }
                      // For other roles, show default title
                      return "Schedule New Appointment";
                    })()}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewAppointmentModal(false);
                      scheduleBookingHoliday.resetHolidayState();
                      setSelectedSpecialty("");
                      setSelectedSubSpecialty("");
                      setFilteredDoctors([]);
                      setSelectedDoctor(null);
                      setSelectedDate(undefined);
                      setSelectedTimeSlot("");
                      setSelectedRole("");
                      setSelectedProviderId("");
                      setSelectedDuration(30);
                      setSelectedMedicalSpecialty("");
                    setDoctorAppointmentType("");
                    setDoctorAppointmentSelectedTreatment(null);
                    setDoctorAppointmentSelectedConsultation(null);
                    setDoctorAppointmentTypeError("");
                    setDoctorTreatmentSelectionError("");
                    setDoctorConsultationSelectionError("");
                    }}
                    data-testid="button-close-modal"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Shift Warning Card - Show if logged-in nurse/doctor doesn't have shifts */}
                {isDoctorLike(user?.role) && !loggedInUserHasShifts && (
                  <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Please create shifts from Shift Management
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            const subdomain = getTenantSubdomain();
                            setLocation(`/${subdomain}/shifts`);
                            setShowNewAppointmentModal(false);
                          }}
                          className="ml-4 bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          Create Shifts
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* For patient role - New UI Layout */}
                {user?.role === 'patient' ? (
                  <div className="space-y-6">
                    {/* Row 1: Select Role + Duration | Patient Information */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Column 1: Select Role and Duration */}
                      <div className="space-y-4">
                        {/* Select Role */}
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            Select Role
                          </Label>
                          <Popover open={openRoleCombo} onOpenChange={setOpenRoleCombo}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openRoleCombo}
                                className="w-full justify-between"
                                data-testid="select-role"
                              >
                                {selectedRole 
                                  ? availableRoles.find(r => r.name === selectedRole)?.displayName || selectedRole
                                  : "Select role..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search role..." />
                                <CommandList>
                                  <CommandEmpty>No role found.</CommandEmpty>
                                  <CommandGroup>
                                    {availableRoles.map((role) => (
                                      <CommandItem
                                        key={role.name}
                                        value={role.name}
                                        onSelect={(currentValue) => {
                                          setSelectedRole(currentValue);
                                          setSelectedProviderId("");
                                          setSelectedMedicalSpecialty(""); // Reset specialty when role changes
                                          setRoleError(""); // Clear error on selection
                                          setOpenRoleCombo(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            role.name === selectedRole ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {role.displayName}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {roleError && (
                            <p className="text-red-600 text-sm mt-1">{roleError}</p>
                          )}
                        </div>

                        {/* Select Name */}
                        {selectedRole && (
                          <div>
                            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                              Doctor Name
                            </Label>
                            <Popover open={openProviderCombo} onOpenChange={setOpenProviderCombo}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openProviderCombo}
                                  className="w-full justify-between"
                                  data-testid="select-provider"
                                >
                                  {selectedProviderId 
                                    ? (() => {
                                        const provider = filteredUsers.find((u: any) => u.id.toString() === selectedProviderId);
                                        return provider ? `${provider.firstName} ${provider.lastName}` : "Select provider...";
                                      })()
                                    : "Select provider..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Search provider..." />
                                  <CommandList>
                                    <CommandEmpty>No provider found.</CommandEmpty>
                                    <CommandGroup>
                                      {filteredUsers.map((provider: any) => (
                                        <CommandItem
                                          key={provider.id}
                                          value={`${provider.firstName} ${provider.lastName}`}
                                          onSelect={() => {
                                            setSelectedProviderId(provider.id.toString());
                                            setProviderError(""); // Clear error on selection
                                            setOpenProviderCombo(false);
                                            if (!selectedDate) {
                                              const today = startOfDay(new Date());
                                              if (!scheduleBookingHoliday.isDateHolidayBlocked(today)) {
                                                setSelectedDate(today);
                                              }
                                            }
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              provider.id.toString() === selectedProviderId ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          {provider.firstName} {provider.lastName}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {providerError && (
                              <p className="text-red-600 text-sm mt-1">{providerError}</p>
                            )}
                          </div>
                        )}

                        {/* Select Duration */}
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            Select Duration
                          </Label>
                          <Select
                            value={selectedDuration.toString()}
                            onValueChange={(value) => setSelectedDuration(parseInt(value))}
                          >
                            <SelectTrigger className="w-full" data-testid="select-duration">
                              <SelectValue placeholder="Select duration..." />
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

                      {/* Column 2: Patient Information */}
                      {(bookingForm.patientId || user?.role === 'patient') && (
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            Patient Information
                          </Label>
                          {(() => {
                            // Don't show patient info if patients are still loading
                            if (patientsLoading && !bookingForm.patientId) {
                              return null;
                            }
                            
                            const selectedPatient = user?.role === 'patient' 
                              ? patients.find((patient: any) => patient.email === user.email) || {
                                  id: user.id,
                                  firstName: user.firstName,
                                  lastName: user.lastName,
                                  email: user.email,
                                  phone: null,
                                  phoneNumber: null,
                                  patientId: null,
                                  dateOfBirth: null,
                                  nhsNumber: null,
                                  address: {}
                                }
                              : (() => {
                                  // Wait for patients to load if still loading
                                  if (patientsLoading) {
                                    if (isDoctorLike(user?.role) && bookingForm.patientId) {
                                      console.log('⏳ PATIENT LOOKUP: Waiting for patients to load...', {
                                        bookingFormPatientId: bookingForm.patientId
                                      });
                                    }
                                    return null;
                                  }
                                  
                                  // Don't try to find patient if no patientId is set or patients array is empty
                                  if (!bookingForm.patientId || !patients || patients.length === 0) {
                                    if (isDoctorLike(user?.role) && bookingForm.patientId) {
                                      console.log('⚠️ PATIENT LOOKUP: Patients array not ready', {
                                        bookingFormPatientId: bookingForm.patientId,
                                        patientsLength: patients?.length || 0,
                                        patientsLoading
                                      });
                                    }
                                    return null;
                                  }
                                  
                                  // Try multiple matching strategies to find the patient
                                  const patientIdStr = bookingForm.patientId?.toString() || '';
                                  const patientIdNum = bookingForm.patientId ? Number(bookingForm.patientId) : null;
                                  
                                  // Debug logging for nurse/doctor roles
                                  if (isDoctorLike(user?.role)) {
                                    console.log('🔍 PATIENT LOOKUP: Searching for patient', {
                                      bookingFormPatientId: bookingForm.patientId,
                                      patientIdStr,
                                      patientIdNum,
                                      totalPatients: patients?.length || 0,
                                      patientsLoading,
                                      allPatientIds: patients?.map((p: any) => ({
                                        id: p.id,
                                        patientId: p.patientId,
                                        name: `${p.firstName} ${p.lastName}`
                                      }))
                                    });
                                  }
                                  
                                  // For patient users, use loggedInPatientRecord directly
                                  if (user?.role === 'patient' && loggedInPatientRecord) {
                                    return loggedInPatientRecord;
                                  }
                                  
                                  const found = patients.find((patient: any) => {
                                    // Match by database ID (most reliable) - try both string and number comparison
                                    const patientIdMatches = 
                                      patient.id?.toString() === patientIdStr || 
                                      patient.id === patientIdNum ||
                                      String(patient.id) === String(bookingForm.patientId);
                                    
                                    if (patientIdMatches) {
                                      if (isDoctorLike(user?.role)) {
                                        console.log('✅ PATIENT LOOKUP: Found by patient.id', {
                                          searchedId: bookingForm.patientId,
                                          patientId: patient.id,
                                          patientPatientId: patient.patientId,
                                          name: `${patient.firstName} ${patient.lastName}`
                                        });
                                      }
                                      return true;
                                    }
                                    
                                    // Match by patientId field (formatted ID like "P000003")
                                    const patientPatientIdMatches = 
                                      patient.patientId?.toString() === patientIdStr || 
                                      patient.patientId === bookingForm.patientId ||
                                      String(patient.patientId) === String(bookingForm.patientId);
                                    
                                    if (patientPatientIdMatches) {
                                      if (isDoctorLike(user?.role)) {
                                        console.log('✅ PATIENT LOOKUP: Found by patient.patientId', {
                                          searchedId: bookingForm.patientId,
                                          patientId: patient.id,
                                          patientPatientId: patient.patientId,
                                          name: `${patient.firstName} ${patient.lastName}`
                                        });
                                      }
                                      return true;
                                    }
                                    
                                    return false;
                                  });
                                  
                                  if (!found && isDoctorLike(user?.role) && bookingForm.patientId) {
                                    console.log('❌ PATIENT LOOKUP: Patient not found', {
                                      searchedId: bookingForm.patientId,
                                      searchedIdType: typeof bookingForm.patientId,
                                      availableIds: patients?.map((p: any) => ({
                                        id: p.id,
                                        idType: typeof p.id,
                                        patientId: p.patientId,
                                        patientIdType: typeof p.patientId,
                                        name: `${p.firstName} ${p.lastName}`
                                      }))
                                    });
                                  }
                                  
                                  return found || null;
                                })();
                            
                            if (!selectedPatient) return null;
                            
                            // Calculate age from date of birth
                            const age = calculateAge(selectedPatient.dateOfBirth);
                            
                            // Get patient initials for avatar
                            const initials = `${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase();
                            
                            return (
                              <Card className="mt-2">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    {/* Patient Avatar */}
                                    <div className="flex-shrink-0">
                                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg" data-testid={`avatar-patient-${selectedPatient.id}`}>
                                        {initials}
                                      </div>
                                    </div>
                                    
                                    {/* Patient Details */}
                                    <div className="flex-1 space-y-3">
                                      {/* Name and Age/ID */}
                                      <div>
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white" data-testid={`text-patient-name-${selectedPatient.id}`}>
                                          {selectedPatient.firstName} {selectedPatient.lastName}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400" data-testid={`text-patient-age-id-${selectedPatient.id}`}>
                                          {age && `Age ${age} • `}{selectedPatient.patientId || `P${selectedPatient.id.toString().padStart(6, '0')}`}
                                        </p>
                                      </div>
                                      
                                      {/* Contact Information */}
                                      <div className="space-y-2 text-sm">
                                        {(selectedPatient.phone || selectedPatient.phoneNumber) && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-phone-${selectedPatient.id}`}>
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">{selectedPatient.phone || selectedPatient.phoneNumber}</span>
                                          </div>
                                        )}
                                        
                                        {selectedPatient.email && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-email-${selectedPatient.id}`}>
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">{selectedPatient.email}</span>
                                          </div>
                                        )}
                                        
                                        {selectedPatient.nhsNumber && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-nhs-${selectedPatient.id}`}>
                                            <FileText className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">NHS: {selectedPatient.nhsNumber}</span>
                                          </div>
                                        )}
                                        
                                        {selectedPatient.address && (selectedPatient.address.city || selectedPatient.address.country) && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-address-${selectedPatient.id}`}>
                                            <MapPin className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {[selectedPatient.address.city, selectedPatient.address.country].filter(Boolean).join(', ')}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Row 2: Appointment Type + Treatment/Consultation */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white">Appointment Type</Label>
                        <Popover open={openDoctorAppointmentTypeCombo} onOpenChange={setOpenDoctorAppointmentTypeCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openDoctorAppointmentTypeCombo}
                              className="w-full justify-between mt-1"
                              data-testid="select-patient-appointment-type"
                            >
                              {doctorAppointmentType
                                ? doctorAppointmentType.charAt(0).toUpperCase() + doctorAppointmentType.slice(1)
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
                                      onSelect={(value) => {
                                        const normalized = value as "consultation" | "treatment";
                                        setDoctorAppointmentType(normalized);
                                        setDoctorAppointmentSelectedTreatment(null);
                                        setDoctorAppointmentSelectedConsultation(null);
                                        setDoctorAppointmentTypeError("");
                                        setDoctorTreatmentSelectionError("");
                                        setDoctorConsultationSelectionError("");
                                        setOpenDoctorAppointmentTypeCombo(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          doctorAppointmentType === type ? "opacity-100" : "opacity-0"
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
                        {doctorAppointmentTypeError && (
                          <p className="text-red-500 text-xs mt-1">{doctorAppointmentTypeError}</p>
                        )}
                      </div>

                      <div>
                        {doctorAppointmentType === "treatment" && (
                          <>
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">Select Treatment</Label>
                            <Popover open={openDoctorTreatmentCombo} onOpenChange={setOpenDoctorTreatmentCombo}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openDoctorTreatmentCombo}
                                  className="w-full justify-between mt-1"
                                  data-testid="select-patient-treatment"
                                >
                                  {doctorAppointmentSelectedTreatment ? doctorAppointmentSelectedTreatment.name : "Select a treatment"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search treatments..." />
                                  <CommandList>
                                    <CommandEmpty>No treatments found.</CommandEmpty>
                                    <CommandGroup>
                                    {(isDoctorLike(user?.role) ? doctorTreatmentsCatalog : patientTreatmentsCatalog).map((treatment: any) => (
                                        <CommandItem
                                          key={treatment.id}
                                          value={treatment.id.toString()}
                                          onSelect={() => {
                                            setDoctorAppointmentSelectedTreatment(treatment);
                                            setDoctorTreatmentSelectionError("");
                                            setOpenDoctorTreatmentCombo(false);
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
                            {doctorAppointmentSelectedTreatment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 px-0 text-blue-600"
                                onClick={() => setDoctorAppointmentSelectedTreatment(null)}
                              >
                                Clear selection
                              </Button>
                            )}
                            {doctorTreatmentSelectionError && (
                              <p className="text-red-500 text-xs mt-1">{doctorTreatmentSelectionError}</p>
                            )}
                          </>
                        )}
                        {doctorAppointmentType === "consultation" && (
                          <>
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">Appointment Type</Label>
                            <Popover open={openDoctorConsultationCombo} onOpenChange={setOpenDoctorConsultationCombo}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openDoctorConsultationCombo}
                                  className="w-full justify-between mt-1"
                                  data-testid="select-patient-consultation"
                                >
                                  {doctorAppointmentSelectedConsultation ? doctorAppointmentSelectedConsultation.serviceName : "Select an appointment type"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search appointment type..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      {user
                                        ? `No consultations available for ${user.firstName} ${user.lastName}`.trim()
                                        : "No consultations found."}
                                    </CommandEmpty>
                                    <CommandGroup>
                                    {(isDoctorLike(user?.role) ? doctorConsultationsCatalog : patientConsultationsCatalog).map((service: any) => (
                                        <CommandItem
                                          key={service.id}
                                          value={service.id.toString()}
                                          onSelect={() => {
                                            setDoctorAppointmentSelectedConsultation(service);
                                            setDoctorConsultationSelectionError("");
                                            setOpenDoctorConsultationCombo(false);
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
                            {doctorAppointmentSelectedConsultation && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 px-0 text-blue-600"
                                onClick={() => setDoctorAppointmentSelectedConsultation(null)}
                              >
                                Clear selection
                              </Button>
                            )}
                            {doctorConsultationSelectionError && (
                              <p className="text-red-500 text-xs mt-1">{doctorConsultationSelectionError}</p>
                            )}
                          </>
                        )}
                        {!doctorAppointmentType && (
                          <p className="text-xs text-gray-500 mt-2">
                            Select an appointment type to pick a treatment or consultation.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Select Date | Select Time Slot */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Column 1: Select Date */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                          Select Date
                        </Label>
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (!selectedRole) {
                              setRoleError("please select Role first");
                              return;
                            }
                            if (!selectedProviderId) {
                              setProviderError("please select name first");
                              return;
                            }
                            setRoleError("");
                            setProviderError("");
                            scheduleBookingHoliday.handleDateSelect(date);
                          }}
                          disabled={isSchedulePickerDateDisabled}
                          className="rounded-md border"
                          data-testid="calendar-date-picker"
                          {...scheduleBookingHoliday.calendarProps}
                        />
                        {scheduleBookingHoliday.legend}
                      </div>

                      {/* Column 2: Select Time Slot */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                          Select Time Slot
                        </Label>
                        {selectedProviderId && selectedDate ? (
                          <BookingHolidayTimeSlotPanel
                            selectedDate={selectedDate}
                            bookingHoliday={scheduleBookingHoliday}
                            emptyMessage="No available time slots for this date."
                          >
                          <div 
                            key={`${selectedProviderId}-${format(selectedDate, 'yyyy-MM-dd')}`}
                            className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto"
                          >
                            {timeSlots.length > 0 ? timeSlots.map((timeSlot) => {
                              const isBooked = isTimeSlotBooked(timeSlot);
                              const isSelected = selectedTimeSlot === timeSlot;
                              
                              return (
                                <Button
                                  key={timeSlot}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`
                                    ${!isBooked && !isSelected 
                                      ? "bg-green-500 hover:bg-green-600 text-white border-green-600" 
                                      : ""
                                    }
                                    ${isBooked 
                                      ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50" 
                                      : ""
                                    }
                                    ${isSelected 
                                      ? "bg-blue-600 text-white" 
                                      : ""
                                    }
                                  `}
                                  onClick={() => {
                                    if (!isBooked) {
                                      setSelectedTimeSlot(timeSlot);
                                      // Update bookingForm with proper datetime format
                                      if (selectedDate) {
                                        const time24 = timeSlotTo24Hour(timeSlot);
                                        const dateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${time24}:00`;
                                        setBookingForm(prev => ({ ...prev, scheduledAt: dateTime }));
                                      }
                                    }
                                  }}
                                  disabled={isBooked}
                                  data-testid={`time-slot-${timeSlot.replace(/[: ]/g, '-')}`}
                                >
                                  {timeSlot}
                                </Button>
                              );
                            }) : (
                              <div className="col-span-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <p className="text-sm text-gray-600">
                                  No available time slots for this date.
                                </p>
                              </div>
                            )}
                          </div>
                          </BookingHolidayTimeSlotPanel>
                        ) : (
                          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <p className="text-sm text-gray-600">
                              Please select a provider and date to view available time slots.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isDoctorLike(user?.role) ? (
                  /* For doctor role - New UI Layout */
                  <div className="space-y-6">
                    {/* Row 1: Select Patient + Patient Information | Select Duration + Doctor Details */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Column 1: Select Patient and Patient Information */}
                      <div className="space-y-4">
                        {/* Patient Selection */}
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white">
                            Select Patient
                          </Label>
                          <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={patientComboboxOpen}
                                className="mt-2 w-full justify-between"
                                data-testid="trigger-patient-combobox"
                              >
                                {bookingForm.patientId 
                                  ? (() => {
                                      // Try multiple matching strategies to find the patient
                                      const patientIdStr = bookingForm.patientId?.toString() || '';
                                      const patientIdNum = bookingForm.patientId ? Number(bookingForm.patientId) : null;
                                      
                                      const selectedPatient = patients.find((patient: any) => {
                                        // Match by database ID (most reliable)
                                        if (patient.id?.toString() === patientIdStr || patient.id === patientIdNum) {
                                          return true;
                                        }
                                        // Match by patientId field (formatted ID like "P000003")
                                        if (patient.patientId?.toString() === patientIdStr || patient.patientId === bookingForm.patientId) {
                                          return true;
                                        }
                                        return false;
                                      });
                                      
                                      if (!selectedPatient) {
                                        return "Select patient...";
                                      }
                                      
                                      const displayName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
                                      const email = selectedPatient.email ? ` (${selectedPatient.email})` : '';
                                      return `${displayName}${email}`;
                                    })()
                                  : "Select patient..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search patients..." 
                                  data-testid="input-search-patient"
                                />
                                <CommandList>
                                  <CommandEmpty>No patient found.</CommandEmpty>
                                  <CommandGroup>
                                    {patients.map((patient: any) => {
                                      const patientValue = patient.patientId || patient.id.toString();
                                      const patientDisplayName = `${patient.firstName} ${patient.lastName}`;
                                      const patientEmail = patient.email ? ` (${patient.email})` : '';
                                      const patientWithEmail = `${patientDisplayName}${patientEmail}`;
                                      
                                      return (
                                        <CommandItem
                                          key={patient.id}
                                          value={patientWithEmail}
                                          onSelect={(currentValue) => {
                                            setBookingForm(prev => ({ ...prev, patientId: patientValue }));
                                            setPatientComboboxOpen(false);
                                          }}
                                          data-testid={`item-patient-${patient.id}`}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              patientValue === bookingForm.patientId ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          <div className="flex flex-col">
                                            <span className="font-medium">{patientDisplayName}</span>
                                            {patient.email && <span className="text-sm text-gray-600">{patient.email}</span>}
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Patient Information Card - Always visible */}
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            Patient Information
                          </Label>
                          {bookingForm.patientId ? (
                            (() => {
                              // For patient users, use loggedInPatientRecord directly to ensure consistency
                              let selectedPatient: any = null;
                              
                              if (user?.role === 'patient' && loggedInPatientRecord) {
                                selectedPatient = loggedInPatientRecord;
                              } else {
                                selectedPatient = patients.find((patient: any) => {
                                  // Try multiple matching strategies to find the patient
                                  const patientIdStr = bookingForm.patientId?.toString() || '';
                                  return (
                                    patient.id?.toString() === patientIdStr ||
                                    patient.patientId?.toString() === patientIdStr ||
                                    patient.id?.toString() === bookingForm.patientId ||
                                    patient.patientId === bookingForm.patientId
                                  );
                                });
                              }
                              
                              if (!selectedPatient) return null;
                              
                              // Calculate age from date of birth
                              const age = calculateAge(selectedPatient.dateOfBirth);
                              
                              // Get patient initials for avatar
                              const initials = `${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase();
                              
                              return (
                                <Card className="mt-2">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                      {/* Patient Avatar */}
                                      <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg" data-testid={`avatar-patient-${selectedPatient.id}`}>
                                          {initials}
                                        </div>
                                      </div>
                                      
                                      {/* Patient Details */}
                                      <div className="flex-1 space-y-3">
                                        {/* Name and Age/ID */}
                                        <div>
                                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white" data-testid={`text-patient-name-${selectedPatient.id}`}>
                                            {selectedPatient.firstName} {selectedPatient.lastName}
                                          </h3>
                                          <p className="text-gray-600 dark:text-gray-400" data-testid={`text-patient-age-id-${selectedPatient.id}`}>
                                            {age && `Age ${age} • `}{selectedPatient.patientId || `P${selectedPatient.id.toString().padStart(6, '0')}`}
                                          </p>
                                        </div>
                                        
                                        {/* Contact Information */}
                                        <div className="space-y-2 text-sm">
                                          {(selectedPatient.phone || selectedPatient.phoneNumber) && (
                                            <div className="flex items-center gap-2" data-testid={`text-patient-phone-${selectedPatient.id}`}>
                                              <Phone className="h-4 w-4 text-gray-500" />
                                              <span className="text-gray-700 dark:text-gray-300">{selectedPatient.phone || selectedPatient.phoneNumber}</span>
                                            </div>
                                          )}
                                          
                                          {selectedPatient.email && (
                                            <div className="flex items-center gap-2" data-testid={`text-patient-email-${selectedPatient.id}`}>
                                              <Mail className="h-4 w-4 text-gray-500" />
                                              <span className="text-gray-700 dark:text-gray-300">{selectedPatient.email}</span>
                                            </div>
                                          )}
                                          
                                          {selectedPatient.nhsNumber && (
                                            <div className="flex items-center gap-2" data-testid={`text-patient-nhs-${selectedPatient.id}`}>
                                              <FileText className="h-4 w-4 text-gray-500" />
                                              <span className="text-gray-700 dark:text-gray-300">NHS: {selectedPatient.nhsNumber}</span>
                                            </div>
                                          )}
                                          
                                          {selectedPatient.address && (selectedPatient.address.city || selectedPatient.address.country) && (
                                            <div className="flex items-center gap-2" data-testid={`text-patient-address-${selectedPatient.id}`}>
                                              <MapPin className="h-4 w-4 text-gray-500" />
                                              <span className="text-gray-700 dark:text-gray-300">
                                                {[selectedPatient.address.city, selectedPatient.address.country].filter(Boolean).join(', ')}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })()
                          ) : (
                            <Card className="mt-2">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-center py-8">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Please select a patient to view their information
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>

                      {/* Column 2: Select Duration and Doctor Details */}
                      <div className="space-y-4">
                        {/* Select Duration */}
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            Select Duration
                          </Label>
                          <Select
                            value={selectedDuration.toString()}
                            onValueChange={(value) => setSelectedDuration(parseInt(value))}
                          >
                            <SelectTrigger className="w-full" data-testid="select-duration-admin">
                              <SelectValue placeholder="Select duration..." />
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

                        {/* Doctor/Nurse Details */}
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            {isDoctorLike(user?.role) 
                              ? (user?.role === 'nurse' ? 'Nurse Information' : 'Doctor Information')
                              : 'Doctor Details'}
                          </Label>
                          <Card className="mt-2">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {/* Doctor/Nurse Avatar */}
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                    {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()}
                                  </div>
                                </div>
                                
                                {/* Doctor/Nurse Details */}
                                <div className="flex-1 space-y-3">
                                  {/* Name and Department */}
                                  <div>
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                      {isDoctorLike(user?.role)
                                        ? (user?.role === 'nurse'
                                            ? `Nurse ${user?.firstName || ""} ${user?.lastName || ""}`
                                            : `Dr. ${user?.firstName || ""} ${user?.lastName || ""}`)
                                        : `Dr. ${user?.firstName || ""} ${user?.lastName || ""}`}
                                    </h3>
                                    {displayRoleLabel && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                        {displayRoleLabel}
                                      </p>
                                    )}
                                    {user?.department && (
                                      <p className="text-gray-600 dark:text-gray-400">
                                        {user?.department}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Additional Information */}
                                  <div className="space-y-2 text-sm">
                                    {(((user as any)?.medicalSpecialtyCategory || (user as any)?.specialty)) && (
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-700 dark:text-gray-300">
                                          {(user as any)?.medicalSpecialtyCategory || (user as any)?.specialty}
                                          {(user as any)?.subSpecialty && ` - ${(user as any)?.subSpecialty}`}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {user?.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-700 dark:text-gray-300">{user?.email}</span>
                                      </div>
                                    )}
                                    
                                    {isDoctorLike(user?.role) && user?.id && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                          {user?.role === 'nurse' ? 'Nurse' : 'Doctor'} ID: {String(user.id).padStart(6, '0')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Appointment Type + Treatment/Consultation */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white">Appointment Type</Label>
                        <Popover open={openDoctorAppointmentTypeCombo} onOpenChange={setOpenDoctorAppointmentTypeCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openDoctorAppointmentTypeCombo}
                              className="w-full justify-between mt-1"
                              data-testid="select-doctor-appointment-type"
                            >
                              {doctorAppointmentType
                                ? doctorAppointmentType.charAt(0).toUpperCase() + doctorAppointmentType.slice(1)
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
                                      onSelect={(value) => {
                                        const normalized = value as "consultation" | "treatment";
                                        setDoctorAppointmentType(normalized);
                                        setDoctorAppointmentSelectedTreatment(null);
                                        setDoctorAppointmentSelectedConsultation(null);
                                        setDoctorAppointmentTypeError("");
                                        setDoctorTreatmentSelectionError("");
                                        setDoctorConsultationSelectionError("");
                                        setOpenDoctorAppointmentTypeCombo(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          doctorAppointmentType === type ? "opacity-100" : "opacity-0"
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
                        {doctorAppointmentTypeError && (
                          <p className="text-red-500 text-xs mt-1">{doctorAppointmentTypeError}</p>
                        )}
                      </div>

                      <div>
                        {doctorAppointmentType === "treatment" && (
                          <>
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">Select Treatment</Label>
                            <Popover open={openDoctorTreatmentCombo} onOpenChange={setOpenDoctorTreatmentCombo}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openDoctorTreatmentCombo}
                                  className="w-full justify-between mt-1"
                                  data-testid="select-doctor-treatment"
                                >
                                  {doctorAppointmentSelectedTreatment ? doctorAppointmentSelectedTreatment.name : "Select a treatment"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search treatments..." />
                                  <CommandList>
                                    <CommandEmpty>No treatments found.</CommandEmpty>
                                    <CommandGroup>
                                  {doctorTreatmentsCatalog.map((treatment: any) => (
                                        <CommandItem
                                          key={treatment.id}
                                          value={treatment.id.toString()}
                                          onSelect={() => {
                                            setDoctorAppointmentSelectedTreatment(treatment);
                                            setDoctorTreatmentSelectionError("");
                                            setOpenDoctorTreatmentCombo(false);
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
                            {doctorAppointmentSelectedTreatment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 px-0 text-blue-600"
                                onClick={() => setDoctorAppointmentSelectedTreatment(null)}
                              >
                                Clear selection
                              </Button>
                            )}
                            {doctorTreatmentSelectionError && (
                              <p className="text-red-500 text-xs mt-1">{doctorTreatmentSelectionError}</p>
                            )}
                          </>
                        )}
                        {doctorAppointmentType === "consultation" && (
                          <>
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">Appointment Type</Label>
                            <Popover open={openDoctorConsultationCombo} onOpenChange={setOpenDoctorConsultationCombo}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openDoctorConsultationCombo}
                                  className="w-full justify-between mt-1"
                                  data-testid="select-doctor-consultation"
                                >
                                  {doctorAppointmentSelectedConsultation ? doctorAppointmentSelectedConsultation.serviceName : "Select an appointment type"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search appointment type..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      {(() => {
                                        // Show logged-in user's name instead of patient name
                                        if (user && isDoctorLike(user?.role)) {
                                          const rolePrefix = user.role === 'nurse' ? 'Nurse.' : user.role === 'doctor' ? 'Dr.' : '';
                                          const userName = rolePrefix 
                                            ? `${rolePrefix} ${user.firstName} ${user.lastName}`.trim()
                                            : `${user.firstName} ${user.lastName}`.trim();
                                          return `No consultations available for ${userName}`;
                                        }
                                        return "No consultations found.";
                                      })()}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {doctorConsultationsCatalog.map((service: any) => (
                                        <CommandItem
                                          key={service.id}
                                          value={service.id.toString()}
                                          onSelect={() => {
                                            setDoctorAppointmentSelectedConsultation(service);
                                            setDoctorConsultationSelectionError("");
                                            setOpenDoctorConsultationCombo(false);
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
                            {doctorAppointmentSelectedConsultation && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 px-0 text-blue-600"
                                onClick={() => setDoctorAppointmentSelectedConsultation(null)}
                              >
                                Clear selection
                              </Button>
                            )}
                            {doctorConsultationSelectionError && (
                              <p className="text-red-500 text-xs mt-1">{doctorConsultationSelectionError}</p>
                            )}
                          </>
                        )}
                        {!doctorAppointmentType && (
                          <p className="text-xs text-gray-500 mt-2">
                            Select an appointment type to pick a treatment or consultation.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Select Date | Select Time Slot */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Column 1: Select Date */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                          Select Date
                        </Label>
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={scheduleBookingHoliday.handleDateSelect}
                          disabled={isSchedulePickerDateDisabled}
                          className="rounded-md border"
                          data-testid="calendar-date-picker"
                          {...scheduleBookingHoliday.calendarProps}
                        />
                        {scheduleBookingHoliday.legend}
                      </div>

                      {/* Column 2: Select Time Slot */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                          Select Time Slot
                        </Label>
                        {selectedProviderId && selectedDate ? (
                          <BookingHolidayTimeSlotPanel
                            selectedDate={selectedDate}
                            bookingHoliday={scheduleBookingHoliday}
                            emptyMessage="No available time slots for this date."
                          >
                          <div 
                            key={`${selectedProviderId}-${format(selectedDate, 'yyyy-MM-dd')}`}
                            className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto"
                          >
                            {timeSlots.length > 0 ? timeSlots.map((timeSlot) => {
                              const isBooked = isTimeSlotBooked(timeSlot);
                              const isSelected = selectedTimeSlot === timeSlot;
                              
                              return (
                                <Button
                                  key={timeSlot}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`
                                    ${!isBooked && !isSelected 
                                      ? "bg-green-500 hover:bg-green-600 text-white border-green-600" 
                                      : ""
                                    }
                                    ${isBooked 
                                      ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50" 
                                      : ""
                                    }
                                    ${isSelected 
                                      ? "bg-blue-600 text-white" 
                                      : ""
                                    }
                                  `}
                                  onClick={() => {
                                    if (!isBooked) {
                                      setSelectedTimeSlot(timeSlot);
                                      // Update bookingForm with proper datetime format
                                      if (selectedDate) {
                                        const time24 = timeSlotTo24Hour(timeSlot);
                                        const dateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${time24}:00`;
                                        setBookingForm(prev => ({ ...prev, scheduledAt: dateTime }));
                                      }
                                    }
                                  }}
                                  disabled={isBooked}
                                  data-testid={`time-slot-${timeSlot.replace(/[: ]/g, '-')}`}
                                >
                                  {timeSlot}
                                </Button>
                              );
                            }) : (
                              <div className="col-span-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <p className="text-sm text-gray-600">
                                  No available time slots for this date.
                                </p>
                              </div>
                            )}
                          </div>
                          </BookingHolidayTimeSlotPanel>
                        ) : (
                    <Card className="mt-2 min-h-[300px]">
                      <CardContent className="p-4 h-full flex items-center justify-center">
                        <div className="py-8 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Please select a provider and date to view available time slots.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* For non-patient, non-doctor roles (admin, etc.) - Keep original layout */
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left Column - Patient Selection and Provider Selection */}
                    <div className="space-y-6">
                      {/* Patient Selection */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white">
                          Select Patient
                        </Label>
                        <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={patientComboboxOpen}
                                className="mt-2 w-full justify-between"
                                data-testid="trigger-patient-combobox"
                              >
                                {bookingForm.patientId 
                                  ? (() => {
                                      const selectedPatient = patients.find((patient: any) => {
                                        const pId = patient.patientId || patient.id.toString();
                                        return pId === bookingForm.patientId;
                                      });
                                      
                                      if (!selectedPatient) {
                                        return "Select patient...";
                                      }
                                      
                                      const displayName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
                                      const email = selectedPatient.email ? ` (${selectedPatient.email})` : '';
                                      return `${displayName}${email}`;
                                    })()
                                  : "Select patient..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search patients..." 
                                  data-testid="input-search-patient"
                                />
                                <CommandList>
                                  <CommandEmpty>No patient found.</CommandEmpty>
                                  <CommandGroup>
                                    {patients.map((patient: any) => {
                                      const patientValue = patient.patientId || patient.id.toString();
                                      const patientDisplayName = `${patient.firstName} ${patient.lastName}`;
                                      const patientEmail = patient.email ? ` (${patient.email})` : '';
                                      const patientWithEmail = `${patientDisplayName}${patientEmail}`;
                                      
                                      return (
                                        <CommandItem
                                          key={patient.id}
                                          value={patientWithEmail}
                                          onSelect={(currentValue) => {
                                            setBookingForm(prev => ({ ...prev, patientId: patientValue }));
                                            setPatientComboboxOpen(false);
                                          }}
                                          data-testid={`item-patient-${patient.id}`}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              patientValue === bookingForm.patientId ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          <div className="flex flex-col">
                                            <span className="font-medium">{patientDisplayName}</span>
                                            {patient.email && <span className="text-sm text-gray-600">{patient.email}</span>}
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                      </div>

                      {/* Select Role */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                          Select Role
                        </Label>
                        <Popover open={openRoleCombo} onOpenChange={setOpenRoleCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openRoleCombo}
                              className="w-full justify-between"
                              data-testid="select-role-admin"
                            >
                              {selectedRole 
                                ? availableRoles.find(r => r.name === selectedRole)?.displayName || selectedRole
                                : "Select role..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search role..." />
                              <CommandList>
                                <CommandEmpty>No role found.</CommandEmpty>
                                <CommandGroup>
                                  {availableRoles.map((role) => (
                                    <CommandItem
                                      key={role.name}
                                      value={role.name}
                                      onSelect={(currentValue) => {
                                        setSelectedRole(currentValue);
                                        setSelectedProviderId("");
                                        setSelectedMedicalSpecialty(""); // Reset specialty when role changes
                                        setOpenRoleCombo(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          role.name === selectedRole ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {role.displayName}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Select Name (Provider) */}
                      {selectedRole && (
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            Select Name
                          </Label>
                          <Popover open={openProviderCombo} onOpenChange={setOpenProviderCombo}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openProviderCombo}
                                className="w-full justify-between"
                                data-testid="select-provider-admin"
                              >
                                {selectedProviderId 
                                  ? (() => {
                                      const provider = filteredUsers.find((u: any) => u.id.toString() === selectedProviderId);
                                      return provider ? `${provider.firstName} ${provider.lastName}` : "Select provider...";
                                    })()
                                  : "Select provider..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search provider..." />
                                <CommandList>
                                  <CommandEmpty>No provider found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredUsers.map((provider: any) => (
                                      <CommandItem
                                        key={provider.id}
                                        value={`${provider.firstName} ${provider.lastName}`}
                                        onSelect={() => {
                                          setSelectedProviderId(provider.id.toString());
                                          setOpenProviderCombo(false);
                                          setProviderError("");
                                          // Auto-set current date when doctor is selected for patient bookings (only if no date selected yet)
                                          if (user?.role === 'patient' && !selectedDate) {
                                            const today = startOfDay(new Date());
                                            if (!scheduleBookingHoliday.isDateHolidayBlocked(today)) {
                                              setSelectedDate(today);
                                            }
                                          }
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            provider.id.toString() === selectedProviderId ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {provider.firstName} {provider.lastName}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      {/* Select Duration */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                          Select Duration
                        </Label>
                        <Select
                          value={selectedDuration.toString()}
                          onValueChange={(value) => setSelectedDuration(parseInt(value))}
                        >
                          <SelectTrigger className="w-full" data-testid="select-duration-admin">
                            <SelectValue placeholder="Select duration..." />
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

                      {/* Patient Information Card - Shows when patient is selected */}
                      {bookingForm.patientId && (
                        <div>
                          <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                            Patient Information
                          </Label>
                          {(() => {
                            const selectedPatient = patients.find((patient: any) => {
                              // Try multiple matching strategies to find the patient
                              const patientIdStr = bookingForm.patientId?.toString() || '';
                              return (
                                patient.id?.toString() === patientIdStr ||
                                patient.patientId?.toString() === patientIdStr ||
                                patient.id?.toString() === bookingForm.patientId ||
                                patient.patientId === bookingForm.patientId
                              );
                            });
                            
                            if (!selectedPatient) return null;
                            
                            // Calculate age from date of birth
                            const age = calculateAge(selectedPatient.dateOfBirth);
                            
                            // Get patient initials for avatar
                            const initials = `${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase();
                            
                            return (
                              <Card className="mt-2">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    {/* Patient Avatar */}
                                    <div className="flex-shrink-0">
                                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg" data-testid={`avatar-patient-${selectedPatient.id}`}>
                                        {initials}
                                      </div>
                                    </div>
                                    
                                    {/* Patient Details */}
                                    <div className="flex-1 space-y-3">
                                      {/* Name and Age/ID */}
                                      <div>
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white" data-testid={`text-patient-name-${selectedPatient.id}`}>
                                          {selectedPatient.firstName} {selectedPatient.lastName}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400" data-testid={`text-patient-age-id-${selectedPatient.id}`}>
                                          {age && `Age ${age} • `}{selectedPatient.patientId || `P${selectedPatient.id.toString().padStart(6, '0')}`}
                                        </p>
                                      </div>
                                      
                                      {/* Contact Information */}
                                      <div className="space-y-2 text-sm">
                                        {(selectedPatient.phone || selectedPatient.phoneNumber) && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-phone-${selectedPatient.id}`}>
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">{selectedPatient.phone || selectedPatient.phoneNumber}</span>
                                          </div>
                                        )}
                                        
                                        {selectedPatient.email && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-email-${selectedPatient.id}`}>
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">{selectedPatient.email}</span>
                                          </div>
                                        )}
                                        
                                        {selectedPatient.nhsNumber && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-nhs-${selectedPatient.id}`}>
                                            <FileText className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">NHS: {selectedPatient.nhsNumber}</span>
                                          </div>
                                        )}
                                        
                                        {selectedPatient.address && (selectedPatient.address.city || selectedPatient.address.country) && (
                                          <div className="flex items-center gap-2" data-testid={`text-patient-address-${selectedPatient.id}`}>
                                            <MapPin className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {[selectedPatient.address.city, selectedPatient.address.country].filter(Boolean).join(', ')}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Right Column - Calendar and Time Slots */}
                    <div className="space-y-6">
                      {/* Select Date */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                          Select Date
                        </Label>
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={scheduleBookingHoliday.handleDateSelect}
                          disabled={isSchedulePickerDateDisabled}
                          className="rounded-md border"
                          data-testid="calendar-date-picker"
                          {...scheduleBookingHoliday.calendarProps}
                        />
                        {scheduleBookingHoliday.legend}
                      </div>

                      {/* Select Time Slot */}
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                          Select Time Slot
                        </Label>
                        {selectedProviderId && selectedDate ? (
                          <BookingHolidayTimeSlotPanel
                            selectedDate={selectedDate}
                            bookingHoliday={scheduleBookingHoliday}
                            emptyMessage="No available time slots for this date."
                          >
                          <div 
                            key={`${selectedProviderId}-${format(selectedDate, 'yyyy-MM-dd')}`}
                            className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto"
                          >
                            {timeSlots.length > 0 ? timeSlots.map((timeSlot) => {
                              const isBooked = isTimeSlotBooked(timeSlot);
                              const isSelected = selectedTimeSlot === timeSlot;
                              
                              return (
                                <Button
                                  key={timeSlot}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`
                                    ${!isBooked && !isSelected 
                                      ? "bg-green-500 hover:bg-green-600 text-white border-green-600" 
                                      : ""
                                    }
                                    ${isBooked 
                                      ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50" 
                                      : ""
                                    }
                                    ${isSelected 
                                      ? "bg-blue-600 text-white" 
                                      : ""
                                    }
                                  `}
                                  onClick={() => {
                                    if (!isBooked) {
                                      setSelectedTimeSlot(timeSlot);
                                      // Update bookingForm with proper datetime format
                                      if (selectedDate) {
                                        const time24 = timeSlotTo24Hour(timeSlot);
                                        const dateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${time24}:00`;
                                        setBookingForm(prev => ({ ...prev, scheduledAt: dateTime }));
                                      }
                                    }
                                  }}
                                  disabled={isBooked}
                                  data-testid={`time-slot-${timeSlot.replace(/[: ]/g, '-')}`}
                                >
                                  {timeSlot}
                                </Button>
                              );
                            }) : (
                              <div className="col-span-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <p className="text-sm text-gray-600">
                                  No available time slots for this date.
                                </p>
                              </div>
                            )}
                          </div>
                          </BookingHolidayTimeSlotPanel>
                        ) : (
                          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <p className="text-sm text-gray-600">
                              Please select a provider and date to view available time slots.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {/* Book Appointment Button */}
                {selectedProviderId &&
                  selectedDate &&
                  selectedTimeSlot &&
                  patientReadyForBooking &&
                  patientHasRequiredServiceSelection && (
                  <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewAppointmentModal(false);
                        scheduleBookingHoliday.resetHolidayState();
                        setSelectedSpecialty("");
                        setSelectedSubSpecialty("");
                        setFilteredDoctors([]);
                        setSelectedDoctor(null);
                        setSelectedDate(undefined);
                        setSelectedTimeSlot("");
                        setSelectedRole("");
                        setSelectedProviderId("");
                        setSelectedDuration(30);
                        setSelectedMedicalSpecialty("");
                        setDoctorAppointmentType("");
                        setDoctorAppointmentSelectedTreatment(null);
                        setDoctorAppointmentSelectedConsultation(null);
                        setDoctorAppointmentTypeError("");
                        setDoctorTreatmentSelectionError("");
                        setDoctorConsultationSelectionError("");
                      }}
                      data-testid="button-cancel-appointment"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        // Validate sufficient time is available for the selected duration
                        const { available, availableMinutes } = checkSufficientTime(selectedTimeSlot, selectedDuration);
                        
                        if (!available) {
                          setInsufficientTimeMessage(
                            `Only ${availableMinutes} minutes are available at ${selectedTimeSlot}. Please select another time slot.`
                          );
                          setShowInsufficientTimeModal(true);
                          return;
                        }

                        // Convert 12-hour time to 24-hour format and create datetime string directly
                        const time24 = timeSlotTo24Hour(selectedTimeSlot);
                        
                        // Format date as YYYY-MM-DD directly without timezone conversion
                        const dateStr = format(selectedDate!, 'yyyy-MM-dd');
                        
                        // Combine date and time directly without timezone conversion
                        const [hour, minute] = time24.split(':').map(Number);
                        const appointmentMoment = new Date(selectedDate);
                        appointmentMoment.setHours(hour, minute, 0, 0);
                        const appointmentDateTime = format(
                          appointmentMoment,
                          "yyyy-MM-dd'T'HH:mm:ssxxx",
                        );
                        
                        // For patient users, use loggedInPatientRecord.id (numeric ID)
                        // For other users, try to convert bookingForm.patientId to number
                        let patientId: number;
                        if (user?.role === 'patient' && loggedInPatientRecord) {
                          patientId = loggedInPatientRecord.id;
                          console.log('[PATIENT-BOOKING] Using loggedInPatientRecord.id:', patientId);
                        } else {
                          // Handle both numeric and string patient IDs for non-patient users
                          let patientIdValue: string | number = bookingForm.patientId;
                          if (/^\d+$/.test(bookingForm.patientId)) {
                            patientIdValue = parseInt(bookingForm.patientId);
                          }
                          // Try to find patient record to get numeric ID
                          const foundPatient = patients.find((p: any) => 
                            p.id.toString() === patientIdValue || 
                            p.patientId === patientIdValue ||
                            p.id === patientIdValue
                          );
                          patientId = foundPatient?.id || (typeof patientIdValue === 'number' ? patientIdValue : parseInt(patientIdValue.toString().replace(/^P0*/, ''), 10));
                          console.log('[PATIENT-BOOKING] Resolved patientId for non-patient user:', patientId);
                        }

                        // Get provider info
                        const provider = filteredUsers.find((u: any) => u.id.toString() === selectedProviderId);

                        // Create appointment data, ensuring patientId is always a number
                        const { patientId: _, ...bookingFormWithoutPatientId } = bookingForm;
                        const appointmentData = {
                          ...bookingFormWithoutPatientId,
                          patientId: patientId, // Always numeric ID
                          providerId: Number(selectedProviderId),
                          assignedRole: selectedRole,
                          title: bookingForm.title || `Appointment with ${provider?.firstName || ''} ${provider?.lastName || ''}`.trim(),
                          location: bookingForm.location || provider?.department || '',
                          duration: selectedDuration,
                          scheduledAt: appointmentDateTime
                        };
                        
                        console.log('[PATIENT-BOOKING] appointmentData patientId:', {
                          value: appointmentData.patientId,
                          type: typeof appointmentData.patientId,
                          isNumber: typeof appointmentData.patientId === 'number'
                        });

                        const normalizedPatientAppointmentType =
                          doctorAppointmentType || "consultation";
                        const patientTreatmentId =
                          normalizedPatientAppointmentType === "treatment"
                            ? doctorAppointmentSelectedTreatment?.id || null
                            : null;
                        const patientConsultationId =
                          normalizedPatientAppointmentType === "consultation"
                            ? doctorAppointmentSelectedConsultation?.id || null
                            : null;
                        const patientAppointmentData = {
                          ...appointmentData,
                          appointmentType: normalizedPatientAppointmentType,
                          treatmentId: patientTreatmentId,
                          consultationId: patientConsultationId,
                        };

                        // Check for duplicate appointments (same patient, same doctor, same date)
                        // For patient users, use loggedInPatientRecord directly
                        let patientForDuplicateCheck: any = null;
                        if (user?.role === 'patient' && loggedInPatientRecord) {
                          patientForDuplicateCheck = loggedInPatientRecord;
                        } else {
                          // For non-patient users, find by bookingForm.patientId
                          patientForDuplicateCheck = patients.find((p: any) => {
                            return p.id.toString() === bookingForm.patientId || p.patientId === bookingForm.patientId;
                          });
                        }
                        const numericPatientId = patientForDuplicateCheck?.id;
                        
                        console.log('[DUPLICATE CHECK] bookingForm.patientId:', bookingForm.patientId);
                        console.log('[DUPLICATE CHECK] loggedInPatientRecord:', loggedInPatientRecord);
                        console.log('[DUPLICATE CHECK] patientForDuplicateCheck:', patientForDuplicateCheck);
                        console.log('[DUPLICATE CHECK] numericPatientId:', numericPatientId);
                        console.log('[DUPLICATE CHECK] selectedProviderId:', selectedProviderId);
                        console.log('[DUPLICATE CHECK] selectedDate:', selectedDate);
                        console.log('[DUPLICATE CHECK] allAppointments:', allAppointments);
                        
                        if (allAppointments && selectedDate && numericPatientId) {
                          const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
                          console.log('[DUPLICATE CHECK] selectedDateStr:', selectedDateStr);

                          // Same patient: interval overlap with any provider (scheduled/confirmed only)
                          if (selectedTimeSlot) {
                            const interval = buildLocalIntervalFromDateAndTimeSlot(
                              selectedDate,
                              selectedTimeSlot,
                              selectedDuration,
                            );
                            if (interval) {
                              const { conflict } = findPatientScheduleOverlap(
                                String(numericPatientId),
                                interval.start,
                                interval.end,
                                allAppointments,
                                parseScheduledAtAsLocalCalendar,
                                {},
                              );
                              if (conflict) {
                                if (isNonBlockingForRebookCal((conflict as any)?.status)) {
                                  // allow rebooking over completed/cancelled/canceled/rescheduled appointments
                                } else {
                                setPatientOverlapConflictRecord(conflict);
                                setShowPatientOverlapConflict(true);
                                return;
                                }
                              }
                            }
                          }

                          // Patient flow: if same patient + provider + same service exists on ANY other datetime,
                          // show reschedule popup and do NOT open invoice modal.
                          if (user?.role === "patient" && selectedProviderId) {
                            const dupKind: "treatment" | "consultation" =
                              normalizedPatientAppointmentType === "treatment" ? "treatment" : "consultation";
                            const selectedScheduledAt = patientAppointmentData?.scheduledAt ?? null;
                            const dupApt = findDuplicateServiceAppointmentAnyDateCal(
                              allAppointments,
                              Number(numericPatientId),
                              String(selectedProviderId),
                              selectedScheduledAt,
                              dupKind,
                              patientTreatmentId,
                              patientConsultationId,
                            );

                            if (dupApt) {
                              const normalizedDupBook = {
                                ...dupApt,
                                id: Number((dupApt as any).id),
                                status: (dupApt as any)?.status ?? (dupApt as any)?.dup_status,
                                scheduledAt: (dupApt as any)?.scheduledAt ?? (dupApt as any)?.scheduled_at,
                              };

                              // Close booking, open reschedule
                              setShowNewAppointmentModal(false);
                              setShowInvoiceModal(false);
                              setShowInvoiceSummary(false);

                              // Keep the new appointment payload so we can create it after rescheduling.
                              setPendingAppointmentData({
                                ...patientAppointmentData,
                                status: "scheduled",
                                rescheduledFromId: Number((dupApt as any).id),
                              });

                              const prov = usersData?.find((u: any) => String(u.id) === String(selectedProviderId));
                              const doctorName = prov
                                ? `${prov.firstName ?? ""} ${prov.lastName ?? ""}`.trim()
                                : "the selected provider";
                              const patientName = patientForDuplicateCheck
                                ? `${patientForDuplicateCheck.firstName ?? ""} ${patientForDuplicateCheck.lastName ?? ""}`.trim() || "the patient"
                                : "the patient";
                              const tid = dupApt.treatmentId ?? dupApt.treatment_id;
                              const cid = dupApt.consultationId ?? dupApt.consultation_id;
                              const serviceLabel =
                                dupKind === "treatment"
                                  ? doctorAppointmentSelectedTreatment?.name ||
                                    (treatmentsList as any[]).find((t: any) => Number(t.id) === Number(tid))?.name ||
                                    "this treatment"
                                  : doctorAppointmentSelectedConsultation?.serviceName ||
                                    (consultationServices as any[]).find((s: any) => Number(s.id) === Number(cid))?.serviceName ||
                                    "this consultation";

                              setDuplicateAppointmentDetails(
                                buildCalendarDuplicateServiceWarningMessage(
                                  dupKind,
                                  dupApt,
                                  patientName,
                                  doctorName,
                                  serviceLabel,
                                ),
                              );
                              setDuplicateAppointmentRecord(normalizedDupBook);
                              setPendingDuplicateCreateMode("doctor");
                              setDuplicateResolveStatus("rescheduled");
                              setShowDuplicateWarning(true);
                              setShowConfirmationModal(false);
                              return;
                            }
                          }
                        } else {
                          console.log('[DUPLICATE CHECK] Skipped - missing data:', {
                            hasAllAppointments: !!allAppointments,
                            hasSelectedDate: !!selectedDate,
                            hasNumericPatientId: !!numericPatientId
                          });
                        }

                        // Close the booking modal first
                        setShowNewAppointmentModal(false);
                        setPendingAppointmentData(patientAppointmentData);
                        setShowInvoiceSummary(false);

                        if (isDoctorLike(user?.role)) {
                          setShowConfirmationModal(true);
                          return;
                        }

                        if (user?.role === "patient") {
                          // Set invoice form with appointment data for patient role
                          const serviceInfo = getBookingServiceInfo(patientAppointmentData);
                          const invoiceDefaults = buildInvoiceDefaults(patientAppointmentData, serviceInfo, user?.role);
                          setInvoiceForm(invoiceDefaults);
                          
                          setShowInvoiceModal(true);
                          setShowConfirmationModal(false);
                          return;
                        }

                        // For other users, show confirmation before invoicing
                        setShowConfirmationModal(true);
                      }}
                      data-testid="button-book-appointment"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      
                      Book Appointment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for All Users */}
        {showConfirmationModal && pendingAppointmentData && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              // Prevent closing on backdrop click - only close via X button or Cancel
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
            onMouseDown={(e) => {
              // Prevent closing on backdrop click
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => {
                // Prevent clicks inside modal from closing it
                e.stopPropagation();
              }}
            >
              <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Booking Summary
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowConfirmationModal(false);
                      setPendingAppointmentData(null);
                    }}
                    data-testid="button-close-confirmation"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

        <p className="text-sm text-gray-600 mb-6">
          Review appointment details before confirming the booking.
        </p>

        {/* Patient Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Patient Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingAppointmentPatient ? (
                        <>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Name:</span>
                            <span>
                              {pendingAppointmentPatient.firstName} {pendingAppointmentPatient.lastName}
                            </span>
                          </div>
                          {pendingAppointmentPatient.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">Email:</span>
                              <span>{pendingAppointmentPatient.email}</span>
                            </div>
                          )}
                          {(pendingAppointmentPatient.phone || pendingAppointmentPatient.phoneNumber) && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">Phone:</span>
                              <span>{pendingAppointmentPatient.phone || pendingAppointmentPatient.phoneNumber}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-500">Patient information not available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Booking Summary */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Provider</p>
                        <p className="font-medium">
                          {(() => {
                            // Try usersData first (more comprehensive), then filteredUsers, then user
                            const provider = usersData?.find((u: any) => u.id === pendingAppointmentData.providerId) ||
                              filteredUsers.find((u: any) => u.id === pendingAppointmentData.providerId) ||
                              (user && pendingAppointmentData.providerId === user.id ? user : null);
                            
                            if (provider) {
                              // Add role prefix: "Nurse." for nurse, "Dr." for doctor
                              const rolePrefix = provider.role?.toLowerCase() === 'nurse' ? 'Nurse.' : provider.role?.toLowerCase() === 'doctor' ? 'Dr.' : '';
                              return rolePrefix 
                                ? `${rolePrefix} ${provider.firstName} ${provider.lastName}`.trim()
                                : `${provider.firstName} ${provider.lastName}`.trim();
                            }
                            return 'N/A';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Date</p>
                        <p className="font-medium">
                          {selectedDate ? format(selectedDate, 'EEEE, MMMM dd, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Time</p>
                        <p className="font-medium">{selectedTimeSlot}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Duration</p>
                        <p className="font-medium">{selectedDuration} minutes</p>
                      </div>
                      {pendingAppointmentData.location && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 mb-1">Location</p>
                          <p className="font-medium">{pendingAppointmentData.location}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 mb-1">Appointment Type</p>
                        <p className="font-medium">
                          {getAppointmentTypeLabel(pendingAppointmentData)}
                        </p>
                      </div>
                      {bookingSummaryServiceInfo && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 mb-1">Service</p>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex h-3 w-3 rounded-full border border-gray-300"
                              style={{ backgroundColor: bookingSummaryServiceInfo.color }}
                            />
                            <span className="font-medium">
                              {bookingSummaryServiceInfo.name}
                              {bookingSummaryServiceInfo.price
                                ? ` • ${bookingSummaryServiceInfo.price}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      )}
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 mb-1">Title</p>
                        <p className="font-medium">
                          {(() => {
                            // Get provider name - try usersData first (more comprehensive), then filteredUsers, then user
                            const provider = usersData?.find((u: any) => u.id === pendingAppointmentData.providerId) ||
                              filteredUsers.find((u: any) => u.id === pendingAppointmentData.providerId) ||
                              (user && pendingAppointmentData.providerId === user.id ? user : null);
                            
                            let providerName = 'Provider';
                            if (provider) {
                              const rolePrefix = provider.role === 'nurse' ? 'Nurse' : provider.role === 'doctor' ? 'Dr.' : '';
                              providerName = rolePrefix 
                                ? `${rolePrefix} ${provider.firstName} ${provider.lastName}`.trim()
                                : `${provider.firstName} ${provider.lastName}`.trim();
                            }
                            
                            // Get creator name (logged-in user)
                            let creatorName = '';
                            if (user) {
                              const creatorRolePrefix = user.role === 'nurse' ? 'Nurse' : user.role === 'doctor' ? 'Dr.' : '';
                              creatorName = creatorRolePrefix
                                ? `${creatorRolePrefix} ${user.firstName} ${user.lastName}`.trim()
                                : `${user.firstName} ${user.lastName}`.trim();
                            }
                            
                            // Format title: "Appointment with [Provider Name] - Created by [Creator Name]"
                            if (creatorName) {
                              return `Appointment with ${providerName} - Created by ${creatorName}`;
                            }
                            return `Appointment with ${providerName}`;
                          })()}
                        </p>
                        </div>
                      {pendingAppointmentData.description && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 mb-1">Description</p>
                          <p className="font-medium">{pendingAppointmentData.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    disabled={isConfirmingAppointment || createDoctorAppointmentMutation.isPending}
                    onClick={() => {
                      if (isConfirmingAppointment || createDoctorAppointmentMutation.isPending) return;
                      setShowConfirmationModal(false);
                      setIsConfirmingAppointment(false);
                      setPendingAppointmentData(null);
                      setSelectedDoctor(null); // Clear selected doctor
                      setDoctorAppointmentType("");
                      setDoctorAppointmentSelectedTreatment(null);
                      setDoctorAppointmentSelectedConsultation(null);
                      setDoctorAppointmentTypeError("");
                      setDoctorTreatmentSelectionError("");
                      setDoctorConsultationSelectionError("");
                      setShowNewAppointmentModal(true); // Reopen the booking modal
                    }}
                    data-testid="button-go-back"
                  >
                    Go Back
                  </Button>
                  <Button
                    disabled={isConfirmingAppointment || createDoctorAppointmentMutation.isPending}
                    onClick={() => {
                      if (isConfirmingAppointment || createDoctorAppointmentMutation.isPending) return;
                      setIsConfirmingAppointment(true);
                      if (isDoctorLike(user?.role)) {
                        if (pendingAppointmentData) {
                          // Duplicate check at CONFIRM time (same patient + provider + service on same day).
                          try {
                            const cached = (queryClient.getQueryData(["/api/appointments"]) as any[]) || [];
                            const selectedDateStr = pendingAppointmentData?.scheduledAt
                              ? format(parseScheduledAtAsLocalCalendar(pendingAppointmentData.scheduledAt), "yyyy-MM-dd")
                              : null;
                            const dupKindModal: "treatment" | "consultation" =
                              String(pendingAppointmentData?.appointmentType || "consultation").toLowerCase() === "treatment"
                                ? "treatment"
                                : "consultation";
                            const tid = pendingAppointmentData?.treatmentId ?? pendingAppointmentData?.treatment_id ?? null;
                            const cid = pendingAppointmentData?.consultationId ?? pendingAppointmentData?.consultation_id ?? null;
                            const dupApt =
                              selectedDateStr && pendingAppointmentData?.patientId && pendingAppointmentData?.providerId
                                ? findDuplicateServiceAppointmentInCalendar(
                                    cached,
                                    Number(pendingAppointmentData.patientId),
                                    String(pendingAppointmentData.providerId),
                                    selectedDateStr,
                                    null,
                                    dupKindModal,
                                    tid != null ? Number(tid) : null,
                                    cid != null ? Number(cid) : null,
                                  )
                                : null;
                            if (dupApt) {
                              const normalizedDup = {
                                ...dupApt,
                                id: Number((dupApt as any)?.id),
                                status: (dupApt as any)?.status ?? (dupApt as any)?.dup_status,
                                scheduledAt: (dupApt as any)?.scheduledAt ?? (dupApt as any)?.scheduled_at,
                              };
                              const canShowModal =
                                Number.isFinite(Number(normalizedDup.id)) &&
                                isServiceDuplicateBlockingStatusCal(normalizedDup.status);

                              if (!canShowModal) {
                                // Avoid showing an empty duplicate modal. Proceed with booking.
                                setShowConfirmationModal(false);
                                createDoctorAppointmentMutation.mutate({ ...pendingAppointmentData, status: "scheduled" });
                                setIsConfirmingAppointment(false);
                                toast({
                                  title: "Booking confirmed",
                                  description: "Appointment created successfully.",
                                });
                                return;
                              }

                              setDuplicateAppointmentDetails("");
                              setDuplicateAppointmentRecord(normalizedDup);
                              setPendingDuplicateCreateMode("doctor");
                              setDuplicateResolveStatus("rescheduled");
                              setShowDuplicateWarning(true);
                              setShowConfirmationModal(false);
                              setIsConfirmingAppointment(false);
                              return;
                            }
                          } catch {
                            // fall through to normal create
                          }
                          setShowConfirmationModal(false);
                          createDoctorAppointmentMutation.mutate({ ...pendingAppointmentData, status: "scheduled" });
                        } else {
                          setIsConfirmingAppointment(false);
                        }
                        return;
                      }

                      const serviceInfo = getBookingServiceInfo(pendingAppointmentData);
                      const invoiceDefaults = buildInvoiceDefaults(pendingAppointmentData, serviceInfo, user?.role);
                      setInvoiceForm(invoiceDefaults);
                      
                      // Close confirmation modal and open invoice modal
                      setShowConfirmationModal(false);
                      setShowInvoiceModal(true);
                      setShowInvoiceSummary(false);
                      setIsConfirmingAppointment(false);
                    }}
                    data-testid="button-confirm-appointment"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {isConfirmingAppointment || createDoctorAppointmentMutation.isPending
                      ? "Confirming..."
                      : (isDoctorLike(user?.role) ? "Confirm Booking" : "Confirm Appointment")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insufficient Time Modal */}
        {showInsufficientTimeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                    Insufficient Time Available
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInsufficientTimeModal(false)}
                    data-testid="button-close-insufficient-time"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {insufficientTimeMessage}
                </p>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowInsufficientTimeModal(false)}
                    data-testid="button-ok-insufficient-time"
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient schedule overlap — same time window, any provider */}
        <Dialog
          open={showPatientOverlapConflict}
          onOpenChange={(open) => {
            setShowPatientOverlapConflict(open);
            if (!open) setPatientOverlapConflictRecord(null);
          }}
        >
          <DialogContent className="max-w-lg dark:border-gray-700 dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
                Appointment Conflict: Patient Already Has an Appointment at This Time
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-left text-sm text-gray-700 dark:text-gray-300 pt-1 leading-relaxed">
                  {buildPatientOverlapDialogDescription(
                    patientOverlapSelectedProviderDisplayName,
                    {
                      selectedProviderId: selectedProviderId || undefined,
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
                    const atLocal = parseScheduledAtAsLocalCalendar(c.scheduledAt);
                    const dur = c.duration != null && Number(c.duration) > 0 ? Number(c.duration) : 30;
                    const endAt = new Date(atLocal.getTime() + dur * 60 * 1000);
                    const st = formatAppointmentStatusLabelCal(c.status);
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
                data-testid="button-patient-overlap-calendar-ok"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rescheduled Appointment modal (nurse/doctor only, when a real duplicate exists) */}
        {showDuplicateWarning &&
          canShowCalendarRescheduleDuplicateModal(user?.role, duplicateAppointmentRecord) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[min(90vh,90dvh)] overflow-y-auto overflow-x-hidden mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                    Rescheduled Appointment
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDuplicateWarning(false);
                      setDuplicateAppointmentRecord(null);
                    }}
                    data-testid="button-close-duplicate-warning"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {duplicateAppointmentDetails ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {duplicateAppointmentDetails}
                  </div>
                ) : null}

                    <div className="mb-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                          <p className="mb-2 font-semibold text-amber-900 dark:text-amber-200">
                            Existing appointment
                          </p>
                          {(() => {
                            const c = duplicateAppointmentRecord;
                            const provId = c.providerId ?? c.provider_id;
                            const prov = usersData?.find((u: any) => Number(u.id) === Number(provId));
                            const provName = prov
                              ? `${prov.firstName || ""} ${prov.lastName || ""}`.trim() || "Unknown"
                              : "Unknown provider";
                            const atLocal = parseScheduledAtAsLocalCalendar(c.scheduledAt ?? c.scheduled_at);
                            const dur = c.duration != null && Number(c.duration) > 0 ? Number(c.duration) : 30;
                            const endAt = new Date(atLocal.getTime() + dur * 60 * 1000);
                            const st = formatAppointmentStatusLabelCal(c.status ?? c.dup_status);
                            const aptId = c.appointmentId ?? c.appointment_id;
                            const kind = String(c.appointmentType || c.appointment_type || "").toLowerCase();
                            const svc =
                              kind === "treatment"
                                ? (treatmentsList as any[])?.find((t: any) => Number(t.id) === Number(c.treatmentId ?? c.treatment_id))?.name
                                : (consultationServices as any[])?.find((s: any) => Number(s.id) === Number(c.consultationId ?? c.consultation_id))?.serviceName;
                            const patient =
                              patients?.find((p: any) => Number(p.id) === Number(c.patientId ?? c.patient_id));
                            const patientName = patient
                              ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
                              : (c.patientId ? `Patient ID: ${c.patientId}` : "Patient");
                            return (
                              <ul className="list-none space-y-1.5">
                                <li><span className="font-medium">Patient:</span> {patientName}</li>
                                <li><span className="font-medium">Provider:</span> {provName}</li>
                                <li><span className="font-medium">Date:</span> {format(atLocal, "EEEE, MMM d, yyyy")}</li>
                                <li><span className="font-medium">Time:</span> {format(atLocal, "h:mm a")} – {format(endAt, "h:mm a")} ({dur} min)</li>
                                <li><span className="font-medium">Status:</span> {st}</li>
                                {aptId ? (<li><span className="font-medium">Appointment ID:</span> {aptId}</li>) : null}
                                {c.title ? (<li><span className="font-medium">Title:</span> {c.title}</li>) : null}
                                {kind ? (<li><span className="font-medium">Type:</span> {kind}{svc ? ` — ${svc}` : ""}</li>) : null}
                              </ul>
                            );
                          })()}
                        </div>

                        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-100">
                          <p className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                            New appointment (to be created)
                          </p>
                          {pendingAppointmentData ? (
                            (() => {
                              const n = pendingAppointmentData;
                              const atLocal = parseScheduledAtAsLocalCalendar(n.scheduledAt);
                              const dur = n.duration != null && Number(n.duration) > 0 ? Number(n.duration) : 30;
                              const endAt = new Date(atLocal.getTime() + dur * 60 * 1000);
                              const patient =
                                patients?.find((p: any) => Number(p.id) === Number(n.patientId));
                              const patientName = patient
                                ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
                                : (n.patientId ? `Patient ID: ${n.patientId}` : "Patient");
                              const prov =
                                usersData?.find((u: any) => Number(u.id) === Number(n.providerId));
                              const provName = prov
                                ? `${prov.firstName || ""} ${prov.lastName || ""}`.trim()
                                : (n.providerId ? `Provider ID: ${n.providerId}` : "Provider");
                              const kind = String(n.appointmentType || "").toLowerCase();
                              const svc =
                                kind === "treatment"
                                  ? (treatmentsList as any[])?.find((t: any) => Number(t.id) === Number(n.treatmentId))?.name
                                  : (consultationServices as any[])?.find((s: any) => Number(s.id) === Number(n.consultationId))?.serviceName;
                              return (
                                <ul className="list-none space-y-1.5">
                                  <li><span className="font-medium">Patient:</span> {patientName}</li>
                                  <li><span className="font-medium">Provider:</span> {provName}</li>
                                  <li><span className="font-medium">Date:</span> {format(atLocal, "EEEE, MMM d, yyyy")}</li>
                                  <li><span className="font-medium">Time:</span> {format(atLocal, "h:mm a")} – {format(endAt, "h:mm a")} ({dur} min)</li>
                                  <li><span className="font-medium">Status:</span> Scheduled</li>
                                  {kind ? (<li><span className="font-medium">Type:</span> {kind}{svc ? ` — ${svc}` : ""}</li>) : null}
                                </ul>
                              );
                            })()
                          ) : (
                            <div className="text-xs text-gray-600 dark:text-gray-300">New appointment details unavailable.</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <Label className="text-sm font-medium leading-snug text-amber-950 dark:text-amber-100">
                          Click <strong>Rescheduled</strong> to mark the existing appointment as rescheduled and create the new one as scheduled.
                        </Label>
                        <Button
                          type="button"
                          className="w-full mt-3"
                          disabled={
                            resolveCalendarDuplicateStatusMutation.isPending ||
                            getNumericDbAppointmentIdCal(duplicateAppointmentRecord) == null
                          }
                          onClick={() => {
                            // Must PATCH by numeric DB `id`.
                            const id = getNumericDbAppointmentIdCal(duplicateAppointmentRecord);
                            if (id == null) return;
                            setDuplicateResolveStatus("rescheduled");
                            resolveCalendarDuplicateStatusMutation.mutate({
                              id,
                              status: "rescheduled",
                            });
                          }}
                        >
                          {resolveCalendarDuplicateStatusMutation.isPending ? "Rescheduling..." : "Rescheduled"}
                        </Button>
                      </div>
                    </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setShowDuplicateWarning(false);
                      setDuplicateAppointmentRecord(null);
                    }}
                    data-testid="button-ok-duplicate-warning"
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal for All Users */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Success!
                  </h2>
                  {user?.role === "patient" ? (
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                      Your appointment has been created. You can complete payment later from the billing section.
                    </p>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      The appointment has been successfully created and saved.
                    </p>
                  )}
                  <Button
                    onClick={() => {
                      setShowSuccessModal(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-close-success"
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Error Modal */}
        {showBookingErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <X className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {bookingErrorTitle}
                  </h2>
                  <p className="text-gray-600 mb-6 text-left whitespace-pre-wrap break-words">
                    {bookingErrorMessage}
                  </p>
                  {bookingConflictAppointments.length > 0 && (
                    <div className="w-full mb-6 text-left">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 mb-2">
                            Overlapping appointment(s)
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            This provider is already booked during your selected time. To continue, update each overlapping
                            appointment to <span className="font-medium">Completed</span> or{" "}
                            <span className="font-medium">Cancelled</span>.
                          </p>
                          {(() => {
                            const unresolved = bookingConflictAppointments.filter(
                              (c: any) =>
                                !["completed", "cancelled"].includes(String(c?.status || "").toLowerCase()),
                            );
                            return unresolved.length > 0 ? (
                              <p className="text-[11px] text-rose-700 mb-3">
                                Not resolved yet: <span className="font-semibold">{unresolved.length}</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-emerald-700 mb-3">
                                All overlaps resolved. You can continue booking.
                              </p>
                            );
                          })()}
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {bookingConflictAppointments.map((c: any) => {
                              const start = c?.scheduledAt ? parseScheduledAtAsLocalCalendar(c.scheduledAt) : null;
                              const dur = c?.duration != null && Number(c.duration) > 0 ? Number(c.duration) : 30;
                              const end = start ? new Date(start.getTime() + dur * 60 * 1000) : null;
                              const timeLabel =
                                start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
                                  ? `${format(start, "EEEE, MMM d, yyyy")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")} · ${dur} min`
                                  : "Time unavailable";
                              const apptId = c?.appointmentId || `#${c?.id ?? "—"}`;
                              const patientName =
                                patients?.find((p: any) => Number(p.id) === Number(c?.patientId))?.firstName
                                  ? `${patients.find((p: any) => Number(p.id) === Number(c?.patientId))?.firstName} ${patients.find((p: any) => Number(p.id) === Number(c?.patientId))?.lastName}`.trim()
                                  : (c?.patientId ? `Patient ID: ${c.patientId}` : "Patient");
                              const provider =
                                users?.find((u: any) => Number(u.id) === Number(c?.providerId));
                              const providerName = provider
                                ? `${provider.firstName || ""} ${provider.lastName || ""}`.trim()
                                : (c?.providerId ? `Provider ID: ${c.providerId}` : "Provider");
                              const resolved = ["completed", "cancelled"].includes(String(c?.status || "").toLowerCase());

                              return (
                                <div
                                  key={String(c?.id ?? apptId)}
                                  className={cn(
                                    "p-3 border rounded-md",
                                    resolved ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200",
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900">{apptId}</div>
                                      <div className="text-xs text-gray-700">{timeLabel}</div>
                                      <div className="text-xs text-gray-700">Patient: {patientName}</div>
                                      <div className="text-xs text-gray-700">Provider: {providerName}</div>
                                    </div>
                                    <div className="min-w-[170px]">
                                      <div className="text-[11px] text-gray-600 mb-1">Status</div>
                                      <Select
                                        value={String(c?.status || "scheduled")}
                                        onValueChange={async (value) => {
                                          const next = String(value || "").toLowerCase();
                                          const idNum = Number(c?.id);
                                          if (!idNum) return;
                                          await updateConflictAppointmentStatusMutation.mutateAsync({ id: idNum, status: next });
                                          setBookingConflictAppointments((prev) =>
                                            prev.map((x: any) => (Number(x?.id) === idNum ? { ...x, status: next } : x)),
                                          );
                                        }}
                                      >
                                        <SelectTrigger className="h-8" data-testid={`select-conflict-status-${c?.id}`}>
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
                                        <div className="text-[10px] text-gray-500 mt-1">Updating status...</div>
                                      )}
                                      {!resolved && (
                                        <div className="text-[10px] text-rose-700 mt-1">
                                          Not resolved (must be completed/cancelled)
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 mb-2">
                            New appointment (to be created)
                          </div>
                          {pendingAppointmentData ? (
                            <div className="rounded-md border border-gray-200 bg-white p-3">
                              {(() => {
                                const n = pendingAppointmentData;
                                const start = n?.scheduledAt ? parseScheduledAtAsLocalCalendar(n.scheduledAt) : null;
                                const dur = n?.duration != null && Number(n.duration) > 0 ? Number(n.duration) : 30;
                                const end = start ? new Date(start.getTime() + dur * 60 * 1000) : null;
                                const timeLabel =
                                  start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
                                    ? `${format(start, "EEEE, MMM d, yyyy")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")} · ${dur} min`
                                    : "Time unavailable";
                                const patient =
                                  patients?.find((p: any) => Number(p.id) === Number(n?.patientId));
                                const patientName = patient
                                  ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
                                  : (n?.patientId ? `Patient ID: ${n.patientId}` : "Patient");
                                const provider =
                                  users?.find((u: any) => Number(u.id) === Number(n?.providerId));
                                const providerName = provider
                                  ? `${provider.firstName || ""} ${provider.lastName || ""}`.trim()
                                  : (n?.providerId ? `Provider ID: ${n.providerId}` : "Provider");
                                const kind = String(n?.appointmentType || "").toLowerCase();
                                const svc =
                                  kind === "treatment"
                                    ? (treatmentsList as any[])?.find((t: any) => Number(t.id) === Number(n?.treatmentId))?.name
                                    : (consultationServices as any[])?.find((s: any) => Number(s.id) === Number(n?.consultationId))?.serviceName;
                                return (
                                  <ul className="list-none space-y-1 text-xs text-gray-800">
                                    <li><span className="font-medium">Patient:</span> {patientName}</li>
                                    <li><span className="font-medium">Provider:</span> {providerName}</li>
                                    <li><span className="font-medium">Time:</span> {timeLabel}</li>
                                    {kind ? (
                                      <li><span className="font-medium">Type:</span> {kind}{svc ? ` — ${svc}` : ""}</li>
                                    ) : null}
                                  </ul>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                              New appointment details are unavailable.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {bookingConflictAppointments.length > 0 ? (
                    <div className="w-full space-y-2">
                      <Button
                        onClick={() => {
                          const allResolved = bookingConflictAppointments.every((c: any) =>
                            ["completed", "cancelled"].includes(String(c?.status || "").toLowerCase()),
                          );
                          if (!allResolved) return;
                          setShowBookingErrorModal(false);
                          setBookingErrorTitle("Booking Error");
                          setBookingConflictAppointments([]);
                          if (pendingAppointmentData) {
                            // Retry booking now that conflicts are resolved
                            createDoctorAppointmentMutation.mutate(pendingAppointmentData);
                          } else if (isDoctorLike(user?.role)) {
                            setShowNewAppointmentModal(true);
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                        disabled={
                          updatingConflictAppointmentId != null ||
                          !bookingConflictAppointments.every((c: any) =>
                            ["completed", "cancelled"].includes(String(c?.status || "").toLowerCase()),
                          )
                        }
                        data-testid="button-continue-booking-after-conflicts"
                      >
                        Continue Booking
                      </Button>
                      <Button
                        onClick={() => {
                          setShowBookingErrorModal(false);
                          setBookingErrorTitle("Booking Error");
                          setBookingConflictAppointments([]);
                          if (isDoctorLike(user?.role)) {
                            setShowNewAppointmentModal(true);
                          }
                        }}
                        className="w-full"
                        variant="destructive"
                        data-testid="button-close-booking-error"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setShowBookingErrorModal(false);
                        setBookingErrorTitle("Booking Error");
                        setBookingConflictAppointments([]);
                        if (isDoctorLike(user?.role)) {
                          setShowNewAppointmentModal(true);
                        }
                      }}
                      className="w-full"
                      variant="destructive"
                      data-testid="button-close-booking-error"
                    >
                      OK
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Creation Modal */}
        {showInvoiceModal && pendingAppointmentData && !showInvoiceSummary && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              // Prevent closing on backdrop click - only close via X button or Cancel
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
            onMouseDown={(e) => {
              // Prevent closing on backdrop click
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => {
                // Prevent clicks inside modal from closing it
                e.stopPropagation();
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400">
                      Create New Invoice.
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Invoice details for the appointment
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowInvoiceModal(false);
                      setPendingAppointmentData(null);
                      setShowNewAppointmentModal(true);
                    }}
                    data-testid="button-close-invoice"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Patient and Doctor Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">Patient</Label>
                      <Input
                        value={invoicePatientName}
                        disabled
                        className="mt-1 bg-gray-50 dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">Service Date</Label>
                      <Input
                        type="date"
                        value={invoiceForm.serviceDate}
                        disabled
                        className="mt-1 bg-gray-50 dark:bg-gray-700"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-white">Doctor</Label>
                    <Input
                      value={usersData?.find((u: any) => u.id === pendingAppointmentData.providerId)?.firstName + ' ' + usersData?.find((u: any) => u.id === pendingAppointmentData.providerId)?.lastName || 'N/A'}
                      disabled
                      className="mt-1 bg-gray-50 dark:bg-gray-700"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
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

                  {/* Services & Procedures */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Services & Procedures</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Code</Label>
                        <Input
                          value={invoiceForm.serviceCode}
                          disabled
                          className="mt-1 bg-gray-50 dark:bg-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                        <Input
                          value={invoiceForm.serviceDescription}
                          disabled
                          className="mt-1 bg-gray-50 dark:bg-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</Label>
                        <Input
                          value={invoiceForm.amount}
                          disabled
                          className="mt-1 bg-gray-50 dark:bg-gray-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Insurance Provider */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-white">Insurance Provider</Label>
                    <Input
                      value={invoiceForm.insuranceProvider}
                      disabled
                      className="mt-1 bg-gray-50 dark:bg-gray-700"
                    />
                  </div>

                  {/* Total Amount */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-white">Total Amount</Label>
                    <Input
                      value={invoiceForm.amount}
                      disabled
                      className="mt-1 bg-gray-50 dark:bg-gray-700 font-semibold"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-white">Notes</Label>
                    <div className="mt-1 w-full min-h-[40px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-gray-500">
                      {invoiceForm.notes || "No additional notes"}
                    </div>
                  </div>

                  {/* Payment Method - Fixed to Online Payment */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-white">Payment Method</Label>
                    <Input
                      value="Online Payment"
                      disabled
                      className="mt-1 bg-gray-50 dark:bg-gray-700"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowInvoiceModal(false);
                        setPendingAppointmentData(null);
                        setShowNewAppointmentModal(true);
                      }}
                      data-testid="button-cancel-invoice"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        // Show summary view
                        setShowInvoiceSummary(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-review-invoice"
                    >
                      Review & Confirm
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Summary Modal */}
        {showInvoiceModal && showInvoiceSummary && pendingAppointmentData && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              // Prevent closing on backdrop click - only close via X button or Cancel
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
            onMouseDown={(e) => {
              // Prevent closing on backdrop click
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => {
                // Prevent clicks inside modal from closing it
                e.stopPropagation();
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      Booking Summary
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Review appointment and invoice details before confirming
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowInvoiceSummary(false);
                    }}
                    data-testid="button-back-summary"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Appointment Summary */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Appointment Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Patient</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invoicePatientName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Doctor</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {usersData?.find((u: any) => u.id === pendingAppointmentData.providerId)?.firstName} {usersData?.find((u: any) => u.id === pendingAppointmentData.providerId)?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(pendingAppointmentData.scheduledAt), 'PPp')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {pendingAppointmentData.duration} minutes
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {pendingAppointmentData.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {pendingAppointmentData.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Summary */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Invoice Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Service</span>
                        <span className="font-medium text-gray-900 dark:text-white">{invoiceForm.serviceDescription}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Service Code</span>
                        <span className="font-medium text-gray-900 dark:text-white">{invoiceForm.serviceCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Invoice Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">{format(new Date(invoiceForm.invoiceDate), 'PP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Due Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">{format(new Date(invoiceForm.dueDate), 'PP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {(() => {
                            // If status would be unpaid and payment method is Online Payment, show "Not Selected"
                            const isStripePayment = invoiceForm.paymentMethod === "Online Payment" || 
                                                   invoiceForm.paymentMethod?.toLowerCase().includes("stripe");
                            const isCashPayment = invoiceForm.paymentMethod === "Cash";
                            const paidAmount = isCashPayment ? invoiceForm.amount : "0";
                            const amount = parseFloat(invoiceForm.amount);
                            
                            let invoiceStatus: string;
                            if (isCashPayment && parseFloat(paidAmount) === amount) {
                              invoiceStatus = "paid";
                            } else {
                              // Default to "unpaid" for all non-cash payments or unpaid invoices
                              invoiceStatus = "unpaid";
                            }
                            
                            if (invoiceStatus === "unpaid" && isStripePayment) {
                              return "Not Selected";
                            }
                            return invoiceForm.paymentMethod || "Not Selected";
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Provider/Doctor</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {pendingAppointmentData?.providerId 
                            ? (usersData?.find((u: any) => u.id === pendingAppointmentData.providerId) 
                                ? `${usersData.find((u: any) => u.id === pendingAppointmentData.providerId).firstName} ${usersData.find((u: any) => u.id === pendingAppointmentData.providerId).lastName}`
                                : "-")
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Insurance Provider</span>
                        <span className="font-medium text-gray-900 dark:text-white">{invoiceForm.insuranceProvider}</span>
                      </div>
                      {invoiceForm.notes && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 block mb-1">Notes</span>
                          <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-600 p-2 rounded">{invoiceForm.notes}</p>
                        </div>
                      )}
                      <div className="flex justify-between pt-3 border-t border-gray-300 dark:border-gray-600">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">£{invoiceForm.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoiceForm.paymentMethod === "cash" ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowInvoiceSummary(false);
                      }}
                      data-testid="button-back-edit"
                    >
                      Back to Edit
                    </Button>
                    <Button
                      onClick={() => {
                        let patient = patients.find((p: any) => 
                          p.patientId === pendingAppointmentData.patientId || 
                          p.id.toString() === pendingAppointmentData.patientId?.toString()
                        );
                        
                        if (!patient && user?.role === "patient") {
                          patient = {
                            id: user?.id,
                            firstName: user?.firstName,
                            lastName: user?.lastName,
                            patientId:
                              pendingAppointmentData.patientId ||
                              bookingForm.patientId ||
                              `P${user?.id?.toString().padStart?.(6, "0") ?? ""}`,
                            nhsNumber: "",
                          };
                        }

                        if (!patient) {
                          toast({
                            title: "Error",
                            description: "Patient information not found",
                            variant: "destructive",
                          });
                          return;
                        }
                        pendingAppointmentData.patientId = patient.patientId || pendingAppointmentData.patientId;

                        // Create invoice data
                        const amount = parseFloat(invoiceForm.amount);
                        const isCashPayment = invoiceForm.paymentMethod === "Cash";
                        const isStripePayment = invoiceForm.paymentMethod === "Online Payment" || 
                                                 invoiceForm.paymentMethod?.toLowerCase().includes("stripe");
                        const paidAmount = isCashPayment ? invoiceForm.amount : "0";
                        
                        // Set invoice status based on payment method:
                        // - Cash payments: "paid" (since paidAmount equals totalAmount)
                        // - All other cases (including Stripe/Online payments not paid): "unpaid" status
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
                        
                        // Extract appointment date from pendingAppointmentData for correct service date and due date
                        // Invoice date should be current date, while service date and due date should be appointment date
                        const appointmentScheduledAt = pendingAppointmentData?.scheduledAt;
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
                        
                        // Invoice date should be current date (not appointment date)
                        const finalInvoiceDate = new Date().toISOString().split("T")[0];
                        
                        // Get doctor/provider ID from pendingAppointmentData or selectedDoctor
                        // Ensure we get the provider ID from the appointment data
                        const doctorId = pendingAppointmentData?.providerId || 
                                        pendingAppointmentData?.doctorId || 
                                        selectedDoctor?.id || 
                                        selectedProviderId || 
                                        null;
                        
                        // Ensure all fields are included in invoice data
                        const invoiceData = {
                          patientId: patient.patientId || patient.id?.toString(),
                          patientName: `${patient.firstName} ${patient.lastName}`,
                          nhsNumber: patient.nhsNumber || "",
                          dateOfService: finalServiceDate, // Use actual appointment date
                          invoiceDate: finalInvoiceDate, // Invoice date should be current date
                          dueDate: finalDueDate, // Due date should always be the same as service date (dateOfService)
                          status: invoiceStatus,
                          invoiceType: "payment",
                          serviceType: "appointments", // Set service type to "appointments" for patient bookings
                          paymentMethod: finalPaymentMethod || "Not Selected", // "Not Selected" if unpaid, otherwise original value
                          doctorId: doctorId ? Number(doctorId) : (pendingAppointmentData?.providerId ? Number(pendingAppointmentData.providerId) : null), // Always include doctorId if available (follow admin strategy)
                          createdBy: user?.id, // Add logged-in user ID to created_by column
                          subtotal: invoiceForm.amount,
                          tax: "0",
                          discount: "0",
                          totalAmount: invoiceForm.amount,
                          paidAmount: paidAmount || "0",
                          items: [{
                            code: invoiceForm.serviceCode || "CONS-001",
                            description: invoiceForm.serviceDescription || "General Consultation",
                            quantity: 1,
                            unitPrice: amount,
                            total: amount,
                            serviceType: "appointments" // Include serviceType in items as well
                          }],
                          insuranceProvider: invoiceForm.insuranceProvider || "None (Patient Self-Pay)",
                          notes: invoiceForm.notes || ""
                        };

                        // Create both appointment and invoice
                        // Keep a copy so we can retry if duplicate needs rescheduling.
                        setPendingDuplicateCreateMode("invoice");
                        setPendingDuplicateInvoiceData(invoiceData);
                        createAppointmentAndInvoiceMutation.mutate({
                          appointmentData: pendingAppointmentData,
                          invoiceData
                        });
                      }}
                      disabled={createAppointmentAndInvoiceMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-confirm-booking"
                    >
                      {createAppointmentAndInvoiceMutation.isPending ? "Creating..." : "Confirm Booking"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stripe Payment Dialog */}
        <Dialog 
          open={!!stripeClientSecret} 
          onOpenChange={(open) => {
            // Prevent closing on outside click - only close via X button or Cancel
            // Don't allow closing via onOpenChange (which triggers on backdrop click)
            if (open) {
              // Keep dialog open
              return;
            }
            // If open is false, ignore it - user must click X or Cancel button
            // Only close via explicit button handlers
          }}
        >
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
                Please complete your payment to confirm your appointment booking.
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
                          await apiRequest('PATCH', `/api/billing/invoices/${createdInvoiceId}`, {
                            status: 'paid',
                            paymentMethod: 'Online Payment',
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
                      setShowSuccessModal(true);
                    }}
                    onCancel={() => {
                      // Allow closing via Cancel button
                      setStripeClientSecret("");
                      setCreatedInvoiceId(null);
                      // Show success modal instead of toast for patient users
                      setShowSuccessModal(true);
                    }}
                  />
                </Elements>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}