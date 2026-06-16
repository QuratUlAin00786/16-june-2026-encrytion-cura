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
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";

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

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const organizationKey = useAuth()?.user?.organizationId ?? getActiveSubdomain();

  // Fetch notifications
  const { user } = useAuth();
  const notificationsEndpoint = user?.role === "admin" ? "/api/notifications?limit=0" : "/api/notifications";
  const notificationsQueryKey = ["/api/notifications", organizationKey];
  const unreadCountQueryKey = ["/api/notifications/unread-count", organizationKey];
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      const response = await apiRequest("GET", notificationsEndpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
  });

  const visibleNotifications = notifications.filter(n => n.status !== "dismissed");

  // Clean up selected notifications when notifications change (e.g., after dismiss)
  useEffect(() => {
    const visibleIds = new Set(visibleNotifications.map(n => n.id));
    setSelectedNotifications(prev => 
      prev.filter(id => visibleIds.has(id))
    );
  }, [visibleNotifications]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/dismiss`);
    },
    onSuccess: (_data, notificationId) => {
      // Remove from selected notifications before invalidating queries
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Notification dismissed",
        description: "The notification has been dismissed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss notification. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.setQueryData(unreadCountQueryKey, { count: 0 });
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
        return <Calendar className="h-5 w-5" />;
      case "lab_result":
        return <Activity className="h-5 w-5" />;
      case "prescription_alert":
        return <Pill className="h-5 w-5" />;
      case "system_alert":
        return <AlertTriangle className="h-5 w-5" />;
      case "payment_due":
        return <Clock className="h-5 w-5" />;
      case "message":
        return <MessageSquare className="h-5 w-5" />;
      case "patient_update":
        return <User className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400";
      case "high":
        return "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400";
      case "normal":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400";
      case "low":
        return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      appointment_reminder: "Appointment Reminder",
      lab_result: "Lab Result",
      prescription_alert: "Prescription Alert",
      system_alert: "System Alert",
      payment_due: "Payment Due",
      message: "Message",
      patient_update: "Patient Update",
    };
    return labels[type] || type;
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === "unread") {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      const subdomain = getActiveSubdomain();
      let actionUrl = notification.actionUrl;
      
      // Fix invalid legacy URLs - if URL contains /patients/X/prescriptions, redirect to /prescriptions
      if (actionUrl.match(/\/patients\/\d+\/prescriptions/)) {
        actionUrl = "/prescriptions";
      }
      // Fix invalid legacy URLs - if URL contains /patients/X/[invalid-route], redirect to /patients/X
      else if (actionUrl.match(/\/patients\/\d+\/\w+/) && !actionUrl.includes('/records')) {
        const patientId = actionUrl.match(/\/patients\/(\d+)/)?.[1];
        if (patientId) {
          actionUrl = `/patients/${patientId}`;
        }
      }
      
      const fullUrl = actionUrl.startsWith('/') 
        ? `/${subdomain}${actionUrl}` 
        : actionUrl;
      navigate(fullUrl);
    }
  };

  const handleDismiss = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const toggleSelectNotification = (notificationId: number) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAll = () => {
    const allIds = visibleNotifications.map(n => n.id);
    setSelectedNotifications(allIds);
  };

  const deselectAll = () => {
    setSelectedNotifications([]);
  };

  const isAllSelected = visibleNotifications.length > 0 && 
    selectedNotifications.length === visibleNotifications.length &&
    visibleNotifications.every(n => selectedNotifications.includes(n.id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  // Mark selected notifications as read
  const markSelectedAsReadMutation = useMutation({
    mutationFn: async (notificationIds: number[]) => {
      const promises = notificationIds.map(id => 
        apiRequest("PATCH", `/api/notifications/${id}/read`)
      );
      await Promise.all(promises);
    },
    onSuccess: (_data, notificationIds) => {
      const count = notificationIds.length;
      setSelectedNotifications([]);
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
      toast({
        title: "Notifications marked as read",
        description: `${count} notification(s) have been marked as read.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notifications as read. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReadSelected = () => {
    if (selectedNotifications.length === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one notification to mark as read.",
        variant: "destructive",
      });
      return;
    }
    markSelectedAsReadMutation.mutate([...selectedNotifications]);
  };

  const { data: unreadCountData } = useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications/unread-count");
      if (!response.ok) {
        throw new Error("Failed to fetch unread count");
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  const unreadCount = (unreadCountData as { count: number })?.count || 0;

  return (
    <div className="p-5 space-y-5 page-zoom-90">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all your notifications in one place
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-4 py-2">
            {unreadCount} unread
          </Badge>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
          <CardTitle className="text-blue-800 dark:text-blue-400">
            Notifications ({visibleNotifications.length})
          </CardTitle>
          <CardDescription>
            {visibleNotifications.length === 0 && "No notifications to display"}
            </CardDescription>
          </div>
          {visibleNotifications.length > 0 && (
            <div className="flex items-center gap-3">
              {/* Select All Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAllToggle}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  data-testid="checkbox-select-all"
                />
                <label 
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                  onClick={handleSelectAllToggle}
                >
                  Select All
                </label>
              </div>
              {/* Read All Button */}
              {selectedNotifications.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleReadSelected}
                  disabled={markSelectedAsReadMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-read-selected"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Read All ({selectedNotifications.length})
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="font-medium text-lg">No notifications found</p>
              <p className="text-sm mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
          <ScrollArea className="max-h-[800px] h-[800px]">
              <div className="space-y-2">
                {visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all ${
                    notification.status === "unread" 
                      ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
                      : "bg-white dark:bg-gray-900"
                  } ${
                    selectedNotifications.includes(notification.id)
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleSelectNotification(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      data-testid={`checkbox-notification-${notification.id}`}
                    />

                    {/* Icon */}
                    <div 
                      className={`p-3 rounded-full ${getPriorityColor(notification.priority)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        {notification.status === "unread" && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {notification.priority === "critical" && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                        {notification.priority === "high" && (
                          <Badge className="bg-orange-500">High Priority</Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <TimeAgo date={notification.createdAt} />
                        </span>
                        {notification.metadata?.patientName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {notification.metadata.patientName}
                          </span>
                        )}
                        {notification.metadata?.department && (
                          <Badge variant="secondary" className="text-xs">
                            {notification.metadata.department}
                          </Badge>
                        )}
                        {notification.readAt && (() => {
                          // Parse readAt date - backend stores in UTC, convert to local timezone
                          let readAtDate: Date;
                          const readAtString = notification.readAt.trim();
                          if (readAtString.includes('T') && !readAtString.includes('Z') && !readAtString.match(/[+-]\d{2}:\d{2}$/)) {
                            // ISO format without timezone - treat as UTC
                            readAtDate = new Date(readAtString + 'Z');
                          } else {
                            readAtDate = new Date(readAtString);
                          }
                          return (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              Read {format(readAtDate, 'MMM d, h:mm a')}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {notification.status === "unread" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          disabled={markAsReadMutation.isPending}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDismiss(e, notification.id)}
                        disabled={dismissMutation.isPending}
                        data-testid={`button-dismiss-${notification.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
