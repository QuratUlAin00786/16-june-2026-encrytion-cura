import type { InsertRole } from "@shared/schema";

export type SystemRoleTemplate = Omit<InsertRole, "organizationId">;

type Permissions = SystemRoleTemplate["permissions"];

const adminPermissions: Permissions = {
  fields: {
    financialData: { edit: true, view: true },
    medicalHistory: { edit: true, view: true },
    patientSensitiveInfo: { edit: true, view: true },
  },
  modules: {
    billing: { edit: true, view: true, create: true, delete: true },
    patients: { edit: true, view: true, create: true, delete: true },
    settings: { edit: true, view: true, create: true, delete: true },
    analytics: { edit: true, view: true, create: true, delete: true },
    appointments: { edit: true, view: true, create: true, delete: true },
    prescriptions: { edit: true, view: true, create: true, delete: true },
    medicalRecords: { edit: true, view: true, create: true, delete: true },
    userManagement: { edit: true, view: true, create: true, delete: true },
  },
};

const doctorPermissions: Permissions = {
  fields: {
    financialData: { edit: false, view: true },
    medicalHistory: { edit: true, view: true },
    patientSensitiveInfo: { edit: true, view: true },
  },
  modules: {
    dashboard: { edit: false, view: true, create: false, delete: false },
    billing: { edit: false, view: true, create: false, delete: false },
    patients: { edit: true, view: true, create: true, delete: false },
    settings: { edit: false, view: false, create: false, delete: false },
    analytics: { edit: false, view: true, create: false, delete: false },
    appointments: { edit: true, view: true, create: true, delete: false },
    prescriptions: { edit: true, view: true, create: true, delete: false },
    labResults: { edit: true, view: true, create: true, delete: false },
    medicalImaging: { edit: true, view: true, create: true, delete: false },
    forms: { edit: true, view: true, create: true, delete: false },
    messaging: { edit: true, view: true, create: true, delete: false },
    shiftManagement: { edit: true, view: true, create: true, delete: false },
    voiceDocumentation: { edit: true, view: true, create: true, delete: false },
    symptomChecker: { edit: false, view: true, create: false, delete: false },
    medicalRecords: { edit: true, view: true, create: true, delete: false },
    userManagement: { edit: false, view: false, create: false, delete: false },
  },
};

const physicianPermissions: Permissions = {
  fields: {
    financialData: { edit: false, view: true },
    medicalHistory: { edit: true, view: true },
    patientSensitiveInfo: { edit: true, view: true },
  },
  modules: {
    billing: { edit: false, view: true, create: false, delete: false },
    patients: { edit: true, view: true, create: true, delete: false },
    settings: { edit: false, view: false, create: false, delete: false },
    analytics: { edit: false, view: true, create: false, delete: false },
    appointments: { edit: true, view: true, create: true, delete: false },
    prescriptions: { edit: true, view: true, create: true, delete: false },
    medicalRecords: { edit: true, view: true, create: true, delete: false },
    userManagement: { edit: false, view: false, create: false, delete: false },
  },
};

const financePermissions: Permissions = {
  fields: {
    financialData: { edit: true, view: true },
    medicalHistory: { edit: false, view: false },
    patientSensitiveInfo: { edit: false, view: false },
  },
  modules: {
    dashboard: { edit: false, view: true, create: false, delete: false },
    billing: { edit: true, view: true, create: true, delete: false },
    analytics: { edit: false, view: true, create: false, delete: false },
    patients: { edit: false, view: true, create: false, delete: false },
    appointments: { edit: false, view: true, create: false, delete: false },
  },
};

function systemRole(
  name: string,
  displayName: string,
  description: string,
  permissions: Permissions,
): SystemRoleTemplate {
  return { name, displayName, description, permissions, isSystem: true };
}

/** All built-in system roles seeded for each organization. */
export const DEFAULT_SYSTEM_ROLE_TEMPLATES: SystemRoleTemplate[] = [
  systemRole(
    "admin",
    "Administrator",
    "Full system access with all permissions",
    adminPermissions,
  ),
  systemRole(
    "doctor",
    "Doctor",
    "Medical doctor with full clinical access",
    doctorPermissions,
  ),
  systemRole(
    "nurse",
    "Nurse",
    "Nursing staff with patient care access",
    {
      fields: {
        financialData: { edit: false, view: true },
        medicalHistory: { edit: true, view: true },
        patientSensitiveInfo: { edit: true, view: true },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: true, view: true, create: true, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        prescriptions: { edit: true, view: true, create: true, delete: false },
        medicalRecords: { edit: true, view: true, create: true, delete: false },
        forms: { edit: true, view: true, create: true, delete: false },
        messaging: { edit: true, view: true, create: true, delete: false },
        shiftManagement: { edit: true, view: true, create: true, delete: false },
        voiceDocumentation: { edit: true, view: true, create: true, delete: false },
        symptomChecker: { edit: false, view: true, create: false, delete: false },
      },
    },
  ),
  systemRole(
    "patient",
    "Patient",
    "Patient with access to own records",
    {
      fields: {
        labResults: { edit: false, view: false },
        financialData: { edit: false, view: true },
        imagingResults: { edit: false, view: false },
        medicalHistory: { edit: false, view: true },
        insuranceDetails: { edit: false, view: false },
        billingInformation: { edit: false, view: false },
        prescriptionDetails: { edit: false, view: false },
        patientSensitiveInfo: { edit: false, view: true },
      },
      modules: {
        forms: { edit: false, view: true, create: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: false, view: true, create: false, delete: false },
        messaging: { edit: false, view: true, create: false, delete: false },
        labResults: { edit: false, view: true, create: false, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        telemedicine: { edit: false, view: true, create: false, delete: false },
        prescriptions: { edit: false, view: true, create: false, delete: false },
        medicalImaging: { edit: false, view: true, create: false, delete: false },
        medicalRecords: { edit: false, view: true, create: false, delete: false },
      },
    },
  ),
  systemRole(
    "receptionist",
    "Receptionist",
    "Front desk staff with appointment management",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: false, view: false },
        patientSensitiveInfo: { edit: false, view: false },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: true, view: true, create: true, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
      },
    },
  ),
  systemRole(
    "lab_technician",
    "Lab Technician",
    "Laboratory technician with lab results access",
    {
      fields: {},
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        labResults: { view: true, create: true, edit: true, delete: false },
      },
    },
  ),
  systemRole(
    "pharmacist",
    "Pharmacist",
    "Pharmacist with prescription access",
    {
      fields: {
        medicalHistory: { view: true, edit: false },
        patientSensitiveInfo: { view: false, edit: false },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        patients: { view: true, create: false, edit: false, delete: false },
        appointments: { view: true, create: false, edit: false, delete: false },
        prescriptions: { view: true, create: true, edit: true, delete: false },
        medicalRecords: { view: true, create: false, edit: false, delete: false },
      },
    },
  ),
  systemRole(
    "dentist",
    "Dentist",
    "Dental professional with clinical access",
    {
      fields: {
        financialData: { edit: false, view: true },
        medicalHistory: { edit: true, view: true },
        patientSensitiveInfo: { edit: true, view: true },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: true, view: true, create: true, delete: false },
        analytics: { edit: false, view: true, create: false, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        prescriptions: { edit: true, view: true, create: true, delete: false },
        medicalRecords: { edit: true, view: true, create: true, delete: false },
      },
    },
  ),
  systemRole(
    "dental_nurse",
    "Dental Nurse",
    "Dental nursing staff with patient care access",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: false, view: true },
        patientSensitiveInfo: { edit: false, view: true },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        patients: { edit: true, view: true, create: false, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        prescriptions: { edit: false, view: true, create: false, delete: false },
        medicalRecords: { edit: false, view: true, create: true, delete: false },
      },
    },
  ),
  systemRole(
    "phlebotomist",
    "Phlebotomist",
    "Blood collection specialist",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: false, view: true },
        patientSensitiveInfo: { edit: false, view: false },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        patients: { edit: false, view: true, create: false, delete: false },
        appointments: { edit: false, view: true, create: false, delete: false },
        medicalRecords: { edit: false, view: true, create: false, delete: false },
      },
    },
  ),
  systemRole(
    "aesthetician",
    "Aesthetician",
    "Aesthetic treatment specialist",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: false, view: true },
        patientSensitiveInfo: { edit: false, view: false },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: true, view: true, create: false, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        medicalRecords: { edit: false, view: true, create: true, delete: false },
      },
    },
  ),
  systemRole(
    "optician",
    "Optician",
    "Eye care and vision specialist",
    {
      fields: {
        financialData: { edit: false, view: true },
        medicalHistory: { edit: true, view: true },
        patientSensitiveInfo: { edit: false, view: true },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: false, view: true, create: false, delete: false },
        appointments: { edit: false, view: true, create: false, delete: false },
        prescriptions: { edit: false, view: true, create: false, delete: false },
        medicalRecords: { edit: false, view: true, create: false, delete: false },
      },
    },
  ),
  systemRole(
    "paramedic",
    "Paramedic",
    "Emergency medical services professional",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: true, view: true },
        patientSensitiveInfo: { edit: false, view: true },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        patients: { edit: true, view: true, create: true, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        medicalRecords: { edit: true, view: false, create: true, delete: false },
      },
    },
  ),
  systemRole(
    "physiotherapist",
    "Physiotherapist",
    "Physical therapy specialist",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: true, view: true },
        patientSensitiveInfo: { edit: false, view: true },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: true, view: true, create: false, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        prescriptions: { edit: false, view: true, create: false, delete: false },
        medicalRecords: { edit: true, view: true, create: true, delete: false },
      },
    },
  ),
  systemRole(
    "podiatrist",
    "Podiatrist",
    "Foot and ankle care specialist",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: true, view: true },
        patientSensitiveInfo: { edit: false, view: true },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        billing: { edit: false, view: true, create: false, delete: false },
        patients: { edit: true, view: true, create: false, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        prescriptions: { edit: false, view: true, create: false, delete: false },
        medicalRecords: { edit: true, view: true, create: true, delete: false },
      },
    },
  ),
  systemRole(
    "physician",
    "Physician",
    "Medical professional with clinical access",
    physicianPermissions,
  ),
  systemRole(
    "finance",
    "Finance",
    "Finance team with billing and reporting access",
    financePermissions,
  ),
  systemRole(
    "billing_clerk",
    "Billing Clerk",
    "Billing and insurance claims specialist",
    {
      fields: {
        financialData: { edit: true, view: true },
        medicalHistory: { edit: false, view: false },
        patientSensitiveInfo: { edit: false, view: false },
      },
      modules: {
        dashboard: { edit: false, view: true, create: false, delete: false },
        billing: { edit: true, view: true, create: true, delete: false },
        patients: { edit: false, view: true, create: false, delete: false },
        appointments: { edit: false, view: true, create: false, delete: false },
        analytics: { edit: false, view: true, create: false, delete: false },
      },
    },
  ),
  systemRole(
    "sample_taker",
    "Sample Taker",
    "Medical sample collection specialist",
    {
      fields: {
        medicalHistory: { view: true, edit: false },
        patientSensitiveInfo: { view: true, edit: false },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        patients: { view: true, create: false, edit: false, delete: false },
        labResults: { view: true, create: true, edit: true, delete: false },
        appointments: { view: true, create: false, edit: false, delete: false },
      },
    },
  ),
  systemRole(
    "other",
    "Other",
    "Generic role for other healthcare professionals",
    {
      fields: {
        financialData: { edit: false, view: false },
        medicalHistory: { edit: false, view: true },
        patientSensitiveInfo: { edit: false, view: false },
      },
      modules: {
        dashboard: { view: true, create: false, edit: false, delete: false },
        patients: { edit: false, view: true, create: false, delete: false },
        appointments: { edit: true, view: true, create: true, delete: false },
        prescriptions: { edit: false, view: true, create: false, delete: false },
        medicalRecords: { edit: false, view: true, create: false, delete: false },
      },
    },
  ),
];
