import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Stethoscope, 
  Pill, 
  Calendar, 
  AlertTriangle,
  Save,
  Printer,
  Plus,
  Minus,
  CheckCircle,
  X,
  Thermometer,
  Scale,
  Ruler,
  Eye,
  Ear,
  Brain,
  Heart,
  Activity,
  User,
  Clock,
  HeartPulse,
  Mic,
  Square,
  Trash2,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, buildUrl } from "@/lib/queryClient";
import jsPDF from "jspdf";
import { useTenant } from "@/hooks/use-tenant";

const fetchImageAsBase64 = async (imagePath: string): Promise<string | null> => {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) {
      console.warn("Image fetch failed:", response.status, response.statusText);
      return null;
    }
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return null;
  }
};

import updatedFacialMuscleImage from "@assets/generated_images/Updated_facial_muscle_diagram.png";
import cleanFacialOutlineV2Image from "@assets/generated_images/Clean_facial_outline_v2.png";

const facialMuscleImage = updatedFacialMuscleImage;
const facialOutlineImage = updatedFacialMuscleImage;
const cleanFacialOutlineV2 = cleanFacialOutlineV2Image;

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

function ConsultationsTabContent({
  patientId,
  files,
  loading,
  onLoad,
  buildUrl,
  getTenantSubdomain,
}: {
  patientId: number;
  files: { id: number; fileName: string; filePath: string; createdAt: string }[];
  loading: boolean;
  onLoad: () => void;
  buildUrl: (path: string) => string;
  getTenantSubdomain: () => string;
}) {
  useEffect(() => {
    onLoad();
  }, [patientId]);
  const handleView = async (fileId: number) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(buildUrl(`/api/consultation-files/${fileId}/download`), {
      headers: {
        Authorization: `Bearer ${token}`,
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
  if (loading) return <p className="text-sm text-gray-500">Loading consultation files...</p>;
  if (files.length === 0) return <p className="text-sm text-gray-500">No consultation PDFs yet. Use &quot;View Full Consultation&quot; to generate and save one.</p>;
  return (
    <ul className="space-y-2 border rounded-lg p-4 bg-gray-50">
      {files.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-200 last:border-0">
          <div>
            <span className="font-medium text-sm">{f.fileName}</span>
            <span className="text-gray-500 text-sm ml-2">{format(new Date(f.createdAt), "MMM d, yyyy HH:mm")}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => handleView(f.id)}>
            <Download className="w-4 h-4 mr-1" />
            View / Download
          </Button>
        </li>
      ))}
    </ul>
  );
}

interface FullConsultationInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
  patientName?: string;
  patientId?: number;
}

interface AnatomicalUploadFile {
  filename: string;
  url: string;
  uploadedAt: string;
  size: number;
}

interface AnatomicalImageFile {
  filename: string;
  url: string;
  uploadedAt: string;
  size: number;
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export function FullConsultationInterface({ open, onOpenChange, patient, patientName, patientId }: FullConsultationInterfaceProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { tenant } = useTenant();

  // Save consultation mutation
  const saveConsultationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to save consultation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultation Saved",
        description: "The consultation record has been saved successfully.",
      });
      const currentPatientId = patientId || patient?.id;
      const token = localStorage.getItem("auth_token");
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save consultation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save vitals mutation
  const saveVitalsMutation = useMutation({
    mutationFn: async (vitalsData: any) => {
      const currentPatientId = patientId || patient?.id;
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify({
          type: 'vitals',
          title: `Vital Signs - ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
          notes: `Blood Pressure: ${vitalsData.bloodPressure || 'N/A'}\nHeart Rate: ${vitalsData.heartRate || 'N/A'} bpm\nTemperature: ${vitalsData.temperature || 'N/A'}°C\nRespiratory Rate: ${vitalsData.respiratoryRate || 'N/A'}/min\nOxygen Saturation: ${vitalsData.oxygenSaturation || 'N/A'}%\nWeight: ${vitalsData.weight || 'N/A'} kg\nHeight: ${vitalsData.height || 'N/A'} cm\nBMI: ${vitalsData.bmi || 'N/A'}`,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save vitals');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vitals Saved",
        description: "The vital signs have been saved to medical records successfully.",
      });
      const currentPatientId = patientId || patient?.id;
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save vitals. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle save vitals
  const handleSaveVitals = () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      toast({
        title: "Error",
        description: "Patient information is missing. Cannot save vitals.",
        variant: "destructive",
      });
      return;
    }

    // Validate vitals before saving
    if (!validateAllVitals()) {
      return;
    }

    saveVitalsMutation.mutate(vitals);
  };

  // Save history mutation
  const saveHistoryMutation = useMutation({
    mutationFn: async (historyData: any) => {
      const currentPatientId = patientId || patient?.id;
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'history',
          title: `Medical History - ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
          notes: `Chief Complaint: ${historyData.chiefComplaint || 'N/A'}\n\nHistory of Presenting Complaint: ${historyData.historyPresentingComplaint || 'N/A'}\n\nReview of Systems:\n- Cardiovascular: ${historyData.reviewOfSystems?.cardiovascular || 'N/A'}\n- Respiratory: ${historyData.reviewOfSystems?.respiratory || 'N/A'}\n- Gastrointestinal: ${historyData.reviewOfSystems?.gastrointestinal || 'N/A'}\n- Genitourinary: ${historyData.reviewOfSystems?.genitourinary || 'N/A'}\n- Neurological: ${historyData.reviewOfSystems?.neurological || 'N/A'}\n- Musculoskeletal: ${historyData.reviewOfSystems?.musculoskeletal || 'N/A'}\n- Skin: ${historyData.reviewOfSystems?.skin || 'N/A'}\n- Psychiatric: ${historyData.reviewOfSystems?.psychiatric || 'N/A'}`,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save history');
      }
      return response.json();
    },
    onSuccess: () => {
      const currentPatientId = patientId || patient?.id;
      const subdomain = getTenantSubdomain();
      toast({
        title: "History Saved",
        description: "The medical history has been saved to medical records successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      // Navigate to Medical Records & Consultation Notes
      onOpenChange(false);
      setLocation(`/${subdomain}/patients/${currentPatientId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save history. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle save history
  const handleSaveHistory = () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      toast({
        title: "Error",
        description: "Patient information is missing. Cannot save history.",
        variant: "destructive",
      });
      return;
    }

    // Validate history before saving
    if (!validateAllHistory()) {
      return;
    }

    const historyData = {
      chiefComplaint: consultationData.chiefComplaint,
      historyPresentingComplaint: consultationData.historyPresentingComplaint,
      reviewOfSystems: consultationData.reviewOfSystems
    };

    saveHistoryMutation.mutate(historyData);
  };

  // Examination states
  const [examinationDiagnosis, setExaminationDiagnosis] = useState('');
  const [examinationTreatmentPlan, setExaminationTreatmentPlan] = useState('');

  // Save examination mutation
  const saveExaminationMutation = useMutation({
    mutationFn: async (examinationData: any) => {
      const currentPatientId = patientId || patient?.id;
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'examination',
          title: `Clinical Examination - ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
          notes: `Clinical Notes: ${examinationData.clinicalNotes || 'N/A'}\n\nDiagnosis: ${examinationData.diagnosis || 'N/A'}\n\nTreatment Plan: ${examinationData.treatmentPlan || 'N/A'}\n\nExamination Type: ${examinationData.examinationType || 'N/A'}`,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save examination');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Examination Saved",
        description: "The examination record has been saved to medical records successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient?.id, 'records'] });
      // Navigate to Medical Records & Consultation Notes
      onOpenChange(false);
      setLocation(`/${getTenantSubdomain()}/patients/${patient?.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save examination. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle save examination
  const handleSaveExamination = () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      toast({
        title: "Error",
        description: "Patient information is missing. Cannot save examination.",
        variant: "destructive",
      });
      return;
    }

    // Validate examination before saving
    if (!validateAllExamination()) {
      return;
    }

    const examinationData = {
      clinicalNotes: clinicalNotes + transcript,
      diagnosis: examinationDiagnosis,
      treatmentPlan: examinationTreatmentPlan,
      examinationType: selectedExaminationType
    };

    saveExaminationMutation.mutate(examinationData);
  };

  // Save assessment mutation
  const saveAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: any) => {
      const currentPatientId = patientId || patient?.id;
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify({
          type: 'assessment',
          title: `Clinical Assessment - ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
          notes: assessmentData.assessment || '',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save assessment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment Saved",
        description: "The clinical assessment has been saved to medical records successfully.",
      });
      const currentPatientId = patientId || patient?.id;
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle save assessment
  const handleSaveAssessment = () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      toast({
        title: "Error",
        description: "Patient information is missing. Cannot save assessment.",
        variant: "destructive",
      });
      return;
    }

    // Validate assessment before saving
    if (!validateAssessment()) {
      return;
    }

    const assessmentData = {
      assessment: consultationData.assessment
    };

    saveAssessmentMutation.mutate(assessmentData);
  };

  // Save summary mutation
  const saveSummaryMutation = useMutation({
    mutationFn: async (summaryData: any) => {
      const currentPatientId = patientId || patient?.id;
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify({
          type: 'summary',
          title: `Consultation Summary - ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
          notes: summaryData.summaryText || '',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save summary');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Summary Saved",
        description: "The consultation summary has been saved to medical records successfully.",
      });
      const currentPatientId = patientId || patient?.id;
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save summary. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle save summary
  const handleSaveSummary = () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      toast({
        title: "Error",
        description: "Patient information is missing. Cannot save summary.",
        variant: "destructive",
      });
      return;
    }

    // Create a comprehensive summary text from all consultation data
    const summaryText = `Chief Complaint: ${consultationData.chiefComplaint || 'Not recorded'}

Assessment: ${consultationData.assessment || 'Not recorded'}

Plan: ${consultationData.plan || 'Not recorded'}

${
      consultationData.prescriptions.length > 0 
        ? `Prescriptions (${consultationData.prescriptions.length}):\n${consultationData.prescriptions.map(rx => `- ${rx.medication} ${rx.dosage}, ${rx.frequency} for ${rx.duration}${rx.instructions ? ' - ' + rx.instructions : ''}`).join('\n')}\n\n`
        : ''
    }${
      consultationData.referrals.length > 0 
        ? `Referrals (${consultationData.referrals.length}):\n${consultationData.referrals.map(ref => `- ${ref.specialty} (${ref.urgency}) - ${ref.reason}`).join('\n')}\n\n`
        : ''
    }${
      consultationData.investigations.length > 0 
        ? `Investigations (${consultationData.investigations.length}):\n${consultationData.investigations.map(inv => `- ${inv.type} (${inv.urgency}) - ${inv.reason}`).join('\n')}`
        : ''
    }`;

    const summaryData = {
      summaryText: summaryText.trim()
    };

    saveSummaryMutation.mutate(summaryData);
  };

  // Handle view full consultation - generates and downloads full consultation report as PDF
  const handleViewFullConsultation = async () => {
    const currentPatientId = patientId || patient?.id;
    const currentPatientName = patientName || (patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient');
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': getTenantSubdomain()
      };

      // Fetch header/footer with same auth and credentials as rest of app so PDF can access them
      const fetchOpts = { headers, credentials: 'include' as RequestCredentials };
      let clinicHeader: any = null;
      let clinicFooter: any = null;
      try {
        const [headerRes, footerRes] = await Promise.all([
          fetch(buildUrl('/api/clinic-headers'), fetchOpts),
          fetch(buildUrl('/api/clinic-footers'), fetchOpts)
        ]);
        if (headerRes.ok) {
          clinicHeader = await headerRes.json();
        }
        if (footerRes.ok) {
          clinicFooter = await footerRes.json();
        }
      } catch (e) {
        console.warn('[View Full Consultation] Could not load clinic header/footer:', e);
      }

      let patientRecords: any = null;
      if (currentPatientId) {
        const patientRecordsRes = await fetch(buildUrl(`/api/patients/${currentPatientId}/records`), fetchOpts).catch(() => null);
        patientRecords = patientRecordsRes?.ok ? await patientRecordsRes.json() : null;
      }

      let dbVitals: any = {};
      if (patientRecords?.length > 0) {
        const vitalsRecord = patientRecords.find((r: any) => r.type === 'vitals');
        if (vitalsRecord?.notes) {
          const notesLines = vitalsRecord.notes.split('\n');
          notesLines.forEach((line: string) => {
            const [key, value] = line.split(':').map((s: string) => s.trim());
            if (key && value) {
              if (key === 'Blood Pressure') dbVitals.bloodPressure = value;
              if (key === 'Heart Rate') dbVitals.heartRate = value.replace(' bpm', '');
              if (key === 'Temperature') dbVitals.temperature = value.replace('°C', '');
              if (key === 'Respiratory Rate') dbVitals.respiratoryRate = value.replace('/min', '');
              if (key === 'Oxygen Saturation') dbVitals.oxygenSaturation = value.replace('%', '');
              if (key === 'Weight') dbVitals.weight = value.replace(' kg', '');
              if (key === 'Height') dbVitals.height = value.replace(' cm', '');
              if (key === 'BMI') dbVitals.bmi = value;
            }
          });
        }
      }

      const finalVitals = {
        bloodPressure: vitals.bloodPressure || dbVitals.bloodPressure || 'Not recorded',
        heartRate: vitals.heartRate || dbVitals.heartRate || 'Not recorded',
        temperature: vitals.temperature || dbVitals.temperature || 'Not recorded',
        respiratoryRate: vitals.respiratoryRate || dbVitals.respiratoryRate || 'Not recorded',
        oxygenSaturation: vitals.oxygenSaturation || dbVitals.oxygenSaturation || 'Not recorded',
        weight: vitals.weight || dbVitals.weight || 'Not recorded',
        height: vitals.height || dbVitals.height || 'Not recorded',
        bmi: vitals.bmi || dbVitals.bmi || 'Not recorded'
      };

      const pdf = new jsPDF();
      let yPosition = 15;
      const lineHeight = 5.5;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginLeft = 15;
      const marginRight = 15;
      const maxWidth = pageWidth - marginLeft - marginRight;
      const bodyFontSize = 10; // 10px body text; headings use addSection (12px) or title (14px)

      // Header from clinic_headers: one row, logo top-left, details to the right (no blue lines)
      const addHeader = () => {
        const headerHeight = 32;
        pdf.setTextColor(0, 0, 0);
        if (clinicHeader) {
          const logoSize = 24;
          const logoTextGap = 6;
          const textStartX = marginLeft + (clinicHeader.logoBase64 ? logoSize + logoTextGap : 0);

          if (clinicHeader.logoBase64) {
            try {
              pdf.addImage(clinicHeader.logoBase64, 'PNG', marginLeft, 5, logoSize, logoSize);
            } catch {
              // skip logo if invalid
            }
          }

          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(clinicHeader.clinicName || 'Clinic', textStartX, 12);

          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          let infoY = 17;
          if (clinicHeader.address) {
            pdf.text(clinicHeader.address, textStartX, infoY);
            infoY += 4;
          }
          if (clinicHeader.phone || clinicHeader.email) {
            const contact = [clinicHeader.phone, clinicHeader.email].filter(Boolean).join(' | ');
            pdf.text(contact, textStartX, infoY);
            infoY += 4;
          }
          if (clinicHeader.website) {
            pdf.text(clinicHeader.website, textStartX, infoY);
          }
        } else {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Consultation Report', marginLeft, 12);
        }
        yPosition = headerHeight + 10;
      };

      // Footer from clinic_footers: small font, centered (no blue bar to match sample)
      const addFooter = (pageNum: number) => {
        const footerY = pageHeight - 12;
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        if (clinicFooter?.footerText) {
          pdf.text(clinicFooter.footerText, pageWidth / 2, footerY - 2, { align: 'center' });
        }
        pdf.text(`Page ${pageNum}`, pageWidth - marginRight, footerY + 4, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
      };

      const addText = (text: string, fontSize: number = bodyFontSize, isBold: boolean = false) => {
        const footerSpace = 18;
        if (yPosition > pageHeight - footerSpace) {
          addFooter(pdf.getCurrentPageInfo().pageNumber);
          pdf.addPage();
          addHeader();
        }
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setTextColor(0, 0, 0);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, marginLeft, yPosition);
        yPosition += lines.length * lineHeight;
      };

      // Section heading: black, no blue line (spacing only)
      const addSection = (title: string) => {
        yPosition += 6;
        addText(title, 12, true);
        yPosition += 2;
      };

      addHeader();

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('FULL CONSULTATION REPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      addText(`Patient: ${currentPatientName}`, bodyFontSize, true);
      addText(`Date: ${format(new Date(), 'MMMM dd, yyyy - HH:mm')}`, bodyFontSize);
      addText(`Consultation ID: ${currentPatientId}-${Date.now()}`, bodyFontSize);

      addSection('VITALS');
      addText(`Blood Pressure: ${finalVitals.bloodPressure}`);
      addText(`Heart Rate: ${finalVitals.heartRate} ${finalVitals.heartRate !== 'Not recorded' ? 'bpm' : ''}`);
      addText(`Temperature: ${finalVitals.temperature} ${finalVitals.temperature !== 'Not recorded' ? '°C' : ''}`);
      addText(`Respiratory Rate: ${finalVitals.respiratoryRate} ${finalVitals.respiratoryRate !== 'Not recorded' ? '/min' : ''}`);
      addText(`Oxygen Saturation: ${finalVitals.oxygenSaturation} ${finalVitals.oxygenSaturation !== 'Not recorded' ? '%' : ''}`);
      addText(`Weight: ${finalVitals.weight} ${finalVitals.weight !== 'Not recorded' ? 'kg' : ''}`);
      addText(`Height: ${finalVitals.height} ${finalVitals.height !== 'Not recorded' ? 'cm' : ''}`);
      addText(`BMI: ${finalVitals.bmi}`);

      addSection('HISTORY');
      addText('Chief Complaint:', 10, true);
      addText(consultationData.chiefComplaint || 'Not recorded');
      yPosition += 2;
      addText('History of Presenting Complaint:', 10, true);
      addText(consultationData.historyPresentingComplaint || 'Not recorded');
      yPosition += 2;
      addText('Review of Systems:', 10, true);
      addText(`• Cardiovascular: ${consultationData.reviewOfSystems?.cardiovascular || 'Not recorded'}`);
      addText(`• Respiratory: ${consultationData.reviewOfSystems?.respiratory || 'Not recorded'}`);
      addText(`• Gastrointestinal: ${consultationData.reviewOfSystems?.gastrointestinal || 'Not recorded'}`);
      addText(`• Genitourinary: ${consultationData.reviewOfSystems?.genitourinary || 'Not recorded'}`);
      addText(`• Neurological: ${consultationData.reviewOfSystems?.neurological || 'Not recorded'}`);
      addText(`• Musculoskeletal: ${consultationData.reviewOfSystems?.musculoskeletal || 'Not recorded'}`);
      addText(`• Skin: ${consultationData.reviewOfSystems?.skin || 'Not recorded'}`);
      addText(`• Psychiatric: ${consultationData.reviewOfSystems?.psychiatric || 'Not recorded'}`);

      addSection('EXAMINATION');
      addText(clinicalNotes || 'Not recorded');
      if (transcript) {
        addText(`[Live Transcript: ${transcript}]`, bodyFontSize);
      }

      addSection('ASSESSMENT');
      addText(consultationData.assessment || 'Not recorded');

      addSection('PROFESSIONAL ANATOMICAL ANALYSIS');
      if (selectedMuscleGroup || selectedAnalysisType) {
        addText(`Target Muscle Group: ${selectedMuscleGroup ? selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}`);
        addText(`Analysis Type: ${selectedAnalysisType ? selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}`);
      } else {
        addText('No anatomical analysis performed during this consultation.');
      }

      addSection('GENERATED TREATMENT PLAN');
      if (generatedTreatmentPlan) {
        addText(generatedTreatmentPlan);
      } else {
        addText('No treatment plan generated during this consultation.');
      }

      addSection('PLAN');
      addText('Management Plan:', 10, true);
      addText(consultationData.plan || 'Not recorded');

      if (consultationData.prescriptions.length > 0) {
        yPosition += 2;
        addText(`Prescriptions (${consultationData.prescriptions.length}):`, 10, true);
        consultationData.prescriptions.forEach((rx, idx) => {
          addText(`${idx + 1}. ${rx.medication} ${rx.dosage}`);
          addText(`   ${rx.frequency} for ${rx.duration}`);
          if (rx.instructions) {
            addText(`   Instructions: ${rx.instructions}`);
          }
        });
      }

      if (consultationData.referrals.length > 0) {
        yPosition += 2;
        addText(`Referrals (${consultationData.referrals.length}):`, 10, true);
        consultationData.referrals.forEach((ref, idx) => {
          addText(`${idx + 1}. ${ref.specialty} - ${ref.urgency.toUpperCase()}`);
          addText(`   Reason: ${ref.reason}`);
        });
      }

      if (consultationData.investigations.length > 0) {
        yPosition += 2;
        addText(`Investigations (${consultationData.investigations.length}):`, 10, true);
        consultationData.investigations.forEach((inv, idx) => {
          addText(`${idx + 1}. ${inv.type} - ${inv.urgency.toUpperCase()}`);
          addText(`   Reason: ${inv.reason}`);
        });
      }

      addFooter(pdf.getCurrentPageInfo().pageNumber);

      const dataUrl = pdf.output("dataurlstring");
      const pdfBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";

      if (currentPatientId && pdfBase64) {
        const token = localStorage.getItem("auth_token");
        const saveRes = await fetch(buildUrl("/api/consultation-pdf/save"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Tenant-Subdomain": getTenantSubdomain(),
          },
          credentials: "include",
          body: JSON.stringify({ patientId: currentPatientId, pdfBase64 }),
        });
        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({}));
          toast({
            title: "PDF saved locally only",
            description: err?.error || "Could not save consultation to server.",
            variant: "destructive",
          });
        } else if (currentPatientId) {
          refetchConsultationFiles(currentPatientId);
        }
      }

      pdf.save(`Consultation_${currentPatientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);

      toast({
        title: "PDF Report Generated",
        description: pdfBase64 && currentPatientId
          ? "Full consultation report has been downloaded and saved to Consultations."
          : "Full consultation report with clinic branding has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle save consultation
  const handleSaveConsultation = () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      toast({
        title: "Error",
        description: "Patient information is missing. Cannot save consultation.",
        variant: "destructive",
      });
      return;
    }

    // Map the consultation data to match backend schema exactly
    const consultationRecord = {
      patientId: currentPatientId,
      chiefComplaint: consultationData.chiefComplaint || "",
      historyPresentingComplaint: consultationData.historyPresentingComplaint || "",
      reviewOfSystems: {
        cardiovascular: consultationData.reviewOfSystems?.cardiovascular || "",
        respiratory: consultationData.reviewOfSystems?.respiratory || "",
        gastrointestinal: consultationData.reviewOfSystems?.gastrointestinal || "",
        genitourinary: consultationData.reviewOfSystems?.genitourinary || "",
        neurological: consultationData.reviewOfSystems?.neurological || "",
        musculoskeletal: consultationData.reviewOfSystems?.musculoskeletal || "",
        skin: consultationData.reviewOfSystems?.skin || "",
        psychiatric: consultationData.reviewOfSystems?.psychiatric || ""
      },
      examination: {
        general: consultationData.examination?.general || "",
        cardiovascular: consultationData.examination?.cardiovascular || "",
        respiratory: consultationData.examination?.respiratory || "",
        abdomen: consultationData.examination?.abdomen || "",
        neurological: consultationData.examination?.neurological || "",
        musculoskeletal: consultationData.examination?.musculoskeletal || "",
        skin: consultationData.examination?.skin || "",
        head_neck: consultationData.examination?.head_neck || "",
        ears_nose_throat: consultationData.examination?.ears_nose_throat || ""
      },
      vitals: {
        bloodPressure: vitals.bloodPressure || "",
        heartRate: vitals.heartRate || "",
        temperature: vitals.temperature || "",
        respiratoryRate: vitals.respiratoryRate || "",
        oxygenSaturation: vitals.oxygenSaturation || "",
        weight: vitals.weight || "",
        height: vitals.height || "",
        bmi: vitals.bmi || ""
      },
      assessment: consultationData.assessment || "",
      plan: consultationData.plan || "",
      prescriptions: consultationData.prescriptions || [],
      referrals: consultationData.referrals || [],
      investigations: consultationData.investigations || [],
      followUp: {
        required: false,
        timeframe: "",
        reason: ""
      },
      consultationDate: new Date().toISOString()
    };

    saveConsultationMutation.mutate(consultationRecord);
  };

  // Speech recognition functions
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Please type your notes manually.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone. Your speech will be transcribed in real-time.",
      });
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        setClinicalNotes(prev => prev + finalTranscript + ' ');
        setTranscript('');
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      toast({
        title: "Recording Error",
        description: "There was an error with speech recognition. Please try again.",
        variant: "destructive",
      });
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setTranscript('');
      toast({
        title: "Recording Stopped",
        description: "Transcription completed. You can continue typing or start recording again.",
      });
    }
  };
  const [activeTab, setActiveTab] = useState("vitals");
  const [consultationStartTime] = useState(new Date());
  
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bmi: ""
  });

  const [vitalsErrors, setVitalsErrors] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bmi: ""
  });

  // Vitals validation functions
  const validateBloodPressure = (value: string): string => {
    if (!value) return "";
    const bpPattern = /^\d{2,3}\/\d{2,3}$/;
    if (!bpPattern.test(value)) {
      return "Must match pattern: NNN/NNN (e.g., 120/80)";
    }
    const [systolic, diastolic] = value.split('/').map(Number);
    if (systolic < 90 || systolic > 200) {
      return "Systolic must be between 90-200";
    }
    if (diastolic < 60 || diastolic > 130) {
      return "Diastolic must be between 60-130";
    }
    return "";
  };

  const validateHeartRate = (value: string): string => {
    if (!value) return "Required";
    const num = Number(value);
    if (isNaN(num) || num < 30 || num > 200) {
      return "Range: 30-200 bpm";
    }
    return "";
  };

  const validateTemperature = (value: string): string => {
    if (!value) return "Required";
    const num = parseFloat(value);
    if (isNaN(num) || num < 35.0 || num > 42.0) {
      return "Range: 35.0-42.0°C";
    }
    return "";
  };

  const validateRespiratoryRate = (value: string): string => {
    if (!value) return "Required";
    const num = Number(value);
    if (isNaN(num) || num < 8 || num > 40) {
      return "Range: 8-40 breaths/min";
    }
    return "";
  };

  const validateOxygenSaturation = (value: string): string => {
    if (!value) return "Required";
    const num = Number(value);
    if (isNaN(num) || num < 70 || num > 100) {
      return "Range: 70-100%";
    }
    return "";
  };

  const validateWeight = (value: string): string => {
    if (!value) return "Required";
    const num = parseFloat(value);
    if (isNaN(num) || num < 2 || num > 300) {
      return "Range: 2-300 kg";
    }
    return "";
  };

  const validateHeight = (value: string): string => {
    if (!value) return "Required";
    const num = parseFloat(value);
    if (isNaN(num) || num < 30 || num > 250) {
      return "Range: 30-250 cm";
    }
    return "";
  };

  const validateBMI = (value: string): string => {
    if (!value) return ""; // BMI is optional
    const num = parseFloat(value);
    if (isNaN(num) || num < 10 || num > 60) {
      return "Range: 10-60";
    }
    return "";
  };

  const validateAllVitals = (): boolean => {
    const errors = {
      bloodPressure: validateBloodPressure(vitals.bloodPressure),
      heartRate: validateHeartRate(vitals.heartRate),
      temperature: validateTemperature(vitals.temperature),
      respiratoryRate: validateRespiratoryRate(vitals.respiratoryRate),
      oxygenSaturation: validateOxygenSaturation(vitals.oxygenSaturation),
      weight: validateWeight(vitals.weight),
      height: validateHeight(vitals.height),
      bmi: validateBMI(vitals.bmi)
    };

    setVitalsErrors(errors);

    // Check if there are any errors
    return !Object.values(errors).some(error => error !== "");
  };

  const [consultationData, setConsultationData] = useState({
    chiefComplaint: "",
    historyPresentingComplaint: "",
    reviewOfSystems: {
      cardiovascular: "",
      respiratory: "",
      gastrointestinal: "",
      genitourinary: "",
      neurological: "",
      musculoskeletal: "",
      skin: "",
      psychiatric: ""
    },
    examination: {
      general: "",
      cardiovascular: "",
      respiratory: "",
      abdomen: "",
      neurological: "",
      musculoskeletal: "",
      skin: "",
      head_neck: "",
      ears_nose_throat: ""
    },
    assessment: "",
    plan: "",
    prescriptions: [] as Array<{
      medication: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>,
    followUp: {
      required: false,
      timeframe: "",
      reason: ""
    },
    referrals: [] as Array<{
      specialty: string;
      urgency: "routine" | "urgent" | "2ww";
      reason: string;
    }>,
    investigations: [] as Array<{
      type: string;
      urgency: "routine" | "urgent";
      reason: string;
    }>
  });

  // History validation state
  const [historyErrors, setHistoryErrors] = useState({
    chiefComplaint: "",
    historyPresentingComplaint: "",
    reviewOfSystems: {
      cardiovascular: "",
      respiratory: "",
      gastrointestinal: "",
      genitourinary: "",
      neurological: "",
      musculoskeletal: "",
      skin: "",
      psychiatric: ""
    }
  });

  // History validation functions
  const validateTextField = (value: string, fieldName: string, minLength: number = 5, maxLength: number = 255): string => {
    // If field is optional (minLength = 0) and empty, no error
    if (minLength === 0 && (!value || value.trim().length === 0)) {
      return "";
    }
    
    // If field is required and empty
    if (!value || value.trim().length === 0) {
      return `${fieldName} is required and must be at least ${minLength} characters.`;
    }
    
    // If field has content but below minimum
    if (value.trim().length < minLength) {
      return `${fieldName} must be at least ${minLength} characters.`;
    }
    
    // If field exceeds maximum
    if (value.length > maxLength) {
      return `${fieldName} must not exceed ${maxLength} characters.`;
    }
    
    return "";
  };

  const validateAllHistory = (): boolean => {
    const errors = {
      chiefComplaint: validateTextField(consultationData.chiefComplaint, "Chief Complaint", 5, 255),
      historyPresentingComplaint: validateTextField(consultationData.historyPresentingComplaint, "History of Presenting Complaint", 5, 500),
      reviewOfSystems: {
        cardiovascular: validateTextField(consultationData.reviewOfSystems.cardiovascular, "Cardiovascular", 0, 500),
        respiratory: validateTextField(consultationData.reviewOfSystems.respiratory, "Respiratory", 0, 500),
        gastrointestinal: validateTextField(consultationData.reviewOfSystems.gastrointestinal, "Gastrointestinal", 0, 500),
        genitourinary: validateTextField(consultationData.reviewOfSystems.genitourinary, "Genitourinary", 0, 500),
        neurological: validateTextField(consultationData.reviewOfSystems.neurological, "Neurological", 0, 500),
        musculoskeletal: validateTextField(consultationData.reviewOfSystems.musculoskeletal, "Musculoskeletal", 0, 500),
        skin: validateTextField(consultationData.reviewOfSystems.skin, "Skin", 0, 500),
        psychiatric: validateTextField(consultationData.reviewOfSystems.psychiatric, "Psychiatric", 0, 500)
      }
    };

    setHistoryErrors(errors);

    // Check if there are any errors
    const hasMainFieldErrors = errors.chiefComplaint !== "" || errors.historyPresentingComplaint !== "";
    const hasReviewErrors = Object.values(errors.reviewOfSystems).some(error => error !== "");
    
    return !hasMainFieldErrors && !hasReviewErrors;
  };

  // Examination validation state
  const [examinationErrors, setExaminationErrors] = useState({
    clinicalNotes: "",
    diagnosis: "",
    treatmentPlan: ""
  });

  // Examination validation functions
  const validateExaminationField = (value: string, fieldName: string, minLength: number = 5, maxLength: number = 500): string => {
    if (!value || value.trim().length === 0) {
      return `${fieldName} is required and must be at least ${minLength} characters.`;
    }
    if (value.trim().length < minLength) {
      return `${fieldName} must be at least ${minLength} characters.`;
    }
    if (value.length > maxLength) {
      return `${fieldName} must not exceed ${maxLength} characters.`;
    }
    return "";
  };

  const validateAllExamination = (): boolean => {
    const errors = {
      clinicalNotes: validateExaminationField(clinicalNotes + transcript, "Clinical Notes", 5, 500),
      diagnosis: validateExaminationField(examinationDiagnosis, "Diagnosis", 5, 500),
      treatmentPlan: validateExaminationField(examinationTreatmentPlan, "Treatment Plan", 5, 500)
    };

    setExaminationErrors(errors);

    // Check if there are any errors
    return !Object.values(errors).some(error => error !== "");
  };

  // Assessment validation state
  const [assessmentError, setAssessmentError] = useState("");

  // Assessment validation function
  const validateAssessmentField = (value: string): string => {
    // Required field - check if empty or below minimum
    if (!value || value.trim().length === 0 || value.trim().length < 5) {
      return "Diagnosis and Treatment Plan is required and must be at least 5 characters.";
    }
    
    // If field exceeds maximum
    if (value.length > 255) {
      return "Diagnosis and Treatment Plan must not exceed 255 characters.";
    }
    
    return "";
  };

  const validateAssessment = (): boolean => {
    const error = validateAssessmentField(consultationData.assessment);
    setAssessmentError(error);
    return error === "";
  };

  // Plan validation state
  const [planError, setPlanError] = useState("");

  // Plan validation function
  const validatePlanField = (value: string): string => {
    // Required field - check if empty or below minimum
    if (!value || value.trim().length === 0 || value.trim().length < 5) {
      return "Management Plan is required and must be at least 5 characters.";
    }
    
    // If field exceeds maximum
    if (value.length > 255) {
      return "Management Plan must not exceed 255 characters.";
    }
    
    return "";
  };

  const validatePlan = (): boolean => {
    const error = validatePlanField(consultationData.plan);
    setPlanError(error);
    return error === "";
  };

  // Examination modal states
  const [selectedExaminationType, setSelectedExaminationType] = useState<string>("");
  const [showAnatomicalModal, setShowAnatomicalModal] = useState(false);
  const [showGeneralExamModal, setShowGeneralExamModal] = useState(false);
  const [showCardiovascularExamModal, setShowCardiovascularExamModal] = useState(false);
  const [showRespiratoryExamModal, setShowRespiratoryExamModal] = useState(false);
  const [showNeurologicalExamModal, setShowNeurologicalExamModal] = useState(false);
  const [showPhysicalExamModal, setShowPhysicalExamModal] = useState(false);
  const [showViewAnatomicalDialog, setShowViewAnatomicalDialog] = useState(false);
  const [savedAnatomicalImage, setSavedAnatomicalImage] = useState<string | null>(null);
  const [showPdfSavedModal, setShowPdfSavedModal] = useState(false);
  const [savedPdfFilename, setSavedPdfFilename] = useState("");
  const [savedPdfUrl, setSavedPdfUrl] = useState<string | null>(null);
  const [savedPdfAbsolutePath, setSavedPdfAbsolutePath] = useState<string | null>(null);
  const handlePdfModalOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSavedPdfFilename("");
      setSavedPdfUrl(null);
      setSavedPdfAbsolutePath(null);
    }
    setShowPdfSavedModal(open);
  }, []);
  const [isViewAnalysisDownloading, setIsViewAnalysisDownloading] = useState(false);
  const [anatomicalUploadsTab, setAnatomicalUploadsTab] = useState<"overview" | "uploads" | "consultations">("overview");
  const [consultationFiles, setConsultationFiles] = useState<{ id: number; fileName: string; filePath: string; createdAt: string }[]>([]);
  const [consultationFilesLoading, setConsultationFilesLoading] = useState(false);
  const refetchConsultationFiles = useCallback((pid: number) => {
    setConsultationFilesLoading(true);
    fetch(buildUrl(`/api/patients/${pid}/consultation-files`), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        "X-Tenant-Subdomain": getTenantSubdomain(),
      },
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setConsultationFiles(Array.isArray(data) ? data : []))
      .catch(() => setConsultationFiles([]))
      .finally(() => setConsultationFilesLoading(false));
  }, [buildUrl, getTenantSubdomain]);
  const [uploadsSubTab, setUploadsSubTab] = useState<"files" | "image">("files");
  const [anatomicalFiles, setAnatomicalFiles] = useState<AnatomicalUploadFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [anatomicalImageFiles, setAnatomicalImageFiles] = useState<AnatomicalImageFile[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const fetchAnatomicalFiles = useCallback(async () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      setAnatomicalFiles([]);
      setFilesError("Patient information is missing.");
      return;
    }

    setFilesLoading(true);
    setFilesError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/anatomical-analysis/files/${currentPatientId}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnatomicalFiles(data.files || []);
    } catch (error: any) {
      console.error("[ANATOMICAL FILES] Failed to load uploads:", error);
      setFilesError(error?.message || "Unable to load anatomical analysis uploads.");
      toast({
        title: "Unable to load uploads",
        description: error?.message || "Failed to fetch anatomical analysis uploads.",
        variant: "destructive",
      });
    } finally {
      setFilesLoading(false);
    }
  }, [patientId, patient?.id, toast]);

  const handleDeleteAnatomicalFile = useCallback(async (filename: string) => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) return;

    setDeletingFile(filename);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/anatomical-analysis/files/${currentPatientId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || `HTTP ${response.status}`);
      }

      setAnatomicalFiles((prev) => prev.filter((file) => file.filename !== filename));
      toast({
        title: "File deleted",
        description: `${filename} removed from anatomical analysis uploads.`,
      });
    } catch (error: any) {
      console.error("[ANATOMICAL FILES] Delete failed:", error);
      toast({
        title: "Delete failed",
        description: error?.message || "Unable to delete the file.",
        variant: "destructive",
      });
    } finally {
      setDeletingFile(null);
    }
  }, [patientId, patient?.id, toast]);

  const fetchAnatomicalImages = useCallback(async () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      setAnatomicalImageFiles([]);
      setSavedAnatomicalImage(null);
      return;
    }

    setImagesLoading(true);
    setImagesError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/anatomical-analysis/images/${currentPatientId}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Unable to load anatomical image (${response.status})`);
      }

      const data = await response.json();
      const files: AnatomicalImageFile[] = data.files || [];
      setAnatomicalImageFiles(files);
      setSavedAnatomicalImage(files[0]?.url || null);
    } catch (error: any) {
      console.error("[ANATOMICAL IMAGES] Failed to load image:", error);
      setImagesError(error?.message || "Unable to load anatomical analysis image.");
      toast({
        title: "Unable to load anatomical image",
        description: error?.message || "Failed to fetch anatomical analysis image.",
        variant: "destructive",
      });
    } finally {
      setImagesLoading(false);
    }
  }, [patientId, patient?.id, toast]);

  useEffect(() => {
    if (showViewAnatomicalDialog) {
      fetchAnatomicalFiles();
      fetchAnatomicalImages();
    }
  }, [fetchAnatomicalFiles, fetchAnatomicalImages, showViewAnatomicalDialog]);

  useEffect(() => {
    const handleAnatomicalFilesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId: number }>)?.detail;
      const currentPatientId = patientId || patient?.id;
      if (detail?.patientId && currentPatientId && detail.patientId !== currentPatientId) {
        return;
      }

      fetchAnatomicalFiles();
      fetchAnatomicalImages();
    };

    window.addEventListener("anatomicalFilesUpdated", handleAnatomicalFilesUpdated);
    return () => {
      window.removeEventListener("anatomicalFilesUpdated", handleAnatomicalFilesUpdated);
    };
  }, [fetchAnatomicalFiles, fetchAnatomicalImages, patientId, patient?.id]);

  // Anatomical analysis state
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [selectedTreatmentIntensity, setSelectedTreatmentIntensity] = useState<string>("");
  const [selectedSessionFrequency, setSelectedSessionFrequency] = useState<string>("");
  const [primarySymptoms, setPrimarySymptoms] = useState<string>("");
  const [severityScale, setSeverityScale] = useState<string>("");
  const [followUpPlan, setFollowUpPlan] = useState<string>("");

  const ensureAnatomicalImageSaved = useCallback(
    async (currentPatientId: number): Promise<string | null> => {
      if (!currentPatientId) {
        return null;
      }

      if (savedAnatomicalImage) {
        return savedAnatomicalImage;
      }

      if (!selectedMuscleGroup || !imageRef.current || !canvasRef.current) {
        return null;
      }

      const image = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const staticPositions = getStaticMusclePositions();
      const musclePositions = staticPositions.filter((pos: any) => {
        const muscleValue = pos.value.toLowerCase().replace(/\s+/g, "_");
        return muscleValue === selectedMuscleGroup.toLowerCase();
      });

      musclePositions.forEach((position: any) => {
        const x = position.coordinates.xPct * canvas.width;
        const y = position.coordinates.yPct * canvas.height;
        const radius = 20;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 0, 0.7)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 215, 0, 1)";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 0, 0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 215, 0, 1)";
        ctx.lineWidth = 2;
      });

      const imageData = canvas.toDataURL("image/png");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
        "Content-Type": "application/json",
      };
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/anatomical-analysis/save-image", {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId: currentPatientId,
          imageData,
          muscleGroup: selectedMuscleGroup,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save anatomical image");
      }

      const result = await response.json();
      const fallbackImageFilename = `${currentPatientId}_${Date.now()}.png`;
      const organizationId = tenant?.id || 0;
      const imageFilename = result.filename || fallbackImageFilename;
      const imagePath = `/uploads/anatomical_analysis_img/${organizationId}/${currentPatientId}/${imageFilename}`;
      setSavedAnatomicalImage(imagePath);
      await fetchAnatomicalImages();
      window.dispatchEvent(
        new CustomEvent("anatomicalFilesUpdated", {
          detail: { patientId: currentPatientId },
        }),
      );

      return imagePath;
    },
    [
      fetchAnatomicalImages,
      savedAnatomicalImage,
      selectedMuscleGroup,
      tenant?.id,
    ],
  );

  // Anatomical analysis validation state
  const [anatomicalErrors, setAnatomicalErrors] = useState({
    muscleGroup: "",
    analysisType: "",
    treatment: "",
    treatmentIntensity: "",
    sessionFrequency: "",
    symptoms: "",
    severity: "",
    followUp: ""
  });

  // Anatomical analysis validation functions
  const validateAnatomicalFields = (): boolean => {
    const errors = {
      muscleGroup: selectedMuscleGroup ? "" : "Target Muscle Group is required.",
      analysisType: selectedAnalysisType ? "" : "Analysis Type is required.",
      treatment: selectedTreatment ? "" : "Primary Treatment is required.",
      treatmentIntensity: selectedTreatmentIntensity ? "" : "Treatment Intensity is required.",
      sessionFrequency: selectedSessionFrequency ? "" : "Session Frequency is required.",
      symptoms: primarySymptoms ? "" : "Primary symptoms are required.",
      severity: severityScale ? "" : "Severity rating is required.",
      followUp: followUpPlan ? "" : "Follow-up timeline is required."
    };

    setAnatomicalErrors(errors);

    // Return true if no errors
    return !Object.values(errors).some(error => error !== "");
  };

  const clearAnatomicalError = (field: string) => {
    setAnatomicalErrors(prev => ({ ...prev, [field]: "" }));
  };

  // General Examination validation functions
  const validateGeneralExam = (): boolean => {
    const errors = {
      generalAppearance: generalExamData.generalAppearance ? "" : "General Appearance is required.",
      mentalStatus: generalExamData.mentalStatus ? "" : "Mental Status is required.",
      skinAssessment: generalExamData.skinAssessment ? "" : "Skin Assessment is required.",
      lymphNodes: generalExamData.lymphNodes ? "" : "Lymph Nodes assessment is required."
    };
    setGeneralExamErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  // Respiratory Examination validation functions
  const validateRespiratoryExam = (): boolean => {
    const errors = {
      respiratoryRate: respiratoryExamData.respiratoryRate ? "" : "Respiratory Rate is required.",
      chestInspection: respiratoryExamData.chestInspection ? "" : "Chest Inspection is required.",
      auscultation: respiratoryExamData.auscultation ? "" : "Auscultation is required.",
      percussion: respiratoryExamData.percussion ? "" : "Percussion is required.",
      palpation: respiratoryExamData.palpation ? "" : "Palpation is required.",
      oxygenSaturation: respiratoryExamData.oxygenSaturation ? "" : "Oxygen Saturation is required."
    };
    setRespiratoryExamErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  // Cardiovascular Examination validation functions
  const validateCardiovascularExam = (): boolean => {
    const errors = {
      heartRateRhythm: cardiovascularExamData.heartRateRhythm ? "" : "Heart Rate & Rhythm is required.",
      heartSounds: cardiovascularExamData.heartSounds ? "" : "Heart Sounds is required.",
      bloodPressure: cardiovascularExamData.bloodPressure ? "" : "Blood Pressure is required.",
      peripheralPulses: cardiovascularExamData.peripheralPulses ? "" : "Peripheral Pulses is required.",
      edemaAssessment: cardiovascularExamData.edemaAssessment ? "" : "Edema Assessment is required.",
      chestInspection: cardiovascularExamData.chestInspection ? "" : "Chest Inspection is required."
    };
    setCardiovascularExamErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  // Neurological Examination validation functions
  const validateNeurologicalExam = (): boolean => {
    const errors = {
      mentalStatus: neurologicalExamData.mentalStatus ? "" : "Mental Status is required.",
      cranialNerves: neurologicalExamData.cranialNerves ? "" : "Cranial Nerves is required.",
      motorFunction: neurologicalExamData.motorFunction ? "" : "Motor Function is required.",
      sensoryFunction: neurologicalExamData.sensoryFunction ? "" : "Sensory Function is required.",
      reflexes: neurologicalExamData.reflexes ? "" : "Reflexes is required.",
      gaitCoordination: neurologicalExamData.gaitCoordination ? "" : "Gait & Coordination is required."
    };
    setNeurologicalExamErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  // Physical Examination validation functions
  const validatePhysicalExam = (): boolean => {
    const errors = {
      general: consultationData.examination.general ? "" : "General examination findings are required.",
      cardiovascular: consultationData.examination.cardiovascular ? "" : "Cardiovascular findings are required.",
      respiratory: consultationData.examination.respiratory ? "" : "Respiratory findings are required.",
      abdomen: consultationData.examination.abdomen ? "" : "Abdomen findings are required.",
      neurological: consultationData.examination.neurological ? "" : "Neurological findings are required.",
      musculoskeletal: consultationData.examination.musculoskeletal ? "" : "Musculoskeletal findings are required.",
      skin: consultationData.examination.skin ? "" : "Skin findings are required.",
      head_neck: consultationData.examination.head_neck ? "" : "Head & Neck findings are required.",
      ears_nose_throat: consultationData.examination.ears_nose_throat ? "" : "Ears, Nose & Throat findings are required."
    };
    setPhysicalExamErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  const [highlightedMuscleFromDB, setHighlightedMuscleFromDB] = useState<any[]>([]);
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [anatomicalStep, setAnatomicalStep] = useState(1); // 1: Analysis, 2: Configuration, 3: Assessment
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // PIXEL-ACCURATE OVERLAY SYSTEM - Refs and state for proper muscle highlighting
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayPosition, setOverlayPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // CALIBRATION MODE - For precise coordinate mapping
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{xPct: number, yPct: number}[]>([]);
  
  // BLACK DOT DETECTION - For automatic dot highlighting
  const [detectedBlackDots, setDetectedBlackDots] = useState<{id: number, xPct: number, yPct: number}[]>([]);
  const [showBlackDotPolygons, setShowBlackDotPolygons] = useState(false);
  const [savedMusclePositions, setSavedMusclePositions] = useState<{id: number, xPct: number, yPct: number, muscleName: string}[]>([]);
  const [showSavedPositions, setShowSavedPositions] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ANATOMICAL MUSCLE POLYGON REGIONS - Vector-based muscle highlighting
  // Polygon coordinates representing actual muscle tissue shapes on the facial diagram

  // MEASUREMENT FUNCTION - Calculate overlay position and scaling
  const updateOverlayPosition = () => {
    if (!imageRef.current || !containerRef.current) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    
    // Get natural and rendered dimensions
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    
    // Get element positions
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to container
    const left = imgRect.left - containerRect.left;
    const top = imgRect.top - containerRect.top;
    const width = imgRect.width;
    const height = imgRect.height;
    
    // Calculate scale factors
    const scaleX = width / natW;
    const scaleY = height / natH;
    
    setOverlayPosition({
      left,
      top,
      width,
      height,
      scaleX,
      scaleY
    });
  };

  // CALIBRATION CLICK HANDLER - Capture precise coordinates
  const handleCalibrationClick = (e: React.MouseEvent) => {
    if (!calibrationMode || !imageRef.current) return;
    
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    
    // Calculate click position relative to image
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to percentage coordinates
    const xPct = x / rect.width;
    const yPct = y / rect.height;
    
    // Add point to calibration
    const newPoint = { xPct, yPct };
    setCalibrationPoints(prev => [...prev, newPoint]);
    
    console.log(`🎯 Calibration Point Added:`, newPoint);
    console.log(`📍 Total Points:`, calibrationPoints.length + 1);
  };
  
  // EXPORT CALIBRATION DATA
  const exportCalibrationData = () => {
    if (calibrationPoints.length === 0) return;
    
    console.log(`🔧 TEMPORALIS CALIBRATION EXPORT:`, {
      points: calibrationPoints,
      count: calibrationPoints.length,
      javascriptArray: calibrationPoints
    });
    
    // Also copy to clipboard for easy pasting
    const jsArray = JSON.stringify(calibrationPoints, null, 2);
    navigator.clipboard?.writeText(jsArray);
    alert(`Exported ${calibrationPoints.length} points to console and clipboard!`);
  };

  // BLACK DOT DETECTION FUNCTION
  const detectBlackDots = () => {
    if (!imageRef.current || !canvasRef.current || !overlayPosition) return;

    const image = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas dimensions to match image display size
    canvas.width = overlayPosition.width;
    canvas.height = overlayPosition.height;

    // Draw the image to canvas for pixel analysis
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const detectedDots: {id: number, xPct: number, yPct: number}[] = [];
    const threshold = 50; // Threshold for "black" (adjust as needed)
    const minDotSize = 3; // Minimum dot size in pixels
    const visited = new Set<string>();
    let dotId = 1;

    // Function to check if a pixel is considered "black"
    const isBlackPixel = (r: number, g: number, b: number) => {
      return r < threshold && g < threshold && b < threshold;
    };

    // Flood fill algorithm to find connected black pixels (dots)
    const floodFill = (startX: number, startY: number) => {
      const stack = [{x: startX, y: startY}];
      const pixels: {x: number, y: number}[] = [];
      
      while (stack.length > 0) {
        const {x, y} = stack.pop()!;
        const key = `${x},${y}`;
        
        if (visited.has(key) || x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
          continue;
        }
        
        const index = (y * canvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        if (!isBlackPixel(r, g, b)) continue;
        
        visited.add(key);
        pixels.push({x, y});
        
        // Add neighboring pixels to stack
        stack.push({x: x + 1, y});
        stack.push({x: x - 1, y});
        stack.push({x, y: y + 1});
        stack.push({x, y: y - 1});
      }
      
      return pixels;
    };

    // Scan image for black dots
    for (let y = 0; y < canvas.height; y += 2) { // Skip every other pixel for performance
      for (let x = 0; x < canvas.width; x += 2) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        
        const index = (y * canvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        if (isBlackPixel(r, g, b)) {
          const dotPixels = floodFill(x, y);
          
          // Only consider it a dot if it has minimum size
          if (dotPixels.length >= minDotSize) {
            // Calculate center of the dot
            const centerX = dotPixels.reduce((sum, p) => sum + p.x, 0) / dotPixels.length;
            const centerY = dotPixels.reduce((sum, p) => sum + p.y, 0) / dotPixels.length;
            
            // Convert to percentage coordinates
            const xPct = centerX / canvas.width;
            const yPct = centerY / canvas.height;
            
            detectedDots.push({
              id: dotId++,
              xPct,
              yPct
            });
          }
        }
      }
    }

    setDetectedBlackDots(detectedDots);
    setShowBlackDotPolygons(true);
    
    toast({
      title: "Black Dots Detected",
      description: `Found ${detectedDots.length} black dots in the image with unique circle highlights.`
    });

    console.log('🔍 DETECTED BLACK DOTS:', detectedDots);
  };

  // SAVE IMAGE WITH YELLOW DOTS FOR SELECTED MUSCLE GROUP
  const saveImageWithYellowDots = async () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId) {
      toast({
        title: "Cannot Save Image",
        description: "No patient selected.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedMuscleGroup || !imageRef.current || !canvasRef.current) {
      toast({
        title: "Cannot Save Image",
        description: "Please select a muscle group first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const image = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas dimensions to match image natural size
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      // Draw the base image
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Get muscle positions for the selected muscle group
      const staticPositions = getStaticMusclePositions();
      const musclePositions = staticPositions.filter((pos: any) => {
        const muscleValue = pos.value.toLowerCase().replace(/\s+/g, '_');
        return muscleValue === selectedMuscleGroup.toLowerCase();
      });

      // Draw yellow dots on the muscle positions
      musclePositions.forEach((position: any) => {
        const x = position.coordinates.xPct * canvas.width;
        const y = position.coordinates.yPct * canvas.height;
        const radius = 4;

        // Draw yellow circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 0, 1)';
        ctx.fill();
      });

      // Convert canvas to base64
      const imageData = canvas.toDataURL('image/png');
      
      // Send to server to save
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/anatomical-analysis/save-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: currentPatientId,
          imageData: imageData,
          muscleGroup: selectedMuscleGroup
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save image to server');
      }

      const result = await response.json();
      const fallbackImageFilename = `${currentPatientId}_${Date.now()}.png`;

      // Set the saved anatomical image path for viewing in the dialog (with timestamp)
      const organizationId = tenant?.id || 0;
      const imageFilename = result.filename || fallbackImageFilename;
      const imagePath = `/uploads/anatomical_analysis_img/${organizationId}/${currentPatientId}/${imageFilename}`;
      setSavedAnatomicalImage(imagePath);
      await fetchAnatomicalImages();

      toast({
        title: "Image Saved to Server",
        description: `Image with ${musclePositions.length} yellow dot(s) for ${selectedMuscleGroup.replace(/_/g, ' ')} has been saved successfully.`
      });
    } catch (error) {
      console.error('Error saving image with yellow dots:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save image with yellow dots.",
        variant: "destructive"
      });
    }
  };

  // SAVE MUSCLE POSITIONS TO DATABASE
  const saveMusclePositions = async () => {
    const currentPatientId = patientId || patient?.id;
    if (!currentPatientId || detectedBlackDots.length === 0) {
      toast({
        title: "Cannot Save",
        description: "No patient selected or no black dots detected to save.",
        variant: "destructive"
      });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/muscle-positions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: currentPatientId,
          detectedDots: detectedBlackDots
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save muscle positions');
      }

      const result = await response.json();
      console.log('💾 MUSCLE POSITIONS SAVED:', result);

      toast({
        title: "Positions Saved",
        description: `Successfully saved ${result.count} muscle positions to database.`
      });

      // Load the saved positions to display them
      await loadSavedMusclePositions();
    } catch (error) {
      console.error('Error saving muscle positions:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save muscle positions to database.",
        variant: "destructive"
      });
    }
  };

  // LOAD SAVED MUSCLE POSITIONS FROM STATIC DATA (replaces database query)
  const loadSavedMusclePositions = async () => {
    try {
      // Use static data instead of database query
      const result = { 
        positions: getStaticMusclePositions(), 
        count: getStaticMusclePositions().length 
      };
      
      console.log('📊 LOADED MUSCLE POSITIONS (STATIC DATA):', result);

      // Convert saved positions back to display format
      const savedDots = result.positions.map((position: any) => ({
        id: position.position,
        xPct: position.coordinates.xPct,
        yPct: position.coordinates.yPct,
        muscleName: position.value
      }));

      setSavedMusclePositions(savedDots);
      setShowSavedPositions(true);

      toast({
        title: "Positions Loaded from Static Data",
        description: `Loaded ${result.count} muscle positions from static data.`
      });
    } catch (error) {
      console.error('Error loading muscle positions:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load muscle positions from static data.",
        variant: "destructive"
      });
    }
  };

  // Handle overlay updates on image change and resize - ROBUST TIMING
  useEffect(() => {
    // Reset image loaded state when image changes
    setImageLoaded(false);
    
    // Update overlay immediately when dialog opens or image changes
    if (open && anatomicalStep === 1) {
      updateOverlayPosition();
    }
    
    // Handle window resize with ResizeObserver for better performance
    let resizeObserver: ResizeObserver | null = null;
    
    if (imageRef.current && open) {
      resizeObserver = new ResizeObserver(() => {
        updateOverlayPosition();
      });
      resizeObserver.observe(imageRef.current);
    }
    
    const handleResize = () => {
      updateOverlayPosition();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [currentImageIndex, anatomicalStep, open]);

  // Show confirmation toast when muscle is selected AND query database for muscle positions
  useEffect(() => {
    if (selectedMuscleGroup) {
      const muscleName = selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      toast({
        title: "✅ Muscle Selected",
        description: `${muscleName} highlighted on anatomical diagram`,
        duration: 3000,
      });

      // Query database for saved muscle positions matching this muscle group
      queryMusclePositionsFromDB();
    }
  }, [selectedMuscleGroup, toast]);

  // Static muscle positions data - replaces database queries
  const getStaticMusclePositions = () => {
    return [
      { id: 91, organizationId: 2, patientId: 17, position: 1, value: "1", coordinates: { xPct: 0.42231457800511507, yPct: 0.026161641127039052 }, isDetected: true, detectedAt: "2025-09-17 17:19:27.418" },
      { id: 92, organizationId: 2, patientId: 17, position: 2, value: "2", coordinates: { xPct: 0.29788352576958277, yPct: 0.14298810433264217 }, isDetected: true, detectedAt: "2025-09-17 17:19:27.643" },
      { id: 93, organizationId: 2, patientId: 17, position: 3, value: "Frontalis (Forehead)", coordinates: { xPct: 0.2414753214525742, yPct: 0.16075671647969533 }, isDetected: true, detectedAt: "2025-09-17 17:19:27.857" },
      { id: 94, organizationId: 2, patientId: 17, position: 4, value: "Temporalis", coordinates: { xPct: 0.2368376481215459, yPct: 0.2487324636967758 }, isDetected: true, detectedAt: "2025-09-17 17:19:28.07" },
      { id: 95, organizationId: 2, patientId: 17, position: 5, value: "Procerus", coordinates: { xPct: 0.500465983224604, yPct: 0.28018558774861296 }, isDetected: true, detectedAt: "2025-09-17 17:19:28.284" },
      { id: 96, organizationId: 2, patientId: 17, position: 6, value: "Corrugator Supercilii", coordinates: { xPct: 0.6367311044124581, yPct: 0.2824242064316893 }, isDetected: true, detectedAt: "2025-09-17 17:19:28.498" },
      { id: 97, organizationId: 2, patientId: 17, position: 7, value: "7", coordinates: { xPct: 0.32614382463940444, yPct: 0.3185395537525355 }, isDetected: true, detectedAt: "2025-09-17 17:19:28.712" },
      { id: 98, organizationId: 2, patientId: 17, position: 8, value: "Levalor Palpebrae Supereilia", coordinates: { xPct: 0.6100398076823657, yPct: 0.3647960333558711 }, isDetected: true, detectedAt: "2025-09-17 17:19:28.927" },
      { id: 99, organizationId: 2, patientId: 17, position: 9, value: "Orbicularis Milor", coordinates: { xPct: 0.24072071107303492, yPct: 0.37573229291716687 }, isDetected: true, detectedAt: "2025-09-17 17:19:29.14" },
      { id: 100, organizationId: 2, patientId: 17, position: 10, value: "Levator Labii Superioris", coordinates: { xPct: 0.5097786302379537, yPct: 0.4526266372470776 }, isDetected: true, detectedAt: "2025-09-17 17:19:29.355" },
      { id: 101, organizationId: 2, patientId: 17, position: 11, value: "Zygomaticus Minor", coordinates: { xPct: 0.2595126165730694, yPct: 0.4769064235863837 }, isDetected: true, detectedAt: "2025-09-17 17:19:29.569" },
      { id: 102, organizationId: 2, patientId: 17, position: 12, value: "12", coordinates: { xPct: 0.4394909286929569, yPct: 0.48992540836559345 }, isDetected: true, detectedAt: "2025-09-17 17:19:29.783" },
      { id: 103, organizationId: 2, patientId: 17, position: 13, value: "13", coordinates: { xPct: 0.37330278522710475, yPct: 0.5024263226417327 }, isDetected: true, detectedAt: "2025-09-17 17:19:29.997" },
      { id: 104, organizationId: 2, patientId: 17, position: 14, value: "Zygomaticus Major", coordinates: { xPct: 0.2863568215892054, yPct: 0.5277310924369748 }, isDetected: true, detectedAt: "2025-09-17 17:19:30.213" },
      { id: 105, organizationId: 2, patientId: 17, position: 15, value: "15", coordinates: { xPct: 0.3227905697806119, yPct: 0.5279145719423141 }, isDetected: true, detectedAt: "2025-09-17 17:19:30.427" },
      { id: 106, organizationId: 2, patientId: 17, position: 16, value: "Masseter", coordinates: { xPct: 0.2555479017248133, yPct: 0.5721856310091604 }, isDetected: true, detectedAt: "2025-09-17 17:19:30.641" },
      { id: 107, organizationId: 2, patientId: 17, position: 17, value: "Buccinator", coordinates: { xPct: 0.6556538244639148, yPct: 0.5732634338138924 }, isDetected: true, detectedAt: "2025-09-17 17:19:30.855" },
      { id: 108, organizationId: 2, patientId: 17, position: 18, value: "18", coordinates: { xPct: 0.4880021129331707, yPct: 0.5943571210867767 }, isDetected: true, detectedAt: "2025-09-17 17:19:31.069" },
      { id: 109, organizationId: 2, patientId: 17, position: 19, value: "19", coordinates: { xPct: 0.35082458770614694, yPct: 0.6596638655462185 }, isDetected: true, detectedAt: "2025-09-17 17:19:31.284" },
      { id: 110, organizationId: 2, patientId: 17, position: 20, value: "Depressor Sept Nasi", coordinates: { xPct: 0.6432598917932338, yPct: 0.6691085129704055 }, isDetected: true, detectedAt: "2025-09-17 17:19:31.498" },
      { id: 111, organizationId: 2, patientId: 17, position: 21, value: "Orbicularis Oculi", coordinates: { xPct: 0.5466415144076313, yPct: 0.694320805245175 }, isDetected: true, detectedAt: "2025-09-17 17:19:31.712" },
      { id: 112, organizationId: 2, patientId: 17, position: 22, value: "22", coordinates: { xPct: 0.444527736131934, yPct: 0.7111435878699306 }, isDetected: true, detectedAt: "2025-09-17 17:19:31.927" },
      { id: 113, organizationId: 2, patientId: 17, position: 23, value: "Depressor Anguli Oris", coordinates: { xPct: 0.6100185201516889, yPct: 0.7132970835392981 }, isDetected: true, detectedAt: "2025-09-17 17:19:32.145" },
      { id: 114, organizationId: 2, patientId: 17, position: 24, value: "Depressor Labii Inferioris", coordinates: { xPct: 0.3166781095433592, yPct: 0.7210869394486767 }, isDetected: true, detectedAt: "2025-09-17 17:19:32.456" },
      { id: 115, organizationId: 2, patientId: 17, position: 25, value: "Orbicularis Oris", coordinates: { xPct: 0.5705017446433733, yPct: 0.725259072238761 }, isDetected: true, detectedAt: "2025-09-17 17:19:32.671" },
      { id: 116, organizationId: 2, patientId: 17, position: 26, value: "26", coordinates: { xPct: 0.38957444354745707, yPct: 0.7432350454974889 }, isDetected: true, detectedAt: "2025-09-17 17:19:32.885" },
      { id: 117, organizationId: 2, patientId: 17, position: 27, value: "27", coordinates: { xPct: 0.49737904770242614, yPct: 0.7806538673863705 }, isDetected: true, detectedAt: "2025-09-17 17:19:33.099" },
      { id: 118, organizationId: 2, patientId: 17, position: 28, value: "Mentalis", coordinates: { xPct: 0.4295352323838081, yPct: 0.7915966386554621 }, isDetected: true, detectedAt: "2025-09-17 17:19:33.313" },
      { id: 119, organizationId: 2, patientId: 17, position: 29, value: "29", coordinates: { xPct: 0.46181105251570026, yPct: 0.793312569783158 }, isDetected: true, detectedAt: "2025-09-17 17:19:33.528" },
      { id: 120, organizationId: 2, patientId: 17, position: 30, value: "Platysma", coordinates: { xPct: 0.2969329814730644, yPct: 0.8217726909768432 }, isDetected: true, detectedAt: "2025-09-17 17:19:33.744" },
      { id: 121, organizationId: 2, patientId: 17, position: 31, value: "31", coordinates: { xPct: 0.4107946026986507, yPct: 0.8581019364267446 }, isDetected: true, detectedAt: "2025-09-17 17:19:33.959" },
      { id: 122, organizationId: 2, patientId: 17, position: 32, value: "32", coordinates: { xPct: 0.31419030744368076, yPct: 0.8776601549710793 }, isDetected: true, detectedAt: "2025-09-17 17:19:34.173" }
    ];
  };

  // Query static muscle positions based on selected muscle group (replaces database query)
  const queryMusclePositionsFromDB = async () => {
    if (!selectedMuscleGroup) return;

    try {
      // Use static data instead of database query
      const data = { 
        positions: getStaticMusclePositions(), 
        count: getStaticMusclePositions().length 
      };
      
      console.log('📊 QUERIED ALL MUSCLE POSITIONS (STATIC DATA):', data);

      // Filter positions that match the selected muscle group value field
      const matchingPositions = data.positions?.filter((position: any) => {
        const normalizedSelectedMuscle = selectedMuscleGroup.toLowerCase().replace(/_/g, ' ');
        const normalizedPositionValue = position.value?.toLowerCase().replace(/[()]/g, ''); // Remove parentheses
        
        console.log('🔍 COMPARING:', {
          selectedMuscle: normalizedSelectedMuscle,
          positionValue: normalizedPositionValue,
          originalValue: position.value,
          match: normalizedPositionValue?.includes(normalizedSelectedMuscle) || normalizedSelectedMuscle.includes(normalizedPositionValue)
        });

        // Handle exact matches and partial matches for muscle names
        return normalizedPositionValue?.includes(normalizedSelectedMuscle) || 
               normalizedSelectedMuscle.includes(normalizedPositionValue);
      }) || [];

      console.log('🎯 MATCHING POSITIONS FOUND:', matchingPositions);
      setHighlightedMuscleFromDB(matchingPositions);

      if (matchingPositions.length > 0) {
        toast({
          title: "🔍 Static Data Positions Found",
          description: `Found ${matchingPositions.length} position(s) for ${selectedMuscleGroup.replace(/_/g, ' ')}`,
          duration: 4000,
        });
      } else {
        toast({
          title: "📍 No Matching Positions",
          description: `No matching positions found for ${selectedMuscleGroup.replace(/_/g, ' ')} in static data`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('❌ Error querying muscle positions:', error);
      toast({
        title: "Query Failed",
        description: "Failed to query muscle positions from static data",
        variant: "destructive"
      });
    }
  };

  const handleViewAnatomicalAnalysis = async () => {
    if (isViewAnalysisDownloading) {
      return;
    }

    setIsViewAnalysisDownloading(true);
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        toast({
          title: "Error",
          description: "Patient information not available.",
          variant: "destructive",
        });
        return;
      }

      const imagePathToUse = await ensureAnatomicalImageSaved(currentPatientId);
      if (!imagePathToUse) {
        toast({
          title: "Cannot Generate PDF",
          description: "Please select a muscle group and save the image first.",
          variant: "destructive",
        });
        return;
      }

      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [headerRes, footerRes] = await Promise.all([
        fetch("/api/clinic-headers", { headers }),
        fetch("/api/clinic-footers", { headers }),
      ]);

      let clinicHeader = null;
      let clinicFooter = null;

      if (headerRes.ok) {
        clinicHeader = await headerRes.json();
      }
      if (footerRes.ok) {
        clinicFooter = await footerRes.json();
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      let imageUrl: string | null = imagePathToUse;

      let yPos = 15;

      if (clinicHeader) {
        const logoPosition = clinicHeader.logoPosition || "left";
        const hasLogo = clinicHeader.logoBase64;

        if (hasLogo && logoPosition === "left") {
          try {
            doc.addImage(clinicHeader.logoBase64, "PNG", 20, yPos, 25, 25);
          } catch (logoError) {
            console.log("[PDF] Error adding logo:", logoError);
          }
          const textX = 50;
          let textY = yPos + 5;

          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          if (clinicHeader.clinicName) {
            doc.text(clinicHeader.clinicName, textX, textY);
            textY += 6;
          }
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          if (clinicHeader.address) {
            doc.text(clinicHeader.address, textX, textY);
            textY += 4;
          }
          if (clinicHeader.phone) {
            doc.text(clinicHeader.phone, textX, textY);
            textY += 4;
          }
          if (clinicHeader.email) {
            doc.text(clinicHeader.email, textX, textY);
          }
          yPos += 30;
        } else if (hasLogo && logoPosition === "center") {
          try {
            doc.addImage(clinicHeader.logoBase64, "PNG", 85, yPos, 40, 15);
            yPos += 18;
          } catch (logoError) {
            console.log("[PDF] Error adding logo:", logoError);
          }

          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          if (clinicHeader.clinicName) {
            doc.text(clinicHeader.clinicName, 105, yPos, { align: "center" });
            yPos += 6;
          }
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          if (clinicHeader.address) {
            doc.text(clinicHeader.address, 105, yPos, { align: "center" });
            yPos += 4;
          }
          if (clinicHeader.phone) {
            doc.text(clinicHeader.phone, 105, yPos, { align: "center" });
            yPos += 4;
          }
          if (clinicHeader.email) {
            doc.text(clinicHeader.email, 105, yPos, { align: "center" });
            yPos += 4;
          }
          yPos += 5;
        } else if (hasLogo && logoPosition === "right") {
          try {
            doc.addImage(clinicHeader.logoBase64, "PNG", 165, yPos, 25, 25);
          } catch (logoError) {
            console.log("[PDF] Error adding logo:", logoError);
          }

          let textY = yPos + 5;
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          if (clinicHeader.clinicName) {
            doc.text(clinicHeader.clinicName, 20, textY);
            textY += 6;
          }
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          if (clinicHeader.address) {
            doc.text(clinicHeader.address, 20, textY);
            textY += 4;
          }
          if (clinicHeader.phone) {
            doc.text(clinicHeader.phone, 20, textY);
            textY += 4;
          }
          if (clinicHeader.email) {
            doc.text(clinicHeader.email, 20, textY);
          }
          yPos += 30;
        } else {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          if (clinicHeader.clinicName) {
            doc.text(clinicHeader.clinicName, 105, yPos, { align: "center" });
            yPos += 6;
          }
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          if (clinicHeader.address) {
            doc.text(clinicHeader.address, 105, yPos, { align: "center" });
            yPos += 4;
          }
          if (clinicHeader.phone) {
            doc.text(clinicHeader.phone, 105, yPos, { align: "center" });
            yPos += 4;
          }
          if (clinicHeader.email) {
            doc.text(clinicHeader.email, 105, yPos, { align: "center" });
            yPos += 4;
          }
          yPos += 5;
        }
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Professional Anatomical Analysis Report", 105, yPos, { align: "center" });
      yPos += 15;

      const leftColumnX = 20;
      const rightColumnX = 130;
      const startYPos = yPos;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Analysis Details:", leftColumnX, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const details = [
        `Target Muscle Group: ${selectedMuscleGroup ? selectedMuscleGroup.replace(/_/g, " ") : "Not specified"}`,
        `Analysis Type: ${selectedAnalysisType ? selectedAnalysisType.replace(/_/g, " ") : "Not specified"}`,
        `Primary Treatment: ${selectedTreatment ? selectedTreatment.replace(/_/g, " ") : "Not specified"}`,
        `Treatment Intensity: ${selectedTreatmentIntensity || "Not specified"}`,
        `Session Frequency: ${selectedSessionFrequency || "Not specified"}`,
        `Severity Scale: ${severityScale || "Not specified"}`,
        `Primary Symptoms: ${primarySymptoms || "Not specified"}`,
        `Follow-up Plan: ${followUpPlan || "Not specified"}`,
      ];

      details.forEach(detail => {
                        const lines = doc.splitTextToSize(detail, 100);
                        lines.forEach((line: string, lineIndex: number) => {
                          const isLastLine =
                            detail === details[details.length - 1] &&
                            lineIndex === lines.length - 1;
                          if (yPos > 270 && !isLastLine) {
                            doc.addPage();
                            yPos = 20;
                          }
                          doc.text(line, leftColumnX, yPos);
                          yPos += 6;
                        });
      });

      const imagePath = imagePathToUse || savedAnatomicalImage || "";
      console.log("[ANATOMICAL PDF] Fetching image from:", imagePath);

      try {
        const imageResponse = await fetch(imagePath);
        console.log("[ANATOMICAL PDF] Image response status:", imageResponse.status);

        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });

          console.log("[ANATOMICAL PDF] Adding image to right column");
          const imgWidth = 60;
          const imgHeight = 60;

          try {
            doc.addImage(imageBase64, "PNG", rightColumnX, startYPos, imgWidth, imgHeight);
            console.log("[ANATOMICAL PDF] Image added successfully");
          } catch (addImgError: any) {
            console.error("[ANATOMICAL PDF] addImage error:", addImgError, "Message:", addImgError?.message);
          }
        }
      } catch (imageError) {
        console.error("[ANATOMICAL PDF] Image fetch error:", imageError);
      }

      yPos += 5;

      if (generatedTreatmentPlan) {
        yPos += 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Generated Treatment Plan", leftColumnX, yPos);
        yPos += 8;

        doc.setDrawColor(230, 230, 230);
        doc.setFillColor(250, 250, 250);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(generatedTreatmentPlan, 170);
        lines.forEach((line: string) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, leftColumnX, yPos);
          yPos += 4;
        });
      }

      if (clinicFooter && clinicFooter.footerText) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(clinicFooter.footerText, 105, 285, { align: "center" });
      }

      const timestamp = Date.now();
      const pdfFilename = `${currentPatientId}_anatomical_analysis_${timestamp}.pdf`;
      console.log("[ANATOMICAL PDF] Saving PDF:", pdfFilename);

      const pdfDataUri = doc.output("datauristring");
      try {
        const pdfHeaders: Record<string, string> = {
          "X-Tenant-Subdomain": getTenantSubdomain(),
          "Content-Type": "application/json",
        };
        if (token) {
          pdfHeaders.Authorization = `Bearer ${token}`;
        }

        const savePdfResponse = await fetch("/api/anatomical-analysis/save-pdf", {
          method: "POST",
          headers: pdfHeaders,
          body: JSON.stringify({
            patientId: currentPatientId,
            pdfData: pdfDataUri,
            filename: pdfFilename,
          }),
          credentials: "include",
        });

        if (savePdfResponse.ok) {
          const savedPdfResult = await savePdfResponse.json();
          const finalFilename = savedPdfResult.filename || pdfFilename;
          setSavedPdfFilename(finalFilename);
          setShowPdfSavedModal(true);
          await fetchAnatomicalFiles();
                          await fetchAnatomicalImages();
          setAnatomicalUploadsTab("uploads");
          window.dispatchEvent(
            new CustomEvent("anatomicalFilesUpdated", {
              detail: { patientId: currentPatientId },
            }),
          );
        } else {
          console.error("[ANATOMICAL PDF] Failed to save PDF:", await savePdfResponse.text());
        }
      } catch (savePdfError) {
        console.error("[ANATOMICAL PDF] Failed to save PDF to server:", savePdfError);
      }

      doc.save(pdfFilename);
      console.log("[ANATOMICAL PDF] PDF saved successfully");

      toast({
        title: "PDF Generated",
        description: "Anatomical analysis PDF has been downloaded successfully.",
      });
      console.log("[ANATOMICAL PDF] Success toast displayed");
    } catch (error) {
      console.error("[ANATOMICAL PDF] Error generating anatomical analysis PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsViewAnalysisDownloading(false);
    }
  };

  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [isSavingPhysicalExam, setIsSavingPhysicalExam] = useState(false);
  const [isSavingRespiratoryExam, setIsSavingRespiratoryExam] = useState(false);
  const [isSavingCardiovascularExam, setIsSavingCardiovascularExam] = useState(false);
  const [isSavingNeurologicalExam, setIsSavingNeurologicalExam] = useState(false);
  const [isSavingGeneralExam, setIsSavingGeneralExam] = useState(false);

  // General examination state
  const [generalExamData, setGeneralExamData] = useState({
    generalAppearance: "",
    mentalStatus: "",
    skinAssessment: "",
    lymphNodes: ""
  });

  // General examination validation state
  const [generalExamErrors, setGeneralExamErrors] = useState({
    generalAppearance: "",
    mentalStatus: "",
    skinAssessment: "",
    lymphNodes: ""
  });

  // Respiratory examination state
  const [respiratoryExamData, setRespiratoryExamData] = useState({
    respiratoryRate: "",
    chestInspection: "",
    auscultation: "",
    percussion: "",
    palpation: "",
    oxygenSaturation: ""
  });

  // Respiratory examination validation state
  const [respiratoryExamErrors, setRespiratoryExamErrors] = useState({
    respiratoryRate: "",
    chestInspection: "",
    auscultation: "",
    percussion: "",
    palpation: "",
    oxygenSaturation: ""
  });

  // Cardiovascular examination state
  const [cardiovascularExamData, setCardiovascularExamData] = useState({
    heartRateRhythm: "",
    heartSounds: "",
    bloodPressure: "",
    peripheralPulses: "",
    edemaAssessment: "",
    chestInspection: ""
  });

  // Cardiovascular examination validation state
  const [cardiovascularExamErrors, setCardiovascularExamErrors] = useState({
    heartRateRhythm: "",
    heartSounds: "",
    bloodPressure: "",
    peripheralPulses: "",
    edemaAssessment: "",
    chestInspection: ""
  });

  // Neurological examination state
  const [neurologicalExamData, setNeurologicalExamData] = useState({
    mentalStatus: "",
    cranialNerves: "",
    motorFunction: "",
    sensoryFunction: "",
    reflexes: "",
    gaitCoordination: ""
  });

  // Neurological examination validation state
  const [neurologicalExamErrors, setNeurologicalExamErrors] = useState({
    mentalStatus: "",
    cranialNerves: "",
    motorFunction: "",
    sensoryFunction: "",
    reflexes: "",
    gaitCoordination: ""
  });

  // Physical examination validation state
  const [physicalExamErrors, setPhysicalExamErrors] = useState({
    general: "",
    cardiovascular: "",
    respiratory: "",
    abdomen: "",
    neurological: "",
    musculoskeletal: "",
    skin: "",
    head_neck: "",
    ears_nose_throat: ""
  });

  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const recognitionRef = useRef<any>(null);

  // Anatomical images array
  const anatomicalImages = [facialMuscleImage, facialOutlineImage, cleanFacialOutlineV2];


  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev > 0 ? prev - 1 : anatomicalImages.length - 1);
    } else {
      setCurrentImageIndex(prev => prev < anatomicalImages.length - 1 ? prev + 1 : 0);
    }
  };

  const saveTreatmentPlanPdfToServer = async (currentPatientId: number, treatmentPlanText: string) => {
    if (!currentPatientId || !treatmentPlanText) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const tenantHeaders: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        tenantHeaders.Authorization = `Bearer ${token}`;
      }

      const [headerRes, footerRes] = await Promise.all([
        fetch("/api/clinic-headers", { headers: tenantHeaders }),
        fetch("/api/clinic-footers", { headers: tenantHeaders }),
      ]);

      const clinicHeader = headerRes.ok ? await headerRes.json() : null;
      const clinicFooter = footerRes.ok ? await footerRes.json() : null;

      const imagePathToUse = await ensureAnatomicalImageSaved(currentPatientId);
      if (!imagePathToUse) {
        console.warn("[TREATMENT PLAN PDF] No annotated anatomical image available for treatment plan.");
      }

      const doc = new jsPDF();
      let yPos = 15;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      if (clinicHeader) {
        try {
          if (clinicHeader.logoBase64) {
            doc.addImage(clinicHeader.logoBase64, "PNG", margin, yPos, 30, 30);
          }
        } catch (logoError) {
          console.warn("[TREATMENT PLAN PDF] Unable to add logo:", logoError);
        }

        const headerTextX = margin + 40;
        let headerTextY = yPos + 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        if (clinicHeader.clinicName) {
          doc.text(clinicHeader.clinicName, headerTextX, headerTextY);
          headerTextY += 5;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        if (clinicHeader.address) {
          doc.text(clinicHeader.address, headerTextX, headerTextY);
          headerTextY += 4;
        }
        if (clinicHeader.phone) {
          doc.text(clinicHeader.phone, headerTextX, headerTextY);
          headerTextY += 4;
        }
        if (clinicHeader.email) {
          doc.text(clinicHeader.email, headerTextX, headerTextY);
          headerTextY += 4;
        }

        yPos = Math.max(headerTextY, yPos + 30);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Generated Treatment Plan", margin, yPos);
        yPos += 6;
      }

      yPos += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Professional Anatomical Treatment Plan", pageWidth / 2, yPos, {
        align: "center",
      });
      yPos += 8;

      // Two-column layout: Analysis Details (left) and Image (right)
      const imageWidth = 55; // Reduced from 75
      const imageHeight = 70; // Reduced from 95
      const leftColumnX = margin;
      const rightColumnX = pageWidth - margin - imageWidth;
      const startYPos = yPos;
      
      // Left column: Analysis Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Analysis Details:", leftColumnX, startYPos);
      let currentYPos = startYPos + 5;

      const imageUrl = imagePathToUse;
      const imageX = rightColumnX;
      const imageY = startYPos - 2;
      const imageBottom = imageY + imageHeight;
      
      // Add image on the right side
      if (imageUrl) {
        try {
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            const imageBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(imageBlob);
            });
            doc.addImage(imageBase64, "PNG", imageX, imageY, imageWidth, imageHeight);
          }
        } catch (imageError) {
          console.error("[TREATMENT PLAN PDF] Image fetch error:", imageError);
        }
      }

      const labelValuePairs = [
        {
          label: "Target Muscle Group",
          value: selectedMuscleGroup
            ? selectedMuscleGroup.replace(/_/g, " ").replace(/\b\w/g, (char) =>
                char.toUpperCase(),
              )
            : "Not specified",
        },
        {
          label: "Analysis Type",
          value: selectedAnalysisType
            ? selectedAnalysisType.replace(/_/g, " ")
            : "Not specified",
        },
        {
          label: "Primary Treatment",
          value: selectedTreatment
            ? selectedTreatment.replace(/_/g, " ").replace(/\b\w/g, (char) =>
                char.toUpperCase(),
              )
            : "Not specified",
        },
        {
          label: "Treatment Intensity",
          value: selectedTreatmentIntensity || "Not specified",
        },
        {
          label: "Session Frequency",
          value: selectedSessionFrequency || "Not specified",
        },
        {
          label: "Primary symptoms",
          value: primarySymptoms || "Not specified",
        },
        {
          label: "Severity Scale",
          value: severityScale || "Not specified",
        },
        {
          label: "Follow-up Plan",
          value: followUpPlan || "Not specified",
        },
      ];

      // Left column width - ensure it doesn't overlap with image
      const leftColumnWidth = rightColumnX - leftColumnX - 10;
      
      labelValuePairs.forEach((field) => {
        // Check if we need a new page
        if (currentYPos > pageHeight - margin - 10) {
          doc.addPage();
          currentYPos = 20;
        }
        
        // Format as "Label: Value" - keep label and value together, prevent breaking
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        
        // First, try to fit label and value on one line
        const fullText = `${field.label}: ${field.value}`;
        const singleLineWidth = doc.getTextWidth(fullText);
        
        if (singleLineWidth <= leftColumnWidth) {
          // Fits on one line - no breaking needed
          doc.text(fullText, leftColumnX, currentYPos);
          currentYPos += 4;
        } else {
          // Need to break - put label on first line, value on second line
          doc.text(`${field.label}:`, leftColumnX, currentYPos);
          currentYPos += 3.5;
          
          // Break value if needed, but try to keep words together
          const valueLines = doc.splitTextToSize(field.value, leftColumnWidth - 5);
          valueLines.forEach((line) => {
            if (currentYPos > pageHeight - margin - 10) {
              doc.addPage();
              currentYPos = 20;
            }
            doc.text(line, leftColumnX + 5, currentYPos); // Indent value
            currentYPos += 3.5;
          });
        }
        
        currentYPos += 0.5; // Small space between fields
      });

      // Set yPos to the maximum of text end or image bottom
      yPos = Math.max(currentYPos, imageBottom) + 5;
      
      // Treatment Plan section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Generated Treatment Plan:", margin, yPos);
      yPos += 5;

      // Parse and format treatment plan with proper headings
      const cleanedTreatmentPlanText = treatmentPlanText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');

      // Process treatment plan lines and format headings
      const planLines = cleanedTreatmentPlanText.split('\n');
      const marginBottom = margin;
      const fullWidth = pageWidth - margin * 2;
      let previousLineWasText = false;
      
      planLines.forEach((line, index) => {
        // Check if we need a new page before adding text
        if (yPos > pageHeight - marginBottom - 5) {
          doc.addPage();
          yPos = 20;
        }
        
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) {
          yPos += 2;
          previousLineWasText = false;
          return;
        }
        
        // Check if line is a heading (all caps or starts with **)
        const isHeading = trimmedLine.match(/^\*\*.*\*\*$/) || 
                         (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length < 50 && trimmedLine.length > 3) ||
                         (trimmedLine.startsWith('**') && trimmedLine.endsWith('**'));
        
        if (isHeading) {
          // Add extra space before heading (line break) if previous line was text
          if (index > 0 && previousLineWasText) {
            yPos += 5; // Line break space before heading
          }
          
          // Format as bold heading
          const headingText = trimmedLine.replace(/\*\*/g, '').trim();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          const headingLines = doc.splitTextToSize(headingText, fullWidth);
          headingLines.forEach((headingLine) => {
            if (yPos > pageHeight - marginBottom - 5) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(headingLine, margin, yPos);
            yPos += 4;
          });
          previousLineWasText = false;
        } else {
          // Regular text
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          const textLines = doc.splitTextToSize(trimmedLine, fullWidth);
          textLines.forEach((textLine) => {
            if (yPos > pageHeight - marginBottom - 5) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(textLine, margin, yPos);
            yPos += 3.5;
          });
          previousLineWasText = true;
        }
      });

      if (clinicFooter && clinicFooter.footerText) {
        const pageCount = doc.getNumberOfPages();
        for (let page = 1; page <= pageCount; page += 1) {
          doc.setPage(page);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.text(clinicFooter.footerText, 105, 292, { align: "center" });
        }
      }

      const pdfFilename = `${currentPatientId}_treatment_plan_${Date.now()}.pdf`;
      const rawPdfDataUri = doc.output("datauristring");
      const pdfDataUri = rawPdfDataUri.replace(
        /data:application\/pdf;(?:filename=[^;]+;)?base64,/,
        "data:application/pdf;base64,",
      );
      const pdfHeaders = {
        ...tenantHeaders,
        "Content-Type": "application/json",
      };

      const savePdfResponse = await fetch("/api/anatomical-analysis/save-pdf", {
        method: "POST",
        headers: pdfHeaders,
        body: JSON.stringify({
          patientId: currentPatientId,
          pdfData: pdfDataUri,
          filename: pdfFilename,
        }),
        credentials: "include",
      });

      if (savePdfResponse.ok) {
        const savedPdfResult = await savePdfResponse.json();
        console.log("[TREATMENT PLAN PDF] Saved:", savedPdfResult.path || savedPdfResult.filename);
        await fetchAnatomicalFiles();
        setAnatomicalUploadsTab("uploads");
        window.dispatchEvent(
          new CustomEvent("anatomicalFilesUpdated", {
            detail: { patientId: currentPatientId },
          }),
        );
        toast({
          title: "Treatment Plan Saved",
          description: "The generated treatment plan PDF is now stored in your anatomical analysis uploads.",
        });
      } else {
        console.error("[TREATMENT PLAN PDF] Failed to save PDF:", await savePdfResponse.text());
        toast({
          title: "Save Failed",
          description: "Unable to persist the treatment plan PDF. Please try again.",
          variant: "destructive",
        });
      }
    } catch (pdfError) {
      console.error("[TREATMENT PLAN PDF] Error saving PDF:", pdfError);
      toast({
        title: "Save Failed",
        description: "Unable to persist the treatment plan PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateTreatmentPlan = async () => {
    // Validate all fields before generating plan
    if (!validateAnatomicalFields()) {
      return;
    }

    setIsGeneratingPlan(true);
    
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        toast({
          title: "Error",
          description: "Patient ID is required to generate treatment plan.",
          variant: "destructive"
        });
        setIsGeneratingPlan(false);
        return;
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/ai/generate-treatment-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify({
          patientId: currentPatientId,
          muscleGroup: selectedMuscleGroup,
          analysisType: selectedAnalysisType,
          treatment: selectedTreatment,
          treatmentIntensity: selectedTreatmentIntensity,
          sessionFrequency: selectedSessionFrequency,
          primarySymptoms: primarySymptoms,
          severityScale: severityScale,
          followUpPlan: followUpPlan
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate treatment plan');
      }

      const data = await response.json();
      setGeneratedTreatmentPlan(data.treatmentPlan);
      void saveTreatmentPlanPdfToServer(currentPatientId, data.treatmentPlan);
      
      toast({
        title: "Treatment Plan Generated",
        description: "AI-powered treatment plan has been created successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate treatment plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const saveAnalysis = async () => {
    // Validate all fields before saving
    if (!validateAnatomicalFields()) {
      return;
    }

    setIsSavingAnalysis(true);
    
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        throw new Error("No patient selected");
      }

      // Build comprehensive analysis data
      const analysisData = {
        type: "consultation",
        title: "Clinical Examination - Professional Anatomical Analysis",
        notes: `Comprehensive facial muscle analysis completed.\n\n` +
               `Target Muscle Group: ${selectedMuscleGroup || 'Not specified'}\n` +
               `Analysis Type: ${selectedAnalysisType || 'Not specified'}\n` +
               `Primary Treatment: ${selectedTreatment || 'Not specified'}\n` +
               `Treatment Intensity: ${selectedTreatmentIntensity || 'Not specified'}\n` +
               `Session Frequency: ${selectedSessionFrequency || 'Not specified'}\n` +
               `Primary Symptoms: ${primarySymptoms || 'Not specified'}\n` +
               `Severity Scale: ${severityScale || 'Not specified'}\n` +
               `Follow-up Plan: ${followUpPlan || 'Not specified'}\n\n` +
               `${generatedTreatmentPlan ? 'Generated Treatment Plan:\n' + generatedTreatmentPlan : 'No treatment plan generated.'}`,
        diagnosis: `Professional anatomical analysis - ${selectedMuscleGroup ? selectedMuscleGroup.replace(/_/g, ' ') : 'General assessment'}`,
        treatment: selectedTreatment ? selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : undefined,
        followUpRequired: followUpPlan && followUpPlan !== "no_followup",
        followUpDate: followUpPlan && followUpPlan !== "no_followup" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const savedRecord = await response.json();
      
      toast({
        title: "Analysis Saved",
        description: "Professional anatomical analysis has been saved to patient medical records."
      });
      
      // Invalidate and refetch medical records
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      
    } catch (error) {
      console.error('Failed to save analysis:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save analysis. Please try again.";
      toast({
        title: "Save Failed", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  const describeFilledFields = <T extends Record<string, string | undefined>>(data: T) => {
    return (Object.keys(data) as Array<keyof T>)
      .filter((key) => Boolean(data[key]))
      .join(", ");
  };

  const savePhysicalExamination = async () => {
    // Validate all fields before saving
    if (!validatePhysicalExam()) {
      return;
    }

    setIsSavingPhysicalExam(true);
    
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        throw new Error("No patient selected");
      }

      // Build comprehensive examination data from consultationData.examination
      const examinationNotes = Object.entries(consultationData.examination)
        .filter(([_, value]) => value && value.trim()) // Only include filled fields
        .map(([system, value]) => `${system.replace('_', ' ').toUpperCase()}: ${value}`)
        .join('\n\n');

    const filledPhysicalFields = describeFilledFields(consultationData.examination);
    const physicalExamData = {
        type: "consultation",
        title: "Clinical Examination - Physical Examination Findings",
      notes: `Comprehensive physical examination completed.\n\n${examinationNotes || 'No examination findings recorded.'}`,
      diagnosis: `Physical examination findings - ${filledPhysicalFields || 'Multiple systems evaluated'}`,
        treatment: "Physical examination completed - refer to detailed findings for treatment recommendations"
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify(physicalExamData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const savedRecord = await response.json();
      
      toast({
        title: "Physical Examination Saved",
        description: "Physical examination findings have been saved to patient medical records."
      });
      
      // Invalidate and refetch medical records
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      
      // Close the modal
      setShowPhysicalExamModal(false);
      
    } catch (error) {
      console.error('Failed to save physical examination:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save physical examination. Please try again.";
      toast({
        title: "Save Failed", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSavingPhysicalExam(false);
    }
  };

  const saveRespiratoryExamination = async () => {
    // Validate all fields before saving
    if (!validateRespiratoryExam()) {
      return;
    }

    setIsSavingRespiratoryExam(true);
    
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        throw new Error("No patient selected");
      }

      // Build comprehensive respiratory examination data
      const examNotes = Object.entries(respiratoryExamData)
        .filter(([_, value]) => value && value.trim()) // Only include filled fields
        .map(([field, value]) => {
          const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${fieldName}: ${value}`;
        })
        .join('\n\n');

      const filledRespiratoryFields = describeFilledFields(respiratoryExamData);
      const respiratoryExamRecord = {
        type: "consultation",
        title: "Clinical Examination - Respiratory",
        notes: `Comprehensive respiratory examination completed.\n\n${examNotes || 'No respiratory examination findings recorded.'}`,
        diagnosis: `Respiratory examination findings - ${filledRespiratoryFields || 'Multiple parameters evaluated'}`,
        treatment: "Respiratory examination completed - refer to detailed findings for treatment recommendations"
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify(respiratoryExamRecord)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const savedRecord = await response.json();
      
      toast({
        title: "Respiratory Examination Saved",
        description: "Respiratory examination findings have been saved to patient medical records."
      });
      
      // Invalidate and refetch medical records
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      
      // Close the modal
      setShowRespiratoryExamModal(false);
      
    } catch (error) {
      console.error('Failed to save respiratory examination:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save respiratory examination. Please try again.";
      toast({
        title: "Save Failed", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSavingRespiratoryExam(false);
    }
  };

  const saveCardiovascularExamination = async () => {
    // Validate all fields before saving
    if (!validateCardiovascularExam()) {
      return;
    }

    setIsSavingCardiovascularExam(true);
    
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        throw new Error("No patient selected");
      }

      // Build comprehensive cardiovascular examination data
      const examNotes = Object.entries(cardiovascularExamData)
        .filter(([_, value]) => value && value.trim()) // Only include filled fields
        .map(([field, value]) => {
          const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${fieldName}: ${value}`;
        })
        .join('\n\n');

      const filledCardiovascularFields = describeFilledFields(cardiovascularExamData);
      const cardiovascularExamRecord = {
        type: "consultation",
        title: "Clinical Examination - Cardiovascular",
        notes: `Comprehensive cardiovascular examination completed.\n\n${examNotes || 'No cardiovascular examination findings recorded.'}`,
        diagnosis: `Cardiovascular examination findings - ${filledCardiovascularFields || 'Multiple parameters evaluated'}`,
        treatment: "Cardiovascular examination completed - refer to detailed findings for treatment recommendations"
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify(cardiovascularExamRecord)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const savedRecord = await response.json();
      
      toast({
        title: "Cardiovascular Examination Saved",
        description: "Cardiovascular examination findings have been saved to patient medical records."
      });
      
      // Invalidate and refetch medical records
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      
      // Close the modal
      setShowCardiovascularExamModal(false);
      
    } catch (error) {
      console.error('Failed to save cardiovascular examination:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save cardiovascular examination. Please try again.";
      toast({
        title: "Save Failed", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSavingCardiovascularExam(false);
    }
  };

  const saveNeurologicalExamination = async () => {
    // Validate all fields before saving
    if (!validateNeurologicalExam()) {
      return;
    }

    setIsSavingNeurologicalExam(true);
    
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        throw new Error("No patient selected");
      }

      // Build comprehensive neurological examination data
      const examNotes = Object.entries(neurologicalExamData)
        .filter(([_, value]) => value && value.trim()) // Only include filled fields
        .map(([field, value]) => {
          const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${fieldName}: ${value}`;
        })
        .join('\n\n');

      const filledNeurologicalFields = describeFilledFields(neurologicalExamData);
      const neurologicalExamRecord = {
        type: "consultation",
        title: "Clinical Examination - Neurological Examination",
        notes: `Comprehensive neurological examination completed.\n\n${examNotes || 'No neurological examination findings recorded.'}`,
        diagnosis: `Neurological examination findings - ${filledNeurologicalFields || 'Multiple parameters evaluated'}`,
        treatment: "Neurological examination completed - refer to detailed findings for treatment recommendations"
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify(neurologicalExamRecord)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const savedRecord = await response.json();
      
      toast({
        title: "Neurological Examination Saved",
        description: "Neurological examination findings have been saved to patient medical records."
      });
      
      // Invalidate and refetch medical records
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      
      // Close the modal
      setShowNeurologicalExamModal(false);
      
    } catch (error) {
      console.error('Failed to save neurological examination:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save neurological examination. Please try again.";
      toast({
        title: "Save Failed", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSavingNeurologicalExam(false);
    }
  };

  const saveGeneralExamination = async () => {
    // Validate all fields before saving
    if (!validateGeneralExam()) {
      return;
    }

    setIsSavingGeneralExam(true);
    
    try {
      const currentPatientId = patientId || patient?.id;
      if (!currentPatientId) {
        throw new Error("No patient selected");
      }

      // Build comprehensive general examination data
      const examNotes = Object.entries(generalExamData)
        .filter(([_, value]) => value && value.trim()) // Only include filled fields
        .map(([field, value]) => {
          const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${fieldName}: ${value}`;
        })
        .join('\n\n');

      const generalExamRecord = {
        type: "consultation",
        title: "Clinical Examination - General",
        notes: `Comprehensive general examination completed.\n\n${examNotes || 'No general examination findings recorded.'}`,
        diagnosis: `General examination findings - ${Object.keys(generalExamData).filter(key => generalExamData[key]).join(', ') || 'Multiple parameters evaluated'}`,
        treatment: "General examination completed - refer to detailed findings for treatment recommendations"
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${currentPatientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getTenantSubdomain()
        },
        body: JSON.stringify(generalExamRecord)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const savedRecord = await response.json();
      
      toast({
        title: "General Examination Saved",
        description: "General examination findings have been saved to patient medical records."
      });
      
      // Invalidate and refetch medical records
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'records'] });
      
      // Close the modal
      setShowGeneralExamModal(false);
      
    } catch (error) {
      console.error('Failed to save general examination:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save general examination. Please try again.";
      toast({
        title: "Save Failed", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSavingGeneralExam(false);
    }
  };

  const saveConsultation = useMutation({
    mutationFn: async () => {
      const consultationRecord = {
        patientId: patient?.id,
        date: consultationStartTime,
        vitals,
        consultationData,
        duration: Math.round((Date.now() - consultationStartTime.getTime()) / (1000 * 60)),
        status: 'completed'
      };

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultationRecord)
      });

      if (!response.ok) throw new Error('Failed to save consultation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultation Saved",
        description: "The consultation has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/consultations'] });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save consultation. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addPrescription = () => {
    setConsultationData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        medication: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: ""
      }]
    }));
  };

  const removePrescription = (index: number) => {
    setConsultationData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  const updatePrescription = (index: number, field: string, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((rx, i) => 
        i === index ? { ...rx, [field]: value } : rx
      )
    }));
  };

  const addReferral = () => {
    setConsultationData(prev => ({
      ...prev,
      referrals: [...prev.referrals, {
        specialty: "",
        urgency: "routine" as const,
        reason: ""
      }]
    }));
  };

  const removeReferral = (index: number) => {
    setConsultationData(prev => ({
      ...prev,
      referrals: prev.referrals.filter((_, i) => i !== index)
    }));
  };

  const updateReferral = (index: number, field: string, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      referrals: prev.referrals.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const addInvestigation = () => {
    setConsultationData(prev => ({
      ...prev,
      investigations: [...prev.investigations, {
        type: "",
        urgency: "routine" as const,
        reason: ""
      }]
    }));
  };

  const removeInvestigation = (index: number) => {
    setConsultationData(prev => ({
      ...prev,
      investigations: prev.investigations.filter((_, i) => i !== index)
    }));
  };

  const updateInvestigation = (index: number, field: string, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      investigations: prev.investigations.map((inv, i) => 
        i === index ? { ...inv, [field]: value } : inv
      )
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Full Consultation - {patient?.firstName && patient?.lastName ? `${patient.firstName} ${patient.lastName}` : (patientName || 'Loading...')}
            </DialogTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Started: {format(consultationStartTime, "HH:mm")}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(), "dd/MM/yyyy")}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="vitals" className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4" />
                Vitals
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="examination" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Examination
              </TabsTrigger>
              <TabsTrigger value="assessment" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Assessment
              </TabsTrigger>
              <TabsTrigger value="plan" className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Plan
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="w-full space-y-4 min-h-[60vh] lg:min-h-[70vh]">
              <div className="w-full grid gap-4 h-full">
                <Card className="w-full h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-red-600" />
                      Vital Signs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="w-full">
                    <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bp" className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        Blood Pressure
                      </Label>
                      <Input
                        id="bp"
                        placeholder="120/80"
                        value={vitals.bloodPressure}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, bloodPressure: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, bloodPressure: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateBloodPressure(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, bloodPressure: error }));
                        }}
                        className={vitalsErrors.bloodPressure ? "border-red-500" : ""}
                      />
                      {vitalsErrors.bloodPressure && (
                        <p className="text-sm text-red-500">{vitalsErrors.bloodPressure}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hr" className="flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-red-500" />
                        Heart Rate (bpm) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="hr"
                        type="number"
                        placeholder="72"
                        value={vitals.heartRate}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, heartRate: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, heartRate: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateHeartRate(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, heartRate: error }));
                        }}
                        className={vitalsErrors.heartRate ? "border-red-500" : ""}
                      />
                      {vitalsErrors.heartRate && (
                        <p className="text-sm text-red-500">{vitalsErrors.heartRate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temp" className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        Temperature (°C) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="temp"
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        value={vitals.temperature}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, temperature: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, temperature: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateTemperature(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, temperature: error }));
                        }}
                        className={vitalsErrors.temperature ? "border-red-500" : ""}
                      />
                      {vitalsErrors.temperature && (
                        <p className="text-sm text-red-500">{vitalsErrors.temperature}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rr" className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        Respiratory Rate <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="rr"
                        type="number"
                        placeholder="16"
                        value={vitals.respiratoryRate}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, respiratoryRate: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, respiratoryRate: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateRespiratoryRate(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, respiratoryRate: error }));
                        }}
                        className={vitalsErrors.respiratoryRate ? "border-red-500" : ""}
                      />
                      {vitalsErrors.respiratoryRate && (
                        <p className="text-sm text-red-500">{vitalsErrors.respiratoryRate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spo2" className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        Oxygen Saturation (%) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="spo2"
                        type="number"
                        placeholder="98"
                        value={vitals.oxygenSaturation}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, oxygenSaturation: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, oxygenSaturation: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateOxygenSaturation(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, oxygenSaturation: error }));
                        }}
                        className={vitalsErrors.oxygenSaturation ? "border-red-500" : ""}
                      />
                      {vitalsErrors.oxygenSaturation && (
                        <p className="text-sm text-red-500">{vitalsErrors.oxygenSaturation}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight" className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-green-500" />
                        Weight (kg) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="70"
                        value={vitals.weight}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, weight: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, weight: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateWeight(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, weight: error }));
                        }}
                        className={vitalsErrors.weight ? "border-red-500" : ""}
                      />
                      {vitalsErrors.weight && (
                        <p className="text-sm text-red-500">{vitalsErrors.weight}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height" className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-green-500" />
                        Height (cm) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.1"
                        placeholder="170"
                        value={vitals.height}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, height: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, height: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateHeight(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, height: error }));
                        }}
                        className={vitalsErrors.height ? "border-red-500" : ""}
                      />
                      {vitalsErrors.height && (
                        <p className="text-sm text-red-500">{vitalsErrors.height}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bmi" className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        BMI (Optional)
                      </Label>
                      <Input
                        id="bmi"
                        type="number"
                        step="0.1"
                        placeholder="24.2"
                        value={vitals.bmi}
                        onChange={(e) => {
                          setVitals(prev => ({ ...prev, bmi: e.target.value }));
                          setVitalsErrors(prev => ({ ...prev, bmi: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateBMI(e.target.value);
                          setVitalsErrors(prev => ({ ...prev, bmi: error }));
                        }}
                        className={vitalsErrors.bmi ? "border-red-500" : ""}
                      />
                      {vitalsErrors.bmi && (
                        <p className="text-sm text-red-500">{vitalsErrors.bmi}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Save Vitals Button */}
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={handleSaveVitals} 
                  disabled={saveVitalsMutation.isPending}
                  className="bg-medical-blue hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveVitalsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Chief Complaint <span className="text-red-500">*</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Patient's main concern or reason for today's visit..."
                      value={consultationData.chiefComplaint}
                      maxLength={255}
                      onChange={(e) => {
                        setConsultationData(prev => ({ ...prev, chiefComplaint: e.target.value }));
                        setHistoryErrors(prev => ({ ...prev, chiefComplaint: "" }));
                      }}
                      onBlur={(e) => {
                        const error = validateTextField(e.target.value, "Chief Complaint", 5, 255);
                        setHistoryErrors(prev => ({ ...prev, chiefComplaint: error }));
                      }}
                      className={`h-20 ${historyErrors.chiefComplaint ? "border-red-500" : ""}`}
                    />
                    {historyErrors.chiefComplaint && (
                      <p className="text-sm text-red-500 mt-1">{historyErrors.chiefComplaint}</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      History of Presenting Complaint <span className="text-red-500">*</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Detailed history of the current problem - onset, duration, character, location, radiation, associations, time course, exacerbating/relieving factors, severity..."
                      value={consultationData.historyPresentingComplaint}
                      maxLength={500}
                      onChange={(e) => {
                        setConsultationData(prev => ({ ...prev, historyPresentingComplaint: e.target.value }));
                        setHistoryErrors(prev => ({ ...prev, historyPresentingComplaint: "" }));
                      }}
                      onBlur={(e) => {
                        const error = validateTextField(e.target.value, "History of Presenting Complaint", 5, 500);
                        setHistoryErrors(prev => ({ ...prev, historyPresentingComplaint: error }));
                      }}
                      className={`h-32 ${historyErrors.historyPresentingComplaint ? "border-red-500" : ""}`}
                    />
                    {historyErrors.historyPresentingComplaint && (
                      <p className="text-sm text-red-500 mt-1">{historyErrors.historyPresentingComplaint}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review of Systems</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(consultationData.reviewOfSystems).map(([system, value]) => (
                        <div key={system} className="space-y-2">
                          <Label className="capitalize font-medium">{system.replace(/_/g, ' ')}</Label>
                          <Textarea
                            placeholder={`${system.replace(/_/g, ' ')} related symptoms...`}
                            value={value}
                            maxLength={500}
                            onChange={(e) => {
                              setConsultationData(prev => ({
                                ...prev,
                                reviewOfSystems: { ...prev.reviewOfSystems, [system]: e.target.value }
                              }));
                              setHistoryErrors(prev => ({
                                ...prev,
                                reviewOfSystems: { ...prev.reviewOfSystems, [system]: "" }
                              }));
                            }}
                            onBlur={(e) => {
                              const systemName = system.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                              const error = validateTextField(e.target.value, systemName, 0, 500);
                              setHistoryErrors(prev => ({
                                ...prev,
                                reviewOfSystems: { ...prev.reviewOfSystems, [system]: error }
                              }));
                            }}
                            className={`h-16 ${historyErrors.reviewOfSystems[system as keyof typeof historyErrors.reviewOfSystems] ? "border-red-500" : ""}`}
                          />
                          {historyErrors.reviewOfSystems[system as keyof typeof historyErrors.reviewOfSystems] && (
                            <p className="text-sm text-red-500 mt-1">
                              {historyErrors.reviewOfSystems[system as keyof typeof historyErrors.reviewOfSystems]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Save History Button */}
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={handleSaveHistory} 
                    disabled={saveHistoryMutation.isPending}
                    className="bg-medical-blue hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveHistoryMutation.isPending ? "Saving..." : "Save History"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="examination" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                      Examination
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                        <Select 
                          value={selectedExaminationType} 
                          onValueChange={(value) => {
                            setSelectedExaminationType(value);
                            // Directly open the corresponding examination window
                            switch(value) {
                              case 'general':
                                setShowGeneralExamModal(true);
                                break;
                              case 'cardiovascular':
                                setShowCardiovascularExamModal(true);
                                break;
                              case 'respiratory':
                                setShowRespiratoryExamModal(true);
                                break;
                              case 'neurological':
                                setShowNeurologicalExamModal(true);
                                break;
                              case 'anatomical':
                                setShowAnatomicalModal(true);
                                break;
                              case 'physical':
                                setShowPhysicalExamModal(true);
                                break;
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose examination type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Examination</SelectItem>
                            <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                            <SelectItem value="respiratory">Respiratory</SelectItem>
                            <SelectItem value="neurological">Neurological</SelectItem>
                            <SelectItem value="anatomical">Anatomical (View Muscles)</SelectItem>
                            <SelectItem value="physical">Physical Examination Findings</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Clinical Notes Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Clinical Notes <span className="text-red-500">*</span>
                      </CardTitle>
                      <Button 
                        variant={isRecording ? "destructive" : "outline"} 
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isRecording ? 'Stop Recording' : 'Transcribe Audio'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Detailed consultation notes, observations, and findings. Click 'Transcribe Audio' to dictate your notes."
                      className={`h-32 ${examinationErrors.clinicalNotes ? "border-red-500" : ""}`}
                      maxLength={500}
                      value={clinicalNotes + transcript}
                      onChange={(e) => {
                        setClinicalNotes(e.target.value);
                        setExaminationErrors(prev => ({ ...prev, clinicalNotes: "" }));
                      }}
                      onBlur={(e) => {
                        const error = validateExaminationField(e.target.value, "Clinical Notes", 5, 500);
                        setExaminationErrors(prev => ({ ...prev, clinicalNotes: error }));
                      }}
                    />
                    {examinationErrors.clinicalNotes && (
                      <p className="text-sm text-red-500 mt-1">{examinationErrors.clinicalNotes}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Diagnosis and Treatment Plan Section */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Diagnosis <span className="text-red-500">*</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Primary and secondary diagnoses with ICD codes..."
                        className={`h-32 ${examinationErrors.diagnosis ? "border-red-500" : ""}`}
                        maxLength={500}
                        value={examinationDiagnosis}
                        onChange={(e) => {
                          setExaminationDiagnosis(e.target.value);
                          setExaminationErrors(prev => ({ ...prev, diagnosis: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateExaminationField(e.target.value, "Diagnosis", 5, 500);
                          setExaminationErrors(prev => ({ ...prev, diagnosis: error }));
                        }}
                      />
                      {examinationErrors.diagnosis && (
                        <p className="text-sm text-red-500 mt-1">{examinationErrors.diagnosis}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Treatment Plan <span className="text-red-500">*</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Treatment recommendations and care plan..."
                        className={`h-32 ${examinationErrors.treatmentPlan ? "border-red-500" : ""}`}
                        maxLength={500}
                        value={examinationTreatmentPlan}
                        onChange={(e) => {
                          setExaminationTreatmentPlan(e.target.value);
                          setExaminationErrors(prev => ({ ...prev, treatmentPlan: "" }));
                        }}
                        onBlur={(e) => {
                          const error = validateExaminationField(e.target.value, "Treatment Plan", 5, 500);
                          setExaminationErrors(prev => ({ ...prev, treatmentPlan: error }));
                        }}
                      />
                      {examinationErrors.treatmentPlan && (
                        <p className="text-sm text-red-500 mt-1">{examinationErrors.treatmentPlan}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-medical-blue hover:bg-blue-700 text-white"
                    onClick={handleSaveExamination}
                    disabled={saveExaminationMutation.isPending}
                  >
                    {saveExaminationMutation.isPending ? 'Saving...' : 'Save Record'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assessment" className="w-full space-y-4 min-h-[60vh] lg:min-h-[70vh]">
              <div className="w-full grid gap-4 h-full">
                <Card className="w-full h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Clinical Assessment & Diagnosis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="assessment" className="text-base font-medium">Assessment & Working Diagnosis</Label>
                      <Textarea
                        id="assessment"
                        placeholder="Clinical assessment, differential diagnosis, working diagnosis, and clinical reasoning..."
                        value={consultationData.assessment}
                        maxLength={255}
                        className={`mt-2 h-40 ${assessmentError ? "border-red-500" : ""}`}
                        onChange={(e) => {
                          setConsultationData(prev => ({ ...prev, assessment: e.target.value }));
                          setAssessmentError("");
                        }}
                        onBlur={(e) => {
                          const error = validateAssessmentField(e.target.value);
                          setAssessmentError(error);
                        }}
                      />
                      {assessmentError && (
                        <p className="text-sm text-red-500 mt-1">{assessmentError}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Save Assessment Button */}
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleSaveAssessment}
                  disabled={saveAssessmentMutation.isPending}
                  data-testid="button-save-assessment"
                >
                  {saveAssessmentMutation.isPending ? 'Saving...' : 'Save Assessment'}
                </Button>
              </div>
              </div>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Management Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Treatment plan, lifestyle advice, follow-up instructions, patient education..."
                      value={consultationData.plan}
                      maxLength={255}
                      className={`h-32 ${planError ? "border-red-500" : ""}`}
                      onChange={(e) => {
                        setConsultationData(prev => ({ ...prev, plan: e.target.value }));
                        setPlanError("");
                      }}
                      onBlur={(e) => {
                        const error = validatePlanField(e.target.value);
                        setPlanError(error);
                      }}
                    />
                    {planError && (
                      <p className="text-sm text-red-500 mt-1">{planError}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Pill className="w-5 h-5 text-green-600" />
                        Prescriptions
                      </CardTitle>
                      <Button onClick={addPrescription} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Prescription
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {consultationData.prescriptions.map((prescription, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Prescription {index + 1}</h4>
                            <Button 
                              onClick={() => removePrescription(index)} 
                              variant="outline" 
                              size="sm"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Medication</Label>
                              <Input
                                placeholder="Medication name"
                                value={prescription.medication}
                                onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Dosage</Label>
                              <Input
                                placeholder="e.g., 500mg"
                                value={prescription.dosage}
                                onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Frequency</Label>
                              <Input
                                placeholder="e.g., Twice daily"
                                value={prescription.frequency}
                                onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Duration</Label>
                              <Input
                                placeholder="e.g., 7 days"
                                value={prescription.duration}
                                onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Instructions</Label>
                            <Textarea
                              placeholder="Special instructions for the patient..."
                              value={prescription.instructions}
                              onChange={(e) => updatePrescription(index, 'instructions', e.target.value)}
                              className="h-16"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Referrals</CardTitle>
                      <Button onClick={addReferral} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Referral
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {consultationData.referrals.map((referral, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Referral {index + 1}</h4>
                            <Button 
                              onClick={() => removeReferral(index)} 
                              variant="outline" 
                              size="sm"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Specialty</Label>
                              <Input
                                placeholder="e.g., Cardiology"
                                value={referral.specialty}
                                onChange={(e) => updateReferral(index, 'specialty', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Urgency</Label>
                              <Select 
                                value={referral.urgency} 
                                onValueChange={(value) => updateReferral(index, 'urgency', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="routine">Routine</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                  <SelectItem value="2ww">2 Week Wait</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Reason</Label>
                              <Input
                                placeholder="Reason for referral"
                                value={referral.reason}
                                onChange={(e) => updateReferral(index, 'reason', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Investigations</CardTitle>
                      <Button onClick={addInvestigation} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Investigation
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {consultationData.investigations.map((investigation, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Investigation {index + 1}</h4>
                            <Button 
                              onClick={() => removeInvestigation(index)} 
                              variant="outline" 
                              size="sm"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Type</Label>
                              <Input
                                placeholder="e.g., Blood Test"
                                value={investigation.type}
                                onChange={(e) => updateInvestigation(index, 'type', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Urgency</Label>
                              <Select 
                                value={investigation.urgency} 
                                onValueChange={(value) => updateInvestigation(index, 'urgency', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="routine">Routine</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Reason</Label>
                              <Input
                                placeholder="Clinical indication"
                                value={investigation.reason}
                                onChange={(e) => updateInvestigation(index, 'reason', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="w-full space-y-4 min-h-[60vh] lg:min-h-[70vh]">
              <div className="w-full grid gap-4 h-full">
                <Card className="w-full h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Consultation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Chief Complaint</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm">{consultationData.chiefComplaint || "Not recorded"}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Assessment</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm">{consultationData.assessment || "Not recorded"}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Plan</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm">{consultationData.plan || "Not recorded"}</p>
                      </div>
                    </div>

                    {consultationData.prescriptions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Prescriptions ({consultationData.prescriptions.length})</h4>
                        <div className="space-y-2">
                          {consultationData.prescriptions.map((rx, index) => (
                            <div key={index} className="bg-green-50 p-3 rounded-lg border-l-4 border-l-green-500">
                              <p className="font-medium">{rx.medication} {rx.dosage}</p>
                              <p className="text-sm text-gray-600">{rx.frequency} for {rx.duration}</p>
                              {rx.instructions && <p className="text-sm text-gray-600 mt-1">{rx.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {consultationData.referrals.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Referrals ({consultationData.referrals.length})</h4>
                        <div className="space-y-2">
                          {consultationData.referrals.map((ref, index) => (
                            <div key={index} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-l-yellow-500">
                              <p className="font-medium">{ref.specialty} - {ref.urgency}</p>
                              <p className="text-sm text-gray-600">{ref.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {consultationData.investigations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Investigations ({consultationData.investigations.length})</h4>
                        <div className="space-y-2">
                          {consultationData.investigations.map((inv, index) => (
                            <div key={index} className="bg-purple-50 p-3 rounded-lg border-l-4 border-l-purple-500">
                              <p className="font-medium">{inv.type} - {inv.urgency}</p>
                              <p className="text-sm text-gray-600">{inv.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Summary Actions */}
              <div className="flex justify-between gap-3 mt-6">
                <Button 
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  onClick={handleViewFullConsultation}
                  data-testid="button-view-full-consultation"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Consultation
                </Button>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveSummary}
                    disabled={saveSummaryMutation.isPending}
                    data-testid="button-save-summary"
                  >
                    {saveSummaryMutation.isPending ? 'Saving...' : 'Save Summary'}
                  </Button>
                </div>
              </div>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </DialogContent>

      {/* Anatomical View Modal - Step-by-step Flow */}
      <Dialog open={showAnatomicalModal} onOpenChange={(open) => {
        setShowAnatomicalModal(open);
        if (!open) {
          setAnatomicalStep(1); // Reset to first step when closing
        }
      }}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                Professional Anatomical Analysis
              </DialogTitle>
              {anatomicalStep > 1 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className={`w-2 h-2 rounded-full ${anatomicalStep === 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Advanced facial muscle analysis with optimized container spacing
            </p>
          </DialogHeader>

          {/* Step 1: Professional Anatomical Analysis */}
          {anatomicalStep === 1 && (
            <div className="space-y-6 p-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative bg-white rounded-lg p-6 w-full max-w-4xl border shadow-sm">
                  <div className="relative" ref={containerRef}>
                    <img
                      ref={imageRef}
                      src={anatomicalImages[currentImageIndex]}
                      alt="Professional Anatomical Analysis"
                      className={`w-full h-[600px] max-w-2xl mx-auto rounded-lg object-contain ${calibrationMode ? 'cursor-crosshair' : ''}`}
                      onLoad={() => {
                        setImageLoaded(true);
                        updateOverlayPosition();
                      }}
                      onClick={handleCalibrationClick}
                    />
                    
                    
                    {/* BLACK DOT CIRCLE OVERLAY - Yellow circles around detected black dots */}
                    {showBlackDotPolygons && detectedBlackDots.length > 0 && overlayPosition && imageLoaded && (
                      <svg
                        className="absolute pointer-events-none z-40"
                        style={{
                          left: overlayPosition.left,
                          top: overlayPosition.top,
                          width: overlayPosition.width,
                          height: overlayPosition.height,
                        }}
                        viewBox={`0 0 ${overlayPosition.width} ${overlayPosition.height}`}
                      >
                        {detectedBlackDots.map((dot) => {
                          const centerX = dot.xPct * overlayPosition.width;
                          const centerY = dot.yPct * overlayPosition.height;
                          const radius = 15; // Radius for the circle around each dot
                          
                          return (
                            <g key={dot.id}>
                              {/* Yellow circle highlight */}
                              <circle
                                cx={centerX}
                                cy={centerY}
                                r={radius}
                                fill="rgba(255, 255, 0, 0.4)"
                                stroke="rgba(255, 215, 0, 0.9)"
                                strokeWidth="2"
                                style={{ animation: 'pulse 2s ease-in-out infinite' }}
                              />
                              
                              {/* Unique number label for each circle */}
                              <circle
                                cx={centerX}
                                cy={centerY}
                                r="12"
                                fill="rgba(255, 255, 0, 0.8)"
                                stroke="rgba(255, 215, 0, 1)"
                                strokeWidth="2"
                              />
                            </g>
                          );
                        })}
                      </svg>
                    )}
                    
                    {/* SAVED MUSCLE POSITIONS OVERLAY - Blue squares showing saved positions */}
                    {showSavedPositions && savedMusclePositions.length > 0 && overlayPosition && imageLoaded && (
                      <svg
                        className="absolute pointer-events-none z-30"
                        style={{
                          left: overlayPosition.left,
                          top: overlayPosition.top,
                          width: overlayPosition.width,
                          height: overlayPosition.height,
                        }}
                        viewBox={`0 0 ${overlayPosition.width} ${overlayPosition.height}`}
                      >
                        {savedMusclePositions.map((position) => {
                          const centerX = position.xPct * overlayPosition.width;
                          const centerY = position.yPct * overlayPosition.height;
                          const size = 16; // Size for the square highlight
                          
                          return (
                            <g key={position.id}>
                              {/* Blue square highlight for saved positions */}
                              <rect
                                x={centerX - size/2}
                                y={centerY - size/2}
                                width={size}
                                height={size}
                                fill="rgba(59, 130, 246, 0.5)"
                                stroke="rgba(37, 99, 235, 0.9)"
                                strokeWidth="2"
                                style={{ animation: 'pulse 3s ease-in-out infinite' }}
                              />
                              
                              {/* Position number and muscle name label */}
                              <circle
                                cx={centerX}
                                cy={centerY}
                                r="10"
                                fill="rgba(59, 130, 246, 0.8)"
                                stroke="rgba(37, 99, 235, 1)"
                                strokeWidth="2"
                              />
                              
                              {/* Muscle name tooltip */}
                              <text
                                x={centerX}
                                y={centerY - 25}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="bold"
                                fill="rgba(37, 99, 235, 1)"
                                className="pointer-events-none select-none"
                              >
                                {position.muscleName}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    )}
                    
                    {/* DATABASE HIGHLIGHTED MUSCLE POSITIONS - Yellow circles from dropdown selection */}
                    {highlightedMuscleFromDB.length > 0 && overlayPosition && imageLoaded && (
                      <svg
                        className="absolute pointer-events-none z-35"
                        style={{
                          left: overlayPosition.left,
                          top: overlayPosition.top,
                          width: overlayPosition.width,
                          height: overlayPosition.height,
                        }}
                        viewBox={`0 0 ${overlayPosition.width} ${overlayPosition.height}`}
                      >
                        {highlightedMuscleFromDB.map((position) => {
                          // Parse coordinates from JSON string
                          let coordinates;
                          try {
                            coordinates = typeof position.coordinates === 'string' 
                              ? JSON.parse(position.coordinates) 
                              : position.coordinates;
                          } catch (e) {
                            console.error('Error parsing coordinates:', e);
                            return null;
                          }

                          if (!coordinates || !coordinates.xPct || !coordinates.yPct) return null;

                          const centerX = coordinates.xPct * overlayPosition.width;
                          const centerY = coordinates.yPct * overlayPosition.height;
                          const radius = 20; // Larger radius for database highlights
                          
                          return (
                            <g key={`db-${position.id}`}>
                              {/* Yellow circle highlight */}
                              <circle
                                cx={centerX}
                                cy={centerY}
                                r={radius}
                                fill="rgba(255, 255, 0, 0.6)"
                                stroke="rgba(255, 215, 0, 1)"
                                strokeWidth="3"
                                style={{ animation: 'pulse 2s ease-in-out infinite' }}
                              />
                              
                              {/* Position label with muscle name */}
                              <circle
                                cx={centerX}
                                cy={centerY}
                                r="15"
                                fill="rgba(255, 255, 0, 0.9)"
                                stroke="rgba(255, 215, 0, 1)"
                                strokeWidth="2"
                              />
                              
                              {/* Muscle name tooltip */}
                              <text
                                x={centerX}
                                y={centerY - 30}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="bold"
                                fill="rgba(255, 215, 0, 1)"
                                className="pointer-events-none select-none"
                                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                              >
                                {position.value}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    )}
                    
                    {/* CALIBRATION OVERLAY - For precise coordinate mapping */}
                    {calibrationMode && overlayPosition && imageLoaded && (
                      <svg
                        className="absolute pointer-events-none z-50"
                        style={{
                          left: overlayPosition.left,
                          top: overlayPosition.top,
                          width: overlayPosition.width,
                          height: overlayPosition.height
                        }}
                      >
                        {/* Calibration Points */}
                        {calibrationPoints.map((point, index) => (
                          <circle
                            key={index}
                            cx={point.xPct * overlayPosition.width}
                            cy={point.yPct * overlayPosition.height}
                            r="4"
                            fill="red"
                            stroke="white"
                            strokeWidth="2"
                          />
                        ))}
                        
                        {/* Calibration Circle Preview */}
                        {calibrationPoints.length > 0 && (
                          <>
                            {calibrationPoints.map((point, index) => (
                              <circle
                                key={index}
                                cx={point.xPct * overlayPosition.width}
                                cy={point.yPct * overlayPosition.height}
                                r="8"
                                fill="rgba(255, 0, 0, 0.2)"
                                stroke="red"
                                strokeWidth="2"
                              />
                            ))}
                          </>
                        )}
                      </svg>
                    )}
                  </div>

                  {/* Calibration Controls - Development Tool */}
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg border">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        
                        {showBlackDotPolygons && (
                          <>
                            <button
                              onClick={saveMusclePositions}
                              disabled={!(patientId || patient?.id) || detectedBlackDots.length === 0}
                              className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 font-medium"
                              data-testid="button-save-muscle-positions"
                            >
                              💾 Save to Database ({detectedBlackDots.length})
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowBlackDotPolygons(false);
                                setDetectedBlackDots([]);
                              }}
                              className="px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                            >
                              Clear Dots ({detectedBlackDots.length})
                            </button>
                          </>
                        )}
                        
                        {showSavedPositions && (
                          <button
                            onClick={() => {
                              setShowSavedPositions(false);
                              setSavedMusclePositions([]);
                            }}
                            className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Hide Saved ({savedMusclePositions.length})
                          </button>
                        )}
                        
                        {calibrationMode && (
                          <>
                            <button
                              onClick={() => setCalibrationPoints([])}
                              className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                            >
                              Clear Points
                            </button>
                            
                            <button
                              onClick={exportCalibrationData}
                              disabled={calibrationPoints.length === 0}
                              className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                            >
                              Export ({calibrationPoints.length} pts)
                            </button>
                          </>
                        )}
                      </div>
                      
                      {calibrationMode && (
                        <div className="text-sm text-gray-600">
                          Click on the Temporalis muscle area to trace its outline
                        </div>
                      )}
                      
                      {showBlackDotPolygons && (
                        <div className="text-sm text-green-700 font-medium">
                          {detectedBlackDots.length} black dots detected with numbered yellow circles
                        </div>
                      )}
                      
                      {showSavedPositions && (
                        <div className="text-sm text-blue-700 font-medium">
                          {savedMusclePositions.length} saved muscle positions displayed with blue squares
                        </div>
                      )}
                      
                      {highlightedMuscleFromDB.length > 0 && (
                        <div className="text-sm text-yellow-700 font-medium">
                          🎯 {highlightedMuscleFromDB.length} database position(s) highlighted for {selectedMuscleGroup.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hidden Canvas for Image Analysis */}
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />

                  {/* Navigation controls */}
                  <div className="flex justify-between items-center mt-6">
                    <Button
                      onClick={() => navigateImage('prev')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      ← Previous
                    </Button>
                    <Button
                      onClick={() => setAnatomicalStep(2)}
                      className="bg-blue-600 hover:bg-blue-700 px-8"
                    >
                      Professional Medical Anatomical Diagram →
                    </Button>
                    <Button
                      onClick={() => navigateImage('next')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Configuration Window Below Image */}
              <div className="w-full max-w-6xl mx-auto">
                
                <div className="grid grid-cols-2 gap-8 mb-6">
                  {/* Left Side: Facial Muscle Analysis */}
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Facial Muscle Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Target Muscle Group</Label>
                        <Select 
                          value={selectedMuscleGroup} 
                          onValueChange={(value) => {
                            setSelectedMuscleGroup(value);
                            clearAnatomicalError('muscleGroup');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.muscleGroup ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select muscle group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="frontalis">Frontalis (Forehead)</SelectItem>
                            <SelectItem value="temporalis">Temporalis</SelectItem>
                            <SelectItem value="corrugator_supercilii">Corrugator Supercilii</SelectItem>
                            <SelectItem value="procerus">Procerus</SelectItem>
                            <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                            <SelectItem value="levator_labii_superioris">Levator Labii Superioris</SelectItem>
                            <SelectItem value="zygomaticus_major">Zygomaticus Major</SelectItem>
                            <SelectItem value="zygomaticus_minor">Zygomaticus Minor</SelectItem>
                            <SelectItem value="masseter">Masseter</SelectItem>
                            <SelectItem value="buccinator">Buccinator</SelectItem>
                            <SelectItem value="orbicularis_oris">Orbicularis Oris</SelectItem>
                            <SelectItem value="mentalis">Mentalis</SelectItem>
                            <SelectItem value="depressor_anguli_oris">Depressor Anguli Oris</SelectItem>
                            <SelectItem value="depressor_labii_inferioris">Depressor Labii Inferioris</SelectItem>
                            <SelectItem value="platysma">Platysma</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.muscleGroup && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.muscleGroup}</p>
                        )}
                        {selectedMuscleGroup && (
                          <Button
                            onClick={saveImageWithYellowDots}
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-800"
                            data-testid="button-save-image-with-dots"
                          >
                            💾 Save Image with Yellow Dot Position
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Analysis Type</Label>
                        <Select 
                          value={selectedAnalysisType} 
                          onValueChange={(value) => {
                            setSelectedAnalysisType(value);
                            clearAnatomicalError('analysisType');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.analysisType ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select analysis type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                            <SelectItem value="weakness">Muscle Weakness</SelectItem>
                            <SelectItem value="hyperactivity">Hyperactivity Assessment</SelectItem>
                            <SelectItem value="coordination">Coordination Testing</SelectItem>
                            <SelectItem value="range_of_motion">Range of Motion</SelectItem>
                            <SelectItem value="functional_assessment">Functional Assessment</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.analysisType && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.analysisType}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Side: Treatment Options */}
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Treatment Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Primary Treatment</Label>
                        <Select 
                          value={selectedTreatment} 
                          onValueChange={(value) => {
                            setSelectedTreatment(value);
                            clearAnatomicalError('treatment');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.treatment ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select primary treatment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                            <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                            <SelectItem value="facial_exercise">Facial Exercise Therapy</SelectItem>
                            <SelectItem value="massage_therapy">Therapeutic Massage</SelectItem>
                            <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                            <SelectItem value="neuromuscular_reeducation">Neuromuscular Reeducation</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.treatment && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.treatment}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Treatment Intensity</Label>
                        <Select 
                          value={selectedTreatmentIntensity} 
                          onValueChange={(value) => {
                            setSelectedTreatmentIntensity(value);
                            clearAnatomicalError('treatmentIntensity');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.treatmentIntensity ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select intensity level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Intensity</SelectItem>
                            <SelectItem value="moderate">Moderate Intensity</SelectItem>
                            <SelectItem value="high">High Intensity</SelectItem>
                            <SelectItem value="progressive">Progressive Intensity</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.treatmentIntensity && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.treatmentIntensity}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Session Frequency</Label>
                        <Select 
                          value={selectedSessionFrequency} 
                          onValueChange={(value) => {
                            setSelectedSessionFrequency(value);
                            clearAnatomicalError('sessionFrequency');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.sessionFrequency ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="twice_weekly">Twice Weekly</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.sessionFrequency && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.sessionFrequency}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Assessment Sections */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-purple-700">Symptom Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Primary symptoms</Label>
                        <Select 
                          value={primarySymptoms} 
                          onValueChange={(value) => {
                            setPrimarySymptoms(value);
                            clearAnatomicalError('symptoms');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.symptoms ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select primary symptoms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="muscle_tension">Muscle Tension</SelectItem>
                            <SelectItem value="facial_asymmetry">Facial Asymmetry</SelectItem>
                            <SelectItem value="jaw_pain">Jaw Pain</SelectItem>
                            <SelectItem value="headaches">Headaches</SelectItem>
                            <SelectItem value="eye_strain">Eye Strain</SelectItem>
                            <SelectItem value="facial_spasms">Facial Spasms</SelectItem>
                            <SelectItem value="numbness">Numbness</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.symptoms && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.symptoms}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-red-700">Severity Scale</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Rate severity</Label>
                        <Select 
                          value={severityScale} 
                          onValueChange={(value) => {
                            setSeverityScale(value);
                            clearAnatomicalError('severity');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.severity ? "border-red-500" : ""}>
                            <SelectValue placeholder="Rate severity level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Mild (1-2)</SelectItem>
                            <SelectItem value="3">Moderate (3-5)</SelectItem>
                            <SelectItem value="6">Severe (6-8)</SelectItem>
                            <SelectItem value="9">Critical (9-10)</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.severity && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.severity}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-green-700">Follow-up Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Follow-up timeline</Label>
                        <Select 
                          value={followUpPlan} 
                          onValueChange={(value) => {
                            setFollowUpPlan(value);
                            clearAnatomicalError('followUp');
                          }}
                        >
                          <SelectTrigger className={anatomicalErrors.followUp ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select follow-up timeline" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1_week">1 Week</SelectItem>
                            <SelectItem value="2_weeks">2 Weeks</SelectItem>
                            <SelectItem value="1_month">1 Month</SelectItem>
                            <SelectItem value="3_months">3 Months</SelectItem>
                            <SelectItem value="6_months">6 Months</SelectItem>
                            <SelectItem value="as_needed">As Needed</SelectItem>
                          </SelectContent>
                        </Select>
                        {anatomicalErrors.followUp && (
                          <p className="text-sm text-red-500 mt-1">{anatomicalErrors.followUp}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div
                  className={`flex justify-center gap-4 pt-6 border-t ${
                    isGeneratingPlan ? "border-transparent bg-gray-50" : "border-gray-200"
                  }`}
                >
                  <Button
                    onClick={generateTreatmentPlan}
                    disabled={isGeneratingPlan}
                    className={`px-4 py-2 min-w-fit rounded transition ${
                      isGeneratingPlan
                        ? "bg-gray-100 text-gray-500 border border-transparent cursor-not-allowed"
                        : "bg-green-600 text-white border border-transparent hover:bg-green-700"
                    }`}
                  >
                    {isGeneratingPlan ? "Generating..." : "Generate Treatment Plan"}
                  </Button>
                  <Button
                    onClick={saveAnalysis}
                    disabled={isSavingAnalysis}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 min-w-fit"
                  >
                    {isSavingAnalysis ? "Saving..." : "Save Analysis"}
                  </Button>
                  <Button
                    onClick={() => setShowAnatomicalModal(false)}
                    variant="outline"
                    className="px-4 py-2 min-w-fit"
                  >
                    Close Analysis
                  </Button>
                </div>

                {/* Generated Treatment Plan Display */}
                {generatedTreatmentPlan && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Generated Treatment Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                        {generatedTreatmentPlan}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* View Anatomical Analysis Button - Only show after treatment plan is generated */}
                {generatedTreatmentPlan && (
                  <div className="flex justify-center pt-4">
                    <Button
                      disabled={isViewAnalysisDownloading}
                      onClick={async () => {
                        if (isViewAnalysisDownloading) {
                          return;
                        }
                        setIsViewAnalysisDownloading(true);
                        try {
                        console.log('[ANATOMICAL PDF STEP1] Button clicked');
                        const currentPatientId = patientId || patient?.id;
                        console.log('[ANATOMICAL PDF STEP1] Patient ID:', currentPatientId);
                        
                        if (!currentPatientId) {
                          toast({
                            title: "Error",
                            description: "Patient information not available.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // If image not saved, save it automatically
                        let imagePathToUse = savedAnatomicalImage;
                        if (!imagePathToUse) {
                          if (!selectedMuscleGroup || !imageRef.current || !canvasRef.current) {
                            toast({
                              title: "Cannot Generate PDF",
                              description: "Please select a muscle group first.",
                              variant: "destructive"
                            });
                            return;
                          }

                          try {
                            const image = imageRef.current;
                            const canvas = canvasRef.current;
                            const ctx = canvas.getContext('2d');
                            
                            if (!ctx) return;

                            canvas.width = image.naturalWidth;
                            canvas.height = image.naturalHeight;
                            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                            const staticPositions = getStaticMusclePositions();
                            const musclePositions = staticPositions.filter((pos: any) => {
                              const muscleValue = pos.value.toLowerCase().replace(/\s+/g, '_');
                              return muscleValue === selectedMuscleGroup.toLowerCase();
                            });

                            musclePositions.forEach((position: any) => {
                              const x = position.coordinates.xPct * canvas.width;
                              const y = position.coordinates.yPct * canvas.height;
                              const radius = 20;

                              ctx.beginPath();
                              ctx.arc(x, y, radius, 0, 2 * Math.PI);
                              ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
                              ctx.fill();
                              ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
                              ctx.lineWidth = 3;
                              ctx.stroke();

                              ctx.beginPath();
                              ctx.arc(x, y, 10, 0, 2 * Math.PI);
                              ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
                              ctx.fill();
                              ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
                              ctx.lineWidth = 2;
                              ctx.stroke();
                            });

                            const imageData = canvas.toDataURL('image/png');
                            
                            const token = localStorage.getItem('auth_token');
                            const saveResponse = await fetch('/api/anatomical-analysis/save-image', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'X-Tenant-Subdomain': getTenantSubdomain(),
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                patientId: currentPatientId,
                                imageData: imageData,
                                muscleGroup: selectedMuscleGroup
                              })
                            });

                            if (!saveResponse.ok) {
                              throw new Error('Failed to save image to server');
                            }

                            const result = await saveResponse.json();
                            const fallbackImageFilename = `${currentPatientId}_${Date.now()}.png`;
                            const organizationId = tenant?.id || 0;
                            const imageFilename = result.filename || fallbackImageFilename;
                            imagePathToUse = `/uploads/anatomical_analysis_img/${organizationId}/${currentPatientId}/${imageFilename}`;
                            setSavedAnatomicalImage(imagePathToUse);
                            window.dispatchEvent(
                              new CustomEvent("anatomicalFilesUpdated", {
                                detail: { patientId: currentPatientId },
                              }),
                            );
                          } catch (saveError) {
                            console.error('Error auto-saving image:', saveError);
                            toast({
                              title: "Save Failed",
                              description: "Failed to save image automatically.",
                              variant: "destructive"
                            });
                            return;
                          }
                        }

                        // Fetch clinic header and footer
                        const token = localStorage.getItem('auth_token');
                        const headers = {
                          'Authorization': `Bearer ${token}`,
                          'X-Tenant-Subdomain': getTenantSubdomain()
                        };

                        console.log('[ANATOMICAL PDF STEP1] Fetching clinic branding...');
                        const [headerRes, footerRes] = await Promise.all([
                          fetch('/api/clinic-headers', { headers }),
                          fetch('/api/clinic-footers', { headers })
                        ]);

                        console.log('[ANATOMICAL PDF STEP1] Header response status:', headerRes.status);
                        console.log('[ANATOMICAL PDF STEP1] Footer response status:', footerRes.status);

                        let clinicHeader = null;
                        let clinicFooter = null;

                        if (headerRes.ok) {
                          clinicHeader = await headerRes.json();
                          console.log('[ANATOMICAL PDF STEP1] Header data:', clinicHeader);
                        }
                        if (footerRes.ok) {
                          clinicFooter = await footerRes.json();
                          console.log('[ANATOMICAL PDF STEP1] Footer data:', clinicFooter);
                        }

                        // Generate PDF with jsPDF
                        console.log('[ANATOMICAL PDF STEP1] Creating PDF document...');
                        const doc = new jsPDF();

                        let yPos = 20;

                        // Add clinic header with logo and information
                        if (clinicHeader) {
                          const logoPosition = clinicHeader.logoPosition || 'center';
                          const hasLogo = clinicHeader.logoBase64;
                          
                          if (hasLogo) {
                            // Logo on LEFT, text CENTERED in remaining space (same row, no overlap)
                            try {
                              const logoWidth = 30;
                              const logoHeight = 30;
                              const logoX = 20; // Logo on left side
                              const logoY = yPos;
                              
                              // Add logo on left
                              doc.addImage(clinicHeader.logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
                              
                              // Text centered in the remaining space (after logo to end of page)
                              // Logo ends at x=50 (20+30), page ends at 190, so center text at (50+190)/2 = 120
                              const textCenterX = 120;
                              let textY = logoY + 8; // Start text a bit down from logo top
                              
                              doc.setFontSize(14);
                              doc.setFont('helvetica', 'bold');
                              if (clinicHeader.clinicName) {
                                doc.text(clinicHeader.clinicName, textCenterX, textY, { align: 'center' });
                                textY += 6;
                              }
                              doc.setFontSize(9);
                              doc.setFont('helvetica', 'normal');
                              if (clinicHeader.address) {
                                doc.text(clinicHeader.address, textCenterX, textY, { align: 'center' });
                                textY += 4;
                              }
                              if (clinicHeader.phone) {
                                doc.text(clinicHeader.phone, textCenterX, textY, { align: 'center' });
                                textY += 4;
                              }
                              if (clinicHeader.email) {
                                doc.text(clinicHeader.email, textCenterX, textY, { align: 'center' });
                                textY += 4;
                              }
                              
                              yPos = Math.max(logoY + logoHeight, textY) + 5;
                            } catch (logoError) {
                              console.log('[ANATOMICAL PDF STEP1] Error adding logo:', logoError);
                            }
                          } else {
                            // No logo - just centered text
                            doc.setFontSize(10);
                            doc.setFont('helvetica', 'bold');
                            if (clinicHeader.clinicName) {
                              doc.text(clinicHeader.clinicName, 105, yPos, { align: 'center' });
                              yPos += 5;
                            }
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'normal');
                            if (clinicHeader.address) {
                              doc.text(clinicHeader.address, 105, yPos, { align: 'center' });
                              yPos += 4;
                            }
                            if (clinicHeader.phone) {
                              doc.text(clinicHeader.phone, 105, yPos, { align: 'center' });
                              yPos += 4;
                            }
                            if (clinicHeader.email) {
                              doc.text(clinicHeader.email, 105, yPos, { align: 'center' });
                              yPos += 4;
                            }
                            yPos += 5;
                          }
                        }

                        // Add separator line after header
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.5);
                        doc.line(20, yPos, 190, yPos);
                        yPos += 8;

                        // Title
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Professional Anatomical Analysis Report', 105, yPos, { align: 'center' });
                        yPos += 15;

                        // Two-column layout: Analysis Details (left) and Image (right)
                        const leftColumnX = 20;
                        const rightColumnX = 130;
                        const startYPos = yPos;
                        
                        // Left Column: Analysis Details
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Analysis Details:', leftColumnX, yPos);
                        yPos += 8;

                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        const details = [
                          `Target Muscle Group: ${selectedMuscleGroup ? selectedMuscleGroup.replace(/_/g, ' ') : 'Not specified'}`,
                          `Analysis Type: ${selectedAnalysisType ? selectedAnalysisType.replace(/_/g, ' ') : 'Not specified'}`,
                          `Primary Treatment: ${selectedTreatment ? selectedTreatment.replace(/_/g, ' ') : 'Not specified'}`,
                          `Treatment Intensity: ${selectedTreatmentIntensity || 'Not specified'}`,
                          `Session Frequency: ${selectedSessionFrequency || 'Not specified'}`,
                          `Severity Scale: ${severityScale || 'Not specified'}`,
                          `Primary Symptoms: ${primarySymptoms || 'Not specified'}`,
                          `Follow-up Plan: ${followUpPlan || 'Not specified'}`
                        ];

                        details.forEach(detail => {
                          const lines = doc.splitTextToSize(detail, 100);
                          lines.forEach((line: string) => {
                            doc.text(line, leftColumnX, yPos);
                            yPos += 6;
                          });
                        });

                        // Right Column: Image (smaller size) - Use the timestamped saved image
                        const imagePath = imagePathToUse || savedAnatomicalImage || "";
                        console.log('[ANATOMICAL PDF STEP1] Fetching image from:', imagePath);
                        
                        try {
                          const imageResponse = await fetch(imagePath);
                          console.log('[ANATOMICAL PDF STEP1] Image response status:', imageResponse.status);
                          
                          if (imageResponse.ok) {
                            const imageBlob = await imageResponse.blob();
                            const imageBase64 = await new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result as string);
                              reader.readAsDataURL(imageBlob);
                            });
                            
                            console.log('[ANATOMICAL PDF STEP1] Adding image to right column');
                            const imgWidth = 60;
                            const imgHeight = 60;
                            
                            try {
                              doc.addImage(imageBase64, 'PNG', rightColumnX, startYPos, imgWidth, imgHeight);
                              console.log('[ANATOMICAL PDF STEP1] Image added successfully');
                            } catch (addImgError: any) {
                              console.error(
                                '[ANATOMICAL PDF STEP1] addImage error:',
                                addImgError,
                                'Message:',
                                addImgError?.message,
                              );
                            }
                          }
                        } catch (imageError) {
                          console.error('[ANATOMICAL PDF STEP1] Image fetch error:', imageError);
                        }

                        // Add extra space after the two-column section
                        yPos += 5;

                        // Treatment Plan (with smaller font and better formatting)
                        if (generatedTreatmentPlan) {
                          yPos += 8;
                          doc.setFontSize(11);
                          doc.setFont('helvetica', 'bold');
                          doc.text('Generated Treatment Plan', leftColumnX, yPos);
                          yPos += 8;

                          // Add a light background effect by drawing a rectangle
                          doc.setDrawColor(230, 230, 230);
                          doc.setFillColor(250, 250, 250);
                          
                          doc.setFontSize(8);
                          doc.setFont('helvetica', 'normal');
                          const lines = doc.splitTextToSize(generatedTreatmentPlan, 170);
                          lines.forEach((line: string) => {
                            if (yPos > 270) {
                              doc.addPage();
                              yPos = 20;
                            }
                            doc.text(line, leftColumnX, yPos);
                            yPos += 4;
                          });
                        }

                        // Add clinic footer if available
                        if (clinicFooter && clinicFooter.footerText) {
                          doc.setFontSize(8);
                          doc.setFont('helvetica', 'italic');
                          doc.text(clinicFooter.footerText, 105, 285, { align: 'center' });
                        }

                        // Save PDF
                        const pdfFilename = `Anatomical_Analysis_Patient_${currentPatientId}_${new Date().toISOString().split('T')[0]}.pdf`;
                        console.log('[ANATOMICAL PDF STEP1] Saving PDF:', pdfFilename);
                        
                        // Use blob URL and open in new tab for iframe compatibility
                        const pdfBlob = doc.output('blob');
                        const blobUrl = URL.createObjectURL(pdfBlob);
                        
                        // Open PDF in new tab - works better in iframe environments
                        const newWindow = window.open(blobUrl, '_blank');
                        if (newWindow) {
                          newWindow.document.title = pdfFilename;
                          console.log('[ANATOMICAL PDF STEP1] PDF opened in new tab');
                        } else {
                          // Fallback: try download link
                          const downloadLink = document.createElement('a');
                          downloadLink.href = blobUrl;
                          downloadLink.download = pdfFilename;
                          downloadLink.target = '_blank';
                          document.body.appendChild(downloadLink);
                          downloadLink.click();
                          document.body.removeChild(downloadLink);
                          console.log('[ANATOMICAL PDF STEP1] PDF download triggered via link');
                        }
                        
                        // Clean up blob URL after a delay
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                        
                        console.log('[ANATOMICAL PDF STEP1] PDF saved successfully');

                        toast({
                          title: "PDF Generated",
                          description: "Anatomical analysis PDF has been downloaded successfully."
                        });
                        console.log('[ANATOMICAL PDF STEP1] Success toast displayed');
                      } catch (error) {
                        console.error('[ANATOMICAL PDF STEP1] Error generating anatomical analysis PDF:', error);
                        toast({
                          title: "Error",
                          description: "Failed to generate PDF. Please try again.",
                          variant: "destructive"
                        });
                      } finally {
                        setIsViewAnalysisDownloading(false);
                      }
                    }}
                    className={`px-6 rounded transition ${
                      isViewAnalysisDownloading
                        ? "bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed"
                        : "bg-purple-600 text-white border border-transparent hover:bg-purple-700"
                    }`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isViewAnalysisDownloading ? "Downloading..." : "Download Anatomical Analysis"}
                  </Button>
                </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Configuration Screen */}
          {anatomicalStep === 2 && (
            <div className="space-y-6 p-4">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium">
                  Professional Medical Anatomical Diagram
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side: Facial Muscle Analysis */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Facial Muscle Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Target Muscle Group</Label>
                      <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select muscle group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frontalis">Frontalis</SelectItem>
                          <SelectItem value="temporalis">Temporalis</SelectItem>
                          <SelectItem value="corrugator_supercilii">Corrugator Supercilii</SelectItem>
                          <SelectItem value="procerus">Procerus</SelectItem>
                          <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                          <SelectItem value="levator_labii_superioris">Levator Labii Superioris</SelectItem>
                          <SelectItem value="zygomaticus_major">Zygomaticus Major</SelectItem>
                          <SelectItem value="masseter">Masseter</SelectItem>
                          <SelectItem value="orbicularis_oris">Orbicularis Oris</SelectItem>
                          <SelectItem value="mentalis">Mentalis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Analysis Type</Label>
                      <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select analysis type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                          <SelectItem value="weakness">Muscle Weakness</SelectItem>
                          <SelectItem value="hyperactivity">Hyperactivity Assessment</SelectItem>
                          <SelectItem value="coordination">Coordination Testing</SelectItem>
                          <SelectItem value="range_of_motion">Range of Motion</SelectItem>
                          <SelectItem value="functional_assessment">Functional Assessment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Side: Treatment Options */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Treatment Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Treatment</Label>
                      <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                          <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                          <SelectItem value="facial_exercise">Facial Exercise Therapy</SelectItem>
                          <SelectItem value="massage_therapy">Therapeutic Massage</SelectItem>
                          <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                          <SelectItem value="neuromuscular_reeducation">Neuromuscular Reeducation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Treatment Intensity</Label>
                      <Select value={selectedTreatmentIntensity} onValueChange={setSelectedTreatmentIntensity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intensity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Intensity</SelectItem>
                          <SelectItem value="moderate">Moderate Intensity</SelectItem>
                          <SelectItem value="high">High Intensity</SelectItem>
                          <SelectItem value="progressive">Progressive Intensity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Session Frequency</Label>
                      <Select value={selectedSessionFrequency} onValueChange={setSelectedSessionFrequency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="twice_weekly">Twice Weekly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center pt-6">
                <Button
                  onClick={() => setAnatomicalStep(1)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  ← Back to Analysis
                </Button>
                <Button
                  onClick={() => setAnatomicalStep(3)}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                  disabled={!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment}
                >
                  Continue to Assessment →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Extended Assessment */}
          {anatomicalStep === 3 && (
            <div className="space-y-6 p-4">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium">
                  Professional Medical Anatomical Diagram
                </div>
              </div>

              {/* First Row: Facial Muscle Analysis and Treatment Options */}
              <div className="grid grid-cols-2 gap-8">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Facial Muscle Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Target Muscle Group</Label>
                      <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select muscle group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frontalis">Frontalis</SelectItem>
                          <SelectItem value="temporalis">Temporalis</SelectItem>
                          <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                          <SelectItem value="masseter">Masseter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Analysis Type</Label>
                      <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select analysis type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                          <SelectItem value="weakness">Muscle Weakness</SelectItem>
                          <SelectItem value="coordination">Coordination Testing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Treatment Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Treatment</Label>
                      <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                          <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                          <SelectItem value="facial_exercise">Facial Exercise Therapy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Treatment Intensity</Label>
                      <Select value={selectedTreatmentIntensity} onValueChange={setSelectedTreatmentIntensity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intensity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Intensity</SelectItem>
                          <SelectItem value="moderate">Moderate Intensity</SelectItem>
                          <SelectItem value="high">High Intensity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Session Frequency</Label>
                      <Select value={selectedSessionFrequency} onValueChange={setSelectedSessionFrequency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row: Assessment Sections */}
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-purple-700">Symptom Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Primary symptoms</Label>
                      <Select value={primarySymptoms} onValueChange={setPrimarySymptoms}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary symptoms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="muscle_tension">Muscle Tension</SelectItem>
                          <SelectItem value="facial_asymmetry">Facial Asymmetry</SelectItem>
                          <SelectItem value="jaw_pain">Jaw Pain</SelectItem>
                          <SelectItem value="headaches">Headaches</SelectItem>
                          <SelectItem value="eye_strain">Eye Strain</SelectItem>
                          <SelectItem value="facial_spasms">Facial Spasms</SelectItem>
                          <SelectItem value="numbness">Numbness</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-red-700">Severity Scale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Rate severity</Label>
                      <Select value={severityScale} onValueChange={setSeverityScale}>
                        <SelectTrigger>
                          <SelectValue placeholder="Rate severity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Mild (1-2)</SelectItem>
                          <SelectItem value="3">Moderate (3-5)</SelectItem>
                          <SelectItem value="6">Severe (6-8)</SelectItem>
                          <SelectItem value="9">Critical (9-10)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-green-700">Follow-up Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Follow-up timeline</Label>
                      <Select value={followUpPlan} onValueChange={setFollowUpPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select follow-up timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_week">1 Week</SelectItem>
                          <SelectItem value="2_weeks">2 Weeks</SelectItem>
                          <SelectItem value="1_month">1 Month</SelectItem>
                          <SelectItem value="3_months">3 Months</SelectItem>
                          <SelectItem value="6_months">6 Months</SelectItem>
                          <SelectItem value="as_needed">As Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  onClick={() => setAnatomicalStep(2)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  ← Back to Configuration
                </Button>
                
                <div className="flex gap-4">
                  <Button
                    onClick={generateTreatmentPlan}
                    disabled={isGeneratingPlan}
                    className="bg-green-600 hover:bg-green-700 px-6"
                  >
                    {isGeneratingPlan ? "Generating..." : "Generate Treatment Plan"}
                  </Button>
                  <Button
                    onClick={saveAnalysis}
                    disabled={isSavingAnalysis}
                    className="bg-blue-600 hover:bg-blue-700 px-6"
                  >
                    {isSavingAnalysis ? "Saving..." : "Save Analysis"}
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        console.log('[ANATOMICAL PDF STEP3] Button clicked');
                        const currentPatientId = patientId || patient?.id;
                        console.log('[ANATOMICAL PDF STEP3] Patient ID:', currentPatientId);
                        
                        if (!currentPatientId) {
                          toast({
                            title: "Error",
                            description: "Patient information not available.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Fetch clinic header and footer
                        const token = localStorage.getItem('auth_token');
                        const headers = {
                          'Authorization': `Bearer ${token}`,
                          'X-Tenant-Subdomain': getTenantSubdomain()
                        };

                        console.log('[ANATOMICAL PDF STEP3] Fetching clinic branding...');
                        const [headerRes, footerRes] = await Promise.all([
                          fetch('/api/clinic-headers', { headers }),
                          fetch('/api/clinic-footers', { headers })
                        ]);

                        console.log('[ANATOMICAL PDF STEP3] Header response status:', headerRes.status);
                        console.log('[ANATOMICAL PDF STEP3] Footer response status:', footerRes.status);

                        let clinicHeader = null;
                        let clinicFooter = null;

                        if (headerRes.ok) {
                          clinicHeader = await headerRes.json();
                          console.log('[ANATOMICAL PDF STEP3] Header data:', clinicHeader);
                        }
                        if (footerRes.ok) {
                          clinicFooter = await footerRes.json();
                          console.log('[ANATOMICAL PDF STEP3] Footer data:', clinicFooter);
                        }

                        // Generate PDF with jsPDF
                        console.log('[ANATOMICAL PDF STEP3] Creating PDF document...');
                        const doc = new jsPDF();

                        let yPos = 20;

                        // Add clinic header with logo and information
                        if (clinicHeader) {
                          const logoPosition = clinicHeader.logoPosition || 'center';
                          const hasLogo = clinicHeader.logoBase64;
                          
                          // Add logo based on position
                          if (hasLogo) {
                            try {
                              if (logoPosition === 'center') {
                                doc.addImage(clinicHeader.logoBase64, 'PNG', 85, yPos, 40, 15);
                              } else if (logoPosition === 'left') {
                                doc.addImage(clinicHeader.logoBase64, 'PNG', 20, yPos, 30, 15);
                              } else if (logoPosition === 'right') {
                                doc.addImage(clinicHeader.logoBase64, 'PNG', 160, yPos, 30, 15);
                              }
                              yPos += 18;
                            } catch (logoError) {
                              console.log('[ANATOMICAL PDF STEP3] Error adding logo:', logoError);
                            }
                          }
                          
                          // All clinic details centered
                          doc.setFontSize(10);
                          doc.setFont('helvetica', 'bold');
                          if (clinicHeader.clinicName) {
                            doc.text(clinicHeader.clinicName, 105, yPos, { align: 'center' });
                            yPos += 5;
                          }
                          doc.setFontSize(8);
                          doc.setFont('helvetica', 'normal');
                          if (clinicHeader.address) {
                            doc.text(clinicHeader.address, 105, yPos, { align: 'center' });
                            yPos += 4;
                          }
                          if (clinicHeader.phone) {
                            doc.text(clinicHeader.phone, 105, yPos, { align: 'center' });
                            yPos += 4;
                          }
                          if (clinicHeader.email) {
                            doc.text(clinicHeader.email, 105, yPos, { align: 'center' });
                            yPos += 4;
                          }
                          yPos += 5;
                        }

                        // Title
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Professional Anatomical Analysis Report', 105, yPos, { align: 'center' });
                        yPos += 15;

                        // Two-column layout: Analysis Details (left) and Image (right)
                        const leftColumnX = 20;
                        const rightColumnX = 130;
                        const startYPos = yPos;
                        
                        // Left Column: Analysis Details
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Analysis Details:', leftColumnX, yPos);
                        yPos += 8;

                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        const details = [
                          `Target Muscle Group: ${selectedMuscleGroup ? selectedMuscleGroup.replace(/_/g, ' ') : 'Not specified'}`,
                          `Analysis Type: ${selectedAnalysisType ? selectedAnalysisType.replace(/_/g, ' ') : 'Not specified'}`,
                          `Primary Treatment: ${selectedTreatment ? selectedTreatment.replace(/_/g, ' ') : 'Not specified'}`,
                          `Treatment Intensity: ${selectedTreatmentIntensity || 'Not specified'}`,
                          `Session Frequency: ${selectedSessionFrequency || 'Not specified'}`,
                          `Severity Scale: ${severityScale || 'Not specified'}`,
                          `Primary Symptoms: ${primarySymptoms || 'Not specified'}`,
                          `Follow-up Plan: ${followUpPlan || 'Not specified'}`
                        ];

                        details.forEach(detail => {
                          const lines = doc.splitTextToSize(detail, 100);
                          lines.forEach((line: string) => {
                            doc.text(line, leftColumnX, yPos);
                            yPos += 6;
                          });
                        });

                        // Right Column: Image (smaller size) - Use the timestamped saved image
                        const imagePath = savedAnatomicalImage || "";
                        console.log('[ANATOMICAL PDF STEP1] Fetching image from:', imagePath);
                        
                        try {
                          const imageResponse = await fetch(imagePath);
                          console.log('[ANATOMICAL PDF STEP1] Image response status:', imageResponse.status);
                          
                          if (imageResponse.ok) {
                            const imageBlob = await imageResponse.blob();
                            const imageBase64 = await new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result as string);
                              reader.readAsDataURL(imageBlob);
                            });
                            
                            console.log('[ANATOMICAL PDF STEP1] Adding image to right column');
                            const imgWidth = 60;
                            const imgHeight = 60;
                            
                            try {
                              doc.addImage(imageBase64, 'PNG', rightColumnX, startYPos, imgWidth, imgHeight);
                              console.log("[ANATOMICAL PDF STEP1] Image added successfully");
                            } catch (addImgError: any) {
                              console.error(
                                "[ANATOMICAL PDF STEP1] addImage error:",
                                addImgError,
                                "Message:",
                                addImgError?.message,
                              );
                            }
                          }
                        } catch (imageError) {
                          console.error('[ANATOMICAL PDF STEP1] Image fetch error:', imageError);
                        }

                        // Add extra space after the two-column section
                        yPos += 5;

                        // Treatment Plan (with smaller font and better formatting)
                        if (generatedTreatmentPlan) {
                          yPos += 8;
                          doc.setFontSize(11);
                          doc.setFont('helvetica', 'bold');
                          doc.text('Generated Treatment Plan', leftColumnX, yPos);
                          yPos += 8;

                          // Add a light background effect by drawing a rectangle
                          doc.setDrawColor(230, 230, 230);
                          doc.setFillColor(250, 250, 250);
                          
                          doc.setFontSize(8);
                          doc.setFont('helvetica', 'normal');
                          const lines = doc.splitTextToSize(generatedTreatmentPlan, 170);
                          lines.forEach((line: string) => {
                            if (yPos > 270) {
                              doc.addPage();
                              yPos = 20;
                            }
                            doc.text(line, leftColumnX, yPos);
                            yPos += 4;
                          });
                        }

                        // Add clinic footer if available
                        if (clinicFooter && clinicFooter.footerText) {
                          doc.setFontSize(8);
                          doc.setFont('helvetica', 'italic');
                          doc.text(clinicFooter.footerText, 105, 285, { align: 'center' });
                        }

                        // Save PDF
                        const timestamp = Date.now();
                        const pdfFilename = `${currentPatientId}_anatomical_analysis_${timestamp}.pdf`;
                        console.log("[ANATOMICAL PDF STEP3] Saving PDF:", pdfFilename);

                          const pdfDataUri = doc.output("datauristring");
                          try {
                          const token = localStorage.getItem("auth_token");
                          const pdfHeaders: Record<string, string> = {
                            "X-Tenant-Subdomain": getTenantSubdomain(),
                            "Content-Type": "application/json",
                          };
                          if (token) {
                            pdfHeaders.Authorization = `Bearer ${token}`;
                          }

                          const savePdfResponse = await fetch("/api/anatomical-analysis/save-pdf", {
                            method: "POST",
                            headers: pdfHeaders,
                              body: JSON.stringify({
                                patientId: currentPatientId,
                                pdfData: pdfDataUri,
                                filename: pdfFilename,
                              }),
                            credentials: "include",
                            });

                            if (savePdfResponse.ok) {
                              const savedPdfResult = await savePdfResponse.json();
                              const finalFilename = savedPdfResult.filename || pdfFilename;
                              setSavedPdfFilename(finalFilename);
                              setSavedPdfUrl(savedPdfResult.url || null);
                              setSavedPdfAbsolutePath(savedPdfResult.path || null);
                              setShowPdfSavedModal(true);
                            await fetchAnatomicalFiles();
                            setAnatomicalUploadsTab("uploads");
                              window.dispatchEvent(
                                new CustomEvent("anatomicalFilesUpdated", {
                                  detail: { patientId: currentPatientId },
                                }),
                              );
                            } else {
                              console.error("[ANATOMICAL PDF STEP3] Failed to save PDF:", await savePdfResponse.text());
                            }
                          } catch (savePdfError) {
                            console.error("[ANATOMICAL PDF STEP3] Failed to save PDF to server:", savePdfError);
                          }

                          doc.save(pdfFilename);
                          console.log('[ANATOMICAL PDF STEP3] PDF saved successfully');

                        toast({
                          title: "PDF Generated",
                          description: "Anatomical analysis PDF has been downloaded successfully."
                        });
                        console.log('[ANATOMICAL PDF STEP3] Success toast displayed');
                      } catch (error) {
                        console.error('[ANATOMICAL PDF STEP3] Error generating anatomical analysis PDF:', error);
                        toast({
                          title: "Error",
                          description: "Failed to generate PDF. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }}
                    disabled={isViewAnalysisDownloading}
                    className={`px-6 rounded transition ${
                      isViewAnalysisDownloading
                        ? "bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed"
                        : "bg-purple-600 text-white border border-transparent hover:bg-purple-700"
                    }`}
                  >
                    {isViewAnalysisDownloading ? "Downloading..." : "Download Anatomical Analysis"}
                  </Button>
                  <Button
                    onClick={() => setShowAnatomicalModal(false)}
                    variant="outline"
                    className="px-6"
                  >
                    Close Analysis
                  </Button>
                </div>
              </div>

              {/* Generated Treatment Plan Display */}
              {generatedTreatmentPlan && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Generated Treatment Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                      {generatedTreatmentPlan}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Anatomical Analysis Dialog */}
      <Dialog
        open={showViewAnatomicalDialog}
        onOpenChange={(open) => {
          setShowViewAnatomicalDialog(open);
          if (!open) {
            setAnatomicalUploadsTab("overview");
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <Eye className="w-5 h-5 text-purple-600" />
              View Anatomical Analysis
            </DialogTitle>
          </DialogHeader>
          <Tabs
            value={anatomicalUploadsTab}
            onValueChange={(value) =>
              setAnatomicalUploadsTab(value as "overview" | "uploads" | "consultations")
            }
            className="space-y-4"
          >
            <TabsList className="space-x-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="uploads">Anatomical analysis uploads</TabsTrigger>
              <TabsTrigger value="consultations">Consultations</TabsTrigger>
            </TabsList>
            <TabsContent value="consultations" className="space-y-4">
              {(() => {
                const pid = patientId ?? patient?.id;
                if (!pid) return <p className="text-sm text-gray-500">No patient selected.</p>;
                return (
                  <ConsultationsTabContent
                    patientId={pid}
                    files={consultationFiles}
                    loading={consultationFilesLoading}
                    onLoad={() => refetchConsultationFiles(pid)}
                    buildUrl={buildUrl}
                    getTenantSubdomain={getTenantSubdomain}
                  />
                );
              })()}
            </TabsContent>
            <TabsContent value="overview" className="space-y-6">
            {/* Saved Image */}
            {imagesLoading && (
              <p className="text-sm text-gray-500">Loading saved anatomical image...</p>
            )}
            {imagesError && (
              <p className="text-sm text-red-500">{imagesError}</p>
            )}
            {savedAnatomicalImage && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-lg mb-3">Saved Analysis Image</h3>
                <div className="flex justify-center">
                  <img
                    src={savedAnatomicalImage}
                    alt="Anatomical Analysis"
                    className="max-w-full max-h-96 object-contain rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = 'Image not found - Please save an image first';
                      e.currentTarget.className = 'text-gray-500 italic';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Analysis Details */}
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-lg mb-4">Analysis Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Target Muscle Group</Label>
                  <p className="font-medium">{selectedMuscleGroup ? selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Analysis Type</Label>
                  <p className="font-medium">{selectedAnalysisType ? selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Primary Treatment</Label>
                  <p className="font-medium">{selectedTreatment ? selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Treatment Intensity</Label>
                  <p className="font-medium">{selectedTreatmentIntensity || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Session Frequency</Label>
                  <p className="font-medium">{selectedSessionFrequency || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Severity Scale</Label>
                  <p className="font-medium">{severityScale || 'Not specified'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-600">Primary Symptoms</Label>
                  <p className="font-medium">{primarySymptoms || 'Not specified'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-600">Follow-up Plan</Label>
                  <p className="font-medium">{followUpPlan || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Generated Treatment Plan */}
            {generatedTreatmentPlan && (
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold text-lg mb-3">Generated Treatment Plan</h3>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                  {generatedTreatmentPlan}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={async () => {
                  if (isViewAnalysisDownloading) {
                    return;
                  }
                  setIsViewAnalysisDownloading(true);
                  try {
                    const currentPatientId = patientId || patient?.id;
                    if (!currentPatientId) return;

                    // Fetch clinic header and footer
                    const token = localStorage.getItem('auth_token');
                    const headers = {
                      'Authorization': `Bearer ${token}`,
                      'X-Tenant-Subdomain': getTenantSubdomain()
                    };

                    const [headerRes, footerRes] = await Promise.all([
                      fetch('/api/clinic-headers', { headers }),
                      fetch('/api/clinic-footers', { headers })
                    ]);

                    let clinicHeader = null;
                    let clinicFooter = null;

                    if (headerRes.ok) {
                      clinicHeader = await headerRes.json();
                    }
                    if (footerRes.ok) {
                      clinicFooter = await footerRes.json();
                    }

                    // Generate PDF with jsPDF
                    const { jsPDF } = await import('jspdf');
                    const doc = new jsPDF();

                    let yPos = 15;

                    // Add clinic header with logo and information
                    if (clinicHeader) {
                      const logoPosition = clinicHeader.logoPosition || 'left';
                      const hasLogo = clinicHeader.logoBase64;
                      
                      if (hasLogo && logoPosition === 'left') {
                        // Logo on left, text on right
                        try {
                          doc.addImage(clinicHeader.logoBase64, 'PNG', 20, yPos, 25, 25);
                        } catch (logoError) {
                          console.log('[PDF] Error adding logo:', logoError);
                        }
                        
                        // Text positioned to the right of logo
                        const textX = 50;
                        let textY = yPos + 5;
                        
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        if (clinicHeader.clinicName) {
                          doc.text(clinicHeader.clinicName, textX, textY);
                          textY += 6;
                        }
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        if (clinicHeader.address) {
                          doc.text(clinicHeader.address, textX, textY);
                          textY += 4;
                        }
                        if (clinicHeader.phone) {
                          doc.text(clinicHeader.phone, textX, textY);
                          textY += 4;
                        }
                        if (clinicHeader.email) {
                          doc.text(clinicHeader.email, textX, textY);
                        }
                        yPos += 30;
                      } else if (hasLogo && logoPosition === 'center') {
                        // Logo centered above text
                        try {
                          doc.addImage(clinicHeader.logoBase64, 'PNG', 85, yPos, 40, 15);
                          yPos += 18;
                        } catch (logoError) {
                          console.log('[PDF] Error adding logo:', logoError);
                        }
                        
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        if (clinicHeader.clinicName) {
                          doc.text(clinicHeader.clinicName, 105, yPos, { align: 'center' });
                          yPos += 6;
                        }
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        if (clinicHeader.address) {
                          doc.text(clinicHeader.address, 105, yPos, { align: 'center' });
                          yPos += 4;
                        }
                        if (clinicHeader.phone) {
                          doc.text(clinicHeader.phone, 105, yPos, { align: 'center' });
                          yPos += 4;
                        }
                        if (clinicHeader.email) {
                          doc.text(clinicHeader.email, 105, yPos, { align: 'center' });
                          yPos += 4;
                        }
                        yPos += 5;
                      } else if (hasLogo && logoPosition === 'right') {
                        // Logo on right, text on left
                        try {
                          doc.addImage(clinicHeader.logoBase64, 'PNG', 165, yPos, 25, 25);
                        } catch (logoError) {
                          console.log('[PDF] Error adding logo:', logoError);
                        }
                        
                        let textY = yPos + 5;
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        if (clinicHeader.clinicName) {
                          doc.text(clinicHeader.clinicName, 20, textY);
                          textY += 6;
                        }
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        if (clinicHeader.address) {
                          doc.text(clinicHeader.address, 20, textY);
                          textY += 4;
                        }
                        if (clinicHeader.phone) {
                          doc.text(clinicHeader.phone, 20, textY);
                          textY += 4;
                        }
                        if (clinicHeader.email) {
                          doc.text(clinicHeader.email, 20, textY);
                        }
                        yPos += 30;
                      } else {
                        // No logo, just centered text
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        if (clinicHeader.clinicName) {
                          doc.text(clinicHeader.clinicName, 105, yPos, { align: 'center' });
                          yPos += 6;
                        }
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        if (clinicHeader.address) {
                          doc.text(clinicHeader.address, 105, yPos, { align: 'center' });
                          yPos += 4;
                        }
                        if (clinicHeader.phone) {
                          doc.text(clinicHeader.phone, 105, yPos, { align: 'center' });
                          yPos += 4;
                        }
                        if (clinicHeader.email) {
                          doc.text(clinicHeader.email, 105, yPos, { align: 'center' });
                          yPos += 4;
                        }
                        yPos += 5;
                      }
                    }

                    // Add separator line
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.5);
                    doc.line(20, yPos, 190, yPos);
                    yPos += 8;

                    // Title
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Professional Anatomical Analysis Report', 105, yPos, { align: 'center' });
                    yPos += 12;

                    // Add anatomical analysis image if available
                    if (savedAnatomicalImage) {
                      try {
                        console.log('[PDF] Loading anatomical image from:', savedAnatomicalImage);
                        const imageResponse = await fetch(savedAnatomicalImage);
                        
                        if (imageResponse.ok) {
                          const imageBlob = await imageResponse.blob();
                          const imageBase64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(imageBlob);
                          });
                          
                          // Add image with better sizing
                          const imgWidth = 120;
                          const imgHeight = 100;
                          const imgX = (210 - imgWidth) / 2; // Center horizontally (A4 width is 210mm)
                          
                          doc.addImage(imageBase64, 'PNG', imgX, yPos, imgWidth, imgHeight);
                          yPos += imgHeight + 10;
                          console.log('[PDF] Anatomical image added successfully');
                          
                          // Add image caption
                          doc.setFontSize(9);
                          doc.setFont('helvetica', 'italic');
                          doc.text('Anatomical Analysis with Marked Target Areas', 105, yPos, { align: 'center' });
                          yPos += 10;
                        } else {
                          console.log('[PDF] Image not found, continuing without image');
                        }
                      } catch (imageError) {
                        console.error('[PDF] Error loading anatomical image:', imageError);
                      }
                    }

                    // Analysis Details Section
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Analysis Details:', 20, yPos);
                    yPos += 8;

                    // Draw box around details
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.5);
                    const detailsStartY = yPos;

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const details = [
                      { label: 'Target Muscle Group', value: selectedMuscleGroup ? selectedMuscleGroup.replace(/_/g, ' ').toUpperCase() : 'Not specified' },
                      { label: 'Analysis Type', value: selectedAnalysisType ? selectedAnalysisType.replace(/_/g, ' ') : 'Not specified' },
                      { label: 'Primary Treatment', value: selectedTreatment ? selectedTreatment.replace(/_/g, ' ') : 'Not specified' },
                      { label: 'Treatment Intensity', value: selectedTreatmentIntensity || 'Not specified' },
                      { label: 'Session Frequency', value: selectedSessionFrequency || 'Not specified' },
                      { label: 'Severity Scale', value: severityScale || 'Not specified' },
                      { label: 'Primary Symptoms', value: primarySymptoms || 'Not specified' },
                      { label: 'Follow-up Plan', value: followUpPlan || 'Not specified' }
                    ];

                    details.forEach(detail => {
                      if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                      }
                      doc.setFont('helvetica', 'bold');
                      doc.text(`${detail.label}:`, 25, yPos);
                      doc.setFont('helvetica', 'normal');
                      doc.text(detail.value, 80, yPos);
                      yPos += 6;
                    });

                    // Draw box around details
                    doc.rect(20, detailsStartY - 3, 170, (details.length * 6) + 3);
                    yPos += 5;

                    // Treatment Plan Section
                    if (generatedTreatmentPlan) {
                      if (yPos > 240) {
                        doc.addPage();
                        yPos = 20;
                      }
                      
                      yPos += 5;
                      doc.setFontSize(12);
                      doc.setFont('helvetica', 'bold');
                      doc.text('Generated Treatment Plan:', 20, yPos);
                      yPos += 8;

                      doc.setFontSize(10);
                      doc.setFont('helvetica', 'normal');
                      const lines = doc.splitTextToSize(generatedTreatmentPlan, 170);
                      lines.forEach((line: string) => {
                        if (yPos > 275) {
                          doc.addPage();
                          yPos = 20;
                        }
                        doc.text(line, 20, yPos);
                        yPos += 5;
                      });
                    }

                    // Add clinic footer if available
                    if (clinicFooter && clinicFooter.footerText) {
                      doc.setFontSize(8);
                      doc.setFont('helvetica', 'italic');
                      doc.text(clinicFooter.footerText, 105, 285, { align: 'center' });
                    }

                    // Save PDF
                    doc.save(`Anatomical_Analysis_Patient_${currentPatientId}_${new Date().toISOString().split('T')[0]}.pdf`);

                    toast({
                      title: "PDF Generated",
                      description: "Treatment plan PDF has been downloaded successfully."
                    });
                  } catch (error) {
                    console.error('PDF generation error:', error);
                    toast({
                      title: "Error",
                      description: "Failed to generate PDF. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Treatment Plan PDF
              </Button>
              <Button
                onClick={() => setShowViewAnatomicalDialog(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
            </TabsContent>
            <TabsContent value="uploads" className="space-y-4">
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    uploadsSubTab === "files"
                      ? "bg-white text-gray-900"
                      : "bg-gray-50 text-gray-500"
                  }`}
                  onClick={() => setUploadsSubTab("files")}
                  type="button"
                >
                  Files
                </button>
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    uploadsSubTab === "image"
                      ? "bg-white text-gray-900"
                      : "bg-gray-50 text-gray-500"
                  }`}
                  onClick={() => setUploadsSubTab("image")}
                  type="button"
                >
                  Image
                </button>
              </div>
              {uploadsSubTab === "image" && savedAnatomicalImage && (
                <Card className="border border-dashed border-gray-300 bg-gray-50">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-700">Saved Anatomical Image</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(savedAnatomicalImage, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs text-gray-500">Uploaded image used inside the generated PDFs.</p>
                      <a
                        href={savedAnatomicalImage}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[hsl(var(--cura-bluewave))] hover:underline"
                      >
                        View image
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
              {uploadsSubTab === "files" && (
                <>
                  {filesLoading && (
                    <p className="text-sm text-gray-500">Loading anatomical analysis uploads...</p>
                  )}
                  {filesError && (
                    <p className="text-sm text-red-500">{filesError}</p>
                  )}
                  {!filesLoading && anatomicalFiles.length === 0 && (
                    <p className="text-sm text-gray-500">No anatomical analysis uploads yet.</p>
                  )}
                  {anatomicalFiles
                    .filter((file) => !file.url.includes("/anatomical_analysis_img/"))
                    .map((file) => (
                    <Card
                      key={file.filename}
                      className="border border-gray-200 dark:border-gray-700"
                    >
                      <CardContent className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 break-words">{file.filename}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded {format(new Date(file.uploadedAt), "PPpp")} • {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(file.url, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingFile === file.filename}
                            onClick={() => handleDeleteAnatomicalFile(file.filename)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfSavedModal} onOpenChange={handlePdfModalOpenChange}>
        <DialogContent className="max-w-sm text-center space-y-4">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2 text-xl font-semibold">
              <CheckCircle className="h-10 w-10 text-green-500" />
              File Saved
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700">
            {savedPdfFilename
              ? `${savedPdfFilename} has been saved to anatomical analysis uploads.`
              : "The anatomical analysis PDF has been saved."}
          </p>
          {savedPdfAbsolutePath && (
            <p className="text-sm text-gray-500 break-all">
              Filesystem path:&nbsp;
              <span className="font-semibold">{savedPdfAbsolutePath}</span>
            </p>
          )}
          {savedPdfUrl && (
            <p className="text-sm text-gray-500">
              Saved URL:{" "}
              <a
                href={savedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[hsl(var(--cura-bluewave))] hover:underline break-all"
              >
                {savedPdfUrl}
              </a>
            </p>
          )}
          <div className="flex justify-center">
            <Button onClick={() => handlePdfModalOpenChange(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Physical Examination Modal */}
      <Dialog open={showPhysicalExamModal} onOpenChange={setShowPhysicalExamModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Physical Examination Findings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(consultationData.examination).map(([system, value]) => (
                <div key={system} className="space-y-2">
                  <Label className="capitalize font-medium flex items-center gap-2">
                    {system === 'cardiovascular' && <Heart className="w-4 h-4 text-red-500" />}
                    {system === 'respiratory' && <Activity className="w-4 h-4 text-blue-500" />}
                    {system === 'neurological' && <Brain className="w-4 h-4 text-purple-500" />}
                    {system === 'head_neck' && <Eye className="w-4 h-4 text-green-500" />}
                    {system === 'ears_nose_throat' && <Ear className="w-4 h-4 text-yellow-500" />}
                    {system.replace('_', ' ')}
                  </Label>
                  <Textarea
                    placeholder={`${system} examination findings...`}
                    value={value}
                    onChange={(e) => {
                      setConsultationData(prev => ({
                        ...prev,
                        examination: { ...prev.examination, [system]: e.target.value }
                      }));
                      // Clear error when user starts typing
                      setPhysicalExamErrors(prev => ({ ...prev, [system]: "" }));
                    }}
                    className={`h-20 ${physicalExamErrors[system as keyof typeof physicalExamErrors] ? 'border-red-500' : ''}`}
                  />
                  {physicalExamErrors[system as keyof typeof physicalExamErrors] && (
                    <p className="text-xs text-red-500">
                      {physicalExamErrors[system as keyof typeof physicalExamErrors]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhysicalExamModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={savePhysicalExamination} 
              disabled={isSavingPhysicalExam}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingPhysicalExam ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Examination Modal */}
      <Dialog open={showGeneralExamModal} onOpenChange={setShowGeneralExamModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              General Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>General Appearance</Label>
                <Textarea 
                  placeholder="Overall appearance, posture, gait..." 
                  className={`h-20 ${generalExamErrors.generalAppearance ? 'border-red-500' : ''}`}
                  value={generalExamData.generalAppearance}
                  onChange={(e) => {
                    setGeneralExamData(prev => ({...prev, generalAppearance: e.target.value}));
                    setGeneralExamErrors(prev => ({...prev, generalAppearance: ""}));
                  }}
                />
                {generalExamErrors.generalAppearance && (
                  <p className="text-xs text-red-500">{generalExamErrors.generalAppearance}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Mental Status</Label>
                <Textarea 
                  placeholder="Consciousness level, orientation..." 
                  className={`h-20 ${generalExamErrors.mentalStatus ? 'border-red-500' : ''}`}
                  value={generalExamData.mentalStatus}
                  onChange={(e) => {
                    setGeneralExamData(prev => ({...prev, mentalStatus: e.target.value}));
                    setGeneralExamErrors(prev => ({...prev, mentalStatus: ""}));
                  }}
                />
                {generalExamErrors.mentalStatus && (
                  <p className="text-xs text-red-500">{generalExamErrors.mentalStatus}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Skin Assessment</Label>
                <Textarea 
                  placeholder="Color, texture, lesions..." 
                  className={`h-20 ${generalExamErrors.skinAssessment ? 'border-red-500' : ''}`}
                  value={generalExamData.skinAssessment}
                  onChange={(e) => {
                    setGeneralExamData(prev => ({...prev, skinAssessment: e.target.value}));
                    setGeneralExamErrors(prev => ({...prev, skinAssessment: ""}));
                  }}
                />
                {generalExamErrors.skinAssessment && (
                  <p className="text-xs text-red-500">{generalExamErrors.skinAssessment}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Lymph Nodes</Label>
                <Textarea 
                  placeholder="Palpable lymph nodes..." 
                  className={`h-20 ${generalExamErrors.lymphNodes ? 'border-red-500' : ''}`}
                  value={generalExamData.lymphNodes}
                  onChange={(e) => {
                    setGeneralExamData(prev => ({...prev, lymphNodes: e.target.value}));
                    setGeneralExamErrors(prev => ({...prev, lymphNodes: ""}));
                  }}
                />
                {generalExamErrors.lymphNodes && (
                  <p className="text-xs text-red-500">{generalExamErrors.lymphNodes}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneralExamModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveGeneralExamination} 
              disabled={isSavingGeneralExam}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingGeneralExam ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cardiovascular Examination Modal */}
      <Dialog open={showCardiovascularExamModal} onOpenChange={setShowCardiovascularExamModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Cardiovascular Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Heart Rate & Rhythm</Label>
                <Textarea 
                  placeholder="Rate, rhythm, regularity..." 
                  className={`h-20 ${cardiovascularExamErrors.heartRateRhythm ? 'border-red-500' : ''}`}
                  value={cardiovascularExamData.heartRateRhythm}
                  onChange={(e) => {
                    setCardiovascularExamData(prev => ({...prev, heartRateRhythm: e.target.value}));
                    setCardiovascularExamErrors(prev => ({...prev, heartRateRhythm: ""}));
                  }}
                />
                {cardiovascularExamErrors.heartRateRhythm && (
                  <p className="text-xs text-red-500">{cardiovascularExamErrors.heartRateRhythm}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Heart Sounds</Label>
                <Textarea 
                  placeholder="S1, S2, murmurs, gallops..." 
                  className={`h-20 ${cardiovascularExamErrors.heartSounds ? 'border-red-500' : ''}`}
                  value={cardiovascularExamData.heartSounds}
                  onChange={(e) => {
                    setCardiovascularExamData(prev => ({...prev, heartSounds: e.target.value}));
                    setCardiovascularExamErrors(prev => ({...prev, heartSounds: ""}));
                  }}
                />
                {cardiovascularExamErrors.heartSounds && (
                  <p className="text-xs text-red-500">{cardiovascularExamErrors.heartSounds}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Blood Pressure</Label>
                <Textarea 
                  placeholder="Systolic/Diastolic measurements..." 
                  className={`h-20 ${cardiovascularExamErrors.bloodPressure ? 'border-red-500' : ''}`}
                  value={cardiovascularExamData.bloodPressure}
                  onChange={(e) => {
                    setCardiovascularExamData(prev => ({...prev, bloodPressure: e.target.value}));
                    setCardiovascularExamErrors(prev => ({...prev, bloodPressure: ""}));
                  }}
                />
                {cardiovascularExamErrors.bloodPressure && (
                  <p className="text-xs text-red-500">{cardiovascularExamErrors.bloodPressure}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Peripheral Pulses</Label>
                <Textarea 
                  placeholder="Radial, pedal, carotid pulses..." 
                  className={`h-20 ${cardiovascularExamErrors.peripheralPulses ? 'border-red-500' : ''}`}
                  value={cardiovascularExamData.peripheralPulses}
                  onChange={(e) => {
                    setCardiovascularExamData(prev => ({...prev, peripheralPulses: e.target.value}));
                    setCardiovascularExamErrors(prev => ({...prev, peripheralPulses: ""}));
                  }}
                />
                {cardiovascularExamErrors.peripheralPulses && (
                  <p className="text-xs text-red-500">{cardiovascularExamErrors.peripheralPulses}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Edema Assessment</Label>
                <Textarea 
                  placeholder="Peripheral edema, JVP..." 
                  className={`h-20 ${cardiovascularExamErrors.edemaAssessment ? 'border-red-500' : ''}`}
                  value={cardiovascularExamData.edemaAssessment}
                  onChange={(e) => {
                    setCardiovascularExamData(prev => ({...prev, edemaAssessment: e.target.value}));
                    setCardiovascularExamErrors(prev => ({...prev, edemaAssessment: ""}));
                  }}
                />
                {cardiovascularExamErrors.edemaAssessment && (
                  <p className="text-xs text-red-500">{cardiovascularExamErrors.edemaAssessment}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Chest Inspection</Label>
                <Textarea 
                  placeholder="Chest wall, point of maximal impulse..." 
                  className={`h-20 ${cardiovascularExamErrors.chestInspection ? 'border-red-500' : ''}`}
                  value={cardiovascularExamData.chestInspection}
                  onChange={(e) => {
                    setCardiovascularExamData(prev => ({...prev, chestInspection: e.target.value}));
                    setCardiovascularExamErrors(prev => ({...prev, chestInspection: ""}));
                  }}
                />
                {cardiovascularExamErrors.chestInspection && (
                  <p className="text-xs text-red-500">{cardiovascularExamErrors.chestInspection}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardiovascularExamModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveCardiovascularExamination} 
              disabled={isSavingCardiovascularExam}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingCardiovascularExam ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respiratory Examination Modal */}
      <Dialog open={showRespiratoryExamModal} onOpenChange={setShowRespiratoryExamModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Respiratory Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Respiratory Rate</Label>
                <Textarea 
                  placeholder="Rate, depth, pattern..." 
                  className={`h-20 ${respiratoryExamErrors.respiratoryRate ? 'border-red-500' : ''}`}
                  value={respiratoryExamData.respiratoryRate}
                  onChange={(e) => {
                    setRespiratoryExamData(prev => ({...prev, respiratoryRate: e.target.value}));
                    setRespiratoryExamErrors(prev => ({...prev, respiratoryRate: ""}));
                  }}
                />
                {respiratoryExamErrors.respiratoryRate && (
                  <p className="text-xs text-red-500">{respiratoryExamErrors.respiratoryRate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Chest Inspection</Label>
                <Textarea 
                  placeholder="Shape, symmetry, expansion..." 
                  className={`h-20 ${respiratoryExamErrors.chestInspection ? 'border-red-500' : ''}`}
                  value={respiratoryExamData.chestInspection}
                  onChange={(e) => {
                    setRespiratoryExamData(prev => ({...prev, chestInspection: e.target.value}));
                    setRespiratoryExamErrors(prev => ({...prev, chestInspection: ""}));
                  }}
                />
                {respiratoryExamErrors.chestInspection && (
                  <p className="text-xs text-red-500">{respiratoryExamErrors.chestInspection}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Auscultation</Label>
                <Textarea 
                  placeholder="Breath sounds, adventitious sounds..." 
                  className={`h-20 ${respiratoryExamErrors.auscultation ? 'border-red-500' : ''}`}
                  value={respiratoryExamData.auscultation}
                  onChange={(e) => {
                    setRespiratoryExamData(prev => ({...prev, auscultation: e.target.value}));
                    setRespiratoryExamErrors(prev => ({...prev, auscultation: ""}));
                  }}
                />
                {respiratoryExamErrors.auscultation && (
                  <p className="text-xs text-red-500">{respiratoryExamErrors.auscultation}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Percussion</Label>
                <Textarea 
                  placeholder="Resonance, dullness..." 
                  className={`h-20 ${respiratoryExamErrors.percussion ? 'border-red-500' : ''}`}
                  value={respiratoryExamData.percussion}
                  onChange={(e) => {
                    setRespiratoryExamData(prev => ({...prev, percussion: e.target.value}));
                    setRespiratoryExamErrors(prev => ({...prev, percussion: ""}));
                  }}
                />
                {respiratoryExamErrors.percussion && (
                  <p className="text-xs text-red-500">{respiratoryExamErrors.percussion}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Palpation</Label>
                <Textarea 
                  placeholder="Chest expansion, tactile fremitus..." 
                  className={`h-20 ${respiratoryExamErrors.palpation ? 'border-red-500' : ''}`}
                  value={respiratoryExamData.palpation}
                  onChange={(e) => {
                    setRespiratoryExamData(prev => ({...prev, palpation: e.target.value}));
                    setRespiratoryExamErrors(prev => ({...prev, palpation: ""}));
                  }}
                />
                {respiratoryExamErrors.palpation && (
                  <p className="text-xs text-red-500">{respiratoryExamErrors.palpation}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Oxygen Saturation</Label>
                <Textarea 
                  placeholder="SpO2 measurements..." 
                  className={`h-20 ${respiratoryExamErrors.oxygenSaturation ? 'border-red-500' : ''}`}
                  value={respiratoryExamData.oxygenSaturation}
                  onChange={(e) => {
                    setRespiratoryExamData(prev => ({...prev, oxygenSaturation: e.target.value}));
                    setRespiratoryExamErrors(prev => ({...prev, oxygenSaturation: ""}));
                  }}
                />
                {respiratoryExamErrors.oxygenSaturation && (
                  <p className="text-xs text-red-500">{respiratoryExamErrors.oxygenSaturation}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespiratoryExamModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveRespiratoryExamination} 
              disabled={isSavingRespiratoryExam}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingRespiratoryExam ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Neurological Examination Modal */}
      <Dialog open={showNeurologicalExamModal} onOpenChange={setShowNeurologicalExamModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Neurological Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mental Status</Label>
                <Textarea 
                  placeholder="Consciousness, orientation, memory..." 
                  className={`h-20 ${neurologicalExamErrors.mentalStatus ? 'border-red-500' : ''}`}
                  value={neurologicalExamData.mentalStatus}
                  onChange={(e) => {
                    setNeurologicalExamData(prev => ({...prev, mentalStatus: e.target.value}));
                    setNeurologicalExamErrors(prev => ({...prev, mentalStatus: ""}));
                  }}
                />
                {neurologicalExamErrors.mentalStatus && (
                  <p className="text-xs text-red-500">{neurologicalExamErrors.mentalStatus}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cranial Nerves</Label>
                <Textarea 
                  placeholder="CN I-XII assessment..." 
                  className={`h-20 ${neurologicalExamErrors.cranialNerves ? 'border-red-500' : ''}`}
                  value={neurologicalExamData.cranialNerves}
                  onChange={(e) => {
                    setNeurologicalExamData(prev => ({...prev, cranialNerves: e.target.value}));
                    setNeurologicalExamErrors(prev => ({...prev, cranialNerves: ""}));
                  }}
                />
                {neurologicalExamErrors.cranialNerves && (
                  <p className="text-xs text-red-500">{neurologicalExamErrors.cranialNerves}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Motor Function</Label>
                <Textarea 
                  placeholder="Strength, tone, coordination..." 
                  className={`h-20 ${neurologicalExamErrors.motorFunction ? 'border-red-500' : ''}`}
                  value={neurologicalExamData.motorFunction}
                  onChange={(e) => {
                    setNeurologicalExamData(prev => ({...prev, motorFunction: e.target.value}));
                    setNeurologicalExamErrors(prev => ({...prev, motorFunction: ""}));
                  }}
                />
                {neurologicalExamErrors.motorFunction && (
                  <p className="text-xs text-red-500">{neurologicalExamErrors.motorFunction}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sensory Function</Label>
                <Textarea 
                  placeholder="Touch, pain, temperature, vibration..." 
                  className={`h-20 ${neurologicalExamErrors.sensoryFunction ? 'border-red-500' : ''}`}
                  value={neurologicalExamData.sensoryFunction}
                  onChange={(e) => {
                    setNeurologicalExamData(prev => ({...prev, sensoryFunction: e.target.value}));
                    setNeurologicalExamErrors(prev => ({...prev, sensoryFunction: ""}));
                  }}
                />
                {neurologicalExamErrors.sensoryFunction && (
                  <p className="text-xs text-red-500">{neurologicalExamErrors.sensoryFunction}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Reflexes</Label>
                <Textarea 
                  placeholder="Deep tendon reflexes, pathological reflexes..." 
                  className={`h-20 ${neurologicalExamErrors.reflexes ? 'border-red-500' : ''}`}
                  value={neurologicalExamData.reflexes}
                  onChange={(e) => {
                    setNeurologicalExamData(prev => ({...prev, reflexes: e.target.value}));
                    setNeurologicalExamErrors(prev => ({...prev, reflexes: ""}));
                  }}
                />
                {neurologicalExamErrors.reflexes && (
                  <p className="text-xs text-red-500">{neurologicalExamErrors.reflexes}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gait & Coordination</Label>
                <Textarea 
                  placeholder="Walking pattern, balance, coordination tests..." 
                  className={`h-20 ${neurologicalExamErrors.gaitCoordination ? 'border-red-500' : ''}`}
                  value={neurologicalExamData.gaitCoordination}
                  onChange={(e) => {
                    setNeurologicalExamData(prev => ({...prev, gaitCoordination: e.target.value}));
                    setNeurologicalExamErrors(prev => ({...prev, gaitCoordination: ""}));
                  }}
                />
                {neurologicalExamErrors.gaitCoordination && (
                  <p className="text-xs text-red-500">{neurologicalExamErrors.gaitCoordination}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNeurologicalExamModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveNeurologicalExamination} 
              disabled={isSavingNeurologicalExam}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingNeurologicalExam ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}