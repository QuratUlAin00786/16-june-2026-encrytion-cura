import { Globe, ArrowLeft, LogOut } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const curaIconPath = "/cura-logo-chatbot.png";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  createdBy?: number;
  updatedBy?: number;
  hideNotificationBell?: boolean;
  hideAiStatus?: boolean;
  hideRegionalSettings?: boolean;
  hideSignOut?: boolean;
  showLogo?: boolean;
}

export function Header({
  title = "",
  subtitle,
  createdBy,
  updatedBy,
  hideNotificationBell = false,
  hideAiStatus = false,
  hideRegionalSettings = false,
  hideSignOut = false,
  showLogo = false,
}: HeaderProps) {
  const { tenant } = useTenant();
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  // Fetch users data to get names from IDs
  const { data: usersData = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users");
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    },
    enabled: (user?.role === 'admin' && (!!createdBy || !!updatedBy)),
  });

  // Helper function to get user name from ID
  const getUserName = (userId?: number) => {
    if (!userId || !Array.isArray(usersData)) return null;
    const foundUser = usersData.find((u: any) => u?.id === userId);
    if (!foundUser) return null;
    const firstName = foundUser?.firstName ?? "";
    const lastName = foundUser?.lastName ?? "";
    if (!firstName && !lastName) return null;
    return `${firstName} ${lastName}`.trim();
  };

  const handleBack = () => {
    window.history.back();
  };

  const showBackButton = location !== "/" && location !== "/dashboard";

  return (
    <header className="bg-white dark:bg-card shadow-sm border-b border-neutral-100 dark:border-border p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
          {showLogo && (
            <div className="shrink-0">
              <img
                src={curaIconPath}
                alt="Cura"
                className="h-9 w-auto"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground truncate">
                {title}
              </h2>
            ) : null}
            {subtitle && (
              <p className="text-neutral-600 dark:text-muted-foreground mt-1 text-sm lg:text-base truncate">{subtitle}</p>
            )}
            {/* Show created by / updated by for admin users */}
            {user?.role === 'admin' && (createdBy || updatedBy) && (
              <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                {updatedBy && (() => {
                  const userName = getUserName(updatedBy);
                  return userName ? (
                    <span className="truncate">Updated by: {userName}</span>
                  ) : null;
                })()}
                {createdBy && !updatedBy && (() => {
                  const userName = getUserName(createdBy);
                  return userName ? (
                    <span className="truncate">Created by: {userName}</span>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4 shrink-0">
          {/* AI Status Indicator */}
          {tenant?.settings?.features?.aiEnabled && !hideAiStatus && (
            <div className="hidden md:flex items-center space-x-2 bg-green-50 dark:bg-green-900 px-2 lg:px-3 py-1 lg:py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs lg:text-sm text-green-700 dark:text-green-200">AI Active</span>
            </div>
          )}

          {!hideRegionalSettings && (
            <div className="hidden sm:flex items-center space-x-1 lg:space-x-2 bg-neutral-50 dark:bg-neutral-800 px-2 lg:px-3 py-1 lg:py-2 rounded-lg">
              <Globe className="h-3 lg:h-4 w-3 lg:w-4 text-neutral-600 dark:text-neutral-400" />
              <span className="text-xs lg:text-sm text-neutral-700 dark:text-neutral-300">
                {tenant?.region?.substring(0, 2)}/{tenant?.settings?.compliance?.gdprEnabled ? "GDPR" : "Std"}
              </span>
            </div>
          )}

          {/* Notifications */}
          {!hideNotificationBell && <NotificationBell />}

          {/* Sign out */}
          {!hideSignOut && (
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
          )}
        </div>
      </div>
    </header>
  );
}
