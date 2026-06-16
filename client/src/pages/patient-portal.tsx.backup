import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar,
  Clock,
  FileText,
  Download,
  MessageSquare,
  Bell,
  User,
  Heart,
  Pill,
  TestTube,
  Stethoscope,
  Plus,
  Edit,
  Upload,
  Shield,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Eye
} from "lucide-react";
import { format, addDays } from "date-fns";

interface PatientPortalData {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    nhsNumber: string;
    address: {
      street: string;
      city: string;
      postcode: string;
    };
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  upcomingAppointments: Array<{
    id: string;
    date: string;
    time: string;
    provider: string;
    type: string;
    location: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }>;
  recentVisits: Array<{
    id: string;
    date: string;
    provider: string;
    type: string;
    summary: string;
    documents: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    prescribedBy: string;
    prescribedDate: string;
    refillsRemaining: number;
    status: 'active' | 'discontinued' | 'completed';
  }>;
  labResults: Array<{
    id: string;
    testName: string;
    date: string;
    status: 'completed' | 'pending' | 'in_progress';
    results?: Array<{
      parameter: string;
      value: string;
      unit: string;
      range: string;
      flag?: 'high' | 'low' | 'critical';
    }>;
  }>;
  messages: Array<{
    id: string;
    from: string;
    subject: string;
    date: string;
    read: boolean;
    priority: 'normal' | 'high' | 'urgent';
  }>;
  forms: Array<{
    id: string;
    title: string;
    description: string;
    dueDate?: string;
    status: 'pending' | 'completed' | 'overdue';
    type: 'pre_visit' | 'follow_up' | 'survey' | 'consent';
  }>;
}

const mockPortalData: PatientPortalData = {
  patient: {
    id: "p_001",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "+44 20 7946 0958",
    dateOfBirth: "1985-03-15",
    nhsNumber: "485 777 3456",
    address: {
      street: "123 High Street",
      city: "London",
      postcode: "SW1A 1AA"
    },
    emergencyContact: {
      name: "John Johnson",
      relationship: "Spouse",
      phone: "+44 20 7946 0959"
    }
  },
  upcomingAppointments: [
    {
      id: "apt_001",
      date: "2024-01-25",
      time: "14:30",
      provider: "Dr. Sarah Smith",
      type: "Annual Check-up",
      location: "Main Clinic - Room 203",
      status: "confirmed"
    },
    {
      id: "apt_002",
      date: "2024-02-10",
      time: "10:00",
      provider: "Dr. Michael Chen",
      type: "Follow-up",
      location: "Cardiology Wing - Room 105",
      status: "pending"
    }
  ],
  recentVisits: [
    {
      id: "visit_001",
      date: "2024-01-10",
      provider: "Dr. Sarah Smith",
      type: "Consultation",
      summary: "Routine check-up. Blood pressure slightly elevated. Recommended lifestyle changes.",
      documents: [
        { id: "doc_001", name: "Visit Summary", type: "pdf" },
        { id: "doc_002", name: "Lab Order", type: "pdf" }
      ]
    }
  ],
  medications: [
    {
      id: "med_001",
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      prescribedBy: "Dr. Sarah Smith",
      prescribedDate: "2024-01-10",
      refillsRemaining: 2,
      status: "active"
    },
    {
      id: "med_002",
      name: "Vitamin D3",
      dosage: "1000 IU",
      frequency: "Once daily",
      prescribedBy: "Dr. Sarah Smith",
      prescribedDate: "2024-01-10",
      refillsRemaining: 5,
      status: "active"
    }
  ],
  labResults: [
    {
      id: "lab_001",
      testName: "Complete Blood Count",
      date: "2024-01-12",
      status: "completed",
      results: [
        { parameter: "Hemoglobin", value: "13.5", unit: "g/dL", range: "12.0-15.5" },
        { parameter: "White Blood Cells", value: "7.2", unit: "K/uL", range: "4.5-11.0" },
        { parameter: "Platelets", value: "250", unit: "K/uL", range: "150-450" }
      ]
    },
    {
      id: "lab_002",
      testName: "Lipid Panel",
      date: "2024-01-15",
      status: "pending"
    }
  ],
  messages: [
    {
      id: "msg_001",
      from: "Dr. Sarah Smith",
      subject: "Follow-up on recent visit",
      date: "2024-01-15",
      read: false,
      priority: "normal"
    },
    {
      id: "msg_002",
      from: "Clinic Nurse",
      subject: "Upcoming appointment reminder",
      date: "2024-01-14",
      read: true,
      priority: "normal"
    }
  ],
  forms: [
    {
      id: "form_001",
      title: "Pre-Visit Health Assessment",
      description: "Please complete before your upcoming appointment on January 25th",
      dueDate: "2024-01-24",
      status: "pending",
      type: "pre_visit"
    },
    {
      id: "form_002",
      title: "Patient Satisfaction Survey",
      description: "Help us improve our services",
      status: "pending",
      type: "survey"
    }
  ]
};

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  const { data: portalData = mockPortalData, isLoading } = useQuery({
    queryKey: ["/api/patient/portal"],
    enabled: true,
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/portal"] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch('/api/patient/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/portal"] });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'overdue': return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'discontinued': return <Badge className="bg-gray-100 text-gray-800">Discontinued</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Avatar>
                <AvatarFallback>
                  {(portalData as any)?.patient?.firstName?.[0] || 'P'}{(portalData as any)?.patient?.lastName?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="results">Lab Results</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Welcome Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Welcome back, {(portalData as any)?.patient?.firstName || 'Patient'}!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{(portalData as any)?.upcomingAppointments?.length || 0}</div>
                    <div className="text-sm text-gray-600">Upcoming Appointments</div>
                  </div>
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">
                      {((portalData as any)?.messages || []).filter((m: any) => !m.read).length}
                    </div>
                    <div className="text-sm text-gray-600">Unread Messages</div>
                  </div>
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">
                      {((portalData as any)?.forms || []).filter((f: any) => f.status === 'pending').length}
                    </div>
                    <div className="text-sm text-gray-600">Pending Forms</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button className="h-auto flex-col p-4" onClick={() => setActiveTab("appointments")}>
                    <Calendar className="h-6 w-6 mb-2" />
                    Book Appointment
                  </Button>
                  <Button variant="outline" className="h-auto flex-col p-4" onClick={() => setActiveTab("messages")}>
                    <MessageSquare className="h-6 w-6 mb-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="h-auto flex-col p-4" onClick={() => setActiveTab("forms")}>
                    <FileText className="h-6 w-6 mb-2" />
                    Complete Forms
                  </Button>
                  <Button variant="outline" className="h-auto flex-col p-4" onClick={() => setActiveTab("results")}>
                    <TestTube className="h-6 w-6 mb-2" />
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Next Appointment</CardTitle>
                </CardHeader>
                <CardContent>
                  {((portalData as any)?.upcomingAppointments?.length || 0) > 0 ? (
                    <div className="space-y-3">
                      {((portalData as any)?.upcomingAppointments || []).slice(0, 2).map((appointment: any) => (
                        <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{appointment.type}</div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(appointment.date), 'MMM d, yyyy')} at {appointment.time}
                            </div>
                            <div className="text-sm text-gray-600">{appointment.provider}</div>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                      ))}
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab("appointments")}>
                        View All Appointments
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No upcoming appointments</p>
                      <Button className="mt-2" onClick={() => setActiveTab("appointments")}>
                        Book Appointment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Messages</CardTitle>
                </CardHeader>
                <CardContent>
                  {((portalData as any)?.)messages.length > 0 ? (
                    <div className="space-y-3">
                      {((portalData as any)?.)messages.slice(0, 3).map((message: any) => (
                        <div key={message.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`font-medium ${!message.read ? 'text-blue-600' : ''}`}>
                                {message.subject}
                              </div>
                              {getPriorityIcon(message.priority)}
                            </div>
                            <div className="text-sm text-gray-600">{message.from}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(message.date), 'MMM d, yyyy')}
                            </div>
                          </div>
                          {!message.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab("messages")}>
                        View All Messages
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent messages</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Appointments</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Book New Appointment
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {((portalData as any)?.)upcomingAppointments.map((appointment: any) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{appointment.type}</h3>
                          <p className="text-gray-600">{appointment.provider}</p>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(appointment.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {appointment.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {appointment.location}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Reschedule
                        </Button>
                        <Button variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Book New Appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Appointment Type</label>
                    <select className="w-full mt-1 p-2 border rounded-md">
                      <option>General Consultation</option>
                      <option>Follow-up</option>
                      <option>Annual Check-up</option>
                      <option>Specialist Referral</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Preferred Provider</label>
                    <select className="w-full mt-1 p-2 border rounded-md">
                      <option>Dr. Sarah Smith</option>
                      <option>Dr. Michael Chen</option>
                      <option>Dr. Emma Wilson</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Preferred Date</label>
                    <Input type="date" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reason for Visit</label>
                    <textarea 
                      className="w-full mt-1 p-2 border rounded-md"
                      rows={3}
                      placeholder="Brief description of your concern..."
                    />
                  </div>
                  <Button className="w-full">Request Appointment</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="medications" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Medications</h2>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download List
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {((portalData as any)?.)medications.map((medication: any) => (
                    <div key={medication.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{medication.name}</h3>
                          <p className="text-gray-600">{medication.dosage} - {medication.frequency}</p>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>Prescribed by: {medication.prescribedBy}</p>
                            <p>Prescribed: {format(new Date(medication.prescribedDate), 'MMM d, yyyy')}</p>
                            <p>Refills remaining: {medication.refillsRemaining}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(medication.status)}
                          <Button variant="outline" size="sm">
                            <Pill className="h-4 w-4 mr-2" />
                            Request Refill
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Lab Results</h2>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>

            <div className="space-y-4">
              {((portalData as any)?.)labResults.map((result: any) => (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5" />
                        {result.testName}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result.status)}
                        <span className="text-sm text-gray-600">
                          {format(new Date(result.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  {result.results && (
                    <CardContent>
                      <div className="space-y-2">
                        {result.results.map((item: any) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-medium">{item.parameter}</span>
                            <div className="text-right">
                              <span className={`font-semibold ${item.flag ? 'text-red-600' : ''}`}>
                                {item.value} {item.unit}
                              </span>
                              <div className="text-xs text-gray-600">Range: {item.range}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full mt-4">
                        <Download className="h-4 w-4 mr-2" />
                        Download Full Report
                      </Button>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Messages</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>

            <div className="space-y-4">
              {((portalData as any)?.)messages.map((message: any) => (
                <Card key={message.id} className={!message.read ? 'border-blue-200 bg-blue-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${!message.read ? 'text-blue-900' : ''}`}>
                            {message.subject}
                          </h3>
                          {getPriorityIcon(message.priority)}
                          {!message.read && (
                            <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">From: {message.from}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(message.date), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Reply</Button>
                        <Button variant="outline" size="sm">Archive</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Forms & Surveys</h2>
            </div>

            <div className="space-y-4">
              {((portalData as any)?.)forms.map((form: any) => (
                <Card key={form.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{form.title}</h3>
                        <p className="text-gray-600 mb-2">{form.description}</p>
                        {form.dueDate && (
                          <p className="text-sm text-gray-500">
                            Due: {format(new Date(form.dueDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(form.status)}
                        {form.status === 'pending' ? (
                          <Button>Complete Form</Button>
                        ) : (
                          <Button variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View Submission
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-bold">My Profile</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">First Name</label>
                      <Input value={((portalData as any)?.)patient.firstName} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Name</label>
                      <Input value={((portalData as any)?.)patient.lastName} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input value={((portalData as any)?.)patient.email} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input value={((portalData as any)?.)patient.phone} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input type="date" value={((portalData as any)?.)patient.dateOfBirth} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">NHS Number</label>
                    <Input value={((portalData as any)?.)patient.nhsNumber} disabled />
                  </div>
                  <Button>Update Information</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Address & Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Street Address</label>
                    <Input value={((portalData as any)?.)patient.address.street} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input value={((portalData as any)?.)patient.address.city} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Postcode</label>
                      <Input value={((portalData as any)?.)patient.address.postcode} />
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-6">
                    <h4 className="font-medium mb-3">Emergency Contact</h4>
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input value={((portalData as any)?.)patient.emergencyContact.name} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="text-sm font-medium">Relationship</label>
                        <Input value={((portalData as any)?.)patient.emergencyContact.relationship} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={((portalData as any)?.)patient.emergencyContact.phone} />
                      </div>
                    </div>
                  </div>
                  
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}