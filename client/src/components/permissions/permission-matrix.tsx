import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  FileText, 
  Pill, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Brain, 
  MessageSquare, 
  Video,
  Activity,
  Microscope,
  TestTube,
  Camera,
  Mic,
  FileEdit,
  Zap,
  Smartphone,
  Link
} from "lucide-react";

interface PermissionMatrixProps {
  permissions: any;
  onChange: (permissions: any) => void;
  role: string;
  readonly?: boolean;
}

const MODULE_DEFINITIONS = [
  { key: 'patients', label: 'Patient Management', icon: Users, description: 'Manage patient records and demographics' },
  { key: 'appointments', label: 'Appointments', icon: Calendar, description: 'Schedule and manage appointments' },
  { key: 'medicalRecords', label: 'Medical Records', icon: FileText, description: 'Access and edit medical records' },
  { key: 'prescriptions', label: 'Prescriptions', icon: Pill, description: 'Prescribe and manage medications' },
  { key: 'billing', label: 'Billing & Payments', icon: CreditCard, description: 'Handle billing and financial data' },
  { key: 'analytics', label: 'Analytics Dashboard', icon: BarChart3, description: 'View reports and analytics' },
  { key: 'userManagement', label: 'User Management', icon: Users, description: 'Manage users and permissions' },
  { key: 'settings', label: 'System Settings', icon: Settings, description: 'Configure system settings' },
  { key: 'aiInsights', label: 'AI Clinical Insights', icon: Brain, description: 'AI-powered clinical recommendations' },
  { key: 'messaging', label: 'Messaging Center', icon: MessageSquare, description: 'Internal messaging and communications' },
  { key: 'telemedicine', label: 'Telemedicine', icon: Video, description: 'Video consultations and remote care' },
  { key: 'populationHealth', label: 'Population Health', icon: Activity, description: 'Population health management' },
  { key: 'clinicalDecision', label: 'Clinical Decision Support', icon: Microscope, description: 'Clinical decision tools' },
  { key: 'labResults', label: 'Lab Results', icon: TestTube, description: 'Laboratory test results' },
  { key: 'medicalImaging', label: 'Medical Imaging', icon: Camera, description: 'Medical imaging and radiology' },
  { key: 'voiceDocumentation', label: 'Voice Documentation', icon: Mic, description: 'Voice notes and transcription' },
  { key: 'forms', label: 'Clinical Forms', icon: FileEdit, description: 'Clinical forms and documentation' },
  { key: 'integrations', label: 'Integrations', icon: Link, description: 'Third-party integrations' },
  { key: 'automation', label: 'Workflow Automation', icon: Zap, description: 'Automated workflows and rules' },
  { key: 'mobileHealth', label: 'Mobile Health', icon: Smartphone, description: 'Mobile health monitoring' },
];

const FIELD_DEFINITIONS = [
  { key: 'patientSensitiveInfo', label: 'Patient Sensitive Information', description: 'Social security, sensitive personal data' },
  { key: 'financialData', label: 'Financial Data', description: 'Billing information, payment details' },
  { key: 'medicalHistory', label: 'Medical History', description: 'Complete medical history and conditions' },
  { key: 'prescriptionDetails', label: 'Prescription Details', description: 'Drug details, dosages, contraindications' },
  { key: 'labResults', label: 'Lab Results', description: 'Laboratory test results and values' },
  { key: 'imagingResults', label: 'Imaging Results', description: 'Radiology and imaging study results' },
  { key: 'billingInformation', label: 'Billing Information', description: 'Invoices, payment history, insurance' },
  { key: 'insuranceDetails', label: 'Insurance Details', description: 'Insurance policies and coverage' },
];

const ROLE_TEMPLATES = {
  admin: {
    modules: Object.fromEntries(MODULE_DEFINITIONS.map(mod => [mod.key, { view: true, create: true, edit: true, delete: true }])),
    fields: Object.fromEntries(FIELD_DEFINITIONS.map(field => [field.key, true])),
  },
  doctor: {
    modules: {
      patients: { view: true, create: true, edit: true, delete: false },
      appointments: { view: true, create: true, edit: true, delete: true },
      medicalRecords: { view: true, create: true, edit: true, delete: false },
      prescriptions: { view: true, create: true, edit: true, delete: false },
      billing: { view: true, create: false, edit: false, delete: false },
      analytics: { view: true, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: true, create: true, edit: true, delete: false },
      messaging: { view: true, create: true, edit: true, delete: false },
      telemedicine: { view: true, create: true, edit: true, delete: false },
      populationHealth: { view: true, create: false, edit: false, delete: false },
      clinicalDecision: { view: true, create: true, edit: true, delete: false },
      labResults: { view: true, create: true, edit: true, delete: false },
      medicalImaging: { view: true, create: true, edit: true, delete: false },
      voiceDocumentation: { view: true, create: true, edit: true, delete: true },
      forms: { view: true, create: true, edit: true, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: true, create: false, edit: false, delete: false },
      mobileHealth: { view: true, create: false, edit: false, delete: false },
    },
    fields: {
      patientSensitiveInfo: true,
      financialData: false,
      medicalHistory: true,
      prescriptionDetails: true,
      labResults: true,
      imagingResults: true,
      billingInformation: true,
      insuranceDetails: true,
    }
  },
  nurse: {
    modules: {
      patients: { view: true, create: true, edit: true, delete: false },
      appointments: { view: true, create: true, edit: true, delete: false },
      medicalRecords: { view: true, create: true, edit: true, delete: false },
      prescriptions: { view: true, create: false, edit: false, delete: false },
      billing: { view: true, create: false, edit: false, delete: false },
      analytics: { view: true, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: true, create: false, edit: false, delete: false },
      messaging: { view: true, create: true, edit: true, delete: false },
      telemedicine: { view: true, create: false, edit: false, delete: false },
      populationHealth: { view: true, create: false, edit: false, delete: false },
      clinicalDecision: { view: true, create: false, edit: false, delete: false },
      labResults: { view: true, create: true, edit: true, delete: false },
      medicalImaging: { view: true, create: false, edit: false, delete: false },
      voiceDocumentation: { view: true, create: true, edit: true, delete: true },
      forms: { view: true, create: true, edit: true, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: true, create: false, edit: false, delete: false },
      mobileHealth: { view: true, create: false, edit: false, delete: false },
    },
    fields: {
      patientSensitiveInfo: true,
      financialData: false,
      medicalHistory: true,
      prescriptionDetails: true,
      labResults: true,
      imagingResults: true,
      billingInformation: false,
      insuranceDetails: false,
    }
  },
  receptionist: {
    modules: {
      patients: { view: true, create: true, edit: true, delete: false },
      appointments: { view: true, create: true, edit: true, delete: false },
      medicalRecords: { view: false, create: false, edit: false, delete: false },
      prescriptions: { view: false, create: false, edit: false, delete: false },
      billing: { view: true, create: true, edit: true, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: false, create: false, edit: false, delete: false },
      messaging: { view: true, create: true, edit: true, delete: false },
      telemedicine: { view: false, create: false, edit: false, delete: false },
      populationHealth: { view: false, create: false, edit: false, delete: false },
      clinicalDecision: { view: false, create: false, edit: false, delete: false },
      labResults: { view: false, create: false, edit: false, delete: false },
      medicalImaging: { view: false, create: false, edit: false, delete: false },
      voiceDocumentation: { view: false, create: false, edit: false, delete: false },
      forms: { view: true, create: true, edit: true, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: false, create: false, edit: false, delete: false },
      mobileHealth: { view: false, create: false, edit: false, delete: false },
    },
    fields: {
      patientSensitiveInfo: false,
      financialData: true,
      medicalHistory: false,
      prescriptionDetails: false,
      labResults: false,
      imagingResults: false,
      billingInformation: true,
      insuranceDetails: true,
    }
  },
  patient: {
    modules: {
      patients: { view: true, create: false, edit: true, delete: false },
      appointments: { view: true, create: true, edit: false, delete: false },
      medicalRecords: { view: true, create: false, edit: false, delete: false },
      prescriptions: { view: true, create: false, edit: false, delete: false },
      billing: { view: true, create: false, edit: false, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: true, create: false, edit: false, delete: false },
      messaging: { view: true, create: true, edit: false, delete: false },
      telemedicine: { view: true, create: false, edit: false, delete: false },
      populationHealth: { view: false, create: false, edit: false, delete: false },
      clinicalDecision: { view: false, create: false, edit: false, delete: false },
      labResults: { view: true, create: false, edit: false, delete: false },
      medicalImaging: { view: true, create: false, edit: false, delete: false },
      voiceDocumentation: { view: false, create: false, edit: false, delete: false },
      forms: { view: true, create: false, edit: false, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: false, create: false, edit: false, delete: false },
      mobileHealth: { view: true, create: false, edit: false, delete: false },
    },
    fields: {
      patientSensitiveInfo: true,
      financialData: false,
      medicalHistory: true,
      prescriptionDetails: true,
      labResults: true,
      imagingResults: true,
      billingInformation: true,
      insuranceDetails: true,
    }
  },
  sample_taker: {
    modules: {
      patients: { view: true, create: false, edit: false, delete: false },
      appointments: { view: true, create: false, edit: false, delete: false },
      medicalRecords: { view: false, create: false, edit: false, delete: false },
      prescriptions: { view: false, create: false, edit: false, delete: false },
      billing: { view: false, create: false, edit: false, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: false, create: false, edit: false, delete: false },
      messaging: { view: true, create: true, edit: false, delete: false },
      telemedicine: { view: false, create: false, edit: false, delete: false },
      populationHealth: { view: false, create: false, edit: false, delete: false },
      clinicalDecision: { view: false, create: false, edit: false, delete: false },
      labResults: { view: true, create: true, edit: true, delete: false },
      medicalImaging: { view: false, create: false, edit: false, delete: false },
      voiceDocumentation: { view: false, create: false, edit: false, delete: false },
      forms: { view: true, create: false, edit: false, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: false, create: false, edit: false, delete: false },
      mobileHealth: { view: false, create: false, edit: false, delete: false },
    },
    fields: {
      patientSensitiveInfo: false,
      financialData: false,
      medicalHistory: false,
      prescriptionDetails: false,
      labResults: true,
      imagingResults: false,
      billingInformation: false,
      insuranceDetails: false,
    }
  }
};

export function PermissionMatrix({ permissions, onChange, role, readonly = false }: PermissionMatrixProps) {
  const [currentPermissions, setCurrentPermissions] = useState(permissions || { modules: {}, fields: {} });

  useEffect(() => {
    setCurrentPermissions(permissions || { modules: {}, fields: {} });
  }, [permissions]);

  const applyRoleTemplate = (templateRole: string) => {
    const template = ROLE_TEMPLATES[templateRole as keyof typeof ROLE_TEMPLATES];
    if (template) {
      setCurrentPermissions(template);
      onChange(template);
    }
  };

  const updateModulePermission = (moduleKey: string, action: string, value: boolean) => {
    const updated = {
      ...currentPermissions,
      modules: {
        ...currentPermissions.modules,
        [moduleKey]: {
          ...currentPermissions.modules?.[moduleKey],
          [action]: value
        }
      }
    };
    setCurrentPermissions(updated);
    onChange(updated);
  };

  const updateFieldPermission = (fieldKey: string, value: boolean) => {
    const updated = {
      ...currentPermissions,
      fields: {
        ...currentPermissions.fields,
        [fieldKey]: value
      }
    };
    setCurrentPermissions(updated);
    onChange(updated);
  };

  const getPermissionValue = (moduleKey: string, action: string) => {
    return currentPermissions.modules?.[moduleKey]?.[action] || false;
  };

  const getFieldValue = (fieldKey: string) => {
    return currentPermissions.fields?.[fieldKey] || false;
  };

  return (
    <div className="space-y-6">
      {/* Role Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Permission Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.keys(ROLE_TEMPLATES).map((templateRole) => (
              <Button
                key={templateRole}
                variant={role === templateRole ? "default" : "outline"}
                size="sm"
                onClick={() => applyRoleTemplate(templateRole)}
              >
                Apply {templateRole} Template
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Module Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 pb-2 border-b font-medium text-sm">
              <div>Module</div>
              <div className="text-center">View</div>
              <div className="text-center">Create</div>
              <div className="text-center">Edit</div>
              <div className="text-center">Delete</div>
            </div>
            
            {MODULE_DEFINITIONS.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.key} className="grid grid-cols-5 gap-4 items-center py-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-neutral-600" />
                    <div>
                      <div className="font-medium">{module.label}</div>
                      <div className="text-xs text-neutral-500">{module.description}</div>
                    </div>
                  </div>
                  
                  {['view', 'create', 'edit', 'delete'].map((action) => (
                    <div key={action} className="flex justify-center">
                      <Checkbox
                        checked={getPermissionValue(module.key, action)}
                        disabled={readonly}
                        onCheckedChange={(checked) => {
                          if (!readonly) {
                            updateModulePermission(module.key, action, checked as boolean);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Field Access Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Field Access Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-2 border-b font-medium text-sm">
              <div>Field Category</div>
              <div className="text-center">Access Allowed</div>
            </div>
            
            {FIELD_DEFINITIONS.map((field) => (
              <div key={field.key} className="grid grid-cols-2 gap-4 items-center py-2 border-b border-neutral-100">
                <div>
                  <div className="font-medium">{field.label}</div>
                  <div className="text-xs text-neutral-500">{field.description}</div>
                </div>
                
                <div className="flex justify-center">
                  <Checkbox
                    checked={getFieldValue(field.key)}
                    disabled={readonly}
                    onCheckedChange={(checked) => {
                      if (!readonly) {
                        updateFieldPermission(field.key, checked as boolean);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Modules with Full Access:</strong>{" "}
              <span className="text-neutral-600">
                {MODULE_DEFINITIONS.filter(mod => 
                  getPermissionValue(mod.key, 'view') && 
                  getPermissionValue(mod.key, 'create') && 
                  getPermissionValue(mod.key, 'edit') && 
                  getPermissionValue(mod.key, 'delete')
                ).length}
              </span>
            </div>
            <div className="text-sm">
              <strong>Modules with View Only:</strong>{" "}
              <span className="text-neutral-600">
                {MODULE_DEFINITIONS.filter(mod => 
                  getPermissionValue(mod.key, 'view') && 
                  !getPermissionValue(mod.key, 'create') && 
                  !getPermissionValue(mod.key, 'edit') && 
                  !getPermissionValue(mod.key, 'delete')
                ).length}
              </span>
            </div>
            <div className="text-sm">
              <strong>Field Categories Accessible:</strong>{" "}
              <span className="text-neutral-600">
                {FIELD_DEFINITIONS.filter(field => getFieldValue(field.key)).length} of {FIELD_DEFINITIONS.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}