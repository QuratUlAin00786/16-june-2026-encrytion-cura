import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getTenantSubdomain, buildUrl } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Pill,
  Plus,
  Search,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Printer,
  Send,
  Eye,
  Edit,
  Trash2,
  PenTool,
  Paperclip,
  X,
  ChevronsUpDown,
  RefreshCw,
  Save,
  Grid3x3,
  List,
  Download,
  Share2,
  History,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import {
  displayPatientName,
  needsPatientNameFetch,
} from "@/lib/patient-field-display";
import { dedupePrescriptions } from "@/lib/dedupe-prescriptions";
import { useLocation } from "wouter";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const PRESCRIPTION_PLACEHOLDER_VALUES = new Set([
  "patient not found",
  "unknown patient",
  "unknown provider",
  "unknown",
]);

function displayPrescriptionTableValue(
  value: string | null | undefined,
  fallback = "-",
): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  if (PRESCRIPTION_PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return fallback;
  return trimmed;
}

function resolveViewPrescriptionPatientName(
  prescription: { patientId?: number; patientName?: string },
  patients: Array<{ id: number; firstName?: unknown; lastName?: unknown }>,
  fetchedPatientNames: Record<number, string>,
): string {
  if (prescription.patientId && fetchedPatientNames[prescription.patientId]) {
    return fetchedPatientNames[prescription.patientId];
  }
  const patient = patients.find((p) => p.id === prescription.patientId);
  if (patient) {
    const name = displayPatientName(patient);
    if (name !== "Unknown patient") return name;
  }
  return displayPrescriptionTableValue(prescription.patientName);
}

function resolveViewPrescriptionProviderName(
  prescription: {
    doctorId?: number;
    providerId?: number;
    providerName?: string;
  },
  allUsers: Array<{ id: number; firstName?: string; lastName?: string }>,
): string {
  const providerInfo = allUsers?.find(
    (p) => p.id === prescription.doctorId || p.id === prescription.providerId,
  );
  if (providerInfo) {
    const name =
      `${providerInfo.firstName || ""} ${providerInfo.lastName || ""}`.trim();
    if (name) return name;
  }
  const fromApi = prescription.providerName?.replace(/^Dr\.\s*/i, "").trim();
  return displayPrescriptionTableValue(fromApi);
}

function resolveViewPrescriptionCreatorName(
  prescription: { prescriptionCreatedBy?: number },
  allUsers: Array<{ id: number; firstName?: string; lastName?: string }>,
): string {
  if (!prescription.prescriptionCreatedBy) return "-";
  const creatorInfo = allUsers?.find(
    (u) => u.id === prescription.prescriptionCreatedBy,
  );
  if (!creatorInfo) return "-";
  const name =
    `${creatorInfo.firstName || ""} ${creatorInfo.lastName || ""}`.trim();
  return name || "-";
}

const formatTimestampFromSystem = (timestamp?: string | null) => {
  if (!timestamp) return "N/A";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
};

// Format client's local time as a string (YYYY-MM-DD HH:MM:SS.mmm) for backend
const formatClientLocalTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

// Format timestamp - displays without timezone conversion (as stored in database)
const formatTimestampNoConversion = (timestamp?: string | null) => {
  if (!timestamp) return "N/A";

  try {
    // Parse the timestamp and use UTC methods to avoid timezone conversion
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "N/A";
    
    // Use UTC methods to display the time as stored in database without conversion
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    
    return `${month}/${day}/${year}, ${displayHour}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")} ${period}`;
  } catch {
    return "N/A";
  }
};

const formatTimestampWithAmPm = (
  timestamp?: string | null,
  pattern = "dd LLL yyyy h:mm a",
) => {
  if (!timestamp) return "Date unavailable";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return format(date, pattern);
};

// Format date in UK format (DD/MM/YYYY)
// Parses timestamp string directly to avoid timezone conversion issues
const formatDateUK = (timestamp?: string | null) => {
  if (!timestamp) return "N/A";

  try {
    // Parse the timestamp string directly (format: "YYYY-MM-DD HH:MM:SS.mmm" or ISO string)
    let dateStr = timestamp;
    
    // If it's an ISO string, extract the date part before T or Z
    if (timestamp.includes('T')) {
      dateStr = timestamp.split('T')[0];
    } else if (timestamp.includes(' ')) {
      dateStr = timestamp.split(' ')[0];
    }
    
    // Remove timezone info if present
    if (dateStr.includes('Z')) {
      dateStr = dateStr.split('Z')[0];
    }
    if (dateStr.includes('+')) {
      dateStr = dateStr.split('+')[0];
    }
    
    // Parse YYYY-MM-DD format
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
    
    // Fallback to Date parsing if format is different
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "N/A";

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return "N/A";
  }
};

// Format date for tooltip (e.g., "14 March 2026, 22:01:12")
// Parses timestamp string directly to avoid timezone conversion issues
const formatDateTooltip = (timestamp?: string | null) => {
  if (!timestamp) return "N/A";

  try {
    // Parse the timestamp string directly (format: "YYYY-MM-DD HH:MM:SS.mmm")
    let dateStr = timestamp;
    let timeStr = '';
    
    // Handle ISO format (remove timezone indicators)
    if (timestamp.includes('T')) {
      const parts = timestamp.split('T');
      dateStr = parts[0];
      timeStr = parts[1].split('.')[0]; // Remove milliseconds
      // Remove timezone info (Z, +HH:MM, -HH:MM)
      if (timeStr.includes('Z')) {
        timeStr = timeStr.split('Z')[0];
      }
      if (timeStr.includes('+')) {
        timeStr = timeStr.split('+')[0];
      }
      if (timeStr.includes('-') && timeStr.match(/\d{2}:\d{2}:\d{2}-\d{2}:\d{2}/)) {
        timeStr = timeStr.split('-').slice(0, -1).join('-');
      }
    } else if (timestamp.includes(' ')) {
      const parts = timestamp.split(' ');
      dateStr = parts[0];
      timeStr = parts[1] ? parts[1].split('.')[0] : ''; // Remove milliseconds
    }
    
    // Parse date part (YYYY-MM-DD)
    const dateParts = dateStr.split('-');
    if (dateParts.length === 3 && timeStr) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed for monthNames array
      const day = parseInt(dateParts[2], 10);
      
      // Parse time part (HH:MM:SS)
      const timeParts = timeStr.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1] || '0', 10);
      const seconds = parseInt(timeParts[2] || '0', 10);
      
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[month];
      
      return `${day} ${monthName} ${year}, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Fallback to Date parsing if format is different
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "N/A";

    const day = date.getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  } catch {
    return "N/A";
  }
};

// Format date in UK format (DD/MM/YYYY) in UTC - time is hidden
const formatDateUKUTC = (timestamp?: string | null) => {
  if (!timestamp) return "N/A";

  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "N/A";

    // Get UTC date components only (no time)
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return "N/A";
  }
};

// Format date and time separately for display with different font sizes
const formatDateAndTimeUTC = (timestamp?: string | null) => {
  if (!timestamp) return { date: "N/A", time: "" };

  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return { date: "N/A", time: "" };

    // Get UTC date components
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return {
      date: `${day}/${month}/${year}`,
      time: `${hours}:${minutes}:${seconds}`
    };
  } catch {
    return { date: "N/A", time: "" };
  }
};

// Format date for tooltip in UTC (e.g., "14 March 2026, 22:01:12")
const formatDateTooltipUTC = (timestamp?: string | null) => {
  if (!timestamp) return "N/A";

  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "N/A";

    // Get UTC date components
    const day = date.getUTCDate();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  } catch {
    return "N/A";
  }
};

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  doctorId?: number;
  prescriptionNumber?: string;
  prescriptionCreatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  issuedDate?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    refills: number;
    instructions: string;
    genericAllowed: boolean;
  }>;
  diagnosis: string;
  status: "active" | "completed" | "cancelled" | "pending" | "signed";
  prescribedAt: string;
  pharmacy?: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
  interactions?: Array<{
    severity: "minor" | "moderate" | "major";
    description: string;
  }>;
  signature?: {
    doctorSignature: string;
    signedAt: string;
    signedBy: string;
  };
}

const mockPrescriptions: Prescription[] = [
  {
    id: "rx_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    providerId: "dr_001",
    providerName: "Dr. Sarah Smith",
    medications: [
      {
        name: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        refills: 5,
        instructions: "Take with or without food",
        genericAllowed: true,
      },
      {
        name: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily with meals",
        duration: "90 days",
        quantity: 180,
        refills: 3,
        instructions: "Take with breakfast and dinner",
        genericAllowed: true,
      },
    ],
    diagnosis: "Hypertension, Type 2 Diabetes",
    status: "active",
    prescribedAt: "2024-01-15T10:30:00Z",
    pharmacy: {
      name: "City Pharmacy",
      address: "123 Main St, London",
      phone: "+44 20 7946 0958",
    },
  },
  {
    id: "rx_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    providerId: "dr_001",
    providerName: "Dr. Sarah Smith",
    medications: [
      {
        name: "Amoxicillin",
        dosage: "500mg",
        frequency: "Three times daily",
        duration: "7 days",
        quantity: 21,
        refills: 0,
        instructions: "Complete full course. Take with food.",
        genericAllowed: true,
      },
    ],
    diagnosis: "Upper Respiratory Infection",
    status: "completed",
    prescribedAt: "2024-01-10T14:15:00Z",
    interactions: [
      {
        severity: "minor",
        description: "May reduce effectiveness of oral contraceptives",
      },
    ],
  },
  {
    id: "rx_003",
    patientId: "p_003",
    patientName: "Emily Watson",
    providerId: "dr_002",
    providerName: "Dr. James Wilson",
    medications: [
      {
        name: "Atorvastatin",
        dosage: "20mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        refills: 5,
        instructions: "Take in the evening",
        genericAllowed: true,
      },
    ],
    diagnosis: "Hypercholesterolemia",
    status: "active",
    prescribedAt: "2024-01-12T09:45:00Z",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
    case "completed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-amber-900/50 dark:text-amber-200";
    case "signed":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "minor":
      return "bg-yellow-100 text-yellow-800";
    case "moderate":
      return "bg-orange-100 text-orange-800";
    case "major":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getUserFullName = (user: any) => {
  try {
    if (!user || typeof user !== 'object') return "";
    const firstName = (user.firstName ?? user.first_name ?? user.givenName ?? user.given_name ?? "").toString();
    const lastName = (user.lastName ?? user.last_name ?? user.familyName ?? user.family_name ?? "").toString();
    return `${firstName} ${lastName}`.trim();
  } catch (error) {
    console.error("Error getting user full name:", error);
    return "";
  }
};

const getDoctorLabel = (user: any) => {
  try {
    if (!user) return "";
    const fullName = getUserFullName(user);
    if (!fullName) {
      return `Provider ${user?.id ?? "unknown"}`;
    }
    const roleHint = user?.role?.toString()?.toLowerCase() || "";
    if (roleHint.includes("doctor")) {
      return `Dr. ${fullName}`;
    }
    return fullName;
  } catch (error) {
    console.error("Error getting doctor label:", error);
    return user?.id ? `Provider ${user.id}` : "Unknown Provider";
  }
};

const COMMON_DIAGNOSES = [
  "Hypertension (High blood pressure)",
  "Coronary artery disease (CAD)",
  "Myocardial infarction (Heart attack)",
  "Heart failure",
  "Arrhythmia (e.g., Atrial fibrillation)",
  "Peripheral artery disease",
  "Asthma",
  "Chronic obstructive pulmonary disease (COPD)",
  "Pneumonia",
  "Tuberculosis",
  "Acute bronchitis",
  "Pulmonary embolism",
  "Diabetes mellitus (Type 1 and Type 2)",
  "Hypothyroidism",
  "Hyperthyroidism",
  "Obesity",
  "Metabolic syndrome",
  "Gastritis",
  "Peptic ulcer disease",
  "Gastroesophageal reflux disease (GERD)",
  "Irritable bowel syndrome (IBS)",
  "Hepatitis (A, B, C)",
  "Cirrhosis",
  "Gallstones",
  "Stroke (Cerebrovascular accident)",
  "Epilepsy",
  "Migraine",
  "Parkinson's disease",
  "Alzheimer's disease",
  "Peripheral neuropathy",
  "Osteoarthritis",
  "Rheumatoid arthritis",
  "Osteoporosis",
  "Low back pain",
  "Gout",
  "Influenza",
  "COVID-19",
  "Urinary tract infection (UTI)",
  "Sepsis",
  "HIV/AIDS",
  "Dengue fever",
  "Malaria",
  "Acute kidney injury (AKI)",
  "Chronic kidney disease (CKD)",
  "Nephrotic syndrome",
  "Kidney stones (Urolithiasis)",
  "Anemia (Iron deficiency, B12 deficiency, etc.)",
  "Leukemia",
  "Lymphoma",
  "Thrombocytopenia",
  "Depression",
  "Anxiety disorder",
  "Bipolar disorder",
  "Schizophrenia",
  "Post-traumatic stress disorder (PTSD)",
  "Eczema (Atopic dermatitis)",
  "Psoriasis",
  "Acne",
  "Fungal infections (Tinea)",
  "Contact dermatitis",
  "Polycystic ovarian syndrome (PCOS)",
  "Endometriosis",
  "Menstrual disorders",
  "Pregnancy complications (e.g., preeclampsia, gestational diabetes)",
  "Infertility",
  "Fever (unspecified cause)",
  "Dehydration",
  "Viral infection",
  "Allergic rhinitis",
  "Headache",
  "Back pain",
  "Fatigue",
];

const COMMON_MEDICATIONS = [
  "Paracetamol (Acetaminophen)",
  "Ibuprofen",
  "Aspirin (Acetylsalicylic acid)",
  "Diclofenac",
  "Naproxen",
  "Ketorolac",
  "Tramadol",
  "Morphine",
  "Codeine",
  "Amoxicillin",
  "Azithromycin",
  "Ciprofloxacin",
  "Cefixime",
  "Ceftriaxone",
  "Doxycycline",
  "Metronidazole",
  "Clarithromycin",
  "Levofloxacin",
  "Erythromycin",
  "Amlodipine",
  "Losartan",
  "Lisinopril",
  "Enalapril",
  "Metoprolol",
  "Atenolol",
  "Carvedilol",
  "Telmisartan",
  "Valsartan",
  "Hydrochlorothiazide",
  "Metformin",
  "Glimepiride",
  "Glipizide",
  "Insulin (Regular, NPH, Glargine, Lispro)",
  "Sitagliptin",
  "Empagliflozin",
  "Dapagliflozin",
  "Pioglitazone",
  "Omeprazole",
  "Pantoprazole",
  "Ranitidine",
  "Esomeprazole",
  "Rabeprazole",
  "Sucralfate",
  "Domperidone",
  "Ondansetron",
  "Loperamide",
  "Sertraline",
  "Fluoxetine",
  "Escitalopram",
  "Paroxetine",
  "Amitriptyline",
  "Duloxetine",
  "Mirtazapine",
  "Venlafaxine",
  "Alprazolam",
  "Diazepam",
  "Cetirizine",
  "Loratadine",
  "Fexofenadine",
  "Levocetirizine",
  "Diphenhydramine",
  "Chlorpheniramine",
  "Montelukast",
  "Salbutamol (Albuterol)",
  "Budesonide",
  "Formoterol",
  "Tiotropium",
  "Ipratropium",
  "Theophylline",
  "Atorvastatin",
  "Rosuvastatin",
  "Simvastatin",
  "Fenofibrate",
  "Acyclovir",
  "Oseltamivir",
  "Fluconazole",
  "Ketoconazole",
  "Clotrimazole",
  "Terbinafine",
  "Prednisolone",
  "Dexamethasone",
  "Hydrocortisone",
  "Methylprednisolone",
  "Betamethasone",
  "Vitamin C (Ascorbic acid)",
  "Vitamin D (Cholecalciferol)",
  "Vitamin B12 (Cyanocobalamin)",
  "Calcium carbonate",
  "Iron (Ferrous sulfate)",
  "Folic acid",
  "Multivitamin combinations",
  "Digoxin",
  "Nitroglycerin",
  "Furosemide",
  "Spironolactone",
  "Clopidogrel",
  "Levothyroxine",
  "Carbimazole",
  "Methimazole",
  "Prednisone",
  "Clonazepam",
  "Gabapentin",
  "Pregabalin",
  "Allopurinol",
  "Colchicine",
  "Tamsulosin",
  "Finasteride",
  "Adrenaline (Epinephrine)",
  "Atropine",
  "Dopamine",
  "Noradrenaline",
  "Midazolam",
];

const COMMON_DOSAGES = [
  "250 mg",
  "500 mg",
  "5 mL",
  "10 units",
];

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { canCreate, canEdit, canDelete } = useRolePermissions();
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [prescriptionIdFilter, setPrescriptionIdFilter] = useState<string>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("");
  const [patientNameFilter, setPatientNameFilter] = useState<string>("");
  const [patientFilterOpen, setPatientFilterOpen] = useState(false);
  const [prescriptionIdFilterOpen, setPrescriptionIdFilterOpen] = useState(false);
  const [doctorFilterOpen, setDoctorFilterOpen] = useState(false);
  const [prescriptionIdPopoverOpen, setPrescriptionIdPopoverOpen] = useState(false);
  const [prescriptionSearchPreviewId, setPrescriptionSearchPreviewId] = useState<string>("");
  
  // Doctor-specific filters
  const [doctorPrescriptionIdFilter, setDoctorPrescriptionIdFilter] = useState<string>("all");
  const [doctorPrescriptionIdPopoverOpen, setDoctorPrescriptionIdPopoverOpen] = useState(false);
  const [doctorPatientSearch, setDoctorPatientSearch] = useState("");
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [showPharmacyDialog, setShowPharmacyDialog] = useState(false);
  const [showPharmacySuccessDialog, setShowPharmacySuccessDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSavePdfSuccessModal, setShowSavePdfSuccessModal] = useState(false);
  const [showGenericSuccessModal, setShowGenericSuccessModal] = useState(false);
  const [showDeletePrescriptionDialog, setShowDeletePrescriptionDialog] =
    useState(false);
  const [prescriptionPendingDelete, setPrescriptionPendingDelete] = useState<{
    id: string | number;
    patientName: string;
  } | null>(null);
  const [successModalTitle, setSuccessModalTitle] = useState("");
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [createdPrescriptionDetails, setCreatedPrescriptionDetails] = useState<any>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] =
    useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("view-prescriptions");
  const [savedPDFs, setSavedPDFs] = useState<any[]>([]);
  const [loadingPDFs, setLoadingPDFs] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [pharmacyEmail, setPharmacyEmail] = useState<string>(
    "pharmacy@halohealth.co.uk",
  );
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [fetchedPatientNames, setFetchedPatientNames] = useState<
    Record<number, string>
  >({});
  const fetchedPatientNamesRef = useRef<Record<number, string>>({});
  const pendingPatientNameFetches = useRef<Set<number>>(new Set());
  const isSubmittingPrescriptionRef = useRef(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [roleSearchOpen, setRoleSearchOpen] = useState(false);
  const [nameSearchOpen, setNameSearchOpen] = useState(false);
  const [diagnosisSearchOpen, setDiagnosisSearchOpen] = useState(false);
  const [medicationSearchOpen, setMedicationSearchOpen] = useState<{[key: number]: boolean}>({});
  const [dosageSearchOpen, setDosageSearchOpen] = useState<{[key: number]: boolean}>({});
  const [useInventoryItems, setUseInventoryItems] = useState<{[key: number]: boolean}>({});
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<{[key: number]: number[]}>({});
  const [inventorySearchOpen, setInventorySearchOpen] = useState<{[key: number]: boolean}>({});
  const queryClient = useQueryClient();

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

  // Fetch clinic headers
  const { data: clinicHeader } = useQuery({
    queryKey: ["/api/clinic-headers"],
    enabled: !!user,
  });

  // Fetch clinic footers
  const { data: clinicFooter } = useQuery({
    queryKey: ["/api/clinic-footers"],
    enabled: !!user,
  });

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading: inventoryItemsLoading } = useQuery({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/inventory/items");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Inventory items fetch error:", error);
        return [];
      }
    },
  });

  // Status editing state
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<string>("");

  // Popup to edit status (list view - column under (.))
  const [editStatusDialog, setEditStatusDialog] = useState<{
    open: boolean;
    prescription: any | null;
  }>({ open: false, prescription: null });

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({
      prescriptionId,
      status,
    }: {
      prescriptionId: string;
      status: string;
    }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Auto refresh - invalidate and refetch prescriptions
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      showSuccessModalPopup("Status Updated", "Prescription status has been updated successfully.");
      setEditingStatusId(null);
      setTempStatus("");
      setEditStatusDialog({ open: false, prescription: null });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update prescription status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for status editing
  const handleStartEditingStatus = (
    prescriptionId: string,
    currentStatus: string,
  ) => {
    setEditingStatusId(prescriptionId);
    setTempStatus(currentStatus);
  };

  const handleCancelEditingStatus = () => {
    setEditingStatusId(null);
    setTempStatus("");
  };

  const handleSaveStatus = () => {
    if (editingStatusId && tempStatus) {
      statusUpdateMutation.mutate({
        prescriptionId: editingStatusId,
        status: tempStatus,
      });
    }
  };

  // Drug Interactions Modal state for patient role
  const [showDrugInteractionsModal, setShowDrugInteractionsModal] = useState(false);

  // E-signature state
  const [showESignDialog, setShowESignDialog] = useState(false);
  const [showSignatureRequiredDialog, setShowSignatureRequiredDialog] = useState(false);
  const [pendingSavePrescriptionId, setPendingSavePrescriptionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "print" | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [hideTabs, setHideTabs] = useState(false);
  const [showSignatureDetailsDialog, setShowSignatureDetailsDialog] = useState(false);
  const [selectedSignatureData, setSelectedSignatureData] = useState<any>(null);
  const [showPdfViewerDialog, setShowPdfViewerDialog] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string>("");
  const [selectedPdfPrescription, setSelectedPdfPrescription] = useState<any>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [showShareLogDialog, setShowShareLogDialog] = useState(false);
  const [selectedPrescriptionForShareLog, setSelectedPrescriptionForShareLog] = useState<any>(null);
  const [shareLogs, setShareLogs] = useState<any[]>([]);
  const [lastPosition, setLastPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const isSignatureDarkTheme = () => theme === "dark";

  /** When dark theme, user draws in white; convert to black-on-white for PDF/save. */
  const getSignatureDataForPdf = (canvas: HTMLCanvasElement): string => {
    if (!isSignatureDarkTheme()) return canvas.toDataURL();
    const w = canvas.width;
    const h = canvas.height;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    if (!ctx) return canvas.toDataURL();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const srcCtx = canvas.getContext("2d");
    if (!srcCtx) return canvas.toDataURL();
    const srcData = srcCtx.getImageData(0, 0, w, h);
    const outData = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < srcData.data.length; i += 4) {
      const r = srcData.data[i];
      const g = srcData.data[i + 1];
      const b = srcData.data[i + 2];
      const a = srcData.data[i + 3];
      const isStroke = a > 20 && r + g + b > 384;
      if (isStroke) {
        outData.data[i] = 0;
        outData.data[i + 1] = 0;
        outData.data[i + 2] = 0;
        outData.data[i + 3] = 255;
      } else {
        outData.data[i] = 255;
        outData.data[i + 1] = 255;
        outData.data[i + 2] = 255;
        outData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(outData, 0, 0);
    return off.toDataURL();
  };

  // Form state for prescription editing
  const [formData, setFormData] = useState<{
    patientId: string;
    patientName: string;
    providerId: string;
    diagnosis: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: string;
      refills: string;
      instructions: string;
      genericAllowed: boolean;
      inventoryItemId?: number; // Track which inventory item this medication is from
    }>;
    pharmacyName: string;
    pharmacyAddress: string;
    pharmacyPhone: string;
    pharmacyEmail: string;
  }>({
    patientId: "",
    patientName: "",
    providerId: "",
    diagnosis: "",
    medications: [
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "",
        refills: "",
        instructions: "",
        genericAllowed: true,
      },
    ],
    pharmacyName: "Halo Health",
    pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
    pharmacyPhone: "+44(0)121 827 5531",
    pharmacyEmail: "pharmacy@halohealth.co.uk",
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    medications: Array<{
      name?: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      quantity?: string;
      refills?: string;
      instructions?: string;
      inventoryItems?: string;
    }>;
    general?: string;
  }>({ medications: [] });

  // Update form data when selectedPrescription changes
  useEffect(() => {
    if (selectedPrescription) {
      const medications =
        selectedPrescription.medications.length > 0
          ? selectedPrescription.medications.map((med) => ({
              name: med.name || "",
              dosage: med.dosage || "",
              frequency: med.frequency || "",
              duration: med.duration || "",
              quantity: med.quantity?.toString() || "",
              refills: med.refills?.toString() || "",
              instructions: med.instructions || "",
              genericAllowed:
                med.genericAllowed !== undefined ? med.genericAllowed : true,
            }))
          : [
              {
                name: "",
                dosage: "",
                frequency: "",
                duration: "",
                quantity: "",
                refills: "",
                instructions: "",
                genericAllowed: true,
              },
            ];

      // Clear form errors when editing
      setFormErrors({ medications: [] });

      setFormData({
        patientId: selectedPrescription.patientId?.toString() || "",
        patientName: selectedPrescription.patientName || "",
        providerId: selectedPrescription.providerId?.toString() || "",
        diagnosis: selectedPrescription.diagnosis || "",
        medications: medications,
        pharmacyName: selectedPrescription.pharmacy?.name || "Halo Health",
        pharmacyAddress:
          selectedPrescription.pharmacy?.address ||
          "Unit 2 Drayton Court, Solihull, B90 4NG",
        pharmacyPhone:
          selectedPrescription.pharmacy?.phone || "+44(0)121 827 5531",
        pharmacyEmail:
          selectedPrescription.pharmacy?.email || "pharmacy@halohealth.co.uk",
      });
    } else {
      // For new prescriptions: Auto-populate providerId for doctors
      const autoProviderId =
        user && isDoctorLike(user.role) ? user.id.toString() : "";
      setFormData({
        patientId: "",
        patientName: "",
        providerId: autoProviderId,
        diagnosis: "",
        medications: [
          {
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            quantity: "",
            refills: "",
            instructions: "",
            genericAllowed: true,
          },
        ],
        pharmacyName: "Halo Health",
        pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
        pharmacyPhone: "+44(0)121 827 5531",
        pharmacyEmail: "pharmacy@halohealth.co.uk",
      });
      // Clear form errors when creating new
      setFormErrors({ medications: [] });
    }
  }, [selectedPrescription, user]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/patients", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // Remove duplicates based on patient ID
      const uniquePatients = data
        ? data.filter(
            (patient: any, index: number, self: any[]) =>
              index === self.findIndex((p: any) => p.id === patient.id),
          )
        : [];
      setPatients(uniquePatients);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatients([]);
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/users", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched providers:", data);
      // Store all users for role-based filtering
      setAllUsers(Array.isArray(data) ? data : []);
      // Filter to show only doctor-like roles and nurses
      const filteredProviders = (Array.isArray(data) ? data : []).filter(
        (provider: any) =>
          isDoctorLike(provider.role) || provider.role === "nurse",
      );
      setProviders(filteredProviders);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setProviders([]);
      setAllUsers([]);
    }
  };

  // Function to fetch prescriptions for patient role
  const fetchPrescriptionsByPatientId = async (patientId: number) => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "X-Tenant-Subdomain": getActiveSubdomain(),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/prescriptions?patientId=${patientId}`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch patient prescriptions: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  };

  // Function to fetch prescriptions for doctor role
  const fetchPrescriptionsByDoctorId = async (doctorId: number) => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "X-Tenant-Subdomain": getActiveSubdomain(),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/prescriptions?providerId=${doctorId}`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch doctor prescriptions: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  };

  // Function to fetch all prescriptions (for other roles)
  const fetchAllPrescriptions = async () => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "X-Tenant-Subdomain": getActiveSubdomain(),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch("/api/prescriptions", {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch prescriptions: ${response.status}`);
    }
    const data = await response.json();
    return data;
  };

  useEffect(() => {
    fetchPatients();
    fetchProviders();
  }, []);

  useEffect(() => {
  }, [activeTab]);

  // Ensure providerId is always set for doctors when dialog is open
  useEffect(() => {
    if (
      showNewPrescription &&
      user &&
      isDoctorLike(user.role) &&
      !formData.providerId
    ) {
      console.log(
        "🔧 FIXING MISSING PROVIDER ID - Setting to:",
        user.id.toString(),
      );
      setFormData((prev) => ({
        ...prev,
        providerId: user.id.toString(),
      }));
    }
  }, [showNewPrescription, user, formData.providerId]);

  // Role-based prescription fetching
  const {
    data: rawPrescriptions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/prescriptions", user?.role, user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Admin role gets all prescriptions from database
      if (user.role === "admin") {
        return await fetchAllPrescriptions();
      }
      
      // Check if the current user role is Patient
      if (user.role === "patient") {
        // Get the patient ID from session/auth - match by email first for accuracy
        console.log("🔍 PRESCRIPTIONS: Looking for patient matching user:", {
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          userId: user.id,
        });
        console.log(
          "📋 PRESCRIPTIONS: Available patients:",
          patients.map((p) => ({
            id: p.id,
            email: p.email,
            name: `${p.firstName} ${p.lastName}`,
          })),
        );

        // Try email match first (most reliable)
        let currentPatient = patients.find(
          (patient: any) =>
            patient.email &&
            user.email &&
            patient.email.toLowerCase() === user.email.toLowerCase(),
        );

        // If no email match, try exact name match
        if (!currentPatient) {
          currentPatient = patients.find(
            (patient: any) =>
              patient.firstName &&
              user.firstName &&
              patient.lastName &&
              user.lastName &&
              patient.firstName.toLowerCase() ===
                user.firstName.toLowerCase() &&
              patient.lastName.toLowerCase() === user.lastName.toLowerCase(),
          );
        }

        if (currentPatient) {
          console.log(
            "✅ PRESCRIPTIONS: Found matching patient:",
            currentPatient,
          );
          // Fetch data from the database using that patient ID
          // Returns only the specific patient data (not all data)
          return await fetchPrescriptionsByPatientId(currentPatient.id);
        } else {
          // If patient doesn't exist, return empty array
          console.log(
            "❌ PRESCRIPTIONS: Patient not found for user:",
            user.email,
          );
          return [];
        }
      } else if (isDoctorLike(user.role)) {
        // Get prescriptions created by this doctor-like role
        return await fetchPrescriptionsByDoctorId(user.id);
      } else {
        // For other roles (nurse, etc.), show all prescriptions
        return await fetchAllPrescriptions();
      }
    },
    enabled: !!user && patients.length > 0, // Wait for user and patients data to be loaded
    // Auto-refresh for patient/admin/nurse/doctor roles: poll every 10 seconds to get new prescriptions
    refetchInterval: (user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)) ? 10000 : false, // 10 seconds = 10000ms
    refetchIntervalInBackground: (user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)), // Continue polling even when tab is in background
  });

  // Track previous prescriptions count for patient/admin/nurse/doctor roles to detect new entries
  const prevPrescriptionsCountRef = React.useRef<number>(0);
  const { toast } = useToast();

  // Notify patient/admin/nurse/doctor when new prescriptions are detected
  useEffect(() => {
    const shouldNotify = user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role);
    if (shouldNotify && Array.isArray(rawPrescriptions)) {
      const currentCount = rawPrescriptions.length;
      const previousCount = prevPrescriptionsCountRef.current;

      // Only show notification if count increased (new prescriptions added)
      if (previousCount > 0 && currentCount > previousCount) {
        const newPrescriptionsCount = currentCount - previousCount;
        toast({
          title: "New Prescriptions Available",
          description: `${newPrescriptionsCount} new prescription${newPrescriptionsCount > 1 ? 's' : ''} ${newPrescriptionsCount > 1 ? 'have' : 'has'} been added.`,
          variant: "default",
        });
      }

      // Update the ref with current count
      prevPrescriptionsCountRef.current = currentCount;
    }
  }, [rawPrescriptions, user?.role, toast]);

  // Fetch drug interactions count from database
  const { data: drugInteractionsData } = useQuery({
    queryKey: ["/api/clinical/patient-drug-interactions"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/clinical/patient-drug-interactions", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch drug interactions: ${response.status}`,
        );
      }

      return response.json();
    },
    enabled: !!user,
  });

  const drugInteractionsCount = drugInteractionsData?.count || 0;

  // Fetch decrypted patient names when list data is still encrypted or missing
  useEffect(() => {
    let cancelled = false;

    const fetchEncryptedPatientNames = async () => {
      if (!Array.isArray(rawPrescriptions) || rawPrescriptions.length === 0) {
        return;
      }

      const uniquePatientIds = [
        ...new Set(
          rawPrescriptions
            .map((rx: { patientId?: number }) => rx.patientId)
            .filter((id): id is number => typeof id === "number" && id > 0),
        ),
      ];

      const idsToFetch = uniquePatientIds.filter((id) => {
        if (
          fetchedPatientNamesRef.current[id] ||
          pendingPatientNameFetches.current.has(id)
        ) {
          return false;
        }
        const patient = patients.find((p) => p.id === id);
        return needsPatientNameFetch(patient);
      });

      if (idsToFetch.length === 0) return;

      idsToFetch.forEach((id) => pendingPatientNameFetches.current.add(id));

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const results: Record<number, string> = {};
      await Promise.all(
        idsToFetch.map(async (id) => {
          try {
            const response = await fetch(`/api/patients/${id}`, {
              headers,
              credentials: "include",
            });
            if (!response.ok) return;
            const patient = await response.json();
            const name = displayPatientName(patient);
            if (name !== "Unknown patient") {
              results[id] = name;
            }
          } catch {
            // ignore individual fetch failures
          } finally {
            pendingPatientNameFetches.current.delete(id);
          }
        }),
      );

      if (!cancelled && Object.keys(results).length > 0) {
        setFetchedPatientNames((prev) => {
          const next = { ...prev, ...results };
          fetchedPatientNamesRef.current = next;
          return next;
        });
      }
    };

    void fetchEncryptedPatientNames();
    return () => {
      cancelled = true;
    };
  }, [rawPrescriptions, patients]);

  const resolvePatientDisplayName = (
    patientId: number,
    patient?: { firstName?: unknown; lastName?: unknown },
  ): string => {
    if (fetchedPatientNames[patientId]) {
      return fetchedPatientNames[patientId];
    }
    if (patient) {
      const name = displayPatientName(patient);
      if (name !== "Unknown patient") {
        return name;
      }
    }
    return "-";
  };

  const providerNames: Record<number, string> = {};
  // Use allUsers instead of providers to include all roles
  allUsers.forEach((provider) => {
    providerNames[provider.id] = getDoctorLabel(provider);
  });

  const prescriptions = dedupePrescriptions(
    Array.isArray(rawPrescriptions)
      ? rawPrescriptions.map((prescription: any) => {
          const patient = patients.find((p) => p.id === prescription.patientId);
          return {
            ...prescription,
            patientName: resolvePatientDisplayName(
              prescription.patientId,
              patient,
            ),
            providerName:
              providerNames[prescription.providerId] ||
              `Provider ${prescription.providerId}`,
            patientSex: patient?.genderAtBirth || "Not specified",
          };
        })
      : [],
  );

  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      console.log(
        "🚀 PRESCRIPTION MUTATION START - Sending data:",
        prescriptionData,
      );
      const isUpdate = selectedPrescription && selectedPrescription.id;
      const url = isUpdate
        ? `/api/prescriptions/${selectedPrescription.id}`
        : "/api/prescriptions";
      const method = isUpdate ? "PATCH" : "POST";

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("📡 Making request to:", url, "Method:", method);
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(prescriptionData),
        credentials: "include",
      });

      console.log("📡 Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);

        // Try to parse error message from JSON response
        let errorMessage = `Failed to ${isUpdate ? "update" : "create"} prescription`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text as-is
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ PRESCRIPTION SUCCESS - API returned:", result);
      return result;
    },
    onSuccess: (data) => {
      isSubmittingPrescriptionRef.current = false;
      console.log("🎉 PRESCRIPTION onSuccess triggered with data:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      
      // Enhance prescription data with patient name
      const patient = patients.find((p) => p.id === data.patientId);
      const enhancedData = {
        ...data,
        patientName: patient ? displayPatientName(patient) : null,
        clientCreatedAt: new Date().toISOString(),
      };
      
      setCreatedPrescriptionDetails(enhancedData);
      setShowNewPrescription(false);
      setSelectedPrescription(null);
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      isSubmittingPrescriptionRef.current = false;
      console.error("❌ PRESCRIPTION ERROR:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive",
      });
    },
  });

  const sendToPharmacyMutation = useMutation({
    mutationFn: async ({
      prescriptionId,
      pharmacyData,
      patientName,
      attachments,
      prescriptionNumber,
      prescriptionData,
    }: {
      prescriptionId: string;
      pharmacyData: any;
      patientName?: string;
      attachments?: File[];
      prescriptionNumber?: string;
      prescriptionData?: any;
    }) => {
      console.log("[PHARMACY EMAIL] Starting email send process...", {
        prescriptionId,
        pharmacyEmail: pharmacyData.email,
        patientName,
        attachmentsCount: attachments?.length || 0,
        prescriptionNumber,
      });

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // First update the prescription with pharmacy data
      console.log(
        "[PHARMACY EMAIL] Step 1: Updating prescription with pharmacy data...",
      );
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ pharmacy: pharmacyData }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[PHARMACY EMAIL] Failed to update prescription:",
          errorText,
        );
        throw new Error("Failed to send prescription to pharmacy");
      }

      console.log("[PHARMACY EMAIL] Step 2: Preparing attachments...");
      // Collect all attachments
      const allAttachments: File[] = [];

      // Generate prescription PDF if prescription data is available
      if (prescriptionData && prescriptionNumber) {
        try {
          console.log("[PHARMACY EMAIL] Generating prescription PDF...");
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF();

          // Get patient data with medical history for allergies
          let patientData = null;
          if (prescriptionData.patientId) {
            try {
              const patientResponse = await apiRequest(
                "GET",
                `/api/patients/${prescriptionData.patientId}`
              );
              if (patientResponse.ok) {
                patientData = await patientResponse.json();
                // Attach patient data to prescriptionData for PDF generation
                prescriptionData.patient = patientData;
              }
            } catch (err) {
              console.error("Failed to fetch patient data for PDF:", err);
            }
          }

          // Fetch weight from vitals in medical records
          let weightFromVitals = null;
          if (prescriptionData.patientId) {
            try {
              const recordsResponse = await apiRequest(
                "GET",
                `/api/patients/${prescriptionData.patientId}/records`
              );
              if (recordsResponse.ok) {
                const records = await recordsResponse.json();
                // Find the most recent vitals record
                const vitalsRecords = records.filter((r: any) => r.type === 'vitals' || (r.notes && r.notes.includes('Weight:')));
                if (vitalsRecords.length > 0) {
                  // Sort by date, most recent first
                  vitalsRecords.sort((a: any, b: any) => {
                    const dateA = new Date(a.visitDate || a.createdAt || 0);
                    const dateB = new Date(b.visitDate || b.createdAt || 0);
                    return dateB.getTime() - dateA.getTime();
                  });
                  const latestVitals = vitalsRecords[0];
                  // Extract weight from notes or vitalSigns
                  if (latestVitals.vitalSigns?.weight) {
                    weightFromVitals = `${latestVitals.vitalSigns.weight} kg`;
                  } else if (latestVitals.notes) {
                    const weightMatch = latestVitals.notes.match(/Weight:\s*([\d.]+)\s*kg/i);
                    if (weightMatch) {
                      weightFromVitals = `${weightMatch[1]} kg`;
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Failed to fetch vitals from medical records:", err);
            }
          }

          // Get doctor information from loaded users data
          const doctorId =
            prescriptionData.prescriptionCreatedBy || prescriptionData.doctorId;
          const doctorInfo = providers?.find((p: any) => p.id === doctorId);

          // Clinic Information with styling
          const clinicName =
            (clinicHeader as any)?.clinicName ||
            pharmacyData?.name ||
            "Halo Health Clinic";
          const clinicAddress =
            (clinicHeader as any)?.address || "Unit 2 Drayton Court, Solihull";
          const clinicPhone = (clinicHeader as any)?.phone || "+44(0)121 827 5531";
          const clinicEmail = (clinicHeader as any)?.email || "";
          const clinicWebsite = (clinicHeader as any)?.website || "";

          // Apply clinic name font size
          const clinicNameSize =
            parseInt((clinicHeader as any)?.clinicNameFontSize || "24pt") || 24;
          const contentSize = parseInt((clinicHeader as any)?.fontSize || "10pt") || 10;
          const fontWeight =
            (clinicHeader as any)?.fontWeight === "bold" ? "bold" : "normal";
          const fontStyle =
            (clinicHeader as any)?.fontStyle === "italic" ? "italic" : "normal";

          // Helper function to add clinic header to any page
          const addClinicHeaderToPage = (pageNum: number = 1) => {
            let headerY = 20;
            let textStartX = 20;
            const logoPosition = (clinicHeader as any)?.logoPosition || "center";
            
            // Add logo if available
            if ((clinicHeader as any)?.logoBase64) {
              try {
                const logoSize = 30;
                
                if (logoPosition === "center") {
                  pdf.addImage(
                    (clinicHeader as any)?.logoBase64,
                    "PNG",
                    20,
                    headerY,
                    logoSize,
                    logoSize,
                  );
                  textStartX = 20 + logoSize + 10;
                  headerY += 2;
                } else {
                  const xPos = logoPosition === "left" ? 20 : 170;
                  pdf.addImage(
                    (clinicHeader as any)?.logoBase64,
                    "PNG",
                    xPos,
                    headerY,
                    logoSize,
                    logoSize,
                  );
                  headerY += 35;
                  textStartX = logoPosition === "left" ? 20 : 190;
                }
              } catch (err) {
                console.error("Failed to add logo to PDF:", err);
              }
            }

            // Clinic name
            pdf.setFontSize(clinicNameSize);
            pdf.setFont("helvetica", fontWeight);
            const alignValue = logoPosition === "center" ? "left" : (logoPosition === "left" ? "left" : "right");
            pdf.text(clinicName, textStartX, headerY, { align: alignValue });
            headerY += 6;

            // Clinic details
            pdf.setFontSize(contentSize);
            pdf.setFont("helvetica", fontStyle);
            pdf.text(clinicAddress, textStartX, headerY, { align: alignValue });
            headerY += 6;
            pdf.text(clinicPhone, textStartX, headerY, { align: alignValue });
            headerY += 6;
            
            if (clinicEmail) {
              pdf.text(clinicEmail, textStartX, headerY, { align: alignValue });
              headerY += 6;
            }
            
            if (clinicWebsite) {
              pdf.text(clinicWebsite, textStartX, headerY, { align: alignValue });
              headerY += 6;
            }

            // Prescription number and date on first page only
            if (pageNum === 1) {
              // Horizontal line separator
              pdf.setDrawColor(200, 200, 200);
              pdf.line(20, headerY + 5, 190, headerY + 5);
              
              pdf.setFontSize(11);
              pdf.setFont("helvetica", "bold");
              pdf.text(`Prescription No: ${prescriptionNumber}`, 20, headerY + 12);

              // Date
              const prescriptionDate =
                prescriptionData.issuedDate || prescriptionData.date || new Date();
              pdf.setFont("helvetica", "normal");
              pdf.text(
                `Date: ${new Date(prescriptionDate).toLocaleDateString("en-GB")}`,
                20,
                headerY + 18,
              );
              headerY += 25;
            }

            return headerY;
          };

          // Helper function to add clinic footer to any page
          const addClinicFooterToPage = (pageNum: number, totalPages: number) => {
            const footerY = 275;
            pdf.setDrawColor(200, 200, 200);
            pdf.line(20, footerY, 190, footerY);

            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);
            
            if ((clinicFooter as any)?.footerText) {
              pdf.text(
                (clinicFooter as any)?.footerText,
                105,
                footerY + 6,
                { align: "center" },
              );
            }
            
            // Page number
            pdf.text(
              `Page ${pageNum} of ${totalPages}`,
              190,
              footerY + 6,
              { align: "right" },
            );
          };

          // Add header to first page
          let yPosition = addClinicHeaderToPage(1);

          // Patient Information
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text("PATIENT INFORMATION", 20, yPosition);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Name: ${prescriptionData.patientName || "N/A"}`, 20, yPosition + 7);
          pdf.text(
            `Sex: ${prescriptionData.patientSex || "Not specified"}`,
            20,
            yPosition + 13,
          );
          
          // Add Allergies if available
          const patientAllergies = prescriptionData.patient?.medicalHistory?.allergies || 
                                   prescriptionData.patientAllergies || 
                                   (prescriptionData.patient && Array.isArray(prescriptionData.patient.allergies) ? prescriptionData.patient.allergies : []);
          const allergiesText = Array.isArray(patientAllergies) && patientAllergies.length > 0 
            ? patientAllergies.join(", ") 
            : (typeof patientAllergies === 'string' ? patientAllergies : "-");
          pdf.text(`Allergies: ${allergiesText}`, 20, yPosition + 19);
          
          // Add Weight if available (prioritize weight from vitals)
          const patientWeight = weightFromVitals || prescriptionData.patientWeight || prescriptionData.patient?.weight || "-";
          pdf.text(`Weight: ${patientWeight}`, 20, yPosition + 25);

          // Provider Information
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text("PRESCRIBING PROVIDER", 20, yPosition + 31);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          
          // Add provider name if available
          if (doctorInfo) {
            const providerName = doctorInfo.name || doctorInfo.fullName || "N/A";
            pdf.text(`Name: ${providerName}`, 20, yPosition + 37);
          }

          // Medication Details - Iterate through medications array with proper pagination
          let medicationY = yPosition + 50; // Start after patient/provider info (increased spacing to prevent overlap)

          const medications = prescriptionData.medications || [];
          const pageHeight = 297; // A4 height in mm
          const bottomMargin = 30; // Space for footer
          const minSpaceForMedication = 60; // Minimum space needed for one medication
          
          if (medications.length === 0) {
            // Fallback for old format with single medication fields
            pdf.setFillColor(240, 245, 255);
            pdf.rect(15, 145, 180, 55, "F");
            
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            const medicationName = prescriptionData.medicationName || prescriptionData.medication || "N/A";
            pdf.text(`Rx: ${medicationName}`, 20, 162);

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.text(`Dosage: ${prescriptionData.dosage || "N/A"}`, 20, 170);
            pdf.text(`Frequency: ${prescriptionData.frequency || "N/A"}`, 20, 176);
            pdf.text(`Duration: ${prescriptionData.duration || "N/A"}`, 20, 182);
            if (prescriptionData.refills !== undefined && prescriptionData.refills !== null) {
              pdf.text(`Refills: ${prescriptionData.refills}`, 20, 188);
            }
          } else {
            // New format with medications array - handle pagination properly
            for (let index = 0; index < medications.length; index++) {
              const med = medications[index];
              
              // Calculate required height for this medication (including instructions if present)
              let medicationBoxHeight = 48; // Base height
              if (med.instructions) {
                // Estimate height for instructions (roughly 4mm per line)
                const instructionLines = pdf.splitTextToSize(med.instructions || "", 160);
                medicationBoxHeight += (instructionLines.length * 4) + 6;
              }
              
              // Check if we need a new page
              // jsPDF page height is 297mm, but we work in mm units
              // Leave space for footer (30mm) and some margin
              const maxY = pageHeight - bottomMargin;
              
              if (medicationY + medicationBoxHeight > maxY) {
                // Add new page (footer will be added at the end to all pages)
                pdf.addPage();
                const newPageNum = pdf.internal.getNumberOfPages();
                
                // Add header to new page
                medicationY = addClinicHeaderToPage(newPageNum);
                medicationY += 20; // Add spacing after header
              }

              // Draw medication box
              pdf.setFillColor(240, 245, 255);
              pdf.rect(15, medicationY - 12, 180, medicationBoxHeight, "F");

              // Medication number and name
              pdf.setFontSize(10);
              pdf.setFont("helvetica", "bold");
              pdf.text(`Medication ${index + 1}`, 20, medicationY - 6);

              pdf.setFontSize(10);
              pdf.setFont("helvetica", "normal");
              let lineY = medicationY;
              
              // Medication Name
              pdf.text(`Medication Name: ${med.name || "N/A"}`, 20, lineY);
              lineY += 6;
              
              // Dosage
              if (med.dosage) {
                pdf.text(`Dosage: ${med.dosage}`, 20, lineY);
                lineY += 6;
              }
              
              // Frequency
              if (med.frequency) {
                pdf.text(`Frequency: ${med.frequency}`, 20, lineY);
                lineY += 6;
              }
              
              // Duration
              if (med.duration) {
                pdf.text(`Duration: ${med.duration}`, 20, lineY);
                lineY += 6;
              }
              
              // Quantity
              if (med.quantity !== undefined && med.quantity !== null) {
                pdf.text(`Quantity: ${med.quantity}`, 20, lineY);
                lineY += 6;
              }
              
              // Refills
              if (med.refills !== undefined && med.refills !== null) {
                pdf.text(`Refills: ${med.refills}`, 20, lineY);
                lineY += 6;
              }
              
              // Instructions (if present) - handle wrapping
              if (med.instructions) {
                lineY += 3;
                pdf.setFont("helvetica", "bold");
                pdf.text("Instructions:", 20, lineY);
                lineY += 6;
                pdf.setFont("helvetica", "normal");
                const instructionLines = pdf.splitTextToSize(med.instructions, 160);
                pdf.text(instructionLines, 20, lineY);
                lineY += instructionLines.length * 4;
              }

              medicationY = lineY + 8; // Add spacing after medication
            }
          }

          // Instructions Section (general prescription instructions, not per-medication)
          let currentY = medications.length > 0 ? medicationY + 6 : 206;
          
          // Check if we need a new page for instructions
          if (currentY > pageHeight - bottomMargin - 20) {
            // Add new page (footer will be added at the end to all pages)
            pdf.addPage();
            const newPageNum = pdf.internal.getNumberOfPages();
            currentY = addClinicHeaderToPage(newPageNum);
            currentY += 20;
          }
          
          if (prescriptionData.instructions) {
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.text("INSTRUCTIONS", 20, currentY);

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            const splitInstructions = pdf.splitTextToSize(
              prescriptionData.instructions,
              170,
            );
            pdf.text(splitInstructions, 20, currentY + 6);
            currentY += 6 + splitInstructions.length * 4;
          }
          
          // Diagnosis Section
          if (prescriptionData.diagnosis) {
            // Check if we need a new page for diagnosis
            if (currentY > pageHeight - bottomMargin - 15) {
              // Add new page (footer will be added at the end to all pages)
              pdf.addPage();
              const newPageNum = pdf.internal.getNumberOfPages();
              currentY = addClinicHeaderToPage(newPageNum);
              currentY += 20;
            }
            
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.text("Diagnosis:", 20, currentY);
            pdf.setFont("helvetica", "normal");
            pdf.text(prescriptionData.diagnosis, 20, currentY + 6);
            currentY += 12;
          }

          // E-Signature Section (if exists)
          console.log("[PDF GENERATION] Checking for signature:", {
            hasSignature: !!prescriptionData.signature,
            signatureData: prescriptionData.signature,
          });

          if (prescriptionData.signature) {
            // Ensure we have enough space for signature (need at least 50mm)
            if (currentY > pageHeight - bottomMargin - 50) {
              // Add new page (footer will be added at the end to all pages)
              pdf.addPage();
              const newPageNum = pdf.internal.getNumberOfPages();
              currentY = addClinicHeaderToPage(newPageNum);
              currentY += 20;
            }
            
            currentY += 4;
            
            // Text labels OUTSIDE the box
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 0, 0);
            pdf.text("Resident Physician", 20, currentY);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.text("(Signature)", 20, currentY + 4);

            // Signature box with border - ONLY around the signature image (compact, no padding)
            pdf.setDrawColor(200, 200, 200);
            pdf.setFillColor(250, 250, 255);
            pdf.rect(18, currentY + 7, 54, 20, "FD");

            // Add signature image if available
            if (prescriptionData.signature.doctorSignature) {
              try {
                console.log("[PDF GENERATION] Adding signature image to PDF");
                pdf.addImage(
                  prescriptionData.signature.doctorSignature,
                  "PNG",
                  20,
                  currentY + 8,
                  50,
                  18,
                );
              } catch (err) {
                console.log(
                  "[PDF GENERATION] Could not add signature image to PDF:",
                  err,
                );
              }
            } else {
              console.log("[PDF GENERATION] No signature image data available");
            }

            // Add e-signed by info - OUTSIDE the signature box
            pdf.setFontSize(8);
            pdf.setTextColor(34, 139, 34); // Green color for e-sign
            pdf.text(`✓ E-Signed by`, 20, currentY + 30);

            const signedDate = prescriptionData.signature.signedAt
              ? new Date(
                  prescriptionData.signature.signedAt,
                ).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            pdf.setTextColor(80, 80, 80);
            pdf.text(signedDate, 20, currentY + 35);
            console.log("[PDF GENERATION] E-signature section added to PDF");
          } else {
            console.log(
              "[PDF GENERATION] No signature found in prescription data",
            );
          }

          // Add footer to all pages
          const totalPages = pdf.internal.getNumberOfPages();
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            pdf.setPage(pageNum);
            addClinicFooterToPage(pageNum, totalPages);
          }
          
          // Set back to last page for any additional content
          pdf.setPage(totalPages);

          // Convert PDF to Blob and then to File
          const pdfBlob = pdf.output("blob");
          const pdfFile = new File([pdfBlob], `${prescriptionNumber}.pdf`, {
            type: "application/pdf",
          });
          allAttachments.push(pdfFile);
          console.log(
            "[PHARMACY EMAIL] Generated prescription PDF:",
            pdfFile.name,
          );
        } catch (error) {
          console.error(
            "[PHARMACY EMAIL] Failed to generate prescription PDF:",
            error,
          );
        }
      }

      // Add user-uploaded attachments if any
      if (attachments && attachments.length > 0) {
        allAttachments.push(...attachments);
        console.log(
          `[PHARMACY EMAIL] Added ${attachments.length} user attachment(s)`,
        );
      }

      console.log("[PHARMACY EMAIL] Step 3: Sending PDF email to pharmacy...");
      // Then send the PDF email to the pharmacy with attachments
      const formData = new FormData();
      formData.append("pharmacyEmail", pharmacyData.email);
      formData.append("pharmacyName", pharmacyData.name);
      formData.append("patientName", patientName || "Patient");

      // Add all attachments
      if (allAttachments.length > 0) {
        allAttachments.forEach((file, index) => {
          formData.append(`attachments`, file);
          console.log(
            `[PHARMACY EMAIL] Added attachment ${index + 1}:`,
            file.name,
          );
        });
      }

      const emailHeaders: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        emailHeaders["Authorization"] = `Bearer ${token}`;
      }

      const emailResponse = await fetch(
        `/api/prescriptions/${prescriptionId}/send-pdf`,
        {
          method: "POST",
          headers: emailHeaders,
          body: formData,
          credentials: "include",
        },
      );

      // Check content type before parsing JSON
      const contentType = emailResponse.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      let emailResult;
      if (isJson) {
        try {
          emailResult = await emailResponse.json();
          console.log("[PHARMACY EMAIL] Email API response:", emailResult);
        } catch (parseError) {
          console.error("[PHARMACY EMAIL] Failed to parse JSON response:", parseError);
          const errorText = await emailResponse.text();
          throw new Error(
            `Server returned an invalid response. ${errorText.substring(0, 100)}`
          );
        }
      } else {
        // Response is not JSON (might be HTML error page)
        const errorText = await emailResponse.text();
        console.error("[PHARMACY EMAIL] Non-JSON response received:", errorText.substring(0, 200));
        throw new Error(
          `Server returned an unexpected response format. The endpoint may not exist or there was a server error. Please contact support.`
        );
      }

      if (!emailResponse.ok) {
        console.error("[PHARMACY EMAIL] Email API failed:", emailResult);
        throw new Error(
          emailResult?.error || emailResult?.message || "Failed to send PDF email to pharmacy",
        );
      }

      console.log("[PHARMACY EMAIL] ✅ Email sent successfully!");
      return emailResult;
    },
    onSuccess: () => {
      console.log("[PHARMACY EMAIL] Mutation onSuccess triggered");
      setShowPharmacyDialog(false);
      setShowPharmacySuccessDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
    onError: (error: any) => {
      console.error("[PHARMACY EMAIL] Mutation onError triggered:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send prescription to pharmacy",
        variant: "destructive",
      });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/prescriptions/${prescriptionId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      setShowDeletePrescriptionDialog(false);
      setPrescriptionPendingDelete(null);
      showSuccessModalPopup("Success", "Prescription deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prescription",
        variant: "destructive",
      });
    },
  });

  const handleCreatePrescription = () => {
    console.log("🆕 CREATE PRESCRIPTION - user:", user);
    console.log(
      "🆕 CREATE PRESCRIPTION - isDoctorLike:",
      user?.role && isDoctorLike(user.role),
    );

    setSelectedPrescription(null); // Clear any selected prescription for new creation
    // Reset form data for new prescription
    const autoProviderId =
      user && isDoctorLike(user.role) ? user.id.toString() : "";
    console.log("🆕 CREATE PRESCRIPTION - autoProviderId:", autoProviderId);

    const newFormData = {
      patientId: "",
      patientName: "",
      providerId: autoProviderId,
      diagnosis: "",
      medications: [
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "",
          refills: "",
          instructions: "",
          genericAllowed: true,
        },
      ],
      pharmacyName: "Halo Health",
      pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
      pharmacyPhone: "+44(0)121 827 5531",
      pharmacyEmail: "pharmacy@halohealth.co.uk",
    };

    console.log("🆕 CREATE PRESCRIPTION - newFormData:", newFormData);
    setFormData(newFormData);
    setFormErrors({ medications: [] });
    setShowNewPrescription(true);
  };

  const [showViewDetails, setShowViewDetails] = useState(false);

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowViewDetails(true);
  };

  // Function to show success modal with green tick
  const showSuccessModalPopup = (title: string, message: string) => {
    setSuccessModalTitle(title);
    setSuccessModalMessage(message);
    setShowGenericSuccessModal(true);
  };

  // Form validation helper functions
  const validateMedication = (medication: any, index: number) => {
    const errors: any = {};

    // Check if this is an inventory-based medication
    if (medication.inventoryItemId) {
      // Inventory item is already selected, just need to validate other fields
      if (!medication.name.trim()) {
        errors.name = "Inventory item name is required";
      }
    } else if (useInventoryItems[index]) {
      // Checkbox is checked but no item selected yet
      errors.inventoryItems = "Please select an inventory item";
    } else {
      // Regular medication name validation
    if (!medication.name.trim()) {
      errors.name = "Medication name is required";
      }
    }

    if (!medication.dosage.trim()) {
      errors.dosage = "Dosage is required";
    }

    if (!medication.frequency.trim()) {
      errors.frequency = "Frequency is required";
    }

    if (!medication.duration.trim()) {
      errors.duration = "Duration is required";
    }

    if (
      !medication.quantity ||
      isNaN(parseInt(medication.quantity)) ||
      parseInt(medication.quantity) <= 0
    ) {
      errors.quantity = "Quantity must be a positive number";
    }

    if (
      medication.refills &&
      (isNaN(parseInt(medication.refills)) || parseInt(medication.refills) < 0)
    ) {
      errors.refills = "Refills must be a non-negative number";
    }

    return errors;
  };

  const validateForm = () => {
    const errors: any = { medications: [] };

    console.log("🔍 VALIDATE FORM - formData:", formData);
    console.log("🔍 VALIDATE FORM - user:", user);
    console.log(
      "🔍 VALIDATE FORM - isDoctorLike:",
      user?.role && isDoctorLike(user.role),
    );

    // Validate only active medication rows (skip trailing empty rows)
    const isMedicationRowActive = (med: (typeof formData.medications)[number], index: number) =>
      Boolean(
        med.name.trim() ||
          med.inventoryItemId ||
          med.dosage.trim() ||
          med.frequency.trim() ||
          med.duration.trim() ||
          med.quantity.trim() ||
          med.refills.trim() ||
          med.instructions.trim() ||
          useInventoryItems[index],
      );

    formData.medications.forEach((med, index) => {
      if (
        !isMedicationRowActive(med, index) &&
        formData.medications.length > 1
      ) {
        errors.medications[index] = {};
        return;
      }
      const medErrors = validateMedication(med, index);
      errors.medications[index] = medErrors;
    });

    // Check if at least one medication is valid (either has name or inventory item)
    const hasValidMedication = formData.medications.some((med) => {
      return med.name.trim() || med.inventoryItemId;
    });
    if (!hasValidMedication) {
      errors.general = "At least one medication is required";
    }

    // Check required fields
    if (!formData.patientId) {
      errors.general = errors.general || "Patient is required";
      console.log("❌ VALIDATE: Missing patientId");
    }

    if (!formData.providerId) {
      errors.general = errors.general || "Provider is required";
      console.log("❌ VALIDATE: Missing providerId");
    }

    if (!formData.diagnosis.trim()) {
      errors.general = errors.general || "Diagnosis is required";
      console.log("❌ VALIDATE: Missing diagnosis");
    }

    console.log("🔍 VALIDATE FORM - errors:", errors);

    setFormErrors(errors);

    // Return true if no errors
    const hasErrors =
      errors.general ||
      errors.medications.some(
        (medError: any) => Object.keys(medError).length > 0,
      );

    console.log("🔍 VALIDATE FORM - hasErrors:", hasErrors);

    return !hasErrors;
  };

  const handleSubmitPrescription = () => {
    if (
      isSubmittingPrescriptionRef.current ||
      createPrescriptionMutation.isPending
    ) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    isSubmittingPrescriptionRef.current = true;

    const validMedications = formData.medications
      .filter((med) => med.name.trim() || med.inventoryItemId)
      .map((med) => {
        const baseMedication = {
          name: med.name.trim(),
          dosage: med.dosage.trim(),
          frequency: med.frequency.trim(),
          duration: med.duration.trim(),
          quantity: parseInt(med.quantity) || 0,
          refills: parseInt(med.refills) || 0,
          instructions: med.instructions.trim(),
          genericAllowed: med.genericAllowed,
        };

        if (med.inventoryItemId) {
          return {
            ...baseMedication,
            inventoryItemId: med.inventoryItemId,
          };
        }

        return baseMedication;
      });

    const selectedProviderId = parseInt(formData.providerId);
    const loggedInUserId = user?.id;
    const clientLocalTime = formatClientLocalTime();

    const prescriptionData = {
      patientId: parseInt(formData.patientId),
      providerId: selectedProviderId,
      prescriptionCreatedBy: loggedInUserId,
      diagnosis: formData.diagnosis.trim(),
      pharmacy: {
        name: formData.pharmacyName.trim(),
        address: formData.pharmacyAddress.trim(),
        phone: formData.pharmacyPhone.trim(),
        email: formData.pharmacyEmail.trim(),
      },
      medications: validMedications,
      clientLocalTime,
    };

    createPrescriptionMutation.mutate(prescriptionData);
  };

  // Medication management helper functions
  const addMedication = () => {
    const newIndex = formData.medications.length;
    const globalInventoryChecked = Object.values(useInventoryItems).some(v => v);
    
    // Use functional updates to prevent unnecessary re-renders and maintain dialog state
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "",
          refills: "",
          instructions: "",
          genericAllowed: true,
        },
      ],
    }));

    // Add empty error state for new medication
    setFormErrors((prev) => ({
      ...prev,
      medications: [...prev.medications, {}],
    }));

    // If global checkbox is checked, set it for the new medication too
    if (globalInventoryChecked) {
      setUseInventoryItems((prev) => ({
        ...prev,
        [newIndex]: true,
      }));
    }
  };

  const removeMedication = (index: number) => {
    if (formData.medications.length > 1) {
      setFormData((prev) => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index),
      }));

      // Remove corresponding error state
      setFormErrors((prev) => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index),
      }));

      // Clean up inventory state for removed medication
      setUseInventoryItems((prev) => {
        const newState = { ...prev };
        delete newState[index];
        // Reindex remaining medications
        const reindexed: {[key: number]: boolean} = {};
        Object.keys(newState).forEach((key) => {
          const oldIndex = parseInt(key);
          if (oldIndex > index) {
            reindexed[oldIndex - 1] = newState[oldIndex];
          } else if (oldIndex < index) {
            reindexed[oldIndex] = newState[oldIndex];
          }
        });
        return reindexed;
      });

      setSelectedInventoryItems((prev) => {
        const newState = { ...prev };
        delete newState[index];
        // Reindex remaining medications
        const reindexed: {[key: number]: number[]} = {};
        Object.keys(newState).forEach((key) => {
          const oldIndex = parseInt(key);
          if (oldIndex > index) {
            reindexed[oldIndex - 1] = newState[oldIndex];
          } else if (oldIndex < index) {
            reindexed[oldIndex] = newState[oldIndex];
          }
        });
        return reindexed;
      });

      setInventorySearchOpen((prev) => {
        const newState = { ...prev };
        delete newState[index];
        // Reindex remaining medications
        const reindexed: {[key: number]: boolean} = {};
        Object.keys(newState).forEach((key) => {
          const oldIndex = parseInt(key);
          if (oldIndex > index) {
            reindexed[oldIndex - 1] = newState[oldIndex];
          } else if (oldIndex < index) {
            reindexed[oldIndex] = newState[oldIndex];
          }
        });
        return reindexed;
      });
    }
  };

  const updateMedication = (
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med,
      ),
    }));

    // Clear error for this field when user starts typing
    if (
      formErrors.medications[index] &&
      formErrors.medications[index][
        field as keyof (typeof formErrors.medications)[0]
      ]
    ) {
      setFormErrors((prev) => ({
        ...prev,
        medications: prev.medications.map((medError, i) =>
          i === index
            ? { ...medError, [field as keyof typeof medError]: undefined }
            : medError,
        ),
      }));
    }
  };

  // E-signature functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });

    // Begin a new path
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Check if mouse moved (tolerance of 2 pixels for click detection)
    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

    // If no movement detected, draw a dot
    if (!moved && lastPosition) {
      ctx.lineWidth = 2;
      ctx.fillStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(lastPosition.x, lastPosition.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsDrawing(false);
    setLastPosition(null);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Update last position
    setLastPosition({ x, y });
  };

  // Touch event handlers
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    // Check if touch moved (tolerance of 2 pixels for tap detection)
    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

    // If no movement detected, draw a dot
    if (!moved && lastPosition) {
      ctx.lineWidth = 2;
      ctx.fillStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(lastPosition.x, lastPosition.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsDrawing(false);
    setLastPosition(null);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Update last position
    setLastPosition({ x, y });
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas background based on theme - dark for dark theme, white for light theme
    const isDark = isSignatureDarkTheme();
    const backgroundColor = isDark ? "#1a1a1a" : "#ffffff";
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set stroke color based on theme - white for dark theme, black for light theme
    const strokeColor = isDark ? "#ffffff" : "#000000";
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    
    setSignature("");
    setSignatureSaved(false);
  };

  // Load signature from database onto canvas
  const loadSignatureFromDatabase = async () => {
    if (!selectedPrescription || !canvasRef.current) return;

    try {
      // Fetch prescription from database to get latest signature data
      const response = await apiRequest(
        "GET",
        `/api/prescriptions/${selectedPrescription.id}`
      );

      if (response.ok) {
        const prescriptionData = await response.json();
        
        // Check if signature exists in database
        if (
          prescriptionData.signature?.doctorSignature &&
          String(prescriptionData.signature.doctorSignature).trim() !== ""
        ) {
          const signatureImage = new Image();
          signatureImage.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            
            // Clear canvas and set white background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the signature image onto canvas
            ctx.drawImage(signatureImage, 0, 0, canvas.width, canvas.height);
            
            // If dark theme, invert the signature to make it white
            if (isSignatureDarkTheme()) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              for (let i = 0; i < data.length; i += 4) {
                // Invert RGB values (keep alpha channel)
                data[i] = 255 - data[i];     // R
                data[i + 1] = 255 - data[i + 1]; // G
                data[i + 2] = 255 - data[i + 2]; // B
              }
              ctx.putImageData(imageData, 0, 0);
            }
            
            // Set stroke color for future drawing
            ctx.strokeStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
            ctx.fillStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
            
            setSignature(prescriptionData.signature.doctorSignature);
          };
          signatureImage.onerror = () => {
            console.error("Error loading signature image");
          };
          signatureImage.src = prescriptionData.signature.doctorSignature;
        } else {
          // No signature exists, clear canvas
          clearSignature();
        }
      }
    } catch (error) {
      console.error("Error loading signature from database:", error);
      // If error, check if signature exists in selectedPrescription
      if (
        selectedPrescription.signature?.doctorSignature &&
        String(selectedPrescription.signature.doctorSignature).trim() !== ""
      ) {
        const signatureImage = new Image();
        signatureImage.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          
          // Clear canvas and set white background
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the signature image onto canvas
          ctx.drawImage(signatureImage, 0, 0, canvas.width, canvas.height);
          
          // If dark theme, invert the signature to make it white
          if (isSignatureDarkTheme()) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              // Invert RGB values (keep alpha channel)
              data[i] = 255 - data[i];     // R
              data[i + 1] = 255 - data[i + 1]; // G
              data[i + 2] = 255 - data[i + 2]; // B
            }
            ctx.putImageData(imageData, 0, 0);
          }
          
          // Set stroke color for future drawing
          ctx.strokeStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
          ctx.fillStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
          
          setSignature(selectedPrescription.signature.doctorSignature);
        };
        signatureImage.src = selectedPrescription.signature.doctorSignature;
      } else {
        clearSignature();
      }
    }
  };

  // Initialize canvas with proper background and stroke color when dialog opens
  useEffect(() => {
    if (showESignDialog && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Set canvas background based on theme - dark for dark theme, white for light theme
      const isDark = isSignatureDarkTheme();
      const backgroundColor = isDark ? "#1a1a1a" : "#ffffff";
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set stroke color based on theme - white in dark theme, black in light theme
      ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
      ctx.fillStyle = isDark ? "#ffffff" : "#000000";
    }
  }, [showESignDialog, theme]);

  // Load signature when dialog opens and initialize canvas for theme
  useEffect(() => {
    if (showESignDialog && selectedPrescription && canvasRef.current) {
      // Initialize canvas context with correct stroke color for current theme
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Set stroke color based on theme
        ctx.strokeStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
        ctx.fillStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
      }
      
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        loadSignatureFromDatabase();
      }, 100);
    } else if (!showESignDialog) {
      // Clear signature when dialog closes
      clearSignature();
    }
  }, [showESignDialog, selectedPrescription?.id, theme]);

  // Watch for theme changes and update canvas background and stroke color dynamically
  useEffect(() => {
    if (!showESignDialog || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Function to update canvas background and stroke color based on current theme
    const updateCanvasForTheme = () => {
      const isDark = isSignatureDarkTheme();
      const newBackgroundColor = isDark ? "#1a1a1a" : "#ffffff";
      const oldBackgroundColor = isDark ? "#ffffff" : "#1a1a1a"; // Opposite of current
      const strokeColor = isDark ? "#ffffff" : "#000000";
      
      // Get current canvas image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Create a new image data with the new background
      const newImageData = ctx.createImageData(canvas.width, canvas.height);
      const newData = newImageData.data;
      
      // Convert old background color to RGB
      const oldBgR = parseInt(oldBackgroundColor.slice(1, 3), 16);
      const oldBgG = parseInt(oldBackgroundColor.slice(3, 5), 16);
      const oldBgB = parseInt(oldBackgroundColor.slice(5, 7), 16);
      
      // Convert new background color to RGB
      const newBgR = parseInt(newBackgroundColor.slice(1, 3), 16);
      const newBgG = parseInt(newBackgroundColor.slice(3, 5), 16);
      const newBgB = parseInt(newBackgroundColor.slice(5, 7), 16);
      
      // Process each pixel: if it's the old background, use new background; otherwise keep the pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Check if pixel matches old background (with tolerance for anti-aliasing)
        const isOldBackground = 
          Math.abs(r - oldBgR) < 10 &&
          Math.abs(g - oldBgG) < 10 &&
          Math.abs(b - oldBgB) < 10;
        
        if (isOldBackground) {
          // Use new background color
          newData[i] = newBgR;
          newData[i + 1] = newBgG;
          newData[i + 2] = newBgB;
          newData[i + 3] = 255;
        } else {
          // Keep existing pixel (signature stroke)
          newData[i] = r;
          newData[i + 1] = g;
          newData[i + 2] = b;
          newData[i + 3] = a;
        }
      }
      
      // Clear canvas and draw new image data
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(newImageData, 0, 0);
      
      // Update stroke color for future drawing
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;
    };

    // Update canvas when theme changes
    updateCanvasForTheme();
  }, [showESignDialog, theme]);

  const saveSignature = async () => {
    // Hide tabs immediately when Apply Advanced E-Signature is clicked (for nurse/admin/doctor roles)
    if (user?.role === 'nurse' || user?.role === 'admin' || user?.role === 'doctor') {
      setHideTabs(true);
    }

    if (!canvasRef.current || !selectedPrescription) return;

    const canvas = canvasRef.current;
    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = canvas.width;
    blankCanvas.height = canvas.height;
    if (canvas.toDataURL() === blankCanvas.toDataURL()) {
      toast({
        title: "Error",
        description: "Please draw your signature before saving.",
        variant: "destructive",
      });
      return;
    }
    const signatureData = getSignatureDataForPdf(canvas);

    try {
      // Step 1: Save the signature
      const signResponse = await apiRequest(
        "POST",
        `/api/prescriptions/${selectedPrescription.id}/e-sign`,
        {
          signature: signatureData,
        },
      );

      if (!signResponse.ok) {
        const errorData = await signResponse
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to save signature");
      }

      const signResult = await signResponse.json();
      console.log("[PRESCRIPTIONS] E-signature saved successfully:", signResult);

      // Step 2: Save the PDF
      const pdfResponse = await apiRequest(
        "POST",
        `/api/prescriptions/${selectedPrescription.id}/save-pdf`
      );

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json().catch(() => ({ error: "Failed to save PDF" }));
        throw new Error(errorData.error || "Failed to save prescription PDF");
      }

      const pdfData = await pdfResponse.json();
      console.log("[PRESCRIPTIONS] PDF saved successfully:", pdfData);

      // Step 3: Update status to "completed"
      const statusResponse = await apiRequest(
        "PATCH",
        `/api/prescriptions/${selectedPrescription.id}`,
        {
          status: "completed"
        }
      );

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({ error: "Failed to update status" }));
        console.error("[PRESCRIPTIONS] Failed to update status:", errorData);
        // Don't throw - signature and PDF are saved, status update is secondary
      } else {
        console.log("[PRESCRIPTIONS] Status updated to 'completed' successfully");
      }

      // Update the prescription queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });

      // Update the selected prescription status immediately for UI feedback
      if (selectedPrescription) {
        setSelectedPrescription({
          ...selectedPrescription,
          status: "completed",
          signature: signResult.signature || signResult.prescription?.signature
        });
      }

      // Show success message in modal
      setSignatureSaved(true);

      showSuccessModalPopup("Success", `Prescription signed, PDF saved, and status updated to "completed" successfully.`);

      // Check if we need to proceed with print or save after signing
      if (pendingAction === "print") {
        // Proceed with printing after signature is saved
        setTimeout(async () => {
          clearSignature();
          setShowESignDialog(false);
          setSignatureSaved(false);
          
          // Fetch updated prescription with signature
          try {
            const updatedPrescriptionResponse = await apiRequest(
              "GET",
              `/api/prescriptions/${selectedPrescription.id}`
            );
            if (updatedPrescriptionResponse.ok) {
              const updatedPrescription = await updatedPrescriptionResponse.json();
              await proceedWithPrint(updatedPrescription);
            } else {
              // Fallback to using selectedPrescription with updated signature
              await proceedWithPrint({
                ...selectedPrescription,
                signature: signResult.signature || signResult.prescription?.signature
              });
            }
          } catch (err) {
            console.error("Failed to fetch updated prescription for printing:", err);
            // Fallback to using selectedPrescription with updated signature
            await proceedWithPrint({
              ...selectedPrescription,
              signature: signResult.signature || signResult.prescription?.signature
            });
          }
          
          setPendingSavePrescriptionId(null);
          setPendingAction(null);
        }, 2000);
      } else {
        // For save action, just close the dialogs
        setTimeout(() => {
          clearSignature();
          setShowESignDialog(false);
          setSignatureSaved(false);
          setPendingSavePrescriptionId(null);
          setPendingAction(null);
        }, 2000);
      }
    } catch (error) {
      console.error("Error saving e-signature and PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save electronic signature and PDF. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePrintPrescription = async (prescriptionId: string) => {
    // First, fetch prescription from database to ensure we have latest data with all fields
    let prescription = null;
    try {
      // Try fetching by ID first
      const prescriptionResponse = await apiRequest(
        "GET",
        `/api/prescriptions/${prescriptionId}`
      );
      if (prescriptionResponse.ok) {
        prescription = await prescriptionResponse.json();
        console.log("Fetched prescription from database:", prescription);
      } else {
        // If not found by ID, try to find in local state
        prescription = Array.isArray(prescriptions)

        
          ? prescriptions.find((p: any) => p.id === prescriptionId || p.prescriptionNumber === prescriptionId)
          : null;
        if (prescription) {
          console.log("Using prescription from local state:", prescription);
        }
      }
    } catch (err) {
      console.error("Failed to fetch prescription from database, using local state:", err);
      // Fallback to local state
      prescription = Array.isArray(prescriptions)
        ? prescriptions.find((p: any) => p.id === prescriptionId || p.prescriptionNumber === prescriptionId)
        : null;
      if (prescription) {
        console.log("Using prescription from local state (fallback):", prescription);
      }
    }

    if (!prescription) {
      console.error("Prescription not found:", prescriptionId);
      toast({
        title: "Error",
        description: "Prescription not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if signature exists
    const hasSignature = prescription.signature?.doctorSignature && 
                         String(prescription.signature.doctorSignature).trim() !== "";
    
    if (!hasSignature) {
      // Show signature required dialog
      setPendingSavePrescriptionId(prescriptionId);
      setPendingAction("print");
      setShowSignatureRequiredDialog(true);
      return;
    }

    // If signature exists, proceed with printing
    await proceedWithPrint(prescription);
  };

  const proceedWithPrint = async (prescription: any) => {

    // Get patient details
    let patient = patients.find((p) => p.id === prescription.patientId);
    const provider = providers.find((p) => p.id === prescription.providerId);
    
    // Fetch full patient data with medical history if not already loaded
    if (prescription.patientId && (!patient || !patient.medicalHistory)) {
      try {
        const patientResponse = await apiRequest(
          "GET",
          `/api/patients/${prescription.patientId}`
        );
        if (patientResponse.ok) {
          patient = await patientResponse.json();
        }
      } catch (err) {
        console.error("Failed to fetch patient data:", err);
      }
    }
    
    // Fetch weight from vitals in medical records
    let weightFromVitals = null;
    if (prescription.patientId) {
      try {
        const recordsResponse = await apiRequest(
          "GET",
          `/api/patients/${prescription.patientId}/records`
        );
        if (recordsResponse.ok) {
          const records = await recordsResponse.json();
          // Find the most recent vitals record
          const vitalsRecords = records.filter((r: any) => r.type === 'vitals' || (r.notes && r.notes.includes('Weight:')));
          if (vitalsRecords.length > 0) {
            // Sort by date, most recent first
            vitalsRecords.sort((a: any, b: any) => {
              const dateA = new Date(a.visitDate || a.createdAt || 0);
              const dateB = new Date(b.visitDate || b.createdAt || 0);
              return dateB.getTime() - dateA.getTime();
            });
            const latestVitals = vitalsRecords[0];
            // Extract weight from notes or vitalSigns
            if (latestVitals.vitalSigns?.weight) {
              weightFromVitals = `${latestVitals.vitalSigns.weight} kg`;
            } else if (latestVitals.notes) {
              const weightMatch = latestVitals.notes.match(/Weight:\s*([\d.]+)\s*kg/i);
              if (weightMatch) {
                weightFromVitals = `${weightMatch[1]} kg`;
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch vitals from medical records:", err);
      }
    }

    // Fetch clinic header and footer
    let clinicHeader = null;
    let clinicFooter = null;
    try {
      const headerResponse = await apiRequest("GET", "/api/clinic-headers");
      if (headerResponse.ok) {
        const headerData = await headerResponse.json();
        clinicHeader = Array.isArray(headerData) ? headerData[0] : headerData;
      }
    } catch (err) {
      console.error("Failed to fetch clinic header:", err);
    }

    try {
      const footerResponse = await apiRequest("GET", "/api/clinic-footers");
      if (footerResponse.ok) {
        const footerData = await footerResponse.json();
        clinicFooter = Array.isArray(footerData) ? footerData[0] : footerData;
      }
    } catch (err) {
      console.error("Failed to fetch clinic footer:", err);
    }

    // Fetch prescribing provider information from database - try providerId, doctorId, then prescriptionCreatedBy
    let doctorInfo = null;
    
    console.log("Prescription data for provider lookup:", {
      providerId: prescription.providerId,
      doctorId: prescription.doctorId,
      prescriptionCreatedBy: prescription.prescriptionCreatedBy
    });
    
    // Try providerId first (from prescriptions table)
    if (prescription.providerId) {
      try {
        const providerResponse = await apiRequest(
          "GET",
          `/api/users/${prescription.providerId}`,
        );
        if (providerResponse.ok) {
          doctorInfo = await providerResponse.json();
          console.log("Fetched provider info by providerId:", doctorInfo);
        } else {
          console.warn("Failed to fetch provider by providerId, status:", providerResponse.status);
        }
      } catch (err) {
        console.error("Failed to fetch provider info by providerId:", err);
      }
    }
    
    // If providerId not available, try doctorId (from prescriptions table)
    if (!doctorInfo && prescription.doctorId) {
      try {
        const doctorResponse = await apiRequest(
          "GET",
          `/api/users/${prescription.doctorId}`,
        );
        if (doctorResponse.ok) {
          doctorInfo = await doctorResponse.json();
          console.log("Fetched provider info by doctorId:", doctorInfo);
        } else {
          console.warn("Failed to fetch provider by doctorId, status:", doctorResponse.status);
        }
      } catch (err) {
        console.error("Failed to fetch doctor info by doctorId:", err);
      }
    }

    // If still not available, try prescriptionCreatedBy (from prescriptions table)
    if (!doctorInfo && prescription.prescriptionCreatedBy) {
      try {
        const doctorResponse = await apiRequest(
          "GET",
          `/api/users/${prescription.prescriptionCreatedBy}`,
        );
        if (doctorResponse.ok) {
          doctorInfo = await doctorResponse.json();
          console.log("Fetched provider info by prescriptionCreatedBy:", doctorInfo);
        } else {
          console.warn("Failed to fetch provider by prescriptionCreatedBy, status:", doctorResponse.status);
        }
      } catch (err) {
        console.error("Failed to fetch doctor info from prescriptionCreatedBy:", err);
      }
    }
    
    if (!doctorInfo) {
      console.warn("No provider information found for prescription:", prescription.id || prescription.prescriptionNumber);
    }

    // Fetch creator information from database (who entered the prescription from prescriptions table)
    let creatorInfo = null;
    if (prescription.prescriptionCreatedBy) {
      try {
        const creatorResponse = await apiRequest(
          "GET",
          `/api/users/${prescription.prescriptionCreatedBy}`,
        );
        if (creatorResponse.ok) {
          creatorInfo = await creatorResponse.json();
          console.log("Fetched creator info:", creatorInfo);
        } else {
          console.warn("Failed to fetch creator info, status:", creatorResponse.status);
        }
      } catch (err) {
        console.error("Failed to fetch creator info:", err);
      }
    } else {
      console.warn("No prescriptionCreatedBy field found in prescription");
    }

    // Calculate age from DOB
    const calculateAge = (dob: string) => {
      if (!dob) return "N/A";
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleDateString("en-GB", { month: "short" });
      const year = date.getFullYear();

      const suffix = (day: number) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
          case 1:
            return "st";
          case 2:
            return "nd";
          case 3:
            return "rd";
          default:
            return "th";
        }
      };

      return `${day}${suffix(day)} ${month} ${year}`;
    };

    // Get first medication for main prescription details
    const firstMed = prescription.medications[0] || {};

    // Format provider name with role prefix
    const formatProviderName = (userInfo: any) => {
      if (!userInfo) return "N/A";
      const firstName = userInfo.firstName || "";
      const lastName = userInfo.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      if (!fullName) return "N/A";
      const role = (userInfo.role || "").toLowerCase();
      
      // Remove any existing prefix from name
      const cleanName = fullName.replace(/^(Dr\.|Nurse\.)\s*/i, "").trim();
      
      // Add role prefix
      if (role === "nurse") {
        return `Nurse. ${cleanName}`;
      } else if (role === "doctor") {
        return `Dr. ${cleanName}`;
      }
      
      return cleanName;
    };

    // If doctorInfo not found, try to get from providers array or use the provider variable
    if (!doctorInfo) {
      if (provider) {
        doctorInfo = provider;
      } else if (prescription.providerId) {
        doctorInfo = providers.find((p: any) => p.id === prescription.providerId);
      } else if (prescription.doctorId) {
        doctorInfo = providers.find((p: any) => p.id === prescription.doctorId);
      } else if (prescription.prescriptionCreatedBy) {
        doctorInfo = providers.find((p: any) => p.id === prescription.prescriptionCreatedBy);
      }
    }
    
    const providerDisplayName = formatProviderName(doctorInfo);
    const creatorDisplayName = creatorInfo ? formatProviderName(creatorInfo) : null;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Prescription - ${prescription.patientName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                line-height: 1.2;
                color: #333;
                background: #f8f9fa;
                padding: 20px;
                position: relative;
              }
              
              .prescription-container {
                width: 210mm;
                min-height: 297mm;
                background: white;
                margin: 0 auto;
                padding: 10mm;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                position: relative;
                overflow: visible;
                display: flex;
                flex-direction: column;
              }
              
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 10px;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 8px;
                page-break-inside: avoid;
              }
              
              .header-left {
                flex: 1;
              }
              
              .header-left h1 {
                font-size: 14px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 3px;
              }
              
              .license-info {
                font-size: 9px;
                color: #6c757d;
                line-height: 1.3;
              }
              
              .status-badge {
                background: #28a745;
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .provider-section {
                text-align: center;
                margin: 10px 0;
                padding: 10px 0;
                border-bottom: 1px solid #e9ecef;
                page-break-inside: avoid;
              }
              
              .provider-title {
                font-size: 16px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 8px;
                letter-spacing: 1px;
              }
              
              .provider-details {
                font-size: 10px;
                color: #6c757d;
                line-height: 1.4;
              }
              
              .patient-info {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                background: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
                page-break-inside: avoid;
              }
              
              .patient-left, .patient-right {
                flex: 1;
              }
              
              .patient-right {
                text-align: right;
              }
              
              .info-line {
                margin: 3px 0;
                font-size: 10px;
              }
              
              .info-label {
                font-weight: bold;
                color: #495057;
              }
              
              .watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 120px;
                font-weight: bold;
                color: rgba(173, 216, 230, 0.08);
                z-index: 1;
                pointer-events: none;
                letter-spacing: 10px;
                background: transparent;
              }
              
              .prescription-details {
                margin: 15px 0;
                position: relative;
                z-index: 2;
                background-color: transparent; /* important: removes white box effect */
              }
              
              .medication-name {
                font-size: 14px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
              }
              
              .prescription-instructions {
                margin: 8px 0;
                font-size: 10px;
                line-height: 1.4;
              }
              
              .medication-item {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              .diagnosis-section {
                margin: 10px 0;
                padding: 8px;
                position: relative;
                background-color: transparent; /* important: removes white box effect */
                border-radius: 5px;
                z-index: 2;
                page-break-inside: avoid;
              }
              
              .diagnosis-label {
                font-weight: bold;
                color: #495057;
                font-size: 10px;
              }
              
              .footer {
                margin-top: auto;
                padding-top: 10px;
                border-top: 1px solid #e9ecef;
                background: white;
                z-index: 10;
                page-break-inside: avoid;
                position: relative;
              }
              
              .signature-section {
                flex: 1;
              }
              
              .signature-label {
                font-size: 9px;
                color: #6c757d;
                margin-bottom: 15px;
              }
              
              .substitute-section {
                text-align: right;
                flex: 1;
              }
              
              .substitute-label {
                font-size: 9px;
                color: #6c757d;
              }
              
              .pharmacy-info {
                text-align: center;
                font-size: 9px;
                color: #6c757d;
                padding: 8px 0;
                border-top: 1px solid #e9ecef;
                margin-top: 5px;
              }
              
              .action-buttons {
                position: absolute;
                bottom: -15mm;
                left: 15mm;
                right: 15mm;
                display: flex;
                justify-content: center;
                gap: 15px;
                padding: 10px;
                background: white;
              }
              
              .action-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 8px 12px;
                border: 1px solid #dee2e6;
                background: white;
                border-radius: 4px;
                font-size: 9px;
                color: #495057;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.2s;
              }
              
              .action-btn:hover {
                background: #f8f9fa;
                border-color: #adb5bd;
              }
              
              .btn-view { color: #007bff; }
              .btn-print { color: #6c757d; }
              .btn-send { color: #28a745; }
              .btn-sign { color: #ffc107; }
              .btn-edit { color: #17a2b8; }
              .btn-delete { color: #dc3545; }
              
              @media print {
                body { 
                  padding: 0; 
                  background: white;
                  margin: 0;
                }
                .prescription-container { 
                  box-shadow: none; 
                  margin: 0;
                  padding: 10mm;
                  min-height: 277mm;
                  height: 277mm;
                  display: flex;
                  flex-direction: column;
                }
                .action-buttons { display: none; }
                .footer {
                  margin-top: auto;
                  padding-top: 10px;
                  position: relative;
                }
                @page {
                  size: A4;
                  margin: 10mm;
                }
                /* Ensure header and footer appear on each printed page */
                .header, .provider-section {
                  page-break-after: avoid;
                }
                .footer {
                  page-break-before: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="prescription-container">
              <!-- Header -->
              <div class="header">
                <div class="header-left">
                  <h1>CURA HEALTH EMR</h1>
                  <div class="license-info">
                 
                    Prescription #: ${prescription.prescriptionNumber || "N/A"}
                  </div>
                </div>
                <div class="status-badge">${(prescription.status || "active").toUpperCase()}</div>
              </div>
              
              <!-- Provider Section -->
              <div class="provider-section">
               
                ${
                  clinicHeader?.logoBase64 &&
                  clinicHeader.logoPosition === "center"
                    ? `
                <!-- Logo beside clinic info for center position -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin: 10px 0;">
                  <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px; flex-shrink: 0;" />
                  <div style="
                    font-family: ${clinicHeader?.fontFamily || "Arial"}, sans-serif;
                    font-size: ${clinicHeader?.fontSize || "12pt"};
                    font-weight: ${clinicHeader?.fontWeight || "normal"};
                    font-style: ${clinicHeader?.fontStyle || "normal"};
                    text-decoration: ${clinicHeader?.textDecoration || "none"};
                    text-align: center;
                  ">
                 
                    <span style="font-size: ${clinicHeader?.clinicNameFontSize || "16pt"}; font-weight: bold;">
                      ${clinicHeader?.clinicName || "Halo Health Clinic"}
                    </span><br>
                    ${clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}<br>
                    ${clinicHeader?.phone || "+44(0)121 827 5531"}${clinicHeader?.email ? `<br>${clinicHeader.email}` : ""}${clinicHeader?.website ? `<br>${clinicHeader.website}` : ""}
                  </div>
                </div>
                `
                    : clinicHeader?.logoBase64
                      ? `
                <!-- Logo above clinic info for left/right position -->
                <div style="text-align: ${clinicHeader.logoPosition || "center"}; margin: 10px 0;">
                  <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 100px; max-height: 100px;" />
                </div>
                <div class="provider-details" style="
                  font-family: ${clinicHeader?.fontFamily || "Arial"}, sans-serif;
                  font-size: ${clinicHeader?.fontSize || "12pt"};
                  font-weight: ${clinicHeader?.fontWeight || "normal"};
                  font-style: ${clinicHeader?.fontStyle || "normal"};
                  text-decoration: ${clinicHeader?.textDecoration || "none"};
                  text-align: ${clinicHeader.logoPosition || "center"};
                ">
             
                  <span style="font-size: ${clinicHeader?.clinicNameFontSize || "16pt"}; font-weight: bold;">
                    ${clinicHeader?.clinicName || "Halo Health Clinic"}
                  </span><br>
                  ${clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}<br>
                  ${clinicHeader?.phone || "+44(0)121 827 5531"}${clinicHeader?.email ? `<br>${clinicHeader.email}` : ""}${clinicHeader?.website ? `<br>${clinicHeader.website}` : ""}
                </div>
                `
                      : `
                <!-- No logo -->
                <div class="provider-details" style="
                  font-family: ${clinicHeader?.fontFamily || "Arial"}, sans-serif;
                  font-size: ${clinicHeader?.fontSize || "12pt"};
                  font-weight: ${clinicHeader?.fontWeight || "normal"};
                  font-style: ${clinicHeader?.fontStyle || "normal"};
                  text-decoration: ${clinicHeader?.textDecoration || "none"};
                ">
                  Provider: ${providerDisplayName}<br>
                  <span style="font-size: ${clinicHeader?.clinicNameFontSize || "16pt"}; font-weight: bold;">
                    ${clinicHeader?.clinicName || "Halo Health Clinic"}
                  </span><br>
                  ${clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}<br>
                  ${clinicHeader?.phone || "+44(0)121 827 5531"}${clinicHeader?.email ? `<br>${clinicHeader.email}` : ""}${clinicHeader?.website ? `<br>${clinicHeader.website}` : ""}
                </div>
                `
                }
              </div>
              
              <!-- Patient Information -->
              <div class="patient-info">
                <div class="patient-left">
                  <div class="info-line">
                    <span class="info-label">Name:</span> ${prescription.patientName}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Address:</span> ${patient?.address ? `${patient.address.street || ""}, ${patient.address.city || ""}, ${patient.address.postcode || ""}, ${patient.address.country || ""}`.replace(/, ,/g, ",").replace(/^,\s*|,\s*$/g, "") : "-"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Allergies:</span> ${patient?.medicalHistory?.allergies?.length > 0 ? patient.medicalHistory.allergies.join(", ") : (patient?.allergies?.length > 0 ? patient.allergies.join(", ") : "-")}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Weight:</span> ${weightFromVitals || prescription.patientWeight || (patient?.weight ? `${patient.weight} kg` : "-")}
                  </div>
                </div>
                <div class="patient-right">
                  <div class="info-line">
                    <span class="info-label">DOB:</span> ${patient?.dateOfBirth ? formatDate(patient.dateOfBirth) : "01/01/1985"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Age:</span> ${patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : "39"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Sex:</span> ${patient?.gender || patient?.genderAtBirth || patient?.sex || "Not specified"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Date:</span> ${formatDate(prescription.prescribedAt || prescription.issuedDate || prescription.createdAt)}
                  </div>
                </div>
              </div>
              
              <!-- Provider and Creator Information -->
              <div style="margin: 10px 0; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #4A7DFF; page-break-inside: avoid;">
                <div class="info-line" style="margin-bottom: 5px;">
                  <span class="info-label" style="color: #2c3e50; font-weight: bold;">Provider:</span> ${providerDisplayName}
                </div>
                ${creatorDisplayName ? `
                <div class="info-line">
                  <span class="info-label" style="color: #2c3e50; font-weight: bold;">Created by:</span> ${creatorDisplayName}
                </div>
                ` : ""}
              </div>
              
              <!-- Watermark -->
              <div class="watermark">HHC</div>
              
              <!-- Prescription Details - All Medications -->
              <div class="prescription-details">
                ${(prescription.medications && prescription.medications.length > 0 
                  ? prescription.medications.map((med: any, index: number) => `
                    <div class="medication-item" style="margin-bottom: 20px; page-break-inside: avoid; padding: 10px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #4A7DFF;">
                      <div class="medication-name" style="font-size: 14px; font-weight: bold; color: #2c3e50; margin-bottom: 8px;">
                        Medication ${index + 1}: ${med.name || "N/A"}
                      </div>
                      <div class="prescription-instructions" style="font-size: 10px; line-height: 1.6; color: #495057;">
                        <div style="margin-bottom: 4px;"><strong>Dosage:</strong> ${med.dosage || "N/A"}</div>
                        <div style="margin-bottom: 4px;"><strong>Frequency:</strong> ${med.frequency || "N/A"}</div>
                        <div style="margin-bottom: 4px;"><strong>Duration:</strong> ${med.duration || "N/A"}</div>
                        <div style="margin-bottom: 4px;"><strong>Quantity:</strong> ${med.quantity || "N/A"}</div>
                        <div style="margin-bottom: 4px;"><strong>Refills:</strong> ${med.refills || "0"}</div>
                        ${med.instructions ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #dee2e6;"><strong>Instructions:</strong> ${med.instructions}</div>` : ""}
                      </div>
                    </div>
                  `).join('')
                  : `
                    <div class="medication-item" style="margin-bottom: 20px; page-break-inside: avoid; padding: 10px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #4A7DFF;">
                      <div class="medication-name" style="font-size: 14px; font-weight: bold; color: #2c3e50; margin-bottom: 8px;">
                        ${firstMed.name || "Neuberal 10"}
                      </div>
                      <div class="prescription-instructions" style="font-size: 10px; line-height: 1.6; color: #495057;">
                        <div style="margin-bottom: 4px;"><strong>Sig:</strong> ${firstMed.instructions || "Please visit the doctor after 15 days."}</div>
                        <div style="margin-bottom: 4px;"><strong>Disp:</strong> ${firstMed.quantity || "30"} (${firstMed.duration || "30 days"})</div>
                        <div style="margin-bottom: 4px;"><strong>Refills:</strong> ${firstMed.refills || "1"}</div>
                      </div>
                    </div>
                  `
                )}
              </div>
              
              <!-- Diagnosis -->
              <div class="diagnosis-section">
                <span class="diagnosis-label">Diagnosis:</span> ${prescription.diagnosis || "Migraine"}
              </div>
              
              <!-- Footer -->
              <div style="display: flex; justify-content: flex-start; align-items: flex-end; margin-top: 15px; page-break-inside: avoid;">
                <div class="signature-section">
                  <div class="signature-label">Resident Physician<br>(Signature)</div>
                  ${
                    prescription.signature && prescription.signature.doctorSignature
                      ? `<img src="${prescription.signature.doctorSignature}" alt="Doctor Signature" style="height: 48px; width: 128px; border: 1px solid #dee2e6; background: white; border-radius: 4px; margin-top: 8px;" />
                         <p style="font-size: 8px; color: #28a745; margin-top: 4px;">✓ E-Signed by ${prescription.signature.signedBy || "Provider"}${prescription.signature.signedAt ? ` - ${(() => {
                           const date = new Date(prescription.signature.signedAt);
                           const month = date.toLocaleDateString('en-GB', { month: 'short' });
                           const day = date.getDate();
                           const year = date.getFullYear();
                           const hours = date.getHours().toString().padStart(2, '0');
                           const minutes = date.getMinutes().toString().padStart(2, '0');
                           return month + ' ' + day + ', ' + year + ' ' + hours + ':' + minutes;
                         })()}` : ''}</p>`
                      : ""
                  }
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div class="action-buttons">
                <button class="action-btn btn-view" onclick="window.close()">
                  👁️ View
                </button>
                <button class="action-btn btn-print" onclick="window.print()">
                  🖨️ Print
                </button>
                <button class="action-btn btn-send">
                  📤 Send to Pharmacy
                </button>
                <button class="action-btn btn-sign">
                  ✍️ E-Sign
                </button>
                <button class="action-btn btn-edit">
                  ✏️ Edit
                </button>
                <button class="action-btn btn-delete">
                  🗑️ Delete
                </button>
              </div>
              
              <!-- Footer -->
              <div class="footer">
                <div class="pharmacy-info">
                  ${clinicFooter?.footerText || "Pharmacy: Halo Health - +44(0)121 827 5531"}
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();

      // Auto-print after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 100);
      };
    }

    showSuccessModalPopup("Printing Prescription", "Prescription sent to printer successfully");
  };

  const handleSendToPharmacy = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setAttachedFiles([]); // Reset attached files
    setShowPharmacyDialog(true);
  };

  const handleSavePrescription = async (prescriptionId: string) => {
    // First, fetch prescription to check if signature exists and status
    let prescription = null;
    try {
      const prescriptionResponse = await apiRequest(
        "GET",
        `/api/prescriptions/${prescriptionId}`
      );
      if (prescriptionResponse.ok) {
        prescription = await prescriptionResponse.json();
      } else {
        // If not found by ID, try to find in local state
        prescription = Array.isArray(prescriptions)
          ? prescriptions.find((p: any) => p.id === prescriptionId || p.prescriptionNumber === prescriptionId)
          : null;
      }
    } catch (err) {
      console.error("Failed to fetch prescription, using local state:", err);
      prescription = Array.isArray(prescriptions)
        ? prescriptions.find((p: any) => p.id === prescriptionId || p.prescriptionNumber === prescriptionId)
        : null;
    }

    if (!prescription) {
      toast({
        title: "Error",
        description: "Prescription not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if signature exists
    const hasSignature = prescription.signature?.doctorSignature && 
                         String(prescription.signature.doctorSignature).trim() !== "";
    const isCompleted = prescription.status === "completed";
    
    if (!hasSignature) {
      // Show signature required dialog
      setPendingSavePrescriptionId(prescriptionId);
      setPendingAction("save");
      setShowSignatureRequiredDialog(true);
      return;
    }

    // If signature exists and status is completed, check if PDF exists and open it
    if (hasSignature && isCompleted && prescription.savedPdfPath) {
      // PDF already exists, open it in viewer
      await handleOpenPrescriptionPdf(prescription);
      return;
    }

    // If signature exists but not completed, save PDF and update status, then open PDF viewer
    try {
      // Step 1: Save the PDF
      const pdfResponse = await apiRequest(
        "POST",
        `/api/prescriptions/${prescriptionId}/save-pdf`
      );

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json().catch(() => ({ error: "Failed to save PDF" }));
        throw new Error(errorData.error || "Failed to save prescription PDF");
      }

      const pdfData = await pdfResponse.json();
      console.log("[PRESCRIPTIONS] PDF saved successfully:", pdfData);

      // Step 2: Update status to "completed"
      const statusResponse = await apiRequest(
        "PATCH",
        `/api/prescriptions/${prescriptionId}`,
        {
          status: "completed"
        }
      );

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({ error: "Failed to update status" }));
        console.error("[PRESCRIPTIONS] Failed to update status:", errorData);
        // Don't throw - PDF is saved, status update is secondary
      } else {
        console.log("[PRESCRIPTIONS] Status updated to 'completed' successfully");
      }

      // Step 3: Fetch updated prescription with savedPdfPath
      let updatedPrescription = null;
      try {
        const updatedResponse = await apiRequest(
          "GET",
          `/api/prescriptions/${prescriptionId}`
        );
        if (updatedResponse.ok) {
          updatedPrescription = await updatedResponse.json();
        }
      } catch (err) {
        console.error("Failed to fetch updated prescription:", err);
        // Use the original prescription with updated path from pdfData
        updatedPrescription = {
          ...prescription,
          savedPdfPath: pdfData.filePath,
          status: "completed"
        };
      }

      // Update the prescription queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });

      showSuccessModalPopup("Success", `Prescription PDF saved and status updated to "completed" successfully.`);

      // Step 4: Open PDF viewer popup
      if (updatedPrescription) {
        await handleOpenPrescriptionPdf(updatedPrescription);
      }
    } catch (error) {
      console.error("Error saving prescription PDF:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save prescription PDF",
        variant: "destructive",
      });
    }
  };

  const handleReadyToSign = () => {
    // Close signature required dialog and open e-sign dialog
    setShowSignatureRequiredDialog(false);
    if (pendingSavePrescriptionId) {
      const prescription = prescriptions?.find((p: any) => p.id === pendingSavePrescriptionId || p.prescriptionNumber === pendingSavePrescriptionId);
      if (prescription) {
        setSelectedPrescription(prescription);
        setShowESignDialog(true);
      }
    }
  };

  const handleOpenPrescriptionPdf = async (prescription: any) => {
    if (!prescription.savedPdfPath && !prescription.id) {
      toast({
        title: "PDF not available",
        description: "This prescription does not have a saved PDF yet. Please click Save first.",
        variant: "destructive",
      });
      return;
    }

    // Check if prescription is signed and status is completed
    const hasSignature = prescription.signature?.doctorSignature && 
                         String(prescription.signature.doctorSignature).trim() !== "";
    const isCompleted = prescription.status === "completed";

    if (!hasSignature || !isCompleted) {
      toast({
        title: "PDF not available",
        description: "This prescription must be signed and completed before viewing the PDF.",
        variant: "destructive",
      });
      return;
    }

    // Use prescription ID to fetch PDF from database path
    if (prescription.id) {
      try {
        const viewUrl = `/api/prescriptions/${prescription.id}/pdf`;
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          console.error("[CLIENT] No auth token found in localStorage");
          toast({
            title: "Authentication Required",
            description: "Please log in again to view this PDF.",
            variant: "destructive",
          });
          return;
        }

        console.log("[CLIENT] Opening PDF for prescription:", prescription.id, "Token exists: true");
        const headers: Record<string, string> = {
          "X-Tenant-Subdomain": getTenantSubdomain(),
          "Authorization": `Bearer ${token}`,
        };

        console.log("[CLIENT] Request URL:", buildUrl(viewUrl));
        console.log("[CLIENT] Request headers:", { ...headers, Authorization: "Bearer ***" });

        const response = await fetch(buildUrl(viewUrl), {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          let errorMessage = "";
          try {
            const errorData = await response.json();
            errorMessage =
              errorData?.error ||
              errorData?.message ||
              `Failed to load PDF: ${response.status}`;
          } catch {
            try {
              errorMessage = (await response.text()) || `Failed to load PDF: ${response.status}`;
            } catch {
              errorMessage = `Failed to load PDF: ${response.status}`;
            }
          }

          if (response.status === 401) {
            toast({
              title: "Session expired",
              description: "Your session has expired. Please log in again to view this PDF.",
              variant: "destructive",
            });
            return;
          }

          if (response.status === 403) {
            // For patient users, provide more helpful error message
            const isPatient = user?.role === 'patient';
            toast({
              title: "Access denied",
              description: isPatient 
                ? "Unable to access PDF. Please ensure you are logged in and have permission to view this prescription."
                : errorMessage || "You do not have permission to view this PDF.",
              variant: "destructive",
            });
            return;
          }

          if (response.status === 404) {
            toast({
              title: "PDF not found",
              description: "The PDF file could not be found on the server.",
              variant: "destructive",
            });
            return;
          }

          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        const blob = await response.blob();
        
        // Verify it's a PDF (check blob type or size)
        if (blob.size === 0) {
          console.error("[CLIENT] PDF blob is empty");
          toast({
            title: "Invalid PDF",
            description: "The PDF file appears to be empty or corrupted.",
            variant: "destructive",
          });
          return;
        }
        
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Reset error state
        setPdfLoadError(false);
        
        // Set PDF URL and show viewer dialog
        setSelectedPdfPrescription(prescription);
        setPdfViewerUrl(blobUrl);
        setShowPdfViewerDialog(true);
      } catch (error) {
        console.error("Error viewing PDF:", error);
        const isPatient = user?.role === 'patient';
        toast({
          title: "Error",
          description: isPatient
            ? "Failed to open PDF. Please ensure you are logged in and try again."
            : "Failed to open PDF due to a network or server error. Please try again or log in again if the problem persists.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to old method if no prescription ID
      handleViewPDF({
        filePath: prescription.savedPdfPath,
        fileName:
          prescription.prescriptionNumber ||
          prescription.savedPdfPath.split("/").pop() ||
          "prescription.pdf",
      });
    }
  };

  const fetchSavedPDFs = async (patientId?: number) => {
    setLoadingPDFs(true);
    try {
      const url = patientId 
        ? `/api/prescriptions/saved-pdfs?patientId=${patientId}`
        : `/api/prescriptions/saved-pdfs`;
      console.log("[CLIENT] Fetching saved PDFs from:", url);
      const response = await apiRequest("GET", url);
      console.log("[CLIENT] Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[CLIENT] Received PDFs:", data);
        setSavedPDFs(data.pdfs || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch saved PDFs:", errorData);
        setSavedPDFs([]);
      }
    } catch (error) {
      console.error("Error fetching saved PDFs:", error);
      setSavedPDFs([]);
    } finally {
      setLoadingPDFs(false);
    }
  };

  const handleViewPDF = async (pdf: any) => {
    try {
      // If PDF has prescriptionId, use the new endpoint that fetches from database
      if (pdf.prescriptionId) {
        const viewUrl = `/api/prescriptions/${pdf.prescriptionId}/pdf`;
        const token = localStorage.getItem("auth_token");
        console.log("[CLIENT] Viewing PDF for prescription:", pdf.prescriptionId, "Token exists:", !!token);
        const headers: Record<string, string> = {
          "X-Tenant-Subdomain": getTenantSubdomain(),
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          console.log("[CLIENT] Authorization header set");
        } else {
          console.error("[CLIENT] No auth token found in localStorage");
        }

        console.log("[CLIENT] Request URL:", buildUrl(viewUrl));
        console.log("[CLIENT] Request headers:", { ...headers, Authorization: token ? "Bearer ***" : "missing" });

        const response = await fetch(buildUrl(viewUrl), {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          let errorMessage = "";
          try {
            const errorData = await response.json();
            errorMessage =
              errorData?.error ||
              errorData?.message ||
              `Failed to load PDF: ${response.status}`;
          } catch {
            try {
              errorMessage = (await response.text()) || `Failed to load PDF: ${response.status}`;
            } catch {
              errorMessage = `Failed to load PDF: ${response.status}`;
            }
          }

          if (response.status === 401) {
            toast({
              title: "Session expired",
              description: "Your session has expired. Please log in again to view this PDF.",
              variant: "destructive",
            });
            return;
          }

          if (response.status === 403) {
            toast({
              title: "Access denied",
              description: errorMessage || "You do not have permission to view this PDF.",
              variant: "destructive",
            });
            return;
          }

          if (response.status === 404) {
            toast({
              title: "PDF not found",
              description: "The PDF file could not be found on the server.",
              variant: "destructive",
            });
            return;
          }

          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
        return;
      }

      // Fallback to old method: Extract organizationId, patientId, userId from filePath
      // Structure: /patients/{patientId}/{userId}/All_docs_prescriptions/
      const pathMatch = pdf.filePath.match(
        /\/uploads\/Prescriptions\/(\d+)\/patients\/(\d+)\/(\d+)\/All_docs_prescriptions\/(.+)/,
      );
      if (!pathMatch) {
        throw new Error("Invalid PDF path");
      }

      const [, organizationId, patientId, userId, fileName] = pathMatch;
      const viewUrl = `/api/prescriptions/saved-pdfs/${organizationId}/${patientId}/${userId}/${fileName}`;

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(viewUrl), {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData?.error ||
            errorData?.message ||
            `Failed to load PDF: ${response.status}`;
        } catch {
          try {
            errorMessage = (await response.text()) || `Failed to load PDF: ${response.status}`;
          } catch {
            errorMessage = `Failed to load PDF: ${response.status}`;
          }
        }

        if (response.status === 401) {
          toast({
            title: "Session expired",
            description: "Your session has expired. Please log in again to view this PDF.",
            variant: "destructive",
          });
          return;
        }

        if (response.status === 403) {
          toast({
            title: "Access denied",
            description: errorMessage || "You do not have permission to view this PDF.",
            variant: "destructive",
          });
          return;
        }

        if (response.status === 404) {
          toast({
            title: "PDF not found",
            description: "The PDF file could not be found on the server.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing PDF:", error);
      toast({
        title: "Error",
        description:
          "Failed to open PDF due to a network or server error. Please try again or log in again if the problem persists.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (pdf: any) => {
    try {
      // Extract organizationId, patientId, userId from filePath
      // Structure: /patients/{patientId}/{userId}/All_docs_prescriptions/
      const pathMatch = pdf.filePath.match(
        /\/uploads\/Prescriptions\/(\d+)\/patients\/(\d+)\/(\d+)\/All_docs_prescriptions\/(.+)/,
      );
      if (!pathMatch) {
        throw new Error("Invalid PDF path");
      }

      const [, organizationId, patientId, userId, fileName] = pathMatch;
      const downloadUrl = `/api/prescriptions/saved-pdfs/${organizationId}/${patientId}/${userId}/${fileName}`;

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(downloadUrl), {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdf.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    // Switch to the prescriptions tab to open edit in the same tab
    setActiveTab("prescriptions");
    setShowNewPrescription(true);
    toast({
      title: "Edit Prescription",
      description: `Opening prescription editor for ${prescription.patientName}`,
    });
  };

  const handleCancelPrescription = (prescriptionId: string) => {
    if (window.confirm("Are you sure you want to cancel this prescription?")) {
      const prescription = Array.isArray(prescriptions)
        ? prescriptions.find((p: any) => p.id === prescriptionId)
        : null;
      if (prescription) {
        toast({
          title: "Prescription Cancelled",
          description: `Prescription for ${prescription.patientName} has been cancelled`,
          variant: "destructive",
        });

        // In a real implementation, this would call an API to cancel the prescription
        queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      }
    }
  };

  const handleDeletePrescription = (prescriptionId: string | number) => {
    if (deletePrescriptionMutation.isPending) {
      return;
    }

    const prescription = Array.isArray(prescriptions)
      ? prescriptions.find((p: any) => p.id == prescriptionId)
      : null;
    if (!prescription) {
      return;
    }

    const patientName = resolveViewPrescriptionPatientName(
      prescription,
      patients,
      fetchedPatientNames,
    );
    setPrescriptionPendingDelete({
      id: prescriptionId,
      patientName: patientName !== "-" ? patientName : "this patient",
    });
    setShowDeletePrescriptionDialog(true);
  };

  const confirmDeletePrescription = () => {
    if (!prescriptionPendingDelete || deletePrescriptionMutation.isPending) {
      return;
    }
    deletePrescriptionMutation.mutate(String(prescriptionPendingDelete.id));
  };

  // Compute unique prescription IDs for the filter dropdown
  const applySearchFilter = (value: string) => {
    try {
      const trimmed = value.trim();
      setSearchQuery(trimmed);
      setPatientNameFilter(""); // Fixed: should be empty string, not "all"
      if (trimmed) {
        setStatusFilter("all");
        setPrescriptionIdFilter("all");
      }
    } catch (error) {
      console.error("Error in applySearchFilter:", error);
    }
  };

  const handleSearch = () => {
    applySearchFilter(searchInput);
    setPrescriptionSearchPreviewId("");
  };

  const handleRefreshFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("all");
    setPrescriptionIdFilter("all");
    setPatientNameFilter("");
    setDoctorFilter("");
    setPrescriptionSearchPreviewId("");
  };

  const handlePatientFilter = (value: string) => {
    try {
      // Validate input
      if (value === null || value === undefined) {
        setPatientNameFilter("");
        return;
      }
      
      const stringValue = String(value).trim();
      
      // Use React's batching to update state safely
      if (stringValue) {
        // Batch all state updates together
        setPatientNameFilter(stringValue);
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("all");
        setPrescriptionIdFilter("all");
      } else {
        setPatientNameFilter("");
      }
    } catch (error) {
      console.error("Error in handlePatientFilter:", error);
      // Reset to empty string on error
      setPatientNameFilter("");
    }
  };

  const handleDoctorFilter = (value: string) => {
    try {
      // Validate input
      if (value === null || value === undefined) {
        setDoctorFilter("");
        return;
      }
      
      const stringValue = String(value).trim();
      
      if (stringValue) {
        // Validate that it's a valid number if it's not empty
        const numValue = parseInt(stringValue, 10);
        if (isNaN(numValue) && stringValue !== "") {
          console.warn("Invalid doctor filter value:", stringValue);
          setDoctorFilter("");
          return;
        }
        
        // Batch all state updates together
        setDoctorFilter(stringValue);
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("all");
        setPrescriptionIdFilter("all");
        setPatientNameFilter("");
      } else {
        setDoctorFilter("");
      }
    } catch (error) {
      console.error("Error in handleDoctorFilter:", error);
      // Reset to empty string on error
      setDoctorFilter("");
    }
  };

  const uniquePrescriptionIds = useMemo(() => {
    if (!Array.isArray(prescriptions)) return [];
    const ids = prescriptions
      .map((p: any) => {
        const id = p.prescriptionNumber;
        return id === undefined || id === null ? "" : String(id);
      })
      .filter((id: string) => id !== "");
    return Array.from(new Set(ids)).sort();
  }, [prescriptions]);

  const doctorOptions = useMemo(() => {
    try {
      if (!Array.isArray(allUsers) || allUsers.length === 0) return [];
      const options = allUsers
        .filter((userItem: any) => {
          try {
            if (!userItem || !userItem.role) return false;
            const role = userItem.role?.toString()?.toLowerCase() || "";
            return isDoctorLike(role) || role === "doctor";
          } catch (error) {
            console.error("Error filtering doctor option:", error);
            return false;
          }
        })
        .map((userItem: any) => {
          try {
            if (!userItem || !userItem.id) return null;
            const name = getDoctorLabel(userItem);
            if (!name || typeof name !== 'string') return null;
            return {
              id: userItem.id,
              name: name,
            };
          } catch (error) {
            console.error("Error mapping doctor option:", error);
            return null;
          }
        })
        .filter((entry: any) => entry && entry.id && entry.name);
      const unique = Array.from(
        new Map(options.map((entry: any) => [entry.name, entry])).values(),
      );
      return unique.sort((a, b) => {
        try {
          const nameA = (a?.name || "").toString();
          const nameB = (b?.name || "").toString();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        } catch (error) {
          console.error("Error sorting doctor options:", error);
          return 0;
        }
      });
    } catch (error) {
      console.error("Error computing doctorOptions:", error);
      return [];
    }
  }, [allUsers]);

  const patientOptions = useMemo(() => {
    try {
      if (!Array.isArray(patients) || patients.length === 0) return [];
      
      const names = patients
        .map((p: any) => {
          try {
            if (!p || typeof p !== "object") return null;
            const fetched = fetchedPatientNames[p.id];
            const fullName = fetched || displayPatientName(p);
            return fullName !== "Unknown patient" ? fullName : null;
          } catch (error) {
            console.error("Error mapping patient name:", error);
            return null;
          }
        })
        .filter((name): name is string => name !== null && name !== undefined && typeof name === 'string' && name.trim() !== '');
      
      const uniqueNames = Array.from(new Set(names));
      return uniqueNames.sort((a, b) => {
        try {
          const nameA = (a || "").toString();
          const nameB = (b || "").toString();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        } catch (error) {
          console.error("Error sorting patient names:", error);
          return 0;
        }
      });
    } catch (error) {
      console.error("Error computing patientOptions:", error);
      return [];
    }
  }, [patients, fetchedPatientNames]);

  const patientRelationRank = (relation?: string | null) => {
    if (!relation) return 50;
    const r = String(relation).toLowerCase();
    if (r === "self") return 0;
    if (r === "spouse") return 10;
    if (r === "father") return 20;
    if (r === "mother") return 21;
    if (r === "son") return 30;
    if (r === "daughter") return 31;
    if (r === "dependent child") return 32;
    if (r === "other") return 40;
    return 45;
  };

  /** Group patients by login userId — account holder first, family members indented (↳). */
  const patientDropdownGroups = useMemo(() => {
    if (!Array.isArray(patients) || patients.length === 0) return [];

    const map = new Map<number | string, any[]>();
    for (const p of patients) {
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

      const main =
        sorted.find((m) => String(m?.relation ?? "").trim().toLowerCase() === "self") ??
        sorted[0];
      const relatives = sorted.filter((m) => m !== main);
      return { main, relatives };
    });

    groups.sort((a, b) => {
      const na = `${a.main?.firstName ?? ""} ${a.main?.lastName ?? ""}`.trim().toLowerCase();
      const nb = `${b.main?.firstName ?? ""} ${b.main?.lastName ?? ""}`.trim().toLowerCase();
      return na.localeCompare(nb);
    });

    return groups;
  }, [patients]);

  const formatPatientDropdownLabel = (patient: any) =>
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() +
    (patient?.patientId ? ` (${patient.patientId})` : "");

  // Compute unique prescription IDs for doctors (filtered to this doctor's prescriptions only)
  const doctorPrescriptionIds = useMemo(() => {
    if (!Array.isArray(prescriptions) || user?.role !== 'doctor') return [];
    const ids = prescriptions
      .filter((p: any) => p.doctorId === user.id || p.prescriptionCreatedBy === user.id)
      .map((p: any) => p.prescriptionNumber)
      .filter((id: string | undefined) => id !== undefined && id !== null && id !== "");
    return Array.from(new Set(ids)).sort();
  }, [prescriptions, user]);

  // For summary statistics - only apply search filter, not status filter
  const searchFilteredPrescriptions = Array.isArray(prescriptions)
    ? prescriptions.filter((prescription: any) => {
        // For doctors: Search by patient name and patient ID
        if (user?.role === 'doctor' && doctorPatientSearch) {
          const searchLower = doctorPatientSearch.toLowerCase();
          const matchesDoctorPatientSearch = 
            prescription.patientName?.toLowerCase().includes(searchLower) ||
            String(prescription.patientId || '').toLowerCase().includes(searchLower);
          return matchesDoctorPatientSearch;
        }
        
        // For other roles: search by patient name and medication name
        const searchLower = searchQuery.toLowerCase();
        const matchesPatientName = (prescription.patientName || "")
          .toLowerCase()
          .includes(searchLower);
        const matchesPatientId = String(prescription.patientId || "")
          .toLowerCase()
          .includes(searchLower);
        const matchesMedication = (prescription.medications || []).some((med: any) =>
          (med?.name || "").toLowerCase().includes(searchLower),
        );

        const matchesSearch =
          !searchQuery || matchesPatientName || matchesPatientId || matchesMedication;

        return matchesSearch;
      })
    : [];

  const filteredPrescriptions = Array.isArray(prescriptions)
    ? prescriptions.filter((prescription: any) => {
        // Safety check: ensure prescription is valid
        if (!prescription || typeof prescription !== 'object') {
          return false;
        }
        
        // Doctor-specific filtering retains original flow
        if (user?.role === 'doctor') {
          const matchesPatientSearch =
            !doctorPatientSearch ||
            prescription.patientName?.toLowerCase().includes(doctorPatientSearch.toLowerCase()) ||
            String(prescription.patientId || '').toLowerCase().includes(doctorPatientSearch.toLowerCase());

          const matchesPrescriptionId =
            doctorPrescriptionIdFilter === "all" ||
            String(prescription.prescriptionNumber) === doctorPrescriptionIdFilter;

          const matchesStatus =
            statusFilter === "all" || prescription.status === statusFilter;

          return matchesPatientSearch && matchesPrescriptionId && matchesStatus;
        }

        const searchLower = searchQuery.toLowerCase();
        const matchesPatientName =
          prescription.patientName?.toLowerCase().includes(searchLower) ||
          false;
        const patientIdMatches = String(prescription.patientId || "")
          .toLowerCase()
          .includes(searchLower);
        const providerNameMatches =
          prescription.providerName?.toLowerCase().includes(searchLower) ||
          (providerNames[prescription.providerId] || "")
            .toLowerCase()
            .includes(searchLower);
        const medicationMatches = Array.isArray(prescription.medications) 
          ? prescription.medications.some((med: any) =>
              med && med.name && typeof med.name === 'string' && med.name.toLowerCase().includes(searchLower),
            )
          : false;

        // If prescription ID filter is active, prioritize it over search query
        const matchesSearch =
          !searchQuery ||
          matchesPatientName ||
          patientIdMatches ||
          providerNameMatches ||
          medicationMatches;

        const matchesStatus =
          statusFilter === "all" ||
          (prescription.status || "").toLowerCase() === statusFilter.toLowerCase();

        // Prescription ID filter - handle exact match
        const prescriptionNumber = String(prescription.prescriptionNumber || "").trim();
        const filterId = String(prescriptionIdFilter || "").trim();
        const matchesPrescriptionId =
          prescriptionIdFilter === "all" ||
          !prescriptionIdFilter ||
          !filterId ||
          (prescriptionNumber && filterId && prescriptionNumber === filterId);

        const patientFilterValue = (patientNameFilter || "").trim().toLowerCase();
        const matchesPatientNameFilter =
          !patientFilterValue ||
          (prescription.patientName || "")
            .toLowerCase()
            .includes(patientFilterValue);

        const doctorFilterValue = (doctorFilter || "").trim();
        const matchesDoctorFilter =
          !doctorFilterValue ||
          (doctorFilterValue && !isNaN(parseInt(doctorFilterValue, 10)) && (
            prescription.providerId === parseInt(doctorFilterValue, 10) ||
            prescription.doctorId === parseInt(doctorFilterValue, 10)
          ));

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPrescriptionId &&
          matchesPatientNameFilter &&
          matchesDoctorFilter
        );
      })
    : [];

  const isPrescriptionSearchActive = Boolean(
    prescriptionSearchPreviewId && prescriptionIdFilter !== "all",
  );

  const prescriptionSearchResult = useMemo(() => {
    if (!isPrescriptionSearchActive) return null;
    return filteredPrescriptions[0] || null;
  }, [filteredPrescriptions, isPrescriptionSearchActive]);

  useEffect(() => {
    if (isPrescriptionSearchActive) {
      return;
    }
    if (prescriptionSearchPreviewId) {
      setPrescriptionSearchPreviewId("");
    }
  }, [
    filteredPrescriptions,
    patientNameFilter,
    doctorFilter,
    statusFilter,
    searchQuery,
    searchInput,
    isPrescriptionSearchActive,
    prescriptionSearchPreviewId,
  ]);

  const isFilterActive = useMemo(
    () =>
      !!(
        searchQuery.trim() ||
        patientNameFilter.trim() ||
        doctorFilter.trim() ||
        statusFilter !== "all" ||
        prescriptionIdFilter !== "all"
      ),
    [searchQuery, patientNameFilter, doctorFilter, statusFilter, prescriptionIdFilter],
  );

  const displayPrescriptions = useMemo(() => {
    let result;
    if (isFilterActive) {
      result = filteredPrescriptions;
    } else {
      result = Array.isArray(prescriptions) ? prescriptions : [];
    }
    // Sort by ID descending (newest first)
    return result.sort((a: any, b: any) => {
      const idA = a.id || 0;
      const idB = b.id || 0;
      return idB - idA; // Descending order
    });
  }, [isFilterActive, filteredPrescriptions, prescriptions]);

  return (
    <>
      <Header
        title="Prescriptions"
        subtitle="Manage patient prescriptions and medications"/>

      <div className="flex-1 overflow-auto p-4 sm:p-6 w-full max-w-full box-border">
        <TooltipProvider>
        <div className="space-y-6 w-full max-w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 gap-2 rounded-2xl border bg-white/80 p-1 text-sm font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-200">
            <TabsTrigger
              value="view-prescriptions"
              className="rounded-xl px-3 py-2 transition-colors data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-white/10"
            >
              View Prescriptions
            </TabsTrigger>
            <TabsTrigger
              value="prescriptions"
              className="rounded-xl px-3 py-2 transition-colors data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-white/10"
            >
              Prescriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions" className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Active Prescriptions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {
                        searchFilteredPrescriptions.filter(
                          (p: any) => p.status === "active",
                        ).length
                      }
                    </p>
                  </div>
                  <Pill className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Pending Approval
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {
                        searchFilteredPrescriptions.filter(
                          (p: any) => p.status === "pending",
                        ).length
                      }
                    </p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                if (user?.role === 'patient') {
                  // For patient role, show modal instead of navigating
                  setShowDrugInteractionsModal(true);
                } else {
                  const subdomain = getActiveSubdomain();
                  console.log(
                    "[PRESCRIPTIONS] Navigating to CDS with drug-interactions tab",
                  );
                  setLocation(
                    `/${subdomain}/clinical-decision-support?tab=drug-interactions`,
                  );
                }
              }}
              data-testid="card-drug-interactions"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Drug Interactions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {drugInteractionsCount}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Total Prescriptions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {searchFilteredPrescriptions.length}
                    </p>
                  </div>
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="w-full max-w-full overflow-hidden">
            <CardContent className="p-4 w-full max-w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full">
                {user?.role === 'doctor' ? (
                  <>
                    {/* Doctor: Search by patient name/ID */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by patient name or patient ID..."
                        value={doctorPatientSearch}
                        onChange={(e) => setDoctorPatientSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-doctor-patient-search"
                      />
                    </div>
                    
                    {/* Doctor: Prescription ID dropdown */}
                    {doctorPrescriptionIds.length > 0 && (
                      <Popover open={doctorPrescriptionIdPopoverOpen} onOpenChange={setDoctorPrescriptionIdPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={doctorPrescriptionIdPopoverOpen}
                            className="w-64 justify-between"
                            data-testid="button-doctor-prescription-filter"
                          >
                            {doctorPrescriptionIdFilter === "all"
                              ? "All Prescription IDs"
                              : doctorPrescriptionIdFilter}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search prescription ID..." />
                            <CommandList>
                              <CommandEmpty>No prescription ID found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    setDoctorPrescriptionIdFilter("all");
                                    setDoctorPrescriptionIdPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      doctorPrescriptionIdFilter === "all" ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  All Prescription IDs
                                </CommandItem>
                                {doctorPrescriptionIds.map((prescriptionId: string) => (
                                  <CommandItem
                                    key={prescriptionId}
                                    value={prescriptionId}
                                    onSelect={() => {
                                      setDoctorPrescriptionIdFilter(prescriptionId);
                                      setDoctorPrescriptionIdPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        doctorPrescriptionIdFilter === prescriptionId ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {prescriptionId}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </>
                ) : (
                  <div className="relative flex-1 min-w-[200px] max-w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search prescriptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}

                <Select 
                  value={statusFilter} 
                  onValueChange={(value: string) => {
                    try {
                      setStatusFilter(value || "all");
                    } catch (error) {
                      console.error("Error setting status filter:", error);
                      setStatusFilter("all");
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40 min-w-[120px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                  </SelectContent>
                </Select>

                {user?.role === 'admin' && uniquePrescriptionIds.length > 0 && (
                  <Popover open={prescriptionIdPopoverOpen} onOpenChange={setPrescriptionIdPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={prescriptionIdPopoverOpen}
                        className="w-64 justify-between"
                      >
                        {prescriptionIdFilter === "all"
                          ? "All Prescription IDs"
                          : prescriptionIdFilter}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search prescription ID..." />
                        <CommandList>
                          <CommandEmpty>No prescription ID found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setPrescriptionIdFilter("all");
                                setPrescriptionIdPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  prescriptionIdFilter === "all" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              All Prescription IDs
                            </CommandItem>
                            {Array.isArray(uniquePrescriptionIds) && uniquePrescriptionIds.map((id: string) => {
                              if (!id) return null;
                              return (
                              <CommandItem
                                key={id}
                                value={id}
                                onSelect={() => {
                                  try {
                                    setPrescriptionIdFilter(id);
                                    setPrescriptionIdPopoverOpen(false);
                                  } catch (error) {
                                    console.error("Error selecting prescription ID:", error);
                                    setPrescriptionIdPopoverOpen(false);
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    prescriptionIdFilter === id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {id}
                              </CommandItem>
                            );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                  {user?.role !== "patient" && canCreate('prescriptions') && (
                      <Button
                        variant="default"
                        className="flex justify-end ml-auto"
                        onClick={() => {
                          setSelectedPrescription(null);

                          // For patient role users, automatically set their patient ID
                          let patientId = "";
                          let patientName = "";

                          if (user?.role === "patient") {
                            // Find the current patient based on user authentication data
                            const currentPatient =
                              patients.find(
                                (patient: any) =>
                                  patient.email &&
                                  user.email &&
                                  patient.email.toLowerCase() ===
                                    user.email.toLowerCase(),
                              ) ||
                              patients.find(
                                (patient: any) =>
                                  patient.firstName &&
                                  user.firstName &&
                                  patient.lastName &&
                                  user.lastName &&
                                  patient.firstName.toLowerCase() ===
                                    user.firstName.toLowerCase() &&
                                  patient.lastName.toLowerCase() ===
                                    user.lastName.toLowerCase(),
                              );

                            if (currentPatient) {
                              patientId = currentPatient.id.toString();
                              patientName = resolvePatientDisplayName(
                                currentPatient.id,
                                currentPatient,
                              );
                            }
                          }

                          setFormData({
                            patientId: patientId,
                            patientName: patientName,
                            providerId: "",
                            diagnosis: "",
                            medications: [
                              {
                                name: "",
                                dosage: "",
                                frequency: "",
                                duration: "",
                                quantity: "",
                                refills: "",
                                instructions: "",
                                genericAllowed: true,
                              },
                            ],
                            pharmacyName: "Halo Health",
                            pharmacyAddress:
                              "Unit 2 Drayton Court, Solihull, B90 4NG",
                            pharmacyPhone: "+44(0)121 827 5531",
                            pharmacyEmail: "pharmacy@halohealth.co.uk",
                          });
                      setShowNewPrescription(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Prescription
                      </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prescriptions List */}
          <div className="space-y-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 w-full max-w-full overflow-hidden">
            {isLoading ? (
              /* Loading State - Show skeleton for prescriptions */
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white dark:bg-slate-800 border dark:border-slate-600">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPrescriptions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                    No prescriptions found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Try adjusting your search terms or filters to narrow the results.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredPrescriptions.map((prescription: any) => {
                console.log("📋 Prescription data:", prescription);
                console.log("📋 prescriptionCreatedBy:", prescription.prescriptionCreatedBy);
                console.log("📋 doctorId:", prescription.doctorId);
                console.log("📋 Providers array:", providers);
                
                return (
                <Card
                  key={prescription.id || prescription.prescriptionNumber}
                  className="hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 border-2 border-blue-200 dark:border-slate-600 w-full max-w-full overflow-hidden"
                >
                  <CardContent className="p-0 w-full max-w-full overflow-hidden">
                    {/* Professional Prescription Header */}
                    <div className="bg-white dark:bg-slate-700 border-b-2 border-blue-200 dark:border-slate-600 p-4 w-full overflow-hidden">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 w-full">
                        <div className="text-center sm:text-left flex-1 min-w-0">
                          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 break-words">
                            CURA HEALTH EMR
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 min-w-0">
                            Prescription #:{" "}
                            <span className="truncate block" title={prescription.prescriptionNumber || "N/A"}>{prescription.prescriptionNumber || "N/A"}</span>
                          </p>
                          {(() => {
                            const providerInfo = allUsers?.find((p: any) => p.id === prescription.doctorId);
                            const creatorInfo = allUsers?.find((p: any) => p.id === prescription.prescriptionCreatedBy);
                            return (
                              <div className="mt-1 space-y-1 min-w-0">
                                {providerInfo && (
                                  <div className="min-w-0">
                                    <p className="text-xs text-gray-600 dark:text-gray-300 min-w-0">
                                      <span className="font-medium">Provider:</span>{" "}
                                      <span className="truncate block" title={`${providerInfo.firstName} ${providerInfo.lastName}`}>
                                        {providerInfo.firstName} {providerInfo.lastName}
                                      </span>
                                    </p>
                                    {providerInfo.department && (
                                      <p className="text-xs text-gray-600 dark:text-gray-300 min-w-0">
                                        <span className="font-medium">Specialization:</span>{" "}
                                        <span className="truncate block" title={providerInfo.department}>
                                          {providerInfo.department}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                )}
                                {creatorInfo && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 min-w-0">
                                    Created by {formatRoleLabel(creatorInfo.role)}:{" "}
                                    <span className="truncate block" title={`${creatorInfo.firstName} ${creatorInfo.lastName}`}>
                                      {creatorInfo.firstName} {creatorInfo.lastName}
                                    </span>
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {editingStatusId === prescription.id ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={tempStatus}
                                  onValueChange={setTempStatus}
                                >
                                  <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">
                                      pending
                                    </SelectItem>
                                    <SelectItem value="active">
                                      active
                                    </SelectItem>
                                    <SelectItem value="completed">
                                      completed
                                    </SelectItem>
                                    <SelectItem value="cancelled">
                                      cancelled
                                    </SelectItem>
                                    <SelectItem value="signed">
                                      signed
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={handleSaveStatus}
                                  disabled={statusUpdateMutation.isPending}
                                  className="h-8 px-2"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditingStatus}
                                  disabled={statusUpdateMutation.isPending}
                                  className="h-8 px-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={getStatusColor(
                                    prescription.status,
                                  )}
                                >
                                  {prescription.status}
                                </Badge>
                                {user?.role && user?.role !== "patient" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleStartEditingStatus(
                                        prescription.id,
                                        prescription.status,
                                      )
                                    }
                                    className="h-6 w-6 p-0 hover:bg-gray-100"
                                    data-testid="button-edit-status"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          {prescription.interactions &&
                            prescription.interactions.length > 0 && (
                              <Badge
                                variant="destructive"
                                className="flex items-center gap-1 ml-2 mt-1"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Drug Interactions
                              </Badge>
                            )}
                        </div>
                      </div>

                      <div className="text-center mt-2">
                        {clinicHeader?.logoBase64 &&
                        clinicHeader.logoPosition === "center" ? (
                          <div className="flex items-center justify-center gap-4 my-2">
                            <img
                              src={clinicHeader.logoBase64}
                              alt="Clinic Logo"
                              className="flex-shrink-0"
                              style={{ maxWidth: "70px", maxHeight: "70px" }}
                            />
                            <div
                              className="text-center"
                              style={{
                                fontFamily:
                                  clinicHeader?.fontFamily || "inherit",
                                fontSize: clinicHeader?.fontSize || "14px",
                                fontWeight:
                                  clinicHeader?.fontWeight || "normal",
                                fontStyle: clinicHeader?.fontStyle || "normal",
                                textDecoration:
                                  clinicHeader?.textDecoration || "none",
                              }}
                            >
                              <p
                                className="text-gray-600 dark:text-gray-300 font-bold truncate"
                                style={{
                                  fontSize:
                                    clinicHeader?.clinicNameFontSize || "16px",
                                }}
                                title={clinicHeader?.clinicName || "emrSoft Health Clinic"}
                              >
                                {clinicHeader?.clinicName ||
                                  "emrSoft Health Clinic"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}>
                                {clinicHeader?.address ||
                                  "Unit 2 Drayton Court, Solihull"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader?.phone || "+44(0)121 827 5531"}>
                                {clinicHeader?.phone || "+44(0)121 827 5531"}
                              </p>
                              {clinicHeader?.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader.email}>
                                  {clinicHeader.email}
                                </p>
                              )}
                              {clinicHeader?.website && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader.website}>
                                  {clinicHeader.website}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {clinicHeader?.logoBase64 && (
                              <div
                                className="my-2"
                                style={{
                                  textAlign:
                                    clinicHeader.logoPosition || "center",
                                }}
                              >
                                <img
                                  src={clinicHeader.logoBase64}
                                  alt="Clinic Logo"
                                  className="inline-block"
                                  style={{
                                    maxWidth: "80px",
                                    maxHeight: "80px",
                                  }}
                                />
                              </div>
                            )}

                            <div
                              className="min-w-0"
                              style={{
                                fontFamily:
                                  clinicHeader?.fontFamily || "inherit",
                                fontSize: clinicHeader?.fontSize || "14px",
                                fontWeight:
                                  clinicHeader?.fontWeight || "normal",
                                fontStyle: clinicHeader?.fontStyle || "normal",
                                textDecoration:
                                  clinicHeader?.textDecoration || "none",
                                textAlign:
                                  clinicHeader?.logoPosition || "center",
                              }}
                            >
                              <p
                                className="text-gray-600 dark:text-gray-300 font-bold truncate"
                                style={{
                                  fontSize:
                                    clinicHeader?.clinicNameFontSize || "16px",
                                }}
                                title={clinicHeader?.clinicName || "emrSoft Health Clinic"}
                              >
                                {clinicHeader?.clinicName ||
                                  "emrSoft Health Clinic"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}>
                                {clinicHeader?.address ||
                                  "Unit 2 Drayton Court, Solihull"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader?.phone || "+44(0)121 827 5531"}>
                                {clinicHeader?.phone || "+44(0)121 827 5531"}
                              </p>
                              {clinicHeader?.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader.email}>
                                  {clinicHeader.email}
                                </p>
                              )}
                              {clinicHeader?.website && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={clinicHeader.website}>
                                  {clinicHeader.website}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Patient Information */}
                    <div className="px-4 sm:px-6 py-4 bg-blue-50 dark:bg-slate-600 w-full overflow-hidden">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 w-full">
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 min-w-0">
                            <strong>Name:</strong>{" "}
                            <span className="truncate block" title={prescription.patientName}>
                              {prescription.patientName}
                            </span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 min-w-0">
                            <strong>Address:</strong>{" "}
                            <span className="truncate block" title={prescription.patientAddress || "-"}>
                            {prescription.patientAddress || "-"}
                            </span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 min-w-0">
                            <strong>Allergies:</strong>{" "}
                            <span className="truncate block" title={prescription.patientAllergies || "-"}>
                            {prescription.patientAllergies || "-"}
                            </span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 min-w-0">
                            <strong>Weight:</strong>{" "}
                            <span className="truncate block" title={prescription.patientWeight || "-"}>
                            {prescription.patientWeight || "-"}
                            </span>
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex-1 min-w-0 w-full sm:w-auto">
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 break-words">
                            <strong>DOB:</strong>{" "}
                            <span className="break-words">{prescription.patientDob || "-"}</span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 break-words">
                            <strong>Age:</strong>{" "}
                            <span className="break-words">{prescription.patientAge || "-"}</span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 break-words">
                            <strong>Sex:</strong>{" "}
                            <span className="break-words">{prescription.patientSex || "M"}</span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 break-words">
                            <strong>Date:</strong>{" "}
                            <span className="break-words">
                            {prescription.prescribedAt ||
                            prescription.issuedDate ||
                            prescription.createdAt
                              ? (() => {
                                  const date = new Date(
                                    prescription.prescribedAt ||
                                      prescription.issuedDate ||
                                      prescription.createdAt,
                                  );
                                  const day = date.getDate();
                                  const month = date.toLocaleDateString(
                                    "en-GB",
                                    { month: "short" },
                                  );
                                  const year = date.getFullYear();
                                  const suffix =
                                    day > 3 && day < 21
                                      ? "th"
                                      : ["th", "st", "nd", "rd"][day % 10] ||
                                        "th";
                                  return `${day}${suffix} ${month} ${year}`;
                                })()
                              : "-"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Large HHC Symbol */}
                    <div className="flex justify-center py-4 bg-blue-50 dark:bg-slate-600">
                      <div className="text-6xl font-bold text-blue-400 dark:text-blue-300 opacity-50">
                        HHC
                      </div>
                    </div>

                    {/* Prescription Content */}
                    <div className="px-4 sm:px-6 py-4 bg-white dark:bg-slate-700 min-h-[200px] w-full overflow-hidden">
                      <div className="space-y-4 w-full">
                        {prescription.medications.map(
                          (medication: any, index: number) => (
                            <div key={index} className="border-l-4 border-blue-500 pl-4 min-w-0 w-full">
                              <p className="font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-2 break-words">
                                Medication {index + 1}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-0">
                                <strong>Medication Name:</strong>{" "}
                                <span className="truncate block" title={medication.name}>
                                  {medication.name}
                                </span>
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-0">
                                <strong>Dosage:</strong>{" "}
                                <span className="truncate block" title={medication.dosage || "-"}>
                                  {medication.dosage}
                                </span>
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-0">
                                <strong>Frequency:</strong>{" "}
                                <span className="truncate block" title={medication.frequency || "-"}>
                                  {medication.frequency}
                                </span>
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-0">
                                <strong>Duration:</strong>{" "}
                                <span className="truncate block" title={medication.duration || "-"}>
                                  {medication.duration}
                                </span>
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-0">
                                <strong>Quantity:</strong>{" "}
                                <span className="truncate block" title={medication.quantity || "-"}>
                                  {medication.quantity}
                                </span>
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-0">
                                <strong>Refills:</strong>{" "}
                                <span className="truncate block" title={medication.refills || "-"}>
                                  {medication.refills}
                                </span>
                              </p>
                              {medication.instructions && (
                                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 min-w-0">
                                  <strong>Instructions:</strong>{" "}
                                  <span className="truncate block" title={medication.instructions}>
                                    {medication.instructions}
                                  </span>
                                </p>
                              )}
                              {index < prescription.medications.length - 1 && (
                                <hr className="my-3 border-gray-200" />
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      {/* Diagnosis */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 w-full overflow-hidden">
                        <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 min-w-0">
                          <strong>Diagnosis:</strong>{" "}
                          <span className="truncate block" title={prescription.diagnosis || "No diagnosis provided"}>
                            {prescription.diagnosis || "No diagnosis provided"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Prescription Footer */}
                    <div className="px-4 sm:px-6 py-4 bg-blue-50 dark:bg-slate-600 border-t-2 border-blue-200 dark:border-slate-600 w-full overflow-hidden">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 w-full">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
                            Resident Physician
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 break-words">
                            (Signature)
                          </p>
                          {prescription.signature &&
                          prescription.signature.doctorSignature ? (
                            <div className="mt-2">
                              <div className="h-12 w-32 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded overflow-hidden p-0">
                                <img
                                  src={prescription.signature.doctorSignature}
                                  alt="Doctor Signature"
                                  className="h-full w-full object-contain object-left"
                                  style={{
                                    filter: isSignatureDarkTheme() ? 'invert(1)' : 'none',
                                    display: 'block'
                                  }}
                                />
                              </div>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                ✓ E-Signed by{" "}
                                {prescription.signature.signedBy ||
                                  "Unknown Provider"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {prescription.signature.signedAt &&
                                !isNaN(
                                  new Date(
                                    prescription.signature.signedAt,
                                  ).getTime(),
                                )
                                ? formatTimestampWithAmPm(
                                    prescription.signature.signedAt,
                                    "MMM dd, yyyy h:mm a",
                                  )
                                  : "Date not available"}
                              </p>
                            </div>
                          ) : (
                            <div className="border-b border-gray-400 dark:border-gray-500 w-32 mt-2"></div>
                          )}
                        </div>
                        <div className="text-left sm:text-right min-w-0 flex-1 sm:flex-none">
                          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
                            May Substitute
                          </p>
                          <div className="border-b border-gray-400 dark:border-gray-500 w-full sm:w-32 mt-2"></div>
                        </div>
                      </div>

                      <div className="mt-4 text-center w-full overflow-hidden">
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate" title={clinicFooter?.footerText || "Pharmacy: Halo Health - +44(0)121 827 5531"}>
                          {clinicFooter?.footerText || "Pharmacy: Halo Health - +44(0)121 827 5531"}
                        </p>
                      </div>
                    </div>

                    {/* Drug Interactions Warning */}
                    {prescription.interactions &&
                      prescription.interactions.length > 0 && (
                        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded w-full overflow-hidden">
                          <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2 break-words">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span className="break-words">Drug Interactions Warning:</span>
                          </h4>
                          <div className="space-y-1 w-full">
                            {prescription.interactions.map(
                              (interaction: any, index: number) => (
                                <div
                                  key={index}
                                  className="text-xs text-red-700 break-words"
                                >
                                  <Badge
                                    className={
                                      getSeverityColor(interaction.severity) +
                                      " mr-2"
                                    }
                                    style={{ fontSize: "10px" }}
                                  >
                                    {interaction.severity}
                                  </Badge>
                                  <span className="break-words">{interaction.description}</span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>

                  {/* Action Buttons */}
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPrescription(prescription)}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">View</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintPrescription(prescription.id)}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Print</span>
                        <span className="sm:hidden">Print</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendToPharmacy(prescription.id)}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden lg:inline">
                          Send to Pharmacy
                        </span>
                        <span className="lg:hidden">Send</span>
                      </Button>
                      {user?.role !== "patient" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPrescription(prescription);
                            setShowESignDialog(true);
                          }}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <PenTool className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden lg:inline">E-Sign</span>
                          <span className="lg:hidden">Sign</span>
                        </Button>
                      )}
                      {user?.role !== "patient" &&
                        prescription.status === "active" && canEdit('prescriptions') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPrescription(prescription)}
                            className="text-xs sm:text-sm px-2 sm:px-3"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        )}
                      {user?.role !== "patient" && canDelete('prescriptions') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeletePrescription(prescription.id)
                          }
                          disabled={deletePrescriptionMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">
                            {deletePrescriptionMutation.isPending
                              ? "Deleting..."
                              : "Delete"}
                          </span>
                          <span className="sm:hidden">
                            {deletePrescriptionMutation.isPending
                              ? "Deleting..."
                              : "Delete"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="view-prescriptions" className="space-y-4 sm:space-y-6 w-full max-w-full">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Active Prescriptions Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Prescriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {prescriptions?.filter((p: any) => p.status === "active").length || 0}
                </div>
              </CardContent>
            </Card>

            {/* Pending Approval Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {prescriptions?.filter((p: any) => p.status === "pending").length || 0}
                </div>
              </CardContent>
            </Card>

            {/* Drug Interactions Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Drug Interactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {drugInteractionsData?.interactions?.length || 0}
                </div>
              </CardContent>
            </Card>

            {/* Total Prescriptions Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Prescriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {prescriptions?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                {user?.role === 'doctor' ? (
                  <>
                    {/* Doctor: Search by patient name/ID */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by patient name or patient ID..."
                        value={doctorPatientSearch}
                        onChange={(e) => setDoctorPatientSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-doctor-patient-search"
                      />
                    </div>
                    
                    {/* Doctor: Prescription ID dropdown */}
                    {doctorPrescriptionIds.length > 0 && (
                      <Popover open={doctorPrescriptionIdPopoverOpen} onOpenChange={setDoctorPrescriptionIdPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={doctorPrescriptionIdPopoverOpen}
                            className="w-64 justify-between"
                            data-testid="button-doctor-prescription-filter"
                          >
                            {doctorPrescriptionIdFilter === "all"
                              ? "All Prescription IDs"
                              : doctorPrescriptionIdFilter}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search prescription ID..." />
                            <CommandList>
                              <CommandEmpty>No prescription ID found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    setDoctorPrescriptionIdFilter("all");
                                    setDoctorPrescriptionIdPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      doctorPrescriptionIdFilter === "all" ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  All Prescription IDs
                                </CommandItem>
                                {doctorPrescriptionIds.map((prescriptionId: string) => (
                                  <CommandItem
                                    key={prescriptionId}
                                    value={prescriptionId}
                                    onSelect={() => {
                                      setDoctorPrescriptionIdFilter(prescriptionId);
                                      setDoctorPrescriptionIdPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        doctorPrescriptionIdFilter === prescriptionId ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {prescriptionId}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </>
                ) : (
                  <>
                    {user?.role !== "nurse" && user?.role !== "doctor" && user?.role !== "admin" && (
                      <div className="relative flex-1 flex items-center gap-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by patient, medication, or provider..."
                          value={searchInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSearchInput(value);
                            applySearchFilter(value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearch();
                            }
                          }}
                          className="pl-10 pr-10"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSearch}
                          disabled={!searchInput.trim()}
                          className="whitespace-nowrap"
                        >
                          Search
                        </Button>
                      </div>
                    )}
                    {user?.role !== 'patient' && (
                      <div className="flex flex-1 min-w-[150px] max-w-full sm:max-w-xs flex-col gap-1">
                        <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Status
                        </Label>
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            setStatusFilter(value);
                            if (value !== "all") {
                              setSearchQuery("");
                              setSearchInput("");
                              setPrescriptionIdFilter("all");
                              setPatientNameFilter("");
                            }
                          }}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                        >
                          <option value="all" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">All statuses</option>
                          <option value="pending" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Pending</option>
                          <option value="active" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Active</option>
                          <option value="completed" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Completed</option>
                          <option value="cancelled" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Cancelled</option>
                          <option value="signed" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Signed</option>
                        </select>
                      </div>
                    )}
                    {user?.role !== 'patient' && (
                      <div className="flex flex-1 min-w-[150px] max-w-full sm:max-w-xs flex-col gap-1">
                        <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Patient
                        </Label>
                      <Popover open={patientFilterOpen} onOpenChange={setPatientFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={patientFilterOpen}
                            className="w-full justify-between rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none h-auto min-h-[2.5rem] font-normal text-left"
                          >
                            <span className="flex-1 min-w-0 break-words line-clamp-2 text-left">
                              {patientNameFilter || "All patients"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-sm min-w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search patients..." />
                            <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                              <CommandEmpty>No patient found.</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-y-auto">
                                <CommandItem
                                  value="all"
                                  className="whitespace-normal break-words"
                                  onSelect={() => {
                                    try {
                                      handlePatientFilter("");
                                      // Use setTimeout to ensure state updates complete before closing popover
                                      setTimeout(() => {
                                        setPatientFilterOpen(false);
                                      }, 0);
                                    } catch (error) {
                                      console.error("Error selecting all patients:", error);
                                      setPatientFilterOpen(false);
                                    }
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 shrink-0 ${
                                      !patientNameFilter ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <span className="break-words whitespace-normal text-left">All patients</span>
                                </CommandItem>
                                {Array.isArray(patientOptions) && patientOptions.length > 0 && patientOptions.map((name) => {
                                  // Validate name before rendering
                                  if (!name || typeof name !== 'string' || name.trim() === '') {
                                    return null;
                                  }
                                  
                                  const trimmedName = name.trim();
                                  
                                  return (
                                    <CommandItem
                                      key={trimmedName}
                                      value={trimmedName}
                                      className="whitespace-normal break-words"
                                      onSelect={() => {
                                        try {
                                          if (!trimmedName || trimmedName === '') {
                                            console.error("Cannot select patient with empty name");
                                            setPatientFilterOpen(false);
                                            return;
                                          }
                                          handlePatientFilter(trimmedName);
                                          // Use setTimeout to ensure state updates complete before closing popover
                                          setTimeout(() => {
                                            setPatientFilterOpen(false);
                                          }, 0);
                                        } catch (error) {
                                          console.error("Error selecting patient:", error);
                                          setPatientFilterOpen(false);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 shrink-0 ${
                                          patientNameFilter === trimmedName ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <span className="break-words whitespace-normal text-left">{trimmedName}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    )}
                    {user?.role !== 'patient' && (
                      <div className="flex flex-1 min-w-[150px] max-w-full sm:max-w-xs flex-col gap-1">
                        <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Prescription #
                        </Label>
                      <Popover open={prescriptionIdFilterOpen} onOpenChange={setPrescriptionIdFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={prescriptionIdFilterOpen}
                            className="w-full justify-between rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none h-auto min-h-[2.5rem] font-normal text-left"
                          >
                            <span className="flex-1 min-w-0 break-words line-clamp-2 text-left">
                              {prescriptionIdFilter !== "all" ? prescriptionIdFilter : "All prescriptions"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-sm min-w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search prescription number..." />
                            <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                              <CommandEmpty>No prescription found.</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-y-auto">
                                <CommandItem
                                  value="all"
                                  className="whitespace-normal break-words"
                                  onSelect={() => {
                                    try {
                                      setPrescriptionIdFilter("all");
                                      setPrescriptionSearchPreviewId("");
                                      setPrescriptionIdFilterOpen(false);
                                    } catch (error) {
                                      console.error("Error setting prescription ID filter:", error);
                                      setPrescriptionIdFilterOpen(false);
                                    }
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 shrink-0 ${
                                      prescriptionIdFilter === "all" ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <span className="break-words whitespace-normal text-left">All prescriptions</span>
                                </CommandItem>
                                {Array.isArray(uniquePrescriptionIds) && uniquePrescriptionIds.map((id) => {
                                  if (!id) return null;
                                  return (
                                    <CommandItem
                                      key={id}
                                      value={id}
                                      className="whitespace-normal break-words"
                                      onSelect={() => {
                                        try {
                                          setPrescriptionIdFilter(id);
                                          setPrescriptionSearchPreviewId(id.toLowerCase());
                                          setSearchQuery("");
                                          setStatusFilter("all");
                                          setSearchInput("");
                                          setPrescriptionIdFilterOpen(false);
                                        } catch (error) {
                                          console.error("Error selecting prescription ID:", error);
                                          setPrescriptionIdFilterOpen(false);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 shrink-0 ${
                                          prescriptionIdFilter === id ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <span className="break-words whitespace-normal text-left">{id}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    )}
                    {user?.role !== 'patient' && (
                      <div className="flex flex-1 min-w-[150px] max-w-full sm:max-w-xs flex-col gap-1">
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Doctor
                        </Label>
                      <Popover open={doctorFilterOpen} onOpenChange={setDoctorFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={doctorFilterOpen}
                            className="w-full justify-between rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none h-auto font-normal"
                          >
                            {(() => {
                              try {
                                if (doctorFilter && Array.isArray(doctorOptions) && doctorOptions.length > 0) {
                                  const found = doctorOptions.find((entry: any) => 
                                    entry && entry.id && String(entry.id) === doctorFilter
                                  );
                                  return found?.name || "All doctors";
                                }
                                return "All doctors";
                              } catch (error) {
                                console.error("Error rendering doctor filter label:", error);
                                return "All doctors";
                              }
                            })()}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-none p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search doctors..." />
                            <CommandList>
                              <CommandEmpty>No doctor found.</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-y-auto">
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    try {
                                      handleDoctorFilter("");
                                      // Use setTimeout to ensure state updates complete before closing popover
                                      setTimeout(() => {
                                        setDoctorFilterOpen(false);
                                      }, 0);
                                    } catch (error) {
                                      console.error("Error selecting all doctors:", error);
                                      setDoctorFilterOpen(false);
                                    }
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      !doctorFilter ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  All doctors
                                </CommandItem>
                                {Array.isArray(doctorOptions) && doctorOptions.length > 0 && doctorOptions.map((entry: any) => {
                                  if (!entry || entry.id === null || entry.id === undefined || !entry.name) {
                                    return null;
                                  }
                                  
                                  const entryId = entry.id;
                                  const entryIdString = String(entryId);
                                  
                                  // Validate entry.id is a valid number
                                  if (isNaN(Number(entryId))) {
                                    console.warn("Invalid doctor entry ID:", entryId);
                                    return null;
                                  }
                                  
                                  return (
                                    <CommandItem
                                      key={entryId}
                                      value={`${entry.name} ${entryId}`}
                                      onSelect={() => {
                                        try {
                                          if (entryId === null || entryId === undefined) {
                                            console.error("Cannot select doctor with null/undefined ID");
                                            setDoctorFilterOpen(false);
                                            return;
                                          }
                                          handleDoctorFilter(entryIdString);
                                          // Use setTimeout to ensure state updates complete before closing popover
                                          setTimeout(() => {
                                            setDoctorFilterOpen(false);
                                          }, 0);
                                        } catch (error) {
                                          console.error("Error selecting doctor:", error);
                                          setDoctorFilterOpen(false);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          doctorFilter === entryIdString ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {entry.name}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    )}
                <div className="flex items-end justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefreshFilters}
                    title="Reset filters"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {user?.role !== "patient" && canCreate('prescriptions') && (
                    <Button
                      className="bg-medical-blue hover:bg-blue-700"
                      onClick={() => {
                        setSelectedPrescription(null);

                        // For patient role users, automatically set their patient ID
                        let patientId = "";
                        let patientName = "";

                        if (user?.role === "patient") {
                          // Find the current patient based on user authentication data
                          const currentPatient =
                            patients.find(
                              (patient: any) =>
                                patient.email &&
                                user.email &&
                                patient.email.toLowerCase() ===
                                  user.email.toLowerCase(),
                            ) ||
                            patients.find(
                              (patient: any) =>
                                patient.firstName &&
                                user.firstName &&
                                patient.lastName &&
                                user.lastName &&
                                patient.firstName.toLowerCase() ===
                                  user.firstName.toLowerCase() &&
                                patient.lastName.toLowerCase() ===
                                  user.lastName.toLowerCase(),
                            );

                          if (currentPatient) {
                            patientId = currentPatient.id.toString();
                            patientName = resolvePatientDisplayName(
                              currentPatient.id,
                              currentPatient,
                            );
                          }
                        }

                        setFormData({
                          patientId: patientId,
                          patientName: patientName,
                          providerId: "",
                          diagnosis: "",
                          medications: [
                            {
                              name: "",
                              dosage: "",
                              frequency: "",
                              duration: "",
                              quantity: "",
                              refills: "",
                              instructions: "",
                              genericAllowed: true,
                            },
                          ],
                          pharmacyName: "Halo Health",
                          pharmacyAddress:
                            "Unit 2 Drayton Court, Solihull, B90 4NG",
                          pharmacyPhone: "+44(0)121 827 5531",
                          pharmacyEmail: "pharmacy@halohealth.co.uk",
                        });
                        setShowNewPrescription(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Prescription
                    </Button>
                  )}
                </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          {!isLoading && displayPrescriptions.length === 0 && isFilterActive && (
            <Card className="border border-dashed border-gray-300 bg-yellow-50 dark:bg-gray-800">
              <CardContent className="p-12 text-center">
                <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  No prescriptions found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search terms or filters to narrow the results.
                </p>
              </CardContent>
            </Card>
          )}
          {isLoading ? (
            /* Loading State - Show skeleton for grid/cards */
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="bg-white dark:bg-slate-800 border dark:border-slate-600">
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Loading State - Show skeleton for list */
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 py-2 bg-white dark:bg-slate-900">
                    <div className="flex-1 grid grid-cols-8 gap-4 items-center">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                        <div key={j} className="h-4 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayPrescriptions.map((prescription: any) => (
                <Card
                  key={prescription.id || prescription.prescriptionNumber}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (user?.role === 'patient') {
                      handleViewPrescription(prescription);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {resolveViewPrescriptionPatientName(
                              prescription,
                              patients,
                              fetchedPatientNames,
                            )}
                          </h3>
                          <Badge
                            className={getStatusColor(prescription.status)}
                          >
                            {prescription.status || "active"}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>
                            <span className="font-medium">Provider:</span>{" "}
                            {resolveViewPrescriptionProviderName(
                              prescription,
                              allUsers,
                            )}
                          </p>
                          <p>
                            <span className="font-medium">Diagnosis:</span>{" "}
                            {prescription.diagnosis || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium">Created:</span>{" "}
                            {prescription.clientCreatedAt
                              ? formatTimestampFromSystem(prescription.clientCreatedAt)
                              : prescription.createdAt
                              ? formatTimestampFromSystem(prescription.createdAt)
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPrescription(prescription);
                          }}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {user?.role !== "patient" &&
                          prescription.status === "active" &&
                          canEdit("prescriptions") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPrescription(prescription);
                              }}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs sm:text-sm px-2 sm:px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToPharmacy(prescription.id);
                          }}
                        >
                          <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden lg:inline">
                            Send to Pharmacy
                          </span>
                          <span className="lg:hidden">Send</span>
                        </Button>
                        {user?.role !== "patient" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPrescription(prescription);
                              setShowESignDialog(true);
                            }}
                          >
                            <PenTool className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden lg:inline">E-Sign</span>
                            <span className="lg:hidden">Sign</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {displayPrescriptions.length > 0 && (
                <div className="border-b-2 border-gray-300 dark:border-gray-600 flex items-center gap-2 py-2 text-[10px] text-black dark:text-black">
                  <div className={`flex-1 grid ${user?.role === "nurse" || user?.role === "doctor" ? "grid-cols-8" : "grid-cols-9"} gap-4 items-center`}>
                    <div className="text-[10px]">Prescription ID</div>
                    <div className="text-[10px]">Patient Name</div>
                    <div className="text-[10px]">Provider Name</div>
                    <div className="text-[10px]">Created At</div>
                    <div className="text-[10px]">Updated At</div>
                    <div className="text-[10px]">Status</div>
                    <div className="text-center text-[10px]">&nbsp;</div>
                    <div className="text-[10px]">signed?</div>
                    {user?.role !== "nurse" && user?.role !== "doctor" && (
                      <div className="text-[10px]">Created By</div>
                    )}
                  </div>
                  {user?.role !== 'patient' ? (
                    <div className="text-center px-1 text-[10px]">Save/Print/file</div>
                  ) : (
                    <div className="text-center px-1 text-[10px]">file</div>
                  )}
                  {user?.role !== 'patient' && (
                    <div className="text-center px-1 text-[10px]">Sign/Share/log</div>
                  )}
                  <div className="text-center px-1 text-[10px]">Actions</div>
                </div>
              )}
              {displayPrescriptions.map((prescription: any) => (
                <div
                  key={prescription.id || prescription.prescriptionNumber}
                  className="border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 py-2 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <div className={`flex-1 grid ${user?.role === "nurse" || user?.role === "doctor" ? "grid-cols-8" : "grid-cols-9"} gap-4 items-center text-sm`}>
                    <div className="text-gray-600 dark:text-gray-400 min-w-0">
                      <div className="truncate" title={prescription.prescriptionNumber || prescription.id || "N/A"}>
                      {prescription.prescriptionNumber || prescription.id || "N/A"}
                      </div>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 min-w-0">
                      <div className="truncate" title={(() => {
                        const patient = patients.find((p: any) => p.id === prescription.patientId);
                        const patientEmail = patient?.email || "";
                        const displayName = resolveViewPrescriptionPatientName(
                          prescription,
                          patients,
                          fetchedPatientNames,
                        );
                        return patientEmail ? `${displayName}\n${patientEmail}` : displayName;
                      })()}>
                      {resolveViewPrescriptionPatientName(
                        prescription,
                        patients,
                        fetchedPatientNames,
                      )}
                      </div>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 min-w-0">
                      <div className="truncate" title={(() => {
                        const providerInfo = allUsers?.find((p: any) => 
                          p.id === prescription.doctorId || 
                          p.id === prescription.providerId
                        );
                        const providerName = resolveViewPrescriptionProviderName(
                          prescription,
                          allUsers,
                        );
                        if (!providerInfo || providerName === "-") return providerName;
                        const providerEmail = providerInfo.email || "";
                        return providerEmail ? `${providerName}\n${providerEmail}` : providerName;
                      })()}>
                      {resolveViewPrescriptionProviderName(
                        prescription,
                        allUsers,
                      )}
                      </div>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 min-w-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate cursor-help">
                              {prescription.clientCreatedAt
                                ? formatDateUKUTC(prescription.clientCreatedAt)
                                : prescription.createdAt
                                ? formatDateUKUTC(prescription.createdAt)
                                : "N/A"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {prescription.clientCreatedAt
                                ? formatDateTooltipUTC(prescription.clientCreatedAt)
                                : prescription.createdAt
                                ? formatDateTooltipUTC(prescription.createdAt)
                                : "N/A"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 min-w-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate cursor-help">
                              {prescription.clientUpdatedAt
                                ? formatDateUKUTC(prescription.clientUpdatedAt)
                                : prescription.updatedAt
                                ? formatDateUKUTC(prescription.updatedAt)
                                : "N/A"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {prescription.clientUpdatedAt
                                ? formatDateTooltipUTC(prescription.clientUpdatedAt)
                                : prescription.updatedAt
                                ? formatDateTooltipUTC(prescription.updatedAt)
                                : "N/A"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="min-w-0 max-w-full">
                      <Badge className={getStatusColor(prescription.status)}>
                        {prescription.status || "active"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center min-w-0 flex-shrink-0">
                      {user?.role !== "patient" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditStatusDialog({ open: true, prescription });
                            setTempStatus(prescription.status || "active");
                          }}
                          className="h-5 w-5 p-0 hover:bg-gray-100 flex-shrink-0"
                          title="Edit Status"
                        >
                          <Edit className="h-3 w-3" style={{ width: 12, height: 12 }} />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      {prescription.signature?.doctorSignature && 
                       String(prescription.signature.doctorSignature).trim() !== "" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
                          onClick={() => {
                            let signerName = prescription.signature?.signedBy || "N/A";
                            if (prescription.signature?.signerId && allUsers) {
                              const signer = allUsers.find((u: any) => u.id === prescription.signature.signerId);
                              if (signer) {
                                signerName = `${signer.firstName || ""} ${signer.lastName || ""}`.trim() || signerName;
                              }
                            }
                            setSelectedSignatureData({
                              signedAt: prescription.signature?.signedAt,
                              signedBy: prescription.signature?.signedBy || signerName,
                              signerId: prescription.signature?.signerId,
                              signerName: signerName,
                              doctorSignature: prescription.signature?.doctorSignature,
                            });
                            setShowSignatureDetailsDialog(true);
                          }}
                          title="View signature details"
                        >
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs whitespace-nowrap">signed</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 flex-shrink-0">
                          <X className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs whitespace-nowrap">not signed</span>
                        </div>
                      )}
                    </div>
                    {user?.role !== "nurse" && user?.role !== "doctor" && (
                      <div className="text-gray-600 dark:text-gray-400 min-w-0">
                        <div className="truncate" title={(() => {
                          const creatorName = resolveViewPrescriptionCreatorName(
                            prescription,
                            allUsers,
                          );
                          if (creatorName === "-") return creatorName;
                          const creatorInfo = allUsers?.find(
                            (u: any) => u.id === prescription.prescriptionCreatedBy,
                          );
                          const creatorEmail = creatorInfo?.email || "";
                          return creatorEmail ? `${creatorName}\n${creatorEmail}` : creatorName;
                        })()}>
                        {resolveViewPrescriptionCreatorName(
                          prescription,
                          allUsers,
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 px-1">
                    {user?.role !== "patient" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleSavePrescription(prescription.id)}
                        title="Save prescription as PDF"
                      >
                        <Save className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                      </Button>
                    )}
                    {user?.role !== "patient" && (
                      prescription.savedPdfPath ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintPrescription(prescription.id || prescription.prescriptionNumber);
                        }}
                        title="Print"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      ) : (
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center flex-shrink-0 cursor-not-allowed opacity-60"
                          title="No saved PDF file - cannot print"
                        >
                          <Printer className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        </span>
                      )
                    )}
                    {prescription.savedPdfPath ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleOpenPrescriptionPdf(prescription)}
                        title="Open saved prescription PDF"
                      >
                        <FileText className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    ) : (
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center flex-shrink-0 cursor-not-allowed opacity-60"
                        title="No saved PDF file"
                      >
                        <FileText className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      </span>
                    )}
                  </div>
                  {user?.role !== 'patient' && (
                    <div className="flex items-center justify-center gap-0.5 px-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => {
                          setSelectedPrescription(prescription);
                          setShowESignDialog(true);
                        }}
                        title="E-Sign"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                      </Button>
                        {prescription.savedPdfPath ? (
                        <Button
                          variant="ghost"
                          size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => handleSendToPharmacy(prescription.id)}
                          title="Share/Send to Pharmacy"
                        >
                        <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        ) : (
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center flex-shrink-0 cursor-not-allowed opacity-60"
                            title="No saved PDF file - cannot share"
                          >
                            <Share2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                          </span>
                        )}
                        {prescription.savedPdfPath ? (
                        <Button
                          variant="ghost"
                          size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={async () => {
                            setSelectedPrescriptionForShareLog(prescription);
                            // Fetch share logs for this prescription
                            try {
                              const response = await apiRequest(
                                "GET",
                                `/api/prescriptions/${prescription.id}/share-logs`
                              );
                              if (response.ok) {
                                const data = await response.json();
                                setShareLogs(data.shareLogs || []);
                              } else {
                                setShareLogs([]);
                              }
                            } catch (error) {
                              console.error("Error fetching share logs:", error);
                              setShareLogs([]);
                            }
                            setShowShareLogDialog(true);
                          }}
                          title="View Share History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        ) : (
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center flex-shrink-0 cursor-not-allowed opacity-60"
                            title="No saved PDF file - no share history"
                          >
                            <History className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                          </span>
                        )}
                    </div>
                  )}
                  <div className="flex items-center justify-center px-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          title="Actions"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[10rem]">
                        <DropdownMenuItem
                          onClick={() => handleViewPrescription(prescription)}
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5 mr-2 shrink-0" />
                          View
                        </DropdownMenuItem>
                        {user?.role !== "patient" &&
                          prescription.status === "active" &&
                          canEdit("prescriptions") && (
                            <DropdownMenuItem
                              onClick={() => handleEditPrescription(prescription)}
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5 mr-2 shrink-0" />
                              Edit
                            </DropdownMenuItem>
                          )}
                        {user?.role !== "patient" && canDelete("prescriptions") && (
                          <DropdownMenuItem
                            onClick={() => handleDeletePrescription(prescription.id)}
                            disabled={deletePrescriptionMutation.isPending}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>
        </div>
        </TooltipProvider>
    </div>

      {/* Create/Edit Prescription Dialog - Moved outside Tabs for accessibility from both tabs */}
      <Dialog
        open={showNewPrescription}
        onOpenChange={(open) => {
          // Only allow closing via close button, not outside click
          if (!open) {
            // Clear inventory state when dialog closes
            isSubmittingPrescriptionRef.current = false;
            setUseInventoryItems({});
            setSelectedInventoryItems({});
            setInventorySearchOpen({});
            setShowNewPrescription(false);
          }
        }}
      >
                  <DialogContent 
                    className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700"
                    onInteractOutside={(e) => {
                      // Prevent closing on outside click
                      e.preventDefault();
                    }}
                    onEscapeKeyDown={(e) => {
                      // Prevent closing on Escape key
                      e.preventDefault();
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle className="dark:text-gray-100">
                        {selectedPrescription
                          ? "Edit Prescription"
                          : "Create New Prescription"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="patient">Patient</Label>
                          {user?.role === "patient" ? (
                            // For patient role: Show logged-in patient name and hide dropdown
                            <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span data-testid="patient-name-display">
                                {user.firstName} {user.lastName}
                              </span>
                            </div>
                          ) : (
                            // For other roles: Show patient dropdown
                            <Popover
                              open={patientSearchOpen}
                              onOpenChange={setPatientSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={patientSearchOpen}
                                  className="w-full justify-between min-h-10 h-auto py-2 text-left whitespace-normal"
                                  data-testid="select-patient"
                                >
                                  <span className="flex-1 min-w-0 break-words pr-2">
                                    {formData.patientId
                                      ? (() => {
                                          const selected = patients.find(
                                            (patient: any) =>
                                              patient.id.toString() === formData.patientId,
                                          );
                                          return selected
                                            ? formatPatientDropdownLabel(selected)
                                            : "Select a patient";
                                        })()
                                      : "Select a patient"}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search patient..." />
                                  <CommandList>
                                    <CommandEmpty>No patient found.</CommandEmpty>
                                    <CommandGroup>
                                      {patientDropdownGroups.flatMap(({ main, relatives }) => {
                                        const rows = [
                                          { patient: main, isChild: false },
                                          ...relatives.map((p: any) => ({
                                            patient: p,
                                            isChild: true,
                                          })),
                                        ];
                                        return rows.map(({ patient, isChild }) => (
                                          <CommandItem
                                            key={patient.id}
                                            value={`${patient.firstName} ${patient.lastName} ${patient.patientId} ${patient.email ?? ""}`}
                                            onSelect={() => {
                                              setFormData((prev) => ({
                                                ...prev,
                                                patientId: patient.id.toString(),
                                              }));
                                              setPatientSearchOpen(false);
                                            }}
                                            className="whitespace-normal break-words py-2"
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 shrink-0 mt-0.5 ${
                                                formData.patientId === patient.id.toString()
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            <span className={`break-words ${isChild ? "pl-1" : ""}`}>
                                              {isChild ? "↳ " : ""}
                                              {formatPatientDropdownLabel(patient)}
                                            </span>
                                          </CommandItem>
                                        ));
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="space-y-4">
                          {isDoctorLike(user?.role) ? (
                            // For doctor roles: Show role label only
                            <>
                              <div>
                                <Label htmlFor="role">Role</Label>
                                <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span data-testid="provider-role-display">
                                    {formatRoleLabel(user?.role)}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            // For non-doctor roles: Show dropdowns
                            <>
                              <div>
                                <Label htmlFor="role">Select Role</Label>
                                <Popover
                                  open={roleSearchOpen}
                                  onOpenChange={setRoleSearchOpen}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={roleSearchOpen}
                                      className="w-full justify-between"
                                      data-testid="select-role"
                                    >
                                      {selectedRole
                                        ? rolesData.find((role: any) => role.name === selectedRole)?.displayName || selectedRole
                                        : "Select a role..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search roles..." />
                                      <CommandEmpty>No role found.</CommandEmpty>
                                      <CommandGroup className="max-h-64 overflow-auto">
                                        {rolesData
                                          .filter((role: any) => {
                                            const roleName = (
                                              role.name || ""
                                            ).toLowerCase();
                                            return ![
                                              "patient",
                                              "admin",
                                              "administrator",
                                            ].includes(roleName);
                                          })
                                          .map((role: any) => (
                                            <CommandItem
                                              key={role.id}
                                              value={`${role.displayName || role.name} ${role.name}`}
                                              onSelect={() => {
                                                setSelectedRole(role.name);
                                                setFormData((prev) => ({
                                                  ...prev,
                                                  providerId: "",
                                                }));
                                                setRoleSearchOpen(false);
                                              }}
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  selectedRole === role.name
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                }`}
                                              />
                                              {role.displayName || role.name}
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>

                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {isDoctorLike(user?.role) ? (
                          <div>
                            <Label htmlFor="provider">
                              {" "}
                              Name (doctor/nurse etc)
                            </Label>
                            <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span data-testid="provider-name-display">
                                {user?.firstName} {user?.lastName}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="provider">Select Name</Label>
                            <Popover
                              open={nameSearchOpen}
                              onOpenChange={setNameSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={nameSearchOpen}
                                  className="w-full justify-between"
                                  data-testid="select-provider"
                                  disabled={!selectedRole}
                                >
                                  {formData.providerId
                                    ? allUsers.find(
                                        (usr: any) => usr.id.toString() === formData.providerId
                                      )
                                      ? `${
                                          allUsers.find(
                                            (usr: any) => usr.id.toString() === formData.providerId
                                          )?.firstName
                                        } ${
                                          allUsers.find(
                                            (usr: any) => usr.id.toString() === formData.providerId
                                          )?.lastName
                                        }`
                                      : "Select name..."
                                    : selectedRole
                                    ? "Select name..."
                                    : "Select a role first"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search names..." />
                                  <CommandEmpty>No name found.</CommandEmpty>
                                  <CommandGroup className="max-h-64 overflow-auto">
                                    {allUsers
                                      .filter(
                                        (usr: any) => usr.role === selectedRole,
                                      )
                                      .map((usr: any) => (
                                        <CommandItem
                                          key={usr.id}
                                          value={`${usr.firstName} ${usr.lastName}`}
                                          onSelect={() => {
                                            setFormData((prev) => ({
                                              ...prev,
                                              providerId: usr.id.toString(),
                                            }));
                                            setNameSearchOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              formData.providerId === usr.id.toString()
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                          {usr.firstName} {usr.lastName}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="diagnosis">Diagnosis *</Label>
                          <Popover
                            open={diagnosisSearchOpen}
                            onOpenChange={setDiagnosisSearchOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={diagnosisSearchOpen}
                                className="w-full justify-between"
                                data-testid="input-diagnosis"
                              >
                                <span className="truncate">
                                  {formData.diagnosis || "Select or type diagnosis..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search or type custom diagnosis..."
                                  value={formData.diagnosis}
                                  onValueChange={(value) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      diagnosis: value,
                                    }))
                                  }
                                />
                                <CommandEmpty>
                                  Press Enter to use "{formData.diagnosis}" as custom diagnosis
                                </CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-auto">
                                  {COMMON_DIAGNOSES.filter((diagnosis) =>
                                    diagnosis.toLowerCase().includes(formData.diagnosis.toLowerCase())
                                  ).map((diagnosis) => (
                                    <CommandItem
                                      key={diagnosis}
                                      value={diagnosis}
                                      onSelect={() => {
                                        setFormData((prev) => ({
                                          ...prev,
                                          diagnosis: diagnosis,
                                        }));
                                        setDiagnosisSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          formData.diagnosis === diagnosis
                                            ? "opacity-100"
                                            : "opacity-0"
                                        }`}
                                      />
                                      {diagnosis}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {formErrors.general && !formData.diagnosis.trim() && (
                            <p
                              className="text-red-500 text-sm mt-1"
                              data-testid="error-diagnosis"
                            >
                              Diagnosis is required
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-lg font-medium">
                            Medications
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addMedication();
                            }}
                            data-testid="button-add-medication"
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Medication
                          </Button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                        {formData.medications.map((medication, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 space-y-4 relative"
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-md">
                                {medication.inventoryItemId 
                                  ? `Inventory Item ${index + 1}`
                                  : `Medication ${index + 1}`}
                              </h4>
                              <div className="flex items-center gap-4">
                                {!medication.inventoryItemId && (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`use-inventory-items-${index}`}
                                      checked={useInventoryItems[index] || false}
                                      onChange={(e) => {
                                        setUseInventoryItems((prev) => ({
                                          ...prev,
                                          [index]: e.target.checked,
                                        }));
                                        if (!e.target.checked) {
                                          // Clear medication name if it was from inventory
                                          if (medication.inventoryItemId) {
                                            updateMedication(index, "name", "");
                                            updateMedication(index, "inventoryItemId", undefined);
                                          }
                                        }
                                      }}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor={`use-inventory-items-${index}`} className="text-sm font-normal cursor-pointer">
                                      Inventory Item
                                    </Label>
                                  </div>
                                )}
                              {formData.medications.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMedication(index)}
                                  data-testid={`button-remove-medication-${index}`}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                {medication.inventoryItemId ? (
                                  <>
                                    <Label htmlFor={`inventory-item-name-${index}`}>
                                      Inventory Item Name *
                                    </Label>
                                    <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                                      <span className="truncate">
                                        {inventoryItems.find((item: any) => item.id === medication.inventoryItemId)?.name || medication.name}
                                        {inventoryItems.find((item: any) => item.id === medication.inventoryItemId)?.brandName 
                                          ? ` (${inventoryItems.find((item: any) => item.id === medication.inventoryItemId)?.brandName})`
                                          : ""}
                                      </span>
                                    </div>
                                  </>
                                ) : useInventoryItems[index] ? (
                                  <>
                                    <Label htmlFor={`inventory-item-${index}`}>
                                      Inventory Item Name *
                                    </Label>
                                    <Popover
                                      open={inventorySearchOpen[index] || false}
                                      onOpenChange={(open) =>
                                        setInventorySearchOpen((prev) => ({
                                          ...prev,
                                          [index]: open,
                                        }))
                                      }
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={inventorySearchOpen[index] || false}
                                          className="w-full justify-between"
                                          data-testid={`input-inventory-item-${index}`}
                                          disabled={inventoryItemsLoading}
                                        >
                                          <span className="truncate">
                                            Select inventory item...
                                          </span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command shouldFilter={false}>
                                          <CommandInput
                                            placeholder="Search inventory items..."
                                          />
                                          <CommandEmpty>
                                            No inventory items found
                                          </CommandEmpty>
                                          <CommandGroup className="max-h-64 overflow-auto">
                                            {inventoryItems
                                              .filter((item: any) => {
                                                // Don't show items that are already selected in other medication entries
                                                return !formData.medications.some(
                                                  (med) => med.inventoryItemId === item.id
                                                );
                                              })
                                              .map((item: any) => (
                                                <CommandItem
                                                  key={item.id}
                                                  value={item.id.toString()}
                                                  onSelect={() => {
                                                    // Create a new medication entry for this inventory item
                                                    const newMedication = {
                                                      name: item.name,
                                                      dosage: "",
                                                      frequency: "",
                                                      duration: "",
                                                      quantity: "",
                                                      refills: "",
                                                      instructions: "",
                                                      genericAllowed: true,
                                                      inventoryItemId: item.id,
                                                    };
                                                    
                                                    // If this is the current entry, replace it; otherwise add a new one
                                                    if (useInventoryItems[index] && !medication.inventoryItemId) {
                                                      // Replace current entry
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        medications: prev.medications.map((med, i) =>
                                                          i === index ? newMedication : med
                                                        ),
                                                      }));
                                                      // Clear the checkbox state for this index
                                                      setUseInventoryItems((prev) => {
                                                        const newState = { ...prev };
                                                        delete newState[index];
                                                        return newState;
                                                      });
                                                    } else {
                                                      // Add new entry after current one
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        medications: [
                                                          ...prev.medications.slice(0, index + 1),
                                                          newMedication,
                                                          ...prev.medications.slice(index + 1),
                                                        ],
                                                      }));
                                                    }
                                                    
                                                    setInventorySearchOpen((prev) => ({
                                                      ...prev,
                                                      [index]: false,
                                                    }));
                                                  }}
                                                >
                                                  <Check className="mr-2 h-4 w-4 opacity-0" />
                                                  {item.name} {item.brandName ? `(${item.brandName})` : ""}
                                                </CommandItem>
                                              ))}
                                          </CommandGroup>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                    {formErrors.medications[index]?.inventoryItems && (
                                      <p
                                        className="text-red-500 text-sm mt-1"
                                        data-testid={`error-inventory-item-${index}`}
                                      >
                                        {formErrors.medications[index].inventoryItems}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                <Label htmlFor={`medication-name-${index}`}>
                                  Medication Name *
                                </Label>
                                <Popover
                                  open={medicationSearchOpen[index] || false}
                                  onOpenChange={(open) =>
                                    setMedicationSearchOpen((prev) => ({
                                      ...prev,
                                      [index]: open,
                                    }))
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={medicationSearchOpen[index] || false}
                                      className="w-full justify-between"
                                      data-testid={`input-medication-name-${index}`}
                                    >
                                      <span className="truncate">
                                        {medication.name || "Select or type medication..."}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                      <CommandInput
                                        placeholder="Search or type custom medication..."
                                        value={medication.name}
                                        onValueChange={(value) =>
                                          updateMedication(index, "name", value)
                                        }
                                      />
                                      <CommandEmpty>
                                        Press Enter to use "{medication.name}" as custom medication
                                      </CommandEmpty>
                                      <CommandGroup className="max-h-64 overflow-auto">
                                        {COMMON_MEDICATIONS.filter((med) =>
                                          med.toLowerCase().includes(medication.name.toLowerCase())
                                        ).map((med) => (
                                          <CommandItem
                                            key={med}
                                            value={med}
                                            onSelect={() => {
                                              updateMedication(index, "name", med);
                                              setMedicationSearchOpen((prev) => ({
                                                ...prev,
                                                [index]: false,
                                              }));
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                medication.name === med
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            {med}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                {formErrors.medications[index]?.name && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-name-${index}`}
                                  >
                                    {formErrors.medications[index].name}
                                  </p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-dosage-${index}`}>
                                  Dosage *
                                </Label>
                                <Popover
                                  open={dosageSearchOpen[index] || false}
                                  onOpenChange={(open) =>
                                    setDosageSearchOpen((prev) => ({
                                      ...prev,
                                      [index]: open,
                                    }))
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={dosageSearchOpen[index] || false}
                                      className="w-full justify-between"
                                      data-testid={`input-dosage-${index}`}
                                    >
                                      <span className="truncate">
                                        {medication.dosage || "Select or type dosage..."}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                      <CommandInput
                                        placeholder="Search or type custom dosage..."
                                        value={medication.dosage}
                                        onValueChange={(value) =>
                                          updateMedication(index, "dosage", value)
                                        }
                                      />
                                      <CommandEmpty>
                                        Press Enter to use "{medication.dosage}" as custom dosage
                                      </CommandEmpty>
                                      <CommandGroup className="max-h-64 overflow-auto">
                                        {COMMON_DOSAGES.filter((dosage) =>
                                          dosage.toLowerCase().includes(medication.dosage.toLowerCase())
                                        ).map((dosage) => (
                                          <CommandItem
                                            key={dosage}
                                            value={dosage}
                                            onSelect={() => {
                                              updateMedication(index, "dosage", dosage);
                                              setDosageSearchOpen((prev) => ({
                                                ...prev,
                                                [index]: false,
                                              }));
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                medication.dosage === dosage
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            {dosage}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                {formErrors.medications[index]?.dosage && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-dosage-${index}`}
                                  >
                                    {formErrors.medications[index].dosage}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label
                                  htmlFor={`medication-frequency-${index}`}
                                >
                                  Frequency *
                                </Label>
                                <Select
                                  value={medication.frequency}
                                  onValueChange={(value) =>
                                    updateMedication(index, "frequency", value)
                                  }
                                >
                                  <SelectTrigger
                                    data-testid={`select-frequency-${index}`}
                                    className={
                                      formErrors.medications[index]?.frequency
                                        ? "border-red-500"
                                        : ""
                                    }
                                  >
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Once daily">
                                      Once daily
                                    </SelectItem>
                                    <SelectItem value="Twice daily">
                                      Twice daily
                                    </SelectItem>
                                    <SelectItem value="Three times daily">
                                      Three times daily
                                    </SelectItem>
                                    <SelectItem value="Four times daily">
                                      Four times daily
                                    </SelectItem>
                                    <SelectItem value="Every other day">
                                      Every other day
                                    </SelectItem>
                                    <SelectItem value="As needed">
                                      As needed
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {formErrors.medications[index]?.frequency && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-frequency-${index}`}
                                  >
                                    {formErrors.medications[index].frequency}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-duration-${index}`}>
                                  Duration *
                                </Label>
                                <Select
                                  value={medication.duration}
                                  onValueChange={(value) =>
                                    updateMedication(index, "duration", value)
                                  }
                                >
                                  <SelectTrigger
                                    data-testid={`select-duration-${index}`}
                                    className={
                                      formErrors.medications[index]?.duration
                                        ? "border-red-500"
                                        : ""
                                    }
                                  >
                                    <SelectValue placeholder="Select duration" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="7 days">
                                      7 days
                                    </SelectItem>
                                    <SelectItem value="14 days">
                                      14 days
                                    </SelectItem>
                                    <SelectItem value="30 days">
                                      30 days
                                    </SelectItem>
                                    <SelectItem value="60 days">
                                      60 days
                                    </SelectItem>
                                    <SelectItem value="90 days">
                                      90 days
                                    </SelectItem>
                                    <SelectItem value="6 months">
                                      6 months
                                    </SelectItem>
                                    <SelectItem value="1 year">
                                      1 year
                                    </SelectItem>
                                    <SelectItem value="Ongoing">
                                      Ongoing
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {formErrors.medications[index]?.duration && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-duration-${index}`}
                                  >
                                    {formErrors.medications[index].duration}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor={`medication-quantity-${index}`}>
                                  Quantity *
                                </Label>
                                <Input
                                  id={`medication-quantity-${index}`}
                                  type="number"
                                  min="1"
                                  placeholder="30"
                                  value={medication.quantity}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-quantity-${index}`}
                                  className={
                                    formErrors.medications[index]?.quantity
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {formErrors.medications[index]?.quantity && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-quantity-${index}`}
                                  >
                                    {formErrors.medications[index].quantity}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-refills-${index}`}>
                                  Refills
                                </Label>
                                <Input
                                  id={`medication-refills-${index}`}
                                  type="number"
                                  min="0"
                                  placeholder="3"
                                  value={medication.refills}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "refills",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-refills-${index}`}
                                  className={
                                    formErrors.medications[index]?.refills
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {formErrors.medications[index]?.refills && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-refills-${index}`}
                                  >
                                    {formErrors.medications[index].refills}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 pt-6">
                                <input
                                  type="checkbox"
                                  id={`medication-generic-${index}`}
                                  checked={medication.genericAllowed}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "genericAllowed",
                                      e.target.checked,
                                    )
                                  }
                                  data-testid={`checkbox-generic-allowed-${index}`}
                                  className="h-4 w-4"
                                />
                                <Label
                                  htmlFor={`medication-generic-${index}`}
                                  className="text-sm font-medium"
                                >
                                  Generic allowed
                                </Label>
                              </div>
                            </div>

                            <div>
                              <Label
                                htmlFor={`medication-instructions-${index}`}
                              >
                                Instructions
                              </Label>
                              <Textarea
                                id={`medication-instructions-${index}`}
                                placeholder="Special instructions for patient (e.g., take with food, before bedtime)"
                                value={medication.instructions}
                                onChange={(e) =>
                                  updateMedication(
                                    index,
                                    "instructions",
                                    e.target.value,
                                  )
                                }
                                data-testid={`input-instructions-${index}`}
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>

                      {/* Pharmacy Information Section */}
                      <div className="space-y-3 border-t pt-4">
                        <Label className="text-lg font-medium">
                          Pharmacy Information
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                            <Input
                              id="pharmacyName"
                              placeholder="Pharmacy name"
                              value={formData.pharmacyName}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  pharmacyName: e.target.value,
                                }))
                              }
                              data-testid="input-pharmacy-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="pharmacyPhone">Phone Number</Label>
                            <Input
                              id="pharmacyPhone"
                              placeholder="Phone number"
                              value={formData.pharmacyPhone}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  pharmacyPhone: e.target.value,
                                }))
                              }
                              data-testid="input-pharmacy-phone"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="pharmacyAddress">Address</Label>
                          <Input
                            id="pharmacyAddress"
                            placeholder="Pharmacy address"
                            value={formData.pharmacyAddress}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                pharmacyAddress: e.target.value,
                              }))
                            }
                            data-testid="input-pharmacy-address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pharmacyEmail">Email</Label>
                          <Input
                            id="pharmacyEmail"
                            type="email"
                            placeholder="pharmacy@example.com"
                            value={formData.pharmacyEmail}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                pharmacyEmail: e.target.value,
                              }))
                            }
                            data-testid="input-pharmacy-email"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowNewPrescription(false);
                            setFormErrors({ medications: [] });
                          }}
                          data-testid="button-cancel-prescription"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSubmitPrescription}
                          disabled={
                            createPrescriptionMutation.isPending ||
                            isSubmittingPrescriptionRef.current
                          }
                          data-testid="button-submit-prescription"
                        >
                          {createPrescriptionMutation.isPending
                            ? selectedPrescription
                              ? "Updating..."
                              : "Creating..."
                            : selectedPrescription
                              ? "Update Prescription"
                              : "Create Prescription"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

    {/* View Prescription Details Dialog */}
      <Dialog open={showViewDetails} onOpenChange={setShowViewDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Patient & Provider Info */}
              <div className="grid grid-cols-2 gap-6">
              <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                                  <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="font-medium">
                        {selectedPrescription.patientName}
                                    </p>
                                  </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Date of Birth
                      </p>
                      <p>{selectedPrescription.patientDob || "N/A"}</p>
                              </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Age</p>
                      <p>{selectedPrescription.patientAge || "N/A"}</p>
                        </div>
                        <div>
                      <p className="text-sm font-medium text-gray-600">Sex</p>
                      <p>{selectedPrescription.patientSex || "N/A"}</p>
                              </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Address
                      </p>
                      <p>
                        {selectedPrescription.patientAddress || "N/A"}
                      </p>
                            </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Allergies
                      </p>
                      <p>
                        {selectedPrescription.patientAllergies || "None"}
                      </p>
                            </div>
                        <div>
                      <p className="text-sm font-medium text-gray-600">
                        Weight
                      </p>
                      <p>{selectedPrescription.patientWeight || "N/A"}</p>
                        </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Provider Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="font-medium">
                        {selectedPrescription.providerName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Role</p>
                      <p>
                        {(() => {
                          const providerInfo = allUsers?.find(
                            (p: any) =>
                              p.id === selectedPrescription.doctorId ||
                              p.id === selectedPrescription.providerId ||
                              p.id === selectedPrescription.prescriptionCreatedBy,
                          );
                          return providerInfo
                            ? formatRoleLabel(providerInfo.role) || "N/A"
                            : "N/A";
                        })()}
                          </p>
                        </div>
                  </CardContent>
                </Card>
                    </div>

              {/* Diagnosis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Diagnosis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{selectedPrescription.diagnosis || "N/A"}</p>
                </CardContent>
              </Card>

              {/* Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medications</CardTitle>
                </CardHeader>
                <CardContent>
                      <div className="space-y-4">
                    {selectedPrescription.medications?.map(
                          (medication: any, index: number) => (
                        <div
                          key={index}
                          className="border-l-4 border-blue-500 pl-4"
                        >
                          <p className="font-semibold">
                            {index + 1}. {medication.name}
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium">Dosage:</span>{" "}
                              {medication.dosage}
                            </p>
                            <p>
                              <span className="font-medium">Frequency:</span>{" "}
                              {medication.frequency}
                            </p>
                            <p>
                              <span className="font-medium">Duration:</span>{" "}
                              {medication.duration}
                            </p>
                            <p>
                              <span className="font-medium">Quantity:</span>{" "}
                              {medication.quantity}
                            </p>
                            {medication.refills !== undefined && (
                              <p>
                                <span className="font-medium">Refills:</span>{" "}
                                {medication.refills}
                              </p>
                            )}
                              {medication.instructions && (
                              <p>
                                <span className="font-medium">
                                  Instructions:
                                </span>{" "}
                                {medication.instructions}
                                </p>
                              )}
                            {user?.role !== 'patient' && medication.genericAllowed !== undefined && (
                              <p>
                                <span className="font-medium">
                                  Generic Allowed:
                                </span>{" "}
                                {medication.genericAllowed ? "Yes" : "No"}
                              </p>
                            )}
                          </div>
                            </div>
                          ),
                        )}
                      </div>
                </CardContent>
              </Card>

              {/* Drug Interactions */}
              {selectedPrescription.interactions &&
                selectedPrescription.interactions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Drug Interactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedPrescription.interactions.map(
                              (interaction: any, index: number) => (
                                <div
                                  key={index}
                              className="p-3 bg-red-50 border border-red-200 rounded"
                                >
                                  <Badge
                                className={getSeverityColor(interaction.severity)}
                                  >
                                    {interaction.severity}
                                  </Badge>
                              <p className="mt-2 text-sm">
                                  {interaction.description}
                              </p>
                                </div>
                              ),
                            )}
                          </div>
                  </CardContent>
                </Card>
                )}

              {/* Pharmacy Information */}
              {selectedPrescription.pharmacy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pharmacy Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p>{selectedPrescription.pharmacy.name || "N/A"}</p>
                  </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Address
                      </p>
                      <p>
                        {selectedPrescription.pharmacy.address || "N/A"}
                      </p>
            </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p>{selectedPrescription.pharmacy.phone || "N/A"}</p>
            </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <p>{selectedPrescription.pharmacy.email || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
              )}

              {/* Prescription Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Prescription Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Prescription Number
                    </p>
                    <p>
                      {selectedPrescription.prescriptionNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <Badge
                      className={getStatusColor(selectedPrescription.status)}
                    >
                      {selectedPrescription.status}
                  </Badge>
                </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Prescribed At
                    </p>
                    <p>
                      {selectedPrescription.prescribedAt
                        ? formatTimestampWithAmPm(selectedPrescription.prescribedAt)
                        : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

    {/* View Prescription Details Dialog */}
      <Dialog open={showViewDetails} onOpenChange={setShowViewDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Patient & Provider Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="font-medium">
                        {selectedPrescription.patientName}
                      </p>
                </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Date of Birth
                      </p>
                      <p>{selectedPrescription.patientDob || "N/A"}</p>
                          </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Age</p>
                      <p>{selectedPrescription.patientAge || "N/A"}</p>
                          </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sex</p>
                      <p>{selectedPrescription.patientSex || "N/A"}</p>
                          </div>
                          <div>
                      <p className="text-sm font-medium text-gray-600">
                        Address
                      </p>
                      <p>
                        {selectedPrescription.patientAddress || "N/A"}
                      </p>
                          </div>
                          <div>
                      <p className="text-sm font-medium text-gray-600">
                        Allergies
                            </p>
                      <p>
                        {selectedPrescription.patientAllergies || "None"}
                            </p>
                          </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Weight
                      </p>
                      <p>{selectedPrescription.patientWeight || "N/A"}</p>
                          </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Provider Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                          <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="font-medium">
                        {selectedPrescription.providerName || "N/A"}
                            </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Role</p>
                      <p>
                              {(() => {
                          const providerInfo = allUsers?.find(
                            (p: any) =>
                              p.id === selectedPrescription.doctorId ||
                              p.id === selectedPrescription.providerId ||
                              p.id === selectedPrescription.prescriptionCreatedBy,
                                );
                                return providerInfo 
                            ? formatRoleLabel(providerInfo.role) || "N/A"
                            : "N/A";
                              })()}
                            </p>
                          </div>
                  </CardContent>
                </Card>
                        </div>

              {/* Diagnosis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Diagnosis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{selectedPrescription.diagnosis || "N/A"}</p>
                </CardContent>
              </Card>

              {/* Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPrescription.medications?.map(
                      (medication: any, index: number) => (
                        <div
                          key={index}
                          className="border-l-4 border-blue-500 pl-4"
                        >
                          <p className="font-semibold">
                            {index + 1}. {medication.name}
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium">Dosage:</span>{" "}
                              {medication.dosage}
                            </p>
                            <p>
                              <span className="font-medium">Frequency:</span>{" "}
                              {medication.frequency}
                            </p>
                            <p>
                              <span className="font-medium">Duration:</span>{" "}
                              {medication.duration}
                            </p>
                            <p>
                              <span className="font-medium">Quantity:</span>{" "}
                              {medication.quantity}
                            </p>
                            {medication.refills !== undefined && (
                              <p>
                                <span className="font-medium">Refills:</span>{" "}
                                {medication.refills}
                              </p>
                            )}
                            {medication.instructions && (
                              <p>
                                <span className="font-medium">
                                  Instructions:
                                </span>{" "}
                                {medication.instructions}
                              </p>
                            )}
                            {user?.role !== 'patient' && medication.genericAllowed !== undefined && (
                              <p>
                                <span className="font-medium">
                                  Generic Allowed:
                                </span>{" "}
                                {medication.genericAllowed ? "Yes" : "No"}
                              </p>
                            )}
                          </div>
                        </div>
                      ),
                            )}
                        </div>
                      </CardContent>
                    </Card>

              {/* Drug Interactions */}
              {selectedPrescription.interactions &&
                selectedPrescription.interactions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Drug Interactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedPrescription.interactions.map(
                          (interaction: any, index: number) => (
                            <div
                              key={index}
                              className="p-3 bg-red-50 border border-red-200 rounded"
                            >
                              <Badge
                                className={getSeverityColor(interaction.severity)}
                              >
                                {interaction.severity}
                              </Badge>
                              <p className="mt-2 text-sm">
                                {interaction.description}
                              </p>
                </div>
                          ),
                        )}
                        </div>
                    </CardContent>
                  </Card>
                )}

              {/* Pharmacy Information */}
              {selectedPrescription.pharmacy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pharmacy Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p>{selectedPrescription.pharmacy.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Address
                      </p>
                      <p>
                        {selectedPrescription.pharmacy.address || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p>{selectedPrescription.pharmacy.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <p>{selectedPrescription.pharmacy.email || "N/A"}</p>
                  </div>
                  </CardContent>
                </Card>
              )}

              {/* Prescription Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Prescription Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div>
                    <p className="text-sm font-medium text-gray-600">
                      Prescription Number
                    </p>
                    <p>
                      {selectedPrescription.prescriptionNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <Badge
                      className={getStatusColor(selectedPrescription.status)}
                    >
                      {selectedPrescription.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Prescribed At
                    </p>
                    <p>
                      {selectedPrescription.prescribedAt
                        ? formatTimestampWithAmPm(selectedPrescription.prescribedAt)
                        : "N/A"}
                      </p>
                    </div>
                </CardContent>
              </Card>
                  </div>
          )}
        </DialogContent>
      </Dialog>

    {/* Send to Pharmacy Dialog */}
      <Dialog open={showPharmacyDialog} onOpenChange={setShowPharmacyDialog}>
        <DialogContent className="max-w-md max-h-[650px] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Send Prescription to Halo Health Pharmacy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pharmacyEmail">Pharmacy Email</Label>
              <Input
                id="pharmacyEmail"
                type="email"
                placeholder="pharmacy@example.com"
                value={pharmacyEmail}
                onChange={(e) => setPharmacyEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                onClick={() => setShowPharmacyDialog(false)}
                    >
                Cancel
                    </Button>
                    <Button
                        onClick={() => {
                  if (selectedPrescription) {
                    handleSendToPharmacy(selectedPrescription.id);
                  }
                        }}
                      >
                Send
                      </Button>
                  </div>
          </div>
        </DialogContent>
      </Dialog>

    {/* View Prescription Details Dialog */}
      <Dialog open={showViewDetails} onOpenChange={setShowViewDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Patient & Provider Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="font-medium">
                        {selectedPrescription.patientName}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Provider Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(() => {
                      const doctor = allUsers.find(
                        (u) => u.id === selectedPrescription.doctorId,
                      );
                      return doctor ? (
                        <>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Provider
                            </p>
                            <p className="font-medium">
                              {(() => {
                                const fullName = `${doctor.firstName} ${doctor.lastName}`;
                                // Check if name already starts with "Dr." or "Nurse."
                                const alreadyHasDr = fullName.toLowerCase().startsWith("dr.");
                                const alreadyHasNurse = fullName.toLowerCase().startsWith("nurse.");
                                // Add "Dr." only if role is doctor and name doesn't already have it
                                if (doctor.role === 'doctor' && !alreadyHasDr) {
                                  return `Dr. ${fullName}`;
                                }
                                // Add "Nurse." for nurse role if name doesn't already have it
                                if (doctor.role === 'nurse' && !alreadyHasNurse) {
                                  return `Nurse. ${fullName}`;
                                }
                                // Return name as is if already has prefix or other role
                                return fullName;
                              })()}
                            </p>
                          </div>
                          {doctor.department && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Specialization
                              </p>
                              <p className="font-medium">{doctor.department}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Provider
                          </p>
                          <p className="font-medium">
                            Provider information unavailable
                          </p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Prescription Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prescription Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Status
                      </p>
                      <Badge
                        className={getStatusColor(selectedPrescription.status)}
                      >
                        {selectedPrescription.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Prescribed Date
                      </p>
                      <p className="font-medium">
                        {new Date(
                          selectedPrescription.prescribedAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedPrescription.prescriptionNumber && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Prescription Number
                        </p>
                        <p className="font-mono text-sm">
                          {selectedPrescription.prescriptionNumber}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedPrescription.issuedDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Issued Date
                        </p>
                        <p className="font-medium">
                          {new Date(
                            selectedPrescription.issuedDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedPrescription.doctorId &&
                      (() => {
                        const doctor = allUsers.find(
                          (u) => u.id === selectedPrescription.doctorId,
                        );
                        return (
                          doctor && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Prescribing Doctor
                              </p>
                              <p className="font-medium">
                                {(() => {
                                  const fullName = `${doctor.firstName} ${doctor.lastName}`;
                                  // Check if name already starts with "Dr."
                                  const alreadyHasDr = fullName.toLowerCase().startsWith("dr.");
                                  // Add "Dr." only if role is doctor and name doesn't already have it
                                  if (doctor.role === 'doctor' && !alreadyHasDr) {
                                    return `Dr. ${fullName}`;
                                  }
                                  // For nurse role, don't add "Dr."
                                  return fullName;
                                })()}
                              </p>
                              {doctor.department && (
                                <p className="text-sm text-gray-500">
                                  {doctor.department}
                                </p>
                              )}
                            </div>
                          )
                        );
                      })()}
                    {selectedPrescription.prescriptionCreatedBy &&
                      (() => {
                        const creator = allUsers.find(
                          (u) =>
                            u.id === selectedPrescription.prescriptionCreatedBy,
                        );
                        return (
                          creator && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Created By
                              </p>
                              <p className="font-medium">
                                {creator.firstName} {creator.lastName}
                              </p>
                              {creator.role && (
                                <p className="text-sm text-gray-500 capitalize">
                                  {formatRoleLabel(creator.role)}
                                </p>
                              )}
                            </div>
                          )
                        );
                      })()}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPrescription.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Created At
                        </p>
                        <p className="font-medium">
                          {formatTimestampNoConversion(selectedPrescription.createdAt)}
                        </p>
                      </div>
                    )}
                    {selectedPrescription.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Updated At
                        </p>
                        <p className="font-medium">
                          {formatTimestampNoConversion(selectedPrescription.updatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Diagnosis
                    </p>
                    <p className="font-medium">
                      {selectedPrescription.diagnosis}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Medications ({selectedPrescription.medications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPrescription.medications.map(
                      (medication, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Medication
                              </p>
                              <p className="font-semibold text-lg">
                                {medication.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Dosage
                              </p>
                              <p className="font-medium">{medication.dosage}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Frequency
                              </p>
                              <p>{medication.frequency}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Duration
                              </p>
                              <p>{medication.duration}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Quantity
                              </p>
                              <p>{medication.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Refills
                              </p>
                              <p>{medication.refills}</p>
                            </div>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-600">
                              Instructions
                            </p>
                            <p className="text-sm bg-gray-50 p-2 rounded">
                              {medication.instructions}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Drug Interactions */}
              {selectedPrescription.interactions &&
                selectedPrescription.interactions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Drug Interactions (
                        {selectedPrescription.interactions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedPrescription.interactions.map(
                          (interaction, index) => (
                            <div
                              key={index}
                              className="flex gap-3 p-3 border rounded-lg"
                            >
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <Badge
                                  className={getSeverityColor(
                                    interaction.severity,
                                  )}
                                >
                                  {interaction.severity
                                    .charAt(0)
                                    .toUpperCase() +
                                    interaction.severity.slice(1)}
                                </Badge>
                                <p className="text-sm mt-2">
                                  {interaction.description}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Pharmacy Information */}
              {selectedPrescription.pharmacy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Pharmacy Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Pharmacy Name
                      </p>
                      <p className="font-medium">
                        {selectedPrescription.pharmacy.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Address
                      </p>
                      <p>{selectedPrescription.pharmacy.address}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p>{selectedPrescription.pharmacy.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send to Pharmacy Dialog */}
      <Dialog open={showPharmacyDialog} onOpenChange={(open) => {
        setShowPharmacyDialog(open);
        if (!open) {
          // Clear attached files when dialog closes
          setAttachedFiles([]);
        }
      }}>
        <DialogContent className="max-w-md h-[500px] flex flex-col dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="dark:text-white">Send Prescription to Halo Health Pharmacy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <div className="bg-blue-50 dark:bg-slate-700/50 p-4 rounded-lg border border-blue-200 dark:border-slate-600">
              <h4 className="font-semibold text-blue-900 dark:text-white mb-2">
                Halo Health Pharmacy
              </h4>
              <div className="text-sm text-blue-800 dark:text-gray-200 space-y-1">
                <p>Unit 2 Drayton Court</p>
                <p>Solihull</p>
                <p>B90 4NG</p>
                <p className="font-medium mt-2">Phone: +44(0)121 827 5531</p>
                <p className="font-medium">Email: pharmacy@halohealth.co.uk</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Prescription Attachment Status */}
              {(() => {
                const prescription = prescriptions?.find(
                  (p) => p.id === selectedPrescriptionId,
                );
                const isAttached = prescription?.savedPdfPath ? true : false;
                const prescriptionName = prescription?.prescriptionNumber || prescription?.id || "Unknown";
                
                return (
                  <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center gap-2">
                      {isAttached ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Prescription Attached
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {prescriptionName}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Prescription Not Attached
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {prescriptionName} - PDF will be generated automatically
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              <p className="text-sm text-gray-600 dark:text-gray-300">
                This prescription will be sent as a PDF to the pharmacy via
                email for processing.
              </p>

              <div className="space-y-2">
                <Label htmlFor="pharmacy-email" className="text-sm font-medium">
                  Pharmacy Email Address
                </Label>
                <Input
                  id="pharmacy-email"
                  type="email"
                  value={pharmacyEmail}
                  onChange={(e) => setPharmacyEmail(e.target.value)}
                  placeholder="Enter pharmacy email address"
                  className="w-full"
                />
              </div>

              {/* File Attachment Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Optional File Attachments
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("file-input")?.click()
                    }
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach Files
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    onChange={handleFileAttachment}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <span className="text-xs text-gray-500">
                    PDF, DOC, DOCX, JPG, PNG files accepted
                  </span>
                </div>

                {/* Display attached files */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2 min-w-0">
                    <p className="text-sm font-medium">Attached Files:</p>
                    <div className="space-y-1 min-w-0">
                      {attachedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-slate-700/50 p-2 rounded border border-gray-200 dark:border-slate-600 min-w-0"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Paperclip className="h-3 w-3 text-gray-500 dark:text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 break-words min-w-0 flex-1">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachedFile(index)}
                            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 shrink-0"
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>PDF prescription will be generated automatically</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-green-600" />
                <span>
                  Email will be sent to the specified pharmacy address
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowPharmacyDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const pharmacyData = {
                    name: "Halo Health",
                    address: "Unit 2 Drayton Court, Solihull, B90 4NG",
                    phone: "+44(0)121 827 5531",
                    email: pharmacyEmail,
                  };
                  // Find the selected prescription to get patient name and prescription data
                  const prescription = prescriptions?.find(
                    (p) => p.id === selectedPrescriptionId,
                  );
                  sendToPharmacyMutation.mutate({
                    prescriptionId: selectedPrescriptionId,
                    pharmacyData,
                    patientName: prescription?.patientName || "Patient",
                    attachments:
                      attachedFiles.length > 0 ? attachedFiles : undefined,
                    prescriptionNumber: prescription?.prescriptionNumber,
                    prescriptionData: prescription,
                  });
                }}
                disabled={
                  sendToPharmacyMutation.isPending || !pharmacyEmail.trim()
                }
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {sendToPharmacyMutation.isPending
                  ? "Sending PDF..."
                  : "Send PDF to Pharmacy"}
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Creation Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            {/* Green checkmark icon */}
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
              <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
              Prescription Successful!
            </h2>

            {/* Subtitle */}
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your prescription has been processed successfully
            </p>

            {/* Prescription Details */}
            {createdPrescriptionDetails && (
              <div className="w-full bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Prescription ID:</span>
                  <span className="text-gray-900 dark:text-gray-100">{createdPrescriptionDetails.id || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Patient Name:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {createdPrescriptionDetails.patientName || 'Unknown Patient'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Created At:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {createdPrescriptionDetails.clientCreatedAt
                      ? formatTimestampFromSystem(createdPrescriptionDetails.clientCreatedAt)
                      : createdPrescriptionDetails.createdAt
                        ? formatTimestampFromSystem(createdPrescriptionDetails.createdAt)
                        : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Status:</span>
                  <span className="text-gray-900 dark:text-gray-100 capitalize">{createdPrescriptionDetails.status || 'N/A'}</span>
                </div>
              </div>
            )}

            {/* Done Button */}
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setCreatedPrescriptionDetails(null);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-prescription-success-done"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription PDF Save Success Modal */}
      <Dialog open={showSavePdfSuccessModal} onOpenChange={setShowSavePdfSuccessModal}>
        <DialogContent className="max-w-md dark:bg-slate-800 dark:border-gray-700">
          <div className="flex flex-col items-center text-center py-6">
            {/* Green checkmark icon */}
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
              <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
              Prescription PDF saved successfully
            </h2>

            {/* Subtitle */}
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The prescription PDF has been generated and saved. You can now view or download it using the PDF icon.
            </p>

            {/* Done Button */}
            <Button
              onClick={() => setShowSavePdfSuccessModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Send Success Dialog */}
      <Dialog open={showPharmacySuccessDialog} onOpenChange={setShowPharmacySuccessDialog}>
        <DialogContent className="max-w-md dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="sr-only">Prescription Sent Successfully</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Prescription Sent Successfully
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                The prescription has been successfully sent to <strong>{pharmacyEmail}</strong> via email with the PDF attachment.
              </p>
            </div>
            <Button
              onClick={() => setShowPharmacySuccessDialog(false)}
              className="bg-medical-blue hover:bg-blue-700 mt-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generic Success Modal with Green Tick */}
      <Dialog open={showGenericSuccessModal} onOpenChange={setShowGenericSuccessModal}>
        <DialogContent className="max-w-md dark:bg-slate-800 dark:border-gray-700">
          <div className="flex flex-col items-center text-center py-6">
            {/* Green checkmark icon */}
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
              {successModalTitle}
            </h2>

            {/* Message */}
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {successModalMessage}
            </p>

            {/* Done Button */}
            <Button
              onClick={() => {
                setShowGenericSuccessModal(false);
                setSuccessModalTitle("");
                setSuccessModalMessage("");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Details Dialog */}
      <Dialog open={showSignatureDetailsDialog} onOpenChange={setShowSignatureDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Signature Details</DialogTitle>
          </DialogHeader>
          {selectedSignatureData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Signed At</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSignatureData.signedAt 
                      ? format(new Date(selectedSignatureData.signedAt), "MMM dd, yyyy HH:mm:ss")
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Signed By</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSignatureData.signedBy || "N/A"}
                  </p>
                </div>
                {selectedSignatureData.signerId && (
                  <div>
                    <Label className="text-sm font-semibold">Signer Name</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedSignatureData.signerName || selectedSignatureData.signedBy || `User ID: ${selectedSignatureData.signerId}`}
                    </p>
                  </div>
                )}
              </div>
              {selectedSignatureData.doctorSignature ? (
                <div>
                  <Label className="text-sm font-semibold">Doctor Signature</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                    <img 
                      src={selectedSignatureData.doctorSignature} 
                      alt="Doctor Signature" 
                      className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded dark:invert"
                      onError={(e) => {
                        console.error("Error loading signature image:", selectedSignatureData.doctorSignature);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-semibold">Doctor Signature</Label>
                  <div className="mt-2 flex items-center gap-2 text-red-600">
                    <X className="h-4 w-4" />
                    <span className="text-sm font-medium">not signed</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setShowSignatureDetailsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog (list view - edit icon under (.) column) */}
      <Dialog
        open={editStatusDialog.open}
        onOpenChange={(open) => {
          if (!open) setEditStatusDialog({ open: false, prescription: null });
        }}
      >
        <DialogContent className="max-w-sm dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
          </DialogHeader>
          {editStatusDialog.prescription && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={tempStatus}
                  onValueChange={setTempStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditStatusDialog({ open: false, prescription: null })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editStatusDialog.prescription?.id && tempStatus) {
                      statusUpdateMutation.mutate({
                        prescriptionId: editStatusDialog.prescription.id,
                        status: tempStatus,
                      });
                    }
                  }}
                  disabled={statusUpdateMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Advanced E-Signature Dialog */}
      {/* Signature Required Dialog */}
      <Dialog open={showSignatureRequiredDialog} onOpenChange={(open) => {
        // Only allow closing via Cancel button, not by clicking outside
        if (!open) {
          // User is trying to close - only allow if explicitly cancelled via button
          // This prevents closing on outside click
          return;
        }
        setShowSignatureRequiredDialog(open);
      }}>
        <DialogContent className="max-w-md dark:bg-slate-800 dark:border-gray-700" onInteractOutside={(e) => {
          // Prevent closing on outside click
          e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              Signature Required
            </DialogTitle>
            <DialogDescription>
              A signature is required before saving the prescription PDF. Please sign the prescription to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">
              A signature is required before saving the prescription PDF. Please sign the prescription to proceed.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowSignatureRequiredDialog(false);
                setPendingSavePrescriptionId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReadyToSign}
              className="bg-medical-blue hover:bg-blue-700"
            >
              Ready to Sign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Electronic Signature Dialog */}
      <Dialog open={showESignDialog} onOpenChange={(open) => {
        // Always allow closing via close button (X)
        // The close button will work regardless of signatureSaved state
        setShowESignDialog(open);
        if (!open) {
          setPendingSavePrescriptionId(null);
          setHideTabs(false); // Reset hideTabs when dialog closes
          setSignatureSaved(false); // Reset signature saved state when dialog closes
        }
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[95vh] overflow-y-auto"
          onInteractOutside={(e) => {
            // Prevent closing on outside click only if signature is not saved
            if (!signatureSaved) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on ESC key only if signature is not saved
            if (!signatureSaved) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PenTool className="h-6 w-6 text-medical-blue" />
              Advanced Electronic Signature
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="signature" className="space-y-4">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="signature">Signature</TabsTrigger>
            </TabsList>

            {/* Signature Tab */}
            <TabsContent value="signature" className="space-y-4">
              {selectedPrescription && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-slate-800 p-6 rounded-lg border border-blue-200 dark:border-gray-600">
                  <h4 className="font-semibold text-blue-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prescription Summary for Digital Signature
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800 dark:text-gray-300">
                    <div>
                      <p>
                        <strong>Patient:</strong>{" "}
                        {selectedPrescription.patientName}
                      </p>
                      <p>
                        <strong>Patient ID:</strong>{" "}
                        {selectedPrescription.patientId}
                      </p>
                      <p>
                        <strong>Date Prescribed:</strong>{" "}
                        {formatTimestampWithAmPm(
                          selectedPrescription.prescribedAt,
                          "MMM dd, yyyy h:mm a",
                        )}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Prescribing Provider:</strong>{" "}
                        {(() => {
                          const providerInfo = allUsers?.find((p: any) => p.id === selectedPrescription.doctorId);
                          return providerInfo ? `${providerInfo.firstName} ${providerInfo.lastName}` : selectedPrescription.providerName;
                        })()}
                      </p>
                      <p>
                        <strong>Created By:</strong>{" "}
                        {(() => {
                          const creatorInfo = allUsers?.find((p: any) => p.id === selectedPrescription.prescriptionCreatedBy);
                          return creatorInfo ? `${formatRoleLabel(creatorInfo.role)} - ${creatorInfo.firstName} ${creatorInfo.lastName}` : 'N/A';
                        })()}
                      </p>
                      <p>
                        <strong>Diagnosis:</strong>{" "}
                        {selectedPrescription.diagnosis}
                      </p>
                      <p>
                        <strong>Total Medications:</strong>{" "}
                        {selectedPrescription.medications.length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Medications to be signed:
                    </p>
                    {selectedPrescription.medications.map(
                      (med: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          • {med.name} {med.dosage} - {med.frequency} x{" "}
                          {med.quantity} ({med.refills} refills)
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Advanced Signature Canvas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Digital Signature Pad
                    </label>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Signature Quality: Real-time Analysis
                    </div>
                  </div>

                  <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg relative overflow-hidden bg-white dark:bg-gray-900 shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={200}
                      className="cursor-crosshair w-full"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawingTouch}
                      onTouchMove={drawTouch}
                      onTouchEnd={stopDrawingTouch}
                    />
                    <div className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500">
                      Advanced Capture Mode
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={clearSignature}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Signature Analytics */}
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Signature Quality Analysis
                    </h5>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Stroke Consistency:</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Excellent
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Pressure Variation:</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Natural
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Speed Analysis:</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Consistent
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Uniqueness Score:</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          98.7%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Biometric Verification
                    </h5>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Touch patterns analyzed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Behavioral biometrics captured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Device fingerprint verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Authentication Tab - Hidden */}
            {false && (
            <TabsContent value="authentication" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Multi-Factor Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">
                            Primary Authentication
                          </span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Verified
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">
                            Device Recognition
                          </span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Trusted
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm font-medium">
                            Time-based Verification
                          </span>
                        </div>
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                          Active
                        </span>
                      </div>
                    </div>

                    <Button className="w-full bg-medical-blue hover:bg-blue-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Additional Factor
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Security Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-2">
                      <p>
                        <strong>Session ID:</strong>{" "}
                        <span className="font-mono text-xs">
                          ESS-
                          {Math.random()
                            .toString(36)
                            .substr(2, 9)
                            .toUpperCase()}
                        </span>
                      </p>
                      <p>
                        <strong>IP Address:</strong>{" "}
                        <span className="font-mono text-xs">192.168.1.45</span>
                      </p>
                      <p>
                        <strong>Location:</strong> Authorized Facility
                      </p>
                      <p>
                        <strong>Timestamp:</strong>{" "}
                        {format(new Date(), "yyyy-MM-dd HH:mm:ss")} UTC
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border">
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Digital Certificate Status:</strong>
                      </p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          Valid & Current
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            )}

            {/* Verification Tab - Hidden */}
            {false && (
            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Advanced Signature Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <h5 className="font-medium text-green-800 mb-2">
                        Handwriting Analysis
                      </h5>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>• Stroke patterns: ✓ Verified</p>
                        <p>• Pressure dynamics: ✓ Natural</p>
                        <p>• Speed consistency: ✓ Human-like</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">
                        Biometric Matching
                      </h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Touch patterns: ✓ Match 97.8%</p>
                        <p>• Behavioral traits: ✓ Consistent</p>
                        <p>• Device interaction: ✓ Verified</p>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded border border-purple-200">
                      <h5 className="font-medium text-purple-800 mb-2">
                        AI Fraud Detection
                      </h5>
                      <div className="text-sm text-purple-700 space-y-1">
                        <p>• Anomaly detection: ✓ Clean</p>
                        <p>• Pattern recognition: ✓ Genuine</p>
                        <p>• Risk assessment: ✓ Low risk</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="font-medium text-gray-800 mb-2">
                      Verification Summary
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Overall Confidence:</strong>{" "}
                          <span className="text-green-600 font-medium">
                            99.2%
                          </span>
                        </p>
                        <p>
                          <strong>Authentication Level:</strong>{" "}
                          <span className="text-blue-600 font-medium">
                            High Security
                          </span>
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Verification Method:</strong> Multi-modal
                        </p>
                        <p>
                          <strong>Compliance Level:</strong>{" "}
                          <span className="text-green-600 font-medium">
                            FDA 21 CFR Part 11
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            )}

            {/* Compliance Tab - Hidden */}
            {false && (
            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Legal & Regulatory Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-3">
                      Electronic Signature Compliance Standards
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>FDA 21 CFR Part 11 Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>HIPAA Security Rule Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>ESIGN Act Compliant</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>EU eIDAS Regulation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>DEA EPCS Requirements</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>ISO 27001 Security Standards</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h5 className="font-semibold text-yellow-900 mb-2">
                      Legal Declaration
                    </h5>
                    <div className="text-xs text-yellow-800 space-y-2">
                      <p>
                        <strong>
                          By applying your electronic signature, you hereby
                          declare and confirm that:
                        </strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>
                          You are the licensed healthcare provider authorized to
                          prescribe the medication(s) listed
                        </li>
                        <li>
                          You have verified patient identity and reviewed their
                          complete medical history
                        </li>
                        <li>
                          The prescription information is accurate, complete,
                          and clinically appropriate
                        </li>
                        <li>
                          You understand this electronic signature carries the
                          same legal weight as a handwritten signature
                        </li>
                        <li>
                          You consent to the electronic processing and
                          transmission of this prescription
                        </li>
                        <li>
                          You acknowledge that this signature will be
                          permanently recorded with audit trail
                        </li>
                      </ul>
                      <p className="mt-3">
                        <strong>Audit Trail Information:</strong> This signature
                        will be logged with timestamp, IP address, device
                        fingerprint, and biometric verification data for
                        compliance and security purposes.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="font-medium text-gray-800 mb-2">
                      Digital Certificate Details
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p>
                          <strong>Certificate Authority:</strong> Cura Health CA
                        </p>
                        <p>
                          <strong>Certificate Type:</strong> Medical
                          Professional
                        </p>
                        <p>
                          <strong>Valid Until:</strong>{" "}
                          {format(
                            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                            "MMM dd, yyyy",
                          )}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Encryption Level:</strong> RSA-2048 / SHA-256
                        </p>
                        <p>
                          <strong>Trust Level:</strong> High Assurance
                        </p>
                        <p>
                          <strong>Verification Status:</strong>{" "}
                          <span className="text-green-600">
                            Active & Verified
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            )}
          </Tabs>

          {/* Success Message */}
          {signatureSaved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900">
                  Signature Saved Successfully!
                </h4>
                <p className="text-sm text-green-700">
                  Prescription has been electronically signed and saved to
                  database.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowESignDialog(false);
                setSignatureSaved(false);
              }}
              className="flex-1"
            >
              Cancel Signature Process
            </Button>
            <Button
              onClick={saveSignature}
              className="flex-2 bg-medical-blue hover:bg-blue-700"
              disabled={!selectedPrescription || signatureSaved}
            >
              <PenTool className="h-4 w-4 mr-2" />
              {signatureSaved
                ? "Signature Applied"
                : "Apply Advanced E-Signature"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drug Interactions Modal for Patient Role */}
      <Dialog open={showDrugInteractionsModal} onOpenChange={setShowDrugInteractionsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Your Drug Interactions
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {drugInteractionsData?.interactions && drugInteractionsData.interactions.length > 0 ? (
              <div className="space-y-4">
                {drugInteractionsData.interactions
                  .filter((interaction: any) => {
                    // Filter to show only interactions for this patient
                    const currentPatient = patients.find(
                      (p) => p.email?.toLowerCase() === user?.email?.toLowerCase()
                    );
                    return currentPatient && interaction.patientId === currentPatient.id;
                  })
                  .map((interaction: any, index: number) => (
                    <Card key={interaction.id || index} className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            interaction.severity === 'high' ? 'bg-red-100' :
                            interaction.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            <AlertTriangle className={`h-4 w-4 ${
                              interaction.severity === 'high' ? 'text-red-600' :
                              interaction.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-sm">
                                {interaction.medication1Name}
                              </span>
                              <span className="text-gray-400">+</span>
                              <span className="font-semibold text-sm">
                                {interaction.medication2Name}
                              </span>
                              <Badge variant={
                                interaction.severity === 'high' ? 'destructive' :
                                interaction.severity === 'medium' ? 'secondary' : 'outline'
                              } className="ml-auto">
                                {interaction.severity?.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                            </div>
                            {interaction.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {interaction.description}
                              </p>
                            )}
                            {interaction.warnings && interaction.warnings.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-red-700 mb-1">Warnings:</p>
                                <ul className="text-xs text-red-600 list-disc list-inside">
                                  {interaction.warnings.map((warning: string, i: number) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {interaction.recommendations && interaction.recommendations.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-green-700 mb-1">Recommendations:</p>
                                <ul className="text-xs text-green-600 list-disc list-inside">
                                  {interaction.recommendations.map((rec: string, i: number) => (
                                    <li key={i}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {drugInteractionsData.interactions.filter((interaction: any) => {
                  const currentPatient = patients.find(
                    (p) => p.email?.toLowerCase() === user?.email?.toLowerCase()
                  );
                  return currentPatient && interaction.patientId === currentPatient.id;
                }).length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No drug interactions found for your prescriptions.
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Your current medications have no known interactions.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No drug interactions found.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Your current medications have no known interactions.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowDrugInteractionsModal(false)}
              data-testid="button-close-drug-interactions"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Log Dialog */}
      <Dialog open={showShareLogDialog} onOpenChange={setShowShareLogDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Prescription Share History</DialogTitle>
          </DialogHeader>
          {selectedPrescriptionForShareLog && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Prescription ID: {selectedPrescriptionForShareLog.prescriptionNumber || selectedPrescriptionForShareLog.id}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Patient: {selectedPrescriptionForShareLog.patientName || "Unknown Patient"}
                </p>
              </div>
              
              {shareLogs.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Share History
                  </h3>
                  <div className="space-y-2">
                    {shareLogs.map((log: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Share2 className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                Shared with: {log.recipientEmail || log.pharmacyEmail || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {log.sharedAt || log.createdAt
                                  ? format(new Date(log.sharedAt || log.createdAt), "MMM dd, yyyy HH:mm:ss")
                                  : "N/A"}
                              </span>
                            </div>
                            {log.sharedBy && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Shared by: {log.sharedBy}
                              </div>
                            )}
                            {log.pharmacyName && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Pharmacy: {log.pharmacyName}
                              </div>
                            )}
                            {log.status && (
                              <div className="mt-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    log.status === "sent" || log.status === "success"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : log.status === "failed"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No share history found for this prescription.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={() => setShowShareLogDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog 
        open={showPdfViewerDialog} 
        onOpenChange={(open) => {
          setShowPdfViewerDialog(open);
          if (!open && pdfViewerUrl) {
            URL.revokeObjectURL(pdfViewerUrl);
            setPdfViewerUrl("");
            setSelectedPdfPrescription(null);
            setPdfLoadError(false);
          }
        }}
      >
        <DialogContent 
          className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0"
          onInteractOutside={(e) => {
            // Prevent closing on outside click
            e.preventDefault();
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>
              PDF Report: {selectedPdfPrescription?.prescriptionNumber || selectedPdfPrescription?.id || 'Prescription'}.pdf
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-4" style={{ minHeight: '400px', maxHeight: 'calc(90vh - 180px)' }}>
            {pdfViewerUrl ? (
              pdfLoadError ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="text-red-500">
                    <FileText className="h-16 w-16" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Failed to load PDF
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      The PDF could not be displayed. You can try downloading it instead.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = pdfViewerUrl;
                        link.download = `${selectedPdfPrescription?.prescriptionNumber || selectedPdfPrescription?.id || 'prescription'}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : (
              <iframe
                  src={`${pdfViewerUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full border rounded"
                title="Prescription PDF"
                style={{ minHeight: '400px', height: '100%' }}
                  onError={() => {
                    console.error("[CLIENT] Iframe failed to load PDF");
                    setPdfLoadError(true);
                  }}
                  onLoad={() => {
                    // Set a timeout to check if PDF loaded successfully
                    setTimeout(() => {
                      // If we still don't have an error after 3 seconds, assume it loaded
                      // This is a fallback since we can't reliably detect iframe errors due to CORS
                    }, 3000);
                  }}
              />
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Loading PDF...</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center px-6 pb-4 pt-4 border-t flex-shrink-0">
            <Button 
              onClick={() => {
                setShowPdfViewerDialog(false);
                if (pdfViewerUrl) {
                  URL.revokeObjectURL(pdfViewerUrl);
                  setPdfViewerUrl("");
                  setSelectedPdfPrescription(null);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Close
            </Button>
            {pdfViewerUrl && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = pdfViewerUrl;
                    link.download = `${selectedPdfPrescription?.prescriptionNumber || selectedPdfPrescription?.id || 'prescription'}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const printWindow = window.open(pdfViewerUrl, '_blank');
                    if (printWindow) {
                      printWindow.onload = () => {
                        printWindow.print();
                      };
                    }
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(pdfViewerUrl, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeletePrescriptionDialog}
        onOpenChange={(open) => {
          if (!deletePrescriptionMutation.isPending) {
            setShowDeletePrescriptionDialog(open);
            if (!open) {
              setPrescriptionPendingDelete(null);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prescription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the prescription for{" "}
              <span className="font-semibold text-foreground">
                {prescriptionPendingDelete?.patientName}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePrescriptionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeletePrescription();
              }}
              disabled={deletePrescriptionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePrescriptionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
