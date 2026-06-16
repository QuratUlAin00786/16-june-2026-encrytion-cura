import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { Settings as SettingsIcon, Globe, Shield, Palette, Save, Check, Upload, X, Link as LinkIcon, User, Plus, Lock, Eye, EyeOff, FileText, Image, Bold, Italic, Underline, Edit, CheckCircle, CreditCard, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@/types";
import GDPRCompliance from "./gdpr-compliance";
import IntegrationsPage from "./integrations";
import { ChangeEvent } from "react";

const regions = [
  { value: "UK", label: "United Kingdom" },
  { value: "EU", label: "European Union" },
  { value: "ME", label: "Middle East" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "US", label: "United States" }
];

const themes = [
  { value: "default", label: "Bluewave" },
  { value: "electric-lilac", label: "Electric Lilac" }, 
  { value: "midnight", label: "Midnight" },
  { value: "steel", label: "Steel" },
  { value: "mist", label: "Mist" },
  { value: "mint-drift", label: "Mint Drift" },
  { value: "green", label: "Medical Green" },
  { value: "purple", label: "Professional Purple" },
  { value: "dark", label: "Dark Mode" }
];

// Clinic Information Constants
const ALLOWED_CLINIC_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const ALLOWED_CLINIC_LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "svg"];
const CLINIC_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const CLINIC_LOGO_MIN_DIMENSION = 200;
const CLINIC_LOGO_MAX_DIMENSION = 2000;

const getFileExtension = (filename: string) => filename.split(".").pop()?.toLowerCase();

const validateClinicLogoMetadata = (file: File): string | null => {
  const fileType = file.type?.toLowerCase() ?? "";
  if (
    !ALLOWED_CLINIC_LOGO_TYPES.includes(fileType) &&
    !ALLOWED_CLINIC_LOGO_EXTENSIONS.includes(getFileExtension(file.name) ?? "")
  ) {
    return "Logo must be PNG, JPG/JPEG, or SVG format.";
  }
  if (file.size > CLINIC_LOGO_MAX_SIZE_BYTES) {
    return "Logo must be smaller than 2 MB.";
  }
  return null;
};

const validateClinicLogoDimensions = (width: number, height: number): string | null => {
  if (width < CLINIC_LOGO_MIN_DIMENSION || height < CLINIC_LOGO_MIN_DIMENSION) {
    return `Logo must be at least ${CLINIC_LOGO_MIN_DIMENSION}×${CLINIC_LOGO_MIN_DIMENSION} pixels.`;
  }
  if (width > CLINIC_LOGO_MAX_DIMENSION || height > CLINIC_LOGO_MAX_DIMENSION) {
    return `Logo must not exceed ${CLINIC_LOGO_MAX_DIMENSION}×${CLINIC_LOGO_MAX_DIMENSION} pixels.`;
  }
  const ratio = width / height;
  if (Math.abs(ratio - 1) > 0.01) {
    return "Logo must maintain a 1:1 aspect ratio (square).";
  }
  return null;
};

const getFontFamilyFromValue = (fontValue: string) => {
  const fontMap: Record<string, string> = {
    "arial": 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    "calibri": 'Calibri, "Trebuchet MS", "Lucida Grande", sans-serif',
    "times": '"Times New Roman", Times, Georgia, serif',
    "georgia": 'Georgia, "Times New Roman", serif',
    "verdana": 'Verdana, Geneva, "DejaVu Sans", sans-serif',
    "courier": '"Courier New", Courier, "Lucida Console", monospace',
  };
  return fontMap[fontValue] || 'Verdana, Geneva, "DejaVu Sans", sans-serif';
};

// Stripe Dashboard Button Component
function StripeDashboardButton({ organizationId }: { organizationId: number }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenStripeDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/organization/stripe-login-link');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create login link');
      }

      const data = await response.json();
      
      if (data.url) {
        // Open Stripe Dashboard in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Stripe Dashboard",
          description: "Opening Stripe Dashboard in a new tab...",
          variant: "default",
        });
      } else {
        throw new Error('No login URL received');
      }
    } catch (error: any) {
      console.error('Stripe login link error:', error);
      toast({
        title: "Error",
        description: error.message || "Unable to access Stripe Dashboard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleOpenStripeDashboard}
      disabled={isLoading}
      className="w-full sm:w-auto"
      variant="outline"
    >
      <CreditCard className="h-4 w-4 mr-2" />
      {isLoading ? "Generating Link..." : "View Stripe Dashboard"}
      <ExternalLink className="h-4 w-4 ml-2" />
    </Button>
  );
}

export default function Settings() {
  const { canView, canEdit: canEditPermission } = useRolePermissions();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [editingOrg, setEditingOrg] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  
  // Clinic Information states
  const [clinicLogoFile, setClinicLogoFile] = useState<File | null>(null);
  const [clinicLogoPreview, setClinicLogoPreview] = useState<string>("");
  const [clinicLogoError, setClinicLogoError] = useState<string>("");
  const [clinicLogoSuccess, setClinicLogoSuccess] = useState<string>("");
  const [selectedLogoPosition, setSelectedLogoPosition] = useState<"left" | "right" | "center">("center");
  const [activeClinicTab, setActiveClinicTab] = useState<string>("header");
  const [showViewClinicInfoDialog, setShowViewClinicInfoDialog] = useState(false);
  const [showHeaderSuccessModal, setShowHeaderSuccessModal] = useState(false);
  const [showFooterSuccessModal, setShowFooterSuccessModal] = useState(false);
  const [showPasswordChangeSuccessModal, setShowPasswordChangeSuccessModal] = useState(false);
  const [clinicHeaderInfo, setClinicHeaderInfo] = useState({
    clinicName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    clinicNameFontSize: "24pt",
    fontSize: "12pt",
    fontFamily: "verdana",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
  });
  const [clinicFooterInfo, setClinicFooterInfo] = useState({
    footerText: "",
    backgroundColor: "#4A7DFF",
    textColor: "#FFFFFF",
    showSocial: false,
    facebook: "",
    twitter: "",
    linkedin: "",
  });
  
  // Doctor profile editable fields state
  const [doctorProfile, setDoctorProfile] = useState({
    medicalSpecialtyCategory: "",
    subSpecialty: "",
    workingDays: [] as string[],
    workingHours: { start: "", end: "" }
  });
  
  // Get tab from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const defaultTab = user?.role === "patient" ? "my-profile" : "general";
  const [activeTab, setActiveTab] = useState(tabParam || defaultTab);
  
  // Sync activeTab with URL changes (for back/forward navigation and direct URL access)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newTab = params.get('tab') || 'general';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location]);
  
  // Handle tab changes and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const currentPath = location.split('?')[0];
    setLocation(`${currentPath}?tab=${newTab}`);
  };

  const { data: organization, isLoading, error, refetch: refetchOrganization } = useQuery<Organization>({
    queryKey: ["/api/tenant/info"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/tenant/info');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch current user details from users table
  const { data: currentUserDetails, isLoading: userDetailsLoading, error: userDetailsError } = useQuery({
    queryKey: ["/api/users/current"],
    queryFn: async () => {
      try {
        // Use apiRequest which handles URL construction and headers correctly
        const response = await apiRequest('GET', '/api/users/current');
        
        // apiRequest throws on non-OK responses, so if we get here, response is OK
        const contentType = response.headers.get('content-type') || '';
        
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          console.error("[SETTINGS] Received non-JSON response:", text.substring(0, 200));
          throw new Error(`Server returned ${contentType} instead of JSON. Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("[SETTINGS] User details fetched:", data);
        return data;
      } catch (error) {
        console.error("[SETTINGS] Error fetching user details:", error);
        throw error;
      }
    },
    enabled: !!user,
    retry: false,
  });



  const [settings, setSettings] = useState({
    name: "",
    brandName: "",
    region: "UK",
    theme: "default",
    logoUrl: "",
    gdprEnabled: true,
    aiEnabled: true,
    billingEnabled: true
  });

  // Apply theme colors to CSS variables
  const applyTheme = (themeValue: string) => {
    const root = document.documentElement;
    
    switch (themeValue) {
      case 'electric-lilac':
        // Electric Lilac Theme
        root.style.setProperty('--primary', '#7279FB', 'important'); 
        root.style.setProperty('--primary-foreground', '#FFFFFF', 'important');
        root.style.setProperty('--ring', '#7279FB', 'important');
        root.style.setProperty('--cura-bluewave', '#7279FB', 'important');
        root.style.setProperty('--cura-electric-lilac', '#7279FB', 'important');
        root.style.setProperty('--cura-mint-drift', '#C073FF', 'important');
        root.style.setProperty('--medical-blue', '#7279FB', 'important');
        break;
      case 'midnight':
        // Midnight Theme
        root.style.setProperty('--primary', '#162B61', 'important'); 
        root.style.setProperty('--primary-foreground', '#FFFFFF', 'important');
        root.style.setProperty('--ring', '#162B61', 'important');
        root.style.setProperty('--cura-bluewave', '#162B61', 'important');
        root.style.setProperty('--cura-electric-lilac', '#2A4082', 'important');
        root.style.setProperty('--cura-mint-drift', '#4A6FA5', 'important');
        root.style.setProperty('--medical-blue', '#162B61', 'important');
        break;
      case 'steel':
        // Steel Theme
        root.style.setProperty('--primary', '#9B9EAF', 'important'); 
        root.style.setProperty('--primary-foreground', '#FFFFFF', 'important');
        root.style.setProperty('--ring', '#9B9EAF', 'important');
        root.style.setProperty('--cura-bluewave', '#9B9EAF', 'important');
        root.style.setProperty('--cura-electric-lilac', '#B5B8C7', 'important');
        root.style.setProperty('--cura-mint-drift', '#A8ABBA', 'important');
        root.style.setProperty('--medical-blue', '#9B9EAF', 'important');
        break;
      case 'mist':
        // Mist Theme
        root.style.setProperty('--primary', '#E0E1F4', 'important'); 
        root.style.setProperty('--primary-foreground', '#162B61', 'important');
        root.style.setProperty('--ring', '#E0E1F4', 'important');
        root.style.setProperty('--cura-bluewave', '#E0E1F4', 'important');
        root.style.setProperty('--cura-electric-lilac', '#D1D3E8', 'important');
        root.style.setProperty('--cura-mint-drift', '#E8E9F6', 'important');
        root.style.setProperty('--medical-blue', '#E0E1F4', 'important');
        break;
      case 'mint-drift':
        // Mint Drift Theme
        root.style.setProperty('--primary', '#6CFFEB', 'important'); 
        root.style.setProperty('--primary-foreground', '#162B61', 'important');
        root.style.setProperty('--ring', '#6CFFEB', 'important');
        root.style.setProperty('--cura-bluewave', '#6CFFEB', 'important');
        root.style.setProperty('--cura-electric-lilac', '#5CFCE6', 'important');
        root.style.setProperty('--cura-mint-drift', '#6CFFEB', 'important');
        root.style.setProperty('--medical-blue', '#6CFFEB', 'important');
        break;
      case 'green':
        // Medical Green Theme - Force high specificity
        root.style.setProperty('--primary', '#22C55E', 'important'); 
        root.style.setProperty('--primary-foreground', '#FFFFFF', 'important');
        root.style.setProperty('--ring', '#22C55E', 'important');
        root.style.setProperty('--cura-bluewave', '#22C55E', 'important');
        root.style.setProperty('--cura-electric-lilac', '#10B981', 'important');
        root.style.setProperty('--cura-mint-drift', '#34D399', 'important');
        root.style.setProperty('--medical-blue', '#22C55E', 'important');
        break;
      case 'purple':
        // Professional Purple Theme
        root.style.setProperty('--primary', '#7C3AED', 'important');
        root.style.setProperty('--primary-foreground', '#FFFFFF', 'important');
        root.style.setProperty('--ring', '#7C3AED', 'important');
        root.style.setProperty('--cura-bluewave', '#7C3AED', 'important');
        root.style.setProperty('--cura-electric-lilac', '#A855F7', 'important');
        root.style.setProperty('--cura-mint-drift', '#C084FC', 'important');
        root.style.setProperty('--medical-blue', '#7C3AED', 'important');
        break;
      case 'dark':
        // Dark Mode Theme
        root.style.setProperty('--primary', '#374151', 'important');
        root.style.setProperty('--primary-foreground', '#FFFFFF', 'important');
        root.style.setProperty('--ring', '#374151', 'important');
        root.style.setProperty('--cura-bluewave', '#374151', 'important');
        root.style.setProperty('--cura-electric-lilac', '#4B5563', 'important');
        root.style.setProperty('--cura-mint-drift', '#6B7280', 'important');
        root.style.setProperty('--medical-blue', '#374151', 'important');
        break;
      default: // Bluewave (Default)
        root.style.setProperty('--primary', '#4A7DFF', 'important');
        root.style.setProperty('--primary-foreground', '#FFFFFF', 'important');
        root.style.setProperty('--ring', '#4A7DFF', 'important');
        root.style.setProperty('--cura-bluewave', '#4A7DFF', 'important');
        root.style.setProperty('--cura-electric-lilac', '#7279FB', 'important');
        root.style.setProperty('--cura-mint-drift', '#6CFFEB', 'important');
        root.style.setProperty('--medical-blue', '#4A7DFF', 'important');
        break;
    }
    
    // Force a re-render by triggering a style recalculation
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
  };

  // Update settings when organization data is loaded
  useEffect(() => {
    if (organization) {
      const newSettings = {
        name: organization.name || "",
        brandName: organization.brandName || "",
        region: organization.region || "UK",
        theme: organization.settings?.theme?.primaryColor || "default",
        logoUrl: organization.settings?.theme?.logoUrl || "",
        gdprEnabled: organization.settings?.compliance?.gdprEnabled || true,
        aiEnabled: organization.settings?.features?.aiEnabled || true,
        billingEnabled: organization.settings?.features?.billingEnabled || true
      };
      setSettings(newSettings);
      // Apply the theme immediately when data loads
      applyTheme(newSettings.theme);
      setHasChanges(false); // Reset changes flag when fresh data loads
    }
  }, [organization]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      return apiRequest('PATCH', '/api/organization/settings', updatedSettings);
    },
    onSuccess: async (data) => {
      console.log("[SETTINGS] Update successful, refetching organization data...");
      
      // Force cache invalidation and refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/tenant/info"] });
      
      // Wait for the refetch to complete
      try {
        const refetchResult = await refetchOrganization();
        console.log("[SETTINGS] Refetch result:", refetchResult);
        
        // The useEffect will automatically update settings when organization changes
        // But we can also manually update if needed
        if (refetchResult.data) {
          console.log("[SETTINGS] Updated organization data:", refetchResult.data);
        }
      } catch (refetchError) {
        console.error("[SETTINGS] Error refetching organization:", refetchError);
      }
      
      // Immediately reapply theme after saving
      applyTheme(settings.theme);
      
      setHasChanges(false);
      setEditingOrg(false);
      setShowSaved(true);
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated successfully.",
      });
      // Hide the saved indicator after 3 seconds
      setTimeout(() => setShowSaved(false), 3000);
    },
    onError: (error: any) => {
      console.error("[SETTINGS] Update error:", error);
      // Try to extract more detailed error message
      let errorMessage = "Failed to save settings. Please try again.";
      if (error.message) {
        errorMessage = error.message;
        // Try to parse JSON error response from the error message
        try {
          const errorText = error.message.split(': ')[1];
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            if (errorData.details) {
              console.error("[SETTINGS] Error details:", errorData.details);
            }
          }
        } catch (e) {
          // If parsing fails, use the original message
        }
      }
      toast({
        title: "Error saving settings",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('PATCH', '/api/user/change-password', data);
    },
    onSuccess: async (response) => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
      
      // Show success modal
      setShowPasswordChangeSuccessModal(true);
    },
    onError: (error: any) => {
      console.error("[PASSWORD CHANGE] Error:", error);
      
      // Extract error message from API response
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.message) {
        // Try to parse the error message from the API response
        try {
          // Error message format: "401: {\"error\":\"Current password is incorrect...\"}"
          const errorText = error.message.split(': ')[1];
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          // If parsing fails, check if it's a direct error message
          if (error.message.includes("Current password is incorrect") || 
              error.message.includes("incorrect")) {
            errorMessage = "Current password is incorrect. Please check your password and try again.";
          } else {
            errorMessage = error.message;
          }
        }
      }
      
      // Set error on current password field if it's a password mismatch
      if (errorMessage.toLowerCase().includes("incorrect") || 
          errorMessage.toLowerCase().includes("current password")) {
        setPasswordErrors({ currentPassword: errorMessage });
      } else {
        setPasswordErrors({ 
          currentPassword: errorMessage,
          newPassword: errorMessage.includes("8 characters") ? errorMessage : ""
        });
      }
      
      toast({
        title: "Password Change Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Doctor profile update mutation
  const updateDoctorProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      if (!user?.id) throw new Error("User not found");
      return apiRequest('PATCH', `/api/users/${user.id}`, profileData);
    },
    onSuccess: async () => {
      // Refresh user data
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Apply theme immediately when user selects it
    if (field === 'theme') {
      applyTheme(value);
      // Save theme to localStorage for persistence across pages
      localStorage.setItem('cura-theme', value);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (PNG, JPG, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleInputChange('logoUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clinic Information handlers
  const handleClinicLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0] ?? null;

    if (!file) {
      setClinicLogoFile(null);
      setClinicLogoPreview("");
      setClinicLogoError("");
      setClinicLogoSuccess("");
      return;
    }

    const metadataError = validateClinicLogoMetadata(file);
    if (metadataError) {
      setClinicLogoFile(null);
      setClinicLogoPreview("");
      setClinicLogoError(metadataError);
      setClinicLogoSuccess("");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const img = document.createElement("img");
      img.onload = () => {
        const dimensionError = validateClinicLogoDimensions(img.width, img.height);
        if (dimensionError) {
          setClinicLogoFile(null);
          setClinicLogoPreview("");
          setClinicLogoError(dimensionError);
          setClinicLogoSuccess("");
          input.value = "";
          return;
        }

        setClinicLogoError("");
        setClinicLogoPreview(dataUrl);
        setClinicLogoFile(file);
        setClinicLogoSuccess("Logo uploaded successfully.");
      };
      img.onerror = () => {
        setClinicLogoFile(null);
        setClinicLogoPreview("");
        setClinicLogoError("Unable to read logo dimensions. Please try another image.");
        input.value = "";
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Fetch saved clinic header and footer
  const { data: savedHeader, isLoading: headerLoading, refetch: refetchHeader } = useQuery({
    queryKey: ['/api/clinic-headers'],
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clinic-headers');
      if (!response.ok) {
        console.log('[SETTINGS] Failed to fetch clinic header, status:', response.status);
        return null;
      }
      const data = await response.json();
      const headerData = Array.isArray(data) ? data[0] : data;
      
      // Log what we received
      if (headerData) {
        console.log('[SETTINGS] Clinic header data received:', {
          id: headerData.id,
          clinicName: headerData.clinicName,
          hasLogo: !!headerData.logoBase64,
          logoLength: headerData.logoBase64 ? headerData.logoBase64.length : 0,
          logoPosition: headerData.logoPosition,
          logoBase64Preview: headerData.logoBase64 ? headerData.logoBase64.substring(0, 50) + '...' : 'null'
        });
      } else {
        console.log('[SETTINGS] No clinic header data received (null)');
      }
      
      return headerData;
    },
  });

  const { data: savedFooter, isLoading: footerLoading, refetch: refetchFooter } = useQuery({
    queryKey: ['/api/clinic-footers'],
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clinic-footers');
      if (!response.ok) {
        console.log('[SETTINGS] Failed to fetch clinic footer, status:', response.status);
        return null;
      }
      const data = await response.json();
      const footerData = Array.isArray(data) ? data[0] : data;
      
      // Log what we received
      if (footerData) {
        console.log('[SETTINGS] Clinic footer data received:', {
          id: footerData.id,
          footerText: footerData.footerText,
          backgroundColor: footerData.backgroundColor,
          textColor: footerData.textColor,
          showSocial: footerData.showSocial
        });
      } else {
        console.log('[SETTINGS] No clinic footer data received (null)');
      }
      
      return footerData;
    },
  });

  // Load saved data into form when available
  useEffect(() => {
    if (savedHeader) {
      setClinicHeaderInfo({
        clinicName: savedHeader.clinicName || "",
        address: savedHeader.address || "",
        phone: savedHeader.phone || "",
        email: savedHeader.email || "",
        website: savedHeader.website || "",
        clinicNameFontSize: savedHeader.clinicNameFontSize || "24pt",
        fontSize: savedHeader.fontSize || "12pt",
        fontFamily: savedHeader.fontFamily || "verdana",
        fontWeight: savedHeader.fontWeight || "normal",
        fontStyle: savedHeader.fontStyle || "normal",
        textDecoration: savedHeader.textDecoration || "none",
      });
      // Always set logo preview from saved data, even if empty (to clear previous logo)
      if (savedHeader.logoBase64 && savedHeader.logoBase64.trim() !== "") {
        setClinicLogoPreview(savedHeader.logoBase64);
      } else {
        setClinicLogoPreview("");
      }
      if (savedHeader.logoPosition) {
        setSelectedLogoPosition(savedHeader.logoPosition);
      }
    }
    if (savedFooter) {
      setClinicFooterInfo({
        footerText: savedFooter.footerText || "",
        backgroundColor: savedFooter.backgroundColor || "#4A7DFF",
        textColor: savedFooter.textColor || "#FFFFFF",
        showSocial: savedFooter.showSocial || false,
        facebook: savedFooter.facebook || "",
        twitter: savedFooter.twitter || "",
        linkedin: savedFooter.linkedin || "",
      });
    }
  }, [savedHeader, savedFooter]);

  // Refetch header and footer when dialog opens
  useEffect(() => {
    if (showViewClinicInfoDialog) {
      refetchHeader();
      refetchFooter();
    }
  }, [showViewClinicInfoDialog, refetchHeader, refetchFooter]);

  const handleSaveHeader = async () => {
    if (clinicLogoError) {
      toast({
        title: "⚠️ Logo validation failed",
        description: clinicLogoError,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (!clinicHeaderInfo.clinicName.trim()) {
      toast({
        title: "⚠️ Validation Error",
        description: "Clinic name is required",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      // Ensure logoBase64 is properly formatted - use null if empty string
      const logoBase64Value = clinicLogoPreview && clinicLogoPreview.trim() !== "" 
        ? clinicLogoPreview 
        : null;

      console.log("[SETTINGS] Preparing to save header:");
      console.log("[SETTINGS] - clinicLogoPreview exists:", !!clinicLogoPreview);
      console.log("[SETTINGS] - clinicLogoPreview length:", clinicLogoPreview ? clinicLogoPreview.length : 0);
      console.log("[SETTINGS] - logoBase64Value:", logoBase64Value ? `present (${logoBase64Value.length} chars)` : 'null');
      console.log("[SETTINGS] - clinicName:", clinicHeaderInfo.clinicName);
      console.log("[SETTINGS] - organizationId:", user?.organizationId);

      const headerData = {
        organizationId: user?.organizationId || 0,
        logoBase64: logoBase64Value,
        logoPosition: selectedLogoPosition,
        clinicName: clinicHeaderInfo.clinicName,
        address: clinicHeaderInfo.address || null,
        phone: clinicHeaderInfo.phone || null,
        email: clinicHeaderInfo.email || null,
        website: clinicHeaderInfo.website || null,
        clinicNameFontSize: clinicHeaderInfo.clinicNameFontSize,
        fontSize: clinicHeaderInfo.fontSize,
        fontFamily: clinicHeaderInfo.fontFamily,
        fontWeight: clinicHeaderInfo.fontWeight,
        fontStyle: clinicHeaderInfo.fontStyle,
        textDecoration: clinicHeaderInfo.textDecoration,
        isActive: true,
      };

      console.log("[SETTINGS] Sending headerData:", {
        ...headerData,
        logoBase64: headerData.logoBase64 ? `present (${headerData.logoBase64.length} chars)` : 'null'
      });

      const response = await apiRequest('POST', '/api/clinic-headers', headerData);

      // apiRequest throws on non-OK responses, so if we get here, response is OK
      const contentType = response.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error("[SETTINGS] Received non-JSON response:", text.substring(0, 200));
        throw new Error(`Server returned ${contentType} instead of JSON. Status: ${response.status}`);
      }

      const savedData = await response.json();
      
      console.log("[SETTINGS] Header save response received:", {
        id: savedData.id,
        clinicName: savedData.clinicName,
        logoBase64: savedData.logoBase64 ? `present (${savedData.logoBase64.length} chars)` : 'null',
        logoPosition: savedData.logoPosition
      });
      
      // Update logo preview from saved data to ensure consistency
      if (savedData.logoBase64 && savedData.logoBase64.trim() !== "") {
        console.log("[SETTINGS] Updating clinicLogoPreview from saved data");
        setClinicLogoPreview(savedData.logoBase64);
      } else {
        console.log("[SETTINGS] No logoBase64 in saved data, keeping current preview");
      }

      // Refetch to ensure UI is in sync
      console.log("[SETTINGS] Refetching header data...");
      await refetchHeader();
      console.log("[SETTINGS] Header data refetched");
      setShowHeaderSuccessModal(true);
      toast({
        title: "✓ Header Saved Successfully",
        description: "Clinic header information and logo saved to database",
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error saving header:", error);
      toast({
        title: "⚠️ Save Failed",
        description: error.message || "Failed to save header information",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleSaveFooter = async () => {
    if (!clinicFooterInfo.footerText.trim()) {
      toast({
        title: "⚠️ Validation Error",
        description: "Footer text is required",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      console.log("[SETTINGS] Preparing to save footer:");
      console.log("[SETTINGS] - footerText:", clinicFooterInfo.footerText);
      console.log("[SETTINGS] - backgroundColor:", clinicFooterInfo.backgroundColor);
      console.log("[SETTINGS] - textColor:", clinicFooterInfo.textColor);
      console.log("[SETTINGS] - organizationId:", user?.organizationId);

      const footerData = {
        organizationId: user?.organizationId || 0,
        footerText: clinicFooterInfo.footerText,
        backgroundColor: clinicFooterInfo.backgroundColor,
        textColor: clinicFooterInfo.textColor,
        showSocial: clinicFooterInfo.showSocial,
        facebook: clinicFooterInfo.facebook || null,
        twitter: clinicFooterInfo.twitter || null,
        linkedin: clinicFooterInfo.linkedin || null,
        isActive: true,
      };

      console.log("[SETTINGS] Sending footerData:", footerData);

      const response = await apiRequest('POST', '/api/clinic-footers', footerData);

      // apiRequest throws on non-OK responses, so if we get here, response is OK
      const contentType = response.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error("[SETTINGS] Received non-JSON response for footer:", text.substring(0, 200));
        throw new Error(`Server returned ${contentType} instead of JSON. Status: ${response.status}`);
      }

      const savedFooterData = await response.json();
      console.log("[SETTINGS] Footer save response received:", {
        id: savedFooterData.id,
        footerText: savedFooterData.footerText,
        backgroundColor: savedFooterData.backgroundColor,
        textColor: savedFooterData.textColor
      });

      console.log("[SETTINGS] Refetching footer data...");
      await refetchFooter();
      console.log("[SETTINGS] Footer data refetched");
      setShowFooterSuccessModal(true);
      toast({
        title: "✓ Footer Saved Successfully",
        description: "Clinic footer information saved to database",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "⚠️ Save Failed",
        description: "Failed to save footer information",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleSave = () => {
    const updatedSettings = {
      name: settings.name,
      brandName: settings.brandName,
      region: settings.region,
      settings: {
        theme: { primaryColor: settings.theme, logoUrl: settings.logoUrl },
        compliance: { gdprEnabled: settings.gdprEnabled },
        features: { 
          aiEnabled: settings.aiEnabled, 
          billingEnabled: settings.billingEnabled 
        }
      }
    };
    
    updateSettingsMutation.mutate(updatedSettings);
  };

  const handleOrgSave = async () => {
    // Only send organization fields (name, brandName, region) when editing org
    // Only include fields that have values
    const orgUpdate: any = {};
    
    if (settings.name && settings.name.trim()) {
      orgUpdate.name = settings.name.trim();
    }
    if (settings.brandName && settings.brandName.trim()) {
      orgUpdate.brandName = settings.brandName.trim();
    }
    if (settings.region) {
      orgUpdate.region = settings.region;
    }
    
    // Validate that at least one field is being updated
    if (Object.keys(orgUpdate).length === 0) {
      toast({
        title: "No changes to save",
        description: "Please make some changes before saving.",
        variant: "destructive",
      });
      return;
    }

    // Check if organization name already exists (only if name is being changed)
    if (orgUpdate.name && organization && orgUpdate.name !== organization.name) {
      try {
        const checkResponse = await apiRequest(
          'GET',
          `/api/organizations/check-name-exists?name=${encodeURIComponent(orgUpdate.name)}&excludeId=${organization.id}`
        );
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          toast({
            title: "Organization name already exists",
            description: "This organization name is already taken. Please choose a different name.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error("[SETTINGS] Error checking organization name:", error);
        // Continue with save if check fails (don't block user)
      }
    }

    updateSettingsMutation.mutate(orgUpdate);
  };

  const validatePassword = () => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters long";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "New passwords do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = () => {
    if (!validatePassword()) {
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width">
        <Header 
          title="Settings" 
          subtitle="Configure your organization settings and preferences."
        />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width">
        <Header 
          title="Settings" 
          subtitle="Configure your organization settings and preferences."
        />
        <div className="w-full flex-1 overflow-auto p-6">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-neutral-600 dark:text-gray-400 mb-4">
                Settings require administrator access.
              </p>
              <p className="text-sm text-neutral-500 dark:text-gray-500 mb-4">
                Please log in with admin credentials to access organization settings.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-left">
                <p className="font-medium text-blue-900 dark:text-blue-300 mb-2">Admin Login:</p>
                <p className="text-sm text-blue-800 dark:text-blue-400">Email: admin@demo.medicoreemr.com</p>
                <p className="text-sm text-blue-800 dark:text-blue-400">Password: password123</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header 
        title="Settings" 
        subtitle="Configure your organization settings and preferences."
      />
      
      <div className="w-full flex-1 overflow-auto px-4 sm:px-5 lg:px-6 py-5 space-y-5">
        <div className="space-y-5">
          {user?.role === "patient" ? (
            <div className="space-y-6">
              <MyProfileContent user={user} />
            </div>
          ) : user?.role === "doctor" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>My Profile</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={user?.firstName || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={user?.lastName || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user?.email || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={(user as any)?.username || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={user?.role || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input value={user?.department || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Specialization (Medical Specialty)</Label>
                      <Input 
                        value={
                          (user as any)?.medicalSpecialtyCategory 
                            ? (user as any).medicalSpecialtyCategory 
                            : doctorProfile.medicalSpecialtyCategory
                        } 
                        onChange={(e) => setDoctorProfile({ ...doctorProfile, medicalSpecialtyCategory: e.target.value })}
                        disabled={!!(user as any)?.medicalSpecialtyCategory} 
                        className={(user as any)?.medicalSpecialtyCategory ? "bg-gray-100 dark:bg-gray-800" : ""}
                        placeholder="Enter your medical specialty"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sub-Specialty</Label>
                      <Input 
                        value={
                          (user as any)?.subSpecialty 
                            ? (user as any).subSpecialty 
                            : doctorProfile.subSpecialty
                        }
                        onChange={(e) => setDoctorProfile({ ...doctorProfile, subSpecialty: e.target.value })}
                        disabled={!!(user as any)?.subSpecialty} 
                        className={(user as any)?.subSpecialty ? "bg-gray-100 dark:bg-gray-800" : ""}
                        placeholder="Enter your sub-specialty"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Working Days</Label>
                      <Input 
                        value={(user as any)?.workingDays && Array.isArray((user as any).workingDays) && (user as any).workingDays.length > 0 
                          ? (user as any).workingDays.join(", ") 
                          : "Not specified"
                        } 
                        disabled 
                        className="bg-gray-100 dark:bg-gray-800" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Working Hours</Label>
                      <Input 
                        value={(user as any)?.workingHours && typeof (user as any).workingHours === 'object' && ((user as any).workingHours.start || (user as any).workingHours.end)
                          ? `${(user as any).workingHours.start || 'N/A'} - ${(user as any).workingHours.end || 'N/A'}` 
                          : "Not specified"
                        } 
                        disabled 
                        className="bg-gray-100 dark:bg-gray-800" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Input value={(user as any)?.isActive ? "Active" : "Inactive"} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <Input 
                        value={(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : "N/A"} 
                        disabled 
                        className="bg-gray-100 dark:bg-gray-800" 
                      />
                    </div>
                  </div>
                  
                  {(!(user as any)?.medicalSpecialtyCategory || !(user as any)?.subSpecialty) && (
                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={() => {
                          const updates: any = {};
                          if (!(user as any)?.medicalSpecialtyCategory && doctorProfile.medicalSpecialtyCategory) {
                            updates.medicalSpecialtyCategory = doctorProfile.medicalSpecialtyCategory;
                          }
                          if (!(user as any)?.subSpecialty && doctorProfile.subSpecialty) {
                            updates.subSpecialty = doctorProfile.subSpecialty;
                          }
                          if (Object.keys(updates).length > 0) {
                            updateDoctorProfileMutation.mutate(updates);
                          }
                        }}
                        disabled={
                          updateDoctorProfileMutation.isPending ||
                          (!doctorProfile.medicalSpecialtyCategory && !doctorProfile.subSpecialty)
                        }
                        data-testid="button-saveDoctorProfile"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateDoctorProfileMutation.isPending ? "Saving..." : "Save Profile"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="gdpr">
                  <Shield className="h-4 w-4 mr-2" />
                  GDPR Compliance
                </TabsTrigger>
                <TabsTrigger value="integrations">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Integrations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
              {/* Organization Settings */}
              <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>Organization Settings</span>
              </CardTitle>
                {!editingOrg && canEditPermission('settings') && (
                  <Button variant="outline" size="sm" onClick={() => setEditingOrg(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {editingOrg ? (
                <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    value={settings.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={settings.brandName}
                    onChange={(e) => handleInputChange('brandName', e.target.value)}
                    placeholder="e.g., MediCore EMR"
                  />
                </div>
              </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingOrg(false);
                        // Reset to original values
                        if (organization) {
                          setSettings({
                            name: organization.name || "",
                            brandName: organization.brandName || "",
                            region: organization.region || "UK",
                            theme: organization.settings?.theme?.primaryColor || "default",
                            logoUrl: organization.settings?.theme?.logoUrl || "",
                            gdprEnabled: organization.settings?.compliance?.gdprEnabled || true,
                            aiEnabled: organization.settings?.features?.aiEnabled || true,
                            billingEnabled: organization.settings?.features?.billingEnabled || true
                          });
                          setHasChanges(false);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleOrgSave} 
                      disabled={updateSettingsMutation.isPending}
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <LoadingSpinner className="h-4 w-4 mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-gray-500 dark:text-gray-400">Organization Name</Label>
                    <p className="text-base font-medium mt-1">{organization?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500 dark:text-gray-400">Brand Name</Label>
                    <p className="text-base font-medium mt-1">{organization?.brandName || "N/A"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stripe Dashboard Access */}
          {organization?.stripeAccountId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Stripe Dashboard Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Access your Stripe Express Dashboard to view payments, payouts, refunds, and manage your account settings.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    The login link is temporary and secure. It will expire after use or within 1 hour.
                  </p>
                </div>
                <StripeDashboardButton organizationId={organization.id} />
              </CardContent>
            </Card>
          )}

          {/* User Details and Change Password in a row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>User Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userDetailsLoading ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : userDetailsError ? (
                  <div className="text-center py-4">
                    <p className="text-red-500 dark:text-red-400 mb-2">
                      Error loading user details: {userDetailsError instanceof Error ? userDetailsError.message : "Unknown error"}
                    </p>
                    {user && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-1">
                        <p><strong>User ID:</strong> {user.id}</p>
                        <p><strong>Organization ID:</strong> {user.organizationId}</p>
                        <p><strong>Email:</strong> {user.email || "N/A"}</p>
                        <p><strong>Role:</strong> {user.role || "N/A"}</p>
                      </div>
                    )}
                  </div>
                ) : currentUserDetails ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">First Name</Label>
                      <p className="text-base font-medium mt-1">{currentUserDetails.firstName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Last Name</Label>
                      <p className="text-base font-medium mt-1">{currentUserDetails.lastName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Username</Label>
                      <p className="text-base font-medium mt-1">{currentUserDetails.username || "N/A"}</p>
                    </div>
                    {(currentUserDetails.role === "doctor" || currentUserDetails.role === "nurse") && (
                      <div>
                        <Label className="text-sm text-gray-500 dark:text-gray-400">Professional Registration ID</Label>
                        <p className="text-base font-medium mt-1">
                          {(currentUserDetails as any).professionalRegistrationId || "N/A"}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Email</Label>
                      <p className="text-base font-medium mt-1">{currentUserDetails.email || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Department</Label>
                      <p className="text-base font-medium mt-1">{currentUserDetails.department || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Role</Label>
                      <p className="text-base font-medium mt-1">
                        <Badge variant="outline">
                          {currentUserDetails.role || "N/A"}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Status</Label>
                      <p className="text-base font-medium mt-1">
                        <Badge variant={currentUserDetails.isActive ? "default" : "secondary"}>
                          {currentUserDetails.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Created At</Label>
                      <p className="text-base font-medium mt-1">
                        {currentUserDetails.createdAt 
                          ? new Date(currentUserDetails.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : "N/A"}
                      </p>
                    </div>
                    {currentUserDetails.medicalSpecialtyCategory && (
                      <div>
                        <Label className="text-sm text-gray-500 dark:text-gray-400">Medical Specialty</Label>
                        <p className="text-base font-medium mt-1">{currentUserDetails.medicalSpecialtyCategory}</p>
                      </div>
                    )}
                    {currentUserDetails.subSpecialty && (
                      <div>
                        <Label className="text-sm text-gray-500 dark:text-gray-400">Sub-Specialty</Label>
                        <p className="text-base font-medium mt-1">{currentUserDetails.subSpecialty}</p>
                      </div>
                    )}
                    {currentUserDetails.lastLoginAt && (
                      <div>
                        <Label className="text-sm text-gray-500 dark:text-gray-400">Last Login</Label>
                        <p className="text-base font-medium mt-1">
                          {new Date(currentUserDetails.lastLoginAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No user details available</p>
                )}
              </CardContent>
            </Card>

            {/* Change Password Section */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, currentPassword: e.target.value });
                        setPasswordErrors({ ...passwordErrors, currentPassword: "" });
                      }}
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-500">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, newPassword: e.target.value });
                        setPasswordErrors({ ...passwordErrors, newPassword: "" });
                      }}
                      placeholder="Enter your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-500">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                        setPasswordErrors({ ...passwordErrors, confirmPassword: "" });
                      }}
                      placeholder="Confirm your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Clinic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Clinic Information</span>
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowViewClinicInfoDialog(true)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Header Footer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="header" className="w-full" value={activeClinicTab} onValueChange={setActiveClinicTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="header" data-testid="tab-header">Header Design & Information</TabsTrigger>
                  <TabsTrigger value="footer" data-testid="tab-footer">Footer Design & Information</TabsTrigger>
                </TabsList>
                
                <TabsContent value="header" className="space-y-6 py-4">
                  {/* Logo and Header Information Section in One Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logo Upload Section */}
                    <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                      <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Clinic Logo
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleClinicLogoChange}
                            className={`flex-1 ${clinicLogoError ? "border border-destructive text-destructive" : ""}`}
                            data-testid="input-clinic-logo"
                            aria-invalid={Boolean(clinicLogoError)}
                          />
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p className="font-semibold text-gray-700 dark:text-gray-200">Recommended logo specs</p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>Dimensions: minimum 200×200, maximum 2000×2000 (square, 1:1 ratio strongly recommended).</li>
                            <li>File size: keep under 1–2&nbsp;MB when possible.</li>
                            <li>Formats: PNG or SVG preferred (transparent background), JPG/JPEG acceptable.</li>
                            <li>Use a high-resolution version—systems usually resize down, but low-res assets may look blurry.</li>
                          </ul>
                        </div>
                        {clinicLogoSuccess && !clinicLogoError && (
                          <div
                            className="rounded-md border border-green-200 bg-green-50 px-3 py-1 mt-1 text-xs font-medium text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200"
                            role="status"
                            aria-live="polite"
                          >
                            {clinicLogoSuccess}
                          </div>
                        )}
                        {clinicLogoError && (
                          <div
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-1 mt-1 text-xs font-medium text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
                            role="alert"
                            aria-live="assertive"
                          >
                            {clinicLogoError}
                          </div>
                        )}
                        
                        {/* Logo Preview Section */}
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[120px] flex items-center justify-center">
                          {clinicLogoPreview ? (
                            <img 
                              src={clinicLogoPreview} 
                              alt="Logo Preview" 
                              className="max-h-[100px] object-contain"
                            />
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500 text-sm italic">logo will preview here</p>
                          )}
                        </div>
                        
                        {clinicLogoPreview && (
                          <div className="mt-4 space-y-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Logo Position:</Label>
                              <div className="flex gap-3">
                                <Button
                                  type="button"
                                  variant={selectedLogoPosition === "left" ? "default" : "outline"}
                                  onClick={() => setSelectedLogoPosition("left")}
                                  className="flex-1"
                                  data-testid="button-logo-position-left"
                                >
                                  Left
                                </Button>
                                <Button
                                  type="button"
                                  variant={selectedLogoPosition === "center" ? "default" : "outline"}
                                  onClick={() => setSelectedLogoPosition("center")}
                                  className="flex-1"
                                  data-testid="button-logo-position-center"
                                >
                                  Center
                                </Button>
                                <Button
                                  type="button"
                                  variant={selectedLogoPosition === "right" ? "default" : "outline"}
                                  onClick={() => setSelectedLogoPosition("right")}
                                  className="flex-1"
                                  data-testid="button-logo-position-right"
                                >
                                  Right
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Header Information Section */}
                    <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                      <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Header Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clinic-name" className="text-sm font-medium">Clinic Name</Label>
                          <Input
                            id="clinic-name"
                            value={clinicHeaderInfo.clinicName}
                            onChange={(e) => setClinicHeaderInfo(prev => ({ ...prev, clinicName: e.target.value }))}
                            placeholder="Enter clinic name"
                            className="mt-1"
                            data-testid="input-clinic-name"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Clinic Name Font Size</Label>
                          <Select
                            value={clinicHeaderInfo.clinicNameFontSize}
                            onValueChange={(value) => setClinicHeaderInfo(prev => ({ ...prev, clinicNameFontSize: value }))}
                          >
                            <SelectTrigger className="mt-1" data-testid="select-clinic-name-font-size">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="16pt">16pt</SelectItem>
                              <SelectItem value="18pt">18pt</SelectItem>
                              <SelectItem value="20pt">20pt</SelectItem>
                              <SelectItem value="22pt">22pt</SelectItem>
                              <SelectItem value="24pt">24pt</SelectItem>
                              <SelectItem value="26pt">26pt</SelectItem>
                              <SelectItem value="28pt">28pt</SelectItem>
                              <SelectItem value="30pt">30pt</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="header-bg-color" className="text-sm font-medium">Background Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="header-bg-color"
                              type="color"
                              value={clinicFooterInfo.backgroundColor}
                              onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, backgroundColor: e.target.value }))}
                              className="w-20 h-10"
                              data-testid="input-header-bg-color"
                            />
                            <Input
                              type="text"
                              value={clinicFooterInfo.backgroundColor}
                              onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, backgroundColor: e.target.value }))}
                              placeholder="#000000"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub Heading Section */}
                  <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                    <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Sub Heading
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-3">
                        <Label htmlFor="clinic-address" className="text-sm font-medium">Address</Label>
                        <Input
                          id="clinic-address"
                          value={clinicHeaderInfo.address}
                          onChange={(e) => setClinicHeaderInfo(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Enter clinic address"
                          className="mt-1"
                          data-testid="input-clinic-address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clinic-phone" className="text-sm font-medium">Phone</Label>
                        <Input
                          id="clinic-phone"
                          value={clinicHeaderInfo.phone}
                          onChange={(e) => setClinicHeaderInfo(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+44 20 1234 5678"
                          className="mt-1"
                          data-testid="input-clinic-phone"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clinic-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="clinic-email"
                          type="email"
                          value={clinicHeaderInfo.email}
                          onChange={(e) => setClinicHeaderInfo(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="info@clinic.com"
                          className="mt-1"
                          data-testid="input-clinic-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clinic-website" className="text-sm font-medium">Website</Label>
                        <Input
                          id="clinic-website"
                          value={clinicHeaderInfo.website}
                          onChange={(e) => setClinicHeaderInfo(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="www.clinic.com"
                          className="mt-1"
                          data-testid="input-clinic-website"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Font Family</Label>
                        <Select
                          value={clinicHeaderInfo.fontFamily}
                          onValueChange={(value) => setClinicHeaderInfo(prev => ({ ...prev, fontFamily: value }))}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-font-family">
                            <SelectValue placeholder="Select font" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="verdana">Verdana</SelectItem>
                            <SelectItem value="arial">Arial</SelectItem>
                            <SelectItem value="calibri">Calibri</SelectItem>
                            <SelectItem value="times">Times New Roman</SelectItem>
                            <SelectItem value="georgia">Georgia</SelectItem>
                            <SelectItem value="courier">Courier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Font Size</Label>
                        <Select
                          value={clinicHeaderInfo.fontSize}
                          onValueChange={(value) => setClinicHeaderInfo(prev => ({ ...prev, fontSize: value }))}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-font-size">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10pt">10pt</SelectItem>
                            <SelectItem value="12pt">12pt</SelectItem>
                            <SelectItem value="14pt">14pt</SelectItem>
                            <SelectItem value="16pt">16pt</SelectItem>
                            <SelectItem value="18pt">18pt</SelectItem>
                            <SelectItem value="20pt">20pt</SelectItem>
                            <SelectItem value="24pt">24pt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Text Styling</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={clinicHeaderInfo.fontWeight === "bold" ? "default" : "outline"}
                            onClick={() => setClinicHeaderInfo(prev => ({ ...prev, fontWeight: prev.fontWeight === "bold" ? "normal" : "bold" }))}
                            className="flex items-center gap-1"
                            data-testid="button-font-bold"
                          >
                            <Bold className="h-4 w-4" />
                            Bold
                          </Button>
                          <Button
                            type="button"
                            variant={clinicHeaderInfo.fontStyle === "italic" ? "default" : "outline"}
                            onClick={() => setClinicHeaderInfo(prev => ({ ...prev, fontStyle: prev.fontStyle === "italic" ? "normal" : "italic" }))}
                            className="flex items-center gap-1"
                            data-testid="button-font-italic"
                          >
                            <Italic className="h-4 w-4" />
                            Italic
                          </Button>
                          <Button
                            type="button"
                            variant={clinicHeaderInfo.textDecoration === "underline" ? "default" : "outline"}
                            onClick={() => setClinicHeaderInfo(prev => ({ ...prev, textDecoration: prev.textDecoration === "underline" ? "none" : "underline" }))}
                            className="flex items-center gap-1"
                            data-testid="button-font-underline"
                          >
                            <Underline className="h-4 w-4" />
                            Underline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Header Preview */}
                  {clinicHeaderInfo.clinicName && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium mb-2 block">Header Preview:</Label>
                      
                      {/* Center Position Preview (default) */}
                      <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                        <p className="text-xs font-semibold mb-2 text-gray-500">Center Position</p>
                        <div style={{ borderBottom: '3px solid ' + clinicFooterInfo.backgroundColor, paddingBottom: '20px' }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "20px" }}>
                            {clinicLogoPreview && (
                              <img 
                                src={clinicLogoPreview} 
                                alt="Clinic Logo - Center" 
                                style={{ maxHeight: "80px", objectFit: "contain" }}
                              />
                            )}
                            <div style={{ textAlign: "center" }}>
                              <h1 style={{ margin: 0, fontSize: clinicHeaderInfo.clinicNameFontSize, fontWeight: "bold", color: clinicFooterInfo.backgroundColor }}>
                                {clinicHeaderInfo.clinicName}
                              </h1>
                              {clinicHeaderInfo.address && (
                                <p style={{ margin: "5px 0", color: "#666", fontFamily: getFontFamilyFromValue(clinicHeaderInfo.fontFamily), fontSize: clinicHeaderInfo.fontSize, fontWeight: clinicHeaderInfo.fontWeight, fontStyle: clinicHeaderInfo.fontStyle, textDecoration: clinicHeaderInfo.textDecoration }}>{clinicHeaderInfo.address}</p>
                              )}
                              {(clinicHeaderInfo.phone || clinicHeaderInfo.email) && (
                                <p style={{ margin: "5px 0", color: "#666", fontFamily: getFontFamilyFromValue(clinicHeaderInfo.fontFamily), fontSize: clinicHeaderInfo.fontSize, fontWeight: clinicHeaderInfo.fontWeight, fontStyle: clinicHeaderInfo.fontStyle, textDecoration: clinicHeaderInfo.textDecoration }}>
                                  {clinicHeaderInfo.phone}
                                  {clinicHeaderInfo.phone && clinicHeaderInfo.email && " • "}
                                  {clinicHeaderInfo.email}
                                </p>
                              )}
                              {clinicHeaderInfo.website && (
                                <p style={{ margin: "5px 0", color: "#666", fontFamily: getFontFamilyFromValue(clinicHeaderInfo.fontFamily), fontSize: clinicHeaderInfo.fontSize, fontWeight: clinicHeaderInfo.fontWeight, fontStyle: clinicHeaderInfo.fontStyle, textDecoration: clinicHeaderInfo.textDecoration }}>{clinicHeaderInfo.website}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      disabled={Boolean(clinicLogoError)}
                      onClick={handleSaveHeader}
                      variant="default"
                      data-testid="button-save-header"
                    >
                      Save Header
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="footer" className="space-y-6 py-4">
                  {/* Footer Information Section */}
                  <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                    <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Footer Design & Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="footer-text" className="text-sm font-medium">Footer Text</Label>
                        <Input
                          id="footer-text"
                          value={clinicFooterInfo.footerText}
                          onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, footerText: e.target.value }))}
                          placeholder="© 2025 Your Clinic. All rights reserved."
                          className="mt-1"
                          data-testid="input-footer-text"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="footer-bg-color" className="text-sm font-medium">Background Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="footer-bg-color"
                              type="color"
                              value={clinicFooterInfo.backgroundColor}
                              onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, backgroundColor: e.target.value }))}
                              className="w-16 h-10"
                              data-testid="input-footer-bg-color"
                            />
                            <Input
                              value={clinicFooterInfo.backgroundColor}
                              onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, backgroundColor: e.target.value }))}
                              placeholder="#4A7DFF"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="footer-text-color" className="text-sm font-medium">Text Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="footer-text-color"
                              type="color"
                              value={clinicFooterInfo.textColor}
                              onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, textColor: e.target.value }))}
                              className="w-16 h-10"
                              data-testid="input-footer-text-color"
                            />
                            <Input
                              value={clinicFooterInfo.textColor}
                              onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, textColor: e.target.value }))}
                              placeholder="#FFFFFF"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Social Media Links */}
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            id="show-social"
                            checked={clinicFooterInfo.showSocial}
                            onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, showSocial: e.target.checked }))}
                            className="w-4 h-4"
                            data-testid="checkbox-show-social"
                          />
                          <Label htmlFor="show-social" className="text-sm font-medium cursor-pointer">
                            Include Social Media Links
                          </Label>
                        </div>
                        
                        {clinicFooterInfo.showSocial && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            <div>
                              <Label htmlFor="facebook" className="text-sm">Facebook</Label>
                              <Input
                                id="facebook"
                                value={clinicFooterInfo.facebook}
                                onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, facebook: e.target.value }))}
                                placeholder="facebook.com/clinic"
                                className="mt-1"
                                data-testid="input-facebook"
                              />
                            </div>
                            <div>
                              <Label htmlFor="twitter" className="text-sm">Twitter</Label>
                              <Input
                                id="twitter"
                                value={clinicFooterInfo.twitter}
                                onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, twitter: e.target.value }))}
                                placeholder="twitter.com/clinic"
                                className="mt-1"
                                data-testid="input-twitter"
                              />
                            </div>
                            <div>
                              <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
                              <Input
                                id="linkedin"
                                value={clinicFooterInfo.linkedin}
                                onChange={(e) => setClinicFooterInfo(prev => ({ ...prev, linkedin: e.target.value }))}
                                placeholder="linkedin.com/company/clinic"
                                className="mt-1"
                                data-testid="input-linkedin"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Preview */}
                      <div className="mt-4">
                        <Label className="text-sm font-medium mb-2 block">Footer Preview:</Label>
                        <div 
                          className="rounded-lg p-6 text-center"
                          style={{ 
                            backgroundColor: clinicFooterInfo.backgroundColor,
                            color: clinicFooterInfo.textColor 
                          }}
                        >
                          <p className="text-sm font-medium">{clinicFooterInfo.footerText || "© 2025 Your Clinic. All rights reserved."}</p>
                          {clinicFooterInfo.showSocial && (clinicFooterInfo.facebook || clinicFooterInfo.twitter || clinicFooterInfo.linkedin) && (
                            <div className="flex justify-center gap-4 mt-3">
                              {clinicFooterInfo.facebook && <span className="text-xs">📘 Facebook</span>}
                              {clinicFooterInfo.twitter && <span className="text-xs">🐦 Twitter</span>}
                              {clinicFooterInfo.linkedin && <span className="text-xs">💼 LinkedIn</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Save Footer Button */}
                      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                        <Button
                          onClick={handleSaveFooter}
                          variant="default"
                          data-testid="button-save-footer"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Footer
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* View Saved Clinic Information Dialog */}
          <Dialog open={showViewClinicInfoDialog} onOpenChange={setShowViewClinicInfoDialog}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[hsl(var(--cura-bluewave))]">Saved Clinic Information</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {(headerLoading || footerLoading) ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--cura-bluewave))] mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading clinic information...</p>
                  </div>
                ) : (
                  <>
                {savedHeader && (
                  <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                    <h4 className="text-md font-semibold mb-4 text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Saved Clinic Header ({savedHeader.logoPosition})
                    </h4>
                    <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                      <div style={{ borderBottom: '3px solid ' + (savedFooter?.backgroundColor || '#4A7DFF'), paddingBottom: '20px' }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: savedHeader.logoPosition === 'center' ? "center" : "flex-start", gap: "20px", flexDirection: savedHeader.logoPosition === 'right' ? "row-reverse" : "row" }}>
                              {savedHeader.logoBase64 && savedHeader.logoBase64.trim() !== "" ? (
                            <img 
                              src={savedHeader.logoBase64} 
                              alt="Clinic Logo" 
                              style={{ maxHeight: "80px", objectFit: "contain" }}
                                  onError={(e) => {
                                    console.error('[SETTINGS] Error loading logo image:', savedHeader.logoBase64?.substring(0, 50));
                                    e.currentTarget.style.display = 'none';
                                  }}
                                  onLoad={() => {
                                    console.log('[SETTINGS] Logo image loaded successfully');
                                  }}
                                />
                              ) : (
                                <div style={{ padding: "10px", color: "#999", fontSize: "12px" }}>
                                  No logo saved
                                </div>
                          )}
                          <div style={{ flex: 1, textAlign: savedHeader.logoPosition === 'center' ? "center" : savedHeader.logoPosition === 'right' ? "right" : "left" }}>
                            <h1 style={{ 
                              margin: 0, 
                              fontSize: savedHeader.clinicNameFontSize || "24pt",
                              fontFamily: getFontFamilyFromValue(savedHeader.fontFamily || 'verdana'),
                              fontWeight: savedHeader.fontWeight || "normal",
                              fontStyle: savedHeader.fontStyle || "normal",
                              textDecoration: savedHeader.textDecoration || "none",
                              color: savedFooter?.backgroundColor || '#4A7DFF' 
                            }}>
                              {savedHeader.clinicName}
                            </h1>
                            {savedHeader.address && (
                              <p style={{ 
                                margin: "5px 0", 
                                fontSize: savedHeader.fontSize || "12pt",
                                fontFamily: getFontFamilyFromValue(savedHeader.fontFamily || 'verdana'),
                                fontWeight: savedHeader.fontWeight || "normal",
                                fontStyle: savedHeader.fontStyle || "normal",
                                textDecoration: savedHeader.textDecoration || "none",
                                color: "#666" 
                              }}>{savedHeader.address}</p>
                            )}
                            {(savedHeader.phone || savedHeader.email) && (
                              <p style={{ 
                                margin: "5px 0", 
                                fontSize: savedHeader.fontSize || "12pt",
                                fontFamily: getFontFamilyFromValue(savedHeader.fontFamily || 'verdana'),
                                fontWeight: savedHeader.fontWeight || "normal",
                                fontStyle: savedHeader.fontStyle || "normal",
                                textDecoration: savedHeader.textDecoration || "none",
                                color: "#666" 
                              }}>
                                {savedHeader.phone}
                                {savedHeader.phone && savedHeader.email && " • "}
                                {savedHeader.email}
                              </p>
                            )}
                            {savedHeader.website && (
                              <p style={{ 
                                margin: "5px 0", 
                                fontSize: savedHeader.fontSize || "12pt",
                                fontFamily: getFontFamilyFromValue(savedHeader.fontFamily || 'verdana'),
                                fontWeight: savedHeader.fontWeight || "normal",
                                fontStyle: savedHeader.fontStyle || "normal",
                                textDecoration: savedHeader.textDecoration || "none",
                                color: "#666" 
                              }}>{savedHeader.website}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                    {savedFooter ? (
                  <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                    <h4 className="text-md font-semibold mb-4 text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Saved Clinic Footer
                    </h4>
                    <div 
                      className="rounded-lg p-6 text-center"
                      style={{ 
                            backgroundColor: savedFooter.backgroundColor || '#4A7DFF',
                            color: savedFooter.textColor || '#FFFFFF' 
                      }}
                    >
                          <p className="text-sm font-medium">{savedFooter.footerText || "No footer text set"}</p>
                      {savedFooter.showSocial && (savedFooter.facebook || savedFooter.twitter || savedFooter.linkedin) && (
                        <div className="flex justify-center gap-4 mt-3">
                          {savedFooter.facebook && <span className="text-xs">📘 Facebook</span>}
                          {savedFooter.twitter && <span className="text-xs">🐦 Twitter</span>}
                          {savedFooter.linkedin && <span className="text-xs">💼 LinkedIn</span>}
                        </div>
                      )}
                    </div>
                  </div>
                    ) : (
                      <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
                        <h4 className="text-md font-semibold mb-4 text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Saved Clinic Footer
                        </h4>
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p className="text-sm">No footer information saved yet.</p>
                          <p className="text-xs mt-2">Please save footer information in the Footer tab.</p>
                        </div>
                      </div>
                )}

                {!savedHeader && !savedFooter && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved clinic information found.</p>
                    <p className="text-sm mt-2">Please create and save header and footer information first.</p>
                  </div>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Header Success Modal */}
          <Dialog open={showHeaderSuccessModal} onOpenChange={setShowHeaderSuccessModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="sr-only">Header Saved Successfully</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Header Saved Successfully
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Your clinic header information has been saved successfully.
                </p>
                <Button
                  onClick={() => setShowHeaderSuccessModal(false)}
                  className="mt-6 w-full"
                  data-testid="button-close-header-success"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Footer Success Modal */}
          <Dialog open={showFooterSuccessModal} onOpenChange={setShowFooterSuccessModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="sr-only">Footer Saved Successfully</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Footer Saved Successfully
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Your clinic footer information has been saved successfully.
                </p>
                <Button
                  onClick={() => setShowFooterSuccessModal(false)}
                  className="mt-6 w-full"
                  data-testid="button-close-footer-success"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Password Change Success Modal */}
          <Dialog open={showPasswordChangeSuccessModal} onOpenChange={setShowPasswordChangeSuccessModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="sr-only">Password Changed Successfully</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Password Changed Successfully
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Password changed successfully. Your new password has been sent to your email with a secure viewing link.
                </p>
                <Button
                  onClick={() => setShowPasswordChangeSuccessModal(false)}
                  className="mt-6 w-full"
                  data-testid="button-close-password-success"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Regional Settings - Hidden */}
          {false && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Regional Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="region">Operating Region</Label>
                  <Select 
                    value={settings.region} 
                    onValueChange={(value) => handleInputChange('region', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-neutral-600 dark:text-gray-400">
                    This determines compliance requirements and data residency rules.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Compliance & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>GDPR Compliance</Label>
                  <p className="text-sm text-neutral-600 dark:text-gray-400">
                    Enable enhanced data protection features required for EU/UK operations.
                  </p>
                </div>
                <Switch
                  checked={settings.gdprEnabled}
                  onCheckedChange={(checked) => handleInputChange('gdprEnabled', checked)}
                />
              </div>
              
              {settings.gdprEnabled && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">GDPR Features Enabled</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <li>• Enhanced audit logging</li>
                    <li>• Data encryption at rest and in transit</li>
                    <li>• Right to be forgotten implementation</li>
                    <li>• Data portability features</li>
                    <li>• Consent management</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feature Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>AI Insights</Label>
                  <p className="text-sm text-neutral-600 dark:text-gray-400">
                    Enable AI-powered medical insights and recommendations.
                  </p>
                </div>
                <Switch
                  checked={settings.aiEnabled}
                  onCheckedChange={(checked) => handleInputChange('aiEnabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Billing Module</Label>
                  <p className="text-sm text-neutral-600 dark:text-gray-400">
                    Enable billing and payment processing features.
                  </p>
                </div>
                <Switch
                  checked={settings.billingEnabled}
                  onCheckedChange={(checked) => handleInputChange('billingEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Theme & Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logo">Organization Logo</Label>
                <div className="flex items-start gap-4">
                  {settings.logoUrl && (
                    <div className="relative">
                      <img 
                        src={settings.logoUrl} 
                        alt="Organization Logo" 
                        className="h-20 w-auto object-contain border rounded-lg p-2"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => handleInputChange('logoUrl', '')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-neutral-600 dark:text-gray-400 mt-2">
                      Upload your organization logo (PNG, JPG, max 2MB). This will appear in the sidebar.
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="theme">Color Theme</Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(value) => handleInputChange('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-600 dark:text-gray-400">
                  Customize the color scheme for your organization's branding.
                </p>
              </div>
            </CardContent>
          </Card>

              {/* Save Button - Only visible if user has edit permissions and not editing org */}
              {canEditPermission('settings') && !editingOrg && hasChanges && (
                <div className="fixed bottom-6 right-6 z-50">
                  <Button 
                    onClick={handleSave}
                    disabled={updateSettingsMutation.isPending}
                    size="lg"
                    className="shadow-lg"
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                        Saving...
                      </>
                    ) : showSaved ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

              <TabsContent value="gdpr">
                <GDPRCompliance />
              </TabsContent>

              <TabsContent value="integrations">
                <IntegrationsPage />
              </TabsContent>

            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function MyProfileContent({ user }: { user: any }) {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});

  const { data: patientData, isLoading: patientLoading } = useQuery({
    queryKey: ["/api/patients", "my-profile"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": tenant?.subdomain || "demo",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/patients", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patient data: ${response.status}`);
      }

      const patients = await response.json();
      console.log("All patients:", patients);
      console.log("Looking for user:", { email: user?.email, id: user?.id });
      
      // Try multiple matching strategies to find patient record
      const myPatient = patients.find((p: any) => 
        p.email === user?.email || // Match by email
        p.userId === user?.id ||   // Match by userId
        p.userId?.toString() === user?.id?.toString() // Match by userId as string
      );
      
      console.log("Found patient:", myPatient);
      return myPatient || null;
    },
    enabled: !!user?.email,
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": tenant?.subdomain || "demo",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patientData.id}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update patient data: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", "my-profile"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (patientData) {
      setFormData({
        firstName: patientData.firstName || "",
        lastName: patientData.lastName || "",
        dateOfBirth: patientData.dateOfBirth || "",
        gender: patientData.genderAtBirth || "",
        phone: patientData.phone || "",
        address: patientData.address?.street || "",
        city: patientData.address?.city || "",
        state: patientData.address?.state || "",
        zipCode: patientData.address?.postcode || "",
        country: patientData.address?.country || "",
        emergencyContactName: patientData.emergencyContact?.name || "",
        emergencyContactPhone: patientData.emergencyContact?.phone || "",
        bloodType: patientData.bloodType || "",
        allergies: patientData.allergies || "",
        insuranceProvider: patientData.insuranceInfo?.provider || "",
        insuranceNumber: patientData.insuranceInfo?.policyNumber || "",
      });
    }
  }, [patientData]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFieldSave = (field: string) => {
    // Handle emergency contact fields specially
    if (field === "emergencyContactName") {
      updatePatientMutation.mutate({
        emergencyContact: {
          ...(patientData?.emergencyContact ?? {}),
          name: formData.emergencyContactName,
        },
      });
    } else if (field === "emergencyContactPhone") {
      updatePatientMutation.mutate({
        emergencyContact: {
          ...(patientData?.emergencyContact ?? {}),
          phone: formData.emergencyContactPhone,
        },
      });
    } else if (field === "address") {
      updatePatientMutation.mutate({
        address: {
          ...(patientData?.address ?? {}),
          street: formData.address,
        },
      });
    } else if (field === "city") {
      updatePatientMutation.mutate({
        address: {
          ...(patientData?.address ?? {}),
          city: formData.city,
        },
      });
    } else if (field === "state") {
      updatePatientMutation.mutate({
        address: {
          ...(patientData?.address ?? {}),
          state: formData.state,
        },
      });
    } else if (field === "zipCode") {
      updatePatientMutation.mutate({
        address: {
          ...(patientData?.address ?? {}),
          postcode: formData.zipCode,
        },
      });
    } else if (field === "country") {
      updatePatientMutation.mutate({
        address: {
          ...(patientData?.address ?? {}),
          country: formData.country,
        },
      });
    } else if (field === "insuranceProvider") {
      updatePatientMutation.mutate({
        insuranceInfo: {
          ...(patientData?.insuranceInfo ?? {}),
          provider: formData.insuranceProvider,
        },
      });
    } else if (field === "insuranceNumber") {
      updatePatientMutation.mutate({
        insuranceInfo: {
          ...(patientData?.insuranceInfo ?? {}),
          policyNumber: formData.insuranceNumber,
        },
      });
    } else if (field === "gender") {
      // Map UI field 'gender' to database column 'genderAtBirth'
      updatePatientMutation.mutate({ genderAtBirth: formData.gender });
    } else {
      updatePatientMutation.mutate({ [field]: formData[field] });
    }
  };

  const canEdit = (field: string) => {
    // Handle emergency contact fields specially
    if (field === "emergencyContactName") {
      return !patientData?.emergencyContact?.name || patientData.emergencyContact.name === "";
    }
    if (field === "emergencyContactPhone") {
      return !patientData?.emergencyContact?.phone || patientData.emergencyContact.phone === "";
    }
    if (field === "address") {
      return !patientData?.address?.street || patientData.address.street === "";
    }
    if (field === "city") {
      return !patientData?.address?.city || patientData.address.city === "";
    }
    if (field === "state") {
      return !patientData?.address?.state || patientData.address.state === "";
    }
    if (field === "zipCode") {
      return !patientData?.address?.postcode || patientData.address.postcode === "";
    }
    if (field === "country") {
      return !patientData?.address?.country || patientData.address.country === "";
    }
    if (field === "insuranceProvider") {
      return !patientData?.insuranceInfo?.provider || patientData.insuranceInfo.provider === "";
    }
    if (field === "insuranceNumber") {
      return !patientData?.insuranceInfo?.policyNumber || patientData.insuranceInfo.policyNumber === "";
    }
    if (field === "gender") {
      // Check database column 'genderAtBirth'
      return !patientData?.genderAtBirth || patientData.genderAtBirth === "";
    }
    return !patientData?.[field] || patientData[field] === "";
  };

  const renderReadOnlyField = (label: string, field: string, type: string = "text") => {
    return (
      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <Input
          id={field}
          type={type}
          value={formData[field] || ""}
          disabled
          className="bg-gray-100 dark:bg-gray-800"
          data-testid={`input-${field}`}
        />
        {formData[field] && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This field is read-only and cannot be edited.
          </p>
        )}
      </div>
    );
  };

  const renderField = (label: string, field: string, type: string = "text") => {
    const isEmpty = canEdit(field);
    const isCurrentlyEditing = isEditing[field];

    return (
      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={field}
            type={type}
            value={formData[field] || ""}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            disabled={!isEmpty && !isCurrentlyEditing}
            className={!isEmpty && !isCurrentlyEditing ? "bg-gray-100 dark:bg-gray-800" : ""}
            data-testid={`input-${field}`}
          />
          {isEmpty && !isCurrentlyEditing && (
            <Button
              size="sm"
              onClick={() => setIsEditing((prev) => ({ ...prev, [field]: true }))}
              data-testid={`button-edit-${field}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {isCurrentlyEditing && (
            <>
              <Button
                size="sm"
                onClick={() => handleFieldSave(field)}
                disabled={updatePatientMutation.isPending}
                data-testid={`button-save-${field}`}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing((prev) => ({ ...prev, [field]: false }));
                  // Handle nested JSONB fields specially
                  if (field === "emergencyContactName") {
                    setFormData((prev: any) => ({ ...prev, emergencyContactName: patientData?.emergencyContact?.name || "" }));
                  } else if (field === "emergencyContactPhone") {
                    setFormData((prev: any) => ({ ...prev, emergencyContactPhone: patientData?.emergencyContact?.phone || "" }));
                  } else if (field === "address") {
                    setFormData((prev: any) => ({ ...prev, address: patientData?.address?.street || "" }));
                  } else if (field === "city") {
                    setFormData((prev: any) => ({ ...prev, city: patientData?.address?.city || "" }));
                  } else if (field === "state") {
                    setFormData((prev: any) => ({ ...prev, state: patientData?.address?.state || "" }));
                  } else if (field === "zipCode") {
                    setFormData((prev: any) => ({ ...prev, zipCode: patientData?.address?.postcode || "" }));
                  } else if (field === "country") {
                    setFormData((prev: any) => ({ ...prev, country: patientData?.address?.country || "" }));
                  } else if (field === "insuranceProvider") {
                    setFormData((prev: any) => ({ ...prev, insuranceProvider: patientData?.insuranceInfo?.provider || "" }));
                  } else if (field === "insuranceNumber") {
                    setFormData((prev: any) => ({ ...prev, insuranceNumber: patientData?.insuranceInfo?.policyNumber || "" }));
                  } else {
                    setFormData((prev: any) => ({ ...prev, [field]: patientData?.[field] || "" }));
                  }
                }}
                data-testid={`button-cancel-${field}`}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
        {!isEmpty && !isCurrentlyEditing && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This field cannot be edited as it already has a value.
          </p>
        )}
      </div>
    );
  };

  const renderSelectField = (label: string, field: string, options: { value: string; label: string }[]) => {
    const isEmpty = canEdit(field);
    const isCurrentlyEditing = isEditing[field];

    return (
      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <div className="flex gap-2">
          <Select
            value={formData[field] || ""}
            onValueChange={(value) => handleFieldChange(field, value)}
            disabled={!isEmpty && !isCurrentlyEditing}
          >
            <SelectTrigger
              className={!isEmpty && !isCurrentlyEditing ? "bg-gray-100 dark:bg-gray-800" : ""}
              data-testid={`select-${field}`}
            >
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEmpty && !isCurrentlyEditing && (
            <Button
              size="sm"
              onClick={() => setIsEditing((prev) => ({ ...prev, [field]: true }))}
              data-testid={`button-edit-${field}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {isCurrentlyEditing && (
            <>
              <Button
                size="sm"
                onClick={() => handleFieldSave(field)}
                disabled={updatePatientMutation.isPending}
                data-testid={`button-save-${field}`}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing((prev) => ({ ...prev, [field]: false }));
                  // Handle nested JSONB fields specially
                  if (field === "gender") {
                    setFormData((prev: any) => ({ ...prev, gender: patientData?.genderAtBirth || "" }));
                  } else if (field === "insuranceProvider") {
                    setFormData((prev: any) => ({ ...prev, insuranceProvider: patientData?.insuranceInfo?.provider || "" }));
                  } else {
                    setFormData((prev: any) => ({ ...prev, [field]: patientData?.[field] || "" }));
                  }
                }}
                data-testid={`button-cancel-${field}`}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
        {!isEmpty && !isCurrentlyEditing && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This field cannot be edited as it already has a value.
          </p>
        )}
      </div>
    );
  };

  if (patientLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner className="h-8 w-8 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!patientData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500 dark:text-gray-400">
            No patient profile found. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("First Name", "firstName")}
            {renderField("Last Name", "lastName")}
            {renderField("Date of Birth", "dateOfBirth", "date")}
            {renderSelectField("Gender", "gender", [
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
              { value: "Prefer not to say", label: "Prefer not to say" }
            ])}
            {renderField("Phone", "phone", "tel")}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
                data-testid="input-email"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Email cannot be changed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Address", "address")}
            {renderField("City", "city")}
            {renderField("State", "state")}
            {renderField("Zip Code", "zipCode")}
            {renderField("Country", "country")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Emergency Contact Name", "emergencyContactName")}
            {renderField("Emergency Contact Phone", "emergencyContactPhone", "tel")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insurance Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSelectField("Insurance Provider", "insuranceProvider", [
              { value: "NHS (National Health Service)", label: "NHS (National Health Service)" },
              { value: "Bupa", label: "Bupa" },
              { value: "AXA PPP Healthcare", label: "AXA PPP Healthcare" },
              { value: "Vitality Health", label: "Vitality Health" },
              { value: "Aviva Health", label: "Aviva Health" },
              { value: "Simply Health", label: "Simply Health" },
              { value: "WPA", label: "WPA" },
              { value: "Benenden Health", label: "Benenden Health" },
              { value: "Healix Health Services", label: "Healix Health Services" },
              { value: "Sovereign Health Care", label: "Sovereign Health Care" },
              { value: "Exeter Friendly Society", label: "Exeter Friendly Society" },
              { value: "Self-Pay", label: "Self-Pay" },
              { value: "Other", label: "Other" }
            ])}
            {renderField("Insurance Number", "insuranceNumber")}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Organization and Users Management Component for Admin
