import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function TechSpecExport() {
  const contentRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!contentRef.current) return;

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: contentRef.current.scrollHeight,
        width: contentRef.current.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save('Cura_EMR_Technical_Specification.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cura EMR Technical Specification</h1>
          <Button onClick={generatePDF} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <div ref={contentRef} className="bg-white p-8 space-y-8" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Cover Page */}
          <div className="text-center space-y-6 page-break">
            <div className="space-y-4">
              <img 
                src="/api/placeholder/200/80" 
                alt="Cura EMR Logo" 
                className="mx-auto"
                style={{ width: '200px', height: '80px' }}
              />
              <h1 className="text-4xl font-bold text-blue-900">Cura EMR System</h1>
              <h2 className="text-2xl font-semibold text-gray-700">Technical Specification Document</h2>
            </div>
            <div className="space-y-2 text-lg text-gray-600">
              <p>Version 1.0</p>
              <p>Generated: {new Date().toLocaleDateString()}</p>
              <p>Multi-Tenant Healthcare Management Platform</p>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">Table of Contents</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>1. Executive Summary</span>
                <span>3</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>2. System Architecture Overview</span>
                <span>4</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>3. Data Model & Database Schema</span>
                <span>6</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>4. API Specification</span>
                <span>10</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>5. Frontend Architecture</span>
                <span>15</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>6. Backend Services</span>
                <span>18</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>7. Security & Compliance</span>
                <span>22</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>8. Integrations</span>
                <span>25</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>9. Mobile Applications</span>
                <span>27</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>10. Deployment & Operations</span>
                <span>30</span>
              </div>
            </div>
          </div>

          {/* 1. Executive Summary */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">1. Executive Summary</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 System Overview</h3>
            <p className="text-gray-700 mb-4">
              Cura EMR System is a comprehensive, multi-tenant Electronic Medical Records (EMR) platform designed for healthcare organizations. 
              The system provides complete healthcare management capabilities including patient management, appointment scheduling, medical records, 
              prescriptions, medical imaging, lab results, billing, and AI-powered clinical insights.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2 Key Features</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-semibold text-gray-800">Core Healthcare</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Patient Management & Records</li>
                  <li>Appointment Scheduling</li>
                  <li>Medical Records & Documentation</li>
                  <li>Prescription Management</li>
                  <li>Lab Results & Medical Imaging</li>
                  <li>Billing & Revenue Management</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Advanced Features</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>AI-Powered Clinical Insights</li>
                  <li>Telemedicine Integration</li>
                  <li>GDPR Compliance & Audit Trails</li>
                  <li>Multi-tenant SaaS Architecture</li>
                  <li>Mobile Applications (Doctor & Patient)</li>
                  <li>Voice Documentation</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">1.3 Technology Stack</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Frontend:</strong> React 18, TypeScript, Tailwind CSS, shadcn/ui<br/>
                  <strong>Backend:</strong> Node.js, Express, TypeScript<br/>
                  <strong>Database:</strong> PostgreSQL with Drizzle ORM<br/>
                </div>
                <div>
                  <strong>Mobile:</strong> Flutter (iOS & Android)<br/>
                  <strong>Authentication:</strong> JWT with Role-Based Access Control<br/>
                  <strong>Deployment:</strong> Docker, Multi-region Support<br/>
                </div>
              </div>
            </div>
          </section>

          {/* 2. System Architecture Overview */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">2. System Architecture Overview</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Architecture Patterns</h3>
            <p className="text-gray-700 mb-4">
              Cura EMR follows a modern multi-tenant SaaS architecture with clear separation of concerns:
            </p>
            <ul className="text-gray-700 list-disc ml-6 mb-4">
              <li><strong>Multi-tenant Architecture:</strong> Single application instance serves multiple healthcare organizations</li>
              <li><strong>RESTful API Design:</strong> Clean API layer with 294+ endpoints</li>
              <li><strong>Role-Based Access Control:</strong> Granular permissions for different user types</li>
              <li><strong>Event-Driven Architecture:</strong> Real-time updates via Server-Sent Events (SSE)</li>
              <li><strong>Microservices Approach:</strong> Specialized services for different domains</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 System Components</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800">Frontend Layer</h4>
                <p className="text-sm text-blue-700">React SPA with 50+ pages, component library, and responsive design</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800">API Gateway</h4>
                <p className="text-sm text-green-700">Express.js server with authentication, authorization, and tenant routing</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800">Business Logic</h4>
                <p className="text-sm text-purple-700">Specialized services for healthcare workflows, AI insights, and integrations</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800">Data Layer</h4>
                <p className="text-sm text-orange-700">PostgreSQL with 33+ tables, JSONB columns, and optimized queries</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Multi-Tenancy Implementation</h3>
            <p className="text-gray-700 mb-2">
              Tenant isolation is achieved through:
            </p>
            <ul className="text-gray-700 list-disc ml-6 mb-4">
              <li><strong>Tenant Header:</strong> X-Tenant-Subdomain header for organization identification</li>
              <li><strong>Database Isolation:</strong> organizationId column in all data tables</li>
              <li><strong>API Enforcement:</strong> Middleware ensures tenant context in all requests</li>
              <li><strong>Data Segregation:</strong> No cross-tenant data access possible</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.4 User Roles & Permissions</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-semibold">Administrative</h4>
                <ul className="list-disc ml-4">
                  <li>Admin</li>
                  <li>SaaS Owner</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-semibold">Clinical Staff</h4>
                <ul className="list-disc ml-4">
                  <li>Doctor</li>
                  <li>Nurse</li>
                  <li>Sample Taker</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-semibold">Support & Patients</h4>
                <ul className="list-disc ml-4">
                  <li>Receptionist</li>
                  <li>Patient</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Data Model & Database Schema */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">3. Data Model & Database Schema</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Core Entities</h3>
            <p className="text-gray-700 mb-4">
              The system includes 33+ database tables organized into logical domains:
            </p>

            <h4 className="text-lg font-semibold text-gray-800 mb-2">SaaS Management</h4>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>saasOwners</strong> - Platform administrators<br/>
                  <strong>saasPackages</strong> - Subscription plans & features<br/>
                  <strong>saasSubscriptions</strong> - Organization subscriptions<br/>
                </div>
                <div>
                  <strong>saasPayments</strong> - Payment transactions<br/>
                  <strong>saasInvoices</strong> - Billing invoices<br/>
                  <strong>saasSettings</strong> - Global system settings<br/>
                </div>
              </div>
            </div>

            <h4 className="text-lg font-semibold text-gray-800 mb-2">Core Healthcare</h4>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>organizations</strong> - Healthcare organizations (tenants)<br/>
                  <strong>users</strong> - System users with roles & permissions<br/>
                  <strong>patients</strong> - Patient demographics & medical history<br/>
                  <strong>appointments</strong> - Scheduling & calendar management<br/>
                </div>
                <div>
                  <strong>medicalRecords</strong> - Clinical documentation<br/>
                  <strong>prescriptions</strong> - Medication management<br/>
                  <strong>consultations</strong> - Clinical encounters<br/>
                  <strong>aiInsights</strong> - AI-generated clinical insights<br/>
                </div>
              </div>
            </div>

            <h4 className="text-lg font-semibold text-gray-800 mb-2">Specialized Healthcare</h4>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>medicalImages</strong> - Radiology & imaging studies<br/>
                  <strong>labResults</strong> - Laboratory test results<br/>
                  <strong>clinicalPhotos</strong> - Clinical photography<br/>
                  <strong>reports</strong> - Generated medical reports<br/>
                </div>
                <div>
                  <strong>inventory</strong> - Medical supply management<br/>
                  <strong>billing</strong> - Financial transactions<br/>
                  <strong>claims</strong> - Insurance claim processing<br/>
                  <strong>notifications</strong> - System notifications<br/>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Key Relationships</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <strong>Organization ↔ Users:</strong> One-to-many relationship with tenant isolation
              </div>
              <div className="bg-green-50 p-3 rounded">
                <strong>Patients ↔ Medical Records:</strong> One-to-many for patient history tracking
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <strong>Appointments ↔ Consultations:</strong> One-to-one for clinical encounters
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <strong>Users ↔ Prescriptions:</strong> Many-to-many for prescriber tracking
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Data Types & Constraints</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800">Primary Keys</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>Serial integers for all entities</li>
                  <li>Custom patient IDs (P000001, P000002)</li>
                  <li>Unique constraints on emails</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">JSON Columns</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>User permissions & settings</li>
                  <li>Patient medical history</li>
                  <li>Prescription metadata</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. API Specification */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">4. API Specification</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 API Overview</h3>
            <p className="text-gray-700 mb-4">
              The Cura EMR API provides 294+ RESTful endpoints organized into functional domains. All endpoints require authentication 
              and tenant context via headers.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Authentication & Authorization</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Headers Required</h4>
              <div className="text-sm space-y-1">
                <div><code className="bg-gray-200 px-2 py-1 rounded">Authorization: Bearer &lt;jwt_token&gt;</code></div>
                <div><code className="bg-gray-200 px-2 py-1 rounded">X-Tenant-Subdomain: &lt;organization_subdomain&gt;</code></div>
                <div><code className="bg-gray-200 px-2 py-1 rounded">Content-Type: application/json</code></div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Core API Endpoints</h3>
            
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Authentication Endpoints</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">Method</th>
                    <th className="border border-gray-300 p-2 text-left">Endpoint</th>
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-left">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2">POST</td>
                    <td className="border border-gray-300 p-2">/api/auth/login</td>
                    <td className="border border-gray-300 p-2">User authentication</td>
                    <td className="border border-gray-300 p-2">Public</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">POST</td>
                    <td className="border border-gray-300 p-2">/api/auth/logout</td>
                    <td className="border border-gray-300 p-2">User logout</td>
                    <td className="border border-gray-300 p-2">Authenticated</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">GET</td>
                    <td className="border border-gray-300 p-2">/api/auth/me</td>
                    <td className="border border-gray-300 p-2">Current user info</td>
                    <td className="border border-gray-300 p-2">Authenticated</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="text-lg font-semibold text-gray-800 mb-2">Patient Management</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">Method</th>
                    <th className="border border-gray-300 p-2 text-left">Endpoint</th>
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-left">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2">GET</td>
                    <td className="border border-gray-300 p-2">/api/patients</td>
                    <td className="border border-gray-300 p-2">List all patients</td>
                    <td className="border border-gray-300 p-2">doctor, nurse, admin</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">POST</td>
                    <td className="border border-gray-300 p-2">/api/patients</td>
                    <td className="border border-gray-300 p-2">Create new patient</td>
                    <td className="border border-gray-300 p-2">doctor, nurse, admin</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">GET</td>
                    <td className="border border-gray-300 p-2">/api/patients/:id</td>
                    <td className="border border-gray-300 p-2">Get patient details</td>
                    <td className="border border-gray-300 p-2">doctor, nurse, admin</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">PATCH</td>
                    <td className="border border-gray-300 p-2">/api/patients/:id</td>
                    <td className="border border-gray-300 p-2">Update patient</td>
                    <td className="border border-gray-300 p-2">doctor, nurse, admin</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="text-lg font-semibold text-gray-800 mb-2">Appointment Management</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">Method</th>
                    <th className="border border-gray-300 p-2 text-left">Endpoint</th>
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-left">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2">GET</td>
                    <td className="border border-gray-300 p-2">/api/appointments</td>
                    <td className="border border-gray-300 p-2">List appointments</td>
                    <td className="border border-gray-300 p-2">All roles</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">POST</td>
                    <td className="border border-gray-300 p-2">/api/appointments</td>
                    <td className="border border-gray-300 p-2">Create appointment</td>
                    <td className="border border-gray-300 p-2">doctor, nurse, receptionist</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">PATCH</td>
                    <td className="border border-gray-300 p-2">/api/appointments/:id</td>
                    <td className="border border-gray-300 p-2">Update appointment</td>
                    <td className="border border-gray-300 p-2">doctor, nurse, receptionist</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Response Formats</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800">Success Response</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "id": 123,
  "data": { ... },
  "message": "Success"
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Error Response</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [ ... ]
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* 5. Frontend Architecture */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">5. Frontend Architecture</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Technology Stack</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Core Technologies</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>React 18 with TypeScript</li>
                  <li>Vite for build tooling</li>
                  <li>Wouter for routing</li>
                  <li>TanStack Query for data fetching</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">UI & Styling</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Tailwind CSS for styling</li>
                  <li>shadcn/ui component library</li>
                  <li>Radix UI primitives</li>
                  <li>Lucide React icons</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Application Pages</h3>
            <p className="text-gray-700 mb-4">The application includes 50+ pages organized by functionality:</p>
            
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="font-semibold text-blue-800">Core Healthcare</h4>
                <ul className="list-disc ml-4 text-blue-700">
                  <li>Dashboard</li>
                  <li>Patients</li>
                  <li>Appointments</li>
                  <li>Medical Records</li>
                  <li>Prescriptions</li>
                  <li>Lab Results</li>
                </ul>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <h4 className="font-semibold text-green-800">Administrative</h4>
                <ul className="list-disc ml-4 text-green-700">
                  <li>User Management</li>
                  <li>Settings</li>
                  <li>Billing</li>
                  <li>Analytics</li>
                  <li>GDPR Compliance</li>
                  <li>Inventory</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <h4 className="font-semibold text-purple-800">Advanced Features</h4>
                <ul className="list-disc ml-4 text-purple-700">
                  <li>AI Insights</li>
                  <li>Telemedicine</li>
                  <li>Voice Documentation</li>
                  <li>Clinical Decision Support</li>
                  <li>Population Health</li>
                  <li>Automation</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Component Architecture</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Layout Components</h4>
                <p className="text-sm text-gray-700">Header, Sidebar, Navigation with role-based visibility</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Domain Components</h4>
                <p className="text-sm text-gray-700">Patient management, appointment scheduling, medical forms, dashboards</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">UI Components</h4>
                <p className="text-sm text-gray-700">Reusable shadcn/ui components with consistent design system</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.4 State Management</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800">Data Fetching</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>TanStack Query for server state</li>
                  <li>Automatic caching & invalidation</li>
                  <li>Optimistic updates</li>
                  <li>Error handling & retries</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Local State</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>React hooks for component state</li>
                  <li>Context providers for global state</li>
                  <li>Theme and auth providers</li>
                  <li>Form state with React Hook Form</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.5 Routing & Navigation</h3>
            <p className="text-gray-700 mb-2">Wouter-based routing with:</p>
            <ul className="text-gray-700 list-disc ml-6 mb-4">
              <li>Protected routes requiring authentication</li>
              <li>Role-based route access control</li>
              <li>Public landing pages and legal pages</li>
              <li>SaaS administration portal</li>
              <li>Dynamic patient and appointment routing</li>
            </ul>
          </section>

          {/* 6. Backend Services */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">6. Backend Services</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Service Architecture</h3>
            <p className="text-gray-700 mb-4">
              The backend is organized into 12 specialized services, each handling specific domain logic:
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Core Services</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li><strong>auth.ts</strong> - Authentication & JWT management</li>
                  <li><strong>email.ts</strong> - Email delivery & templates</li>
                  <li><strong>inventory.ts</strong> - Medical supply management</li>
                  <li><strong>audit-compliance.ts</strong> - Audit trails</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Healthcare Services</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li><strong>appointment-scheduler.ts</strong> - Scheduling logic</li>
                  <li><strong>prescription-management.ts</strong> - Medication workflows</li>
                  <li><strong>clinical-decision-support.ts</strong> - Clinical insights</li>
                  <li><strong>patient-monitoring.ts</strong> - Patient tracking</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Authentication Service</h3>
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-red-600">⚠️ SECURITY ISSUE IDENTIFIED</h4>
              <p className="text-sm text-red-700">
                <strong>Critical:</strong> Hardcoded JWT secret fallback found in auth.ts. 
                Production deployments MUST use environment variable JWT_SECRET.
              </p>
            </div>
            
            <div className="space-y-3 text-sm">
              <div><strong>Password Hashing:</strong> bcrypt with 12 salt rounds</div>
              <div><strong>JWT Tokens:</strong> 7-day expiry with role-based claims</div>
              <div><strong>Role Hierarchy:</strong> Admin (6) → Doctor (5) → Nurse (4) → Receptionist (3) → Sample Taker (2) → Patient (1)</div>
              <div><strong>Token Verification:</strong> Issuer and audience validation</div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 Email Service</h3>
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-red-600">⚠️ SECURITY ISSUE IDENTIFIED</h4>
              <p className="text-sm text-red-700">
                <strong>Critical:</strong> Hardcoded Gmail app password found in email.ts. 
                Production deployments MUST use environment variables for SMTP credentials.
              </p>
            </div>
            
            <div className="space-y-3 text-sm">
              <div><strong>SMTP Provider:</strong> Gmail SMTP (smtp.gmail.com:465)</div>
              <div><strong>Email Templates:</strong> HTML and text format support</div>
              <div><strong>Attachments:</strong> File attachment support for reports</div>
              <div><strong>Delivery:</strong> Production-ready with error handling</div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.4 AI & Machine Learning Services</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800">AI Integration</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>OpenAI GPT integration</li>
                  <li>Anthropic Claude support</li>
                  <li>Clinical decision support</li>
                  <li>Drug interaction analysis</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">AI Features</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>Automated clinical insights</li>
                  <li>Risk assessment alerts</li>
                  <li>Treatment recommendations</li>
                  <li>Voice-to-text documentation</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.5 Middleware Stack</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Authentication Middleware</h4>
                <p className="text-sm text-gray-700">JWT token validation, user context injection</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Tenant Middleware</h4>
                <p className="text-sm text-gray-700">X-Tenant-Subdomain header processing, organization context</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Role Authorization</h4>
                <p className="text-sm text-gray-700">Role-based access control, permission validation</p>
              </div>
            </div>
          </section>

          {/* 7. Security & Compliance */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">7. Security & Compliance</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Authentication & Authorization</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Authentication</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>JWT-based authentication</li>
                  <li>7-day token expiry</li>
                  <li>Secure password hashing (bcrypt)</li>
                  <li>Session management</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Authorization</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Role-based access control (RBAC)</li>
                  <li>Granular permissions matrix</li>
                  <li>API endpoint protection</li>
                  <li>Field-level access control</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Data Protection</h3>
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-800">Tenant Isolation</h4>
                <p className="text-sm text-green-700">Complete data segregation via organizationId enforcement</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-800">PHI Protection</h4>
                <p className="text-sm text-blue-700">Protected Health Information handling with access controls</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-800">Encryption</h4>
                <p className="text-sm text-purple-700">HTTPS/TLS in transit, database-level encryption at rest</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 GDPR Compliance</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Dedicated GDPR compliance service provides:
              </p>
              <ul className="text-sm text-gray-700 list-disc ml-4">
                <li><strong>Data Subject Rights:</strong> Access, rectification, erasure, portability</li>
                <li><strong>Consent Management:</strong> Granular consent tracking and withdrawal</li>
                <li><strong>Audit Trails:</strong> Complete audit logging for compliance reporting</li>
                <li><strong>Data Residency:</strong> Multi-region support for data localization</li>
                <li><strong>Breach Notification:</strong> Automated breach detection and reporting</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.4 Critical Security Issues</h3>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-600 mb-2">🚨 IMMEDIATE ACTION REQUIRED</h4>
              <div className="space-y-2 text-sm text-red-700">
                <div>
                  <strong>1. JWT Secret Exposure:</strong> Hardcoded fallback JWT secret in auth.ts must be replaced with environment variable
                </div>
                <div>
                  <strong>2. SMTP Credentials:</strong> Hardcoded Gmail app password in email.ts must use secure environment variables
                </div>
                <div>
                  <strong>3. Secret Management:</strong> Implement proper secrets management for production deployment
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.5 Recommended Security Measures</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800">Environment Variables</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>JWT_SECRET</li>
                  <li>SMTP_PASSWORD</li>
                  <li>DATABASE_URL</li>
                  <li>API_KEYS (OpenAI, Stripe, etc.)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Additional Measures</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>Rate limiting on API endpoints</li>
                  <li>Input validation and sanitization</li>
                  <li>SQL injection prevention</li>
                  <li>CORS configuration</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 8. Integrations */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">8. Integrations</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Payment Processing</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Stripe Integration</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Subscription billing management</li>
                  <li>Payment method storage</li>
                  <li>Invoice generation</li>
                  <li>Webhook event handling</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">PayPal Integration</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Order creation and capture</li>
                  <li>Alternative payment method</li>
                  <li>International payment support</li>
                  <li>Refund processing</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Communication Services</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Email Service</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li><strong>Provider:</strong> Gmail SMTP</li>
                  <li><strong>Configuration:</strong> smtp.gmail.com:465</li>
                  <li><strong>Features:</strong> HTML templates, attachments</li>
                  <li><strong>Use Cases:</strong> Notifications, reports, alerts</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">SMS Service</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li><strong>Provider:</strong> Twilio</li>
                  <li><strong>Features:</strong> Appointment reminders</li>
                  <li><strong>Configuration:</strong> Environment-based setup</li>
                  <li><strong>Fallback:</strong> Internal messaging system</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.3 AI & Machine Learning</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">OpenAI Integration</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>GPT models for clinical insights</li>
                  <li>Natural language processing</li>
                  <li>Medical text analysis</li>
                  <li>Automated documentation</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Anthropic Claude</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Alternative AI provider</li>
                  <li>Clinical decision support</li>
                  <li>Medical reasoning</li>
                  <li>Safety-focused AI responses</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.4 File Storage & Management</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-gray-800">Local File Storage</h4>
              <ul className="text-sm text-gray-700 list-disc ml-4">
                <li><strong>Medical Images:</strong> X-rays, CT scans, MRIs stored locally</li>
                <li><strong>Clinical Photos:</strong> Patient photos and documentation</li>
                <li><strong>Documents:</strong> PDF reports, forms, and attachments</li>
                <li><strong>Upload Handling:</strong> Multer middleware for file processing</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.5 Integration Architecture</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <strong>API-First Design:</strong> All integrations use RESTful APIs with proper error handling
              </div>
              <div className="bg-green-50 p-3 rounded">
                <strong>Environment Configuration:</strong> All API keys and secrets managed via environment variables
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <strong>Fallback Mechanisms:</strong> Graceful degradation when external services are unavailable
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <strong>Webhook Support:</strong> Event-driven integration for real-time updates
              </div>
            </div>
          </section>

          {/* 9. Mobile Applications */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">9. Mobile Applications</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.1 Mobile Architecture</h3>
            <p className="text-gray-700 mb-4">
              Cura EMR includes two Flutter-based mobile applications providing native iOS and Android experiences 
              for doctors and patients with full API integration.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.2 Doctor Mobile App</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Core Features</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Patient management and search</li>
                  <li>Appointment scheduling and calendar</li>
                  <li>Medical record creation and viewing</li>
                  <li>Prescription management</li>
                  <li>Lab results and imaging review</li>
                  <li>Clinical photography</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Advanced Features</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>AI-powered clinical insights</li>
                  <li>Voice documentation</li>
                  <li>Video consultations</li>
                  <li>Analytics and reporting</li>
                  <li>Offline data synchronization</li>
                  <li>Push notifications</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.3 Patient Mobile App</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Patient Portal Features</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Appointment booking and management</li>
                  <li>Medical history access</li>
                  <li>Prescription viewing and refills</li>
                  <li>Lab results and reports</li>
                  <li>Doctor communication</li>
                  <li>Health document upload</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Self-Service Features</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Find doctors and specialists</li>
                  <li>Insurance information management</li>
                  <li>Billing and payment history</li>
                  <li>Appointment reminders</li>
                  <li>Health tracking and monitoring</li>
                  <li>Telemedicine sessions</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.4 Technical Implementation</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Framework & Architecture</h4>
                <p className="text-sm text-gray-700">Flutter framework with Provider pattern for state management, API service layer for backend communication</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Authentication</h4>
                <p className="text-sm text-gray-700">JWT token-based authentication with secure storage, biometric authentication support</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Data Synchronization</h4>
                <p className="text-sm text-gray-700">Real-time API integration with offline capability, automatic sync when connectivity restored</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.5 App Store Deployment</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800">iOS Deployment</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>Xcode project configuration</li>
                  <li>App Store Connect integration</li>
                  <li>iOS-specific permissions</li>
                  <li>TestFlight distribution</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Android Deployment</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>Gradle build configuration</li>
                  <li>Google Play Console setup</li>
                  <li>Android permissions manifest</li>
                  <li>APK/AAB distribution</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.6 Mobile-Specific Features</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="text-sm text-gray-700 list-disc ml-4 space-y-1">
                <li><strong>Camera Integration:</strong> Clinical photography and document scanning</li>
                <li><strong>Geolocation:</strong> Location-based features for appointments and facilities</li>
                <li><strong>Push Notifications:</strong> Appointment reminders, urgent alerts, lab results</li>
                <li><strong>Biometric Authentication:</strong> Fingerprint and face recognition login</li>
                <li><strong>Offline Mode:</strong> Critical data access without internet connection</li>
                <li><strong>Device Sensors:</strong> Integration with health monitoring devices</li>
              </ul>
            </div>
          </section>

          {/* 10. Deployment & Operations */}
          <section className="page-break">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">10. Deployment & Operations</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 Environment Configuration</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Development</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Local PostgreSQL database</li>
                  <li>Hot module replacement (Vite)</li>
                  <li>Development seeding enabled</li>
                  <li>Debug logging active</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Production</h4>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  <li>Managed PostgreSQL (Neon)</li>
                  <li>Optimized build artifacts</li>
                  <li>Production health checks</li>
                  <li>Error monitoring & logging</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 Required Environment Variables</h3>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
              <h4 className="font-semibold text-red-600 mb-2">Critical Configuration</h4>
              <div className="text-sm font-mono space-y-1">
                <div>DATABASE_URL=postgresql://...</div>
                <div>JWT_SECRET=&lt;secure-random-string&gt;</div>
                <div>SMTP_PASSWORD=&lt;gmail-app-password&gt;</div>
                <div>OPENAI_API_KEY=&lt;openai-key&gt;</div>
                <div>STRIPE_SECRET_KEY=&lt;stripe-key&gt;</div>
                <div>TWILIO_ACCOUNT_SID=&lt;twilio-sid&gt;</div>
                <div>TWILIO_AUTH_TOKEN=&lt;twilio-token&gt;</div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.3 Database Management</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Schema Management</h4>
                <p className="text-sm text-gray-700">Drizzle ORM with <code>npm run db:push</code> for schema synchronization</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Data Seeding</h4>
                <p className="text-sm text-gray-700">Automatic seeding for development, optional production seeding with ENABLE_PRODUCTION_SEEDING=true</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">Backup Strategy</h4>
                <p className="text-sm text-gray-700">Automated database backups, point-in-time recovery, cross-region replication</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.4 Performance & Monitoring</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800">Performance Features</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>Query optimization with indexes</li>
                  <li>API response caching</li>
                  <li>Image compression and CDN</li>
                  <li>Database connection pooling</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Monitoring</h4>
                <ul className="list-disc ml-4 text-gray-700">
                  <li>Application performance monitoring</li>
                  <li>Database query analytics</li>
                  <li>Error tracking and alerting</li>
                  <li>Health check endpoints</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.5 Security & Compliance Operations</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <strong>Data Encryption:</strong> TLS 1.3 in transit, AES-256 at rest
              </div>
              <div className="bg-green-50 p-3 rounded">
                <strong>Access Control:</strong> VPN access for production, IP whitelisting
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <strong>Audit Logging:</strong> Complete audit trails for compliance reporting
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <strong>Backup & Recovery:</strong> Automated backups, disaster recovery procedures
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 mt-8 pt-8 border-t border-gray-200">
            <p>Cura EMR Technical Specification - Version 1.0</p>
            <p>Generated on {new Date().toLocaleDateString()}</p>
            <p>© 2025 Cura EMR System - All Rights Reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}