import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Users, 
  Calendar, 
  MessageSquare, 
  Package, 
  Brain,
  Heart,
  Phone,
  Video,
  Stethoscope,
  Pill,
  FileText,
  Clock,
  ChevronRight,
  Star,
  CheckCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingResults: number;
  activeUsers: number;
}

interface Patient {
  id: number;
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  bloodType: string;
  allergies: string;
  medicalHistory: string;
  isActive: boolean;
  createdAt: string;
}

interface Appointment {
  id: number;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  status: string;
  type: string;
  location: string;
  isVirtual: boolean;
}

export default function LiveApp() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDemo, setSelectedDemo] = useState("dashboard");

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real data
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
    refetchInterval: 30000,
  });

  const recentPatients = patients?.slice(0, 3) || [];
  const todayAppointments = appointments?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Cura EMR Live Demo
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  by Halo Group & Averox
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(currentTime, 'PPP')}
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {format(currentTime, 'p')}
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live System
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedDemo} onValueChange={setSelectedDemo} className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Features</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Patients</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Inventory</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPatients || 0}</div>
                  <p className="text-xs text-blue-100">Registered in system</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                  <Calendar className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.todayAppointments || 0}</div>
                  <p className="text-xs text-green-100">Scheduled for today</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Activity className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
                  <p className="text-xs text-purple-100">Currently online</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <Heart className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98%</div>
                  <p className="text-xs text-orange-100">Uptime this month</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Recent Patients</span>
                  </CardTitle>
                  <CardDescription>Latest patient registrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentPatients.map((patient, index) => (
                    <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            ID: {patient.patientId}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {patient.bloodType || "O+"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Today's Schedule</span>
                  </CardTitle>
                  <CardDescription>Upcoming appointments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {todayAppointments.map((appointment, index) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {appointment.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {format(new Date(appointment.scheduledAt), 'p')} - {appointment.duration}min
                          </p>
                        </div>
                      </div>
                      <Badge variant={appointment.isVirtual ? "default" : "secondary"}>
                        {appointment.isVirtual ? "Virtual" : "In-Person"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span>AI Assistant</span>
                  </CardTitle>
                  <CardDescription>Claude-powered intelligent healthcare assistant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Voice transcription</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Clinical insights</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Appointment booking</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Video className="h-5 w-5 text-purple-600" />
                    <span>Telemedicine</span>
                  </CardTitle>
                  <CardDescription>BigBlueButton video consultations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">HD video calls</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Screen sharing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Recording capability</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <span>Messaging</span>
                  </CardTitle>
                  <CardDescription>Twilio SMS & WhatsApp integration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">SMS notifications</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">WhatsApp alerts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Automated reminders</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    <span>Inventory Management</span>
                  </CardTitle>
                  <CardDescription>Complete stock tracking system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Item master catalog</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Purchase orders</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Low stock alerts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Pill className="h-5 w-5 text-red-600" />
                    <span>Prescription Management</span>
                  </CardTitle>
                  <CardDescription>E-prescriptions with Halo Health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Digital signatures</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Drug interactions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Pharmacy integration</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-indigo-600" />
                    <span>Mobile Apps</span>
                  </CardTitle>
                  <CardDescription>Flutter apps for patients & doctors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Patient portal</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Doctor dashboard</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">Cross-platform sync</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Performance */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance Metrics</CardTitle>
                <CardDescription>Real-time system health indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">CPU Usage</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">23%</span>
                    </div>
                    <Progress value={23} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Memory Usage</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">67%</span>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Database Load</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">34%</span>
                    </div>
                    <Progress value={34} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Management System</CardTitle>
                <CardDescription>Comprehensive patient records and management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recent Registrations</h3>
                    {patients?.slice(0, 5).map((patient, index) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                            <p className="text-sm text-gray-500">{patient.email}</p>
                            <p className="text-xs text-gray-400">ID: {patient.patientId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{patient.bloodType || "O+"}</Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Age: {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {patients?.length || 0}
                        </div>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Total Patients</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {patients?.filter(p => p.isActive).length || 0}
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-400">Active Records</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {patients?.filter(p => p.allergies && p.allergies.trim() !== '').length || 0}
                        </div>
                        <p className="text-sm text-purple-600 dark:text-purple-400">With Allergies</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {patients?.filter(p => p.medicalHistory && typeof p.medicalHistory === 'string' && p.medicalHistory.trim() !== '').length || 0}
                        </div>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Medical History</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management System</CardTitle>
                <CardDescription>Complete healthcare inventory tracking and management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Items</p>
                        <p className="text-2xl font-bold">1,247</p>
                      </div>
                      <Package className="h-8 w-8 opacity-80" />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">In Stock</p>
                        <p className="text-2xl font-bold">1,156</p>
                      </div>
                      <CheckCircle className="h-8 w-8 opacity-80" />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Low Stock</p>
                        <p className="text-2xl font-bold">23</p>
                      </div>
                      <Activity className="h-8 w-8 opacity-80" />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Out of Stock</p>
                        <p className="text-2xl font-bold">68</p>
                      </div>
                      <Activity className="h-8 w-8 opacity-80" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recent Inventory Activities</h3>
                    <div className="space-y-3">
                      {[
                        { action: "Stock Added", item: "Surgical Gloves", quantity: "+500", time: "2 minutes ago" },
                        { action: "Stock Updated", item: "Paracetamol 500mg", quantity: "-50", time: "15 minutes ago" },
                        { action: "New Item Added", item: "Digital Thermometer", quantity: "+25", time: "1 hour ago" },
                        { action: "Purchase Order", item: "Medical Masks", quantity: "+1000", time: "2 hours ago" },
                        { action: "Stock Alert", item: "Insulin Pens", quantity: "Low", time: "3 hours ago" }
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              activity.action.includes('Added') ? 'bg-green-100 text-green-600' :
                              activity.action.includes('Alert') ? 'bg-red-100 text-red-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              <Package className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{activity.action}</p>
                              <p className="text-xs text-gray-500">{activity.item}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              activity.quantity.startsWith('+') ? 'text-green-600' :
                              activity.quantity.startsWith('-') ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {activity.quantity}
                            </p>
                            <p className="text-xs text-gray-400">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Inventory Categories</h3>
                    <div className="space-y-3">
                      {[
                        { category: "Medications", count: 456, value: "£89,230" },
                        { category: "Medical Devices", count: 234, value: "£45,670" },
                        { category: "Surgical Supplies", count: 189, value: "£23,450" },
                        { category: "Diagnostic Equipment", count: 98, value: "£67,890" },
                        { category: "Consumables", count: 270, value: "£12,340" }
                      ].map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {category.category.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{category.category}</p>
                              <p className="text-sm text-gray-500">{category.count} items</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{category.value}</p>
                            <p className="text-xs text-gray-400">Total Value</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button size="lg" className="flex-1">
            <ChevronRight className="mr-2 h-5 w-5" />
            Access Full System
          </Button>
          <Button variant="outline" size="lg" className="flex-1">
            <FileText className="mr-2 h-5 w-5" />
            View Documentation
          </Button>
          <Button variant="outline" size="lg" className="flex-1">
            <Phone className="mr-2 h-5 w-5" />
            Contact Support
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>© 2025 Cura EMR System</span>
              <span>•</span>
              <span>by Halo Group & Averox</span>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Production Ready
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}