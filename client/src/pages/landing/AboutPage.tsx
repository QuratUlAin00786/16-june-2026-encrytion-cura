import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Target, 
  Award, 
  Globe, 
  Heart,
  Shield,
  Lightbulb,
  ArrowLeft,
  Clock
} from "lucide-react";
import { WebsiteChatbot } from "@/components/WebsiteChatbot";

const curaLogoPath = "/cura-logo.png";

export default function AboutPage() {
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
              <Link href="/landing/features" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Features
              </Link>
              <Link href="/landing/pricing" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Pricing
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
            About <span className="text-blue-600">Halo Group</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            We're on a mission to revolutionise healthcare through intelligent technology, 
            making quality care accessible, efficient, and intuitive for healthcare professionals worldwide.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <Target className="h-12 w-12 text-blue-600 mb-6" />
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  To empower healthcare professionals with intelligent, user-friendly technology 
                  that reduces administrative burden and enhances patient care quality. We believe 
                  that by simplifying complex healthcare workflows, we can help medical professionals 
                  focus on what matters most - their patients.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <Lightbulb className="h-12 w-12 text-green-600 mb-6" />
                <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  A world where every healthcare provider has access to cutting-edge technology 
                  that makes their practice more efficient, their decisions more informed, 
                  and their patient relationships stronger. We envision a future where AI 
                  and human expertise work seamlessly together to deliver exceptional healthcare outcomes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Our Story
          </h2>
          
          <div className="space-y-8 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>
              Founded in Manchester, United Kingdom, Halo Group emerged from a simple yet powerful observation: 
              healthcare professionals were spending more time navigating complex software systems than caring 
              for their patients. Our founders, a team of healthcare professionals and technology experts, 
              recognised that the industry needed a fundamental shift in how medical software is designed and implemented.
            </p>
            
            <p>
              In 2024, we launched Cura EMR with the vision of creating the world's most intuitive and 
              intelligent electronic medical records system. Built from the ground up with input from 
              hundreds of healthcare professionals, Cura combines the power of artificial intelligence 
              with the wisdom of medical expertise.
            </p>
            
            <p>
              Today, Cura EMR serves healthcare providers across the UK and beyond, processing millions 
              of patient interactions and helping reduce administrative overhead by up to 89%. Our platform 
              continues to evolve, incorporating the latest advances in AI, telemedicine, and mobile technology 
              to stay at the forefront of healthcare innovation.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Our Core Values
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Patient-Centric</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Every feature we build is designed with patient welfare and healthcare outcomes at its core.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Security First</h4>
              <p className="text-gray-600 dark:text-gray-300">
                We maintain the highest standards of data security and privacy, exceeding GDPR requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="h-10 w-10 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Innovation</h4>
              <p className="text-gray-600 dark:text-gray-300">
                We continuously push the boundaries of what's possible in healthcare technology.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 dark:bg-orange-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-orange-600" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Collaboration</h4>
              <p className="text-gray-600 dark:text-gray-300">
                We work closely with healthcare professionals to ensure our solutions meet real-world needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Awards & Recognition */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Recognition & Achievements
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <Award className="h-16 w-16 text-gold-500 mx-auto mb-6" />
                <h4 className="text-xl font-semibold mb-4">HealthTech Innovation Award 2024</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Recognized for outstanding innovation in AI-powered healthcare solutions.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <Shield className="h-16 w-16 text-blue-600 mx-auto mb-6" />
                <h4 className="text-xl font-semibold mb-4">GDPR Excellence Certification</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Certified for exemplary data protection and privacy standards.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <Globe className="h-16 w-16 text-green-600 mx-auto mb-6" />
                <h4 className="text-xl font-semibold mb-4">ISO 27001 Compliant</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  International standard for information security management systems.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            Leadership Team
          </h2>
          <p className="text-xl text-center text-gray-600 dark:text-gray-300 mb-16">
            Meet the experts driving healthcare innovation at Halo Group
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">DR</span>
                </div>
                <h4 className="text-xl font-semibold mb-2">Dr. Richard Hayes</h4>
                <p className="text-blue-600 mb-4">Chief Executive Officer</p>
                <p className="text-gray-600 dark:text-gray-300">
                  Former NHS consultant with 15+ years in healthcare technology and digital transformation.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">SM</span>
                </div>
                <h4 className="text-xl font-semibold mb-2">Sarah Mitchell</h4>
                <p className="text-green-600 mb-4">Chief Technology Officer</p>
                <p className="text-gray-600 dark:text-gray-300">
                  AI and machine learning expert with experience at leading tech companies and healthcare startups.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">MJ</span>
                </div>
                <h4 className="text-xl font-semibold mb-2">Dr. Michael Johnson</h4>
                <p className="text-purple-600 mb-4">Chief Medical Officer</p>
                <p className="text-gray-600 dark:text-gray-300">
                  Practicing physician and healthcare informatics specialist with deep clinical expertise.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Ready to learn more about how Cura EMR can transform your practice?
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h4 className="font-semibold text-lg mb-4">Headquarters</h4>
                <div className="text-gray-600 dark:text-gray-300 space-y-2">
                  <div>Halo Group Ltd</div>
                  <div>123 Healthcare Street</div>
                  <div>Manchester Technology Centre</div>
                  <div>Manchester, M1 2AB</div>
                  <div>United Kingdom</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h4 className="font-semibold text-lg mb-4">Contact Details</h4>
                <div className="text-gray-600 dark:text-gray-300 space-y-2">
                  <div>Phone: +44 161 123 4567</div>
                  <div>Email: info@halogroup.co.uk</div>
                  <div>Support: support@cura-emr.com</div>
                  <div>Sales: sales@halogroup.co.uk</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Link href="/auth/login">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              Start Your Journey with Cura EMR
            </Button>
          </Link>
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