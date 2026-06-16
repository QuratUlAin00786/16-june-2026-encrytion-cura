import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowRight
} from "lucide-react";
import { WebsiteChatbot } from "@/components/WebsiteChatbot";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white dark:bg-gray-900 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <img 
                src="/cura-logo.svg" 
                alt="Cura EMR - Electronic Medical Records" 
                className="h-14 w-auto"
              />
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Home
              </Link>
              <Link href="/landing/features" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Features
              </Link>
              <Link href="/landing/pricing" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Pricing
              </Link>
              <Link href="/landing/about" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                About Us
              </Link>
              <Link href="/auth/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6 py-2 rounded-lg font-medium">
                  Client Portal
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Link href="/auth/login">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <div className="inline-flex items-center bg-white/20 backdrop-blur text-white px-6 py-3 rounded-full text-sm font-medium mb-8">
                <Award className="w-4 h-4 mr-2" />
                Trusted by 500+ Healthcare Practices Across the UK
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Professional
                <span className="block text-blue-200">Electronic Medical Records</span>
              </h1>
              <p className="text-xl text-blue-100 mb-10 leading-relaxed">
                Cura EMR transforms healthcare delivery with intelligent patient management, 
                AI-powered clinical insights, and comprehensive practice automation designed 
                specifically for modern healthcare professionals.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/auth/login">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-10 py-4 rounded-lg shadow-xl font-semibold">
                    Start Free 30-Day Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/landing/features">
                  <Button size="lg" variant="outline" className="text-lg px-10 py-4 rounded-lg border-2 border-white text-white hover:bg-white hover:text-blue-600 bg-transparent">
                    Watch Demo
                  </Button>
                </Link>
              </div>

              {/* Credentials Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                  <Shield className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-xs font-medium text-white">GDPR</div>
                  <div className="text-xs text-blue-200">Compliant</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                  <Clock className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-xs font-medium text-white">99.9%</div>
                  <div className="text-xs text-blue-200">Uptime</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                  <Award className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-xs font-medium text-white">NHS</div>
                  <div className="text-xs text-blue-200">Approved</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                  <Users className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-xs font-medium text-white">24/7</div>
                  <div className="text-xs text-blue-200">Support</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-2xl">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-12 flex items-center justify-center aspect-video">
                  <div className="text-white text-center">
                    <Brain className="w-24 h-24 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold">Modern Healthcare Technology</h3>
                    <p className="text-blue-100 mt-2">AI-Powered Medical Solutions</p>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 bg-yellow-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  AI-Powered
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              See Cura EMR in Action
            </h2>
            <p className="text-lg text-gray-600">
              Experience the power of intelligent healthcare management
            </p>
          </div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl p-2">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-12 aspect-video flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-20 h-20 mx-auto mb-4 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Cura EMR Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Complete Patient Management Interface</p>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              Live Demo Available
            </div>
          </div>
        </div>
      </section>

      {/* Core Services */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium mb-6">
              COMPREHENSIVE SOLUTIONS
            </div>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Healthcare Technology
              <span className="block text-blue-600">That Works For You</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              From patient records to AI-powered insights, Cura EMR provides everything your healthcare practice needs 
              to deliver exceptional care while maintaining the highest standards of security and compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 p-8">
              <div className="text-left">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Brain className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">AI Clinical Intelligence</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Advanced machine learning algorithms provide real-time risk assessment, 
                  drug interaction monitoring, and evidence-based treatment recommendations.
                </p>
                <div className="text-sm text-blue-600 font-medium">Powered by GPT-4 →</div>
              </div>
            </div>

            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 p-8">
              <div className="text-left">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Smart Scheduling</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Intelligent appointment management with automated patient reminders, 
                  conflict detection, and optimized provider scheduling algorithms.
                </p>
                <div className="text-sm text-blue-600 font-medium">40% fewer no-shows →</div>
              </div>
            </div>

            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 p-8">
              <div className="text-left">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Complete Patient Records</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Comprehensive electronic health records with secure document management, 
                  medical history tracking, and instant clinical data access.
                </p>
                <div className="text-sm text-blue-600 font-medium">Instant access →</div>
              </div>
            </div>

            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 p-8">
              <div className="text-left">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Video className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Telemedicine Solutions</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Integrated video consultations, secure patient messaging, 
                  and remote monitoring capabilities for comprehensive virtual care.
                </p>
                <div className="text-sm text-blue-600 font-medium">BigBlueButton integration →</div>
              </div>
            </div>

            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 p-8">
              <div className="text-left">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Enterprise Security</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Military-grade encryption, comprehensive audit trails, 
                  and multi-tenant architecture ensuring complete data isolation.
                </p>
                <div className="text-sm text-blue-600 font-medium">Bank-level security →</div>
              </div>
            </div>

            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 p-8">
              <div className="text-left">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Mobile Excellence</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Native iOS and Android applications with offline synchronization, 
                  push notifications, and voice-powered clinical documentation.
                </p>
                <div className="text-sm text-blue-600 font-medium">Flutter-powered →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Cura */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block bg-green-600 text-white px-4 py-1 rounded-full text-sm font-medium mb-6">
              PROVEN EXCELLENCE
            </div>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Why Leading Healthcare
              <span className="block text-blue-600">Practices Choose Cura</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Over 500 healthcare practices across the UK trust Cura EMR to deliver exceptional patient care, 
              streamline operations, and maintain the highest standards of clinical excellence.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">Clinical Efficiency</h4>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Reduce administrative burden by 89% with intelligent automation and AI-assisted clinical documentation.
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">Patient Safety</h4>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    AI-powered risk assessment and drug interaction monitoring enhance patient safety and clinical outcomes.
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">Seamless Integration</h4>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Works with existing healthcare systems while providing comprehensive mobile access for modern care delivery.
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-4">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">Regulatory Compliance</h4>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Complete GDPR compliance with NHS approval ensures your practice meets all regulatory requirements.
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <Link href="/auth/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg rounded-lg shadow-lg font-semibold">
                    Schedule Your Personal Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl">
              <h3 className="text-2xl font-bold mb-8 text-center">Practice Transformation</h3>
              <div className="space-y-8">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">89%</div>
                  <div className="text-lg font-medium mb-1">Efficiency Gain</div>
                  <div className="text-sm text-blue-200">Less admin work</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">95%</div>
                  <div className="text-lg font-medium mb-1">Satisfaction Rate</div>
                  <div className="text-sm text-blue-200">Happy practitioners</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">500+</div>
                  <div className="text-lg font-medium mb-1">Active Practices</div>
                  <div className="text-sm text-blue-200">Across the UK</div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-blue-500">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-200" />
                    <span className="text-sm font-medium">GDPR Compliant</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Award className="w-5 h-5 mr-2 text-blue-200" />
                    <span className="text-sm font-medium">NHS Approved System</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Success Stories */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block bg-yellow-500 text-white px-4 py-1 rounded-full text-sm font-medium mb-6">
              CLIENT SUCCESS
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Real Results From
              <span className="block text-blue-600">Healthcare Leaders</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Discover how leading healthcare practices are transforming patient care and operational efficiency with Cura EMR.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                  SM
                </div>
                <div>
                  <div className="font-bold text-gray-900">Dr. Sarah Mitchell</div>
                  <div className="text-sm text-gray-600">General Practice, London</div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">
                "The transformation has been remarkable. Our administrative workload decreased by 75%, 
                and the AI clinical insights have helped us catch several critical conditions early. 
                Absolutely game-changing for our practice."
              </p>
              <div className="flex items-center text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 text-yellow-400">★</div>
                ))}
                <span className="ml-2 text-sm text-gray-600 font-medium">Excellent</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                  JH
                </div>
                <div>
                  <div className="font-bold text-gray-900">Dr. James Harrison</div>
                  <div className="text-sm text-gray-600">Specialist Clinic, Manchester</div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">
                "Security was our biggest concern, but Cura's GDPR compliance framework exceeded our expectations. 
                The seamless patient communication and data protection give us complete confidence."
              </p>
              <div className="flex items-center text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 text-yellow-400">★</div>
                ))}
                <span className="ml-2 text-sm text-gray-600 font-medium">Outstanding</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                  PP
                </div>
                <div>
                  <div className="font-bold text-gray-900">Dr. Priya Patel</div>
                  <div className="text-sm text-gray-600">Multi-Site Practice, Birmingham</div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">
                "Managing multiple locations became effortless with Cura. The mobile apps allow real-time access 
                to patient records across all sites, and the implementation team made the transition seamless."
              </p>
              <div className="flex items-center text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 text-yellow-400">★</div>
                ))}
                <span className="ml-2 text-sm text-gray-600 font-medium">Exceptional</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Excellence */}
      <section className="py-24 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium mb-6">
              IMPLEMENTATION EXCELLENCE
            </div>
            <h2 className="text-5xl font-bold mb-6">
              White-Glove Implementation
              <span className="block text-blue-400 mt-2">& Enterprise Support</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Our expert implementation team ensures rapid deployment with zero disruption to your practice operations.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-4">
                    1
                  </div>
                  <h4 className="font-bold text-xl">Discovery & Assessment</h4>
                </div>
                <p className="text-gray-300 ml-14">
                  Comprehensive practice analysis and customization planning
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold mr-4">
                    2
                  </div>
                  <h4 className="font-bold text-xl">Deployment & Migration</h4>
                </div>
                <p className="text-gray-300 ml-14">
                  Secure data migration and system configuration with zero downtime
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold mr-4">
                    3
                  </div>
                  <h4 className="font-bold text-xl">Training & Go-Live</h4>
                </div>
                <p className="text-gray-300 ml-14">
                  Comprehensive staff certification and seamless system launch
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-10 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Implementation Guarantee</h3>
              
              <div className="space-y-6">
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="w-6 h-6 mr-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium">Dedicated implementation specialist</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="w-6 h-6 mr-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium">Complete staff training program</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="w-6 h-6 mr-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium">Secure data migration guarantee</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="w-6 h-6 mr-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium">Ongoing technical support</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">6 Weeks</div>
                <div className="text-sm text-gray-600 font-medium">Average Implementation Time</div>
              </div>
              
              <div className="mt-8">
                <Link href="/auth/login">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg rounded-lg font-semibold shadow-lg">
                    Begin Implementation Process
                  </Button>
                </Link>
              </div>
            </div>
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
                  src="/cura-logo.svg" 
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