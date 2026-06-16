import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  FileText,
  User,
  Calendar,
  Sparkles,
  Grid3x3,
  List,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getTenantSubdomain } from "@/lib/queryClient";

// Test field definitions for dynamic lab result generation
const TEST_FIELD_DEFINITIONS: Record<string, Array<{
  name: string;
  unit: string;
  referenceRange: string;
}>> = {
  "Hormonal tests (Cortisol, ACTH)": [
    { name: "Cortisol (AM)", unit: "μg/dL", referenceRange: "6 - 23" },
    { name: "Cortisol (PM)", unit: "μg/dL", referenceRange: "3 - 16" },
    { name: "ACTH (Adrenocorticotropic Hormone)", unit: "pg/mL", referenceRange: "10 - 60" },
    { name: "24-hour Urinary Free Cortisol", unit: "μg/24hr", referenceRange: "10 - 100" },
  ],
  "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)": [
    { name: "COVID-19 PCR", unit: "", referenceRange: "Negative" },
    { name: "Influenza A PCR", unit: "", referenceRange: "Negative" },
    { name: "Influenza B PCR", unit: "", referenceRange: "Negative" },
    { name: "RSV PCR", unit: "", referenceRange: "Negative" },
    { name: "Viral Load (Ct Value)", unit: "Ct", referenceRange: ">35" },
  ],
  "Sputum Culture": [
    { name: "Culture Result", unit: "", referenceRange: "Normal Flora" },
    { name: "Gram Stain", unit: "", referenceRange: "Normal" },
    { name: "AFB (Acid-Fast Bacilli)", unit: "", referenceRange: "Negative" },
    { name: "Fungal Culture", unit: "", referenceRange: "No Growth" },
  ],
  "Stool Culture / Ova & Parasites": [
    { name: "Stool Culture", unit: "", referenceRange: "No Pathogens" },
    { name: "Ova and Parasites", unit: "", referenceRange: "None Seen" },
    { name: "Occult Blood", unit: "", referenceRange: "Negative" },
    { name: "Fecal Leukocytes", unit: "", referenceRange: "Negative" },
  ],
  "Blood Culture & Sensitivity": [
    { name: "Culture Result", unit: "", referenceRange: "No Growth" },
    { name: "Organism Identified", unit: "", referenceRange: "None" },
    { name: "Sensitivity Pattern", unit: "", referenceRange: "N/A" },
    { name: "Blood Culture Time to Positivity", unit: "hours", referenceRange: "N/A" },
  ],
  "Tumor Markers (e.g. CA-125, CEA, AFP)": [
    { name: "CA-125 (Ovarian)", unit: "U/mL", referenceRange: "<35" },
    { name: "CEA (Carcinoembryonic Antigen)", unit: "ng/mL", referenceRange: "<3.0" },
    { name: "AFP (Alpha-Fetoprotein)", unit: "ng/mL", referenceRange: "<10" },
    { name: "CA 19-9 (Pancreatic)", unit: "U/mL", referenceRange: "<37" },
    { name: "CA 15-3 (Breast)", unit: "U/mL", referenceRange: "<30" },
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
  "HCG (Pregnancy / Quantitative)": [
    { name: "Quantitative hCG (Beta-hCG)", unit: "mIU/mL", referenceRange: "<5" },
    { name: "Qualitative hCG", unit: "", referenceRange: "Negative" },
  ],
  "HIV Antibody / Viral Load": [
    { name: "HIV-1/2 Antibody", unit: "", referenceRange: "Negative" },
    { name: "HIV p24 Antigen", unit: "", referenceRange: "Negative" },
    { name: "HIV Viral Load (RNA)", unit: "copies/mL", referenceRange: "Not Detected" },
    { name: "CD4 Count", unit: "cells/μL", referenceRange: "500 - 1500" },
    { name: "CD4/CD8 Ratio", unit: "", referenceRange: "0.9 - 3.0" },
  ],
  "Hepatitis B / C Serologies": [
    { name: "HBsAg (Hepatitis B Surface Antigen)", unit: "", referenceRange: "Negative" },
    { name: "Anti-HBs (Hepatitis B Surface Antibody)", unit: "mIU/mL", referenceRange: ">10" },
    { name: "Anti-HBc (Hepatitis B Core Antibody)", unit: "", referenceRange: "Negative" },
    { name: "HBeAg (Hepatitis B e-Antigen)", unit: "", referenceRange: "Negative" },
    { name: "Anti-HCV (Hepatitis C Antibody)", unit: "", referenceRange: "Negative" },
    { name: "HCV RNA (Quantitative)", unit: "IU/mL", referenceRange: "Not Detected" },
  ],
  "Lipase / Amylase (Pancreatic enzymes)": [
    { name: "Lipase", unit: "U/L", referenceRange: "13 - 60" },
    { name: "Amylase", unit: "U/L", referenceRange: "30 - 110" },
    { name: "Pancreatic Amylase", unit: "U/L", referenceRange: "13 - 53" },
  ],
  "Uric Acid": [
    { name: "Uric Acid", unit: "mg/dL", referenceRange: "3.5 - 7.2" },
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
  "Cardiac Biomarkers (Troponin, CK-MB, BNP)": [
    { name: "Troponin I", unit: "ng/mL", referenceRange: "<0.04" },
    { name: "Troponin T", unit: "ng/mL", referenceRange: "<0.01" },
    { name: "CK-MB", unit: "ng/mL", referenceRange: "<5" },
    { name: "BNP (B-type Natriuretic Peptide)", unit: "pg/mL", referenceRange: "<100" },
    { name: "NT-proBNP", unit: "pg/mL", referenceRange: "<125" },
  ],
  "Coagulation Tests (PT, PTT, INR)": [
    { name: "Prothrombin Time (PT)", unit: "seconds", referenceRange: "11 - 13.5" },
    { name: "Partial Thromboplastin Time (PTT)", unit: "seconds", referenceRange: "25 - 35" },
    { name: "INR (International Normalized Ratio)", unit: "", referenceRange: "0.8 - 1.2" },
    { name: "Fibrinogen", unit: "mg/dL", referenceRange: "200 - 400" },
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
  "Albumin / Total Protein": [
    { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3" },
    { name: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.5" },
    { name: "Globulin", unit: "g/dL", referenceRange: "2.0 - 3.5" },
    { name: "A/G Ratio", unit: "", referenceRange: "1.0 - 2.5" },
  ],
  "Iron Studies (Serum Iron, TIBC, Ferritin)": [
    { name: "Serum Iron", unit: "μg/dL", referenceRange: "60 - 170" },
    { name: "TIBC (Total Iron Binding Capacity)", unit: "μg/dL", referenceRange: "240 - 450" },
    { name: "UIBC (Unsaturated Iron Binding Capacity)", unit: "μg/dL", referenceRange: "111 - 343" },
    { name: "Transferrin Saturation", unit: "%", referenceRange: "20 - 50" },
    { name: "Ferritin", unit: "ng/mL", referenceRange: "12 - 300" },
    { name: "Transferrin", unit: "mg/dL", referenceRange: "200 - 360" },
  ],
  "Vitamin D": [
    { name: "25-Hydroxyvitamin D", unit: "ng/mL", referenceRange: "30 - 100" },
    { name: "Vitamin D2 (Ergocalciferol)", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Vitamin D3 (Cholecalciferol)", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Total Vitamin D", unit: "ng/mL", referenceRange: "30 - 100" },
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
  "Creatine Kinase (CK)": [
    { name: "Total CK", unit: "U/L", referenceRange: "30 - 200" },
    { name: "CK-MM", unit: "U/L", referenceRange: "Variable" },
    { name: "CK-MB", unit: "U/L", referenceRange: "<25" },
  ],
  "Thyroid Antibodies (e.g. Anti-TPO, Anti-TG)": [
    { name: "Anti-TPO (Thyroid Peroxidase Antibodies)", unit: "IU/mL", referenceRange: "<35" },
    { name: "Anti-TG (Thyroglobulin Antibodies)", unit: "IU/mL", referenceRange: "<40" },
    { name: "TSI (Thyroid-Stimulating Immunoglobulin)", unit: "%", referenceRange: "<140" },
  ],
  "Prostate-Specific Antigen (PSA)": [
    { name: "Total PSA", unit: "ng/mL", referenceRange: "<4.0" },
    { name: "Free PSA", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Free/Total PSA Ratio", unit: "%", referenceRange: ">25" },
  ],
  "Erythrocyte Sedimentation Rate (ESR)": [
    { name: "ESR (Westergren Method)", unit: "mm/hr", referenceRange: "0 - 20" },
  ],
  "C-Reactive Protein (CRP)": [
    { name: "CRP", unit: "mg/L", referenceRange: "<3.0" },
    { name: "High-Sensitivity CRP (hs-CRP)", unit: "mg/L", referenceRange: "<1.0" },
  ],
  "Hemoglobin A1C (HbA1c)": [
    { name: "Hemoglobin A1C (HbA1c)", unit: "%", referenceRange: "4.0 - 5.6" },
    { name: "Estimated Average Glucose (eAG)", unit: "mg/dL", referenceRange: "< 117" },
  ],
  "Blood Glucose (Fasting / Random / Postprandial)": [
    { name: "Fasting Blood Glucose", unit: "mg/dL", referenceRange: "70 - 100" },
    { name: "Random Blood Glucose", unit: "mg/dL", referenceRange: "70 - 140" },
    { name: "Postprandial Glucose (2 hours)", unit: "mg/dL", referenceRange: "<140" },
  ],
  "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)": [
    { name: "Sodium (Na+)", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium (K+)", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride (Cl-)", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "Bicarbonate (HCO3-)", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "Anion Gap", unit: "mmol/L", referenceRange: "8 - 16" },
  ],
  "Kidney Function Tests (Creatinine, BUN, eGFR)": [
    { name: "Creatinine", unit: "mg/dL", referenceRange: "0.6 - 1.2" },
    { name: "BUN (Blood Urea Nitrogen)", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "eGFR (Estimated Glomerular Filtration Rate)", unit: "mL/min/1.73m²", referenceRange: ">60" },
    { name: "BUN/Creatinine Ratio", unit: "", referenceRange: "10 - 20" },
    { name: "Urea", unit: "mg/dL", referenceRange: "15 - 44" },
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
  "Thyroid Function Tests (TSH, Free T4, Free T3)": [
    { name: "TSH", unit: "mIU/L", referenceRange: "0.4 - 4.0" },
    { name: "Free T4", unit: "ng/dL", referenceRange: "0.8 - 1.8" },
    { name: "Free T3", unit: "pg/mL", referenceRange: "2.3 - 4.2" },
    { name: "Total T4", unit: "μg/dL", referenceRange: "5.0 - 12.0" },
    { name: "Total T3", unit: "ng/dL", referenceRange: "80 - 200" },
  ],
  "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)": [
    { name: "Total Cholesterol", unit: "mg/dL", referenceRange: "<200" },
    { name: "LDL Cholesterol", unit: "mg/dL", referenceRange: "<100" },
    { name: "HDL Cholesterol", unit: "mg/dL", referenceRange: ">40" },
    { name: "Triglycerides", unit: "mg/dL", referenceRange: "<150" },
    { name: "VLDL Cholesterol", unit: "mg/dL", referenceRange: "5 - 40" },
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
};

interface LabTest {
  id: number;
  testId: string;
  testType: string;
  patientName: string;
  orderedBy: number;
  doctorName: string;
  priority: string;
  orderedAt: string;
  status: string;
  patientId: number;
  sampleCollected?: boolean;
  labReportGenerated?: boolean;
  invoiceStatus?: string;
  invoiceNumber?: string;
  nhsNumber?: string;
  patientEmail?: string;
}

export default function LabTechnicianDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [generateFormData, setGenerateFormData] = useState<any>({});
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [showCollectedOnly, setShowCollectedOnly] = useState(false);
  const [showReportGeneratedOnly, setShowReportGeneratedOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch lab tests for lab technician
  const { data: labTests = [], isLoading } = useQuery({
    queryKey: ["/api/lab-technician/tests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lab-technician/tests");
      return response.json();
    },
  });

  // Run migration once on component mount to add testType to existing results
  useEffect(() => {
    const migrationKey = 'lab_results_testtype_migration_v1';
    const hasMigrated = localStorage.getItem(migrationKey);
    
    if (!hasMigrated) {
      apiRequest("POST", "/api/lab-results/migrate-test-types")
        .then(response => response.json())
        .then(data => {
          console.log('Migration completed:', data);
          localStorage.setItem(migrationKey, 'true');
          // Refetch lab tests to get updated data
          queryClient.invalidateQueries({ queryKey: ["/api/lab-technician/tests"] });
        })
        .catch(error => {
          console.error('Migration failed:', error);
        });
    }
  }, []);

  // Filter lab tests based on search query and filters
  const filteredTests = labTests.filter((test: LabTest) => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      test.testId.toLowerCase().includes(query) ||
      test.testType.toLowerCase().includes(query) ||
      test.patientName.toLowerCase().includes(query) ||
      test.doctorName.toLowerCase().includes(query) ||
      (test.invoiceNumber && test.invoiceNumber.toLowerCase().includes(query)) ||
      (test.nhsNumber && test.nhsNumber.toLowerCase().includes(query)) ||
      (test.patientEmail && test.patientEmail.toLowerCase().includes(query))
    );

    // Invoice status filter (toggle)
    const matchesInvoiceStatus = !showPaidOnly || test.invoiceStatus === "paid";

    // Sample collected filter (toggle)
    const matchesSampleCollected = !showCollectedOnly || test.sampleCollected === true;

    // Report generated filter (toggle)
    const matchesReportGenerated = !showReportGeneratedOnly || test.labReportGenerated === true;

    return matchesSearch && matchesInvoiceStatus && matchesSampleCollected && matchesReportGenerated;
  });

  // Parse test types from testType string (could be JSON array or pipe-separated)
  const parseTestTypes = (testType: string): string[] => {
    try {
      const parsed = JSON.parse(testType);
      return Array.isArray(parsed) ? parsed : [testType];
    } catch {
      // Split by pipe (|) separator, NOT comma (since test names contain commas)
      return testType.split('|').map(t => t.trim()).filter(t => t.length > 0);
    }
  };

  // Group test types into their respective categories
  const groupTestTypes = (testTypes: string[]) => {
    const grouped: Record<string, string[]> = {};
    
    testTypes.forEach(testType => {
      // Check if this test type exists in TEST_FIELD_DEFINITIONS
      if (TEST_FIELD_DEFINITIONS[testType]) {
        grouped[testType] = TEST_FIELD_DEFINITIONS[testType].map(field => field.name);
      } else {
        // If not found, create a generic entry
        grouped[testType] = [];
      }
    });
    
    return grouped;
  };

  // Initialize form data when dialog opens
  const handleGenerateClick = (test: LabTest) => {
    setSelectedTest(test);
    
    // Parse test types
    const testTypes = parseTestTypes(test.testType);
    const groupedTests = groupTestTypes(testTypes);
    
    // Initialize form data with empty values
    const initialFormData: any = {
      clinicalNotes: ''
    };
    
    // Initialize each test type's parameters
    testTypes.forEach(testType => {
      if (TEST_FIELD_DEFINITIONS[testType]) {
        TEST_FIELD_DEFINITIONS[testType].forEach(field => {
          const key = `${testType}_${field.name}`;
          initialFormData[key] = '';
        });
      }
    });
    
    setGenerateFormData(initialFormData);
    setShowGenerateDialog(true);
  };

  // Handle form input change
  const handleInputChange = (key: string, value: string) => {
    setGenerateFormData((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle view report from dialog
  const handleViewReport = async () => {
    if (!selectedTest) return;
    
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/files/${selectedTest.id}/signed-url`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to generate signed URL");
      }

      const data = await response.json();
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Error viewing PDF:", error);
      toast({
        title: "Error",
        description: "Failed to view lab report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle view report from card
  const handleViewReportFromCard = async (test: LabTest) => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/files/${test.id}/signed-url`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to generate signed URL");
      }

      const data = await response.json();
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Error viewing PDF:", error);
      toast({
        title: "Error",
        description: "Failed to view lab report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle generate and save lab result
  const handleGenerateLabResult = async () => {
    if (!selectedTest) return;

    setIsSaving(true);
    try {
      // Parse test types from the selected test
      const testTypes = parseTestTypes(selectedTest.testType);
      
      // Build results array from test values
      const results: any[] = [];
      testTypes.forEach((testType: string) => {
        const testFields = TEST_FIELD_DEFINITIONS[testType];
        
        if (testFields) {
          testFields.forEach((field) => {
            const key = `${testType}_${field.name}`;
            const value = generateFormData[key];
            if (value && value.trim() !== "") {
              // Determine status based on reference range (simplified)
              const numValue = parseFloat(value);
              let status = "normal";
              
              results.push({
                name: field.name,
                testType: testType,
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
        setIsSaving(false);
        return;
      }

      // Update the existing lab result with status and results
      const labResultData = {
        status: "completed",
        results: results,
        notes: generateFormData.clinicalNotes || "",
        Lab_Report_Generated: true,
      };

      // Update lab result using testId (not numeric id)
      const updatedResult = await apiRequest("PATCH", `/api/lab-results/${selectedTest.testId}`, labResultData);

      // Generate PDF for the updated lab result using numeric id
      if (updatedResult?.id || selectedTest.id) {
        await apiRequest("POST", `/api/lab-results/${selectedTest.id}/generate-pdf`);
      }

      // Invalidate cache to refetch lab results
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-technician/tests"] });

      toast({
        title: "Success",
        description: "Lab result generated successfully and PDF saved",
      });
      
      setShowGenerateDialog(false);
      setGenerateFormData({});
      setSelectedTest(null);
    } catch (error) {
      console.error("Error generating lab result:", error);
      toast({
        title: "Error",
        description: "Failed to generate lab result. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background page-zoom-90">
      <Header />
      
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white">
              Lab Technician Dashboard
            </h1>
            <p className="text-muted-foreground dark:text-gray-400 mt-1">
              Tests ready for result generation
            </p>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Test ID, Invoice No., Patient Name, NHS No., Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-lab-tests"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "card" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("card")}
              data-testid="button-view-card"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Toggles */}
        <div className="flex flex-wrap gap-6 items-center bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          {/* Invoice Status Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="paid-toggle"
              checked={showPaidOnly}
              onCheckedChange={setShowPaidOnly}
              data-testid="toggle-paid-only"
            />
            <Label htmlFor="paid-toggle" className="cursor-pointer">
              Show Paid Invoices Only
            </Label>
          </div>

          {/* Sample Collection Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="collected-toggle"
              checked={showCollectedOnly}
              onCheckedChange={setShowCollectedOnly}
              data-testid="toggle-collected-only"
            />
            <Label htmlFor="collected-toggle" className="cursor-pointer">
              Show Sample Collected Only
            </Label>
          </div>

          {/* Reports Generated Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="report-generated-toggle"
              checked={showReportGeneratedOnly}
              onCheckedChange={setShowReportGeneratedOnly}
              data-testid="toggle-report-generated-only"
            />
            <Label htmlFor="report-generated-toggle" className="cursor-pointer">
              Reports Generated
            </Label>
          </div>
        </div>

        {/* Lab Tests Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tests...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "No tests found matching your search" : "No tests ready for result generation"}
            </p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.map((test: LabTest) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Test ID and Priority */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Test ID</p>
                        <p className="font-semibold text-medical-blue">{test.testId}</p>
                      </div>
                      <Badge variant={
                        test.priority === 'urgent' ? 'destructive' :
                        test.priority === 'stat' ? 'destructive' :
                        'secondary'
                      }>
                        {test.priority || 'routine'}
                      </Badge>
                    </div>

                    {/* Invoice Number Display */}
                    {test.invoiceNumber && (
                      <div className="bg-muted/50 px-3 py-2 rounded">
                        <p className="text-xs text-muted-foreground">Invoice</p>
                        <p className="font-medium text-sm">{test.invoiceNumber}</p>
                      </div>
                    )}

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2">
                      {test.sampleCollected ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sample Collected
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500 hover:bg-gray-600">
                          Not Sample Collected
                        </Badge>
                      )}
                      {test.invoiceStatus === 'paid' ? (
                        <Badge className="bg-blue-600 hover:bg-blue-700">
                          Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-600 hover:bg-orange-700">
                          Unpaid
                        </Badge>
                      )}
                      {test.labReportGenerated && (
                        <Badge className="bg-purple-600 hover:bg-purple-700">
                          <FileText className="h-3 w-3 mr-1" />
                          Report Generated
                        </Badge>
                      )}
                    </div>

                    {/* Patient Info */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Patient</p>
                        <p className="font-medium">{test.patientName}</p>
                      </div>
                    </div>

                    {/* Test Type */}
                    <div className="group relative">
                      <p className="text-sm text-muted-foreground">Test Type</p>
                      <p className="font-medium text-sm line-clamp-2 group-hover:line-clamp-none transition-all">
                        {parseTestTypes(test.testType).join(' | ')}
                      </p>
                    </div>

                    {/* Ordered By */}
                    <div>
                      <p className="text-sm text-muted-foreground">Ordered By</p>
                      <p className="font-medium text-sm">{test.doctorName}</p>
                    </div>

                    {/* Ordered Date */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ordered Date</p>
                        <p className="text-sm">
                          {test.orderedAt ? format(new Date(test.orderedAt), 'PPP') : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {test.labReportGenerated && (
                        <Button
                          onClick={() => handleViewReportFromCard(test)}
                          variant="outline"
                          className="flex-1"
                          data-testid={`button-view-report-${test.id}`}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Report
                        </Button>
                      )}
                      <Button
                        onClick={() => handleGenerateClick(test)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        data-testid={`button-generate-result-${test.id}`}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Result
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTests.map((test: LabTest) => (
              <Card key={test.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Test ID and Badges */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-medical-blue">{test.testId}</p>
                        <Badge variant={
                          test.priority === 'urgent' ? 'destructive' :
                          test.priority === 'stat' ? 'destructive' :
                          'secondary'
                        }>
                          {test.priority || 'routine'}
                        </Badge>
                        {test.sampleCollected ? (
                          <Badge className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sample Collected
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500 hover:bg-gray-600">
                            Not Sample Collected
                          </Badge>
                        )}
                        {test.invoiceStatus === 'paid' ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700">
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-600 hover:bg-orange-700">
                            Unpaid
                          </Badge>
                        )}
                        {test.invoiceNumber && (
                          <Badge variant="outline">
                            {test.invoiceNumber}
                          </Badge>
                        )}
                        {test.labReportGenerated && (
                          <Badge className="bg-purple-600 hover:bg-purple-700">
                            <FileText className="h-3 w-3 mr-1" />
                            Report Generated
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Patient</p>
                          <p className="font-medium">{test.patientName}</p>
                        </div>
                        <div className="group relative">
                          <p className="text-muted-foreground">Test Type</p>
                          <p className="font-medium line-clamp-1 group-hover:line-clamp-none transition-all">
                            {parseTestTypes(test.testType).join(' | ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ordered By</p>
                          <p className="font-medium">{test.doctorName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ordered Date</p>
                          <p className="font-medium">
                            {test.orderedAt ? format(new Date(test.orderedAt), 'PP') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {test.labReportGenerated && (
                        <Button
                          onClick={() => handleViewReportFromCard(test)}
                          variant="outline"
                          data-testid={`button-view-report-${test.id}`}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Report
                        </Button>
                      )}
                      <Button
                        onClick={() => handleGenerateClick(test)}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-generate-result-${test.id}`}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Result
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Generate Test Result Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Lab Test Result</DialogTitle>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-6">
              {/* Lab Order Details */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">Lab Order Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Name:</p>
                    <p className="font-medium">{selectedTest.patientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test Name:</p>
                    <p className="font-medium">{parseTestTypes(selectedTest.testType).join(' | ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test ID:</p>
                    <p className="font-medium">{selectedTest.testId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered Date:</p>
                    <p className="font-medium">
                      {selectedTest.orderedAt ? format(new Date(selectedTest.orderedAt), 'PPP') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered By:</p>
                    <p className="font-medium">{selectedTest.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority:</p>
                    <p className="font-medium capitalize">{selectedTest.priority || 'Routine'}</p>
                  </div>
                </div>
              </div>

              {/* Test Parameters */}
              {parseTestTypes(selectedTest.testType).map((testType, idx) => {
                const fields = TEST_FIELD_DEFINITIONS[testType] || [];
                
                if (fields.length === 0) {
                  return (
                    <div key={idx} className="border-l-4 border-medical-blue pl-4">
                      <h4 className="font-semibold text-base mb-2">
                        {idx + 1}. {testType}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        No predefined parameters for this test type. Please add results manually.
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="border-l-4 border-medical-blue pl-4">
                    <h4 className="font-semibold text-base mb-4">
                      {idx + 1}. {testType}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {fields.length} parameters
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="space-y-2">
                          <Label htmlFor={`${testType}_${field.name}`}>
                            {field.name} 
                            <span className="text-xs text-muted-foreground ml-2">
                              (Ref: {field.referenceRange})
                            </span>
                          </Label>
                          <Input
                            id={`${testType}_${field.name}`}
                            placeholder={`Enter ${field.name}`}
                            value={generateFormData[`${testType}_${field.name}`] || ''}
                            onChange={(e) => handleInputChange(`${testType}_${field.name}`, e.target.value)}
                            data-testid={`input-${testType}-${field.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Clinical Notes */}
              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes (Optional)</Label>
                <Textarea
                  id="clinicalNotes"
                  placeholder="Enter any clinical observations or notes..."
                  value={generateFormData.clinicalNotes || ''}
                  onChange={(e) => handleInputChange('clinicalNotes', e.target.value)}
                  rows={4}
                  data-testid="textarea-clinical-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateDialog(false)}
                  className="flex-1"
                  data-testid="button-cancel-generate"
                >
                  Cancel
                </Button>
                {selectedTest?.labReportGenerated && (
                  <Button
                    variant="outline"
                    onClick={handleViewReport}
                    className="flex-1"
                    data-testid="button-view-report"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                )}
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleGenerateLabResult}
                  disabled={isSaving}
                  data-testid="button-generate-lab-result"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isSaving ? "Generating..." : "Generate Lab Result"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
