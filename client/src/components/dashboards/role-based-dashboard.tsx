import { useRolePermissions } from "@/hooks/use-role-permissions";
import { AdminDashboard } from "./admin-dashboard";
import { DoctorDashboard } from "./doctor-dashboard";
import { NurseDashboard } from "./nurse-dashboard";
import { ReceptionistDashboard } from "./receptionist-dashboard";
import { PatientDashboard } from "./patient-dashboard";
import { SampleTakerDashboard } from "./sample-taker-dashboard";
import { isDoctorLike } from "@/lib/role-utils";

export function RoleBasedDashboard() {
  const { getUserRole, user } = useRolePermissions();
  const userRole = getUserRole();

  if (!user || !userRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Check for doctor-like roles first
  if (isDoctorLike(userRole)) {
    return <DoctorDashboard />;
  }

  switch (userRole) {
    case 'admin':
      return <AdminDashboard />;
    case 'nurse':
      return <NurseDashboard />;
    case 'receptionist':
      return <ReceptionistDashboard />;
    case 'patient':
      return <PatientDashboard />;
    case 'sample_taker':
      return <SampleTakerDashboard />;
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-neutral-600">Role not recognized: {userRole}</p>
            <p className="text-sm text-neutral-500 mt-2">Please contact your administrator.</p>
          </div>
        </div>
      );
  }
}