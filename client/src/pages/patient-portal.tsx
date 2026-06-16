import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertCircle,
  Phone,
  MapPin,
  Eye,
  BookOpen,
  Activity,
  Star,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import AIChatbot from "@/components/ai-chatbot";

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
    id: "1",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "+44 7700 900123",
    dateOfBirth: "1985-03-15",
    nhsNumber: "485 777 3456",
    address: {
      street: "123 Oak Street",
      city: "London",
      postcode: "SW1A 1AA"
    },
    emergencyContact: {
      name: "John Johnson",
      relationship: "Spouse",
      phone: "+44 7700 900124"
    }
  },
  upcomingAppointments: [
    {
      id: "1",
      date: "2024-06-30",
      time: "10:00",
      provider: "Dr. Smith",
      type: "Annual Check-up",
      location: "Main Clinic",
      status: "confirmed"
    },
    {
      id: "2",
      date: "2024-07-15",
      time: "14:30",
      provider: "Dr. Brown",
      type: "Follow-up",
      location: "Cardiology Unit",
      status: "pending"
    }
  ],
  recentVisits: [
    {
      id: "1",
      date: "2024-06-15",
      provider: "Dr. Wilson",
      type: "Consultation",
      summary: "Routine check-up, all vitals normal",
      documents: [
        { id: "1", name: "Visit Summary", type: "PDF" },
        { id: "2", name: "Prescription", type: "PDF" }
      ]
    }
  ],
  medications: [
    {
      id: "1",
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      prescribedBy: "Dr. Smith",
      prescribedDate: "2024-06-01",
      refillsRemaining: 2,
      status: "active"
    }
  ],
  labResults: [
    {
      id: "1",
      testName: "Complete Blood Count",
      date: "2024-06-10",
      status: "completed",
      results: [
        { parameter: "Hemoglobin", value: "14.2", unit: "g/dL", range: "12.0-15.5" },
        { parameter: "White Blood Cells", value: "7.5", unit: "K/μL", range: "4.5-11.0" }
      ]
    }
  ],
  messages: [
    {
      id: "1",
      from: "Dr. Smith's Office",
      subject: "Appointment Reminder",
      date: "2024-06-25",
      read: false,
      priority: "normal"
    }
  ],
  forms: [
    {
      id: "1",
      title: "Pre-Visit Questionnaire",
      description: "Please complete before your next appointment",
      dueDate: "2024-06-29",
      status: "pending",
      type: "pre_visit"
    }
  ]
};

export default function PatientPortal() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const { data: portalData = mockPortalData, isLoading } = useQuery({
    queryKey: ['/api/patient-portal'],
  });

  // Type-safe data access
  const portal = portalData as PatientPortalData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const TabButton = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === id 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto overflow-y-auto max-h-screen page-zoom-90">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Portal</h1>
              <p className="text-gray-600 mt-1">Manage your health information and appointments</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-2">
                  <h4 className="font-semibold text-sm mb-2">Recent Notifications</h4>
                  <div className="space-y-2">
                    <div className="p-2 text-xs bg-blue-50 rounded">
                      <div className="font-medium">Appointment Reminder</div>
                      <div className="text-gray-600">Your appointment with Dr. Smith is tomorrow at 2:00 PM</div>
                    </div>
                    <div className="p-2 text-xs bg-green-50 rounded">
                      <div className="font-medium">Lab Results Available</div>
                      <div className="text-gray-600">Your recent blood work results are now available</div>
                    </div>
                    <div className="p-2 text-xs bg-yellow-50 rounded">
                      <div className="font-medium">Prescription Refill</div>
                      <div className="text-gray-600">Your prescription for Lisinopril needs to be refilled</div>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem className="text-xs" onClick={() => setShowAllNotifications(true)}>
                    View All Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs">
                    Mark All as Read
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Avatar>
              <AvatarFallback>
                {portal.patient.firstName[0]}{portal.patient.lastName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto">
        <TabButton id="overview" label="Overview" icon={User} />
        <TabButton id="appointments" label="Appointments" icon={Calendar} />
        <TabButton id="medications" label="Medications" icon={Pill} />
        <TabButton id="lab-results" label="Lab Results" icon={TestTube} />
        <TabButton id="messages" label="Messages" icon={MessageSquare} />
        <TabButton id="forms" label="Forms" icon={FileText} />
        <TabButton id="profile" label="Profile" icon={Shield} />
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Welcome back, {portal.patient.firstName}!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{portal.upcomingAppointments.length}</div>
                  <div className="text-sm text-gray-600">Upcoming Appointments</div>
                </div>
                <div className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">
                    {portal.messages.filter((m: any) => !m.read).length}
                  </div>
                  <div className="text-sm text-gray-600">Unread Messages</div>
                </div>
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">
                    {portal.forms.filter((f: any) => f.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending Forms</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-24 flex-col gap-2" variant="outline" onClick={() => window.location.href = "/appointments"}>
              <Calendar className="h-6 w-6" />
              <span>Book Appointment</span>
            </Button>
            <Button className="h-24 flex-col gap-2" variant="outline" onClick={() => window.location.href = "/messaging"}>
              <MessageSquare className="h-6 w-6" />
              <span>Message Provider</span>
            </Button>
            <Button className="h-24 flex-col gap-2" variant="outline" onClick={() => window.location.href = "/lab-results"}>
              <TestTube className="h-6 w-6" />
              <span>View Lab Results</span>
            </Button>
            <Button className="h-24 flex-col gap-2" variant="outline" onClick={() => {
              const link = document.createElement('a');
              link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`MEDICAL RECORDS - ${portal.patient.firstName} ${portal.patient.lastName}\n\nPatient Information:\nName: ${portal.patient.firstName} ${portal.patient.lastName}\nNHS Number: ${portal.patient.nhsNumber}\nDate of Birth: ${portal.patient.dateOfBirth}\nEmail: ${portal.patient.email}\nPhone: ${portal.patient.phone}\n\nAddress:\n${portal.patient.address.street}\n${portal.patient.address.city}\n${portal.patient.address.postcode}\n\nEmergency Contact:\nName: ${portal.patient.emergencyContact.name}\nRelationship: ${portal.patient.emergencyContact.relationship}\nPhone: ${portal.patient.emergencyContact.phone}\n\nGenerated on: ${new Date().toLocaleDateString()}`);
              link.download = `medical-records-${portal.patient.firstName}-${portal.patient.lastName}.txt`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              <Download className="h-6 w-6" />
              <span>Download Records</span>
            </Button>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Next Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                {portal.upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {portal.upcomingAppointments.slice(0, 2).map((appointment: any) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{appointment.type}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(appointment.date), 'MMM d, yyyy')} at {appointment.time}
                          </div>
                          <div className="text-sm text-gray-600">{appointment.provider}</div>
                        </div>
                        <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No upcoming appointments</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {portal.messages.length > 0 ? (
                  <div className="space-y-3">
                    {portal.messages.slice(0, 3).map((message: any) => (
                      <div key={message.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{message.from}</div>
                            {!message.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          </div>
                          <div className="text-sm text-gray-600">{message.subject}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(message.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No messages</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Appointments</h2>
            <Button onClick={() => window.location.href = "/appointments"}>
              <Plus className="h-4 w-4 mr-2" />
              Book New Appointment
            </Button>
          </div>

          <div className="grid gap-4">
            {portal.upcomingAppointments.map((appointment: any) => (
              <Card key={appointment.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Stethoscope className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{appointment.type}</h3>
                        <p className="text-gray-600">{appointment.provider}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(appointment.date), 'EEEE, MMMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {appointment.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {appointment.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}>
                        {appointment.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "medications" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Medications</h2>
            <Button variant="outline" onClick={() => {
              const medicationsList = portal.medications.map(med => `${med.name} - ${med.dosage} - ${med.frequency} (Prescribed by ${med.prescribedBy}, Refills: ${med.refillsRemaining})`).join('\n');
              const content = `MEDICATIONS LIST - ${portal.patient.firstName} ${portal.patient.lastName}\n\nPatient: ${portal.patient.firstName} ${portal.patient.lastName}\nNHS Number: ${portal.patient.nhsNumber}\nGenerated: ${new Date().toLocaleDateString()}\n\nCurrent Medications:\n${medicationsList}`;
              const link = document.createElement('a');
              link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
              link.download = `medications-list-${portal.patient.firstName}-${portal.patient.lastName}.txt`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download List
            </Button>
          </div>

          <div className="grid gap-4">
            {portal.medications.map((medication: any) => (
              <Card key={medication.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Pill className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{medication.name}</h3>
                        <p className="text-gray-600">{medication.dosage} - {medication.frequency}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>Prescribed by {medication.prescribedBy}</span>
                          <span>Refills: {medication.refillsRemaining}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={medication.status === 'active' ? 'default' : 'secondary'}>
                        {medication.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => {
                        alert(`Refill request submitted for ${medication.name}. Your pharmacy will be contacted within 24 hours.`);
                      }}>
                        Request Refill
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "lab-results" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Lab Results</h2>
            <Button variant="outline" onClick={() => {
              const labResultsList = portal.labResults.map(result => `${result.testName} - ${format(new Date(result.date), 'MMMM d, yyyy')}\nStatus: ${result.status}\nResults: ${result.results ? Object.entries(result.results).map(([key, value]) => `${key}: ${value}`).join(', ') : 'N/A'}\n`).join('\n');
              const content = `LAB RESULTS - ${portal.patient.firstName} ${portal.patient.lastName}\n\nPatient: ${portal.patient.firstName} ${portal.patient.lastName}\nNHS Number: ${portal.patient.nhsNumber}\nGenerated: ${new Date().toLocaleDateString()}\n\nLab Results:\n${labResultsList}`;
              const link = document.createElement('a');
              link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
              link.download = `lab-results-${portal.patient.firstName}-${portal.patient.lastName}.txt`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>

          <div className="space-y-4">
            {portal.labResults.map((result: any) => (
              <Card key={result.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{result.testName}</CardTitle>
                      <p className="text-gray-600">{format(new Date(result.date), 'MMMM d, yyyy')}</p>
                    </div>
                    <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
                      {result.status}
                    </Badge>
                  </div>
                </CardHeader>
                {result.results && (
                  <CardContent>
                    <div className="space-y-2">
                      {result.results.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{item.parameter}</div>
                            <div className="text-sm text-gray-600">Range: {item.range}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{item.value} {item.unit}</div>
                            {item.flag && (
                              <Badge variant={item.flag === 'critical' ? 'destructive' : 'secondary'}>
                                {item.flag}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "messages" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Messages</h2>
            <Button onClick={() => window.location.href = "/messaging"}>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>

          <div className="space-y-4">
            {portal.messages.map((message: any) => (
              <Card key={message.id} className={!message.read ? "border-blue-200 bg-blue-50" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{message.from}</h3>
                          {!message.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          <Badge variant={message.priority === 'urgent' ? 'destructive' : 'secondary'}>
                            {message.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-900 mt-1">{message.subject}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {format(new Date(message.date), 'MMMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "forms" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Forms & Questionnaires</h2>
          </div>

          <div className="space-y-4">
            {portal.forms.map((form: any) => (
              <Card key={form.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{form.title}</h3>
                        <p className="text-gray-600">{form.description}</p>
                        {form.dueDate && (
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {format(new Date(form.dueDate), 'MMMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={form.status === 'pending' ? 'destructive' : 'default'}>
                        {form.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        {form.status === 'pending' ? 'Complete' : 'View'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Profile</h2>
            <Button onClick={() => {
              if (isEditing) {
                // Save changes
                alert('Profile changes saved successfully!');
              }
              setIsEditing(!isEditing);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <Input 
                      value={portal.patient.firstName} 
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <Input 
                      value={portal.patient.lastName} 
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input 
                    value={portal.patient.email} 
                    readOnly={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input 
                    value={portal.patient.phone} 
                    readOnly={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <Input 
                    type="date"
                    value={portal.patient.dateOfBirth} 
                    readOnly={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">NHS Number</label>
                  <Input 
                    value={portal.patient.nhsNumber} 
                    readOnly={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address & Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Address & Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Street Address</label>
                  <Input 
                    value={portal.patient.address.street} 
                    readOnly={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <Input 
                      value={portal.patient.address.city} 
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Postcode</label>
                    <Input 
                      value={portal.patient.address.postcode} 
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Emergency Contact</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input 
                        value={portal.patient.emergencyContact.name} 
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Relationship</label>
                      <Input 
                        value={portal.patient.emergencyContact.relationship} 
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <Input 
                        value={portal.patient.emergencyContact.phone} 
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* All Notifications Dialog */}
      <Dialog open={showAllNotifications} onOpenChange={setShowAllNotifications}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Recent Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Appointment Reminder</div>
                    <div className="text-gray-600 text-xs">Your appointment with Dr. Smith is tomorrow at 2:00 PM</div>
                    <div className="text-gray-500 text-xs mt-1">2 hours ago</div>
                  </div>
                </div>
                <Badge variant="secondary">Unread</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div className="flex items-start gap-3">
                  <TestTube className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Lab Results Available</div>
                    <div className="text-gray-600 text-xs">Your recent blood work results are now available</div>
                    <div className="text-gray-500 text-xs mt-1">5 hours ago</div>
                  </div>
                </div>
                <Badge variant="secondary">Unread</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                <div className="flex items-start gap-3">
                  <Pill className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Prescription Refill</div>
                    <div className="text-gray-600 text-xs">Your prescription for Lisinopril needs to be refilled</div>
                    <div className="text-gray-500 text-xs mt-1">1 day ago</div>
                  </div>
                </div>
                <Badge variant="outline">Read</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">New Message from Dr. Johnson</div>
                    <div className="text-gray-600 text-xs">Please review your medication instructions</div>
                    <div className="text-gray-500 text-xs mt-1">2 days ago</div>
                  </div>
                </div>
                <Badge variant="outline">Read</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Appointment Scheduled</div>
                    <div className="text-gray-600 text-xs">Your follow-up appointment has been confirmed for July 15th</div>
                    <div className="text-gray-500 text-xs mt-1">3 days ago</div>
                  </div>
                </div>
                <Badge variant="outline">Read</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">System Maintenance</div>
                    <div className="text-gray-600 text-xs">Patient portal will be temporarily unavailable on Sunday 2-4 AM</div>
                    <div className="text-gray-500 text-xs mt-1">1 week ago</div>
                  </div>
                </div>
                <Badge variant="outline">Read</Badge>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" className="flex-1">
                Mark All as Read
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Clear All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating AI Chatbot Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsChatbotOpen(true)}
          className="w-14 h-14 rounded-full bg-medical-blue hover:bg-blue-700 shadow-lg transition-all duration-300 hover:scale-110"
          size="lg"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>

      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={isChatbotOpen} 
        onClose={() => setIsChatbotOpen(false)} 
      />
    </div>
  );
}