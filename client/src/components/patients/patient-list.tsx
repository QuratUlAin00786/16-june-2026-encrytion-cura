import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  Eye,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  Clock,
  Bell,
  FileText,
  Flag,
  Trash2,
  Hash,
  Edit,
  X,
  Stethoscope,
  Pill,
  Activity,
  Camera,
  Check,
  DollarSign,
  CreditCard,
  Mail,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { PatientSearch, SearchFilters } from "./patient-search";
import { PatientCommunicationDialog } from "./patient-communication-dialog";
import { PatientModal } from "./patient-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { isDoctorLike } from "@/lib/role-utils";
import { displayPatientName, displayPatientScalar } from "@/lib/patient-field-display";

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

function getPatientInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getPatientAccountKindBadge(patient: any) {
  const hasLoginUser =
    patient?.userId != null ||
    patient?.user_id != null ||
    patient?.linkedUserId != null ||
    patient?.linked_user_id != null;

  return {
    label: hasLoginUser ? "User + Patient" : "Patient only",
    description: hasLoginUser
      ? "This patient has a portal login user."
      : "This is a patient record only (no portal login user).",
    badgeClassName: hasLoginUser
      ? "text-[10px] px-2 py-0.5 bg-white border-green-500 text-green-700 dark:bg-transparent dark:text-green-400 dark:border-green-700"
      : "text-[10px] px-2 py-0.5 bg-white border-gray-300 text-gray-700 dark:bg-transparent dark:text-gray-300 dark:border-gray-600",
  };
}

function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) {
    console.warn("No dateOfBirth provided for age calculation");
    return 0;
  }

  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  // Check if birthDate is valid
  if (isNaN(birthDate.getTime())) {
    console.warn("Invalid dateOfBirth format:", dateOfBirth);
    return 0;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  console.log(`Calculated age for DOB ${dateOfBirth}: ${age}`);
  return age;
}

function getRiskLevelColor(riskLevel: string) {
  switch (riskLevel?.toLowerCase()) {
    case "low":
      return "text-white";
    case "medium":
      return "text-white";
    case "high":
      return "text-white";
    case "critical":
      return "text-white";
    default:
      return "text-white";
  }
}

function getRiskLevelBgColor(riskLevel: string) {
  switch (riskLevel?.toLowerCase()) {
    case "low":
      return "#9B9EAF"; // Steel
    case "medium":
      return "#7279FB"; // Electric Lilac
    case "high":
      return "#4A7DFF"; // Bluewave
    case "critical":
      return "#C073FF"; // Electric Violet
    default:
      return "#9B9EAF"; // Steel
  }
}

function getConditionColor(condition?: string) {
  return "text-white";
}

function getConditionBgColor(condition?: string) {
  if (!condition) return "#9B9EAF"; // Steel

  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("diabetes")) return "#C073FF"; // Electric Violet
  if (
    lowerCondition.includes("hypertension") ||
    lowerCondition.includes("blood pressure")
  )
    return "#6CFFEB"; // Mint Drift
  if (
    lowerCondition.includes("asthma") ||
    lowerCondition.includes("respiratory")
  )
    return "#4A7DFF"; // Bluewave
  if (lowerCondition.includes("heart") || lowerCondition.includes("cardiac"))
    return "#7279FB"; // Electric Lilac

  return "#162B61"; // Midnight for other conditions
}

interface PatientListProps {
  onSelectPatient?: (patient: any) => void;
  genderFilter?: string | null;
  viewMode?: "grid" | "list";
  canEditPatient?: boolean;
  canDeletePatient?: boolean;
  listPage?: number;
  listPageSize?: number;
  onListPageChange?: (page: number) => void;
  onListPaginationInfo?: (info: { totalRows: number; totalPages: number }) => void;
}

interface PatientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any | null;
}

// Comprehensive Patient Details Modal Component
function PatientDetailsModal({
  open,
  onOpenChange,
  patient,
}: PatientDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");

  // Risk level editing state
  const [editingRiskLevel, setEditingRiskLevel] = useState(false);
  const [tempRiskLevel, setTempRiskLevel] = useState("");

  // Risk level update mutation
  const riskLevelUpdateMutation = useMutation({
    mutationFn: async ({ patientId, riskLevel }: { patientId: number; riskLevel: string }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ riskLevel }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update risk level: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Auto refresh - invalidate and refetch patients
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Risk Level Updated",
        description: "Patient risk level has been updated successfully.",
      });
      setEditingRiskLevel(false);
      setTempRiskLevel("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update risk level. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for risk level editing
  const handleStartEditingRiskLevel = (currentRiskLevel: string) => {
    setEditingRiskLevel(true);
    setTempRiskLevel(currentRiskLevel || "low");
  };

  const handleCancelEditingRiskLevel = () => {
    setEditingRiskLevel(false);
    setTempRiskLevel("");
  };

  const handleSaveRiskLevel = () => {
    if (patient?.id && tempRiskLevel) {
      riskLevelUpdateMutation.mutate({
        patientId: patient.id,
        riskLevel: tempRiskLevel,
      });
    }
  };

  // Fetch medical records by patient ID
  const { data: medicalRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["/api/patients", patient?.id, "records"],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/records`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch patient history by patient ID
  const { data: patientHistory = {}, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/patients", patient?.id, "history"],
    queryFn: async () => {
      if (!patient?.id) return {};
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/history`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch prescriptions by patient ID
  const { data: prescriptions = [], isLoading: prescriptionsLoading } =
    useQuery({
      queryKey: ["/api/patients", patient?.id, "prescriptions"],
      queryFn: async () => {
        if (!patient?.id) return [];
        const token = localStorage.getItem("auth_token");
        const headers: Record<string, string> = {
          "X-Tenant-Subdomain": getActiveSubdomain(),
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/patients/${patient.id}/prescriptions`,
          {
            headers,
            credentials: "include",
          },
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },
      enabled: !!patient?.id && open,
    });

  // Fetch lab results by patient ID
  const { data: labResults = [], isLoading: labResultsLoading } = useQuery({
    queryKey: ["/api/patients", patient?.id, "lab-results"],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/lab-results`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch medical imaging by patient ID
  const { data: medicalImaging = [], isLoading: imagingLoading } = useQuery({
    queryKey: ["/api/patients", patient?.id, "medical-imaging"],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/patients/${patient.id}/medical-imaging`,
        {
          headers,
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch health insurance information by patient ID from insurance_verifications table
  const { data: insuranceInfo = [], isLoading: insuranceLoading } = useQuery({
    queryKey: ["/api/insurance-verifications", patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/insurance-verifications?patientId=${patient.id}`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch address information by patient ID
  const { data: addressInfo = {}, isLoading: addressLoading } = useQuery({
    queryKey: ["/api/patients", patient?.id, "address"],
    queryFn: async () => {
      if (!patient?.id) return {};
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/address`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch emergency contact by patient ID
  const { data: emergencyContact = {}, isLoading: emergencyContactLoading } =
    useQuery({
      queryKey: ["/api/patients", patient?.id, "emergency-contact"],
      queryFn: async () => {
        if (!patient?.id) return {};
        const token = localStorage.getItem("auth_token");
        const headers: Record<string, string> = {
          "X-Tenant-Subdomain": getActiveSubdomain(),
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/patients/${patient.id}/emergency-contact`,
          {
            headers,
            credentials: "include",
          },
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },
      enabled: !!patient?.id && open,
    });

  // Fetch appointments by patient ID
  const { data: patientAppointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments", "patient", patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/appointments?patientId=${patient.id}`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch invoices by patient ID
  const { data: patientInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/patients", patient?.id, "invoices"],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/invoices`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch payments by patient ID
  const { data: patientPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/patients", patient?.id, "payments"],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/payments`, {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open,
  });

  // Fetch users data for provider details
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/users", {
        headers,
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: open,
  });

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 pt-6 flex flex-col">
        <DialogHeader className="px-6 pt-4 pb-2 flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            Patient Details - {patient.firstName} {patient.lastName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-11 flex-shrink-0">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="records">Medical Records</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="lab">Lab Results</TabsTrigger>
            <TabsTrigger value="imaging">Imaging</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="invoices-payments">Invoices & Payments</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="flex-1 overflow-y-auto p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </p>
                    <p className="text-lg">
                      {patient.firstName} {patient.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Patient ID
                    </p>
                    <p className="text-lg">{patient.patientId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date of Birth
                    </p>
                    <p>
                      {patient.dateOfBirth
                        ? format(new Date(patient.dateOfBirth), "MMM dd, yyyy")
                        : "Not available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Age
                    </p>
                    <p>{calculateAge(patient.dateOfBirth)}y</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone
                    </p>
                    <p>{patient.phone || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </p>
                    <p>{patient.email || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      NHS Number
                    </p>
                    <p>{patient.nhsNumber || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Risk Level
                    </p>
                    <div className="flex items-center gap-2">
                      {editingRiskLevel ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={tempRiskLevel}
                            onValueChange={setTempRiskLevel}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">low</SelectItem>
                              <SelectItem value="medium">medium</SelectItem>
                              <SelectItem value="high">high</SelectItem>
                              <SelectItem value="critical">critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={handleSaveRiskLevel}
                            disabled={riskLevelUpdateMutation.isPending}
                            className="h-8 px-2"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditingRiskLevel}
                            disabled={riskLevelUpdateMutation.isPending}
                            className="h-8 px-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getRiskLevelColor(patient.riskLevel)}
                            style={{
                              backgroundColor: getRiskLevelBgColor(patient.riskLevel),
                            }}
                          >
                            {patient.riskLevel || "Not assessed"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditingRiskLevel(patient.riskLevel)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                            data-testid="button-edit-risk-level"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {patient.address && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Address
                    </p>
                    <p>
                      {patient.address.street || ""}{" "}
                      {patient.address.city || ""}{" "}
                      {patient.address.postcode || ""}
                    </p>
                  </div>
                )}

                {patient.medicalHistory?.allergies &&
                  patient.medicalHistory.allergies.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allergies
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {patient.medicalHistory.allergies.map(
                          (allergy: string, index: number) => (
                            <Badge
                              key={index}
                              variant="destructive"
                              className="text-xs"
                            >
                              {allergy}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {patient.medicalHistory?.chronicConditions &&
                  patient.medicalHistory.chronicConditions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Chronic Conditions
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {patient.medicalHistory.chronicConditions.map(
                          (condition: string, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {condition}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Records Tab */}
          <TabsContent value="records" className="flex-1 overflow-y-auto p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Medical Records ({medicalRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="text-center py-4">
                    Loading medical records...
                  </div>
                ) : medicalRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No medical records found</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {medicalRecords.map((record: any) => (
                      <Card
                        key={record.id}
                        className="border-l-4"
                        style={{ borderLeftColor: "#4A7DFF" }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{record.title}</h4>
                            <Badge variant="outline">{record.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {format(
                              new Date(record.createdAt),
                              "MMM d, yyyy 'at' h:mm a",
                            )}
                          </p>
                          {record.notes && (
                            <p className="text-sm">{record.notes}</p>
                          )}
                          {record.diagnosis && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Diagnosis:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {record.diagnosis}
                              </p>
                            </div>
                          )}
                          {record.treatment && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Treatment:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {record.treatment}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complete Patient History Tab */}
          <TabsContent value="history" className="flex-1 overflow-y-hidden p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Complete Patient History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center py-4">
                    Loading patient history...
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "850px" }}>
                    {patientHistory?.familyHistory && (
                      <div>
                        <h4 className="font-semibold mb-2">Family History</h4>
                        <div className="space-y-2">
                          {Object.entries(patientHistory.familyHistory).map(
                            ([relation, conditions]: [string, any]) => (
                              <div
                                key={relation}
                                className="border rounded p-3"
                              >
                                <p className="font-medium capitalize">
                                  {relation}
                                </p>
                                {Array.isArray(conditions) &&
                                conditions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {conditions.map(
                                      (condition: string, index: number) => (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {condition}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">
                                    No conditions reported
                                  </p>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {patientHistory?.socialHistory && (
                      <div>
                        <h4 className="font-semibold mb-2">Social History</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(patientHistory.socialHistory).map(
                            ([key, value]: [string, any]) => {
                              // Handle nested objects (like {"status": "never"}) and strings
                              const displayValue =
                                typeof value === "object" && value !== null
                                  ? Object.values(value).join(", ") ||
                                    "Not specified"
                                  : value || "Not specified";

                              return (
                                <div key={key}>
                                  <p className="text-sm font-medium capitalize">
                                    {key.replace(/([A-Z])/g, " $1").trim()}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {displayValue}
                                  </p>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}

                    {patientHistory?.allergies &&
                      patientHistory.allergies.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Allergies</h4>
                          <div className="flex flex-wrap gap-2">
                            {patientHistory.allergies.map(
                              (allergy: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {allergy}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {patientHistory?.chronicConditions &&
                      patientHistory.chronicConditions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">
                            Chronic Conditions
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {patientHistory.chronicConditions.map(
                              (condition: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {condition}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {patientHistory?.medications &&
                      patientHistory.medications.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">
                            Current Medications
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {patientHistory.medications.map(
                              (medication: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {medication}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {patientHistory?.immunizations &&
                      patientHistory.immunizations.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Immunizations</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {patientHistory.immunizations.map(
                              (immunization: any, index: number) => (
                                <div key={index} className="border rounded p-3">
                                  <p className="font-medium text-sm">
                                    {typeof immunization === "string"
                                      ? immunization
                                      : immunization.vaccine ||
                                        immunization.name ||
                                        "Unknown Vaccine"}
                                  </p>
                                  {typeof immunization === "object" &&
                                    immunization.date && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Date:{" "}
                                        {format(
                                          new Date(immunization.date),
                                          "MMM d, yyyy",
                                        )}
                                      </p>
                                    )}
                                  {typeof immunization === "object" &&
                                    immunization.nextDue && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Next due:{" "}
                                        {format(
                                          new Date(immunization.nextDue),
                                          "MMM d, yyyy",
                                        )}
                                      </p>
                                    )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {!patientHistory?.familyHistory &&
                      !patientHistory?.socialHistory &&
                      (!patientHistory?.allergies ||
                        patientHistory.allergies.length === 0) &&
                      (!patientHistory?.chronicConditions ||
                        patientHistory.chronicConditions.length === 0) &&
                      (!patientHistory?.medications ||
                        patientHistory.medications.length === 0) &&
                      (!patientHistory?.immunizations ||
                        patientHistory.immunizations.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No patient history available</p>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="flex-1 overflow-y-auto p-0 m-0">
            {prescriptionsLoading ? (
              <div className="text-center py-4">Loading prescriptions...</div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No prescriptions found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {prescriptions.map((prescription: any) => (
                  <div
                    key={prescription.id}
                    className="space-y-6 border rounded-lg p-6 bg-gray-50 dark:bg-gray-800"
                  >
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
                            <p className="text-sm font-medium text-gray-600">
                              Name
                            </p>
                            <p className="font-medium">
                              {patient?.firstName} {patient?.lastName}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Patient ID
                            </p>
                            <p className="font-mono text-sm">{patient?.id}</p>
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
                            <p className="text-sm font-medium text-gray-600">
                              Provider
                            </p>
                            <p className="font-medium">
                              {prescription.prescribedBy ||
                                "Provider undefined"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Provider ID
                            </p>
                            <p className="font-mono text-sm">
                              {prescription.providerId || "N/A"}
                            </p>
                          </div>
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
                              style={{
                                backgroundColor: "#7279FB",
                                color: "white",
                              }}
                            >
                              {prescription.status || "signed"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Prescribed Date
                            </p>
                            <p className="font-medium">
                              {prescription.createdAt
                                ? format(
                                    new Date(prescription.createdAt),
                                    "dd/MM/yyyy",
                                  )
                                : "01/01/1970"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Prescription ID
                            </p>
                            <p className="font-mono text-sm">
                              {prescription.id}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Diagnosis
                          </p>
                          <p className="font-medium">
                            {prescription.diagnosis || "No diagnosis specified"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Medications */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Pill className="h-5 w-5" />
                          Medications ({prescription.medications?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {prescription.medications && prescription.medications.length > 0 ? (
                          <div className="space-y-3">
                            {prescription.medications.map((medication: any, index: number) => (
                              <div key={index} className="border rounded p-3 bg-white dark:bg-gray-700">
                                <div className="font-semibold text-lg mb-2">{medication.name}</div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium text-gray-600 dark:text-gray-300">Dosage:</p>
                                    <p>{medication.dosage}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-600 dark:text-gray-300">Frequency:</p>
                                    <p>{medication.frequency}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-600 dark:text-gray-300">Duration:</p>
                                    <p>{medication.duration}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-600 dark:text-gray-300">Quantity:</p>
                                    <p>{medication.quantity || 'Not specified'}</p>
                                  </div>
                                </div>
                                {medication.instructions && (
                                  <div className="mt-2">
                                    <p className="font-medium text-gray-600 dark:text-gray-300">Instructions:</p>
                                    <p className="text-sm">{medication.instructions}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <p>No medication information available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pharmacy Information */}
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
                          <p className="font-medium">Halo Health</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Address
                          </p>
                          <p>Unit 2 Drayton Court, Solihull, B90 4NG</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Phone
                          </p>
                          <p>+44(0)121 827 5531</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lab Results Tab */}
          <TabsContent value="lab" className="flex-1 overflow-y-hidden p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Lab Results ({labResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {labResultsLoading ? (
                  <div className="text-center py-4">Loading lab results...</div>
                ) : labResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No lab results found</p>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "850px" }}>
                    {labResults.map((result: any) => (
                      <Card
                        key={result.id}
                        className="border-l-4"
                        style={{ borderLeftColor: "#6CFFEB" }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">
                              {result.testName || result.name}
                            </h4>
                            <Badge
                              style={{
                                backgroundColor: "#6CFFEB",
                                color: "#162B61",
                              }}
                            >
                              {result.status || "Completed"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Test Date:{" "}
                            {format(
                              new Date(result.testDate || result.createdAt),
                              "MMM d, yyyy",
                            )}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                              <p className="font-medium">Test ID:</p>
                              <p>{result.testId || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="font-medium">Doctor:</p>
                              <p>{result.doctorName || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="font-medium">Priority:</p>
                              <p className="capitalize">{result.priority || "routine"}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Result:</p>
                              <p>
                                {result.result || result.value || "Pending"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Reference Range:</p>
                              <p>{result.referenceRange || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="font-medium">Units:</p>
                              <p>{result.units || "Not specified"}</p>
                            </div>
                          </div>
                          {result.notes && (
                            <div className="mt-2">
                              <p className="font-medium text-sm">Notes:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {result.notes}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Imaging Tab */}
          <TabsContent value="imaging" className="flex-1 overflow-y-hidden p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Medical Imaging ({medicalImaging.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {imagingLoading ? (
                  <div className="text-center py-4">
                    Loading medical imaging...
                  </div>
                ) : medicalImaging.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No medical imaging found</p>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "850px" }}>
                    {medicalImaging.map((imaging: any) => (
                      <Card
                        key={imaging.id}
                        className="border-l-4"
                        style={{ borderLeftColor: "#C073FF" }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">
                              {imaging.studyType || imaging.type}
                            </h4>
                            <Badge
                              style={{
                                backgroundColor: "#C073FF",
                                color: "white",
                              }}
                            >
                              {imaging.status || "Completed"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Study Date:{" "}
                            {format(
                              new Date(imaging.studyDate || imaging.createdAt),
                              "MMM d, yyyy",
                            )}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Body Part:</p>
                              <p>
                                {imaging.bodyPart ||
                                  imaging.anatomicalSite ||
                                  "Not specified"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Modality:</p>
                              <p>{imaging.modality || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="font-medium">Radiologist:</p>
                              <p>
                                {imaging.radiologist ||
                                  imaging.performedBy ||
                                  "Not specified"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Priority:</p>
                              <p>{imaging.priority || "Routine"}</p>
                            </div>
                          </div>
                          {imaging.findings && (
                            <div className="mt-2">
                              <p className="font-medium text-sm">Findings:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {imaging.findings}
                              </p>
                            </div>
                          )}
                          {imaging.impression && (
                            <div className="mt-2">
                              <p className="font-medium text-sm">Impression:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {imaging.impression}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Insurance Information Tab */}
          <TabsContent value="insurance" className="flex-1 overflow-y-auto p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Health Insurance Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insuranceLoading ? (
                  <div className="text-center py-4">
                    Loading insurance information...
                  </div>
                ) : insuranceInfo.length > 0 ? (
                  <div className="space-y-6">
                    {insuranceInfo.map((insurance: any, index: number) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Insurance Provider
                              </p>
                              <p className="text-lg">
                                {insurance.provider || "Not available"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Policy Number
                              </p>
                              <p className="text-lg">
                                {insurance.policyNumber || "Not available"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Member Number
                              </p>
                              <p>
                                {insurance.memberNumber || "Not available"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                NHS Number
                              </p>
                              <p>
                                {insurance.nhsNumber || "Not available"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Plan Type
                              </p>
                              <p>
                                {insurance.planType || "Not available"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Effective Date
                              </p>
                              <p>
                                {insurance.effectiveDate
                                  ? format(
                                      new Date(insurance.effectiveDate),
                                      "MMM dd, yyyy",
                                    )
                                  : "Not available"}
                              </p>
                            </div>
                            {insurance.status && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Status
                                </p>
                                <Badge 
                                  variant={insurance.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {insurance.status}
                                </Badge>
                              </div>
                            )}
                            {insurance.verificationDate && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Verification Date
                                </p>
                                <p>
                                  {format(
                                    new Date(insurance.verificationDate),
                                    "MMM dd, yyyy",
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                          {insurance.notes && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Notes
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {insurance.notes}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No insurance information available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Information Tab */}
          <TabsContent value="address" className="flex-1 overflow-y-auto p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addressLoading ? (
                  <div className="text-center py-4">
                    Loading address information...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Street Address
                        </p>
                        <p className="text-lg">
                          {addressInfo.street ||
                            patient.address?.street ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          City
                        </p>
                        <p>
                          {addressInfo.city ||
                            patient.address?.city ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          State/County
                        </p>
                        <p>
                          {addressInfo.state ||
                            addressInfo.county ||
                            patient.address?.state ||
                            patient.address?.county ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Postal Code
                        </p>
                        <p>
                          {addressInfo.postcode ||
                            addressInfo.zipCode ||
                            patient.address?.postcode ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Country
                        </p>
                        <p>
                          {addressInfo.country ||
                            patient.address?.country ||
                            "Not available"}
                        </p>
                      </div>
                    </div>

                    {(addressInfo.apartment ||
                      addressInfo.unit ||
                      patient.address?.apartment) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Apartment/Unit
                        </p>
                        <p>
                          {addressInfo.apartment ||
                            addressInfo.unit ||
                            patient.address?.apartment}
                        </p>
                      </div>
                    )}

                    {(addressInfo.addressType || patient.address?.type) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Address Type
                        </p>
                        <Badge variant="outline">
                          {addressInfo.addressType || patient.address?.type}
                        </Badge>
                      </div>
                    )}

                    {!addressInfo.street && !patient.address?.street && (
                      <div className="text-center py-8 text-gray-500">
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No address information available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contact Tab */}
          <TabsContent value="emergency" className="flex-1 overflow-y-auto p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emergencyContactLoading ? (
                  <div className="text-center py-4">
                    Loading emergency contact...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Contact Name
                        </p>
                        <p className="text-lg">
                          {emergencyContact.name ||
                            emergencyContact.contactName ||
                            patient.emergencyContact?.name ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Relationship
                        </p>
                        <p>
                          {emergencyContact.relationship ||
                            patient.emergencyContact?.relationship ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Primary Phone
                        </p>
                        <p>
                          {emergencyContact.phone ||
                            emergencyContact.primaryPhone ||
                            patient.emergencyContact?.phone ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Secondary Phone
                        </p>
                        <p>
                          {emergencyContact.secondaryPhone ||
                            emergencyContact.alternatePhone ||
                            patient.emergencyContact?.secondaryPhone ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email
                        </p>
                        <p>
                          {emergencyContact.email ||
                            patient.emergencyContact?.email ||
                            "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Preferred Contact Method
                        </p>
                        <p>
                          {emergencyContact.preferredContactMethod ||
                            patient.emergencyContact?.preferredContactMethod ||
                            "Not available"}
                        </p>
                      </div>
                    </div>

                    {(emergencyContact.address ||
                      patient.emergencyContact?.address) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Address
                        </p>
                        <p>
                          {emergencyContact.address ||
                            patient.emergencyContact?.address}
                        </p>
                      </div>
                    )}

                    {(emergencyContact.notes ||
                      patient.emergencyContact?.notes) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Notes
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {emergencyContact.notes ||
                            patient.emergencyContact?.notes}
                        </p>
                      </div>
                    )}

                    {!emergencyContact.name &&
                      !emergencyContact.contactName &&
                      !patient.emergencyContact?.name && (
                        <div className="text-center py-8 text-gray-500">
                          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No emergency contact information available</p>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="flex-1 overflow-y-auto p-0 m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Patient Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="text-center py-4">
                    Loading appointments...
                  </div>
                ) : patientAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No appointments found for this patient</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientAppointments.map((appointment: any) => (
                      <div
                        key={appointment.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Appointment ID
                            </p>
                            <p className="text-lg font-semibold">#{appointment.id}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Date & Time
                            </p>
                            <p className="text-lg">
                              {appointment.scheduledAt
                                ? format(new Date(appointment.scheduledAt), "MMM dd, yyyy HH:mm")
                                : "Not scheduled"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Status
                            </p>
                            <Badge
                              variant={
                                appointment.status === "confirmed"
                                  ? "default"
                                  : appointment.status === "completed"
                                  ? "secondary"
                                  : appointment.status === "cancelled"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {appointment.status || "pending"}
                            </Badge>
                          </div>
                          {appointment.providerId && (() => {
                            const provider = users.find((u: any) => u.id === appointment.providerId);
                            return provider ? (
                              <div className="md:col-span-2 lg:col-span-3 border-t pt-4 mt-4">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                  Provider Details
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      Provider Name
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {provider.firstName} {provider.lastName}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      Provider ID
                                    </p>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                      #{provider.id}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      Email
                                    </p>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                      {provider.email}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      Role
                                    </p>
                                    <Badge variant="outline" className="capitalize">
                                      {provider.role}
                                    </Badge>
                                  </div>
                                  {provider.department && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Department
                                      </p>
                                      <p className="text-sm text-gray-900 dark:text-white">
                                        {provider.department}
                                      </p>
                                    </div>
                                  )}
                                  {provider.medicalSpecialtyCategory && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Specialty
                                      </p>
                                      <p className="text-sm text-gray-900 dark:text-white">
                                        {provider.medicalSpecialtyCategory}
                                      </p>
                                    </div>
                                  )}
                                  {provider.subSpecialty && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Sub-Specialty
                                      </p>
                                      <p className="text-sm text-gray-900 dark:text-white">
                                        {provider.subSpecialty}
                                      </p>
                                    </div>
                                  )}
                                  {provider.workingDays && provider.workingDays.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Working Days
                                      </p>
                                      <p className="text-sm text-gray-900 dark:text-white">
                                        {provider.workingDays.join(", ")}
                                      </p>
                                    </div>
                                  )}
                                  {provider.workingHours && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Working Hours
                                      </p>
                                      <p className="text-sm text-gray-900 dark:text-white">
                                        {provider.workingHours.start} - {provider.workingHours.end}
                                      </p>
                                    </div>
                                  )}
                                  {provider.username && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Username
                                      </p>
                                      <p className="text-sm text-gray-900 dark:text-white">
                                        {provider.username}
                                      </p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      Status
                                    </p>
                                    <Badge variant={provider.isActive ? "default" : "secondary"}>
                                      {provider.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Provider ID
                                </p>
                                <p>{appointment.providerId}</p>
                              </div>
                            );
                          })()}
                          {appointment.reason && (
                            <div className="md:col-span-2">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Reason
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                {appointment.reason}
                              </p>
                            </div>
                          )}
                          {appointment.notes && (
                            <div className="md:col-span-2 lg:col-span-3">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Notes
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {appointment.notes}
                              </p>
                            </div>
                          )}
                          {appointment.type && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Type
                              </p>
                              <Badge variant="outline">{appointment.type}</Badge>
                            </div>
                          )}
                          {appointment.duration && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Duration
                              </p>
                              <p className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {appointment.duration} minutes
                              </p>
                            </div>
                          )}
                          {appointment.createdAt && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Created
                              </p>
                              <p className="text-sm">
                                {formatDistanceToNow(new Date(appointment.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices & Payments Tab */}
          <TabsContent value="invoices-payments" className="flex-1 overflow-y-auto p-0 m-0">
            <div className="space-y-6">
              {/* Invoices Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Patient Invoices ({patientInvoices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="text-center py-4">Loading invoices...</div>
                  ) : patientInvoices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No invoices found for this patient</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patientInvoices.map((invoice: any) => (
                        <div
                          key={invoice.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Invoice Number
                              </p>
                              <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Date
                              </p>
                              <p>
                                {invoice.invoiceDate
                                  ? format(new Date(invoice.invoiceDate), "MMM dd, yyyy")
                                  : "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Total Amount
                              </p>
                              <p className="text-lg font-semibold">
                                £{parseFloat(invoice.totalAmount || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Status
                              </p>
                              <Badge
                                variant={
                                  invoice.status === "paid"
                                    ? "default"
                                    : invoice.status === "pending"
                                    ? "outline"
                                    : "destructive"
                                }
                              >
                                {invoice.status || "pending"}
                              </Badge>
                            </div>
                            {invoice.dueDate && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Due Date
                                </p>
                                <p>
                                  {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                                </p>
                              </div>
                            )}
                            {invoice.paidAmount && parseFloat(invoice.paidAmount) > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Paid Amount
                                </p>
                                <p className="text-green-600 font-semibold">
                                  £{parseFloat(invoice.paidAmount).toFixed(2)}
                                </p>
                              </div>
                            )}
                            {invoice.notes && (
                              <div className="md:col-span-2 lg:col-span-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Notes
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {invoice.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Patient Payments ({patientPayments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentsLoading ? (
                    <div className="text-center py-4">Loading payments...</div>
                  ) : patientPayments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No payments found for this patient</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patientPayments.map((payment: any) => (
                        <div
                          key={payment.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Payment ID
                              </p>
                              <p className="text-lg font-semibold">#{payment.id}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Amount
                              </p>
                              <p className="text-lg font-semibold text-green-600">
                                £{parseFloat(payment.amount || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Method
                              </p>
                              <Badge variant="outline">{payment.paymentMethod || "N/A"}</Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Status
                              </p>
                              <Badge
                                variant={
                                  payment.paymentStatus === "completed"
                                    ? "default"
                                    : payment.paymentStatus === "pending"
                                    ? "outline"
                                    : "destructive"
                                }
                              >
                                {payment.paymentStatus || "completed"}
                              </Badge>
                            </div>
                            {payment.paymentDate && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Payment Date
                                </p>
                                <p>
                                  {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
                                </p>
                              </div>
                            )}
                            {payment.notes && (
                              <div className="md:col-span-2 lg:col-span-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Notes
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {payment.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function PatientList({
  onSelectPatient,
  genderFilter = null,
  viewMode = "grid",
  canEditPatient = true,
  canDeletePatient = true,
  listPage,
  listPageSize,
  onListPageChange,
  onListPaginationInfo,
}: PatientListProps = {}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchType: "all",
  });
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [communicationDialog, setCommunicationDialog] = useState<{
    open: boolean;
    patient: any | null;
    mode: "flag" | "reminder";
  }>({
    open: false,
    patient: null,
    mode: "reminder",
  });

  const [editModal, setEditModal] = useState<{
    open: boolean;
    patient: any | null;
  }>({
    open: false,
    patient: null,
  });

  const [patientDetailsModal, setPatientDetailsModal] = useState<{
    open: boolean;
    patient: any | null;
  }>({
    open: false,
    patient: null,
  });

  // Risk level editing state for main patient cards
  const [editingRiskLevelId, setEditingRiskLevelId] = useState<number | null>(null);
  const [tempRiskLevel, setTempRiskLevel] = useState("");

  // Grid view: popup to edit risk level (status)
  const [editRiskLevelDialog, setEditRiskLevelDialog] = useState<{
    open: boolean;
    patient: any | null;
  }>({ open: false, patient: null });

  // Delete confirmation dialog state
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    patient: any | null;
  }>({
    open: false,
    patient: null,
  });

  const handleRemindPatient = (patient: any) => {
    setCommunicationDialog({
      open: true,
      patient,
      mode: "reminder",
    });
  };

  const handleFlagPatient = (patient: any) => {
    setCommunicationDialog({
      open: true,
      patient,
      mode: "flag",
    });
  };

  const handleEditPatient = (patient: any) => {
    setEditModal({
      open: true,
      patient,
    });
  };

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return apiRequest("DELETE", `/api/patients/${patientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient deleted",
        description: "Patient has been successfully removed from the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting patient",
        description:
          error.message || "Failed to delete patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete flag mutation
  const deleteFlagMutation = useMutation({
    mutationFn: async ({
      patientId,
      flagIndex,
    }: {
      patientId: number;
      flagIndex: number;
    }) => {
      return apiRequest(
        "DELETE",
        `/api/patients/${patientId}/flags/${flagIndex}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Flag removed",
        description: "Patient flag has been successfully removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing flag",
        description:
          error.message || "Failed to remove flag. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteFlag = (patient: any, flagIndex: number) => {
    deleteFlagMutation.mutate({ patientId: patient.id, flagIndex });
  };

  // Risk level update mutation
  const riskLevelUpdateMutation = useMutation({
    mutationFn: async ({ patientId, riskLevel }: { patientId: number; riskLevel: string }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ riskLevel }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update risk level: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Auto refresh - invalidate and refetch patients
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Risk Level Updated",
        description: "Patient risk level has been updated successfully.",
      });
      setEditingRiskLevelId(null);
      setTempRiskLevel("");
      setEditRiskLevelDialog({ open: false, patient: null });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update risk level. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for risk level editing
  const handleStartEditingRiskLevel = (patientId: number, currentRiskLevel: string) => {
    setEditingRiskLevelId(patientId);
    setTempRiskLevel(currentRiskLevel || "low");
  };

  const handleCancelEditingRiskLevel = () => {
    setEditingRiskLevelId(null);
    setTempRiskLevel("");
  };

  const handleSaveRiskLevel = () => {
    if (editingRiskLevelId && tempRiskLevel) {
      riskLevelUpdateMutation.mutate({
        patientId: editingRiskLevelId,
        riskLevel: tempRiskLevel,
      });
    }
  };

  // Active status update mutation
  const activeStatusUpdateMutation = useMutation({
    mutationFn: async ({ patientId, isActive }: { patientId: number; isActive: boolean }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getTenantSubdomain(),
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update active status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Auto refresh - invalidate and refetch patients
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Status Updated",
        description: "Patient active status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update active status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function for active status toggle
  const handleToggleActiveStatus = (patientId: number, currentStatus: boolean) => {
    activeStatusUpdateMutation.mutate({
      patientId,
      isActive: !currentStatus,
    });
  };

  const handleDeletePatient = (patient: any) => {
    setDeleteConfirmDialog({
      open: true,
      patient,
    });
  };

  const confirmDeletePatient = () => {
    if (deleteConfirmDialog.patient) {
      deletePatientMutation.mutate(deleteConfirmDialog.patient.id);
      setDeleteConfirmDialog({ open: false, patient: null });
    }
  };

  const handleViewRecords = (patient: any) => {
    console.log("View records for:", patient.firstName, patient.lastName);
    toast({
      title: "Medical Records",
      description: `Opening medical records for ${patient.firstName} ${patient.lastName}`,
    });
    const subdomain = getTenantSubdomain();
    setLocation(`/${subdomain}/patients/${patient.id}/records`);
  };

  const {
    data: patients = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/patients", user?.id, user?.role],
    enabled: !authLoading,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const headers: Record<string, string> = {
          "X-Tenant-Subdomain": getTenantSubdomain(),
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        console.log("Fetching patients with headers:", headers);

        const url = `/api/patients`;
        const response = await fetch(url, {
          headers,
          credentials: "include",
        });

        console.log("Patients response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Patients fetch failed:", response.status, errorText);
          
          // If 403 error (access denied), treat as no patients instead of error
          if (response.status === 403) {
            console.log("Access denied - treating as no patients available");
            return [];
          }
          
          throw new Error(
            `Failed to fetch patients: ${response.status} ${errorText}`,
          );
        }

        const data = await response.json();
        console.log("Patients data received:", data);
        console.log("Current user from useAuth:", { role: user?.role, email: user?.email });
        
        // If logged in user is a patient, filter to show only their own record
        if (user?.role === "patient" && user?.email) {
          const filteredData = data.filter((patient: any) => patient.email === user.email);
          console.log("Filtered patient data for patient role:", filteredData);
          return filteredData;
        }
        
        console.log("NOT filtering - returning all patients");
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error("Error in patients queryFn:", err);
        throw err;
      }
    },
    refetchOnMount: true,
    retry: 1,
  });

  console.log(
    "PatientList - isLoading:",
    isLoading,
    "error:",
    error,
    "patients:",
    patients,
  );

  // Auto-apply filters when data or filters change
  useEffect(() => {
    if (
      patients &&
      (searchQuery ||
        searchFilters.insuranceProvider ||
        searchFilters.riskLevel ||
        searchFilters.patientId ||
        searchFilters.lastVisit)
    ) {
      handleSearch(searchQuery, searchFilters);
    }
  }, [patients, searchQuery, searchFilters]);

  // Sync editModal.patient with fresh data after cache invalidation
  useEffect(() => {
    if (
      editModal.open &&
      editModal.patient &&
      patients &&
      Array.isArray(patients)
    ) {
      const updatedPatient = patients.find(
        (p) => p.id === editModal.patient.id,
      );
      if (updatedPatient) {
        // Only update if the data has actually changed to avoid unnecessary re-renders
        const currentPatientData = JSON.stringify(editModal.patient);
        const updatedPatientData = JSON.stringify(updatedPatient);

        if (currentPatientData !== updatedPatientData) {
          console.log(
            "Syncing editModal.patient with fresh data for patient:",
            updatedPatient.id,
          );
          setEditModal((prev) => ({
            ...prev,
            patient: updatedPatient,
          }));
        }
      }
    }
  }, [patients, editModal.open, editModal.patient?.id]);

  const handleViewPatient = (patient: any) => {
    if (onSelectPatient) {
      onSelectPatient(patient);
    } else {
      setPatientDetailsModal({
        open: true,
        patient: patient,
      });
    }
  };

  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);

    if (!patients || !Array.isArray(patients)) return;

    let filtered = [...patients];

    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      // Normalize phone numbers for searching - remove spaces, dashes, parentheses
      const normalizePhone = (phone: string) =>
        phone?.replace(/[\s\-\(\)]/g, "") || "";

      filtered = filtered.filter((patient) => {
        switch (filters.searchType) {
          case "name":
            return `${patient.firstName} ${patient.lastName}`
              .toLowerCase()
              .includes(searchTerm);
          case "postcode":
            return patient.address?.postcode
              ?.toLowerCase()
              .includes(searchTerm);
          case "phone":
            const patientPhone = normalizePhone(
              patient.phone?.toLowerCase() || "",
            );
            const normalizedSearchTerm = normalizePhone(searchTerm);
            return patientPhone.includes(normalizedSearchTerm);
          case "nhsNumber":
            return patient.nhsNumber?.toLowerCase().includes(searchTerm);
          case "email":
            return patient.email?.toLowerCase().includes(searchTerm);
          default:
            const defaultPatientPhone = normalizePhone(
              patient.phone?.toLowerCase() || "",
            );
            const defaultNormalizedSearchTerm = normalizePhone(searchTerm);
            return (
              `${patient.firstName} ${patient.lastName}`
                .toLowerCase()
                .includes(searchTerm) ||
              patient.address?.postcode?.toLowerCase().includes(searchTerm) ||
              defaultPatientPhone.includes(defaultNormalizedSearchTerm) ||
              patient.nhsNumber?.toLowerCase().includes(searchTerm) ||
              patient.email?.toLowerCase().includes(searchTerm)
            );
        }
      });
    }

    if (filters.insuranceProvider && filters.insuranceProvider !== "") {
      filtered = filtered.filter((patient) => {
        // Handle different insurance provider formats
        const provider = patient.insuranceInfo?.provider?.toLowerCase() || "";
        const filterProvider = filters.insuranceProvider?.toLowerCase() || "";

        // Special handling for common provider names
        if (filterProvider === "nhs")
          return provider.includes("nhs") || provider === "";
        if (filterProvider === "axa-ppp")
          return provider.includes("axa") || provider.includes("ppp");

        return provider.includes(filterProvider);
      });
    }

    if (filters.riskLevel) {
      filtered = filtered.filter(
        (patient) => patient.riskLevel === filters.riskLevel,
      );
    }

    if (filters.patientId) {
      filtered = filtered.filter(
        (patient) => patient.patientId === filters.patientId,
      );
    }

    setFilteredPatients(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchFilters({ searchType: "all" });
    setFilteredPatients([]);
  };

  const handleBookAppointment = (patient: any) => {
    console.log(
      "Booking appointment for:",
      patient.firstName,
      patient.lastName,
    );
    toast({
      title: "Book Appointment",
      description: `Booking appointment for ${patient.firstName} ${patient.lastName}`,
    });
    // Use patient.id (not patient.patientId) to match the URL parameter format
    // Navigate to calendar page with patientId in URL so the modal opens with correct patient
    const subdomain = getTenantSubdomain();
    setLocation(`/${subdomain}/calendar?patientId=${patient.id}`);
  };

  // Check if any filters are actually applied (not just default values)
  const hasActiveFilters =
    searchQuery ||
    searchFilters.insuranceProvider ||
    searchFilters.riskLevel ||
    searchFilters.patientId ||
    searchFilters.lastVisit ||
    (searchFilters.searchType && searchFilters.searchType !== "all");

  // Backend handles active/inactive filtering via API query parameters
  let displayPatients = hasActiveFilters
    ? filteredPatients
    : Array.isArray(patients)
      ? patients
      : [];
  
  // Apply gender filter if set
  if (genderFilter) {
    displayPatients = displayPatients.filter(
      (patient) => patient.genderAtBirth === genderFilter
    );
  }

  // Family hierarchy: group by userId, show Self as the "main" patient then nest relatives under it.
  const relationRank = (relation?: string | null) => {
    if (!relation) return 50;
    const r = String(relation).toLowerCase();
    if (r === "self") return 0;
    if (r === "spouse") return 10;
    if (r === "father") return 20;
    if (r === "mother") return 21;
    if (r === "son") return 30;
    if (r === "daughter") return 31;
    if (r === "other") return 40;
    return 45;
  };

  const patientGroups = (() => {
    const map = new Map<number | string, any[]>();
    for (const p of displayPatients) {
      const key = p?.userId ?? `no-user-${p?.id ?? Math.random()}`;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }

    const groups = Array.from(map.values()).map((members) => {
      const sorted = [...members].sort((a, b) => {
        const rr = relationRank(a?.relation) - relationRank(b?.relation);
        if (rr !== 0) return rr;
        const na = `${a?.firstName ?? ""} ${a?.lastName ?? ""}`.trim().toLowerCase();
        const nb = `${b?.firstName ?? ""} ${b?.lastName ?? ""}`.trim().toLowerCase();
        return na.localeCompare(nb);
      });

      const main = sorted.find((m) => String(m?.relation ?? "").toLowerCase() === "self") ?? sorted[0];
      const relatives = sorted.filter((m) => m !== main);
      return { main, relatives };
    });

    groups.sort((a, b) => {
      const na = `${a.main?.firstName ?? ""} ${a.main?.lastName ?? ""}`.trim().toLowerCase();
      const nb = `${b.main?.firstName ?? ""} ${b.main?.lastName ?? ""}`.trim().toLowerCase();
      return na.localeCompare(nb);
    });

    return groups;
  })();

  const listRows = patientGroups.flatMap(({ main, relatives }) => [
    { patient: main, isChild: false },
    ...relatives.map((p) => ({ patient: p, isChild: true })),
  ]);

  const listPaginationEnabled =
    viewMode === "list" &&
    listPage !== undefined &&
    listPageSize !== undefined &&
    listPageSize > 0;

  const listTotalRows = listRows.length;
  const listTotalPages = listPaginationEnabled
    ? Math.max(1, Math.ceil(listTotalRows / listPageSize))
    : 1;

  const paginatedListRows = listPaginationEnabled
    ? listRows.slice((listPage - 1) * listPageSize, listPage * listPageSize)
    : listRows;

  useEffect(() => {
    if (!onListPaginationInfo) return;
    onListPaginationInfo({ totalRows: listTotalRows, totalPages: listTotalPages });
  }, [listTotalRows, listTotalPages, onListPaginationInfo]);

  useEffect(() => {
    if (!onListPageChange) return;
    onListPageChange(1);
  }, [searchQuery, searchFilters, genderFilter, onListPageChange]);

  if (error) {
    console.error("Patient list error:", error);
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Failed to load patients</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Patients
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {isLoading ? (
            "Loading..."
          ) : (
            <>
          {displayPatients.length} patient
          {displayPatients.length !== 1 ? "s" : ""} found
            </>
          )}
        </div>
      </div>

      <PatientSearch onSearch={handleSearch} onClear={handleClearSearch} />

      {isLoading ? (
        viewMode === "list" ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[7%] min-w-0">
                      Patient No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[14%] min-w-0">
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] min-w-0">
                      Relation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] min-w-0">
                      DOB
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[11%] min-w-0">
                      Mobile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[18%] min-w-0">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[8%] min-w-0">
                      Risk
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[14%] min-w-0">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] min-w-0">
                      Remind / Flag
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[8%] min-w-0">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(5)].map((_, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4 mx-auto"></div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3 ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="h-[400px] flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : displayPatients.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No patients found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery
              ? "Try adjusting your search criteria"
              : "No patients have been added yet"}
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[7%] min-w-0">
                    Patient No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[14%] min-w-0">
                    Full Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] min-w-0">
                    Relation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] min-w-0">
                    DOB
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[11%] min-w-0">
                    Mobile
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[18%] min-w-0">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[8%] min-w-0">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[14%] min-w-0">
                    Email
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] min-w-0">
                    Remind / Flag
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[8%] min-w-0">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedListRows.map(({ patient, isChild }) => (
                    <tr 
                      key={patient.id} 
                      className={`transition-colors ${isChild ? "bg-gray-50/40 dark:bg-gray-900/20" : ""} hover:bg-gray-50 dark:hover:bg-gray-900`}
                      data-testid={`row-patient-${patient.id}`}
                    >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-0">
                      <div className="truncate" title={patient.patientId}>{patient.patientId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {isChild && (
                          <span className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true">
                            ↳
                          </span>
                        )}
                        {(() => {
                          const meta = getPatientAccountKindBadge(patient);
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-2 min-w-0 group">
                                    <span
                                      className="truncate"
                                      title={displayPatientName(patient)}
                                    >
                                      {displayPatientName(patient)}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`${meta.badgeClassName} opacity-0 group-hover:opacity-100 transition-opacity`}
                                    >
                                      {meta.label}
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">{meta.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                        {patient.medicalHistory?.allergies && patient.medicalHistory.allergies.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex-shrink-0">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Allergies: {patient.medicalHistory.allergies.join(", ")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-0">
                      <div className="truncate" title={patient.relation || ""}>
                        {patient.relation || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-0">
                      <div className="truncate" title={patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd.MM.yyyy') + (() => {
                        const birthDate = new Date(patient.dateOfBirth);
                        const today = new Date();
                        const age = today.getFullYear() - birthDate.getFullYear() - 
                          (today.getMonth() < birthDate.getMonth() || 
                          (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                        return ` (${age})`;
                      })() : ''}>
                        {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd.MM.yyyy') : ''} 
                        {patient.dateOfBirth && (() => {
                          const birthDate = new Date(patient.dateOfBirth);
                          const today = new Date();
                          const age = today.getFullYear() - birthDate.getFullYear() - 
                            (today.getMonth() < birthDate.getMonth() || 
                            (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                          return ` (${age})`;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-0">
                      <div className="truncate" title={patient.phone || ''}>{patient.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-0">
                      <div className="truncate" title={patient.address?.street && patient.address?.city ? 
                        `${patient.address.street}, ${patient.address.postcode || ''} ${patient.address.city || ''}`.trim() : 
                        ''}>
                        {patient.address?.street && patient.address?.city ? 
                          `${patient.address.street}, ${patient.address.postcode || ''} ${patient.address.city || ''}`.trim() : 
                          ''
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-0">
                      <div className="truncate min-w-0">
                        {patient.riskLevel && (
                          <Badge
                            className={`text-xs ${getRiskLevelColor(patient.riskLevel)}`}
                            style={{ backgroundColor: getRiskLevelBgColor(patient.riskLevel) }}
                          >
                            {patient.riskLevel}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <span
                          className="truncate"
                          title={displayPatientScalar(patient.email, "No email")}
                        >
                          {displayPatientScalar(patient.email, "No email")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemindPatient(patient)}
                                className="h-7 w-7 p-0"
                                data-testid={`button-remind-${patient.id}`}
                              >
                                <Bell className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send reminder</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFlagPatient(patient)}
                                className="h-7 w-7 p-0"
                                data-testid={`button-flag-${patient.id}`}
                              >
                                <Flag className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add flag</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              data-testid={`button-actions-${patient.id}`}
                              title="Actions"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuItem
                              onClick={() => handleViewPatient(patient)}
                              data-testid={`button-view-${patient.id}`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-2 shrink-0" />
                              View
                            </DropdownMenuItem>
                            {canEditPatient && (
                              <DropdownMenuItem
                                onClick={() => handleEditPatient(patient)}
                                data-testid={`button-edit-${patient.id}`}
                              >
                                <Edit className="h-3.5 w-3.5 mr-2 shrink-0" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleViewRecords(patient)}
                            >
                              <FileText className="h-3.5 w-3.5 mr-2 shrink-0" />
                              View Records
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleBookAppointment(patient)}
                            >
                              <Calendar className="h-3.5 w-3.5 mr-2 shrink-0" />
                              Book Appointment
                            </DropdownMenuItem>
                            {canDeletePatient && (
                              <DropdownMenuItem
                                onClick={() => handleDeletePatient(patient)}
                                disabled={deletePatientMutation.isPending}
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                data-testid={`button-delete-${patient.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 min-w-0 w-full">
          {patientGroups.map(({ main, relatives }) => {
            const patient = main;
            return (
              <Card
                key={patient.id}
                className="hover:shadow-md transition-shadow min-h-0 flex flex-col overflow-hidden"
              >
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                        <AvatarFallback
                          className="text-white text-xs sm:text-sm font-semibold"
                          style={{ backgroundColor: "#4A7DFF" }}
                        >
                          {getPatientInitials(
                            patient.firstName,
                            patient.lastName,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block cursor-default">
                                  {patient.firstName} {patient.lastName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs break-words">
                                  {[patient.firstName, patient.lastName].filter(Boolean).join(" ")}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {(() => {
                            const meta = getPatientAccountKindBadge(patient);
                            return (
                              <Badge
                                variant="outline"
                                className={`${meta.badgeClassName} opacity-0 group-hover:opacity-100 transition-opacity`}
                              >
                                {meta.label}
                              </Badge>
                            );
                          })()}
                          <TooltipProvider>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {patient.medicalHistory?.allergies &&
                                patient.medicalHistory.allergies.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex-shrink-0">
                                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        Allergies:{" "}
                                        {patient.medicalHistory.allergies.join(
                                          ", ",
                                        )}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              {patient.medicalHistory?.chronicConditions &&
                                patient.medicalHistory.chronicConditions.length >
                                  0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex-shrink-0">
                                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        Conditions:{" "}
                                        {patient.medicalHistory.chronicConditions.join(
                                          ", ",
                                        )}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                            </div>
                          </TooltipProvider>
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {patient.dateOfBirth
                            ? (() => {
                                const birthDate = new Date(patient.dateOfBirth);
                                const today = new Date();
                                const age =
                                  today.getFullYear() -
                                  birthDate.getFullYear() -
                                  (today.getMonth() < birthDate.getMonth() ||
                                  (today.getMonth() === birthDate.getMonth() &&
                                    today.getDate() < birthDate.getDate())
                                    ? 1
                                    : 0);
                                return `Age ${age}y`;
                              })()
                            : "Age Not Available"}{" "}
                          • {patient.patientId}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 gap-1 flex-shrink-0">
                      {patient.riskLevel && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge
                            className={`text-[10px] sm:text-xs flex-shrink-0 whitespace-nowrap max-w-[4.5rem] truncate ${getRiskLevelColor(patient.riskLevel)}`}
                            style={{
                              backgroundColor: getRiskLevelBgColor(
                                patient.riskLevel,
                              ),
                            }}
                          >
                            {patient.riskLevel}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditRiskLevelDialog({ open: true, patient });
                              setTempRiskLevel(patient.riskLevel || "low");
                            }}
                            className="h-4 w-4 p-0 hover:bg-gray-100 flex-shrink-0"
                            data-testid="button-edit-risk-level"
                          >
                            <Edit className="h-2 w-2" />
                          </Button>
                        </div>
                      )}
                      {patient.insuranceInfo?.provider && (
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="max-w-[5rem] min-w-0 flex-shrink-0 inline-block">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] dark:text-gray-200 dark:border-gray-600 w-full cursor-help !inline-block overflow-hidden text-ellipsis whitespace-nowrap"
                                  style={{ 
                                    maxWidth: '5rem',
                                    display: 'inline-block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={patient.insuranceInfo.provider}
                                >
                                  {patient.insuranceInfo.provider === "NHS (National Health Service)" ? "NHS" : patient.insuranceInfo.provider.toUpperCase()}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="end" className="z-[100]">
                              <p className="max-w-xs break-words text-[10px]">Insurance Provider: {patient.insuranceInfo.provider}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {patient.isInsured && (
                        <Badge
                          className="text-[10px] sm:text-xs flex-shrink-0 whitespace-nowrap bg-amber-200 text-amber-900 border-0 dark:bg-amber-600/80 dark:text-amber-100"
                          data-testid={`badge-insured-${patient.id}`}
                        >
                          Insured
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-hidden pb-4 sm:pb-5 flex-1 flex flex-col justify-between min-h-0">
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm min-w-0">
                    {patient.phone && (
                      <div className="flex items-center min-w-0">
                        <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 text-gray-600 dark:text-gray-300" />
                        <span className="text-neutral-600 dark:text-neutral-300 truncate">
                          {patient.phone}
                        </span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center min-w-0">
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 text-gray-600 dark:text-gray-300" />
                        <span className="text-neutral-600 dark:text-neutral-300 truncate">
                          {patient.email}
                        </span>
                      </div>
                    )}
                    {patient.nhsNumber && (
                      <div className="flex items-center min-w-0 text-neutral-600 dark:text-white">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                        <span className="truncate">NHS: {patient.nhsNumber}</span>
                      </div>
                    )}
                    {patient.genderAtBirth && (
                      <div className="flex items-center min-w-0 text-neutral-600 dark:text-neutral-300">
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                        <span className="truncate">Gender: {patient.genderAtBirth}</span>
                      </div>
                    )}
                    {patient.relation && (
                      <div className="flex items-center min-w-0 text-neutral-600 dark:text-neutral-300">
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                        <span className="truncate">Relation: {patient.relation}</span>
                      </div>
                    )}
                    {relatives.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Family Members
                        </p>
                        <div className="space-y-1">
                          {relatives.slice(0, 4).map((m: any) => (
                            <div key={m.id} className="flex items-center gap-2 min-w-0 text-neutral-600 dark:text-neutral-300">
                              <span className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true">↳</span>
                              <span className="truncate">
                                {(m.relation || "Other")}: {m.firstName} {m.lastName}
                              </span>
                            </div>
                          ))}
                          {relatives.length > 4 && (
                            <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                              +{relatives.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {patient.address?.postcode && (
                      <div className="flex items-center min-w-0 text-neutral-600 dark:text-neutral-300">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                        <span className="truncate">
                          {patient.address.postcode}
                          {patient.address.city && `, ${patient.address.city}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {patient.medicalHistory?.chronicConditions &&
                    patient.medicalHistory.chronicConditions.length > 0 && (
                      <div className="space-y-0.5 sm:space-y-1 min-w-0">
                        <p className="text-[10px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Conditions:
                        </p>
                        <div className="flex flex-wrap gap-1 max-w-full min-w-0">
                          {patient.medicalHistory.chronicConditions
                            .slice(0, 2)
                            .map((condition: string, index: number) => (
                              <Badge
                                key={index}
                                className={`text-[10px] sm:text-xs flex-shrink-0 max-w-full truncate ${getConditionColor(condition)}`}
                                style={{
                                  backgroundColor:
                                    getConditionBgColor(condition),
                                }}
                              >
                                {condition}
                              </Badge>
                            ))}
                          {patient.medicalHistory.chronicConditions.length >
                            2 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] sm:text-xs dark:text-gray-200 dark:border-gray-600 flex-shrink-0 whitespace-nowrap"
                            >
                              +{patient.medicalHistory.chronicConditions.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                  {patient.lastVisit && (
                    <div className="flex items-center text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate min-w-0">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      Last visit:{" "}
                      {formatDistanceToNow(new Date(patient.lastVisit), {
                        addSuffix: true,
                      })}
                    </div>
                  )}

                  {/* Display patient flags - Show only 2, hide others */}
                  {patient.flags && patient.flags.length > 0 && (
                    <TooltipProvider>
                      <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2 min-h-[20px] sm:min-h-[24px] max-w-full min-w-0">
                        {patient.flags.slice(0, 2).map((flag: string, index: number) => {
                          const flagParts = flag.split(":");
                          const [category, , reason] = flagParts;
                          const getFlagTypeDisplay = (type: string) => {
                            const flagTypes: Record<string, string> = {
                              medical_alert: "🚩 Medical Alert",
                              allergy_warning: "🚩 Allergy Warning",
                              medication_interaction:
                                "🚩 Medication Interaction",
                              high_risk: "🚩 High Risk",
                              special_needs: "🚩 Special Needs",
                              insurance_issue: "🚩 Insurance Issue",
                              payment_overdue: "🚩 Payment Overdue",
                              follow_up_required: "🚩 Follow-up Required",
                            };
                            return (
                              flagTypes[type] ||
                              `🚩 ${type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`
                            );
                          };
                          return (
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <div className="relative group flex-shrink-0 max-w-full min-w-0">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] sm:text-xs pr-5 sm:pr-6 cursor-pointer max-w-[7rem] sm:max-w-none truncate flex-shrink-0"
                                  >
                                    {getFlagTypeDisplay(category)}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900 rounded-r-md flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFlagMutation.mutate({
                                          patientId: patient.id,
                                          flagIndex: index,
                                        });
                                      }}
                                    >
                                      <X className="h-2 w-2 text-red-500" />
                                    </Button>
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Reason for Flag:{" "}
                                  {reason || "No reason specified"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {patient.flags.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] sm:text-xs dark:text-gray-200 dark:border-gray-600 flex-shrink-0 whitespace-nowrap"
                          >
                            +{patient.flags.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TooltipProvider>
                  )}

                  <div className="space-y-1.5 sm:space-y-2 mt-2 sm:mt-4">
                    {/* Primary action buttons - Medical Records prominently featured */}
                    <div className="flex gap-1.5 sm:gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const subdomain = getTenantSubdomain();
                          setLocation(`/${subdomain}/patients/${patient.id}/records`);
                        }}
                        className="flex-1 text-xs sm:text-sm min-w-0 bg-blue-600 hover:bg-blue-700 text-white border-0 dark:bg-blue-500 dark:hover:bg-blue-400 dark:text-white"
                      >
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">Records</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBookAppointment(patient)}
                        className="flex-1 text-xs sm:text-sm min-w-0 bg-blue-600 hover:bg-blue-700 text-white border-0 dark:bg-blue-500 dark:hover:bg-blue-400 dark:text-white"
                      >
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">Book</span>
                      </Button>
                    </div>

                    {/* Secondary actions - icon only by default; label on hover to prevent overlapping */}
                    <div
                      className="flex items-center justify-between gap-1 flex-wrap"
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleViewPatient(patient)}
                              className="h-8 w-8 shrink-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                              data-testid={`button-view-${patient.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {canEditPatient && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditPatient(patient)}
                                className="h-8 w-8 shrink-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                data-testid={`button-edit-${patient.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemindPatient(patient)}
                              className="h-8 w-8 shrink-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                              data-testid={`button-remind-${patient.id}`}
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Remind</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFlagPatient(patient)}
                              className="h-8 w-8 shrink-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                              data-testid={`button-flag-${patient.id}`}
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Flag</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {canDeletePatient && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeletePatient(patient)}
                                className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-gray-700"
                                disabled={deletePatientMutation.isPending}
                                data-testid={`button-delete-${patient.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {patient.alerts && patient.alerts.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-1.5 sm:p-2 min-w-0">
                      <div className="flex items-center text-red-700 dark:text-red-300 text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1">
                        <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">Urgent Alerts</span>
                      </div>
                      {patient.alerts
                        .slice(0, 2)
                        .map((alert: any, index: number) => (
                          <p
                            key={index}
                            className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 truncate"
                          >
                            {alert.message || alert}
                          </p>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Enhanced Communication Dialog */}
      <PatientCommunicationDialog
        open={communicationDialog.open}
        onOpenChange={(open) =>
          setCommunicationDialog((prev) => ({ ...prev, open }))
        }
        patient={communicationDialog.patient}
        mode={communicationDialog.mode}
      />

      <PatientModal
        open={editModal.open}
        onOpenChange={(open) =>
          setEditModal({ open, patient: open ? editModal.patient : null })
        }
        editMode={true}
        editPatient={editModal.patient}
      />

      {/* Comprehensive Patient Details Modal */}
      <PatientDetailsModal
        open={patientDetailsModal.open}
        onOpenChange={(open) =>
          setPatientDetailsModal({
            open,
            patient: open ? patientDetailsModal.patient : null,
          })
        }
        patient={patientDetailsModal.patient}
      />

      {/* Grid view: Edit Risk Level (Status) popup */}
      <Dialog
        open={editRiskLevelDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setEditRiskLevelDialog({ open: false, patient: null });
            setTempRiskLevel("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
          </DialogHeader>
          {editRiskLevelDialog.patient && (
            <>
              <div className="space-y-2 py-2">
                <Label>Risk Level</Label>
                <Select
                  value={tempRiskLevel}
                  onValueChange={setTempRiskLevel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditRiskLevelDialog({ open: false, patient: null });
                    setTempRiskLevel("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    riskLevelUpdateMutation.mutate({
                      patientId: editRiskLevelDialog.patient.id,
                      riskLevel: tempRiskLevel,
                    });
                  }}
                  disabled={riskLevelUpdateMutation.isPending}
                >
                  {riskLevelUpdateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({ open, patient: open ? deleteConfirmDialog.patient : null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Delete Patient
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Patient Data Display - Scrollable if content exceeds 550px */}
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '550px' }}>
              {deleteConfirmDialog.patient && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Patient Information</h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">First Name:</span>
                        <p className="text-gray-900 dark:text-gray-100">{deleteConfirmDialog.patient.firstName || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Last Name:</span>
                        <p className="text-gray-900 dark:text-gray-100">{deleteConfirmDialog.patient.lastName || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                        <p className="text-gray-900 dark:text-gray-100">{deleteConfirmDialog.patient.email || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Phone:</span>
                        <p className="text-gray-900 dark:text-gray-100">{deleteConfirmDialog.patient.phone || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Date of Birth:</span>
                        <p className="text-gray-900 dark:text-gray-100">
                          {deleteConfirmDialog.patient.dateOfBirth 
                            ? new Date(deleteConfirmDialog.patient.dateOfBirth).toLocaleDateString() 
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Gender:</span>
                        <p className="text-gray-900 dark:text-gray-100">{deleteConfirmDialog.patient.gender || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Patient ID:</span>
                        <p className="text-gray-900 dark:text-gray-100">{deleteConfirmDialog.patient.patientId || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Status:</span>
                        <p className="text-gray-900 dark:text-gray-100">
                          {deleteConfirmDialog.patient.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>

                    {deleteConfirmDialog.patient.address && (
                      <div className="mt-3">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Address:</span>
                        <p className="text-gray-900 dark:text-gray-100">
                          {[
                            deleteConfirmDialog.patient.address.street,
                            deleteConfirmDialog.patient.address.city,
                            deleteConfirmDialog.patient.address.postcode,
                            deleteConfirmDialog.patient.address.country
                          ].filter(Boolean).join(", ") || "N/A"}
                        </p>
                      </div>
                    )}

                    {deleteConfirmDialog.patient.medicalHistory && (
                      <div className="mt-3">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Medical History:</span>
                        <div className="text-gray-900 dark:text-gray-100 mt-1">
                          {deleteConfirmDialog.patient.medicalHistory.allergies?.length > 0 && (
                            <p><strong>Allergies:</strong> {deleteConfirmDialog.patient.medicalHistory.allergies.join(", ")}</p>
                          )}
                          {deleteConfirmDialog.patient.medicalHistory.conditions?.length > 0 && (
                            <p><strong>Conditions:</strong> {deleteConfirmDialog.patient.medicalHistory.conditions.join(", ")}</p>
                          )}
                          {deleteConfirmDialog.patient.medicalHistory.medications?.length > 0 && (
                            <p><strong>Medications:</strong> {deleteConfirmDialog.patient.medicalHistory.medications.join(", ")}</p>
                          )}
                          {(!deleteConfirmDialog.patient.medicalHistory.allergies?.length && 
                            !deleteConfirmDialog.patient.medicalHistory.conditions?.length && 
                            !deleteConfirmDialog.patient.medicalHistory.medications?.length) && (
                            <p>No medical history recorded</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Warning Message */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3 mb-3">
                <strong>⚠️ Warning:</strong> Deleting this patient will permanently delete all related data including:
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>All appointments for this patient</li>
                  <li>All lab results for this patient</li>
                  <li>All imaging/medical images for this patient</li>
                  <li>All prescriptions for this patient</li>
                  <li>All medical records for this patient</li>
                  <li>The patient's user account (if exists)</li>
                </ul>
                <p className="mt-2 font-semibold">This action cannot be undone.</p>
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmDialog({ open: false, patient: null })}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePatient}
              disabled={deletePatientMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deletePatientMutation.isPending ? "Deleting..." : "Yes, Delete All"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
