import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Brain,
  CreditCard,
  UserCog,
  Settings,
  Heart,
  Crown,
  FileText,
  Pill,
  FlaskConical,
  Stethoscope,
  FileImage,
  Receipt,
  BarChart3,
  Globe,
  MessageSquare,
  Link as LinkIcon,
  Video,
  Smartphone,
  Mic,
  Calculator,
  Package,
  Menu,
  X,
  Shield,
  Bot,
  Activity,
  Thermometer,
  BookOpen,
  PoundSterling,
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useCurrency } from "@/hooks/use-currency";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions, UserRole } from "@/hooks/use-role-permissions";
import { isDoctorLike } from "@/lib/role-utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar, AvatarContent, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CurrencyIcon } from "@/components/ui/currency-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getTenantSubdomain as getTenantSubdomainClient } from "@/lib/queryClient";
import { Camera } from "lucide-react";
import type { Organization } from "@/types";
const darkLogoWhite = new URL("../../../../attached_assets/dark-logo/cura-logo-white.png", import.meta.url).href;

const ALL_NAVIGATION = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, module: "dashboard" },
  { name: "Patients", href: "/patients", icon: Users, module: "patients" },
  {
    name: "Appointments",
    href: "/appointments",
    icon: Calendar,
    module: "appointments",
  },
  {
    name: "Prescriptions",
    href: "/prescriptions",
    icon: Pill,
    module: "prescriptions",
  },
  {
    name: "Lab Results",
    href: "/lab-results",
    icon: FlaskConical,
    module: "lab_results",
  },
  {
    name: "Imaging",
    href: "/imaging",
    icon: FileImage,
    module: "medical_imaging",
  },
  { name: "Forms", href: "/forms", icon: FileText, module: "forms" },
  {
    name: "Messaging",
    href: "/messaging",
    icon: MessageSquare,
    module: "messaging",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    module: "analytics",
  },
  {
    name: "Clinical Decision Support",
    href: "/clinical-decision-support",
    icon: Brain,
    module: "clinical_decision_support",
  },
  {
    name: "Symptom Checker",
    href: "/symptom-checker",
    icon: Thermometer,
    module: "symptom_checker",
  },
  {
    name: "Telemedicine",
    href: "/telemedicine",
    icon: Video,
    module: "telemedicine",
  },
  {
    name: "Voice Documentation",
    href: "/voice-documentation",
    icon: Mic,
    module: "voice_documentation",
  },
  {
    name: "Financial Intelligence",
    href: "/financial-intelligence",
    icon: Calculator,
    module: "financial_intelligence",
  },
  { name: "Billing", href: "/billing", icon: PoundSterling, module: "billing" },
  {
    name: "QuickBooks",
    href: "/quickbooks",
    icon: Calculator,
    module: "quickbooks",
  },
  { name: "Inventory", href: "/inventory", icon: Package, module: "inventory" },
];

const ADMIN_NAVIGATION = [
  {
    name: "User Management",
    href: "/users",
    icon: UserCog,
    module: "user_management",
  },
  {
    name: "Shift Management",
    href: "/shifts",
    icon: Calendar,
    module: "shift_management",
  },
  {
    name: "Subscription/Packages",
    href: "/subscription",
    icon: Crown,
    module: "subscription",
  },
  { name: "Settings", href: "/settings", icon: Settings, module: "settings" },
  { name: "User Manual", href: "/user-manual", icon: BookOpen, module: "user_manual" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { tenant } = useTenant();
  const { currencySymbol } = useCurrency();
  const { user, logout, loading: authLoading } = useAuth();
  const { canAccess, getUserRole, isLoading: permissionsLoading } = useRolePermissions();
  const { toast } = useToast();
  const [isRoleDataReady, setIsRoleDataReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();

  const { data: currentUserDetails } = useQuery<any>({
    queryKey: ["/api/users/current"],
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users/current");
      return response.json();
    },
    retry: false,
    staleTime: 30000,
  });

  const avatarUrl =
    (currentUserDetails?.profilePicturePath as string | null | undefined) ||
    ((user as any)?.profilePicturePath as string | null | undefined) ||
    null;

  const onPickProfileImage = () => {
    const el = document.getElementById("sidebar-profile-upload") as HTMLInputElement | null;
    el?.click();
  };

  const onProfileImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    e.target.value = "";
    if (!file) return;

    const okType =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";
    if (!okType) {
      toast({
        title: "Invalid file type",
        description: "Only JPG, JPEG, PNG, and WebP images are allowed.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Max file size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("Not authenticated");
      // Use the same tenant resolution logic as all API calls
      const subdomain = getTenantSubdomainClient();

      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/users/profile-picture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": subdomain,
        },
        body: form,
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
      }

      // Refresh avatar everywhere (sidebar + telemedicine user list, etc.)
      await queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/users"] });
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not upload profile picture.",
        variant: "destructive",
      });
    }
  };

  // Fetch organization data with React Query
  const { data: organizationData } = useQuery<Organization>({
    queryKey: ["/api/tenant/info"],
    queryFn: async () => {
      const response = await fetch('/api/tenant/info', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    retry: false,
  });

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Set role data as ready once loading is finished
  useEffect(() => {
    if (!authLoading && !permissionsLoading) {
      // Small delay to ensure state has propagated
      const timer = setTimeout(() => setIsRoleDataReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsRoleDataReady(false);
    }
  }, [authLoading, permissionsLoading]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Filter navigation based on user role permissions
  const currentRole = getUserRole();

  const filteredNavigation = ALL_NAVIGATION.filter((item) => {
    // STRICT: Only show modules after auth and permissions are fully loaded from DB
    if (!isRoleDataReady || !user) {
      return false;
    }

    // Even for admin role, check permissions from database to respect role edits
    // This allows Admin to see the sidebar update when they edit Admin role permissions
    // Backend will still allow admin to access everything, but sidebar visibility respects permissions
    return canAccess(item.module);
  });

  const isDoctorUser = user && isDoctorLike(user.role);

  const filteredAdminNavigation = ADMIN_NAVIGATION.filter((item) => {
    // STRICT: Only show modules after auth and permissions are fully loaded from DB
    if (!isRoleDataReady || !user) {
      return false;
    }

    // Special handling for user_management: Always show for admin/administrator role
    // This ensures trial admin users can always see User Management regardless of stored permissions
    if (item.module === "user_management") {
      const normalizedRole = currentRole?.toLowerCase() ?? "";
      if (normalizedRole === "admin" || normalizedRole === "administrator") {
        return true; // Always show for admin users
      }
      return false; // Hide for non-admin users
    }

    // For other admin modules, check permissions from database to respect role edits
    // This allows Admin to see the sidebar update when they edit Admin role permissions
    // Backend will still allow admin to access everything, but sidebar visibility respects permissions
    return canAccess(item.module);
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMobileMenu}
            className="bg-white shadow-lg"
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-card shadow-lg flex flex-col h-screen transition-transform duration-300 ease-in-out",
          // Desktop
          "lg:w-64 lg:relative lg:translate-x-0 lg:z-30",
          // Mobile
          "fixed w-64 lg:w-64 z-50",
          isMobile && !isMobileMenuOpen && "-translate-x-full",
          isMobile && isMobileMenuOpen && "translate-x-0",
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-neutral-100 dark:border-border">
          <div className="flex flex-col items-center text-center">
            <img
              src={
                organizationData?.settings?.theme?.logoUrl ||
                tenant?.settings?.theme?.logoUrl ||
                (theme === "dark" ? darkLogoWhite : "/cura-logo-chatbot.png")
              }
              alt={organizationData?.name || tenant?.name || "Cura"}
              className="h-30 w-auto mb-2"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="sidebar-nav">
            {filteredNavigation.map((item) => {
              // Prefix href with subdomain - use tenant subdomain or fallback to active subdomain from URL
              const subdomain = tenant?.subdomain || getActiveSubdomain();
              const prefixedHref = `/${subdomain}${item.href}`;
              const isActive =
                location === prefixedHref || location === item.href;
              
              // For Billing item, use CurrencyIcon instead of PoundSterling
              const IconComponent = item.name === "Billing" && item.icon === PoundSterling 
                ? CurrencyIcon 
                : item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={prefixedHref}
                  className={cn("sidebar-nav-item", isActive && "active")}
                  onClick={isMobile ? closeMobileMenu : undefined}
                >
                  {item.name === "Billing" && item.icon === PoundSterling ? (
                    <CurrencyIcon className="h-5 w-5 flex items-center justify-center" />
                  ) : (
                    <item.icon className="h-5 w-5" />
                  )}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Admin Section */}
          {filteredAdminNavigation.length > 0 && (
            <>
              <div className="pt-4 mt-4">
                <Separator />
              </div>
              <div className="pt-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2 px-3">
                  ADMINISTRATION
                </p>
                <div className="sidebar-nav">
                  {filteredAdminNavigation.map((item) => {
                    // Prefix href with subdomain - use tenant subdomain or fallback to active subdomain from URL
                    const subdomain = tenant?.subdomain || getActiveSubdomain();
                    const prefixedHref = `/${subdomain}${item.href}`;
                    const isActive =
                      location === prefixedHref || location === item.href;
                    // For Billing item, use CurrencyIcon instead of PoundSterling
                    return (
                      <Link
                        key={item.name}
                        href={prefixedHref}
                        className={cn("sidebar-nav-item", isActive && "active")}
                        onClick={isMobile ? closeMobileMenu : undefined}
                      >
                        {item.name === "Billing" && item.icon === PoundSterling ? (
                          <CurrencyIcon className="h-5 w-5 flex items-center justify-center" />
                        ) : (
                          <item.icon className="h-5 w-5" />
                        )}
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-neutral-100 dark:border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500 dark:text-muted-foreground uppercase tracking-wide">
              Theme
            </span>
            <ThemeToggle />
          </div>
          <DropdownMenu>
            <div className="flex items-center space-x-3 rounded-lg p-2 -m-2 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-700">
              {/* Upload control (avatar click opens file picker) */}
              <div className="relative">
                <input
                  id="sidebar-profile-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onProfileImageSelected}
                />
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    onPickProfileImage();
                  }}
                  className="relative"
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                >
                  <Avatar>
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile picture" />
                    ) : null}
                    <AvatarContent
                      className="text-white font-semibold"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      {user ? getInitials(user.firstName, user.lastName) : "U"}
                    </AvatarContent>
                    <AvatarFallback>
                      {user ? getInitials(user.firstName, user.lastName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center shadow-sm">
                    <Camera className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-200" />
                  </span>
                </button>
              </div>

              {/* Dropdown trigger (name + gear) */}
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center space-x-3 flex-1 min-w-0 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">
                      {user ? `${user.firstName} ${user.lastName}` : "Unknown User"}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-muted-foreground truncate">
                      {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}
                    </p>
                  </div>
                  <SettingsIcon className="h-4 w-4 text-neutral-600 shrink-0" />
                </button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user
                      ? `${user.firstName} ${user.lastName}`
                      : "Unknown User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={`/${tenant?.subdomain || getActiveSubdomain()}/settings`}
                  className="flex items-center"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/${tenant?.subdomain || getActiveSubdomain()}/account-settings`}
                  className="flex items-center"
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  window.location.href = "/auth/login";
                }}
                className="text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
