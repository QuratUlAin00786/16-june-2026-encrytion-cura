import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, Clock, User, Search, Filter, Plus, Activity } from "lucide-react";
import { format, isToday, isFuture } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentInvoiceInfo } from "./AppointmentInvoiceInfo";

const statusColors = {
  scheduled: "#4A7DFF",
  completed: "#6CFFEB", 
  cancelled: "#162B61",
  no_show: "#9B9EAF"
};

function staffAppointmentStatusBadgeStyle(status: string | undefined): React.CSSProperties {
  const norm = String(status || "scheduled")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  const bg =
    statusColors[norm as keyof typeof statusColors] ?? statusColors.scheduled;
  return {
    backgroundColor: bg,
    color: norm === "completed" ? "#000000" : "#ffffff",
  };
}

const priorityColors = {
  high: "#EF4444",
  medium: "#F59E0B", 
  low: "#10B981"
};

export default function NurseAppointments({ onNewAppointment }: { onNewAppointment?: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const { user } = useAuth();

  // Fetch appointments
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    // Auto-refresh for nurse role: poll every 10 seconds to get new appointments
    refetchInterval: user?.role === "nurse" ? 10000 : false, // 10 seconds = 10000ms
    refetchIntervalInBackground: user?.role === "nurse", // Continue polling even when tab is in background
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      return data;
    },
  });

  // Fetch users for doctor names
  const { data: usersData } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
  });

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
  });

  const rawAppointments = appointmentsData || [];
  // Nurses see only appointments they themselves booked
  const appointments =
    user?.role === "nurse" && user?.id
      ? rawAppointments.filter((apt: any) => apt.createdBy === user.id)
      : rawAppointments;

  const getDoctorName = (providerId: number) => {
    if (!usersData || !Array.isArray(usersData)) return `Dr. Provider ${providerId}`;
    const provider = usersData.find((u: any) => u.id === providerId);
    return provider ? `Dr. ${provider.firstName} ${provider.lastName}` : `Dr. Provider ${providerId}`;
  };

  const getPatientName = (patientId: number) => {
    if (!patientsData || !Array.isArray(patientsData)) return "Patient not found";
    const patient = patientsData.find((p: any) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : "Patient not found";
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, "h:mm a");
    } catch {
      return "Invalid time";
    }
  };

  const formatDate = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Priority logic for nurse triage
  const getAppointmentPriority = (appointment: any) => {
    const appointmentDate = new Date(appointment.scheduledAt);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (isToday(appointmentDate) && hoursUntil <= 2) return "high";
    if (isToday(appointmentDate) || hoursUntil <= 24) return "medium";
    return "low";
  };

  const filteredAppointments = appointments.filter((apt: any) => {
    const matchesSearch = searchTerm === "" || 
      getPatientName(apt.patientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDoctorName(apt.providerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const todayAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.scheduledAt);
    return isToday(appointmentDate);
  });

  const upcomingAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.scheduledAt);
    return isFuture(appointmentDate) || isToday(appointmentDate);
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="nurse-appointments-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Heart className="h-6 w-6 text-red-500" />
          <div>
            <h2 className="text-2xl font-bold text-blue-800">Patient Care Management</h2>
            <p className="text-gray-600">Nurse {user?.firstName} {user?.lastName}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List View
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            Grid View
          </Button>
          <Button 
            onClick={() => onNewAppointment?.()}
            className="flex items-center gap-2"
            data-testid="button-schedule-appointment"
          >
            <Plus className="h-3 w-3" />
            Schedule Care
          </Button>
        </div>
      </div>

      {/* Today's Priority Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700">High Priority Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {todayAppointments.filter(apt => getAppointmentPriority(apt) === "high").length}
            </div>
            <p className="text-xs text-red-600">Immediate attention needed</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700">Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {todayAppointments.length}
            </div>
            <p className="text-xs text-yellow-600">Total patients today</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700">Upcoming Care</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {upcomingAppointments.length}
            </div>
            <p className="text-xs text-blue-600">Future appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search patients, doctors, or appointment types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Appointments Display */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
        {filteredAppointments.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No appointments found</h3>
              <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments
            .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map((appointment: any) => {
              const priority = getAppointmentPriority(appointment);
              const appointmentDate = new Date(appointment.scheduledAt);
              const isTodays = isToday(appointmentDate);
              
              return (
                <Card 
                  key={appointment.id} 
                  className={`border-l-4 ${isTodays ? 'bg-yellow-50 border-yellow-200' : ''} ${priority === 'high' ? 'ring-2 ring-red-200' : ''}`}
                  style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                  data-testid={`appointment-${appointment.id}`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header with priority badge */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate">{appointment.title}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            style={{ backgroundColor: priorityColors[priority as keyof typeof priorityColors] }}
                            className="text-white text-xs"
                          >
                            {priority.toUpperCase()}
                          </Badge>
                          <Badge 
                            className="text-xs"
                            style={staffAppointmentStatusBadgeStyle(appointment.status)}
                          >
                            {appointment.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {/* Patient and Doctor Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-700">
                            {getPatientName(appointment.patientId)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{getDoctorName(appointment.providerId)}</span>
                        </div>
                      </div>

                      {/* Time and Date */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(appointment.scheduledAt)}</span>
                        </div>
                        <span className="font-medium">{formatTime(appointment.scheduledAt)}</span>
                      </div>

                      {/* Appointment ID (e.g. APT1770784119025P125AUTO) and Invoice for doctor/nurse */}
                      {(appointment.appointmentId || (appointment as any).appointment_id) && (
                        <div className="space-y-1.5">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                          >
                            {appointment.appointmentId ?? (appointment as any).appointment_id}
                          </Badge>
                          <AppointmentInvoiceInfo appointmentId={appointment.appointmentId ?? (appointment as any).appointment_id} />
                        </div>
                      )}

                      {/* Description if available */}
                      {appointment.description && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {appointment.description.length > 100 
                            ? `${appointment.description.substring(0, 100)}...` 
                            : appointment.description
                          }
                        </p>
                      )}

                      {/* Nursing Notes Section */}
                      {viewMode === "list" && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-gray-500">
                            Type: {appointment.type}
                          </span>
                          {isTodays && (
                            <Button size="sm" variant="outline" className="text-xs">
                              Add Care Notes
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>

      {/* Patient Care Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Care Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredAppointments.filter(apt => getAppointmentPriority(apt) === "high").length}
              </div>
              <div className="text-sm text-gray-500">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {todayAppointments.length}
              </div>
              <div className="text-sm text-gray-500">Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredAppointments.filter((apt: any) => apt.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {filteredAppointments.length}
              </div>
              <div className="text-sm text-gray-500">Total Filtered</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}