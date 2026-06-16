import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PrescriptionWarnings from "./prescription-warnings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Calendar, User, Stethoscope, Pill, AlertTriangle, Mic, Square, Heart, Thermometer, Activity, Weight, Ruler, Calculator, History, Eye, ClipboardCheck, FileSpreadsheet, BookOpen, X, Printer, Save, CheckCircle, Clock, Trash2, Edit, Download } from "lucide-react";
import { format } from "date-fns";
import type { MedicalRecord } from "@/types";

const anatomicalDiagramImage = "/anatomical-diagram-clean.svg";
const facialMuscleImage = "/clean-facial-diagram.png";
const facialOutlineImage = "/clean-facial-diagram.png";

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

const FullConsultationInterface = React.lazy(() => 
  import("@/components/consultation/full-consultation-interface").then(module => ({
    default: module.FullConsultationInterface
  }))
);

const consultationSchema = z.object({
  type: z.enum(["consultation", "prescription", "lab_result", "imaging", "procedure"]),
  title: z.string().min(1, "Title is required"),
  notes: z.string().min(10, "Notes must be at least 10 characters"),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional()
  })).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional(),
  referrals: z.array(z.object({
    specialist: z.string(),
    reason: z.string(),
    urgency: z.enum(["routine", "urgent", "emergency"])
  })).optional(),
  // New vital signs fields
  bloodPressureSystolic: z.string().optional(),
  bloodPressureDiastolic: z.string().optional(),
  heartRate: z.string().optional(),
  temperature: z.string().optional(),
  respiratoryRate: z.string().optional(),
  oxygenSaturation: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  bmi: z.string().optional()
});

interface ConsultationNotesProps {
  patientId: number;
  patientName?: string;
  patientNumber?: string;
}

export default function ConsultationNotes({ patientId, patientName, patientNumber }: ConsultationNotesProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [isEditingFullRecord, setIsEditingFullRecord] = useState(false);
  const [editingVitalsData, setEditingVitalsData] = useState<any>({});
  const [editingFullRecordData, setEditingFullRecordData] = useState<any>({});
  const [activeTab, setActiveTab] = useState("vitals");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [consultationFileToDelete, setConsultationFileToDelete] = useState<{ id: number; fileName: string } | null>(null);
  const [deleteConsultationDialogOpen, setDeleteConsultationDialogOpen] = useState(false);
  const [deletingConsultationFile, setDeletingConsultationFile] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Edit Medical Record validation state
  const [editRecordErrors, setEditRecordErrors] = useState({
    title: "",
    notes: "",
    diagnosis: "",
    treatment: ""
  });

  // Edit Medical Record validation functions
  const validateEditTitle = (value: string): string => {
    if (!value || value.trim().length === 0) {
      return "Title is required.";
    }
    if (value.trim().length < 3) {
      return "Title must be at least 3 characters.";
    }
    if (value.length > 200) {
      return "Title must not exceed 200 characters.";
    }
    return "";
  };

  const validateEditNotes = (value: string): string => {
    if (!value || value.trim().length === 0) {
      return "Notes are required.";
    }
    if (value.trim().length < 10) {
      return "Notes must be at least 10 characters.";
    }
    if (value.length > 5000) {
      return "Notes must not exceed 5000 characters.";
    }
    return "";
  };

  const validateEditDiagnosis = (value: string): string => {
    // Diagnosis is optional, but if provided, must meet minimum length
    if (value && value.trim().length > 0) {
      if (value.trim().length < 5) {
        return "Diagnosis must be at least 5 characters.";
      }
      if (value.length > 1000) {
        return "Diagnosis must not exceed 1000 characters.";
      }
    }
    return "";
  };

  const validateEditTreatment = (value: string): string => {
    // Treatment is optional, but if provided, must meet minimum length
    if (value && value.trim().length > 0) {
      if (value.trim().length < 5) {
        return "Treatment must be at least 5 characters.";
      }
      if (value.length > 1000) {
        return "Treatment must not exceed 1000 characters.";
      }
    }
    return "";
  };

  const validateAllEditFields = (): boolean => {
    const errors = {
      title: validateEditTitle(editingFullRecordData.title || ''),
      notes: validateEditNotes(editingFullRecordData.notes || ''),
      diagnosis: validateEditDiagnosis(editingFullRecordData.diagnosis || ''),
      treatment: validateEditTreatment(editingFullRecordData.treatment || '')
    };

    setEditRecordErrors(errors);

    // Check if there are any errors
    return !Object.values(errors).some(error => error !== "");
  };
  
  // Vital signs state
  const [vitals, setVitals] = useState({
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bmi: ""
  });

  // Clinical notes state
  const [selectedExaminationType, setSelectedExaminationType] = useState<string>("");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [treatmentPlan, setTreatmentPlan] = useState<string>("");
  const [showAnatomicalViewer, setShowAnatomicalViewer] = useState(false);
  
  // Audio transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(false);

  // Anatomical analysis state
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [selectedTreatmentIntensity, setSelectedTreatmentIntensity] = useState<string>("");
  const [selectedSessionFrequency, setSelectedSessionFrequency] = useState<string>("");
  const [selectedSymptom, setSelectedSymptom] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [selectedFollowUp, setSelectedFollowUp] = useState<string>("");
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const anatomicalImages = [facialMuscleImage, facialOutlineImage];

  const [patient, setPatient] = useState<any>(null);

  const [recordsSectionTab, setRecordsSectionTab] = useState<"records" | "consultations">("records");

  // Use React Query for medical records to fix production caching issues
  const { data: medicalRecords = [], isLoading, refetch: refetchMedicalRecords } = useQuery<any[]>({
    queryKey: ['/api/patients', patientId, 'records'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patientId}/records`, {
        headers,
        credentials: 'include',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[ConsultationNotes] Fetched medical records:', data);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    enabled: !!patientId
  });

  // Consultation PDFs (saved from View Full Consultation)
  const { data: consultationFiles = [], isLoading: consultationFilesLoading, refetch: refetchConsultationFiles } = useQuery<{ id: number; fileName: string; filePath: string; createdAt: string }[]>({
    queryKey: ["/api/patients", patientId, "consultation-files"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/patients/${patientId}/consultation-files`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!patientId && recordsSectionTab === "consultations",
  });

  const handleViewConsultationFile = async (fileId: number) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`/api/consultation-files/${fileId}/download`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "X-Tenant-Subdomain": getTenantSubdomain(),
      },
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleDeleteConsultationFile = async () => {
    if (!consultationFileToDelete) return;
    setDeletingConsultationFile(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/consultation-files/${consultationFileToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "X-Tenant-Subdomain": getTenantSubdomain(),
        },
        credentials: "include",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "consultation-files"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "records"] });
        toast({ title: "Consultation PDF deleted", description: `"${consultationFileToDelete.fileName}" has been removed.` });
        setDeleteConsultationDialogOpen(false);
        setConsultationFileToDelete(null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Delete failed", description: err?.error || "Could not delete file.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete failed", description: "Could not delete consultation file.", variant: "destructive" });
    } finally {
      setDeletingConsultationFile(false);
    }
  };

  // Define muscle coordinates for each anatomical image separately
  const muscleCoordinatesForImages = {
    // Image 0: Labeled muscle diagram (horizontal layout, includes neck)
    0: {
      frontalis: { x: 50, y: 18 },        // Top center forehead
      temporalis: { x: 28, y: 25 },       // Left side temple area
      corrugator_supercilii: { x: 43, y: 23 }, // Between eyebrows
      procerus: { x: 50, y: 28 },         // Center between eyebrows
      orbicularis_oculi: { x: 38, y: 32 }, // Around eye area
      levator_labii_superioris: { x: 46, y: 42 }, // Upper lip elevator
      zygomaticus_major: { x: 32, y: 48 }, // Cheek muscle (major)
      zygomaticus_minor: { x: 42, y: 45 }, // Cheek muscle (minor)
      masseter: { x: 28, y: 58 },         // Jaw muscle
      buccinator: { x: 38, y: 52 },       // Cheek muscle
      orbicularis_oris: { x: 50, y: 58 }, // Around mouth
      mentalis: { x: 50, y: 68 },         // Chin muscle
      depressor_anguli_oris: { x: 46, y: 62 }, // Lower mouth corner
      depressor_labii_inferioris: { x: 48, y: 65 }, // Lower lip depressor
      platysma: { x: 42, y: 75 }          // Neck muscle
    },
    // Image 1: Clean outline (vertical layout, more focused on face)
    1: {
      frontalis: { x: 50, y: 12 },        // Top center forehead
      temporalis: { x: 22, y: 28 },       // Left side temple area
      corrugator_supercilii: { x: 42, y: 22 }, // Between eyebrows
      procerus: { x: 50, y: 26 },         // Center between eyebrows
      orbicularis_oculi: { x: 35, y: 30 }, // Around eye area
      levator_labii_superioris: { x: 45, y: 45 }, // Upper lip elevator
      zygomaticus_major: { x: 28, y: 52 }, // Cheek muscle (major)
      zygomaticus_minor: { x: 38, y: 48 }, // Cheek muscle (minor)
      masseter: { x: 22, y: 62 },         // Jaw muscle
      buccinator: { x: 32, y: 55 },       // Cheek muscle
      orbicularis_oris: { x: 50, y: 62 }, // Around mouth
      mentalis: { x: 50, y: 75 },         // Chin muscle
      depressor_anguli_oris: { x: 45, y: 68 }, // Lower mouth corner
      depressor_labii_inferioris: { x: 42, y: 72 }, // Lower lip depressor
      platysma: { x: 38, y: 82 }          // Neck muscle
    }
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev === 0 ? anatomicalImages.length - 1 : prev - 1);
    } else {
      setCurrentImageIndex(prev => (prev + 1) % anatomicalImages.length);
    }
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
    
    const treatmentPlan = `
COMPREHENSIVE FACIAL MUSCLE TREATMENT PLAN

Patient: ${patientName || 'Patient'}
Date: ${format(new Date(), 'MMMM dd, yyyy')}

TARGET ANALYSIS:
• Muscle Group: ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Analysis Type: ${selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Primary Treatment: ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

TREATMENT PROTOCOL:
1. Initial Assessment & Baseline Documentation
2. Pre-treatment Preparation & Patient Consultation
3. ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Implementation
4. Post-treatment Monitoring & Assessment
5. Follow-up Care & Progress Evaluation

EXPECTED OUTCOMES:
• Improved muscle function and symmetry
• Reduced symptoms and enhanced patient comfort
• Optimized aesthetic and functional results
• Long-term maintenance planning

NEXT STEPS:
• Schedule follow-up appointment in 1-2 weeks
• Monitor patient response and adjust treatment as needed
• Document progress with photographic evidence
• Review treatment effectiveness and make modifications if required

Generated on: ${format(new Date(), 'PPpp')}
`;

    setGeneratedTreatmentPlan(treatmentPlan);
    setIsGeneratingPlan(false);
    
    toast({
      title: "Treatment Plan Generated",
      description: "Comprehensive treatment plan has been created successfully.",
    });
  };

  // Save anatomical analysis as medical record
  const saveAnalysis = async () => {
    if (!selectedMuscleGroup || !selectedAnalysisType) {
      toast({
        title: "Missing Information",
        description: "Please select at least muscle group and analysis type before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAnalysis(true);
    
    try {
      const analysisData = {
        type: "consultation",
        title: `Anatomical Analysis - ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: ${patientName || 'Patient'}
Date: ${format(new Date(), 'MMMM dd, yyyy')}

ANALYSIS DETAILS:
• Target Muscle Group: ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Analysis Type: ${selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
${selectedTreatment ? `• Primary Treatment: ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : ''}

CLINICAL OBSERVATIONS:
- Comprehensive anatomical assessment completed
- Interactive muscle group identification performed
- Professional analysis methodology applied

${generatedTreatmentPlan ? `\nTREATMENT PLAN:\n${generatedTreatmentPlan}` : ''}

Analysis completed on: ${format(new Date(), 'PPpp')}`,
        diagnosis: `Anatomical analysis of ${selectedMuscleGroup.replace(/_/g, ' ')} - ${selectedAnalysisType.replace(/_/g, ' ')}`,
        treatment: selectedTreatment ? selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : undefined
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${patientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Refresh medical records using React Query
      refetchMedicalRecords();
      
      toast({
        title: "Analysis Saved",
        description: "Anatomical analysis has been saved to medical records successfully.",
      });

      // Reset the form
      setSelectedMuscleGroup("");
      setSelectedAnalysisType("");
      setSelectedTreatment("");
      setGeneratedTreatmentPlan("");
      setShowAnatomicalViewer(false);
      
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save anatomical analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  // Calculate BMI
  const calculateBMI = () => {
    const heightInCm = parseFloat(vitals.height);
    const weightInKg = parseFloat(vitals.weight);
    
    if (heightInCm > 0 && weightInKg > 0) {
      const heightInM = heightInCm / 100;
      const bmiValue = (weightInKg / (heightInM * heightInM)).toFixed(1);
      setVitals(prev => ({ ...prev, bmi: bmiValue }));
    }
  };

  // Fetch patient data
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsTranscriptionSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            setClinicalNotes(prev => prev + finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: "Transcription Error",
            description: "Unable to transcribe audio. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak clearly to transcribe your clinical notes",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Transcription has been added to your clinical notes",
      });
    }
  };

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) return;
      
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/patients/${patientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const patientData = await response.json();
          setPatient(patientData);
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
      }
    };

    fetchPatientData();
  }, [patientId]);

  // Removed direct fetch function - now using React Query

  const form = useForm({
    defaultValues: {
      type: "consultation",
      title: "",
      notes: "",
      diagnosis: "",
      treatment: "",
      medications: [],
      followUpRequired: false,
      followUpDate: "",
      referrals: [],
      ...vitals
    }
  });

  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const saveRecord = async (data: any, isDraft: boolean = false) => {
    try {
      setIsSavingRecord(true);
      
      const recordData = {
        type: "consultation",
        title: isDraft ? "Draft Consultation" : "Full Consultation",
        notes: `CONSULTATION RECORD\n\nPatient: ${patientName}\nDate: ${format(new Date(), 'MMMM dd, yyyy')}\nStatus: ${isDraft ? 'Draft' : 'Completed'}\n\nVITAL SIGNS:\n- Blood Pressure: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg\n- Heart Rate: ${vitals.heartRate} bpm\n- Temperature: ${vitals.temperature}°C\n- Respiratory Rate: ${vitals.respiratoryRate} /min\n- O2 Saturation: ${vitals.oxygenSaturation}%\n- Weight: ${vitals.weight} kg\n- Height: ${vitals.height} cm\n- BMI: ${vitals.bmi}`,
        diagnosis: data.diagnosis || "",
        treatment: data.treatment || "",
        metadata: {
          vitals: vitals,
          isDraft: isDraft,
          consultationType: "full_consultation",
          sessionInfo: {
            startTime: new Date().toISOString(),
            duration: 0
          }
        }
      };
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${patientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        credentials: 'include',
        body: JSON.stringify(recordData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const newRecord = await response.json();
      // Invalidate and refetch medical records
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'records'] });
      
      if (!isDraft) {
        setIsAddingNote(false);
        // Reset form and vitals
        setVitals({
          bloodPressureSystolic: "",
          bloodPressureDiastolic: "",
          heartRate: "",
          temperature: "",
          respiratoryRate: "",
          oxygenSaturation: "",
          weight: "",
          height: "",
          bmi: ""
        });
        form.reset();
      }
      
      toast({
        title: isDraft ? "Draft saved successfully" : "Consultation completed successfully",
        description: isDraft ? "The consultation draft has been saved." : "The consultation record has been saved to the patient's file.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving record",
        description: error.message || "Failed to save the consultation record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleSaveDraft = () => {
    saveRecord(form.getValues(), true);
  };

  const handleCompleteConsultation = () => {
    saveRecord(form.getValues(), false);
  };

  // Parse vital signs from record
  const parseVitalSigns = (record: any) => {
    if (record.metadata?.vitals) {
      return record.metadata.vitals;
    }
    
    // Parse from notes if metadata is not available
    const notes = record.notes || '';
    const vitalSigns = {
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
      bmi: ''
    };

    const patterns = {
      bloodPressure: /Blood Pressure: (\d+)\/(\d+)/,
      heartRate: /Heart Rate: (\d+)/,
      temperature: /Temperature: ([\d.]+)/,
      respiratoryRate: /Respiratory Rate: (\d+)/,
      oxygenSaturation: /O2 Saturation: (\d+)/,
      weight: /Weight: ([\d.]+)/,
      height: /Height: ([\d.]+)/,
      bmi: /BMI: ([\d.]+)/
    };

    const bpMatch = notes.match(patterns.bloodPressure);
    if (bpMatch) {
      vitalSigns.bloodPressureSystolic = bpMatch[1];
      vitalSigns.bloodPressureDiastolic = bpMatch[2];
    }

    const hrMatch = notes.match(patterns.heartRate);
    if (hrMatch) vitalSigns.heartRate = hrMatch[1];

    const tempMatch = notes.match(patterns.temperature);
    if (tempMatch) vitalSigns.temperature = tempMatch[1];

    const rrMatch = notes.match(patterns.respiratoryRate);
    if (rrMatch) vitalSigns.respiratoryRate = rrMatch[1];

    const o2Match = notes.match(patterns.oxygenSaturation);
    if (o2Match) vitalSigns.oxygenSaturation = o2Match[1];

    const weightMatch = notes.match(patterns.weight);
    if (weightMatch) vitalSigns.weight = weightMatch[1];

    const heightMatch = notes.match(patterns.height);
    if (heightMatch) vitalSigns.height = heightMatch[1];

    const bmiMatch = notes.match(patterns.bmi);
    if (bmiMatch) vitalSigns.bmi = bmiMatch[1];

    return vitalSigns;
  };

  // Update vital signs in record
  const updateVitalSigns = async (recordId: number, updatedVitals: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${patientId}/records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        credentials: 'include',
        body: JSON.stringify({
          metadata: {
            ...(editingRecord.metadata || {}),
            vitals: updatedVitals
          },
          notes: `CONSULTATION RECORD\n\nPatient: ${patientName}\nDate: ${format(new Date(editingRecord.createdAt), 'MMMM dd, yyyy')}\nStatus: Updated\n\nVITAL SIGNS:\n- Blood Pressure: ${updatedVitals.bloodPressureSystolic}/${updatedVitals.bloodPressureDiastolic} mmHg\n- Heart Rate: ${updatedVitals.heartRate} bpm\n- Temperature: ${updatedVitals.temperature}°C\n- Respiratory Rate: ${updatedVitals.respiratoryRate} /min\n- O2 Saturation: ${updatedVitals.oxygenSaturation}%\n- Weight: ${updatedVitals.weight} kg\n- Height: ${updatedVitals.height} cm\n- BMI: ${updatedVitals.bmi}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'records'] });
      
      toast({
        title: "Vital Signs Updated",
        description: "The vital signs have been successfully updated.",
      });

      setIsEditingVitals(false);
      setEditingRecord(null);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update vital signs. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete medical record
  const deleteRecord = async (recordId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${patientId}/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'records'] });
      
      toast({
        title: "Record Deleted",
        description: "The medical record has been successfully deleted.",
      });

      setIsEditingVitals(false);
      setEditingRecord(null);
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete record. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle edit vital signs
  const handleEditVitalSigns = (record: any) => {
    setEditingRecord(record);
    const vitals = parseVitalSigns(record);
    setEditingVitalsData(vitals);
    setIsEditingVitals(true);
  };

  // Handle edit full record
  const handleEditFullRecord = (record: any) => {
    setEditingRecord(record);
    setEditingFullRecordData({
      title: record.title || '',
      notes: record.notes || '',
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || ''
    });
    // Reset validation errors when opening the dialog
    setEditRecordErrors({
      title: "",
      notes: "",
      diagnosis: "",
      treatment: ""
    });
    setIsEditingFullRecord(true);
  };

  // Update full record
  const updateFullRecord = async (recordId: number, data: any) => {
    // Validate all fields before saving
    if (!validateAllEditFields()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${patientId}/records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'records'] });
      
      toast({
        title: "Record Updated",
        description: "The medical record has been updated successfully.",
      });

      setIsEditingFullRecord(false);
      setEditingRecord(null);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update record. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAddingNote(false);
    setEditingRecord(null);
    setActiveTab("vitals");
    setVitals({
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
      temperature: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      weight: "",
      height: "",
      bmi: ""
    });
    form.reset();
  };

  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Consultation Summary</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2 { color: #333; }
              .vitals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
              .vital-item { padding: 10px; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <h1>Consultation Summary</h1>
            <p><strong>Patient:</strong> ${patientName || 'Unknown'}</p>
            <p><strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
            <h2>Vital Signs</h2>
            <div class="vitals">
              <div class="vital-item"><strong>Blood Pressure:</strong> ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg</div>
              <div class="vital-item"><strong>Heart Rate:</strong> ${vitals.heartRate} bpm</div>
              <div class="vital-item"><strong>Temperature:</strong> ${vitals.temperature}°C</div>
              <div class="vital-item"><strong>Respiratory Rate:</strong> ${vitals.respiratoryRate} /min</div>
              <div class="vital-item"><strong>O2 Saturation:</strong> ${vitals.oxygenSaturation}%</div>
              <div class="vital-item"><strong>Weight:</strong> ${vitals.weight} kg</div>
              <div class="vital-item"><strong>Height:</strong> ${vitals.height} cm</div>
              <div class="vital-item"><strong>BMI:</strong> ${vitals.bmi}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case "consultation": return <Stethoscope className="h-4 w-4" />;
      case "prescription": return <Pill className="h-4 w-4" />;
      case "lab_result": return <FileText className="h-4 w-4" />;
      case "imaging": return <FileText className="h-4 w-4" />;
      case "procedure": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case "consultation": return "bg-blue-100 text-blue-800";
      case "prescription": return "bg-green-100 text-green-800";
      case "lab_result": return "bg-yellow-100 text-yellow-800";
      case "imaging": return "bg-purple-100 text-purple-800";
      case "procedure": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Medical Records & Consultation Notes
            </CardTitle>
            {patientName && (
              <p className="text-sm text-muted-foreground dark:text-neutral-300 mt-1">
                {patientName} • Patient ID: {patientNumber}
              </p>
            )}
          </div>
          <Button onClick={() => setIsAddingNote(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
          
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <FullConsultationInterface 
              open={isAddingNote} 
              onOpenChange={(open) => {
                setIsAddingNote(open);
                if (!open) {
                  queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'records'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'consultation-files'] });
                }
              }} 
              patient={patient}
              patientName={patientName}
              patientId={patientId}
            />
          </Suspense>




        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={recordsSectionTab} onValueChange={(v) => setRecordsSectionTab(v as "records" | "consultations")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="records">Medical Records</TabsTrigger>
            <TabsTrigger value="consultations">Consultations</TabsTrigger>
          </TabsList>
          <TabsContent value="records" className="mt-0">
        <div className="space-y-4" style={{ height: '350px', overflowY: 'auto' }}>
          {(() => {
            const recordsToShow = medicalRecords.filter((r: any) => r.title !== "Full Consultation Report");
            return recordsToShow.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-neutral-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No medical records found</p>
              <p className="text-sm">Click "Add Record" to create the first medical record.</p>
            </div>
          ) : (
            recordsToShow.map((record: any) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getRecordIcon(record.type)}
                      <h4 className="font-semibold">{record.title}</h4>
                    </div>
                    <Badge className={getRecordColor(record.type)}>
                      {record.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-neutral-400 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(record.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditFullRecord(record);
                        }}
                        data-testid={`button-edit-record-${record.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRecordToDelete(record);
                          setDeleteDialogOpen(true);
                        }}
                        data-testid={`button-delete-record-${record.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {record.notes && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{record.notes}</p>
                    </div>
                  )}

                  {record.diagnosis && (
                    <div className="mb-3">
                      <h5 className="font-medium text-sm mb-1 dark:text-white">Diagnosis:</h5>
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{record.diagnosis}</p>
                    </div>
                  )}

                  {record.treatment && (
                    <div className="mb-3">
                      <h5 className="font-medium text-sm mb-1 dark:text-white">Treatment:</h5>
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{record.treatment}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )));
          })()}
        </div>
          </TabsContent>
          <TabsContent value="consultations" className="mt-0">
            <div className="space-y-4" style={{ height: "350px", overflowY: "auto" }}>
              {consultationFilesLoading ? (
                <p className="text-sm text-gray-500">Loading consultation PDFs...</p>
              ) : consultationFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-neutral-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No consultation PDFs yet</p>
                  <p className="text-sm">Use &quot;View Full Consultation&quot; in Add Record to generate and save a PDF.</p>
                </div>
              ) : (
                <ul className="space-y-2 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                  {consultationFiles.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <div>
                        <span className="font-medium text-sm">{f.fileName}</span>
                        <span className="text-gray-500 text-sm ml-2">{format(new Date(f.createdAt), "MMM d, yyyy HH:mm")}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleViewConsultationFile(f.id)}>
                          <Download className="w-4 h-4 mr-1" />
                          View / Download
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setConsultationFileToDelete({ id: f.id, fileName: f.fileName });
                            setDeleteConsultationDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Full Record Edit Dialog */}
      <Dialog open={isEditingFullRecord} onOpenChange={setIsEditingFullRecord}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Medical Record
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editingFullRecordData.title || ''}
                className={editRecordErrors.title ? "border-red-500" : ""}
                onChange={(e) => {
                  setEditingFullRecordData((prev: any) => ({ ...prev, title: e.target.value }));
                  setEditRecordErrors((prev) => ({ ...prev, title: "" }));
                }}
                onBlur={(e) => {
                  const error = validateEditTitle(e.target.value);
                  setEditRecordErrors((prev) => ({ ...prev, title: error }));
                }}
                placeholder="Enter record title"
              />
              {editRecordErrors.title && (
                <p className="text-sm text-red-500 mt-1">{editRecordErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editingFullRecordData.notes || ''}
                className={editRecordErrors.notes ? "border-red-500" : ""}
                onChange={(e) => {
                  setEditingFullRecordData((prev: any) => ({ ...prev, notes: e.target.value }));
                  setEditRecordErrors((prev) => ({ ...prev, notes: "" }));
                }}
                onBlur={(e) => {
                  const error = validateEditNotes(e.target.value);
                  setEditRecordErrors((prev) => ({ ...prev, notes: error }));
                }}
                placeholder="Enter clinical notes"
                rows={6}
              />
              {editRecordErrors.notes && (
                <p className="text-sm text-red-500 mt-1">{editRecordErrors.notes}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-diagnosis">Diagnosis</Label>
              <Textarea
                id="edit-diagnosis"
                value={editingFullRecordData.diagnosis || ''}
                className={editRecordErrors.diagnosis ? "border-red-500" : ""}
                onChange={(e) => {
                  setEditingFullRecordData((prev: any) => ({ ...prev, diagnosis: e.target.value }));
                  setEditRecordErrors((prev) => ({ ...prev, diagnosis: "" }));
                }}
                onBlur={(e) => {
                  const error = validateEditDiagnosis(e.target.value);
                  setEditRecordErrors((prev) => ({ ...prev, diagnosis: error }));
                }}
                placeholder="Enter diagnosis"
                rows={4}
              />
              {editRecordErrors.diagnosis && (
                <p className="text-sm text-red-500 mt-1">{editRecordErrors.diagnosis}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-treatment">Treatment</Label>
              <Textarea
                id="edit-treatment"
                value={editingFullRecordData.treatment || ''}
                className={editRecordErrors.treatment ? "border-red-500" : ""}
                onChange={(e) => {
                  setEditingFullRecordData((prev: any) => ({ ...prev, treatment: e.target.value }));
                  setEditRecordErrors((prev) => ({ ...prev, treatment: "" }));
                }}
                onBlur={(e) => {
                  const error = validateEditTreatment(e.target.value);
                  setEditRecordErrors((prev) => ({ ...prev, treatment: error }));
                }}
                placeholder="Enter treatment plan"
                rows={4}
              />
              {editRecordErrors.treatment && (
                <p className="text-sm text-red-500 mt-1">{editRecordErrors.treatment}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingFullRecord(false);
                  setEditingRecord(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateFullRecord(editingRecord?.id, editingFullRecordData)}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vital Signs Edit Dialog */}
      <Dialog open={isEditingVitals} onOpenChange={setIsEditingVitals}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Edit Vital Signs - {editingRecord?.title || 'Medical Record'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Blood Pressure */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Blood Pressure (mmHg)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Systolic"
                    value={editingVitalsData.bloodPressureSystolic || ''}
                    onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, bloodPressureSystolic: e.target.value }))}
                  />
                  <span className="text-2xl self-center">/</span>
                  <Input
                    placeholder="Diastolic"
                    value={editingVitalsData.bloodPressureDiastolic || ''}
                    onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, bloodPressureDiastolic: e.target.value }))}
                  />
                </div>
              </div>

              {/* Heart Rate */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Heart Rate (bpm)
                </Label>
                <Input
                  placeholder="72"
                  value={editingVitalsData.heartRate || ''}
                  onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, heartRate: e.target.value }))}
                />
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperature (°C)
                </Label>
                <Input
                  placeholder="36.5"
                  value={editingVitalsData.temperature || ''}
                  onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, temperature: e.target.value }))}
                />
              </div>

              {/* Respiratory Rate */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Respiratory Rate (/min)
                </Label>
                <Input
                  placeholder="16"
                  value={editingVitalsData.respiratoryRate || ''}
                  onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, respiratoryRate: e.target.value }))}
                />
              </div>

              {/* Oxygen Saturation */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  O2 Saturation (%)
                </Label>
                <Input
                  placeholder="98"
                  value={editingVitalsData.oxygenSaturation || ''}
                  onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, oxygenSaturation: e.target.value }))}
                />
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Weight className="h-4 w-4" />
                  Weight (kg)
                </Label>
                <Input
                  placeholder="70"
                  value={editingVitalsData.weight || ''}
                  onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, weight: e.target.value }))}
                />
              </div>

              {/* Height */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Height (cm)
                </Label>
                <Input
                  placeholder="175"
                  value={editingVitalsData.height || ''}
                  onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, height: e.target.value }))}
                />
              </div>

              {/* BMI */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  BMI
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Calculated automatically"
                    value={editingVitalsData.bmi || ''}
                    onChange={(e) => setEditingVitalsData((prev: any) => ({ ...prev, bmi: e.target.value }))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const heightInCm = parseFloat(editingVitalsData.height);
                      const weightInKg = parseFloat(editingVitalsData.weight);
                      
                      if (heightInCm > 0 && weightInKg > 0) {
                        const heightInM = heightInCm / 100;
                        const bmiValue = (weightInKg / (heightInM * heightInM)).toFixed(1);
                        setEditingVitalsData((prev: any) => ({ ...prev, bmi: bmiValue }));
                      }
                    }}
                  >
                    Calculate
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="destructive"
                onClick={() => {
                  setRecordToDelete(editingRecord);
                  setDeleteDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Delete Record
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingVitals(false);
                    setEditingRecord(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateVitalSigns(editingRecord?.id, editingVitalsData)}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this medical record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the medical record
              {recordToDelete?.title ? ` "${recordToDelete.title}"` : ''} from the patient's history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (recordToDelete?.id) {
                  deleteRecord(recordToDelete.id);
                  setDeleteDialogOpen(false);
                  setRecordToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConsultationDialogOpen} onOpenChange={(open) => { setDeleteConsultationDialogOpen(open); if (!open) setConsultationFileToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete consultation PDF?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the consultation PDF
              {consultationFileToDelete?.fileName ? ` "${consultationFileToDelete.fileName}"` : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingConsultationFile}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingConsultationFile}
              onClick={(e) => { e.preventDefault(); handleDeleteConsultationFile(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingConsultationFile ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}