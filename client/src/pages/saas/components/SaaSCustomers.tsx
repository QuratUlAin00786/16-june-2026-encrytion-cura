import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saasApiRequest } from '@/lib/saasQueryClient';
import { useToast } from '@/hooks/use-toast';
import { getCountryData, getAllCountries, getFilteredCountriesForOrganization, type CountryGroup } from '@/lib/country-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import {
  Search, 
  Building2, 
  Plus, 
  Edit, 
  Eye,
  Users,
  Calendar,
  CreditCard,
  Settings,
  Trash2,
  CheckCircle,
  MoreVertical,
  Pencil,
  Check
} from 'lucide-react';

const formatLocalDateTime = (date: Date) => {
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffsetMs);
  return localDate.toISOString().slice(0, 16);
};

const DELETE_TABLE_LABELS: Record<string, string> = {
  users: "Users",
  patients: "Patients",
  appointments: "Appointments",
  labResults: "Lab Results",
  medicalImages: "Medical Images",
  prescriptions: "Prescriptions",
  notifications: "Notifications",
  subscriptions: "Subscriptions",
  invoices: "Invoices",
  payments: "Payments",
  roles: "Roles",
  staffShifts: "Staff Shifts",
  doctorDefaultShifts: "Doctor Default Shifts",
  symptomChecks: "Symptom Checks",
  organizations: "Organization",
  formResponseValues: "Form Response Values",
  formResponses: "Form Responses",
  formShareLogs: "Form Share Logs",
  formShares: "Form Shares",
  formFields: "Form Fields",
  formSections: "Form Sections",
  forms: "Forms",
  treatments: "Treatments",
  treatmentsInfo: "Treatments Info",
};

const formatDeleteTableLabel = (key: string) => {
  const label = DELETE_TABLE_LABELS[key];
  if (label) return label;
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
};

const ensureFutureOrNow = (value: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return '';
  const now = new Date();
  if (parsed < now) {
    return formatLocalDateTime(now);
  }
  return value;
};

const DEFAULT_ROLE_PERMISSIONS = [
  { role: 'Administrator', detail: 'Full system access with all permissions. Can view, edit, create, and delete across all modules.' },
  { role: 'Doctor', detail: 'Medical doctor with full clinical access. Can view all modules with edit/create permissions for clinical workflows.' },
  { role: 'Nurse', detail: 'Nursing staff with patient care access. Can view all modules with permissions for patient care tasks.' },
  { role: 'Patient', detail: 'Patient with access to own records. Can view all modules with limited edit permissions.' },
  { role: 'Receptionist', detail: 'Front desk staff with appointment management. Can view all modules with appointment and patient management permissions.' },
  { role: 'Lab Technician', detail: 'Laboratory technician with lab results access. Can view all modules with lab-specific permissions.' },
  { role: 'Pharmacist', detail: 'Pharmacist with prescription access. Can view all modules with prescription management permissions.' },
  { role: 'Dentist', detail: 'Dental professional with clinical access. Can view all modules with dental care permissions.' },
  { role: 'Dental Nurse', detail: 'Dental nursing staff with patient care access. Can view all modules with dental care support permissions.' },
  { role: 'Phlebotomist', detail: 'Blood collection specialist. Can view all modules with sample collection permissions.' },
  { role: 'Aesthetician', detail: 'Aesthetic treatment specialist. Can view all modules with aesthetic treatment permissions.' },
  { role: 'Optician', detail: 'Eye care and vision specialist. Can view all modules with vision care permissions.' },
  { role: 'Paramedic', detail: 'Emergency medical services professional. Can view all modules with emergency care permissions.' },
  { role: 'Physiotherapist', detail: 'Physical therapy specialist. Can view all modules with physical therapy permissions.' },
  { role: 'Sample Taker', detail: 'Medical sample collection specialist. Can view all modules with sample collection permissions.' },
  { role: 'Other', detail: 'Generic role for other healthcare professionals. Can view all modules with role-specific permissions.' },
];

export default function SaaSCustomers() {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [createdAdminCredentials, setCreatedAdminCredentials] = useState<{
    email: string;
    tempPassword: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingCountryCustomerId, setEditingCountryCustomerId] = useState<number | null>(null);
  const [countrySearchOpen, setCountrySearchOpen] = useState<Record<number, boolean>>({});
  const [addOrgCountryOpen, setAddOrgCountryOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [deletePreviewData, setDeletePreviewData] = useState<Record<string, number> | null>(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deletePreviewError, setDeletePreviewError] = useState('');
  const [deleteLogs, setDeleteLogs] = useState<string[]>([]);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [isDeleteSuccessModalOpen, setIsDeleteSuccessModalOpen] = useState(false);
  const [subdomainError, setSubdomainError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [countryError, setCountryError] = useState('');
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    brandName: '',
    subdomain: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    accessLevel: 'full', // full, limited
    billingPackageId: '',
    status: 'active',
    paymentStatus: 'paid',
    details: '',
    expiresAt: '',
    country_code: '',
    currency_code: '',
    currency_symbol: '',
    language_code: '',
    features: {
      maxUsers: 10,
      maxPatients: 100,
      aiEnabled: true,
      telemedicineEnabled: true,
      billingEnabled: true,
      analyticsEnabled: true,
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [originalCustomerValues, setOriginalCustomerValues] = useState<any>(null);
  const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
  const [showCountryUpdateSuccessModal, setShowCountryUpdateSuccessModal] = useState(false);
  const [countryUpdateMessage, setCountryUpdateMessage] = useState('');
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  const [isViewCustomerLoading, setIsViewCustomerLoading] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsOverview, setPermissionsOverview] = useState<typeof DEFAULT_ROLE_PERMISSIONS>([]);
  const viewingFeatureConfig = viewingCustomer?.features || {};
  const viewingFeatureFlags = [
    { label: 'AI Features', value: viewingFeatureConfig.aiEnabled },
    { label: 'Telemedicine', value: viewingFeatureConfig.telemedicineEnabled },
    { label: 'Billing Module', value: viewingFeatureConfig.billingEnabled },
    { label: 'Analytics & Reports', value: viewingFeatureConfig.analyticsEnabled },
  ];
  const viewingPackageFeatures = viewingCustomer?.packageFeatures || {};
  const packageFeatureList = [
    `Max users: ${viewingCustomer?.maxUsers ?? viewingPackageFeatures.maxUsers ?? 'N/A'}`,
    `Max patients: ${viewingCustomer?.maxPatients ?? viewingPackageFeatures.maxPatients ?? 'N/A'}`,
    viewingPackageFeatures.aiEnabled ? 'AI Features' : null,
    viewingPackageFeatures.telemedicineEnabled ? 'Telemedicine' : null,
    viewingPackageFeatures.billingEnabled ? 'Billing' : null,
    viewingPackageFeatures.analyticsEnabled ? 'Analytics' : null,
    viewingPackageFeatures.customBranding ? 'Custom Branding' : null,
    viewingPackageFeatures.prioritySupport ? 'Priority Support' : null,
    viewingPackageFeatures.storageGB ? `Storage: ${viewingPackageFeatures.storageGB} GB` : null,
    viewingPackageFeatures.apiCallsPerMonth
      ? `API calls/month: ${viewingPackageFeatures.apiCallsPerMonth}`
      : null,
  ].filter(Boolean) as string[];
  const minExpiresAt = formatLocalDateTime(new Date());
  const formatCurrency = (amount: number, currency: string = 'GBP') =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount);
  const formatDaysActive = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return '—';
    }
    return `${value} day${value === 1 ? '' : 's'}`;
  };
  const handlePermissionsConfirmed = () => {
    setShowPermissionsModal(false);
    setIsSuccessModalOpen(true);
  };

  const renderAdminCredentials = () => {
    if (!createdAdminCredentials) return null;
    return (
      <div className="w-full rounded-lg border border-blue-200 bg-blue-50 p-4 text-left text-sm">
        <p className="font-semibold text-blue-900 mb-2">Admin login credentials</p>
        <p className="text-gray-700">
          <span className="font-medium">Email:</span>{' '}
          {createdAdminCredentials.email}
        </p>
        <p className="text-gray-700 mt-1">
          <span className="font-medium">Temporary password:</span>{' '}
          <code className="rounded bg-white px-2 py-0.5 font-mono text-blue-900">
            {createdAdminCredentials.tempPassword}
          </code>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Share these with the organization admin. The password is stored securely as a hash in the database.
        </p>
      </div>
    );
  };
  const isPopupOpen =
    isAddDialogOpen ||
    isSuccessModalOpen ||
    isErrorModalOpen ||
    showUpdateSuccessModal ||
    showCountryUpdateSuccessModal ||
    isDeleteDialogOpen ||
    isDeleteSuccessModalOpen ||
    Boolean(editingCustomer);

  // Fetch all organizations/customers
  const { data: customers, isLoading, isError, error } = useQuery({
    queryKey: ['/api/saas/customers', searchTerm, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await saasApiRequest('GET', `/api/saas/customers?${params.toString()}`);
      return response.json();
    },
  });

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    setSearchTerm(trimmed);
    setSearchInput(trimmed);
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!searchInput.trim()) {
        setSearchTerm('');
        return;
      }
      setSearchTerm(searchInput.trim());
    }, 350);

    return () => clearTimeout(debounce);
  }, [searchInput]);

  // Handle Stripe onboarding callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeSuccess = params.get('stripe_success');
    const stripeRefresh = params.get('stripe_refresh');
    const organizationId = params.get('organization_id');

    if (stripeSuccess === 'true' || stripeRefresh === 'true') {
      // Remove query parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Invalidate queries to refresh organization data
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });

      if (stripeSuccess === 'true') {
        toast({
          title: "Stripe Onboarding Complete",
          description: organizationId 
            ? `Organization ${organizationId} has completed Stripe onboarding. Please verify the account status.`
            : "Stripe onboarding completed successfully.",
          variant: "default",
        });
      } else if (stripeRefresh === 'true') {
        toast({
          title: "Stripe Onboarding Incomplete",
          description: "The onboarding process was not completed. You can try again by clicking 'Create Stripe'.",
          variant: "default",
        });
      }
    }
  }, [queryClient, toast]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchInput.trim()) return;
    handleSearch();
  };

  // Auto-generate subdomain from organization name and check availability
  useEffect(() => {
    const name = newCustomer.name.trim();
    if (!name) {
      setNewCustomer(prev => ({ ...prev, subdomain: '' }));
      setSubdomainError('');
      return;
    }

    const generatedSubdomain = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/^-+|-+$/g, '');
    
    setNewCustomer(prev => ({ ...prev, subdomain: generatedSubdomain }));

    // Check if subdomain exists via API
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/organizations/check-name?name=${encodeURIComponent(name)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[SAAS-ORGS] Name check error:", errorData);
          setSubdomainError("Unable to verify organization name right now.");
          return;
        }

        const data = await response.json();
        if (data.exists) {
          setSubdomainError(`Title\n"${generatedSubdomain}"\nThis title already exists. Please choose a different organization name.`);
        } else {
          setSubdomainError('');
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("[SAAS-ORGS] Name check failed:", err);
        setSubdomainError("Unable to verify organization name right now.");
      }
    }, 450);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [newCustomer.name]);

  // Check email availability from database (users and organizations tables)
  useEffect(() => {
    const checkEmailAvailability = async () => {
      if (newCustomer.adminEmail) {
        try {
          const response = await saasApiRequest('GET', `/api/saas/customers/check-email?email=${encodeURIComponent(newCustomer.adminEmail)}`);
          const data = await response.json();
          
          if (!data.emailAvailable) {
            setEmailError('Email already exists');
          } else {
            setEmailError('');
          }
        } catch (error) {
          console.error('Error checking email availability:', error);
          setEmailError('');
        }
      } else {
        setEmailError('');
      }
    };

    const timeoutId = setTimeout(checkEmailAvailability, 300);
    return () => clearTimeout(timeoutId);
  }, [newCustomer.adminEmail]);

  // Fetch available billing packages
  const { data: billingPackages } = useQuery({
    queryKey: ['/api/saas/packages'],
  });

  // Check token on component mount and warn if missing
  useEffect(() => {
    const token = localStorage.getItem('saasToken');
    if (!token) {
      console.warn('⚠️ SaaSCustomers: No saasToken found in localStorage. User may need to log in.');
    } else {
      console.log('✅ SaaSCustomers: Token found in localStorage');
    }
  }, []);

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      // Check if token exists before making request
      const token = localStorage.getItem('saasToken');
      console.log('🔑 Token check before API request:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });
      
      if (!token) {
        console.error('❌ No token found in localStorage');
        throw new Error('Authentication required. Please log in again.');
      }
      
      console.log('📤 Sending create customer request with data:', {
        name: customerData.name,
        subdomain: customerData.subdomain,
        country_code: customerData.country_code,
        hasToken: !!token
      });
      
      const response = await saasApiRequest('POST', '/api/saas/customers', customerData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      setIsAddDialogOpen(false);
      // Clear search filter to show new customer
      setSearchTerm('');
      setSelectedStatus('all');
      setSubdomainError('');
      setEmailError('');
      setSelectedPackageDetails(null);
      setNewCustomer({
        name: '', brandName: '', subdomain: '', adminEmail: '', 
        adminFirstName: '', adminLastName: '', accessLevel: 'full', billingPackageId: '',
        status: 'active', paymentStatus: 'paid',
        details: '', expiresAt: '',
        country_code: '', currency_code: '', currency_symbol: '', language_code: '',
        features: {
          maxUsers: 10, maxPatients: 100, aiEnabled: true, 
          telemedicineEnabled: true, billingEnabled: true, analyticsEnabled: true
        }
      });
      // Show success modal with appropriate message
      const credentials = data.adminCredentials || (
        data.adminUser?.tempPassword
          ? {
              email: data.adminUser.email,
              tempPassword: data.adminUser.tempPassword,
              firstName: data.adminUser.firstName,
              lastName: data.adminUser.lastName,
            }
          : null
      );
      setCreatedAdminCredentials(credentials);

      const message = data.emailSent === false
        ? 'Organization created successfully, but the welcome email could not be sent. Share the credentials below with the admin.'
        : credentials
          ? 'Organization created successfully! Login credentials were emailed to the admin and are shown below.'
          : 'Organization created successfully!';
      setSuccessMessage(message);
      setPermissionsOverview(DEFAULT_ROLE_PERMISSIONS);
      setShowPermissionsModal(true);
    },
    onError: (error: any) => {
      let errMsg = error.message || "Failed to create organization";
      
      // Check for authentication errors
      if (errMsg.includes('Authentication required') || errMsg.includes('No token provided') || errMsg.includes('Invalid token')) {
        errMsg = 'Your session has expired. Please log in again.';
        // Clear invalid token
        localStorage.removeItem('saasToken');
        localStorage.removeItem('saas_owner');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
      // Parse JSON error message if present
      try {
        if (errMsg.startsWith('{') && errMsg.includes('"message"')) {
          const parsed = JSON.parse(errMsg);
          errMsg = parsed.message || errMsg;
        }
      } catch (e) {
        // If parsing fails, use the original message
      }
      
      setErrorMessage(errMsg);
      setIsErrorModalOpen(true);
    },
  });

  const handleCreateCustomer = () => {
    // Validate country is selected
    if (!newCustomer.country_code) {
      setCountryError('Please select country');
      toast({
        title: "Validation Error",
        description: "Please select a country",
        variant: "destructive",
      });
      return;
    }
    
    // Clear country error if validation passes
    setCountryError('');

    const normalizedExpiresAt = newCustomer.expiresAt
      ? ensureFutureOrNow(newCustomer.expiresAt)
      : '';
    createCustomerMutation.mutate({
      ...newCustomer,
      expiresAt: normalizedExpiresAt,
    });
  };

  const connectStripeMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await saasApiRequest('POST', `/api/saas/organizations/${organizationId}/connect-stripe`);
      if (!response.ok) {
        const error = await response.json();
        // Preserve the full error object for better error handling
        const errorWithDetails = new Error(error.message || 'Failed to connect Stripe');
        (errorWithDetails as any).details = error;
        throw errorWithDetails;
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      
      // If onboarding URL is provided, redirect to Stripe onboarding
      if (data.onboardingUrl) {
        toast({
          title: "Redirecting to Stripe",
          description: "Please complete the Stripe onboarding process to enable payments.",
          variant: "default",
        });
        // Redirect to Stripe onboarding page
        window.location.href = data.onboardingUrl;
      } else {
        toast({
          title: "Success",
          description: data.message || "Stripe account created successfully",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      const errorDetails = error.details || {};
      let errorMessage = error.message || "Failed to connect Stripe account";
      let errorTitle = "Error";
      
      // Show more helpful message if Stripe Connect is not enabled
      if (errorDetails.error === "Stripe Connect not enabled" || 
          error.message?.includes("Connect") || 
          error.message?.includes("signed up for Connect")) {
        errorTitle = "Stripe Connect Not Enabled";
        errorMessage = errorDetails.message || "Stripe Connect is not enabled. Please enable Stripe Connect in your Stripe Dashboard.";
        
        // Add detailed instructions if available
        if (errorDetails.steps && Array.isArray(errorDetails.steps)) {
          errorMessage += "\n\nSteps to enable:\n" + errorDetails.steps.map((step: string, i: number) => `${i + 1}. ${step}`).join("\n");
        }
        
        // Add help URL if available
        if (errorDetails.helpUrl) {
          errorMessage += `\n\nVisit: ${errorDetails.helpUrl}`;
        }
      }
      
      // Check if organization already has a Stripe account
      if (errorDetails.message?.includes("already has a Stripe account")) {
        errorMessage = errorDetails.message || "Organization already has a Stripe account";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 12000, // Show longer for important errors
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const payload = {
        name: customerData.name,
        brandName: customerData.brandName,
        accessLevel: customerData.accessLevel,
        subscriptionStatus: customerData.subscriptionStatus,
        paymentStatus: customerData.paymentStatus,
        billingPackageId: customerData.billingPackageId,
        details: customerData.details,
        expiresAt: customerData.expiresAt || null,
        country_code: customerData.country_code,
        currency_code: customerData.currency_code,
        currency_symbol: customerData.currency_symbol,
        language_code: customerData.language_code,
        features: customerData.features,
      };
      console.log('📤 Updating customer with data:', payload);
      const response = await saasApiRequest(
        'PATCH',
        `/api/saas/customers/${customerData.id}`,
        payload,
      );
      return response.json();
    },
    onSuccess: async (data, variables) => {
      const org = data?.organization;
      const sub = data?.subscription;

      // Refresh Organizations list immediately
      queryClient.setQueriesData(
        { queryKey: ['/api/saas/customers'] },
        (old: any) => {
          if (!Array.isArray(old) || !org) return old;
          return old.map((row: any) => {
            if (row.id !== org.id) return row;
            const subscriptionStatus = org.subscriptionStatus ?? row.subscriptionStatus;
            const saasStatus = sub?.status ?? subscriptionStatus;
            const expiresAt = sub?.expiresAt ?? row.expiresAt;
            const expiresInFuture =
              expiresAt && new Date(expiresAt) > new Date();
            const computedSubscriptionStatus =
              saasStatus &&
              !['trial', 'active'].includes(String(saasStatus).toLowerCase())
                ? saasStatus
                : expiresAt && !expiresInFuture
                  ? 'expired'
                  : subscriptionStatus;

            return {
              ...row,
              name: org.name ?? row.name,
              brandName: org.brandName ?? row.brandName,
              subscriptionStatus,
              organizationPaymentStatus: org.paymentStatus ?? row.organizationPaymentStatus,
              subscriptionPaymentStatus:
                sub?.paymentStatus ?? row.subscriptionPaymentStatus,
              computedSubscriptionStatus,
              expiresAt,
              packageName: row.packageName,
              billingPackageId: sub?.packageId ?? row.billingPackageId,
            };
          });
        },
      );
      await queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      await queryClient.refetchQueries({ queryKey: ['/api/saas/customers'] });

      // If updating country, show success modal with green tick
      if (variables.country_code) {
        const countryData = getCountryData(variables.country_code);
        const countryName = countryData?.country_name || variables.country_code;
        setCountryUpdateMessage(`Country updated to ${countryName} successfully.`);
        setShowCountryUpdateSuccessModal(true);
      } else {
        // For other updates, show the existing success modal
        const current = editingCustomer;
        const orgName = current?.name || 'organization';
        setUpdateSuccessMessage(`your organization ${orgName} has been updated successfully.`);
        setShowUpdateSuccessModal(true);
      }
      
      // Close the edit dialog after successful update
      setOriginalCustomerValues(null);
      setEditingCustomer(null);
      
      // Dispatch event to notify all components about currency/organization update
      // Use response data (data.organization) to get actual saved currency values from database
      // This ensures we use the currency values that were actually saved, not just what was sent
      const updatedOrg = data?.organization || data;
      const hasCurrencyUpdate = variables.country_code || variables.currency_code || variables.currency_symbol ||
                                updatedOrg?.country_code || updatedOrg?.currency_code || updatedOrg?.currency_symbol;
      
      if (hasCurrencyUpdate) {
        // Use actual organization ID from response, or fallback to variables.id
        const orgId = updatedOrg?.id || variables.id;
        
        // Fetch the organization's subdomain if available (needed for proper currency fetching)
        const orgSubdomain = updatedOrg?.subdomain || null;
        
        // Use currency values from response (actual database values) or fallback to variables
        // Ensure we always have values - if response doesn't have them, use variables
        const currencyCode = updatedOrg?.currency_code || variables.currency_code || null;
        const currencySymbol = updatedOrg?.currency_symbol || variables.currency_symbol || null;
        const countryCode = updatedOrg?.country_code || variables.country_code || null;
        
        // Get country name from country data if country code is available
        let countryName = null;
        if (countryCode) {
          const countryData = getCountryData(countryCode);
          countryName = countryData?.country_name || countryCode;
        }
        
        console.log('🔄 Dispatching currency update event with actual database values...', {
          organizationId: orgId,
          currencyCode,
          currencySymbol,
          countryCode,
          countryName,
          orgSubdomain,
          fromResponse: !!updatedOrg?.currency_code,
          responseData: updatedOrg,
          variables: variables,
          hasCurrencyInResponse: !!(updatedOrg?.currency_code || updatedOrg?.currency_symbol || updatedOrg?.country_code)
        });
        
        // Always dispatch event with organization ID, even if currency values are null
        // The receiving components will fetch fresh data if needed
        const eventData = {
          organizationId: orgId,
          organizationSubdomain: orgSubdomain, // Include subdomain for proper fetching
          countryCode: countryCode,
          countryName: countryName, // Include country name for display
          currencyCode: currencyCode,
          currencySymbol: currencySymbol,
          // Include a flag to indicate currency was updated
          currencyUpdated: true,
          timestamp: Date.now()
        };
        
        // Dispatch window events for same-tab updates
        window.dispatchEvent(new CustomEvent('currency-updated', { 
          detail: eventData
        }));
        window.dispatchEvent(new CustomEvent('organization-updated', { 
          detail: { 
            organizationId: orgId,
            currencyUpdated: true,
            timestamp: Date.now()
          } 
        }));
        
        // Also use localStorage event for cross-tab communication
        // This ensures currency updates work even if user has multiple tabs open
        try {
          const storageData = {
            organizationId: orgId,
            organizationSubdomain: orgSubdomain,
            countryCode: countryCode,
            countryName: countryName,
            currencyCode: currencyCode,
            currencySymbol: currencySymbol,
            currencyUpdated: true,
            timestamp: Date.now()
          };
          
          localStorage.setItem('currency-update-trigger', JSON.stringify(storageData));
          console.log('💾 Currency update saved to localStorage for cross-tab sync:', storageData);
          
          // Note: StorageEvent is only fired in OTHER tabs/windows, not the current one
          // So we manually dispatch it for same-tab listeners
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'currency-update-trigger',
            newValue: JSON.stringify(storageData),
            oldValue: null,
            storageArea: localStorage
          }));
        } catch (err) {
          console.warn('⚠️ Could not set localStorage for currency update:', err);
        }
      }
    },
    onError: (error: any) => {
      console.error('❌ Update customer error:', error);
      let errorMessage = error.message || "Failed to update customer";
      
      // Try to parse JSON error message
      try {
        if (errorMessage.startsWith('{') && errorMessage.includes('"message"')) {
          const parsed = JSON.parse(errorMessage);
          errorMessage = parsed.message || errorMessage;
        }
      } catch (e) {
        // If parsing fails, use the original message
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleViewCustomerDetails = async (customerId: number) => {
    setViewingCustomer(null);
    setIsViewCustomerLoading(true);

    try {
      const response = await saasApiRequest('GET', `/api/saas/customers/${customerId}`);
      const customerDetails = await response.json();
      const normalizedFeatures = parseFeatureConfig(customerDetails.features);

      setViewingCustomer({
        ...customerDetails,
        features: normalizedFeatures || undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load customer details",
        variant: "destructive",
      });
    } finally {
      setIsViewCustomerLoading(false);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ organizationId, status }: { organizationId: number; status: string }) => {
      console.log('Status mutation called with:', { organizationId, status });
      const response = await saasApiRequest('PATCH', '/api/saas/customers/status', { organizationId, status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      toast({
        title: "Customer Status Updated",
        description: "Customer status changed successfully",
      });
    },
    onError: (error: any) => {
      console.error('Status update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer status",
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await saasApiRequest('DELETE', `/api/saas/organizations/${organizationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      toast({
        title: "Customer Deleted",
        description: "Customer and all associated data have been permanently deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const resetDeleteState = () => {
    setDeletePreviewData(null);
    setDeletePreviewError('');
    setDeleteSuccessMessage('');
    setDeleteErrorMessage('');
    setDeleteLogs([]);
    setDeletePreviewLoading(false);
  };

  const fetchDeletePreview = async (organizationId: number) => {
    setDeletePreviewLoading(true);
    setDeletePreviewError('');
    setDeleteLogs([`Fetching delete preview for organization ${organizationId}...`]);

    try {
      const response = await saasApiRequest('GET', `/api/saas/organizations/${organizationId}/delete-preview`);
      const preview = (await response.json()) as Record<string, number>;
      setDeletePreviewData(preview);

      const totalRows = Object.values(preview || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const tableCount = Object.keys(preview || {}).length;
      setDeleteLogs((prev) => [
        ...prev,
        `Preview ready: ${totalRows} rows tracked across ${tableCount} tables.`,
      ]);
    } catch (error: any) {
      const message = error?.message || 'Unable to load delete preview';
      setDeletePreviewError(message);
      setDeleteLogs((prev) => [...prev, `Preview failed: ${message}`]);
    } finally {
      setDeletePreviewLoading(false);
    }
  };

  const handlePrepareDelete = (customer: any) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
    resetDeleteState();
    if (customer?.id) {
      void fetchDeletePreview(customer.id);
    }
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;
    setDeleteErrorMessage('');
    setDeleteSuccessMessage('');
    setDeleteLogs((prev) => [
      ...prev,
      `Confirmed deletion for "${customerToDelete.name || 'organization'}".`,
      'Sending delete request to remove all linked tables...',
    ]);

    deleteCustomerMutation.mutate(customerToDelete.id, {
      onSuccess: (data: { deletedCounts?: Record<string, number> }) => {
        const counts = data?.deletedCounts || {};
        const summaryLines = Object.entries(counts).map(([key, value]) => `• ${formatDeleteTableLabel(key)}: ${value}`);
        const summaryHeader = summaryLines.length
          ? 'Deleted counts (final snapshot):'
          : 'No tracked rows were deleted.';
        setDeleteSuccessMessage('All related table rows have been permanently deleted.');
        setDeleteLogs((prev) => [
          ...prev,
          'Deletion completed successfully.',
          summaryHeader,
          ...summaryLines,
        ]);
        setDeleteErrorMessage('');
        // Close delete dialog and show success modal
        setIsDeleteDialogOpen(false);
        setIsDeleteSuccessModalOpen(true);
      },
      onError: (error: any) => {
        const message = error?.message || 'Failed to delete customer';
        setDeleteLogs((prev) => [...prev, `Deletion failed: ${message}`]);
        setDeleteErrorMessage(message);
      },
    });
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteDialogOpen(false);
    setCustomerToDelete(null);
    resetDeleteState();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'trial': return 'bg-cyan-100 text-cyan-800';
      case 'pending': return 'bg-purple-100 text-purple-800';
      case 'unpaid': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpiryAlertBadge = (level?: string) => {
    if (!level || level === 'none') return null;
    const config: Record<string, { text: string; className: string }> = {
      due_7: { text: '7 days to renew', className: 'bg-yellow-100 text-yellow-800' },
      due_1: { text: 'Renew tomorrow', className: 'bg-amber-100 text-amber-800' },
      expired: { text: 'Expired', className: 'bg-red-100 text-red-800' },
    };
    const badge = config[level] || { text: 'Renewal needed', className: 'bg-purple-100 text-purple-800' };
    return (
      <Badge className={badge.className}>
        {badge.text}
      </Badge>
    );
  };

  const normalizeValue = (value: any) => {
    if (value === undefined || value === null || value === '') {
      return 'Not set';
    }
    return value;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return 'Not set';
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'Not set';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Not set';
    return parsed.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseFeatureConfig = (features: any) => {
    if (!features) return null;
    if (typeof features === 'string') {
      try {
        return JSON.parse(features);
      } catch {
        return null;
      }
    }
    return features;
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span>Organization Management</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {customers?.length || 0} Total Customers
              </Badge>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                  setSubdomainError('');
                  setEmailError('');
                  setCountryError('');
                  setAddOrgCountryOpen(false);
                  setNewCustomer({
                    name: '', brandName: '', subdomain: '', adminEmail: '', 
                    adminFirstName: '', adminLastName: '', accessLevel: 'full', billingPackageId: '',
                    status: 'active', paymentStatus: 'paid',
                    details: '', expiresAt: '',
                    country_code: '', currency_code: '', currency_symbol: '', language_code: '',
                    features: {
                      maxUsers: 10, maxPatients: 100, aiEnabled: true, 
                      telemedicineEnabled: true, billingEnabled: true, analyticsEnabled: true
                    }
                  });
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Organization</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto z-[9999]">
                  <DialogHeader>
                    <DialogTitle>Add New Customer Organization</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Organization Details */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-700">Organization Details</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="name">Organization Name *</Label>
                          <Input 
                            id="name" 
                            placeholder="e.g., Metro Medical Center" 
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                            aria-invalid={Boolean(subdomainError)}
                          />
                          {subdomainError && (
                            <p className="text-xs text-red-600 mt-2 whitespace-pre-line font-medium">
                              {subdomainError}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="brandName">Brand Name</Label>
                          <Input 
                            id="brandName" 
                            placeholder="e.g., Metro Health" 
                            value={newCustomer.brandName}
                            onChange={(e) => setNewCustomer({...newCustomer, brandName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="country">Country *</Label>
                        <Popover open={addOrgCountryOpen} onOpenChange={setAddOrgCountryOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${countryError ? 'border-red-500' : ''}`}
                            >
                              {newCustomer.country_code ? (
                                <span>
                                  {getCountryData(newCustomer.country_code)?.country_name || newCustomer.country_code}
                                </span>
                              ) : (
                                <span className="text-gray-400">Select country</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0 z-[10000]" align="start">
                            <Command>
                              <CommandInput placeholder="Search country..." className="h-9" />
                              <CommandList className="max-h-[400px] overflow-y-auto">
                                <CommandEmpty>No country found.</CommandEmpty>
                                {getFilteredCountriesForOrganization().map((group: CountryGroup, groupIndex: number) => (
                                  <CommandGroup key={group.label} heading={group.label}>
                                    {group.countries.map((country) => (
                                      <CommandItem
                                        key={country.country_code}
                                        value={`${country.country_name} ${country.country_code}`}
                                        onSelect={() => {
                                          setCountryError(''); // Clear error when country is selected
                                          const countryData = getCountryData(country.country_code);
                                          if (countryData) {
                                            setNewCustomer({
                                              ...newCustomer,
                                              country_code: countryData.country_code,
                                              currency_code: countryData.currency_code,
                                              currency_symbol: countryData.currency_symbol,
                                              language_code: countryData.language_code,
                                            });
                                            setAddOrgCountryOpen(false); // Close popover after selection
                                          }
                                        }}
                                      >
                                        <div className="flex flex-col w-full">
                                          <span className="font-medium">{country.country_name}</span>
                                          <span className="text-xs text-gray-500">
                                            {country.currency_symbol} ({country.currency_code}) • {country.language_name || country.language_code}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                    {groupIndex < getFilteredCountriesForOrganization().length - 1 && <CommandSeparator />}
                                  </CommandGroup>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {countryError && (
                          <p className="text-xs text-red-600 mt-1 font-medium">
                            {countryError}
                          </p>
                        )}
                        {newCustomer.country_code && (() => {
                          const countryData = getCountryData(newCustomer.country_code);
                          return (
                            <div className="mt-2 space-y-1">
                              <Label className="text-sm font-medium text-green-600 dark:text-green-400">
                                Currency: {newCustomer.currency_symbol} ({newCustomer.currency_code})
                              </Label>
                              <Label className="text-sm font-medium text-green-600 dark:text-green-400 block">
                                Language: {countryData?.language_name || newCustomer.language_code}
                              </Label>
                            </div>
                          );
                        })()}
                      </div>
                      {newCustomer.subdomain && (
                        <div>
                          <Label>Title</Label>
                          <div className="mt-1.5 p-2 bg-gray-50 border border-gray-200 rounded-md">
                            <code className="text-sm font-medium text-gray-800">
                              {newCustomer.subdomain}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Admin User Details */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-700">Administrator Account</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="adminFirstName">First Name *</Label>
                          <Input 
                            id="adminFirstName" 
                            placeholder="John" 
                            value={newCustomer.adminFirstName}
                            onChange={(e) => setNewCustomer({...newCustomer, adminFirstName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="adminLastName">Last Name *</Label>
                          <Input 
                            id="adminLastName" 
                            placeholder="Smith" 
                            value={newCustomer.adminLastName}
                            onChange={(e) => setNewCustomer({...newCustomer, adminLastName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="adminEmail">Email *</Label>
                          <Input 
                            id="adminEmail" 
                            type="email" 
                            placeholder="admin@example.com" 
                            value={newCustomer.adminEmail}
                            onChange={(e) => setNewCustomer({...newCustomer, adminEmail: e.target.value})}
                          />
                          {emailError && (
                            <p className="text-xs text-red-600 mt-1 font-medium">
                              {emailError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subscription Section */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-700">Subscription</h3>
                      
                      <div>
                        <Label>Billing Package</Label>
                        <select 
                          className="w-full px-3 py-2 border rounded"
                          value={newCustomer.billingPackageId}
                          onChange={(e) => {
                            const selectedPackageId = e.target.value;
                            const selectedPackage = Array.isArray(billingPackages) 
                              ? billingPackages.find((pkg: any) => pkg.id.toString() === selectedPackageId)
                              : null;
                            
                            // Store selected package details
                            setSelectedPackageDetails(selectedPackage || null);
                            
                            // Calculate expiration date based on billing cycle
                            let expiresAt = '';
                            let details = '';
                            
                            if (selectedPackage && selectedPackage.billingCycle) {
                              const now = new Date();
                              const billingCycle = selectedPackage.billingCycle.toLowerCase();
                              
                              if (billingCycle === 'monthly') {
                                // Add 1 month for monthly
                                const expiryDate = new Date(now);
                                expiryDate.setMonth(expiryDate.getMonth() + 1);
                                expiresAt = formatLocalDateTime(expiryDate);
                              } else if (billingCycle === 'yearly' || billingCycle === 'annual') {
                                // Add 12 months (1 year) for yearly
                                const expiryDate = new Date(now);
                                expiryDate.setMonth(expiryDate.getMonth() + 12);
                                expiresAt = formatLocalDateTime(expiryDate);
                              } else {
                                // Default to 1 month for unknown cycles
                                const expiryDate = new Date(now);
                                expiryDate.setMonth(expiryDate.getMonth() + 1);
                                expiresAt = formatLocalDateTime(expiryDate);
                              }
                              
                              // Auto-populate details based on package
                              const detailsParts: string[] = [];
                              
                              // Add package name and billing cycle
                              detailsParts.push(`${selectedPackage.name} - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} subscription`);
                              
                              // Add description if available
                              if (selectedPackage.description) {
                                detailsParts.push(selectedPackage.description);
                              }
                              
                              // Add key features summary
                              if (selectedPackage.features) {
                                const featureList: string[] = [];
                                if (selectedPackage.features.maxUsers) {
                                  featureList.push(`${selectedPackage.features.maxUsers} users`);
                                }
                                if (selectedPackage.features.maxPatients) {
                                  featureList.push(`${selectedPackage.features.maxPatients} patients`);
                                }
                                if (selectedPackage.features.aiEnabled) {
                                  featureList.push('AI Features');
                                }
                                if (selectedPackage.features.telemedicineEnabled) {
                                  featureList.push('Telemedicine');
                                }
                                if (selectedPackage.features.billingEnabled) {
                                  featureList.push('Billing');
                                }
                                if (selectedPackage.features.analyticsEnabled) {
                                  featureList.push('Analytics');
                                }
                                
                                if (featureList.length > 0) {
                                  detailsParts.push(`Includes: ${featureList.join(', ')}`);
                                }
                              }
                              
                              details = detailsParts.join('. ');
                            } else if (!selectedPackageId) {
                              // If package is cleared, don't auto-update expiresAt or details (let user keep their values)
                              expiresAt = newCustomer.expiresAt;
                              details = newCustomer.details;
                            }
                            
                            // If Trial package is selected, automatically set payment status to "trial"
                            // If NOT Trial package, set payment status to "paid" (if it was "trial")
                            const updatedCustomer: any = { 
                              ...newCustomer, 
                              billingPackageId: selectedPackageId,
                              expiresAt: expiresAt || newCustomer.expiresAt,
                              details: details || newCustomer.details
                            };
                            if (selectedPackage && selectedPackage.name.toLowerCase() === 'trial') {
                              updatedCustomer.paymentStatus = 'trial';
                            } else if (newCustomer.paymentStatus === 'trial') {
                              // If switching away from Trial package and payment status was "trial", change to "paid"
                              updatedCustomer.paymentStatus = 'paid';
                            }
                            
                            setNewCustomer(updatedCustomer);
                          }}
                        >
                          <option value="">Select a billing package (optional)</option>
                          {Array.isArray(billingPackages) && billingPackages.map((pkg: any) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} - {newCustomer.currency_symbol || '£'}{pkg.price}/{pkg.billingCycle}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty for trial customers or manual billing setup
                        </p>
                        
                        {/* Display package details when a package is selected */}
                        {selectedPackageDetails && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-semibold text-gray-700">
                                  {selectedPackageDetails.name}
                                </span>
                                {selectedPackageDetails.price && (
                                  <span className="text-sm text-gray-600 ml-2">
                                    - {newCustomer.currency_symbol || '£'}{selectedPackageDetails.price}/{selectedPackageDetails.billingCycle}
                                  </span>
                                )}
                              </div>
                              {selectedPackageDetails.description && (
                                <div className="text-xs text-gray-600">
                                  {selectedPackageDetails.description}
                                </div>
                              )}
                              {selectedPackageDetails.features && (
                                <div className="text-xs text-gray-600 mt-2">
                                  <div className="font-medium mb-1">Features:</div>
                                  <ul className="list-disc list-inside space-y-1">
                                    {selectedPackageDetails.features.maxUsers && (
                                      <li>Max Users: {selectedPackageDetails.features.maxUsers}</li>
                                    )}
                                    {selectedPackageDetails.features.maxPatients && (
                                      <li>Max Patients: {selectedPackageDetails.features.maxPatients}</li>
                                    )}
                                    {selectedPackageDetails.features.aiEnabled && (
                                      <li>AI Features Enabled</li>
                                    )}
                                    {selectedPackageDetails.features.telemedicineEnabled && (
                                      <li>Telemedicine Enabled</li>
                                    )}
                                    {selectedPackageDetails.features.billingEnabled && (
                                      <li>Billing Module Enabled</li>
                                    )}
                                    {selectedPackageDetails.features.analyticsEnabled && (
                                      <li>Analytics & Reports Enabled</li>
                                    )}
                                    {selectedPackageDetails.features.customBranding && (
                                      <li>Custom Branding</li>
                                    )}
                                    {selectedPackageDetails.features.prioritySupport && (
                                      <li>Priority Support</li>
                                    )}
                                    {selectedPackageDetails.features.storageGB && (
                                      <li>Storage: {selectedPackageDetails.features.storageGB} GB</li>
                                    )}
                                    {selectedPackageDetails.features.apiCallsPerMonth && (
                                      <li>API Calls: {selectedPackageDetails.features.apiCallsPerMonth}/month</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Subscription Status</Label>
                          <select 
                            className="w-full px-3 py-2 border rounded"
                            value={newCustomer.status}
                            onChange={(e) => setNewCustomer({...newCustomer, status: e.target.value})}
                          >
                            <option value="active">Active</option>
                          </select>
                        </div>

                        <div>
                          <Label>Payment Status</Label>
                          <select 
                            className="w-full px-3 py-2 border rounded"
                            value={newCustomer.paymentStatus}
                            onChange={(e) => setNewCustomer({...newCustomer, paymentStatus: e.target.value})}
                          >
                            {(() => {
                              // Check if selected billing package is "Trial"
                              const selectedPackage = Array.isArray(billingPackages) 
                                ? billingPackages.find((pkg: any) => pkg.id.toString() === newCustomer.billingPackageId)
                                : null;
                              const isTrialPackage = selectedPackage && selectedPackage.name.toLowerCase() === 'trial';
                              
                              // Only show "Trial" option if Trial package is selected
                              return (
                                <>
                                  {isTrialPackage && (
                                    <option value="trial">Trial</option>
                                  )}
                                  <option value="paid">Paid</option>
                                  <option value="unpaid">Unpaid</option>
                                  <option value="failed">Failed</option>
                                  <option value="pending">Pending</option>
                                </>
                              );
                            })()}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Details</Label>
                          <Input
                            type="text"
                            value={newCustomer.details}
                            onChange={(e) => setNewCustomer({...newCustomer, details: e.target.value})}
                            placeholder="Enter subscription details"
                          />
                        </div>

                        <div>
                          <Label>Expires At</Label>
                          <Input
                            type="datetime-local"
                            value={newCustomer.expiresAt}
                            min={minExpiresAt}
                            onChange={(e) => setNewCustomer({...newCustomer, expiresAt: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Access Level */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-700">Access Level</h3>
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="full-access" 
                            name="accessLevel"
                            checked={newCustomer.accessLevel === 'full'}
                            onChange={() => setNewCustomer({...newCustomer, accessLevel: 'full'})}
                          />
                          <Label htmlFor="full-access" className="cursor-pointer">
                            <span className="font-medium">Full Access</span> - Complete access to all EMR features
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="limited-access" 
                            name="accessLevel"
                            checked={newCustomer.accessLevel === 'limited'}
                            onChange={() => setNewCustomer({...newCustomer, accessLevel: 'limited'})}
                          />
                          <Label htmlFor="limited-access" className="cursor-pointer">
                            <span className="font-medium">Limited Access</span> - Restricted feature set with custom controls
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Feature Controls */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-700">Feature Configuration</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="maxUsers">Maximum Users</Label>
                          <Input 
                            id="maxUsers" 
                            type="number" 
                            min="1"
                            value={newCustomer.features.maxUsers}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, maxUsers: parseInt(e.target.value) || 1}
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxPatients">Maximum Patients</Label>
                          <Input 
                            id="maxPatients" 
                            type="number" 
                            min="1"
                            value={newCustomer.features.maxPatients}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, maxPatients: parseInt(e.target.value) || 1}
                            })}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="aiEnabled">AI Features</Label>
                          <input 
                            type="checkbox" 
                            id="aiEnabled"
                            checked={newCustomer.features.aiEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, aiEnabled: e.target.checked}
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="telemedicineEnabled">Telemedicine</Label>
                          <input 
                            type="checkbox" 
                            id="telemedicineEnabled"
                            checked={newCustomer.features.telemedicineEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, telemedicineEnabled: e.target.checked}
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="billingEnabled">Billing Module</Label>
                          <input 
                            type="checkbox" 
                            id="billingEnabled"
                            checked={newCustomer.features.billingEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, billingEnabled: e.target.checked}
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="analyticsEnabled">Analytics & Reports</Label>
                          <input 
                            type="checkbox" 
                            id="analyticsEnabled"
                            checked={newCustomer.features.analyticsEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, analyticsEnabled: e.target.checked}
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setSelectedPackageDetails(null);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateCustomer}
                        disabled={createCustomerMutation.isPending || !newCustomer.name || !newCustomer.subdomain || !newCustomer.adminEmail || !newCustomer.adminFirstName || !newCustomer.adminLastName || !!subdomainError || !!emailError}
                        className="flex-1"
                      >
                        {createCustomerMutation.isPending ? 'Creating...' : 'Create Organization'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2 p-2">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Type name, domain, or email and hit Enter"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8 pr-8 h-9 text-sm"
                />
                {(searchTerm || searchInput) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSearchInput('');
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                    style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5 h-9 px-3 text-sm"
                type="submit"
                disabled={!searchInput.trim()}
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </form>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-9"
            >
              <option value="all">All Statuses</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Customers Table */}
          {isError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Failed to load organizations: {(error as Error)?.message || "Unknown error"}
            </div>
          )}
          <div className="border rounded-lg relative w-full overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-gray-800/90">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-2 py-1.5 text-xs font-semibold whitespace-nowrap">Organization</TableHead>
                    <TableHead className="px-1.5 py-1.5 text-xs font-semibold whitespace-nowrap">Title</TableHead>
                    <TableHead className="px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Country</TableHead>
                    <TableHead className="px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Users</TableHead>
                    <TableHead className="px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="hidden xl:table-cell px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Org Pay</TableHead>
                    <TableHead className="hidden md:table-cell px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Package</TableHead>
                    <TableHead className="hidden 2xl:table-cell px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Start</TableHead>
                    <TableHead className="hidden xl:table-cell px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Expires</TableHead>
                    <TableHead className="hidden lg:table-cell px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Days</TableHead>
                    <TableHead className="px-1 py-1.5 text-xs font-semibold whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers?.map((customer: any) => (
                    <TableRow key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="px-2 py-1.5">
                      <div className="space-y-0.5 min-w-[120px]">
                        <div className="font-medium truncate text-xs">{customer.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{customer.brandName}</div>
                        <div className="hidden lg:block">
                          {customer.adminEmail && (
                            <div className="text-[10px] text-gray-400 truncate">{customer.adminEmail}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-1.5 py-1.5">
                      <code className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded truncate block min-w-[60px]">
                        {customer.subdomain}
                      </code>
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      <div className="min-w-[140px]">
                        <Popover 
                          open={countrySearchOpen[customer.id] || false}
                          onOpenChange={(open: boolean) => {
                            setCountrySearchOpen((prev: Record<number, boolean>) => ({ ...prev, [customer.id]: open }));
                            if (!open) {
                              setEditingCountryCustomerId(null);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs flex-1 truncate">
                              {customer.country_code ? (
                                getCountryData(customer.country_code)?.country_name || customer.country_code
                              ) : (
                                <span className="text-gray-400">Select country</span>
                              )}
                            </span>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => {
                                  setEditingCountryCustomerId(customer.id);
                                  setCountrySearchOpen((prev: Record<number, boolean>) => ({ ...prev, [customer.id]: true }));
                                }}
                              >
                                <Pencil className="h-[3px] w-[3px]" />
                              </Button>
                            </PopoverTrigger>
                          </div>
                          <PopoverContent className="w-[400px] p-0 z-[10000]" align="start">
                            <Command>
                              <CommandInput placeholder="Search country..." className="h-9" />
                              <CommandList className="max-h-[400px] overflow-y-auto">
                                <CommandEmpty>No country found.</CommandEmpty>
                                {getFilteredCountriesForOrganization().map((group: CountryGroup, groupIndex: number) => (
                                  <CommandGroup key={group.label} heading={group.label}>
                                    {group.countries.map((country) => {
                                      const isSelected = customer.country_code === country.country_code;
                                      return (
                                        <CommandItem
                                          key={country.country_code}
                                          value={`${country.country_name} ${country.country_code}`}
                                          onSelect={() => {
                                            const countryData = getCountryData(country.country_code);
                                            if (countryData) {
                                              // Update customer immediately
                                              updateCustomerMutation.mutate({
                                                id: customer.id,
                                                country_code: countryData.country_code,
                                                currency_code: countryData.currency_code,
                                                currency_symbol: countryData.currency_symbol,
                                                language_code: countryData.language_code,
                                              });
                                            }
                                            setCountrySearchOpen((prev: Record<number, boolean>) => ({ ...prev, [customer.id]: false }));
                                          }}
                                          className={isSelected ? "bg-accent" : ""}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                                          />
                                          <div className="flex flex-col w-full">
                                            <span className="font-medium">{country.country_name}</span>
                                            <span className="text-xs text-gray-500">
                                              {country.currency_symbol} ({country.currency_code}) • {country.language_name || country.language_code}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                    {groupIndex < getFilteredCountriesForOrganization().length - 1 && <CommandSeparator />}
                                  </CommandGroup>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {customer.country_code && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            {customer.currency_symbol} ({customer.currency_code}) • {customer.language_code}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      <div className="flex items-center space-x-0.5 min-w-[40px]">
                        <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs">{customer.userCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      <Badge className={`${getStatusBadgeColor(customer.computedSubscriptionStatus || customer.subscriptionStatus)} text-[10px] px-1 py-0 whitespace-nowrap`}>
                        {customer.computedSubscriptionStatus || customer.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell px-1 py-1.5">
                      <Badge className={`${getPaymentBadgeColor(customer.organizationPaymentStatus)} text-[10px] px-1 py-0 whitespace-nowrap`}>
                        {customer.organizationPaymentStatus || 'trial'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-1 py-1.5">
                      <div className="truncate text-[10px] min-w-[80px]" title={customer.packageName || 'No Package'}>
                        {customer.packageName || 'No Package'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell px-1 py-1.5">
                      <div className="truncate text-[10px] min-w-[90px]">
                        {formatDateTime(customer.subscriptionStart)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell px-1 py-1.5">
                      <div className="truncate text-[10px] min-w-[90px]">
                        {formatDateTime(customer.expiresAt)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell px-1 py-1.5">
                      <div className="flex flex-col gap-0.5 min-w-[50px]">
                        <span className="text-[10px]">{formatDaysActive(customer.daysActive)}</span>
                        {getExpiryAlertBadge(customer.expiryAlertLevel)}
                      </div>
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* View Details */}
                          <Dialog
                            onOpenChange={(open) => {
                              if (!open) {
                                setViewingCustomer(null);
                                setIsViewCustomerLoading(false);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                handleViewCustomerDetails(customer.id);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader className="flex items-start justify-between gap-3 flex-shrink-0">
                              <DialogTitle>Customer Details - {customer.name}</DialogTitle>
                              <DialogClose asChild>
                                <button
                                  type="button"
                                  className="text-gray-500 rounded hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                  ✕
                                </button>
                              </DialogClose>
                            </DialogHeader>
                            {isViewCustomerLoading ? (
                              <div className="py-12 flex justify-center">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-dashed border-blue-300 border-t-blue-600" />
                              </div>
                            ) : viewingCustomer ? (
                              <div className="h-[550px] overflow-y-auto pr-2">
                              <div className="space-y-4 text-sm text-gray-700">
                                <section className="space-y-1.5">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">
                                    Organization summary
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs text-gray-500">Name</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.name)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Brand</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.brandName)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Title</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.subdomain)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Created</p>
                                      <p className="font-semibold text-gray-900">{formatDate(viewingCustomer.createdAt)}</p>
                                    </div>
                                  </div>
                                          <div className="flex flex-wrap gap-2">
                                            {[
                                              { label: viewingCustomer.subscriptionStatus, type: 'status' as const },
                                              { label: viewingCustomer.organizationPaymentStatus, type: 'payment' as const },
                                              { label: viewingCustomer.subscriptionPaymentStatus, type: 'payment' as const },
                                              { label: viewingCustomer.paymentStatus, type: 'payment' as const },
                                            ]
                                              .filter((entry) => entry.label)
                                              .reduce((acc: { label: string; type: 'status' | 'payment' }[], entry) => {
                                                const normalized = entry.label.toLowerCase();
                                                if (!acc.some((existing) => existing.label.toLowerCase() === normalized)) {
                                                  acc.push(entry);
                                                }
                                                return acc;
                                              }, [])
                                              .map((entry) => {
                                                const normalized = entry.label.toLowerCase();
                                                const badgeClass =
                                                  entry.type === 'status'
                                                    ? getStatusBadgeColor(normalized)
                                                    : getPaymentBadgeColor(normalized);
                                                return (
                                                  <Badge key={`${entry.type}-${normalized}`} className={badgeClass}>
                                                    {entry.label}
                                                  </Badge>
                                                );
                                              })}
                                          </div>
                                </section>

                                <section className="space-y-2">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">
                                    Subscription & Billing
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs text-gray-500">Package</p>
                                      <p className="font-semibold text-gray-900">
                                        {viewingCustomer.packageName || `Package ID ${viewingCustomer.packageId || 'N/A'}`}
                                      </p>
                                      {(viewingCustomer.packagePrice || viewingCustomer.packageBillingCycle) && (
                                        <p className="text-xs text-gray-500">
                                          {viewingCustomer.packagePrice
                                            ? formatCurrency(parseFloat(String(viewingCustomer.packagePrice)))
                                            : ""}
                                          {viewingCustomer.packageBillingCycle
                                            ? ` / ${viewingCustomer.packageBillingCycle}`
                                            : ""}
                                        </p>
                                      )}
                                      {viewingCustomer.packageDescription && (
                                        <p className="text-xs text-gray-500">{viewingCustomer.packageDescription}</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Payment Status</p>
                                      <p className="font-semibold text-gray-900">
                                        {normalizeValue(viewingCustomer.paymentStatus)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Subscription Payment</p>
                                      <p className="font-semibold text-gray-900">
                                        {normalizeValue(viewingCustomer.subscriptionPaymentStatus)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Details</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.details)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Subscription Start</p>
                                      <p className="font-semibold text-gray-900">
                                        {formatDateTime(viewingCustomer.subscriptionStart)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Expires At</p>
                                      <p className="font-semibold text-gray-900">{formatDateTime(viewingCustomer.expiresAt)}</p>
                                      <p className="text-xs text-gray-500">Includes 7-day grace period</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Days Active</p>
                                      <p className="font-semibold text-gray-900">
                                        {formatDaysActive(viewingCustomer.daysActive)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Days Left</p>
                                      <p className="font-semibold text-gray-900">
                                        {viewingCustomer.daysLeft ?? "—"}
                                      </p>
                                    </div>
                                    {viewingCustomer.expiryAlertLevel && viewingCustomer.expiryAlertLevel !== 'none' && (
                                      <div>
                                        <p className="text-xs text-gray-500">Expiry Alert</p>
                                        {getExpiryAlertBadge(viewingCustomer.expiryAlertLevel)}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs text-gray-500">Last Updated</p>
                                      <p className="font-semibold text-gray-900">{formatDateTime(viewingCustomer.updatedAt)}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-gray-500">Package features</p>
                                      <div className="flex flex-wrap gap-2">
                                        {packageFeatureList.map((feature) => (
                                          <span
                                            key={feature}
                                            className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700"
                                          >
                                            {feature}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </section>

                                <section className="space-y-2">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">
                                    Administrator
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs text-gray-500">First Name</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.adminFirstName)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Last Name</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.adminLastName)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Email</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.adminEmail)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Access Level</p>
                                      <p className="font-semibold text-gray-900">{normalizeValue(viewingCustomer.accessLevel)}</p>
                                    </div>
                                  </div>
                                </section>

                                <section className="space-y-2">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">
                                    Feature configuration
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    {viewingFeatureFlags.map((flag) => (
                                      <div key={flag.label}>
                                        <p className="text-xs text-gray-500">{flag.label}</p>
                                        <p className="font-semibold text-gray-900">
                                          {flag.value ? 'Enabled' : 'Disabled'}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs text-gray-500">Maximum Users</p>
                                      <p className="font-semibold text-gray-900">
                                        {normalizeValue(viewingCustomer.features?.maxUsers)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Maximum Patients</p>
                                      <p className="font-semibold text-gray-900">
                                        {normalizeValue(viewingCustomer.features?.maxPatients)}
                                      </p>
                                    </div>
                                  </div>
                                </section>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-sm text-gray-500 py-6">
                                No customer details available right now.
                              </p>
                            )}
                          </DialogContent>
                        </Dialog>
                          <DropdownMenuSeparator />
                          {/* Edit Customer */}
                          <Dialog open={editingCustomer?.id === customer.id} onOpenChange={(open) => {
                            if (!open) {
                              setEditingCustomer(null);
                              setOriginalCustomerValues(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={async (e) => {
                                e.preventDefault();
                                try {
                                  const response = await saasApiRequest('GET', `/api/saas/customers/${customer.id}`);
                                  const customerDetails = await response.json();
                                  
                                  // Get billingPackageId from either billingPackageId or packageId field
                                  const packageId = customerDetails.billingPackageId || customerDetails.packageId;
                                  
                                  setEditingCustomer({
                                    id: customerDetails.id,
                                    name: customerDetails.name,
                                    brandName: customerDetails.brandName,
                                    subdomain: customerDetails.subdomain,
                                    adminEmail: customerDetails.adminEmail || '',
                                    adminFirstName: customerDetails.adminFirstName || '',
                                    adminLastName: customerDetails.adminLastName || '',
                                    accessLevel: customerDetails.accessLevel || 'full',
                                    subscriptionStatus: customerDetails.subscriptionStatus || 'trial',
                                    paymentStatus: customerDetails.paymentStatus || customerDetails.subscriptionPaymentStatus || 'trial',
                                    organizationPaymentStatus: customerDetails.organizationPaymentStatus || 'trial',
                                    subscriptionPaymentStatus: customerDetails.subscriptionPaymentStatus || customerDetails.paymentStatus || 'trial',
                                    billingPackageId: packageId ? String(packageId) : '',
                                    packageName: customerDetails.packageName || '',
                                    packagePrice: customerDetails.packagePrice || null,
                                    packageBillingCycle: customerDetails.packageBillingCycle || '',
                                    packageDescription: customerDetails.packageDescription || '',
                                    packageFeatures: customerDetails.packageFeatures || customerDetails.features || {},
                                    details: customerDetails.details || '',
                                    expiresAt: customerDetails.expiresAt ? new Date(customerDetails.expiresAt).toISOString().slice(0, 16) : '',
                                    country_code: customerDetails.country_code || '',
                                    currency_code: customerDetails.currency_code || '',
                                    currency_symbol: customerDetails.currency_symbol || '',
                                    language_code: customerDetails.language_code || '',
                                    features: customerDetails.features ? (typeof customerDetails.features === 'string' ? JSON.parse(customerDetails.features) : customerDetails.features) : {
                                      maxUsers: 10,
                                      maxPatients: 100,
                                      aiEnabled: true,
                                      telemedicineEnabled: true,
                                      billingEnabled: true,
                                      analyticsEnabled: true,
                                    }
                                  });
                                  // Get billingPackageId from either billingPackageId or packageId field for original values
                                  const originalPackageId = customerDetails.billingPackageId || customerDetails.packageId;
                                  
                                  setOriginalCustomerValues({
                                    subscriptionStatus: customerDetails.subscriptionStatus || 'trial',
                                    paymentStatus: customerDetails.paymentStatus || customerDetails.subscriptionPaymentStatus || 'trial',
                                    organizationPaymentStatus: customerDetails.organizationPaymentStatus || 'trial',
                                    subscriptionPaymentStatus: customerDetails.subscriptionPaymentStatus || customerDetails.paymentStatus || 'trial',
                                    billingPackageId: originalPackageId ? String(originalPackageId) : '',
                                    details: customerDetails.details || '',
                                    expiresAt: customerDetails.expiresAt ? new Date(customerDetails.expiresAt).toISOString().slice(0, 16) : '',
                                  });
                                } catch (error) {
                                  console.error('Error fetching customer details:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to load customer details",
                                    variant: "destructive",
                                  });
                                }
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto z-[9999]">
                          <DialogHeader>
                            <DialogTitle>Edit Organization - {customer.name}</DialogTitle>
                          </DialogHeader>
                          {editingCustomer && (
                            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                                Current values from the database
                              </p>
                              <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div>
                                  <dt className="text-[11px] text-gray-500">Billing Package</dt>
                                  <dd className="font-semibold">
                                    {editingCustomer.packageName 
                                      ? `${editingCustomer.packageName}${editingCustomer.packagePrice ? ` - ${editingCustomer.currency_symbol || '£'}${editingCustomer.packagePrice}` : ''}${editingCustomer.packageBillingCycle ? `/${editingCustomer.packageBillingCycle}` : ''}`
                                      : 'No package assigned'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] text-gray-500">Organization status</dt>
                                  <dd className="font-semibold">{editingCustomer.subscriptionStatus}</dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] text-gray-500">Org payment status</dt>
                                  <dd className="font-semibold">{editingCustomer.organizationPaymentStatus || 'not set'}</dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] text-gray-500">Subscription payment</dt>
                                  <dd className="font-semibold">{editingCustomer.subscriptionPaymentStatus || 'not set'}</dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] text-gray-500">Details</dt>
                                  <dd className="font-semibold">{editingCustomer.details || 'Not set'}</dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] text-gray-500">Expires at</dt>
                                  <dd className="font-semibold">
                                    {editingCustomer.expiresAt ? new Date(editingCustomer.expiresAt).toLocaleString() : 'Not set'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] text-gray-500">Current max users</dt>
                                  <dd className="font-semibold">{editingCustomer.features?.maxUsers ?? 'Not set'}</dd>
                                </div>
                                <div>
                                  <dt className="text-[11px] text-gray-500">Current max patients</dt>
                                  <dd className="font-semibold">{editingCustomer.features?.maxPatients ?? 'Not set'}</dd>
                                </div>
                              </dl>
                            </div>
                          )}
                            {editingCustomer && (
                              <div className="space-y-4">
                                {/* Organization Details */}
                                <div className="space-y-3">
                                  <h3 className="font-semibold text-sm text-gray-700">Organization Details</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label>Organization Name</Label>
                                      <Input 
                                        value={editingCustomer.name}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                                      />
                                    </div>
                                    <div>
                                      <Label>Brand Name</Label>
                                      <Input 
                                        value={editingCustomer.brandName}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, brandName: e.target.value})}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Title</Label>
                                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                      <code className="text-sm font-medium text-gray-800">
                                        {editingCustomer.subdomain}
                                      </code>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Title cannot be changed after creation</p>
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-country">Country</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className="w-full justify-start text-left font-normal"
                                        >
                                          {editingCustomer.country_code ? (
                                            <span>
                                              {getCountryData(editingCustomer.country_code)?.country_name || editingCustomer.country_code}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">Select country</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[400px] p-0 z-[10000]" align="start">
                                        <Command>
                                          <CommandInput placeholder="Search country..." className="h-9" />
                                          <CommandList className="max-h-[400px] overflow-y-auto">
                                            <CommandEmpty>No country found.</CommandEmpty>
                                            {getFilteredCountriesForOrganization().map((group: CountryGroup, groupIndex: number) => (
                                              <CommandGroup key={group.label} heading={group.label}>
                                                {group.countries.map((country) => {
                                                  const isSelected = editingCustomer.country_code === country.country_code;
                                                  return (
                                                    <CommandItem
                                                      key={country.country_code}
                                                      value={`${country.country_name} ${country.country_code}`}
                                                      onSelect={() => {
                                                        const countryData = getCountryData(country.country_code);
                                                        if (countryData) {
                                                          setEditingCustomer({
                                                            ...editingCustomer,
                                                            country_code: countryData.country_code,
                                                            currency_code: countryData.currency_code,
                                                            currency_symbol: countryData.currency_symbol,
                                                            language_code: countryData.language_code,
                                                          });
                                                        }
                                                      }}
                                                      className={isSelected ? "bg-accent" : ""}
                                                    >
                                                      <Check
                                                        className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                                                      />
                                                      <div className="flex flex-col w-full">
                                                        <span className="font-medium">{country.country_name}</span>
                                                        <span className="text-xs text-gray-500">
                                                          {country.currency_symbol} ({country.currency_code}) • {country.language_name || country.language_code}
                                                        </span>
                                                      </div>
                                                    </CommandItem>
                                                  );
                                                })}
                                                {groupIndex < getFilteredCountriesForOrganization().length - 1 && <CommandSeparator />}
                                              </CommandGroup>
                                            ))}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                    {editingCustomer.country_code && (() => {
                                      const countryData = getCountryData(editingCustomer.country_code);
                                      return (
                                        <div className="mt-2 space-y-1">
                                          <Label className="text-sm font-medium text-green-600 dark:text-green-400">
                                            Currency: {editingCustomer.currency_symbol} ({editingCustomer.currency_code})
                                          </Label>
                                          <Label className="text-sm font-medium text-green-600 dark:text-green-400 block">
                                            Language: {countryData?.language_name || editingCustomer.language_code}
                                          </Label>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Administrator Account */}
                                <div className="space-y-3">
                                  <h3 className="font-semibold text-sm text-gray-700">Administrator Account</h3>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <Label>First Name</Label>
                                      <Input 
                                        value={editingCustomer.adminFirstName}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, adminFirstName: e.target.value})}
                                      />
                                    </div>
                                    <div>
                                      <Label>Last Name</Label>
                                      <Input 
                                        value={editingCustomer.adminLastName}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, adminLastName: e.target.value})}
                                      />
                                    </div>
                                    <div>
                                      <Label>Email</Label>
                                      <Input 
                                        type="email"
                                        value={editingCustomer.adminEmail}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, adminEmail: e.target.value})}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Subscription Section */}
                                <div className="space-y-3">
                                  <h3 className="font-semibold text-sm text-gray-700">Subscription</h3>
                                  
                                  <div>
                                    <Label>Billing Package</Label>
                                    <select 
                                      className="w-full px-3 py-2 border rounded"
                                      value={editingCustomer.billingPackageId || ''}
                                      onChange={(e) => {
                                        const selectedPkgId = e.target.value;
                                        const selectedPkg = Array.isArray(billingPackages) ? billingPackages.find((pkg: any) => String(pkg.id) === selectedPkgId) : null;
                                        
                                        // Calculate expiresAt based on billing cycle
                                        let expiresAt = editingCustomer.expiresAt; // Keep existing value if no package selected
                                        if (selectedPkg && selectedPkg.billingCycle) {
                                          const now = new Date();
                                          const billingCycle = selectedPkg.billingCycle.toLowerCase();
                                          
                                          if (billingCycle === 'monthly') {
                                            // Add 1 month for monthly billing
                                            const expiryDate = new Date(now);
                                            expiryDate.setMonth(expiryDate.getMonth() + 1);
                                            expiresAt = expiryDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
                                          } else if (billingCycle === 'yearly' || billingCycle === 'annual') {
                                            // Add 12 months (1 year) for yearly billing
                                            const expiryDate = new Date(now);
                                            expiryDate.setMonth(expiryDate.getMonth() + 12);
                                            expiresAt = expiryDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
                                          } else {
                                            // Default to 1 month for unknown cycles
                                            const expiryDate = new Date(now);
                                            expiryDate.setMonth(expiryDate.getMonth() + 1);
                                            expiresAt = expiryDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
                                          }
                                        } else if (!selectedPkgId) {
                                          // If package is cleared, keep existing expiresAt value
                                          expiresAt = editingCustomer.expiresAt;
                                        }
                                        
                                        setEditingCustomer({
                                          ...editingCustomer, 
                                          billingPackageId: selectedPkgId,
                                          packageName: selectedPkg?.name || '',
                                          packagePrice: selectedPkg?.price || null,
                                          packageBillingCycle: selectedPkg?.billingCycle || '',
                                          packageDescription: selectedPkg?.description || '',
                                          packageFeatures: selectedPkg?.features || {},
                                          expiresAt: expiresAt,
                                        });
                                      }}
                                    >
                                      <option value="">Select a billing package (optional)</option>
                                      {Array.isArray(billingPackages) && billingPackages.map((pkg: any) => (
                                        <option key={pkg.id} value={String(pkg.id)}>
                                          {pkg.name} - {editingCustomer.currency_symbol || '£'}{pkg.price}/{pkg.billingCycle}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Assign or change billing package for this customer
                                    </p>
                                    
                                    {/* Display selected package details */}
                                    {editingCustomer.billingPackageId && editingCustomer.packageName && (
                                      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                                        <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                          {editingCustomer.packageName} - {editingCustomer.currency_symbol || '£'}{editingCustomer.packagePrice}/{editingCustomer.packageBillingCycle}
                                        </h4>
                                        {editingCustomer.packageDescription && (
                                          <p className="text-xs text-gray-600 mb-3">{editingCustomer.packageDescription}</p>
                                        )}
                                        <p className="text-xs font-medium text-gray-700 mb-2">Features:</p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                          {editingCustomer.packageFeatures?.maxUsers && (
                                            <li>• Max Users: {editingCustomer.packageFeatures.maxUsers}</li>
                                          )}
                                          {editingCustomer.packageFeatures?.maxPatients && (
                                            <li>• Max Patients: {editingCustomer.packageFeatures.maxPatients}</li>
                                          )}
                                          {editingCustomer.packageFeatures?.aiEnabled && (
                                            <li>• AI Features Enabled</li>
                                          )}
                                          {editingCustomer.packageFeatures?.telemedicineEnabled && (
                                            <li>• Telemedicine Enabled</li>
                                          )}
                                          {editingCustomer.packageFeatures?.billingEnabled && (
                                            <li>• Billing Module Enabled</li>
                                          )}
                                          {editingCustomer.packageFeatures?.analyticsEnabled && (
                                            <li>• Analytics & Reports Enabled</li>
                                          )}
                                          {editingCustomer.packageFeatures?.customBranding && (
                                            <li>• Custom Branding</li>
                                          )}
                                          {editingCustomer.packageFeatures?.prioritySupport && (
                                            <li>• Priority Support</li>
                                          )}
                                          {editingCustomer.packageFeatures?.storageGB && (
                                            <li>• Storage: {editingCustomer.packageFeatures.storageGB} GB</li>
                                          )}
                                          {editingCustomer.packageFeatures?.apiCallsPerMonth && (
                                            <li>• API Calls: {editingCustomer.packageFeatures.apiCallsPerMonth}/month</li>
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label>Subscription Status</Label>
                                      <select 
                                        className="w-full px-3 py-2 border rounded"
                                        value={editingCustomer.subscriptionStatus}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, subscriptionStatus: e.target.value})}
                                      >
                                        {(() => {
                                          // Check if selected package is Trial package
                                          const selectedPkg = editingCustomer.billingPackageId && Array.isArray(billingPackages)
                                            ? billingPackages.find((pkg: any) => String(pkg.id) === String(editingCustomer.billingPackageId))
                                            : null;
                                          const isTrialPackage = selectedPkg && 
                                            selectedPkg.name.toLowerCase().includes('trial') &&
                                            (parseFloat(selectedPkg.price || '0') === 0 || selectedPkg.price === '0.00' || selectedPkg.price === 0);
                                          
                                          // If Trial package is selected, only show "Active" option
                                          if (isTrialPackage) {
                                            return <option value="active">Active</option>;
                                          }
                                          
                                          // Otherwise, show all options except Trial
                                          return (
                                            <>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="cancelled">Cancelled</option>
                                            </>
                                          );
                                        })()}
                                      </select>
                                    </div>

                                    <div>
                                      <Label>Payment Status</Label>
                                      <select 
                                        className="w-full px-3 py-2 border rounded"
                                        value={editingCustomer.paymentStatus}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, paymentStatus: e.target.value})}
                                      >
                                        {(() => {
                                          // Check if selected package is Trial package
                                          const selectedPkg = editingCustomer.billingPackageId && Array.isArray(billingPackages)
                                            ? billingPackages.find((pkg: any) => String(pkg.id) === String(editingCustomer.billingPackageId))
                                            : null;
                                          const isTrialPackage = selectedPkg && 
                                            selectedPkg.name.toLowerCase().includes('trial') &&
                                            (parseFloat(selectedPkg.price || '0') === 0 || selectedPkg.price === '0.00' || selectedPkg.price === 0);
                                          
                                          // If Trial package is selected, only show "Trial" option
                                          if (isTrialPackage) {
                                            return <option value="trial">Trial</option>;
                                          }
                                          
                                          // Otherwise, show all options except Trial
                                          return (
                                            <>
                                        <option value="paid">Paid</option>
                                        <option value="unpaid">Unpaid</option>
                                        <option value="failed">Failed</option>
                                        <option value="pending">Pending</option>
                                            </>
                                          );
                                        })()}
                                      </select>
                                    <div className="text-xs text-gray-500 space-y-1 mt-1">
                                      <div>
                                        <span className="font-semibold">Org row:</span>{" "}
                                        {editingCustomer.organizationPaymentStatus || 'trial'}
                                      </div>
                                      <div>
                                        <span className="font-semibold">Subscription row:</span>{" "}
                                        {editingCustomer.subscriptionPaymentStatus || editingCustomer.paymentStatus || 'trial'}
                                      </div>
                                    </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label>Details</Label>
                                      <Input
                                        type="text"
                                        value={editingCustomer.details}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, details: e.target.value})}
                                        placeholder="Enter subscription details"
                                      />
                                    </div>

                                    <div>
                                      <Label>Expires At</Label>
                                      <Input
                                        type="datetime-local"
                                        value={editingCustomer.expiresAt}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, expiresAt: e.target.value})}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Access Level */}
                                <div className="space-y-3">
                                  <h3 className="font-semibold text-sm text-gray-700">Access Level</h3>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center space-x-2">
                                      <input 
                                        type="radio" 
                                        id="edit-full-access" 
                                        name="editAccessLevel"
                                        checked={editingCustomer.accessLevel === 'full'}
                                        onChange={() => setEditingCustomer({...editingCustomer, accessLevel: 'full'})}
                                      />
                                      <Label htmlFor="edit-full-access" className="cursor-pointer">
                                        <span className="font-medium">Full Access</span> - Complete access to all EMR features
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input 
                                        type="radio" 
                                        id="edit-limited-access" 
                                        name="editAccessLevel"
                                        checked={editingCustomer.accessLevel === 'limited'}
                                        onChange={() => setEditingCustomer({...editingCustomer, accessLevel: 'limited'})}
                                      />
                                      <Label htmlFor="edit-limited-access" className="cursor-pointer">
                                        <span className="font-medium">Limited Access</span> - Restricted feature set with custom controls
                                      </Label>
                                    </div>
                                  </div>
                                </div>

                                {/* Feature Configuration */}
                                <div className="space-y-3">
                                  <h3 className="font-semibold text-sm text-gray-700">Feature Configuration</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label>Maximum Users</Label>
                                      <Input 
                                        type="number" 
                                        min="1"
                                        value={editingCustomer.features.maxUsers}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, maxUsers: parseInt(e.target.value) || 1}
                                        })}
                                      />
                                    </div>
                                    <div>
                                      <Label>Maximum Patients</Label>
                                      <Input 
                                        type="number" 
                                        min="1"
                                        value={editingCustomer.features.maxPatients}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, maxPatients: parseInt(e.target.value) || 1}
                                        })}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center justify-between">
                                      <Label>AI Features</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.aiEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, aiEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <Label>Telemedicine</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.telemedicineEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, telemedicineEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <Label>Billing Module</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.billingEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, billingEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <Label>Analytics & Reports</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.analyticsEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, analyticsEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setEditingCustomer(null);
                                      setOriginalCustomerValues(null);
                                    }}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={() => updateCustomerMutation.mutate(editingCustomer)}
                                    disabled={updateCustomerMutation.isPending}
                                    className="flex-1"
                                  >
                                    {updateCustomerMutation.isPending ? 'Updating...' : 'Update Organization'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                          {/* Create Stripe - Show only if organization doesn't have Stripe account */}
                          {!customer.stripeAccountId && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  connectStripeMutation.mutate(customer.id);
                                }}
                                disabled={connectStripeMutation.isPending}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {connectStripeMutation.isPending ? 'Creating...' : 'Create Stripe'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {/* Delete */}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              console.log('🗑️ DELETE button clicked for customer:', customer.id, customer.name);
                              handlePrepareDelete(customer);
                            }}
                            disabled={deleteCustomerMutation.isPending || isPopupOpen}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          {customers?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No customers found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="z-[9999] sm:max-w-md">
          <button
            onClick={() => setIsSuccessModalOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Organization Created Successfully</DialogTitle>
            </DialogHeader>
            {renderAdminCredentials()}
            <p className="text-center text-gray-600">
              {successMessage}
            </p>
            <Button 
              onClick={() => {
                setIsSuccessModalOpen(false);
                setCreatedAdminCredentials(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPermissionsModal} onOpenChange={(open) => {
        if (!open) {
          setShowPermissionsModal(false);
        }
      }}>
        <DialogContent className="w-[550px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assigned Permissions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {renderAdminCredentials()}
            <p className="text-sm text-gray-600">
              Every new organization receives 15 default roles. All roles have view access to all 21 modules (Dashboard, Patients, Appointments, Prescriptions, Lab Results, Imaging, Forms, Messaging, Analytics, Clinical Decision Support, Symptom Checker, Telemedicine, Voice Documentation, Financial Intelligence, Billing, QuickBooks, Inventory, Shift Management, Settings, Subscription/Packages, User Manual). Edit, create, and delete permissions vary by role.
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2">
              {permissionsOverview.map((entry) => (
                <li key={entry.role}>
                  <strong>{entry.role}</strong>: {entry.detail}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button onClick={handlePermissionsConfirmed}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
        <DialogContent className="z-[9999]">
          <DialogHeader>
            <DialogTitle>Customer Creation Failed</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-gray-700">
              {errorMessage}
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setIsErrorModalOpen(false)} variant="destructive">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDeleteModal();
          }
        }}
      >
        <DialogContent className="max-w-3xl space-y-4 z-[9999]">
          <DialogHeader>
            <DialogTitle>Delete Organization & Related Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              This action will purge every linked row for{' '}
              <strong>{customerToDelete?.name || 'the selected organization'}</strong>. Are you sure you want to delete every table row?
            </p>

            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Preview</p>
              {deletePreviewLoading ? (
                <p className="mt-2 text-xs text-gray-500">Loading related table counts...</p>
              ) : deletePreviewError ? (
                <p className="mt-2 text-xs text-red-600">{deletePreviewError}</p>
              ) : deletePreviewData ? (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(deletePreviewData).map(([key, count]) => (
                    <div key={key} className="flex justify-between text-xs font-semibold text-gray-800">
                      <span>{formatDeleteTableLabel(key)}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">No preview data available.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-900/5 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Deletion log</span>
                {deleteCustomerMutation.isPending && <span className="text-emerald-600">Running...</span>}
              </div>
              <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 text-xs font-mono text-slate-700">
                {deleteLogs.length === 0 ? (
                  <li className="text-xs text-slate-500">No activity yet.</li>
                ) : (
                  deleteLogs.map((log, index) => (
                    <li key={`${log}-${index}`}>{log}</li>
                  ))
                )}
              </ul>
            </div>

            {deleteErrorMessage && <p className="text-sm text-red-600">{deleteErrorMessage}</p>}
            {deleteSuccessMessage && <p className="text-sm text-emerald-600">{deleteSuccessMessage}</p>}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCloseDeleteModal}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteSuccessMessage ? 'Close' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                deleteCustomerMutation.isPending ||
                deletePreviewLoading ||
                Boolean(deletePreviewError) ||
                Boolean(deleteSuccessMessage)
              }
            >
              {deleteCustomerMutation.isPending
                ? 'Deleting...'
                : deleteSuccessMessage
                ? 'Deleted'
                : 'Delete Everything'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  <Dialog
    open={showUpdateSuccessModal}
    onOpenChange={(open) => {
      setShowUpdateSuccessModal(open);
      if (!open) {
        setUpdateSuccessMessage('');
      }
    }}
  >
      <DialogContent className="max-w-sm z-[9999]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <span className="text-emerald-600">Organization updated</span>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          {updateSuccessMessage || 'your organization has been updated successfully.'}
        </p>
      </div>
      <div className="pt-4 flex justify-end">
        <Button onClick={() => setShowUpdateSuccessModal(false)}>OK</Button>
      </div>
    </DialogContent>
  </Dialog>

  {/* Country Update Success Modal */}
  <Dialog open={showCountryUpdateSuccessModal} onOpenChange={setShowCountryUpdateSuccessModal}>
    <DialogContent className="max-w-sm z-[9999]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-600">Country Updated</span>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {countryUpdateMessage}
        </p>
      </div>
      <div className="pt-4 flex justify-end">
        <Button onClick={() => setShowCountryUpdateSuccessModal(false)}>OK</Button>
      </div>
    </DialogContent>
  </Dialog>

      {/* Delete Success Modal */}
      <Dialog open={isDeleteSuccessModalOpen} onOpenChange={setIsDeleteSuccessModalOpen}>
        <DialogContent className="z-[9999] sm:max-w-md">
          <button
            onClick={() => setIsDeleteSuccessModalOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Organization Deleted Successfully</DialogTitle>
            </DialogHeader>
            <p className="text-center text-gray-600">
              The organization "{customerToDelete?.name || 'organization'}" and all related data have been permanently deleted.
            </p>
            <Button 
              onClick={() => {
                setIsDeleteSuccessModalOpen(false);
                setCustomerToDelete(null);
                resetDeleteState();
              }}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
</div>
  );
}