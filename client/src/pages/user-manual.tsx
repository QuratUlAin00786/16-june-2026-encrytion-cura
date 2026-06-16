import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Settings, 
  Users, 
  Clock, 
  DollarSign, 
  FileText, 
  Calendar,
  UserCog,
  Pill,
  FlaskConical,
  Receipt,
  Video,
  MessageSquare,
  Shield,
  AlertCircle,
  CheckCircle,
  Maximize2
} from "lucide-react";

// Import screenshots
import rolesManagementScreenshot from "@assets/user-manual/roles-management.png";
import editRoleScreenshot from "@assets/user-manual/edit-role.png";
import shiftsManagementScreenshot from "@assets/user-manual/shifts-management.png";
import billingManagementScreenshot from "@assets/user-manual/billing-management.png";
import createClinicInfoScreenshot from "@assets/user-manual/create-clinic-info.png";
import savedClinicInfoScreenshot from "@assets/user-manual/saved-clinic-info.png";

export default function UserManual() {
  const [popupImage, setPopupImage] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 page-full-width page-zoom-90">
      <Header title="User Manual" />
      
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Cura Healthcare EMR</h1>
          <p className="text-muted-foreground mt-1">User Manual</p>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-6">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              User Manual
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Initial Setup
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              File Settings
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Comprehensive User Manual Tab */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Cura HealthCare EMR - Complete User Manual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[650px] pr-4">
                  <div className="space-y-8">
                    
                    {/* Table of Contents */}
                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Table of Contents
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="space-y-1">
                          <p className="text-primary cursor-pointer hover:underline">1. Introduction</p>
                          <p className="text-primary cursor-pointer hover:underline">2. System Requirements</p>
                          <p className="text-primary cursor-pointer hover:underline">3. How to Access the Application</p>
                          <p className="text-primary cursor-pointer hover:underline">4. User Roles and Permissions</p>
                          <p className="text-primary cursor-pointer hover:underline">5. Dashboard Overview</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-primary cursor-pointer hover:underline">6. Step-by-Step Feature Guides</p>
                          <p className="text-primary cursor-pointer hover:underline">7. Troubleshooting Guide</p>
                          <p className="text-primary cursor-pointer hover:underline">8. Frequently Asked Questions</p>
                          <p className="text-primary cursor-pointer hover:underline">9. Contact & Support</p>
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Introduction */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
                        Introduction
                      </h3>
                      <div className="space-y-3">
                        <p className="text-muted-foreground">
                          Welcome to <strong>Cura HealthCare EMR</strong>, a comprehensive Electronic Medical Records system designed to streamline healthcare operations for clinics, hospitals, and medical practices of all sizes.
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">About Cura EMR</h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Cura is a multi-tenant SaaS platform offering patient management, appointment scheduling, AI-powered clinical insights, telemedicine, pharmacy POS, billing integration, and automated patient communications. Built with healthcare compliance (including GDPR) in mind.
                          </p>
                        </div>
                        <h4 className="font-semibold mt-4">Key Features:</h4>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                          <li>Patient Registration & Medical Records Management</li>
                          <li>Appointment Scheduling with Calendar Integration</li>
                          <li>Telemedicine (Audio/Video Calling via LiveKit)</li>
                          <li>Pharmacy Point of Sale (POS) & Inventory Management</li>
                          <li>Billing, Invoicing & Stripe Payment Integration</li>
                          <li>AI-Powered Clinical Decision Support</li>
                          <li>SMS, WhatsApp & Email Messaging (via Twilio & SendGrid)</li>
                          <li>Lab Results & Imaging Management</li>
                          <li>Custom Forms & Document Templates</li>
                          <li>Multi-tenant Organization Support</li>
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    {/* Section 2: System Requirements */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
                        System Requirements
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 rounded-lg border">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Settings className="h-4 w-4 text-primary" />
                            Hardware Requirements
                          </h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Modern computer (PC, Mac, or Chromebook)</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Minimum 4GB RAM (8GB recommended)</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Webcam & Microphone (for telemedicine)</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Stable internet connection (5+ Mbps)</li>
                          </ul>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg border">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Settings className="h-4 w-4 text-primary" />
                            Software Requirements
                          </h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Google Chrome (recommended), Firefox, or Edge</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> JavaScript enabled in browser</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Pop-up blocker disabled for Cura domain</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> PDF viewer for reports</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section 3: How to Access */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">3</span>
                        How to Access the Application
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Login URL</h4>
                          <p className="text-sm text-green-800 dark:text-green-200 font-mono">
                            https://your-organization.curaemr.ai/login
                          </p>
                        </div>
                        <h4 className="font-semibold">Step-by-Step Login Process:</h4>
                        <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
                          <li>Open your web browser and navigate to your organization's Cura URL</li>
                          <li>Enter your registered email address</li>
                          <li>Enter your password (case-sensitive)</li>
                          <li>Click the <strong>"Sign In"</strong> button</li>
                          <li>You will be directed to your role-specific dashboard</li>
                        </ol>
                        <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-4">
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            First-Time Login
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            New users receive login credentials via email. Default password is provided by your administrator. We recommend changing your password after first login via Settings → Profile.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section 4: User Roles */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">4</span>
                        User Roles and Permissions
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Cura EMR uses a role-based access control system. Each user is assigned a role that determines what features and data they can access.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border text-sm">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border border-border p-3 text-left">Role</th>
                              <th className="border border-border p-3 text-left">Access Level</th>
                              <th className="border border-border p-3 text-left">Key Permissions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-border p-3"><Badge>Administrator</Badge></td>
                              <td className="border border-border p-3">Full Access</td>
                              <td className="border border-border p-3">All modules, user management, settings, billing</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="secondary">Doctor</Badge></td>
                              <td className="border border-border p-3">Clinical Access</td>
                              <td className="border border-border p-3">Patients, appointments, prescriptions, lab results, telemedicine</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="secondary">Nurse</Badge></td>
                              <td className="border border-border p-3">Patient Care</td>
                              <td className="border border-border p-3">Patients, vitals, appointments, messaging</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="outline">Receptionist</Badge></td>
                              <td className="border border-border p-3">Front Desk</td>
                              <td className="border border-border p-3">Appointments, patient registration, billing</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="outline">Lab Technician</Badge></td>
                              <td className="border border-border p-3">Diagnostics</td>
                              <td className="border border-border p-3">Lab requests, lab results entry</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="outline">Pharmacist</Badge></td>
                              <td className="border border-border p-3">Pharmacy</td>
                              <td className="border border-border p-3">Prescriptions, inventory, POS sales</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <Separator />

                    {/* Section 5: Dashboard Overview */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">5</span>
                        Dashboard Overview
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Upon login, you will see your personalized dashboard with quick access to key features based on your role.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 rounded-lg border">
                          <h4 className="font-semibold mb-2">Dashboard Components:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Today's Appointments Summary</li>
                            <li>• Patient Statistics & Trends</li>
                            <li>• Quick Action Buttons</li>
                            <li>• Recent Activity Feed</li>
                            <li>• Notifications & Alerts</li>
                            <li>• Revenue Overview (Admin)</li>
                          </ul>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg border">
                          <h4 className="font-semibold mb-2">Navigation Menu:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Left Sidebar: Main navigation</li>
                            <li>• Top Header: Search, notifications, profile</li>
                            <li>• Theme Toggle: Light/Dark mode</li>
                            <li>• AI Assistant: Quick help access</li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-2">
                        [Screenshot suggestion: Dashboard overview showing main navigation and key widgets]
                      </p>
                    </div>

                    <Separator />

                    {/* Section 6: Step-by-Step Guides */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">6</span>
                        Step-by-Step Feature Guides
                      </h3>
                      
                      {/* Patient Management */}
                      <div className="bg-muted/20 p-4 rounded-lg border-l-4 border-l-primary">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          6.1 Patient Management
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">Register new patients and manage their medical records.</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                          <li>Navigate to <strong>Patients</strong> from the sidebar</li>
                          <li>Click <strong>"Add Patient"</strong> button</li>
                          <li>Fill in required fields (Name, Date of Birth, Contact)</li>
                          <li>Add optional fields (Address, Insurance, Emergency Contact)</li>
                          <li>Click <strong>"Create Patient"</strong> to save</li>
                        </ol>
                      </div>

                      {/* Appointments */}
                      <div className="bg-muted/20 p-4 rounded-lg border-l-4 border-l-primary">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          6.2 Appointment Scheduling
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">Book and manage patient appointments.</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                          <li>Navigate to <strong>Appointments</strong></li>
                          <li>Click <strong>"New Appointment"</strong></li>
                          <li>Select patient from the dropdown</li>
                          <li>Choose doctor, date, and time slot</li>
                          <li>Add appointment type and notes</li>
                          <li>Click <strong>"Book Appointment"</strong></li>
                        </ol>
                      </div>

                      {/* Telemedicine */}
                      <div className="bg-muted/20 p-4 rounded-lg border-l-4 border-l-primary">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Video className="h-4 w-4 text-primary" />
                          6.3 Telemedicine Calls
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">Conduct audio/video consultations with patients.</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                          <li>Navigate to <strong>Telemedicine</strong></li>
                          <li>Select the scheduled appointment</li>
                          <li>Click <strong>"Start Call"</strong></li>
                          <li>Allow camera and microphone permissions</li>
                          <li>Wait for patient to join the room</li>
                          <li>Use on-screen controls for mute/video toggle</li>
                        </ol>
                      </div>

                      {/* Billing */}
                      <div className="bg-muted/20 p-4 rounded-lg border-l-4 border-l-primary">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          6.4 Billing & Payments
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">Create invoices and process payments.</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                          <li>Navigate to <strong>Billing</strong></li>
                          <li>Click <strong>"Create Invoice"</strong></li>
                          <li>Select patient and add services/items</li>
                          <li>Apply discounts if applicable</li>
                          <li>Choose payment method (Stripe, Cash, etc.)</li>
                          <li>Click <strong>"Process Payment"</strong></li>
                        </ol>
                      </div>

                      {/* Messaging */}
                      <div className="bg-muted/20 p-4 rounded-lg border-l-4 border-l-primary">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          6.5 Messaging & Notifications
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">Send SMS, WhatsApp, and email messages to patients.</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                          <li>Navigate to <strong>Messaging</strong></li>
                          <li>Click <strong>"Compose New Message"</strong></li>
                          <li>Select recipient(s) from patient list</li>
                          <li>Choose message type (SMS, WhatsApp, Email, Voice)</li>
                          <li>Type your message or select a template</li>
                          <li>Schedule or send immediately</li>
                        </ol>
                      </div>

                      {/* Pharmacy */}
                      <div className="bg-muted/20 p-4 rounded-lg border-l-4 border-l-primary">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary" />
                          6.6 Pharmacy POS
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">Process pharmacy sales and manage inventory.</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                          <li>Navigate to <strong>Pharmacy POS</strong></li>
                          <li>Start a new shift or continue existing</li>
                          <li>Search and add products to cart</li>
                          <li>Apply customer or prescription discounts</li>
                          <li>Select payment method</li>
                          <li>Complete sale and print receipt</li>
                        </ol>
                      </div>
                    </div>

                    <Separator />

                    {/* Section 7: Troubleshooting */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">7</span>
                        Troubleshooting Guide
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Cannot Login</h4>
                          <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                            <li>• Verify your email address is correct</li>
                            <li>• Check if Caps Lock is on (passwords are case-sensitive)</li>
                            <li>• Use "Forgot Password" to reset your credentials</li>
                            <li>• Contact your administrator if account is locked</li>
                          </ul>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                          <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Telemedicine Issues</h4>
                          <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                            <li>• Ensure browser has camera/microphone permissions</li>
                            <li>• Check your internet connection stability</li>
                            <li>• Try refreshing the page or using a different browser</li>
                            <li>• Close other applications using camera/microphone</li>
                          </ul>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Messages Not Sending</h4>
                          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                            <li>• Verify recipient phone/email is correct</li>
                            <li>• Check if messaging service is configured</li>
                            <li>• For WhatsApp, ensure patient has joined the sandbox</li>
                            <li>• Check message history for error details</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section 8: FAQs */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">8</span>
                        Frequently Asked Questions
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <h4 className="font-semibold mb-1">Q: How do I reset my password?</h4>
                          <p className="text-sm text-muted-foreground">A: Click "Forgot Password" on the login page, enter your email, and follow the reset link sent to your inbox.</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <h4 className="font-semibold mb-1">Q: Can I access Cura on mobile devices?</h4>
                          <p className="text-sm text-muted-foreground">A: Yes, Cura is responsive and works on tablets. Dedicated mobile apps (Cura Patient App, Cura Doctor App) are also available.</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <h4 className="font-semibold mb-1">Q: How is patient data protected?</h4>
                          <p className="text-sm text-muted-foreground">A: Cura uses encryption, secure hosting, role-based access, and complies with GDPR and healthcare data protection standards.</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <h4 className="font-semibold mb-1">Q: Can I export patient data?</h4>
                          <p className="text-sm text-muted-foreground">A: Yes, administrators can export data in PDF or CSV formats from the relevant modules.</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <h4 className="font-semibold mb-1">Q: How do I add a new user to the system?</h4>
                          <p className="text-sm text-muted-foreground">A: Navigate to User Management → Add New User → Fill details → Assign role → Save. The user will receive login credentials via email.</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section 9: Contact & Support */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">9</span>
                        Contact & Support Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                          <h4 className="font-semibold mb-3">Technical Support</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              Email: support@curaemr.ai
                            </li>
                            <li className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              Hours: Mon-Fri, 9am-6pm GMT
                            </li>
                          </ul>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                          <h4 className="font-semibold mb-3">Emergency Support</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-primary" />
                              For critical system issues only
                            </li>
                            <li className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              Email: urgent@curaemr.ai
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg border mt-4">
                        <h4 className="font-semibold mb-2">Additional Resources</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Knowledge Base: docs.curaemr.ai</li>
                          <li>• Video Tutorials: Available in the Help section</li>
                          <li>• Community Forum: community.curaemr.ai</li>
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    {/* PDF Download Section */}
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20 text-center">
                      <h4 className="font-bold text-lg mb-2">Download This Manual</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get a PDF copy of this user manual for offline reference.
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Use your browser's Print function (Ctrl+P / Cmd+P) and select "Save as PDF" to download.
                      </p>
                    </div>

                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Initial Setup Tab */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Overview & Initial Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Important - Complete Setup First</h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Before beginning patient registration, appointments, or billing, four key configurations must be completed:
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">1. Create Role Permissions</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Define user roles and assign access levels for data security
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">2. Create Shifts</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Define default and custom work hours for staff
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">3. Define Fees & Charges</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Set doctors' fees and departmental charges
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">4. Create Header & Footer</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Customize branding for PDF documents
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        System Workflow Summary
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border border-border p-3 text-left">Step</th>
                              <th className="border border-border p-3 text-left">Task</th>
                              <th className="border border-border p-3 text-left">Responsible Role</th>
                              <th className="border border-border p-3 text-left">Module</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-border p-3">1</td>
                              <td className="border border-border p-3">Create roles and assign permissions</td>
                              <td className="border border-border p-3"><Badge>Administrator</Badge></td>
                              <td className="border border-border p-3">User Management</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3">2</td>
                              <td className="border border-border p-3">Create default/custom shifts</td>
                              <td className="border border-border p-3"><Badge variant="secondary">HR / Admin</Badge></td>
                              <td className="border border-border p-3">Shift Management</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3">3</td>
                              <td className="border border-border p-3">Set fees and service charges</td>
                              <td className="border border-border p-3"><Badge variant="outline">Finance / Admin</Badge></td>
                              <td className="border border-border p-3">Billing Setup</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3">4</td>
                              <td className="border border-border p-3">Create header and footer templates</td>
                              <td className="border border-border p-3"><Badge>Admin / IT</Badge></td>
                              <td className="border border-border p-3">Document Templates</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Create Role Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Define user roles and assign access levels to ensure data security and controlled access to features.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Create New Role Interface</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Example: Creating an Administrator role with full system permissions including Dashboard, Patients, Appointments, Medical Records, Prescriptions, and more.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div 
                          className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                          onClick={() => {
                            const subdomain = localStorage.getItem('user_subdomain') || 'demo';
                            setLocation(`/${subdomain}/user-management`);
                          }}
                          data-testid="img-roles-management"
                        >
                          <img 
                            src={rolesManagementScreenshot} 
                            alt="Role Management Interface" 
                            className="w-full h-auto"
                          />
                          <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                            Click to go to User Management
                          </div>
                        </div>
                        <div 
                          className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                          onClick={() => {
                            const subdomain = localStorage.getItem('user_subdomain') || 'demo';
                            setLocation(`/${subdomain}/user-management`);
                          }}
                          data-testid="img-edit-role"
                        >
                          <img 
                            src={editRoleScreenshot} 
                            alt="Edit Role Permissions" 
                            className="w-full h-auto"
                          />
                          <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                            Click to go to User Management
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-primary" />
                        Steps to Create Roles
                      </h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Admin Dashboard → User Management → Roles & Permissions
                          </div>
                        </li>
                        
                        <li className="text-sm">
                          <span className="font-semibold">Create New Role:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Add Role"
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter Role Name (e.g., Doctor, Nurse, Receptionist, Lab Technician, Administrator)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add Description (optional)
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Assign Permissions:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select allowed modules (Patient Registration, Billing, Reports, Settings)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Choose Read / Write / Edit / Delete privileges for each module
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save Role:</span>
                          <div className="ml-6 mt-1">
                            Click "Save" — The role will now appear in the list
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Assign Role to Users:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            User List → Select user → Choose role → Save
                          </div>
                        </li>
                      </ol>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Example Roles</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border border-border p-3 text-left">Role</th>
                              <th className="border border-border p-3 text-left">Access Modules</th>
                              <th className="border border-border p-3 text-left">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-border p-3"><Badge>Administrator</Badge></td>
                              <td className="border border-border p-3">All modules</td>
                              <td className="border border-border p-3">Full access & system configuration</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="secondary">Doctor</Badge></td>
                              <td className="border border-border p-3">Patients, Appointments, Prescriptions, Reports</td>
                              <td className="border border-border p-3">Clinical access only</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="outline">Receptionist</Badge></td>
                              <td className="border border-border p-3">Appointments, Billing, Patient Registration</td>
                              <td className="border border-border p-3">Front-desk operations</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="destructive">Lab Technician</Badge></td>
                              <td className="border border-border p-3">Lab Requests, Lab Results</td>
                              <td className="border border-border p-3">Diagnostic data entry</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Create Shifts (Default and Custom)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Define work hours for doctors, nurses, and support staff.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Shifts Management Interface</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Example: Default shifts view showing multiple staff members (James Administrator, Paul Smith, Emma Johnson, etc.) with their assigned working hours and days of the week.
                      </p>
                      
                      <div 
                        className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow max-w-2xl"
                        onClick={() => {
                          const subdomain = localStorage.getItem('user_subdomain') || 'demo';
                          setLocation(`/${subdomain}/shifts`);
                        }}
                        data-testid="img-shifts-management"
                      >
                        <img 
                          src={shiftsManagementScreenshot} 
                          alt="Shifts Management Interface" 
                          className="w-full h-auto"
                        />
                        <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                          Click to go to Shifts
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Steps to Create Shifts</h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Admin Dashboard → Human Resources → Shifts Management
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Create Default Shifts:</span>
                          <div className="ml-6 mt-2 space-y-3">
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Morning Shift</span>
                                <Badge>08:00 AM - 02:00 PM</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Mark as Default</p>
                            </div>
                            
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Evening Shift</span>
                                <Badge variant="secondary">02:00 PM - 08:00 PM</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Mark as Default</p>
                            </div>
                            
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Night Shift</span>
                                <Badge variant="outline">08:00 PM - 08:00 AM</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Mark as Default</p>
                            </div>
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Create Custom Shifts (if needed):</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              For specific departments (e.g., ICU, Emergency)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Add Custom Shift"
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Define time, assign to department or user group
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save & Assign:</span>
                          <div className="ml-6 mt-1">
                            Assign shifts to users or departments
                          </div>
                        </li>
                      </ol>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Note</h4>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            Custom shifts override default shifts for assigned users.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Doctors' Fees, Lab, and Imaging Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Set standard fees for doctors and diagnostic services.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Billing & Pricing Management</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Example: Pricing Management showing Doctors Fee Pricing with various consultation types (Procedure Consultation, Home Visit, Emergency Visit, Teleconsultation, Follow-up Visit, etc.) with their respective codes, categories, and prices in GBP.
                      </p>
                      
                      <div 
                        className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow max-w-2xl"
                        onClick={() => {
                          const subdomain = localStorage.getItem('user_subdomain') || 'demo';
                          setLocation(`/${subdomain}/billing`);
                        }}
                        data-testid="img-billing-management"
                      >
                        <img 
                          src={billingManagementScreenshot} 
                          alt="Billing & Pricing Management Interface" 
                          className="w-full h-auto"
                        />
                        <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                          Click to go to Billing
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Steps to Configure Billing</h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Finance / Billing → Service Charges Setup
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Doctors' Fees:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Add New Doctor Fee"
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select Doctor from dropdown
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter consultation fee (Initial Visit / Follow-Up)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add notes (e.g., procedure charges, specializations)
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Lab Results Fees:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Go to Lab Tests Setup
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select test (e.g., CBC, Lipid Profile, Liver Function Test)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter charge amount and sample type
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Imaging Charges:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Go to Imaging / Radiology Setup
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select test (e.g., X-Ray, MRI, Ultrasound)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter standard charge
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save & Review:</span>
                          <div className="ml-6 mt-1">
                            All charges appear in the billing module automatically
                          </div>
                        </li>
                      </ol>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* File Settings Tab (formerly Documents) */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  File Settings – Clinic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Configure clinic branding and header/footer for all printed and digital documents. This page is available under <strong>Settings → Clinic Information</strong> (Header Design & Information and Footer Design & Information tabs).
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Clinic Information – Header Design & Information</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        On the Settings page, open <strong>Clinic Information</strong> and use the <strong>Header Design & Information</strong> tab to upload your clinic logo and set header and sub-heading details. You can switch to <strong>Footer Design & Information</strong> for footer content. Use <strong>View Header Footer</strong> to preview.
                      </p>
                      
                      <div 
                        className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow max-w-2xl"
                        onClick={() => {
                          const subdomain = localStorage.getItem('user_subdomain') || 'demo';
                          setLocation(`/${subdomain}/settings`);
                        }}
                        data-testid="img-clinic-information-settings"
                      >
                        <img 
                          src={createClinicInfoScreenshot} 
                          alt="Clinic Information – File Settings (Settings page)" 
                          className="w-full h-auto"
                        />
                        <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                          Clinic Information (File Settings) – Click to go to Settings
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Sections on this page</h3>
                      <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li><strong>Clinic Logo:</strong> Choose File to upload a logo. Use a square image (e.g. 200×200 to 2000×2000), PNG or SVG preferred, under 1–2 MB. Logo preview appears below the specs.</li>
                        <li><strong>Header Information:</strong> Enter clinic name, set clinic name font size (e.g. 24pt), and pick a background color (e.g. #4A7DFF).</li>
                        <li><strong>Sub Heading:</strong> Enter address, phone (+44 20 1234 5678), email, and website. Set font family (e.g. Verdana), font size (e.g. 12pt), and use Bold, Italic, or Underline for text styling.</li>
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Saved Clinic Header & Footer</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Step 2: Preview of saved clinic header showing "Clinical Care Hospital" with contact details and saved footer for use in all PDF documents.
                      </p>
                      
                      <div 
                        className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow max-w-2xl"
                        onClick={() => {
                          const subdomain = localStorage.getItem('user_subdomain') || 'demo';
                          setLocation(`/${subdomain}/settings`);
                        }}
                        data-testid="img-saved-clinic-info"
                      >
                        <img 
                          src={savedClinicInfoScreenshot} 
                          alt="Saved Clinic Information" 
                          className="w-full h-auto"
                        />
                        <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                          Click to go to Settings
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Document Editor with Header/Footer Options</h3>
                      <p className="text-sm text-muted-foreground">
                        Step 3: Document editor toolbar showing "Create Clinic Information", "View Custom Clinic Information", "Clinical Header", and "View Saved Templates" options for managing document templates and branding across all forms and reports.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Steps to Configure Document Templates</h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Settings → Clinic Information → Header Design & Information (or Footer Design & Information)
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Header Setup:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Upload hospital logo (PNG/JPG)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter hospital name, address, contact info
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add tagline (optional)
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Footer Setup:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add legal disclaimer, website, or additional contact info
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Option to include page number, date/time, and digital signature field
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Apply to Documents:</span>
                          <div className="ml-6 mt-2">
                            <p className="mb-2">Select applicable templates:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Pill className="h-4 w-4 text-primary" />
                                <span className="text-xs">Prescriptions</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <FlaskConical className="h-4 w-4 text-primary" />
                                <span className="text-xs">Lab Results</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-xs">Imaging Reports</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Receipt className="h-4 w-4 text-primary" />
                                <span className="text-xs">Invoices</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded col-span-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-xs">Discharge Summaries</span>
                              </div>
                            </div>
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save & Preview:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Preview PDF" to verify layout
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Save final configuration
                            </li>
                          </ul>
                        </li>
                      </ol>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  System Features Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Post-Setup Checklist</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-roles" />
                              <span className="text-sm text-green-800 dark:text-green-200">Roles & Permissions configured</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-shifts" />
                              <span className="text-sm text-green-800 dark:text-green-200">Shifts created & assigned</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-fees" />
                              <span className="text-sm text-green-800 dark:text-green-200">Fees and charges set</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-templates" />
                              <span className="text-sm text-green-800 dark:text-green-200">PDF templates customized</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Next Steps - Using the System</h3>
                      <p className="text-muted-foreground mb-4">
                        After setup, users can proceed with:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-semibold">Patient Registration</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Register new patients, manage patient records, and update demographic information
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="font-semibold">Appointments Scheduling</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Schedule, reschedule, and manage patient appointments with doctors
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-semibold">Billing and Payments</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Process invoices, manage payments, and track billing records
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                              <FlaskConical className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h4 className="font-semibold">Lab / Imaging Orders</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Create lab test orders, request imaging studies, and manage results
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="font-semibold">Report Generation</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Generate comprehensive reports for analysis and compliance
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-pink-100 dark:bg-pink-900 p-2 rounded-lg">
                              <Pill className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h4 className="font-semibold">Prescriptions</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Create and manage electronic prescriptions with e-signature
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-teal-100 dark:bg-teal-900 p-2 rounded-lg">
                              <Video className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <h4 className="font-semibold">Telemedicine</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Conduct virtual consultations with video conferencing
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-cyan-100 dark:bg-cyan-900 p-2 rounded-lg">
                              <MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <h4 className="font-semibold">Messaging</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Send SMS and WhatsApp messages to patients for reminders
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Need Help?</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                        For additional support, please contact your system administrator or IT support team.
                      </p>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p>📧 Email: support@curaemr.ai</p>
                        <p>📞 Phone: +44 (0) 121 XXX XXXX</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Popup Dialog */}
      <Dialog open={!!popupImage} onOpenChange={() => setPopupImage(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          <div className="relative w-full h-full flex items-center justify-center bg-black/5">
            <img 
              src={popupImage || ""} 
              alt="Screenshot preview" 
              className="w-full h-auto max-h-[85vh] object-contain"
              data-testid="img-popup-preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
