import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale, AlertTriangle } from "lucide-react";

const curaLogoPath = "/cura-logo.png";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-md dark:bg-gray-900/95 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-3">
              <img 
                src={curaLogoPath} 
                alt="Cura EMR" 
                className="h-16 w-auto"
              />
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Scale className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Last updated: {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Agreement to Terms</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              These Terms of Service ("Terms") govern your use of the Cura EMR platform operated by 
              Cura Software Limited, a company incorporated in England & Wales under registration number 
              16556912, whose registered office is at Ground Floor Unit 2, Drayton Court, Drayton Road, 
              Solihull, England B90 4NG.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              By accessing or using our service, you agree to be bound by these Terms. If you disagree 
              with any part of these terms, then you may not access the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. Description of Service</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Cura EMR is a comprehensive Electronic Medical Records platform that provides:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Patient management and medical record storage</li>
              <li>Appointment scheduling and calendar management</li>
              <li>AI-powered clinical insights and decision support</li>
              <li>Telemedicine and video consultation capabilities</li>
              <li>Prescription management and pharmacy integration</li>
              <li>Mobile applications for healthcare providers and patients</li>
              <li>Secure messaging and communication tools</li>
              <li>Compliance monitoring and reporting features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. User Accounts and Responsibilities</h2>
            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Account Registration</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must be a licensed healthcare professional or authorised healthcare organisation</li>
              <li>Each user account must be associated with a single individual</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">User Responsibilities</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Comply with all applicable healthcare regulations and professional standards</li>
              <li>Maintain appropriate professional conduct when using the platform</li>
              <li>Ensure patient data is handled in accordance with UK GDPR and NHS guidelines</li>
              <li>Report any security incidents or data breaches immediately</li>
              <li>Keep your professional licences and credentials current</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. Acceptable Use Policy</h2>
            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Permitted Uses</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You may use the service only for lawful healthcare purposes in accordance with your 
              professional duties and applicable regulations.
            </p>

            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Prohibited Uses</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Violating any laws, regulations, or professional standards</li>
              <li>Accessing or attempting to access accounts or data without authorisation</li>
              <li>Transmitting malicious code, viruses, or harmful content</li>
              <li>Using the service for non-healthcare purposes</li>
              <li>Sharing account credentials with unauthorised persons</li>
              <li>Reverse engineering or attempting to extract source code</li>
              <li>Interfering with the security or functionality of the service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Data Protection and Privacy</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Your use of the service is also governed by our Privacy Policy, which forms part of these Terms. 
              Key principles include:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>All patient data remains under your control as the data controller</li>
              <li>We act as a data processor in accordance with UK GDPR requirements</li>
              <li>Data is encrypted in transit and at rest using industry-standard methods</li>
              <li>We maintain comprehensive audit trails for all data access</li>
              <li>Patient consent must be obtained where required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. Payment Terms</h2>
            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Subscription Fees</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Fees are charged monthly or annually as selected during subscription</li>
              <li>All fees are exclusive of VAT, which will be added where applicable</li>
              <li>Payment is due in advance for each billing period</li>
              <li>We accept major credit cards and direct debit payments</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Free Trial</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We offer a 14-day free trial for new customers. No payment information is required 
              during the trial period. The trial automatically expires unless you upgrade to a paid plan.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Intellectual Property</h2>
            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Our Intellectual Property</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The Cura EMR platform, including all software, documentation, and related materials, 
              is owned by Cura Software Limited and protected by copyright, trademark, and other 
              intellectual property laws.
            </p>

            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Your Content</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You retain ownership of all medical records, patient data, and other content you 
              upload to the platform. You grant us a limited licence to process this data solely 
              for the purpose of providing the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">8. Service Availability</h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>We aim to provide 99.9% uptime availability</li>
              <li>Scheduled maintenance will be notified in advance</li>
              <li>Emergency maintenance may occur without prior notice</li>
              <li>We provide 24/7 monitoring and support for critical issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">9. Limitation of Liability</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">Important Legal Notice</p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    This section contains important limitations on our liability. Please read carefully.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              To the maximum extent permitted by law, Cura Software Limited shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Any indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Damages arising from your use or inability to use the service</li>
              <li>Third-party actions or content</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Our total liability in any circumstances shall not exceed the fees paid by you 
              in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">10. Termination</h2>
            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Termination by You</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You may terminate your account at any time by contacting our support team. 
              Upon termination, you will have 30 days to export your data before it is permanently deleted.
            </p>

            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Termination by Us</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may terminate your account if you breach these Terms, fail to pay fees, 
              or if continued provision of service becomes impractical or unlawful.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">11. Governing Law</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              These Terms are governed by English law and any disputes will be subject to 
              the exclusive jurisdiction of the English courts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">12. Contact Information</h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Legal Enquiries</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Email: <a href="mailto:legal@curaemr.ai" className="text-blue-600 hover:text-blue-800">legal@curaemr.ai</a>
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Address: Ground Floor Unit 2, Drayton Court, Drayton Road, Solihull, England B90 4NG
              </p>
              
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">General Support</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Email: <a href="mailto:support@curaemr.ai" className="text-blue-600 hover:text-blue-800">support@curaemr.ai</a>
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Phone: +44 (0) 121 456 7890
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}