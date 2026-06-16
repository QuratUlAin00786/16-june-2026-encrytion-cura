import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  FileText, 
  Shield, 
  Smartphone, 
  Brain,
  MessageSquare,
  Video,
  Clock,
  Award,
  CheckCircle,
  ArrowLeft,
  Stethoscope,
  Database,
  CreditCard,
  Mic,
  Bell,
  BarChart3,
  Globe,
  Lock,
  Zap,
  Activity,
  Pill
} from "lucide-react";
import { AppStoreBadge } from "@/components/AppStoreBadge";
import { PlayStoreBadge } from "@/components/PlayStoreBadge";
import { WebsiteChatbot } from "@/components/WebsiteChatbot";

const curaLogoPath = "/cura-logo.png";
const dashboardScreenshot = "/cura-logo.png";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-md dark:bg-gray-900/95 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/landing" className="flex items-center space-x-3">
              <img 
                src={curaLogoPath} 
                alt="Cura EMR" 
                className="h-12 w-auto"
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">by Halo Group</span>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Home
              </Link>
              <Link href="/landing/pricing" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Pricing
              </Link>
              <Link href="/landing/about" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                About Us
              </Link>
              <Link href="/auth/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6 py-2 rounded-lg font-medium">
                  Client Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Complete <span className="text-blue-600">Healthcare Management</span> Suite
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Discover every feature that makes Cura EMR the most comprehensive 
            and intelligent healthcare management platform available today.
          </p>
          <div className="flex items-center justify-center space-x-4 mb-12">
            <Badge variant="secondary" className="text-lg py-2 px-4">
              <Award className="h-5 w-5 mr-2" />
              Award-Winning Platform
            </Badge>
            <Badge variant="secondary" className="text-lg py-2 px-4">
              <Shield className="h-5 w-5 mr-2" />
              GDPR Compliant
            </Badge>
            <Badge variant="secondary" className="text-lg py-2 px-4">
              <Globe className="h-5 w-5 mr-2" />
              Multi-Tenant Architecture
            </Badge>
          </div>
        </div>
      </section>


      {/* Core Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Core Platform Features
          </h2>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Brain className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl">AI-Powered Clinical Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Harness the power of OpenAI GPT-4 for intelligent clinical decision support, 
                  risk assessment, and treatment recommendations.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Drug interaction analysis</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Patient risk scoring</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Treatment suggestions</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Preventive care alerts</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Calendar className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle className="text-xl">Smart Appointment Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Intelligent scheduling system with automated conflict detection, 
                  resource optimisation, and seamless calendar integration.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Multi-provider scheduling</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Automated reminders (SMS/Email)</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Waitlist management</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Real-time availability</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <FileText className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle className="text-xl">Comprehensive Medical Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Complete electronic health records with structured data entry, 
                  clinical templates, and intelligent documentation assistance.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Clinical note templates</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Voice-to-text transcription</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Medical history tracking</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Diagnostic coding (ICD-10)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Advanced Capabilities
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-3xl font-bold mb-6">Telemedicine & Remote Care</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <Video className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">HD Video Consultations</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Integrated BigBlueButton video conferencing with screen sharing, 
                      recording capabilities, and secure patient communication.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <MessageSquare className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Real-time Messaging</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Secure patient-provider messaging with read receipts, 
                      file sharing, and automated workflow integration.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Activity className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Remote Monitoring</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Integration with wearable devices and home monitoring 
                      equipment for continuous patient care.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Video Consultation Interface</h4>
                  <Badge variant="secondary">Live</Badge>
                </div>
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                  <Video className="h-16 w-16 text-gray-400" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Mic className="h-3 w-3 mr-1" />
                    Mute
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    Camera
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Notes
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h4 className="font-semibold mb-4">AI Chatbot Interface</h4>
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">AI Assistant</span>
                  </div>
                  <p className="text-sm">How can I help you today? I can book appointments, find prescriptions, and answer healthcare questions.</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-right">
                  <p className="text-sm">Book an appointment with Dr. Smith</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm">I'll help you book an appointment with Dr. Smith. What type of consultation do you need?</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-bold mb-6">Intelligent AI Assistant</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <MessageSquare className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Natural Language Processing</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Advanced NLP powered by Anthropic Claude AI for understanding 
                      complex medical queries and providing contextual responses.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Calendar className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Automated Appointment Booking</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Patients can book appointments through natural conversation, 
                      with automatic provider matching and scheduling optimisation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Pill className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Prescription Assistance</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Intelligent medication search, drug interaction checking, 
                      and prescription management through conversational interface.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Apps */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Native Mobile Applications
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Smartphone className="h-10 w-10 text-blue-600" />
                  <div>
                    <CardTitle className="text-2xl">Cura Patient App</CardTitle>
                    <p className="text-gray-600 dark:text-gray-300">For patients and caregivers</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Medical history access</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Prescription management</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Appointment booking</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Lab results viewing</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Push notifications</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Voice documentation</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Secure messaging</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Offline sync capability</li>
                </ul>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Download for:</p>
                  <div className="flex space-x-3">
                    <a href="#" className="hover:opacity-80 transition-opacity">
                      <AppStoreBadge className="h-10 w-auto" />
                    </a>
                    <a href="#" className="hover:opacity-80 transition-opacity">
                      <PlayStoreBadge className="h-10 w-auto" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Stethoscope className="h-10 w-10 text-green-600" />
                  <div>
                    <CardTitle className="text-2xl">Cura Doctor App</CardTitle>
                    <p className="text-gray-600 dark:text-gray-300">For healthcare providers</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Dashboard overview</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Patient record access</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Appointment management</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Clinical note taking</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Prescription writing</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Medication alerts</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Team communication</li>
                  <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Emergency protocols</li>
                </ul>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Download for:</p>
                  <div className="flex space-x-3">
                    <a href="#" className="hover:opacity-80 transition-opacity">
                      <AppStoreBadge className="h-10 w-auto" />
                    </a>
                    <a href="#" className="hover:opacity-80 transition-opacity">
                      <PlayStoreBadge className="h-10 w-auto" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Security & Compliance
          </h2>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Shield className="h-12 w-12 text-red-600 mb-4" />
                <CardTitle>Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><Lock className="h-4 w-4 text-green-600 mr-2" />End-to-end encryption</li>
                  <li className="flex items-center"><Lock className="h-4 w-4 text-green-600 mr-2" />Multi-factor authentication</li>
                  <li className="flex items-center"><Lock className="h-4 w-4 text-green-600 mr-2" />Role-based access control</li>
                  <li className="flex items-center"><Lock className="h-4 w-4 text-green-600 mr-2" />Audit trail logging</li>
                  <li className="flex items-center"><Lock className="h-4 w-4 text-green-600 mr-2" />SOC 2 Type II certified</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Database className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Data Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />GDPR compliant</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Data residency controls</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Automated backups</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Disaster recovery</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />99.9% uptime SLA</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Globe className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Multi-Tenant Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Complete data isolation</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Tenant-specific customization</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Scalable infrastructure</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Cross-tenant validation</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Performance monitoring</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integration & Analytics */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Integration & Analytics
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-6">
                <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Payment Processing</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Dual payment integration with Ryft and PayPal for secure transactions
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-6">
                <MessageSquare className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">SMS/WhatsApp</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Twilio integration for automated notifications and patient communication
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-6">
                <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Analytics Dashboard</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Comprehensive reporting and analytics for practice insights
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-6">
                <Zap className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">API Integration</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  RESTful APIs for seamless integration with existing systems
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Experience Cura EMR?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of healthcare professionals who have transformed their practice with Cura EMR.
            Start your free trial today and see the difference intelligent healthcare management can make.
          </p>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
            <h3 className="text-2xl font-bold mb-6">Free Trial Includes</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-3">
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Full platform access for 30 days</div>
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />AI assistant with 100 queries</div>
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Mobile app access</div>
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Email support</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Up to 5 providers</div>
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Unlimited patients</div>
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Data migration assistance</div>
                <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-600 mr-3" />Training sessions</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/landing/about">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <img 
                  src={curaLogoPath} 
                  alt="Cura EMR - Electronic Medical Records" 
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed max-w-md">
                Advanced Electronic Medical Records platform designed for modern healthcare professionals. 
                Trusted, secure, and intelligent healthcare management.
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600 shadow-sm">
                <div className="font-semibold text-gray-900 mb-2">Cura Software Limited</div>
                <div>Ground Floor Unit 2, Drayton Court</div>
                <div>Drayton Road, Solihull, England B90 4NG</div>
                <div className="mt-2">Company Registration: 16556912</div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-gray-900">Navigation</h4>
              <ul className="space-y-3 text-gray-600">
                <li><Link href="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
                <li><Link href="/landing/features" className="hover:text-blue-600 transition-colors">Features</Link></li>
                <li><Link href="/landing/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
                <li><Link href="/landing/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
                <li><Link href="/auth/login" className="hover:text-blue-600 transition-colors">Client Portal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-gray-900">Support & Contact</h4>
              <ul className="space-y-3 text-gray-600">
                <li><a href="mailto:support@curaemr.ai" className="hover:text-blue-600 transition-colors">Technical Support</a></li>
                <li><a href="mailto:info@curaemr.ai" className="hover:text-blue-600 transition-colors">Contact Us</a></li>
                <li><a href="mailto:demo@curaemr.ai" className="hover:text-blue-600 transition-colors">Request Demo</a></li>
                <li><Link href="/legal/press" className="hover:text-blue-600 transition-colors">Press & Media</Link></li>
                <li><a href="mailto:careers@curaemr.ai" className="hover:text-blue-600 transition-colors">Careers</a></li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h5 className="font-medium text-gray-900 mb-3">Legal & Compliance</h5>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="/legal/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/legal/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
                  <li><Link href="/legal/gdpr" className="hover:text-blue-600 transition-colors">GDPR Compliance</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-600 text-sm mb-4 md:mb-0">
                &copy; 2025 Cura Software Limited. All rights reserved. 
                <span className="ml-2">Company No: 16556912</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center text-gray-600">
                  <Shield className="w-4 h-4 mr-2 text-blue-600" />
                  GDPR Compliant
                </div>
                <div className="flex items-center text-gray-600">
                  <Award className="w-4 h-4 mr-2 text-blue-600" />
                  NHS Trusted
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                  99.9% Uptime SLA
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Website Chatbot */}
      <WebsiteChatbot />
    </div>
  );
}