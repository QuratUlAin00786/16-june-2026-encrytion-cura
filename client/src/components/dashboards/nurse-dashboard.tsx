import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Heart, Pill, FileText, Stethoscope } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { isToday } from "date-fns";

export function NurseDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    // Auto-refresh for nurse role: poll every 10 seconds to get new dashboard stats
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
    // Keep previous data visible during refetch (prevents showing "--" during refetch)
    keepPreviousData: true,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/appointments"],
    // Auto-refresh for nurse role: poll every 10 seconds to get new appointments
    refetchInterval: 10000, // 10 seconds = 10000ms
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });

  const todayOwnAppointmentsCount = Array.isArray(appointmentsData)
    ? appointmentsData.filter((apt: any) => isToday(new Date(apt.scheduledAt)) && user?.id != null && apt.createdBy === user.id).length
    : 0;

  const nurseCards = [
    {
      title: "Assigned Patients",
      value: Math.floor((stats?.totalPatients || 0) * 0.6).toString(),
      description: "Under your care",
      icon: Users,
      href: "/patients",
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "Today's Appointments",
      value: String(todayOwnAppointmentsCount),
      description: "Appointments you booked for today",
      icon: Calendar,
      href: "/appointments",
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Vital Signs Due",
      // Only show "--" on initial load when no data exists yet, keep previous value during refetch
      value: isLoading && !stats ? "--" : "0",
      description: "Pending measurements",
      icon: Heart,
      href: "/patients",
      color: "bg-red-100 text-red-800"
    },
    {
      title: "Medication Admin",
      // Only show "--" on initial load when no data exists yet, keep previous value during refetch
      value: isLoading && !stats ? "--" : "0",
      description: "Scheduled today",
      icon: Pill,
      href: "/prescriptions",
      color: "bg-orange-100 text-orange-800"
    }
  ];

  const quickActions = [
    { title: "Patient Rounds", description: "Check on assigned patients", icon: Stethoscope, href: "/patients" },
    { title: "Medication Log", description: "Record medication administration", icon: Pill, href: "/prescriptions" },
    { title: "Voice Notes", description: "Record patient observations", icon: FileText, href: "/voice-documentation" },
    { title: "Care Plans", description: "Update patient care plans", icon: Heart, href: "/patients" }
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
        <h1 className="text-3xl font-bold text-gray-900">Nurse Dashboard</h1>
        <p className="text-neutral-600">
          Patient care coordination and clinical support
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {nurseCards.map((card) => (
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
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

      {/* Priority Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Tasks</CardTitle>
          <CardDescription>High-priority patient care items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
              <div className="flex items-center space-x-3">
                <Heart className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Vital Signs Check</p>
                  <p className="text-sm text-neutral-600">Room 205 - Sarah Johnson</p>
                </div>
              </div>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Urgent</span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50">
              <div className="flex items-center space-x-3">
                <Pill className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Medication Administration</p>
                  <p className="text-sm text-neutral-600">Room 103 - Robert Davis</p>
                </div>
              </div>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Due Soon</span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Care Plan Update</p>
                  <p className="text-sm text-neutral-600">Room 208 - Emily Watson</p>
                </div>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}