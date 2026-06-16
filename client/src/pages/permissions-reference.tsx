import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Shield, Check, X, Eye, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";

// Define color mapping for roles
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500",
  doctor: "bg-blue-500", 
  nurse: "bg-green-500",
  receptionist: "bg-purple-500",
  patient: "bg-orange-500",
  pharmacist: "bg-cyan-500",
  lab_technician: "bg-teal-500",
  radiologist: "bg-indigo-500",
  billing_staff: "bg-pink-500",
  hr_manager: "bg-amber-500",
  it_admin: "bg-slate-500",
  medical_records: "bg-emerald-500",
  clinical_researcher: "bg-violet-500",
  quality_assurance: "bg-rose-500",
  department_head: "bg-sky-500",
  super_admin: "bg-red-700"
};

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  edit: Edit,
  delete: Trash2
};

// Module list matching user-management.tsx
const ALL_MODULES = [
  { key: 'dashboard', name: 'Dashboard' },
  { key: 'patients', name: 'Patients' },
  { key: 'appointments', name: 'Appointments' },
  { key: 'prescriptions', name: 'Prescriptions' },
  { key: 'labResults', name: 'Lab Results' },
  { key: 'medicalImaging', name: 'Imaging' },
  { key: 'forms', name: 'Forms' },
  { key: 'messaging', name: 'Messaging' },
  { key: 'analytics', name: 'Analytics' },
  { key: 'clinicalDecision', name: 'Clinical Decision Support' },
  { key: 'symptomChecker', name: 'Symptom Checker' },
  { key: 'telemedicine', name: 'Telemedicine' },
  { key: 'voiceDocumentation', name: 'Voice Documentation' },
  { key: 'financialIntelligence', name: 'Financial Intelligence' },
  { key: 'billing', name: 'Billing' },
  { key: 'quickbooks', name: 'QuickBooks' },
  { key: 'inventory', name: 'Inventory' },
  { key: 'medicalRecords', name: 'Medical Records' },
  { key: 'integrations', name: 'Integrations' },
  { key: 'automation', name: 'Automation' },
  { key: 'patientPortal', name: 'Patient Portal' },
  { key: 'aiInsights', name: 'AI Insights' },
  { key: 'populationHealth', name: 'Population Health' },
  { key: 'gdprCompliance', name: 'GDPR Compliance' },
  { key: 'userManagement', name: 'User Management' },
  { key: 'shiftManagement', name: 'Shift Management' },
  { key: 'settings', name: 'Settings' },
  { key: 'subscription', name: 'Subscription' }
];

const ALL_FIELDS = [
  { key: 'patientSensitiveInfo', name: 'Patient Sensitive Information' },
  { key: 'financialData', name: 'Financial Data' },
  { key: 'medicalHistory', name: 'Medical History' },
  { key: 'prescriptionDetails', name: 'Prescription Details' },
  { key: 'labResults', name: 'Lab Results' },
  { key: 'imagingResults', name: 'Imaging Results' },
  { key: 'billingInformation', name: 'Billing Information' },
  { key: 'insuranceDetails', name: 'Insurance Details' }
];

interface UserPermissions {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: {
    modules?: Record<string, { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }>;
    fields?: Record<string, { view?: boolean; edit?: boolean }>;
  };
}

export default function PermissionsReference() {
  const { tenant } = useTenant();

  // Fetch users with their permissions from database
  const { data: users, isLoading, error } = useQuery<UserPermissions[]>({
    queryKey: ["/api/users/permissions"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": tenant?.subdomain || "demo",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/users", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      // Filter to only users with permissions set
      return data.filter((user: UserPermissions) => 
        user.permissions && Object.keys(user.permissions).length > 0
      );
    },
  });

  const renderPermissionIcon = (allowed: boolean | undefined) => {
    return allowed ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-red-400" />
    );
  };

  const getRoleColor = (roleName: string) => {
    return ROLE_COLORS[roleName] || "bg-gray-500";
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      admin: "Administrator",
      doctor: "Physician",
      nurse: "Nurse",
      receptionist: "Receptionist",
      patient: "Patient",
      pharmacist: "Pharmacist",
      lab_technician: "Lab Technician",
      billing_staff: "Billing Staff"
    };
    return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header 
          title="Role Permissions Reference" 
          subtitle="Complete overview of access levels and permissions for each user"
        />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Header 
          title="Role Permissions Reference" 
          subtitle="Complete overview of access levels and permissions for each user"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Failed to load permissions</p>
              <p className="text-muted-foreground">There was an error loading user permissions from the database.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No users with permissions
  if (!users || users.length === 0) {
    return (
      <div className="space-y-6">
        <Header 
          title="Role Permissions Reference" 
          subtitle="Complete overview of access levels and permissions for each user"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No Permissions Configured</p>
              <p className="text-muted-foreground">No users have custom permissions configured yet. Set permissions in the User Management section.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header 
        title="Role Permissions Reference" 
        subtitle="User permissions loaded from database"
      />

      <div className="grid gap-6">
        {users.map((user) => {
          const roleColor = getRoleColor(user.role);
          const permissions = user.permissions || { modules: {}, fields: {} };
          
          return (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${roleColor}`} />
                    <div className="flex-1">
                      <div className="text-xl font-semibold">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">@{user.username}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Module Permissions */}
                <div>
                  <h4 className="font-semibold mb-3">Module Access</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ALL_MODULES.map((module) => {
                      const modulePerms = permissions.modules?.[module.key] || { view: false, create: false, edit: false, delete: false };
                      
                      return (
                        <div key={module.key} className="border rounded-lg p-3" data-testid={`module-${module.key}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {module.name}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            {(['view', 'create', 'edit', 'delete'] as const).map((action) => {
                              const Icon = ACTION_ICONS[action];
                              const allowed = modulePerms[action];
                              return (
                                <div key={action} className="flex items-center gap-1">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground capitalize">{action}</span>
                                  {renderPermissionIcon(allowed)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Field Access Permissions */}
                <div>
                  <h4 className="font-semibold mb-3">Data Field Access</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {ALL_FIELDS.map((field) => {
                      const fieldPerms = permissions.fields?.[field.key] || { view: false, edit: false };
                      
                      return (
                        <div key={field.key} className="border rounded p-2 space-y-2" data-testid={`field-${field.key}`}>
                          <span className="text-sm font-medium block">
                            {field.name}
                          </span>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">View</span>
                            {renderPermissionIcon(fieldPerms.view)}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Edit</span>
                            {renderPermissionIcon(fieldPerms.edit)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Permission Legend */}
      <Card data-testid="permission-legend">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Legend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Icons */}
          <div>
            <h4 className="font-semibold mb-3">Action Permissions</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2" data-testid="legend-view">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">View</span>
                  <p className="text-xs text-muted-foreground">Can see and read data</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-create">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Create</span>
                  <p className="text-xs text-muted-foreground">Can add new items</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-edit">
                <Edit className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Edit</span>
                  <p className="text-xs text-muted-foreground">Can modify existing items</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-delete">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Delete</span>
                  <p className="text-xs text-muted-foreground">Can remove items</p>
                </div>
              </div>
            </div>
          </div>

          {/* Permission Status */}
          <div>
            <h4 className="font-semibold mb-3">Permission Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2" data-testid="legend-allowed">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <span className="text-sm font-medium text-green-700">Allowed</span>
                  <p className="text-xs text-muted-foreground">Permission is granted</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-denied">
                <X className="h-4 w-4 text-red-400" />
                <div>
                  <span className="text-sm font-medium text-red-600">Denied</span>
                  <p className="text-xs text-muted-foreground">Permission is not granted</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Colors */}
          <div>
            <h4 className="font-semibold mb-3">Role Types</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-2" data-testid="legend-admin">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Administrator</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-doctor">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">Physician</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-nurse">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">Nurse</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-receptionist">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm">Receptionist</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-pharmacist">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-sm">Pharmacist</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-lab-tech">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <span className="text-sm">Lab Technician</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-patient">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">Patient</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-billing">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span className="text-sm">Billing Staff</span>
              </div>
            </div>
          </div>

          {/* Module Types */}
          <div>
            <h4 className="font-semibold mb-3">Module Categories</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Core Modules:</strong> Dashboard, Patients, Appointments, Medical Records, Prescriptions</p>
              <p><strong className="text-foreground">Clinical:</strong> Lab Results, Imaging, Clinical Decision Support, Symptom Checker, AI Insights</p>
              <p><strong className="text-foreground">Administrative:</strong> Billing, Financial Intelligence, QuickBooks, User Management, Settings</p>
              <p><strong className="text-foreground">Communication:</strong> Messaging, Telemedicine, Voice Documentation</p>
              <p><strong className="text-foreground">Advanced:</strong> Forms, Integrations, Automation, Inventory, Population Health</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
