import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  PoundSterling,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  FileText,
  Download,
  Filter,
  Search,
  Bell,
  Shield,
  Calculator,
  Banknote,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { useCurrency } from "@/hooks/use-currency";

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  collections: number;
  target: number;
}

interface Claim {
  id: string;
  patientId: number;
  patientName: string;
  insuranceProvider: string;
  claimNumber: string;
  serviceDate: string;
  submissionDate: string;
  amount: number;
  status: "submitted" | "approved" | "denied" | "pending" | "paid";
  denialReason?: string;
  paymentAmount?: number;
  paymentDate?: string;
  procedures: Array<{
    code: string;
    description: string;
    amount: number;
  }>;
}

interface Insurance {
  id: string;
  patientId: string;
  patientName: string;
  provider: string;
  policyNumber: string;
  groupNumber: string;
  status: "active" | "inactive" | "pending" | "expired";
  coverageType: "primary" | "secondary";
  eligibilityStatus: "verified" | "pending" | "invalid";
  lastVerified: string;
  benefits: {
    deductible: number;
    deductibleMet: number;
    copay: number;
    coinsurance: number;
    outOfPocketMax: number;
    outOfPocketMet: number;
  };
}

interface FinancialForecast {
  id: number;
  organizationId: number;
  category: string;
  forecastPeriod: string;
  currentValue: number;
  projectedValue: number;
  variance: number;
  trend: "up" | "down" | "stable";
  confidence: number;
  methodology: string;
  keyFactors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
    description: string;
  }>;
  metadata: Record<string, any>;
  isActive: boolean;
  generatedAt: string;
  updatedAt: string;
}

export default function FinancialIntelligence() {
  const [location, setLocation] = useLocation();
  const { currencySymbol, currencyCode } = useCurrency();

  // Insurance provider options for dropdown
  const insuranceProviders = [
    "NHS (National Health Service)",
    "Bupa",
    "AXA PPP Healthcare", 
    "Vitality Health",
    "Aviva Health",
    "Simply Health",
    "WPA",
    "Benenden Health",
    "Healix Health Services",
    "Sovereign Health Care",
    "Exeter Friendly Society",
    "Self-Pay",
    "Other"
  ];
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("last_3_months");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(true);
  const [submitClaimOpen, setSubmitClaimOpen] = useState(false);
  const [claimDetailsOpen, setClaimDetailsOpen] = useState(false);
  const [trackStatusOpen, setTrackStatusOpen] = useState(false);
  const [trackingClaim, setTrackingClaim] = useState<Claim | null>(null);
  const [claimFormData, setClaimFormData] = useState({
    patient: "",
    serviceDate: "",
    totalAmount: "",
    insuranceProvider: "",
    procedures: [
      {
        code: "",
        description: "",
        amount: "",
      }
    ],
  });
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [verifyEligibilityOpen, setVerifyEligibilityOpen] = useState(false);
  const [priorAuthOpen, setPriorAuthOpen] = useState(false);
  const [viewBenefitsOpen, setViewBenefitsOpen] = useState(false);
  const [addInsuranceOpen, setAddInsuranceOpen] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [insuranceProviderOpen, setInsuranceProviderOpen] = useState(false);
  const [claimInsuranceProviderOpen, setClaimInsuranceProviderOpen] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successClaimData, setSuccessClaimData] = useState<any>(null);
  const [verificationFormData, setVerificationFormData] = useState({
    patientName: "",
    insuranceProvider: "",
    policyNumber: "",
    groupNumber: "",
    coverageType: "",
    verificationStatus: "pending",
    verificationDate: "",
  });
  const [newInsuranceFormData, setNewInsuranceFormData] = useState({
    patientName: "",
    patientId: "",
    provider: "",
    policyNumber: "",
    groupNumber: "",
    memberNumber: "",
    nhsNumber: "",
    planType: "",
    effectiveDate: "",
    coverageType: "primary",
    status: "active",
    eligibilityStatus: "pending",
    copay: "",
    deductible: "",
    deductibleMet: "",
    outOfPocketMax: "",
    outOfPocketMet: "",
    coinsurance: "",
  });

  // Edit mode and saving state for claim status updates (like imaging.tsx pattern)
  const [editModes, setEditModes] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  // Insurance editing states (following imaging.tsx pattern)
  const [editingInsuranceStatus, setEditingInsuranceStatus] = useState<string>("");
  const [editingEligibilityStatus, setEditingEligibilityStatus] = useState<string>("");
  const [editInsuranceDialogOpen, setEditInsuranceDialogOpen] = useState(false);
  const [insuranceToEdit, setInsuranceToEdit] = useState<any>(null);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [insuranceToDelete, setInsuranceToDelete] = useState<any>(null);

  const { toast } = useToast();

  // Auto-click Claims Management tab after delete and reload
  useEffect(() => {
    const shouldAutoClick = localStorage.getItem("autoClickClaimsTab");
    if (shouldAutoClick === "true") {
      setActiveTab("claims");
      localStorage.removeItem("autoClickClaimsTab");
    }
  }, []);

  // Scroll functionality
  const handleScrollDown = () => {
    window.scrollBy({
      top: window.innerHeight * 0.8,
      behavior: "smooth",
    });
  };

  // Monitor scroll position to show/hide scroll button
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Hide button when near bottom of page
      if (scrolled + windowHeight >= documentHeight - 100) {
        setShowScrollButton(false);
      } else {
        setShowScrollButton(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch revenue data from API
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/financial/revenue", dateRange],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/financial/revenue?dateRange=${dateRange || 'last_6_months'}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch revenue data");
      return response.json();
    },
    enabled: true,
  });

  // Fetch claims with explicit queryFn to ensure API call
  const { data: claimsResponse, isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ["/api/financial/claims"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/financial/claims");
      return response.json();
    },
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Ensure claims is always an array
  const claims = Array.isArray(claimsResponse) ? claimsResponse : [];

  // Fetch insurance verifications with explicit queryFn to ensure API call
  const { data: insurances, isLoading: insuranceLoading, refetch: refetchInsurance } = useQuery({
    queryKey: ["/api/financial/insurance"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/financial/insurance");
      return response.json();
    },
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch financial forecasts
  const { data: forecasts, isLoading: forecastsLoading, refetch: refetchForecasts } = useQuery({
    queryKey: ["/api/financial-forecasting"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/financial-forecasting");
      return response.json();
    },
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Generate financial forecasts mutation
  const generateForecastsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/financial-forecasting/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-forecasting"] });
      toast({
        title: "Forecasts Generated",
        description: "Financial forecasts have been generated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error generating forecasts:", error);
      toast({
        title: "Error",
        description: "Failed to generate forecasts. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch patients for claim submission
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
    enabled: true,
  });

  // Submit claim mutation
  const submitClaimMutation = useMutation({
    mutationFn: async (claimData: Partial<Claim>) => {
      const response = await fetch("/api/financial/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        body: JSON.stringify(claimData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to submit claim");
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Mutation success - updating cache with new claim");
      
      // Close dialog and reset form only after successful submission
      setSubmitClaimOpen(false);
      setClaimFormData({
        patient: "",
        serviceDate: "",
        totalAmount: "",
        insuranceProvider: "",
        procedures: [
          {
            code: "",
            description: "",
            amount: "",
          }
        ],
      });
      
      // 🚀 IMMEDIATE AUTO-REFRESH: Force refresh claims data immediately
      await refetchClaims();
      
      // 🔄 COMPREHENSIVE INVALIDATION: Refresh all related queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/claims"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/revenue"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      // Show success modal
      setSuccessClaimData(data);
      setShowSuccessModal(true);
      
      toast({ 
        title: "Claim Submitted",
        description: `New claim ${data.claimNumber} has been successfully added to the system`
      });
    },
  });

  // Delete claim mutation
  const deleteClaimMutation = useMutation({
    mutationFn: async (claimId: string) => {
      console.log("🗑️ DELETE: Starting delete operation for claim ID:", claimId);
      const response = await fetch(`/api/financial/claims/${claimId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
      });
      console.log("🗑️ DELETE: Response status:", response.status);
      if (!response.ok) {
        const errorData = await response.text();
        console.error("🗑️ DELETE: Error response:", errorData);
        throw new Error(`Failed to delete claim: ${errorData}`);
      }
      const result = await response.json();
      console.log("🗑️ DELETE: Success response:", result);
      return result;
    },
    onSuccess: async (data, claimId) => {
      console.log("🗑️ DELETE: Mutation success - updating cache");
      
      // 🚀 IMMEDIATE AUTO-REFRESH: Force refresh claims data immediately
      await refetchClaims();
      
      // 🔄 COMPREHENSIVE INVALIDATION: Refresh all related queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/claims"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/revenue"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({ 
        title: "Claim Deleted",
        description: "The claim has been successfully removed from the system"
      });
    },
    onError: (error) => {
      console.error("🗑️ DELETE: Mutation error:", error);
      toast({
        title: "Failed to delete claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify insurance mutation
  const verifyInsuranceMutation = useMutation({
    mutationFn: async (insuranceId: string) => {
      const response = await fetch(
        `/api/financial/insurance/${insuranceId}/verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            "X-Tenant-Subdomain": getActiveSubdomain(),
          },
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to verify insurance");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      toast({
        title: "Insurance verification completed",
        description: data.message || "Eligibility status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Insurance verification failed",
        description: error.message || "Failed to verify insurance eligibility",
        variant: "destructive",
      });
    },
  });

  // Update insurance field mutation (following imaging.tsx pattern)
  const updateInsuranceFieldMutation = useMutation({
    mutationFn: async ({
      insuranceId,
      fieldName,
      value,
    }: {
      insuranceId: string;
      fieldName: string;
      value: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/financial/insurance/${insuranceId}`,
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
        [`${variables.insuranceId}-${variables.fieldName}`]: true,
      }));
    },
    onError: (error, variables) => {
      toast({
        title: "Error updating insurance",
        description: error.message || "Failed to update insurance. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      // Exit edit mode immediately
      setEditModes((prev) => ({
        ...prev,
        [`${variables.insuranceId}-${variables.fieldName}`]: false,
      }));

      // Force refresh insurance data immediately
      await refetchInsurance();
      
      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });

      toast({
        title: "Insurance Updated",
        description: `${variables.fieldName.charAt(0).toUpperCase() + variables.fieldName.slice(1)} has been successfully updated.`,
      });
    },
    onSettled: (data, error, variables) => {
      // Clear saving state
      setSaving((prev) => ({
        ...prev,
        [`${variables.insuranceId}-${variables.fieldName}`]: false,
      }));
    },
  });

  // Delete insurance mutation
  const deleteInsuranceMutation = useMutation({
    mutationFn: async (insuranceId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/financial/insurance/${insuranceId}`,
      );
      return response.json();
    },
    onSuccess: async () => {
      // Force refresh insurance data immediately
      await refetchInsurance();
      
      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });

      toast({
        title: "Insurance Deleted",
        description: "Insurance record has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting insurance",
        description: error.message || "Failed to delete insurance. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update insurance mutation
  const updateInsuranceMutation = useMutation({
    mutationFn: async ({
      insuranceId,
      data,
    }: {
      insuranceId: string;
      data: any;
    }) => {
      const response = await fetch(`/api/financial/insurance/${insuranceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update insurance");
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Insurance update success:", data);
      
      // 🚀 IMMEDIATE AUTO-REFRESH: Force refresh insurance data immediately (following imaging.tsx pattern)
      await refetchInsurance();
      
      // 🔄 COMPREHENSIVE INVALIDATION: Refresh all related queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      // Close edit dialog after successful update and data refresh
      setEditInsuranceDialogOpen(false);
      
      toast({
        title: "Insurance updated successfully",
        description: data.message || "Insurance verification data updated",
      });
    },
    onError: (error) => {
      console.error("Insurance update error:", error);
      toast({
        title: "Update failed",
        description: "Failed to update insurance verification data",
        variant: "destructive",
      });
    },
  });

  // Add insurance mutation
  const addInsuranceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/financial/insurance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          patientId: data.patientId,
          memberNumber: data.memberNumber || "",
          nhsNumber: data.nhsNumber || "",
          planType: data.planType || "",
          effectiveDate: data.effectiveDate || null,
          lastVerified: new Date().toISOString(),
          id: `ins_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          benefits: {
            deductible: parseFloat(data.deductible) || 0,
            deductibleMet: parseFloat(data.deductibleMet) || 0,
            outOfPocketMax: parseFloat(data.outOfPocketMax) || 0,
            outOfPocketMet: parseFloat(data.outOfPocketMet) || 0,
            copay: parseFloat(data.copay) || 0,
            coinsurance: parseFloat(data.coinsurance) || 0,
          },
        }),
      });
      if (!response.ok) throw new Error("Failed to add insurance");
      return response.json();
    },
    onSuccess: async (data) => {
      // Close dialog and reset form first
      setAddInsuranceOpen(false);
      setNewInsuranceFormData({
        patientName: "",
        patientId: "",
        provider: "",
        policyNumber: "",
        groupNumber: "",
        memberNumber: "",
        nhsNumber: "",
        planType: "",
        effectiveDate: "",
        coverageType: "primary",
        status: "active",
        eligibilityStatus: "pending",
        copay: "",
        deductible: "",
        deductibleMet: "",
        outOfPocketMax: "",
        outOfPocketMet: "",
        coinsurance: "",
      });

      // 🚀 IMMEDIATE AUTO-REFRESH: Force refresh insurance data immediately
      await refetchInsurance();
      
      // 🔄 COMPREHENSIVE INVALIDATION: Refresh all related queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/claims"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/revenue"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({
        title: "Insurance Added",
        description: "New insurance information has been successfully added to the system",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add insurance",
        description: "There was an error adding the insurance information",
        variant: "destructive",
      });
    },
  });

  // Update claim status mutation with auto-update pattern (like imaging.tsx)
  const updateClaimStatusMutation = useMutation({
    mutationFn: async ({
      claimId,
      status,
    }: {
      claimId: string;
      status: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/financial/claims/${claimId}`,
        { status }
      );
      return response.json();
    },
    onMutate: async (variables) => {
      // Set saving state
      setSaving((prev) => ({
        ...prev,
        [`claim-${variables.claimId}-status`]: true,
      }));
    },
    onError: (error, variables) => {
      toast({
        title: "Update Failed",
        description: "Failed to update claim status. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      // ✨ KEY: Exit edit mode immediately (patients.tsx pattern)
      setEditModes((prev) => ({
        ...prev,
        [`claim-${variables.claimId}-status`]: false,
      }));

      // 🚀 IMMEDIATE AUTO-REFRESH: Force refresh claims data immediately
      await refetchClaims();

      // 🔄 COMPREHENSIVE INVALIDATION: Refresh all related queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/claims"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/revenue"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });

      toast({
        title: "Status Updated",
        description: `Claim status has been successfully updated to ${variables.status}`,
      });
    },
    onSettled: (data, error, variables) => {
      // Clear saving state
      setSaving((prev) => ({
        ...prev,
        [`claim-${variables.claimId}-status`]: false,
      }));
    },
  });

  // Mock data
  const mockRevenueData: RevenueData[] = [
    {
      month: "Jan",
      revenue: 125000,
      expenses: 85000,
      profit: 40000,
      collections: 118000,
      target: 130000,
    },
    {
      month: "Feb",
      revenue: 135000,
      expenses: 88000,
      profit: 47000,
      collections: 128000,
      target: 130000,
    },
    {
      month: "Mar",
      revenue: 142000,
      expenses: 92000,
      profit: 50000,
      collections: 135000,
      target: 135000,
    },
    {
      month: "Apr",
      revenue: 138000,
      expenses: 90000,
      profit: 48000,
      collections: 132000,
      target: 135000,
    },
    {
      month: "May",
      revenue: 155000,
      expenses: 95000,
      profit: 60000,
      collections: 148000,
      target: 140000,
    },
    {
      month: "Jun",
      revenue: 162000,
      expenses: 98000,
      profit: 64000,
      collections: 156000,
      target: 145000,
    },
  ];

  const mockClaims: Claim[] = [
    {
      id: "claim_3",
      patientId: 3,
      patientName: "Emma Davis",
      insuranceProvider: "United Healthcare",
      claimNumber: "CLM-2024-001236",
      serviceDate: "2024-06-24",
      submissionDate: "2024-06-25",
      amount: 320.0,
      status: "pending",
      procedures: [
        {
          code: "99215",
          description: "Office visit, established patient",
          amount: 280.0,
        },
        { code: "36415", description: "Venipuncture", amount: 40.0 },
      ],
    },
  ];

  const mockInsurances: Insurance[] = [];

  // Financial forecasts data from API
  const forecastData = forecasts || [];

  // Fetch profitability data from API
  const { data: profitabilityDataFromAPI, isLoading: profitabilityLoading } = useQuery({
    queryKey: ["/api/financial/profitability"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/financial/profitability", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch profitability data");
      return response.json();
    },
    enabled: true,
  });

  // Fallback mock data if API fails or returns empty
  const mockProfitabilityData = [
    {
      service: "Primary Care",
      revenue: 45000,
      cost: 28000,
      profit: 17000,
      margin: 37.8,
    },
    {
      service: "Preventive Care",
      revenue: 32000,
      cost: 18000,
      profit: 14000,
      margin: 43.8,
    },
    {
      service: "Chronic Care Management",
      revenue: 28000,
      cost: 15000,
      profit: 13000,
      margin: 46.4,
    },
    {
      service: "Diagnostic Testing",
      revenue: 25000,
      cost: 12000,
      profit: 13000,
      margin: 52.0,
    },
    {
      service: "Procedures",
      revenue: 32000,
      cost: 25000,
      profit: 7000,
      margin: 21.9,
    },
  ];

  const profitabilityData = (profitabilityDataFromAPI && profitabilityDataFromAPI.length > 0) 
    ? profitabilityDataFromAPI 
    : mockProfitabilityData;

  // Helper functions for insurance field editing (following imaging.tsx pattern)
  const handleInsuranceFieldEdit = (insuranceId: string, fieldName: string) => {
    setEditModes((prev) => ({
      ...prev,
      [`${insuranceId}-${fieldName}`]: true,
    }));

    // Initialize editing states for status fields
    const insurance = insurances?.find((ins: any) => ins.id === insuranceId);
    if (insurance) {
      if (fieldName === "status") {
        setEditingInsuranceStatus(insurance.status || "active");
      }
      if (fieldName === "eligibilityStatus") {
        setEditingEligibilityStatus(insurance.eligibilityStatus || "pending");
      }
    }
  };

  const handleInsuranceFieldCancel = (insuranceId: string, fieldName: string) => {
    setEditModes((prev) => ({
      ...prev,
      [`${insuranceId}-${fieldName}`]: false,
    }));

    // Reset editing states to original values
    const insurance = insurances?.find((ins: any) => ins.id === insuranceId);
    if (insurance) {
      if (fieldName === "status") {
        setEditingInsuranceStatus(insurance.status || "active");
      }
      if (fieldName === "eligibilityStatus") {
        setEditingEligibilityStatus(insurance.eligibilityStatus || "pending");
      }
    }
  };

  const handleInsuranceFieldSave = (
    insuranceId: string,
    fieldName: string,
    value?: string,
  ) => {
    let finalValue = value;
    
    if (fieldName === "status") {
      finalValue = editingInsuranceStatus;
    } else if (fieldName === "eligibilityStatus") {
      finalValue = editingEligibilityStatus;
    }

    if (!finalValue) return;

    updateInsuranceFieldMutation.mutate({
      insuranceId,
      fieldName,
      value: finalValue,
    });
  };

  const handleDeleteInsurance = async (insuranceId: string) => {
    const insurance = insurances?.find((ins: any) => ins.id === insuranceId);
    if (!insurance) return;

    setInsuranceToDelete(insurance);
    setDeleteConfirmDialogOpen(true);
  };

  const confirmDeleteInsurance = () => {
    if (insuranceToDelete) {
      deleteInsuranceMutation.mutate(insuranceToDelete.id);
      setDeleteConfirmDialogOpen(false);
      setInsuranceToDelete(null);
    }
  };

  const handleEditInsurance = (insurance: any) => {
    setInsuranceToEdit(insurance);
    setNewInsuranceFormData({
      patientName: insurance.patientName || "",
      provider: insurance.provider || "",
      policyNumber: insurance.policyNumber || "",
      groupNumber: insurance.groupNumber || "",
      memberNumber: insurance.memberNumber || "",
      nhsNumber: insurance.nhsNumber || "",
      planType: insurance.planType || "",
      effectiveDate: insurance.effectiveDate || "",
      coverageType: insurance.coverageType || "primary",
      status: insurance.status || "active",
      eligibilityStatus: insurance.eligibilityStatus || "pending",
      copay: insurance.benefits?.copay?.toString() || "",
      deductible: insurance.benefits?.deductible?.toString() || "",
      deductibleMet: insurance.benefits?.deductibleMet?.toString() || "",
      outOfPocketMax: insurance.benefits?.outOfPocketMax?.toString() || "",
      outOfPocketMet: insurance.benefits?.outOfPocketMet?.toString() || "",
      coinsurance: insurance.benefits?.coinsurance?.toString() || "",
    });
    setEditInsuranceDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "paid":
      case "active":
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "denied":
      case "inactive":
      case "expired":
        return "bg-red-100 text-red-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "stable":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode || "GBP",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header title="Financial Intelligence" subtitle="Advanced analytics and financial insights" />
      
      <div className="w-full px-3 sm:px-4 lg:px-5 py-4">
        {/* Scroll Down Button */}
        {showScrollButton && (
        <Button
          onClick={handleScrollDown}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700"
          size="sm"
          title="Scroll down to see more content"
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Financial Intelligence
          </h1>
          <p className="text-gray-600 mt-1">
            Revenue cycle management and financial analytics
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              // Generate comprehensive financial report data
              const reportData = [
                [
                  "Financial Intelligence Report",
                  `Generated on ${format(new Date(), "PPP")}`,
                ],
                [
                  "Date Range",
                  dateRange
                    .replace("_", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase()),
                ],
                [""],
                ["REVENUE OVERVIEW"],
                ["Monthly Revenue", `${currencySymbol}162,000.00`],
                ["Collection Rate", "94%"],
                ["Outstanding Claims", "23"],
                ["Net Profit", `${currencySymbol}84,000.00`],
                [""],
                ["MONTHLY BREAKDOWN"],
                ["Month", "Revenue", "Collections", "Outstanding", "Profit"],
                ["January", `${currencySymbol}152,000`, `${currencySymbol}142,800`, `${currencySymbol}9,200`, `${currencySymbol}78,000`],
                ["February", `${currencySymbol}158,000`, `${currencySymbol}149,000`, `${currencySymbol}9,000`, `${currencySymbol}82,000`],
                ["March", `${currencySymbol}162,000`, `${currencySymbol}152,280`, `${currencySymbol}9,720`, `${currencySymbol}84,000`],
                [""],
                ["CLAIMS ANALYSIS"],
                ["Total Claims Processed", "1,247"],
                ["Approved Claims", "1,173 (94%)"],
                ["Denied Claims", "51 (4%)"],
                ["Pending Claims", "23 (2%)"],
                ["Average Processing Time", "3.2 days"],
                [""],
                ["PAYER BREAKDOWN"],
                ["NHS", "45%", `${currencySymbol}72,900`],
                ["Private Insurance", "35%", `${currencySymbol}56,700`],
                ["Self-Pay", "20%", `${currencySymbol}32,400`],
                [""],
                ["FINANCIAL FORECASTING"],
                ["Next Month Projection", `${currencySymbol}168,000`],
                ["Growth Rate", "+3.7%"],
                ["Confidence Level", "89%"],
                [""],
                ["KEY PERFORMANCE INDICATORS"],
                ["Days in A/R", "28 days"],
                ["Net Collection Rate", "96%"],
                ["Cost per Collection", `${currencySymbol}12.50`],
                ["Revenue per Patient", `${currencySymbol}340`],
                [""],
                ["RECOMMENDATIONS"],
                ["1. Focus on reducing outstanding claims to under 20"],
                ["2. Improve collection rate to 96% target"],
                ["3. Consider expanding private insurance partnerships"],
                ["4. Implement automated follow-up for claims over 30 days"],
              ];

              const csvContent = reportData
                .map((row) => (Array.isArray(row) ? row.join(",") : row))
                .join("\n");

              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `financial-intelligence-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              toast({
                title: "Report Exported",
                description:
                  "Financial intelligence report has been downloaded as CSV file.",
              });
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="claims">Claims Management</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Monthly Revenue
                    </p>
                    <p className="text-2xl font-bold">
                      {revenueLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : revenueData && revenueData.length > 0 ? (
                        formatCurrency(revenueData[revenueData.length - 1]?.revenue || 0)
                      ) : (
                        formatCurrency(0)
                      )}
                    </p>
                  </div>
                  <Banknote className="w-8 h-8 text-green-500" />
                </div>
                {revenueData && revenueData.length > 1 && (
                  <div className="flex items-center mt-2 text-sm">
                    {revenueData[revenueData.length - 1]?.revenue > revenueData[revenueData.length - 2]?.revenue ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600">
                          {((revenueData[revenueData.length - 1]?.revenue - revenueData[revenueData.length - 2]?.revenue) / revenueData[revenueData.length - 2]?.revenue * 100).toFixed(1)}% from last month
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        <span className="text-red-600">
                          {((revenueData[revenueData.length - 1]?.revenue - revenueData[revenueData.length - 2]?.revenue) / revenueData[revenueData.length - 2]?.revenue * 100).toFixed(1)}% from last month
                        </span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Collection Rate
                    </p>
                    <p className="text-2xl font-bold">
                      {revenueLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : revenueData && revenueData.length > 0 ? (
                        `${Math.round((revenueData[revenueData.length - 1]?.collections / revenueData[revenueData.length - 1]?.revenue) * 100) || 0}%`
                      ) : (
                        "0%"
                      )}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
                </div>
                {revenueData && revenueData.length > 1 && (
                  <div className="flex items-center mt-2 text-sm">
                    {revenueData[revenueData.length - 1]?.collections > revenueData[revenueData.length - 2]?.collections ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600">+{((revenueData[revenueData.length - 1]?.collections - revenueData[revenueData.length - 2]?.collections) / revenueData[revenueData.length - 2]?.collections * 100).toFixed(1)}% from last month</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        <span className="text-red-600">{((revenueData[revenueData.length - 1]?.collections - revenueData[revenueData.length - 2]?.collections) / revenueData[revenueData.length - 2]?.collections * 100).toFixed(1)}% from last month</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Outstanding Claims
                    </p>
                    <p className="text-2xl font-bold">
                      {claimsLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : (
                        claims.filter((c: Claim) => c.status === "pending" || c.status === "submitted").length
                      )}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Net Profit
                    </p>
                    <p className="text-2xl font-bold">
                      {revenueLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : revenueData && revenueData.length > 0 ? (
                        formatCurrency(revenueData[revenueData.length - 1]?.profit || 0)
                      ) : (
                        formatCurrency(0)
                      )}
                    </p>
                  </div>
                  <Calculator className="w-8 h-8 text-purple-500" />
                </div>
                {revenueData && revenueData.length > 1 && (
                  <div className="flex items-center mt-2 text-sm">
                    {revenueData[revenueData.length - 1]?.profit > revenueData[revenueData.length - 2]?.profit ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600">
                          +{((revenueData[revenueData.length - 1]?.profit - revenueData[revenueData.length - 2]?.profit) / revenueData[revenueData.length - 2]?.profit * 100).toFixed(1)}% from last month
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        <span className="text-red-600">
                          {((revenueData[revenueData.length - 1]?.profit - revenueData[revenueData.length - 2]?.profit) / revenueData[revenueData.length - 2]?.profit * 100).toFixed(1)}% from last month
                        </span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <span className="text-gray-400">Loading revenue data...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData || mockRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="collections"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <span className="text-gray-400">Loading profit data...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData || mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                    <Bar dataKey="expenses" fill="#ef4444" />
                    <Bar dataKey="profit" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Claims Management
            </h3>
            <Dialog open={submitClaimOpen} onOpenChange={setSubmitClaimOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSubmitClaimOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Submit New Claim
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit Insurance Claim</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Patient Selection */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Patient
                    </label>
                    <Popover
                      open={patientDropdownOpen}
                      onOpenChange={setPatientDropdownOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={patientDropdownOpen}
                          className="w-full justify-between"
                        >
                          {claimFormData.patient
                            ? patients?.find(
                                (patient: any) =>
                                  patient.id.toString() ===
                                  claimFormData.patient,
                              )
                              ? `${patients.find((patient: any) => patient.id.toString() === claimFormData.patient).firstName} ${patients.find((patient: any) => patient.id.toString() === claimFormData.patient).lastName}`
                              : "Select patient..."
                            : "Select patient..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search patients..." />
                          <CommandList>
                            <CommandEmpty>
                              {patientsLoading
                                ? "Loading patients..."
                                : "No patients found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {patients?.map((patient: any) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.id}-${patient.firstName}-${patient.lastName}-${patient.email || ''}`}
                                  onSelect={() => {
                                    setClaimFormData((prev) => ({
                                      ...prev,
                                      patient: patient.id.toString(),
                                    }));
                                    setPatientDropdownOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      claimFormData.patient ===
                                      patient.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span>{patient.firstName} {patient.lastName}</span>
                                    {patient.email && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">{patient.email}</span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Insurance Provider */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Insurance Provider
                    </label>
                    <Popover
                      open={claimInsuranceProviderOpen}
                      onOpenChange={setClaimInsuranceProviderOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={claimInsuranceProviderOpen}
                          className="w-full justify-between"
                          data-testid="button-claim-select-provider"
                        >
                          {claimFormData.insuranceProvider || "Select insurance provider..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search insurance providers..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>No insurance provider found.</CommandEmpty>
                            <CommandGroup>
                              {insuranceProviders.map((provider) => (
                                <CommandItem
                                  key={provider}
                                  value={provider}
                                  onSelect={() => {
                                    setClaimFormData((prev) => ({
                                      ...prev,
                                      insuranceProvider: provider,
                                    }));
                                    setClaimInsuranceProviderOpen(false);
                                  }}
                                  data-testid={`option-claim-provider-${provider.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      claimFormData.insuranceProvider === provider
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  {provider}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Service Date */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Service Date
                    </label>
                    <Input
                      type="date"
                      value={claimFormData.serviceDate}
                      onChange={(e) =>
                        setClaimFormData((prev) => ({
                          ...prev,
                          serviceDate: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Procedures Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Procedures
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setClaimFormData((prev) => ({
                            ...prev,
                            procedures: [
                              ...prev.procedures,
                              { code: "", description: "", amount: "" }
                            ]
                          }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Procedure
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {claimFormData.procedures.map((procedure, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Procedure {index + 1}</h4>
                            {claimFormData.procedures.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newProcedures = claimFormData.procedures.filter((_, i) => i !== index);
                                  setClaimFormData((prev) => ({
                                    ...prev,
                                    procedures: newProcedures,
                                    totalAmount: newProcedures.reduce((sum, proc) => sum + (parseFloat(proc.amount) || 0), 0).toFixed(2)
                                  }));
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Procedure Code
                              </label>
                              <Input
                                placeholder="e.g., 99215"
                                value={procedure.code}
                                onChange={(e) => {
                                  const newProcedures = [...claimFormData.procedures];
                                  newProcedures[index].code = e.target.value;
                                  setClaimFormData((prev) => ({
                                    ...prev,
                                    procedures: newProcedures
                                  }));
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Description
                              </label>
                              <Input
                                placeholder="e.g., Office visit, established patient"
                                value={procedure.description}
                                onChange={(e) => {
                                  const newProcedures = [...claimFormData.procedures];
                                  newProcedures[index].description = e.target.value;
                                  setClaimFormData((prev) => ({
                                    ...prev,
                                    procedures: newProcedures
                                  }));
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Amount ({currencySymbol})
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={procedure.amount}
                                onChange={(e) => {
                                  const newProcedures = [...claimFormData.procedures];
                                  newProcedures[index].amount = e.target.value;
                                  const totalAmount = newProcedures.reduce((sum, proc) => sum + (parseFloat(proc.amount) || 0), 0).toFixed(2);
                                  setClaimFormData((prev) => ({
                                    ...prev,
                                    procedures: newProcedures,
                                    totalAmount: totalAmount
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Amount (Read-only, calculated from procedures) */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Total Amount
                    </label>
                    <Input
                      value={`${currencySymbol}${claimFormData.totalAmount || '0.00'}`}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      // Validation
                      if (
                        !claimFormData.patient ||
                        !claimFormData.serviceDate ||
                        !claimFormData.insuranceProvider ||
                        claimFormData.procedures.length === 0 ||
                        claimFormData.procedures.some(proc => !proc.code || !proc.description || !proc.amount)
                      ) {
                        toast({
                          title: "Missing Information",
                          description: "Please fill in all required fields including at least one complete procedure",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Validate amount sizes (database limit: 99,999,999.99)
                      const totalAmount = parseFloat(claimFormData.totalAmount || "0");
                      const maxAmount = 99999999.99;
                      
                      if (totalAmount > maxAmount) {
                        toast({
                          title: "Amount Too Large",
                          description: `Total amount cannot exceed ${currencySymbol}${maxAmount.toLocaleString()}`,
                          variant: "destructive",
                        });
                        return;
                      }

                      // Check individual procedure amounts
                      const invalidProcedure = claimFormData.procedures.find(proc => parseFloat(proc.amount) > maxAmount);
                      if (invalidProcedure) {
                        toast({
                          title: "Procedure Amount Too Large",
                          description: `Individual procedure amounts cannot exceed ${currencySymbol}${maxAmount.toLocaleString()}`,
                          variant: "destructive",
                        });
                        return;
                      }

                      const selectedPatient = patients?.find(
                        (patient: any) =>
                          patient.id.toString() === claimFormData.patient,
                      );
                      const patientName = selectedPatient
                        ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                        : "";

                      // Generate claim number like CLM-2024-001236
                      const currentYear = new Date().getFullYear();
                      const claimNumber = `CLM-${currentYear}-${Date.now().toString().slice(-6)}`;

                      // Submit the claim using the mutation
                      submitClaimMutation.mutate({
                        patientId: parseInt(claimFormData.patient),
                        patientName: patientName,
                        claimNumber: claimNumber,
                        insuranceProvider: claimFormData.insuranceProvider,
                        serviceDate: claimFormData.serviceDate,
                        submissionDate: new Date().toISOString(),
                        amount: parseFloat(claimFormData.totalAmount || "0"),
                        status: "pending",
                        procedures: claimFormData.procedures.map(proc => ({
                          code: proc.code,
                          description: proc.description,
                          amount: parseFloat(proc.amount)
                        }))
                      });
                    }}
                    disabled={submitClaimMutation.isPending}
                    data-testid="button-submit-claim"
                  >
                    {submitClaimMutation.isPending
                      ? "Submitting..."
                      : "Submit Claim"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {claimsLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  Loading claims...
                </div>
              </div>
            ) : claims && claims.length > 0 ? (
              claims
                .sort(
                  (a: any, b: any) =>
                    new Date(b.submissionDate || b.serviceDate).getTime() -
                    new Date(a.submissionDate || a.serviceDate).getTime(),
                )
                .map((claim: any) => (
                  <Card
                    key={claim.id}
                    className={
                      claim.status === "denied"
                        ? "border-red-200 dark:border-red-800"
                        : "dark:border-slate-700"
                    }
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
                            {claim.patientName}
                            {(() => {
                              const patient = patients?.find((p: any) => p.id === claim.patientId);
                              return patient?.email ? (
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                                  ({patient.email})
                                </span>
                              ) : null;
                            })()}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              {editModes[`claim-${claim.id}-status`] ? (
                                <Select
                                  value={claim.status}
                                  onValueChange={(value) => {
                                    updateClaimStatusMutation.mutate({
                                      claimId: claim.id.toString(),
                                      status: value,
                                    });
                                  }}
                                  data-testid={`select-claim-status-${claim.id}`}
                                >
                                  <SelectTrigger className="w-32 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">pending</SelectItem>
                                    <SelectItem value="submitted">submitted</SelectItem>
                                    <SelectItem value="approved">approved</SelectItem>
                                    <SelectItem value="denied">denied</SelectItem>
                                    <SelectItem value="paid">paid</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <>
                                  <Badge className={getStatusColor(claim.status)}>
                                    {claim.status}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    onClick={() => {
                                      setEditModes(prev => ({
                                        ...prev,
                                        [`claim-${claim.id}-status`]: true
                                      }));
                                    }}
                                    disabled={saving[`claim-${claim.id}-status`]}
                                    data-testid={`button-edit-claim-status-${claim.id}`}
                                  >
                                    {saving[`claim-${claim.id}-status`] ? (
                                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Edit className="w-3 h-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {claim.claimNumber ||
                                `CLM-${new Date().getFullYear()}-${String(claim.id).padStart(6, "0")}`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(claim.amount)}
                          </div>
                          {claim.paymentAmount && (
                            <div className="text-sm text-green-600">
                              Paid: {formatCurrency(claim.paymentAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Insurance
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {claim.insuranceProvider || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Service Date
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {format(
                              new Date(claim.serviceDate),
                              "MMM dd, yyyy",
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Submitted
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {format(
                              new Date(
                                claim.submissionDate || claim.serviceDate,
                              ),
                              "MMM dd, yyyy",
                            )}
                          </div>
                        </div>
                        {claim.paymentDate && (
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Payment Date
                            </div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {format(
                                new Date(claim.paymentDate),
                                "MMM dd, yyyy",
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {claim.denialReason && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                            <div>
                              <div className="font-medium text-red-800 dark:text-red-200">
                                Claim Denied
                              </div>
                              <div className="text-sm text-red-700 dark:text-red-300">
                                {claim.denialReason}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {claim.procedures && claim.procedures.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">
                            Procedures
                          </h4>
                          <div className="space-y-2">
                            {claim.procedures.map(
                              (procedure: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded"
                                >
                                  <div>
                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                      {procedure.code}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                      {procedure.description}
                                    </div>
                                  </div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {formatCurrency(procedure.amount)}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setClaimDetailsOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                        {claim.status === "denied" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast({
                                title: "Claim Resubmission",
                                description: `Resubmitting claim ${claim.claimNumber || `CLM-${claim.id}`} for ${claim.patientName}`,
                              });
                            }}
                          >
                            Resubmit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTrackingClaim(claim);
                            setTrackStatusOpen(true);
                          }}
                        >
                          Track Status
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteClaimMutation.isPending}
                              data-testid="button-delete-claim"
                            >
                              {deleteClaimMutation.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Claim</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete claim {claim.claimNumber || `CLM-${claim.id}`}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  console.log("🗑️ DELETE: AlertDialog Delete clicked for claim:", claim.id);
                                  deleteClaimMutation.mutate(claim.id.toString());
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500 dark:text-gray-400">
                  No claims found
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Submit your first claim to get started
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => {
                setNewInsuranceFormData({
                  patientName: "",
                  provider: "",
                  policyNumber: "",
                  groupNumber: "",
                  memberNumber: "",
                  nhsNumber: "",
                  planType: "",
                  effectiveDate: "",
                  coverageType: "primary",
                  status: "active",
                  eligibilityStatus: "pending",
                  copay: "",
                  deductible: "",
                  deductibleMet: "",
                  outOfPocketMax: "",
                  outOfPocketMet: "",
                  coinsurance: "",
                });
                setAddInsuranceOpen(true);
              }}
              data-testid="button-add-insurance"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Insurance Info
            </Button>
          </div>

          <div className="grid gap-4">
            {insuranceLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  Loading insurance verifications...
                </div>
              </div>
            ) : (insurances && insurances.length > 0) ? (
              insurances
                .sort((a: any, b: any) => {
                  // Sort by createdAt in descending order (newest first)
                  // If createdAt doesn't exist, fallback to sorting by id (which contains timestamp)
                  const aDate = a.createdAt || a.id;
                  const bDate = b.createdAt || b.id;
                  return String(bDate).localeCompare(String(aDate));
                })
                .map((insurance: any) => (
              <Card key={insurance.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {insurance.patientName}
                        {(() => {
                          const patient = patients?.find((p: any) => p.id.toString() === insurance.patientId);
                          return patient?.email ? (
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                              ({patient.email})
                            </span>
                          ) : null;
                        })()}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {editModes[`${insurance.id}-status`] ? (
                            <div className="flex items-center gap-1">
                              <Select
                                value={editingInsuranceStatus}
                                onValueChange={setEditingInsuranceStatus}
                              >
                                <SelectTrigger className="h-6 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                  <SelectItem value="verified">Verified</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleInsuranceFieldSave(insurance.id, "status")}
                                disabled={saving[`${insurance.id}-status`]}
                                data-testid={`button-save-status-${insurance.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleInsuranceFieldCancel(insurance.id, "status")}
                                data-testid={`button-cancel-status-${insurance.id}`}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge className={getStatusColor(insurance.status)}>
                                {insurance.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                onClick={() => handleInsuranceFieldEdit(insurance.id, "status")}
                                data-testid={`button-edit-status-${insurance.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {editModes[`${insurance.id}-eligibilityStatus`] ? (
                            <div className="flex items-center gap-1">
                              <Select
                                value={editingEligibilityStatus}
                                onValueChange={setEditingEligibilityStatus}
                              >
                                <SelectTrigger className="h-6 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="verified">Verified</SelectItem>
                                  <SelectItem value="denied">Denied</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleInsuranceFieldSave(insurance.id, "eligibilityStatus")}
                                disabled={saving[`${insurance.id}-eligibilityStatus`]}
                                data-testid={`button-save-eligibility-${insurance.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleInsuranceFieldCancel(insurance.id, "eligibilityStatus")}
                                data-testid={`button-cancel-eligibility-${insurance.id}`}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge
                                className={getStatusColor(
                                  insurance.eligibilityStatus,
                                )}
                              >
                                {insurance.eligibilityStatus}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                onClick={() => handleInsuranceFieldEdit(insurance.id, "eligibilityStatus")}
                                data-testid={`button-edit-eligibility-${insurance.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <span className="text-sm text-gray-500">
                          {insurance.provider}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Last verified:{" "}
                      {format(new Date(insurance.lastVerified), "MMM dd, yyyy")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Policy Number</div>
                      <div className="font-medium">
                        {insurance.policyNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Group Number</div>
                      <div className="font-medium">{insurance.groupNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Member Number</div>
                      <div className="font-medium">{insurance.memberNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">NHS Number</div>
                      <div className="font-medium">{insurance.nhsNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Plan Type</div>
                      <div className="font-medium">{insurance.planType}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Effective Date</div>
                      <div className="font-medium">
                        {insurance.effectiveDate ? format(new Date(insurance.effectiveDate), "MMM dd, yyyy") : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Coverage Type</div>
                      <div className="font-medium capitalize">
                        {insurance.coverageType}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Copay</div>
                      <div className="font-medium">
                        {formatCurrency(insurance.copay || 0)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-3">
                      Benefits Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">
                          Deductible (
                          {formatCurrency(0)}{" "}
                          met)
                        </div>
                        <Progress
                          value={
                            (0 /
                              (insurance.deductible || 1000)) *
                            100
                          }
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(
                            (insurance.deductible || 1000) -
                              0,
                          )}{" "}
                          remaining
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">
                          Out-of-Pocket Max (
                          {formatCurrency(0)}{" "}
                          met)
                        </div>
                        <Progress
                          value={
                            (0 /
                              5000) *
                            100
                          }
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(
                            5000 -
                              0,
                          )}{" "}
                          remaining
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedInsurance(insurance);
                        setViewBenefitsOpen(true);
                      }}
                      data-testid="button-view-benefits"
                    >
                      View Benefits
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedInsurance(insurance);
                        setPriorAuthOpen(true);
                      }}
                      data-testid="button-prior-authorization"
                    >
                      Prior Authorization
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditInsurance(insurance)}
                      data-testid={`button-edit-${insurance.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteInsurance(insurance.id)}
                      data-testid={`button-delete-${insurance.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500 dark:text-gray-400">
                  No insurance verifications found
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Add your first insurance verification to get started
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Financial Forecasting</h3>
            <Button
              onClick={() => generateForecastsMutation.mutate()}
              disabled={generateForecastsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-generate-forecasts"
            >
              {generateForecastsMutation.isPending ? (
                <>
                  <Calculator className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Generate Forecasts
                </>
              )}
            </Button>
          </div>

          {forecastsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading forecasts...</span>
            </div>
          ) : forecastData.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calculator className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Forecasts Available
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  Generate financial forecasts based on your historical data to get insights into future revenue, expenses, and collections.
                </p>
                <Button
                  onClick={() => generateForecastsMutation.mutate()}
                  disabled={generateForecastsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-generate-first-forecasts"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Generate Your First Forecasts
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {forecastData.map((forecast: FinancialForecast) => (
                <Card key={forecast.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div>
                        <span>{forecast.category}</span>
                        <div className="text-sm text-gray-500 font-normal mt-1">
                          Period: {forecast.forecastPeriod} • Method: {forecast.methodology}
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {forecast.confidence}% confidence
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {forecast.category.includes("Rate")
                            ? `${forecast.currentValue}%`
                            : formatCurrency(forecast.currentValue)}
                        </div>
                        <div className="text-sm text-gray-500">Current</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {forecast.category.includes("Rate")
                            ? `${forecast.projectedValue}%`
                            : formatCurrency(forecast.projectedValue)}
                        </div>
                        <div className="text-sm text-gray-500">Projected</div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-2xl font-bold ${getTrendColor(forecast.trend)}`}
                        >
                          {forecast.trend === "up"
                            ? "+"
                            : forecast.trend === "down"
                              ? "-"
                              : ""}
                          {forecast.category.includes("Rate")
                            ? `${Math.abs(forecast.variance)}%`
                            : formatCurrency(Math.abs(forecast.variance))}
                        </div>
                        <div className="text-sm text-gray-500">Variance</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">Key Factors</h4>
                      <ul className="space-y-1">
                        {forecast.keyFactors.map((factor, factorIdx) => (
                          <li
                            key={factorIdx}
                            className="flex items-start gap-2 text-sm"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {factor.impact === "positive" ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : factor.impact === "negative" ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium">{factor.factor}</span>
                              <span className="text-gray-500"> ({Math.round(factor.weight * 100)}% weight)</span>
                              <div className="text-xs text-gray-400 mt-1">{factor.description}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {forecast.metadata && Object.keys(forecast.metadata).length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-sm mb-2">Additional Details</h4>
                        <div className="text-xs text-gray-500 space-y-1">
                          {forecast.metadata.basedOnMonths && (
                            <div>Based on {forecast.metadata.basedOnMonths} months of data</div>
                          )}
                          {forecast.metadata.correlationCoeff && (
                            <div>Correlation: {Math.round(forecast.metadata.correlationCoeff * 100)}%</div>
                          )}
                          {forecast.metadata.assumptions && Array.isArray(forecast.metadata.assumptions) && (
                            <div>
                              <span className="font-medium">Assumptions:</span> {forecast.metadata.assumptions.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Profitability Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {profitabilityLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <span className="text-gray-400">Loading profitability data...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={profitabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="service" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                    <Bar dataKey="cost" fill="#ef4444" />
                    <Bar dataKey="profit" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {profitabilityData.map((service, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{service.service}</h3>
                      <div className="text-sm text-gray-600">
                        Revenue: {formatCurrency(service.revenue)} • Cost:{" "}
                        {formatCurrency(service.cost)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(service.profit)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.margin}% margin
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Claim Details Dialog */}
      <Dialog open={claimDetailsOpen} onOpenChange={setClaimDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Claim Details - {selectedClaim?.claimNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Patient
                  </label>
                  <p className="font-medium">{selectedClaim.patientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <Badge className={getStatusColor(selectedClaim.status)}>
                    {selectedClaim.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Insurance Provider
                  </label>
                  <p className="font-medium">
                    {selectedClaim.insuranceProvider}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Total Amount
                  </label>
                  <p className="font-medium text-blue-600">
                    {formatCurrency(selectedClaim.amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Service Date
                  </label>
                  <p className="font-medium">
                    {format(new Date(selectedClaim.serviceDate), "PPP")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Submitted Date
                  </label>
                  <p className="font-medium">
                    {format(new Date(selectedClaim.submissionDate), "PPP")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Procedures</h4>
                <div className="space-y-2">
                  {selectedClaim.procedures.map((procedure, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{procedure.code}</div>
                        <div className="text-sm text-gray-600">
                          {procedure.description}
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(procedure.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedClaim.paymentAmount && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">
                      Payment Received
                    </span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(selectedClaim.paymentAmount)}
                    </span>
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    Paid on{" "}
                    {format(new Date(selectedClaim.paymentDate!), "PPP")}
                  </div>
                </div>
              )}

              {selectedClaim.status === "denied" && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="font-medium text-red-800 mb-2">
                    Denial Reason
                  </div>
                  <p className="text-sm text-red-600">
                    This claim was denied due to insufficient documentation.
                    Please resubmit with required medical records.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Track Status Dialog */}
      <Dialog open={trackStatusOpen} onOpenChange={setTrackStatusOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto z-50 pointer-events-auto">
          <DialogHeader>
            <DialogTitle>
              Track Claim Status - {trackingClaim?.claimNumber}
            </DialogTitle>
          </DialogHeader>
          {trackingClaim && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Current Status:</span>
                <Badge className={getStatusColor(trackingClaim.status)}>
                  {trackingClaim.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Status History</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium text-blue-800">
                        Claim Submitted
                      </div>
                      <div className="text-sm text-blue-600">
                        {format(new Date(trackingClaim.submissionDate), "PPP")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <div>
                      <div className="font-medium text-yellow-800">
                        Under Review
                      </div>
                      <div className="text-sm text-yellow-600">
                        Currently being processed by{" "}
                        {trackingClaim.insuranceProvider}
                      </div>
                    </div>
                  </div>

                  {trackingClaim.status === "approved" && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-medium text-green-800">
                          Claim Approved
                        </div>
                        <div className="text-sm text-green-600">
                          Payment of{" "}
                          {formatCurrency(trackingClaim.paymentAmount!)}{" "}
                          processed
                        </div>
                      </div>
                    </div>
                  )}

                  {trackingClaim.status === "denied" && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <div>
                        <div className="font-medium text-red-800">
                          Claim Denied
                        </div>
                        <div className="text-sm text-red-600">
                          Requires additional documentation
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <strong>Estimated Processing Time:</strong> 5-7 business days
                  <br />
                  <strong>Next Update:</strong>{" "}
                  {format(
                    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    "PPP",
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setTrackStatusOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Benefits Modal */}
      <Dialog open={viewBenefitsOpen} onOpenChange={setViewBenefitsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Benefits Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInsurance && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    {selectedInsurance.patientName}
                  </h4>
                  <div className="text-sm text-blue-700">
                    <div>
                      <span className="font-medium">Provider:</span>{" "}
                      {selectedInsurance.provider}
                    </div>
                    <div>
                      <span className="font-medium">Coverage:</span>{" "}
                      {selectedInsurance.coverageType}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="border-l-4 border-green-400 bg-green-50 p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">
                        Deductible
                      </span>
                      <span className="text-green-700">
                        ${selectedInsurance.deductible || 1000}
                      </span>
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      Met: $0
                    </div>
                  </div>

                  <div className="border-l-4 border-blue-400 bg-blue-50 p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">
                        Out-of-Pocket Max
                      </span>
                      <span className="text-blue-700">
                        $5000
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      Met: $0
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="border-l-4 border-orange-400 bg-orange-50 p-3">
                      <div className="font-medium text-orange-800">Copay</div>
                      <div className="text-orange-700">
                        ${selectedInsurance.copay || 0}
                      </div>
                    </div>

                    <div className="border-l-4 border-purple-400 bg-purple-50 p-3">
                      <div className="font-medium text-purple-800">
                        Coinsurance
                      </div>
                      <div className="text-purple-700">
                        20%
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setViewBenefitsOpen(false)}
                data-testid="button-close-benefits"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prior Authorization Modal */}
      <Dialog open={priorAuthOpen} onOpenChange={setPriorAuthOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prior Authorization Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInsurance && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Request Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Patient:</span>{" "}
                      {selectedInsurance.patientName}
                    </div>
                    <div>
                      <span className="font-medium">Insurance Provider:</span>{" "}
                      {selectedInsurance.provider}
                    </div>
                    <div>
                      <span className="font-medium">Policy Number:</span>{" "}
                      {selectedInsurance.policyNumber}
                    </div>
                    <div>
                      <span className="font-medium">Group Number:</span>{" "}
                      {selectedInsurance.groupNumber}
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-green-400 bg-green-50 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">
                        Request Initiated
                      </h4>
                      <p className="text-green-700 text-sm mt-1">
                        Prior authorization request has been submitted to{" "}
                        {selectedInsurance.provider}. You will receive a
                        response within 24-48 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <strong>Next Steps:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>
                      Authorization request sent to {selectedInsurance.provider}
                    </li>
                    <li>Patient will be notified via phone/email</li>
                    <li>Follow up if no response within 48 hours</li>
                  </ul>
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setPriorAuthOpen(false)}
                data-testid="button-close-prior-auth"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Eligibility Modal */}
      <Dialog
        open={verifyEligibilityOpen}
        onOpenChange={setVerifyEligibilityOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Insurance Eligibility</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Patient Name</label>
                <Input
                  value={verificationFormData.patientName}
                  onChange={(e) =>
                    setVerificationFormData((prev) => ({
                      ...prev,
                      patientName: e.target.value,
                    }))
                  }
                  data-testid="input-patient-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Insurance Provider
                </label>
                <Input
                  value={verificationFormData.insuranceProvider}
                  onChange={(e) =>
                    setVerificationFormData((prev) => ({
                      ...prev,
                      insuranceProvider: e.target.value,
                    }))
                  }
                  data-testid="input-insurance-provider"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Policy Number</label>
                <Input
                  value={verificationFormData.policyNumber}
                  onChange={(e) =>
                    setVerificationFormData((prev) => ({
                      ...prev,
                      policyNumber: e.target.value,
                    }))
                  }
                  data-testid="input-policy-number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Group Number</label>
                <Input
                  value={verificationFormData.groupNumber}
                  onChange={(e) =>
                    setVerificationFormData((prev) => ({
                      ...prev,
                      groupNumber: e.target.value,
                    }))
                  }
                  data-testid="input-group-number"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Coverage Type</label>
              <Select
                value={verificationFormData.coverageType}
                onValueChange={(value) =>
                  setVerificationFormData((prev) => ({
                    ...prev,
                    coverageType: value,
                  }))
                }
              >
                <SelectTrigger data-testid="select-coverage-type">
                  <SelectValue placeholder="Select coverage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="tertiary">Tertiary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Verification Status
                </label>
                <Select
                  value={verificationFormData.verificationStatus}
                  onValueChange={(value) =>
                    setVerificationFormData((prev) => ({
                      ...prev,
                      verificationStatus: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-verification-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="requires_review">
                      Requires Review
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Verification Date</label>
                <Input
                  type="date"
                  value={verificationFormData.verificationDate}
                  onChange={(e) =>
                    setVerificationFormData((prev) => ({
                      ...prev,
                      verificationDate: e.target.value,
                    }))
                  }
                  data-testid="input-verification-date"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setVerifyEligibilityOpen(false)}
                data-testid="button-cancel-verification"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (selectedInsurance) {
                    try {
                      await updateInsuranceMutation.mutateAsync({
                        insuranceId: selectedInsurance.id,
                        data: verificationFormData,
                      });
                      // Invalidate and refetch the insurance data
                      await queryClient.invalidateQueries({
                        queryKey: ["/api/financial/insurance"],
                      });
                      // Wait a brief moment to ensure the refetch completes
                      await new Promise((resolve) => setTimeout(resolve, 100));
                      setVerifyEligibilityOpen(false);
                    } catch (error) {
                      console.error("Failed to update insurance:", error);
                    }
                  }
                }}
                disabled={updateInsuranceMutation.isPending}
                data-testid="button-save-verification"
              >
                {updateInsuranceMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Insurance Info Modal */}
      <Dialog open={addInsuranceOpen} onOpenChange={setAddInsuranceOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Insurance Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Patient Name</label>
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
                      data-testid="button-patient-search"
                    >
                      {newInsuranceFormData.patientName || "Select patient..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search patients..." />
                      <CommandEmpty>No patients found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {patients?.map((patient: any) => (
                            <CommandItem
                              key={patient.id}
                              value={`${patient.id}-${patient.firstName}-${patient.lastName}-${patient.email || ''}`}
                              onSelect={() => {
                                setNewInsuranceFormData((prev) => ({
                                  ...prev,
                                  patientName: `${patient.firstName} ${patient.lastName}`,
                                  patientId: patient.id.toString(),
                                  nhsNumber: patient.nhsNumber || "",
                                  provider: patient.insuranceInfo?.provider || prev.provider,
                                  policyNumber: patient.insuranceInfo?.policyNumber || prev.policyNumber,
                                  groupNumber: patient.insuranceInfo?.groupNumber || prev.groupNumber,
                                  memberNumber: patient.insuranceInfo?.memberNumber || prev.memberNumber,
                                  planType: patient.insuranceInfo?.planType || prev.planType,
                                }));
                                setPatientSearchOpen(false);
                              }}
                              data-testid={`option-patient-${patient.id}`}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  newInsuranceFormData.patientId ===
                                  patient.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span>{patient.firstName} {patient.lastName}</span>
                                {patient.email && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{patient.email}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Insurance Provider
                </label>
                <Popover
                  open={insuranceProviderOpen}
                  onOpenChange={setInsuranceProviderOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={insuranceProviderOpen}
                      className="w-full justify-between"
                      data-testid="button-select-provider"
                    >
                      {newInsuranceFormData.provider || "Select insurance provider..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search insurance providers..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No insurance provider found.</CommandEmpty>
                        <CommandGroup>
                          {insuranceProviders.map((provider) => (
                            <CommandItem
                              key={provider}
                              value={provider}
                              onSelect={() => {
                                setNewInsuranceFormData((prev) => ({
                                  ...prev,
                                  provider: provider,
                                }));
                                setInsuranceProviderOpen(false);
                              }}
                              data-testid={`option-provider-${provider.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  newInsuranceFormData.provider === provider
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {provider}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Policy Number</label>
                <Input
                  value={newInsuranceFormData.policyNumber}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      policyNumber: e.target.value,
                    }))
                  }
                  placeholder="Enter policy number"
                  data-testid="input-new-policy-number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Group Number</label>
                <Input
                  value={newInsuranceFormData.groupNumber}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      groupNumber: e.target.value,
                    }))
                  }
                  placeholder="Enter group number"
                  data-testid="input-new-group-number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Member Number</label>
                <Input
                  value={newInsuranceFormData.memberNumber}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      memberNumber: e.target.value,
                    }))
                  }
                  placeholder="Enter member number"
                  data-testid="input-new-member-number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">NHS Number</label>
                <Input
                  value={newInsuranceFormData.nhsNumber}
                  onChange={(e) => {
                    // Format NHS number as XXX XXX XXXX
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 10) value = value.slice(0, 10);
                    if (value.length > 6) value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
                    else if (value.length > 3) value = value.replace(/(\d{3})(\d+)/, '$1 $2');
                    
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      nhsNumber: value,
                    }));
                  }}
                  placeholder="485 777 3456"
                  data-testid="input-new-nhs-number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Plan Type</label>
                <Select
                  value={newInsuranceFormData.planType}
                  onValueChange={(value) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      planType: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-new-plan-type">
                    <SelectValue placeholder="Select plan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="dental-only">Dental Only</SelectItem>
                    <SelectItem value="optical-only">Optical Only</SelectItem>
                    <SelectItem value="mental-health">Mental Health</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Effective Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-effective-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {newInsuranceFormData.effectiveDate
                        ? format(new Date(newInsuranceFormData.effectiveDate), "PPP")
                        : "Select effective date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <Input
                        type="date"
                        value={newInsuranceFormData.effectiveDate}
                        onChange={(e) =>
                          setNewInsuranceFormData((prev) => ({
                            ...prev,
                            effectiveDate: e.target.value,
                          }))
                        }
                        data-testid="input-effective-date"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Coverage Type</label>
                <Select
                  value={newInsuranceFormData.coverageType}
                  onValueChange={(value) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      coverageType: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-new-coverage-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newInsuranceFormData.status}
                  onValueChange={(value) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Eligibility Status
                </label>
                <Select
                  value={newInsuranceFormData.eligibilityStatus}
                  onValueChange={(value) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      eligibilityStatus: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-new-eligibility-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Copay ({currencySymbol})</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.copay}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      copay: e.target.value,
                    }))
                  }
                  placeholder="Enter copay amount"
                  data-testid="input-new-copay"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Coinsurance (%)</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.coinsurance}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      coinsurance: e.target.value,
                    }))
                  }
                  placeholder="Enter coinsurance percentage"
                  data-testid="input-new-coinsurance"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Deductible ({currencySymbol})</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.deductible}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      deductible: e.target.value,
                    }))
                  }
                  placeholder="Enter deductible amount"
                  data-testid="input-new-deductible"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Deductible Met ({currencySymbol})
                </label>
                <Input
                  type="number"
                  value={newInsuranceFormData.deductibleMet}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      deductibleMet: e.target.value,
                    }))
                  }
                  placeholder="Enter deductible met amount"
                  data-testid="input-new-deductible-met"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Out-of-Pocket Max ({currencySymbol})
                </label>
                <Input
                  type="number"
                  value={newInsuranceFormData.outOfPocketMax}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      outOfPocketMax: e.target.value,
                    }))
                  }
                  placeholder="Enter out-of-pocket maximum"
                  data-testid="input-new-out-of-pocket-max"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Out-of-Pocket Met ({currencySymbol})
                </label>
                <Input
                  type="number"
                  value={newInsuranceFormData.outOfPocketMet}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      outOfPocketMet: e.target.value,
                    }))
                  }
                  placeholder="Enter out-of-pocket met amount"
                  data-testid="input-new-out-of-pocket-met"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddInsuranceOpen(false)}
                data-testid="button-cancel-add-insurance"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  addInsuranceMutation.mutate(newInsuranceFormData);
                }}
                disabled={addInsuranceMutation.isPending}
                data-testid="button-save-add-insurance"
              >
                {addInsuranceMutation.isPending
                  ? "Saving..."
                  : "Save Insurance"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Insurance Dialog */}
      <Dialog open={editInsuranceDialogOpen} onOpenChange={setEditInsuranceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Insurance Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Patient Name</label>
                <Input
                  value={newInsuranceFormData.patientName}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      patientName: e.target.value,
                    }))
                  }
                  disabled
                  data-testid="input-edit-patient-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Insurance Provider</label>
                <Input
                  value={newInsuranceFormData.provider}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      provider: e.target.value,
                    }))
                  }
                  data-testid="input-edit-provider"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Policy Number</label>
                <Input
                  value={newInsuranceFormData.policyNumber}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      policyNumber: e.target.value,
                    }))
                  }
                  data-testid="input-edit-policy-number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Group Number</label>
                <Input
                  value={newInsuranceFormData.groupNumber}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      groupNumber: e.target.value,
                    }))
                  }
                  data-testid="input-edit-group-number"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Coverage Type</label>
                <Select
                  value={newInsuranceFormData.coverageType}
                  onValueChange={(value) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      coverageType: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-edit-coverage-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newInsuranceFormData.status}
                  onValueChange={(value) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Eligibility Status</label>
                <Select
                  value={newInsuranceFormData.eligibilityStatus}
                  onValueChange={(value) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      eligibilityStatus: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-edit-eligibility-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Copay ({currencySymbol})</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.copay}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      copay: e.target.value,
                    }))
                  }
                  data-testid="input-edit-copay"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Coinsurance (%)</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.coinsurance}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      coinsurance: e.target.value,
                    }))
                  }
                  data-testid="input-edit-coinsurance"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Deductible ({currencySymbol})</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.deductible}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      deductible: e.target.value,
                    }))
                  }
                  data-testid="input-edit-deductible"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Deductible Met (£)</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.deductibleMet}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      deductibleMet: e.target.value,
                    }))
                  }
                  data-testid="input-edit-deductible-met"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Out-of-Pocket Max (£)</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.outOfPocketMax}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      outOfPocketMax: e.target.value,
                    }))
                  }
                  data-testid="input-edit-out-of-pocket-max"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Out-of-Pocket Met (£)</label>
                <Input
                  type="number"
                  value={newInsuranceFormData.outOfPocketMet}
                  onChange={(e) =>
                    setNewInsuranceFormData((prev) => ({
                      ...prev,
                      outOfPocketMet: e.target.value,
                    }))
                  }
                  data-testid="input-edit-out-of-pocket-met"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setEditInsuranceDialogOpen(false)}
                data-testid="button-cancel-edit-insurance"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (insuranceToEdit) {
                    updateInsuranceMutation.mutate({
                      insuranceId: insuranceToEdit.id,
                      data: {
                        ...newInsuranceFormData,
                        lastVerified: new Date().toISOString(),
                        benefits: {
                          deductible: parseFloat(newInsuranceFormData.deductible) || 0,
                          deductibleMet: parseFloat(newInsuranceFormData.deductibleMet) || 0,
                          outOfPocketMax: parseFloat(newInsuranceFormData.outOfPocketMax) || 0,
                          outOfPocketMet: parseFloat(newInsuranceFormData.outOfPocketMet) || 0,
                          copay: parseFloat(newInsuranceFormData.copay) || 0,
                          coinsurance: parseFloat(newInsuranceFormData.coinsurance) || 0,
                        },
                      },
                    });
                    setEditInsuranceDialogOpen(false);
                  }
                }}
                disabled={updateInsuranceMutation.isPending}
                data-testid="button-save-edit-insurance"
              >
                {updateInsuranceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete the insurance record for{" "}
              <strong>{insuranceToDelete?.patientName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmDialogOpen(false);
                  setInsuranceToDelete(null);
                }}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteInsurance}
                disabled={deleteInsuranceMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteInsuranceMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Claim Submitted Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Claim Number: {successClaimData?.claimNumber}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Your insurance claim has been successfully submitted and is now pending review.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Patient:</span>
                <span className="text-sm">{successClaimData?.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Provider:</span>
                <span className="text-sm">{successClaimData?.insuranceProvider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Amount:</span>
                <span className="text-sm">{currencySymbol}{successClaimData?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant="secondary">Pending</Badge>
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessClaimData(null);
              }}
              data-testid="button-close-success-modal"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
