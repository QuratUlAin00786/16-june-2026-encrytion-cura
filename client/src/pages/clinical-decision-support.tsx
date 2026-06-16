import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, buildUrl } from "@/lib/queryClient";
import { AiInsight } from "@shared/schema";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Shield,
  Activity,
  Pill,
  FileText,
  Search,
  Filter,
  Download,
  Settings,
  Plus,
  Trash2,
  Save,
  Edit,
  RotateCcw,
  Info,
  AlertCircle,
  User,
  Check,
  ChevronsUpDown,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAiInsightsEvents } from "@/hooks/use-ai-insights-events";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import jsPDF from "jspdf";

// Use a focused schema for the insight creation form
const createInsightSchema = z
  .object({
  patientId: z.coerce.number().int().positive().optional(),
  type: z.enum([
    "risk_alert",
    "drug_interaction",
    "treatment_suggestion",
    "preventive_care",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  actionRequired: z.boolean(),
  confidence: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : parseFloat(String(v ?? "").trim());
      if (!Number.isFinite(n)) return "0.80";
      const c = Math.max(0, Math.min(1, n));
      return c.toFixed(2);
    }),
  symptoms: z.string().optional().nullable(),
  history: z.string().optional().nullable(),
  status: z.string().max(20).default("active"),
  aiStatus: z.string().max(20).default("pending"),
  });

type CreateInsightForm = z.infer<typeof createInsightSchema>;

// Use the actual database type with additional fields for UI
type ClinicalInsight = AiInsight & {
  patientName?: string; // Add computed field for display
};

type AddDrugInteractionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

interface RiskScore {
  category: string;
  score: number;
  risk: 'low' | 'moderate' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
  patientId: number;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  patientDateOfBirth: string | null;
  assessmentDate: string;
}

interface LabResult {
  id: number;
  testId: string;
  testType: string;
  patientId: number;
  patientName: string;
  doctorName: string;
  testDate: string;
  results: any[];
  criticalValues: boolean;
}

interface AssessmentResponse {
  success: boolean;
  assessment: {
    id: number;
    category: string;
    riskLevel: string;
    riskScore: number;
    riskFactors: string[];
    recommendations: string[];
    assessmentDate: string;
  };
}

export default function ClinicalDecisionSupport() {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [activeTab, setActiveTab] = useState("insights");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedGuideline, setSelectedGuideline] = useState<any>(null);
  const [guidelineViewOpen, setGuidelineViewOpen] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [createInsightOpen, setCreateInsightOpen] = useState(false);
  const [symptoms, setSymptoms] = useState<string>("");
  const [history, setHistory] = useState<string>("");
  const [buttonLoadingStates, setButtonLoadingStates] = useState<Record<string, string | null>>({});
  const [editingSeverity, setEditingSeverity] = useState<string | null>(null);
  const [tempSeverity, setTempSeverity] = useState<string>("");
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [tempPriority, setTempPriority] = useState<string>("");
  
  // Risk Assessment Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPatientName, setFilterPatientName] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  
  // Guidelines Browser Filters
  const [guidelineSearchQuery, setGuidelineSearchQuery] = useState<string>("");
  const [guidelineCategory, setGuidelineCategory] = useState<string>("all");
  
  // Lab Result Assessment State
  const [selectedLabResult, setSelectedLabResult] = useState<LabResult | null>(null);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResponse | null>(null);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Read URL parameters to set active tab
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    console.log('[CDS] URL search params:', window.location.search);
    console.log('[CDS] Tab parameter:', tabParam);
    if (tabParam === 'drug-interactions') {
      console.log('[CDS] Setting active tab to interactions');
      setActiveTab('interactions');
    } else if (tabParam === 'insights') {
      console.log('[CDS] Setting active tab to insights');
      setActiveTab('insights');
    }
  }, []);

  // Connect to SSE for real-time AI insight updates
  const { connected: sseConnected } = useAiInsightsEvents();

  // Form for creating insights
  const form = useForm<CreateInsightForm>({
    resolver: zodResolver(createInsightSchema),
    defaultValues: {
      type: "risk_alert",
      title: "",
      description: "",
      severity: "medium",
      actionRequired: false,
      confidence: "0.8", // String as per database schema
      patientId: undefined, // Required field for form validation
      status: "active",
      aiStatus: "pending"
    }
  });

  // Fetch patients for the searchable dropdown
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
    retry: false,
    staleTime: 30000
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
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim();

  // Get selected patient name for display
  const selectedPatientData = patients.find((p: any) => p.id.toString() === selectedPatient);
  const selectedPatientName = selectedPatientData 
    ? `${selectedPatientData.firstName} ${selectedPatientData.lastName} (${selectedPatientData.patientId})`
    : "Select patient";

  // Guidelines data
  const guidelines = {
    'nice-hypertension': {
      id: 'nice-hypertension',
      title: 'NICE Guidelines: Hypertension Management',
      description: 'Comprehensive guidance on diagnosis and management of hypertension in adults',
      organization: 'NICE (National Institute for Health and Care Excellence)',
      updated: 'March 2024',
      evidenceLevel: 'A',
      category: 'Cardiology',
      sections: [
        {
          title: 'Diagnosis and Assessment',
          content: [
            'Measure blood pressure in both arms when first assessing a person with suspected hypertension',
            'If difference >15 mmHg, use arm with higher reading for subsequent measurements',
            'Use automated devices for routine blood pressure measurement',
            'Consider ambulatory blood pressure monitoring (ABPM) or home blood pressure monitoring (HBPM) to confirm diagnosis'
          ]
        },
        {
          title: 'Classification',
          content: [
            'Stage 1 hypertension: Clinic BP 140/90 mmHg or higher and ABPM/HBPM average 135/85 mmHg or higher',
            'Stage 2 hypertension: Clinic BP 160/100 mmHg or higher and ABPM/HBPM average 150/95 mmHg or higher',
            'Stage 3 hypertension: Clinic systolic BP 180 mmHg or higher or clinic diastolic BP 110 mmHg or higher'
          ]
        },
        {
          title: 'Treatment Recommendations',
          content: [
            'Offer lifestyle advice to all people with hypertension',
            'Start antihypertensive drug treatment for adults aged under 80 with stage 1 hypertension and cardiovascular risk ≥10%',
            'Offer antihypertensive drug treatment to adults of any age with stage 2 hypertension',
            'Consider ACE inhibitor or ARB as first-line treatment for people aged under 55'
          ]
        }
      ]
    },
    'ada-diabetes': {
      id: 'ada-diabetes',
      title: 'ADA Standards: Diabetes Care',
      description: 'Evidence-based recommendations for diabetes diagnosis, treatment, and monitoring',
      organization: 'American Diabetes Association',
      updated: 'January 2024',
      evidenceLevel: 'A',
      category: 'Endocrinology',
      sections: [
        {
          title: 'Diagnostic Criteria',
          content: [
            'HbA1c ≥6.5% (48 mmol/mol) on two separate occasions',
            'Fasting plasma glucose ≥126 mg/dL (7.0 mmol/L) after 8-hour fast',
            'Random plasma glucose ≥200 mg/dL (11.1 mmol/L) with symptoms',
            '2-hour plasma glucose ≥200 mg/dL during oral glucose tolerance test'
          ]
        },
        {
          title: 'Treatment Goals',
          content: [
            'HbA1c target <7% for most adults',
            'More stringent target <6.5% may be appropriate for selected individuals',
            'Less stringent target <8% may be appropriate for those with limited life expectancy',
            'Blood pressure target <140/90 mmHg for most adults'
          ]
        }
      ]
    },
    'gold-copd': {
      id: 'gold-copd',
      title: 'GOLD Guidelines: COPD Management',
      description: 'Global strategy for diagnosis, management and prevention of COPD',
      organization: 'Global Initiative for Chronic Obstructive Lung Disease',
      updated: 'February 2024',
      evidenceLevel: 'A',
      category: 'Respiratory',
      sections: [
        {
          title: 'Diagnosis and Assessment',
          content: [
            'Spirometry is required to make the diagnosis of COPD',
            'Post-bronchodilator FEV1/FVC < 0.70 confirms airflow limitation',
            'Consider COPD in patients over 40 with dyspnea, chronic cough, or sputum production',
            'Assess symptom burden and exacerbation risk'
          ]
        },
        {
          title: 'Treatment Approach',
          content: [
            'Bronchodilators are central to symptom management',
            'LABA/LAMA combination for patients with persistent symptoms',
            'Add ICS for patients with history of exacerbations',
            'Pulmonary rehabilitation for all appropriate patients'
          ]
        }
      ]
    },
    'who-amr': {
      id: 'who-amr',
      title: 'WHO Guidelines: Antimicrobial Resistance',
      description: 'Updated recommendations for preventing and containing antimicrobial resistance',
      organization: 'World Health Organization',
      updated: 'April 2024',
      evidenceLevel: 'B',
      category: 'Infectious Disease',
      sections: [
        {
          title: 'Prevention Strategies',
          content: [
            'Implement infection prevention and control measures',
            'Promote rational use of antimicrobials',
            'Strengthen surveillance systems',
            'Invest in research and development of new antibiotics'
          ]
        },
        {
          title: 'Clinical Practice',
          content: [
            'Use antimicrobials only when prescribed by certified healthcare professionals',
            'Complete the full course even if feeling better',
            'Never share or use leftover antibiotics',
            'Follow local antimicrobial stewardship guidelines'
          ]
        }
      ]
    },
    'esc-heart-failure': {
      id: 'esc-heart-failure',
      title: 'ESC Guidelines: Heart Failure',
      description: 'European Society of Cardiology guidelines for acute and chronic heart failure',
      organization: 'European Society of Cardiology',
      updated: 'March 2024',
      evidenceLevel: 'A',
      category: 'Cardiology',
      sections: [
        {
          title: 'Diagnosis',
          content: [
            'Clinical assessment including history and physical examination',
            'ECG and chest X-ray in all patients',
            'Echocardiography to assess cardiac structure and function',
            'Natriuretic peptides (BNP/NT-proBNP) for diagnosis'
          ]
        },
        {
          title: 'Treatment',
          content: [
            'ACE inhibitors or ARBs as first-line therapy',
            'Beta-blockers for all patients with HFrEF',
            'Diuretics for fluid retention',
            'Consider SGLT2 inhibitors in appropriate patients'
          ]
        }
      ]
    }
  };

  const viewGuideline = (guidelineId: string) => {
    const guideline = (guidelines as any)[guidelineId];
    if (guideline) {
      setSelectedGuideline(guideline);
      setGuidelineViewOpen(true);
    }
  };

  // Filter guidelines based on category and search query
  const filteredGuidelines = Object.values(guidelines).filter((guideline: any) => {
    // Filter by category
    const matchesCategory = guidelineCategory === "all" || 
      guideline.category.toLowerCase() === guidelineCategory.toLowerCase() ||
      (guidelineCategory === "diabetes" && guideline.category === "Endocrinology") ||
      (guidelineCategory === "infectious" && guideline.category === "Infectious Disease");
    
    // Filter by search query
    const matchesSearch = guidelineSearchQuery === "" ||
      guideline.title.toLowerCase().includes(guidelineSearchQuery.toLowerCase()) ||
      guideline.description.toLowerCase().includes(guidelineSearchQuery.toLowerCase()) ||
      guideline.organization.toLowerCase().includes(guidelineSearchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Mock data definitions (must be defined before useQuery hooks)
  const mockInsights: ClinicalInsight[] = [
    {
      id: 1,
      organizationId: 2,
      patientId: 1,
      patientName: "Sarah Johnson",
      type: "drug_interaction",
      title: "Potential Drug Interaction Alert",
      description: "Warfarin and Amoxicillin combination may increase bleeding risk",
      severity: "high",
      actionRequired: true,
      confidence: "0.92",
      metadata: {
        relatedConditions: ["Atrial Fibrillation", "Upper Respiratory Infection"],
        suggestedActions: [
          "Monitor INR more frequently (every 2-3 days)",
          "Consider alternative antibiotic if possible",
          "Educate patient on bleeding signs",
          "Document interaction in patient record"
        ]
      },
      status: "active",
      aiStatus: "pending",
      createdAt: new Date("2024-06-26T14:30:00Z")
    },
    {
      id: 2,
      organizationId: 2,
      patientId: 2,
      patientName: "Michael Chen",
      type: "risk_alert",
      title: "Cardiovascular Risk Assessment",
      description: "Patient shows elevated 10-year cardiovascular risk based on current factors",
      severity: "medium",
      actionRequired: false,
      confidence: "0.87",
      metadata: {
        relatedConditions: ["Hypertension", "Hyperlipidemia"],
        suggestedActions: [
          "Initiate statin therapy",
          "Lifestyle counseling for diet and exercise",
          "Blood pressure monitoring",
          "Follow-up in 3 months"
        ]
      },
      status: "active",
      aiStatus: "reviewed",
      createdAt: new Date("2024-06-26T13:15:00Z")
    }
  ];

  const mockRiskScores: RiskScore[] = [
    {
      category: "Cardiovascular Disease",
      score: 15.2,
      risk: "high",
      factors: ["Age >65", "Smoking", "Hypertension", "High cholesterol"],
      recommendations: ["Statin therapy", "Blood pressure control", "Smoking cessation"]
    },
    {
      category: "Diabetes",
      score: 8.7,
      risk: "moderate",
      factors: ["Family history", "BMI >25", "Prediabetes"],
      recommendations: ["Annual glucose screening", "Weight management", "Diet counseling"]
    }
  ];

  // Fetch AI insights with real data
  const { data: insights = [], isLoading: insightsLoading, refetch: refetchInsights } = useQuery<ClinicalInsight[]>({
    queryKey: ["/api/ai-insights", selectedPatient, filterSeverity, filterType, patients?.length],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPatient && selectedPatient !== "") {
        params.append("patientId", selectedPatient);
      }
      
      const response = await fetch(`/api/ai-insights?${params}`, {
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch insights");
      const data = await response.json();
      
      // Transform data to match AiInsight type and apply filters
      return data.filter((insight: any) => 
        (filterSeverity === 'all' || insight.severity === filterSeverity) &&
        (filterType === 'all' || insight.type === filterType)
      ).map((insight: any) => {
        // Find the patient data for this insight
        const patientData = patients.find((p: any) => p.id === insight.patientId);
        return {
          ...insight,
          id: insight.id.toString(),
          patientId: insight.patientId?.toString() || "",
          patientName: patientData ? `${patientData.firstName} ${patientData.lastName}` : `Patient ${insight.patientId}`,
          aiStatus: insight.aiStatus || insight.ai_status || "pending", // Map snake_case to camelCase
        };
      });
    },
    retry: false,
    staleTime: 30000,
    enabled: true
  });

  // Fetch risk assessments
  const { data: riskAssessments = [], isLoading: riskLoading } = useQuery<RiskScore[]>({
    queryKey: ["/api/clinical/risk-assessments"],
    retry: false,
    staleTime: 30000,
    enabled: true
  });

  // Fetch lab results
  const { data: labResults = [], isLoading: labResultsLoading } = useQuery<LabResult[]>({
    queryKey: ["/api/lab-results"],
    retry: false,
    staleTime: 30000,
    enabled: true
  });

  // Generate AI assessment for lab result
  const generateAssessmentMutation = useMutation({
    mutationFn: async (labResultId: number) => {
      const response = await apiRequest("POST", `/api/lab-results/${labResultId}/assess`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log("[ASSESSMENT] Received data:", data);
      console.log("[ASSESSMENT] Assessment object:", data?.assessment);
      setAssessmentResult(data as AssessmentResponse);
      setIsGeneratingAssessment(false);
      toast({
        title: "Assessment Generated",
        description: "AI-powered risk assessment completed successfully",
      });
    },
    onError: (error: any) => {
      setIsGeneratingAssessment(false);
      toast({
        title: "Assessment Failed",
        description: error.message || "Failed to generate assessment",
        variant: "destructive",
      });
    },
  });

  const handleGenerateAssessment = async (labResult: LabResult) => {
    setSelectedLabResult(labResult);
    setAssessmentResult(null);
    setAssessmentDialogOpen(true);
    setIsGeneratingAssessment(true);
    
    await generateAssessmentMutation.mutateAsync(labResult.id);
  };

  // Debug: Log assessment result changes
  React.useEffect(() => {
    console.log("[ASSESSMENT-STATE] assessmentResult:", assessmentResult);
    console.log("[ASSESSMENT-STATE] isGeneratingAssessment:", isGeneratingAssessment);
    console.log("[ASSESSMENT-STATE] Has assessment:", !!assessmentResult?.assessment);
  }, [assessmentResult, isGeneratingAssessment]);

  // Create new insight mutation
  const [showCreateInsightSuccess, setShowCreateInsightSuccess] = useState(false);
  const [createdInsightTitle, setCreatedInsightTitle] = useState<string | null>(null);

  const createInsightMutation = useMutation({
    mutationFn: async (data: CreateInsightForm) => {
      const payload = {
        patientId: data.patientId,
        type: data.type,
        title: data.title.trim(),
        description: data.description.trim(),
        severity: data.severity,
        actionRequired: data.actionRequired,
        confidence: data.confidence,
        symptoms: data.symptoms?.trim() || undefined,
        history: data.history?.trim() || undefined,
        status: data.status,
        aiStatus: data.aiStatus,
      };
      const response = await apiRequest("POST", `/api/ai-insights`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      const title = data?.title || data?.insight?.title || data?.aiInsight?.title;
      setCreatedInsightTitle(title || null);
      toast({
        title: "Insight Created",
        description: title
          ? `AI insight "${title}" created successfully.`
          : "Successfully created new AI insight.",
      });
      // Invalidate and refetch immediately to show new data
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      queryClient.refetchQueries({ queryKey: ["/api/ai-insights"] });
      form.reset();
      setShowCreateInsightSuccess(true);
      setCreateInsightOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create AI insight",
        variant: "destructive"
      });
    }
  });

  // Delete insight mutation
  const deleteInsightMutation = useMutation({
    mutationFn: async (insightId: string) => {
      return apiRequest("DELETE", `/api/ai-insights/${insightId}`);
    },
    onSuccess: () => {
      toast({
        title: "Insight Deleted",
        description: "Successfully deleted AI insight.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete AI insight",
        variant: "destructive"
      });
    }
  });

  // Update severity mutation
  const updateSeverityMutation = useMutation({
    mutationFn: async (data: { insightId: string; severity: string }) => {
      const response = await apiRequest("PATCH", `/api/ai-insights/${data.insightId}`, { severity: data.severity });
      
      // Check if response has content before parsing as JSON
      const text = await response.text();
      if (text.trim() === '') {
        return { success: true }; // Empty response is success
      }
      
      try {
        return JSON.parse(text);
      } catch (error) {
        // If not valid JSON, just return success status
        return { success: response.ok };
      }
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Severity Updated",
        description: `Severity changed to ${variables.severity}`,
      });
      
      // 🚀 COMPREHENSIVE AUTO-REFRESH: Use comprehensive cache invalidation that matches all AI insights queries
      await queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      // 🔄 FORCE IMMEDIATE REFETCH: Force immediate refetch to ensure data displays
      await queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      // Also call the specific refetch function for this component
      await refetchInsights();
      
      setEditingSeverity(null);
      setTempSeverity("");
    },
    onError: (error: any) => {
      // On error, still try to refresh from server to get latest state
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update severity",
        variant: "destructive"
      });
    }
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async (data: { insightId: string; priority: string }) => {
      const response = await apiRequest("PATCH", `/api/ai-insights/${data.insightId}`, { severity: data.priority });
      
      // Check if response has content before parsing as JSON
      const text = await response.text();
      if (text.trim() === '') {
        return { success: true }; // Empty response is success
      }
      
      try {
        return JSON.parse(text);
      } catch (error) {
        // If not valid JSON, just return success status
        return { success: response.ok };
      }
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Priority Updated", 
        description: `Priority changed to ${variables.priority}`,
      });
      
      // 🚀 COMPREHENSIVE AUTO-REFRESH: Use comprehensive cache invalidation that matches all AI insights queries
      await queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      // 🔄 FORCE IMMEDIATE REFETCH: Force immediate refetch to ensure data displays
      await queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      // Also call the specific refetch function for this component
      await refetchInsights();
      
      setEditingPriority(null);
      setTempPriority("");
    },
    onError: (error: any) => {
      // On error, still try to refresh from server to get latest state
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update priority",
        variant: "destructive"
      });
    }
  });

  // Generate new insight mutation (keep existing for AI generation)
  const generateInsightMutation = useMutation({
    mutationFn: async (data: { patientId: string; symptoms: string; history: string }) => {
      const response = await fetch("/api/ai/generate-insights", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({ patientId: data.patientId }),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to generate insight");
      return response.json();
    },
    onSuccess: async (data) => {
      // Use comprehensive cache invalidation that matches all AI insights queries
      await queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      // Force immediate refetch to ensure data displays
      await queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      if (data.success && data.insights && data.insights.length > 0) {
        const fallbackMessage = data.usingFallbackData ? " (using fallback data)" : "";
        toast({ 
          title: "AI insights generated successfully",
          description: `Generated ${data.insights.length} clinical insight${data.insights.length > 1 ? 's' : ''} for ${data.patientName}${fallbackMessage}`
        });
      } else {
        toast({ 
          title: "No insights generated", 
          description: "No new insights were generated for this patient.",
          variant: "destructive" 
        });
      }
    },
    onError: () => {
      toast({ title: "Failed to generate insight", variant: "destructive" });
    }
  });

  // Update insight AI status with individual button loading states
  const updateInsightStatus = async (insightId: string, aiStatus: string, buttonType: string) => {
    const buttonKey = `${insightId}-${buttonType}`;
    
    try {
      setButtonLoadingStates(prev => ({ ...prev, [buttonKey]: buttonType }));
      
      console.log(`[UPDATE] Starting status update for insight ${insightId}: -> ${aiStatus}`);
      
      await apiRequest("PATCH", `/api/ai/insights/${insightId}`, { aiStatus });
      
      console.log(`[UPDATE] ✅ Status update completed for insight ${insightId}`);
      
      // 🚀 IMMEDIATE AUTO-REFRESH: Force refresh insights data immediately
      await refetchInsights();
      
      // 🔄 COMPREHENSIVE INVALIDATION: Refresh all related queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/clinical/risk-assessments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({ 
        title: "Status Updated", 
        description: `Status has been successfully changed to ${aiStatus}` 
      });
    } catch (error: any) {
      // On error, invalidate to refresh from server
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [buttonKey]: null }));
    }
  };

  // Keep the original mutation for backward compatibility
  const updateInsightMutation = useMutation({
    mutationFn: async (data: { insightId: string; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/ai/insights/${data.insightId}`, { status: data.status, notes: data.notes });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      toast({ 
        title: "Insight updated successfully", 
        description: `Status changed to ${variables.status}` 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update insight",
        variant: "destructive"
      });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical": return "text-red-600";
      case "high": return "text-orange-600";
      case "moderate": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  // Helper functions for severity editing
  const startEditingSeverity = (insightId: string, currentSeverity: string) => {
    setEditingSeverity(insightId);
    setTempSeverity(currentSeverity);
  };

  const cancelEditingSeverity = () => {
    setEditingSeverity(null);
    setTempSeverity("");
  };

  const saveSeverity = (insightId: string) => {
    if (tempSeverity && tempSeverity !== "") {
      updateSeverityMutation.mutate({ insightId, severity: tempSeverity });
    }
  };

  // Helper functions for priority editing
  const startEditingPriority = (insightId: string, currentPriority: string) => {
    setEditingPriority(insightId);
    setTempPriority(currentPriority);
  };

  const cancelEditingPriority = () => {
    setEditingPriority(null);
    setTempPriority("");
  };

  const savePriority = (insightId: string) => {
    if (tempPriority && tempPriority !== "") {
      updatePriorityMutation.mutate({ insightId, priority: tempPriority });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header title="Clinical Decision Support" subtitle="AI-powered insights and recommendations" />
      
  <div className="w-full flex-1 overflow-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3 mb-4">
          <Dialog
            open={createInsightOpen}
            onOpenChange={(open) => {
              setCreateInsightOpen(open);
              if (!open) setPatientSearchOpen(false);
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-create-insight">
                <Plus className="w-4 h-4 mr-2" />
                Generate AI Insight
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New AI Insight</DialogTitle>
                <DialogDescription>
                  Select a patient and enter clinical details to generate a structured AI insight.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createInsightMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={patientSearchOpen}
                                  data-testid="select-patient"
                                  className="w-full justify-between h-auto min-h-10 py-2 font-normal"
                                >
                                  <span className="flex-1 min-w-0 text-left truncate">
                                    {field.value
                                      ? (() => {
                                          const selectedPatient = patients.find(
                                            (p: any) => p.id === field.value,
                                          );
                                          if (!selectedPatient) return "Select patient";
                                          return formatPatientDropdownLabel(selectedPatient);
                                        })()
                                      : "Select patient"}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Search patients..."
                                  className="h-9"
                                  data-testid="input-patient-search"
                                />
                                <CommandList>
                                  <CommandEmpty>No patient found.</CommandEmpty>
                                  <CommandGroup>
                                    {patientsLoading ? (
                                      <CommandItem disabled>Loading patients...</CommandItem>
                                    ) : patientDropdownGroups.length > 0 ? (
                                      patientDropdownGroups.flatMap(({ main, relatives }) => {
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
                                            value={`${patient.firstName} ${patient.lastName} ${patient.patientId ?? ""} ${patient.email ?? ""}`}
                                            onSelect={() => {
                                              field.onChange(patient.id);
                                              setPatientSearchOpen(false);
                                            }}
                                            className="py-2"
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 shrink-0 ${
                                                field.value === patient.id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            <div className="flex flex-col min-w-0">
                                              <span className={isChild ? "pl-1" : ""}>
                                                {isChild ? "↳ " : ""}
                                                {formatPatientDropdownLabel(patient)}
                                              </span>
                                              <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-gray-400">
                                                {patient.email && <span>{patient.email}</span>}
                                                {patient.patientId && (
                                                  <span>({patient.patientId})</span>
                                                )}
                                              </div>
                                            </div>
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="risk_alert">Risk Alert</SelectItem>
                              <SelectItem value="drug_interaction">Drug Interaction</SelectItem>
                              <SelectItem value="treatment_suggestion">Treatment Suggestion</SelectItem>
                              <SelectItem value="preventive_care">Preventive Care</SelectItem>
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
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter insight title" {...field} data-testid="input-title" />
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
                            placeholder="Enter detailed description" 
                            {...field} 
                            data-testid="textarea-description"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-severity">
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="actionRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Action Required</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Does this insight require immediate action?
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-action-required"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="confidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confidence Level: {Math.round(parseFloat(field.value || '0') * 100)}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={[parseFloat(field.value || '0')]}
                            onValueChange={(value) => field.onChange(value[0].toFixed(2))}
                            className="w-full"
                            data-testid="slider-confidence"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Symptoms (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter symptoms..." 
                              {...field} 
                              data-testid="textarea-symptoms"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="history"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>History (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter medical history..." 
                              {...field} 
                              data-testid="textarea-history"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateInsightOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createInsightMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createInsightMutation.isPending && (
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      <Save className="w-4 h-4 mr-2" />
                      Generate AI Insight
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline"
            onClick={() => {
              // Generate and download clinical decision support report
              console.log('[EXPORT] Generating clinical decision support report...');
              
              // Ensure we have valid data
              const validInsights = insights || [];
              const validRiskScores = riskAssessments || [];
              
              const reportData = {
                title: "Clinical Decision Support Report",
                generatedAt: new Date().toISOString(),
                activeInsights: validInsights.filter(insight => insight.status === 'active').length,
                totalInsights: validInsights.length,
                riskAssessments: validRiskScores.length,
                criticalAlerts: validInsights.filter(insight => insight.severity === 'critical').length,
                insights: validInsights.map(insight => ({
                  patient: insight.patientName || 'Unknown Patient',
                  type: insight.type || 'General',
                  priority: insight.severity || 'medium',
                  title: insight.title || 'Clinical Insight',
                  description: insight.description || 'No description available',
                  confidence: insight.confidence || 0,
                  status: insight.status || 'Pending',
                  recommendations: []
                })),
                riskScores: validRiskScores.map(risk => ({
                  category: risk.category || 'General Risk',
                  score: risk.score || 0,
                  risk: risk.risk || 'low',
                  factors: risk.factors || [],
                  recommendations: risk.recommendations || []
                }))
              };
              
              console.log('[EXPORT] Report data prepared:', reportData);

              const csvContent = [
                // Header
                ['Clinical Decision Support Report - Generated on ' + format(new Date(), 'PPpp')],
                [''],
                ['SUMMARY'],
                ['Total Active Insights', reportData.activeInsights],
                ['Total Insights', reportData.totalInsights],
                ['Critical Alerts', reportData.criticalAlerts],
                ['Risk Assessments', reportData.riskAssessments],
                [''],
                ['CLINICAL INSIGHTS'],
                ['Patient', 'Type', 'Priority', 'Title', 'Confidence', 'Status', 'Description'],
                ...reportData.insights.map(insight => [
                  insight.patient,
                  insight.type,
                  insight.priority,
                  insight.title,
                  insight.confidence + '%',
                  insight.status,
                  insight.description
                ]),
                [''],
                ['RISK ASSESSMENTS'],
                ['Category', 'Score', 'Risk Level', 'Key Factors'],
                ...reportData.riskScores.map(risk => [
                  risk.category,
                  risk.score,
                  risk.risk,
                  risk.factors.join('; ')
                ])
              ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

              console.log('[EXPORT] CSV content generated, length:', csvContent.length);
              
              const fileName = `clinical-decision-support-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
              console.log('[EXPORT] Downloading file:', fileName);

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', fileName);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              console.log('[EXPORT] File download initiated successfully');

              toast({
                title: "Medical Report Downloaded",
                description: `Clinical decision support report (${fileName}) has been downloaded successfully.`,
              });
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="insights">Clinical Insights</TabsTrigger>
            <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
            <TabsTrigger value="interactions">Drug Interactions</TabsTrigger>
            <TabsTrigger value="guidelines">Clinical Guidelines</TabsTrigger>
          </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="risk_alert">Risk Alert</SelectItem>
                  <SelectItem value="drug_interaction">Drug Interaction</SelectItem>
                  <SelectItem value="treatment_suggestion">Treatment Suggestion</SelectItem>
                  <SelectItem value="preventive_care">Preventive Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4">
            {(insights || []).map((insight) => (
              <Card key={insight.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{insight.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {insight.patientName} • {format(new Date(insight.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {editingSeverity === insight.id.toString() ? (
                            <div className="flex items-center gap-1">
                              <Select value={tempSeverity} onValueChange={setTempSeverity}>
                                <SelectTrigger className="w-24 h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="critical">Critical</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => saveSeverity(insight.id.toString())}
                                disabled={updateSeverityMutation.isPending}
                                data-testid={`button-save-severity-${insight.id}`}
                              >
                                {updateSeverityMutation.isPending ? (
                                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={cancelEditingSeverity}
                                data-testid={`button-cancel-severity-${insight.id}`}
                              >
                                ×
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge className={getSeverityColor(insight.severity)}>
                                {insight.severity.toUpperCase()}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                                onClick={() => startEditingSeverity(insight.id.toString(), insight.severity)}
                                data-testid={`button-edit-severity-${insight.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{insight.type.replace('_', ' ')}</Badge>
                        {insight.actionRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">Confidence</div>
                        <div className="text-2xl font-bold text-blue-600">{Math.round(parseFloat(insight.confidence || '0') * 100)}%</div>
                      </div>
                      <Progress value={parseFloat(insight.confidence || '0') * 100} className="w-16" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteInsightMutation.mutate(insight.id.toString())}
                        disabled={deleteInsightMutation.isPending}
                        data-testid={`button-delete-insight-${insight.id}`}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleteInsightMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
                  
                  {insight.metadata?.suggestedActions && insight.metadata.suggestedActions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Suggested Actions</h4>
                      <ul className="space-y-1">
                        {insight.metadata.suggestedActions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.metadata?.relatedConditions && insight.metadata.relatedConditions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Related Conditions</h4>
                      <div className="flex flex-wrap gap-1">
                        {insight.metadata.relatedConditions.map((condition, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Status</h4>
                      <Badge 
                        variant={insight.aiStatus === 'reviewed' ? 'default' : insight.aiStatus === 'implemented' ? 'secondary' : insight.aiStatus === 'dismissed' ? 'outline' : 'destructive'}
                        className="text-xs"
                      >
                        {insight.aiStatus ? insight.aiStatus.charAt(0).toUpperCase() + insight.aiStatus.slice(1) : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm"
                      disabled={!!buttonLoadingStates[`${insight.id}-reviewed`]}
                      onClick={() => updateInsightStatus(insight.id.toString(), "reviewed", "reviewed")}
                      data-testid={`button-reviewed-${insight.id}`}
                    >
                      {buttonLoadingStates[`${insight.id}-reviewed`] ? "Updating..." : "Reviewed"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!!buttonLoadingStates[`${insight.id}-implemented`]}
                      onClick={() => updateInsightStatus(insight.id.toString(), "implemented", "implemented")}
                      data-testid={`button-implemented-${insight.id}`}
                    >
                      {buttonLoadingStates[`${insight.id}-implemented`] ? "Updating..." : "Implemented"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      disabled={!!buttonLoadingStates[`${insight.id}-dismissed`]}
                      onClick={() => updateInsightStatus(insight.id.toString(), "dismissed", "dismissed")}
                      data-testid={`button-closed-${insight.id}`}
                    >
                      {buttonLoadingStates[`${insight.id}-dismissed`] ? "Updating..." : "Closed"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          {labResultsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading lab results...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Patient Name</Label>
                    <Input
                      placeholder="Search by patient name..."
                      value={filterPatientName}
                      onChange={(e) => setFilterPatientName(e.target.value)}
                      data-testid="input-patient-name-filter"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Test Date</Label>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      data-testid="input-date-filter"
                    />
                  </div>
                </div>
              </Card>

              {/* Lab Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Lab Results - AI Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left p-3 font-medium text-sm">Test ID</th>
                          <th className="text-left p-3 font-medium text-sm">Test Type</th>
                          <th className="text-left p-3 font-medium text-sm">Patient Name</th>
                          <th className="text-left p-3 font-medium text-sm">Doctor Name</th>
                          <th className="text-left p-3 font-medium text-sm">Test Date</th>
                          <th className="text-left p-3 font-medium text-sm">Status</th>
                          <th className="text-left p-3 font-medium text-sm">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labResults
                          .filter(labResult => {
                            // Filter by patient name
                            if (filterPatientName && !labResult.patientName?.toLowerCase().includes(filterPatientName.toLowerCase())) {
                              return false;
                            }
                            
                            // Filter by date
                            if (filterDate && labResult.testDate) {
                              const testDate = new Date(labResult.testDate).toISOString().split('T')[0];
                              if (testDate !== filterDate) {
                                return false;
                              }
                            }
                            
                            return true;
                          })
                          .map((labResult, idx) => (
                          <tr 
                            key={labResult.id} 
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-lab-result-${idx}`}
                          >
                            <td className="p-3 text-sm" data-testid={`text-test-id-${idx}`}>
                              {labResult.testId}
                            </td>
                            <td className="p-3 text-sm relative group" data-testid={`text-test-type-${idx}`}>
                              {(() => {
                                const tests = labResult.testType.split(' | ');
                                if (tests.length > 2) {
                                  return (
                                    <>
                                      <div className="group-hover:hidden">
                                        {tests.slice(0, 2).join(' | ')}...
                                      </div>
                                      <div className="hidden group-hover:block absolute left-0 top-0 bg-white dark:bg-gray-800 p-3 shadow-lg border border-gray-200 dark:border-gray-700 rounded z-10 max-w-md">
                                        {labResult.testType}
                                      </div>
                                    </>
                                  );
                                }
                                return labResult.testType;
                              })()}
                            </td>
                            <td className="p-3 text-sm" data-testid={`text-patient-name-${idx}`}>
                              {labResult.patientName}
                            </td>
                            <td className="p-3 text-sm" data-testid={`text-doctor-name-${idx}`}>
                              {labResult.doctorName}
                            </td>
                            <td className="p-3 text-sm">
                              {labResult.testDate ? (() => {
                                const date = new Date(labResult.testDate);
                                return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM dd, yyyy');
                              })() : 'N/A'}
                            </td>
                            <td className="p-3 text-sm">
                              {labResult.criticalValues ? (
                                <Badge variant="destructive">Critical</Badge>
                              ) : (
                                <Badge variant="secondary">Normal</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                onClick={() => handleGenerateAssessment(labResult)}
                                data-testid={`button-assess-${idx}`}
                              >
                                <Brain className="w-4 h-4 mr-2" />
                                Assess
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* No results message */}
                    {labResults.filter(labResult => {
                      if (filterPatientName && !labResult.patientName?.toLowerCase().includes(filterPatientName.toLowerCase())) return false;
                      if (filterDate && labResult.testDate) {
                        const testDate = new Date(labResult.testDate).toISOString().split('T')[0];
                        if (testDate !== filterDate) return false;
                      }
                      return true;
                    }).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">No lab results found matching the filters.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assessment Dialog */}
              <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>AI-Powered Lab Result Assessment</DialogTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      View AI-generated risk factors and clinical recommendations based on lab results
                    </p>
                  </DialogHeader>
                  
                  {isGeneratingAssessment ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="text-gray-600 dark:text-gray-400">Analyzing lab results with AI...</p>
                      </div>
                    </div>
                  ) : assessmentResult?.assessment ? (
                    <div className="space-y-6">
                      {/* Lab Result Details */}
                      {selectedLabResult && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold mb-3">Lab Result Details</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium">Test ID:</span> {selectedLabResult.testId}
                            </div>
                            <div>
                              <span className="font-medium">Test Type:</span> {selectedLabResult.testType}
                            </div>
                            <div>
                              <span className="font-medium">Patient:</span> {selectedLabResult.patientName}
                            </div>
                            <div>
                              <span className="font-medium">Doctor:</span> {selectedLabResult.doctorName}
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium">Test Date:</span> {selectedLabResult.testDate ? (() => {
                                const date = new Date(selectedLabResult.testDate);
                                return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM dd, yyyy');
                              })() : 'N/A'}
                            </div>
                          </div>
      <Dialog open={showCreateInsightSuccess} onOpenChange={setShowCreateInsightSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 dark:text-green-400">
              AI Insight Generated
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Check className="h-6 w-6" />
            </span>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {createdInsightTitle
                ? `"${createdInsightTitle}" created successfully`
                : "Insight created successfully"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The insight has been saved and the Clinical Insights list was refreshed.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateInsightSuccess(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
                        </div>
                      )}

                      {/* Assessment Results */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Risk Assessment</h3>
                          <Badge className={
                            assessmentResult.assessment.riskLevel === 'critical' ? 'bg-red-500' :
                            assessmentResult.assessment.riskLevel === 'high' ? 'bg-orange-500' :
                            assessmentResult.assessment.riskLevel === 'moderate' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }>
                            {assessmentResult.assessment.riskLevel.toUpperCase()}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Category</p>
                          <p className="font-medium">{assessmentResult.assessment.category}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Risk Score</p>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold text-blue-600">
                              {assessmentResult.assessment.riskScore}%
                            </div>
                            <Progress value={assessmentResult.assessment.riskScore} className="flex-1" />
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-sm mb-2">Risk Factors</h4>
                          <ul className="space-y-2">
                            {assessmentResult.assessment.riskFactors.map((factor, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                          <ul className="space-y-2">
                            {assessmentResult.assessment.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Assessment generated: {format(new Date(assessmentResult.assessment.assessmentDate), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setAssessmentDialogOpen(false)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </DialogContent>
              </Dialog>
            </>
          )}
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <DrugInteractionsTab />
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Evidence-Based Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Access the latest clinical guidelines and evidence-based recommendations.
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <FileText className="w-4 h-4 mr-2" />
                      Browse Guidelines
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Clinical Guidelines Browser</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Search and Filter */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input 
                            placeholder="Search guidelines..." 
                            className="w-full" 
                            value={guidelineSearchQuery}
                            onChange={(e) => setGuidelineSearchQuery(e.target.value)}
                            data-testid="input-search-guidelines"
                          />
                        </div>
                        <Select value={guidelineCategory} onValueChange={setGuidelineCategory}>
                          <SelectTrigger className="w-48" data-testid="select-guideline-category">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="diabetes">Diabetes</SelectItem>
                            <SelectItem value="respiratory">Respiratory</SelectItem>
                            <SelectItem value="infectious">Infectious Disease</SelectItem>
                            <SelectItem value="emergency">Emergency Medicine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Guidelines List */}
                      <div className="grid gap-4">
                        {filteredGuidelines.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">No guidelines found matching your criteria.</p>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-lg font-semibold mb-3">
                              {guidelineCategory === "all" ? "All Guidelines" : `${guidelineCategory.charAt(0).toUpperCase() + guidelineCategory.slice(1)} Guidelines`}
                              <span className="text-sm font-normal text-gray-500 ml-2">({filteredGuidelines.length} result{filteredGuidelines.length !== 1 ? 's' : ''})</span>
                            </h3>
                            <div className="grid gap-3">
                              {filteredGuidelines.map((guideline: any, index: number) => {
                                const borderColors = ['border-l-blue-500', 'border-l-green-500', 'border-l-purple-500', 'border-l-orange-500', 'border-l-pink-500'];
                                const borderColor = borderColors[index % borderColors.length];
                                
                                return (
                                  <Card key={guideline.id} className={`border-l-4 ${borderColor}`} data-testid={`card-guideline-${guideline.id}`}>
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-sm">{guideline.title}</h4>
                                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                            {guideline.description}
                                          </p>
                                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span>Updated: {guideline.updated}</span>
                                            <span>Evidence Level: {guideline.evidenceLevel}</span>
                                            <Badge variant="secondary" className="text-xs">{guideline.category}</Badge>
                                          </div>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => viewGuideline(guideline.id)}
                                          data-testid={`button-view-${guideline.id}`}
                                        >
                                          View
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quick Access */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Quick Access</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/emergency-protocols");
                              }}
                            >
                              <Activity className="w-6 h-6 mb-1" />
                              <span className="text-xs">Emergency</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/medication-guide");
                              }}
                            >
                              <Pill className="w-6 h-6 mb-1" />
                              <span className="text-xs">Medications</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/prevention-guidelines");
                              }}
                            >
                              <Shield className="w-6 h-6 mb-1" />
                              <span className="text-xs">Prevention</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/clinical-procedures");
                              }}
                            >
                              <FileText className="w-6 h-6 mb-1" />
                              <span className="text-xs">Procedures</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Guideline Viewer Dialog */}
      <Dialog open={guidelineViewOpen} onOpenChange={setGuidelineViewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGuideline?.title}</DialogTitle>
          </DialogHeader>
          {selectedGuideline && (
            <div className="space-y-6">
              {/* Guideline Header */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Organization:</span>
                    <p className="text-gray-600 dark:text-gray-300">{selectedGuideline.organization}</p>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <p className="text-gray-600 dark:text-gray-300">{selectedGuideline.updated}</p>
                  </div>
                  <div>
                    <span className="font-medium">Evidence Level:</span>
                    <Badge variant="secondary">{selectedGuideline.evidenceLevel}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Category:</span>
                    <Badge variant="outline">{selectedGuideline.category}</Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-gray-700 dark:text-gray-300">{selectedGuideline.description}</p>
                </div>
              </div>

              {/* Guideline Sections */}
              <div className="space-y-4">
                {selectedGuideline.sections?.map((section: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {section.content.map((item: string, itemIndex: number) => (
                          <li key={itemIndex} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Generate and download PDF of the guideline
                    const doc = new jsPDF();
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const margin = 20;
                    const contentWidth = pageWidth - 2 * margin;
                    let yPosition = 20;

                    // Title
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.text(selectedGuideline.title, margin, yPosition);
                    yPosition += 10;

                    // Metadata
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Organization: ${selectedGuideline.organization}`, margin, yPosition);
                    yPosition += 6;
                    doc.text(`Last Updated: ${selectedGuideline.updated}`, margin, yPosition);
                    yPosition += 6;
                    doc.text(`Evidence Level: ${selectedGuideline.evidenceLevel}`, margin, yPosition);
                    yPosition += 6;
                    doc.text(`Category: ${selectedGuideline.category}`, margin, yPosition);
                    yPosition += 10;

                    // Description
                    doc.setFont('helvetica', 'bold');
                    doc.text('Description:', margin, yPosition);
                    yPosition += 6;
                    doc.setFont('helvetica', 'normal');
                    const descLines = doc.splitTextToSize(selectedGuideline.description, contentWidth);
                    doc.text(descLines, margin, yPosition);
                    yPosition += (descLines.length * 6) + 8;

                    // Sections
                    selectedGuideline.sections.forEach((section: any) => {
                      if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                      }
                      
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(12);
                      doc.text(section.title, margin, yPosition);
                      yPosition += 8;
                      
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(10);
                      section.content.forEach((item: string) => {
                        if (yPosition > 270) {
                          doc.addPage();
                          yPosition = 20;
                        }
                        const itemLines = doc.splitTextToSize(`• ${item}`, contentWidth - 5);
                        doc.text(itemLines, margin + 5, yPosition);
                        yPosition += (itemLines.length * 6) + 2;
                      });
                      yPosition += 6;
                    });

                    // Footer
                    if (yPosition > 270) {
                      doc.addPage();
                      yPosition = 20;
                    }
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, yPosition);

                    // Download PDF
                    doc.save(`${selectedGuideline.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
                    
                    toast({ 
                      title: "Guideline downloaded", 
                      description: "Clinical guideline has been saved to your downloads" 
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Print the guideline content
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>${selectedGuideline.title}</title>
                            <style>
                              body { margin: 20px; }
                              h1 { color: #333; }
                              h2 { color: #666; margin-top: 20px; }
                              ul { margin: 10px 0; }
                              li { margin: 5px 0; }
                              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                              .meta { color: #666; font-size: 14px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>${selectedGuideline.title}</h1>
                              <div class="meta">
                                <p><strong>Organization:</strong> ${selectedGuideline.organization}</p>
                                <p><strong>Last Updated:</strong> ${selectedGuideline.updated}</p>
                                <p><strong>Evidence Level:</strong> ${selectedGuideline.evidenceLevel}</p>
                                <p><strong>Category:</strong> ${selectedGuideline.category}</p>
                              </div>
                            </div>
                            
                            <p><strong>Description:</strong> ${selectedGuideline.description}</p>
                            
                            ${selectedGuideline.sections.map(section => `
                              <h2>${section.title}</h2>
                              <ul>
                                ${section.content.map(item => `<li>${item}</li>`).join('')}
                              </ul>
                            `).join('')}
                            
                            <div style="margin-top: 30px; font-size: 12px; color: #666;">
                              Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                    
                    toast({ 
                      title: "Printing guideline", 
                      description: "Clinical guideline is being prepared for printing" 
                    });
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Print Guideline
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Add guideline to favorites (localStorage)
                    const favorites = JSON.parse(localStorage.getItem('cura_favorite_guidelines') || '[]');
                    const favoriteItem = {
                      id: selectedGuideline.id,
                      title: selectedGuideline.title,
                      organization: selectedGuideline.organization,
                      category: selectedGuideline.category,
                      addedAt: new Date().toISOString()
                    };
                    
                    // Check if already in favorites
                    const existingIndex = favorites.findIndex((fav: any) => fav.id === selectedGuideline.id);
                    if (existingIndex === -1) {
                      favorites.push(favoriteItem);
                      localStorage.setItem('cura_favorite_guidelines', JSON.stringify(favorites));
                      toast({ 
                        title: "Added to favorites", 
                        description: `${selectedGuideline.title} has been saved to your favorites` 
                      });
                    } else {
                      toast({ 
                        title: "Already in favorites", 
                        description: "This guideline is already in your favorites list",
                        variant: "default"
                      });
                    }
                  }}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Add to Favorites
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

// Drug Interactions Tab Component
function DrugInteractionsTab() {
  const [selectedPatient, setSelectedPatient] = React.useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>("all");
  const [showAddInteractionDialog, setShowAddInteractionDialog] = React.useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const canAddDrugInteraction = ['doctor', 'nurse', 'admin'].includes(user?.role || '');
  const canDeleteDrugInteraction = ['doctor', 'nurse', 'admin'].includes(user?.role || '');

  // Fetch drug interactions data
  const { 
    data: interactionsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/clinical/drug-interactions', selectedPatient],
    queryFn: async () => {
      const url = selectedPatient !== "all" 
        ? `/api/clinical/drug-interactions?patientId=${selectedPatient}`
        : '/api/clinical/drug-interactions';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-Subdomain': getActiveSubdomain(),
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    }
  });

  // Latest first (desc by detectedAt)
  const interactions = React.useMemo(() => {
    const list = interactionsData?.interactions || [];
    return [...list].sort((a: any, b: any) => {
      const tA = a.detectedAt ? new Date(a.detectedAt).getTime() : 0;
      const tB = b.detectedAt ? new Date(b.detectedAt).getTime() : 0;
      return tB - tA;
    });
  }, [interactionsData?.interactions]);
  const totalInteractions = interactionsData?.totalInteractions ?? 0;
  const patientsScanned = interactionsData?.patientsScanned ?? 0;

  // Refresh all drug interactions data from database
  const handleRefreshDrugInteractions = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/clinical/drug-interactions'] });
    await queryClient.refetchQueries({ queryKey: ['/api/clinical/drug-interactions'] });
    toast({
      title: "Refreshed",
      description: "Refreshed Drug interactions data has been reloaded",
    });
  }, [toast]);

  // Delete a manual drug interaction (only manual/addressed interactions have deletable id "manual-<id>")
  const handleDeleteInteraction = React.useCallback(async (interaction: any) => {
    if (interaction.source !== 'manual' || !String(interaction.id).startsWith('manual-')) return;
    const dbId = String(interaction.id).replace(/^manual-/, '');
    if (!dbId) return;
    setDeletingId(interaction.id);
    try {
      const response = await fetch(buildUrl(`/api/clinical/patient-drug-interactions/${dbId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-Subdomain': getActiveSubdomain(),
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Failed to delete (${response.status})`);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/clinical/drug-interactions'] });
      await refetch();
      setShowDeleteSuccessModal(true);
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e.message || "Could not delete drug interaction",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  }, [refetch, toast]);

  // Filter interactions by severity
  const filteredInteractions = React.useMemo(() => {
    if (selectedSeverity === "all") return interactions;
    return interactions.filter((interaction: any) => interaction.severity === selectedSeverity);
  }, [interactions, selectedSeverity]);

  // Get unique patients for filter dropdown
  const uniquePatients = React.useMemo(() => {
    const patients = interactions.reduce((acc: any[], interaction: any) => {
      const existing = acc.find(p => p.id === interaction.patientId);
      if (!existing) {
        acc.push({
          id: interaction.patientId,
          name: interaction.patientName
        });
      }
      return acc;
    }, []);
    return patients;
  }, [interactions]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Drug Interactions Analysis</h3>
          <div className="flex space-x-2">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Error Loading Drug Interactions</AlertTitle>
        <AlertDescription className="text-red-700">
          Failed to load drug interactions data. Please try refreshing or contact support.
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshDrugInteractions}
            className="ml-2 h-6"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <div className="w-full px-3 sm:px-4 lg:px-5 py-4 space-y-4">
      {/* Header with Summary */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold mb-2">Drug Interactions Analysis</h3>
            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span>{totalInteractions} interactions detected</span>
              <span>{patientsScanned} patients scanned</span>
              <span>Last updated: {interactionsData?.timestamp ? new Date(interactionsData.timestamp).toLocaleTimeString() : 'N/A'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {canAddDrugInteraction && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddInteractionDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Drug Interaction
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshDrugInteractions}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="patient-filter">Patient</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger id="patient-filter">
                <SelectValue placeholder="Select patient..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                {uniquePatients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="severity-filter">Severity</Label>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger id="severity-filter">
                <SelectValue placeholder="Select severity..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Interactions List */}
      {filteredInteractions.length === 0 ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">No Drug Interactions Detected</AlertTitle>
          <AlertDescription className="text-green-700">
            {selectedPatient === "all" 
              ? "No active drug interactions found for any patients in the current filters."
              : "No active drug interactions found for the selected patient with the current filters."}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {filteredInteractions.map((interaction: any) => (
            <Card key={interaction.id} className={`border-l-4 ${
              interaction.severity === 'high' ? 'border-l-red-500' :
              interaction.severity === 'medium' ? 'border-l-orange-500' :
              'border-l-yellow-500'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-600" />
                      {interaction.patientName}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {interaction.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canDeleteDrugInteraction && interaction.source === 'manual' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                        onClick={() => handleDeleteInteraction(interaction)}
                        disabled={deletingId === interaction.id}
                        title="Delete drug interaction"
                      >
                        {deletingId === interaction.id ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <div className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(interaction.severity)}`}>
                      <div className="flex items-center gap-1">
                        {getSeverityIcon(interaction.severity)}
                        {interaction.severity.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Medications */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <h5 className="font-medium text-sm mb-1 text-red-800 dark:text-red-200">
                      Medication 1
                    </h5>
                    <p className="font-semibold text-red-900 dark:text-red-100">
                      {interaction.medication1.name}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {interaction.medication1.dosage}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <h5 className="font-medium text-sm mb-1 text-red-800 dark:text-red-200">
                      Medication 2
                    </h5>
                    <p className="font-semibold text-red-900 dark:text-red-100">
                      {interaction.medication2.name}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {interaction.medication2.dosage}
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                {interaction.warnings && interaction.warnings.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Warnings
                    </h5>
                    <ul className="space-y-1">
                      {interaction.warnings.map((warning: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {interaction.recommendations && interaction.recommendations.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      Clinical Recommendations
                    </h5>
                    <ul className="space-y-1">
                      {interaction.recommendations.map((recommendation: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detection Time */}
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
                  Detected: {new Date(interaction.detectedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
  {/* Add Drug Interaction Dialog */}
  <AddDrugInteractionDialog 
    open={showAddInteractionDialog}
    onClose={() => setShowAddInteractionDialog(false)}
    onSuccess={() => {
      setShowAddInteractionDialog(false);
      // Invalidate and refetch drug interactions data
      queryClient.invalidateQueries({ queryKey: ['/api/clinical/drug-interactions'] });
      refetch();
    }}
  />

  {/* Successfully deleted modal */}
  <Dialog open={showDeleteSuccessModal} onOpenChange={setShowDeleteSuccessModal}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          Successfully deleted
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        The drug interaction has been removed from the database.
      </p>
      <div className="flex justify-end pt-2">
        <Button onClick={() => setShowDeleteSuccessModal(false)}>OK</Button>
      </div>
    </DialogContent>
  </Dialog>
</div>
</div>
  );
}

// Add Drug Interaction Dialog Component
const AddDrugInteractionDialog: React.FC<AddDrugInteractionDialogProps> = ({ open, onClose, onSuccess }) => {
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>("");
  const [patientComboboxOpen, setPatientComboboxOpen] = React.useState(false);
  const [medication1Name, setMedication1Name] = React.useState("");
  const [medication1Dosage, setMedication1Dosage] = React.useState("");
  const [medication1Frequency, setMedication1Frequency] = React.useState("");
  const [medication2Name, setMedication2Name] = React.useState("");
  const [medication2Dosage, setMedication2Dosage] = React.useState("");
  const [medication2Frequency, setMedication2Frequency] = React.useState("");
  const [severity, setSeverity] = React.useState("medium");
  const [description, setDescription] = React.useState("");
  const [warnings, setWarnings] = React.useState("");
  const [recommendations, setRecommendations] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [apiKeyErrorDialogOpen, setApiKeyErrorDialogOpen] = React.useState(false);
  const [apiKeyErrorMessage, setApiKeyErrorMessage] = React.useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch patients for dropdown
  const { data: patientsData } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-Subdomain': getActiveSubdomain()
        },
        credentials: 'include'
      });
      const data = await response.json();
      console.log('Patients data received:', data);
      return data;
    }
  });

  const patients = Array.isArray(patientsData) ? patientsData : (patientsData?.patients || []);

  const handleGenerateFromAI = async () => {
    if (!medication1Name.trim() || !medication2Name.trim()) {
      toast({
        title: "Medications required",
        description: "Please enter both Medication 1 and Medication 2 names to generate analysis.",
        variant: "destructive"
      });
      return;
    }
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate drug interaction analysis.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await apiRequest('POST', '/api/clinical/drug-interaction-analyze', {
          medication1Name: medication1Name.trim(),
          medication1Dosage: medication1Dosage.trim() || undefined,
          medication1Frequency: medication1Frequency.trim() || undefined,
          medication2Name: medication2Name.trim(),
          medication2Dosage: medication2Dosage.trim() || undefined,
          medication2Frequency: medication2Frequency.trim() || undefined
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to analyze drug interaction';
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || '';
        } catch {
          // If response is not JSON, use default message
        }
        
        // Check if it's an API key error (503 status or error message contains API key info)
        const isApiKeyError = response.status === 503 || 
                              errorMessage.toLowerCase().includes('api key') ||
                              errorMessage.toLowerCase().includes('openai') ||
                              errorMessage.toLowerCase().includes('incorrect api key');
        
        if (isApiKeyError) {
          // Extract user-friendly message (remove technical details like status codes and masked keys)
          let userFriendlyMessage = errorMessage;
          
          // Remove status code prefix if present (e.g., "503: {...}")
          if (userFriendlyMessage.includes('503:')) {
            try {
              const jsonMatch = userFriendlyMessage.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                userFriendlyMessage = parsed.error || userFriendlyMessage;
              }
      } catch {
              // If parsing fails, use the original message
            }
          }
          
          // Remove masked API key references for cleaner message
          userFriendlyMessage = userFriendlyMessage.replace(/Current key: [^\s]+/gi, '');
          userFriendlyMessage = userFriendlyMessage.replace(/sk-[^\s]+/gi, '[API Key Hidden]');
          
          // Clean up the message
          userFriendlyMessage = userFriendlyMessage.trim();
          if (!userFriendlyMessage) {
            userFriendlyMessage = 'OpenAI API key is not configured correctly. Please contact your system administrator to configure a valid API key.';
          }
          
          setApiKeyErrorMessage(userFriendlyMessage);
          setApiKeyErrorDialogOpen(true);
          return;
        }
        
        throw new Error(errorMessage);
      }
      
      const result: { severity?: string; description?: string; warnings?: string[]; recommendations?: string[]; notes?: string } = await response.json();
      // Only fill from AI response — no hardcoded values
      setSeverity(result.severity ?? 'medium');
      setDescription(result.description ?? '');
      setWarnings(Array.isArray(result.warnings) ? result.warnings.join('\n') : (result.warnings ?? ''));
      setRecommendations(Array.isArray(result.recommendations) ? result.recommendations.join('\n') : (result.recommendations ?? ''));
      setNotes(result.notes ?? '');
      toast({ title: "Analysis complete", description: "AI-generated fields have been filled. You can edit and then add the interaction." });
    } catch (error: any) {
      // Check if it's an API key error from the error message
      let errorMessage = error.message || "Failed to generate analysis";
      
      const isApiKeyError = errorMessage.toLowerCase().includes('api key') ||
                           errorMessage.toLowerCase().includes('openai') ||
                           errorMessage.toLowerCase().includes('incorrect api key') ||
                           errorMessage.toLowerCase().includes('503');
      
      if (isApiKeyError) {
        // Clean up the error message for display
        let userFriendlyMessage = errorMessage;
        
        // Remove status code prefix if present (e.g., "503: {...}")
        if (userFriendlyMessage.includes('503:')) {
          try {
            const jsonMatch = userFriendlyMessage.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              userFriendlyMessage = parsed.error || userFriendlyMessage;
            }
          } catch {
            // If parsing fails, use the original message
          }
        }
        
        // Remove masked API key references for cleaner message
        userFriendlyMessage = userFriendlyMessage.replace(/Current key: [^\s]+/gi, '');
        userFriendlyMessage = userFriendlyMessage.replace(/sk-[^\s]+/gi, '[API Key Hidden]');
        userFriendlyMessage = userFriendlyMessage.trim();
        
        if (!userFriendlyMessage) {
          userFriendlyMessage = 'OpenAI API key is not configured correctly. Please contact your system administrator to configure a valid API key.';
        }
        
        setApiKeyErrorMessage(userFriendlyMessage);
        setApiKeyErrorDialogOpen(true);
      } else {
      toast({
        title: "Error",
          description: errorMessage,
        variant: "destructive"
      });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatientId || !medication1Name || !medication2Name) {
      toast({
        title: "Required fields missing",
        description: "Please fill in patient, medication 1 name, and medication 2 name.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // Allow doctor, nurse, and admin roles to save to database
    if (user && ['admin', 'doctor', 'nurse'].includes(user.role)) {
      try {
        const payload = {
          patientId: parseInt(selectedPatientId),
          medication1Name,
          medication1Dosage,
          medication1Frequency,
          medication2Name,
          medication2Dosage,
          medication2Frequency,
          severity,
          description,
          warnings: warnings ? warnings.split('\n').filter(w => w.trim()) : [],
          recommendations: recommendations ? recommendations.split('\n').filter(r => r.trim()) : [],
          notes
        };

        const response = await fetch(buildUrl('/api/clinical/patient-drug-interactions'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'X-Tenant-Subdomain': getActiveSubdomain()
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add drug interaction');
        }

        toast({
          title: "Success",
          description: "Drug interaction added successfully."
        });
        setIsSubmitting(false);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to add drug interaction",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
    } else {
      toast({
        title: "Access Denied",
        description: "Only doctor, nurse, or admin users can save drug interactions to the database.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    // Reset form
    setSelectedPatientId("");
    setMedication1Name("");
    setMedication1Dosage("");
    setMedication1Frequency("");
    setMedication2Name("");
    setMedication2Dosage("");
    setMedication2Frequency("");
    setSeverity("medium");
    setDescription("");
    setWarnings("");
    setRecommendations("");
    setNotes("");
    onSuccess();
    setIsSubmitting(false);
  };

  const handleClose = () => {
    // Reset form when closing
    setSelectedPatientId("");
    setMedication1Name("");
    setMedication1Dosage("");
    setMedication1Frequency("");
    setMedication2Name("");
    setMedication2Dosage("");
    setMedication2Frequency("");
    setSeverity("medium");
    setDescription("");
    setWarnings("");
    setRecommendations("");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Drug Interaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <div>
            <Label htmlFor="patient-select">Patient *</Label>
            <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={patientComboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedPatientId ? (() => {
                    const selectedPatient = patients.find((patient: any) => patient.id.toString() === selectedPatientId);
                    return selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName} - ${selectedPatient.email}` : "Select patient...";
                  })() : "Select patient..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search patients..." />
                  <CommandList>
                    <CommandEmpty>No patient found.</CommandEmpty>
                    <CommandGroup>
                      {patients.map((patient: any) => (
                        <CommandItem
                          key={patient.id}
                          value={`${patient.firstName} ${patient.lastName} ${patient.email}`}
                          onSelect={() => {
                            setSelectedPatientId(patient.id.toString());
                            setPatientComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedPatientId === patient.id.toString() ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                            <span className="text-sm text-gray-500">{patient.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Medication 1 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="med1-name">Medication 1 Name *</Label>
              <Input
                id="med1-name"
                value={medication1Name}
                onChange={(e) => setMedication1Name(e.target.value)}
                placeholder="e.g., Warfarin"
                required
              />
            </div>
            <div>
              <Label htmlFor="med1-dosage">Dosage</Label>
              <Input
                id="med1-dosage"
                value={medication1Dosage}
                onChange={(e) => setMedication1Dosage(e.target.value)}
                placeholder="e.g., 5mg"
              />
            </div>
            <div>
              <Label htmlFor="med1-frequency">Frequency</Label>
              <Input
                id="med1-frequency"
                value={medication1Frequency}
                onChange={(e) => setMedication1Frequency(e.target.value)}
                placeholder="e.g., Daily"
              />
            </div>
          </div>

          {/* Medication 2 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="med2-name">Medication 2 Name *</Label>
              <Input
                id="med2-name"
                value={medication2Name}
                onChange={(e) => setMedication2Name(e.target.value)}
                placeholder="e.g., Aspirin"
                required
              />
            </div>
            <div>
              <Label htmlFor="med2-dosage">Dosage</Label>
              <Input
                id="med2-dosage"
                value={medication2Dosage}
                onChange={(e) => setMedication2Dosage(e.target.value)}
                placeholder="e.g., 75mg"
              />
            </div>
            <div>
              <Label htmlFor="med2-frequency">Frequency</Label>
              <Input
                id="med2-frequency"
                value={medication2Frequency}
                onChange={(e) => setMedication2Frequency(e.target.value)}
                placeholder="e.g., Daily"
              />
            </div>
          </div>

          {/* Generate from AI */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateFromAI}
              disabled={isGenerating || !medication1Name.trim() || !medication2Name.trim()}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate from AI'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Fill severity, description, warnings, and recommendations from AI.
            </span>
          </div>

          {/* Severity */}
          <div>
            <Label htmlFor="severity-select">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity-select">
                <SelectValue placeholder="Select severity..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the drug interaction..."
              rows={2}
            />
          </div>

          {/* Warnings */}
          <div>
            <Label htmlFor="warnings">Warnings (one per line)</Label>
            <Textarea
              id="warnings"
              value={warnings}
              onChange={(e) => setWarnings(e.target.value)}
              placeholder="Increased bleeding risk&#10;Monitor INR levels"
              rows={3}
            />
          </div>

          {/* Recommendations */}
          <div>
            <Label htmlFor="recommendations">Clinical Recommendations (one per line)</Label>
            <Textarea
              id="recommendations"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Monitor patient closely&#10;Consider alternative medications&#10;Adjust dosage if necessary"
              rows={3}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional clinical notes..."
              rows={2}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isSubmitting ? 'Adding...' : 'Add Drug Interaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* API Key Error Modal */}
      <Dialog open={apiKeyErrorDialogOpen} onOpenChange={setApiKeyErrorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              OpenAI API Configuration Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>API Key Configuration Error</AlertTitle>
              <AlertDescription className="mt-2">
                {apiKeyErrorMessage || "The OpenAI API key is not configured correctly. Please contact your system administrator to configure a valid API key."}
              </AlertDescription>
            </Alert>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>To resolve this issue:</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Contact your system administrator</li>
                <li>Ensure a valid OpenAI API key is configured in the server environment variables</li>
                <li>Get a valid API key from <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You can still add drug interactions manually by filling in the form fields below.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setApiKeyErrorDialogOpen(false)}>
              I Understand
            </Button>
          </div>
      </DialogContent>
      </Dialog>
    </Dialog>
  );
};