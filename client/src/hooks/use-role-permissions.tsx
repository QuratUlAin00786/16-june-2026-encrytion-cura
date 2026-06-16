import { useAuth } from "./use-auth";
import { isDoctorLike } from "@/lib/role-utils";
import { useQuery } from "@tanstack/react-query";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

export type UserRole = string;
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

interface RolePermissions {
  modules?: Record<string, {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  }>;
  fields?: Record<string, {
    view: boolean;
    edit: boolean;
  }>;
}

interface RoleData {
  id: number;
  name: string;
  displayName: string;
  description: string;
  permissions: RolePermissions;
  organizationId: number;
}

export function useRolePermissions() {
  const { user } = useAuth();
  
  // Fetch role permissions from database
  // Note: We fetch for admin too so sidebar can respect role edits, but backend still allows admin full access
  const { data: roleData, isLoading } = useQuery<RoleData>({
    queryKey: ['/api/roles/by-name', user?.role],
    queryFn: async () => {
      if (!user?.role) return null;
      const token = localStorage.getItem('auth_token');
      const subdomain = getActiveSubdomain(); // Use the same subdomain detection logic as queryClient
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': subdomain
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/roles/by-name/${user.role}`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch role permissions: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!user?.role, // Fetch for all roles including admin
    staleTime: 0, // No caching - always fetch fresh permissions
    refetchOnWindowFocus: true, // Refetch when window regains focus to catch updates
    refetchInterval: 30000, // Auto-refetch every 30 seconds to catch permission changes
  });

  const rolePermissions: RolePermissions = roleData?.permissions || {};
  
  const hasPermission = (module: string, action: PermissionAction, checkStoredPermissions: boolean = false): boolean => {
    if (!user?.role) return false;
    
    // For visibility checks (sidebar), check stored permissions even for admin
    // For access checks (backend), admin always has full access
    // When checkStoredPermissions is true, we check the database permissions even for admin
    if (user.role === 'admin' && !checkStoredPermissions) {
      return true;
    }

    // Map frontend module names to backend module names
    const moduleMapping: Record<string, string> = {
      'dashboard': 'dashboard',
      'patients': 'patients',
      'appointments': 'appointments',
      'medical_records': 'medicalRecords',
      'prescriptions': 'prescriptions',
      'lab_results': 'labResults',
      'medical_imaging': 'medicalImaging',
      'billing': 'billing',
      'analytics': 'analytics',
      'messaging': 'messaging',
      'ai_insights': 'aiInsights',
      'voice_documentation': 'voiceDocumentation',
      'telemedicine': 'telemedicine',
      'forms': 'forms',
      'integrations': 'integrations',
      'automation': 'automation',
      'population_health': 'populationHealth',
      'mobile_health': 'mobileHealth',
      'patient_portal': 'patientPortal',
      'inventory': 'inventory',
      'gdpr_compliance': 'gdprCompliance',
      'user_management': 'userManagement',
      'shift_management': 'shiftManagement',
      'settings': 'settings',
      'subscription': 'subscription',
      'financial_intelligence': 'financialIntelligence',
      'quickbooks': 'quickbooks',
      'clinical_decision_support': 'clinicalDecision',
      'symptom_checker': 'symptomChecker',
      'user_manual': 'userManual'
    };
    
    const backendModuleName = moduleMapping[module] || module;
    let modulePerms = rolePermissions.modules?.[backendModuleName];

    const moduleAliases: Record<string, string[]> = {
      aiInsights: ["clinicalDecision", "symptomChecker"],
    };

    if (!modulePerms && moduleAliases[backendModuleName]) {
      for (const alias of moduleAliases[backendModuleName]) {
        modulePerms = rolePermissions.modules?.[alias];
        if (modulePerms) {
          break;
        }
      }
    }
    
    if (!modulePerms) {
      // If no permissions found in database, deny access
      return false;
    }
    
    if (typeof modulePerms === 'boolean') {
      return modulePerms;
    }
    
    if (typeof modulePerms === 'object' && modulePerms !== null) {
      return modulePerms[action] || false;
    }
    
    return false;
  };

  const canAccess = (module: string, checkStoredPermissions: boolean = true): boolean => {
    // For sidebar visibility, check stored permissions even for admin
    return hasPermission(module, 'view', checkStoredPermissions);
  };

  const canView = (module: string, checkStoredPermissions: boolean = true): boolean => {
    // For page access checks, check stored permissions even for admin
    return hasPermission(module, 'view', checkStoredPermissions);
  };

  const canCreate = (module: string): boolean => {
    return hasPermission(module, 'create');
  };

  const canEdit = (module: string): boolean => {
    return hasPermission(module, 'edit');
  };

  const canDelete = (module: string): boolean => {
    return hasPermission(module, 'delete');
  };

  const getUserRole = (): UserRole | null => {
    return user?.role as UserRole || null;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isDoctor = (): boolean => {
    return isDoctorLike(user?.role);
  };

  const isNurse = (): boolean => {
    return user?.role === 'nurse';
  };

  const isReceptionist = (): boolean => {
    return user?.role === 'receptionist';
  };

  const isPatient = (): boolean => {
    return user?.role === 'patient';
  };

  const isSampleTaker = (): boolean => {
    return user?.role === 'sample_taker';
  };

  return {
    hasPermission,
    canAccess,
    canView,
    canCreate,
    canEdit,
    canDelete,
    getUserRole,
    isAdmin,
    isDoctor,
    isNurse,
    isReceptionist,
    isPatient,
    isSampleTaker,
    user,
    isLoading
  };
}
