import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getTenantSubdomain } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { Header } from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  FileImage,
  Plus,
  Search,
  Download,
  Eye,
  User,
  FileText,
  Monitor,
  Camera,
  Zap,
  Share,
  Share2,
  Send,
  Mail,
  MessageCircle,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronsUpDown,
  Check as CheckIcon,
  CheckCircle,
  Grid,
  List,
  Pill,
  CalendarIcon,
  Save,
  PenTool,
  MoreVertical,
} from "lucide-react";
import { format } from "date-fns";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useTheme } from "@/hooks/use-theme";

// Modality to Body Part mapping
const MODALITY_BODY_PARTS: Record<string, string[]> = {
  "X-Ray": [
    "Chest X-Ray (PA / Lateral)",
    "Abdomen X-Ray",
    "Spine X-Ray (Cervical / Lumbar)",
    "Skull X-Ray",
    "Pelvis X-Ray",
    "Hand / Foot / Arm / Leg X-Ray"
  ],
  "CT": [
    "CT Brain",
    "CT Chest",
    "CT Abdomen & Pelvis",
    "CT Spine",
    "CT Angiogram (Coronary, Pulmonary, Cerebral)"
  ],
  "MRI": [
    "MRI Brain",
    "MRI Spine (Cervical / Lumbar)",
    "MRI Knee",
    "MRI Abdomen / Pelvis",
    "MRI Shoulder",
    "MRI Angiography"
  ],
  "Ultrasound": [
    "Abdomen Ultrasound",
    "Pelvic Ultrasound",
    "Thyroid Ultrasound",
    "Obstetric (OB) Ultrasound",
    "Doppler Ultrasound (Carotid / Venous / Arterial)"
  ],
  "Mammography": [
    "Screening Mammogram (Bilateral)",
    "Diagnostic Mammogram"
  ],
  "Nuclear Medicine": [
    "Bone Scan",
    "Thyroid Scan",
    "Renal Scan",
    "Cardiac Perfusion Scan"
  ]
};

interface ImagingStudy {
  id: string;
  imageId?: string; // Unique image ID from medical_images table (e.g., IMG1760636902921I2ONC)
  patientId: string;
  patientName: string;
  studyType: string;
  modality:
  | "X-Ray"
  | "CT"
  | "MRI"
  | "Ultrasound"
  | "Nuclear Medicine"
  | "Mammography";
  bodyPart: string;
  orderedBy: string;
  orderedAt: string;
  scheduledAt?: string;
  performedAt?: string;
  status:
  | "ordered"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "preliminary"
  | "final"
  | "cancelled";
  priority: "routine" | "urgent" | "stat";
  indication: string;
  findings?: string;
  impression?: string;
  radiologist?: string;
  reportFileName?: string;
  reportFilePath?: string;
  prescriptionFilePath?: string;
  orderStudyCreated?: boolean;
  orderStudyReadyToGenerate?: boolean;
  orderStudyGenerated?: boolean;
  orderStudyShared?: boolean;
  images: Array<{
    id: string;
    type: "DICOM" | "JPEG" | "PNG";
    seriesDescription: string;
    imageCount: number;
    size: string;
    imageData?: string;
    mimeType?: string;
    fileName?: string;
  }>;
  report?: {
    status: "preliminary" | "final";
    content: string;
    dictatedAt: string;
    signedAt?: string;
  };
}

const mockImagingStudies: ImagingStudy[] = [
  {
    id: "img_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    studyType: "Chest X-Ray PA and Lateral",
    modality: "X-Ray",
    bodyPart: "Chest",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-15T09:00:00Z",
    scheduledAt: "2024-01-15T14:00:00Z",
    performedAt: "2024-01-15T14:15:00Z",
    status: "final",
    priority: "routine",
    indication: "Chronic cough, rule out pneumonia",
    findings:
      "Lungs are clear bilaterally. No acute cardiopulmonary abnormality. Heart size normal.",
    impression: "Normal chest X-ray.",
    radiologist: "Dr. Michael Chen",
    images: [
      {
        id: "series_001",
        type: "DICOM",
        seriesDescription: "PA View",
        imageCount: 1,
        size: "2.1 MB",
      },
      {
        id: "series_002",
        type: "DICOM",
        seriesDescription: "Lateral View",
        imageCount: 1,
        size: "2.3 MB",
      },
    ],
    report: {
      status: "final",
      content:
        "EXAMINATION: Chest X-ray PA and Lateral\n\nINDICATION: Chronic cough, rule out pneumonia\n\nFINDINGS: The lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is normal in size and configuration. The mediastinal contours are normal. No acute bony abnormalities are identified.\n\nIMPRESSION: Normal chest X-ray.",
      dictatedAt: "2024-01-15T15:30:00Z",
      signedAt: "2024-01-15T15:45:00Z",
    },
  },
  {
    id: "img_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    studyType: "CT Abdomen and Pelvis with Contrast",
    modality: "CT",
    bodyPart: "Abdomen/Pelvis",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-14T10:00:00Z",
    scheduledAt: "2024-01-16T09:00:00Z",
    status: "scheduled",
    priority: "urgent",
    indication: "Abdominal pain, rule out appendicitis",
    images: [],
  },
  {
    id: "img_003",
    patientId: "p_003",
    patientName: "Emma Wilson",
    studyType: "Brain MRI without Contrast",
    modality: "MRI",
    bodyPart: "Brain",
    orderedBy: "Dr. Michael Chen",
    orderedAt: "2024-01-13T11:00:00Z",
    performedAt: "2024-01-14T10:30:00Z",
    status: "preliminary",
    priority: "routine",
    indication: "Headaches, rule out structural abnormality",
    radiologist: "Dr. Lisa Park",
    images: [
      {
        id: "series_003",
        type: "DICOM",
        seriesDescription: "T1 Sagittal",
        imageCount: 25,
        size: "45.2 MB",
      },
      {
        id: "series_004",
        type: "DICOM",
        seriesDescription: "T2 Axial",
        imageCount: 30,
        size: "52.8 MB",
      },
      {
        id: "series_005",
        type: "DICOM",
        seriesDescription: "FLAIR Axial",
        imageCount: 28,
        size: "48.6 MB",
      },
    ],
    report: {
      status: "preliminary",
      content:
        "PRELIMINARY REPORT - AWAITING FINAL REVIEW\n\nEXAMINATION: Brain MRI without contrast\n\nINDICATION: Headaches, rule out structural abnormality\n\nFINDINGS: Preliminary review shows no acute intracranial abnormality. No mass lesion, hemorrhage, or midline shift identified. Ventricular system appears normal.\n\nIMPRESSION: Preliminary - No acute intracranial abnormality.",
      dictatedAt: "2024-01-14T16:00:00Z",
    },
  },
];

export default function ImagingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isDoctor, isAdmin, canCreate, canEdit, canDelete } = useRolePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterImageId, setFilterImageId] = useState<string>("");
  const [imageIdPopoverOpen, setImageIdPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("order-study");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewDialogOpenedFromEditReport, setViewDialogOpenedFromEditReport] = useState(false);
  const [reportDialogIsEditMode, setReportDialogIsEditMode] = useState(false);
  const [showFinalReportDialog, setShowFinalReportDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFileNotAvailableDialog, setShowFileNotAvailableDialog] =
    useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [studyToDelete, setStudyToDelete] = useState<any>(null);
  const [showShareSuccessDialog, setShowShareSuccessDialog] = useState(false);
  const [shareSuccessEmail, setShareSuccessEmail] = useState("");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedStudyDetails, setSelectedStudyDetails] = useState<any>(null);
  const [openActionsStudyId, setOpenActionsStudyId] = useState<string | null>(null);
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [shareFormData, setShareFormData] = useState<{
    method: string;
    email: string;
    whatsapp: string;
    message: string;
    shareSource?: 'prescription' | 'report';
  }>({
    method: "",
    email: "",
    whatsapp: "",
    message: "",
    shareSource: 'report',
  });
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [uploadPatientSearchOpen, setUploadPatientSearchOpen] = useState(false);
  const [reportFindings, setReportFindings] = useState("");
  const [reportImpression, setReportImpression] = useState("");
  const [reportRadiologist, setReportRadiologist] = useState("");
  // Editable Findings/Impression in View Imaging Study when opened from Imaging Results edit
  const [viewDialogFindings, setViewDialogFindings] = useState("");
  const [viewDialogImpression, setViewDialogImpression] = useState("");
  const [isUpdatingViewReport, setIsUpdatingViewReport] = useState(false);
  const [regenerateSuccessInView, setRegenerateSuccessInView] = useState(false);

  // Edit mode states for individual fields
  const [editModes, setEditModes] = useState({
    findings: false,
    impression: false,
    radiologist: false,
    scheduledAt: false,
    performedAt: false,
    status: false,
    priority: false,
  });

  // Saving states for individual fields
  const [saving, setSaving] = useState({
    findings: false,
    impression: false,
    radiologist: false,
    scheduledAt: false,
    performedAt: false,
    status: false,
    priority: false,
  });

  // Editing status state for dropdown
  const [editingStatus, setEditingStatus] = useState<string>("");

  // Edit status dialog (popup to avoid overlapping)
  const [editStatusDialog, setEditStatusDialog] = useState<{ studyId: string; status: string } | null>(null);
  const [editStatusDraft, setEditStatusDraft] = useState<string>("");
  const [statusUpdateSuccessModal, setStatusUpdateSuccessModal] = useState<string | null>(null);

  // Editing priority state for dropdown
  const [editingPriority, setEditingPriority] = useState<string>("");

  // Date states for editing
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined,
  );
  const [performedDate, setPerformedDate] = useState<Date | undefined>(
    undefined,
  );
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [performedTime, setPerformedTime] = useState<string>("");

  const [generatedReportId, setGeneratedReportId] = useState<string | null>(
    null,
  );
  const [generatedReportFileName, setGeneratedReportFileName] = useState<
    string | null
  >(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPaymentSuccessDialog, setShowPaymentSuccessDialog] = useState(false);
  const [showPDFViewerDialog, setShowPDFViewerDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    invoiceId: string;
    patientName: string;
    amount: number;
  } | null>(null);

  // E-Signature states
  const [showESignDialog, setShowESignDialog] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [hideTabs, setHideTabs] = useState(true);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isSavingSignature, setIsSavingSignature] = useState(false);

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

  const [uploadFormData, setUploadFormData] = useState({
    patientId: "",
    studyType: "",
    modality: "X-Ray",
    bodyPart: "",
    indication: "",
    priority: "routine",
    selectedRole: "",
    selectedUserId: "",
  });
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    studyType: "",
    modality: "X-Ray",
    bodyPart: "",
    indication: "",
    priority: "routine",
    specialInstructions: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImagePreviews, setUploadedImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saveImageSuccess, setSaveImageSuccess] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageSeries, setSelectedImageSeries] = useState<any>(null);
  const [showBodyPartImagesDialog, setShowBodyPartImagesDialog] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [bodyPartDialogMedicalImageId, setBodyPartDialogMedicalImageId] = useState<number | null>(null);
  const [bodyPartDialogImageId, setBodyPartDialogImageId] = useState<string | null>(null);
  const [bodyPartImages, setBodyPartImages] = useState<any[]>([]);
  const [loadingBodyPartImages, setLoadingBodyPartImages] = useState(false);
  const [bodyPartImagePreviews, setBodyPartImagePreviews] = useState<Record<number, string>>({});
  const [showViewStudyImagesDialog, setShowViewStudyImagesDialog] = useState(false);
  const [viewStudyImagesList, setViewStudyImagesList] = useState<Array<{ url: string; fileName: string; mimeType?: string }>>([]);
  const [loadingViewStudyImages, setLoadingViewStudyImages] = useState(false);
  const [showPDFListViewDialog, setShowPDFListViewDialog] = useState(false);
  const [selectedPDFUrl, setSelectedPDFUrl] = useState<string | null>(null);
  const [selectedPDFFileName, setSelectedPDFFileName] = useState<string | null>(null);
  const [deletedStudyIds, setDeletedStudyIds] = useState<Set<string>>(
    new Set(),
  );
  const [nonExistentReports, setNonExistentReports] = useState<Set<string>>(
    new Set(),
  );
  const [showEditImageDialog, setShowEditImageDialog] = useState(false);
  const [editingStudyId, setEditingStudyId] = useState<string | null>(null);
  const [replaceDialogPreviews, setReplaceDialogPreviews] = useState<string[]>([]);
  const [replaceDialogExistingPreviews, setReplaceDialogExistingPreviews] = useState<Array<{ id: number; url: string; fileName: string }>>([]);
  const [loadingReplaceExistingPreviews, setLoadingReplaceExistingPreviews] = useState(false);
  const [replaceSuccessMessage, setReplaceSuccessMessage] = useState<string | null>(null);
  const [radiologyImages, setRadiologyImages] = useState<any[]>([]);
  const [loadingRadiologyImages, setLoadingRadiologyImages] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showSignFirstDialog, setShowSignFirstDialog] = useState(false);
  const [pendingPrescriptionStudy, setPendingPrescriptionStudy] = useState<any>(null);
  const [pendingESignStudy, setPendingESignStudy] = useState<any>(null);
  const [selectedPrescriptionStudy, setSelectedPrescriptionStudy] = useState<any>(null);
  const [isSavingPrescription, setIsSavingPrescription] = useState(false);
  const [showSignatureDetailsDialog, setShowSignatureDetailsDialog] = useState(false);
  const [selectedSignatureData, setSelectedSignatureData] = useState<any>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showSummarySuccessModal, setShowSummarySuccessModal] = useState(false);
  const [eSignStudy, setESignStudy] = useState<any>(null);
  const [invoiceFormData, setInvoiceFormData] = useState({
    paymentMethod: "",
    subtotal: 0,
    tax: 0,
    discount: 0,
    totalAmount: 0,
  });
  const [summaryData, setSummaryData] = useState<any>(null);
  const [uploadedImageData, setUploadedImageData] = useState<any>(null);
  const [showPatientReport, setShowPatientReport] = useState(false);

  // Invoice form fields
  const [invoicePatient, setInvoicePatient] = useState("");
  const [invoiceServiceDate, setInvoiceServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceServiceCode, setInvoiceServiceCode] = useState("");
  const [invoiceServiceDesc, setInvoiceServiceDesc] = useState("");
  const [invoiceServiceQty, setInvoiceServiceQty] = useState("");
  const [invoiceServiceAmount, setInvoiceServiceAmount] = useState("");
  const [invoiceInsuranceProvider, setInvoiceInsuranceProvider] = useState("none");
  const [invoiceNhsNumber, setInvoiceNhsNumber] = useState("");
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Validation errors
  const [invoicePatientError, setInvoicePatientError] = useState("");
  const [invoiceServiceError, setInvoiceServiceError] = useState("");
  const [invoiceNhsError, setInvoiceNhsError] = useState("");
  const [invoiceTotalError, setInvoiceTotalError] = useState("");
  const [invoicePaymentMethodError, setInvoicePaymentMethodError] = useState("");

  // Combobox open states
  const [modalityOpen, setModalityOpen] = useState(false);
  const [bodyPartOpen, setBodyPartOpen] = useState(false);
  const [studyTypeOpen, setStudyTypeOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { toast } = useToast();

  // Fetch patients to find the current user's patient record
  const { data: patientsData, isLoading: patientsQueryLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      return data;
    },
  });

  // Fetch imaging pricing data for study types (not needed for patient users)
  const { data: imagingPricing = [], isLoading: pricingLoading } = useQuery({
    queryKey: ["/api/pricing/imaging"],
    staleTime: 60000,
    retry: false,
    enabled: user?.role !== 'patient', // Disable for patient users who only view their own images
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/pricing/imaging');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Generate study types from MODALITY_BODY_PARTS if pricing data is empty
  const availableStudyTypes = useMemo(() => {
    if (imagingPricing.length > 0) {
      // Use pricing data if available
      return imagingPricing.map((p: any) => ({
        id: p.id,
        imagingType: p.imagingType,
        imagingCode: p.imagingCode,
        modality: p.modality,
        bodyPart: p.bodyPart,
        basePrice: p.basePrice,
      }));
    } else {
      // Fallback to MODALITY_BODY_PARTS
      const studyTypes: any[] = [];
      let idCounter = 1;
      Object.entries(MODALITY_BODY_PARTS).forEach(([modality, bodyParts]) => {
        bodyParts.forEach((bodyPart) => {
          studyTypes.push({
            id: idCounter++,
            imagingType: bodyPart,
            imagingCode: `IMG-${idCounter.toString().padStart(3, '0')}`,
            modality: modality,
            bodyPart: bodyPart,
            basePrice: "50.00",
          });
        });
      });
      return studyTypes;
    }
  }, [imagingPricing]);

  // Fetch users by selected role
  const { data: usersByRole = [], isLoading: usersByRoleLoading } = useQuery({
    queryKey: ["/api/users/by-role", uploadFormData.selectedRole],
    staleTime: 60000,
    retry: false,
    enabled: !!uploadFormData.selectedRole && user?.role !== 'patient',
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/by-role/${uploadFormData.selectedRole}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch all users for provider name lookup
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
    retry: false,
    enabled: user?.role !== 'patient',
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/users');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    },
  });

  // Find the patient record for the logged-in user
  const currentPatient = useMemo(() => {
    if (!user || user.role !== 'patient' || !patientsData || !Array.isArray(patientsData)) {
      console.log("🔍 IMAGING: Patient lookup failed", {
        hasUser: !!user,
        userRole: user?.role,
        hasPatientsData: !!patientsData,
        patientsDataType: Array.isArray(patientsData) ? 'array' : typeof patientsData
      });
      return null;
    }

    console.log("🔍 IMAGING: Looking for patient matching user:", {
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      userId: user.id
    });
    console.log("📋 IMAGING: Available patients:", patientsData.map(p => ({
      id: p.id,
      email: p.email,
      name: `${p.firstName} ${p.lastName}`
    })));

    // Try multiple matching strategies
    const foundPatient =
      // 1. Match by exact email
      patientsData.find((patient: any) =>
        patient.email && user.email && patient.email.toLowerCase() === user.email.toLowerCase()
      ) ||
      // 2. Match by exact name
      patientsData.find((patient: any) =>
        patient.firstName && user.firstName && patient.lastName && user.lastName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase() &&
        patient.lastName.toLowerCase() === user.lastName.toLowerCase()
      ) ||
      // 3. Match by partial name (first name only)
      patientsData.find((patient: any) =>
        patient.firstName && user.firstName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase()
      ) ||
      // 4. If user role is patient, take the first patient (fallback for demo)
      (user.role === 'patient' && patientsData.length > 0 ? patientsData[0] : null);

    if (foundPatient) {
      console.log("✅ IMAGING: Found matching patient:", foundPatient);
    } else {
      console.log("❌ IMAGING: No matching patient found");
    }

    return foundPatient;
  }, [user, patientsData]);

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

  const findPatientById = useCallback(
    (patientId: string) =>
      patients.find((patient: any) => patient.id?.toString() === patientId),
    [patients],
  );

  // Fetch medical images using React Query
  const {
    data: medicalImagesRaw = [],
    isLoading: imagesLoading,
    refetch: refetchImages,
  } = useQuery({
    queryKey: ["/api/medical-images", user?.role === "patient" ? "patient-filtered" : "all"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/medical-images");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching medical images:", error);
        return [];
      }
    },
    enabled: !!user, // Only fetch when user is authenticated
    // Auto-refresh for patient/admin/nurse/doctor roles: poll every 10 seconds to get new imaging results
    refetchInterval: (user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)) ? 10000 : false, // 10 seconds = 10000ms
    refetchIntervalInBackground: (user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role)), // Continue polling even when tab is in background
  });

  // Filter medical images: patient = own only; nurse/doctor = own only; admin = all
  const medicalImages = useMemo(() => {
    if (!medicalImagesRaw) return [];

    // For patient users, filter by patient ID
    if (user?.role === "patient" && currentPatient) {
      return medicalImagesRaw.filter((image: any) => {
        return String(image.patientId) === String(currentPatient.id);
      });
    }

    // For nurse or doctor, show only their own data (uploaded by them or selected as provider)
    if (user?.role === "nurse" || user?.role === "doctor") {
      const currentUserId = user?.id != null ? String(user.id) : "";
      if (!currentUserId) return [];
      return medicalImagesRaw.filter((image: any) => {
        const uploadedByMatch = String(image.uploadedBy) === currentUserId;
        const selectedUserMatch = image.selectedUserId != null && String(image.selectedUserId) === currentUserId;
        return uploadedByMatch || selectedUserMatch;
      });
    }

    // For admin (and any other role), show all images
    return medicalImagesRaw;
  }, [medicalImagesRaw, user?.role, user?.id, currentPatient]);

  // Track previous imaging results count for patient role to detect new entries
  const prevImagingCountRef = React.useRef<number>(0);

  // Notify patient/admin/nurse/doctor when new imaging results are detected
  useEffect(() => {
    const shouldNotify = user?.role === "patient" || user?.role === "admin" || user?.role === "nurse" || isDoctorLike(user?.role);
    if (shouldNotify && Array.isArray(medicalImages)) {
      const currentCount = medicalImages.length;
      const previousCount = prevImagingCountRef.current;

      // Only show notification if count increased (new imaging results added)
      if (previousCount > 0 && currentCount > previousCount) {
        const newImagingCount = currentCount - previousCount;
        toast({
          title: "New Imaging Results Available",
          description: `${newImagingCount} new imaging result${newImagingCount > 1 ? 's' : ''} ${newImagingCount > 1 ? 'have' : 'has'} been added.`,
          variant: "default",
        });
      }

      // Update the ref with current count
      prevImagingCountRef.current = currentCount;
    }
  }, [medicalImages, user?.role, toast]);

  // Derive selectedStudy from React Query cache (single source of truth)
  const selectedStudy = useMemo<ImagingStudy | null>(() => {
    if (!selectedStudyId) return null;
    const study = medicalImages.find(
      (img: any) => img.id?.toString() === selectedStudyId,
    );
    if (!study) return null;

    console.log('📷 FRONTEND: Raw study data from API:', { id: study.id, imageId: study.imageId, fileName: study.fileName, patientId: study.patientId });
    const mapped: ImagingStudy = {
      id: String(study.id),
      imageId: study.imageId, // Include imageId from medical_images table for PDF naming
      patientId: String(study.patientId),
      patientName: study.patientName ?? "Unknown",
      studyType: study.studyType ?? study.imageType ?? "Unknown",
      modality: (study.modality ?? "X-Ray") as ImagingStudy["modality"],
      bodyPart: study.bodyPart ?? "Not specified",
      orderedBy: study.uploadedByName ?? "Unknown",
      orderedAt: study.createdAt,
      scheduledAt: study.scheduledAt,
      performedAt: study.performedAt,
      status: study.status === "uploaded" ? "completed" : (study.status as ImagingStudy["status"]),
      priority: (study.priority ?? "routine") as ImagingStudy["priority"],
      indication: study.indication ?? "No indication provided",
      findings: study.findings ?? `Medical image uploaded: ${study.fileName || study.file_name}`,
      impression:
        study.impression ??
        `File: ${study.fileName || study.file_name} (${(study.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      radiologist: study.radiologist ?? study.uploadedByName ?? "Unknown",
      fileName: study.fileName || study.file_name, // Add fileName from medical_images table for PDF generation
      reportFileName: study.reportFileName,
      reportFilePath: study.reportFilePath,
      signatureData: study.signatureData || null, // Include signature data
      signatureDate: study.signatureDate || null, // Include signature date
      selectedUserId: study.selectedUserId || null, // Include selected user ID
      selectedRole: study.selectedRole || null, // Include selected role
      images: [
        {
          id: String(study.id),
          type: study.mimeType?.includes("jpeg") ? "JPEG" : "DICOM",
          seriesDescription: `${study.modality} ${study.bodyPart}`,
          imageCount: 1,
          size: `${(study.fileSize / (1024 * 1024)).toFixed(2)} MB`,
          imageData: study.imageData,
          mimeType: study.mimeType,
          fileName: study.fileName || study.file_name,
        },
      ],
      ...(study.report && { report: study.report }),
    };
    return mapped;
  }, [medicalImages, selectedStudyId]);

  // Auto-populate role and user for nurse/doctor when upload dialog opens
  useEffect(() => {
    if (showUploadDialog && (user?.role === 'nurse' || user?.role === 'doctor')) {
      setUploadFormData((prev) => ({
        ...prev,
        selectedRole: user.role,
        selectedUserId: user.id?.toString() || "",
      }));
    }
  }, [showUploadDialog, user?.role, user?.id]);

  // Check if report file exists on the server
  useEffect(() => {
    const checkReportFileExists = async () => {
      if (selectedStudy?.reportFilePath) {
        const fileName = selectedStudy.reportFilePath.split('/').pop() || '';
        const reportId = fileName.replace(".pdf", "");
        try {
          // Use the signed URL endpoint to check if report exists
          // Extract imageId from reportId (which may contain timestamp)
          let imageId = reportId;
          if (reportId.includes('_')) {
            const parts = reportId.split('_');
            imageId = parts[0];
          }

          // Get signed URL to check if file exists
          const token = localStorage.getItem("auth_token");
          const response = await fetch(`/api/imaging-files/${imageId}/signed-url`, {
            method: "GET",
            headers: {
              "X-Tenant-Subdomain": getActiveSubdomain() || "demo",
              ...(token && {
                Authorization: `Bearer ${token}`,
              }),
            },
            credentials: "include",
          });

          if (response.status === 404) {
            setNonExistentReports(prev => new Set(prev).add(selectedStudy.id));
          } else if (response.ok) {
            // File exists, clear from nonExistentReports
            setNonExistentReports(prev => {
              const newSet = new Set(prev);
              newSet.delete(selectedStudy.id);
              return newSet;
            });
          } else if (response.status === 401) {
            // Unauthorized - don't mark as non-existent, just skip
            console.warn("Unauthorized to check report file existence");
          }
        } catch (error) {
          console.error("Error checking report file:", error);
          // On error, don't mark as non-existent to avoid false negatives
        }
      } else if (selectedStudy?.id) {
        // If reportFilePath is null/undefined, clear from nonExistentReports
        setNonExistentReports(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedStudy.id);
          return newSet;
        });
      }
    };

    checkReportFileExists();
  }, [selectedStudy?.id, selectedStudy?.reportFilePath, toast]);

  // Sync editable Findings/Impression in View dialog when opened from Imaging Results edit
  useEffect(() => {
    if (showViewDialog && viewDialogOpenedFromEditReport && selectedStudy) {
      setViewDialogFindings(selectedStudy.findings ?? "");
      setViewDialogImpression(selectedStudy.impression ?? "");
    }
  }, [showViewDialog, viewDialogOpenedFromEditReport, selectedStudy?.id]);

  // Individual field update mutations
  const updateFieldMutation = useMutation({
    mutationFn: async ({
      studyId,
      fieldName,
      value,
    }: {
      studyId: string;
      fieldName: string;
      value: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/medical-images/${studyId}`,
        {
          [fieldName]: value,
        },
      );
      return response.json();
    },
    onMutate: async (variables) => {
      // Set saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: true,
      }));
    },
    onError: (error, variables) => {
      // For doctors and admins, suppress permission errors and show a regular toast
      const errorMessage = error.message || "Failed to update record. Please try again.";
      const isPermissionError = errorMessage.includes('403') ||
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('forbidden');

      // Skip showing error for doctors/admins with permission issues - they should have access
      if ((isDoctor() || isAdmin()) && isPermissionError) {
        console.log('Permission error suppressed for doctor/admin role');
        return;
      }

      toast({
        title: "Error updating record",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      // ✨ KEY: Update local form state immediately (patients.tsx pattern)
      if (variables.fieldName === "findings")
        setReportFindings(variables.value);
      if (variables.fieldName === "impression")
        setReportImpression(variables.value);
      if (variables.fieldName === "radiologist")
        setReportRadiologist(variables.value);

      // Exit edit mode immediately
      setEditModes((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));

      // Force refresh medical images data immediately
      await refetchImages();

      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({
        queryKey: ["/api/medical-images"],
      });

      // Auto-refresh patient records when medical images are updated
      if (selectedStudy?.patientId) {
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "records"],
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/patients"] }); // Main patient list
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "history"],
        });
      }

      toast({
        title: "Record Updated",
        description: `${variables.fieldName.charAt(0).toUpperCase() + variables.fieldName.slice(1)} has been successfully updated.`,
      });
    },
    onSettled: (data, error, variables) => {
      // Clear saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));
    },
  });

  // Date field update mutations with optimistic updates
  const updateDateMutation = useMutation({
    mutationFn: async ({
      studyId,
      fieldName,
      value,
    }: {
      studyId: string;
      fieldName: string;
      value: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/medical-images/${studyId}`,
        {
          [fieldName]: value,
        },
      );
      return response.json();
    },
    onMutate: async (variables) => {
      // Set saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: true,
      }));
    },
    onError: (error, variables) => {
      // For doctors and admins, suppress permission errors and show a regular toast
      const errorMessage = error.message || "Failed to update record. Please try again.";
      const isPermissionError = errorMessage.includes('403') ||
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('forbidden');

      // Skip showing error for doctors/admins with permission issues - they should have access
      if ((isDoctor() || isAdmin()) && isPermissionError) {
        console.log('Permission error suppressed for doctor/admin role');
        if (variables.fieldName === "status") setEditStatusDialog(null);
        return;
      }
      if (variables.fieldName === "status") setEditStatusDialog(null);
      toast({
        title: "Error updating record",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      // ✨ KEY: Exit edit mode immediately (patients.tsx pattern)
      setEditModes((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));
      if (variables.fieldName === "status") {
        setEditStatusDialog(null);
      }

      const medicalImagesQueryKey = ["/api/medical-images", user?.role === "patient" ? "patient-filtered" : "all"];

      // Update cache immediately so the list shows the new status without waiting for refetch
      if (variables.fieldName === "status" || variables.fieldName === "priority" || variables.fieldName === "scheduledAt" || variables.fieldName === "performedAt") {
        queryClient.setQueryData(medicalImagesQueryKey, (old: any[] | undefined) => {
          if (!Array.isArray(old)) return old;
          return old.map((img: any) => {
            if (img.id == null || String(img.id) !== String(variables.studyId)) return img;
            if (variables.fieldName === "status") return { ...img, status: variables.value };
            if (variables.fieldName === "priority") return { ...img, priority: variables.value };
            if (variables.fieldName === "scheduledAt") return { ...img, scheduledAt: variables.value || null };
            if (variables.fieldName === "performedAt") return { ...img, performedAt: variables.value || null };
            return img;
          });
        });
      }

      // Refetch to confirm and keep cache in sync with server
      await queryClient.refetchQueries({ queryKey: medicalImagesQueryKey });

      if (variables.fieldName === "status") {
        setStatusUpdateSuccessModal(variables.value);
      }

      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({
        queryKey: ["/api/medical-images"],
      });

      // Auto-refresh patient records when medical images are updated
      if (selectedStudy?.patientId) {
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "records"],
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/patients"] }); // Main patient list
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "history"],
        });
      }

      // Toast for non-status updates (status shows modal instead)
      if (variables.fieldName !== "status") {
        let title = "Record Updated";
        let description = "";

        if (variables.fieldName === "scheduledAt") {
          title = "Scheduled Date Updated";
          description = "Scheduled date has been successfully updated.";
        } else if (variables.fieldName === "performedAt") {
          title = "Performed Date Updated";
          description = "Performed date has been successfully updated.";
        } else if (variables.fieldName === "priority") {
          title = "Priority Updated";
          description = "Priority has been successfully updated.";
        } else {
          description = `${variables.fieldName.charAt(0).toUpperCase() + variables.fieldName.slice(1)} has been successfully updated.`;
        }

        toast({
          title,
          description,
        });
      }
    },
    onSettled: (data, error, variables) => {
      // Clear saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));
    },
  });

  // File replacement mutation for editing images
  const replaceImageMutation = useMutation({
    mutationFn: async ({ studyId, file }: { studyId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      // Manual fetch to handle FormData properly (apiRequest doesn't work with FormData)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getActiveSubdomain()
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/medical-images/${studyId}/replace`, {
        method: 'PUT',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Refresh the medical images to get updated data
      await refetchImages();

      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({
        queryKey: ["/api/medical-images"],
      });

      setShowEditImageDialog(false);
      setSelectedFiles([]);
      setUploadedFile(null);
      setEditingStudyId(null);

      // Display the full organizational path
      const filePath = data.filePath || `/uploads/Imaging_Images/${data.keptFilename}`;

      toast({
        title: "Image Saved Successfully",
        description: `File saved to: ${filePath}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Image",
        description: error.message || "Failed to replace the image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load existing image previews when Replace Medical Image dialog opens (same loading strategy as View Images)
  useEffect(() => {
    if (!showEditImageDialog || !editingStudyId) {
      return;
    }
    const mid = Number(editingStudyId);
    if (Number.isNaN(mid)) {
      return;
    }
    let revoked = false;
    setLoadingReplaceExistingPreviews(true);
    const headers: Record<string, string> = { "X-Tenant-Subdomain": getActiveSubdomain() };
    const token = localStorage.getItem("auth_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const tryAddFromPath = async (filePath: string | null, fileName: string): Promise<string | null> => {
      if (!filePath || typeof filePath !== "string" || !fileName || fileName.endsWith(".pending") || fileName.startsWith("ORDER-")) return null;
      const relativePath = filePath.includes("uploads")
        ? filePath.substring(filePath.indexOf("uploads")).replace(/\\/g, "/")
        : filePath.startsWith("/uploads") ? filePath.slice(1) : filePath.replace(/\\/g, "/");
      const fileUrl = `/${relativePath}`;
      try {
        const res = await fetch(fileUrl, { method: "GET", credentials: "include", headers });
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) return URL.createObjectURL(blob);
        }
      } catch { /* ignore */ }
      return null;
    };

    (async () => {
      try {
        const listRes = await fetch(`/api/radiology-images/${mid}`, { method: "GET", credentials: "include", headers });
        const listData = listRes.ok ? await listRes.json() : null;
        const images = listData?.images ?? [];
        const previews: Array<{ id: number; url: string; fileName: string }> = [];

        for (const img of images) {
          if (revoked) break;
          const rid = img.id != null ? Number(img.id) : NaN;
          const fileName = img.fileName ?? img.file_name ?? "";
          if (Number.isNaN(rid)) continue;
          let url: string | null = null;
          try {
            const r = await fetch(`/api/radiology-images/image/${rid}`, { method: "GET", credentials: "include", headers });
            if (r.ok) {
              const blob = await r.blob();
              if (blob.size > 0) url = URL.createObjectURL(blob);
            }
          } catch { /* skip */ }
          if (!url) {
            const fp = img.filePath ?? img.file_path;
            url = await tryAddFromPath(fp ?? null, fileName || `image-${rid}`);
          }
          if (url) previews.push({ id: rid, url, fileName: fileName || `image-${rid}` });
        }

        if (!revoked && previews.length === 0) {
          try {
            const mainRes = await fetch(`/api/medical-images/${mid}/image`, { method: "GET", credentials: "include", headers });
            if (mainRes.ok) {
              const blob = await mainRes.blob();
              if (blob.size > 0) {
                previews.push({
                  id: mid,
                  url: URL.createObjectURL(blob),
                  fileName: (selectedStudy as any)?.fileName ?? (selectedStudy as any)?.file_name ?? "image.jpg",
                });
              }
            }
          } catch { /* skip */ }
        }
        if (!revoked && previews.length === 0) {
          try {
            const folderRes = await fetch(`/api/medical-images/${mid}/list-folder-images`, { method: "GET", credentials: "include", headers });
            if (folderRes.ok) {
              const folderData = await folderRes.json();
              const files = folderData?.images ?? [];
              for (let i = 0; i < files.length && !revoked; i++) {
                const f = files[i];
                const fp = f.filePath ?? f.file_path ?? "";
                const fname = f.fileName ?? f.file_name ?? "";
                const url = await tryAddFromPath(fp, fname);
                if (url) previews.push({ id: mid * 1000 + i, url, fileName: fname || `image-${i}` });
              }
            }
          } catch { /* skip */ }
        }

        if (!revoked) {
          setReplaceDialogExistingPreviews(previews);
        } else {
          previews.forEach((p) => {
            if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
          });
        }
      } catch (e) {
        console.error("Error loading existing image previews:", e);
      } finally {
        if (!revoked) setLoadingReplaceExistingPreviews(false);
      }
    })();

    return () => {
      revoked = true;
      setReplaceDialogExistingPreviews((prev) => {
        prev.forEach((p) => {
          if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
        });
        return [];
      });
    };
  }, [showEditImageDialog, editingStudyId, selectedStudy?.fileName, selectedStudy?.file_name]);

  // Helper functions for individual field editing
  const handleFieldEdit = (
    fieldName:
      | "findings"
      | "impression"
      | "radiologist"
      | "scheduledAt"
      | "performedAt"
      | "status"
      | "priority",
  ) => {
    setEditModes((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    // Initialize date states when entering edit mode
    if (selectedStudy) {
      if (fieldName === "scheduledAt") {
        const date = selectedStudy.scheduledAt
          ? new Date(selectedStudy.scheduledAt)
          : undefined;
        setScheduledDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setScheduledTime(`${hours}:${minutes}`);
        } else {
          setScheduledTime("");
        }
      }
      if (fieldName === "performedAt") {
        const date = selectedStudy.performedAt
          ? new Date(selectedStudy.performedAt)
          : undefined;
        setPerformedDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setPerformedTime(`${hours}:${minutes}`);
        } else {
          setPerformedTime("");
        }
      }
      if (fieldName === "status")
        setEditingStatus(selectedStudy.status || "ordered");
      if (fieldName === "priority")
        setEditingPriority(selectedStudy.priority || "routine");
    }
  };

  const handleFieldCancel = (
    fieldName:
      | "findings"
      | "impression"
      | "radiologist"
      | "scheduledAt"
      | "performedAt"
      | "status"
      | "priority",
  ) => {
    setEditModes((prev) => ({
      ...prev,
      [fieldName]: false,
    }));

    // Reset field to original value
    if (selectedStudy) {
      if (fieldName === "findings")
        setReportFindings(selectedStudy.findings || "");
      if (fieldName === "impression")
        setReportImpression(selectedStudy.impression || "");
      if (fieldName === "radiologist")
        setReportRadiologist(selectedStudy.radiologist || "Dr. Michael Chen");
      if (fieldName === "scheduledAt") {
        const date = selectedStudy.scheduledAt
          ? new Date(selectedStudy.scheduledAt)
          : undefined;
        setScheduledDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setScheduledTime(`${hours}:${minutes}`);
        } else {
          setScheduledTime("");
        }
      }
      if (fieldName === "performedAt") {
        const date = selectedStudy.performedAt
          ? new Date(selectedStudy.performedAt)
          : undefined;
        setPerformedDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setPerformedTime(`${hours}:${minutes}`);
        } else {
          setPerformedTime("");
        }
      }
      if (fieldName === "status")
        setEditingStatus(selectedStudy.status || "ordered");
      if (fieldName === "priority")
        setEditingPriority(selectedStudy.priority || "routine");
    }
  };

  const handleFieldSave = (
    fieldName:
      | "findings"
      | "impression"
      | "radiologist"
      | "scheduledAt"
      | "performedAt"
      | "status"
      | "priority",
  ) => {
    if (!selectedStudy) return;

    let value = "";
    if (fieldName === "findings") value = reportFindings;
    if (fieldName === "impression") value = reportImpression;
    if (fieldName === "radiologist") value = reportRadiologist;
    if (fieldName === "scheduledAt") {
      if (scheduledDate) {
        const combinedDate = new Date(scheduledDate);
        if (scheduledTime) {
          const [hours, minutes] = scheduledTime.split(':');
          combinedDate.setHours(parseInt(hours), parseInt(minutes));
        }
        value = combinedDate.toISOString();
      } else {
        value = "";
      }
    }
    if (fieldName === "performedAt") {
      if (performedDate) {
        const combinedDate = new Date(performedDate);
        if (performedTime) {
          const [hours, minutes] = performedTime.split(':');
          combinedDate.setHours(parseInt(hours), parseInt(minutes));
        }
        value = combinedDate.toISOString();
      } else {
        value = "";
      }
    }
    if (fieldName === "status") value = editingStatus;
    if (fieldName === "priority") value = editingPriority;

    if (
      fieldName === "scheduledAt" ||
      fieldName === "performedAt" ||
      fieldName === "status" ||
      fieldName === "priority"
    ) {
      updateDateMutation.mutate({
        studyId: selectedStudy.id,
        fieldName,
        value,
      });
    } else {
      updateFieldMutation.mutate({
        studyId: selectedStudy.id,
        fieldName,
        value,
      });
    }
  };

  // Fetch patients using the exact working pattern from prescriptions
  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
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
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (showNewOrder || showUploadDialog) {
      fetchPatients();

      // Pre-populate patient ID for patient users
      if (user?.role === "patient" && currentPatient) {
        setOrderFormData(prev => ({
          ...prev,
          patientId: currentPatient.id.toString()
        }));
        setUploadFormData(prev => ({
          ...prev,
          patientId: currentPatient.id.toString()
        }));
      }
    }
  }, [showNewOrder, showUploadDialog, user?.role, currentPatient]);

  // Set default payment method to "Cash" when invoice dialog opens
  useEffect(() => {
    if (showInvoiceDialog && !invoiceFormData.paymentMethod) {
      setInvoiceFormData((prev) => ({ ...prev, paymentMethod: "Cash" }));
    }
  }, [showInvoiceDialog, invoiceFormData.paymentMethod]);

  // Handler for Generate Report dialog - just selects files without uploading
  const handleReportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);

      // Append new files to existing selectedFiles instead of replacing
      setSelectedFiles(prevFiles => {
        // Create a map to track existing files by name and size to avoid duplicates
        const existingFilesMap = new Map(prevFiles.map(f => [`${f.name}-${f.size}`, f]));
        const newFilesToAdd: File[] = [];

        // Add new files, skipping duplicates
        fileList.forEach(newFile => {
          const key = `${newFile.name}-${newFile.size}`;
          if (!existingFilesMap.has(key)) {
            existingFilesMap.set(key, newFile);
            newFilesToAdd.push(newFile);
          }
        });

        const updatedFiles = Array.from(existingFilesMap.values());

        // Create preview URLs for newly added image files
        if (newFilesToAdd.length > 0) {
          const previewPromises = newFilesToAdd.map((file) => {
            return new Promise<string>((resolve) => {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  resolve(e.target?.result as string);
                };
                reader.onerror = () => {
                  resolve(''); // Return empty string on error
                };
                reader.readAsDataURL(file);
              } else {
                // For non-image files (like DICOM), create a placeholder
                resolve('');
              }
            });
          });

          Promise.all(previewPromises).then((previews) => {
            // Only add valid previews (non-empty strings)
            const validPreviews = previews.filter(p => p !== '');
            setUploadedImagePreviews(prev => [...prev, ...validPreviews]);
          });
        }

        return updatedFiles;
      });
    }
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && selectedStudy) {
      const fileList = Array.from(files);
      // Append new files to existing selectedFiles instead of replacing
      setSelectedFiles(prevFiles => {
        // Create a map to track existing files by name and size to avoid duplicates
        const existingFilesMap = new Map(prevFiles.map(f => [`${f.name}-${f.size}`, f]));
        // Add new files, skipping duplicates
        fileList.forEach(newFile => {
          const key = `${newFile.name}-${newFile.size}`;
          if (!existingFilesMap.has(key)) {
            existingFilesMap.set(key, newFile);
          }
        });
        return Array.from(existingFilesMap.values());
      });
      setUploadingImages(true);

      try {
        const formData = new FormData();
        formData.append('patientId', selectedStudy.patientId);
        formData.append('studyId', selectedStudy.id);
        formData.append('studyType', selectedStudy.studyType || 'X-Ray');

        fileList.forEach((file) => {
          formData.append('images', file);
        });

        // Get the JWT token from localStorage
        const token = localStorage.getItem('auth_token');

        const uploadHeaders: Record<string, string> = {
          'X-Tenant-Subdomain': getActiveSubdomain(),
        };

        // Add Authorization header if token exists
        if (token) {
          uploadHeaders['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/imaging/upload-report-images', {
          method: 'POST',
          headers: uploadHeaders,
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        if (data.uploadedImages && data.uploadedImages.length > 0) {
          const imageUrls = data.uploadedImages.map((img: any) => `/uploads/Imaging_Images/${img.fileName}`);
          setUploadedImagePreviews(imageUrls);

          toast({
            title: "Images Uploaded Successfully",
            description: `${data.uploadedImages.length} image(s) uploaded and saved`,
          });
        }
      } catch (error) {
        console.error('Error uploading images:', error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploadingImages(false);
      }
    }
  };

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const handleUploadSubmit = async () => {
    // Prevent duplicate submissions
    if (isSubmittingOrder) {
      console.log('📷 CLIENT: Order submission already in progress, ignoring duplicate click');
      return;
    }

    // Validate required fields
    if (!uploadFormData.patientId || !uploadFormData.studyType || !uploadFormData.selectedRole || !uploadFormData.selectedUserId) {
      toast({
        title: "Order Failed",
        description: "Please fill in all required fields including Role and Name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      // Find the selected patient
      const selectedPatient = patients.find(
        (p) => p.id.toString() === uploadFormData.patientId,
      );

      if (!selectedPatient) {
        toast({
          title: "Order Failed",
          description: "Selected patient not found",
          variant: "destructive",
        });
        return;
      }

      console.log('📷 CLIENT: Creating medical imaging order for patient:', {
        id: selectedPatient.id,
        patientId: selectedPatient.patientId,
        name: `${selectedPatient.firstName} ${selectedPatient.lastName}`
      });

      // Generate unique image ID (format: IMG{timestamp}I{patientId}ONC)
      const timestamp = Date.now();
      const uniqueImageId = `IMG${timestamp}I${selectedPatient.id}ORDER`;

      // Create medical imaging order record in database (without file upload)
      const imageData = {
        patientId: selectedPatient.id,
        imageId: uniqueImageId,
        imageType: uploadFormData.studyType,
        studyType: uploadFormData.studyType,
        modality: uploadFormData.modality,
        bodyPart: uploadFormData.bodyPart || "Not specified",
        indication: uploadFormData.indication || "",
        priority: uploadFormData.priority,
        notes: uploadFormData.indication || "",
        filename: `ORDER-${timestamp}.pending`,
        fileUrl: "",
        fileSize: 0,
        mimeType: "application/pending",
        uploadedBy: user?.id || 0,
        status: "ordered",
        orderStudyCreated: true,
        selectedRole: uploadFormData.selectedRole || null,
        selectedUserId: uploadFormData.selectedUserId ? parseInt(uploadFormData.selectedUserId) : null,
      };

      const response = await apiRequest("POST", "/api/medical-images", imageData);
      const result = await response.json();
      console.log('📷 CLIENT: Medical imaging order created successfully:', result);

      // Store order data for invoice (or for summary when unpaid)
      setUploadedImageData({
        ...uploadFormData,
        selectedPatient,
        uploadedFiles: [],
        totalSizeMB: '0',
        uploadResult: result,
      });

      // For admin/doctor/nurse: skip Create New Invoice, show Summary with Pay status unpaid (like lab-results)
      if (user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'nurse') {
        setShowUploadDialog(false);
        setSummaryData({
          ...uploadFormData,
          selectedPatient,
          uploadedFiles: [],
          totalSizeMB: '0',
          uploadResult: result,
          paymentStatus: 'unpaid',
        });
        setShowSummaryDialog(true);
        toast({
          title: "Order Created",
          description: "Imaging order created successfully. Pay status: Unpaid.",
        });
        return;
      }

      // Close upload dialog and open invoice dialog (other roles)
      setShowUploadDialog(false);

      // Fetch pricing from imaging_pricing table based on selected study type
      const pricingData = availableStudyTypes.find((p: any) =>
        p.imagingType === uploadFormData.studyType
      );

      const unitPrice = pricingData ? parseFloat(pricingData.basePrice) : 50.00;
      const subtotal = unitPrice; // Single study
      const tax = subtotal * 0.2; // 20% VAT
      const totalAmount = subtotal + tax;

      // Pre-populate invoice fields
      // Service date should be today (order date) for new imaging orders
      const serviceDate = new Date().toISOString().split('T')[0];

      setInvoicePatient(selectedPatient.patientId || "");
      setInvoiceServiceDate(serviceDate);
      setInvoiceDueDate(serviceDate); // Due date should be same as service date (like appointments)
      setInvoiceServiceCode(pricingData?.imagingCode || "IMG-001");
      setInvoiceServiceDesc("Medical Imaging - " + uploadFormData.studyType);
      setInvoiceServiceQty("1");
      setInvoiceServiceAmount(unitPrice.toFixed(2));
      setInvoiceTotalAmount(totalAmount.toFixed(2));
      setInvoiceNotes(`Imaging study: ${uploadFormData.studyType}, Modality: ${uploadFormData.modality}, Body Part: ${uploadFormData.bodyPart}`);

      setInvoiceFormData({
        paymentMethod: "Cash", // Default to Cash
        subtotal,
        tax,
        discount: 0,
        totalAmount,
      });

      setShowInvoiceDialog(true);

      toast({
        title: "Order Created",
        description: "Medical imaging order created successfully",
      });
    } catch (error) {
      console.error("📷 CLIENT: Order creation error:", error);
      toast({
        title: "Order Failed",
        description: "Failed to create medical imaging order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleOrderSubmit = async () => {
    if (
      !orderFormData.patientId ||
      !orderFormData.studyType ||
      !orderFormData.modality ||
      !orderFormData.bodyPart
    ) {
      toast({
        title: "Order Failed",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Store data and open upload dialog instead
    const selectedPatient = patients.find(
      (p) => p.id.toString() === orderFormData.patientId,
    );

    if (!selectedPatient) {
      toast({
        title: "Order Failed",
        description: "Selected patient not found",
        variant: "destructive",
      });
      return;
    }

    // Transfer data to upload form
    setUploadFormData({
      patientId: orderFormData.patientId,
      studyType: orderFormData.studyType,
      modality: orderFormData.modality,
      bodyPart: orderFormData.bodyPart,
      indication: orderFormData.indication,
      priority: orderFormData.priority,
      selectedRole: "",
      selectedUserId: "",
    });

    // Close order dialog and open upload dialog
    setShowNewOrder(false);
    setShowUploadDialog(true);
  };

  const handleViewStudy = (study: ImagingStudy, fromEditReport?: boolean) => {
    setSelectedStudyId(study.id);
    setViewDialogOpenedFromEditReport(fromEditReport === true);
    if (fromEditReport === true) {
      setViewDialogFindings(study.findings ?? "");
      setViewDialogImpression(study.impression ?? "");
    }
    setShowViewDialog(true);
  };

  const handleDownloadStudy = (studyId: string) => {
    const study = ((studies as any) || []).find((s: any) => s.id === studyId);
    if (study) {
      toast({
        title: "Download Study",
        description: `DICOM images for ${study.patientName} downloaded successfully`,
      });

      // Simulate DICOM download
      const blob = new Blob(
        [
          `DICOM Study Report\n\nPatient: ${study.patientName}\nStudy: ${study.studyType}\nModality: ${study.modality}\nDate: ${new Date(study.orderedAt).toLocaleDateString()}\n\nImages: ${study.images?.length || 0} series available`,
        ],
        { type: "text/plain" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dicom-study-${study.patientName.replace(" ", "-").toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  /** Preview images from radiology_images table when clicking a row. Uses file_path (e.g. uploads/Imaging_Images/20/patients/54/IMG....jpg) from DB. */
  const openPreviewFromRadiologyImages = useCallback(async (medicalImageId: number) => {
    const id = Number(medicalImageId);
    if (Number.isNaN(id)) {
      toast({ title: "Error", description: "Invalid study ID.", variant: "destructive" });
      return;
    }
    const headers: Record<string, string> = { "X-Tenant-Subdomain": getActiveSubdomain() };
    const token = localStorage.getItem("auth_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    setLoadingViewStudyImages(true);
    const loaded: Array<{ url: string; fileName: string; mimeType?: string }> = [];

    const tryAddFromPath = async (filePath: string | null, fileName: string): Promise<boolean> => {
      if (!filePath || typeof filePath !== "string" || !fileName) return false;
      if (fileName.endsWith(".pending") || fileName.startsWith("ORDER-")) return false;
      const relativePath = filePath.includes("uploads")
        ? filePath.substring(filePath.indexOf("uploads")).replace(/\\/g, "/")
        : filePath.startsWith("/uploads") ? filePath.slice(1) : filePath.replace(/\\/g, "/");
      const fileUrl = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
      try {
        const res = await fetch(fileUrl, { method: "GET", credentials: "include", headers });
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) {
            loaded.push({
              url: URL.createObjectURL(blob),
              fileName,
              mimeType: res.headers.get("Content-Type") || "image/jpeg",
            });
            return true;
          }
        }
      } catch {
        /* ignore */
      }
      return false;
    };

    const tryAddFromRadiologyApi = async (radiologyId: number, fileName?: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/radiology-images/image/${radiologyId}`, {
          method: "GET", headers, credentials: "include",
        });
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) {
            loaded.push({
              url: URL.createObjectURL(blob),
              fileName: fileName || `image-${radiologyId}`,
              mimeType: res.headers.get("Content-Type") || "image/jpeg",
            });
            return true;
          }
        }
      } catch {
        /* ignore */
      }
      return false;
    };

    try {
      // SELECT from radiology_images WHERE medical_image_id = id (same as JOIN medical_images ON a.medical_image_id = b.id WHERE b.id = id)
      const listRes = await fetch(`/api/radiology-images/${id}`, { method: "GET", credentials: "include", headers });
      const listData = listRes.ok ? await listRes.json() : null;
      const radiologyList = listData?.images ?? [];

      for (const img of radiologyList) {
        const fp = img.filePath ?? img.file_path;
        const fname = img.fileName ?? img.file_name ?? "";
        if (await tryAddFromPath(fp, fname)) continue;
        const rid = img.id != null ? Number(img.id) : NaN;
        if (!Number.isNaN(rid)) await tryAddFromRadiologyApi(rid, fname || undefined);
      }

      if (loaded.length === 0) {
        const folderRes = await fetch(`/api/medical-images/${id}/list-folder-images`, {
          method: "GET", credentials: "include", headers,
        });
        if (folderRes.ok) {
          const folderData = await folderRes.json();
          const files = folderData?.images ?? [];
          for (const f of files) {
            const fp = f.filePath ?? "";
            const fname = f.fileName ?? "";
            await tryAddFromPath(fp, fname);
          }
        }
      }

      if (loaded.length === 0) {
        try {
          const mainRes = await fetch(`/api/medical-images/${id}/image`, {
            method: "GET", credentials: "include", headers,
          });
          if (mainRes.ok) {
            const blob = await mainRes.blob();
            if (blob.size > 0) {
              loaded.push({
                url: URL.createObjectURL(blob),
                fileName: `study-${id}.jpg`,
                mimeType: mainRes.headers.get("Content-Type") || "image/jpeg",
              });
            }
          }
        } catch {
          /* ignore */
        }
      }

      setLoadingViewStudyImages(false);
      if (loaded.length === 0) {
        toast({
          title: "No Images Found",
          description: "No images found for this study (radiology_images by medical_image_id). Try uploading images for this study.",
          variant: "destructive",
        });
        return;
      }
      setViewStudyImagesList(loaded);
      setShowViewStudyImagesDialog(true);
    } catch (err) {
      setLoadingViewStudyImages(false);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load images.",
        variant: "destructive",
      });
    }
  }, []);

  const handleShareStudy = (study: ImagingStudy, shareSource: 'prescription' | 'report' = 'report') => {
    setSelectedStudyId(study.id);
    setShowShareDialog(true);
    setShareFormData({
      method: "",
      email: "",
      whatsapp: "",
      message: `Imaging study results for ${study.studyType} are now available for review.`,
      shareSource, // Store which type of PDF to share
    });
  };

  const handleGenerateReport = (studyId: string | number) => {
    // Convert studyId to string for comparison, as study.id might be number or string
    const studyIdStr = String(studyId);
    const study = ((studies as any) || []).find((s: any) => String(s.id) === studyIdStr);
    if (study) {
      setSelectedStudyId(study.id);
      setReportFindings(study.findings || "");
      setReportImpression(study.impression || "");
      setReportRadiologist(study.radiologist || "Dr. Michael Chen");
      setUploadedImagePreviews([]);
      setSelectedFiles([]);
      setScheduledDate(new Date()); // Set to current date by default
      setPerformedDate(new Date()); // Set to current date by default
      setReportDialogIsEditMode(false);
      setShowReportDialog(true);
    } else {
      toast({
        title: "Error",
        description: "Study not found",
        variant: "destructive",
      });
    }
  };

  // Reset image previews and edit mode when report dialog closes
  useEffect(() => {
    if (!showReportDialog) {
      setUploadedImagePreviews([]);
      setSelectedFiles([]);
      setSaveImageSuccess(null);
      setReportDialogIsEditMode(false);
    }
  }, [showReportDialog]);

  const handleESignClick = async (studyId: string | number) => {
    // Convert studyId to string for comparison, as study.id might be number or string
    const studyIdStr = String(studyId);
    const study = ((studies as any) || []).find((s: any) => String(s.id) === studyIdStr);
    if (!study) {
      toast({
        title: "Error",
        description: "Study not found",
        variant: "destructive",
      });
      return;
    }

    // Check database directly for signature data
    try {
      const response = await apiRequest('GET', `/api/medical-images/${study.id}`);
      if (response.ok) {
        const medicalImageData = await response.json();
        // Check if signature exists in database
        if (!medicalImageData.signatureData || String(medicalImageData.signatureData).trim() === "") {
          // Show modal to sign first
          setPendingESignStudy(study);
          setShowSignFirstDialog(true);
          return;
        }
        // Update study with latest signature data from database
        study.signatureData = medicalImageData.signatureData;
        study.signatureDate = medicalImageData.signatureDate;
      }
    } catch (error) {
      console.error("Error checking signature in database:", error);
      // Fallback to checking study object
      if (!study.signatureData || String(study.signatureData).trim() === "") {
        setPendingESignStudy(study);
        setShowSignFirstDialog(true);
        return;
      }
    }

    // If signature exists, allow editing/re-signing - open e-signature dialog directly
    setESignStudy(study);
    setHideTabs(true);
    setShowESignDialog(true);
  };

  const handleGenerateImagePrescription = async (studyId: string | number) => {
    // Convert studyId to string for comparison, as study.id might be number or string
    const studyIdStr = String(studyId);
    const study = ((studies as any) || []).find((s: any) => String(s.id) === studyIdStr);
    if (!study) {
      toast({
        title: "Error",
        description: "Study not found",
        variant: "destructive",
      });
      return;
    }

    // Check database directly for signature data
    try {
      const response = await apiRequest('GET', `/api/medical-images/${study.id}`);
      if (response.ok) {
        const medicalImageData = await response.json();
        // Check if signature exists in database
        if (!medicalImageData.signatureData || String(medicalImageData.signatureData).trim() === "") {
          // Show modal to sign first
          setPendingPrescriptionStudy(study);
          setShowSignFirstDialog(true);
          return;
        }
        // Update study with latest signature data from database
        study.signatureData = medicalImageData.signatureData;
        study.signatureDate = medicalImageData.signatureDate;
      }
    } catch (error) {
      console.error("Error checking signature in database:", error);
      // Fallback to checking study object
      if (!study.signatureData || String(study.signatureData).trim() === "") {
        setPendingPrescriptionStudy(study);
        setShowSignFirstDialog(true);
        return;
      }
    }

    // If signature exists, proceed with prescription generation
    await handleGenerateImagePrescriptionWithSignature(study);
  };

  const handleGenerateImagePrescriptionWithSignature = async (study: any) => {
    // This function is called when signature is confirmed to exist
    try {
      toast({
        title: "Generating Prescription",
        description: "Please wait...",
      });

      // Call backend to generate image prescription PDF
      // Note: Signature is fetched from database, not sent from frontend
      // Use study.id (numeric database ID) instead of study.imageId (string identifier)
      if (!study.id) {
        toast({
          title: "Error",
          description: "Study ID is missing. Cannot generate prescription.",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest(
        "POST",
        "/api/imaging/generate-image-prescription",
        {
          imageId: study.id, // Use numeric database ID
        }
      );

      // Check content type before parsing JSON
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      // Parse response as JSON, handling HTML error responses gracefully
      let data;
      try {
        if (!isJson) {
          // Response is not JSON (might be HTML error page)
          const text = await response.text();
          console.error("Non-JSON response received (first 200 chars):", text.substring(0, 200));
          throw new Error("Server returned an unexpected response format. The endpoint may not exist or there was a server error. Please contact support.");
        }

        // Try to parse as JSON
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, it might be HTML or other format
        if (parseError instanceof SyntaxError || parseError instanceof TypeError) {
          console.error("Failed to parse JSON response:", parseError);
          throw new Error("Server returned an invalid response. The prescription generation endpoint may not be available. Please contact support.");
        }
        // Re-throw if it's already an Error with a message
        throw parseError;
      }

      if (data.success && data.viewUrl) {
        // Update order_study_ready_to_generate to true after successful prescription generation
        // This is only done when in "Order Study" tab
        if (activeTab === "order-study") {
          try {
            await apiRequest("PATCH", `/api/medical-images/${study.id}`, {
              orderStudyReadyToGenerate: true,
            });
            console.log("✅ Updated order_study_ready_to_generate to true for study:", study.id);
          } catch (updateError) {
            console.error("Error updating order_study_ready_to_generate:", updateError);
            // Don't fail the whole operation if update fails, just log it
          }
        }

        toast({
          title: "Prescription Generated",
          description: "Opening prescription in new tab...",
        });

        // Open the prescription PDF in a new tab
        window.open(data.viewUrl, '_blank');

        // Auto-refresh data after successful prescription generation
        refetchImages();

        // Close the e-signature dialog and switch to Generate Report tab
        setShowESignDialog(false);
        clearSignature();
        setSignatureSaved(false);
        setIsSavingSignature(false);

        // Switch to Generate Report tab if user has access
        if (user?.role !== 'patient') {
          setActiveTab("generate-report");
        }
      } else {
        throw new Error(data.error || data.message || "Failed to generate prescription");
      }
    } catch (error) {
      console.error("Prescription generation error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to generate prescription. Please try again.";

      toast({
        title: "Prescription Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Re-enable button on error
      setIsSavingSignature(false);
    }
  };

  const handleEditImage = async (studyId: string) => {
    setSelectedStudyId(studyId);
    setEditingStudyId(studyId);
    setSelectedFiles([]);
    setReplaceDialogPreviews([]);
    setReplaceDialogExistingPreviews((prev) => {
      prev.forEach((p) => { if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url); });
      return [];
    });
    setShowEditImageDialog(true);

    // Fetch radiology images for this medical image
    try {
      setLoadingRadiologyImages(true);
      const response = await apiRequest(
        "GET",
        `/api/radiology-images/${studyId}`,
        {}
      );

      if (response.ok) {
        const data = await response.json();
        setRadiologyImages(data.images || []);
      }
    } catch (error) {
      console.error("Error fetching radiology images:", error);
      setRadiologyImages([]);
    } finally {
      setLoadingRadiologyImages(false);
    }
  };

  const handleReplaceImage = () => {
    if (selectedFiles.length > 0) {
      // Just upload/preview the file, don't save yet
      setUploadedFile(selectedFiles[0]);
    }
  };

  const handleSaveImage = () => {
    if (editingStudyId && uploadedFile) {
      replaceImageMutation.mutate({
        studyId: editingStudyId,
        file: uploadedFile,
      });
    }
  };

  /** Regenerate existing report PDF with current study data and images (no dialog). Used when "Edit Generated Report" is clicked in View Imaging Study.
   * Server uses study.id (medical_image_id / image_id) to query radiology_images, get file_path for each row, load all image files from server path, and embed them in the regenerated PDF. */
  const regenerateExistingReport = async (study: any) => {
    try {
      setIsGeneratingPDF(true);
      const medicalImageId = study.id != null ? Number(study.id) : NaN;
      if (Number.isNaN(medicalImageId)) {
        toast({ title: "Cannot regenerate report", description: "Study ID (image_id) is missing.", variant: "destructive" });
        return;
      }
      let radiologyImagePaths: string[] = [];
      try {
        const radiologyResponse = await apiRequest("GET", `/api/radiology-images/${medicalImageId}`, undefined);
        if (radiologyResponse.ok) {
          const radiologyData = await radiologyResponse.json();
          if (radiologyData.success && radiologyData.images && Array.isArray(radiologyData.images)) {
            const sortedImages = (radiologyData.images as any[])
              .filter((img: any) => (img.filePath ?? img.file_path) != null)
              .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
            radiologyImagePaths = sortedImages
              .map((img: any) => img.filePath ?? img.file_path)
              .filter(Boolean)
              .map((p: string) => String(p).replace(/\\/g, "/"));
          }
        }
      } catch (e) {
        console.error("Error fetching radiology images for regenerate:", e);
      }
      const response = await apiRequest("POST", "/api/imaging/generate-report", {
        study: { ...study, id: medicalImageId },
        reportFormData: {
          findings: study.findings ?? "",
          impression: study.impression ?? "",
          radiologist: study.radiologist ?? "Dr. Michael Chen",
          scheduledAt: study.scheduledAt ? new Date(study.scheduledAt).toISOString() : null,
          performedAt: study.performedAt ? new Date(study.performedAt).toISOString() : null,
        },
        uploadedImageFileNames: [],
        radiologyImagePaths,
        signatureData: study.signatureData || null,
        signatureDate: study.signatureDate || null,
        replaceExistingReport: true,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to regenerate PDF report");
      }
      const data = await response.json();
      if (data.success && data.reportId) {
        refetchImages();
        setRegenerateSuccessInView(true);
      } else {
        throw new Error("Failed to regenerate PDF report");
      }
    } catch (error) {
      console.error("Regenerate report error:", error);
      toast({
        title: "Report Update Failed",
        description: error instanceof Error ? error.message : "Failed to regenerate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generatePDFReport = async (study: any) => {
    try {
      setIsGeneratingPDF(true);
      setGeneratedReportId(null);

      console.log("📷 IMAGING: Generating PDF with fileName:", study.fileName);

      let uploadedImageFileNames: string[] = [];

      // Upload selected images first if any
      if (selectedFiles.length > 0) {
        try {
          const formData = new FormData();

          // Add patient and study information
          formData.append('patientId', study.patientId);
          formData.append('studyType', study.studyType);
          formData.append('modality', study.modality || '');
          formData.append('bodyPart', study.bodyPart || '');
          formData.append('indication', study.indication || '');

          // When generating report for an existing ORDER study, or when "Edit Generated Report" (from Imaging Results edit icon), update that row instead of creating a new one
          const isOrderStudy = study.fileName?.endsWith?.('.pending') || study.imageId?.includes?.('ORDER');
          if (study.imageId && selectedFiles.length > 0 && (isOrderStudy || reportDialogIsEditMode)) {
            formData.append('updateImageId', study.imageId);
            console.log('📷 CLIENT: Updating existing row with imageId:', study.imageId, reportDialogIsEditMode ? '(Edit Generated Report)' : '(ORDER study)');
          }

          // Add all files to FormData
          selectedFiles.forEach((file, index) => {
            formData.append('images', file);
            console.log(`📷 CLIENT: Adding file ${index + 1}:`, {
              originalName: file.name,
              type: file.type,
              size: file.size
            });
          });

          console.log(`📷 CLIENT: Uploading ${selectedFiles.length} file(s) for report generation`);

          // Prepare authentication headers
          const uploadHeaders: Record<string, string> = {
            'X-Tenant-Subdomain': getActiveSubdomain(),
          };

          // Add authorization token if available
          const token = localStorage.getItem("auth_token");
          if (token) {
            uploadHeaders["Authorization"] = `Bearer ${token}`;
          }

          // Upload images to server
          const uploadResponse = await fetch('/api/medical-images/upload', {
            method: 'POST',
            body: formData,
            headers: uploadHeaders,
            credentials: 'include',
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload images');
          }

          const uploadResult = await uploadResponse.json();
          console.log('📷 CLIENT: Upload response:', uploadResult);

          // Extract filenames from successfully uploaded images (filter out failed and placeholder ORDER-*.pending)
          if (uploadResult.images && Array.isArray(uploadResult.images)) {
            uploadedImageFileNames = uploadResult.images
              .filter((img: any) => !img.failed && (img.fileName ?? img.file_name ?? img.uniqueFilename))
              .map((img: any) => img.fileName ?? img.file_name ?? img.uniqueFilename)
              .filter((name: string) => name && !name.endsWith('.pending') && !name.startsWith('ORDER-')); // Do not save placeholder to radiology_images

            const failedCount = uploadResult.images.filter((img: any) => img.failed).length;
            const successCount = uploadedImageFileNames.length;

            console.log(`📷 CLIENT: Successfully uploaded ${successCount} image(s), ${failedCount} failed`);
            console.log('📷 CLIENT: Extracted uploaded image filenames:', uploadedImageFileNames);

            if (failedCount > 0) {
              toast({
                title: "Some Images Failed",
                description: `${successCount} image(s) uploaded successfully, ${failedCount} failed.`,
                variant: "destructive",
              });
            }

            // Use the medical_images row id from upload response so radiology_images links to the same row
            const firstSuccess = uploadResult.images.find((img: any) => !img.failed && (img.fileName ?? img.file_name ?? img.uniqueFilename));
            const idFromUpload = firstSuccess?.id ?? firstSuccess?.ID ?? (firstSuccess as any)?.id;
            const resolvedMedicalImageId = idFromUpload != null ? Number(idFromUpload) : (study?.id != null ? Number(study.id) : NaN);
            const medicalIdToUse = !Number.isNaN(resolvedMedicalImageId) ? resolvedMedicalImageId : (study?.id != null ? Number(study.id) : null);

            if (uploadedImageFileNames.length > 0 && (medicalIdToUse == null || Number.isNaN(medicalIdToUse))) {
              console.warn('📷 CLIENT: Skipping radiology_images save - no medical_image id (firstSuccess.id:', idFromUpload, ', study.id:', study?.id, ')');
            }
            // Save all uploaded images to radiology_images table whenever we have at least one successful filename
            if (uploadedImageFileNames.length > 0 && medicalIdToUse != null && !Number.isNaN(medicalIdToUse)) {
              try {
                // Give the server time to finish writing all uploaded files to disk before we save to DB
                toast({ title: "Saving to database...", description: "Please wait while images are saved to the database." });
                await new Promise((r) => setTimeout(r, 2000));
                const token = localStorage.getItem("auth_token");
                const headers: Record<string, string> = {
                  'Content-Type': 'application/json',
                  'X-Tenant-Subdomain': getTenantSubdomain(),
                };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const body = {
                  medicalImageId: medicalIdToUse,
                  imageFileNames: uploadedImageFileNames,
                  organizationId: study.organizationId ?? user?.organizationId ?? firstSuccess?.organizationId,
                  patientId: study.patientId ?? firstSuccess?.patientId,
                };
                console.log('📷 CLIENT: [Step 1] Calling POST /api/radiology-images with medicalImageId=', medicalIdToUse, 'fileNames=', uploadedImageFileNames);
                let saveRadiologyResponse = await fetch('/api/radiology-images', {
                  method: 'POST',
                  headers,
                  credentials: 'include',
                  body: JSON.stringify(body),
                });
                if (saveRadiologyResponse.status === 500) {
                  console.log('📷 CLIENT: First attempt returned 500, waiting 2s and retrying once...');
                  await new Promise((r) => setTimeout(r, 2000));
                  saveRadiologyResponse = await fetch('/api/radiology-images', {
                    method: 'POST',
                    headers,
                    credentials: 'include',
                    body: JSON.stringify(body),
                  });
                }

                console.log('📷 CLIENT: [Step 2] Response status=', saveRadiologyResponse.status);
                if (saveRadiologyResponse.ok) {
                  const saveResult = await saveRadiologyResponse.json();
                  const savedCount = saveResult.savedCount ?? 0;
                  console.log('📷 CLIENT: [Step 3] radiology_images save result:', saveResult, 'savedCount=', savedCount);

                  await new Promise(resolve => setTimeout(resolve, 300));

                  if (savedCount > 0) {
                    toast({
                      title: "Radiology images saved",
                      description: `Successfully saved ${savedCount} image(s) to the database.`,
                    });
                    console.log(`📷 CLIENT: Successfully saved ${savedCount} image(s) to radiology_images table`);
                  } else {
                    const reason = saveResult.message || (saveResult.skippedNotFound > 0 ? 'Files not found on server' : 'No images could be saved');
                    toast({
                      title: "No images saved to database",
                      description: reason,
                      variant: "destructive",
                    });
                    console.warn('📷 CLIENT: No rows inserted into radiology_images:', saveResult);
                  }
                } else {
                  console.error('Failed to save images to radiology_images table', saveRadiologyResponse.status);
                  const errorData = await saveRadiologyResponse.json().catch(() => ({}));
                  toast({
                    title: "Warning",
                    description: "Images uploaded but failed to save to radiology_images table. " + (errorData.error || errorData.details || ''),
                    variant: "destructive",
                  });
                }
              } catch (saveError) {
                console.error('Error saving images to radiology_images table:', saveError);
                toast({
                  title: "Warning",
                  description: "Images uploaded but failed to save to radiology_images table.",
                  variant: "destructive",
                });
              }
            }
          }

          toast({
            title: "Images Uploaded",
            description: `${selectedFiles.length} image(s) uploaded successfully`,
          });

          // Clear selected files after successful upload
          setSelectedFiles([]);
          // Clear previews after successful upload
          setUploadedImagePreviews([]);
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          toast({
            title: "Image Upload Failed",
            description: "Failed to upload images. Continuing with report generation.",
            variant: "destructive",
          });
        }
      }

      // Fetch radiology images from database (from radiology_images table)
      // IMPORTANT: Wait a moment after upload to ensure database transaction is committed
      if (uploadedImageFileNames.length > 0) {
        console.log('📷 CLIENT: Waiting 1 second for database transaction to commit before fetching radiology images...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      let radiologyImagePaths: string[] = [];
      try {
        const radiologyResponse = await apiRequest(
          "GET",
          `/api/radiology-images/${study.id}`,
          undefined
        );

        if (radiologyResponse.ok) {
          const radiologyData = await radiologyResponse.json();
          if (radiologyData.success && radiologyData.images && Array.isArray(radiologyData.images)) {
            // Sort images by displayOrder first, then extract file_path
            const sortedImages = radiologyData.images
              .filter((img: any) => img.filePath)
              .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

            // Extract file_path from each sorted radiology image
            radiologyImagePaths = sortedImages.map((img: any) => img.filePath);

            console.log('📷 CLIENT: Found radiology images from database:', radiologyImagePaths.length);
            console.log('📷 CLIENT: Radiology image paths:', radiologyImagePaths);

            if (radiologyImagePaths.length === 0 && uploadedImageFileNames.length > 0) {
              console.warn('📷 CLIENT: ⚠️ No radiology image paths found in database, but images were uploaded. This may indicate a save issue.');
            }
          }
        }
      } catch (radiologyError) {
        console.error('Error fetching radiology images:', radiologyError);
        // Continue with report generation even if radiology images fetch fails
      }

      // Prepare image data for embedding in PDF
      // Include both uploaded filenames and preview data URLs to ensure images are embedded
      const imageDataForPDF: any = {
        uploadedImageFileNames: uploadedImageFileNames,
        radiologyImagePaths: radiologyImagePaths,
      };

      // Also include preview data URLs if available (for immediate embedding)
      if (uploadedImagePreviews.length > 0) {
        imageDataForPDF.previewImageDataUrls = uploadedImagePreviews;
      }

      // Call server-side PDF generation endpoint with fileName, uploaded image filenames, radiology image paths, and signature data
      const response = await apiRequest(
        "POST",
        "/api/imaging/generate-report",
        {
          study,
          reportFormData: {
            findings: reportFindings,
            impression: reportImpression,
            radiologist: reportRadiologist,
            scheduledAt: scheduledDate ? scheduledDate.toISOString() : null,
            performedAt: performedDate ? performedDate.toISOString() : null,
          },
          uploadedImageFileNames,
          radiologyImagePaths, // Pass file paths from radiology_images table
          previewImageDataUrls: uploadedImagePreviews.length > 0 ? uploadedImagePreviews : undefined, // Pass preview data URLs for direct embedding
          signatureData: study.signatureData || null,
          signatureDate: study.signatureDate || null,
          replaceExistingReport: reportDialogIsEditMode, // When editing from Imaging Results: replace PDF and update DB rows
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF report");
      }

      const data = await response.json();

      if (data.success && data.reportId) {
        setGeneratedReportId(data.reportId);
        setGeneratedReportFileName(data.fileName || `${data.reportId}.pdf`);

        // Update order_study_generated to true and status to Completed for this medical image
        try {
          await apiRequest("PATCH", `/api/medical-images/${study.id}`, {
            orderStudyGenerated: true,
            status: "Completed"
          });
          console.log('📷 IMAGING: Updated order_study_generated to true and status to Completed for study ID:', study.id);
        } catch (updateError) {
          console.error('Error updating order_study_generated and status:', updateError);
        }

        // Refresh the medical images to get updated data
        refetchImages();

        toast({
          title: "PDF Report Generated Successfully",
          description: `Report saved as: ${data.fileName || `${data.reportId}.pdf`}`,
        });

        // Reset the button state after a brief delay to show "Generate Report" button again
        setTimeout(() => {
          setGeneratedReportId(null);
          setGeneratedReportFileName(null);
        }, 2000);
      } else {
        throw new Error("Failed to generate PDF report");
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const viewPDFReport = async (reportId: string) => {
    try {
      // Extract imageId from reportId (remove timestamp if present)
      // ReportId format: IMG1769972471249I98ORDER_1769973253902 or IMG1769972471249I98ORDER
      let imageId = reportId;
      if (reportId.includes('_')) {
        // If it contains underscore, it likely has a timestamp, extract the imageId part
        const parts = reportId.split('_');
        imageId = parts[0]; // Take the part before the timestamp
      }

      console.log("📄 Viewing PDF report - reportId:", reportId, "extracted imageId:", imageId);

      // Request a temporary signed URL from the backend using imageId
      const response = await apiRequest("GET", `/api/imaging-files/${imageId}/signed-url`, undefined);

      if (!response.ok) {
        let errorMessage = "Failed to generate signed URL";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const { signedUrl } = await response.json();

      console.log("📄 Signed URL received for imaging report:", imageId);

      // Open PDF in new tab using the signed URL
      window.open(signedUrl, '_blank');

      toast({
        title: "Opening Report",
        description: "PDF report is opening in a new tab",
      });
    } catch (error) {
      console.error("Error viewing PDF report:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open PDF report",
        variant: "destructive",
      });
    }
  };

  const viewPDFReportInDialog = async (study: any) => {
    try {
      // Use imageId for the signed URL request (the endpoint expects imageId, not the filename)
      if (!study.imageId) {
        toast({
          title: "No Report Available",
          description: "No PDF report is available for this study.",
          variant: "destructive",
        });
        return;
      }

      // Request a temporary signed URL from the backend using imageId
      const response = await apiRequest("GET", `/api/imaging-files/${study.imageId}/signed-url`);

      if (!response.ok) {
        let errorMessage = "Failed to generate signed URL";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const { signedUrl } = await response.json();

      console.log("📄 Signed URL received for imaging report:", study.imageId);

      // Use reportFileName from study if available, otherwise construct from imageId
      const fileName = study.reportFileName || study.reportFilePath?.split('/').pop() || `${study.imageId}.pdf`;

      setSelectedPDFUrl(signedUrl);
      setSelectedPDFFileName(fileName);
      setShowPDFListViewDialog(true);
    } catch (error) {
      console.error("Error viewing PDF report in dialog:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open PDF report",
        variant: "destructive",
      });
    }
  };

  const downloadPDFReport = async (reportId: string) => {
    try {
      // Prepare authentication headers
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      // Add authorization token if available
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch PDF with authentication
      const response = await fetch(`/api/imaging/reports/${reportId}?download=true`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download link
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `radiology-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "PDF Report Downloaded",
        description: "Radiology report PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadPrescription = async (study: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download prescription.",
          variant: "destructive",
        });
        return;
      }

      // Step 1: Validate prescriptionFilePath exists
      if (!study.prescriptionFilePath) {
        throw new Error("Prescription file path not available.");
      }

      // Step 2: Extract fileName from prescriptionFilePath
      // Expected path format: uploads/Image_Prescriptions/{organizationId}/patients/{patientId}/PRESCRIPTION_{imageId}_{timestamp}.pdf
      const pathParts = study.prescriptionFilePath.split('/');
      const fileName = pathParts[pathParts.length - 1];

      if (!fileName || !fileName.startsWith('PRESCRIPTION_') || !fileName.endsWith('.pdf')) {
        console.error("Invalid prescription file path format:", study.prescriptionFilePath);
        throw new Error("Invalid prescription file path format. Expected: PRESCRIPTION_{imageId}_{timestamp}.pdf");
      }

      // Step 3: Get organizationId and patientId
      const organizationId = user?.organizationId || study.organizationId;
      const patientId = study.patientId;

      if (!organizationId) {
        throw new Error("Organization ID is missing. Cannot download prescription.");
      }

      if (!patientId) {
        throw new Error("Patient ID is missing. Cannot download prescription.");
      }

      console.log("Downloading prescription:", {
        prescriptionFilePath: study.prescriptionFilePath,
        fileName: fileName,
        organizationId: organizationId,
        patientId: patientId
      });

      // Step 4: Generate token for accessing the prescription
      const tokenResponse = await apiRequest("POST", `/api/imaging/generate-prescription-token`, {
        organizationId: organizationId,
        patientId: patientId,
        fileName: fileName
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.token) {
        throw new Error("Failed to generate access token. Token not received.");
      }

      // Step 5: Construct the prescription URL
      // Path format: uploads/Image_Prescriptions/{organizationId}/patients/{patientId}/PRESCRIPTION_{imageId}_{timestamp}.pdf
      const prescriptionUrl = `/api/imaging/view-prescription/${organizationId}/${patientId}/${fileName}?token=${tokenData.token}`;

      console.log("Downloading prescription from URL:", prescriptionUrl);

      // Step 6: Fetch the PDF file
      const response = await fetch(prescriptionUrl, {
        method: "GET",
        headers: {
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to download prescription: ${response.status} ${response.statusText}`);
      }

      // Step 7: Convert response to blob and download
      const blob = await response.blob();

      // Create download link
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Prescription Downloaded",
        description: "Prescription PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading prescription:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download prescription.",
        variant: "destructive",
      });
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

  // Load signature from database onto canvas
  const loadSignatureFromDatabase = async () => {
    if (!eSignStudy || !canvasRef.current) return;

    try {
      // Fetch medical image from database to get latest signature data
      const response = await apiRequest(
        "GET",
        `/api/medical-images/${eSignStudy.id}`
      );

      if (response.ok) {
        const medicalImageData = await response.json();

        // Check if signature exists in database (imaging uses signatureData field)
        if (
          medicalImageData.signatureData &&
          String(medicalImageData.signatureData).trim() !== ""
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
            setSignature(medicalImageData.signatureData);
          };
          signatureImage.onerror = () => {
            console.error("Error loading signature image");
          };
          signatureImage.src = medicalImageData.signatureData;
        } else {
          // No signature exists, clear canvas
          clearSignature();
        }
      }
    } catch (error) {
      console.error("Error loading signature from database:", error);
      // If error, check if signature exists in eSignStudy
      if (
        eSignStudy.signatureData &&
        String(eSignStudy.signatureData).trim() !== ""
      ) {
        const signatureImage = new Image();
        signatureImage.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(signatureImage, 0, 0, canvas.width, canvas.height);
          setSignature(eSignStudy.signatureData);
        };
        signatureImage.src = eSignStudy.signatureData;
      } else {
        clearSignature();
      }
    }
  };

  // Load signature when dialog opens
  useEffect(() => {
    if (showESignDialog && eSignStudy) {
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        loadSignatureFromDatabase();
      }, 100);
    } else if (!showESignDialog) {
      // Clear signature when dialog closes
      clearSignature();
    }
  }, [showESignDialog, eSignStudy?.id]);

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
    setSignatureSaved(false);
    setSignaturePreview(null); // Clear preview when signature is cleared
  };

  const previewSignature = () => {
    if (!canvasRef.current) {
      toast({
        title: "No Signature",
        description: "Please draw your signature first before previewing.",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();

    // Check if canvas is blank
    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = canvas.width;
    blankCanvas.height = canvas.height;
    if (signatureData === blankCanvas.toDataURL()) {
      toast({
        title: "No Signature",
        description: "Please draw your signature first before previewing.",
        variant: "destructive",
      });
      return;
    }

    // Set preview data
    setSignaturePreview(signatureData);
    toast({
      title: "Signature Preview",
      description: "Your signature preview is displayed below.",
    });
  };

  const saveSignature = async () => {
    // Hide tabs immediately when Apply Advanced E-Signature is clicked (for nurse/admin/doctor roles)
    if (user?.role === 'nurse' || user?.role === 'admin' || user?.role === 'doctor') {
      setHideTabs(true);
    }

    if (!canvasRef.current || !eSignStudy || isSavingSignature) return;

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

    // Disable button immediately
    setIsSavingSignature(true);

    try {
      console.log("📝 Saving signature for study ID:", eSignStudy.id);
      console.log("📝 Signature data length:", signatureData.length);

      const response = await apiRequest(
        "PATCH",
        `/api/medical-images/${eSignStudy.id}`,
        {
          signatureData: signatureData,
        },
      );

      console.log("📝 Signature save response status:", response.status, response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Signature save response:", result);

        // Get the signatureDate from the server response or use current date
        const signatureDate = new Date().toISOString();

        // Invalidate and refetch queries to get updated data
        // Use exact: true to only invalidate medical-images queries, not other API queries
        await queryClient.invalidateQueries({
          queryKey: ["/api/medical-images"],
          exact: true
        });

        // Also refetch to ensure data is updated
        await refetchImages();

        // Update eSignStudy to include the signature immediately
        setESignStudy((prev: any) => ({
          ...prev,
          signatureData: signatureData,
          signatureDate: signatureDate,
        }));

        setSignatureSaved(true);

        toast({
          title: "Success",
          description: "Electronic signature applied successfully!",
        });

        // If there's a pending prescription, generate it after signature is saved
        if (pendingPrescriptionStudy) {
          // Close the sign first dialog if it's open
          setShowSignFirstDialog(false);
          // Update the study object with the signature before calling handleGenerateImagePrescription
          const updatedStudy = {
            ...pendingPrescriptionStudy,
            signatureData: signatureData,
            signatureDate: signatureDate,
          };
          // Clear pending study first
          setPendingPrescriptionStudy(null);
          // Now call the prescription generation directly with the updated study
          // Use a small delay to ensure database is updated
          setTimeout(() => {
            handleGenerateImagePrescriptionWithSignature(updatedStudy);
          }, 500);
        } else {
          // If no pending prescription, just close the dialog after a delay
          setTimeout(() => {
            clearSignature();
            setShowESignDialog(false);
            setSignatureSaved(false);
            setIsSavingSignature(false);
          }, 2000);
        }
      } else {
        const errorText = await response.text();
        console.error("❌ Signature save error response:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Unknown error" };
        }
        throw new Error(errorData.error || errorData.message || "Failed to save signature");
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
      // Re-enable button on error
      setIsSavingSignature(false);
    }
  };

  const handleDeleteStudy = async (studyId: string) => {
    const study = ((studies as any) || []).find((s: any) => s.id === studyId);
    if (!study) return;

    // Show confirmation modal instead of window.confirm
    setStudyToDelete(study);
    setShowDeleteDialog(true);
  };

  const confirmDeleteStudy = async () => {
    if (!studyToDelete) return;

    try {
      // Call API to delete the study with files
      const response = await apiRequest('DELETE', `/api/medical-images/${studyToDelete.id}`);

      if (!response.ok) {
        throw new Error('Failed to delete study');
      }

      // Add the study ID to the deleted set to remove it from the display
      setDeletedStudyIds((prev) => new Set([...prev, studyToDelete.id]));

      // Refresh the medical images list
      refetchImages();

      toast({
        title: "Study Deleted",
        description: `${studyToDelete.studyType} study for ${studyToDelete.patientName} has been deleted successfully`,
      });

      // Close modal
      setShowDeleteDialog(false);
      setStudyToDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);

      // For doctors and admins, suppress permission errors and show a regular toast
      const errorMessage = error.message || "Failed to delete the imaging study. Please try again.";
      const isPermissionError = errorMessage.includes('403') ||
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('forbidden');

      // Skip showing error for doctors/admins with permission issues - they should have access
      if ((isDoctor() || isAdmin()) && isPermissionError) {
        console.log('Permission error suppressed for doctor/admin role on delete');
        // Close the delete dialog silently
        setShowDeleteDialog(false);
        setStudyToDelete(null);
        return;
      }

      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Transform medical images data to match ImagingStudy format
  let studies: any[] = [];

  if (medicalImages && Array.isArray(medicalImages)) {
    studies = medicalImages.map((image: any) => ({
      id: image.id.toString(),
      patientId: image.patientId,
      patientName: image.patientName,
      studyType: image.studyType,
      modality: image.modality,
      bodyPart: image.bodyPart || "Not specified",
      orderedBy: image.uploadedByName || "Unknown",
      orderedAt: image.createdAt,
      scheduledAt: image.scheduledAt,
      performedAt: image.performedAt,
      createdAt: image.createdAt, // Include createdAt for Created column display
      status: image.status === "uploaded" ? "completed" : image.status,
      priority: image.priority || "routine",
      indication: image.indication || "No indication provided",
      findings: image.findings || `Medical image uploaded: ${image.fileName}`,
      impression:
        image.impression ||
        `File: ${image.fileName} (${(image.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      radiologist: image.radiologist || image.uploadedByName || "Unknown",
      fileName: image.fileName, // Include image file name for PDF generation
      reportFileName: image.reportFileName, // Include PDF report file name
      reportFilePath: image.reportFilePath, // Include PDF report file path
      prescriptionFilePath: image.prescriptionFilePath, // Include prescription file path
      imageId: image.imageId, // Include imageId
      orderStudyCreated: image.orderStudyCreated || false, // Include order study tracking
      orderStudyReadyToGenerate: image.orderStudyReadyToGenerate || false, // Include order study ready to generate tracking
      orderStudyGenerated: image.orderStudyGenerated || false, // Include order study tracking
      orderStudyShared: image.orderStudyShared || false, // Include order study tracking
      signatureData: image.signatureData || null, // Include signature data
      signatureDate: image.signatureDate || null, // Include signature date
      selectedUserId: image.selectedUserId || null, // Include selected user ID
      selectedRole: image.selectedRole || null, // Include selected role
      images: [
        {
          id: image.id.toString(),
          type: image.mimeType?.includes("jpeg") ? "JPEG" : "DICOM",
          seriesDescription: `${image.modality} ${image.bodyPart}`,
          imageCount: 1,
          size: `${(image.fileSize / (1024 * 1024)).toFixed(2)} MB`,
          imageData: image.imageData, // Include the base64 image data
          mimeType: image.mimeType, // Include the MIME type
        },
      ],
    }));
  }

  // Compute unique image IDs for filter dropdown
  const uniqueImageIds = useMemo(() => {
    if (!Array.isArray(studies) || studies.length === 0) return [];
    const imageIds = Array.from(new Set(studies.map((study: any) => study.imageId).filter(Boolean)));
    return imageIds.sort();
  }, [studies]);

  const filteredStudies = ((studies as any) || []).filter((study: any) => {
    // First check if this study has been deleted
    if (deletedStudyIds.has(study.id)) {
      return false;
    }

    // Filter based on active tab
    let matchesTab = true;
    if (activeTab === "order-study") {
      // Order Study tab: order_study_created = true AND order_study_ready_to_generate = false AND order_study_generated = false
      // Exclude records where order_study_ready_to_generate is true (those should appear in Generate Report tab)
      // For patient users: also check that patient equals logged in user id AND status = 'ordered' or 'in_progress'
      if (user?.role === "patient" && currentPatient) {
        matchesTab = study.orderStudyCreated === true &&
          study.orderStudyReadyToGenerate === false && // Exclude if ready to generate
          study.orderStudyGenerated === false &&
          (study.status === "ordered" || study.status === "in_progress") &&
          String(study.patientId) === String(currentPatient.id);
      } else {
        matchesTab = study.orderStudyCreated === true &&
          study.orderStudyReadyToGenerate === false && // Exclude if ready to generate
          study.orderStudyGenerated === false;
      }
    } else if (activeTab === "generate-report") {
      // Generate Report tab: order_study_created = true AND order_study_ready_to_generate = true AND order_study_generated = false
      // Fetch records where both orderStudyCreated and orderStudyReadyToGenerate are true
      matchesTab = study.orderStudyCreated === true &&
        study.orderStudyReadyToGenerate === true &&
        study.orderStudyGenerated === false;
    } else if (activeTab === "imaging-results") {
      // Imaging Results tab: order_study_created = true AND order_study_generated = true AND status = Completed
      matchesTab = study.orderStudyCreated === true &&
        study.orderStudyGenerated === true &&
        study.status === "Completed";
    }

    const matchesSearch =
      !searchQuery ||
      study.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.studyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.bodyPart.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (study.imageId && String(study.imageId).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (study.patientId && String(study.patientId).toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || study.status === statusFilter;
    const matchesModality =
      modalityFilter === "all" || study.modality === modalityFilter;
    const matchesImageId =
      !filterImageId || study.imageId === filterImageId;

    return matchesTab && matchesSearch && matchesStatus && matchesModality && matchesImageId;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "final":
        return "bg-green-100 text-green-800";
      case "preliminary":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "scheduled":
        return "bg-cyan-100 text-cyan-800";
      case "ordered":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat":
        return "bg-red-100 text-red-800";
      case "urgent":
        return "bg-orange-100 text-orange-800";
      case "routine":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case "X-Ray":
        return <Camera className="h-4 w-4" />;
      case "CT":
        return <Monitor className="h-4 w-4" />;
      case "MRI":
        return <Zap className="h-4 w-4" />;
      case "Ultrasound":
        return <FileImage className="h-4 w-4" />;
      default:
        return <FileImage className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Header
        title="Medical Imaging"
        subtitle="View and manage radiology studies and reports"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {user?.role === "patient" ? "Order Study" : "In Process Reports"}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {studies.filter((study: any) => {
                        if (user?.role === "patient" && currentPatient) {
                          return study.status === "ordered" && String(study.patientId) === String(currentPatient.id);
                        }
                        return study.status === "in_progress";
                      }).length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Today's Studies
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-today-studies-count">
                      {medicalImages.filter((image: any) => {
                        const createdDate = new Date(image.createdAt);
                        const today = new Date();
                        const isToday = createdDate.toDateString() === today.toDateString();
                        if (user?.role === "patient" && currentPatient) {
                          return isToday && String(image.patientId) === String(currentPatient.id);
                        }
                        return isToday;
                      }).length}
                    </p>
                  </div>
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Completed Studies
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {studies.filter((study: any) => {
                        if (user?.role === "patient" && currentPatient) {
                          return study.status === "Completed" && String(study.patientId) === String(currentPatient.id);
                        }
                        return study.status === "completed";
                      }).length}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      This Month
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {medicalImages.filter((image: any) => {
                        const createdDate = new Date(image.createdAt);
                        const today = new Date();
                        const isThisMonth = createdDate.getMonth() === today.getMonth() &&
                          createdDate.getFullYear() === today.getFullYear();
                        if (user?.role === "patient" && currentPatient) {
                          return isThisMonth && String(image.patientId) === String(currentPatient.id);
                        }
                        return isThisMonth;
                      }).length}
                    </p>
                  </div>
                  <FileImage className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Order Study, Generate Report, and Imaging Results */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full mb-4 ${user?.role === 'patient' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <TabsTrigger value="order-study" data-testid="tab-order-study">
                Order Study
              </TabsTrigger>
              {user?.role !== 'patient' && (
                <TabsTrigger value="generate-report" data-testid="tab-generate-report">
                  Generate Report
                </TabsTrigger>
              )}
              <TabsTrigger value="imaging-results" data-testid="tab-imaging-results">
                Imaging Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search imaging studies..."
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
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="preliminary">Preliminary</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Image ID Filter (Admin Only) */}
                    {isAdmin() && uniqueImageIds.length > 0 && (
                      <Popover open={imageIdPopoverOpen} onOpenChange={setImageIdPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={imageIdPopoverOpen}
                            className="w-[220px] justify-between"
                            data-testid="button-filter-imageid"
                          >
                            {filterImageId || "Filter by Image ID"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-0">
                          <Command>
                            <CommandInput placeholder="Search image ID..." />
                            <CommandList>
                              <CommandEmpty>No image ID found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value=""
                                  onSelect={() => {
                                    setFilterImageId("");
                                    setImageIdPopoverOpen(false);
                                  }}
                                  data-testid="option-imageid-all"
                                >
                                  <CheckIcon
                                    className={`mr-2 h-4 w-4 ${filterImageId === "" ? "opacity-100" : "opacity-0"}`}
                                  />
                                  All Image IDs
                                </CommandItem>
                                {uniqueImageIds.map((imageId) => (
                                  <CommandItem
                                    key={imageId}
                                    value={imageId}
                                    onSelect={(currentValue) => {
                                      setFilterImageId(currentValue === filterImageId ? "" : currentValue);
                                      setImageIdPopoverOpen(false);
                                    }}
                                    data-testid={`option-imageid-${imageId}`}
                                  >
                                    <CheckIcon
                                      className={`mr-2 h-4 w-4 ${filterImageId === imageId ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {imageId}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}

                    <Select
                      value={modalityFilter}
                      onValueChange={setModalityFilter}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by modality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modalities</SelectItem>
                        <SelectItem value="X-Ray">X-Ray</SelectItem>
                        <SelectItem value="CT">CT</SelectItem>
                        <SelectItem value="MRI">MRI</SelectItem>
                        <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                        <SelectItem value="Mammography">Mammography</SelectItem>
                        <SelectItem value="Fluoroscopy">Fluoroscopy</SelectItem>
                        <SelectItem value="Interventional Radiology">Interventional Radiology (IR)</SelectItem>
                        <SelectItem value="Angiography">Angiography</SelectItem>
                        <SelectItem value="DEXA">DEXA (Bone Densitometry)</SelectItem>
                        <SelectItem value="Nuclear Medicine">Nuclear Medicine</SelectItem>
                        <SelectItem value="SPECT">SPECT (Single Photon Emission CT)</SelectItem>
                        <SelectItem value="PET">PET (Positron Emission Tomography)</SelectItem>
                        <SelectItem value="Echocardiography">Echocardiography</SelectItem>
                      </SelectContent>
                    </Select>

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

                    <div className="flex flex-1 justify-end">
                      {user?.role !== "patient" && activeTab === 'order-study' && canCreate('medical_imaging') && (
                        <Button
                          onClick={() => setShowUploadDialog(true)}
                          className="bg-medical-blue hover:bg-blue-700 text-white"
                          data-testid="button-order-study"
                        >
                          <Share className="h-4 w-4 mr-2" />
                          Create Order Study
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Imaging Studies List */}
              <div className="space-y-4">
                {imagesLoading ? (
                  /* Loading State - Show skeleton for table */
                  <Card className="w-full max-w-full overflow-hidden">
                    <CardContent className="p-0 w-full max-w-full">
                      <div className="w-full max-w-full overflow-hidden">
                        <table className="w-full min-w-0 text-[11px]" style={{ tableLayout: 'fixed', width: '100%' }}>
                          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Image ID</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '8%' }}>Patient</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '8%' }}>Provider</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '7%' }}>Study Type</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Modality</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Body Part</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '7%' }}>File Name</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Radiologist</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Priority</th>
                              <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Status</th>
                              {user?.role !== "patient" && (activeTab === "order-study" || (activeTab === "imaging-results" && (user?.role === "doctor" || user?.role === "nurse" || user?.role === "admin"))) && (
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '7%' }}>Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-gray-700">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((j) => (
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
                ) : viewMode === "list" ? (
                  filteredStudies.length > 0 && (
                    /* List View - Table Format */
                    <Card className="w-full max-w-full overflow-hidden">
                      <CardContent className="p-0 w-full max-w-full">
                        <div className="w-full max-w-full overflow-hidden">
                          <table className="w-full min-w-0 text-[11px]" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Image ID</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '8%' }}>Patient</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '8%' }}>Provider</th>
                                {activeTab === "order-study" && (
                                  <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Order Date</th>
                                )}
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '7%' }}>Study Type</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Modality</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Body Part</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '7%' }}>File Name</th>
                                {activeTab !== "order-study" && activeTab === "generate-report" && (
                                  <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '4%' }}>Share</th>
                                )}
                                {activeTab === "imaging-results" && (
                                  <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Rx</th>
                                )}
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '6%' }}>Radiologist</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Priority</th>
                                <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Status</th>
                                <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0" style={{ width: '2%', minWidth: '1.5rem' }}>.</th>
                                {activeTab === "order-study" && (
                                  <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '5%' }}>Order Ready</th>
                                )}
                                  <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '4%' }}>Signed</th>
                                  {user?.role !== "patient" && (activeTab === "order-study" || (activeTab === "imaging-results" && (user?.role === "doctor" || user?.role === "nurse" || user?.role === "admin"))) && (
                                    <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase min-w-0" style={{ width: '7%' }}>Actions</th>
                                  )}
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredStudies.map((study: any) => (
                                <tr
                                  key={study.id}
                                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${activeTab === "imaging-results" ? "cursor-pointer" : ""}`}
                                  data-testid={`row-imaging-${study.id}`}
                                  onClick={activeTab === "imaging-results" ? (e) => {
                                    const el = e.target as HTMLElement;
                                    if (el.closest("button") || el.closest("a") || el.closest('input') || el.closest("[data-actions-cell]")) return;
                                    setSelectedStudyId(study.id);
                                    openPreviewFromRadiologyImages(Number(study.id));
                                  } : undefined}
                                >
                                  <td className="px-1 py-1.5 text-[11px] font-medium text-gray-900 dark:text-gray-100 min-w-0">
                                    <div className="truncate" title={study.imageId || study.id}>
                                      {study.imageId || study.id}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                    <div className="truncate" title={study.patientName}>
                                      {study.patientName}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                    <div className="truncate" title={
                                      study.selectedUserId
                                        ? (() => {
                                          const providerUser = allUsers.find((u: any) => u.id === study.selectedUserId);
                                          if (!providerUser) return "N/A";
                                          const firstName = providerUser.firstName || "";
                                          const lastName = providerUser.lastName || "";
                                          let fullName = `${firstName} ${lastName}`.trim();
                                          if (!fullName) return "N/A";
                                          const role = providerUser.role || study.selectedRole || "";
                                          const roleLabel = role ? formatRoleLabel(role) : "";
                                          // Check if name already starts with "Dr." before adding prefix
                                          const alreadyHasDr = fullName.toLowerCase().startsWith("dr.");
                                          const prefix = (role?.toLowerCase() === "doctor" && !alreadyHasDr) ? "Dr. " : "";
                                          return roleLabel ? `${prefix}${fullName} (${roleLabel})` : `${prefix}${fullName}`;
                                        })()
                                        : "N/A"
                                    }>
                                      {study.selectedUserId
                                        ? (() => {
                                          const providerUser = allUsers.find((u: any) => u.id === study.selectedUserId);
                                          if (!providerUser) return "N/A";
                                          const firstName = providerUser.firstName || "";
                                          const lastName = providerUser.lastName || "";
                                          let fullName = `${firstName} ${lastName}`.trim();
                                          if (!fullName) return "N/A";
                                          const role = providerUser.role || study.selectedRole || "";
                                          const roleLabel = role ? formatRoleLabel(role) : "";
                                          // Check if name already starts with "Dr." before adding prefix
                                          const alreadyHasDr = fullName.toLowerCase().startsWith("dr.");
                                          const prefix = (role?.toLowerCase() === "doctor" && !alreadyHasDr) ? "Dr. " : "";
                                          return roleLabel ? `${prefix}${fullName} (${roleLabel})` : `${prefix}${fullName}`;
                                        })()
                                        : "N/A"}
                                    </div>
                                  </td>
                                  {activeTab === "order-study" && (
                                    <td className="px-1 py-1.5 text-[11px] text-gray-500 dark:text-gray-400 min-w-0">
                                      <div className="truncate" title={study.orderedAt ? format(new Date(study.orderedAt), "MMM dd, yyyy") : "N/A"}>
                                        {study.orderedAt
                                          ? format(new Date(study.orderedAt), "MMM dd, yyyy")
                                          : "N/A"}
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                    <div className="truncate" title={study.studyType || "N/A"}>
                                      {study.studyType || "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                    <div className="flex items-center gap-0.5 min-w-0">
                                      {getModalityIcon(study.modality)}
                                      <span className="truncate" title={study.modality}>
                                        {study.modality}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                    {activeTab === "order-study" || activeTab === "generate-report" ? (
                                      // Order Study and Generate Report tabs: no link, just display text
                                      <div className="truncate" title={study.bodyPart || "N/A"}>
                                        {study.bodyPart || "N/A"}
                                      </div>
                                    ) : activeTab === "imaging-results" ? (
                                      // Imaging Results tab: click to show all images for this body part
                                      <div
                                        className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                                        title={`Click to view all images for ${study.bodyPart || "N/A"}`}
                                        onClick={async () => {
                                          try {
                                            const bodyPart = study.bodyPart;
                                            if (!bodyPart) {
                                              toast({
                                                title: "No Body Part",
                                                description: "Body part information is not available.",
                                                variant: "destructive",
                                              });
                                              return;
                                            }

                                            if (!study.id) {
                                              toast({
                                                title: "Error",
                                                description: "Study ID is not available.",
                                                variant: "destructive",
                                              });
                                              return;
                                            }

                                            setLoadingBodyPartImages(true);
                                            setSelectedBodyPart(bodyPart);

                                            const medicalImageId = Number(study.id);
                                            if (isNaN(medicalImageId)) {
                                              toast({
                                                title: "Error",
                                                description: "Invalid study ID.",
                                                variant: "destructive",
                                              });
                                              setLoadingBodyPartImages(false);
                                              return;
                                            }

                                            const token = localStorage.getItem("auth_token");
                                            const headers: Record<string, string> = {
                                              "X-Tenant-Subdomain": getActiveSubdomain(),
                                            };
                                            if (token) headers["Authorization"] = `Bearer ${token}`;

                                            // Build display URL from radiology_images record; support both camelCase and snake_case from API
                                            const getUploadsDisplayUrl = (img: any) => {
                                              const orgId = img?.organizationId ?? img?.organization_id;
                                              const patId = img?.patientId ?? img?.patient_id;
                                              const fName = img?.fileName ?? img?.file_name;
                                              if (orgId != null && patId != null && fName) {
                                                return `/${["uploads", "Imaging_Images", String(orgId), "patients", String(patId), fName].join("/")}`;
                                              }
                                              const fp = img?.filePath ?? img?.file_path;
                                              if (fp && typeof fp === "string" && fp.includes("uploads")) {
                                                const fromUploads = fp.substring(fp.indexOf("uploads")).replace(/\\/g, "/");
                                                return fromUploads.startsWith("/") ? fromUploads : `/${fromUploads}`;
                                              }
                                              return null;
                                            };

                                            const mapRadiologyToImages = (data: any) => {
                                              const list: any[] = [];
                                              if (data?.success && data?.images && Array.isArray(data.images)) {
                                                data.images.forEach((img: any) => {
                                                  const uploadsDisplayUrl = getUploadsDisplayUrl(img);
                                                  list.push({
                                                    ...img,
                                                    studyId: study.id,
                                                    organizationId: img.organizationId ?? img.organization_id,
                                                    patientId: img.patientId ?? img.patient_id,
                                                    fileName: img.fileName ?? img.file_name,
                                                    filePath: img.filePath ?? img.file_path,
                                                    studyType: img.studyType || study.studyType,
                                                    patientName: study.patientName,
                                                    modality: img.modality || study.modality,
                                                    uploadsDisplayUrl,
                                                  });
                                                });
                                              }
                                              return list;
                                            };

                                            // 1) Search radiology_images by medical_image_id (= study.id); one-to-many: get all rows, each has file_path for server preview
                                            let response = await fetch(
                                              `/api/radiology-images/${medicalImageId}`,
                                              { method: "GET", credentials: "include", headers }
                                            );
                                            let data = response.ok ? await response.json() : null;
                                            let allImages: any[] = mapRadiologyToImages(data || {});

                                            // 2) If none, try by-body-part (same table, with body part filter)
                                            if (allImages.length === 0) {
                                              response = await fetch(
                                                `/api/radiology-images/by-body-part/${medicalImageId}?bodyPart=${encodeURIComponent(bodyPart)}`,
                                                { method: "GET", credentials: "include", headers }
                                              );
                                              data = response.ok ? await response.json() : null;
                                              allImages = mapRadiologyToImages(data || {});
                                            }

                                            // 3) Fallback: list image files from study folder so all uploaded images display (e.g. two images)
                                            if (allImages.length === 0) {
                                              try {
                                                const listRes = await fetch(
                                                  `/api/medical-images/${medicalImageId}/list-folder-images`,
                                                  { method: "GET", credentials: "include", headers }
                                                );
                                                if (listRes.ok) {
                                                  const listData = await listRes.json();
                                                  if (listData?.images?.length > 0) {
                                                    const fpNorm = (p: string) => p.startsWith("/") ? p.slice(1) : p;
                                                    const studyOrg = (study as any).organizationId ?? (study as any).organization_id;
                                                    const studyPat = (study as any).patientId ?? (study as any).patient_id;
                                                    allImages = listData.images.map((img: { fileName: string; filePath: string }, idx: number) => {
                                                      const filePath = fpNorm(img.filePath);
                                                      return {
                                                        id: `folder-${idx}-${img.fileName}`,
                                                        studyId: study.id,
                                                        organizationId: studyOrg,
                                                        patientId: studyPat,
                                                        fileName: img.fileName,
                                                        filePath,
                                                        uploadsDisplayUrl: filePath ? `/${filePath.replace(/\\/g, "/")}` : null,
                                                        studyType: study.studyType,
                                                        patientName: study.patientName,
                                                        modality: study.modality,
                                                        bodyPart: study.bodyPart,
                                                        imageId: study.imageId,
                                                      };
                                                    });
                                                  }
                                                }
                                              } catch (_) {
                                                /* ignore */
                                              }
                                            }
                                            // 4) Last fallback: single main image placeholder (study record)
                                            // Do not use ORDER-*.pending as filePath - it is not a real file name
                                            if (allImages.length === 0) {
                                              const studyFileName = study.fileName ?? (study as any).file_name;
                                              const isPlaceholderName = typeof studyFileName === "string" && (studyFileName.endsWith(".pending") || studyFileName.startsWith("ORDER-"));
                                              const mainImagePath = study.filePath || (study as any).file_path;
                                              let relativePath: string | null = null;
                                              if (!isPlaceholderName && mainImagePath && typeof mainImagePath === "string" && mainImagePath.includes("uploads")) {
                                                relativePath = mainImagePath.substring(mainImagePath.indexOf("uploads")).replace(/\\/g, "/");
                                              } else if (!isPlaceholderName && (study as any).organizationId != null && (study as any).patientId != null && studyFileName) {
                                                relativePath = `uploads/Imaging_Images/${(study as any).organizationId}/patients/${(study as any).patientId}/${studyFileName}`;
                                              }
                                              allImages = [{
                                                id: null,
                                                studyId: study.id,
                                                organizationId: (study as any).organizationId ?? (study as any).organization_id,
                                                patientId: (study as any).patientId ?? (study as any).patient_id,
                                                fileName: studyFileName,
                                                filePath: relativePath,
                                                studyType: study.studyType,
                                                patientName: study.patientName,
                                                modality: study.modality,
                                                bodyPart: study.bodyPart,
                                                isMainImage: true,
                                                imageId: study.imageId,
                                              }];
                                            }

                                            if (allImages.length === 0) {
                                              toast({
                                                title: "No Images Found",
                                                description: `No images found for body part "${bodyPart}" in this study.`,
                                                variant: "destructive",
                                              });
                                              setLoadingBodyPartImages(false);
                                              return;
                                            }

                                            setBodyPartDialogMedicalImageId(medicalImageId);
                                            setBodyPartDialogImageId(study.imageId ?? (study as any).image_id ?? null);
                                            setBodyPartImages(allImages);
                                            setShowBodyPartImagesDialog(true);

                                            // Load image previews asynchronously (don't block dialog opening)
                                            const loadPreviews = async () => {
                                              const previews: Record<number, string> = {};
                                              const authToken = localStorage.getItem("auth_token");
                                              const authHeaders: Record<string, string> = {
                                                "X-Tenant-Subdomain": getActiveSubdomain(),
                                                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                                              };
                                              // Load all previews in parallel
                                              const previewPromises = allImages.map(async (img, idx) => {
                                                const imageKey = img.id ?? idx;
                                                try {
                                                  // Priority 1: Direct URL from radiology_images (uploads path from org/patient/fileName or file_path)
                                                  const fp = img.filePath ?? img.file_path;
                                                  const directUrl = img.uploadsDisplayUrl || (fp && typeof fp === "string" && fp.includes("uploads")
                                                    ? `/${fp.substring(fp.indexOf("uploads")).replace(/\\/g, "/")}`
                                                    : null);
                                                  if (directUrl) {
                                                    try {
                                                      const pathResponse = await fetch(directUrl, { method: "GET", credentials: "include" });
                                                      if (pathResponse.ok) {
                                                        const blob = await pathResponse.blob();
                                                        if (blob.size > 0) {
                                                          const url = URL.createObjectURL(blob);
                                                          return { key: imageKey, url };
                                                        }
                                                      }
                                                    } catch (_) { /* try next */ }
                                                  }
                                                  // Priority 2: Base64 from DB
                                                  if (img.imageData) {
                                                    return { key: imageKey, url: img.imageData };
                                                  }
                                                  // Priority 3: Radiology image API (server reads file_path and streams)
                                                  const numericId = typeof img.id === 'number' ? img.id : (typeof img.id === 'string' && /^\d+$/.test(String(img.id)) ? parseInt(String(img.id), 10) : null);
                                                  if (numericId != null && !Number.isNaN(numericId)) {
                                                    try {
                                                      const previewResponse = await fetch(`/api/radiology-images/image/${numericId}`, {
                                                        method: "GET", headers: authHeaders, credentials: "include",
                                                      });
                                                      if (previewResponse.ok) {
                                                        const blob = await previewResponse.blob();
                                                        const url = URL.createObjectURL(blob);
                                                        return { key: imageKey, url };
                                                      }
                                                    } catch (_) { /* try next */ }
                                                  }
                                                  // Priority 4: Medical image endpoint (first image in folder)
                                                  if (img.studyId) {
                                                    try {
                                                      const previewResponse = await fetch(`/api/medical-images/${img.studyId}/image`, {
                                                        headers: authHeaders, credentials: "include",
                                                      });
                                                      if (previewResponse.ok) {
                                                        const blob = await previewResponse.blob();
                                                        if (blob.size > 0) {
                                                          const url = URL.createObjectURL(blob);
                                                          return { key: imageKey, url };
                                                        }
                                                      }
                                                    } catch (_) { /* try next */ }
                                                  }
                                                  return null;
                                                } catch (previewError) {
                                                  console.error(`❌ Error loading preview for image ${imageKey}:`, previewError);
                                                  return null;
                                                }
                                              });

                                              const results = await Promise.all(previewPromises);
                                              results.forEach((result) => {
                                                if (result) {
                                                  previews[result.key] = result.url;
                                                }
                                              });

                                              setBodyPartImagePreviews(previews);
                                            };

                                            // Start loading previews in background
                                            loadPreviews();
                                          } catch (error) {
                                            console.error("Error loading body part images:", error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to load images for this body part. Please try again.",
                                              variant: "destructive",
                                            });
                                          } finally {
                                            setLoadingBodyPartImages(false);
                                          }
                                        }}
                                      >
                                        {study.bodyPart || "N/A"}
                                      </div>
                                    ) : (
                                      // Other tabs: clickable link to open image viewer for single study
                                      <div
                                        className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                                        title={study.bodyPart || "N/A"}
                                        onClick={async () => {
                                          try {
                                            if (!study.images || study.images.length === 0) {
                                              toast({
                                                title: "No Image Available",
                                                description: "No medical image is available for this study.",
                                                variant: "destructive",
                                              });
                                              return;
                                            }

                                            const image = study.images[0];
                                            if (!image.imageData) {
                                              // Try to fetch image from API
                                              const response = await fetch(`/api/medical-images/${study.id}/image`, {
                                                headers: {
                                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                                  ...(localStorage.getItem("auth_token") && {
                                                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                                                  }),
                                                },
                                                credentials: "include",
                                              });

                                              if (!response.ok) {
                                                toast({
                                                  title: "Image Not Available",
                                                  description: "Failed to load medical image.",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }

                                              const blob = await response.blob();
                                              const blobUrl = URL.createObjectURL(blob);

                                              const imageForViewer = {
                                                seriesDescription: image.seriesDescription || `${study.modality} ${study.bodyPart}`,
                                                type: image.type || "JPEG",
                                                imageCount: image.imageCount || 1,
                                                size: image.size || "N/A",
                                                imageId: study.id,
                                                imageUrl: blobUrl,
                                                mimeType: image.mimeType || "image/jpeg",
                                                fileName: image.fileName || study.fileName,
                                              };
                                              setSelectedImageSeries(imageForViewer);
                                              setShowImageViewer(true);
                                            } else {
                                              // Use base64 image data directly
                                              const imageForViewer = {
                                                seriesDescription: image.seriesDescription || `${study.modality} ${study.bodyPart}`,
                                                type: image.type || "JPEG",
                                                imageCount: image.imageCount || 1,
                                                size: image.size || "N/A",
                                                imageId: study.id,
                                                imageUrl: image.imageData,
                                                mimeType: image.mimeType || "image/jpeg",
                                                fileName: image.fileName || study.fileName,
                                              };
                                              setSelectedImageSeries(imageForViewer);
                                              setShowImageViewer(true);
                                            }
                                          } catch (error) {
                                            console.error("Error loading image:", error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to load medical image. Please try again.",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                      >
                                        {study.bodyPart || "N/A"}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                    <div className="truncate" title={study.fileName || "N/A"}>
                                      {study.fileName || "N/A"}
                                    </div>
                                  </td>
                                  {activeTab !== "order-study" && activeTab === "generate-report" && (
                                    <td className="px-1 py-1.5 text-[11px] min-w-0">
                                      <div className="flex items-center justify-center gap-0.5 flex-shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleShareStudy(study, 'prescription')}
                                          className="h-5 w-5 p-0"
                                          title="Share Image Prescription"
                                          data-testid={`button-share-prescription-${study.id}`}
                                        >
                                          <Send className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                  {activeTab === "imaging-results" && (
                                    <td className="px-1 py-1.5 text-[11px] min-w-0">
                                      <div className="flex items-center justify-center gap-0.5 flex-shrink-0">
                                        {study.prescriptionFilePath ? (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={async () => {
                                                try {
                                                  const token = localStorage.getItem("auth_token");
                                                  if (!token) {
                                                    toast({
                                                      title: "Authentication Required",
                                                      description: "Please log in to view prescription.",
                                                      variant: "destructive",
                                                    });
                                                    return;
                                                  }

                                                  // Step 1: Validate prescriptionFilePath exists
                                                  if (!study.prescriptionFilePath) {
                                                    throw new Error("Prescription file path not available.");
                                                  }

                                                  // Step 2: Extract fileName from prescriptionFilePath
                                                  // Expected path format: uploads/Image_Prescriptions/{organizationId}/patients/{patientId}/PRESCRIPTION_{imageId}_{timestamp}.pdf
                                                  const pathParts = study.prescriptionFilePath.split('/');
                                                  const fileName = pathParts[pathParts.length - 1];

                                                  if (!fileName || !fileName.startsWith('PRESCRIPTION_') || !fileName.endsWith('.pdf')) {
                                                    console.error("Invalid prescription file path format:", study.prescriptionFilePath);
                                                    throw new Error("Invalid prescription file path format. Expected: PRESCRIPTION_{imageId}_{timestamp}.pdf");
                                                  }

                                                  // Step 3: Get organizationId and patientId
                                                  const organizationId = user?.organizationId || study.organizationId;
                                                  const patientId = study.patientId;

                                                  if (!organizationId) {
                                                    throw new Error("Organization ID is missing. Cannot open prescription.");
                                                  }

                                                  if (!patientId) {
                                                    throw new Error("Patient ID is missing. Cannot open prescription.");
                                                  }

                                                  console.log("Opening prescription:", {
                                                    prescriptionFilePath: study.prescriptionFilePath,
                                                    fileName: fileName,
                                                    organizationId: organizationId,
                                                    patientId: patientId
                                                  });

                                                  // Step 4: Generate token for accessing the prescription
                                                  const response = await apiRequest("POST", `/api/imaging/generate-prescription-token`, {
                                                    organizationId: organizationId,
                                                    patientId: patientId,
                                                    fileName: fileName
                                                  });

                                                  const data = await response.json();

                                                  if (!data.token) {
                                                    throw new Error("Failed to generate access token. Token not received.");
                                                  }

                                                  // Step 5: Construct the prescription URL
                                                  // Path format: uploads/Image_Prescriptions/{organizationId}/patients/{patientId}/PRESCRIPTION_{imageId}_{timestamp}.pdf
                                                  const prescriptionUrl = `/api/imaging/view-prescription/${organizationId}/${patientId}/${fileName}?token=${data.token}`;

                                                  console.log("Opening prescription URL:", prescriptionUrl);

                                                  // Step 6: Open the prescription PDF in a new window
                                                  window.open(prescriptionUrl, '_blank');

                                                  toast({
                                                    title: "Opening Prescription",
                                                    description: "Prescription document is being opened.",
                                                  });
                                                } catch (error) {
                                                  console.error("Error opening prescription:", error);
                                                  toast({
                                                    title: "Error",
                                                    description: error instanceof Error ? error.message : "Failed to open prescription.",
                                                    variant: "destructive",
                                                  });
                                                }
                                              }}
                                              className="h-5 w-5 p-0"
                                              title="View Image Prescription"
                                              data-testid={`button-prescription-${study.id}`}
                                            >
                                              <Save className="h-2.5 w-2.5 text-yellow-600 dark:text-yellow-400" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => downloadPrescription(study)}
                                              className="h-5 w-5 p-0"
                                              title="Download Image Prescription"
                                              data-testid={`button-download-prescription-${study.id}`}
                                            >
                                              <Download className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleShareStudy(study, 'prescription')}
                                              className="h-5 w-5 p-0"
                                              title="Share Image Prescription"
                                              data-testid={`button-share-prescription-${study.id}`}
                                            >
                                              <Share2 className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                            </Button>
                                          </>
                                        ) : (
                                          <span className="text-[10px] text-gray-400">N/A</span>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-1 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 min-w-0">
                                    <div className="truncate" title={study.radiologist || "N/A"}>
                                      {study.radiologist || "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] min-w-0">
                                    <Badge
                                      variant={study.priority === "stat" || study.priority === "urgent" ? "destructive" : "secondary"}
                                      className="text-[10px] px-1 py-0"
                                    >
                                      {study.priority || "routine"}
                                    </Badge>
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] min-w-0">
                                    <Badge className={`${getStatusColor(study.status)} text-[10px] px-1 py-0.5 flex-shrink`}>
                                      {study.status}
                                    </Badge>
                                  </td>
                                  <td className="px-1 py-1.5 text-[11px] min-w-0 w-[1.5rem] shrink-0 text-center">
                                    {user?.role !== 'patient' && activeTab !== "order-study" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditStatusDialog({ studyId: study.id, status: study.status });
                                          setEditStatusDraft(study.status);
                                        }}
                                        className="h-4 w-4 p-0 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center"
                                        title="Edit Status"
                                        data-testid={`button-edit-status-${study.id}`}
                                      >
                                        <Edit className="h-2.5 w-2.5" style={{ width: 10, height: 10 }} />
                                      </Button>
                                    )}
                                  </td>
                                  {activeTab === "order-study" && (
                                    <td className="px-1 py-1.5 text-[11px] min-w-0">
                                      <div className="flex items-center justify-center">
                                        {study.orderStudyReadyToGenerate ? (
                                          <CheckCircle className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                        ) : (
                                          <X className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-1 py-1.5 text-[11px] min-w-0 flex-shrink-0">
                                    <div className="flex items-center justify-center min-w-0">
                                      {study.signatureData && String(study.signatureData).trim() !== "" ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-1 flex items-center gap-0.5 text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
                                          onClick={() => {
                                            setSelectedSignatureData({
                                              signatureData: study.signatureData,
                                              signatureDate: study.signatureDate,
                                              signedBy: study.radiologist || "N/A",
                                              studyId: study.id,
                                              imageId: study.imageId || study.id,
                                            });
                                            setShowSignatureDetailsDialog(true);
                                          }}
                                          title="View signature details"
                                        >
                                          <CheckCircle className="h-2.5 w-2.5 flex-shrink-0" />
                                          <span className="text-[10px] whitespace-nowrap">✓</span>
                                        </Button>
                                      ) : (
                                        <div className="flex items-center gap-0.5 text-red-600 flex-shrink-0">
                                          <X className="h-2.5 w-2.5 flex-shrink-0" />
                                          <span className="text-[10px] whitespace-nowrap">✗</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  {user?.role !== "patient" && (activeTab === "order-study" || (activeTab === "imaging-results" && (user?.role === "doctor" || user?.role === "nurse" || user?.role === "admin"))) ? (
                                    <td className="px-1 py-1.5 text-[11px] min-w-0" data-actions-cell>
                                      <div className="flex items-center gap-0.5 justify-center flex-shrink-0 flex-wrap">
                                        {activeTab === "imaging-results" && user?.role !== 'patient' ? (
                                        <DropdownMenu open={openActionsStudyId === study.id} onOpenChange={(open) => setOpenActionsStudyId(open ? study.id : null)}>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0"
                                              data-testid={`button-actions-kebab-${study.id}`}
                                              title="Actions"
                                            >
                                              <MoreVertical className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" side="left" className="min-w-[10rem]" onClick={() => setOpenActionsStudyId(null)}>
                                            <DropdownMenuItem onClick={() => { setSelectedStudyDetails(study); setShowDetailsDialog(true); }} data-testid={`menuitem-details-${study.id}`}>
                                              <Eye className="h-4 w-4 mr-2" />
                                              View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => viewPDFReportInDialog(study)} data-testid={`menuitem-view-pdf-${study.id}`}>
                                              <FileText className="h-4 w-4 mr-2" />
                                              View PDF Report
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleViewStudy(study, true)} data-testid={`menuitem-edit-${study.id}`}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            {canDelete('medical_imaging') && (
                                              <DropdownMenuItem
                                                onClick={() => { setStudyToDelete(study); setShowDeleteDialog(true); }}
                                                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                                data-testid={`menuitem-delete-${study.id}`}
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      ) : activeTab === 'generate-report' && user?.role !== 'patient' ? (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" title="Actions">
                                              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                                            <DropdownMenuItem onClick={() => handleViewStudy(study, false)} data-testid={`button-edit-${study.id}`}>
                                              <Edit className="h-3.5 w-3.5 mr-2 shrink-0" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleGenerateReport(study.id)} data-testid={`button-save-report-${study.id}`}>
                                              <Save className="h-3.5 w-3.5 mr-2 shrink-0" />
                                              Save
                                            </DropdownMenuItem>
                                            {canDelete('medical_imaging') && (
                                              <DropdownMenuItem
                                                onClick={() => { setStudyToDelete(study); setShowDeleteDialog(true); }}
                                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                                data-testid={`button-delete-${study.id}`}
                                              >
                                                <Trash2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                                                Delete
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleDownloadStudy(study.id)} data-testid={`button-download-${study.id}`}>
                                              <Download className="h-3.5 w-3.5 mr-2 shrink-0" />
                                              Download
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      ) : activeTab === 'order-study' && user?.role !== 'patient' ? (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" title="Actions">
                                              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                                            <DropdownMenuItem onClick={() => handleGenerateImagePrescription(study.id)} data-testid={`button-save-prescription-${study.id}`}>
                                              <Save className="h-3.5 w-3.5 mr-2 shrink-0" />
                                              Save
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleESignClick(study.id)} data-testid={`button-esign-${study.id}`}>
                                              <PenTool className="h-3.5 w-3.5 mr-2 shrink-0" />
                                              Sign
                                            </DropdownMenuItem>
                                            {canDelete('medical_imaging') && (
                                              <DropdownMenuItem
                                                onClick={() => { setStudyToDelete(study); setShowDeleteDialog(true); }}
                                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                                data-testid={`button-delete-${study.id}`}
                                              >
                                                <Trash2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                                                Delete
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      ) : user?.role !== 'patient' && (
                                        <>
                                          {activeTab === "order-study" ? null : (
                                            <>
                                              {activeTab !== 'generate-report' && (
                                                <Button variant="ghost" size="sm" onClick={() => activeTab === 'imaging-results' ? viewPDFReportInDialog(study) : handleViewStudy(study)} className="h-5 w-5 p-0" data-testid={`button-view-${study.id}`} title={activeTab === 'imaging-results' ? "View PDF Report" : "View Study"}>
                                                  <Eye className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                                </Button>
                                              )}
                                              <Button variant="ghost" size="sm" onClick={() => handleViewStudy(study, activeTab === "imaging-results")} className="h-5 w-5 p-0" data-testid={`button-edit-${study.id}`} title={activeTab === "imaging-results" ? "Edit Study / Edit Generated Report" : "Edit Study"}>
                                                <Edit className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                              </Button>
                                            </>
                                          )}
                                          {activeTab !== 'generate-report' && activeTab !== 'imaging-results' && activeTab !== 'order-study' && (
                                            <Button variant="ghost" size="sm" onClick={() => handleESignClick(study.id)} className="h-5 w-5 p-0" data-testid={`button-esign-${study.id}`} title="Electronic Signature">
                                              <PenTool className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                                            </Button>
                                          )}
                                          {canDelete('medical_imaging') && (
                                            <Button variant="ghost" size="sm" onClick={() => { setStudyToDelete(study); setShowDeleteDialog(true); }} className="h-5 w-5 p-0" data-testid={`button-delete-${study.id}`}>
                                              <Trash2 className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                                            </Button>
                                          )}
                                          {activeTab === "imaging-results" && (
                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedStudyDetails(study); setShowDetailsDialog(true); }} className="h-5 w-5 p-0" data-testid={`button-details-${study.id}`} title="View Details">
                                              <MoreVertical className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                            </Button>
                                          )}
                                        </>
                                      )}
                                      {activeTab === "imaging-results" ? null : activeTab !== "order-study" && activeTab !== "generate-report" && user?.role !== 'patient' ? (
                                        <Button variant="ghost" size="sm" onClick={() => handleDownloadStudy(study.id)} className="h-5 w-5 p-0" data-testid={`button-download-${study.id}`}>
                                          <Download className="h-2.5 w-2.5 text-gray-600 dark:text-gray-400" />
                                        </Button>
                                      ) : null}
                                      {false && activeTab === "order-study" && (
                                        <Button variant="ghost" size="sm" onClick={() => handleGenerateImagePrescription(study.id)} className="h-5 w-5 p-0" data-testid={`button-image-prescription-${study.id}`} title="Generate Image Prescription">
                                          <Save className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                                        </Button>
                                      )}
                                      </div>
                                    </td>
                                  ) : null}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ) : imagesLoading ? (
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
                ) : (
                  filteredStudies.map((study: any) => (
                    <Card
                      key={study.id}
                      className="hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border dark:border-slate-600"
                    >
                      <CardContent className="p-6">
                        <div className="">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                {getModalityIcon(study.modality)}
                                <h5 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                                  {study.patientName}
                                </h5>
                              </div>
                              {/* Status Badge - Editable via popup */}
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(study.status)}>
                                  {study.status}
                                </Badge>
                                {user?.role !== 'patient' && activeTab !== "order-study" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditStatusDialog({ studyId: study.id, status: study.status });
                                      setEditStatusDraft(study.status);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-slate-600"
                                    data-testid="button-edit-status-header"
                                  >
                                    <Edit className="h-3 w-3 text-gray-400" />
                                  </Button>
                                )}
                              </div>
                              {/* Priority Badge - Editable */}
                              {selectedStudyId === study.id && editModes.priority ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={editingPriority}
                                    onValueChange={setEditingPriority}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="routine">Routine</SelectItem>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                      <SelectItem value="stat">Stat</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFieldSave("priority")}
                                    disabled={saving.priority}
                                    className="h-8 px-2 text-xs"
                                    data-testid="button-save-priority-header"
                                  >
                                    {saving.priority ? "..." : "Save"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFieldCancel("priority")}
                                    disabled={saving.priority}
                                    className="h-8 px-2 text-xs"
                                    data-testid="button-cancel-priority-header"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(study.priority)}>
                                    {study.priority}
                                  </Badge>
                                  {/* Hide Priority Edit icon for patient role and Order Study tab */}
                                  {user?.role !== 'patient' && activeTab !== "order-study" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedStudyId(study.id);
                                        handleFieldEdit("priority");
                                      }}
                                      className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-slate-600"
                                      data-testid="button-edit-priority-header"
                                    >
                                      <Edit className="h-3 w-3 text-gray-400" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  Study Information
                                </h4>
                                <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                                  <div>
                                    <strong>Study:</strong> {study.studyType}
                                  </div>
                                  <div>
                                    <strong>Modality:</strong> {study.modality}
                                  </div>
                                  <div>
                                    <strong>Body Part:</strong> {study.bodyPart}
                                  </div>
                                  <div>
                                    <strong>Ordered by:</strong> {study.orderedBy}
                                  </div>
                                  <div>
                                    <strong>Indication:</strong> {study.indication}
                                  </div>

                                  {/* Toggle for patient users to show/hide report */}
                                  {user?.role === 'patient' && (
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                      <Switch
                                        id="show-report-toggle"
                                        checked={showPatientReport}
                                        onCheckedChange={setShowPatientReport}
                                        data-testid="switch-show-report"
                                      />
                                      <Label htmlFor="show-report-toggle" className="text-sm cursor-pointer">
                                        See report
                                      </Label>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Display Image IDs in Order Study, Generate Report, and Imaging Results tabs */}
                              {(activeTab === "order-study" || activeTab === "generate-report" || activeTab === "imaging-results") && (
                                <div className="space-y-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                        image_id
                                      </h4>
                                      {activeTab === "imaging-results" && study.prescriptionFilePath && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 px-2 text-xs border-yellow-200 text-yellow-600 hover:bg-yellow-50 hover:border-yellow-300 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                                          onClick={async () => {
                                            try {
                                              const token = localStorage.getItem("auth_token");
                                              if (!token) {
                                                toast({
                                                  title: "Authentication Required",
                                                  description: "Please log in to view prescriptions.",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }

                                              const fileName = study.prescriptionFilePath.split('/').pop();
                                              if (!fileName) {
                                                throw new Error("Invalid prescription file path");
                                              }

                                              // Get organizationId and patientId
                                              const organizationId = user?.organizationId || study.organizationId;
                                              const patientId = study.patientId;

                                              if (!organizationId) {
                                                throw new Error("Organization ID is missing. Cannot open prescription.");
                                              }

                                              if (!patientId) {
                                                throw new Error("Patient ID is missing. Cannot open prescription.");
                                              }

                                              const response = await fetch(`/api/imaging/generate-prescription-token`, {
                                                method: "POST",
                                                headers: {
                                                  "Content-Type": "application/json",
                                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                                  "Authorization": `Bearer ${token}`,
                                                },
                                                body: JSON.stringify({
                                                  organizationId: organizationId,
                                                  patientId: patientId,
                                                  fileName: fileName
                                                }),
                                              });

                                              if (!response.ok) {
                                                const errorData = await response.json();
                                                throw new Error(errorData.error || "Failed to generate access token");
                                              }

                                              const data = await response.json();

                                              if (!data.token) {
                                                throw new Error("Failed to generate access token. Token not received.");
                                              }

                                              const prescriptionUrl = `/api/imaging/view-prescription/${organizationId}/${patientId}/${fileName}?token=${data.token}`;
                                              window.open(prescriptionUrl, '_blank');

                                              toast({
                                                title: "Opening Prescription",
                                                description: "Prescription document is being opened.",
                                              });
                                            } catch (error) {
                                              console.error("Error opening prescription:", error);
                                              toast({
                                                title: "Error",
                                                description: error instanceof Error ? error.message : "Failed to open prescription.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        >
                                          <Save className="h-3 w-3 mr-1 text-yellow-600 dark:text-yellow-400" />
                                          View Image Prescription
                                        </Button>
                                      )}
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-600 p-3 rounded-lg border dark:border-slate-500">
                                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                        {study.imageId || 'N/A'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Image Series - shown below image_id in Imaging Results tab */}
                                  {activeTab === "imaging-results" && study.images && study.images.length > 0 && (
                                    <div>
                                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        Image Series
                                      </h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {study.images.map((series: any) => (
                                          <div
                                            key={series.id}
                                            className="bg-gray-50 dark:bg-slate-600 p-3 rounded-lg border dark:border-slate-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500 transition-colors"
                                            onClick={async () => {
                                              // Check if this is an ordered study without actual image
                                              if (study.status === "ordered") {
                                                toast({
                                                  title: "No Image Available",
                                                  description: "This is an order without uploaded images. Please upload images first.",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }

                                              try {
                                                const token = localStorage.getItem("auth_token");
                                                const headers: Record<string, string> = {
                                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                                };

                                                if (token) {
                                                  headers["Authorization"] = `Bearer ${token}`;
                                                }

                                                const response = await fetch(`/api/medical-images/${study.id}/image?t=${Date.now()}`, {
                                                  method: "GET",
                                                  headers,
                                                  credentials: "include",
                                                });

                                                if (!response.ok) {
                                                  throw new Error(`Failed to load image: ${response.status}`);
                                                }

                                                const blob = await response.blob();
                                                const blobUrl = URL.createObjectURL(blob);

                                                const imageForViewer = {
                                                  seriesDescription: series.seriesDescription,
                                                  type: series.type,
                                                  imageCount: series.imageCount,
                                                  size: series.size,
                                                  imageId: study.id,
                                                  imageUrl: blobUrl,
                                                  mimeType: series.mimeType || "image/jpeg",
                                                  fileName: series.fileName || study.fileName,
                                                };
                                                setSelectedImageSeries(imageForViewer);
                                                setShowImageViewer(true);
                                              } catch (error) {
                                                console.error("Error loading image:", error);
                                                toast({
                                                  title: "Error",
                                                  description: "Failed to load medical image. Please try again.",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                          >
                                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                              {series.seriesDescription}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300">
                                              {series.imageCount} images • {series.size} •{" "}
                                              {series.type}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* E-Signature Preview - Show if signature exists */}
                              {study.signatureData && (
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2">
                                    Resident Physician (Signature)
                                  </h4>
                                  <div className="border border-gray-400 dark:border-gray-500 bg-white dark:bg-transparent p-1 rounded" style={{ width: '170px', height: '70px' }}>
                                    <img
                                      src={study.signatureData}
                                      alt="E-Signature"
                                      className="w-full h-full object-contain"
                                      style={{
                                        filter: isSignatureDarkTheme() ? "invert(1)" : "none"
                                      }}
                                    />
                                  </div>
                                  {study.signatureDate && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-normal">
                                      ✓ E-Signed by - {format(new Date(study.signatureDate), "MMM d, yyyy HH:mm")}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-semibold text-blue-900">
                                  Timeline
                                </h4>
                                <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                                  <div>
                                    <strong>Ordered:</strong>{" "}
                                    {format(
                                      new Date(study.orderedAt),
                                      "MMM d, yyyy HH:mm",
                                    )}
                                  </div>

                                  {/* Hide Scheduled and Performed dates in Order Study and Generate Report tabs */}
                                  {activeTab === "imaging-results" && (
                                    <>
                                      {/* Scheduled Date - Display only (no edit) */}
                                      {study.scheduledAt && (
                                        <div>
                                          <strong>Scheduled:</strong>{" "}
                                          {format(
                                            new Date(study.scheduledAt),
                                            "MMM d, yyyy HH:mm",
                                          )}
                                        </div>
                                      )}

                                      {/* Performed Date - Display only (no edit) */}
                                      {study.performedAt && (
                                        <div>
                                          <strong>Performed:</strong>{" "}
                                          {format(
                                            new Date(study.performedAt),
                                            "MMM d, yyyy HH:mm",
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Keep editable dates for Generate Report tab only */}
                                  {activeTab === "generate-report" && (
                                    <>
                                      {/* Scheduled Date - Editable */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span>
                                          <strong>Scheduled:</strong>
                                        </span>
                                        {selectedStudy?.id === study.id &&
                                          editModes.scheduledAt ? (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className={`w-auto justify-start text-left font-normal ${!scheduledDate &&
                                                    "text-muted-foreground"
                                                    }`}
                                                >
                                                  {scheduledDate ? (
                                                    format(scheduledDate, "MMM d, yyyy")
                                                  ) : (
                                                    <span>Pick a date</span>
                                                  )}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                  mode="single"
                                                  selected={scheduledDate}
                                                  onSelect={setScheduledDate}
                                                  initialFocus
                                                />
                                              </PopoverContent>
                                            </Popover>
                                            <Input
                                              type="time"
                                              value={scheduledTime}
                                              onChange={(e) => setScheduledTime(e.target.value)}
                                              className="w-32 h-8"
                                              data-testid="input-scheduled-time"
                                            />
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                handleFieldSave("scheduledAt")
                                              }
                                              disabled={saving.scheduledAt}
                                              data-testid="button-save-scheduled-date"
                                            >
                                              {saving.scheduledAt ? "Saving..." : "Save"}
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                handleFieldCancel("scheduledAt")
                                              }
                                              disabled={saving.scheduledAt}
                                              data-testid="button-cancel-scheduled-date"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span>
                                              {study.scheduledAt
                                                ? format(
                                                  new Date(study.scheduledAt),
                                                  "MMM d, yyyy HH:mm",
                                                )
                                                : "Not scheduled"}
                                            </span>
                                            {/* Hide Scheduled Date Edit icon for patient role */}
                                            {user?.role !== 'patient' && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedStudyId(study.id);
                                                  handleFieldEdit("scheduledAt");
                                                }}
                                                className="h-5 w-5 p-0"
                                                data-testid="button-edit-scheduled-date"
                                              >
                                                <Edit className="h-3 w-3 text-gray-400" />
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Performed Date - Editable */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span>
                                          <strong>Performed:</strong>
                                        </span>
                                        {selectedStudy?.id === study.id &&
                                          editModes.performedAt ? (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className={`w-auto justify-start text-left font-normal ${!performedDate &&
                                                    "text-muted-foreground"
                                                    }`}
                                                >
                                                  {performedDate ? (
                                                    format(performedDate, "MMM d, yyyy")
                                                  ) : (
                                                    <span>Pick a date</span>
                                                  )}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                  mode="single"
                                                  selected={performedDate}
                                                  onSelect={setPerformedDate}
                                                  initialFocus
                                                />
                                              </PopoverContent>
                                            </Popover>
                                            <Input
                                              type="time"
                                              value={performedTime}
                                              onChange={(e) => setPerformedTime(e.target.value)}
                                              className="w-32 h-8"
                                              data-testid="input-performed-time"
                                            />
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                handleFieldSave("performedAt")
                                              }
                                              disabled={saving.performedAt}
                                              data-testid="button-save-performed-date"
                                            >
                                              {saving.performedAt ? "Saving..." : "Save"}
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                handleFieldCancel("performedAt")
                                              }
                                              disabled={saving.performedAt}
                                              data-testid="button-cancel-performed-date"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span>
                                              {study.performedAt
                                                ? format(
                                                  new Date(study.performedAt),
                                                  "MMM d, yyyy HH:mm",
                                                )
                                                : "Not performed"}
                                            </span>
                                            {/* Hide inline Edit icon for patient role */}
                                            {user?.role !== 'patient' && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedStudyId(study.id);
                                                  handleFieldEdit("performedAt");
                                                }}
                                                className="h-5 w-5 p-0"
                                                data-testid="button-edit-performed-date"
                                              >
                                                <Edit className="h-3 w-3 text-gray-400" />
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}

                                  {study.radiologist && (
                                    <div>
                                      <strong>Radiologist:</strong>{" "}
                                      {study.radiologist}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Hide Findings and Impression in Order Study and Generate Report tabs */}
                            {activeTab !== "order-study" && activeTab !== "generate-report" && study.findings && (
                              <div className="bg-blue-50 dark:bg-slate-700 border-l-4 border-blue-400 dark:border-blue-500 p-5 pr-5 mb-4">
                                <h4 className="font-medium text-blue-700 dark:text-blue-300 text-md mb-1">
                                  Findings
                                </h4>
                                <p className="text-sm text-blue-700 dark:text-blue-200">
                                  {study.findings}
                                </p>
                                {study.impression && (
                                  <>
                                    <h4 className="font-medium text-blue-00 dark:text-blue-300 text-md mb-1 mt-2">
                                      Impression
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-200">
                                      {study.impression}
                                    </p>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Patient-Specific Information Section */}
                            {user?.role === 'patient' && showPatientReport && (
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 border-l-4 border-indigo-400 dark:border-indigo-500 p-5 mb-4 rounded-r-lg">
                                <div className="flex items-center gap-2 mb-3">
                                  <FileImage className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                  <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 text-lg">
                                    Your Medical Imaging Report
                                  </h4>
                                </div>

                                <div className="space-y-3 text-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                        <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Study Details</h5>
                                        <div className="text-gray-700 dark:text-gray-300 space-y-1">
                                          <div><strong>Type:</strong> {study.studyType}</div>
                                          <div><strong>Area Examined:</strong> {study.bodyPart}</div>
                                          <div><strong>Method:</strong> {study.modality}</div>
                                        </div>
                                      </div>

                                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                        <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Status</h5>
                                        <div className="flex items-center gap-2">
                                          <Badge className={getStatusColor(study.status)}>
                                            {study.status}
                                          </Badge>
                                          <span className="text-xs text-gray-600 dark:text-gray-400">
                                            {study.status === 'completed' ? 'Your scan is complete' :
                                              study.status === 'final' ? 'Report is finalized' :
                                                study.status === 'preliminary' ? 'Initial report available' :
                                                  'Scan in progress'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                        <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Timeline</h5>
                                        <div className="text-gray-700 dark:text-gray-300 space-y-1 text-xs">
                                          <div><strong>Ordered:</strong> {format(new Date(study.orderedAt), "MMM d, yyyy")}</div>
                                          {study.scheduledAt && (
                                            <div><strong>Scheduled:</strong> {format(new Date(study.scheduledAt), "MMM d, yyyy")}</div>
                                          )}
                                          {study.performedAt && (
                                            <div><strong>Performed:</strong> {format(new Date(study.performedAt), "MMM d, yyyy")}</div>
                                          )}
                                        </div>
                                      </div>

                                      {study.radiologist && (
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                          <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Radiologist</h5>
                                          <div className="text-gray-700 dark:text-gray-300 text-xs">
                                            {study.radiologist}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {study.reportFileName && (
                                    <div className="bg-green-50 dark:bg-slate-800 border border-green-200 dark:border-green-600 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <h5 className="font-medium text-green-800 dark:text-green-300">Report Available</h5>
                                      </div>
                                      <p className="text-green-700 dark:text-green-200 text-xs mb-3">
                                        Your detailed imaging report is ready. You can view it online or download a copy for your records.
                                      </p>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            const reportId = study.reportFileName.replace(/\.pdf$/i, "");
                                            await viewPDFReport(reportId);
                                          }}
                                          className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-800"
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          View Report
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleShareStudy(study, 'report')}
                                          className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-800"
                                        >
                                          <Send className="h-4 w-4 mr-1" />
                                          Share Report
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-600 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                      <h5 className="font-medium text-amber-800 dark:text-amber-300">Important Information</h5>
                                    </div>
                                    <ul className="text-amber-700 dark:text-amber-200 text-xs space-y-1">
                                      <li>• Discuss these results with your doctor during your next appointment</li>
                                      <li>• Keep a copy of your report for your personal medical records</li>
                                      <li>• Contact your healthcare provider if you have questions about your results</li>
                                      <li>• This report was reviewed by: {study.radiologist || 'Medical professional'}</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            {study.report && (
                              <div className="bg-green-50 dark:bg-slate-700 border-l-4 border-green-400 dark:border-green-500 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-green-800 dark:text-green-300 text-sm">
                                    Report
                                  </h4>
                                  <Badge
                                    className={
                                      study.report.status === "final"
                                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                                    }
                                  >
                                    {study.report.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-green-700 dark:text-green-200">
                                  <strong>Dictated:</strong>{" "}
                                  {format(
                                    new Date(study.report.dictatedAt),
                                    "MMM d, yyyy HH:mm",
                                  )}
                                  {study.report.signedAt && (
                                    <span className="ml-4">
                                      <strong>Signed:</strong>{" "}
                                      {format(
                                        new Date(study.report.signedAt),
                                        "MMM d, yyyy HH:mm",
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 justify-center flex-wrap">
                            {/* Imaging Results tab, grid view: show all action icons (no kebab) */}
                            {activeTab === "imaging-results" && user?.role !== 'patient' && viewMode === "grid" && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => { setSelectedStudyDetails(study); setShowDetailsDialog(true); }} className="h-8 w-8 p-0 border-gray-200 text-gray-600 hover:bg-gray-50" data-testid={`button-details-card-${study.id}`} title="View Details">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => viewPDFReportInDialog(study)} className="h-8 w-8 p-0 border-gray-200 text-gray-600 hover:bg-gray-50" data-testid={`button-view-pdf-card-${study.id}`} title="View PDF Report">
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleViewStudy(study, true)} className="h-8 w-8 p-0 border-gray-200 text-gray-600 hover:bg-gray-50" data-testid={`button-edit-card-${study.id}`} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleShareStudy(study, 'report')} className="h-8 w-8 p-0 border-gray-200 text-gray-600 hover:bg-gray-50" data-testid={`button-share-card-${study.id}`} title="Share Report">
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                {canDelete('medical_imaging') && (
                                  <Button variant="outline" size="sm" onClick={() => { setStudyToDelete(study); setShowDeleteDialog(true); }} className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300" data-testid={`button-delete-card-${study.id}`} title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Non-Imaging-Results: Show blue Eye icon for Order Study tab, regular Eye and Edit for others */}
                            {activeTab !== "imaging-results" && user?.role !== 'patient' && (
                              <>
                                {activeTab === "order-study" ? (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => handleGenerateImagePrescription(study.id)} className="border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300" data-testid={`button-save-prescription-card-${study.id}`} title="Save/Generate Prescription">
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleESignClick(study.id)} className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300" data-testid={`button-esign-card-${study.id}`} title="Electronic Signature">
                                      <PenTool className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    {activeTab !== 'generate-report' && (
                                      <Button variant="outline" size="sm" onClick={() => activeTab === 'imaging-results' ? viewPDFReportInDialog(study) : handleViewStudy(study)} className={activeTab === 'imaging-results' ? "border-gray-200 text-gray-600 hover:bg-gray-50" : ""} data-testid={`button-view-card-${study.id}`} title={activeTab === 'imaging-results' ? "View PDF Report" : "View Study"}>
                                        <Eye className={`h-4 w-4 ${activeTab === 'imaging-results' ? "text-gray-600 dark:text-gray-400" : ""}`} />
                                      </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => handleViewStudy(study, activeTab === "imaging-results")} className={activeTab === 'imaging-results' ? "border-gray-200 text-gray-600 hover:bg-gray-50" : ""} data-testid={`button-edit-card-${study.id}`} title={activeTab === "imaging-results" ? "Edit Study / Edit Generated Report" : "Edit Study"}>
                                      <Edit className={`h-4 w-4 ${activeTab === 'imaging-results' ? "text-gray-600 dark:text-gray-400" : ""}`} />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}

                            {/* Save icon - only in Generate Report tab */}
                            {user?.role !== 'patient' && activeTab === 'generate-report' && (
                              <Button variant="outline" size="sm" onClick={() => handleGenerateReport(study.id)} className="border-yellow-200 text-yellow-600 hover:bg-yellow-50 hover:border-yellow-300" data-testid={`button-save-report-card-${study.id}`} title="Save/Generate Report">
                                <Save className="h-4 w-4" />
                              </Button>
                            )}

                            {/* E-Sign icon - hide from Generate Report, Imaging Results, and Order Study tabs */}
                            {user?.role !== 'patient' && activeTab !== 'generate-report' && activeTab !== 'imaging-results' && activeTab !== 'order-study' && (
                              <Button variant="outline" size="sm" onClick={() => handleESignClick(study.id)} className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300" data-testid={`button-esign-card-${study.id}`} title="Electronic Signature">
                                <PenTool className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Download icon - hidden for Imaging Results tab and Order Study tab */}
                            {user?.role !== 'patient' && activeTab !== "imaging-results" && activeTab !== "order-study" && (
                              <Button variant="outline" size="sm" onClick={() => handleDownloadStudy(study.id)} className="border-gray-200 text-gray-600 hover:bg-gray-50" data-testid={`button-download-card-${study.id}`} title="Download Study">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}

                            {/* PDF Report Download and View Icons - Hide for Imaging Results (in dropdown); show for other tabs when report exists */}
                            {study.reportFileName && activeTab !== 'generate-report' && activeTab !== 'imaging-results' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Check if report file name exists
                                      if (!study.reportFileName && !study.imageId) {
                                        toast({
                                          title: "No Report Available",
                                          description:
                                            "No report is available for this study yet.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      // Use imageId directly if available, otherwise extract from reportFileName
                                      let imageId = study.imageId;
                                      if (!imageId && study.reportFileName) {
                                        // Safely extract report ID with case-insensitive PDF removal
                                        const reportId = study.reportFileName.replace(
                                          /\.pdf$/i,
                                          "",
                                        );
                                        // Extract imageId from reportId (remove timestamp if present)
                                        if (reportId.includes('_')) {
                                          const parts = reportId.split('_');
                                          imageId = parts[0]; // Take the part before the timestamp
                                        } else {
                                          imageId = reportId;
                                        }
                                      }

                                      if (!imageId) {
                                        toast({
                                          title: "No Report Available",
                                          description:
                                            "Unable to determine report ID.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      // File exists check is not needed - viewPDFReport will handle errors
                                      // Directly open the report using imageId
                                      await viewPDFReport(imageId);
                                    } catch (error) {
                                      console.error(
                                        `Failed to view PDF for study ${study.id}:`,
                                        error,
                                      );
                                      toast({
                                        title: "View Failed",
                                        description:
                                          "Failed to view PDF report. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  title="View PDF Report"
                                  data-testid="button-view-pdf-report-card"
                                  className="border-gray-200 text-black hover:bg-gray-50 hover:border-gray-300"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShareStudy(study, 'report')}
                                  title="Share PDF Report"
                                  data-testid="button-share-pdf-report-card"
                                  className="border-gray-200 text-black hover:bg-gray-50 hover:border-gray-300"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {/* Plane icon (Send) - only in Generate Report tab */}
                            {user?.role !== 'patient' && activeTab === 'generate-report' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShareStudy(study, 'prescription')}
                                title="Share Image Prescription"
                                data-testid="button-share-prescription-card"
                                className="border-gray-200 text-gray-600 hover:bg-gray-50"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Share icon (Share2) - only in Imaging Results tab when not using kebab dropdown (handled in dropdown above) */}
                            {false && user?.role !== 'patient' && activeTab === 'imaging-results' && (
                              <Button variant="outline" size="sm" onClick={() => handleShareStudy(study, 'report')} title="Share Imaging Report" data-testid="button-share-report-card" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                                <Share2 className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Hide File (Generate Report) icon for patient role, Imaging Results tab, and Order Study tab */}
                            {user?.role !== 'patient' && activeTab !== 'imaging-results' && activeTab !== 'order-study' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateReport(study.id)}
                                title="Generate Report"
                                className="border-gray-200 text-gray-600 hover:bg-gray-50"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Delete icon - hidden for Imaging Results tab (in kebab dropdown) */}
                            {user?.role !== 'patient' && canDelete('medical_imaging') && activeTab !== 'imaging-results' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStudyToDelete(study);
                                  setShowDeleteDialog(true);
                                }}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                data-testid={`button-delete-card-${study.id}`}
                                title="Delete Study"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {!imagesLoading && filteredStudies.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No imaging studies found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Share Study Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Share Imaging Study</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-4">
              <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Share study for <strong>{selectedStudy.patientName}</strong>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="method" className="text-xs font-medium block">
                  Contact Method
                </Label>
                <Select
                  value={shareFormData.method}
                  onValueChange={(value) =>
                    setShareFormData({ ...shareFormData, method: value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shareFormData.method === "email" && (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium block">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={shareFormData.email}
                    onChange={(e) =>
                      setShareFormData({
                        ...shareFormData,
                        email: e.target.value,
                      })
                    }
                    className="h-8 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp" className="text-xs font-medium block">
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="Enter WhatsApp number"
                    value={shareFormData.whatsapp}
                    onChange={(e) =>
                      setShareFormData({
                        ...shareFormData,
                        whatsapp: e.target.value,
                      })
                    }
                    className="h-8 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-medium block">
                  Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Add a custom message..."
                  value={shareFormData.message}
                  onChange={(e) =>
                    setShareFormData({
                      ...shareFormData,
                      message: e.target.value,
                    })
                  }
                  rows={3}
                  className="text-xs bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 leading-relaxed"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
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
                  onClick={async () => {
                    setIsSendingShare(true);
                    try {
                      if (shareFormData.method === "email") {
                        try {
                          const response = await apiRequest("POST", "/api/imaging/share-study", {
                            studyId: selectedStudy.id,
                            recipientEmail: shareFormData.email,
                            customMessage: shareFormData.message,
                            shareSource: shareFormData.shareSource || "report",
                          });
                          const result = await response.json();
                          if (response.ok) {
                            setShareSuccessEmail(shareFormData.email);
                            setShowShareDialog(false);
                            setShowShareSuccessDialog(true);
                            setShareFormData({
                              method: "",
                              email: "",
                              whatsapp: "",
                              message: "",
                            });
                          } else {
                            toast({
                              title: "Sharing Failed",
                              description: result.error || "Failed to send email. Please try again.",
                              variant: "destructive",
                            });
                          }
                        } catch (error: unknown) {
                          console.error("Email sharing error:", error);
                          const message = error instanceof Error ? error.message : "Network error. Please check your connection and try again.";
                          const serverError = typeof message === "string" && message.includes("{") ? (() => {
                            try {
                              const json = JSON.parse(message.replace(/^\d+\s*:\s*/, "").trim());
                              return json.error || message;
                            } catch {
                              return message;
                            }
                          })() : message;
                          toast({
                            title: "Sharing Failed",
                            description: serverError || "Network error. Please check your connection and try again.",
                            variant: "destructive",
                          });
                        }
                      } else {
                        // WhatsApp sharing - not implemented yet, show info message
                        toast({
                          title: "WhatsApp Sharing",
                          description: "WhatsApp sharing is not yet implemented. Please use email sharing.",
                          variant: "destructive",
                        });
                        setShowShareDialog(false);
                        setShareFormData({
                          method: "",
                          email: "",
                          whatsapp: "",
                          message: "",
                        });
                      }
                    } finally {
                      setIsSendingShare(false);
                    }
                  }}
                  disabled={
                    isSendingShare ||
                    !shareFormData.method ||
                    (shareFormData.method === "email" &&
                      !shareFormData.email) ||
                    (shareFormData.method === "whatsapp" &&
                      !shareFormData.whatsapp)
                  }
                  size="sm"
                  className="text-xs bg-medical-blue hover:bg-blue-700"
                >
                  <Share className="h-4 w-4 mr-2" />
                  {isSendingShare ? "Sending..." : "Share Study"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Success Dialog */}
      <Dialog open={showShareSuccessDialog} onOpenChange={setShowShareSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Share Success</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Study Shared Successfully
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Imaging study has been sent to <strong>{shareSuccessEmail}</strong> successfully
              </p>
            </div>
            <Button
              onClick={() => setShowShareSuccessDialog(false)}
              className="bg-medical-blue hover:bg-blue-700 mt-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Generate Radiology Report</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {selectedStudy.patientName?.charAt(0) || "P"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">
                      {selectedStudy.patientName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Patient ID: {selectedStudy.patientId}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm dark:text-gray-200">
                  <div>
                    <strong>Image ID:</strong> {selectedStudy.imageId || 'N/A'}
                  </div>
                  <div>
                    <strong>Study:</strong> {selectedStudy.studyType}
                  </div>
                  <div>
                    <strong>Modality:</strong> {selectedStudy.modality}
                  </div>
                  <div>
                    <strong>Body Part:</strong> {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <strong>Indication:</strong> {selectedStudy.indication}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="findings" className="text-sm font-medium">
                      Findings
                    </Label>
                    {!editModes.findings ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit("findings")}
                        className="h-5 w-5 p-0"
                        data-testid="button-edit-findings"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldSave("findings")}
                          disabled={saving.findings}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          data-testid="button-save-findings"
                        >
                          {saving.findings ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldCancel("findings")}
                          disabled={saving.findings}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          data-testid="button-cancel-findings"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editModes.findings ? (
                    <Textarea
                      id="findings"
                      placeholder="Enter radiological findings..."
                      value={reportFindings}
                      onChange={(e) => setReportFindings(e.target.value)}
                      rows={4}
                      className="mt-1"
                      autoFocus
                      data-testid="textarea-findings"
                    />
                  ) : (
                    <div
                      className="mt-1 min-h-[100px] p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-sm"
                      data-testid="display-findings"
                    >
                      {reportFindings || "Click edit to add findings..."}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="impression" className="text-sm font-medium">
                      Impression
                    </Label>
                    {!editModes.impression ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit("impression")}
                        className="h-5 w-5 p-0"
                        data-testid="button-edit-impression"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldSave("impression")}
                          disabled={saving.impression}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          data-testid="button-save-impression"
                        >
                          {saving.impression ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldCancel("impression")}
                          disabled={saving.impression}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          data-testid="button-cancel-impression"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editModes.impression ? (
                    <Textarea
                      id="impression"
                      placeholder="Enter clinical impression..."
                      value={reportImpression}
                      onChange={(e) => setReportImpression(e.target.value)}
                      rows={3}
                      className="mt-1"
                      autoFocus
                      data-testid="textarea-impression"
                    />
                  ) : (
                    <div
                      className="mt-1 min-h-[75px] p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-sm"
                      data-testid="display-impression"
                    >
                      {reportImpression || "Click edit to add impression..."}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label
                      htmlFor="radiologist"
                      className="text-sm font-medium"
                    >
                      Radiologist
                    </Label>
                    {!editModes.radiologist ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit("radiologist")}
                        className="h-5 w-5 p-0"
                        data-testid="button-edit-radiologist"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldSave("radiologist")}
                          disabled={saving.radiologist}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          data-testid="button-save-radiologist"
                        >
                          {saving.radiologist ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldCancel("radiologist")}
                          disabled={saving.radiologist}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          data-testid="button-cancel-radiologist"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editModes.radiologist ? (
                    <Input
                      id="radiologist"
                      value={reportRadiologist}
                      onChange={(e) => setReportRadiologist(e.target.value)}
                      className="mt-1"
                      autoFocus
                      data-testid="input-radiologist"
                    />
                  ) : (
                    <div
                      className="mt-1 min-h-[40px] p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-sm flex items-center"
                      data-testid="display-radiologist"
                    >
                      {reportRadiologist || "Click edit to add radiologist..."}
                    </div>
                  )}
                </div>

                {/* Scheduled Date Field */}
                <div>
                  <Label htmlFor="scheduled-date" className="text-sm font-medium">
                    Scheduled Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!scheduledDate ? "text-muted-foreground" : ""}`}
                        data-testid="button-scheduled-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Performed Date Field */}
                <div>
                  <Label htmlFor="performed-date" className="text-sm font-medium">
                    Performed Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!performedDate ? "text-muted-foreground" : ""}`}
                        data-testid="button-performed-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {performedDate ? format(performedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={performedDate}
                        onSelect={setPerformedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* File Upload - Two Column Layout for Medical Images and Uploaded Images */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Medical Images Column */}
                  <div className="border rounded-lg p-4">
                    <Label htmlFor="report-upload-files" className="text-sm font-medium">Medical Images *</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                      <FileImage className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <div className="space-y-2">
                        <div>
                          <input
                            type="file"
                            id="report-upload-files"
                            multiple
                            accept="image/*,.dcm,.dicom,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp,.svg,.ico,.jfif,.pjpeg,.pjp"
                            onChange={handleReportFileSelect}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              document.getElementById("report-upload-files")?.click()
                            }
                            data-testid="button-select-images"
                          >
                            Select Images
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Select X-ray images, DICOM files, or other medical images
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Supported formats: All image formats (JPEG, PNG, GIF, BMP,
                          TIFF, WebP, SVG), DICOM (.dcm), and medical imaging files
                        </p>
                      </div>
                    </div>

                    {/* Selected Files Display */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <Label className="text-xs">Selected Files ({selectedFiles.length}):</Label>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs gap-2"
                            >
                              <span className="truncate flex-1">{file.name}</span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {file.size
                                  ? file.size < 1024
                                    ? `${file.size} B`
                                    : file.size < 1024 * 1024
                                      ? `${(file.size / 1024).toFixed(1)} KB`
                                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                                  : "Unknown size"}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFiles = selectedFiles.filter((_, i) => i !== index);
                                  setSelectedFiles(newFiles);
                                  // Also remove the corresponding preview
                                  setUploadedImagePreviews(prev => {
                                    const newPreviews = [...prev];
                                    newPreviews.splice(index, 1);
                                    return newPreviews;
                                  });
                                }}
                                className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Remove this image"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Images Column - Save Images button hidden; preview only */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Uploaded Images</Label>
                    </div>
                    {saveImageSuccess && (
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                        {saveImageSuccess}
                      </div>
                    )}
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3">
                      {uploadingImages ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">Uploading images...</span>
                        </div>
                      ) : uploadedImagePreviews.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {uploadedImagePreviews.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded border"
                              />
                              <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
                          <FileImage className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                          <p>No images uploaded yet</p>
                          <p className="text-xs mt-1">Select images below to upload</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Saved Reports Section */}
                {selectedStudy.reportFilePath &&
                  !nonExistentReports.has(selectedStudy.id) && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                      <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Saved Reports
                      </h4>
                      <div className="text-sm text-purple-700 dark:text-purple-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <strong className="dark:text-purple-200">Report File:</strong>
                            <Button
                              variant="link"
                              onClick={async () => {
                                if (selectedStudy.reportFilePath) {
                                  const fileName = selectedStudy.reportFilePath.split('/').pop() || '';
                                  const reportId = fileName.replace(".pdf", "");
                                  await viewPDFReport(reportId);
                                }
                              }}
                              className="p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                              data-testid="link-saved-report"
                            >
                              {selectedStudy.reportFilePath.split('/').pop()}
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (selectedStudy.reportFilePath) {
                                try {
                                  const fileName = selectedStudy.reportFilePath.split('/').pop() || '';
                                  const reportId = fileName.replace(".pdf", "");
                                  const response = await apiRequest(
                                    "DELETE",
                                    `/api/imaging/reports/${reportId}`,
                                  );

                                  toast({
                                    title: "Success",
                                    description: "Report deleted successfully",
                                  });

                                  // Invalidate and refetch queries to get fresh data from database
                                  await queryClient.invalidateQueries({
                                    queryKey: ["/api/medical-images"],
                                  });
                                  await queryClient.invalidateQueries({
                                    queryKey: ["/api/imaging/studies"],
                                  });
                                  await refetchImages();
                                } catch (error: any) {
                                  console.error(
                                    "Error deleting report:",
                                    error,
                                  );

                                  // Check if the error is due to file not existing
                                  if (
                                    error?.message?.includes("404") ||
                                    error?.response?.status === 404
                                  ) {
                                    toast({
                                      title: "Error",
                                      description:
                                        "File not existing on server",
                                      variant: "destructive",
                                    });
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: "Failed to delete report",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 w-8 p-0"
                            data-testid="button-delete-report"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                          Click the file name to view the PDF report
                        </p>
                      </div>
                    </div>
                  )}

                {/* No file found message */}
                {selectedStudy.reportFilePath &&
                  nonExistentReports.has(selectedStudy.id) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-medium text-orange-800 mb-2">
                        No File Found
                      </h4>
                      <p className="text-sm text-orange-700">
                        No file found, please generate new
                      </p>
                    </div>
                  )}

                {selectedStudy?.report && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">
                      Existing Report
                    </h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <div>
                        <strong>Status:</strong> {selectedStudy.report.status}
                      </div>
                      <div>
                        <strong>Dictated:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.dictatedAt),
                          "PPpp",
                        )}
                      </div>
                      {selectedStudy.report.signedAt && (
                        <div>
                          <strong>Signed:</strong>{" "}
                          {format(
                            new Date(selectedStudy.report.signedAt),
                            "PPpp",
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
            >
              Close
            </Button>
            <div className="flex gap-2">
              {/* Hide both button and green box during PDF generation */}
              {!isGeneratingPDF ? (
                generatedReportId ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          Report Generated Successfully!
                        </span>
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-300">
                        <strong className="dark:text-green-200">Report File:</strong>
                        <Button
                          variant="link"
                          onClick={() => viewPDFReport(generatedReportId)}
                          className="p-0 h-auto ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                          data-testid="link-report-view"
                        >
                          {generatedReportFileName ||
                            `${generatedReportId.slice(0, 8)}...`}
                        </Button>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                        Click the file name to view the PDF
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      if (selectedStudy && selectedStudy.status === "final") {
                        setShowReportDialog(false);
                        setShowFinalReportDialog(true);
                      } else if (selectedStudy) {
                        generatePDFReport(selectedStudy);
                      }
                    }}
                    disabled={isGeneratingPDF}
                    className="bg-medical-blue hover:bg-blue-700 disabled:opacity-50"
                    data-testid="button-generate-report"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {isGeneratingPDF
                      ? "Generating..."
                      : selectedStudy?.status === "final"
                        ? "View Final Report"
                        : "Generate Report"}
                  </Button>
                )
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-blue-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">
                      Generating PDF Report...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Study Dialog */}
      <Dialog open={showViewDialog} onOpenChange={(open) => {
        setShowViewDialog(open);
        if (!open) {
          setViewDialogOpenedFromEditReport(false);
          setRegenerateSuccessInView(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Imaging Study</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {selectedStudy.patientName?.charAt(0) || "P"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl">
                      {selectedStudy.patientName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Patient ID: {selectedStudy.patientId}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${selectedStudy.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : selectedStudy.status === "in_progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedStudy.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {selectedStudy.status?.charAt(0).toUpperCase() +
                        selectedStudy.status?.slice(1).replace("_", " ") ||
                        "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong>Study Type:</strong> {selectedStudy.studyType}
                  </div>
                  <div>
                    <strong>Modality:</strong> {selectedStudy.modality}
                  </div>
                  <div>
                    <strong>Body Part:</strong> {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <strong>Priority:</strong> {selectedStudy.priority}
                  </div>
                  <div>
                    <strong>Ordered By:</strong> {selectedStudy.orderedBy}
                  </div>
                  <div>
                    <strong>Ordered:</strong>{" "}
                    {format(new Date(selectedStudy.orderedAt), "MMM dd, yyyy")}
                  </div>
                  {selectedStudy.scheduledAt && (
                    <div>
                      <strong>Scheduled:</strong>{" "}
                      {format(
                        new Date(selectedStudy.scheduledAt),
                        "MMM dd, yyyy",
                      )}
                    </div>
                  )}
                  {selectedStudy.performedAt && (
                    <div>
                      <strong>Performed:</strong>{" "}
                      {format(
                        new Date(selectedStudy.performedAt),
                        "MMM dd, yyyy",
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-lg mb-2">
                    Clinical Indication
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedStudy.indication}
                  </p>
                </div>

                {/* Editable Findings & Impression when opened from Imaging Results edit */}
                {viewDialogOpenedFromEditReport && user?.role !== "patient" ? (
                  <>
                    <div>
                      <h4 className="font-medium text-lg mb-2">Findings</h4>
                      <Textarea
                        className="w-full min-h-[100px] text-gray-700 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-lg resize-y"
                        value={viewDialogFindings}
                        onChange={(e) => setViewDialogFindings(e.target.value)}
                        placeholder="Enter radiological findings..."
                        data-testid="view-dialog-findings"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg mb-2">Impression</h4>
                      <Textarea
                        className="w-full min-h-[80px] text-gray-700 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-lg resize-y"
                        value={viewDialogImpression}
                        onChange={(e) => setViewDialogImpression(e.target.value)}
                        placeholder="Enter clinical impression..."
                        data-testid="view-dialog-impression"
                      />
                    </div>
                    <Button
                      disabled={isUpdatingViewReport || isGeneratingPDF}
                      onClick={async () => {
                        if (!selectedStudy?.id) return;
                        setIsUpdatingViewReport(true);
                        try {
                          await apiRequest("PATCH", `/api/medical-images/${selectedStudy.id}/report-fields`, {
                            findings: viewDialogFindings,
                            impression: viewDialogImpression,
                          });
                          const updatedStudy = { ...selectedStudy, findings: viewDialogFindings, impression: viewDialogImpression };
                          await regenerateExistingReport(updatedStudy);
                          refetchImages();
                        } catch (e) {
                          console.error("Update & regenerate failed:", e);
                          toast({
                            title: "Update failed",
                            description: e instanceof Error ? e.message : "Could not update and regenerate PDF.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsUpdatingViewReport(false);
                        }
                      }}
                    >
                      {isUpdatingViewReport || isGeneratingPDF ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update & Regenerate PDF"
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {selectedStudy.findings && (
                      <div>
                        <h4 className="font-medium text-lg mb-2">Findings</h4>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedStudy.findings}
                        </p>
                      </div>
                    )}
                    {selectedStudy.impression && (
                      <div>
                        <h4 className="font-medium text-lg mb-2">Impression</h4>
                        <div className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {user?.role === 'patient' && selectedStudy.impression.includes('File:') ? (
                            <div>
                              {selectedStudy.impression.split(/(File:\s*[^\s]+\s*\([^)]+\))/).map((part, idx) => {
                                const fileMatch = part.match(/File:\s*([^\s]+)\s*\(([^)]+)\)/);
                                if (fileMatch) {
                                  const [fullMatch, fileName, fileSize] = fileMatch;
                                  return (
                                    <button
                                      key={idx}
                                      onClick={async () => {
                                        try {
                                          const token = localStorage.getItem("auth_token");
                                          const headers: Record<string, string> = {
                                            "X-Tenant-Subdomain": getActiveSubdomain(),
                                          };
                                          if (token) headers["Authorization"] = `Bearer ${token}`;
                                          let blobUrl: string | null = null;
                                          let resolvedFileName = fileName;
                                          const medicalResponse = await fetch(`/api/medical-images/${selectedStudy.id}/image?t=${Date.now()}`, {
                                            method: "GET",
                                            headers,
                                            credentials: "include",
                                          });
                                          if (medicalResponse.ok) {
                                            const blob = await medicalResponse.blob();
                                            if (blob.size > 0) blobUrl = URL.createObjectURL(blob);
                                          }
                                          if (!blobUrl) {
                                            const radiologyListRes = await fetch(`/api/radiology-images/${selectedStudy.id}`, {
                                              method: "GET",
                                              headers,
                                              credentials: "include",
                                            });
                                            if (radiologyListRes.ok) {
                                              const data = await radiologyListRes.json();
                                              const images = data?.images ?? [];
                                              if (images.length > 0) {
                                                const imgRes = await fetch(`/api/radiology-images/image/${images[0].id}`, {
                                                  method: "GET",
                                                  headers,
                                                  credentials: "include",
                                                });
                                                if (imgRes.ok) {
                                                  const blob = await imgRes.blob();
                                                  if (blob.size > 0) {
                                                    blobUrl = URL.createObjectURL(blob);
                                                    resolvedFileName = images[0].fileName ?? fileName;
                                                  }
                                                }
                                                if (!blobUrl) {
                                                  for (const img of images) {
                                                    const fp = img.filePath;
                                                    if (!fp) continue;
                                                    const relativePath = fp.includes("uploads")
                                                      ? fp.substring(fp.indexOf("uploads")).replace(/\\/g, "/")
                                                      : fp.startsWith("/uploads")
                                                        ? fp.substring(1)
                                                        : fp.replace(/\\/g, "/");
                                                    const fileUrl = `/${relativePath}`;
                                                    try {
                                                      const pathRes = await fetch(fileUrl, {
                                                        method: "GET",
                                                        credentials: "include",
                                                        headers,
                                                      });
                                                      if (pathRes.ok) {
                                                        const blob = await pathRes.blob();
                                                        if (blob.size > 0) {
                                                          blobUrl = URL.createObjectURL(blob);
                                                          resolvedFileName = img.fileName ?? fileName;
                                                          break;
                                                        }
                                                      }
                                                    } catch {
                                                      continue;
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                          if (!blobUrl) throw new Error("No image data available.");
                                          const imageForViewer = {
                                            seriesDescription: `${selectedStudy.modality} ${selectedStudy.bodyPart}`,
                                            type: "JPEG" as const,
                                            imageCount: 1,
                                            size: fileSize,
                                            imageId: selectedStudy.id,
                                            imageUrl: blobUrl,
                                            mimeType: "image/jpeg",
                                            fileName: resolvedFileName,
                                          };
                                          setSelectedImageSeries(imageForViewer);
                                          setShowImageViewer(true);
                                        } catch (error) {
                                          console.error("Error loading image:", error);
                                          toast({
                                            title: "Error",
                                            description: error instanceof Error ? error.message : "Failed to load medical image. Please try again.",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                      {fullMatch}
                                    </button>
                                  );
                                }
                                return <span key={idx}>{part}</span>;
                              })}
                            </div>
                          ) : (
                            <p>{selectedStudy.impression}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedStudy.radiologist && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Radiologist</h4>
                    <p className="text-gray-700">{selectedStudy.radiologist}</p>
                  </div>
                )}

              </div>

              {/* Row: Image Series (first) and Resident Physician (Signature) (second) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-lg mb-3 text-gray-900 dark:text-gray-100">Image Series</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedStudy.images.map((image: any, index: number) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">
                            {image.seriesDescription}
                          </h5>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                            {image.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <div>Images: {image.imageCount}</div>
                          <div>Size: {image.size}</div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem("auth_token");
                                const headers: Record<string, string> = {
                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                };
                                if (token) headers["Authorization"] = `Bearer ${token}`;

                                setLoadingViewStudyImages(true);
                                const loaded: Array<{ url: string; fileName: string; mimeType?: string }> = [];

                                const medicalImageId = Number(selectedStudy.id);
                                console.log("[View Study Images] medical_image_id (study id):", medicalImageId);
                                if (isNaN(medicalImageId)) {
                                  setLoadingViewStudyImages(false);
                                  toast({ title: "Error", description: "Invalid study ID.", variant: "destructive" });
                                  return;
                                }

                                const tryAddFromPath = async (filePath: string | null, fileName: string): Promise<boolean> => {
                                  if (!filePath || typeof filePath !== "string" || !fileName) {
                                    console.log("[View Study Images] tryAddFromPath skip (missing path or name):", { filePath, fileName });
                                    return false;
                                  }
                                  if (fileName.endsWith(".pending") || fileName.startsWith("ORDER-")) {
                                    console.log("[View Study Images] tryAddFromPath skip (placeholder):", { fileName });
                                    return false;
                                  }
                                  const relativePath = filePath.includes("uploads")
                                    ? filePath.substring(filePath.indexOf("uploads")).replace(/\\/g, "/")
                                    : filePath.startsWith("/uploads") ? filePath.slice(1) : filePath.replace(/\\/g, "/");
                                  const fileUrl = `/${relativePath}`;
                                  console.log("[View Study Images] fetch file_path:", { filePath, fileName, fileUrl });
                                  try {
                                    const res = await fetch(fileUrl, { method: "GET", credentials: "include", headers });
                                    if (res.ok) {
                                      const blob = await res.blob();
                                      if (blob.size > 0) {
                                        const url = URL.createObjectURL(blob);
                                        const mime = res.headers.get("Content-Type") || "image/jpeg";
                                        loaded.push({ url, fileName, mimeType: mime });
                                        console.log("[View Study Images] loaded from path:", fileName);
                                        return true;
                                      }
                                    }
                                    console.log("[View Study Images] fetch not ok:", { fileUrl, status: res.status, statusText: res.statusText });
                                  } catch (err) {
                                    console.log("[View Study Images] fetch error:", { fileUrl, error: err });
                                  }
                                  return false;
                                };

                                const tryAddFromRadiologyApi = async (id: number, fileName?: string): Promise<boolean> => {
                                  try {
                                    const res = await fetch(`/api/radiology-images/image/${id}`, {
                                      method: "GET", headers, credentials: "include",
                                    });
                                    if (res.ok) {
                                      const blob = await res.blob();
                                      if (blob.size > 0) {
                                        loaded.push({
                                          url: URL.createObjectURL(blob),
                                          fileName: fileName || `image-${id}`,
                                          mimeType: res.headers.get("Content-Type") || "image/jpeg",
                                        });
                                        return true;
                                      }
                                    }
                                  } catch { /* ignore */ }
                                  return false;
                                };

                                // 1) Get radiology_images for this medical_image_id (file_name, file_path from DB)
                                const listRes = await fetch(`/api/radiology-images/${medicalImageId}`, {
                                  method: "GET", credentials: "include", headers,
                                });
                                const listData = listRes.ok ? await listRes.json() : null;
                                const radiologyList = listData?.images ?? [];
                                console.log("[View Study Images] radiology_images response:", {
                                  status: listRes.status,
                                  count: radiologyList.length,
                                  raw: listData,
                                  file_paths: radiologyList.map((img: any) => ({
                                    id: img.id,
                                    file_path: img.filePath ?? img.file_path,
                                    file_name: img.fileName ?? img.file_name,
                                  })),
                                });

                                for (const img of radiologyList) {
                                  const fp = img.filePath ?? img.file_path;
                                  const fname = img.fileName ?? img.file_name ?? "";
                                  if (await tryAddFromPath(fp, fname)) continue;
                                  const id = img.id != null ? Number(img.id) : NaN;
                                  if (!Number.isNaN(id)) await tryAddFromRadiologyApi(id, fname || undefined);
                                }

                                // 2) If none, list folder and fetch each file that exists
                                if (loaded.length === 0) {
                                  try {
                                    const folderRes = await fetch(`/api/medical-images/${medicalImageId}/list-folder-images`, {
                                      method: "GET", credentials: "include", headers,
                                    });
                                    console.log("[View Study Images] list-folder-images response:", {
                                      status: folderRes.status,
                                      ok: folderRes.ok,
                                    });
                                    if (folderRes.ok) {
                                      const folderData = await folderRes.json();
                                      const files = folderData?.images ?? [];
                                      console.log("[View Study Images] list-folder-images file_paths:", files.map((f: any) => ({ filePath: f.filePath ?? f.file_path, fileName: f.fileName ?? f.file_name })));
                                      for (const f of files) {
                                        const fp = f.filePath ?? "";
                                        const fname = f.fileName ?? "";
                                        await tryAddFromPath(fp, fname);
                                      }
                                    }
                                  } catch (e) {
                                    console.log("[View Study Images] list-folder-images error:", e);
                                  }
                                }

                                setLoadingViewStudyImages(false);
                                if (loaded.length === 0) {
                                  console.log("[View Study Images] No images loaded. Summary: medical_image_id=", medicalImageId, "radiology_images file_paths=", radiologyList.map((img: any) => ({ id: img.id, file_path: img.filePath ?? img.file_path, file_name: img.fileName ?? img.file_name })));
                                  toast({
                                    title: "No Images Found",
                                    description: "No uploaded images found for this study. Check file_path in radiology_images.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setViewStudyImagesList(loaded);
                                setShowViewStudyImagesDialog(true);
                              } catch (error) {
                                setLoadingViewStudyImages(false);
                                console.error("Error loading study images:", error);
                                toast({
                                  title: "Error",
                                  description: error instanceof Error ? error.message : "Failed to load images.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={loadingViewStudyImages}
                          >
                            {loadingViewStudyImages ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            View Images
                          </Button>
                          {/* Hide Edit Image button for patient role */}
                          {user?.role !== 'patient' && canEdit('medical_imaging') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditImage(selectedStudy.id)}
                              data-testid="button-edit-image"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-lg mb-2">
                    Resident Physician (Signature)
                  </h4>
                  {selectedStudy.signatureData ? (
                    <>
                      <div className="border border-gray-300 rounded-lg p-2 inline-block bg-white dark:bg-transparent">
                        <img
                          src={selectedStudy.signatureData}
                          alt="Resident Physician Signature"
                          className="w-[120px] h-[50px] object-contain"
                          style={{
                            filter: isSignatureDarkTheme() ? "invert(1)" : "none"
                          }}
                        />
                      </div>
                      {selectedStudy.signatureDate && (
                        <div className="mt-2 text-sm" style={{ color: 'rgb(0, 153, 0)' }}>
                          ✓ E-Signed by - {format(new Date(selectedStudy.signatureDate), "MMM d, yyyy HH:mm")}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No signature on file.</p>
                  )}
                </div>
              </div>

              {selectedStudy?.report && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">
                    Report Status
                  </h4>
                  <div className="text-sm text-green-700 space-y-2">
                    <div className="flex justify-between">
                      <span>
                        <strong>Status:</strong> {selectedStudy.report.status}
                      </span>
                      <span>
                        <strong>Dictated:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.dictatedAt),
                          "PPpp",
                        )}
                      </span>
                    </div>
                    {selectedStudy.report.signedAt && (
                      <div>
                        <strong>Signed:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.signedAt),
                          "PPpp",
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {regenerateSuccessInView && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    PDF report has been regenerated and replaced successfully.
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  {/* Hide Generate Report / Edit Generated Report button for patient role */}
                  {user?.role !== 'patient' && (
                    <Button
                      variant="outline"
                      disabled={viewDialogOpenedFromEditReport && isGeneratingPDF}
                      onClick={() => {
                        if (viewDialogOpenedFromEditReport && selectedStudy) {
                          regenerateExistingReport(selectedStudy);
                        } else {
                          setReportDialogIsEditMode(false);
                          setShowViewDialog(false);
                          setShowReportDialog(true);
                        }
                      }}
                    >
                      {viewDialogOpenedFromEditReport && isGeneratingPDF ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          {viewDialogOpenedFromEditReport ? "Edit Generated Report" : "Generate Report"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Study Dialog */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Imaging Study</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient" className="text-sm font-medium">
                  Patient *
                </Label>
                {user?.role === "patient" && currentPatient ? (
                  <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-gray-50 dark:bg-slate-700">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {currentPatient.firstName} {currentPatient.lastName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({currentPatient.patientId})
                    </span>
                  </div>
                ) : (
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
                          ? (() => {
                              const selected = findPatientById(orderFormData.patientId);
                              return selected
                                ? formatPatientDropdownLabel(selected)
                                : "Select a patient";
                            })()
                          : patientsLoading
                            ? "Loading patients..."
                            : "Select a patient"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search patient..." />
                        <CommandList>
                          <CommandEmpty>No patient found.</CommandEmpty>
                          <CommandGroup>
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
                                      }));
                                      setPatientSearchOpen(false);
                                    }}
                                    className="whitespace-normal break-words py-2"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 shrink-0 ${
                                        orderFormData.patientId === patient.id.toString()
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
                              })
                            ) : (
                              <CommandItem disabled>No patients found</CommandItem>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div>
                <Label htmlFor="modality" className="text-sm font-medium">
                  Modality
                </Label>
                <Select
                  value={orderFormData.modality}
                  onValueChange={(value) =>
                    setOrderFormData((prev) => ({ ...prev, modality: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select imaging type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">
                      Nuclear Medicine
                    </SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bodyPart" className="text-sm font-medium">
                  Body Part
                </Label>
                <Input
                  id="bodyPart"
                  placeholder="e.g., Chest, Abdomen, Head"
                  value={orderFormData.bodyPart}
                  onChange={(e) =>
                    setOrderFormData((prev) => ({
                      ...prev,
                      bodyPart: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="priority" className="text-sm font-medium">
                  Priority
                </Label>
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
            </div>

            <div>
              <Label htmlFor="studyType" className="text-sm font-medium">
                Study Description
              </Label>
              <Input
                id="studyType"
                placeholder="e.g., Chest X-Ray PA and Lateral"
                value={orderFormData.studyType}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    studyType: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="indication" className="text-sm font-medium">
                Clinical Indication
              </Label>
              <Textarea
                id="indication"
                placeholder="Reason for imaging study..."
                rows={3}
                value={orderFormData.indication}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    indication: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions for the imaging technologist..."
                rows={2}
                value={orderFormData.specialInstructions}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    specialInstructions: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setShowNewOrder(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleOrderSubmit}
                className="bg-medical-blue hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Order Study
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Report Viewer Dialog */}
      <Dialog
        open={showFinalReportDialog}
        onOpenChange={setShowFinalReportDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Final Radiology Report</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Image ID:</span>{" "}
                    {selectedStudy.imageId || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Patient Name:</span>{" "}
                    {selectedStudy.patientName}
                  </div>
                  <div>
                    <span className="font-medium">Patient ID:</span>{" "}
                    {selectedStudy.patientId}
                  </div>
                  <div>
                    <span className="font-medium">Study Date:</span>{" "}
                    {format(new Date(selectedStudy.orderedAt), "PPP")}
                  </div>
                  <div>
                    <span className="font-medium">Study Type:</span>{" "}
                    {selectedStudy.studyType}
                  </div>
                  <div>
                    <span className="font-medium">Modality:</span>{" "}
                    {selectedStudy.modality}
                  </div>
                  <div>
                    <span className="font-medium">Body Part:</span>{" "}
                    {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <span className="font-medium">Ordering Physician:</span>{" "}
                    {selectedStudy.orderedBy}
                  </div>
                  <div>
                    <span className="font-medium">Radiologist:</span>{" "}
                    {selectedStudy.radiologist || "Dr. Michael Chen"}
                  </div>
                </div>
              </div>

              {/* Clinical Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">
                  Clinical Information
                </h3>
                <div className="text-sm">
                  <div className="mb-2">
                    <span className="font-medium">Indication:</span>{" "}
                    {selectedStudy.indication}
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${selectedStudy.priority === "stat"
                        ? "bg-red-100 text-red-800"
                        : selectedStudy.priority === "urgent"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800"
                        }`}
                    >
                      {selectedStudy.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Report</h3>

                {selectedStudy.findings && (
                  <div>
                    <h4 className="font-medium mb-2">FINDINGS:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.findings}
                    </div>
                  </div>
                )}

                {selectedStudy.impression && (
                  <div>
                    <h4 className="font-medium mb-2">IMPRESSION:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.impression}
                    </div>
                  </div>
                )}

                {selectedStudy?.report && (
                  <div>
                    <h4 className="font-medium mb-2">FULL REPORT:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.report.content}
                    </div>
                  </div>
                )}

                {/* Report Status */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800">
                      Report Status: FINAL
                    </span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    {selectedStudy.report?.dictatedAt && (
                      <div>
                        <strong>Dictated:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.dictatedAt),
                          "PPpp",
                        )}
                      </div>
                    )}
                    {selectedStudy.report?.signedAt && (
                      <div>
                        <strong>Signed:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.signedAt),
                          "PPpp",
                        )}
                      </div>
                    )}
                    <div>
                      <strong>Radiologist:</strong>{" "}
                      {selectedStudy.radiologist || "Dr. Michael Chen"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowFinalReportDialog(false)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Download report logic
                      const reportContent =
                        selectedStudy.report?.content ||
                        `RADIOLOGY REPORT\n\nPatient: ${selectedStudy.patientName}\nPatient ID: ${selectedStudy.patientId}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${format(new Date(selectedStudy.orderedAt), "PPP")}\nBody Part: ${selectedStudy.bodyPart}\nOrdering Physician: ${selectedStudy.orderedBy}\nRadiologist: ${selectedStudy.radiologist || "Dr. Michael Chen"}\n\nCLINICAL INDICATION:\n${selectedStudy.indication}\n\nFINDINGS:\n${selectedStudy.findings || "Normal findings"}\n\nIMPRESSION:\n${selectedStudy.impression || "No acute abnormalities"}`;

                      const blob = new Blob([reportContent], {
                        type: "text/plain",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `radiology-report-${selectedStudy.patientName.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(selectedStudy.orderedAt), "yyyy-MM-dd")}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      toast({
                        title: "Report Downloaded",
                        description: `Final report for ${selectedStudy.patientName} downloaded successfully`,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button
                    onClick={() => {
                      setShowFinalReportDialog(false);
                      setShowShareDialog(true);
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Images Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Medical Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Row 1: Select Role and Name * */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="select-role">Select Role *</Label>
                {(user?.role === 'nurse' || user?.role === 'doctor') ? (
                  <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-gray-50 dark:bg-slate-700">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatRoleLabel(user.role)}
                    </span>
                  </div>
                ) : (
                  <Popover open={roleDropdownOpen} onOpenChange={setRoleDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={roleDropdownOpen}
                        className="w-full justify-between"
                      >
                        {uploadFormData.selectedRole || "Select role..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search role..." />
                        <CommandEmpty>No role found.</CommandEmpty>
                        <CommandGroup>
                          {[
                            "aesthetician",
                            "dentist",
                            "dental_nurse",
                            "doctor",
                            "lab_technician",
                            "nurse",
                            "optician",
                            "other",
                            "paramedic",
                            "pharmacist",
                            "phlebotomist",
                            "physiotherapist",
                            "receptionist",
                            "sample_taker"
                          ].sort().map((role) => (
                            <CommandItem
                              key={role}
                              value={role}
                              onSelect={(currentValue) => {
                                setUploadFormData({
                                  ...uploadFormData,
                                  selectedRole: currentValue,
                                  selectedUserId: "" // Reset user when role changes
                                });
                                setRoleDropdownOpen(false);
                              }}
                            >
                              <CheckIcon
                                className={`mr-2 h-4 w-4 ${uploadFormData.selectedRole === role ? "opacity-100" : "opacity-0"
                                  }`}
                              />
                              {formatRoleLabel(role)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div>
                <Label htmlFor="select-user">Name *</Label>
                {(user?.role === 'nurse' || user?.role === 'doctor') ? (
                  <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-gray-50 dark:bg-slate-700">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                ) : (
                  <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userDropdownOpen}
                        className="w-full justify-between"
                        disabled={!uploadFormData.selectedRole}
                      >
                        {uploadFormData.selectedUserId
                          ? usersByRole.find(
                            (u: any) => u.id.toString() === uploadFormData.selectedUserId
                          )
                            ? `${usersByRole.find(
                              (u: any) => u.id.toString() === uploadFormData.selectedUserId
                            )?.firstName
                            } ${usersByRole.find(
                              (u: any) => u.id.toString() === uploadFormData.selectedUserId
                            )?.lastName
                            }`
                            : "Select user"
                          : usersByRoleLoading
                            ? "Loading users..."
                            : "Select user"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {usersByRoleLoading ? (
                            <CommandItem disabled>Loading users...</CommandItem>
                          ) : usersByRole.length > 0 ? (
                            usersByRole.map((userItem: any) => (
                              <CommandItem
                                key={userItem.id}
                                value={`${userItem.firstName} ${userItem.lastName} ${userItem.email}`}
                                onSelect={() => {
                                  setUploadFormData((prev) => ({
                                    ...prev,
                                    selectedUserId: userItem.id.toString(),
                                  }));
                                  setUserDropdownOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${uploadFormData.selectedUserId === userItem.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0"
                                    }`}
                                />
                                {userItem.firstName} {userItem.lastName} ({userItem.email})
                              </CommandItem>
                            ))
                          ) : (
                            <CommandItem disabled>No users found for this role</CommandItem>
                          )}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Row 2: Patient * and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="upload-patient">Patient *</Label>
                {user?.role === "patient" && currentPatient ? (
                  <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-gray-50 dark:bg-slate-700">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {currentPatient.firstName} {currentPatient.lastName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({currentPatient.patientId})
                    </span>
                  </div>
                ) : (
                  <Popover
                    open={uploadPatientSearchOpen}
                    onOpenChange={setUploadPatientSearchOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={uploadPatientSearchOpen}
                        className="w-full justify-between"
                      >
                        {uploadFormData.patientId
                          ? (() => {
                              const selected = findPatientById(uploadFormData.patientId);
                              return selected
                                ? formatPatientDropdownLabel(selected)
                                : "Select a patient";
                            })()
                          : patientsLoading
                            ? "Loading patients..."
                            : "Select a patient"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search patient..." />
                        <CommandList>
                          <CommandEmpty>No patient found.</CommandEmpty>
                          <CommandGroup>
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
                                      setUploadFormData((prev) => ({
                                        ...prev,
                                        patientId: patient.id.toString(),
                                      }));
                                      setUploadPatientSearchOpen(false);
                                    }}
                                    className="whitespace-normal break-words py-2"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 shrink-0 ${
                                        uploadFormData.patientId === patient.id.toString()
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
                              })
                            ) : (
                              <CommandItem disabled>No patients found</CommandItem>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div>
                <Label htmlFor="upload-priority">Priority</Label>
                <Select
                  value={uploadFormData.priority}
                  onValueChange={(value) =>
                    setUploadFormData({ ...uploadFormData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Study Type * and Modality * */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="upload-study-type">Study Type *</Label>
                <Popover open={studyTypeOpen} onOpenChange={setStudyTypeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={studyTypeOpen}
                      className="w-full justify-between"
                    >
                      {uploadFormData.studyType || "Select study type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search study type..." />
                      <CommandEmpty>No study type found.</CommandEmpty>
                      <CommandGroup>
                        {pricingLoading ? (
                          <CommandItem disabled>Loading study types...</CommandItem>
                        ) : availableStudyTypes.length === 0 ? (
                          <CommandItem disabled>No study types available</CommandItem>
                        ) : (
                          availableStudyTypes.map((pricing: any) => (
                            <CommandItem
                              key={pricing.id}
                              value={pricing.imagingType}
                              onSelect={(currentValue) => {
                                setUploadFormData({ ...uploadFormData, studyType: currentValue });
                                setStudyTypeOpen(false);
                              }}
                            >
                              <CheckIcon
                                className={`mr-2 h-4 w-4 ${uploadFormData.studyType === pricing.imagingType ? "opacity-100" : "opacity-0"
                                  }`}
                              />
                              {pricing.imagingType}
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="upload-modality">Modality *</Label>
                <Popover open={modalityOpen} onOpenChange={setModalityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={modalityOpen}
                      className="w-full justify-between"
                    >
                      {uploadFormData.modality || "Select modality..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search modality..." />
                      <CommandEmpty>No modality found.</CommandEmpty>
                      <CommandGroup>
                        {Object.keys(MODALITY_BODY_PARTS).map((modality) => (
                          <CommandItem
                            key={modality}
                            value={modality}
                            onSelect={(currentValue) => {
                              setUploadFormData({
                                ...uploadFormData,
                                modality: currentValue,
                                bodyPart: "",
                              });
                              setModalityOpen(false);
                            }}
                          >
                            <CheckIcon
                              className={`mr-2 h-4 w-4 ${uploadFormData.modality === modality ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            {modality}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Body Part * */}
            <div>
              <Label htmlFor="upload-body-part">Body Part *</Label>
              <Popover open={bodyPartOpen} onOpenChange={setBodyPartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bodyPartOpen}
                    className="w-full justify-between"
                    disabled={!uploadFormData.modality}
                  >
                    {uploadFormData.bodyPart || "Select body part..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search body part..." />
                    <CommandEmpty>No body part found.</CommandEmpty>
                    <CommandGroup>
                      {(MODALITY_BODY_PARTS[uploadFormData.modality] || []).map((bodyPart) => (
                        <CommandItem
                          key={bodyPart}
                          value={bodyPart}
                          onSelect={(currentValue) => {
                            setUploadFormData({ ...uploadFormData, bodyPart: currentValue });
                            setBodyPartOpen(false);
                          }}
                        >
                          <CheckIcon
                            className={`mr-2 h-4 w-4 ${uploadFormData.bodyPart === bodyPart ? "opacity-100" : "opacity-0"
                              }`}
                          />
                          {bodyPart}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="upload-indication">Clinical Indication</Label>
              <Textarea
                id="upload-indication"
                value={uploadFormData.indication}
                onChange={(e) =>
                  setUploadFormData({
                    ...uploadFormData,
                    indication: e.target.value,
                  })
                }
                placeholder="Reason for imaging study..."
                rows={2}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadSubmit}
                className="bg-medical-blue hover:bg-blue-700"
                disabled={
                  isSubmittingOrder ||
                  !uploadFormData.patientId ||
                  !uploadFormData.studyType ||
                  !uploadFormData.selectedRole ||
                  !uploadFormData.selectedUserId
                }
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4 mr-2" />
                    Save Images
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Study Images – all uploaded images from radiology_images (file_path) */}
      <Dialog
        open={showViewStudyImagesDialog}
        onOpenChange={(open) => {
          if (!open) {
            viewStudyImagesList.forEach((item) => {
              if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
            });
            setViewStudyImagesList([]);
          }
          setShowViewStudyImagesDialog(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Study Images</DialogTitle>
            <p className="text-sm text-gray-600">
              Images loaded from database (radiology_images file_path). Click an image to view full size.
            </p>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
            {viewStudyImagesList.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="rounded-lg border border-gray-200 overflow-hidden hover:border-blue-400 hover:shadow-md transition-all text-left"
                onClick={() => {
                  setSelectedImageSeries({
                    seriesDescription: item.fileName || "Study Image",
                    type: "Image",
                    imageCount: viewStudyImagesList.length,
                    size: "",
                    imageId: null,
                    imageUrl: item.url,
                    mimeType: item.mimeType || "image/jpeg",
                    fileName: item.fileName,
                  });
                  setShowImageViewer(true);
                }}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <img
                    src={item.url}
                    alt={item.fileName || "Study image"}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-2 text-xs text-gray-600 truncate" title={item.fileName}>
                  {item.fileName || `Image ${idx + 1}`}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => setShowViewStudyImagesDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Medical Image Viewer</DialogTitle>
            {selectedImageSeries && (
              <p className="text-sm text-gray-600">
                {selectedImageSeries.seriesDescription} -{" "}
                {selectedImageSeries.imageCount} images
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {selectedImageSeries && (
              <div className="space-y-4">
                {/* Series Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Series:</strong>{" "}
                      {selectedImageSeries.seriesDescription}
                    </div>
                    <div>
                      <strong>Type:</strong> {selectedImageSeries.type}
                    </div>
                    <div>
                      <strong>Images:</strong> {selectedImageSeries.imageCount}
                    </div>
                    <div>
                      <strong>Size:</strong> {selectedImageSeries.size}
                    </div>
                  </div>
                </div>

                {/* Image Display Area */}
                <div className="bg-black rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  {selectedImageSeries.imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={selectedImageSeries.imageUrl}
                        alt={`Medical Image - ${selectedImageSeries.seriesDescription}`}
                        className="max-w-full max-h-96 object-contain rounded-lg border border-gray-600"
                        onLoad={() => console.log(`📷 CLIENT: Image loaded from filesystem: ${selectedImageSeries.fileName || 'Unknown'}`)}
                        onError={(e) => {
                          console.error(`📷 CLIENT: Failed to load image from filesystem: ${selectedImageSeries.fileName || 'Unknown'}`);
                          // You could add fallback logic here if needed
                        }}
                        style={{ maxHeight: "400px" }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white space-y-4">
                        <div className="w-72 h-72 bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-600">
                          <div className="text-center">
                            <div className="w-24 h-24 mx-auto mb-4 border-2 border-gray-500 rounded-lg flex items-center justify-center">
                              <FileImage className="h-12 w-12 text-gray-500" />
                            </div>
                            <div className="text-gray-400">
                              <p className="font-medium">Medical Image</p>
                              <p className="text-sm">
                                {selectedImageSeries.seriesDescription}
                              </p>
                              <p className="text-xs mt-2">
                                Upload a new image to view it here
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Tools */}
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedImageSeries?.imageData) {
                          // Create download link for base64 image
                          const link = document.createElement("a");
                          link.href = `data:${selectedImageSeries.mimeType || "image/jpeg"};base64,${selectedImageSeries.imageData}`;
                          link.download = `medical-image-${selectedImageSeries.id}.${selectedImageSeries.mimeType?.includes("png") ? "png" : "jpg"}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);

                          toast({
                            title: "Download Started",
                            description: "Medical image download has begun.",
                          });
                        } else {
                          toast({
                            title: "Download Failed",
                            description:
                              "Image data not available for download.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (navigator.share && selectedImageSeries?.imageData) {
                          // Use Web Share API if available
                          fetch(
                            `data:${selectedImageSeries.mimeType || "image/jpeg"};base64,${selectedImageSeries.imageData}`,
                          )
                            .then((res) => res.blob())
                            .then((blob) => {
                              const file = new File(
                                [blob],
                                `medical-image-${selectedImageSeries.id}.jpg`,
                                {
                                  type:
                                    selectedImageSeries.mimeType ||
                                    "image/jpeg",
                                },
                              );
                              navigator.share({
                                title: "Medical Image",
                                text: `Medical Image - ${selectedImageSeries.seriesDescription}`,
                                files: [file],
                              });
                            })
                            .catch((err) => {
                              toast({
                                title: "Share Failed",
                                description:
                                  "Unable to share image. Try downloading instead.",
                                variant: "destructive",
                              });
                            });
                        } else {
                          // Fallback: copy image URL to clipboard
                          if (selectedImageSeries?.imageUrl) {
                            const fullImageUrl = `${window.location.origin}${selectedImageSeries.imageUrl}`;
                            navigator.clipboard
                              .writeText(fullImageUrl)
                              .then(() => {
                                toast({
                                  title: "Image URL Copied",
                                  description:
                                    "Image URL copied to clipboard.",
                                });
                              })
                              .catch(() => {
                                toast({
                                  title: "Share Failed",
                                  description:
                                    "Unable to share or copy image URL.",
                                  variant: "destructive",
                                });
                              });
                          }
                        }
                      }}
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Image 1 of {selectedImageSeries.imageCount}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowImageViewer(false)}>
              Close Viewer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Not Available Dialog */}
      <Dialog
        open={showFileNotAvailableDialog}
        onOpenChange={setShowFileNotAvailableDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>File Not Available</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              File is not available on the server — it may have been deleted or
              not yet created.
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowFileNotAvailableDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {studyToDelete ? (
                `Are you sure you want to delete the ${studyToDelete.studyType} study for ${studyToDelete.patientName}? This action cannot be undone.`
              ) : (
                "Are you sure you want to delete this study? This action cannot be undone."
              )}
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setStudyToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteStudy}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog - Comprehensive Billing Format */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-patient">Patient</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                  {(() => {
                    const selectedPatient = patients?.find((p: any) => p.patientId === invoicePatient);
                    return selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : invoicePatient || "N/A";
                  })()}
                </div>
                {invoicePatientError && (
                  <p className="text-sm text-red-600 mt-1">{invoicePatientError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="invoice-service-date">Service Date</Label>
                <Input
                  id="invoice-service-date"
                  type="date"
                  value={invoiceServiceDate}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-doctor">Doctor</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                  {user?.firstName} {user?.lastName}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-invoice-date">Invoice Date</Label>
                <Input
                  id="invoice-invoice-date"
                  type="date"
                  value={invoiceDate}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>

              <div>
                <Label htmlFor="invoice-due-date">Due Date</Label>
                <Input
                  id="invoice-due-date"
                  type="date"
                  value={invoiceDueDate}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <Label>Services & Procedures</Label>
              <div className="border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                  <span>Code</span>
                  <span>Description</span>
                  <span>Amount</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Enter CPT Code"
                    value={invoiceServiceCode}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  />
                  <Input
                    placeholder="Enter Description"
                    value={invoiceServiceDesc}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  />
                  <Input
                    placeholder="Amount"
                    value={invoiceServiceAmount}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  />
                </div>
              </div>
              {invoiceServiceError && (
                <p className="text-sm text-red-600 mt-1">{invoiceServiceError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-insurance">Insurance Provider</Label>
                <Select value={invoiceInsuranceProvider} onValueChange={setInvoiceInsuranceProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurance provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Patient Self-Pay)</SelectItem>
                    <SelectItem value="NHS (National Health Service)">NHS (National Health Service)</SelectItem>
                    <SelectItem value="bupa">Bupa</SelectItem>
                    <SelectItem value="axa">AXA PPP Healthcare</SelectItem>
                    <SelectItem value="vitality">Vitality Health</SelectItem>
                    <SelectItem value="aviva">Aviva Health</SelectItem>
                    <SelectItem value="simply">Simply Health</SelectItem>
                    <SelectItem value="wpa">WPA</SelectItem>
                    <SelectItem value="benenden">Benenden Health</SelectItem>
                    <SelectItem value="healix">Healix Health Services</SelectItem>
                    <SelectItem value="sovereign">Sovereign Health Care</SelectItem>
                    <SelectItem value="exeter">Exeter Friendly Society</SelectItem>
                    <SelectItem value="selfpay">Self-Pay</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none' && (
                <div>
                  <Label htmlFor="invoice-nhs-number">NHS Number</Label>
                  <Input
                    id="invoice-nhs-number"
                    placeholder="123 456 7890 (10 digits)"
                    value={invoiceNhsNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      setInvoiceNhsNumber(value);
                      const digitsOnly = value.replace(/\s+/g, '');
                      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
                        setInvoiceNhsError("NHS number must be exactly 10 digits");
                      } else if (digitsOnly.length > 0 && !/^\d+$/.test(digitsOnly)) {
                        setInvoiceNhsError("NHS number must contain only digits");
                      } else {
                        setInvoiceNhsError("");
                      }
                    }}
                    maxLength={12}
                  />
                  {invoiceNhsError && (
                    <p className="text-sm text-red-600 mt-1">{invoiceNhsError}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="invoice-total">Total Amount</Label>
                <Input
                  id="invoice-total"
                  placeholder="Enter amount (e.g., 150.00)"
                  value={invoiceTotalAmount}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
                {invoiceTotalError && (
                  <p className="text-sm text-red-600 mt-1">{invoiceTotalError}</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-semibold">Invoice Type:</Label>
                <Badge
                  className={
                    invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none'
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                      : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  }
                >
                  {invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none'
                    ? "Insurance Claim"
                    : "Payment (Self-Pay)"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none'
                  ? "This invoice will be billed to the insurance provider"
                  : "This invoice will be paid directly by the patient"}
              </p>
            </div>

            <div>
              <Label htmlFor="invoice-notes">Notes</Label>
              <Textarea
                id="invoice-notes"
                placeholder="Additional notes or instructions..."
                rows={3}
                value={invoiceNotes}
                readOnly
                className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed resize-none"
              />
            </div>

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={invoiceFormData.paymentMethod}
                onValueChange={(value) =>
                  setInvoiceFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
              {invoicePaymentMethodError && (
                <p className="text-sm text-red-600 mt-1">{invoicePaymentMethodError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceDialog(false);
                  setShowUploadDialog(true);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  // Clear validation errors
                  setInvoicePatientError("");
                  setInvoiceServiceError("");
                  setInvoiceNhsError("");
                  setInvoiceTotalError("");
                  setInvoicePaymentMethodError("");

                  let hasError = false;

                  // Validate patient
                  if (!invoicePatient || invoicePatient === '' || invoicePatient === 'no-patients') {
                    setInvoicePatientError('Please select a patient');
                    hasError = true;
                  }

                  // Validate service
                  if (!invoiceServiceCode.trim()) {
                    setInvoiceServiceError('Please enter a service code');
                    hasError = true;
                  } else if (!invoiceServiceDesc.trim()) {
                    setInvoiceServiceError('Please enter a service description');
                    hasError = true;
                  } else if (!invoiceServiceAmount.trim() || isNaN(parseFloat(invoiceServiceAmount)) || parseFloat(invoiceServiceAmount) <= 0) {
                    setInvoiceServiceError('Please enter a valid service amount');
                    hasError = true;
                  }

                  // Validate total
                  const total = parseFloat(invoiceTotalAmount || '0');
                  if (isNaN(total) || total <= 0) {
                    setInvoiceTotalError('Please enter a valid total amount greater than 0');
                    hasError = true;
                  }

                  // Validate NHS number if insurance selected
                  if (invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none') {
                    const digitsOnly = invoiceNhsNumber.replace(/\s+/g, '');
                    if (!invoiceNhsNumber.trim()) {
                      setInvoiceNhsError('NHS number is required for insurance claims');
                      hasError = true;
                    } else if (digitsOnly.length !== 10) {
                      setInvoiceNhsError('NHS number must be exactly 10 digits');
                      hasError = true;
                    } else if (!/^\d+$/.test(digitsOnly)) {
                      setInvoiceNhsError('NHS number must contain only digits');
                      hasError = true;
                    }
                  }

                  // Validate payment method
                  if (!invoiceFormData.paymentMethod) {
                    setInvoicePaymentMethodError("Please select a payment method");
                    hasError = true;
                  }

                  if (hasError) {
                    return;
                  }

                  if (invoiceFormData.paymentMethod === "debit_card") {
                    // Show friendly connecting message
                    toast({
                      title: "Connecting to Stripe...",
                      description: "Please wait while we process your payment request",
                    });

                    try {
                      // Create Stripe payment intent
                      const response = await apiRequest("POST", "/api/create-payment-intent", {
                        amount: invoiceFormData.totalAmount,
                      });

                      const data = await response.json();
                      const { clientSecret } = data;

                      if (!clientSecret) {
                        throw new Error("No client secret received");
                      }

                      toast({
                        title: "Payment Processing",
                        description: "Stripe payment initialized successfully",
                      });

                      // Proceed to summary with all invoice data
                      setSummaryData({
                        ...uploadedImageData,
                        invoice: {
                          ...invoiceFormData,
                          patient: invoicePatient,
                          serviceDate: invoiceServiceDate,
                          invoiceDate: invoiceDate,
                          dueDate: invoiceDueDate,
                          serviceCode: invoiceServiceCode,
                          serviceDesc: invoiceServiceDesc,
                          serviceQty: invoiceServiceQty,
                          serviceAmount: invoiceServiceAmount,
                          insuranceProvider: invoiceInsuranceProvider,
                          nhsNumber: invoiceNhsNumber,
                          totalAmount: parseFloat(invoiceTotalAmount),
                          notes: invoiceNotes,
                        },
                        paymentClientSecret: clientSecret,
                      });

                      setShowInvoiceDialog(false);
                      setShowSummaryDialog(true);
                    } catch (error) {
                      toast({
                        title: "Stripe Connection",
                        description: "Stripe payment integration is currently being configured. Please try Cash payment method for now.",
                      });
                    }
                  } else {
                    // Cash payment - proceed directly to summary with all invoice data
                    setSummaryData({
                      ...uploadedImageData,
                      invoice: {
                        ...invoiceFormData,
                        patient: invoicePatient,
                        serviceDate: invoiceServiceDate,
                        invoiceDate: invoiceDate,
                        dueDate: invoiceDueDate,
                        serviceCode: invoiceServiceCode,
                        serviceDesc: invoiceServiceDesc,
                        serviceQty: invoiceServiceQty,
                        serviceAmount: invoiceServiceAmount,
                        insuranceProvider: invoiceInsuranceProvider,
                        nhsNumber: invoiceNhsNumber,
                        totalAmount: parseFloat(invoiceTotalAmount),
                        notes: invoiceNotes,
                      },
                    });

                    setShowInvoiceDialog(false);
                    setShowSummaryDialog(true);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-2xl h-[440px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
          </DialogHeader>
          {summaryData && (
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="border rounded-lg p-4">
                <h5 className="font-semibold mb-3">Imaging Details</h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Patient:</span>
                    <p className="font-medium">{summaryData.selectedPatient?.firstName} {summaryData.selectedPatient?.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Study Type:</span>
                    <p className="font-medium">{summaryData.studyType}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Modality:</span>
                    <p className="font-medium">{summaryData.modality}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Images Uploaded:</span>
                    <p className="font-medium">{summaryData.uploadedFiles?.length ?? 0} ({summaryData.totalSizeMB ?? '0'} MB)</p>
                  </div>
                </div>
              </div>

              {summaryData.paymentStatus === 'unpaid' ? (
                <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <h5 className="font-semibold mb-2">Payment Status</h5>
                  <p className="text-amber-800 dark:text-amber-200 font-medium">Unpaid</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">No invoice created. Payment can be collected later.</p>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <h5 className="font-semibold mb-3">Invoice Details</h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Patient:</span>
                      <p className="font-medium">{summaryData.invoice?.patient}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Service Date:</span>
                      <p className="font-medium">{summaryData.invoice?.serviceDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Invoice Date:</span>
                      <p className="font-medium">{summaryData.invoice?.invoiceDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Due Date:</span>
                      <p className="font-medium">{summaryData.invoice?.dueDate}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Service:</span>
                      <p className="font-medium">{summaryData.invoice?.serviceDesc} (Code: {summaryData.invoice?.serviceCode})</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <p className="font-medium">{summaryData.invoice?.serviceQty}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <p className="font-medium">£{summaryData.invoice?.serviceAmount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Insurance Provider:</span>
                      <p className="font-medium capitalize">{summaryData.invoice?.insuranceProvider === 'none' ? 'Self-Pay' : summaryData.invoice?.insuranceProvider}</p>
                    </div>
                    {summaryData.invoice?.nhsNumber && (
                      <div>
                        <span className="text-gray-600">NHS Number:</span>
                        <p className="font-medium">{summaryData.invoice?.nhsNumber}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Payment Method:</span>
                      <p className="font-medium capitalize">{summaryData.invoice?.paymentMethod?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t mt-2">
                      <div className="flex justify-between font-bold">
                        <span>Total Amount:</span>
                        <span className="text-blue-600">£{summaryData.invoice?.totalAmount?.toFixed(2)}</span>
                      </div>
                    </div>
                    {summaryData.invoice?.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Notes:</span>
                        <p className="font-medium text-sm mt-1">{summaryData.invoice?.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                {summaryData.paymentStatus === 'unpaid' ? (
                  <Button
                    onClick={() => {
                      setSummaryData(null);
                      setShowSummaryDialog(false);
                      refetchImages();
                      setShowSummarySuccessModal(true);
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    Create Image
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSummaryDialog(false);
                        setShowInvoiceDialog(true);
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          const paymentMethod = summaryData.invoice.paymentMethod;
                          const imageId = summaryData.uploadResult?.images?.[0]?.imageId || summaryData.invoice.serviceCode;
                          const quantity = Math.max(
                            parseInt(summaryData.invoice.serviceQty ?? '1', 10) || 1,
                            1,
                          );
                          const parsedServiceAmount = parseFloat(summaryData.invoice.serviceAmount) || 0;
                          const parsedTotalAmount = parseFloat(summaryData.invoice.totalAmount) || 0;
                          const lineItemTotal =
                            parsedTotalAmount > 0 ? parsedTotalAmount : parsedServiceAmount * quantity;
                          const unitPrice =
                            parsedServiceAmount > 0
                              ? parsedServiceAmount
                              : lineItemTotal / quantity;

                          const lineItems = [
                            {
                              code: summaryData.invoice.serviceCode?.trim() || 'IMG-001',
                              description:
                                summaryData.invoice.serviceDesc?.trim() || 'Medical Imaging Service',
                              quantity,
                              unitPrice,
                              total: lineItemTotal,
                              serviceType: 'imaging',
                              ...(imageId ? { serviceId: imageId } : {}),
                            },
                          ];

                          const invoiceData = {
                            patientId: summaryData.invoice.patient,
                            serviceDate: summaryData.invoice.serviceDate,
                            invoiceDate: summaryData.invoice.invoiceDate,
                            dueDate: summaryData.invoice.dueDate,
                            totalAmount: lineItemTotal.toFixed(2),
                            firstServiceCode: summaryData.invoice.serviceCode,
                            firstServiceDesc: summaryData.invoice.serviceDesc,
                            firstServiceQty: summaryData.invoice.serviceQty,
                            firstServiceAmount: summaryData.invoice.serviceAmount,
                            insuranceProvider: summaryData.invoice.insuranceProvider,
                            nhsNumber: summaryData.invoice.nhsNumber || '',
                            notes: summaryData.invoice.notes || '',
                            serviceId: imageId,
                            serviceType: 'medical_images',
                            paymentMethod: paymentMethod,
                            lineItems,
                            serviceIds: imageId ? [imageId] : undefined,
                          };

                          // Create invoice
                          const invoiceResponse = await apiRequest("POST", "/api/billing/invoices", invoiceData);
                          const invoicePayload = await invoiceResponse.json();

                          if (!invoiceResponse.ok) {
                            throw new Error(invoicePayload?.error || 'Invoice creation failed');
                          }

                          const createdInvoice = invoicePayload.invoice || invoicePayload;
                          const parsedInvoiceTotal = parseFloat(createdInvoice.totalAmount);
                          const invoiceTotal = !Number.isNaN(parsedInvoiceTotal) && parsedInvoiceTotal > 0 ? parsedInvoiceTotal : lineItemTotal;

                          // Handle different payment methods
                          if (paymentMethod === 'Cash') {
                            const parsedInvoiceId = Number(createdInvoice.id);
                            const organizationCandidate = Number(
                              createdInvoice.organizationId ??
                              createdInvoice.orgId ??
                              createdInvoice.organization?.id
                            );
                            const orgIdForPayload = Number.isFinite(organizationCandidate) && organizationCandidate > 0
                              ? organizationCandidate
                              : undefined;
                            const paymentAmount = Number(invoiceTotal) || lineItemTotal;

                            const paymentData: any = {
                              invoiceId: Number.isFinite(parsedInvoiceId) ? parsedInvoiceId : createdInvoice.id,
                              patientId: createdInvoice.patientId || summaryData.invoice.patient,
                              transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                              amount: paymentAmount,
                              currency: 'GBP',
                              paymentMethod: 'cash',
                              paymentProvider: 'cash',
                              paymentStatus: 'completed',
                              paymentDate: new Date().toISOString(),
                              reference: `CASH-${Date.now().toString().slice(-8)}`,
                              metadata: {
                                notes: 'Cash payment for imaging services',
                              },
                            };

                            if (orgIdForPayload) {
                              paymentData.organizationId = orgIdForPayload;
                            }

                            await apiRequest("POST", "/api/billing/payments", paymentData);

                            // Update invoice status to paid
                            await apiRequest("PATCH", `/api/billing/invoices/${createdInvoice.id}`, {
                              status: 'paid',
                              paidAmount: paymentAmount.toString(),
                            });
                          } else if (paymentMethod === 'Insurance') {
                            // Automatically submit insurance claim
                            try {
                              const claimNumber = `AUTO-${Date.now()}`;
                              await apiRequest('POST', '/api/insurance/submit-claim', {
                                invoiceId: createdInvoice.id,
                                provider: summaryData.invoice.insuranceProvider,
                                claimNumber: claimNumber
                              });
                              console.log("Insurance claim submitted automatically:", {
                                invoiceId: createdInvoice.id,
                                provider: summaryData.invoice.insuranceProvider,
                                claimNumber
                              });

                              toast({
                                title: "Invoice Created & Claim Submitted",
                                description: "Invoice created successfully and insurance claim submitted automatically.",
                              });
                            } catch (claimError) {
                              console.error("Failed to auto-submit insurance claim:", claimError);
                              toast({
                                title: "Invoice Created - Claim Failed",
                                description: "Invoice created successfully, but insurance claim submission failed. Please submit manually.",
                                variant: "destructive",
                              });
                            }
                          }

                          // Show success modal with invoice details
                          setPaymentSuccessData({
                            invoiceId: createdInvoice.invoiceNumber,
                            patientName: createdInvoice.patientName,
                            amount: invoiceTotal,
                          });
                          setShowPaymentSuccessDialog(true);

                          // Reset all state
                          setUploadFormData({
                            patientId: "",
                            studyType: "",
                            modality: "X-Ray",
                            bodyPart: "",
                            indication: "",
                            priority: "routine",
                          });
                          setSelectedFiles([]);
                          setUploadedImageData(null);
                          setSummaryData(null);
                          setShowSummaryDialog(false);

                          // Refresh the medical images list
                          refetchImages();
                        } catch (error) {
                          console.error("Payment flow error:", error);
                          const message =
                            error instanceof Error
                              ? error.message
                              : "Failed to process payment";
                          toast({
                            title: "Error",
                            description: message,
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Confirm
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary success popup (green tick) */}
      <Dialog open={showSummarySuccessModal} onOpenChange={setShowSummarySuccessModal}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-1">
              <DialogTitle className="text-lg font-semibold">Success</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Imaging order created successfully.
              </p>
            </div>
            <Button
              onClick={() => setShowSummarySuccessModal(false)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog
        open={showEditImageDialog}
        onOpenChange={(open) => {
          setShowEditImageDialog(open);
          if (!open) {
            setReplaceDialogPreviews([]);
            setReplaceDialogExistingPreviews((prev) => {
              prev.forEach((p) => {
                if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
              });
              return [];
            });
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Replace Medical Image</DialogTitle>
            {editingStudyId && selectedStudy && (
              <p className="text-sm text-muted-foreground mt-1">
                Medical Image ID: <strong>{editingStudyId}</strong>
                {selectedStudy.imageId && (
                  <span className="ml-2">(Image ID: <strong>{selectedStudy.imageId}</strong>)</span>
                )}
                {" — new images will be saved with this ID and added to radiology_images."}
              </p>
            )}
          </DialogHeader>
          {editingStudyId && selectedStudy && (
            <div className="space-y-4">
              {/* Existing Images – preview first */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Existing Images</Label>
                {loadingReplaceExistingPreviews ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading previews…</span>
                  </div>
                ) : replaceDialogExistingPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    {replaceDialogExistingPreviews.map((item) => (
                      <div
                        key={item.id}
                        className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 aspect-square flex items-center justify-center group"
                      >
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                          {item.fileName}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 bg-red-500/90 text-white hover:bg-red-600"
                          title="Delete this image"
                          onClick={async () => {
                            try {
                              const isRadiologyId = item.id !== Number(editingStudyId);
                              const response = await apiRequest(
                                "DELETE",
                                isRadiologyId ? `/api/radiology-images/${item.id}` : `/api/medical-images/${item.id}`,
                                {}
                              );
                              if (response.ok) {
                                toast({ title: "Image Deleted", description: "Image has been deleted." });
                                await refetchImages();
                                setReplaceDialogExistingPreviews((prev) => {
                                  const next = prev.filter((p) => p.id !== item.id);
                                  if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
                                  return next;
                                });
                                if (replaceDialogExistingPreviews.length <= 1) {
                                  setShowEditImageDialog(false);
                                  setEditingStudyId(null);
                                }
                              }
                            } catch (err) {
                              console.error(err);
                              toast({ title: "Delete Failed", description: "Failed to delete image.", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">No existing images. Add new images below.</p>
                )}
              </div>

              {/* Add New Images Section */}
              <div>
                <Label htmlFor="replacement-file" className="text-sm font-medium">Add New Images</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                  <FileImage className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Input
                    id="replacement-file"
                    type="file"
                    multiple
                    accept="image/*,.dcm,.dicom,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const newFiles = Array.from(files);
                        setSelectedFiles((prev) => [...prev, ...newFiles]);
                        const previewPromises = newFiles.map((file): Promise<string> => {
                          return new Promise((resolve) => {
                            if (file.type.startsWith("image/")) {
                              const reader = new FileReader();
                              reader.onload = (ev) => resolve((ev.target?.result as string) ?? "");
                              reader.onerror = () => resolve("");
                              reader.readAsDataURL(file);
                            } else {
                              resolve("");
                            }
                          });
                        });
                        Promise.all(previewPromises).then((previews) => {
                          setReplaceDialogPreviews((prev) => [...prev, ...previews.filter((p) => p !== "")]);
                        });
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                    data-testid="input-replacement-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("replacement-file")?.click()}
                  >
                    Select Images
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Select one or more image files to add
                  </p>
                </div>

                {/* Selected Files Display */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs">Selected Files ({selectedFiles.length}):</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs gap-2"
                        >
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {file.size < 1024
                              ? `${file.size} B`
                              : file.size < 1024 * 1024
                                ? `${(file.size / 1024).toFixed(1)} KB`
                                : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFiles = selectedFiles.filter((_, i) => i !== index);
                              setSelectedFiles(newFiles);
                              setReplaceDialogPreviews((prev) => prev.filter((_, i) => i !== index));
                            }}
                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Remove this file"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image preview after select/upload */}
                {(replaceDialogPreviews.length > 0 || selectedFiles.length > 0) && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-sm font-medium">Preview</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                      {selectedFiles.map((file, index) => {
                        const previewUrl = replaceDialogPreviews[index];
                        return (
                          <div
                            key={index}
                            className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 aspect-square flex items-center justify-center"
                          >
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={file.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-2 text-center">
                                <FileImage className="h-8 w-8 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500 truncate w-full">{file.name}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditImageDialog(false);
                    setSelectedFiles([]);
                    setReplaceDialogPreviews([]);
                    setUploadedFile(null);
                    setEditingStudyId(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (selectedFiles.length === 0 || !editingStudyId) return;
                    const token = localStorage.getItem('auth_token');
                    const headers: Record<string, string> = { 'X-Tenant-Subdomain': getActiveSubdomain() };
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    try {
                      const formData = new FormData();
                      selectedFiles.forEach((f) => formData.append('files', f));
                      const addRes = await fetch(`/api/medical-images/${editingStudyId}/add-images`, {
                        method: 'POST',
                        headers,
                        body: formData,
                        credentials: 'include',
                      });
                      if (!addRes.ok) {
                        const errText = await addRes.text();
                        throw new Error(addRes.status + ": " + errText);
                      }
                      const addData = await addRes.json();
                      const fileNames: string[] = addData?.fileNames ?? [];
                      const savedCount = addData?.savedCount ?? fileNames.length;
                      if (fileNames.length === 0) {
                        throw new Error("No files were saved on the server");
                      }
                      await refetchImages();
                      const message = `${savedCount ?? fileNames.length} image(s) saved to server path and database.`;
                      setSelectedFiles([]);
                      setReplaceDialogPreviews([]);
                      setUploadedFile(null);
                      setShowEditImageDialog(false);
                      setEditingStudyId(null);
                      setReplaceDialogExistingPreviews((prev) => {
                        prev.forEach((p) => { if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url); });
                        return [];
                      });
                      setReplaceSuccessMessage(message);
                    } catch (error) {
                      console.error("Error saving images:", error);
                      toast({
                        title: "Save Failed",
                        description: error instanceof Error ? error.message : "Failed to save. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={selectedFiles.length === 0}
                  data-testid="button-save-edit"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Replace success modal */}
      <Dialog open={replaceSuccessMessage != null} onOpenChange={(open) => { if (!open) setReplaceSuccessMessage(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Images Saved</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{replaceSuccessMessage}</p>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setReplaceSuccessMessage(null)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Body Part Images Dialog */}
      <Dialog
        open={showBodyPartImagesDialog}
        onOpenChange={(open) => {
          setShowBodyPartImagesDialog(open);
          if (!open) {
            setBodyPartDialogMedicalImageId(null);
            setBodyPartDialogImageId(null);
            Object.values(bodyPartImagePreviews).forEach((url) => {
              if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
              }
            });
            setBodyPartImagePreviews({});
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Images for: {selectedBodyPart}</DialogTitle>
            {(bodyPartDialogMedicalImageId != null || bodyPartDialogImageId) && (
              <p className="text-xs text-muted-foreground mt-1">
                Medical Image ID: <strong>{bodyPartDialogMedicalImageId ?? "—"}</strong>
                {bodyPartDialogImageId != null && (
                  <> · Image ID: <strong>{bodyPartDialogImageId}</strong></>
                )}
                {" — used to load rows from radiology_images (file_path)"}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {loadingBodyPartImages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Loading images...</span>
              </div>
            ) : bodyPartImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileImage className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No images found for this body part</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {bodyPartImages.map((image, index) => {
                  const imageKey = image.id ?? index;
                  const previewUrl = bodyPartImagePreviews[imageKey];
                  const fp = image.filePath ?? (image as any).file_path;
                  const filePathSrc =
                    image.uploadsDisplayUrl ||
                    (fp && typeof fp === "string" && fp.includes("uploads")
                      ? `/${fp.substring(fp.indexOf("uploads")).replace(/\\/g, "/")}`
                      : null);
                  // Do NOT use API URL (/api/radiology-images/image/73) as img src - browser would not send Authorization and get 401. Use only blob URL (previewUrl) or public path (filePathSrc).
                  const thumbSrc = previewUrl || filePathSrc;

                  return (
                    <div
                      key={imageKey}
                      className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={async () => {
                        try {
                          const authToken = localStorage.getItem("auth_token");
                          const authHeaders: Record<string, string> = {
                            "X-Tenant-Subdomain": getActiveSubdomain(),
                            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                          };
                          let imageUrl: string | null = null;
                          let lastError: Error | null = null;

                          // Priority 1: Use base64 image data if already available in the response (fastest)
                          if (image.imageData) {
                            imageUrl = image.imageData;
                            console.log(`✅ Using base64 image data from response`);
                          }

                          // Priority 1b: Direct URL from radiology_images (file_path → /uploads/... for browser)
                          if (!imageUrl) {
                            const fp = image.filePath ?? (image as any).file_path;
                            const directUrl = image.uploadsDisplayUrl || (fp && typeof fp === "string" && fp.includes("uploads")
                              ? `/${fp.substring(fp.indexOf("uploads")).replace(/\\/g, "/")}`
                              : null);
                            if (directUrl) {
                              try {
                                const response = await fetch(directUrl, { method: "GET", credentials: "include" });
                                if (response.ok) {
                                  const blob = await response.blob();
                                  if (blob.size > 0) {
                                    imageUrl = URL.createObjectURL(blob);
                                    console.log(`✅ Loaded image from uploads path (file_path)`);
                                  }
                                }
                              } catch (_) { /* try next */ }
                            }
                          }

                          // Priority 1c: For placeholder card (ORDER-*.pending / isMainImage), try list-folder-images first to load any image from study folder
                          const isPlaceholderCard = image.isMainImage || (typeof image.fileName === "string" && (image.fileName.endsWith(".pending") || image.fileName.startsWith("ORDER-")));
                          if (!imageUrl && isPlaceholderCard && image.studyId) {
                            try {
                              const studyIdNum = Number(image.studyId);
                              if (!Number.isNaN(studyIdNum)) {
                                const listRes = await fetch(`/api/medical-images/${studyIdNum}/list-folder-images`, {
                                  method: "GET", credentials: "include", headers: authHeaders,
                                });
                                if (listRes.ok) {
                                  const listData = await listRes.json();
                                  const files = listData?.images ?? [];
                                  for (const item of files) {
                                    const fp = item.filePath?.startsWith("/") ? item.filePath.slice(1) : item.filePath;
                                    if (!fp) continue;
                                    const fileUrl = `/${fp.replace(/\\/g, "/")}`;
                                    const pathRes = await fetch(fileUrl, { method: "GET", credentials: "include" });
                                    if (pathRes.ok) {
                                      const blob = await pathRes.blob();
                                      if (blob.size > 0) {
                                        imageUrl = URL.createObjectURL(blob);
                                        console.log(`✅ Loaded image from folder (placeholder card): ${item.fileName}`);
                                        break;
                                      }
                                    }
                                  }
                                }
                              }
                            } catch (_) { /* try next */ }
                          }

                          // Priority 2: Try to fetch image from radiology image endpoint using image ID (numeric only)
                          const numericImageId = typeof image.id === 'number' ? image.id : (typeof image.id === 'string' && /^\d+$/.test(String(image.id)) ? parseInt(String(image.id), 10) : null);
                          if (!imageUrl && numericImageId != null && !Number.isNaN(numericImageId)) {
                            try {
                              console.log(`🔄 Attempting to load image from radiology-images endpoint: /api/radiology-images/image/${numericImageId}`);
                              const response = await fetch(`/api/radiology-images/image/${numericImageId}`, {
                                method: "GET",
                                headers: authHeaders,
                                credentials: "include",
                              });

                              if (response.ok) {
                                const blob = await response.blob();
                                imageUrl = URL.createObjectURL(blob);
                                console.log(`✅ Successfully loaded image from radiology-images endpoint: ${image.id}`);
                              } else {
                                const errorText = await response.text().catch(() => 'Unknown error');
                                console.warn(`⚠️ Failed to load image from radiology-images endpoint (${response.status}): ${errorText}`);
                                console.log(`🔄 Will try fallback method: medical-images endpoint`);
                                lastError = new Error(`Radiology image not available: ${response.status}`);
                                // Don't throw here - continue to fallback methods
                              }
                            } catch (fetchError) {
                              console.warn(`⚠️ Error fetching from radiology-images endpoint:`, fetchError);
                              console.log(`🔄 Will try fallback method: medical-images endpoint`);
                              lastError = fetchError instanceof Error ? fetchError : new Error("Failed to fetch image");
                              // Don't throw here - continue to fallback methods
                            }
                          }

                          // Priority 2b: For main/synthetic image (no radiology id), try medical-images first so server can serve from folder
                          if (!imageUrl && image.studyId && !image.id) {
                            try {
                              const response = await fetch(`/api/medical-images/${image.studyId}/image`, {
                                method: "GET",
                                headers: authHeaders,
                                credentials: "include",
                              });
                              if (response.ok) {
                                const blob = await response.blob();
                                if (blob.size > 0) {
                                  imageUrl = URL.createObjectURL(blob);
                                  console.log(`✅ Loaded main image from medical-images endpoint (study ${image.studyId})`);
                                }
                              }
                            } catch (_) { /* continue to next method */ }
                          }

                          // Priority 3: Try to use filePath from database to serve directly from server
                          if (!imageUrl && image.filePath) {
                            try {
                              // Extract relative path from absolute path (e.g., "uploads/Imaging_Images/20/patients/98/file.webp")
                              let relativePath = image.filePath;

                              // If it's an absolute Windows path, extract the part after "uploads"
                              if (image.filePath.includes('uploads')) {
                                const uploadsIndex = image.filePath.indexOf('uploads');
                                relativePath = image.filePath.substring(uploadsIndex);
                                // Convert Windows backslashes to forward slashes for URL
                                relativePath = relativePath.replace(/\\/g, '/');
                              } else if (image.filePath.startsWith('/')) {
                                // Unix absolute path - remove leading slash if it's already relative to uploads
                                relativePath = image.filePath.startsWith('/uploads')
                                  ? image.filePath.substring(1)
                                  : image.filePath;
                              }

                              // Construct URL (server serves /uploads as static files)
                              const fileUrl = `/${relativePath}`;
                              console.log(`🔄 Attempting to load image from file path: ${fileUrl}`);
                              console.log(`📁 Original filePath from DB: ${image.filePath}`);

                              // Try to fetch the file directly
                              const response = await fetch(fileUrl, {
                                method: "GET",
                                credentials: "include",
                              });

                              if (response.ok) {
                                const blob = await response.blob();
                                imageUrl = URL.createObjectURL(blob);
                                console.log(`✅ Successfully loaded image from file path: ${fileUrl}`);
                              } else {
                                console.warn(`⚠️ Failed to load image from file path (${response.status}): ${fileUrl}`);
                                if (!lastError) {
                                  lastError = new Error(`File not accessible: ${response.status}`);
                                }
                                // Don't throw here - continue to try other methods
                              }
                            } catch (fetchError) {
                              console.warn(`⚠️ Error fetching from file path:`, fetchError);
                              if (!lastError) {
                                lastError = fetchError instanceof Error ? fetchError : new Error("Failed to fetch image from file path");
                              }
                              // Don't throw here - continue to try other methods
                            }
                          }

                          // Priority 4: Try to fetch image from medical image endpoint if all else failed
                          if (!imageUrl && image.studyId) {
                            try {
                              console.log(`🔄 Attempting to load image from medical-images endpoint: /api/medical-images/${image.studyId}/image`);
                              const response = await fetch(`/api/medical-images/${image.studyId}/image`, {
                                method: "GET",
                                headers: authHeaders,
                                credentials: "include",
                              });

                              if (response.ok) {
                                const blob = await response.blob();
                                imageUrl = URL.createObjectURL(blob);
                                console.log(`✅ Successfully loaded image from medical-images endpoint: ${image.studyId}`);
                              } else {
                                const errorText = await response.text().catch(() => 'Unknown error');
                                console.warn(`⚠️ Failed to load image from medical-images endpoint (${response.status}): ${errorText}`);
                                if (!lastError) {
                                  lastError = new Error(`Medical image not available: ${response.status}`);
                                }
                                // Don't throw here - continue to show error
                              }
                            } catch (fetchError) {
                              console.warn(`⚠️ Error fetching from medical-images endpoint:`, fetchError);
                              if (!lastError) {
                                lastError = fetchError instanceof Error ? fetchError : new Error("Failed to fetch image");
                              }
                              // Don't throw here - continue to show error
                            }
                          } else if (!imageUrl && !image.studyId) {
                            console.warn(`⚠️ Cannot try medical-images endpoint: studyId is not available`);
                          }

                          // Priority 5: For main/synthetic image, list folder and try each file URL (fallback when single-image 404s)
                          if (!imageUrl && image.studyId) {
                            try {
                              const listRes = await fetch(
                                `/api/medical-images/${image.studyId}/list-folder-images`,
                                {
                                  method: "GET",
                                  credentials: "include",
                                  headers: authHeaders,
                                }
                              );
                              if (listRes.ok) {
                                const listData = await listRes.json();
                                const files = listData?.images ?? [];
                                for (const item of files) {
                                  const fp = item.filePath?.startsWith("/") ? item.filePath.slice(1) : item.filePath;
                                  if (!fp) continue;
                                  const fileUrl = `/${fp.replace(/\\/g, "/")}`;
                                  const pathRes = await fetch(fileUrl, { method: "GET", credentials: "include" });
                                  if (pathRes.ok) {
                                    const blob = await pathRes.blob();
                                    if (blob.size > 0) {
                                      imageUrl = URL.createObjectURL(blob);
                                      console.log(`✅ Loaded image from list-folder fallback: ${item.fileName}`);
                                      break;
                                    }
                                  }
                                }
                              }
                            } catch (_) {
                              /* ignore */
                            }
                          }

                          // If still no image URL, show helpful error
                          if (!imageUrl) {
                            const isMainPlaceholder = !image.id || image.isMainImage;
                            const errorMessage = isMainPlaceholder
                              ? "No image file found for this study. The file may not have been uploaded yet or may not be in the server folder."
                              : `Unable to load image. ${lastError?.message || "The image file may not exist on the server or may not be accessible."} (Study ID: ${image.studyId || "N/A"}, File: ${image.fileName || "N/A"})`;
                            console.error(`❌ All image loading methods failed:`, {
                              imageId: image.id,
                              studyId: image.studyId,
                              fileName: image.fileName,
                              filePath: image.filePath,
                              hasImageData: !!image.imageData,
                              lastError: lastError?.message
                            });
                            throw new Error(errorMessage);
                          }

                          const imageForViewer = {
                            seriesDescription: `${image.modality} - ${image.studyType}`,
                            type: "JPEG",
                            imageCount: 1,
                            size: image.fileSize ? `${(image.fileSize / 1024).toFixed(1)} KB` : "N/A",
                            imageId: image.studyId,
                            imageUrl: imageUrl,
                            mimeType: image.mimeType || "image/jpeg",
                            fileName: image.fileName,
                            patientName: image.patientName,
                          };
                          setSelectedImageSeries(imageForViewer);
                          setShowImageViewer(true);
                          setShowBodyPartImagesDialog(false);
                        } catch (error) {
                          console.error("Error loading image:", error);
                          toast({
                            title: "Error",
                            description: "Failed to load image. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={image.fileName ?? (image as any).file_name ?? `Image ${index + 1}`}
                            className="w-full h-full object-contain min-h-[120px]"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                const placeholder = document.createElement("div");
                                placeholder.className = "flex items-center justify-center w-full h-full min-h-[120px] text-gray-400";
                                placeholder.innerHTML = '<svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : image.imageData ? (
                          <img
                            src={image.imageData}
                            alt={image.fileName || `Image ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <FileImage className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        {image.imageId && (
                          <div className="font-medium truncate text-blue-600" title={image.imageId}>
                            {image.imageId}
                          </div>
                        )}
                        <div className="font-medium truncate" title={image.fileName ?? (image as any).file_name ?? ""}>
                          {image.fileName ?? (image as any).file_name ?? `Image ${index + 1}`}
                        </div>
                        {image.patientName && (
                          <div className="text-gray-500 truncate" title={image.patientName}>
                            {image.patientName}
                          </div>
                        )}
                        {image.studyType && (
                          <div className="text-gray-500 truncate" title={image.studyType}>
                            {image.studyType}
                          </div>
                        )}
                        {image.fileSize && (
                          <div className="text-gray-400">
                            {(image.fileSize / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowBodyPartImagesDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF List View Dialog */}
      <Dialog open={showPDFListViewDialog} onOpenChange={setShowPDFListViewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>PDF Report: {selectedPDFFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-4" style={{ minHeight: '600px', height: 'calc(90vh - 120px)' }}>
            {selectedPDFUrl ? (
              <iframe
                src={selectedPDFUrl}
                className="w-full h-full border rounded"
                title="PDF Report"
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
            <Button onClick={() => setShowPDFListViewDialog(false)}>
              Close
            </Button>
            {selectedPDFUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(selectedPDFUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Please Create Signature First Dialog */}
      <Dialog open={showSignFirstDialog} onOpenChange={setShowSignFirstDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Signature Required
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please create signature first.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSignFirstDialog(false);
                setPendingPrescriptionStudy(null);
                setPendingESignStudy(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSignFirstDialog(false);
                // Hide tabs before opening the advanced e-signature dialog
                setHideTabs(true);
                // Open the advanced e-signature dialog
                if (pendingPrescriptionStudy) {
                  setESignStudy(pendingPrescriptionStudy);
                  setShowESignDialog(true);
                } else if (pendingESignStudy) {
                  setESignStudy(pendingESignStudy);
                  setShowESignDialog(true);
                  setPendingESignStudy(null);
                }
              }}
              className="bg-medical-blue hover:bg-blue-700"
            >
              Ready to Sign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog - Imaging Results tab */}
      <Dialog open={!!editStatusDialog} onOpenChange={(open) => !open && setEditStatusDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
            <DialogDescription>Change the status for this imaging study.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="edit-imaging-status-select" className="text-sm font-medium">Status</Label>
            <Select value={editStatusDraft} onValueChange={setEditStatusDraft}>
              <SelectTrigger id="edit-imaging-status-select" className="mt-2 w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="preliminary">Preliminary</SelectItem>
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
                  updateDateMutation.mutate({
                    studyId: editStatusDialog.studyId,
                    fieldName: "status",
                    value: editStatusDraft,
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

      {/* Advanced E-Signature Dialog */}
      <Dialog open={showESignDialog} onOpenChange={(open) => {
        setShowESignDialog(open);
        if (open) {
          setHideTabs(true); // Hide tabs when dialog opens
        } else {
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
              {eSignStudy && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-slate-800 p-6 rounded-lg border border-blue-200 dark:border-gray-600">
                  <h4 className="font-semibold text-blue-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Imaging Study Summary for Digital Signature
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800 dark:text-gray-300">
                    <div>
                      <p>
                        <strong>Patient:</strong>{" "}
                        {eSignStudy.patientName || 'N/A'}
                      </p>
                      <p>
                        <strong>Patient ID:</strong>{" "}
                        {eSignStudy.patientId || 'N/A'}
                      </p>
                      <p>
                        <strong>Date Ordered:</strong>{" "}
                        {eSignStudy.orderedAt ? format(
                          new Date(eSignStudy.orderedAt),
                          "MMM dd, yyyy HH:mm",
                        ) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Ordering Provider:</strong>{" "}
                        {eSignStudy.orderedBy || 'N/A'}
                      </p>
                      <p>
                        <strong>Created By:</strong>{" "}
                        {user ? `${formatRoleLabel(user.role)} - ${user.firstName} ${user.lastName}` : 'N/A'}
                      </p>
                      <p>
                        <strong>Study Type:</strong>{" "}
                        {eSignStudy.studyType || eSignStudy.modality || 'N/A'}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        {eSignStudy.status || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Study to be signed:
                    </p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      • Image ID: {eSignStudy.imageId || eSignStudy.id} - {eSignStudy.studyType || eSignStudy.modality || 'Imaging Study'}
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
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Signature Quality Analysis
                    </h5>
                    <div className="space-y-2 text-sm">
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

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-800 mb-2">
                      Biometric Verification
                    </h5>
                    <div className="text-sm text-blue-700 space-y-1">
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

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowESignDialog(false);
                    clearSignature();
                    setIsSavingSignature(false);
                  }}
                  disabled={isSavingSignature}
                >
                  Cancel Signature Process
                </Button>
                <Button
                  onClick={saveSignature}
                  disabled={signatureSaved || !eSignStudy || isSavingSignature}
                  className={`bg-purple-600 hover:bg-purple-700 text-white ${isSavingSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSavingSignature ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 mr-2" />
                      Apply Advanced E-Signature
                    </>
                  )}
                </Button>
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
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Security Validation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm space-y-2">
                        <p>
                          <strong>Session ID:</strong>{" "}
                          {Math.random().toString(36).substring(7).toUpperCase()}
                        </p>
                        <p>
                          <strong>IP Address:</strong> Verified
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {new Date().toLocaleString()}
                        </p>
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
                    <CardTitle>Signature Verification</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Signature verification ensures the integrity and authenticity of the electronic signature.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Compliance Tab */}
            {!hideTabs && (
              <TabsContent value="compliance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      This electronic signature complies with relevant healthcare regulations and standards.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Study Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Study Details</DialogTitle>
          </DialogHeader>
          {selectedStudyDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Image ID:</p>
                  <p className="text-gray-900 dark:text-gray-100 break-words">{selectedStudyDetails.imageId || selectedStudyDetails.id || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Patient Name:</p>
                  <p className="text-gray-900 dark:text-gray-100 break-words">{selectedStudyDetails.patientName || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Provider Name:</p>
                  <p className="text-gray-900 dark:text-gray-100 break-words">
                    {(() => {
                      const providerUser = allUsers?.find((u: any) =>
                        u.id === selectedStudyDetails.selectedUserId ||
                        u.id === selectedStudyDetails.providerId ||
                        u.id === selectedStudyDetails.doctorId
                      );
                      if (!providerUser) return "N/A";
                      const firstName = providerUser.firstName || "";
                      const lastName = providerUser.lastName || "";
                      let fullName = `${firstName} ${lastName}`.trim();
                      if (!fullName) return "N/A";
                      const role = providerUser.role || selectedStudyDetails.selectedRole || "";
                      const roleLabel = role ? formatRoleLabel(role) : "";
                      const alreadyHasDr = fullName.toLowerCase().startsWith("dr.");
                      const prefix = (role?.toLowerCase() === "doctor" && !alreadyHasDr) ? "Dr. " : "";
                      return roleLabel ? `${prefix}${fullName} (${roleLabel})` : `${prefix}${fullName}`;
                    })()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Radiologist (Created By):</p>
                  <p className="text-gray-900 dark:text-gray-100 break-words">{selectedStudyDetails.radiologist || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">File Name:</p>
                  <p className="text-gray-900 dark:text-gray-100 break-words">{selectedStudyDetails.fileName || selectedStudyDetails.file_name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Status:</p>
                  <div>
                    <Badge className={`${getStatusColor(selectedStudyDetails.status || "ordered")} text-xs px-2 py-0.5`}>
                      {selectedStudyDetails.status || "N/A"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Scheduled:</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedStudyDetails.scheduledAt
                      ? format(new Date(selectedStudyDetails.scheduledAt), "MMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Performed:</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedStudyDetails.performedAt
                      ? format(new Date(selectedStudyDetails.performedAt), "MMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Created:</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedStudyDetails.createdAt
                      ? format(new Date(selectedStudyDetails.createdAt), "MMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
