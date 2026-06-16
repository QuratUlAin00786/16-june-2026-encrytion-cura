import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  User,
  Calendar,
  Pill,
  Activity,
  MessageSquare,
  X,
  Check,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: "low" | "normal" | "high" | "critical";
  status: "unread" | "read" | "dismissed" | "archived";
  isActionable: boolean;
  actionUrl?: string;
  metadata?: {
    patientId?: number;
    patientName?: string;
    appointmentId?: number;
    prescriptionId?: number;
    urgency?: "low" | "medium" | "high" | "critical";
    department?: string;
    icon?: string;
    color?: string;
  };
  createdAt: string;
  readAt?: string;
}

/**
 * Component to display relative time that updates in real-time
 * 
 * EXPLANATION:
 * - Backend now stores notifications with CURRENT TIME (explicitly set, no UTC conversion)
 * - We parse the date string and calculate the difference from NOW
 * - If date has timezone (ends with 'Z'), parse directly
 * - If date has no timezone, treat it as UTC (backend stores in UTC format)
 * - Calculate seconds difference and display accordingly
 * - This component is used in the notification bell popup for ALL roles
 */
function TimeAgo({ date }: { date: string }) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      try {
        // Get CURRENT TIME in user's local timezone
        const now = new Date();
        let notificationDate: Date;

        // Parse the date string from backend
        if (typeof date === 'string') {
          let dateString = date.trim();

          // Check if date has timezone indicator ('Z' for UTC or +/-HH:MM)
          const hasTimezone = dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/);

          if (hasTimezone) {
            // Has timezone info - parse directly (JavaScript handles timezone conversion)
            notificationDate = new Date(dateString);
          } else {
            // No timezone info - backend returns ISO format without 'Z'
            // We need to append 'Z' to tell JavaScript this is UTC
            let normalizedDate = dateString;

            // Remove milliseconds if present (e.g., "2024-01-15T10:00:00.123" -> "2024-01-15T10:00:00")
            if (normalizedDate.includes('.')) {
              normalizedDate = normalizedDate.split('.')[0];
            }

            // Convert space-separated to ISO format (e.g., "2024-01-15 10:00:00" -> "2024-01-15T10:00:00")
            if (normalizedDate.includes(' ') && !normalizedDate.includes('T')) {
              normalizedDate = normalizedDate.replace(' ', 'T');
            }

            // Append 'Z' to indicate UTC - this is CRITICAL for correct parsing
            if (!normalizedDate.endsWith('Z')) {
              normalizedDate = normalizedDate + 'Z';
            }

            notificationDate = new Date(normalizedDate);

            // Fallback parsing if above fails
            if (isNaN(notificationDate.getTime())) {
              notificationDate = new Date(dateString + ' UTC');
              if (isNaN(notificationDate.getTime())) {
                console.warn("Invalid date format:", date);
                setTimeAgo("just now");
                return;
              }
            }
          }
        } else {
          notificationDate = new Date(date);
        }

        // Validate the parsed date
        if (isNaN(notificationDate.getTime())) {
          setTimeAgo("just now");
          return;
        }

        // Calculate time difference in seconds
        // differenceInSeconds(now, notificationDate) = positive if notificationDate is in the past
        let secondsDiff = Math.floor(differenceInSeconds(now, notificationDate));

        // If date is in the future (negative difference), show "just now"
        if (secondsDiff < 0) {
          setTimeAgo("just now");
          return;
        }

        // Display time based on how long ago it was
        if (secondsDiff === 0) {
          setTimeAgo("just now");
        } else if (secondsDiff < 5) {
          setTimeAgo("just now");
        } else if (secondsDiff < 60) {
          setTimeAgo(`${secondsDiff} seconds ago`);
        } else if (secondsDiff < 120) {
          setTimeAgo("1 minute ago");
        } else if (secondsDiff < 3600) {
          // Less than 1 hour - show minutes
          const minutes = Math.floor(secondsDiff / 60);
          setTimeAgo(`${minutes} minute${minutes === 1 ? '' : 's'} ago`);
        } else if (secondsDiff < 86400) {
          // Less than 1 day - show hours
          const hours = Math.floor(secondsDiff / 3600);
          setTimeAgo(`${hours} hour${hours === 1 ? '' : 's'} ago`);
        } else {
          // More than 1 day - use formatDistanceToNow for better formatting
          const distance = formatDistanceToNow(notificationDate, { addSuffix: true });
          setTimeAgo(distance);
        }
      } catch (error) {
        console.error("Error calculating time ago:", error, "Date:", date);
        setTimeAgo("just now");
      }
    };

    // Update immediately
    updateTime();

    // Update every second for accurate real-time display
    // This ensures very recent notifications show correct time immediately
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, [date]);

  return <span>{timeAgo}</span>;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasAuthToken = typeof window !== "undefined" && !!localStorage.getItem("auth_token");

  // Fetch unread count
  const organizationKey = user?.organizationId ?? getActiveSubdomain();
  const userRole = user?.role?.toString().toLowerCase();
  const isAdminUser = Boolean(userRole === "admin");
  const isPatientNurseDoctor = Boolean(["patient", "nurse", "doctor"].includes(userRole || ""));
  const notificationsQueryKey = ["/api/notifications", organizationKey];
  const totalCountQueryKey = ["/api/notifications/count", organizationKey];
  const unreadCountQueryKey = ["/api/notifications/unread-count", organizationKey];

  const { data: unreadCountData } = useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/notifications/unread-count");
        if (!response.ok) {
          // If authentication error or connection error, return 0 count instead of throwing
          if (response.status === 401 || response.status === 500) {
            console.warn("Failed to fetch unread count - authentication issue, returning 0");
            return { count: 0 };
          }
          throw new Error("Failed to fetch unread count");
        }
        return response.json();
      } catch (error: any) {
        // Handle errors gracefully - return 0 count instead of breaking the UI
        // Check for connection refused or network errors
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
          console.warn("Connection error fetching unread count (server may be starting), returning 0");
          return { count: 0 };
        }
        console.error("Error fetching unread count:", error);
        return { count: 0 };
      }
    },
    enabled: hasAuthToken && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on error to avoid spam
  });

  const unreadCount = (unreadCountData as { count: number })?.count || 0;

  const { data: totalNotificationsData } = useQuery({
    queryKey: totalCountQueryKey,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications/count");
      if (!response.ok) {
        throw new Error("Failed to fetch notification count");
      }
      return response.json();
    },
    enabled: hasAuthToken && !!user,
    staleTime: 60000,
  });

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: notificationsQueryKey,
    enabled: hasAuthToken && !!user && (isAdminUser ? true : isOpen),
  });

  const totalNotifications = (totalNotificationsData as { count: number })?.count || notifications.length;
  const visibleNotifications = notifications.filter(
    (notification) => notification.status !== "dismissed" && notification.status !== "archived",
  );
  // Calculate actual unread count from visible notifications
  const actualUnreadCount = visibleNotifications.filter(
    (notification) => notification.status === "unread"
  ).length;
  // Use actual unread count if notifications are loaded, otherwise use API count
  const badgeCount = notifications.length > 0 ? actualUnreadCount : unreadCount;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/dismiss`);
    },
    onSuccess: (_data, notificationId) => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
      queryClient.setQueryData<Notification[]>(
        notificationsQueryKey,
        (prev) => prev?.filter((n) => n.id !== notificationId) ?? prev,
      );
      toast({
        title: "Notification dismissed",
        description: "The notification has been dismissed successfully.",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment_reminder":
        return <Calendar className="h-4 w-4" />;
      case "lab_result":
        return <Activity className="h-4 w-4" />;
      case "prescription_alert":
        return <Pill className="h-4 w-4" />;
      case "system_alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "payment_due":
        return <Clock className="h-4 w-4" />;
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "patient_update":
        return <User className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "normal":
        return "text-blue-600 bg-blue-50";
      case "low":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === "unread") {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      const subdomain = getActiveSubdomain();
      const fullUrl = notification.actionUrl.startsWith('/')
        ? `/${subdomain}${notification.actionUrl}`
        : notification.actionUrl;
      navigate(fullUrl);
    }

    setIsOpen(false);
  };

  const handleDismiss = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5 text-neutral-600" />
          {badgeCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {badgeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 p-0 flex flex-col max-h-[400px] h-[400px]"
        sideOffset={5}
      >
        <div className="flex items-center justify-between p-3 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0 bg-white dark:bg-card">
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Notifications</h3>
          <div className="flex items-center gap-1.5">
            {badgeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <Badge
              variant="secondary"
              className="px-2 py-0.5 h-6 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-none rounded-full flex flex-col items-center justify-center leading-tight"
            >
              <span>{visibleNotifications.length}</span>
              <span>{visibleNotifications.length === 1 ? 'notification' : 'notifications'}</span>
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {visibleNotifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors relative border-b border-neutral-50 dark:border-neutral-800/50 ${notification.status === "unread" ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-white dark:bg-card"
                      }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </h4>
                            {notification.status === "unread" && (
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0"></div>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                            {notification.message}
                          </p>

                          <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-tight">
                            <TimeAgo date={notification.createdAt} />
                            {notification.metadata?.patientName && (
                              <>
                                <span className="text-gray-300 dark:text-gray-700 mx-1">•</span>
                                <span className="text-blue-600 dark:text-blue-400">{notification.metadata.patientName}</span>
                              </>
                            )}
                            {notification.metadata?.department && (
                              <>
                                <span className="text-gray-300 dark:text-gray-700 mx-1">•</span>
                                <span>{notification.metadata.department}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-2">
                        {notification.priority === "critical" && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                          onClick={(e) => handleDismiss(e, notification.id)}
                          disabled={dismissMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50 flex-shrink-0">
          <Button
            variant="ghost"
            className="w-full text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => {
              const subdomain = getActiveSubdomain();
              navigate(`/${subdomain}/notifications`);
              setIsOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}