import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Check, FileText, Users, Lock } from "lucide-react";

const curaLogoPath = "/cura-logo.png";

export default function GDPRCompliance() {
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
            <Shield className="h-8 w-8 text-green-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">GDPR Compliance</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            How Cura Software Limited ensures full compliance with UK GDPR and data protection regulations
          </p>
        </div>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Our Commitment to Data Protection</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Cura Software Limited is fully committed to protecting your personal data and respecting your privacy rights. 
              As a healthcare technology company processing sensitive medical information, we maintain the highest standards 
              of data protection compliance.
            </p>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-start">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-2">Fully UK GDPR Compliant</h3>
                  <p className="text-green-800 dark:text-green-200">
                    Our platform and processes have been designed from the ground up to meet and exceed UK GDPR requirements 
                    for healthcare data processing.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Legal Framework</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">UK GDPR</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Full compliance with the UK General Data Protection Regulation as retained and modified by UK law.
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-4" />
                <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Data Protection Act 2018</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Adherence to UK-specific data protection requirements and healthcare regulations.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Data Processing Principles</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Lawfulness, Fairness, and Transparency</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    All processing activities have a clear lawful basis and are conducted transparently with appropriate notifications.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Purpose Limitation</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    Data is collected for specified, explicit, and legitimate healthcare purposes and not processed beyond these purposes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Data Minimisation</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    We only collect and process personal data that is adequate, relevant, and limited to what is necessary.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Accuracy</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    Personal data is kept accurate and up to date, with mechanisms in place for correction and deletion.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Storage Limitation</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    Data is retained only for as long as necessary, with clear retention schedules aligned to NHS guidelines.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Integrity and Confidentiality</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    Robust security measures protect against unauthorised access, loss, or damage to personal data.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Accountability</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    We can demonstrate compliance through comprehensive documentation, policies, and audit trails.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Technical and Organisational Measures</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">
                  <Lock className="inline h-5 w-5 mr-2" />
                  Technical Safeguards
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />End-to-end encryption (AES-256)</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Multi-factor authentication</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Role-based access controls</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Automated backup systems</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Network security monitoring</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Vulnerability assessments</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">
                  <Users className="inline h-5 w-5 mr-2" />
                  Organisational Measures
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Staff training programmes</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Data protection policies</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Incident response procedures</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Regular compliance audits</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Vendor due diligence</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />Business continuity planning</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Data Subject Rights</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We fully support all UK GDPR rights for data subjects, including healthcare professionals and patients:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Information Rights</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• Right to be informed</li>
                  <li>• Right of access</li>
                  <li>• Right to rectification</li>
                </ul>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Control Rights</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• Right to erasure</li>
                  <li>• Right to restrict processing</li>
                  <li>• Right to data portability</li>
                </ul>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Objection Rights</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• Right to object</li>
                  <li>• Rights related to automated decision making</li>
                  <li>• Right to lodge a complaint</li>
                </ul>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Response Times</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• Standard requests: 30 days</li>
                  <li>• Complex requests: 60 days</li>
                  <li>• Urgent requests: 72 hours</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Breach Notification</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-3 text-amber-900 dark:text-amber-100">Our Commitment</h3>
              <ul className="text-amber-800 dark:text-amber-200 space-y-2">
                <li>• Data subjects notified within 72 hours of discovery (where required)</li>
                <li>• ICO notification within 72 hours of becoming aware of a qualifying breach</li>
                <li>• Comprehensive breach assessment and documentation</li>
                <li>• Immediate containment and remediation measures</li>
                <li>• Post-incident review and process improvements</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Regulatory Oversight</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-3 text-blue-900 dark:text-blue-100">Information Commissioner's Office (ICO)</h3>
              <p className="text-blue-800 dark:text-blue-200 mb-4">
                We are registered with the ICO and comply with all UK data protection regulations. 
                Data subjects have the right to lodge complaints directly with the ICO.
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-blue-900 dark:text-blue-100">ICO Contact Details:</strong><br />
                  <span className="text-blue-800 dark:text-blue-200">
                    Website: ico.org.uk<br />
                    Phone: 0303 123 1113<br />
                    Email: casework@ico.org.uk
                  </span>
                </div>
                <div>
                  <strong className="text-blue-900 dark:text-blue-100">Our ICO Registration:</strong><br />
                  <span className="text-blue-800 dark:text-blue-200">
                    Data Controller: Cura Software Limited<br />
                    Registration Number: [Available upon request]<br />
                    Status: Current and compliant
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Contact Our Data Protection Team</h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Data Protection Officer</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Email: <a href="mailto:dpo@curaemr.ai" className="text-blue-600 hover:text-blue-800">dpo@curaemr.ai</a>
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Phone: +44 (0) 121 456 7891
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    For data protection enquiries, subject access requests, and compliance matters
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Company Address</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Cura Software Limited<br />
                    Ground Floor Unit 2, Drayton Court<br />
                    Drayton Road, Solihull<br />
                    England B90 4NG<br />
                    Company No: 16556912
                  </p>
                </div>
              </div>
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