import { Header } from "@/components/layout/header";
import { RoleBasedDashboard } from "@/components/dashboards/role-based-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useTenant } from "@/hooks/use-tenant";
import { useCurrency } from "@/hooks/use-currency";
import { useQuery } from "@tanstack/react-query";
import { Globe, LogOut } from "lucide-react";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AccessRestricted } from "@/components/access-restricted";
import { getFirstAccessiblePage } from "@/lib/get-first-accessible-page";
import { Button } from "@/components/ui/button";

// Currency and Country Display Component
// Automatically updates when currency changes in organizations table
function CurrencyCountryDisplay() {
  const { currencySymbol, countryName, _version } = useCurrency();
  // Use state to force re-render when currency changes
  const [displayCurrency, setDisplayCurrency] = useState(currencySymbol);
  const [displayCountry, setDisplayCountry] = useState(countryName);
  
  // Update whenever currency or country changes
  useEffect(() => {
    setDisplayCurrency(currencySymbol);
    setDisplayCountry(countryName);
  }, [currencySymbol, countryName, _version]);
  
  return (
    <div 
      className="hidden sm:flex items-center space-x-1 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-lg"
    >
      <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {displayCurrency}
      </span>
      <span className="text-[10px] uppercase font-bold text-neutral-700 dark:text-neutral-300">
        {displayCountry}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { canView, isLoading: permissionsLoading } = useRolePermissions();
  const { tenant } = useTenant();
  const [, setLocation] = useLocation();

  // Redirect lab_technician and pharmacist roles to their dedicated dashboards
  useEffect(() => {
    if (user?.role === 'lab_technician') {
      const subdomain = getActiveSubdomain();
      setLocation(`/${subdomain}/lab-technician-dashboard`);
    } else if (user?.role === 'pharmacist') {
      const subdomain = getActiveSubdomain();
      setLocation(`/${subdomain}/pharmacy`);
    }
  }, [user, setLocation]);

  // Check if user has permission to view patients
  const canViewPatients = canView('patients');

  // Function to count active patients - only fetch if user has permission
  const { data: activePatients, isLoading: activePatientsLoading, error: patientsError } = useQuery({
    queryKey: ["/api/patients/active"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch only active patients (is_active = true); no limit = server returns all
      const response = await fetch("/api/patients?isActive=true", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        // Handle 403 gracefully - user doesn't have permission
        if (response.status === 403) {
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    },
    enabled: canViewPatients && !permissionsLoading, // Only fetch if user has permission and permissions are loaded
    retry: false,
    staleTime: 0,
  });

  // Get active patient count, default to 0 if no permission or error
  const activePatientCount = canViewPatients && !patientsError && Array.isArray(activePatients)
    ? activePatients.length
    : 0;

  // Fetch latest subscription for admin users (where expire_at is not equal to or past current date)
  const { data: latestSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/subscription", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const subscription = await response.json();
      
      // Filter: Get latest subscription where expire_at is not equal to or past current date
      if (subscription) {
        // If subscription has expiresAt, check if it's in the future
        if (subscription.expiresAt) {
          const expiresAt = new Date(subscription.expiresAt);
          const now = new Date();
          
          // Set time to start of day for date comparison (ignore time component)
          const expiresAtDate = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          // Check if expire_at is in the future (not equal to or past current date)
          // expiresAt must be > current date (not equal to or past)
          if (expiresAtDate.getTime() > nowDate.getTime()) {
            return subscription;
          }
        } else {
          // If no expiresAt, return the subscription (it doesn't expire)
          return subscription;
        }
      }
      
      // Return null if no valid subscription found
      return null;
    },
    enabled: user?.role === 'admin', // Only fetch if user is admin
    retry: false,
    staleTime: 0,
  });

  // Check if user has permission to view dashboard
  // Even for admin, check stored permissions to respect role edits
  // This allows Admin to see access restriction when they edit Admin role permissions
  const hasDashboardAccess = canView('dashboard');
  const hasRedirected = useRef(false);

  // Redirect to first accessible page if dashboard is restricted
  // IMPORTANT: This hook must be called before any conditional returns
  useEffect(() => {
    if (permissionsLoading) return; // Don't redirect while permissions are loading

    if (!hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      const subdomain = getActiveSubdomain();
      const firstAccessiblePage = getFirstAccessiblePage(canView, subdomain, permissionsLoading);

      // Only redirect if there's a different accessible page
      if (firstAccessiblePage !== `/${subdomain}/dashboard`) {
        console.log("🔄 Dashboard access restricted, redirecting to:", firstAccessiblePage);
        setLocation(firstAccessiblePage);
        return;
      }
    }
  }, [hasDashboardAccess, canView, permissionsLoading, setLocation]);

  // Show loading state while permissions are being checked
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access restricted message if user doesn't have permission and no other page is accessible
  if (!hasDashboardAccess) {
    const subdomain = getActiveSubdomain();
    const firstAccessiblePage = getFirstAccessiblePage(canView, subdomain, permissionsLoading);

    // If dashboard is the only option (no other accessible pages), show restriction message
    if (firstAccessiblePage === `/${subdomain}/dashboard`) {
      return <AccessRestricted moduleName="Dashboard" />;
    }

    // Otherwise, show loading while redirecting
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-neutral-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-0 flex flex-col page-zoom-90">
      {/* Top row: Header + Theme Toggle */}
      <div className="flex items-center justify-between mr-5 bg-white dark:bg-card px-2 py-1 rounded">
        <Header
          title="Dashboard"
          subtitle={
            canViewPatients
              ? `Welcome back. Here's your patient overview. Total Active Patients: ${activePatientsLoading ? "..." : activePatientCount
              }`
              : "Welcome back. Here's your overview."
          }
          hideNotificationBell={true}
          hideAiStatus={true}
          hideRegionalSettings={true}
          hideSignOut={true}
        />

        <div className="flex items-center gap-2">
          {/* Currency and Country */}
          <CurrencyCountryDisplay />
          
          {/* AI Status Indicator */}
          {tenant?.settings?.features?.aiEnabled && (
            <div className="hidden md:flex items-center space-x-2 bg-green-50 dark:bg-green-900 px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] uppercase font-bold text-green-700 dark:text-green-200">AI Active</span>
            </div>
          )}

          {/* Regional Settings */}
          <div className="hidden sm:flex items-center space-x-1 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-lg">
            <Globe className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
            <span className="text-[10px] uppercase font-bold text-neutral-700 dark:text-neutral-300">
              {tenant?.region?.substring(0, 2)}/{tenant?.settings?.compliance?.gdprEnabled ? "GDPR" : "Std"}
            </span>
          </div>

          <NotificationBell />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Theme:</span>
          <ThemeToggle />

          {/* Sign out button (replacement) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try { logout(); } catch {}
              window.location.href = "/auth/login";
            }}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        <RoleBasedDashboard />
      </div>
    </div>
  );
}
