import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, Clock, User, Search, Filter, Plus, 
  Calendar, BarChart3, Users, Phone, Mail, MapPin 
} from "lucide-react";
import { format, isToday, isFuture, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { isDoctorLike } from "@/lib/role-utils";

const statusColors = {
  scheduled: "#4A7DFF",
  completed: "#6CFFEB", 
  cancelled: "#162B61",
  no_show: "#9B9EAF"
};

export default function HRAppointments({ onNewAppointment }: { onNewAppointment?: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();

  // Fetch appointments
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    refetchInterval: 60000,
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

  const appointments = appointmentsData || [];
  const users = usersData || [];
  const patients = patientsData || [];

  const doctors = users.filter((user: any) => isDoctorLike(user.role));

  const getDoctorName = (providerId: number) => {
    const provider = users.find((u: any) => u.id === providerId);
    return provider ? `Dr. ${provider.firstName} ${provider.lastName}` : `Dr. Provider ${providerId}`;
  };

  const getPatientName = (patientId: number) => {
    const patient = patients.find((p: any) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : "Patient not found";
  };

  const getPatientContact = (patientId: number) => {
    const patient = patients.find((p: any) => p.id === patientId);
    return patient ? {
      phone: patient.phone || 'N/A',
      email: patient.email || 'N/A'
    } : { phone: 'N/A', email: 'N/A' };
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

  const filteredAppointments = appointments.filter((apt: any) => {
    const matchesSearch = searchTerm === "" || 
      getPatientName(apt.patientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDoctorName(apt.providerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDoctor = selectedDoctor === "all" || apt.providerId.toString() === selectedDoctor;
    
    return matchesSearch && matchesDoctor;
  });

  const todayAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.scheduledAt);
    return isToday(appointmentDate);
  });

  const upcomingAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.scheduledAt);
    return isFuture(appointmentDate) || isToday(appointmentDate);
  });

  // Weekly schedule for calendar view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt: any) => {
      const appointmentDate = new Date(apt.scheduledAt);
      return appointmentDate.toDateString() === date.toDateString();
    });
  };

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
    <div className="space-y-6" data-testid="hr-appointments-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Settings className="h-6 w-6 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-blue-800">Appointment Management</h2>
            <p className="text-gray-600">{user?.firstName} {user?.lastName} - HR/Reception</p>
          </div>
        </div>
        <Button 
          onClick={() => onNewAppointment?.()}
          className="flex items-center gap-2"
          data-testid="button-manage-appointments"
        >
          <Plus className="h-3 w-3" />
          Book Appointment
        </Button>
      </div>

      {/* Dashboard Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayAppointments.length}</div>
            <p className="text-xs text-blue-600">
              {todayAppointments.filter(apt => apt.status === 'scheduled').length} scheduled
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {appointments.filter((apt: any) => apt.status === 'completed').length}
            </div>
            <p className="text-xs text-green-600">This period</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{upcomingAppointments.length}</div>
            <p className="text-xs text-yellow-600">Future appointments</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700">Cancellations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {appointments.filter((apt: any) => apt.status === 'cancelled' || apt.status === 'no_show').length}
            </div>
            <p className="text-xs text-red-600">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search patients, doctors, or appointment details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select 
                value={selectedDoctor} 
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm min-w-[150px]"
              >
                <option value="all">All Doctors</option>
                {doctors.map((doctor: any) => (
                  <option key={doctor.id} value={doctor.id.toString()}>
                    Dr. {doctor.firstName} {doctor.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No appointments found</h3>
                  <p className="text-gray-400">Try adjusting your search criteria.</p>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments
                .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map((appointment: any) => {
                  const appointmentDate = new Date(appointment.scheduledAt);
                  const isTodays = isToday(appointmentDate);
                  const contact = getPatientContact(appointment.patientId);
                  
                  return (
                    <Card 
                      key={appointment.id} 
                      className={`border-l-4 ${isTodays ? 'bg-yellow-50 border-yellow-200' : ''}`}
                      style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                      data-testid={`appointment-${appointment.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Appointment Details */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">{appointment.title}</h3>
                              <Badge 
                                style={{ backgroundColor: statusColors[appointment.status as keyof typeof statusColors] }}
                                className="text-white"
                              >
                                {appointment.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{formatDate(appointment.scheduledAt)} at {formatTime(appointment.scheduledAt)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{getDoctorName(appointment.providerId)}</span>
                            </div>
                          </div>

                          {/* Patient Information */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-blue-800">Patient Details</h4>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">{getPatientName(appointment.patientId)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{contact.phone}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{contact.email}</span>
                              </div>
                            </div>
                          </div>

                          {/* Appointment Management */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-purple-800">Management</h4>
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="font-medium">Type:</span> {appointment.type}
                              </div>
                              {appointment.location && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">{appointment.location}</span>
                                </div>
                              )}
                              {appointment.description && (
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  {appointment.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Weekly Schedule</h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
              >
                Previous Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
              >
                Next Week
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isTodays = isToday(day);
              
              return (
                <Card 
                  key={day.toString()} 
                  className={`h-64 ${isTodays ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {format(day, "EEE")}
                      <br />
                      <span className={`text-lg ${isTodays ? 'text-blue-800 dark:text-blue-200 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
                        {format(day, "d")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment: any) => (
                      <div
                        key={appointment.id}
                        className="p-2 rounded text-xs border-l-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
                        style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                      >
                        <div className="font-medium truncate text-gray-900 dark:text-gray-100">{formatTime(appointment.scheduledAt)}</div>
                        <div className="text-gray-600 dark:text-gray-300 truncate">{getPatientName(appointment.patientId)}</div>
                        <div className="text-gray-500 dark:text-gray-400 truncate">{getDoctorName(appointment.providerId)}</div>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Appointment Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{appointments.length}</div>
                  <div className="text-sm text-gray-500">Total Appointments</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round((appointments.filter((apt: any) => apt.status === 'completed').length / appointments.length) * 100) || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Completion Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {appointments.filter((apt: any) => apt.status === 'no_show').length}
                  </div>
                  <div className="text-sm text-gray-500">No Shows</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{doctors.length}</div>
                  <div className="text-sm text-gray-500">Active Doctors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Doctor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {doctors.map((doctor: any) => {
                  const doctorAppointments = appointments.filter((apt: any) => apt.providerId === doctor.id);
                  const completed = doctorAppointments.filter((apt: any) => apt.status === 'completed').length;
                  const completionRate = doctorAppointments.length > 0 ? (completed / doctorAppointments.length) * 100 : 0;
                  
                  return (
                    <div key={doctor.id} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center space-x-4">
                        <Users className="h-8 w-8 text-blue-500" />
                        <div>
                          <div className="font-medium">Dr. {doctor.firstName} {doctor.lastName}</div>
                          <div className="text-sm text-gray-500">{doctor.department || 'General Practice'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{doctorAppointments.length}</div>
                        <div className="text-sm text-gray-500">{Math.round(completionRate)}% completion</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}