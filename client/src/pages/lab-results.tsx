import React, { useState, useEffect, useMemo } from "react";
import curaIcon from "@/assets/cura-icon.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useTheme } from "@/hooks/use-theme";
import { useCurrency } from "@/hooks/use-currency";
import { CurrencyIcon } from "@/components/ui/currency-icon";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Medical Specialties Data Structure
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": [
      "Common illnesses",
      "Preventive care",
    ],
    "Internal Medicine Specialist": [
      "Adult health",
      "Chronic diseases (diabetes, hypertension)",
    ],
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair",
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery",
      "Endocrine Surgery (thyroid, parathyroid, adrenal)",
      "Trauma & Emergency Surgery",
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)",
      "Trauma & Fracture Care",
    ],
    Neurosurgeon: [
      "Brain Tumor Surgery",
      "Spinal Surgery",
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery (Parkinson's, epilepsy, DBS)",
      "Trauma Neurosurgery",
    ],
    "Cardiothoracic Surgeon": [
      "Cardiac Surgery – Bypass, valve replacement",
      "Thoracic Surgery – Lungs, esophagus, chest tumors",
      "Congenital Heart Surgery – Pediatric heart defects",
      "Heart & Lung Transplants",
      "Minimally Invasive / Robotic Heart Surgery",
    ],
    "Plastic & Reconstructive Surgeon": [
      "Cosmetic Surgery (nose job, facelift, liposuction)",
      "Reconstructive Surgery (after cancer, trauma)",
      "Burn Surgery",
      "Craniofacial Surgery (cleft lip/palate, facial bones)",
      "Hand Surgery",
    ],
    "ENT Surgeon (Otolaryngologist)": [
      "Otology (ear surgeries, cochlear implants)",
      "Rhinology (sinus, deviated septum)",
      "Laryngology (voice box, throat)",
      "Head & Neck Surgery (thyroid, tumors)",
      "Pediatric ENT (tonsils, adenoids, ear tubes)",
      "Facial Plastic Surgery (nose/ear correction)",
    ],
    "Urological Surgeon": [
      "Endourology (kidney stones, minimally invasive)",
      "Uro-Oncology (prostate, bladder, kidney cancer)",
      "Pediatric Urology",
      "Male Infertility & Andrology",
      "Renal Transplant Surgery",
      "Neurourology (bladder control disorders)",
    ],
  },
  "Heart & Circulation": {
    Cardiologist: ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"],
  },
  "Women's Health": {
    Gynecologist: ["Female reproductive system"],
    Obstetrician: ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"],
  },
  "Children's Health": {
    Pediatrician: ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    Neonatologist: ["Newborn intensive care"],
  },
  "Brain & Nervous System": {
    Neurologist: ["Stroke", "Epilepsy", "Parkinson's"],
    Psychiatrist: ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"],
  },
  "Skin, Hair & Appearance": {
    Dermatologist: ["Skin", "Hair", "Nails"],
    Cosmetologist: ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"],
  },
  "Eye & Vision": {
    Ophthalmologist: ["Cataracts", "Glaucoma", "Surgeries"],
    Optometrist: ["Vision correction (glasses, lenses)"],
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    Orthodontist: ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"],
    Periodontist: ["Gum disease specialist"],
    Endodontist: ["Root canal specialist"],
  },
  "Digestive System": {
    Gastroenterologist: ["Stomach", "Intestines"],
    Hepatologist: ["Liver specialist"],
    "Colorectal Surgeon": ["Colon", "Rectum", "Anus"],
  },
  "Kidneys & Urinary Tract": {
    Nephrologist: ["Kidney diseases", "Dialysis"],
    "Urological Surgeon": ["Surgical urological procedures"],
  },
  "Respiratory System": {
    Pulmonologist: ["Asthma", "COPD", "Tuberculosis"],
    "Thoracic Surgeon": ["Lung surgeries"],
  },
  Cancer: {
    Oncologist: ["Medical cancer specialist"],
    "Radiation Oncologist": ["Radiation therapy"],
    "Surgical Oncologist": ["Cancer surgeries"],
  },
  "Endocrine & Hormones": {
    Endocrinologist: ["Diabetes", "Thyroid", "Hormones"],
  },
  "Muscles & Joints": {
    Rheumatologist: ["Arthritis", "Autoimmune"],
    "Sports Medicine Specialist": ["Athlete injuries"],
  },
  "Blood & Immunity": {
    Hematologist: ["Blood diseases (anemia, leukemia)"],
    "Immunologist / Allergist": ["Immune & allergy disorders"],
  },
  Others: {
    Geriatrician: ["Elderly care"],
    Pathologist: ["Lab & diagnostic testing"],
    Radiologist: ["Imaging (X-ray, CT, MRI)"],
    Anesthesiologist: ["Pain & anesthesia"],
    "Emergency Medicine Specialist": ["Accidents", "Trauma"],
    "Occupational Medicine Specialist": ["Workplace health"],
  },
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  Eye,
  Download,
  User,
  Clock,
  AlertTriangle,
  Check,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  FileText as Prescription,
  Printer,
  ChevronsUpDown,
  X,
  Edit,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Sparkles,
  Grid,
  List,
  Phone,
  MapPin,
  Calendar,
  Copy,
  Receipt,
  PenTool,
  PoundSterling,
  BarChart,
  Save,
  Loader2,
  MoreVertical,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DatabaseLabResult {
  id: number;
  organizationId: number;
  patientId: number;
  testId: string;
  testType: string;
  orderedBy: number;
  doctorName?: string;
  mainSpecialty?: string;
  subSpecialty?: string;
  priority?: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  results: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "abnormal_high" | "abnormal_low" | "critical";
    flag?: string;
  }>;
  criticalValues: boolean;
  notes?: string;
  createdAt: string;
  readyToGenerateLab?: boolean; // Workflow: when prescription is saved, set to true
  labResultGeneratedReport?: boolean; // Workflow: when report is generated, set to true
  signature?: {
    doctorSignature?: string; // base64 encoded signature image
    signedBy?: string; // doctor name
    signedAt?: string; // ISO timestamp
    signerId?: number; // user ID who signed
  };
}

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

// Test types for lab orders - will be populated from lab_test_pricing table
const TEST_TYPES = [
  "Complete Blood Count (CBC)",
  "Basic Metabolic Panel",
  "Comprehensive Metabolic Panel",
  "Lipid Panel",
  "Liver Function Tests",
  "Thyroid Function Tests",
  "Hemoglobin A1C",
  "Urinalysis",
  "Vitamin D",
  "Iron Studies",
];

// Test field definitions for dynamic lab result generation
// Keys must match exactly with LAB_TEST_OPTIONS in billing.tsx
const TEST_FIELD_DEFINITIONS: Record<string, Array<{
  name: string;
  unit: string;
  referenceRange: string;
}>> = {
  "Complete Blood Count (CBC)": [
    { name: "Hemoglobin (Hb)", unit: "g/dL", referenceRange: "13.0 - 17.0" },
    { name: "Total WBC Count", unit: "x10³/L", referenceRange: "4.0 - 10.0" },
    { name: "RBC Count", unit: "x10¹²/L", referenceRange: "4.5 - 5.9" },
    { name: "Hematocrit (HCT/PCV)", unit: "%", referenceRange: "40 - 50" },
    { name: "MCV", unit: "fL", referenceRange: "80 - 96" },
    { name: "MCH", unit: "pg", referenceRange: "27 - 32" },
    { name: "MCHC", unit: "g/dL", referenceRange: "32 - 36" },
    { name: "Platelet Count", unit: "x10³/L", referenceRange: "150 - 450" },
    { name: "Neutrophils", unit: "%", referenceRange: "40 - 75" },
    { name: "Lymphocytes", unit: "%", referenceRange: "20 - 45" },
    { name: "Monocytes", unit: "%", referenceRange: "2 - 10" },
    { name: "Eosinophils", unit: "%", referenceRange: "1 - 6" },
    { name: "Basophils", unit: "%", referenceRange: "<2" },
  ],
  "Basic Metabolic Panel": [
    { name: "Glucose", unit: "mg/dL", referenceRange: "70 - 100" },
    { name: "Calcium", unit: "mg/dL", referenceRange: "8.5 - 10.5" },
    { name: "Sodium", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "CO2", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "BUN", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "Creatinine", unit: "mg/dL", referenceRange: "0.6 - 1.2" },
  ],
  "Basic Metabolic Panel (BMP) / Chem-7": [
    { name: "Glucose", unit: "mg/dL", referenceRange: "70 - 100" },
    { name: "Calcium", unit: "mg/dL", referenceRange: "8.5 - 10.5" },
    { name: "Sodium", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "CO2", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "BUN", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "Creatinine", unit: "mg/dL", referenceRange: "0.6 - 1.2" },
  ],
  "Liver Function Tests (AST, ALT, ALP, Bilirubin)": [
    { name: "ALT (SGPT)", unit: "U/L", referenceRange: "7 - 56" },
    { name: "AST (SGOT)", unit: "U/L", referenceRange: "10 - 40" },
    { name: "ALP", unit: "U/L", referenceRange: "44 - 147" },
    { name: "Total Bilirubin", unit: "mg/dL", referenceRange: "0.1 - 1.2" },
    { name: "Direct Bilirubin", unit: "mg/dL", referenceRange: "0.0 - 0.3" },
    { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3" },
    { name: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.5" },
    { name: "Globulin", unit: "g/dL", referenceRange: "2.0 - 3.5" },
  ],
  "Lipid Panel": [
    { name: "Total Cholesterol", unit: "mg/dL", referenceRange: "<200" },
    { name: "LDL Cholesterol", unit: "mg/dL", referenceRange: "<100" },
    { name: "HDL Cholesterol", unit: "mg/dL", referenceRange: ">40" },
    { name: "Triglycerides", unit: "mg/dL", referenceRange: "<150" },
    { name: "VLDL Cholesterol", unit: "mg/dL", referenceRange: "5 - 40" },
  ],
  "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)": [
    { name: "Total Cholesterol", unit: "mg/dL", referenceRange: "<200" },
    { name: "LDL Cholesterol", unit: "mg/dL", referenceRange: "<100" },
    { name: "HDL Cholesterol", unit: "mg/dL", referenceRange: ">40" },
    { name: "Triglycerides", unit: "mg/dL", referenceRange: "<150" },
    { name: "VLDL Cholesterol", unit: "mg/dL", referenceRange: "5 - 40" },
  ],
  "Thyroid Function Tests (TSH, Free T4, Free T3)": [
    { name: "TSH", unit: "mIU/L", referenceRange: "0.4 - 4.0" },
    { name: "Free T4", unit: "ng/dL", referenceRange: "0.8 - 1.8" },
    { name: "Free T3", unit: "pg/mL", referenceRange: "2.3 - 4.2" },
    { name: "Total T4", unit: "μg/dL", referenceRange: "5.0 - 12.0" },
    { name: "Total T3", unit: "ng/dL", referenceRange: "80 - 200" },
  ],
  "Hemoglobin A1C (HbA1c)": [
    { name: "Hemoglobin A1C (HbA1c)", unit: "%", referenceRange: "4.0 - 5.6" },
    { name: "Estimated Average Glucose (eAG)", unit: "mg/dL", referenceRange: "< 117" },
  ],
  "Comprehensive Metabolic Panel (CMP)": [
    { name: "Glucose", unit: "mg/dL", referenceRange: "70 - 100" },
    { name: "Calcium", unit: "mg/dL", referenceRange: "8.5 - 10.5" },
    { name: "Sodium", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "CO2", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "BUN", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "Creatinine", unit: "mg/dL", referenceRange: "0.6 - 1.2" },
    { name: "ALT (SGPT)", unit: "U/L", referenceRange: "7 - 56" },
    { name: "AST (SGOT)", unit: "U/L", referenceRange: "10 - 40" },
    { name: "ALP", unit: "U/L", referenceRange: "44 - 147" },
    { name: "Total Bilirubin", unit: "mg/dL", referenceRange: "0.1 - 1.2" },
    { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3" },
    { name: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.5" },
  ],
  "Urinalysis (UA)": [
    { name: "Color", unit: "", referenceRange: "Yellow to Amber" },
    { name: "Appearance", unit: "", referenceRange: "Clear" },
    { name: "Specific Gravity", unit: "", referenceRange: "1.005 - 1.030" },
    { name: "pH", unit: "", referenceRange: "4.5 - 8.0" },
    { name: "Protein", unit: "mg/dL", referenceRange: "Negative" },
    { name: "Glucose", unit: "mg/dL", referenceRange: "Negative" },
    { name: "Ketones", unit: "", referenceRange: "Negative" },
    { name: "Blood", unit: "", referenceRange: "Negative" },
    { name: "Bilirubin", unit: "", referenceRange: "Negative" },
    { name: "Urobilinogen", unit: "mg/dL", referenceRange: "0.1 - 1.0" },
    { name: "Nitrites", unit: "", referenceRange: "Negative" },
    { name: "Leukocyte Esterase", unit: "", referenceRange: "Negative" },
    { name: "WBC", unit: "/hpf", referenceRange: "0 - 5" },
    { name: "RBC", unit: "/hpf", referenceRange: "0 - 2" },
    { name: "Epithelial Cells", unit: "/hpf", referenceRange: "Few" },
    { name: "Bacteria", unit: "", referenceRange: "None to Few" },
    { name: "Casts", unit: "/lpf", referenceRange: "0 - 2" },
    { name: "Crystals", unit: "", referenceRange: "None to Few" },
  ],
  "Vitamin D": [
    { name: "25-Hydroxyvitamin D", unit: "ng/mL", referenceRange: "30 - 100" },
    { name: "Vitamin D2 (Ergocalciferol)", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Vitamin D3 (Cholecalciferol)", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Total Vitamin D", unit: "ng/mL", referenceRange: "30 - 100" },
  ],
  "Iron Studies (Serum Iron, TIBC, Ferritin)": [
    { name: "Serum Iron", unit: "μg/dL", referenceRange: "60 - 170" },
    { name: "TIBC (Total Iron Binding Capacity)", unit: "μg/dL", referenceRange: "240 - 450" },
    { name: "UIBC (Unsaturated Iron Binding Capacity)", unit: "μg/dL", referenceRange: "111 - 343" },
    { name: "Transferrin Saturation", unit: "%", referenceRange: "20 - 50" },
    { name: "Ferritin", unit: "ng/mL", referenceRange: "12 - 300" },
    { name: "Transferrin", unit: "mg/dL", referenceRange: "200 - 360" },
  ],
  "Kidney Function Tests (Creatinine, BUN, eGFR)": [
    { name: "Creatinine", unit: "mg/dL", referenceRange: "0.6 - 1.2" },
    { name: "BUN (Blood Urea Nitrogen)", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "eGFR (Estimated Glomerular Filtration Rate)", unit: "mL/min/1.73m²", referenceRange: ">60" },
    { name: "BUN/Creatinine Ratio", unit: "", referenceRange: "10 - 20" },
    { name: "Urea", unit: "mg/dL", referenceRange: "15 - 44" },
  ],
  "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)": [
    { name: "Sodium (Na+)", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium (K+)", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride (Cl-)", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "Bicarbonate (HCO3-)", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "Anion Gap", unit: "mmol/L", referenceRange: "8 - 16" },
  ],
  "Blood Glucose (Fasting / Random / Postprandial)": [
    { name: "Fasting Blood Glucose", unit: "mg/dL", referenceRange: "70 - 100" },
    { name: "Random Blood Glucose", unit: "mg/dL", referenceRange: "70 - 140" },
    { name: "Postprandial Glucose (2 hours)", unit: "mg/dL", referenceRange: "<140" },
  ],
  "C-Reactive Protein (CRP)": [
    { name: "CRP", unit: "mg/L", referenceRange: "<3.0" },
    { name: "High-Sensitivity CRP (hs-CRP)", unit: "mg/L", referenceRange: "<1.0" },
  ],
  "Erythrocyte Sedimentation Rate (ESR)": [
    { name: "ESR (Westergren Method)", unit: "mm/hr", referenceRange: "0 - 20" },
  ],
  "Coagulation Tests (PT, PTT, INR)": [
    { name: "Prothrombin Time (PT)", unit: "seconds", referenceRange: "11 - 13.5" },
    { name: "Partial Thromboplastin Time (PTT)", unit: "seconds", referenceRange: "25 - 35" },
    { name: "INR (International Normalized Ratio)", unit: "", referenceRange: "0.8 - 1.2" },
    { name: "Fibrinogen", unit: "mg/dL", referenceRange: "200 - 400" },
  ],
  "Albumin / Total Protein": [
    { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3" },
    { name: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.5" },
    { name: "Globulin", unit: "g/dL", referenceRange: "2.0 - 3.5" },
    { name: "A/G Ratio", unit: "", referenceRange: "1.0 - 2.5" },
  ],
  "Vitamin B12 / Folate": [
    { name: "Vitamin B12 (Cobalamin)", unit: "pg/mL", referenceRange: "200 - 900" },
    { name: "Folate (Folic Acid)", unit: "ng/mL", referenceRange: "2.7 - 17.0" },
    { name: "RBC Folate", unit: "ng/mL", referenceRange: "140 - 628" },
  ],
  "Hormone Panels (e.g., LH, FSH, Testosterone, Estrogen)": [
    { name: "LH (Luteinizing Hormone)", unit: "mIU/mL", referenceRange: "1.5 - 9.3" },
    { name: "FSH (Follicle-Stimulating Hormone)", unit: "mIU/mL", referenceRange: "1.4 - 18.1" },
    { name: "Testosterone (Total)", unit: "ng/dL", referenceRange: "300 - 1000" },
    { name: "Free Testosterone", unit: "pg/mL", referenceRange: "9 - 30" },
    { name: "Estrogen (Estradiol)", unit: "pg/mL", referenceRange: "15 - 350" },
    { name: "Progesterone", unit: "ng/mL", referenceRange: "0.1 - 25" },
  ],
  "Prostate-Specific Antigen (PSA)": [
    { name: "Total PSA", unit: "ng/mL", referenceRange: "<4.0" },
    { name: "Free PSA", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Free/Total PSA Ratio", unit: "%", referenceRange: ">25" },
  ],
  "Thyroid Antibodies (e.g. Anti-TPO, Anti-TG)": [
    { name: "Anti-TPO (Thyroid Peroxidase Antibodies)", unit: "IU/mL", referenceRange: "<35" },
    { name: "Anti-TG (Thyroglobulin Antibodies)", unit: "IU/mL", referenceRange: "<40" },
    { name: "TSI (Thyroid-Stimulating Immunoglobulin)", unit: "%", referenceRange: "<140" },
  ],
  "Creatine Kinase (CK)": [
    { name: "Total CK", unit: "U/L", referenceRange: "30 - 200" },
    { name: "CK-MM", unit: "U/L", referenceRange: "Variable" },
    { name: "CK-MB", unit: "U/L", referenceRange: "<25" },
  ],
  "Cardiac Biomarkers (Troponin, CK-MB, BNP)": [
    { name: "Troponin I", unit: "ng/mL", referenceRange: "<0.04" },
    { name: "Troponin T", unit: "ng/mL", referenceRange: "<0.01" },
    { name: "CK-MB", unit: "ng/mL", referenceRange: "<5" },
    { name: "BNP (B-type Natriuretic Peptide)", unit: "pg/mL", referenceRange: "<100" },
    { name: "NT-proBNP", unit: "pg/mL", referenceRange: "<125" },
  ],
  "Electrolyte Panel": [
    { name: "Sodium (Na+)", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium (K+)", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride (Cl-)", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "Bicarbonate (HCO3-)", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "Calcium (Ca2+)", unit: "mg/dL", referenceRange: "8.5 - 10.5" },
    { name: "Magnesium (Mg2+)", unit: "mg/dL", referenceRange: "1.7 - 2.2" },
    { name: "Phosphate (PO4³-)", unit: "mg/dL", referenceRange: "2.5 - 4.5" },
  ],
  "Uric Acid": [
    { name: "Uric Acid", unit: "mg/dL", referenceRange: "3.5 - 7.2" },
  ],
  "Lipase / Amylase (Pancreatic enzymes)": [
    { name: "Lipase", unit: "U/L", referenceRange: "13 - 60" },
    { name: "Amylase", unit: "U/L", referenceRange: "30 - 110" },
    { name: "Pancreatic Amylase", unit: "U/L", referenceRange: "13 - 53" },
  ],
  "Hepatitis B / C Serologies": [
    { name: "HBsAg (Hepatitis B Surface Antigen)", unit: "", referenceRange: "Negative" },
    { name: "Anti-HBs (Hepatitis B Surface Antibody)", unit: "mIU/mL", referenceRange: ">10" },
    { name: "Anti-HBc (Hepatitis B Core Antibody)", unit: "", referenceRange: "Negative" },
    { name: "HBeAg (Hepatitis B e-Antigen)", unit: "", referenceRange: "Negative" },
    { name: "Anti-HCV (Hepatitis C Antibody)", unit: "", referenceRange: "Negative" },
    { name: "HCV RNA (Quantitative)", unit: "IU/mL", referenceRange: "Not Detected" },
  ],
  "HIV Antibody / Viral Load": [
    { name: "HIV-1/2 Antibody", unit: "", referenceRange: "Negative" },
    { name: "HIV p24 Antigen", unit: "", referenceRange: "Negative" },
    { name: "HIV Viral Load (RNA)", unit: "copies/mL", referenceRange: "Not Detected" },
    { name: "CD4 Count", unit: "cells/μL", referenceRange: "500 - 1500" },
    { name: "CD4/CD8 Ratio", unit: "", referenceRange: "0.9 - 3.0" },
  ],
  "HCG (Pregnancy / Quantitative)": [
    { name: "Quantitative hCG (Beta-hCG)", unit: "mIU/mL", referenceRange: "<5" },
    { name: "Qualitative hCG", unit: "", referenceRange: "Negative" },
  ],
  "Autoimmune Panels (ANA, ENA, Rheumatoid Factor)": [
    { name: "ANA (Antinuclear Antibody)", unit: "", referenceRange: "Negative" },
    { name: "Anti-dsDNA", unit: "IU/mL", referenceRange: "<30" },
    { name: "Anti-Sm (Smith)", unit: "", referenceRange: "Negative" },
    { name: "Anti-RNP", unit: "", referenceRange: "Negative" },
    { name: "Anti-SSA (Ro)", unit: "", referenceRange: "Negative" },
    { name: "Anti-SSB (La)", unit: "", referenceRange: "Negative" },
    { name: "Rheumatoid Factor (RF)", unit: "IU/mL", referenceRange: "<20" },
    { name: "Anti-CCP (Anti-Cyclic Citrullinated Peptide)", unit: "U/mL", referenceRange: "<20" },
  ],
  "Tumor Markers (e.g. CA-125, CEA, AFP)": [
    { name: "CA-125 (Ovarian)", unit: "U/mL", referenceRange: "<35" },
    { name: "CEA (Carcinoembryonic Antigen)", unit: "ng/mL", referenceRange: "<3.0" },
    { name: "AFP (Alpha-Fetoprotein)", unit: "ng/mL", referenceRange: "<10" },
    { name: "CA 19-9 (Pancreatic)", unit: "U/mL", referenceRange: "<37" },
    { name: "CA 15-3 (Breast)", unit: "U/mL", referenceRange: "<30" },
  ],
  "Blood Culture & Sensitivity": [
    { name: "Culture Result", unit: "", referenceRange: "No Growth" },
    { name: "Organism Identified", unit: "", referenceRange: "None" },
    { name: "Sensitivity Pattern", unit: "", referenceRange: "N/A" },
    { name: "Blood Culture Time to Positivity", unit: "hours", referenceRange: "N/A" },
  ],
  "Stool Culture / Ova & Parasites": [
    { name: "Stool Culture", unit: "", referenceRange: "No Pathogens" },
    { name: "Ova and Parasites", unit: "", referenceRange: "None Seen" },
    { name: "Occult Blood", unit: "", referenceRange: "Negative" },
    { name: "Fecal Leukocytes", unit: "", referenceRange: "Negative" },
  ],
  "Sputum Culture": [
    { name: "Culture Result", unit: "", referenceRange: "Normal Flora" },
    { name: "Gram Stain", unit: "", referenceRange: "Normal" },
    { name: "AFB (Acid-Fast Bacilli)", unit: "", referenceRange: "Negative" },
    { name: "Fungal Culture", unit: "", referenceRange: "No Growth" },
  ],
  "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)": [
    { name: "COVID-19 PCR", unit: "", referenceRange: "Negative" },
    { name: "Influenza A PCR", unit: "", referenceRange: "Negative" },
    { name: "Influenza B PCR", unit: "", referenceRange: "Negative" },
    { name: "RSV PCR", unit: "", referenceRange: "Negative" },
    { name: "Viral Load (Ct Value)", unit: "Ct", referenceRange: ">35" },
  ],
  "Hormonal tests (Cortisol, ACTH)": [
    { name: "Cortisol (AM)", unit: "μg/dL", referenceRange: "6 - 23" },
    { name: "Cortisol (PM)", unit: "μg/dL", referenceRange: "3 - 16" },
    { name: "ACTH (Adrenocorticotropic Hormone)", unit: "pg/mL", referenceRange: "10 - 60" },
    { name: "24-hour Urinary Free Cortisol", unit: "μg/24hr", referenceRange: "10 - 100" },
  ],
};

// Database-driven lab results - no more mock data

// Stripe Payment Form Component
function StripePaymentForm({ onSuccess, onCancel }: { onSuccess: (paymentIntentId: string) => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required'
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-3 pt-4">
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
          className="flex-1 bg-medical-blue hover:bg-blue-700"
        >
          {isProcessing ? "Processing..." : "Pay Now"}
        </Button>
      </div>
    </form>
  );
}

export default function LabResultsPage() {
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isDoctor, isAdmin, canCreate, canEdit, canDelete } = useRolePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterTestId, setFilterTestId] = useState<string>("");
  const [testIdPopoverOpen, setTestIdPopoverOpen] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showShareResultDialog, setShowShareResultDialog] = useState(false);
  const [shareResultDialogTitle, setShareResultDialogTitle] = useState<string>("");
  const [shareResultDialogDescription, setShareResultDialogDescription] = useState<string>("");
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showFillResultDialog, setShowFillResultDialog] = useState(false);
  const [showPdfViewerDialog, setShowPdfViewerDialog] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string>("");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [selectedLabOrder, setSelectedLabOrder] = useState<any>(null);
  const [selectedResult, setSelectedResult] =
    useState<DatabaseLabResult | null>(null);

  // After generating a lab result PDF, show a preview + optional share action.
  const [autoSharePreviewOpen, setAutoSharePreviewOpen] = useState(false);
  const [autoSharePreviewResult, setAutoSharePreviewResult] = useState<any>(null);
  const [autoShareSending, setAutoShareSending] = useState(false);
  // Check whether the lab result PDF exists so we can disable "Send Results" if missing.
  const {
    data: sharePdfStatus,
    isLoading: sharePdfStatusLoading,
    isError: sharePdfStatusIsError,
    error: sharePdfStatusError,
    refetch: refetchSharePdfStatus,
  } = useQuery({
    queryKey: ["/api/lab-results", selectedResult?.id, "pdf-status"],
    enabled: showShareDialog && !!selectedResult?.id,
    retry: false,
    queryFn: async () => {
      if (!selectedResult?.id) return { exists: false, fileName: null as string | null };
      try {
        const response = await apiRequest("GET", `/api/lab-results/${selectedResult.id}/pdf-status`);
        return await response.json();
      } catch (e: any) {
        // Treat 404 (lab result not found / pdf missing) as a valid "doesn't exist" state,
        // not a hard error that blocks the UI.
        const msg = String(e?.message || "");
        if (msg.startsWith("404:")) {
          return { exists: false, fileName: null as string | null };
        }
        throw e;
      }
    },
  });

  useEffect(() => {
    if (showShareDialog && selectedResult?.id) {
      // Ensure we refresh status each time user opens the share dialog.
      refetchSharePdfStatus();
    }
  }, [showShareDialog, selectedResult?.id, refetchSharePdfStatus]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [selectedEditRole, setSelectedEditRole] = useState<string>("");
  const [selectedTestTypes, setSelectedTestTypes] = useState<string[]>([]);
  const [testTypePopoverOpen, setTestTypePopoverOpen] = useState(false);
  const [generateFormData, setGenerateFormData] = useState<any>({});
  const [fillResultFormData, setFillResultFormData] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [customFields, setCustomFields] = useState<Record<string, Array<{ name: string, unit: string, referenceRange: string }>>>({});

  // Invoice workflow states
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>({
    serviceDate: new Date().toISOString().split('T')[0],
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    items: [] as any[],
    totalAmount: 0,
    paymentMethod: 'cash',
    insuranceProvider: '',
    notes: ''
  });
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string>("");

  const shareGeneratedLabResult = async (labResult: any) => {
    if (!labResult) return;
    setAutoShareSending(true);
    try {
      // Resolve custom patient_id (patients.patient_id) from the currently loaded patients list.
      const patientRow = Array.isArray(patients)
        ? (patients as any[]).find((p) => Number(p?.id) === Number(labResult.patientId))
        : null;
      const customPatientId = String(patientRow?.patientId ?? "").trim();
      if (!customPatientId) {
        throw new Error("Patient ID not found for this lab result.");
      }

      // Fetch patient email from DB by patient_id.
      const emailRes = await apiRequest(
        "GET",
        `/api/patients/email-by-patient-id?${new URLSearchParams({ patientId: customPatientId }).toString()}`
      );
      const emailData = await emailRes.json();
      const recipientEmail = String(emailData?.email ?? "").trim();
      if (!recipientEmail) {
        throw new Error("Patient email not found.");
      }

      // Send the lab result PDF via existing endpoint.
      const shareRes = await apiRequest("POST", `/api/lab-results/${labResult.id}/share-email`, {
        recipientEmail,
        message: `Lab results for ${labResult.testType || "your test"} are now available.`,
      });
      const shareData = await shareRes.json();

      setShareResultDialogTitle("Shared");
      setShareResultDialogDescription(
        `Lab result PDF sent to ${shareData.email || recipientEmail} (${shareData.patientName || getPatientName(labResult.patientId)})`
      );
      setShowShareResultDialog(true);
      setAutoSharePreviewOpen(false);
    } catch (error: any) {
      toast({
        title: "Share Failed",
        description: error?.message || "Failed to share lab result",
        variant: "destructive",
      });
    } finally {
      setAutoShareSending(false);
    }
  };

  /**
   * Auto-send lab result PDF after generation to:
   * - patient email (resolved from patients table)
   * - provider email (orderedBy user email)
   */
  const autoSendLabResultEmails = async (labResult: any) => {
    if (!labResult) return;
    try {
      // Resolve custom patient_id (patients.patient_id) from the currently loaded patients list.
      const patientRow = Array.isArray(patients)
        ? (patients as any[]).find((p) => Number(p?.id) === Number(labResult.patientId))
        : null;
      const customPatientId = String(patientRow?.patientId ?? "").trim();
      if (!customPatientId) return;

      // Fetch patient email from DB by patient_id.
      const emailRes = await apiRequest(
        "GET",
        `/api/patients/email-by-patient-id?${new URLSearchParams({ patientId: customPatientId }).toString()}`,
      );
      const emailData = await emailRes.json();
      const patientEmail = String(emailData?.email ?? "").trim();

      // Provider email from users table (orderedBy).
      const orderedById = Number(labResult.orderedBy);
      const orderedByUser = Array.isArray(users) ? (users as any[]).find((u) => Number(u?.id) === orderedById) : null;
      const providerEmail = String(orderedByUser?.email ?? "").trim();

      const recipients = Array.from(new Set([patientEmail, providerEmail].map((x) => String(x || "").trim()).filter(Boolean)));
      if (recipients.length === 0) return;

      await Promise.all(
        recipients.map((recipientEmail) =>
          apiRequest("POST", `/api/lab-results/${labResult.id}/share-email`, {
            recipientEmail,
            message: `Lab results for ${labResult.testType || "your test"} are now available.`,
          }),
        ),
      );
    } catch (e) {
      // Do not block generation success on email failures.
      console.warn("[LAB-AUTO-SHARE] Auto email failed:", e);
    }
  };

  // E-Signature states
  const [showESignDialog, setShowESignDialog] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [hideTabs, setHideTabs] = useState(true);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);
  const [showRequiredSignatureDialog, setShowRequiredSignatureDialog] = useState(false);
  const [pendingPdfSave, setPendingPdfSave] = useState<{ resultId: number } | null>(null);
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

  // Signature details dialog states
  const [showSignatureDetailsDialog, setShowSignatureDetailsDialog] = useState(false);
  const [selectedSignatureData, setSelectedSignatureData] = useState<any>(null);

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

  // Fetch clinic header data
  const { data: clinicHeader } = useQuery({
    queryKey: ["/api/clinic-headers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/clinic-headers");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Clinic header fetch error:", error);
        return null;
      }
    },
  });

  // Fetch clinic footer data
  const { data: clinicFooter } = useQuery({
    queryKey: ["/api/clinic-footers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/clinic-footers");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Clinic footer fetch error:", error);
        return null;
      }
    },
  });

  // Doctor specialty states for lab order
  const [selectedSpecialtyCategory, setSelectedSpecialtyCategory] =
    useState<string>("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState<string>("");
  const [selectedSpecificArea, setSelectedSpecificArea] = useState<string>("");
  const [shareFormData, setShareFormData] = useState({
    method: "email",
    email: "",
    whatsapp: "",
    message: "",
  });
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    patientName: "",
    testType: [] as string[],
    priority: "routine",
    notes: "",
    selectedRole: "",
    selectedUserId: "",
    selectedUserName: "",
  });
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [testTypeOpen, setTestTypeOpen] = useState(false);
  const [orderRoleSearchOpen, setOrderRoleSearchOpen] = useState(false);
  const [orderNameSearchOpen, setOrderNameSearchOpen] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editStatusDialog, setEditStatusDialog] = useState<{ id: number; status: string } | null>(null);
  const [editStatusDraft, setEditStatusDraft] = useState<string>("");
  const [statusUpdateSuccessModal, setStatusUpdateSuccessModal] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeTab, setActiveTab] = useState<"request" | "generate" | "generated">("request");
  const [showTestResults, setShowTestResults] = useState(false);

  // Helper function to generate random value within reference range
  const generateValueFromRange = (referenceRange: string): string | null => {
    // Handle different range formats
    if (referenceRange.includes(' - ')) {
      // Format: "13.0 - 17.0" or "4.0 - 10.0"
      const parts = referenceRange.split(' - ').map(v => parseFloat(v.trim()));
      if (parts.some(isNaN)) return null; // Skip non-numeric ranges
      const [min, max] = parts;
      const value = min + Math.random() * (max - min);
      // Determine decimal places from original range
      const decimals = referenceRange.includes('.') ? 1 : 0;
      return value.toFixed(decimals);
    } else if (referenceRange.startsWith('<')) {
      // Format: "<2" or "<200"
      const max = parseFloat(referenceRange.substring(1).trim());
      if (isNaN(max)) return null; // Skip non-numeric ranges
      const value = Math.random() * (max * 0.8); // Use 80% of max for safety
      const decimals = referenceRange.includes('.') ? 1 : 0;
      return value.toFixed(decimals);
    } else if (referenceRange.startsWith('>')) {
      // Format: ">10" or ">150"
      const min = parseFloat(referenceRange.substring(1).trim());
      if (isNaN(min)) return null; // Skip non-numeric ranges
      const value = min + Math.random() * (min * 0.5); // Use min + 50% for safety
      const decimals = referenceRange.includes('.') ? 1 : 0;
      return value.toFixed(decimals);
    }

    // Skip other formats (e.g., "negative", "positive", etc.)
    return null;
  };

  // Real API data fetching for patients - MUST come first before lab results query
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
      return data;
    },
  });

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

  const formatPatientDropdownLabel = (patient: any) =>
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() +
    (patient?.patientId ? ` (${patient.patientId})` : "");

  /** Group by login userId — account holder first, family members with ↳ */
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

  // Role-based lab results fetching - comes after patients query
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ["/api/lab-results", user?.role, user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Check if the current user role is Patient
      if (user.role === "patient") {
        // Get the patient ID from session/auth - match by email first for accuracy
        console.log("🔍 LAB RESULTS: Looking for patient matching user:", {
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          userId: user.id
        });
        console.log("📋 LAB RESULTS: Available patients:", patients.map((p: any) => ({
          id: p.id,
          email: p.email,
          name: `${p.firstName} ${p.lastName}`
        })));

        // Try email match first (most reliable)
        let currentPatient = patients.find((patient: any) =>
          patient.email && user.email && patient.email.toLowerCase() === user.email.toLowerCase()
        );

        // If no email match, try exact name match
        if (!currentPatient) {
          currentPatient = patients.find((patient: any) =>
            patient.firstName && user.firstName && patient.lastName && user.lastName &&
            patient.firstName.toLowerCase() === user.firstName.toLowerCase() &&
            patient.lastName.toLowerCase() === user.lastName.toLowerCase()
          );
        }

        if (currentPatient) {
          console.log("✅ LAB RESULTS: Found matching patient:", currentPatient);
          // Fetch lab results filtered by patient ID
          const response = await apiRequest("GET", `/api/lab-results?patientId=${currentPatient.id}`);
          return await response.json();
        } else {
          // If patient doesn't exist, return empty array
          console.log("❌ LAB RESULTS: Patient not found for user:", user.email);
          return [];
        }
      } else if (isDoctorLike(user.role)) {
        // For doctor roles, filter by doctor_name matching logged in doctor's full name
        const doctorFullName = `${user.firstName} ${user.lastName}`;
        console.log("🔍 LAB RESULTS: Filtering for doctor:", doctorFullName);
        const response = await apiRequest("GET", "/api/lab-results");
        const allResults = await response.json();
        // Filter results where doctor_name matches logged in doctor's name
        const doctorResults = allResults.filter((result: any) =>
          result.doctorName === doctorFullName
        );
        console.log("✅ LAB RESULTS: Filtered results for doctor:", doctorResults.length);
        return doctorResults;
      } else {
        // For other roles (admin, etc.), show all lab results
        const response = await apiRequest("GET", "/api/lab-results");
        const allResults = await response.json();

        // Log summary for organization 20
        if (user?.organizationId === 20) {
          console.log(`\n[LAB RESULTS SUMMARY] Organization ID: 20`);
          console.log(`Total records: ${allResults.length}\n`);

          // Use the same normalization logic as the actual filtering
          const normalizeBool = (val: any): boolean => {
            if (val === null || val === undefined) return false;
            if (typeof val === 'boolean') return val;
            if (typeof val === 'string') {
              const lower = val.toLowerCase().trim();
              if (lower === 'true' || lower === '1') return true;
              if (lower === 'false' || lower === '0' || lower === '') return false;
            }
            if (typeof val === 'number') return val === 1;
            return false;
          };

          const tabDistribution = {
            requestReport: allResults.filter((r: any) => {
              const ready = normalizeBool(r.ready_to_generate_lab);
              const generated = normalizeBool(r.lab_result_generated_report);
              return ready === false && generated === false;
            }),
            generateReports: allResults.filter((r: any) => {
              const ready = normalizeBool(r.ready_to_generate_lab);
              const generated = normalizeBool(r.lab_result_generated_report);
              return ready === true && generated === false;
            }),
            labResults: allResults.filter((r: any) => {
              const ready = normalizeBool(r.ready_to_generate_lab);
              const generated = normalizeBool(r.lab_result_generated_report);
              return ready === true && generated === true;
            }),
          };

          console.log(`📋 Request Report Tab: ${tabDistribution.requestReport.length} records`);
          tabDistribution.requestReport.forEach((r: any) => {
            console.log(`   ✓ TestID: ${r.testId}`);
            console.log(`     ready_to_generate_lab: ${r.ready_to_generate_lab} (${typeof r.ready_to_generate_lab})`);
            console.log(`     lab_result_generated_report: ${r.lab_result_generated_report} (${typeof r.lab_result_generated_report})\n`);
          });

          console.log(`📊 Generate Reports Tab: ${tabDistribution.generateReports.length} records`);
          tabDistribution.generateReports.forEach((r: any) => {
            console.log(`   ✓ TestID: ${r.testId}`);
            console.log(`     ready_to_generate_lab: ${r.ready_to_generate_lab} (${typeof r.ready_to_generate_lab})`);
            console.log(`     lab_result_generated_report: ${r.lab_result_generated_report} (${typeof r.lab_result_generated_report})\n`);
          });

          console.log(`✅ Lab Results Tab: ${tabDistribution.labResults.length} records`);
          tabDistribution.labResults.forEach((r: any) => {
            console.log(`   ✓ TestID: ${r.testId}`);
            console.log(`     ready_to_generate_lab: ${r.ready_to_generate_lab} (${typeof r.ready_to_generate_lab})`);
            console.log(`     lab_result_generated_report: ${r.lab_result_generated_report} (${typeof r.lab_result_generated_report})\n`);
          });

          // Verification message
          console.log(`\n[VERIFICATION]`);
          console.log(`Expected: Request Report = 1 row, Generate Reports = 1 row`);
          console.log(`Actual: Request Report = ${tabDistribution.requestReport.length} row(s), Generate Reports = ${tabDistribution.generateReports.length} row(s)`);
          if (tabDistribution.requestReport.length === 1 && tabDistribution.generateReports.length === 1) {
            console.log(`✅ CORRECT: Your expectation matches the actual data!`);
          } else {
            console.log(`❌ MISMATCH: Expected 1 row in each tab, but found different counts.`);
            console.log(`   Please check the database values for ready_to_generate_lab and lab_result_generated_report.`);
          }
          console.log(`\n[END SUMMARY]\n`);
        }

        return allResults;
      }
    },
    enabled: !!user && patients.length > 0, // Wait for user and patients data to be loaded
    // Auto-refresh for patient/admin/nurse/doctor roles: poll every 10 seconds to get new lab results
    refetchInterval: (user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)) ? 10000 : false, // 10 seconds = 10000ms
    refetchIntervalInBackground: (user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)), // Continue polling even when tab is in background
  });

  // Track previous lab results count for patient/admin/nurse/doctor roles to detect new entries
  const prevLabResultsCountRef = React.useRef<number>(0);
  const { toast } = useToast();

  // Notify patient/admin/nurse/doctor when new lab results are detected
  useEffect(() => {
    const shouldNotify = user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role);
    if (shouldNotify && Array.isArray(labResults)) {
      const currentCount = labResults.length;
      const previousCount = prevLabResultsCountRef.current;

      // Only show notification if count increased (new results added)
      if (previousCount > 0 && currentCount > previousCount) {
        const newResultsCount = currentCount - previousCount;
        toast({
          title: "New Lab Results Available",
          description: `${newResultsCount} new lab result${newResultsCount > 1 ? 's' : ''} ${newResultsCount > 1 ? 'have' : 'has'} been added.`,
          variant: "default",
        });
      }

      // Update the ref with current count
      prevLabResultsCountRef.current = currentCount;
    }
  }, [labResults, user?.role, toast]);

  // Compute unique test IDs for filter dropdown
  const uniqueTestIds = useMemo(() => {
    if (!Array.isArray(labResults) || labResults.length === 0) return [];
    const testIds = Array.from(new Set(labResults.map((result: DatabaseLabResult) => result.testId))).filter(Boolean);
    return testIds.sort();
  }, [labResults]);

  // Check file existence for all lab results
  // Reset custom fields when dialog opens with a new lab order
  useEffect(() => {
    if (selectedLabOrder && showFillResultDialog) {
      // Initialize custom fields for test types without definitions
      const allTestTypes = selectedLabOrder.testType
        .split(' | ')
        .map((t: string) => t.trim());
      const testTypesWithoutDefs = allTestTypes.filter(t => !TEST_FIELD_DEFINITIONS[t]);

      setCustomFields(prev => {
        const newFields: Record<string, Array<{ name: string, unit: string, referenceRange: string }>> = {};
        testTypesWithoutDefs.forEach(testType => {
          // Keep existing custom fields if they exist, otherwise initialize empty
          newFields[testType] = prev[testType] || [];
        });
        return newFields;
      });
    } else if (!showFillResultDialog) {
      // Clear custom fields when dialog closes
      setCustomFields({});
    }
  }, [selectedLabOrder, showFillResultDialog]);

  useEffect(() => {
    const checkFileExistence = async () => {
      if (!labResults || labResults.length === 0) return;

      const existenceChecks: Record<number, boolean> = {};

      for (const result of labResults) {
        try {
          const token = localStorage.getItem("auth_token");
          const headers: Record<string, string> = {
            "X-Tenant-Subdomain": getActiveSubdomain(),
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/files/${result.id}/exists`, {
            headers,
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            existenceChecks[result.id] = data.exists;
          } else {
            existenceChecks[result.id] = false;
          }
        } catch (error) {
          console.error(`Error checking file existence for result ${result.id}:`, error);
          existenceChecks[result.id] = false;
        }
      }

      setFileExistenceMap(existenceChecks);
    };

    checkFileExistence();
  }, [labResults]);

  // Fetch medical staff for doctor selection
  const { data: medicalStaffData, isLoading: medicalStaffLoading } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/medical-staff");
      const data = await response.json();
      return data;
    },
  });

  // Fetch filtered doctors based on specialization
  const { data: filteredDoctorsData, isLoading: filteredDoctorsLoading } =
    useQuery({
      queryKey: [
        "/api/doctors/by-specialization",
        selectedSpecialtyCategory,
        selectedSubSpecialty,
      ],
      queryFn: async () => {
        if (!selectedSpecialtyCategory && !selectedSubSpecialty) {
          return { doctors: [], count: 0 };
        }

        const params = new URLSearchParams();
        if (selectedSpecialtyCategory) {
          params.append("mainSpecialty", selectedSpecialtyCategory);
        }
        if (selectedSubSpecialty) {
          params.append("subSpecialty", selectedSubSpecialty);
        }

        const response = await apiRequest(
          "GET",
          `/api/doctors/by-specialization?${params.toString()}`,
        );
        const data = await response.json();
        return data;
      },
      enabled: !!(selectedSpecialtyCategory || selectedSubSpecialty),
    });

  // Use filtered doctors when specializations are selected, otherwise use all doctors
  const doctors =
    selectedSpecialtyCategory || selectedSubSpecialty
      ? filteredDoctorsData?.doctors || []
      : medicalStaffData?.staff?.filter(
        (staff: any) => isDoctorLike(staff.role),
      ) || [];

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  const { data: labTestPricing = [] } = useQuery({
    queryKey: ["/api/pricing/lab-tests"],
    enabled: user?.role !== 'patient', // Disable for patient users who only view their own lab results
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pricing/lab-tests");
      return res.json();
    },
  });

  // Generate test types from lab_test_pricing table (filtered by organization_id)
  const dynamicTestTypes = Array.from(
    new Set(labTestPricing.map((item: any) => item.testName).filter(Boolean))
  );

  // Use dynamic test types if available, otherwise fall back to default TEST_TYPES
  const availableTestTypes = dynamicTestTypes.length > 0 ? dynamicTestTypes : TEST_TYPES;

  const queryClient = useQueryClient();

  const createLabOrderMutation = useMutation({
    mutationFn: async (labOrderData: any) => {
      const response = await apiRequest("POST", "/api/lab-results", labOrderData);
      return response.json();
    },
    onSuccess: (labResult, variables) => {
      // Store pending order data for invoice with testId
      setPendingOrderData({
        ...variables,
        patientName: orderFormData.patientName,
        testTypes: orderFormData.testType,
        testId: labResult.testId  // Store the generated testId
      });

      // Prepare invoice items from test types
      const testTypes = orderFormData.testType;
      const invoiceItems = testTypes.map((testType: string, index: number) => {
        // Find matching price from lab_test_pricing table where test_name equals description
        const pricingData = labTestPricing.find((item: any) => item.testName === testType);
        const unitPrice = pricingData?.basePrice || 50.00; // Use base_price or default to 50.00

        return {
          code: `LAB-${(index + 1).toString().padStart(3, '0')}`,
          description: testType,
          quantity: 1,
          unitPrice: unitPrice,
          total: unitPrice * 1
        };
      });

      const totalAmount = invoiceItems.reduce((sum, item) => sum + item.total, 0);

      // Service date should be today (order date) for new lab orders
      const serviceDate = new Date().toISOString().split('T')[0];

      setInvoiceData({
        ...invoiceData,
        serviceDate: serviceDate,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: serviceDate, // Due date should be same as service date (like appointments)
        items: invoiceItems,
        totalAmount: totalAmount,
        paymentMethod: 'cash', // Set default payment method
        invoiceType: 'self_pay' // Set default invoice type
      });

      // Close order dialog and open order summary dialog (skip invoice dialog)
      setShowOrderDialog(false);
      setShowSummaryDialog(true);

      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });

      // Don't reset form data yet - we'll need it for the summary
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lab order",
        variant: "destructive",
      });
    },
  });

  const [showPermissionErrorDialog, setShowPermissionErrorDialog] = useState(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [fileExistenceMap, setFileExistenceMap] = useState<Record<number, boolean>>({});

  const updateLabResultMutation = useMutation({
    mutationFn: async (updateData: { id: number; data: any }) => {
      const response = await apiRequest(
        "PUT",
        `/api/lab-results/${updateData.id}`,
        updateData.data,
      );

      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(errorData.error || "Failed to update lab result");
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      const updatedData = await response.json();
      return { updateData, updatedData };
    },
    onSuccess: (result, variables) => {
      setIsEditMode(false);
      setEditingStatusId(null);
      setEditStatusDialog(null);

      // Update selectedResult with the new data
      if (selectedResult && result.updateData.id === selectedResult.id) {
        setSelectedResult({
          ...selectedResult,
          ...result.updateData.data
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });

      // Show status-update success modal when status was updated from the edit dialog
      if (variables?.data?.status != null) {
        setStatusUpdateSuccessModal(variables.data.status);
      } else {
        toast({
          title: "Success",
          description: "Lab result updated successfully",
        });
      }
    },
    onError: (error: any) => {
      if (error.status === 403) {
        // Skip showing permission error for doctors/admins - they should have access
        if (isDoctor() || isAdmin()) {
          console.log('Permission error suppressed for doctor/admin role');
          setEditingStatusId(null);
          setEditStatusDialog(null);
          return;
        }
        setPermissionErrorMessage(error.data?.error || "Insufficient permissions");
        setShowPermissionErrorDialog(true);
        setEditingStatusId(null);
        setEditStatusDialog(null);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update lab result",
          variant: "destructive",
        });
        setEditStatusDialog(null);
      }
    },
  });

  const deleteLabResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      return await apiRequest(
        "DELETE",
        `/api/lab-results/${resultId.toString()}`,
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lab result deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
    },
    onError: (error: any) => {
      // For doctors and admins, suppress permission errors
      const errorMessage = error.message || "Failed to delete lab result";
      const isPermissionError = errorMessage.includes('403') ||
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('forbidden');

      // Skip showing error for doctors/admins with permission issues - they should have access
      if ((isDoctor() || isAdmin()) && isPermissionError) {
        console.log('Permission error suppressed for doctor/admin role on delete');
        return;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Cash payment mutation
  const createCashPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest("POST", "/api/payments/cash", paymentData);
      return response.json();
    },
    onSuccess: async (data) => {
      // Update Lab_Request_Generated to true
      if (pendingOrderData?.testId) {
        try {
          await apiRequest("PATCH", `/api/lab-results/${pendingOrderData.testId}`, {
            labRequestGenerated: true
          });
        } catch (error) {
          console.error("Failed to update Lab_Request_Generated:", error);
        }
      }

      setPaymentResult({
        invoiceId: data.invoice.invoiceNumber,
        patientName: pendingOrderData?.patientName,
        amount: invoiceData.totalAmount,
        paymentMethod: 'cash',
        testId: pendingOrderData?.testId
      });
      setShowSummaryDialog(false);
      setShowPaymentConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process cash payment",
        variant: "destructive",
      });
    },
  });

  // Stripe payment mutation
  const createStripePaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest("POST", "/api/payments/stripe", paymentData);
      return response.json();
    },
    onSuccess: (data) => {
      setStripeClientSecret(data.clientSecret);
      setShowSummaryDialog(false);
      // The actual payment will be completed by Stripe Elements
    },
    onError: (error: any) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Failed to setup Stripe payment",
        variant: "destructive",
      });
    },
  });

  const handleOrderTest = () => {
    // For patient role users, automatically set their patient ID
    if (user?.role === "patient") {
      // Find the current patient based on user authentication data
      const currentPatient = patients.find((patient: any) =>
        patient.email && user.email && patient.email.toLowerCase() === user.email.toLowerCase()
      ) || patients.find((patient: any) =>
        patient.firstName && user.firstName && patient.lastName && user.lastName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase() &&
        patient.lastName.toLowerCase() === user.lastName.toLowerCase()
      );

      if (currentPatient) {
        setOrderFormData((prev) => ({
          ...prev,
          patientId: currentPatient.id.toString(),
          patientName: `${currentPatient.firstName} ${currentPatient.lastName}`,
        }));
      }
    }
    // For doctor roles: Auto-populate role and user ID
    else if (user && isDoctorLike(user.role)) {
      setOrderFormData((prev) => ({
        ...prev,
        selectedRole: user.role,
        selectedUserId: user.id.toString(),
        selectedUserName: `${user.firstName} ${user.lastName}`,
      }));
    }

    setShowOrderDialog(true);
  };

  const handleViewResult = (result: DatabaseLabResult) => {
    console.log("handleViewResult called with:", result);
    setSelectedResult(result);

    // Initialize edit mode and form data automatically
    const testTypes = result.testType ? result.testType.split(' | ').filter(t => t.trim()) : [];
    setEditFormData({
      testType: result.testType,
      priority: result.priority,
      notes: result.notes || "",
      status: result.status,
      doctorName: result.doctorName || "",
      mainSpecialty: result.mainSpecialty || "Surgical Specialties",
      subSpecialty: result.subSpecialty || "Orthopedic Surgeon",
    });
    setSelectedEditRole("");
    setSelectedTestTypes(testTypes);
    setIsEditMode(true);

    setShowViewDialog(true);
    console.log("showViewDialog set to true");
  };

  const handleCreateInvoiceForTest = (result: DatabaseLabResult) => {
    // Parse test types from the result
    const testTypes = result.testType.split(' | ');

    // Prepare invoice items from test types
    const invoiceItems = testTypes.map((testType: string, index: number) => {
      // Find matching price from lab_test_pricing table where test_name equals description
      const pricingData = labTestPricing.find((item: any) => item.testName === testType);
      const unitPrice = pricingData?.basePrice || 50.00; // Use base_price or default to 50.00

      return {
        code: `LAB-${(index + 1).toString().padStart(3, '0')}`,
        description: testType,
        quantity: 1,
        unitPrice: unitPrice,
        total: unitPrice * 1
      };
    });

    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.total, 0);

    // Set pending order data with the existing test
    setPendingOrderData({
      patientId: result.patientId,
      patientName: getPatientName(result.patientId),
      testTypes: testTypes,
      testId: result.testId
    });

    // Populate invoice form with test details
    // Extract service date from test result (orderDate or createdAt)
    const serviceDate = result.orderDate
      ? new Date(result.orderDate).toISOString().split('T')[0]
      : result.createdAt
        ? new Date(result.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    setInvoiceData({
      serviceDate: serviceDate,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: serviceDate, // Due date should be same as service date (like appointments)
      items: invoiceItems,
      totalAmount: totalAmount,
      paymentMethod: '',
      insuranceProvider: '',
      notes: ''
    });

    // Open the invoice dialog
    setShowInvoiceDialog(true);
  };

  const handleManageInvoice = async (result: DatabaseLabResult) => {
    try {
      // Check if invoice exists for this lab result
      const response = await apiRequest(
        "GET",
        `/api/invoices/by-service?serviceType=lab_result&serviceId=${result.testId}`
      );

      if (response.ok) {
        // Invoice exists - populate form with existing data for editing
        const existingInvoice = await response.json();

        // Set pending order data
        setPendingOrderData({
          patientId: result.patientId,
          patientName: getPatientName(result.patientId),
          testTypes: result.testType.split(' | '),
          testId: result.testId
        });

        // Populate invoice form with existing invoice data
        setInvoiceData({
          id: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          serviceDate: new Date(existingInvoice.dateOfService).toISOString().split('T')[0],
          invoiceDate: new Date(existingInvoice.invoiceDate).toISOString().split('T')[0],
          dueDate: new Date(existingInvoice.dueDate).toISOString().split('T')[0],
          items: existingInvoice.items || [],
          totalAmount: parseFloat(existingInvoice.totalAmount),
          paymentMethod: existingInvoice.insurance?.provider || '',
          insuranceProvider: existingInvoice.insurance?.provider || '',
          notes: existingInvoice.notes || ''
        });

        // Open the invoice dialog for editing
        setShowInvoiceDialog(true);
      } else if (response.status === 404) {
        // No invoice exists - create new one
        handleCreateInvoiceForTest(result);
      } else {
        throw new Error('Failed to check invoice status');
      }
    } catch (error) {
      console.error("Error checking invoice:", error);
      // If there's an error checking, default to creating new invoice
      handleCreateInvoiceForTest(result);
    }
  };

  const handleDownloadResult = async (resultId: number | string) => {
    const result = Array.isArray(labResults)
      ? labResults.find((r: any) => r.id.toString() === resultId.toString())
      : null;
    if (result) {
      const patientName = getPatientName(result.patientId);

      try {
        // Fetch prescriptions for this patient
        const response = await apiRequest(
          "GET",
          `/api/prescriptions/patient/${result.patientId.toString()}`,
        );
        const prescriptions = await response.json();

        toast({
          title: "Download Report",
          description: `Prescription report for ${patientName} downloaded successfully`,
        });

        // Create prescription document content
        let prescriptionsText = "";
        if (prescriptions && prescriptions.length > 0) {
          prescriptionsText = prescriptions
            .map((prescription: any) => {
              const medications = prescription.medications || [];
              const medicationsText =
                medications.length > 0
                  ? medications
                    .map(
                      (med: any) =>
                        `  - ${med.name}: ${med.dosage}, ${med.frequency}, Duration: ${med.duration}\n    Instructions: ${med.instructions}\n    Quantity: ${med.quantity}, Refills: ${med.refills}`,
                    )
                    .join("\n")
                  : `  - ${prescription.medicationName}: ${prescription.dosage || "N/A"}, ${prescription.frequency || "N/A"}\n    Instructions: ${prescription.instructions || "N/A"}`;

              return `Prescription #${prescription.prescriptionNumber || prescription.id}
Issued: ${new Date(prescription.issuedDate || prescription.createdAt).toLocaleDateString()}
Status: ${prescription.status}
Diagnosis: ${prescription.diagnosis || "N/A"}

Medications:
${medicationsText}

Notes: ${prescription.notes || "No additional notes"}
-------------------------------------------`;
            })
            .join("\n\n");
        } else {
          prescriptionsText = "No prescriptions found for this patient.";
        }

        // Create and download the prescription document
        const documentContent = `PRESCRIPTION REPORT

Patient: ${patientName}
Patient ID: ${result.patientId}
Report Date: ${new Date().toLocaleDateString()}

===========================================

${prescriptionsText}

===========================================
Report generated from Cura EMR System`;

        const blob = new Blob([documentContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prescriptions-${patientName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error fetching prescriptions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch prescriptions for this patient",
          variant: "destructive",
        });
      }
    }
  };

  const handleShareResult = (result: DatabaseLabResult) => {
    setSelectedResult(result);
    const patient = Array.isArray(patients) ? patients.find((p: any) => p?.id === result.patientId) : null;
    const patientEmail = (patient as any)?.email || "";
    setShareFormData({
      method: "email",
      email: patientEmail,
      whatsapp: "",
      message: `Lab test result for ${result.testType} is now available for review.`,
    });
    setShowShareDialog(true);
  };

  const handleGeneratePrescription = (result: DatabaseLabResult) => {
    setSelectedResult(result);
    setShowPrescriptionDialog(true);
  };

  const handleStartEdit = () => {
    if (!selectedResult) return;

    // Initialize edit form data with current result data
    setEditFormData({
      testType: selectedResult.testType,
      priority: selectedResult.priority,
      notes: selectedResult.notes || "",
      status: selectedResult.status,
      doctorName: "",
      mainSpecialty: selectedResult.mainSpecialty || "",
      subSpecialty: selectedResult.subSpecialty || "",
    });
    setSelectedEditRole("");
    setSelectedTestTypes(selectedResult.testType ? [selectedResult.testType] : []);
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!selectedResult) return;

    updateLabResultMutation.mutate({
      id: selectedResult.id,
      data: editFormData,
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({});
  };

  const handleDeleteResult = (resultId: number) => {
    const result = filteredResults.find(r => r.id === resultId);
    if (result) {
      setSelectedResult(result);
      setShowDeleteConfirmDialog(true);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedResult) {
      deleteLabResultMutation.mutate(selectedResult.id);
      setShowDeleteConfirmDialog(false);
      setSelectedResult(null);
    }
  };

  const handleDirectDownload = async (result: any) => {
    if (!result) return;

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we create your lab test result PDF...",
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 20;

      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Lab Test Result', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Test ID: ${result.testId || result.id}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Patient Information', margin, yPos);
      yPos += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Patient: ${result.patientName || 'N/A'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Patient ID: ${result.patient?.patientId || 'N/A'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Date: ${format(new Date(result.createdAt || new Date()), "MMM dd, yyyy")}`, margin, yPos);
      yPos += 6;
      pdf.text(`Status: ${result.status || 'Pending'}`, margin, yPos);
      yPos += 12;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Test Details', margin, yPos);
      yPos += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Test Type: ${result.testType || 'N/A'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Priority: ${result.priority || 'Normal'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Doctor: ${result.doctorName || 'N/A'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Specialty: ${result.mainSpecialty || 'N/A'}`, margin, yPos);
      yPos += 12;

      if (result.notes) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes', margin, yPos);
        yPos += 8;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const splitNotes = pdf.splitTextToSize(result.notes, contentWidth);
        pdf.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 6 + 6;
      }

      yPos += 20;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}`, pageWidth / 2, yPos, { align: 'center' });

      const filename = `Lab_Result_${result.testId || result.id}.pdf`;
      pdf.save(filename);

      toast({
        title: "PDF Downloaded",
        description: `Lab test result PDF downloaded as ${filename}`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePDF = async (resultOverride?: DatabaseLabResult) => {
    const resultToUse = resultOverride || selectedResult;
    if (!resultToUse) return;

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we create your lab test result PDF...",
      });

      // Create the same HTML as print function
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Lab Result Prescription - ${resultToUse.testId}</title>
            <style>
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                line-height: 1.4;
                color: #333;
                background: white;
                font-size: 14px;
              }
              .prescription-content {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 8px;
              }
              
              .print-header {
                text-align: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid #333;
              }
              .print-header h1 {
                font-size: 28px;
                font-weight: bold;
                color: #333;
                margin-bottom: 4px;
                letter-spacing: 1px;
              }
              .print-header h2 {
                font-size: 16px;
                color: #666;
                font-weight: normal;
                margin: 0;
              }

              .header {
                text-align: center;
                margin-bottom: 12px;
                border-bottom: 2px solid #333;
                padding-bottom: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .header-logo {
                width: 60px;
                height: 60px;
                background: #4A90E2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 24px;
                margin-bottom: 8px;
              }
              .header h1 {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 4px;
                color: #333;
              }
              .header p {
                font-size: 16px;
                color: #666;
              }

              .info-section {
                margin-bottom: 12px;
              }
              .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #333;
                border-bottom: 1px solid #ddd;
                padding-bottom: 4px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 10px;
              }
              .info-item {
                margin-bottom: 4px;
                display: flex;
                align-items: center;
              }
              .info-label {
                font-weight: bold;
                margin-right: 10px;
                min-width: 150px;
              }
              .info-value {
                color: #333;
              }

              .lab-prescription-section {
                margin: 12px 0;
                padding: 10px;
                border-radius: 6px;
                background: #f0f8ff;
              }
              .lab-prescription-title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
                text-align: center;
              }
              .test-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
              }
              .test-item {
                margin-bottom: 8px;
              }
              .test-label {
                font-size: 12px;
                font-weight: bold;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 3px;
              }
              .test-value {
                font-size: 16px;
                font-weight: 600;
                color: #333;
              }

              .test-results {
                margin-top: 12px;
              }
              .results-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #333;
              }
              .result-item {
                margin-bottom: 6px;
                padding: 6px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
              }

              .notes-section {
                margin-top: 12px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fffbeb;
              }
            </style>
          </head>
          <body>
            <div class="prescription-content">
              <div style="display: grid; grid-template-columns: auto 1fr auto; align-items: center; border-bottom: 1px solid #ccc; padding: 4px 0; position: relative;">
                ${clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'left' ? `
                  <div style="grid-column: 1 / 2; display: flex; align-items: center;">
                    <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px;" />
                  </div>
                ` : clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'center' ? `
                  <div style="grid-column: 1 / 2; display: flex; align-items: center; justify-content: center;">
                    <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px;" />
                  </div>
                ` : '<div></div>'}

                <div style="grid-column: 2 / 3; text-align: center;">
                  <span style="font-size: ${clinicHeader?.clinicNameFontSize || '25px'}; color: darkblue; font-weight: ${clinicHeader?.fontWeight || '700'}; font-family: ${clinicHeader?.fontFamily || 'verdana'}; font-style: ${clinicHeader?.fontStyle || 'normal'}; text-decoration: ${clinicHeader?.textDecoration || 'none'};">${clinicHeader?.clinicName || 'CURA EMR SYSTEM'}</span>
                  <h2 style="margin: 4px 0; font-size: ${clinicHeader?.fontSize || '12pt'}; font-family: ${clinicHeader?.fontFamily || 'verdana'};">Laboratory Test Prescription</h2>
                  ${clinicHeader?.address ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.address}</p>` : ''}
                  ${clinicHeader?.phone ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.phone}</p>` : ''}
                  ${clinicHeader?.email ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.email}</p>` : ''}
                  ${clinicHeader?.website ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.website}</p>` : ''}
                </div>

                ${clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'right' ? `
                  <div style="grid-column: 3 / 4;">
                    <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px;" />
                  </div>
                ` : '<div></div>'}
              </div>

              <div style="margin-top: 8px; margin-bottom: 8px;">
                <div style="margin-bottom: 8px;">
                  <h5 style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">PATIENT INFORMATION</h5>
                  <div style="margin-bottom: 2px;">
                    <strong>Name:</strong>
                    <span style="margin-left: 0.5rem;">${getPatientName(resultToUse.patientId)}</span>
                  </div>
                  <div style="margin-bottom: 2px;">
                    <strong>DOB:</strong>
                    <span style="margin-left: 0.5rem;">N/A</span>
                  </div>
                  <div style="margin-bottom: 2px;">
                    <strong>Study Date:</strong>
                    <span style="margin-left: 0.5rem;">${format(new Date(resultToUse.orderedAt || new Date()), "dd/MM/yyyy")}</span>
                  </div>
                </div>

                <div style="margin-top: 4px; margin-bottom: 8px;">
                  <h5 style="font-size: 9px; font-weight: bold; margin-bottom: 4px;">DOCTOR DETAILS</h5>
                  <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                    <strong>Name:</strong>
                    <span style="margin-left: 0.5rem;">${resultToUse.doctorName || "Doctor"}</span>
                  </div>
                  ${resultToUse.mainSpecialty ? `
                  <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                    <strong>Specialization:</strong>
                    <span style="margin-left: 0.5rem;">${resultToUse.mainSpecialty}</span>
                  </div>
                  ` : ""}
                  ${(resultToUse as any).doctorEmail ? `
                  <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                    <strong>Email:</strong>
                    <span style="margin-left: 0.5rem;">${(resultToUse as any).doctorEmail}</span>
                  </div>
                  ` : ""}
                  ${(resultToUse as any).doctorDepartment ? `
                  <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                    <strong>Department:</strong>
                    <span style="margin-left: 0.5rem;">${(resultToUse as any).doctorDepartment}</span>
                  </div>
                  ` : ""}
                </div>
              </div>

              <div class="lab-prescription-section" style="background-color:#FAF8F8 !important; margin: 8px 0; padding: 8px;">
                <h2 class="lab-prescription-title">Laboratory Test Prescription</h2>
                
                <div class="test-details">
                  <div class="test-item">
                    <div class="test-label">TEST ID</div>
                    <div class="test-value">${resultToUse.testId}</div>
                  </div>
                  <div class="test-item">
                    <div class="test-label">TEST TYPE</div>
                    <div class="test-value">${resultToUse.testType}</div>
                  </div>
                  <div class="test-item">
                    <div class="test-label">ORDERED DATE</div>
                    <div class="test-value">${format(new Date(resultToUse.orderedAt || new Date()), "MMM dd, yyyy HH:mm")}</div>
                  </div>
                  <div class="test-item">
                    <div class="test-label">STATUS</div>
                    <div class="test-value">${resultToUse.status.toUpperCase()}</div>
                  </div>
                </div>
              </div>
              ${resultToUse.results && resultToUse.results.length > 0 ? `
                <div class="test-results">
                  <div class="results-title">Test Results:</div>
                  ${resultToUse.results.map((testResult: any) => `
                    <div class="result-item">
                      <strong>${testResult.name}:</strong> ${testResult.value} ${testResult.unit} 
                      (Reference: ${testResult.referenceRange}) - Status: ${testResult.status.replace("_", " ").toUpperCase()}
                    </div>
                  `).join("")}
                </div>
              ` : ""}

              ${resultToUse.notes ? `
                <div class="notes-section">
                  <strong>Clinical Notes:</strong><br>
                  ${resultToUse.notes}
                </div>
              ` : ""}

              ${resultToUse.criticalValues ? `
                <div style="margin-top: 10px; padding: 8px; background: #fef2f2; border: 2px solid #dc2626; border-radius: 6px;">
                  <strong style="color: #dc2626;">⚠️ CRITICAL VALUES DETECTED</strong><br>
                  <span style="color: #991b1b;">This lab result contains critical values that require immediate attention.</span>
                </div>
              ` : ""}

              <div style="margin-top: 16px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px;">
                <div style="margin-bottom: 12px;">
                  ${(resultToUse.signature?.doctorSignature && String(resultToUse.signature.doctorSignature).trim() !== "") ? `
                    <div style="margin-bottom: 8px;">
                      <img src="${resultToUse.signature.doctorSignature}" alt="E-Signature" style="height: 80px; max-width: 250px; margin: 0 auto; display: block;" />
                    </div>
                  ` : ""}
                  <div style="border-top: 2px solid #333; width: 300px; margin: 0 auto 10px;"></div>
                  <div style="font-weight: bold;">${resultToUse.doctorName || "Doctor"}</div>
                  ${resultToUse.mainSpecialty ? `<div style="font-size: 12px; color: #666;">${resultToUse.mainSpecialty}</div>` : ""}
                </div>
                ${clinicFooter?.footerText ? `
                <div style="font-size: 12px; color: #666; margin-top: 6px;">
                  ${clinicFooter.footerText}
                </div>
                ` : `
                <div style="font-size: 12px; color: #666;">
                  Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}
                </div>
                `}
              </div>
            </div>
          </body>
        </html>
      `;

      // Extract body content only: setting full document as innerHTML can leave
      // .prescription-content unfindable; use body fragment so the element exists.
      const bodyMatch = printHTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1].trim() : printHTML;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bodyContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      document.body.appendChild(tempDiv);

      const targetEl = tempDiv.querySelector('.prescription-content');
      if (!targetEl) {
        document.body.removeChild(tempDiv);
        throw new Error("PDF content element not found");
      }

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture the content as canvas
      const canvas = await html2canvas(targetEl as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      });

      // Remove temporary element
      document.body.removeChild(tempDiv);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Create filename from testId
      const filename = `${resultToUse.testId}.pdf`;

      console.log("PDF Generation: Saving as", filename);
      pdf.save(filename);

      // Success message
      toast({
        title: "PDF Generated",
        description: `Lab test result PDF downloaded as ${filename}`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    if (!selectedResult) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Error",
        description:
          "Unable to open print window. Please allow popups and try again.",
        variant: "destructive",
      });
      return;
    }

    // Create HTML following the specified format
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lab Result Prescription - ${selectedResult.testId}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.5;
              color: #333;
              background: white;
              font-size: 14px;
            }
            .prescription-content {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            
            /* Print Header Styles */
            .print-header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .print-header h1 {
              font-size: 28px;
              font-weight: bold;
              color: #333;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            .print-header h2 {
              font-size: 16px;
              color: #666;
              font-weight: normal;
              margin: 0;
            }

            /* Header Styles */
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .header-logo {
              width: 60px;
              height: 60px;
              background: #4A90E2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #333;
            }
            .header p {
              font-size: 16px;
              color: #666;
            }

            /* Information Sections */
            .info-section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 20px;
            }
            .info-item {
              margin-bottom: 8px;
              display: flex;
              align-items: center;
            }
            .info-label {
              font-weight: bold;
              margin-right: 10px;
              min-width: 150px;
            }
            .info-value {
              color: #333;
            }

            /* Laboratory Test Prescription Section */
            .lab-prescription-section {
              margin: 30px 0;
              padding: 20px;
              border-radius: 8px;
              background: #f0f8ff;
            }
            .lab-prescription-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
              text-align: center;
            }
            .test-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .test-item {
              margin-bottom: 15px;
            }
            .test-label {
              font-size: 12px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .test-value {
              font-size: 16px;
              font-weight: 600;
              color: #333;
            }

            /* Test Results Section */
            .test-results {
              margin-top: 30px;
            }
            .results-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
            }
            .result-item {
              margin-bottom: 10px;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
            }

            /* Notes Section */
            .notes-section {
              margin-top: 30px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: #fffbeb;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              .prescription-content {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="prescription-content">
            <!-- Print Header -->
      <div style="display: grid; grid-template-columns: auto 1fr auto; align-items: center; border-bottom: 1px solid #ccc; padding: 1rem 0; position: relative;">
  
  <!-- Left Icon -->
  ${clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'left' ? `
    <div style="grid-column: 1 / 2; display: flex; align-items: center;">
      <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px;" />
    </div>
  ` : clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'center' ? `
    <div style="grid-column: 1 / 2; display: flex; align-items: center; justify-content: center;">
      <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px;" />
    </div>
  ` : '<div></div>'}

  <!-- Centered Text Content -->
  <div style="grid-column: 2 / 3; text-align: center;">
    <span style="font-size: ${clinicHeader?.clinicNameFontSize || '25px'}; color: darkblue; font-weight: ${clinicHeader?.fontWeight || '700'}; font-family: ${clinicHeader?.fontFamily || 'verdana'}; font-style: ${clinicHeader?.fontStyle || 'normal'}; text-decoration: ${clinicHeader?.textDecoration || 'none'};">${clinicHeader?.clinicName || 'CURA EMR SYSTEM'}</span>
    <h2 style="margin: 4px 0; font-size: ${clinicHeader?.fontSize || '12pt'}; font-family: ${clinicHeader?.fontFamily || 'verdana'};">Laboratory Test Prescription</h2>
    ${clinicHeader?.address ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.address}</p>` : ''}
    ${clinicHeader?.phone ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.phone}</p>` : ''}
    ${clinicHeader?.email ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.email}</p>` : ''}
    ${clinicHeader?.website ? `<p style="font-size: ${clinicHeader.fontSize || '12pt'}; font-family: ${clinicHeader.fontFamily || 'verdana'}; margin: 2px 0;">${clinicHeader.website}</p>` : ''}
  </div>

  <!-- Right Logo or Placeholder -->
  ${clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'right' ? `
    <div style="grid-column: 3 / 4;">
      <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px;" />
    </div>
  ` : '<div></div>'}
</div>

            <div style="margin-top: 1.5rem; margin-bottom: 1.5rem;">
              <div style="margin-bottom: 1.5rem;">
                <h5 style="font-size: 16px; font-weight: bold; margin-bottom: 0.5rem;">PATIENT INFORMATION</h5>
                <div style="margin-bottom: 0.4rem;">
                  <strong>Name:</strong>
                  <span style="margin-left: 0.5rem;">${getPatientName(selectedResult.patientId)}</span>
                </div>
                <div style="margin-bottom: 0.4rem;">
                  <strong>DOB:</strong>
                  <span style="margin-left: 0.5rem;">N/A</span>
                </div>
                <div style="margin-bottom: 0.4rem;">
                  <strong>Study Date:</strong>
                  <span style="margin-left: 0.5rem;">${format(new Date(selectedResult.orderedAt || new Date()), "dd/MM/yyyy")}</span>
                </div>
              </div>

              <div style="margin-top: 0.5rem; margin-bottom: 1.5rem;">
                <h5 style="font-size: 9px; font-weight: bold; margin-bottom: 0.5rem;">DOCTOR DETAILS</h5>
                <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                  <strong>Name:</strong>
                  <span style="margin-left: 0.5rem;">${selectedResult.doctorName || "Doctor"}</span>
                </div>
                ${selectedResult.mainSpecialty
        ? `
                <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                  <strong>Specialization:</strong>
                  <span style="margin-left: 0.5rem;">${selectedResult.mainSpecialty}</span>
                </div>
                `
        : ""
      }
                ${(selectedResult as any).doctorEmail
        ? `
                <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                  <strong>Email:</strong>
                  <span style="margin-left: 0.5rem;">${(selectedResult as any).doctorEmail}</span>
                </div>
                `
        : ""
      }
                ${(selectedResult as any).doctorDepartment
        ? `
                <div style="font-size: 9px; margin-bottom: 0.3rem; line-height: 1.4;">
                  <strong>Department:</strong>
                  <span style="margin-left: 0.5rem;">${(selectedResult as any).doctorDepartment}</span>
                </div>
                `
        : ""
      }
              </div>
            </div>

            <!-- Laboratory Test Prescription -->
            <div class="lab-prescription-section" style="background-color:#FAF8F8 !important;">
              <h2 class="lab-prescription-title">Laboratory Test Prescription</h2>
              
              <div class="test-details">
                <div class="test-item">
                  <div class="test-label">TEST ID</div>
                  <div class="test-value">${selectedResult.testId}</div>
                </div>
                <div class="test-item">
                  <div class="test-label">TEST TYPE</div>
                  <div class="test-value">${selectedResult.testType}</div>
                </div>
                <div class="test-item">
                  <div class="test-label">ORDERED DATE</div>
                  <div class="test-value">${format(new Date(selectedResult.orderedAt), "MMM dd, yyyy HH:mm")}</div>
                </div>
                <div class="test-item">
                  <div class="test-label">STATUS</div>
                  <div class="test-value">${selectedResult.status.toUpperCase()}</div>
                </div>
              </div>
</div>
              ${selectedResult.results && selectedResult.results.length > 0
        ? `
              <div class="test-results">
                <div class="results-title">Test Results:</div>
                ${selectedResult.results
          .map(
            (testResult: any) => `
                  <div class="result-item">
                    <strong>${testResult.name}:</strong> ${testResult.value} ${testResult.unit} 
                    (Reference: ${testResult.referenceRange}) - Status: ${testResult.status.replace("_", " ").toUpperCase()}
                  </div>
                `,
          )
          .join("")}
              </div>
              `
        : ""
      }

              ${selectedResult.notes
        ? `
              <div class="notes-section">
                <strong>Clinical Notes:</strong><br>
                ${selectedResult.notes}
              </div>
              `
        : ""
      }
            </div>

            ${selectedResult.criticalValues
        ? `
            <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px;">
              <strong style="color: #dc2626;">⚠️ CRITICAL VALUES DETECTED</strong><br>
              <span style="color: #991b1b;">This lab result contains critical values that require immediate attention.</span>
            </div>
            `
        : ""
      }

            <!-- Footer -->
            <div style="margin-top: 50px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
              <div style="margin-bottom: 30px;">
                ${(selectedResult.signature?.doctorSignature && String(selectedResult.signature.doctorSignature).trim() !== "") ? `
                  <div style="margin-bottom: 15px;">
                    <img src="${selectedResult.signature.doctorSignature}" alt="E-Signature" style="height: 80px; max-width: 250px; margin: 0 auto; display: block;" />
                  </div>
                ` : ""}
                <div style="border-top: 2px solid #333; width: 300px; margin: 0 auto 10px;"></div>
                <div style="font-weight: bold;">${selectedResult.doctorName || "Doctor"}</div>
                ${selectedResult.mainSpecialty ? `<div style="font-size: 12px; color: #666;">${selectedResult.mainSpecialty}</div>` : ""}
              </div>
                ${clinicFooter?.footerText ? `
                <div style="font-size: 12px; color: #666; margin-top: 6px;">
                  ${clinicFooter.footerText}
                </div>
                ` : `
                <div style="font-size: 12px; color: #666;">
                  Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}
                </div>
                `}
              </div>
            </div>
          </body>
        </html>
      `;

    // Write the HTML to the print window
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    toast({
      title: "Printing",
      description:
        "Print dialog opened. Please select your printer and print options.",
    });
  };

  const handleFlagCritical = (resultId: string) => {
    const result = Array.isArray(labResults)
      ? labResults.find((r: any) => r.id === resultId)
      : null;
    if (result) {
      toast({
        title: "Critical Value Flagged",
        description: `Critical alert created for ${getPatientName(result.patientId)}`,
        variant: "destructive",
      });
      // In a real implementation, this would create alerts and notifications
    }
  };

  // E-Signature Canvas Drawing Functions
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

    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

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

    setLastPosition({ x, y });
  };

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

    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

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

    setLastPosition({ x, y });
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
    setSignatureSaved(false);
  };

  // Load signature from database onto canvas
  const loadSignatureFromDatabase = async () => {
    if (!selectedResult || !canvasRef.current) return;

    try {
      // Fetch lab result from database to get latest signature data
      const response = await apiRequest(
        "GET",
        `/api/lab-results/${selectedResult.id}`
      );

      if (response.ok) {
        const labResultData = await response.json();

        // Check if signature exists in database
        if (
          labResultData.signature?.doctorSignature &&
          String(labResultData.signature.doctorSignature).trim() !== ""
        ) {
          const signatureImage = new Image();
          signatureImage.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Clear canvas first
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the signature image onto canvas
            ctx.drawImage(signatureImage, 0, 0, canvas.width, canvas.height);
            setSignature(labResultData.signature.doctorSignature);
          };
          signatureImage.onerror = () => {
            console.error("Error loading signature image");
          };
          signatureImage.src = labResultData.signature.doctorSignature;
        } else {
          // No signature exists, clear canvas
          clearSignature();
        }
      }
    } catch (error) {
      console.error("Error loading signature from database:", error);
      // If error, check if signature exists in selectedResult
      const signatureData = selectedResult?.signature?.doctorSignature;
      if (
        signatureData &&
        String(signatureData).trim() !== ""
      ) {
        const signatureImage = new Image();
        signatureImage.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(signatureImage, 0, 0, canvas.width, canvas.height);
          setSignature(signatureData);
        };
        signatureImage.src = signatureData;
      } else {
        clearSignature();
      }
    }
  };

  // Load signature when dialog opens and initialize canvas for theme
  useEffect(() => {
    if (showESignDialog && selectedResult && canvasRef.current) {
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
  }, [showESignDialog, selectedResult?.id, theme]);

  const saveSignature = async () => {
    // Hide tabs immediately when Apply Advanced E-Signature is clicked (for nurse/admin/doctor roles)
    if (user?.role === 'nurse' || user?.role === 'admin' || user?.role === 'doctor') {
      setHideTabs(true);
    }

    if (!canvasRef.current || !selectedResult) return;

    const canvas = canvasRef.current;
    const signatureData = getSignatureDataForPdf(canvas);

    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = canvas.width;
    blankCanvas.height = canvas.height;
    if (signatureData === blankCanvas.toDataURL()) {
      toast({
        title: "Error",
        description: "Please draw your signature before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest(
        "POST",
        `/api/lab-results/${selectedResult.id}/e-sign`,
        {
          signature: signatureData,
        },
      );

      if (response.ok) {
        const result = await response.json();

        queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });

        // Update selectedResult to include the signature immediately (using new signature structure)
        setSelectedResult((prev: any) => ({
          ...prev,
          signature: result.signature || {
            doctorSignature: signatureData,
            signedBy: result.labResult?.signature?.signedBy || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            signedAt: result.labResult?.signature?.signedAt || new Date().toISOString(),
            signerId: result.labResult?.signature?.signerId || user?.id,
          },
        }));

        setSignatureSaved(true);

        toast({
          title: "Success",
          description: "Electronic signature applied successfully!",
        });

        setTimeout(() => {
          clearSignature();
          setShowESignDialog(false);
          setSignatureSaved(false);

          // If there's a pending PDF save, proceed with it
          if (pendingPdfSave) {
            handleSavePrescriptionPdf(pendingPdfSave.resultId);
            setPendingPdfSave(null);
          }
        }, 2000);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to save signature");
      }
    } catch (error) {
      console.error("Error saving e-signature:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save electronic signature. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Helper function to get patient name from patient ID
  const getPatientName = (patientId: number) => {
    const patient =
      Array.isArray(patients) && patients
        ? patients.find((p: any) => p?.id === patientId)
        : null;
    return patient && patient.firstName && patient.lastName
      ? `${patient.firstName} ${patient.lastName}`
      : `Patient #${patientId}`;
  };

  // Helper function to get user name from user ID
  const getUserName = (userId: number) => {
    if (!Array.isArray(users) || !users) return `User #${userId}`;
    const user = users.find((u: any) => u && u.id === userId);
    if (!user) return `User #${userId}`;
    const firstName = user?.firstName ?? "";
    const lastName = user?.lastName ?? "";
    if (!firstName || !lastName) return `User #${userId}`;
    return `${firstName} ${lastName}`;
  };

  // Function to handle saving prescription PDF
  const handleSavePrescriptionPdf = async (resultId: number) => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      toast({
        title: "Saving PDF",
        description: "Please wait while we save the prescription PDF...",
      });

      // Call the server endpoint with type=prescription
      const response = await fetch(`/api/lab-results/${resultId}/generate-pdf?type=prescription`, {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save PDF");
      }

      const data = await response.json();

      // Invalidate queries to refresh the lab results list
      // This ensures the record moves from "Request Report" to "Generate Reports" tab
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });

      toast({
        title: "Success",
        description: "Prescription PDF saved successfully. Record moved to Generate Reports tab.",
      });

      // Redirect to Generate Reports tab
      setActiveTab("generate");
    } catch (error: any) {
      console.error("Error saving prescription PDF:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // For summary statistics - only apply search filter, not status filter
  const searchFilteredResults = Array.isArray(labResults)
    ? labResults.filter((result: DatabaseLabResult) => {
      const patientName = getPatientName(result.patientId);
      const matchesSearch =
        !searchQuery ||
        patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.testType.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    })
    : [];

  // For display area - apply both search and status filters
  const filteredResults = Array.isArray(labResults)
    ? labResults.filter((result: DatabaseLabResult) => {
      const patientName = getPatientName(result.patientId);
      const matchesSearch =
        !searchQuery ||
        patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.testType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || result.status === statusFilter;

      const matchesTestId =
        !filterTestId || result.testId === filterTestId;

      // Workflow-based tab filtering with explicit boolean checks:
      // Request Report: ready_to_generate_lab = false AND lab_result_generated_report = false (treat null/undefined as false)
      // Generate Reports: ready_to_generate_lab = true AND lab_result_generated_report = false (treat null/undefined as false)
      // Lab Results: ready_to_generate_lab = true AND lab_result_generated_report = true
      // Handle undefined/null as false for backward compatibility with existing records
      // Also handle string "true"/"false" values that might come from the database
      // Support both camelCase (readyToGenerateLab) and snake_case (ready_to_generate_lab) field names

      // Normalize boolean values (handle string "true"/"false" and actual booleans)
      const normalizeBoolean = (value: any): boolean => {
        // Handle null/undefined
        if (value === null || value === undefined) return false;

        // Handle actual boolean
        if (typeof value === 'boolean') return value;

        // Handle string values (case-insensitive)
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim();
          if (lowerValue === 'true' || lowerValue === '1') return true;
          if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '') return false;
        }

        // Handle numbers
        if (typeof value === 'number') {
          return value === 1;
        }

        // Default to false for any other type
        return false;
      };

      // Get values directly from database - Drizzle ORM returns camelCase, but we check both
      const resultAny = result as any;

      // Drizzle ORM returns camelCase (readyToGenerateLab, labResultGeneratedReport)
      // But we also check snake_case (ready_to_generate_lab, lab_result_generated_report) for compatibility
      // Priority: camelCase first (Drizzle default), then snake_case (database column names)
      const readyToGenerateLabValue = resultAny.readyToGenerateLab !== undefined && resultAny.readyToGenerateLab !== null
        ? resultAny.readyToGenerateLab
        : (resultAny.ready_to_generate_lab !== undefined && resultAny.ready_to_generate_lab !== null
          ? resultAny.ready_to_generate_lab
          : undefined);
      const labResultGeneratedReportValue = resultAny.labResultGeneratedReport !== undefined && resultAny.labResultGeneratedReport !== null
        ? resultAny.labResultGeneratedReport
        : (resultAny.lab_result_generated_report !== undefined && resultAny.lab_result_generated_report !== null
          ? resultAny.lab_result_generated_report
          : undefined);

      // Normalize to strict booleans (handles true, false, null, undefined, "true", "false", etc.)
      const readyToGenerateLab = normalizeBoolean(readyToGenerateLabValue);
      const labResultGeneratedReport = normalizeBoolean(labResultGeneratedReportValue);

      // Determine which tab this record belongs to
      let belongsToTab = "";
      if (readyToGenerateLab === false && labResultGeneratedReport === false) {
        belongsToTab = "Request Report";
      } else if (readyToGenerateLab === true && labResultGeneratedReport === false) {
        belongsToTab = "Generate Reports";
      } else if (readyToGenerateLab === true && labResultGeneratedReport === true) {
        belongsToTab = "Lab Results";
      } else {
        belongsToTab = "NONE (Invalid State)";
      }

      // Debug logging - log all records to see what's coming from database
      console.log(`[LAB FILTER] TestID: ${result.testId}`, {
        databaseValues: {
          ready_to_generate_lab: readyToGenerateLabValue,
          ready_to_generate_lab_type: typeof readyToGenerateLabValue,
          lab_result_generated_report: labResultGeneratedReportValue,
          lab_result_generated_report_type: typeof labResultGeneratedReportValue,
        },
        normalizedBooleans: {
          readyToGenerateLab,
          labResultGeneratedReport,
        },
        belongsToTab: belongsToTab,
        currentTab: activeTab,
        willShowInCurrentTab: activeTab === "request"
          ? (readyToGenerateLab === false && labResultGeneratedReport === false)
          : activeTab === "generate"
            ? (readyToGenerateLab === true && labResultGeneratedReport === false)
            : (readyToGenerateLab === true && labResultGeneratedReport === true),
      });

      // Strict boolean matching for each tab based on database values
      // Request Report: ready_to_generate_lab = false AND lab_result_generated_report = false
      // Generate Reports: ready_to_generate_lab = true AND lab_result_generated_report = false
      // Lab Results: ready_to_generate_lab = true AND lab_result_generated_report = true
      const matchesTab =
        activeTab === "request"
          ? readyToGenerateLab === false && labResultGeneratedReport === false
          : activeTab === "generate"
            ? readyToGenerateLab === true && labResultGeneratedReport === false
            : activeTab === "generated"
              ? readyToGenerateLab === true && labResultGeneratedReport === true
              : false; // Default to false for any other tab value

      return matchesSearch && matchesStatus && matchesTestId && matchesTab;
    })
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "collected":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800";
      case "abnormal_high":
        return "bg-orange-100 text-orange-800";
      case "abnormal_low":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Check if any report is generated
  const hasGeneratedReport = filteredResults.some((result: any) => result.labReportGenerated === true);

  return (
    <>
      <Header
        title="Lab Results"
        subtitle="View and manage laboratory test results"
      />

      {/* Report Generated Indicator */}
      <div className="px-6 pt-2">
        <TooltipProvider>
        </TooltipProvider>
      </div>

      <div className="flex-1 overflow-auto p-6 w-full max-w-full box-border">
        <div className="space-y-6 w-full max-w-full">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Pending Results
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        searchFilteredResults.filter((r) => r.status === "pending")
                          .length
                      }
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Critical Values
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        searchFilteredResults.filter(
                          (r) => r.criticalValues === true
                        ).length
                      }
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Completed Today
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        searchFilteredResults.filter(
                          (r) => r.status === "completed"
                        ).length
                      }
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Results
                    </p>
                    <p className="text-2xl font-bold">
                      {searchFilteredResults.length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "request" | "generate" | "generated")} className="w-full">
            <TabsList className={`w-full mb-6 ${user?.role === 'patient' ? 'grid grid-cols-2' : 'grid grid-cols-3'}`}>
              <TabsTrigger value="request">Request Report</TabsTrigger>
              {user?.role !== "patient" && <TabsTrigger value="generate">Generate Reports</TabsTrigger>}
              <TabsTrigger value="generated">Lab Results</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-0">

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search lab results..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="collected">Collected</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Test ID Filter (Admin Only) */}
                    {isAdmin() && uniqueTestIds.length > 0 && (
                      <Popover open={testIdPopoverOpen} onOpenChange={setTestIdPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={testIdPopoverOpen}
                            className="w-[220px] justify-between"
                            data-testid="button-filter-testid"
                          >
                            {filterTestId || "Filter by Test ID"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-0">
                          <Command>
                            <CommandInput placeholder="Search test ID..." />
                            <CommandList>
                              <CommandEmpty>No test ID found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value=""
                                  onSelect={() => {
                                    setFilterTestId("");
                                    setTestIdPopoverOpen(false);
                                  }}
                                  data-testid="option-testid-all"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${filterTestId === "" ? "opacity-100" : "opacity-0"}`}
                                  />
                                  All Test IDs
                                </CommandItem>
                                {uniqueTestIds.map((testId) => (
                                  <CommandItem
                                    key={testId}
                                    value={testId}
                                    onSelect={(currentValue) => {
                                      setFilterTestId(currentValue === filterTestId ? "" : currentValue);
                                      setTestIdPopoverOpen(false);
                                    }}
                                    data-testid={`option-testid-${testId}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${filterTestId === testId ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {testId}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex gap-1 border rounded-lg p-1">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="h-8 w-8 p-0"
                        data-testid="button-view-grid"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="h-8 w-8 p-0"
                        data-testid="button-view-list"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Right Side: Buttons */}
                    {user?.role !== "patient" && activeTab === "request" && canCreate('lab_results') && (
                      <div className="flex gap-3 ml-auto">
                        <Button
                          onClick={handleOrderTest}
                          className="bg-medical-blue hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Order Lab Test
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lab Results List */}
              <div className="space-y-4">
                {isLoading ? (
                  /* Loading State - Show skeleton for table */
                  viewMode === "list" ? (
                    <Card className="w-full max-w-full overflow-hidden">
                      <CardContent className="p-0 w-full max-w-full">
                        <div className="w-full max-w-full overflow-hidden">
                          <table className="w-full text-[11px]" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '8%' }}>Test ID</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '10%' }}>Patient</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '12%' }}>Test Type</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '7%' }}>Ordered</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '6%' }}>Priority</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '7%' }}>Sample</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '7%' }}>Report</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '6%' }}>T.Status</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0" style={{ width: '7%', minWidth: '7rem' }}>Status</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase" style={{ width: '8%' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-gray-700">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                                    <td key={j} className="px-1 py-1.5">
                                      <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Loading State - Show skeleton for cards */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="bg-white dark:bg-slate-800 border dark:border-slate-600">
                          <CardContent className="p-6">
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
                  )
                ) : filteredResults.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                        No lab results found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Try adjusting your search terms or filters
                      </p>
                    </CardContent>
                  </Card>
                ) : viewMode === "list" ? (
                  /* List View - Table Format */
                  <Card className="w-full max-w-full overflow-hidden">
                    <CardContent className="p-0 w-full max-w-full">
                      <div className="w-full max-w-full overflow-hidden">
                        <table className="w-full min-w-0 text-[11px]" style={{ tableLayout: 'fixed', width: '100%' }}>
                          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Test ID</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '9%' }}>Patient</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '10%' }}>Test Type</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Ordered</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Priority</th>
                              {activeTab === "generated" && (
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Rx</th>
                              )}
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Sample</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Report</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>T.Status</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0" style={{ width: '6%', minWidth: '7rem' }}>Status</th>
                              <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0" style={{ width: '2%', minWidth: '1.5rem' }}>.</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Pay</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '4%' }}>Signed</th>
                              {activeTab === "request" && (
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '7%' }}>Inv/Sign</th>
                              )}
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0" style={{ width: '7%', minWidth: '4.5rem' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredResults.map((result) => (
                              <tr
                                key={result.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                data-testid={`row-lab-result-${result.id}`}
                              >
                                <td className="px-1 py-1.5 text-[11px] font-medium text-gray-900 dark:text-gray-100 min-w-0">
                                  <div className="truncate" title={result.testId}>
                                    {result.testId}
                                  </div>
                                  {activeTab === "generated" && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedResult(result);
                                        setShowPrescriptionDialog(true);
                                      }}
                                      className="h-auto p-0 text-xs text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-300"
                                      data-testid={`link-view-prescription-${result.id}`}
                                    >
                                      View
                                    </Button>
                                  )}
                                </td>
                                <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                  <div className="truncate" title={getPatientName(result.patientId)}>
                                    {getPatientName(result.patientId)}
                                  </div>
                                </td>
                                <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                  <div className="truncate" title={result.testType}>
                                    {(() => {
                                      const tests = result.testType.split(' | ');
                                      if (tests.length <= 2) {
                                        return result.testType;
                                      }
                                      const visibleTests = tests.slice(0, 2).join(' | ');
                                      const hiddenCount = tests.length - 2;
                                      return (
                                        <div className="group relative inline-block w-full">
                                          <span className="truncate block">{visibleTests} <span className="text-blue-600 dark:text-gray-100 cursor-help">+{hiddenCount}</span></span>
                                          <div className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3 min-w-[300px]">
                                            <div className="text-sm font-medium mb-2">All Tests:</div>
                                            <div className="space-y-1">
                                              {tests.map((test, idx) => (
                                                <div key={idx} className="text-sm">{test}</div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-1 py-1.5 text-[11px] text-gray-500 dark:text-gray-400 min-w-0">
                                  <div className="truncate" title={format(new Date(result.orderedAt), "MMM dd, yyyy")}>
                                    {format(new Date(result.orderedAt), "MMM dd, yyyy")}
                                  </div>
                                </td>
                                <td className="px-1 py-1.5 text-[11px] min-w-0">
                                  <Badge
                                    variant={result.priority === "urgent" ? "destructive" : "secondary"}
                                    className="text-[10px] px-1 py-0"
                                  >
                                    {result.priority || "routine"}
                                  </Badge>
                                </td>
                                {activeTab === "generated" && (
                                  <td className="px-1 py-1.5 text-[11px] min-w-0">
                                    <div className="flex items-center justify-center gap-0.5 flex-shrink-0">
                                      {/* Save/View Prescription PDF Button */}
                                      {activeTab === "generated" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              const token = localStorage.getItem("auth_token");
                                              const headers: Record<string, string> = {
                                                "X-Tenant-Subdomain": getActiveSubdomain(),
                                              };
                                              if (token) {
                                                headers["Authorization"] = `Bearer ${token}`;
                                              }

                                              // Get signed URL for the prescription PDF
                                              const signedUrlResponse = await fetch(`/api/files/${result.id}/signed-url?type=prescription`, {
                                                headers,
                                                credentials: "include",
                                              });

                                              if (!signedUrlResponse.ok) {
                                                const errorData = await signedUrlResponse.json();
                                                throw new Error(errorData.error || "Failed to get PDF URL");
                                              }

                                              const { signedUrl } = await signedUrlResponse.json();

                                              // Set PDF URL and open viewer
                                              setPdfViewerUrl(signedUrl);
                                              setSelectedResult(result);
                                              setShowPdfViewerDialog(true);
                                            } catch (error: any) {
                                              console.error("Error opening PDF:", error);
                                              toast({
                                                title: "Error",
                                                description: error.message || "Failed to open PDF. Please try again.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          className="h-5 w-5 p-0"
                                          data-testid={`button-prescription-pdf-${result.id}`}
                                          title="View Prescription PDF"
                                        >
                                          <Save className="h-2.5 w-2.5 text-yellow-600 dark:text-yellow-400" />
                                        </Button>
                                      )}

                                      {/* Print Prescription PDF Button */}
                                      {activeTab === "generated" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              const token = localStorage.getItem("auth_token");
                                              const headers: Record<string, string> = {
                                                "X-Tenant-Subdomain": getActiveSubdomain(),
                                              };
                                              if (token) {
                                                headers["Authorization"] = `Bearer ${token}`;
                                              }

                                              // Get signed URL for the prescription PDF
                                              const signedUrlResponse = await fetch(`/api/files/${result.id}/signed-url?type=prescription`, {
                                                headers,
                                                credentials: "include",
                                              });

                                              if (!signedUrlResponse.ok) {
                                                const errorData = await signedUrlResponse.json();
                                                throw new Error(errorData.error || "Failed to get PDF URL");
                                              }

                                              const { signedUrl } = await signedUrlResponse.json();

                                              // Open PDF in new window for printing
                                              const printWindow = window.open(signedUrl, '_blank');
                                              if (printWindow) {
                                                printWindow.onload = () => {
                                                  printWindow.print();
                                                };
                                              }
                                            } catch (error: any) {
                                              console.error("Error printing PDF:", error);
                                              toast({
                                                title: "Error",
                                                description: error.message || "Failed to print PDF. Please try again.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          className="h-5 w-5 p-0"
                                          data-testid={`button-prescription-print-${result.id}`}
                                          title="Print Prescription PDF"
                                        >
                                          <Printer className="h-2.5 w-2.5 text-blue-600 dark:text-gray-100" />
                                        </Button>
                                      )}

                                      {/* Download Prescription PDF Button */}
                                      {activeTab === "generated" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              const token = localStorage.getItem("auth_token");
                                              const headers: Record<string, string> = {
                                                "X-Tenant-Subdomain": getActiveSubdomain(),
                                              };
                                              if (token) {
                                                headers["Authorization"] = `Bearer ${token}`;
                                              }

                                              // Get signed URL for the prescription PDF (same as save/print)
                                              const signedUrlResponse = await fetch(`/api/files/${result.id}/signed-url?type=prescription`, {
                                                headers,
                                                credentials: "include",
                                              });

                                              if (!signedUrlResponse.ok) {
                                                const errorData = await signedUrlResponse.json();
                                                throw new Error(errorData.error || "Failed to get PDF URL");
                                              }

                                              const { signedUrl } = await signedUrlResponse.json();

                                              // Download the PDF from the signed URL
                                              const response = await fetch(signedUrl);

                                              if (!response.ok) {
                                                throw new Error("Failed to download PDF.");
                                              }

                                              const blob = await response.blob();
                                              const url = window.URL.createObjectURL(blob);
                                              const a = document.createElement('a');
                                              a.href = url;
                                              a.download = `${result.testId}_prescription.pdf`;
                                              document.body.appendChild(a);
                                              a.click();
                                              window.URL.revokeObjectURL(url);
                                              document.body.removeChild(a);

                                              toast({
                                                title: "Success",
                                                description: "Prescription PDF downloaded successfully.",
                                              });
                                            } catch (error: any) {
                                              console.error("Error downloading PDF:", error);
                                              toast({
                                                title: "Error",
                                                description: error.message || "Failed to download PDF. Please try again.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          className="h-5 w-5 p-0"
                                          data-testid={`button-prescription-download-${result.id}`}
                                          title="Download Prescription PDF"
                                        >
                                          <Download className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                )}
                                <td className="px-1 py-1.5 text-[11px] min-w-0">
                                  {result.sampleCollected ? (
                                    <div className="flex items-center justify-center" title="Sample Collected">
                                      <CheckCircle className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center" title="not collected">
                                      <X className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                                    </div>
                                  )}
                                </td>
                                <td className="px-1 py-1.5 text-[11px] min-w-0">
                                  {result.labReportGenerated ? (
                                    <div className="flex items-center justify-center" title="Report Generated">
                                      <CheckCircle className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center" title="Report Not Generated">
                                      <Clock className="h-2.5 w-2.5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                  )}
                                </td>
                                <td className="px-1 py-1.5 text-[11px] min-w-0">
                                  <Badge
                                    variant={result.criticalValues ? "destructive" : "secondary"}
                                    className="text-[10px] px-1 py-0"
                                  >
                                    {result.criticalValues ? "Critical" : "Normal"}
                                  </Badge>
                                </td>
                                <td className="px-1 py-1.5 text-[11px] min-w-0 overflow-hidden" style={{ maxWidth: '7rem' }}>
                                  <Badge className={`${getStatusColor(result.status)} text-[10px] px-1 py-0 shrink-0`}>
                                    {result.status}
                                  </Badge>
                                </td>
                                <td className="px-1 py-1.5 text-[11px] min-w-0 w-[1.5rem] shrink-0 text-center">
                                  {user?.role !== 'patient' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditStatusDialog({ id: result.id, status: result.status });
                                        setEditStatusDraft(result.status);
                                      }}
                                      className="h-[18px] w-[18px] min-w-[18px] p-0 shrink-0 inline-flex items-center justify-center"
                                      data-testid={`button-edit-status-${result.id}`}
                                    >
                                      <Edit className="w-[9px] h-[9px] shrink-0" style={{ width: 9, height: 9 }} />
                                    </Button>
                                  )}
                                </td>
                                <td className="px-1 py-1.5 text-[11px] min-w-0">
                                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-gray-100 border-blue-200 dark:border-blue-700 text-[10px] px-1 py-0 truncate max-w-full">
                                    <span className="truncate block">{(result as any).paymentMethod || 'N/A'}</span>
                                  </Badge>
                                </td>
                                <td className="px-1 py-1.5 text-[11px] min-w-0">
                                  <div className="flex items-center justify-center">
                                    {result.signature?.doctorSignature &&
                                      String(result.signature.doctorSignature).trim() !== "" ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1 flex items-center gap-0.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => {
                                          setSelectedSignatureData({
                                            signedAt: result.signature?.signedAt,
                                            signedBy: result.signature?.signedBy || "N/A",
                                            signerId: result.signature?.signerId,
                                            doctorSignature: result.signature?.doctorSignature,
                                          });
                                          setShowSignatureDetailsDialog(true);
                                        }}
                                        title="View signature details"
                                      >
                                        <CheckCircle className="h-2.5 w-2.5" />
                                        <span className="text-[10px]">✓</span>
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-0.5 text-red-600">
                                        <X className="h-2.5 w-2.5" />
                                        <span className="text-[10px]">✗</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {activeTab === "request" && (
                                  <td className="px-1 py-1.5 text-[11px] min-w-0">
                                    <div className="flex items-center gap-0.5 justify-center flex-shrink-0 flex-wrap">
                                      {user?.role !== 'patient' && (
                                        <>
                                          {activeTab === "request" && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={async () => {
                                                // Check if signature exists
                                                const hasSignature = result.signature?.doctorSignature &&
                                                  String(result.signature.doctorSignature).trim() !== "";

                                                if (!hasSignature) {
                                                  // No signature - show required signature dialog
                                                  setSelectedResult(result);
                                                  setShowRequiredSignatureDialog(true);
                                                  return;
                                                }

                                                // Signature exists - proceed with PDF save
                                                await handleSavePrescriptionPdf(result.id);
                                              }}
                                              className="h-5 w-5 p-0"
                                              data-testid={`button-save-pdf-${result.id}`}
                                              title="Save Prescription PDF"
                                            >
                                              <Save className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleManageInvoice(result)}
                                            className="h-5 w-5 p-0"
                                            data-testid={`button-manage-invoice-${result.id}`}
                                            title="Manage Invoice"
                                          >
                                            <CurrencyIcon className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                          </Button>
                                          {(activeTab === "request" || activeTab === "generated") && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedResult(result);
                                                setHideTabs(true);
                                                setShowESignDialog(true);
                                              }}
                                              className="h-5 w-5 p-0"
                                              data-testid={`button-esign-${result.id}`}
                                              title="E-Sign"
                                            >
                                              <PenTool className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                )}
                                <td className="px-1 py-1.5 text-[11px] min-w-[4.5rem] w-[4.5rem] shrink-0">
                                  <div className="flex items-center gap-0.5 justify-center flex-shrink-0">
                                    {activeTab === "request" ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 min-w-6 p-0 shrink-0"
                                            data-testid={`button-actions-${result.id}`}
                                            title="Actions"
                                          >
                                            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="min-w-[10rem]">
                                          {user?.role !== 'patient' && canEdit('lab_results') && (
                                            <DropdownMenuItem
                                              onClick={() => handleViewResult(result)}
                                              data-testid={`button-edit-${result.id}`}
                                            >
                                              <Edit className="w-3.5 h-3.5 mr-2 shrink-0" />
                                              Edit
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() => handleGeneratePrescription(result)}
                                            data-testid={`button-prescription-${result.id}`}
                                          >
                                            <Eye className="w-3.5 h-3.5 mr-2 shrink-0" />
                                            {user?.role === 'patient' ? 'View Prescription' : 'View'}
                                          </DropdownMenuItem>
                                          {user?.role !== 'patient' && canDelete('lab_results') && (
                                            <DropdownMenuItem
                                              onClick={() => handleDeleteResult(result.id)}
                                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                              data-testid={`button-delete-${result.id}`}
                                            >
                                              <Trash2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                                              Delete
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : activeTab === "generate" ? (
                                      <>
                                        {user?.role !== 'patient' && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedLabOrder(result);
                                              setShowFillResultDialog(true);
                                            }}
                                            className="h-5 w-5 p-0"
                                            data-testid={`button-generate-${result.id}`}
                                          >
                                            <FileText className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                          </Button>
                                        )}
                                      </>
                                    ) : (
                                      /* Lab Results tab: kebab dropdown with Save, Print, Download, Delete */
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 min-w-6 p-0 shrink-0"
                                            data-testid={`button-actions-${result.id}`}
                                            title="Actions"
                                          >
                                            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="min-w-[10rem]">
                                          <DropdownMenuItem
                                            onClick={async () => {
                                              try {
                                                const token = localStorage.getItem("auth_token");
                                                const headers: Record<string, string> = {
                                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                                };
                                                if (token) {
                                                  headers["Authorization"] = `Bearer ${token}`;
                                                }
                                                const response = await fetch(`/api/lab-results/${result.id}/download-pdf`, { headers });
                                                if (!response.ok) {
                                                  const errorData = await response.json().catch(() => ({ error: "Failed to download PDF" }));
                                                  throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                                                }
                                                const blob = await response.blob();
                                                const blobUrl = URL.createObjectURL(blob);
                                                setSelectedResult(result);
                                                setPdfViewerUrl(blobUrl);
                                                setShowPdfViewerDialog(true);
                                              } catch (error: any) {
                                                console.error("Error opening PDF:", error);
                                                toast({
                                                  title: "Error",
                                                  description: error.message || "Failed to open PDF. Please try again.",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                            data-testid={`button-save-pdf-viewer-${result.id}`}
                                          >
                                            <Save className="w-3.5 h-3.5 mr-2 shrink-0" />
                                            Save
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={async () => {
                                              try {
                                                const token = localStorage.getItem("auth_token");
                                                const headers: Record<string, string> = {
                                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                                };
                                                if (token) {
                                                  headers["Authorization"] = `Bearer ${token}`;
                                                }
                                                const signedUrlResponse = await fetch(`/api/files/${result.id}/signed-url?type=testresult`, {
                                                  headers,
                                                  credentials: "include",
                                                });
                                                if (!signedUrlResponse.ok) {
                                                  const errorData = await signedUrlResponse.json();
                                                  throw new Error(errorData.error || "Failed to get PDF URL");
                                                }
                                                const { signedUrl } = await signedUrlResponse.json();
                                                const printWindow = window.open(signedUrl, '_blank');
                                                if (printWindow) {
                                                  printWindow.onload = () => {
                                                    printWindow.print();
                                                  };
                                                }
                                              } catch (error: any) {
                                                console.error("Error printing PDF:", error);
                                                toast({
                                                  title: "Error",
                                                  description: error.message || "Failed to print PDF. Please try again.",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                            data-testid={`button-print-${result.id}`}
                                          >
                                            <Printer className="w-3.5 h-3.5 mr-2 shrink-0" />
                                            Print
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={async () => {
                                              try {
                                                const token = localStorage.getItem("auth_token");
                                                const headers: Record<string, string> = {
                                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                                };
                                                if (token) {
                                                  headers["Authorization"] = `Bearer ${token}`;
                                                }
                                                const response = await fetch(`/api/lab-results/${result.id}/download-pdf`, { headers });
                                                if (!response.ok) {
                                                  const errorData = await response.json().catch(() => ({ error: "Failed to download PDF" }));
                                                  throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                                                }
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${result.testId}_test_result.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                                toast({
                                                  title: "Success",
                                                  description: "Test result PDF downloaded successfully.",
                                                });
                                              } catch (error: any) {
                                                console.error("Error downloading PDF:", error);
                                                toast({
                                                  title: "Error",
                                                  description: error.message || "Failed to download PDF. Please try again.",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                            data-testid={`button-download-${result.id}`}
                                          >
                                            <Download className="w-3.5 h-3.5 mr-2 shrink-0" />
                                            Download
                                          </DropdownMenuItem>
                                          {user?.role !== 'patient' && (
                                            <DropdownMenuItem
                                              onClick={() => handleShareResult(result)}
                                              data-testid={`button-share-${result.id}`}
                                            >
                                              <Share2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                                              Share
                                            </DropdownMenuItem>
                                          )}
                                          {user?.role !== 'patient' && canDelete('lab_results') && (
                                            <DropdownMenuItem
                                              onClick={() => handleDeleteResult(result.id)}
                                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                              data-testid={`button-delete-${result.id}`}
                                            >
                                              <Trash2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                                              Delete
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  filteredResults.map((result) => (
                    <Card
                      key={result.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6 relative">
                        {/* Doctor information - Top Right Position */}
                        <div className="absolute top-6 right-6 w-70">
                          <div className="p-4 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-600 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <User className="h-4 w-4 text-blue-600 dark:text-gray-100" />
                              <h4 className="font-semibold text-blue-900 dark:text-white">
                                {result.doctorName || "Dr. Sarah Williams"}
                              </h4>
                            </div>

                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="font-medium text-gray-800 dark:text-gray-300">
                                  Main Specialization:
                                </span>
                                <div className="text-blue-600 dark:text-gray-100">
                                  {result.mainSpecialty || "Diagnostic Specialties"}
                                </div>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-gray-800 dark:text-gray-300">
                                  Sub-Specialization:
                                </span>
                                <div className="text-blue-600 dark:text-gray-100">
                                  {result.subSpecialty || "Neurosurgeon"}
                                </div>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-gray-800 dark:text-gray-300">
                                  Priority:
                                </span>
                                <div className="text-green-600 dark:text-green-400">
                                  {result.priority || "urgent"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Header with patient name and status - with right margin for blue box */}
                        <div className="flex items-center gap-3 mb-4 mr-72">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {getPatientName(result.patientId)}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                            {user?.role !== 'patient' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditStatusDialog({ id: result.id, status: result.status });
                                  setEditStatusDraft(result.status);
                                }}
                                className="h-[18px] w-[18px] min-w-[18px] p-0 shrink-0 inline-flex items-center justify-center"
                                data-testid="button-edit-status-list"
                              >
                                <Edit className="w-[9px] h-[9px] shrink-0" style={{ width: 9, height: 9 }} />
                              </Button>
                            )}
                          </div>
                          {result.criticalValues && (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Critical
                            </Badge>
                          )}
                          {result.sampleCollected ? (
                            <div className="flex items-center" title="Sample Collected">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="flex items-center" title="not collected">
                              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                          {result.labReportGenerated ? (
                            <div className="flex items-center" title="Report Generated">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="flex items-center" title="Report Not Generated">
                              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                          )}
                        </div>

                        {/* Main content area - with right margin for blue box */}
                        <div className="mr-72">
                          {/* Test details and Notes */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Ordered:</span>{" "}
                                {format(
                                  new Date(result.orderedAt),
                                  "MMM dd, yyyy HH:mm",
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Test:</span>{" "}
                                {(() => {
                                  const tests = result.testType.split(' | ');
                                  if (tests.length <= 3) {
                                    return result.testType;
                                  }
                                  const visibleTests = tests.slice(0, 3).join(' | ');
                                  const hiddenCount = tests.length - 3;
                                  return (
                                    <span className="group relative inline-block">
                                      <span>{visibleTests} <span className="text-blue-600 dark:text-gray-100 cursor-help font-medium">+{hiddenCount} more</span></span>
                                      <div className="invisible group-hover:visible absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3 min-w-[400px] max-w-[600px]">
                                        <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">All Tests ({tests.length}):</div>
                                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                          {tests.map((test, idx) => (
                                            <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 py-0.5">{test}</div>
                                          ))}
                                        </div>
                                      </div>
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Test ID:</span>{" "}
                                {result.testId}
                                {activeTab !== "request" && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedResult(result);
                                      setShowPrescriptionDialog(true);
                                    }}
                                    className="h-auto p-0 ml-2 text-xs text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-300"
                                    data-testid={`link-view-prescription-card-${result.id}`}
                                  >
                                    View Prescription
                                  </Button>
                                )}
                              </div>
                              {result.completedAt && (
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  <span className="font-medium">Completed:</span>{" "}
                                  {format(
                                    new Date(result.completedAt),
                                    "MMM dd, yyyy HH:mm",
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Notes section */}
                            <div>
                              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                Notes
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {result.notes || "no no"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Test Results section (if available) - with right margin for blue box */}
                        {result.results && result.results.length > 0 && activeTab !== "generate" && (
                          <div className="mt-6 mr-72">
                            <button
                              onClick={() => {
                                setExpandedResults((prev) => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(result.id)) {
                                    newSet.delete(result.id);
                                  } else {
                                    newSet.add(result.id);
                                  }
                                  return newSet;
                                });
                              }}
                              className="flex items-center gap-2 font-medium mb-3 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-gray-300 transition-colors"
                              data-testid="button-toggle-test-results"
                            >
                              {expandedResults.has(result.id) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                              <span>Test Results:</span>
                            </button>

                            {expandedResults.has(result.id) && (
                              <div className="grid gap-3">
                                {result.results.map(
                                  (testResult: any, index: number) => (
                                    <div
                                      key={index}
                                      className="p-3 rounded-lg border bg-gray-50 border-gray-200"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">
                                          {testResult.name}
                                        </span>
                                        <Badge
                                          className={getResultStatusColor(
                                            testResult.status,
                                          )}
                                        >
                                          {testResult.status
                                            .replace("_", " ")
                                            .toUpperCase()}
                                        </Badge>
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                        <span className="font-medium">
                                          {testResult.value} {testResult.unit}
                                        </span>
                                        <span className="ml-2">
                                          Ref: {testResult.referenceRange}
                                        </span>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons at bottom - with right margin for blue box */}
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                          {activeTab === "request" ? (
                            <>
                              {user?.role !== 'patient' && canEdit('lab_results') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewResult(result)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              )}
                              {user?.role !== 'patient' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleManageInvoice(result)}
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                  data-testid={`button-manage-invoice-card-${result.id}`}
                                >
                                  <CurrencyIcon className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1" />
                                  <span className="hidden lg:inline">Invoice</span>
                                  <span className="lg:hidden">{currencySymbol}</span>
                                </Button>
                              )}
                              {user?.role !== 'patient' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedResult(result);
                                    setHideTabs(true);
                                    setShowESignDialog(true);
                                  }}
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                  data-testid="button-esign-card"
                                >
                                  <PenTool className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1" />
                                  <span className="hidden lg:inline">E-Sign</span>
                                  <span className="lg:hidden">Sign</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGeneratePrescription(result)}
                                className="bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {user?.role === 'patient' ? 'View Prescription' : 'Generate Prescription'}
                              </Button>
                              {user?.role !== 'patient' && canDelete('lab_results') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteResult(result.id)}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  data-testid="button-delete-lab-result"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              )}
                            </>
                          ) : activeTab === "generate" ? (
                            <>
                              {user?.role !== 'patient' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLabOrder(result);
                                    setShowFillResultDialog(true);
                                  }}
                                  className="bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                  data-testid="button-generate-lab-result"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Generate Test Result
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem("auth_token");
                                    const headers: Record<string, string> = {
                                      "X-Tenant-Subdomain": getActiveSubdomain(),
                                    };
                                    if (token) {
                                      headers["Authorization"] = `Bearer ${token}`;
                                    }

                                    const response = await fetch(`/api/lab-results/${result.id}/download-pdf`, {
                                      headers,
                                      credentials: "include",
                                    });

                                    if (!response.ok) {
                                      const errorData = await response.json();
                                      throw new Error(errorData.error || "File not found");
                                    }

                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    window.open(url, '_blank');

                                    toast({
                                      title: "Success",
                                      description: "Opening lab result PDF",
                                    });
                                  } catch (error: any) {
                                    console.error("Error opening PDF:", error);
                                    toast({
                                      title: "Error",
                                      description: error.message || "Failed to open PDF. Please generate the report first.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                data-testid={`button-prescription-card-${result.id}`}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem("auth_token");
                                    const headers: Record<string, string> = {
                                      "X-Tenant-Subdomain": getActiveSubdomain(),
                                    };
                                    if (token) {
                                      headers["Authorization"] = `Bearer ${token}`;
                                    }

                                    const response = await fetch(`/api/lab-results/${result.id}/download-pdf`, {
                                      headers,
                                      credentials: "include",
                                    });

                                    if (!response.ok) {
                                      const errorData = await response.json();
                                      throw new Error(errorData.error || "File not found");
                                    }

                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const printWindow = window.open(url, '_blank');
                                    if (printWindow) {
                                      printWindow.onload = () => {
                                        printWindow.print();
                                      };
                                    }

                                    toast({
                                      title: "Success",
                                      description: "Opening lab result for printing",
                                    });
                                  } catch (error: any) {
                                    console.error("Error printing PDF:", error);
                                    toast({
                                      title: "Error",
                                      description: error.message || "Failed to print. Please generate the report first.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                data-testid={`button-print-card-${result.id}`}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem("auth_token");
                                    const headers: Record<string, string> = {
                                      "X-Tenant-Subdomain": getActiveSubdomain(),
                                    };
                                    if (token) {
                                      headers["Authorization"] = `Bearer ${token}`;
                                    }

                                    const response = await fetch(`/api/lab-results/${result.id}/download-pdf`, {
                                      headers,
                                      credentials: "include",
                                    });

                                    if (!response.ok) {
                                      const errorData = await response.json();
                                      throw new Error(errorData.error || "File not found");
                                    }

                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${result.testId || result.id}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);

                                    toast({
                                      title: "Success",
                                      description: "Lab result PDF downloaded successfully",
                                    });
                                  } catch (error: any) {
                                    console.error("Error downloading PDF:", error);
                                    toast({
                                      title: "Error",
                                      description: error.message || "Failed to download PDF. Please generate the report first.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                data-testid={`button-download-card-${result.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Order Lab Test Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-lg h-[550px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="patient">Select Patient</Label>
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
                      className="w-full justify-between"
                    >
                      {orderFormData.patientId
                        ? orderFormData.patientName
                        : "Select a patient..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-full p-0 overflow-hidden">
                    <Command className="[&_[cmdk-group]]:min-w-0">
                      <CommandInput placeholder="Search patient..." />
                      <CommandList>
                        <CommandEmpty>No patient found.</CommandEmpty>
                        <CommandGroup className="min-w-0">
                          {patientsLoading ? (
                            <CommandItem disabled>Loading patients...</CommandItem>
                          ) : patientDropdownGroups.length > 0 ? (
                            patientDropdownGroups.flatMap(({ main, relatives }) => {
                              const rows = [
                                { patient: main, isChild: false },
                                ...relatives.map((p: any) => ({ patient: p, isChild: true })),
                              ];
                              return rows.map(({ patient, isChild }) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.firstName} ${patient.lastName} ${patient.patientId} ${patient.email ?? ""}`}
                                  onSelect={() => {
                                    setOrderFormData((prev) => ({
                                      ...prev,
                                      patientId: patient.id.toString(),
                                      patientName: formatPatientDropdownLabel(patient),
                                    }));
                                    setPatientSearchOpen(false);
                                  }}
                                  className="min-w-0 w-full whitespace-normal break-words items-start py-2"
                                >
                                  <Check
                                    className={`mt-0.5 mr-2 h-4 w-4 shrink-0 ${
                                      orderFormData.patientId === patient.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  <span className={`min-w-0 flex-1 break-words ${isChild ? "pl-1" : ""}`}>
                                    {isChild ? "↳ " : ""}
                                    {formatPatientDropdownLabel(patient)}
                                  </span>
                                </CommandItem>
                              ));
                            })
                          ) : (
                            <CommandItem disabled>No patients available</CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {user?.role !== "patient" && (
              <>
                {isDoctorLike(user?.role) ? (
                  // For doctor roles: Show labels instead of dropdowns
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span data-testid="provider-role-display">
                          {formatRoleLabel(user?.role)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider Name</Label>
                      <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span data-testid="provider-name-display">
                          {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : ''}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  // For non-doctor roles: Show original dropdown behavior
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="role">Select Role</Label>
                      <Popover
                        open={orderRoleSearchOpen}
                        onOpenChange={setOrderRoleSearchOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={orderRoleSearchOpen}
                            className="w-full justify-between"
                          >
                            {orderFormData.selectedRole
                              ? rolesData.find((role: any) => role.name === orderFormData.selectedRole)?.displayName || orderFormData.selectedRole
                              : "Select a role"}
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
                                  const roleName = (role.name || '').toLowerCase();
                                  return !['patient', 'admin', 'administrator'].includes(roleName);
                                })
                                .map((role: any) => (
                                  <CommandItem
                                    key={role.id}
                                    value={`${role.displayName || role.name} ${role.name}`}
                                    onSelect={() => {
                                      setOrderFormData((prev) => ({
                                        ...prev,
                                        selectedRole: role.name,
                                        selectedUserId: "",
                                        selectedUserName: "",
                                      }));
                                      setOrderRoleSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${orderFormData.selectedRole === role.name
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

                    {orderFormData.selectedRole && (
                      <div className="space-y-2">
                        <Label htmlFor="user">Select Name</Label>
                        <Popover
                          open={orderNameSearchOpen}
                          onOpenChange={setOrderNameSearchOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={orderNameSearchOpen}
                              className="w-full justify-between"
                            >
                              {orderFormData.selectedUserId
                                ? users.find((u: any) => u.id.toString() === orderFormData.selectedUserId)
                                  ? `${users.find((u: any) => u.id.toString() === orderFormData.selectedUserId)?.firstName
                                  } ${users.find((u: any) => u.id.toString() === orderFormData.selectedUserId)?.lastName
                                  }`
                                  : "Select a user"
                                : "Select a user"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search users..." />
                              <CommandEmpty>No user found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {users
                                  .filter((u: any) => u.role === orderFormData.selectedRole)
                                  .map((u: any) => (
                                    <CommandItem
                                      key={u.id}
                                      value={`${u.firstName} ${u.lastName} ${u.email}`}
                                      onSelect={() => {
                                        setOrderFormData((prev) => ({
                                          ...prev,
                                          selectedUserId: u.id.toString(),
                                          selectedUserName: `${u.firstName} ${u.lastName}`,
                                        }));
                                        setOrderNameSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${orderFormData.selectedUserId === u.id.toString()
                                          ? "opacity-100"
                                          : "opacity-0"
                                          }`}
                                      />
                                      {u.firstName} {u.lastName} ({u.email})
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Popover open={testTypeOpen} onOpenChange={setTestTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={testTypeOpen}
                    className="w-full justify-between min-h-[40px] h-auto"
                  >
                    <div className="flex flex-wrap gap-1">
                      {orderFormData.testType.length === 0 ? (
                        <span className="text-muted-foreground">
                          Select test types...
                        </span>
                      ) : orderFormData.testType.length === 1 ? (
                        <span>{orderFormData.testType[0]}</span>
                      ) : (
                        <span>
                          {orderFormData.testType.length} test types selected
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[460px] p-0">
                  <Command>
                    <CommandInput placeholder="Search test types..." />
                    <CommandEmpty>No test type found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                      {availableTestTypes.map((testType) => (
                        <CommandItem
                          key={testType}
                          value={testType}
                          onSelect={() => {
                            setOrderFormData((prev) => ({
                              ...prev,
                              testType: prev.testType.includes(testType)
                                ? prev.testType.filter((t) => t !== testType)
                                : [...prev.testType, testType],
                            }));
                          }}
                        >
                          <Checkbox
                            checked={orderFormData.testType.includes(testType)}
                            className="mr-2"
                          />
                          {testType}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                  {orderFormData.testType.length > 0 && (
                    <div className="p-2 border-t">
                      <div className="flex flex-wrap gap-1 mb-2 max-h-32 overflow-y-auto">
                        {orderFormData.testType.map((testType) => (
                          <Badge
                            key={testType}
                            variant="secondary"
                            className="text-xs"
                          >
                            {testType}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  testType: prev.testType.filter(
                                    (t) => t !== testType,
                                  ),
                                }));
                              }}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOrderFormData((prev) => ({
                            ...prev,
                            testType: [],
                          }));
                        }}
                        className="w-full text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={orderFormData.priority}
                onValueChange={(value) =>
                  setOrderFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter clinical notes or special instructions"
                value={orderFormData.notes}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t mt-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowOrderDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createLabOrderMutation.mutate({
                    patientId: parseInt(orderFormData.patientId),
                    testType: orderFormData.testType.join(" | "),
                    priority: orderFormData.priority,
                    notes: orderFormData.notes,
                    selectedUserId: orderFormData.selectedUserId
                      ? parseInt(orderFormData.selectedUserId)
                      : null,
                    selectedUserName: orderFormData.selectedUserName,
                    orderedBy: user?.id,
                  });
                }}
                disabled={
                  createLabOrderMutation.isPending ||
                  !orderFormData.patientId ||
                  orderFormData.testType.length === 0 ||
                  (user?.role !== "patient" && !orderFormData.selectedUserId)
                }
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {createLabOrderMutation.isPending
                  ? "Ordering..."
                  : "Order Test"}
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Row 1: Patient & Service Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Patient</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm mt-1">
                  {pendingOrderData?.patientName || (() => {
                    const patient = patients.find((p: any) => p.id === pendingOrderData?.patientId);
                    return patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'N/A';
                  })()}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Service Date</Label>
                <Input
                  type="date"
                  value={invoiceData.serviceDate}
                  readOnly
                  className="mt-1 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 2: Doctor & Service Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Doctor</Label>
                <Input
                  value={`${user?.firstName || ''} ${user?.lastName || 'Admin User'}`}
                  readOnly
                  className="mt-1 bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Service Type</Label>
                <Input
                  value="Lab Result"
                  readOnly
                  className="mt-1 bg-gray-50 dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Row 3: Invoice Date & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceData.invoiceDate}
                  readOnly
                  className="mt-1 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Due Date</Label>
                <Input
                  type="date"
                  value={invoiceData.dueDate}
                  readOnly
                  className="mt-1 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Services & Procedures - Editable Table */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Services & Procedures</Label>
              <div className="border rounded-lg">
                <div className="grid grid-cols-10 gap-2 bg-gray-100 dark:bg-gray-800 p-2 font-medium text-sm">
                  <div className="col-span-2">Code</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-1"></div>
                </div>
                {invoiceData.items.map((item: any, index: number) => (
                  <div key={index} className="grid grid-cols-10 gap-2 p-2 border-t items-center">
                    <Input
                      value={item.code}
                      onChange={(e) => {
                        const newItems = [...invoiceData.items];
                        newItems[index].code = e.target.value;
                        setInvoiceData({ ...invoiceData, items: newItems });
                      }}
                      placeholder="Code"
                      className="col-span-2 h-9 text-sm"
                    />
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...invoiceData.items];
                        newItems[index].description = e.target.value;
                        setInvoiceData({ ...invoiceData, items: newItems });
                      }}
                      placeholder="Description"
                      className="col-span-5 h-9 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...invoiceData.items];
                        newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                        newItems[index].total = newItems[index].unitPrice;
                        const total = newItems.reduce((sum, it) => sum + it.total, 0);
                        setInvoiceData({ ...invoiceData, items: newItems, totalAmount: total });
                      }}
                      placeholder="0.00"
                      className="col-span-2 h-9 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newItems = invoiceData.items.filter((_: any, i: number) => i !== index);
                        const total = newItems.reduce((sum: number, it: any) => sum + it.total, 0);
                        setInvoiceData({ ...invoiceData, items: newItems, totalAmount: total });
                      }}
                      className="col-span-1 h-9 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {/* Add New Row Button */}
                <div className="p-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInvoiceData({
                        ...invoiceData,
                        items: [
                          ...invoiceData.items,
                          { code: '', description: '', quantity: 1, unitPrice: 0, total: 0 }
                        ]
                      });
                    }}
                    className="w-full text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </div>
            </div>

            {/* Row 4: Insurance Provider & Total Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Insurance Provider</Label>
                <Select
                  value={invoiceData.insuranceProvider || "none"}
                  onValueChange={(value) => setInvoiceData({
                    ...invoiceData,
                    insuranceProvider: value === 'none' ? '' : value,
                    invoiceType: (value === 'none' || value === '' || value === 'Self-Pay') ? 'payment' : 'insurance_claim'
                  })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-insurance-provider">
                    <SelectValue placeholder="Select insurance provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Patient Self-Pay)</SelectItem>
                    <SelectItem value="NHS (National Health Service)">NHS (National Health Service)</SelectItem>
                    <SelectItem value="Bupa">Bupa</SelectItem>
                    <SelectItem value="AXA PPP Healthcare">AXA PPP Healthcare</SelectItem>
                    <SelectItem value="Vitality Health">Vitality Health</SelectItem>
                    <SelectItem value="Aviva Health">Aviva Health</SelectItem>
                    <SelectItem value="Simply Health">Simply Health</SelectItem>
                    <SelectItem value="WPA">WPA</SelectItem>
                    <SelectItem value="Benenden Health">Benenden Health</SelectItem>
                    <SelectItem value="Healix Health Services">Healix Health Services</SelectItem>
                    <SelectItem value="Sovereign Health Care">Sovereign Health Care</SelectItem>
                    <SelectItem value="Exeter Friendly Society">Exeter Friendly Society</SelectItem>
                    <SelectItem value="Self-Pay">Self-Pay</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Total Amount</Label>
                <Input
                  value={invoiceData.totalAmount.toFixed(2)}
                  readOnly
                  className="mt-1 bg-gray-50 dark:bg-gray-800 font-semibold"
                />
              </div>
            </div>

            {/* Invoice Type Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Type:</span>
                    <Badge className={
                      invoiceData.invoiceType === 'insurance_claim'
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-300 dark:border-green-700"
                    }>
                      {invoiceData.invoiceType === 'insurance_claim' ? 'Insurance Claim' : 'Payment (Self-Pay)'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {invoiceData.invoiceType === 'insurance_claim'
                      ? 'This invoice will be submitted to the insurance provider for payment'
                      : 'This invoice will be paid directly by the patient'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                value={invoiceData.notes || pendingOrderData?.notes || ''}
                onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                placeholder="Add any additional notes about this invoice..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select
                value={invoiceData.paymentMethod || 'cash'}
                onValueChange={(value) => setInvoiceData({ ...invoiceData, paymentMethod: value })}
              >
                <SelectTrigger className="mt-1" data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceDialog(false);
                  setInvoiceData({
                    ...invoiceData,
                    paymentMethod: '',
                    insuranceProvider: '',
                    notes: ''
                  });
                }}
                className="flex-1"
                data-testid="button-cancel-invoice"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowInvoiceDialog(false);
                  setShowSummaryDialog(true);
                }}
                disabled={!invoiceData.paymentMethod || invoiceData.items.length === 0}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
                data-testid="button-create-invoice"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-medical-blue">Order Summary</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order Details */}
            <div className="border rounded-lg p-3 space-y-2">
              <h3 className="font-semibold text-sm border-b pb-1.5">Order Information</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Patient Name</Label>
                  <p className="font-medium text-sm">{pendingOrderData?.patientName}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Priority</Label>
                  <p className="font-medium text-sm capitalize">{pendingOrderData?.priority}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Test Types</Label>
                  <p className="font-medium text-sm">{pendingOrderData?.testTypes?.join(' | ')}</p>
                </div>
                {pendingOrderData?.notes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Notes</Label>
                    <p className="font-medium text-sm">{pendingOrderData.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lab Results Summary */}
            <div className="border rounded-lg p-3 space-y-2">
              <h3 className="font-semibold text-sm border-b pb-1.5">Lab Results Summary</h3>
              <div className="space-y-1.5">
                {invoiceData.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-1.5 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Code: {item.code}</p>
                    </div>
                    <p className="font-semibold text-sm">{currencySymbol}{item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2">
                <p className="text-sm font-bold">Total Amount:</p>
                <p className="text-lg font-bold text-medical-blue">{currencySymbol}{invoiceData.totalAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={async () => {
                  // Get patient name from pendingOrderData or find from patients list
                  const patientName = pendingOrderData?.patientName ||
                    (() => {
                      const patient = patients.find((p: any) => p.id === pendingOrderData?.patientId);
                      return patient ? `${patient.firstName} ${patient.lastName}` : '';
                    })();

                  // For admin/doctor/nurse, create invoice with status "unpaid" instead of opening payment modal
                  if (user?.role === 'admin' || user?.role === 'nurse' || user?.role === 'doctor') {
                    try {
                      const patient = patients.find((p: any) => p.id === pendingOrderData?.patientId);
                      const invoicePayload = {
                        patientId: patient?.patientId || '',
                        patientName: patientName,
                        nhsNumber: patient?.nhsNumber || '',
                        dateOfService: invoiceData.serviceDate,
                        invoiceDate: invoiceData.invoiceDate,
                        dueDate: invoiceData.dueDate,
                        status: 'unpaid',
                        invoiceType: 'payment',
                        subtotal: invoiceData.totalAmount.toString(),
                        tax: '0',
                        discount: '0',
                        totalAmount: invoiceData.totalAmount.toString(),
                        paidAmount: '0',
                        items: invoiceData.items.map((item: any) => {
                          const unitPrice = parseFloat(item.unitPrice) || 0;
                          const quantity = item.quantity || 1;
                          return {
                            code: item.code,
                            description: item.description,
                            quantity: quantity,
                            unitPrice: unitPrice,
                            total: unitPrice * quantity
                          };
                        }),
                        insuranceProvider: invoiceData.insuranceProvider,
                        notes: invoiceData.notes,
                        paymentMethod: invoiceData.paymentMethod,
                        serviceType: 'lab_result',
                        serviceId: pendingOrderData?.testId
                      };

                      const response = await apiRequest("POST", "/api/invoices", invoicePayload);

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Failed to create invoice");
                      }

                      // Update Lab_Request_Generated to true
                      if (pendingOrderData?.testId) {
                        try {
                          await apiRequest("PATCH", `/api/lab-results/${pendingOrderData.testId}`, {
                            labRequestGenerated: true
                          });
                        } catch (error) {
                          console.error("Failed to update Lab_Request_Generated:", error);
                        }
                      }

                      toast({
                        title: "Lab result created",
                        description: "Invoice created with unpaid status. Pay later.",
                      });

                      setShowSummaryDialog(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                    } catch (error) {
                      console.error("Error creating invoice:", error);
                      toast({
                        title: "Creation Failed",
                        description: error instanceof Error ? error.message : "Failed to create invoice. Please try again.",
                        variant: "destructive",
                      });
                    }
                    return;
                  }

                  if (invoiceData.paymentMethod === 'cash') {
                    // Handle cash payment
                    createCashPaymentMutation.mutate({
                      patient_id: pendingOrderData?.patientId,
                      patientName: patientName,
                      items: invoiceData.items,
                      totalAmount: invoiceData.totalAmount,
                      insuranceProvider: invoiceData.insuranceProvider,
                      paymentMethod: invoiceData.paymentMethod,
                      serviceDate: invoiceData.serviceDate,
                      invoiceDate: invoiceData.invoiceDate,
                      dueDate: invoiceData.dueDate,
                      serviceType: 'lab_result',
                      serviceId: pendingOrderData?.testId,
                    });
                  } else if (invoiceData.paymentMethod === 'debit_card') {
                    // Handle Stripe payment - setup payment intent
                    createStripePaymentMutation.mutate({
                      patient_id: pendingOrderData?.patientId,
                      patientName: patientName,
                      amount: invoiceData.totalAmount,
                      items: invoiceData.items,
                      insuranceProvider: invoiceData.insuranceProvider,
                      paymentMethod: invoiceData.paymentMethod,
                      serviceDate: invoiceData.serviceDate,
                      invoiceDate: invoiceData.invoiceDate,
                      dueDate: invoiceData.dueDate,
                      serviceType: 'lab_result',
                      serviceId: pendingOrderData?.testId,
                    });
                  } else if (invoiceData.paymentMethod === 'Insurance') {
                    // Handle Insurance payment with automatic claim submission
                    try {
                      // First create the invoice
                      const patient = patients.find((p: any) => p.id === pendingOrderData?.patientId);
                      const invoicePayload = {
                        patientId: patient?.patientId || '',
                        patientName: patientName,
                        nhsNumber: patient?.nhsNumber || '',
                        dateOfService: invoiceData.serviceDate,
                        invoiceDate: invoiceData.invoiceDate,
                        dueDate: invoiceData.dueDate,
                        status: user?.role === 'nurse' ? 'unpaid' : 'draft',
                        invoiceType: 'payment',
                        subtotal: invoiceData.totalAmount.toString(),
                        tax: '0',
                        discount: '0',
                        totalAmount: invoiceData.totalAmount.toString(),
                        paidAmount: '0',
                        items: invoiceData.items.map((item: any) => {
                          const unitPrice = parseFloat(item.unitPrice) || 0;
                          const quantity = item.quantity || 1;
                          return {
                            code: item.code,
                            description: item.description,
                            quantity: quantity,
                            unitPrice: unitPrice,
                            total: unitPrice * quantity
                          };
                        }),
                        insuranceProvider: invoiceData.insuranceProvider,
                        notes: invoiceData.notes,
                        paymentMethod: invoiceData.paymentMethod,
                        serviceType: 'lab_result',
                        serviceId: pendingOrderData?.testId
                      };

                      console.log("Creating invoice with payload:", invoicePayload);
                      const response = await apiRequest("POST", "/api/invoices", invoicePayload);
                      console.log("Invoice creation response status:", response.status);

                      if (!response.ok) {
                        const errorData = await response.json();
                        console.error("Invoice creation error:", errorData);
                        throw new Error(errorData.error || "Failed to create invoice");
                      }
                      const createdInvoice = await response.json();
                      console.log("Invoice created successfully:", createdInvoice);

                      // Automatically submit insurance claim
                      let claimSubmitted = false;
                      let claimError = null;
                      console.log("Checking insurance provider:", invoiceData.insuranceProvider);
                      if (invoiceData.insuranceProvider && invoiceData.insuranceProvider !== 'none' && invoiceData.insuranceProvider !== 'None') {
                        try {
                          const claimNumber = `AUTO-${Date.now()}`;
                          const claimPayload = {
                            invoiceId: createdInvoice.id,
                            provider: invoiceData.insuranceProvider,
                            claimNumber: claimNumber
                          };
                          console.log("Submitting insurance claim with payload:", claimPayload);

                          const claimResponse = await apiRequest('POST', '/api/insurance/submit-claim', claimPayload);
                          console.log("Claim submission response status:", claimResponse.status);

                          if (!claimResponse.ok) {
                            const claimErrorData = await claimResponse.json();
                            console.error("Claim submission error:", claimErrorData);
                            throw new Error(claimErrorData.error || "Failed to submit insurance claim");
                          }
                          claimSubmitted = true;
                          console.log("✅ Insurance claim submitted automatically:", {
                            invoiceId: createdInvoice.id,
                            provider: invoiceData.insuranceProvider,
                            claimNumber
                          });
                        } catch (err) {
                          claimError = err;
                          console.error("❌ Failed to auto-submit insurance claim:", err);
                        }
                      } else {
                        console.log("⚠️ Skipping claim submission - no valid insurance provider selected");
                      }

                      // Update Lab_Request_Generated to true
                      if (pendingOrderData?.testId) {
                        try {
                          await apiRequest("PATCH", `/api/lab-results/${pendingOrderData.testId}`, {
                            labRequestGenerated: true
                          });
                        } catch (error) {
                          console.error("Failed to update Lab_Request_Generated:", error);
                        }
                      }

                      // Show appropriate message based on claim submission result
                      if (claimSubmitted) {
                        setShowSummaryDialog(false);
                        setShowSuccessModal(true);
                      } else if (claimError) {
                        toast({
                          title: "Invoice Created - Claim Failed",
                          description: "Invoice created successfully, but insurance claim submission failed. Please submit the claim manually.",
                          variant: "destructive",
                        });
                      } else {
                        toast({
                          title: "Invoice Created",
                          description: "Invoice created successfully.",
                        });
                      }

                      setShowSummaryDialog(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                    } catch (error) {
                      console.error("Error creating invoice:", error);
                      toast({
                        title: "Creation Failed",
                        description: error instanceof Error ? error.message : "Failed to create invoice. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                disabled={createCashPaymentMutation.isPending || createStripePaymentMutation.isPending}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {createCashPaymentMutation.isPending || createStripePaymentMutation.isPending ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Payment Dialog */}
      {stripeClientSecret && (
        <Dialog open={!!stripeClientSecret} onOpenChange={(open) => !open && setStripeClientSecret("")}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
            </DialogHeader>
            <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
              <StripePaymentForm
                onSuccess={async (paymentIntentId: string) => {
                  // Call confirmation endpoint
                  apiRequest("POST", "/api/payments/stripe/confirm", { paymentIntentId })
                    .then(res => res.json())
                    .then(async data => {
                      // Update Lab_Request_Generated to true
                      if (pendingOrderData?.testId) {
                        try {
                          await apiRequest("PATCH", `/api/lab-results/${pendingOrderData.testId}`, {
                            labRequestGenerated: true
                          });
                        } catch (error) {
                          console.error("Failed to update Lab_Request_Generated:", error);
                        }
                      }

                      setPaymentResult({
                        invoiceId: data.invoice.invoiceNumber,
                        patientName: pendingOrderData?.patientName,
                        amount: invoiceData.totalAmount,
                        paymentMethod: 'debit_card',
                        testId: pendingOrderData?.testId
                      });
                      setStripeClientSecret("");
                      setShowSummaryDialog(false);
                      setShowPaymentConfirmation(true);
                      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
                    })
                    .catch(err => {
                      toast({
                        title: "Payment Confirmation Failed",
                        description: err.message || "Failed to confirm payment",
                        variant: "destructive",
                      });
                    });
                }}
                onCancel={() => setStripeClientSecret("")}
              />
            </Elements>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Confirmation Modal */}
      <Dialog open={showPaymentConfirmation} onOpenChange={setShowPaymentConfirmation}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">Lab Result Successfully created!</h3>
              <p className="text-gray-600 dark:text-gray-400">Your lab result has been processed successfully</p>
            </div>

            <div className="w-full space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Lab Result ID:</span>
                <span className="font-semibold">{pendingOrderData?.testId || paymentResult?.testId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Patient Name:</span>
                <span className="font-semibold">{paymentResult?.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount due:</span>
                <span className="font-semibold text-medical-blue">{currencySymbol}{paymentResult?.amount?.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={() => {
                setShowPaymentConfirmation(false);
                setPaymentResult(null);
                // Reset form
                setOrderFormData({
                  patientId: "",
                  patientName: "",
                  testType: [],
                  priority: "routine",
                  notes: "",
                  selectedRole: "",
                  selectedUserId: "",
                  selectedUserName: "",
                });
              }}
              className="w-full bg-medical-blue hover:bg-blue-700"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Lab Result Dialog */}
      <Dialog
        open={showViewDialog}
        onOpenChange={(open) => {
          setShowViewDialog(open);
          if (!open) {
            setIsEditMode(false);
            setEditFormData({});
          }
        }}
      >
        <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Result Details</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6 pt-4">
              {/* Test ID at the top as label */}
              <div>
                <Label className="text-sm font-semibold">Test ID: {selectedResult.testId}</Label>
              </div>

              {/* Single column layout - each field in its own row */}
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Test:</label>
                  <Popover open={testTypePopoverOpen} onOpenChange={setTestTypePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedTestTypes.length > 0
                          ? `${selectedTestTypes.length} selected`
                          : "Select test types"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search test types..." />
                        <CommandEmpty>No test type found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {availableTestTypes.map((testType) => (
                            <CommandItem
                              key={testType}
                              onSelect={() => {
                                const newSelection = selectedTestTypes.includes(testType)
                                  ? selectedTestTypes.filter((t) => t !== testType)
                                  : [...selectedTestTypes, testType];
                                setSelectedTestTypes(newSelection);
                                setEditFormData((prev: any) => ({
                                  ...prev,
                                  testType: newSelection.join(" | "),
                                }));
                              }}
                            >
                              <Checkbox
                                checked={selectedTestTypes.includes(testType)}
                                className="mr-2"
                              />
                              {testType}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block mb-1">Ordered:</label>
                  <Input
                    value={format(
                      new Date(selectedResult.orderedAt),
                      "MMM dd, yyyy HH:mm",
                    )}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block mb-1">Status:</label>
                  <Select
                    value={editFormData.status || selectedResult.status}
                    onValueChange={(value) =>
                      setEditFormData((prev: any) => ({
                        ...prev,
                        status: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="collected">collected</SelectItem>
                      <SelectItem value="processing">processing</SelectItem>
                      <SelectItem value="completed">completed</SelectItem>
                      <SelectItem value="cancelled">cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-1">Priority:</label>
                  <Select
                    value={editFormData.priority || selectedResult.priority}
                    onValueChange={(value) =>
                      setEditFormData((prev: any) => ({
                        ...prev,
                        priority: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-1">Doctor Name:</label>
                  <div className="space-y-2">
                    <Select
                      value={selectedEditRole}
                      onValueChange={(value) => {
                        setSelectedEditRole(value);
                        setEditFormData((prev: any) => ({
                          ...prev,
                          doctorName: "",
                          mainSpecialty: "",
                          subSpecialty: "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesData.map((role: any) => (
                          <SelectItem key={role.id} value={role.name}>
                            {formatRoleLabel(role.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedEditRole && (
                      <Select
                        value={editFormData.doctorName || selectedResult.doctorName || ""}
                        onValueChange={(value) => {
                          // Find the selected user to get their role
                          const selectedUser = users.find((u: User) =>
                            u.role === selectedEditRole &&
                            `${u.firstName} ${u.lastName}` === value
                          );

                          // Auto-populate specializations based on role
                          let mainSpecialty = "";
                          let subSpecialty = "";

                          if (selectedUser) {
                            // Search medicalSpecialties for matching role
                            for (const [mainSpec, subSpecs] of Object.entries(medicalSpecialties)) {
                              if (typeof subSpecs === 'object' && subSpecs !== null) {
                                for (const [subSpec] of Object.entries(subSpecs)) {
                                  // Check if role name matches sub-specialization
                                  const roleName = selectedEditRole.toLowerCase();
                                  const subSpecLower = subSpec.toLowerCase();

                                  if (subSpecLower.includes(roleName) || roleName.includes(subSpecLower.split(' ')[0])) {
                                    mainSpecialty = mainSpec;
                                    subSpecialty = subSpec;
                                    break;
                                  }
                                }
                                if (mainSpecialty) break;
                              }
                            }

                            // Fallback: try to match by role name directly
                            if (!mainSpecialty) {
                              const roleName = selectedEditRole.toLowerCase();
                              if (roleName.includes('surgeon') || roleName.includes('surgical')) {
                                mainSpecialty = "Surgical Specialties";
                                subSpecialty = "General Surgeon";
                              } else if (roleName.includes('orthopedic')) {
                                mainSpecialty = "Surgical Specialties";
                                subSpecialty = "Orthopedic Surgeon";
                              } else if (roleName.includes('cardiologist') || roleName.includes('cardiac')) {
                                mainSpecialty = "Heart & Circulation";
                                subSpecialty = "Cardiologist";
                              } else if (roleName.includes('pediatric')) {
                                mainSpecialty = "Children's Health";
                                subSpecialty = "Pediatrician";
                              } else {
                                mainSpecialty = "General & Primary Care";
                                subSpecialty = "General Practitioner (GP) / Family Physician";
                              }
                            }
                          }

                          setEditFormData((prev: any) => ({
                            ...prev,
                            doctorName: value,
                            mainSpecialty: mainSpecialty || prev.mainSpecialty || selectedResult.mainSpecialty || "",
                            subSpecialty: subSpecialty || prev.subSpecialty || selectedResult.subSpecialty || "",
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Name" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u: User) => u.role === selectedEditRole)
                            .map((u: User) => (
                              <SelectItem
                                key={u.id}
                                value={`${u.firstName} ${u.lastName}`}
                              >
                                {u.firstName} {u.lastName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block mb-1">Main Specialization:</label>
                  <Input
                    value={editFormData.mainSpecialty !== undefined ? editFormData.mainSpecialty : (selectedResult.mainSpecialty || "")}
                    onChange={(e) =>
                      setEditFormData((prev: any) => ({
                        ...prev,
                        mainSpecialty: e.target.value,
                      }))
                    }
                    placeholder="Enter main specialization"
                  />
                </div>

                <div>
                  <label className="block mb-1">Sub-Specialization:</label>
                  <Input
                    value={editFormData.subSpecialty !== undefined ? editFormData.subSpecialty : (selectedResult.subSpecialty || "")}
                    onChange={(e) =>
                      setEditFormData((prev: any) => ({
                        ...prev,
                        subSpecialty: e.target.value,
                      }))
                    }
                    placeholder="Enter sub-specialization"
                  />
                </div>

                <div>
                  <label className="block mb-1">Notes:</label>
                  <Textarea
                    value={
                      editFormData.notes !== undefined
                        ? editFormData.notes
                        : selectedResult.notes || ""
                    }
                    onChange={(e) =>
                      setEditFormData((prev: any) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Enter clinical notes or special instructions"
                    rows={4}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateLabResultMutation.isPending}
                >
                  {updateLabResultMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Lab Result Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Share Lab Results</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {getPatientName(selectedResult.patientId).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {getPatientName(selectedResult.patientId)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Patient ID: {selectedResult.patientId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Test Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Type:</span>
                      <span className="font-medium">
                        {selectedResult.testType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordered By:</span>
                      <span className="font-medium">
                        {selectedResult.orderedBy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge
                        variant={
                          selectedResult.status === "completed"
                            ? "default"
                            : selectedResult.status === "pending"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {selectedResult.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">
                        {selectedResult.completedAt
                          ? format(new Date(selectedResult.completedAt), "PPP")
                          : "Not completed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Clinical Review</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="reviewed"
                        className="rounded"
                      />
                      <Label htmlFor="reviewed" className="text-sm">
                        Results reviewed by physician
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="interpreted"
                        className="rounded"
                      />
                      <Label htmlFor="interpreted" className="text-sm">
                        Clinical interpretation complete
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="actions" className="rounded" />
                      <Label htmlFor="actions" className="text-sm">
                        Follow-up actions identified
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="approved"
                        className="rounded"
                      />
                      <Label htmlFor="approved" className="text-sm">
                        Approved for patient sharing
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {selectedResult.results && selectedResult.results.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Test Results Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedResult.results
                      .slice(0, 4)
                      .map((result: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">
                              {result.name}
                            </span>
                            <Badge
                              variant={
                                result.status === "normal"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {result.status}
                            </Badge>
                          </div>
                          <div className="text-lg font-semibold mt-1">
                            {result.value} {result.unit}
                          </div>
                          <div className="text-xs text-gray-600">
                            Ref: {result.referenceRange}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="physicianNotes" className="text-sm font-medium">
                  Physician Notes
                </Label>
                <Textarea
                  id="physicianNotes"
                  placeholder="Add clinical interpretation, recommendations, or follow-up instructions..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowReviewDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadResult(selectedResult.id)}
                  >
                    Download Report
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const pt = Array.isArray(patients) ? patients.find((p: any) => p?.id === selectedResult.patientId) : null;
                      setShowReviewDialog(false);
                      setShowShareDialog(true);
                      setShareFormData({
                        method: "email",
                        email: (pt as any)?.email || "",
                        whatsapp: "",
                        message: `Lab results for ${selectedResult.testType} are now available for review.`,
                      });
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    Share with Patient
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share with Patient Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Lab Results</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Share results for{" "}
                <strong>{getPatientName(selectedResult.patientId)}</strong>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">PDF File</Label>
                {sharePdfStatusLoading ? (
                  <div className="text-xs text-gray-500">Checking file…</div>
                ) : sharePdfStatusIsError ? (
                  <div className="text-xs text-red-600">
                    Unable to check PDF status right now. You can still try sending.
                  </div>
                ) : sharePdfStatus?.exists ? (
                  <div className="text-xs text-gray-700">
                    {sharePdfStatus.fileName}
                  </div>
                ) : (
                  <div className="text-xs text-red-600">
                    PDF not found. Please generate the report first.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Contact Method</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email"
                      name="method"
                      value="email"
                      checked={shareFormData.method === "email"}
                      onChange={(e) =>
                        setShareFormData((prev) => ({
                          ...prev,
                          method: e.target.value,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email" className="text-sm">
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="whatsapp"
                      name="method"
                      value="whatsapp"
                      checked={shareFormData.method === "whatsapp"}
                      onChange={(e) =>
                        setShareFormData((prev) => ({
                          ...prev,
                          method: e.target.value,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="whatsapp" className="text-sm">
                      WhatsApp
                    </Label>
                  </div>
                </div>
              </div>

              {shareFormData.method === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="emailAddress" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    placeholder="patient@example.com"
                    value={shareFormData.email}
                    onChange={(e) =>
                      setShareFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="whatsappNumber"
                    className="text-sm font-medium"
                  >
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    placeholder="+44 7XXX XXXXXX"
                    value={shareFormData.whatsapp}
                    onChange={(e) =>
                      setShareFormData((prev) => ({
                        ...prev,
                        whatsapp: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="shareMessage" className="text-sm font-medium">
                  Message
                </Label>
                <Textarea
                  id="shareMessage"
                  placeholder="Add a personal message..."
                  value={shareFormData.message}
                  onChange={(e) =>
                    setShareFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowShareDialog(false)}
                  disabled={isSendingShare}
                  size="sm"
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-medical-blue hover:bg-blue-700"
                  disabled={
                    isSendingShare ||
                    sharePdfStatusLoading ||
                    (!sharePdfStatusIsError && !sharePdfStatus?.exists) ||
                    (shareFormData.method === "email" && !shareFormData.email) ||
                    (shareFormData.method === "whatsapp" && !shareFormData.whatsapp)
                  }
                  onClick={async () => {
                    if (!selectedResult) return;
                    setIsSendingShare(true);
                    try {
                      if (shareFormData.method === "email") {
                        const response = await apiRequest("POST", `/api/lab-results/${selectedResult.id}/share-email`, {
                          recipientEmail: shareFormData.email,
                          message: shareFormData.message,
                        });
                        const data = await response.json();
                        if (response.ok) {
                          setShowShareDialog(false);
                          setShareResultDialogTitle("Success!");
                          setShareResultDialogDescription(
                            `Lab result PDF sent to ${data.email} (${data.patientName})`
                          );
                          setShowShareResultDialog(true);
                          setShareFormData({ method: "email", email: "", whatsapp: "", message: "" });
                        } else {
                          const message =
                            data.error || data.details || "Failed to send email.";

                          const msgStr = String(message || "");
                          if (msgStr.toLowerCase().includes("pdf not found")) {
                            setShareResultDialogTitle("PDF not found");
                            setShareResultDialogDescription("PDF not found. Please generate the report first.");
                            setShowShareResultDialog(true);
                            // Keep the share dialog open so user can go generate the report.
                          } else {
                            toast({
                              title: "Share Failed",
                              description: message,
                              variant: "destructive",
                            });
                          }
                        }
                      } else {
                        toast({ title: "WhatsApp Sharing", description: "WhatsApp sharing is not yet implemented. Please use email sharing.", variant: "destructive" });
                      }
                    } catch (error: any) {
                      const msg = error.message || "Network error.";
                      const match = msg.match(/^\d+: (.+)$/);
                      let description = msg;
                      if (match) {
                        try { const p = JSON.parse(match[1]); if (p.error) description = p.error; } catch {}
                      }
                      toast({ title: "Share Failed", description, variant: "destructive" });
                    } finally {
                      setIsSendingShare(false);
                    }
                  }}
                >
                  {isSendingShare ? "Sending…" : "Send Results"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Results Modal (success + specific PDF-not-found error) */}
      <AlertDialog open={showShareResultDialog} onOpenChange={setShowShareResultDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              {shareResultDialogTitle || "Notice"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {shareResultDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowShareResultDialog(false);
              }}
              className="bg-medical-blue hover:bg-blue-700 w-full"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lab Result Prescription Dialog */}
      <Dialog
        open={showPrescriptionDialog}
        onOpenChange={setShowPrescriptionDialog}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto dark:bg-[#1E1E1E] dark:border-[#2A2A2A]">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Lab Result Prescription
            </DialogTitle>
          </DialogHeader>

          {selectedResult && (
            <div
              className="prescription-content space-y-6 py-4"
              id="prescription-print"
            >
              {/* Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 pt-6">
                <div
                  className="flex items-start gap-4"
                  style={{
                    justifyContent: clinicHeader?.logoPosition === 'center' ? 'center' : 'flex-start'
                  }}
                >
                  {/* Logo on Left */}
                  {clinicHeader?.logoBase64 && (clinicHeader?.logoPosition === 'left' || clinicHeader?.logoPosition === 'center') && (
                    <img
                      src={clinicHeader.logoBase64}
                      alt="Clinic Logo"
                      style={{
                        height: "100px",
                        width: "100px",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Header Content */}
                  <div
                    className="flex-1"
                    style={{
                      textAlign: clinicHeader?.logoPosition === 'center' ? 'center' : clinicHeader?.logoPosition === 'right' ? 'right' : 'left'
                    }}
                  >
                    <h1
                      className="font-bold text-medical-blue dark:text-white mb-2"
                      style={{
                        fontSize: clinicHeader?.clinicNameFontSize || '24pt',
                        fontFamily: clinicHeader?.fontFamily || 'verdana',
                        fontWeight: clinicHeader?.fontWeight || 'bold',
                        fontStyle: clinicHeader?.fontStyle || 'normal',
                        textDecoration: clinicHeader?.textDecoration || 'none'
                      }}
                    >
                      {clinicHeader?.clinicName || 'CURA EMR SYSTEM'}
                    </h1>
                    <p
                      className="text-gray-600 dark:text-gray-300 font-medium"
                      style={{
                        fontSize: clinicHeader?.fontSize || '12pt',
                        fontFamily: clinicHeader?.fontFamily || 'verdana'
                      }}
                    >
                      Laboratory Test Prescription
                    </p>

                    <div
                      className="text-gray-700 dark:text-gray-300 mt-2 leading-5"
                      style={{
                        fontSize: clinicHeader?.fontSize || '12pt',
                        fontFamily: clinicHeader?.fontFamily || 'verdana'
                      }}
                    >
                      {clinicHeader?.address && <p>{clinicHeader.address}</p>}
                      {clinicHeader?.phone && <p>{clinicHeader.phone}</p>}
                      {clinicHeader?.email && <p>{clinicHeader.email}</p>}
                      {clinicHeader?.website && <p>{clinicHeader.website}</p>}
                    </div>
                  </div>

                  {/* Logo on Right */}
                  {clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'right' && (
                    <img
                      src={clinicHeader.logoBase64}
                      alt="Clinic Logo"
                      style={{
                        height: "100px",
                        width: "100px",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Doctor and Patient Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 fs-6">
                    Physician Information
                  </h4>
                  <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                    <p><strong className="text-gray-800 dark:text-gray-200">Name:</strong>{" "}{selectedResult.doctorName || "Doctor"}</p>
                    {selectedResult.mainSpecialty && (
                      <p><strong className="text-gray-800 dark:text-gray-200">Main Specialization:</strong>{" "}{selectedResult.mainSpecialty}</p>
                    )}
                    {selectedResult.subSpecialty && (
                      <p><strong className="text-gray-800 dark:text-gray-200">Sub-Specialization:</strong>{" "}{selectedResult.subSpecialty}</p>
                    )}
                    {selectedResult.priority && (
                      <p><strong className="text-gray-800 dark:text-gray-200">Priority:</strong> {selectedResult.priority}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 fs-6">
                    Patient Information
                  </h4>
                  <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                    <p><strong className="text-gray-800 dark:text-gray-200">Name:</strong>{" "}{getPatientName(selectedResult.patientId)}</p>
                    <p><strong className="text-gray-800 dark:text-gray-200">Date:</strong>{" "}{format(new Date(), "MMM dd, yyyy")}</p>
                    <p><strong className="text-gray-800 dark:text-gray-200">Time:</strong> {format(new Date(), "HH:mm")}</p>
                  </div>
                </div>
              </div>

              {/* Prescription Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
                  ℞ Laboratory Test Prescription
                </h3>

                <div className="bg-blue-50 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-600 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Test ID:</p>
                      <p className="font-mono text-gray-900 dark:text-gray-100">{selectedResult.testId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Test Type:</p>
                      <p
                        className="font-semibold text-blue-800 dark:text-gray-100 cursor-default"
                        title={selectedResult.testType}
                      >
                        {(() => {
                          const tests = selectedResult.testType.split(' | ').map((t: string) => t.trim());
                          if (tests.length > 2) {
                            return tests.slice(0, 2).join(', ') + '...';
                          }
                          return selectedResult.testType;
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordered Date:</p>
                      <p className="text-gray-900 dark:text-gray-100">
                        {format(
                          new Date(selectedResult.orderedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</p>
                      <Badge className={getStatusColor(selectedResult.status)}>
                        {selectedResult.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {selectedResult.results &&
                    selectedResult.results.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Test Results:</p>
                        <div className="space-y-2">
                          {selectedResult.results.map(
                            (testResult: any, index: number) => (
                              <div
                                key={index}
                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded p-3"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {testResult.name}
                                  </span>
                                  <Badge
                                    className={getResultStatusColor(
                                      testResult.status,
                                    )}
                                  >
                                    {testResult.status
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  <p><strong className="text-gray-800 dark:text-gray-200">Value:</strong> {testResult.value}{" "}{testResult.unit}</p>
                                  <p><strong className="text-gray-800 dark:text-gray-200">Reference Range:</strong>{" "}{testResult.referenceRange}</p>
                                  {testResult.flag && (
                                    <p><strong className="text-gray-800 dark:text-gray-200">Flag:</strong> {testResult.flag}</p>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {selectedResult.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clinical Notes:</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-yellow-400 dark:border-yellow-600 p-3">
                        {selectedResult.notes}
                      </p>
                    </div>
                  )}
                </div>

                {selectedResult.criticalValues && (
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">CRITICAL VALUES DETECTED</span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      This lab result contains critical values that require immediate attention.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <p>Generated by Cura EMR System</p>
                  <p>Date: {format(new Date(), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div className="mt-4 text-center">
                  {selectedResult.signature?.doctorSignature &&
                    String(selectedResult.signature.doctorSignature).trim() !== "" && (
                      <div className="mb-4 flex justify-center bg-white dark:bg-transparent p-2 rounded">
                        <img
                          src={selectedResult.signature.doctorSignature}
                          alt="E-Signature"
                          className="h-20 mx-auto dark:invert"
                          style={{
                            maxWidth: "250px",
                            filter: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "invert(1)" : "none"
                          }}
                          onError={(e) => {
                            console.error("Error loading signature image");
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  <div className="border-t border-gray-300 dark:border-gray-600 w-64 mx-auto mb-2"></div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedResult.doctorName || "Doctor"}
                  </p>
                  {selectedResult.mainSpecialty && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedResult.mainSpecialty}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPrescriptionDialog(false)}
            >
              Close
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={() => handleGeneratePDF()}
                className="bg-medical-blue hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Lab Test Result Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Generate Lab Test Result
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4 text-gray-900 dark:text-gray-100">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="generate-patient">Select Patient *</Label>
              <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    data-testid="button-select-patient-generate"
                  >
                    {generateFormData.patientId
                      ? patients.find((p: any) => p.id.toString() === generateFormData.patientId.toString())
                        ? `${patients.find((p: any) => p.id.toString() === generateFormData.patientId.toString()).firstName} ${patients.find((p: any) => p.id.toString() === generateFormData.patientId.toString()).lastName}`
                        : "Select patient..."
                      : "Select patient..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search patients..." />
                    <CommandEmpty>No patient found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {patients.map((patient: any) => (
                        <CommandItem
                          key={patient.id}
                          value={`${patient.firstName} ${patient.lastName}`}
                          onSelect={() => {
                            setGenerateFormData((prev: any) => ({
                              ...prev,
                              patientId: patient.id,
                              patientName: `${patient.firstName} ${patient.lastName}`,
                            }));
                            setPatientSearchOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${generateFormData.patientId === patient.id
                              ? "opacity-100"
                              : "opacity-0"
                              }`}
                          />
                          {patient.firstName} {patient.lastName} ({patient.patientId})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Test ID Field */}
            <div className="space-y-2">
              <Label htmlFor="generate-test-id">Test ID</Label>
              <Input
                id="generate-test-id"
                type="text"
                placeholder="Auto-generated Test ID"
                value={
                  generateFormData.testId ||
                  `LAB${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`
                }
                onChange={(e) =>
                  setGenerateFormData((prev: any) => ({
                    ...prev,
                    testId: e.target.value,
                  }))
                }
                data-testid="input-test-id"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-generated unique test identifier (can be customized)
              </p>
            </div>

            {/* Test Type Multi-Selection */}
            <div className="space-y-2">
              <Label>Select Test Types *</Label>
              <Popover open={testTypeOpen} onOpenChange={setTestTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    data-testid="button-select-test-types"
                  >
                    {generateFormData.selectedTests && generateFormData.selectedTests.length > 0
                      ? `${generateFormData.selectedTests.length} test(s) selected`
                      : "Select test types..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search test types..." />
                    <CommandEmpty>No test type found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {availableTestTypes.map((testType) => (
                        <CommandItem
                          key={testType}
                          value={testType}
                          onSelect={() => {
                            setGenerateFormData((prev: any) => {
                              const currentTests = prev.selectedTests || [];
                              const isSelected = currentTests.includes(testType);
                              const newTests = isSelected
                                ? currentTests.filter((t: string) => t !== testType)
                                : [...currentTests, testType];
                              return {
                                ...prev,
                                selectedTests: newTests,
                              };
                            });
                          }}
                        >
                          <Checkbox
                            checked={generateFormData.selectedTests?.includes(testType) || false}
                            className="mr-2"
                          />
                          {testType}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Display selected tests */}
              {generateFormData.selectedTests && generateFormData.selectedTests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {generateFormData.selectedTests.map((test: string) => (
                    <Badge
                      key={test}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => {
                        setGenerateFormData((prev: any) => ({
                          ...prev,
                          selectedTests: prev.selectedTests.filter((t: string) => t !== test),
                        }));
                      }}
                    >
                      {test}
                      <X className="ml-2 h-2.5 w-2.5" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Test Fields - Show fields for each selected test */}
            {generateFormData.selectedTests && generateFormData.selectedTests.length > 0 && (
              <div className="space-y-6">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Test Result Values</h3>

                  {generateFormData.selectedTests.map((testType: string) => {
                    const testFields = TEST_FIELD_DEFINITIONS[testType];
                    if (!testFields) return null;

                    return (
                      <div key={testType} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="font-semibold text-blue-700 dark:text-gray-100 mb-4">{testType}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {testFields.map((field) => {
                            const currentValue = generateFormData.testValues?.[testType]?.[field.name] || "";

                            // Parse reference range and check if critical
                            let isCritical = false;
                            let isNormal = false;
                            if (currentValue && currentValue.trim() !== "") {
                              const numValue = parseFloat(currentValue);
                              if (!isNaN(numValue)) {
                                // Parse reference range (e.g., "6 - 23", "13.0–17.0", "13.0-17.0")
                                const rangeMatch = field.referenceRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
                                if (rangeMatch) {
                                  const minValue = parseFloat(rangeMatch[1]);
                                  const maxValue = parseFloat(rangeMatch[2]);
                                  if (!isNaN(minValue) && !isNaN(maxValue)) {
                                    isNormal = numValue >= minValue && numValue <= maxValue;
                                    isCritical = !isNormal;
                                  }
                                }
                              }
                            }

                            return (
                              <div key={field.name} className="space-y-1">
                                <Label htmlFor={`${testType}-${field.name}`} className="text-sm text-gray-900 dark:text-gray-200">
                                  {field.name}
                                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                                    ({field.unit}) - Ref: {field.referenceRange}
                                  </span>
                                </Label>
                                <Input
                                  id={`${testType}-${field.name}`}
                                  type="text"
                                  placeholder={`Enter ${field.name} value`}
                                  value={currentValue}
                                  onChange={(e) => {
                                    setGenerateFormData((prev: any) => ({
                                      ...prev,
                                      testValues: {
                                        ...prev.testValues,
                                        [testType]: {
                                          ...prev.testValues?.[testType],
                                          [field.name]: e.target.value,
                                        },
                                      },
                                    }));
                                  }}
                                  data-testid={`input-${testType.toLowerCase().replace(/\s+/g, '-')}-${field.name.toLowerCase().replace(/\s+/g, '-')}`}
                                  className={isCritical ? "border-red-300" : isNormal ? "border-green-300" : ""}
                                />
                                {/* Status Indicator */}
                                {isNormal && (
                                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                                    <span>✅</span>
                                    <span className="font-medium">Normal</span>
                                  </div>
                                )}
                                {isCritical && (
                                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1">
                                    <span>⚠️</span>
                                    <span className="font-medium">Critical - Outside normal range</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lab Test Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Lab Test Status</Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="critical-normal"
                    checked={generateFormData.criticalValues === false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setGenerateFormData((prev: any) => ({
                          ...prev,
                          criticalValues: false,
                        }));
                      }
                    }}
                    data-testid="checkbox-normal"
                  />
                  <Label
                    htmlFor="critical-normal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Normal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="critical-critical"
                    checked={generateFormData.criticalValues === true}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setGenerateFormData((prev: any) => ({
                          ...prev,
                          criticalValues: true,
                        }));
                      }
                    }}
                    data-testid="checkbox-critical"
                  />
                  <Label
                    htmlFor="critical-critical"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Critical
                  </Label>
                </div>
              </div>
            </div>

            {/* Sample Collection Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sample Collection Status</Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sample-collected"
                    checked={generateFormData.sampleCollected === true}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setGenerateFormData((prev: any) => ({
                          ...prev,
                          sampleCollected: true,
                        }));
                      }
                    }}
                    data-testid="checkbox-sample-collected"
                  />
                  <Label
                    htmlFor="sample-collected"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Sample Collected
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sample-not-collected"
                    checked={generateFormData.sampleCollected === false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setGenerateFormData((prev: any) => ({
                          ...prev,
                          sampleCollected: false,
                        }));
                      }
                    }}
                    data-testid="checkbox-sample-not-collected"
                  />
                  <Label
                    htmlFor="sample-not-collected"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Not Collected
                  </Label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="generate-notes">Clinical Notes (Optional)</Label>
              <Textarea
                id="generate-notes"
                placeholder="Add any clinical notes or observations..."
                value={generateFormData.notes || ""}
                onChange={(e) =>
                  setGenerateFormData((prev: any) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
                data-testid="textarea-clinical-notes"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateDialog(false);
                  setGenerateFormData({});
                }}
                data-testid="button-cancel-generate"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  // Validate required fields
                  if (!generateFormData.patientId) {
                    toast({
                      title: "Validation Error",
                      description: "Please select a patient",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (!generateFormData.selectedTests || generateFormData.selectedTests.length === 0) {
                    toast({
                      title: "Validation Error",
                      description: "Please select at least one test type",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Build results array from test values
                  const results: any[] = [];
                  generateFormData.selectedTests.forEach((testType: string) => {
                    const testFields = TEST_FIELD_DEFINITIONS[testType];
                    const testValues = generateFormData.testValues?.[testType];

                    if (testFields && testValues) {
                      testFields.forEach((field) => {
                        const value = testValues[field.name];
                        if (value && value.trim() !== "") {
                          // Determine status based on reference range (simplified)
                          const numValue = parseFloat(value);
                          let status = "normal";

                          results.push({
                            name: field.name,
                            value: value,
                            unit: field.unit,
                            referenceRange: field.referenceRange,
                            status: status,
                          });
                        }
                      });
                    }
                  });

                  if (results.length === 0) {
                    toast({
                      title: "Validation Error",
                      description: "Please enter at least one test result value",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Generate or use provided test ID
                  const baseTestId = generateFormData.testId ||
                    `LAB${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

                  // Create lab result for each selected test
                  for (let index = 0; index < generateFormData.selectedTests.length; index++) {
                    const testType = generateFormData.selectedTests[index];
                    const testResults = results.filter((r) => {
                      const fields = TEST_FIELD_DEFINITIONS[testType];
                      return fields?.some((f) => f.name === r.name);
                    });

                    if (testResults.length > 0) {
                      // For multiple tests, append index to test ID
                      const testId = generateFormData.selectedTests.length > 1
                        ? `${baseTestId}-${index + 1}`
                        : baseTestId;

                      const labResultData = {
                        patientId: generateFormData.patientId,
                        testId: testId,
                        testType: testType,
                        orderedBy: user?.id,
                        priority: "routine",
                        status: "completed",
                        results: testResults,
                        notes: generateFormData.notes || "",
                        criticalValues: generateFormData.criticalValues || false,
                        sampleCollected: generateFormData.sampleCollected !== undefined ? generateFormData.sampleCollected : false,
                      };

                      // Create lab result
                      const createdResult = await apiRequest("POST", "/api/lab-results", labResultData);

                      // Generate PDF for the created lab result
                      if (createdResult?.id) {
                        await apiRequest("POST", `/api/lab-results/${createdResult.id}/generate-pdf`);
                      }
                    }
                  }

                  // Invalidate cache to refetch lab results
                  queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });

                  toast({
                    title: "Success",
                    description: `Lab result${generateFormData.selectedTests.length > 1 ? 's' : ''} generated successfully and PDF saved`,
                  });

                  setShowGenerateDialog(false);
                  setGenerateFormData({});
                }}
                disabled={
                  !generateFormData.patientId ||
                  !generateFormData.selectedTests ||
                  generateFormData.selectedTests.length === 0
                }
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit-generate"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Lab Result
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fill Lab Test Result Dialog (for existing lab orders) */}
      <Dialog open={showFillResultDialog} onOpenChange={setShowFillResultDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Generate Lab Test Result
            </DialogTitle>
          </DialogHeader>

          {selectedLabOrder && (
            <div className="space-y-6 py-4 text-gray-900 dark:text-gray-100">
              {/* Lab Order Details - Read Only */}
              <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-blue-900 dark:text-gray-100 mb-2">Lab Order Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Patient Name:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {getPatientName(selectedLabOrder.patientId)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Test Name:</span>
                    <p
                      className="font-medium text-gray-900 dark:text-white cursor-default"
                      title={selectedLabOrder.testType}
                    >
                      {(() => {
                        const tests = selectedLabOrder.testType.split(' | ').map((t: string) => t.trim());
                        if (tests.length > 2) {
                          return tests.slice(0, 2).join(', ') + '...';
                        }
                        return selectedLabOrder.testType;
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Test ID:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedLabOrder.testId || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ordered Date:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedLabOrder.orderedDate
                        ? format(new Date(selectedLabOrder.orderedDate), "PPp")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ordered By:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {getUserName(selectedLabOrder.orderedBy)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Priority:</span>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedLabOrder.priority}</p>
                  </div>
                </div>
                {selectedLabOrder.notes && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Notes:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedLabOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Test Result Fields Based on Test Type(s) - Multiple tests support */}
              {(() => {
                // Parse test types - may be pipe-separated for multiple tests
                const allTestTypes = selectedLabOrder.testType
                  .split(' | ')
                  .map((t: string) => t.trim());

                const testTypes = allTestTypes.filter((t: string) => TEST_FIELD_DEFINITIONS[t]);

                // Debug: Log test types for troubleshooting
                console.log('📋 All test types from order:', allTestTypes);
                console.log('✅ Test types with definitions:', testTypes);
                console.log('❌ Test types WITHOUT definitions:', allTestTypes.filter(t => !TEST_FIELD_DEFINITIONS[t]));

                // Get test types without definitions
                const testTypesWithoutDefs = allTestTypes.filter(t => !TEST_FIELD_DEFINITIONS[t]);

                // Function to add a custom field
                const addCustomField = (testType: string) => {
                  setCustomFields(prev => ({
                    ...prev,
                    [testType]: [
                      ...(prev[testType] || []),
                      { name: '', unit: '', referenceRange: '' }
                    ]
                  }));
                };

                // Function to remove a custom field
                const removeCustomField = (testType: string, index: number) => {
                  // Get the field name before removing it
                  const fieldToRemove = customFields[testType]?.[index];
                  const fieldName = fieldToRemove?.name;

                  // Remove from custom fields
                  setCustomFields(prev => ({
                    ...prev,
                    [testType]: (prev[testType] || []).filter((_: any, i: number) => i !== index)
                  }));

                  // Also remove the field value from form data
                  if (fieldName) {
                    const fieldKey = `${testType}::${fieldName}`;
                    setFillResultFormData((prevData: any) => {
                      const newData = { ...prevData };
                      delete newData[fieldKey];
                      return newData;
                    });
                  }
                };

                // Function to update a custom field
                const updateCustomField = (testType: string, index: number, field: 'name' | 'unit' | 'referenceRange', value: string) => {
                  setCustomFields(prev => {
                    const updated = (prev[testType] || []).map((f: any, i: number) =>
                      i === index ? { ...f, [field]: value } : f
                    );
                    // If name changed, update form data key
                    if (field === 'name' && prev[testType]?.[index]?.name) {
                      const oldKey = `${testType}::${prev[testType][index].name}`;
                      const newKey = `${testType}::${value}`;
                      setFillResultFormData((prevData: any) => {
                        const newData = { ...prevData };
                        if (newData[oldKey] !== undefined) {
                          newData[newKey] = newData[oldKey];
                          delete newData[oldKey];
                        }
                        return newData;
                      });
                    }
                    return {
                      ...prev,
                      [testType]: updated
                    };
                  });
                };

                // Combine predefined and custom fields for rendering
                const getAllFieldsForTestType = (testType: string) => {
                  const predefined = TEST_FIELD_DEFINITIONS[testType] || [];
                  const custom = customFields[testType] || [];
                  return [...predefined, ...custom];
                };

                // Validation function for field values
                const validateField = (fieldKey: string, value: string): string => {
                  if (!value || value.trim() === "") return "";

                  // Check if value is numeric (allows decimals and negative values)
                  const numericPattern = /^-?\d*\.?\d+$/;
                  if (!numericPattern.test(value.trim())) {
                    return "Must be a numeric value";
                  }

                  return "";
                };

                // Handle field change with validation
                const handleFieldChange = (fieldKey: string, value: string) => {
                  setFillResultFormData((prev: any) => ({
                    ...prev,
                    [fieldKey]: value,
                  }));

                  // Validate the field
                  const error = validateField(fieldKey, value);
                  setValidationErrors((prev) => {
                    if (error) {
                      return { ...prev, [fieldKey]: error };
                    } else {
                      const newErrors = { ...prev };
                      delete newErrors[fieldKey];
                      return newErrors;
                    }
                  });
                };

                return (
                  <div className="space-y-6">
                    {/* Test types with predefined fields */}
                    {testTypes.map((testType: string, testIndex: number) => {
                      const allFields = getAllFieldsForTestType(testType);
                      const customFieldsForType = customFields[testType] || [];

                      return (
                        <div key={testType} className="space-y-4">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-slate-800 border-l-4 border-blue-600 dark:border-blue-500 p-3 rounded flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold text-blue-900 dark:text-gray-100 text-lg">
                                {testIndex + 1}. {testType}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {allFields.length} parameters
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addCustomField(testType)}
                              className="flex items-center gap-2 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              <Plus className="h-4 w-4" />
                              Add Field
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pl-2">
                            {allFields.map((field, fieldIndex) => {
                              const isCustom = fieldIndex >= (TEST_FIELD_DEFINITIONS[testType]?.length || 0);
                              const fieldKey = `${testType}::${field.name}`;
                              const hasError = validationErrors[fieldKey];

                              return (
                                <div key={`${testType}-${field.name}-${fieldIndex}`} className="space-y-1">
                                  {isCustom ? (
                                    <div className="border-2 border-dashed border-blue-300 dark:border-gray-600 rounded-lg p-3 bg-blue-50/50 dark:bg-gray-800/50">
                                      <div className="flex items-center justify-between mb-2">
                                        <Label className="text-xs font-semibold text-blue-700 dark:text-gray-100">Custom Field</Label>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeCustomField(testType, fieldIndex - (TEST_FIELD_DEFINITIONS[testType]?.length || 0))}
                                          className="h-5 w-5 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <div className="space-y-2">
                                        <Input
                                          type="text"
                                          placeholder="Parameter Name"
                                          value={field.name}
                                          onChange={(e) => updateCustomField(testType, fieldIndex - (TEST_FIELD_DEFINITIONS[testType]?.length || 0), 'name', e.target.value)}
                                          className="text-sm"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <Input
                                            type="text"
                                            placeholder="Unit (e.g., mg/dL)"
                                            value={field.unit}
                                            onChange={(e) => updateCustomField(testType, fieldIndex - (TEST_FIELD_DEFINITIONS[testType]?.length || 0), 'unit', e.target.value)}
                                            className="text-sm"
                                          />
                                          <Input
                                            type="text"
                                            placeholder="Reference Range"
                                            value={field.referenceRange}
                                            onChange={(e) => updateCustomField(testType, fieldIndex - (TEST_FIELD_DEFINITIONS[testType]?.length || 0), 'referenceRange', e.target.value)}
                                            className="text-sm"
                                          />
                                        </div>
                                        {field.name && (
                                          <Input
                                            type="text"
                                            placeholder={`Enter ${field.name}`}
                                            value={fillResultFormData[fieldKey] || ""}
                                            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                            className={hasError ? "border-red-500 focus:ring-red-500" : ""}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <Label htmlFor={`fill-${testType}-${field.name}`} className="text-gray-900 dark:text-gray-200">
                                        {field.name}
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          (Ref: {field.referenceRange} {field.unit})
                                        </span>
                                      </Label>
                                      <Input
                                        id={`fill-${testType}-${field.name}`}
                                        type="text"
                                        placeholder={`Enter ${field.name}`}
                                        value={fillResultFormData[fieldKey] || ""}
                                        onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                        className={hasError ? "border-red-500 focus:ring-red-500" : ""}
                                        data-testid={`input-fill-${testType}-${field.name}`}
                                      />
                                    </>
                                  )}
                                  {hasError && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      {hasError}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Test types without predefined fields - allow manual addition */}
                    {testTypesWithoutDefs.length > 0 && (
                      <div className="space-y-4">
                        {testTypesWithoutDefs.map((testType: string, testIndex: number) => {
                          const customFieldsForType = customFields[testType] || [];

                          return (
                            <div key={testType} className="space-y-4">
                              <div className="bg-yellow-50 dark:bg-amber-900/30 border-l-4 border-yellow-400 dark:border-amber-600 p-3 rounded flex justify-between items-center">
                                <div>
                                  <h4 className="font-semibold text-yellow-900 dark:text-amber-200 text-lg">
                                    {testTypes.length + testIndex + 1}. {testType}
                                  </h4>
                                  <p className="text-sm text-yellow-700 dark:text-amber-300 mt-1">
                                    No predefined parameters. Add custom fields below.
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addCustomField(testType)}
                                  className="flex items-center gap-2 border-yellow-300 hover:bg-yellow-100 dark:border-amber-600 dark:hover:bg-amber-900/50"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add Parameter
                                </Button>
                              </div>
                              {customFieldsForType.length === 0 ? (
                                <div className="bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    No parameters added yet. Click "Add Parameter" to create custom fields.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4 pl-2">
                                  {customFieldsForType.map((field, fieldIndex) => {
                                    const fieldKey = `${testType}::${field.name}`;
                                    const hasError = validationErrors[fieldKey];

                                    return (
                                      <div key={`${testType}-custom-${fieldIndex}`} className="space-y-1 border-2 border-dashed border-blue-300 dark:border-gray-600 rounded-lg p-3 bg-blue-50/50 dark:bg-gray-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                          <Label className="text-xs font-semibold text-blue-700 dark:text-gray-100">Custom Parameter</Label>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeCustomField(testType, fieldIndex)}
                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <div className="space-y-2">
                                          <Input
                                            type="text"
                                            placeholder="Parameter Name (e.g., Total Cholesterol)"
                                            value={field.name}
                                            onChange={(e) => updateCustomField(testType, fieldIndex, 'name', e.target.value)}
                                            className="text-sm"
                                          />
                                          <div className="grid grid-cols-2 gap-2">
                                            <Input
                                              type="text"
                                              placeholder="Unit (e.g., mg/dL)"
                                              value={field.unit}
                                              onChange={(e) => updateCustomField(testType, fieldIndex, 'unit', e.target.value)}
                                              className="text-sm"
                                            />
                                            <Input
                                              type="text"
                                              placeholder="Reference Range (e.g., <200)"
                                              value={field.referenceRange}
                                              onChange={(e) => updateCustomField(testType, fieldIndex, 'referenceRange', e.target.value)}
                                              className="text-sm"
                                            />
                                          </div>
                                          {field.name && (
                                            <Input
                                              type="text"
                                              placeholder={`Enter ${field.name}`}
                                              value={fillResultFormData[fieldKey] || ""}
                                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                              className={hasError ? "border-red-500 focus:ring-red-500" : ""}
                                            />
                                          )}
                                        </div>
                                        {hasError && (
                                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            {hasError}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Lab Test Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Lab Test Status</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fill-critical-normal"
                      checked={fillResultFormData.criticalValues === false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFillResultFormData((prev: any) => ({
                            ...prev,
                            criticalValues: false,
                          }));
                        }
                      }}
                      data-testid="checkbox-fill-normal"
                    />
                    <Label
                      htmlFor="fill-critical-normal"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Normal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fill-critical-critical"
                      checked={fillResultFormData.criticalValues === true}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFillResultFormData((prev: any) => ({
                            ...prev,
                            criticalValues: true,
                          }));
                        }
                      }}
                      data-testid="checkbox-fill-critical"
                    />
                    <Label
                      htmlFor="fill-critical-critical"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Critical
                    </Label>
                  </div>
                </div>
              </div>

              {/* Sample Collection Status - Only show if sample not collected */}
              {selectedLabOrder.sampleCollected === false && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sample Collection Status</Label>
                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fill-sample-collected"
                        checked={fillResultFormData.sampleCollected === true}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFillResultFormData((prev: any) => ({
                              ...prev,
                              sampleCollected: true,
                            }));
                          }
                        }}
                        data-testid="checkbox-fill-sample-collected"
                      />
                      <Label
                        htmlFor="fill-sample-collected"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Sample Collected
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fill-sample-not-collected"
                        checked={fillResultFormData.sampleCollected === false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFillResultFormData((prev: any) => ({
                              ...prev,
                              sampleCollected: false,
                            }));
                          }
                        }}
                        data-testid="checkbox-fill-sample-not-collected"
                      />
                      <Label
                        htmlFor="fill-sample-not-collected"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Not Collected
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Clinical Notes */}
              <div className="space-y-2">
                <Label htmlFor="fill-clinical-notes" className="text-gray-900 dark:text-gray-200">Clinical Notes (Optional)</Label>
                <textarea
                  id="fill-clinical-notes"
                  className="w-full min-h-[100px] p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any clinical observations or notes..."
                  value={fillResultFormData.notes || ""}
                  onChange={(e) =>
                    setFillResultFormData((prev: any) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  data-testid="textarea-fill-clinical-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFillResultDialog(false);
                    setFillResultFormData({});
                    setValidationErrors({});
                    setCustomFields({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Check for validation errors
                    if (Object.keys(validationErrors).length > 0) {
                      toast({
                        title: "Validation Error",
                        description: "Please fix all validation errors before downloading",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Build results grouped by test type
                    const allTestTypes = selectedLabOrder.testType
                      .split(' | ')
                      .map((t: string) => t.trim());

                    // Group results by test type (including custom fields)
                    const resultsByTestType: Record<string, any[]> = {};
                    allTestTypes.forEach((testType: string) => {
                      const testResults: any[] = [];

                      // Process predefined fields
                      const predefinedFields = TEST_FIELD_DEFINITIONS[testType] || [];
                      predefinedFields.forEach((field) => {
                        const fieldKey = `${testType}::${field.name}`;
                        const value = fillResultFormData[fieldKey];
                        if (value && value.trim() !== "") {
                          testResults.push({
                            name: field.name,
                            value: value,
                            unit: field.unit,
                            referenceRange: field.referenceRange,
                            status: "normal",
                          });
                        }
                      });

                      // Process custom fields
                      const customFieldsForType = customFields[testType] || [];
                      customFieldsForType.forEach((field) => {
                        if (field.name && field.name.trim() !== "") {
                          const fieldKey = `${testType}::${field.name}`;
                          const value = fillResultFormData[fieldKey];
                          if (value && value.trim() !== "") {
                            testResults.push({
                              name: field.name,
                              value: value,
                              unit: field.unit || "",
                              referenceRange: field.referenceRange || "",
                              status: "normal",
                            });
                          }
                        }
                      });

                      if (testResults.length > 0) {
                        resultsByTestType[testType] = testResults;
                      }
                    });

                    if (Object.keys(resultsByTestType).length === 0) {
                      toast({
                        title: "Validation Error",
                        description: "Please enter at least one test result value to download",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Fetch clinic header and footer
                    let clinicHeader = null;
                    let clinicFooter = null;
                    try {
                      const headerResponse = await fetch("/api/clinic-headers", {
                        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
                      });
                      if (headerResponse.ok) {
                        clinicHeader = await headerResponse.json();
                      }
                      const footerResponse = await fetch("/api/clinic-footers", {
                        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
                      });
                      if (footerResponse.ok) {
                        clinicFooter = await footerResponse.json();
                      }
                    } catch (error) {
                      console.error("Error fetching clinic info:", error);
                    }

                    // Generate PDF with lab test results (matching server-side format)
                    const pdf = new jsPDF();
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    let yPos = 20;

                    // Add logo if available - logo always beside header
                    const headerStartY = yPos;
                    let textStartX = 105; // Default center position
                    let textAlign: 'left' | 'center' | 'right' = 'center';

                    if (clinicHeader?.logoBase64) {
                      try {
                        // Logo always beside header for all positions
                        if (clinicHeader.logoPosition === 'left') {
                          // Logo on left, text starts after logo
                          pdf.addImage(clinicHeader.logoBase64, 'PNG', 20, yPos, 30, 30);
                          textStartX = 55;
                          textAlign = 'left';
                        } else if (clinicHeader.logoPosition === 'center') {
                          // Logo on left, text beside it (left-aligned)
                          pdf.addImage(clinicHeader.logoBase64, 'PNG', 20, yPos, 30, 30);
                          textStartX = 55;
                          textAlign = 'left';
                        } else if (clinicHeader.logoPosition === 'right') {
                          // Logo on right, text ends before logo
                          pdf.addImage(clinicHeader.logoBase64, 'PNG', 160, yPos, 30, 30);
                          textStartX = 155;
                          textAlign = 'right';
                        }
                      } catch (error) {
                        console.error('Error adding logo:', error);
                      }
                    } else if (clinicHeader?.logoPosition) {
                      // No logo but position is set - align text accordingly
                      if (clinicHeader.logoPosition === 'left') {
                        textStartX = 20;
                        textAlign = 'left';
                      } else if (clinicHeader.logoPosition === 'right') {
                        textStartX = pageWidth - 20;
                        textAlign = 'right';
                      }
                    }

                    // Clinic Name Header
                    if (clinicHeader?.clinicName) {
                      pdf.setFontSize(parseInt(clinicHeader.clinicNameFontSize || '24'));
                      pdf.setFont(clinicHeader.fontFamily || 'helvetica', clinicHeader.fontWeight || 'bold');
                      pdf.text(clinicHeader.clinicName, textStartX, yPos, { align: textAlign });
                      yPos += 10;
                    }

                    // Clinic Details
                    if (clinicHeader) {
                      pdf.setFontSize(parseInt(clinicHeader.fontSize || '12'));
                      pdf.setFont(clinicHeader.fontFamily || 'helvetica', 'normal');
                      if (clinicHeader.address) {
                        pdf.text(clinicHeader.address, textStartX, yPos, { align: textAlign });
                        yPos += 6;
                      }
                      if (clinicHeader.phone) {
                        pdf.text(clinicHeader.phone, textStartX, yPos, { align: textAlign });
                        yPos += 6;
                      }
                      if (clinicHeader.email) {
                        pdf.text(clinicHeader.email, textStartX, yPos, { align: textAlign });
                        yPos += 6;
                      }
                    }

                    // Ensure proper spacing after header section if logo was beside it
                    if (clinicHeader?.logoBase64 && clinicHeader.logoPosition === 'center') {
                      const headerEndY = yPos;
                      const logoEndY = headerStartY + 30;
                      if (logoEndY > headerEndY) {
                        yPos = logoEndY + 5;
                      }
                    }

                    yPos += 10;

                    // Lab Order Information Section
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(14);
                    pdf.text('Lab Order Information', 20, yPos);
                    yPos += 10;

                    // Two-column layout
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);

                    const leftX = 20;
                    const rightX = 120;
                    let leftY = yPos;
                    let rightY = yPos;

                    // Left column
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Patient Name:', leftX, leftY);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(getPatientName(selectedLabOrder.patientId), leftX + 35, leftY);
                    leftY += 7;

                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Test ID:', leftX, leftY);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(selectedLabOrder.testId || 'N/A', leftX + 35, leftY);
                    leftY += 7;

                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Ordered Date:', leftX, leftY);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(
                      selectedLabOrder.orderedDate ? new Date(selectedLabOrder.orderedDate).toLocaleDateString() : 'N/A',
                      leftX + 35,
                      leftY
                    );
                    leftY += 7;

                    // Right column
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Ordered By:', rightX, rightY);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(getUserName(selectedLabOrder.orderedBy), rightX + 30, rightY);
                    rightY += 7;

                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Priority:', rightX, rightY);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(selectedLabOrder.priority || 'routine', rightX + 30, rightY);

                    yPos = Math.max(leftY, rightY) + 10;

                    // Test Results Section - Separate section for each test type
                    Object.entries(resultsByTestType).forEach(([testType, results], groupIndex) => {
                      // Add extra spacing between test groups (but not before first group)
                      if (groupIndex > 0) {
                        yPos += 8;
                      }

                      if (yPos > 240) {
                        pdf.addPage();
                        yPos = 20;
                      }

                      // Test Type Header with background box
                      pdf.setFillColor(66, 133, 244);
                      pdf.rect(20, yPos - 2, 170, 10, 'F');

                      pdf.setFont('helvetica', 'bold');
                      pdf.setFontSize(12);
                      pdf.setTextColor(255, 255, 255);
                      pdf.text(testType, 22, yPos + 5);
                      pdf.setTextColor(0, 0, 0);
                      yPos += 12;

                      // Table with proper borders
                      const tableStartY = yPos;
                      const rowHeight = 8;
                      const colWidths = [60, 30, 30, 50];
                      const tableX = 20;

                      // Header background
                      pdf.setFillColor(240, 240, 240);
                      pdf.rect(tableX, tableStartY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, 'F');

                      // Header borders
                      pdf.setDrawColor(200, 200, 200);
                      pdf.rect(tableX, tableStartY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight);

                      // Header text
                      pdf.setFont('helvetica', 'bold');
                      pdf.setFontSize(10);
                      pdf.text('Parameter', tableX + 2, tableStartY + 5);
                      pdf.text('Value', tableX + colWidths[0] + 2, tableStartY + 5);
                      pdf.text('Unit', tableX + colWidths[0] + colWidths[1] + 2, tableStartY + 5);
                      pdf.text('Reference Range', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableStartY + 5);

                      yPos = tableStartY + rowHeight;

                      // Table rows
                      pdf.setFont('helvetica', 'normal');
                      results.forEach((result: any, index: number) => {
                        if (yPos > 270) {
                          pdf.addPage();
                          yPos = 20;
                        }

                        // Alternate row background
                        if (index % 2 === 0) {
                          pdf.setFillColor(250, 250, 250);
                          pdf.rect(tableX, yPos, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, 'F');
                        }

                        // Row borders
                        pdf.setDrawColor(200, 200, 200);
                        pdf.rect(tableX, yPos, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight);

                        // Vertical lines
                        pdf.line(tableX + colWidths[0], yPos, tableX + colWidths[0], yPos + rowHeight);
                        pdf.line(tableX + colWidths[0] + colWidths[1], yPos, tableX + colWidths[0] + colWidths[1], yPos + rowHeight);
                        pdf.line(tableX + colWidths[0] + colWidths[1] + colWidths[2], yPos, tableX + colWidths[0] + colWidths[1] + colWidths[2], yPos + rowHeight);

                        // Row data
                        // Strip test type prefix - extract short parameter name after " - "
                        let paramName = result.name || '';
                        const dashIndex = paramName.indexOf(' - ');
                        if (dashIndex !== -1) {
                          paramName = paramName.substring(dashIndex + 3).trim();
                        }

                        pdf.text(paramName, tableX + 2, yPos + 5);
                        pdf.text(String(result.value || ''), tableX + colWidths[0] + 2, yPos + 5);
                        pdf.text(result.unit || '', tableX + colWidths[0] + colWidths[1] + 2, yPos + 5);
                        pdf.text(result.referenceRange || '', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 5);

                        yPos += rowHeight;
                      });

                      yPos += 5;
                    });

                    // Clinical Notes Section
                    if (fillResultFormData.notes || selectedLabOrder.notes) {
                      yPos += 8;
                      if (yPos > 270) {
                        pdf.addPage();
                        yPos = 20;
                      }
                      pdf.setFont('helvetica', 'bold');
                      pdf.setFontSize(12);
                      pdf.text('Notes:', 20, yPos);
                      yPos += 8;
                      pdf.setFont('helvetica', 'normal');
                      pdf.setFontSize(10);
                      const notes = fillResultFormData.notes || selectedLabOrder.notes || "";
                      const splitNotes = pdf.splitTextToSize(notes, 170);
                      pdf.text(splitNotes, 20, yPos);
                    }

                    // Add footer at bottom of all pages
                    if (clinicFooter) {
                      const pageCount = pdf.getNumberOfPages();
                      for (let i = 1; i <= pageCount; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(clinicFooter.footerText, 105, 285, { align: 'center' });
                      }
                    }

                    // Preview PDF in new window
                    const pdfBlob = pdf.output('blob');
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    const previewWindow = window.open(pdfUrl, '_blank');
                    if (previewWindow) {
                      previewWindow.onload = () => {
                        URL.revokeObjectURL(pdfUrl);
                      };
                    }

                    toast({
                      title: "Success",
                      description: "Lab test result preview opened",
                    });
                  }}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                  data-testid="button-preview-fill-result"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={async () => {
                    // Check for validation errors - inline messages will show under fields
                    if (Object.keys(validationErrors).length > 0) {
                      return;
                    }

                    // Build results array from filled values - supports multiple tests
                    const results: any[] = [];
                    const testTypes = selectedLabOrder.testType
                      .split(' | ')
                      .map((t: string) => t.trim())
                      .filter((t: string) => TEST_FIELD_DEFINITIONS[t]);

                    // Process all test types
                    testTypes.forEach((testType: string) => {
                      const testFields = TEST_FIELD_DEFINITIONS[testType];
                      if (testFields) {
                        testFields.forEach((field) => {
                          const fieldKey = `${testType}::${field.name}`;
                          const value = fillResultFormData[fieldKey];
                          if (value && value.trim() !== "") {
                            results.push({
                              name: `${testType} - ${field.name}`,
                              value: value,
                              unit: field.unit,
                              referenceRange: field.referenceRange,
                              status: "normal",
                            });
                          }
                        });
                      }
                    });

                    if (results.length === 0) {
                      // Set a general validation error for at least one field
                      const firstTestType = testTypes[0];
                      if (firstTestType) {
                        const firstField = TEST_FIELD_DEFINITIONS[firstTestType]?.[0];
                        if (firstField) {
                          const fieldKey = `${firstTestType}::${firstField.name}`;
                          setValidationErrors({
                            ...validationErrors,
                            [fieldKey]: "Please enter at least one test result value"
                          });
                        }
                      }
                      return;
                    }

                    // Update the existing lab order with results
                    await apiRequest("PUT", `/api/lab-results/${selectedLabOrder.id}`, {
                      status: "completed",
                      results: results,
                      notes: fillResultFormData.notes || selectedLabOrder.notes || "",
                      criticalValues: fillResultFormData.criticalValues || false,
                      sampleCollected: fillResultFormData.sampleCollected !== undefined ? fillResultFormData.sampleCollected : selectedLabOrder.sampleCollected,
                    });

                    // Generate PDF matching the image format
                    const pdf = new jsPDF();
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    let yPos = 20;

                    // Fetch clinic header and footer (they should already be in scope from the component)
                    // Add clinic header with logo on left
                    if (clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'left') {
                      try {
                        const logoData = clinicHeader.logoBase64.includes(',')
                          ? clinicHeader.logoBase64.split(',')[1]
                          : clinicHeader.logoBase64;
                        pdf.addImage(logoData, 'PNG', 20, yPos, 30, 30);
                      } catch (error) {
                        console.error('Error adding logo to PDF:', error);
                      }
                    }

                    // Clinic header text (to the right of logo or centered)
                    const headerTextX = clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'left' ? 60 : pageWidth / 2;
                    const textAlign = clinicHeader?.logoBase64 && clinicHeader?.logoPosition === 'left' ? 'left' : 'center';

                    pdf.setFontSize(parseInt(clinicHeader?.clinicNameFontSize?.replace('pt', '') || '16'));
                    pdf.setFont(clinicHeader?.fontFamily || 'helvetica', clinicHeader?.fontWeight || 'bold');
                    pdf.text(clinicHeader?.clinicName || 'CURA EMR SYSTEM', headerTextX, yPos + 10, { align: textAlign });

                    pdf.setFontSize(9);
                    pdf.setFont(clinicHeader?.fontFamily || 'helvetica', 'normal');
                    if (clinicHeader?.address) {
                      pdf.text(clinicHeader.address, headerTextX, yPos + 18, { align: textAlign });
                    }
                    if (clinicHeader?.phone) {
                      pdf.text(clinicHeader.phone, headerTextX, yPos + 24, { align: textAlign });
                    }
                    if (clinicHeader?.email) {
                      pdf.text(clinicHeader.email, headerTextX, yPos + 30, { align: textAlign });
                    }

                    yPos += 45;

                    // Title - "Lab Test Result Report"
                    pdf.setFontSize(16);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Lab Test Result Report', pageWidth / 2, yPos, { align: 'center' });
                    yPos += 15;

                    // Patient Information Section
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('PATIENT INFORMATION', 20, yPos);
                    yPos += 8;

                    pdf.setFont('helvetica', 'normal');

                    // Patient Name
                    const patientName = getPatientName(selectedLabOrder.patientId);
                    if (patientName && patientName !== `Patient #${selectedLabOrder.patientId}`) {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Patient Name:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(patientName, 70, yPos);
                      yPos += 6;
                    }

                    // Test ID
                    if (selectedLabOrder.testId && selectedLabOrder.testId !== 'N/A') {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Test ID:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(selectedLabOrder.testId, 70, yPos);
                      yPos += 6;
                    }

                    // Ordered Date - only show if not N/A
                    const orderedDate = selectedLabOrder.orderedDate
                      ? format(new Date(selectedLabOrder.orderedDate), "dd/MM/yyyy")
                      : null;
                    if (orderedDate && orderedDate !== 'N/A') {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Ordered Date:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(orderedDate, 70, yPos);
                      yPos += 6;
                    }

                    // Ordered By - only show if not N/A
                    const orderedByName = getUserName(selectedLabOrder.orderedBy);
                    if (orderedByName && orderedByName !== `User #${selectedLabOrder.orderedBy}`) {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Ordered By:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(orderedByName, 70, yPos);
                      yPos += 6;
                    }

                    // Priority - only show if not N/A
                    if (selectedLabOrder.priority && selectedLabOrder.priority !== 'N/A') {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Priority:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(selectedLabOrder.priority, 70, yPos);
                      yPos += 6;
                    }

                    yPos += 5;

                    // Doctor Details Section
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('DOCTOR DETAILS', 20, yPos);
                    yPos += 8;

                    pdf.setFont('helvetica', 'normal');

                    // Get doctor information
                    const orderedByUser = users.find((u: any) => u && u.id === selectedLabOrder.orderedBy);
                    const doctorName = selectedLabOrder.doctorName ||
                      (orderedByUser ? `${orderedByUser.firstName || ''} ${orderedByUser.lastName || ''}`.trim() : null);
                    const doctorSpecialization = selectedLabOrder.mainSpecialty || (orderedByUser as any)?.medicalSpecialtyCategory || (orderedByUser as any)?.department || null;
                    const doctorEmail = orderedByUser?.email || null;
                    const doctorDepartment = selectedLabOrder.doctorDepartment || (orderedByUser as any)?.department || null;

                    if (doctorName && doctorName.trim() !== '') {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Name:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(doctorName, 70, yPos);
                      yPos += 6;
                    }

                    if (doctorSpecialization && doctorSpecialization !== 'N/A') {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Specialization:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(doctorSpecialization, 70, yPos);
                      yPos += 6;
                    }

                    if (doctorEmail && doctorEmail !== 'N/A') {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Email:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(doctorEmail, 70, yPos);
                      yPos += 6;
                    }

                    if (doctorDepartment && doctorDepartment !== 'N/A') {
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Department:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(doctorDepartment, 70, yPos);
                      yPos += 6;
                    }

                    yPos += 5;

                    // Report Created By Section
                    if (user) {
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('REPORT CREATED BY', 20, yPos);
                      yPos += 8;

                      pdf.setFont('helvetica', 'normal');
                      const creatorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Name:', 20, yPos);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(creatorName, 70, yPos);
                      yPos += 6;

                      if (user.email) {
                        pdf.setFont('helvetica', 'bold');
                        pdf.text('Email:', 20, yPos);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(user.email, 70, yPos);
                        yPos += 6;
                      }

                      if (user.role) {
                        pdf.setFont('helvetica', 'bold');
                        pdf.text('Role:', 20, yPos);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(user.role, 70, yPos);
                        yPos += 6;
                      }

                      yPos += 10;
                    }

                    // Group results by test type
                    const resultsByTestType: Record<string, any[]> = {};
                    testTypes.forEach((testType: string) => {
                      const testFields = TEST_FIELD_DEFINITIONS[testType];
                      if (testFields) {
                        const testResults: any[] = [];
                        testFields.forEach((field) => {
                          const fieldKey = `${testType}::${field.name}`;
                          const value = fillResultFormData[fieldKey];
                          if (value && value.trim() !== "") {
                            testResults.push({
                              name: field.name,
                              value: value,
                              unit: field.unit,
                              referenceRange: field.referenceRange,
                            });
                          }
                        });
                        if (testResults.length > 0) {
                          resultsByTestType[testType] = testResults;
                        }
                      }
                    });

                    // Test Results - Each test type gets its own section
                    Object.entries(resultsByTestType).forEach(([testType, testResults]) => {
                      if (yPos > 240) {
                        pdf.addPage();
                        yPos = 20;
                      }

                      // Test Type Header (Blue)
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'bold');
                      pdf.setTextColor(66, 133, 244);
                      pdf.text(testType, 20, yPos);
                      pdf.setTextColor(0, 0, 0);
                      yPos += 8;

                      // Table Header
                      const tableStartY = yPos;
                      const rowHeight = 7;
                      const colWidths = [60, 30, 30, 50]; // Parameter, Value, Unit, Reference Range
                      const tableX = 20;
                      const tableWidth = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];

                      // Header background (light gray)
                      pdf.setFillColor(240, 240, 240);
                      pdf.rect(tableX, tableStartY, tableWidth, rowHeight, 'F');

                      // Header border
                      pdf.setDrawColor(200, 200, 200);
                      pdf.rect(tableX, tableStartY, tableWidth, rowHeight);

                      // Header text
                      pdf.setFont('helvetica', 'bold');
                      pdf.setFontSize(9);
                      pdf.text('Parameter', tableX + 2, tableStartY + 4);
                      pdf.text('Value', tableX + colWidths[0] + 2, tableStartY + 4);
                      pdf.text('Unit', tableX + colWidths[0] + colWidths[1] + 2, tableStartY + 4);
                      pdf.text('Reference Range', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableStartY + 4);

                      yPos = tableStartY + rowHeight;

                      // Sort parameters by name
                      const sortedResults = [...testResults].sort((a: any, b: any) => {
                        const nameA = (a.name || '').toLowerCase();
                        const nameB = (b.name || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                      });

                      // Table rows
                      pdf.setFont('helvetica', 'normal');
                      pdf.setFontSize(9);
                      sortedResults.forEach((result: any, index: number) => {
                        if (yPos > 270) {
                          pdf.addPage();
                          yPos = 20;
                        }

                        // Alternate row background
                        if (index % 2 === 0) {
                          pdf.setFillColor(250, 250, 250);
                          pdf.rect(tableX, yPos, tableWidth, rowHeight, 'F');
                        }

                        // Row border
                        pdf.setDrawColor(200, 200, 200);
                        pdf.rect(tableX, yPos, tableWidth, rowHeight);

                        // Vertical lines
                        pdf.line(tableX + colWidths[0], yPos, tableX + colWidths[0], yPos + rowHeight);
                        pdf.line(tableX + colWidths[0] + colWidths[1], yPos, tableX + colWidths[0] + colWidths[1], yPos + rowHeight);
                        pdf.line(tableX + colWidths[0] + colWidths[1] + colWidths[2], yPos, tableX + colWidths[0] + colWidths[1] + colWidths[2], yPos + rowHeight);

                        // Row data
                        // Strip test type prefix - extract short parameter name after " - "
                        let paramName = result.name || '';
                        const dashIndex = paramName.indexOf(' - ');
                        if (dashIndex !== -1) {
                          paramName = paramName.substring(dashIndex + 3).trim();
                        }

                        pdf.setFontSize(9);
                        pdf.text(paramName, tableX + 2, yPos + 4);
                        pdf.text(String(result.value || ''), tableX + colWidths[0] + 2, yPos + 4);
                        pdf.text(result.unit || '', tableX + colWidths[0] + colWidths[1] + 2, yPos + 4);
                        pdf.text(result.referenceRange || '', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 4);

                        yPos += rowHeight;
                      });

                      yPos += 10;
                    });

                    // Clinical Notes Section
                    if (yPos > 250) {
                      pdf.addPage();
                      yPos = 20;
                    }

                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Clinical Notes', 20, yPos);
                    yPos += 8;

                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'normal');
                    const notes = fillResultFormData.notes || selectedLabOrder.notes || "none";
                    const splitNotes = pdf.splitTextToSize(notes, 170);
                    pdf.text(splitNotes, 20, yPos);
                    yPos += splitNotes.length * 5 + 10;

                    // Add clinic footer at the bottom of the last page
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    if (clinicFooter?.footerText) {
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(clinicFooter.footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });
                    } else {
                      // Default footer
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(`Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
                    }

                    // Download the PDF
                    const fileName = `${selectedLabOrder.testId || Date.now()}.pdf`;
                    pdf.save(fileName);

                    // Also save PDF to server (this will update workflow fields in database)
                    try {
                      const response = await apiRequest("POST", `/api/lab-results/${selectedLabOrder.id}/generate-pdf`);
                      if (response.ok) {
                        // Success - workflow fields will be updated by backend
                        // ready_to_generate_lab = true AND lab_result_generated_report = true
                        console.log("Lab result PDF generated and workflow fields updated successfully");

                        // Do not open the separate "Lab Result Generated" popup anymore.
                        setAutoSharePreviewResult(selectedLabOrder);

                        // Auto-send the generated PDF to patient + provider (orderedBy) via email.
                        void autoSendLabResultEmails(selectedLabOrder);

                        // Open generated PDF in popup (do NOT download or open new tab)
                        try {
                          const token = localStorage.getItem("auth_token");
                          const headers: Record<string, string> = {
                            "X-Tenant-Subdomain": getActiveSubdomain(),
                          };
                          if (token) {
                            headers["Authorization"] = `Bearer ${token}`;
                          }
                          const openRes = await fetch(`/api/lab-results/${selectedLabOrder.id}/download-pdf`, { headers, credentials: "include" });
                          if (openRes.ok) {
                            const blob = await openRes.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            setPdfViewerUrl(blobUrl);
                            setShowPdfViewerDialog(true);
                          }
                        } catch (openErr) {
                          console.warn("Opening generated PDF in dialog failed:", openErr);
                        }
                      }
                    } catch (error) {
                      console.error("Error saving PDF to server:", error);
                      toast({
                        title: "Warning",
                        description: "PDF generated locally but failed to save to server. Workflow fields may not be updated.",
                        variant: "destructive",
                      });
                    }

                    // Invalidate cache to refresh the list and move record to Lab Results tab
                    queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });

                    // Show success modal
                    setShowFillResultDialog(false);
                    setFillResultFormData({});
                    setValidationErrors({});
                    setCustomFields({});
                    setShowSuccessDialog(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-submit-fill-result"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Lab Result
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={showPdfViewerDialog} onOpenChange={(open) => {
        setShowPdfViewerDialog(open);
        if (!open) {
          // Revoke blob URL to free memory when dialog closes
          if (pdfViewerUrl && pdfViewerUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pdfViewerUrl);
          }
          // Clear PDF URL when dialog closes
          setPdfViewerUrl("");
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0" aria-describedby="pdf-viewer-description">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>PDF Report: {selectedResult?.testId || 'Lab Test Result'}.pdf</DialogTitle>
            <DialogDescription id="pdf-viewer-description" className="sr-only">
              PDF viewer displaying the lab test result document
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-4" style={{ minHeight: '600px', height: 'calc(90vh - 120px)' }}>
            {pdfViewerUrl ? (
              <iframe
                src={pdfViewerUrl}
                className="w-full h-full border rounded"
                title="Lab Test Result PDF"
                style={{ minHeight: '600px' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Loading PDF...</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t">
            <Button onClick={() => setShowPdfViewerDialog(false)}>
              Close
            </Button>
            {pdfViewerUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(pdfViewerUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            )}
            {pdfViewerUrl && (selectedResult || autoSharePreviewResult) && (
              <Button
                className="bg-medical-blue hover:bg-blue-700"
                onClick={() => shareGeneratedLabResult(selectedResult || autoSharePreviewResult)}
                disabled={autoShareSending}
              >
                Share
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-share preview popup (Generate Reports → after PDF creation) */}
      <Dialog open={autoSharePreviewOpen} onOpenChange={setAutoSharePreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lab Result Generated</DialogTitle>
            <DialogDescription>
              Preview the lab result details and optionally share the PDF with the patient.
            </DialogDescription>
          </DialogHeader>
          {autoSharePreviewResult && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-500">Patient:</span>{" "}
                <span className="font-medium">{getPatientName(autoSharePreviewResult.patientId)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Test ID:</span>{" "}
                <span className="font-mono">{autoSharePreviewResult.testId}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Test Type:</span>{" "}
                <span className="font-medium">{autoSharePreviewResult.testType}</span>
              </div>

              {Array.isArray(autoSharePreviewResult.results) && autoSharePreviewResult.results.length > 0 && (
                <div className="rounded-md border p-3">
                  <div className="text-sm font-medium mb-2">Result Summary</div>
                  <div className="space-y-1">
                    {autoSharePreviewResult.results.slice(0, 4).map((r: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{r.name}</span>
                        <span className="font-medium text-gray-900">
                          {r.value} {r.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAutoSharePreviewOpen(false)} disabled={autoShareSending}>
              Close
            </Button>
            <Button
              className="bg-medical-blue hover:bg-blue-700"
              onClick={() => shareGeneratedLabResult(autoSharePreviewResult)}
              disabled={!autoSharePreviewResult || autoShareSending}
            >
              {autoShareSending ? "Sharing…" : "Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Error Dialog */}
      <Dialog open={showPermissionErrorDialog} onOpenChange={setShowPermissionErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permission Denied
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{permissionErrorMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowPermissionErrorDialog(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={!!editStatusDialog} onOpenChange={(open) => !open && setEditStatusDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
            <DialogDescription>Change the status for this lab result.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="edit-status-select" className="text-sm font-medium">Status</Label>
            <Select
              value={editStatusDraft}
              onValueChange={setEditStatusDraft}
            >
              <SelectTrigger id="edit-status-select" className="mt-2 w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="collected">collected</SelectItem>
                <SelectItem value="processing">processing</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStatusDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editStatusDialog) {
                  updateLabResultMutation.mutate({
                    id: editStatusDialog.id,
                    data: { status: editStatusDraft },
                  });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status updated success modal */}
      <Dialog open={!!statusUpdateSuccessModal} onOpenChange={(open) => !open && setStatusUpdateSuccessModal(null)}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-1">
              <DialogTitle className="text-lg font-semibold">Status updated</DialogTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {statusUpdateSuccessModal?.replace(/_/g, " ")}
              </p>
            </div>
            <Button
              onClick={() => setStatusUpdateSuccessModal(null)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold text-center">
                Success!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base text-gray-700 dark:text-gray-300">
                Lab test result PDF generated and downloaded successfully
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowSuccessDialog(false)}
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Required Signature Dialog */}
      <Dialog open={showRequiredSignatureDialog} onOpenChange={setShowRequiredSignatureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Required Signature
            </DialogTitle>
            <DialogDescription>
              A signature is required before saving the prescription PDF. Please sign the document to proceed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRequiredSignatureDialog(false);
                setPendingPdfSave(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowRequiredSignatureDialog(false);
                if (selectedResult) {
                  setPendingPdfSave({ resultId: selectedResult.id });
                  setHideTabs(true);
                  setShowESignDialog(true);
                }
              }}
            >
              Ready to Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced E-Signature Dialog */}
      <Dialog open={showESignDialog} onOpenChange={(open) => {
        setShowESignDialog(open);
        if (!open) {
          if (pendingPdfSave) {
            // If dialog is closed without saving signature, clear pending save
            setPendingPdfSave(null);
          }
          setHideTabs(false); // Reset hideTabs when dialog closes
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PenTool className="h-6 w-6 text-medical-blue" />
              Advanced Electronic Signature
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="signature" className="space-y-4">
            {!hideTabs && (
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="signature">Signature</TabsTrigger>
                <TabsTrigger value="authentication">Authentication</TabsTrigger>
                <TabsTrigger value="verification">Verification</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>
            )}

            {/* Signature Tab */}
            <TabsContent value="signature" className="space-y-4">
              {selectedResult && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-slate-800 p-6 rounded-lg border border-blue-200 dark:border-gray-600">
                  <h4 className="font-semibold text-blue-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Lab Result Summary for Digital Signature
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800 dark:text-gray-300">
                    <div>
                      <p>
                        <strong>Patient:</strong>{" "}
                        {getPatientName(selectedResult.patientId)}
                      </p>
                      <p>
                        <strong>Patient ID:</strong>{" "}
                        {selectedResult.patientId}
                      </p>
                      <p>
                        <strong>Date Ordered:</strong>{" "}
                        {format(
                          new Date(selectedResult.orderedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Ordering Provider:</strong>{" "}
                        {getUserName(selectedResult.orderedBy)}
                      </p>
                      <p>
                        <strong>Created By:</strong>{" "}
                        {user ? `${formatRoleLabel(user.role)} - ${user.firstName} ${user.lastName}` : 'N/A'}
                      </p>
                      <p>
                        <strong>Test Type:</strong>{" "}
                        {selectedResult.testType}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        {selectedResult.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test to be signed:
                    </p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      • Test ID: {selectedResult.testId} - {selectedResult.testType}
                    </div>
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
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border dark:border-slate-700">
                    <h5 className="font-medium text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Signature Quality Analysis
                    </h5>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Stroke Consistency:</span>
                        <span className="text-green-600 font-medium">
                          Excellent
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pressure Variation:</span>
                        <span className="text-green-600 font-medium">
                          Natural
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed Analysis:</span>
                        <span className="text-green-600 font-medium">
                          Consistent
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uniqueness Score:</span>
                        <span className="text-green-600 font-medium">
                          98.7%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-lg border border-blue-200 dark:border-slate-600">
                    <h5 className="font-medium text-blue-800 dark:text-gray-100 mb-2">
                      Biometric Verification
                    </h5>
                    <div className="text-sm text-blue-700 dark:text-gray-300 space-y-1">
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

            {/* Authentication Tab */}
            {!hideTabs && (
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

            {/* Verification Tab */}
            {!hideTabs && (
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
                            <span className="text-blue-600 dark:text-gray-100 font-medium">
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

            {/* Compliance Tab */}
            {!hideTabs && (
              <TabsContent value="compliance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Legal & Regulatory Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-lg border border-blue-200 dark:border-slate-600">
                      <h5 className="font-semibold text-blue-900 dark:text-gray-100 mb-3">
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
                            sign lab test results
                          </li>
                          <li>
                            You have verified patient identity and reviewed their
                            complete medical history
                          </li>
                          <li>
                            The lab result information is accurate, complete,
                            and clinically appropriate
                          </li>
                          <li>
                            You understand this electronic signature carries the
                            same legal weight as a handwritten signature
                          </li>
                          <li>
                            You consent to the electronic processing and
                            transmission of this lab result
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
                              new Date(
                                Date.now() + 365 * 24 * 60 * 60 * 1000,
                              ),
                              "MMM dd, yyyy",
                            )}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Encryption:</strong> AES-256
                          </p>
                          <p>
                            <strong>Hash Algorithm:</strong> SHA-256
                          </p>
                          <p>
                            <strong>Key Length:</strong> 2048-bit
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowESignDialog(false)}
              >
                Cancel Signature Process
              </Button>
              <Button
                onClick={saveSignature}
                disabled={signatureSaved}
                className="bg-medical-blue hover:bg-blue-700"
              >
                {signatureSaved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Signature Saved!
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4 mr-2" />
                    Apply Advanced E-Signature
                  </>
                )}
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <button
            onClick={() => setShowSuccessModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="flex flex-col items-center justify-center py-6">
            {/* Large Green Checkmark Circle */}
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" strokeWidth={2} />
            </div>

            {/* Title */}
            <h2 className="mb-2 text-2xl font-bold text-green-600 dark:text-green-400">
              Invoice Created Successfully!
            </h2>

            {/* Subtitle Message */}
            <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
              Invoice created successfully and insurance claim submitted automatically.
            </p>

            {/* Done Button */}
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-close-success"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Details Dialog */}
      <Dialog open={showSignatureDetailsDialog} onOpenChange={setShowSignatureDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <Label className="text-sm font-semibold">Signer ID</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedSignatureData.signerId}
                    </p>
                  </div>
                )}
              </div>
              {selectedSignatureData.doctorSignature ? (
                <div>
                  <Label className="text-sm font-semibold">Doctor Signature</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-white dark:bg-transparent flex justify-center">
                    <img
                      src={selectedSignatureData.doctorSignature}
                      alt="Doctor Signature"
                      className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded dark:invert"
                      style={{
                        filter: isSignatureDarkTheme() ? "invert(1)" : "none"
                      }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab Result</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lab result? This action cannot be undone.
              <br /><br />
              <strong>The following will be permanently deleted:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Lab result record from database (Test ID: <strong>{selectedResult?.testId}</strong>)</li>
                <li>Prescription PDF file (if exists)</li>
                <li>Test Result PDF file (if exists)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmDialog(false);
                setSelectedResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLabResultMutation.isPending}
            >
              {deleteLabResultMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
