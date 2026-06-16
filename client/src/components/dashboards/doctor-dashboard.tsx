import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Brain, Stethoscope, Pill, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { isToday } from "date-fns";

function getTenantSubdomain(): string {
  return localStorage.getItem('user_subdomain') || 'demo';
}

export function DoctorDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    // Auto-refresh for doctor role: poll every 10 seconds to get new dashboard stats
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
    // Keep previous data visible during refetch (prevents showing "--" during refetch)
    keepPreviousData: true,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/appointments"],
    // Auto-refresh for doctor role: poll every 10 seconds to get new appointments
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });

  const { data: upcomingAppointments } = useQuery({
    queryKey: ["/api/appointments"],
    // Auto-refresh for doctor role: poll every 10 seconds to get new appointments
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
    select: (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Array.isArray(data) ? data.filter((apt: any) => {
        const aptDate = new Date(apt.scheduledAt);
        return aptDate >= today && (user?.id != null ? apt.providerId === user.id : true);
      }).sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) : [];
    }
  });

  const todayOwnAppointmentsCount = Array.isArray(appointmentsData)
    ? appointmentsData.filter((apt: any) => isToday(new Date(apt.scheduledAt)) && user?.id != null && apt.providerId === user.id).length
    : 0;

  // Fetch all patients for Total Patients count (no limit = API returns all)
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
      
      // No limit param: server returns all patients so count is accurate
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
    // Auto-refresh for doctor role: poll every 10 seconds to get new patients
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
    // Keep previous data visible during refetch (prevents showing "--" during refetch)
    keepPreviousData: true,
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
      
      // Fetch only active patients (is_active = true); no limit = all
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
    // Auto-refresh for doctor role: poll every 10 seconds to get new active patients
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
    // Keep previous data visible during refetch (prevents showing "--" during refetch)
    keepPreviousData: true,
  });

  const subdomain = getTenantSubdomain();
  
  const doctorCards = [
    {
      title: "Today's Appointments",
      value: String(todayOwnAppointmentsCount),
      description: "Your scheduled appointments today",
      icon: Calendar,
      href: `/${subdomain}/appointments`,
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "Total Patients",
      // Only show "--" on initial load when no data exists yet, keep previous value during refetch
      value: patientsLoading && !allPatients ? "--" : (Array.isArray(allPatients) ? allPatients.length.toString() : "0"),
      description: (patientsLoading && !allPatients) || (activePatientsLoading && !activePatients) ? "Loading..." : `${Array.isArray(allPatients) ? allPatients.length : 0} total patients • ${Array.isArray(activePatients) ? activePatients.length : 0} active patients`,
      icon: Users,
      href: `/${subdomain}/patients`,
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Medical Images",
      value: (stats && typeof stats === 'object' && 'aiSuggestions' in stats) ? String(stats.aiSuggestions) : "0",
      description: "New recommendations",
      icon: Brain,
      href: `/${subdomain}/imaging`,
      color: "bg-purple-100 text-purple-800"
    },
    {
      title: "Pending Prescriptions",
      // Only show "--" on initial load when no data exists yet, keep previous value during refetch
      value: isLoading && !stats ? "--" : "0",
      description: "Awaiting review",
      icon: Pill,
      href: `/${subdomain}/prescriptions`,
      color: "bg-orange-100 text-orange-800"
    }
  ];
  
  const quickActions = [
    { title: "New Consultation", description: "Start a patient consultation", icon: Stethoscope, href: `/${subdomain}/appointments` },
    { title: "Review Lab Results", description: "Check pending test results", icon: FileText, href: `/${subdomain}/lab-results` },
    { title: "AI Insights", description: "View clinical recommendations", icon: Brain, href: `/${subdomain}/clinical-decision-support` },
    { title: "Patient Records", description: "Access medical histories", icon: Users, href: `/${subdomain}/patients` }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {user?.role === "nurse" ? "Nurse Dashboard" : "Doctor Dashboard"}
        </h1>
        <p className="text-neutral-600">
          Clinical overview and patient management tools
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {doctorCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-neutral-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <action.icon className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={action.href}>
                  <Button className="w-full" variant="outline">Access</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <CardDescription>Your upcoming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.isArray(upcomingAppointments) && upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 3).map((appointment: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Patient Consultation</p>
                    <p className="text-sm text-neutral-600">
                      {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{appointment.title}</p>
                    <p className="text-xs text-neutral-500">{appointment.duration} min</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-neutral-500 text-center py-4">No appointments scheduled for today</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}