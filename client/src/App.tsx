import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/hooks/use-tenant";
import { AuthProvider } from "@/hooks/use-auth";
import { LocaleProvider } from "@/hooks/use-locale";
import { ThemeProvider } from "@/hooks/use-theme";
import { SocketProvider } from "@/components/socket-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { LoadingPage } from "@/components/common/loading-spinner";
import { AIChatWidget } from "@/components/ai-chat-widget";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useEffect, useRef, useState } from "react";
import { PermissionDeniedDialog } from "@/components/ui/permission-denied-dialog";
import { setPermissionDeniedCallback } from "@/lib/permission-error-handler";
import { GlobalIncomingCallBar } from "@/components/telemedicine/GlobalIncomingCallBar";
import { getFirstAccessiblePage } from "@/lib/get-first-accessible-page";
import { useSessionTimeout, SessionTimeoutWarning } from "@/hooks/use-session-timeout";

const curaLogoPath = "/cura-logo.png";

// Pages
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import AiInsights from "@/pages/ai-insights";
import UserManagement from "@/pages/user-management";
import PermissionsReference from "@/pages/permissions-reference";
import StaffProfile from "@/pages/staff-profile";
import Subscription from "@/pages/subscription";
import Settings from "@/pages/settings";
import AccountSettings from "@/pages/account-settings";
import ShiftsPage from "@/pages/shifts";
import CalendarPage from "@/pages/calendar";
import FormsPage from "@/pages/forms";
import FormSharePage from "@/pages/form-share";
import SharedFormPage from "@/pages/form-open";
import MessagingPage from "@/pages/messaging";
import PrescriptionsPage from "@/pages/prescriptions";
import LabResultsPage from "@/pages/lab-results";
import LabTechnicianDashboard from "@/pages/lab-technician-dashboard";
import ImagingPage from "@/pages/imaging";
import BillingPage from "@/pages/billing";
import AnalyticsPage from "@/pages/analytics";
import AutomationPage from "@/pages/automation";
import PatientPortal from "@/pages/patient-portal";
import ClinicalDecisionSupport from "@/pages/clinical-decision-support";
import Telemedicine from "@/pages/telemedicine";
import PopulationHealth from "@/pages/population-health";
import MobileHealth from "@/pages/mobile-health";
import { SaaSPortal } from "@/pages/saas/SaaSPortal";
import VoiceDocumentation from "@/pages/voice-documentation";
import FinancialIntelligence from "@/pages/financial-intelligence";
import EmergencyProtocols from "@/pages/emergency-protocols";
import MedicationGuide from "@/pages/medication-guide";
import PreventionGuidelines from "@/pages/prevention-guidelines";
import ClinicalProcedures from "@/pages/clinical-procedures";
import Inventory from "@/pages/inventory";
import PharmacyDashboard from "@/pages/pharmacy-dashboard";
import PharmacyReports from "@/pages/pharmacy-reports";
import PharmacyInvoices from "@/pages/pharmacy-invoices";
import AiAgent from "@/pages/ai-agent";
import QuickBooks from "@/pages/quickbooks";
import FontTest from "@/pages/font-test";
import TechSpecExport from "@/pages/tech-spec-export";
import SymptomChecker from "@/pages/symptom-checker";
import UserManual from "@/pages/user-manual";
import NotificationsPage from "@/pages/notifications";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Landing Pages
import LandingPage from "@/pages/auth/LoginPage";
import AboutPage from "@/pages/landing/AboutPage";
import FeaturesPage from "@/pages/landing/FeaturesPage";
import PricingPage from "@/pages/landing/PricingPage";
import HelpCentre from "@/pages/landing/HelpCentre";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import CreateTrialPage from "@/pages/create-trial";
import CreateTrialVerifyPage from "@/pages/create-trial-verify";
import CreateTrialSetPasswordPage from "@/pages/create-trial-set-password";

// Public pages (no login required)
import PublicBookAppointmentPage from "@/pages/book-appointment";
import PublicPatientRegisterPage from "@/pages/patient-register";

// Legal Pages
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import TermsOfService from "@/pages/legal/TermsOfService";
import GDPRCompliancePage from "@/pages/legal/GDPRCompliance";
import ChatbotPage from "@/pages/ChatbotPage";
import Press from "@/pages/legal/Press";

// SaaS Administration - removed duplicate import

// Legacy route redirect component
function LegacyRouteRedirect() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Get subdomain ignoring current path (since we're on a legacy path)
    const subdomain = getActiveSubdomain({ ignorePath: true });

    // Preserve full path including dynamic segments and query strings
    const currentPath = window.location.pathname;
    const search = window.location.search;

    if (isAuthenticated) {
      const newPath = `/${subdomain}${currentPath}${search}`;
      console.log(`🔄 Redirecting legacy route ${currentPath} to ${newPath}`);
      setLocation(newPath);
    } else {
      // Redirect unauthenticated users to universal login (no subdomain)
      const loginPath = `/auth/login`;
      console.log(`🔄 Redirecting unauthenticated user to ${loginPath}`);
      setLocation(loginPath);
    }
  }, [isAuthenticated, setLocation]);

  return <LoadingPage />;
}

// Settings tab redirect - redirects old GDPR and Integrations routes to Settings
function SettingsTabRedirect({ params }: { params?: { subdomain?: string } }) {
  const [location, setLocation] = useLocation();
  
  // Capture the original location on first render to determine which tab
  const originalLocation = useRef(location);

  useEffect(() => {
    const subdomain = params?.subdomain || getActiveSubdomain({ ignorePath: true });
    
    // Determine which tab to show based on the original route
    let tab = 'general';
    if (originalLocation.current.includes('/gdpr-compliance')) {
      tab = 'gdpr';
    } else if (originalLocation.current.includes('/integrations')) {
      tab = 'integrations';
    }
    
    const settingsPath = `/${subdomain}/settings?tab=${tab}`;
    console.log(`🔄 Redirecting to Settings page with tab: ${settingsPath}`);
    setLocation(settingsPath);
  }, [setLocation, params]);

  return <LoadingPage />;
}

function ProtectedApp() {
  const [permissionDeniedOpen, setPermissionDeniedOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { canView, isLoading: permissionsLoading } = useRolePermissions();
  
  // Setup session timeout
  const {
    showWarning,
    timeRemaining,
    handleStayLoggedIn,
    handleLogoutNow,
  } = useSessionTimeout();
  
  // Setup global permission denied handler
  useEffect(() => {
    setPermissionDeniedCallback(() => {
      setPermissionDeniedOpen(true);
    });
  }, []);

  // Check if user is trying to access dashboard without permission and redirect
  useEffect(() => {
    if (permissionsLoading || !user) return;

    const subdomain = getActiveSubdomain();
    const isDashboardRoute = location === `/${subdomain}/dashboard` || location === `/${subdomain}`;
    
    if (isDashboardRoute && !canView('dashboard')) {
      // User doesn't have dashboard access, redirect to first accessible page
      const firstAccessiblePage = getFirstAccessiblePage(canView, subdomain, permissionsLoading);
      console.log("🔄 Dashboard access restricted, redirecting to:", firstAccessiblePage);
      setLocation(firstAccessiblePage);
    }
  }, [location, canView, permissionsLoading, user, setLocation]);
  
  // Load and apply theme from organization settings
  const { data: organization } = useQuery({
    queryKey: ["/api/tenant/info"],
    retry: false,
  });

  // Apply theme colors to CSS variables
  const applyTheme = (themeValue: string) => {
    const root = document.documentElement;

    switch (themeValue) {
      case "electric-lilac":
        // Electric Lilac Theme
        root.style.setProperty("--primary", "#7279FB", "important");
        root.style.setProperty("--primary-foreground", "#FFFFFF", "important");
        root.style.setProperty("--ring", "#7279FB", "important");
        root.style.setProperty("--cura-bluewave", "#7279FB", "important");
        root.style.setProperty("--cura-electric-lilac", "#7279FB", "important");
        root.style.setProperty("--cura-mint-drift", "#C073FF", "important");
        root.style.setProperty("--medical-blue", "#7279FB", "important");
        break;
      case "midnight":
        // Midnight Theme
        root.style.setProperty("--primary", "#162B61", "important");
        root.style.setProperty("--primary-foreground", "#FFFFFF", "important");
        root.style.setProperty("--ring", "#162B61", "important");
        root.style.setProperty("--cura-bluewave", "#162B61", "important");
        root.style.setProperty("--cura-electric-lilac", "#2A4082", "important");
        root.style.setProperty("--cura-mint-drift", "#4A6FA5", "important");
        root.style.setProperty("--medical-blue", "#162B61", "important");
        break;
      case "steel":
        // Steel Theme
        root.style.setProperty("--primary", "#9B9EAF", "important");
        root.style.setProperty("--primary-foreground", "#FFFFFF", "important");
        root.style.setProperty("--ring", "#9B9EAF", "important");
        root.style.setProperty("--cura-bluewave", "#9B9EAF", "important");
        root.style.setProperty("--cura-electric-lilac", "#B5B8C7", "important");
        root.style.setProperty("--cura-mint-drift", "#A8ABBA", "important");
        root.style.setProperty("--medical-blue", "#9B9EAF", "important");
        break;
      case "mist":
        // Mist Theme
        root.style.setProperty("--primary", "#E0E1F4", "important");
        root.style.setProperty("--primary-foreground", "#162B61", "important");
        root.style.setProperty("--ring", "#E0E1F4", "important");
        root.style.setProperty("--cura-bluewave", "#E0E1F4", "important");
        root.style.setProperty("--cura-electric-lilac", "#D1D3E8", "important");
        root.style.setProperty("--cura-mint-drift", "#E8E9F6", "important");
        root.style.setProperty("--medical-blue", "#E0E1F4", "important");
        break;
      case "mint-drift":
        // Mint Drift Theme
        root.style.setProperty("--primary", "#6CFFEB", "important");
        root.style.setProperty("--primary-foreground", "#162B61", "important");
        root.style.setProperty("--ring", "#6CFFEB", "important");
        root.style.setProperty("--cura-bluewave", "#6CFFEB", "important");
        root.style.setProperty("--cura-electric-lilac", "#5CFCE6", "important");
        root.style.setProperty("--cura-mint-drift", "#6CFFEB", "important");
        root.style.setProperty("--medical-blue", "#6CFFEB", "important");
        break;
      case "green":
        // Medical Green Theme - Force high specificity
        root.style.setProperty("--primary", "#22C55E", "important");
        root.style.setProperty("--primary-foreground", "#FFFFFF", "important");
        root.style.setProperty("--ring", "#22C55E", "important");
        root.style.setProperty("--cura-bluewave", "#22C55E", "important");
        root.style.setProperty("--cura-electric-lilac", "#10B981", "important");
        root.style.setProperty("--cura-mint-drift", "#34D399", "important");
        root.style.setProperty("--medical-blue", "#22C55E", "important");
        break;
      case "purple":
        // Professional Purple Theme
        root.style.setProperty("--primary", "#7C3AED", "important");
        root.style.setProperty("--primary-foreground", "#FFFFFF", "important");
        root.style.setProperty("--ring", "#7C3AED", "important");
        root.style.setProperty("--cura-bluewave", "#7C3AED", "important");
        root.style.setProperty("--cura-electric-lilac", "#A855F7", "important");
        root.style.setProperty("--cura-mint-drift", "#C084FC", "important");
        root.style.setProperty("--medical-blue", "#7C3AED", "important");
        break;
      case "dark":
        // Dark Mode Theme
        root.style.setProperty("--primary", "#374151", "important");
        root.style.setProperty("--primary-foreground", "#FFFFFF", "important");
        root.style.setProperty("--ring", "#374151", "important");
        root.style.setProperty("--cura-bluewave", "#374151", "important");
        root.style.setProperty("--cura-electric-lilac", "#4B5563", "important");
        root.style.setProperty("--cura-mint-drift", "#6B7280", "important");
        root.style.setProperty("--medical-blue", "#374151", "important");
        break;
      default: // Bluewave (Default)
        root.style.setProperty("--primary", "#4A7DFF", "important");
        root.style.setProperty("--primary-foreground", "#FFFFFF", "important");
        root.style.setProperty("--ring", "#4A7DFF", "important");
        root.style.setProperty("--cura-bluewave", "#4A7DFF", "important");
        root.style.setProperty("--cura-electric-lilac", "#7279FB", "important");
        root.style.setProperty("--cura-mint-drift", "#6CFFEB", "important");
        root.style.setProperty("--medical-blue", "#4A7DFF", "important");
        break;
    }

    // Force a re-render by triggering a style recalculation
    document.body.style.display = "none";
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = "";
  };

  // Apply theme immediately on component mount from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("cura-theme");
    if (savedTheme) {
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme when organization data loads and save to localStorage
  useEffect(() => {
    if (
      organization &&
      typeof organization === "object" &&
      organization !== null &&
      "settings" in organization
    ) {
      const settings = (organization as any).settings;
      if (
        settings &&
        typeof settings === "object" &&
        "theme" in settings &&
        settings.theme &&
        "primaryColor" in settings.theme
      ) {
        const themeColor = settings.theme.primaryColor as string;
        applyTheme(themeColor);
        localStorage.setItem("cura-theme", themeColor);
      }
    }
  }, [organization]);

  return (
    <>
      <GlobalIncomingCallBar />
      <PermissionDeniedDialog 
        open={permissionDeniedOpen} 
        onOpenChange={setPermissionDeniedOpen}
      />
      <SessionTimeoutWarning
        show={showWarning}
        timeRemaining={timeRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogoutNow={handleLogoutNow}
      />
      <div className="flex h-screen bg-neutral-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-y-auto lg:ml-0">
          <Switch>
          {/* Subdomain-prefixed routes */}
          <Route path="/:subdomain" component={Dashboard} />
          <Route path="/:subdomain/dashboard" component={Dashboard} />
          <Route path="/:subdomain/patients" component={Patients} />
          <Route path="/:subdomain/patients/:id" component={Patients} />
          <Route path="/:subdomain/patients/:id/records" component={Patients} />
          <Route path="/:subdomain/calendar" component={CalendarPage} />
          <Route path="/:subdomain/appointments" component={CalendarPage} />
          <Route
            path="/:subdomain/prescriptions"
            component={PrescriptionsPage}
          />
          <Route path="/:subdomain/lab-results" component={LabResultsPage} />
          <Route path="/:subdomain/lab-technician-dashboard" component={LabTechnicianDashboard} />
          <Route path="/:subdomain/imaging" component={ImagingPage} />
          <Route path="/:subdomain/forms/open/:shareId" component={SharedFormPage} />
          <Route path="/:subdomain/forms" component={FormsPage} />
          <Route path="/:subdomain/forms/fill" component={FormSharePage} />
          <Route path="/:subdomain/messaging" component={MessagingPage} />
          <Route path="/:subdomain/notifications" component={NotificationsPage} />
          <Route path="/:subdomain/billing" component={BillingPage} />
          <Route path="/:subdomain/analytics" component={AnalyticsPage} />
          <Route path="/:subdomain/automation" component={AutomationPage} />
          <Route path="/:subdomain/patient-portal" component={PatientPortal} />
          <Route path="/:subdomain/ai-insights" component={AiInsights} />
          <Route
            path="/:subdomain/symptom-checker"
            component={SymptomChecker}
          />
          <Route path="/:subdomain/chatbot" component={ChatbotPage} />
          <Route
            path="/:subdomain/clinical-decision-support"
            component={ClinicalDecisionSupport}
          />
          <Route path="/:subdomain/telemedicine" component={Telemedicine} />
          <Route
            path="/:subdomain/population-health"
            component={PopulationHealth}
          />
          <Route path="/:subdomain/mobile-health" component={MobileHealth} />
          <Route
            path="/:subdomain/voice-documentation"
            component={VoiceDocumentation}
          />
          <Route
            path="/:subdomain/financial-intelligence"
            component={FinancialIntelligence}
          />
          <Route
            path="/:subdomain/emergency-protocols"
            component={EmergencyProtocols}
          />
          <Route
            path="/:subdomain/medication-guide"
            component={MedicationGuide}
          />
          <Route
            path="/:subdomain/prevention-guidelines"
            component={PreventionGuidelines}
          />
          <Route
            path="/:subdomain/clinical-procedures"
            component={ClinicalProcedures}
          />
          <Route path="/:subdomain/inventory" component={Inventory} />
          <Route path="/:subdomain/pharmacy" component={PharmacyDashboard} />
          <Route path="/:subdomain/pharmacy/dashboard" component={PharmacyDashboard} />
          <Route path="/:subdomain/pharmacy/reports" component={PharmacyReports} />
          <Route path="/:subdomain/pharmacy/invoices" component={PharmacyInvoices} />
          <Route
            path="/:subdomain/gdpr-compliance"
            component={SettingsTabRedirect}
          />
          <Route
            path="/:subdomain/integrations"
            component={SettingsTabRedirect}
          />
          <Route path="/:subdomain/ai-agent" component={AiAgent} />
          <Route path="/:subdomain/quickbooks" component={QuickBooks} />
          <Route path="/:subdomain/font-test" component={FontTest} />
          <Route
            path="/:subdomain/tech-spec-export"
            component={TechSpecExport}
          />
          <Route path="/:subdomain/users" component={UserManagement} />
          <Route
            path="/:subdomain/user-management"
            component={UserManagement}
          />
          <Route path="/:subdomain/shifts" component={ShiftsPage} />
          <Route
            path="/:subdomain/permissions-reference"
            component={PermissionsReference}
          />
          <Route path="/:subdomain/staff/:id" component={StaffProfile} />
          <Route path="/:subdomain/subscription" component={Subscription} />
          <Route path="/:subdomain/settings" component={Settings} />
          <Route path="/:subdomain/account-settings" component={AccountSettings} />
          <Route path="/:subdomain/user-manual" component={UserManual} />

          {/* Legacy routes without subdomain - redirect to subdomain-prefixed versions */}
          <Route path="/dashboard" component={LegacyRouteRedirect} />
          <Route path="/patients" component={LegacyRouteRedirect} />
          <Route path="/appointments" component={LegacyRouteRedirect} />
          <Route path="/prescriptions" component={LegacyRouteRedirect} />
          <Route path="/lab-results" component={LegacyRouteRedirect} />
          <Route path="/lab-technician-dashboard" component={LegacyRouteRedirect} />
          <Route path="/imaging" component={LegacyRouteRedirect} />
          <Route path="/forms/fill" component={FormSharePage} />
          <Route path="/forms" component={LegacyRouteRedirect} />
          <Route path="/messaging" component={LegacyRouteRedirect} />
          <Route path="/integrations" component={LegacyRouteRedirect} />
          <Route path="/billing" component={LegacyRouteRedirect} />
          <Route path="/analytics" component={LegacyRouteRedirect} />
          <Route path="/automation" component={LegacyRouteRedirect} />
          <Route path="/patient-portal" component={LegacyRouteRedirect} />
          <Route path="/symptom-checker" component={LegacyRouteRedirect} />
          <Route path="/users" component={LegacyRouteRedirect} />
          <Route path="/settings" component={LegacyRouteRedirect} />
          <Route path="/account-settings" component={LegacyRouteRedirect} />
          <Route path="/user-manual" component={LegacyRouteRedirect} />
          <Route path="/gdpr-compliance" component={LegacyRouteRedirect} />
          <Route path="/subscription" component={LegacyRouteRedirect} />

          {/* Root redirect */}
          <Route path="/" component={LegacyRouteRedirect} />
          <Route component={NotFound} />
        </Switch>
      </main>

        {/* AI Chat Widget available on all pages */}
        <AIChatWidget />
      </div>
    </>
  );
}

function SubdomainRedirect({ params }: { params: { subdomain: string } }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (params.subdomain) {
      const subdomain = params.subdomain;
      // Don't redirect if it's a known public route path
      const publicPaths = ["landing", "auth", "legal", "saas"];
      if (!publicPaths.includes(subdomain)) {
        setLocation(`/${subdomain}/auth/login`);
      }
    }
  }, [params.subdomain, setLocation]);

  return null;
}

function AppRouter() {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle redirects in useEffect to avoid setting state during render
  useEffect(() => {
    if (loading) return;

    // Exclude SaaS routes from main app authentication redirects - COMPLETELY
    const isSaaSRoute = location.startsWith("/saas");
    if (isSaaSRoute) {
      console.log(
        "🔧 SaaS route detected, skipping main app redirects:",
        location,
      );
      return;
    }

    // Extract subdomain from current location
    const pathParts = location.split("/").filter(Boolean);
    const potentialSubdomain = pathParts[0];
    const isPublicRoute = ["landing", "auth", "legal", "saas", "create-trial"].includes(
      potentialSubdomain,
    );

    // Determine if this is a subdomain route
    const isSubdomainRoute = pathParts.length >= 1 && !isPublicRoute;
    const subdomain = isSubdomainRoute ? potentialSubdomain : null;
    // Public booking routes must stay accessible without auth.
    // - /:subdomain/book-appointment (existing)
    // - /:subdomain/book (new, static public booking link per organization)
    // - /:subdomain/appointments/book (new alias)
    const isPublicBookingRoute =
      /^\/[^/]+\/book-appointment(?:[/?#]|$)/.test(location) ||
      /^\/[^/]+\/book(?:[/?#]|$)/.test(location) ||
      /^\/[^/]+\/appointments\/book(?:[/?#]|$)/.test(location);
    const isPublicSelfRegistrationRoute = /^\/[^/]+\/register(?:[/?#]|$)/.test(location);

    const isSharedFormRoute = location.includes("/forms/fill");
    const isLandingPage =
      location.startsWith("/landing") ||
      location.startsWith("/auth/login") ||
      location.includes("/auth/login") ||
      location.startsWith("/legal") ||
      location.startsWith("/create-trial") ||
      location === "/";

    // If user is authenticated and on a public/login page, redirect to first accessible page
    if (
      isAuthenticated &&
      (isLandingPage || location.includes("/auth/login")) &&
      !isSharedFormRoute
    ) {
      // We'll handle the redirect in ProtectedApp after permissions are loaded
      // For now, redirect to dashboard - ProtectedApp will check and redirect if needed
      const dashboardPath = subdomain
        ? `/${subdomain}/dashboard`
        : "/demo/dashboard";
      console.log("🔄 Redirecting authenticated user to:", dashboardPath);
      setLocation(dashboardPath);
      return;
    }

    // If user is not authenticated and not on a public page, redirect to universal login
    // BUT: If on a subdomain route, redirect to universal login instead of landing
    if (
      !isAuthenticated &&
      !isLandingPage &&
      !isSharedFormRoute &&
      !location.includes("/auth/login") &&
      !location.includes("/auth/reset-password") &&
      !location.startsWith("/create-trial") &&
      !isPublicBookingRoute &&
      !isPublicSelfRegistrationRoute
    ) {
      // Check if we're on a subdomain route (e.g., /maryamkhan/dashboard)
      if (isSubdomainRoute) {
        console.log(
          "🔄 Redirecting unauthenticated user from subdomain route to universal login",
        );
        setLocation("/auth/login");
      } else {
        console.log("🔄 Redirecting unauthenticated user to landing");
        setLocation("/landing");
      }
      return;
    }
  }, [isAuthenticated, loading, location, setLocation]);

  if (loading) {
    return <LoadingPage />;
  }

  // Check if we're on a SaaS route - if so, always render SaaS portal regardless of auth state
  const isSaaSRoute = location.startsWith("/saas");
  if (isSaaSRoute) {
    console.log("🔧 Rendering SaaS Portal for route:", location);
    return <SaaSPortal />;
  }

  const isLandingPage =
    location.startsWith("/landing") ||
    location.startsWith("/auth/login") ||
    location.includes("/auth/login") ||
    location.startsWith("/legal") ||
    location.startsWith("/create-trial") ||
    location === "/";

  // Render public pages for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        {/* Public pages */}
        <Route path="/forms/fill" component={FormSharePage} />
        <Route path="/:subdomain/forms/fill" component={FormSharePage} />
        <Route path="/:subdomain/book-appointment" component={PublicBookAppointmentPage} />
        <Route path="/:subdomain/book" component={PublicBookAppointmentPage} />
        <Route path="/:subdomain/appointments/book" component={PublicBookAppointmentPage} />
        <Route path="/:subdomain/register" component={PublicPatientRegisterPage} />
        <Route path="/" component={LandingPage} />
        <Route path="/landing" component={LandingPage} />
        <Route path="/landing/about" component={AboutPage} />
        <Route path="/landing/features" component={FeaturesPage} />
        <Route path="/landing/pricing" component={PricingPage} />
        <Route path="/landing/help" component={HelpCentre} />
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/:subdomain/auth/login" component={LoginPage} />
        <Route path="/auth/reset-password" component={ResetPasswordPage} />
        <Route path="/create-trial/verify" component={CreateTrialVerifyPage} />
        <Route path="/create-trial/set-password" component={CreateTrialSetPasswordPage} />
        <Route path="/create-trial" component={CreateTrialPage} />
        <Route path="/legal/privacy" component={PrivacyPolicy} />
        <Route path="/legal/terms" component={TermsOfService} />
        <Route path="/legal/gdpr" component={GDPRCompliancePage} />
        <Route path="/legal/press" component={Press} />
        <Route path="/:subdomain" component={SubdomainRedirect} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return <ProtectedApp />;
}

function App() {
  const [location, setLocation] = useLocation();

  // CRITICAL FIX: Handle SaaS routes at the VERY TOP LEVEL before any other logic
  console.log("🔍 APP: Current location:", location);

  // Handle common typo: /sass -> /saas
  if (location.startsWith("/sass")) {
    console.log("🔧 Redirecting /sass to /saas");
    setLocation("/saas");
    return null;
  }

  if (location.startsWith("/saas")) {
    console.log(
      "🚀 TOP-LEVEL: SaaS route detected, rendering SaaS Portal:",
      location,
    );
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <div className="min-h-screen">
              <SaaSPortal />
            </div>
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  console.log("🔧 APP: Non-SaaS route, using regular app routing");
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <div className="min-h-screen">
            <TenantProvider>
              <AuthProvider>
                <SocketProvider>
                  <LocaleProvider>
                    <AppRouter />
                  </LocaleProvider>
                </SocketProvider>
              </AuthProvider>
            </TenantProvider>
          </div>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
