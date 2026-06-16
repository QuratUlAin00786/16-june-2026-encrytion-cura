import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Calendar, Brain, CreditCard, Settings, UserCog, Crown, BarChart3, Plus, UserPlus, ClipboardPlus, Pill, Trash2, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppointmentCalendar from "../calendar/appointment-calendar";
import { AiInsightsPanel } from "../dashboard/ai-insights-panel";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

// Recent Patients List Component
function RecentPatientsList() {
  const [patients, setPatients] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchPatients() {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'X-Tenant-Subdomain': getTenantSubdomain(),
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/patients', {
          headers,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch patients: ${response.status}`);
        }
        
        const data = await response.json();
        setPatients(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatients();
  }, []);

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading patients...</div>;
  }

  if (error || patients.length === 0) {
    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
      No recent patients available
    </div>;
  }

  // Get the 5 most recent patients (sorted by creation date)
  const recentPatients = patients
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {recentPatients.map((patient: any) => (
        <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {patient.firstName} {patient.lastName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Patient ID: {patient.patientId || patient.id}
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : "Recent"}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const rolesQuery = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/roles");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const roles = rolesQuery.data ?? [];

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      await apiRequest("DELETE", `/api/roles/${roleId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Role deleted",
        description: "Role removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRole = (roleId: number, displayName: string) => {
    if (user?.role !== "admin") {
      toast({
        title: "Permission denied",
        description: "Only admins can delete roles.",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm(`Delete "${displayName}"? This cannot be undone.`)) {
      return;
    }

    deleteRoleMutation.mutate(roleId);
  };
  const { data: stats, isLoading, error, isFetching } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 0,
    // Only refetch when user returns to the tab, not continuously
    // This prevents blinking and only updates when there's actual user interaction
    refetchOnWindowFocus: true,
    // Don't auto-refresh continuously - only fetch when database entry occurs via manual invalidation
    refetchInterval: false,
    // Keep previous data visible while refetching (prevents showing "--" during refetch)
    keepPreviousData: true,
  });

  // Fetch all patients from the patients table to get total count
  const { data: allPatients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients/all"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch all patients without isActive filter (no limit = all patients)
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 0,
    // Auto-refresh for admin role: poll every 10 seconds to get new patients
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });

  // Fetch active patients from the patients table to get active count
  const { data: activePatients, isLoading: activePatientsLoading } = useQuery({
    queryKey: ["/api/patients/active"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch only active patients (is_active = true) (no limit = all)
      const response = await fetch('/api/patients?isActive=true', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 0,
    // Auto-refresh for admin role: poll every 10 seconds to get new active patients
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });

  // Fetch latest subscription data if user is admin (get latest subscription, then check if expired)
  const { data: subscriptionResponse, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/subscriptions/current', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        // If 404, no subscription found
        if (response.status === 404) {
          return { expired: true, data: null };
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const subscriptionData = await response.json();
      
      // Check if the latest subscription is expired
      // expiresAt datetime must be > current datetime (not equal to or past)
      if (!subscriptionData) {
        // No subscription data found
        return { expired: true, data: null };
      }
      
      // Check if subscription has expiresAt field
      if (subscriptionData.expiresAt) {
        const expiresAt = new Date(subscriptionData.expiresAt);
        const now = new Date();
        
        // Validate the date
        if (isNaN(expiresAt.getTime())) {
          // Invalid date, treat as not expired
          return { expired: false, data: subscriptionData };
        }
        
        // Compare datetime (not just date) - expiresAt must be > current datetime
        // If expiresAt <= now, subscription is expired
        if (expiresAt.getTime() <= now.getTime()) {
          // Subscription is expired - return with expired flag and data
          return { expired: true, data: subscriptionData };
        }
      }
      
      // If subscription exists but has no expiresAt, it doesn't expire (return as not expired)
      // Subscription is not expired
      return { expired: false, data: subscriptionData };
    },
    retry: false,
    staleTime: 0,
    enabled: user?.role === 'admin' // Only fetch if user is admin
  });

  // Extract subscription data and expired flag
  const subscription = subscriptionResponse?.data;
  const isSubscriptionExpired = subscriptionResponse?.expired || false;

  // Fetch users count (excluding role "patient") for the logged-in user's organization
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/count"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/users', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const users = await response.json();
      // Filter out users with role "patient" and count
      const usersExcludingPatients = Array.isArray(users) 
        ? users.filter((u: any) => u.role !== 'patient')
        : [];
      
      return {
        count: usersExcludingPatients.length,
        users: usersExcludingPatients
      };
    },
    retry: false,
    staleTime: 0,
    enabled: user?.role === 'admin' // Only fetch if user is admin
  });

  // Fetch patients count for the logged-in user's organization
  const { data: patientsCountData, isLoading: patientsCountLoading } = useQuery({
    queryKey: ["/api/patients/count"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const patients = await response.json();
      // Count all patients
      const patientsArray = Array.isArray(patients) ? patients : [];
      
      return {
        count: patientsArray.length
      };
    },
    retry: false,
    staleTime: 0,
    enabled: user?.role === 'admin' // Only fetch if user is admin
  });

  // Fetch appointments to calculate today's appointments client-side (more accurate than backend stats)
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/appointments', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 0,
    // Only refetch when user returns to the tab, not continuously
    // This prevents blinking and only updates when there's actual user interaction
    refetchOnWindowFocus: true,
    // Don't auto-refresh continuously - only fetch when database entry occurs via manual invalidation
    refetchInterval: false,
    // Keep previous data visible while refetching (prevents showing "--" during refetch)
    keepPreviousData: true,
  });

  // Calculate today's appointments client-side (matches calendar logic exactly)
  // Calendar uses: apt.scheduledAt.substring(0, 10) === format(date, 'yyyy-MM-dd')
  const today = new Date();
  const todayDateString = format(today, 'yyyy-MM-dd');
  
  const todayAppointmentsCount = Array.isArray(appointmentsData)
    ? appointmentsData.filter((apt: any) => {
        // Extract date without timezone conversion: "2025-11-17T22:45:00" -> "2025-11-17"
        const aptDateString = apt.scheduledAt ? apt.scheduledAt.substring(0, 10) : '';
        return aptDateString === todayDateString && apt.status === 'scheduled';
      }).length
    : 0;

  // Calculate today's cancelled appointments client-side
  const todayCancelledAppointmentsCount = Array.isArray(appointmentsData)
    ? appointmentsData.filter((apt: any) => {
        // Extract date without timezone conversion: "2025-11-17T22:45:00" -> "2025-11-17"
        const aptDateString = apt.scheduledAt ? apt.scheduledAt.substring(0, 10) : '';
        return aptDateString === todayDateString && apt.status === 'cancelled';
      }).length
    : 0;

  const subdomain = getTenantSubdomain();

  const dashboardCards = [
    {
      title: "Total Patients",
      // Use stats.totalPatients if available (from database count), otherwise fall back to fetched patients count
      // Only show "--" on initial load when no data exists yet
      value: (isLoading && !stats) || (patientsLoading && !allPatients) ? "--" : (stats?.totalPatients?.toString() || (Array.isArray(allPatients) ? allPatients.length.toString() : "0")),
      description: (isLoading && !stats) || (patientsLoading && !allPatients) || (activePatientsLoading && !activePatients) ? "Loading..." : `${stats?.totalPatients || (Array.isArray(allPatients) ? allPatients.length : 0)} total patients • ${stats?.activePatients || (Array.isArray(activePatients) ? activePatients.length : 0)} active patients`,
      icon: Users,
      href: `/${subdomain}/patients`,
      color: "text-blue-500"
    },
    {
      title: "Today's Appointments", 
      // Calculate from appointments data client-side (more accurate than backend stats)
      // Only show "--" on initial load when no data exists yet, keep previous value during refetch
      value: (!appointmentsData && appointmentsLoading) ? "--" : todayAppointmentsCount.toString(),
      description: (!appointmentsData && appointmentsLoading) ? "Loading..." : `${todayAppointmentsCount} scheduled today${todayCancelledAppointmentsCount > 0 ? ` • ${todayCancelledAppointmentsCount} cancelled today` : ''}`,
      icon: Calendar,
      href: `/${subdomain}/appointments`,
      color: "text-green-500"
    },
    {
      title: "AI Suggestions",
      // Only show "--" on initial load when no data exists yet, keep previous value during refetch
      value: isLoading && !stats ? "--" : (stats?.aiSuggestions?.toString() || "0"), 
      description: isLoading && !stats ? "Loading..." : `${stats?.aiSuggestions || 0} active insights`,
      icon: Brain,
      href: `/${subdomain}/clinical-decision-support?tab=insights`,
      color: "text-purple-500"
    },
    {
      title: "Total Revenue",
      // Only show "--" on initial load when no data exists yet, keep previous value during refetch
      value: isLoading && !stats ? "--" : `${currencySymbol}${(stats?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: isLoading && !stats ? "Loading..." : "Total revenue received",
      icon: CreditCard,
      href: `/${subdomain}/billing`,
      color: "text-yellow-500"
    }
  ];
  
  const quickActions = [
    { title: "Add New Patient", description: "", icon: UserPlus, href: `/${subdomain}/patients` },
    { title: "Schedule Appointment", description: "", icon: Calendar, href: `/${subdomain}/appointments` },
    { title: "Create Prescription", description: "", icon: Pill, href: `/${subdomain}/prescriptions` },
    { title: "Medical Records", description: "", icon: ClipboardPlus, href: `/${subdomain}/patients` },
    { title: "Clinical Decision Support", description: "", icon: Brain, href: `/${subdomain}/clinical-decision-support` }
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card) => (
          <Card key={card.title} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation(card.href)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:!text-gray-300">{card.title}</CardTitle>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:!text-gray-100">{card.value}</div>
              <p className="text-xs text-gray-500 dark:!text-gray-400">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area with Calendar and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* First Row - Appointment Calendar */}
        <div className="lg:col-span-2">
          <AppointmentCalendar onNewAppointment={() => setLocation("/appointments")} />
        </div>

        {/* Right Column - Quick Actions, AI Insights, and Subscription */}
        <div className="space-y-4 lg:row-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
          
          {/* AI Patient Insights */}
          <AiInsightsPanel />
          
          {/* Subscription Info */}
          {user?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                  Subscription Plan
                  <Crown className="h-5 w-5 text-yellow-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptionLoading ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Loading subscription...
                  </div>
                ) : isSubscriptionExpired ? (
                  <div className="rounded-lg border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-base font-bold text-red-600 dark:text-red-400">
                        Your subscription is expired
                      </p>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {subscription && subscription.expiresAt ? (
                        <>Your subscription has expired on {new Date(subscription.expiresAt).toLocaleString('en-GB', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}. Please subscribe to a package again to continue using the service.</>
                      ) : (
                        <>Your subscription has expired. Please subscribe to a package again to continue using the service.</>
                      )}
                    </p>
                  </div>
                ) : subscription ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                        {subscription.plan || subscription.planName}
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'default' : subscription.status === 'trial' ? 'secondary' : 'destructive'} className="mt-1">
                        {subscription.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Users:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {usersLoading ? "..." : (usersData?.count || subscription.currentUsers || 0)} / {subscription.features?.maxUsers || subscription.userLimit || "—"}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Patients:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {patientsCountLoading ? "..." : (patientsCountData?.count || subscription.currentPatients || 0)} / {subscription.features?.maxPatients || "—"}
                        </span>
                      </div>
                      
                      {subscription.monthlyPrice && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Monthly:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {currencySymbol}{subscription.monthlyPrice}
                          </span>
                        </div>
                      )}
                      
                      {subscription.nextBillingAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Next billing:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(subscription.nextBillingAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {subscription.trialEndsAt && subscription.status === 'trial' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Trial ends:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(subscription.trialEndsAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No subscription found
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Second Row - Recent Patients List (same width as appointments) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Patients</CardTitle>
              <Link href={`/${getTenantSubdomain()}/patients`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <RecentPatientsList />
            </CardContent>
          </Card>
        </div>
      </div>

      
    </div>
  );
}