import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Eye, Lock, FileText } from "lucide-react";

const curaLogoPath = "/cura-logo.png";

export default function PrivacyPolicy() {
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
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Last updated: {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Company Information</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This Privacy Policy is provided by Cura Software Limited, a company incorporated in England & Wales 
              under registration number 16556912, whose registered office is situated at Ground Floor Unit 2, 
              Drayton Court, Drayton Road, Solihull, England B90 4NG.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Cura Software Limited operates the Cura EMR platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Personal Information</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Name, email address, and contact details</li>
              <li>Professional credentials and medical licence information</li>
              <li>Organisation and practice details</li>
              <li>Payment and billing information</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Health Information</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Patient medical records and health data</li>
              <li>Treatment notes and clinical observations</li>
              <li>Prescription and medication information</li>
              <li>Diagnostic results and medical imaging</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">Technical Information</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>IP addresses and device identifiers</li>
              <li>Browser type and operating system</li>
              <li>Usage patterns and system performance data</li>
              <li>Security logs and access records</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>To provide and maintain the Cura EMR service</li>
              <li>To process patient medical records and healthcare data</li>
              <li>To facilitate communication between healthcare providers and patients</li>
              <li>To generate clinical insights and AI-powered recommendations</li>
              <li>To ensure compliance with healthcare regulations</li>
              <li>To provide customer support and technical assistance</li>
              <li>To improve our services and develop new features</li>
              <li>To send important updates and notifications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. Legal Basis for Processing</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Under the UK GDPR, we process personal data on the following legal bases:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li><strong>Consent:</strong> Where you have given clear consent for us to process your personal data</li>
              <li><strong>Contract:</strong> Where processing is necessary for the performance of a contract</li>
              <li><strong>Legal Obligation:</strong> Where processing is necessary for compliance with legal obligations</li>
              <li><strong>Vital Interests:</strong> Where processing is necessary to protect vital interests of patients</li>
              <li><strong>Public Task:</strong> Where processing is necessary for healthcare provision</li>
              <li><strong>Legitimate Interests:</strong> Where processing is necessary for our legitimate business interests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Healthcare providers within your organisation</li>
              <li>Authorised third-party service providers</li>
              <li>NHS systems and healthcare networks (where applicable)</li>
              <li>Regulatory bodies and government agencies (when required by law)</li>
              <li>Emergency services (in life-threatening situations)</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We never sell or rent your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. Data Security</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We implement robust security measures including:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>End-to-end encryption for all data transmission</li>
              <li>Multi-factor authentication for user access</li>
              <li>Regular security audits and penetration testing</li>
              <li>Secure data centres with 24/7 monitoring</li>
              <li>Role-based access controls and audit trails</li>
              <li>Regular staff training on data protection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Your Rights</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Under the UK GDPR, you have the following rights:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li><strong>Right of Access:</strong> To obtain copies of your personal data</li>
              <li><strong>Right to Rectification:</strong> To correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> To request deletion of your personal data</li>
              <li><strong>Right to Restrict Processing:</strong> To limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> To receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> To object to certain types of processing</li>
              <li><strong>Rights Related to Automated Decision Making:</strong> Including profiling</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">8. Data Retention</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We retain personal data for as long as necessary to fulfil the purposes outlined in this policy, 
              including:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>Medical records: In accordance with NHS retention schedules (typically 8-10 years)</li>
              <li>Account information: For the duration of your subscription plus 7 years</li>
              <li>Technical logs: Up to 2 years for security and system optimisation</li>
              <li>Financial records: 7 years as required by UK law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">9. International Transfers</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Where we transfer personal data outside the UK/EEA, we ensure appropriate safeguards are in place, 
              including Standard Contractual Clauses and adequacy decisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">10. Contact Information</h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Data Protection Officer</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Email: <a href="mailto:dpo@curaemr.ai" className="text-blue-600 hover:text-blue-800">dpo@curaemr.ai</a>
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Address: Ground Floor Unit 2, Drayton Court, Drayton Road, Solihull, England B90 4NG
              </p>
              
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">General Enquiries</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Email: <a href="mailto:info@curaemr.ai" className="text-blue-600 hover:text-blue-800">info@curaemr.ai</a>
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Phone: +44 (0) 121 456 7890
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">11. Changes to This Policy</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any significant 
              changes by email or through our service notifications.
            </p>
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