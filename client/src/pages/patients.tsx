import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { PatientList } from "@/components/patients/patient-list";
import { PatientModal } from "@/components/patients/patient-modal";
import ConsultationNotes from "@/components/medical/consultation-notes";
import PatientFamilyHistory from "@/components/patients/patient-family-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserPlus, ArrowLeft, FileText, Calendar, User, X, LayoutGrid, List, Mail } from "lucide-react";

// Helper function to get the correct tenant subdomain
function getTenantSubdomain(): string {
  // PRIORITY 1: Check for user's stored subdomain (from their organization)
  const storedSubdomain = localStorage.getItem('user_subdomain');
  if (storedSubdomain) {
    return storedSubdomain;
  }
  
  // PRIORITY 2: Check for subdomain query parameter (for development)
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }
  
  const hostname = window.location.hostname;
  
  // PRIORITY 3: For development/replit environments, use 'demo'
  if (hostname.includes('.replit.app') || hostname.includes('localhost') || hostname.includes('replit.dev') || hostname.includes('127.0.0.1')) {
    return 'demo';
  }
  
  // PRIORITY 4: For production environments, extract subdomain from hostname
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0] || 'demo';
  }
  
  // PRIORITY 5: Fallback to 'demo'
  return 'demo';
}

export default function Patients() {
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = useRolePermissions();
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const params = useParams();
  const [, setLocation] = useLocation();
  const patientId = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for patient data
  const [patient, setPatient] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [linkedUserProfilePicturePath, setLinkedUserProfilePicturePath] = useState<string | null>(null);
  const [anatomicalFiles, setAnatomicalFiles] = useState<
    Array<{ filename: string; url: string; uploadedAt: string; size: number }>
  >([]);
  const [anatomicalFilesLoading, setAnatomicalFilesLoading] = useState(false);
  const [anatomicalFilesError, setAnatomicalFilesError] = useState("");
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  
  // State for gender filter ("all" shows both, "Male" shows males, "Female" shows females)
  const [genderFilter, setGenderFilter] = useState<"all" | "Male" | "Female">("all");
  
  // State for view mode (true = List view, false = Grid view)
  const [isListView, setIsListView] = useState(true);

  // List view pagination
  const LIST_PAGE_SIZE = 10;
  const [listPage, setListPage] = useState(1);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [listTotalRows, setListTotalRows] = useState(0);

  const handleListPaginationInfo = useCallback(
    (info: { totalRows: number; totalPages: number }) => {
      setListTotalRows(info.totalRows);
      setListTotalPages(info.totalPages);
    },
    [],
  );

  useEffect(() => {
    setListPage(1);
  }, [genderFilter, isListView]);

  useEffect(() => {
    if (listPage > listTotalPages) {
      setListPage(Math.max(1, listTotalPages));
    }
  }, [listPage, listTotalPages]);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch specific patient data if viewing records
  useEffect(() => {
    const fetchPatient = async () => {
      if (!patientId) return;
      
      try {
        setPatientLoading(true);
        console.log(`Fetching patient ${patientId} data...`);
        
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'X-Tenant-Subdomain': getTenantSubdomain()
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/patients/${patientId}`, {
          headers,
          credentials: 'include'
        });
        
        console.log("Patient response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched patient data:", data);
        setPatient(data);
      } catch (err) {
        console.error("Error fetching patient:", err);
        setPatient(null);
      } finally {
        setPatientLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  // When viewing records, if this patient is linked to a user, load their profile picture from users table.
  useEffect(() => {
    const fetchLinkedUserProfilePicture = async () => {
      // Best: backend already returns it for this patient (avoids extra lookups/permissions)
      if (patient?.linkedUserProfilePicturePath) {
        setLinkedUserProfilePicturePath(patient.linkedUserProfilePicturePath);
        return;
      }

      const linkedUserId =
        patient?.userId ??
        patient?.user_id ??
        patient?.linkedUserId ??
        patient?.linked_user_id ??
        patient?.user?.id ??
        patient?.user?.userId;

      try {
        // Best: fetch the specific linked user (works for receptionist too).
        if (linkedUserId != null) {
          const basicRes = await apiRequest("GET", `/api/users/${encodeURIComponent(String(linkedUserId))}/basic`);
          const basic = await basicRes.json().catch(() => ({}));
          if (basicRes.ok) {
            setLinkedUserProfilePicturePath(basic?.profilePicturePath || null);
            return;
          }
        }

        // Fallback: Try users list (admin/doctor/nurse). If blocked, fallback to telemedicine users.
        let users: any[] | null = null;
        try {
          const response = await apiRequest("GET", "/api/users");
          const data = await response.json();
          users = Array.isArray(data) ? data : null;
        } catch {
          users = null;
        }

        if (!users) {
          const tmRes = await apiRequest("GET", "/api/telemedicine/users");
          const tmData = await tmRes.json();
          users = Array.isArray(tmData) ? tmData : null;
        }

        const patientEmail = String(patient?.email || "").trim().toLowerCase();
        const u = users
          ? users.find((x: any) => {
              if (linkedUserId != null) return String(x.id) === String(linkedUserId);
              if (patientEmail) return String(x.email || "").trim().toLowerCase() === patientEmail;
              return false;
            })
          : null;

        setLinkedUserProfilePicturePath(u?.profilePicturePath || u?.profile_picture_path || null);
      } catch (e) {
        setLinkedUserProfilePicturePath(null);
      }
    };

    fetchLinkedUserProfilePicture();
  }, [patient]);

  useEffect(() => {
    if (patient) {
      setSelectedPatient(patient);
    }
  }, [patient]);

  const fetchAnatomicalFiles = useCallback(async () => {
    if (!patientId) {
      setAnatomicalFiles([]);
      setAnatomicalFilesError("");
      return;
    }

    setAnatomicalFilesLoading(true);
    setAnatomicalFilesError("");

    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "X-Tenant-Subdomain": getTenantSubdomain(),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const endpoints = [
      { url: `/api/anatomical-analysis/files/${patientId}`, label: "PDF uploads" },
      { url: `/api/anatomical-analysis/images/${patientId}`, label: "Saved images" },
    ];

    const combinedFiles: Array<{
      filename: string;
      url: string;
      uploadedAt: string;
      size: number;
    }> = [];
    const errors: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data.files)) {
          combinedFiles.push(...data.files);
        }
      } catch (error: any) {
        console.error(`Error fetching ${endpoint.label}:`, error);
        errors.push(`${endpoint.label} (${error?.message || "unexpected error"})`);
      }
    }

    combinedFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    setAnatomicalFiles(combinedFiles);
    if (combinedFiles.length === 0 && errors.length > 0) {
      setAnatomicalFilesError(errors.join(" • "));
    } else {
      setAnatomicalFilesError("");
    }

    setAnatomicalFilesLoading(false);
  }, [patientId]);

  useEffect(() => {
    fetchAnatomicalFiles();
  }, [fetchAnatomicalFiles]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ patientId?: number }>;
      const detailPatientId = customEvent.detail?.patientId;
      if (detailPatientId && patientId === detailPatientId) {
        fetchAnatomicalFiles();
      }
    };
    window.addEventListener("anatomicalFilesUpdated", handler);
    return () => {
      window.removeEventListener("anatomicalFilesUpdated", handler);
    };
  }, [fetchAnatomicalFiles, patientId]);

  const deleteAnatomicalFile = useCallback(
    async (filename: string) => {
      if (!patientId) return false;
      setDeletingFile(filename);
      try {
        const token = localStorage.getItem("auth_token");
        const headers: Record<string, string> = {
          "X-Tenant-Subdomain": getTenantSubdomain(),
          "Content-Type": "application/json",
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`/api/anatomical-analysis/files/${patientId}`, {
          method: "DELETE",
          headers,
          credentials: "include",
          body: JSON.stringify({ filename }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        await fetchAnatomicalFiles();
        return true;
      } catch (error) {
        console.error("Error deleting anatomical file:", error);
        return false;
      } finally {
        setDeletingFile(null);
      }
    },
    [patientId, fetchAnatomicalFiles],
  );

  // Function to handle flag deletion
  const handleFlagDelete = async (flagIndex: number) => {
    if (!patient) return;
    
    try {
      const updatedFlags = patient.flags.filter((_: any, index: number) => index !== flagIndex);
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ flags: updatedFlags })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Update local state
      const updatedPatient = { ...patient, flags: updatedFlags };
      setPatient(updatedPatient);
      setSelectedPatient(updatedPatient);
    } catch (err) {
      console.error("Error deleting flag:", err);
    }
  };

  // Show loading state while fetching patient data
  if (patientId && patientLoading) {
    return (
      <>
        <Header 
          title="Loading Patient Records..." 
          subtitle="Please wait while we fetch the patient information."
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patient data...</p>
          </div>
        </div>
      </>
    );
  }

  // If viewing specific patient records
  if (patientId && patient) {
    return (
      <>
        <Header 
          title={`Medical Records - ${patient.firstName} ${patient.lastName}`} 
          subtitle="Complete medical history and consultation notes."
        />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                const subdomain = getTenantSubdomain();
                setLocation(`/${subdomain}/patients`);
              }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Patients
              </Button>
              <Avatar className="h-10 w-10 flex-shrink-0">
                {linkedUserProfilePicturePath ? (
                  <AvatarImage src={linkedUserProfilePicturePath} alt="User profile picture" />
                ) : null}
                <AvatarFallback>
                  {String(patient.firstName || "P").charAt(0).toUpperCase()}
                  {String(patient.lastName || "").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {patient.firstName} {patient.lastName} - Medical Records
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Patient ID: {patient.patientId} • Age: {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Patient Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {patient.email || "Patient Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm text-gray-600 dark:text-neutral-300">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {patient.phone || "Phone number unavailable"}
                  </p>
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4 text-gray-500 dark:text-neutral-400" />
                    <span className="text-sm">{patient.email || "Email unavailable"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-white">Address</p>
                  <p className="text-sm text-gray-600 dark:text-neutral-300">
                    {patient.address?.street}, {patient.address?.city} {patient.address?.postcode}
                  </p>
                </div>
                {patient.medicalHistory?.chronicConditions && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-white">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.medicalHistory.chronicConditions.map((condition: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Extract allergies from both medicalHistory and flags */}
                {(() => {
                  const allergies = patient.medicalHistory?.allergies || [];
                  const flagAllergies = patient.flags?.filter((flag: string) => 
                    flag.includes(':') && flag.split(':')[2]
                  ).map((flag: string) => flag.split(':')[2]) || [];
                  const allAllergies = [...allergies, ...flagAllergies].filter(Boolean);
                  
                  return allAllergies.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-white">Allergies</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {allAllergies.map((allergy: string, index: number) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-white">Allergies</p>
                      <p className="text-sm text-gray-500 dark:text-neutral-400">No known allergies</p>
                    </div>
                  );
                })()}

                {/* Special Requirements */}
                {(() => {
                  const rawSpecialReq = (patient.medicalHistory as any)?.specialRequirements;
                  const hasStructuredData = rawSpecialReq && typeof rawSpecialReq === "object";
                  const hasSpecialRequirements =
                    hasStructuredData && rawSpecialReq.hasSpecialRequirements === "yes";

                  if (!hasSpecialRequirements) return null;

                  const selected = rawSpecialReq.selected && typeof rawSpecialReq.selected === "object"
                    ? rawSpecialReq.selected
                    : {};
                  const details = rawSpecialReq.details && typeof rawSpecialReq.details === "object"
                    ? rawSpecialReq.details
                    : {};

                  const specialRequirementLabelMap: Record<string, string> = {
                    mobility_wheelchair: "Wheelchair user",
                    mobility_walking_assistance: "Needs walking assistance",
                    mobility_bed_bound: "Bed-bound",
                    mobility_exam_table_help: "Requires help getting onto exam table",
                    mobility_other: "Mobility other",
                    sensory_hearing_impairment: "Hearing impairment",
                    sensory_sign_language: "Requires sign language interpreter",
                    sensory_visual_impairment: "Visual impairment",
                    sensory_large_print: "Needs large-print materials",
                    sensory_other: "Sensory other",
                    communication_language_barrier: "Language barrier",
                    communication_interpreter: "Needs translator/interpreter",
                    communication_difficulty_instructions: "Difficulty understanding instructions",
                    communication_other: "Communication other",
                    cognitive_dementia: "Dementia / memory issues",
                    cognitive_autism: "Autism spectrum",
                    cognitive_anxiety: "Anxiety / panic disorder",
                    cognitive_quiet_environment: "Needs calm or quiet environment",
                    cognitive_other: "Cognitive/behavioral other",
                    medical_diabetes: "Diabetes",
                    medical_heart_condition: "Heart condition",
                    medical_epilepsy: "Epilepsy / seizures",
                    medical_oxygen: "Requires oxygen",
                    medical_other: "Medical other",
                    alerts_drug_allergy: "Drug allergy",
                    alerts_latex_allergy: "Latex allergy",
                    alerts_skin_sensitivity: "Skin sensitivity",
                    alerts_cosmetic_allergy: "Cosmetic product allergy",
                    alerts_other: "Medical alert other",
                    infection_condition: "Infectious condition",
                    infection_isolation: "Requires isolation precautions",
                    infection_other: "Infection control other",
                    aesthetic_sensitive_skin: "Sensitive skin",
                    aesthetic_reactions_history: "History of cosmetic reactions",
                    aesthetic_undergoing_treatments: "Undergoing cosmetic treatments",
                    aesthetic_scarring_concern: "Concern about scarring/pigmentation",
                    aesthetic_keloid_tendency: "Keloid tendency",
                    aesthetic_acne_prone: "Acne-prone skin",
                    aesthetic_hyperpigmentation: "Hyperpigmentation / melasma",
                    aesthetic_minimal_marks: "Preference for minimal marks",
                    aesthetic_skincare_medications: "Using skincare medications",
                    aesthetic_recent_treatment: "Recent facial/body treatment",
                    aesthetic_other: "Aesthetic other",
                    personal_prefers_male_doctor: "Prefers male doctor",
                    personal_prefers_female_doctor: "Prefers female doctor",
                    personal_modesty_privacy: "Modesty/privacy concerns",
                    personal_religious_cultural: "Religious/cultural considerations",
                    personal_other: "Personal/cultural other",
                    assistance_caregiver: "Requires caregiver assistance",
                    assistance_priority: "Needs priority/urgent care",
                    assistance_other_special: "Other special assistance",
                    assistance_other: "Special assistance other",
                  };

                  const selectedItems = Object.entries(selected)
                    .filter(([, checked]) => !!checked)
                    .map(([key]) => {
                      const base = specialRequirementLabelMap[key] || key;
                      const extra = details[key];
                      return extra ? `${base}: ${extra}` : base;
                    });

                  const additionalNotes = typeof rawSpecialReq.additionalNotes === "string"
                    ? rawSpecialReq.additionalNotes.trim()
                    : "";

                  if (selectedItems.length === 0 && !additionalNotes) return null;

                  return (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-white">Special Requirements</p>
                      {selectedItems.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedItems.map((item, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {additionalNotes && (
                        <p className="text-xs text-gray-600 dark:text-neutral-300 mt-2 whitespace-pre-wrap">
                          {additionalNotes}
                        </p>
                      )}
                    </div>
                  );
                })()}
                
                {/* Display patient flags */}
                {patient.flags && patient.flags.length > 0 && (
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {patient.flags.map((flag: string, index: number) => {
                        const flagParts = flag.split(':');
                        const [category, , reason] = flagParts;
                        const getFlagTypeDisplay = (type: string) => {
                          const flagTypes: Record<string, string> = {
                            'medical_alert': '🚩 Medical Alert',
                            'allergy_warning': '🚩 Allergy Warning', 
                            'medication_interaction': '🚩 Medication Interaction',
                            'high_risk': '🚩 High Risk',
                            'special_needs': '🚩 Special Needs',
                            'insurance_issue': '🚩 Insurance Issue',
                            'payment_overdue': '🚩 Payment Overdue',
                            'follow_up_required': '🚩 Follow-up Required'
                          };
                          return flagTypes[type] || `🚩 ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
                        };
                        return (
                          <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <div className="relative group">
                                <Badge variant="outline" className="text-xs pr-6 cursor-pointer">
                                  {getFlagTypeDisplay(category)}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900 rounded-r-md"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFlagDelete(index);
                                    }}
                                  >
                                    <X className="h-2 w-2 text-red-500" />
                                  </Button>
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reason for Flag: {reason || 'No reason specified'}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>

            {/* Medical Records */}
            <div className="lg:col-span-2">
              <ConsultationNotes 
                key={patient.id}
                patientId={patient.id} 
                patientName={`${patient.firstName} ${patient.lastName}`}
                patientNumber={patient.patientId}
              />
            </div>
          </div>

          <div className="mt-6">
            <PatientFamilyHistory 
              key={patient.id}
              patient={patient} 
              onUpdate={(updates) => {
                const updatedPatient = { ...patient, ...updates };
                setPatient(updatedPatient);
                setSelectedPatient(updatedPatient);
              }}
              anatomicalFiles={anatomicalFiles}
              anatomicalFilesLoading={anatomicalFilesLoading}
              anatomicalFilesError={anatomicalFilesError}
              onDeleteAnatomicalFile={deleteAnatomicalFile}
            />
          </div>
        </div>
      </>
    );
  }

  // Default patients list view
  return (
    <div className="w-full min-h-0 flex flex-col page-zoom-90">
      <Header 
        title="Patients" 
        subtitle="Manage patient records and medical information."
      />
      
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Patients</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">
                  Gender:
                </span>
                <Select
                  value={genderFilter}
                  onValueChange={(value: "all" | "Male" | "Female") => setGenderFilter(value)}
                >
                  <SelectTrigger className="h-8 w-28" data-testid="select-gender-filter">
                    <User className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">
                  {isListView ? "List View" : "Grid View"}
                </span>
                <Switch
                  checked={isListView}
                  onCheckedChange={setIsListView}
                  className="h-4 w-8"
                  data-testid="toggle-view-mode"
                />
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              View and manage patient information securely.
            </p>
          </div>
          {canCreate('patients') && (
            <Button 
              onClick={() => setShowPatientModal(true)}
              variant="default"
              data-testid="button-add-patient"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          )}
        </div>

        <PatientList 
          genderFilter={genderFilter === "all" ? null : genderFilter} 
          viewMode={isListView ? "list" : "grid"}
          canEditPatient={canEdit('patients')}
          canDeletePatient={canDelete('patients')}
          listPage={isListView ? listPage : undefined}
          listPageSize={isListView ? LIST_PAGE_SIZE : undefined}
          onListPageChange={isListView ? setListPage : undefined}
          onListPaginationInfo={isListView ? handleListPaginationInfo : undefined}
        />

        {isListView && listTotalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Page {listPage} of {listTotalPages}
              {" · "}
              {listTotalRows} patient{listTotalRows !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={listPage <= 1}
                onClick={() => setListPage(1)}
                data-testid="button-list-page-first"
              >
                «
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={listPage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                data-testid="button-list-page-prev"
              >
                ‹ Prev
              </Button>
              {Array.from({ length: Math.min(5, listTotalPages) }, (_, i) => {
                const half = 2;
                const start = Math.max(1, Math.min(listPage - half, listTotalPages - 4));
                const pageNum = start + i;
                if (pageNum > listTotalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    variant={pageNum === listPage ? "default" : "outline"}
                    onClick={() => setListPage(pageNum)}
                    className="w-8 h-8 p-0"
                    data-testid={`button-list-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                size="sm"
                variant="outline"
                disabled={listPage >= listTotalPages}
                onClick={() => setListPage((p) => Math.min(listTotalPages, p + 1))}
                data-testid="button-list-page-next"
              >
                Next ›
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={listPage >= listTotalPages}
                onClick={() => setListPage(listTotalPages)}
                data-testid="button-list-page-last"
              >
                »
              </Button>
            </div>
          </div>
        )}
      </div>

      <PatientModal 
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
      />

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
