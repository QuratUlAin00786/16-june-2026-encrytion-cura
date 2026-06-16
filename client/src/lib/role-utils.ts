/**
 * Role Utility Functions
 * Provides centralized role checking logic for the application
 */

/**
 * Roles that function exactly like a Doctor with full clinical access
 */
const DOCTOR_LIKE_ROLES = [
  'doctor',
  'nurse',
  'paramedic',
  'optician',
  'lab_technician',
  'pharmacist',
  'dentist',
  'dental_nurse',
  'phlebotomist',
  'aesthetician',
  'podiatrist',
  'physiotherapist',
  'physician'
] as const;

/**
 * Check if a role is Doctor or Doctor-like (has full clinical access)
 * @param role - The user's role
 * @returns true if the role has doctor-level permissions
 */
export function isDoctorLike(role: string | undefined | null): boolean {
  if (!role) return false;
  return DOCTOR_LIKE_ROLES.includes(role.toLowerCase() as any);
}

/**
 * Check if a role is Admin
 * @param role - The user's role
 * @returns true if the role is admin or administrator
 */
export function isAdmin(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return normalizedRole === 'admin' || normalizedRole === 'administrator';
}

/**
 * Check if a role is Nurse
 * @param role - The user's role
 * @returns true if the role is nurse
 */
export function isNurse(role: string | undefined | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === 'nurse';
}

/**
 * Check if a role is Patient
 * @param role - The user's role
 * @returns true if the role is patient
 */
export function isPatient(role: string | undefined | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === 'patient';
}

/**
 * Get all doctor-like roles
 * @returns Array of doctor-like role names
 */
export function getDoctorLikeRoles(): string[] {
  return [...DOCTOR_LIKE_ROLES];
}

/**
 * Format a role string for display (e.g., "lab_technician" -> "Lab Technician")
 * @param role - The role string to format
 * @returns Formatted role string with proper capitalization
 */
export function formatRoleLabel(role: string | undefined | null): string {
  if (!role) return '';
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
