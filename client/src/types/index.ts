export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  aiSuggestions: number;
  revenue: number;
}

export interface AiInsight {
  id: number;
  type: "risk_alert" | "drug_interaction" | "treatment_suggestion" | "preventive_care";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  actionRequired: boolean;
  confidence: number;
  patientId?: number;
  status: "active" | "dismissed" | "resolved";
  createdAt: string;
  metadata: {
    relatedConditions?: string[];
    suggestedActions?: string[];
    references?: string[];
  };
}

export interface Patient {
  id: number;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  nhsNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  medicalHistory?: {
    allergies?: string[];
    chronicConditions?: string[];
    medications?: string[];
    familyHistory?: {
      father?: string[];
      mother?: string[];
      siblings?: string[];
      grandparents?: string[];
      spouse?: string[];
      children?: string[];
      grandchildren?: string[];
      extended?: string[];
      step_parents?: string[];
      step_siblings?: string[];
      guardian?: string[];
    };
    socialHistory?: {
      smoking?: string;
      alcohol?: string;
      occupation?: string;
      maritalStatus?: string;
    };
    immunizations?: Array<{
      vaccine: string;
      date: string;
      provider: string;
    }>;
  };
  riskLevel: "low" | "medium" | "high";
  flags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  organizationId: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  medicalSpecialtyCategory?: string;
  gender?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface MedicalRecord {
  id: number;
  type: "consultation" | "prescription" | "lab_result" | "imaging";
  title: string;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  prescription: {
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  };
  attachments: string[];
  aiSuggestions: {
    riskAssessment?: string;
    recommendations?: string[];
    drugInteractions?: string[];
  };
  createdAt: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  providerId: number;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  type: "consultation" | "follow_up" | "procedure";
  location?: string;
  isVirtual: boolean;
  createdAt: string;
}

export interface Subscription {
  billingCycle?: 'monthly' | 'annual';
  currentPeriodEnd?: string | Date | null;
  id: number;
  packageId?: number;
  plan: "starter" | "professional" | "enterprise" | "pro" | string;
  planName?: string;
  status: "trial" | "active" | "suspended" | "cancelled" | "expired";
  paymentStatus?: "trial" | "paid" | "unpaid" | "failed" | "pending";
  userLimit: number;
  currentUsers: number;
  currentPatients?: number;
  monthlyPrice?: number;
  trialEndsAt?: string;
  nextBillingAt?: string;
  currentPeriodStart?: string;
  expiresAt?: string;
  stripeSubscriptionId?: string | null;
  features: {
    aiInsights?: boolean;
    advancedReporting?: boolean;
    apiAccess?: boolean;
    whiteLabel?: boolean;
    maxUsers?: number;
    maxPatients?: number;
    storageGB?: number;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: number;
  name: string;
  subdomain: string;
  region: "UK" | "EU" | "ME" | "SA" | "US";
  brandName: string;
  settings: {
    theme?: { primaryColor?: string; logoUrl?: string };
    compliance?: { gdprEnabled?: boolean; dataResidency?: string };
    features?: { aiEnabled?: boolean; billingEnabled?: boolean };
  };
  subscriptionStatus: "trial" | "active" | "suspended" | "cancelled";
  stripeAccountId?: string | null;
  stripeStatus?: string | null;
  country_code?: string | null;
  currency_code?: string | null;
  currency_symbol?: string | null;
  language_code?: string | null;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  organizationId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  gender?: string;
  profilePicturePath?: string | null;
}

export interface TenantInfo {
  id: number;
  name: string;
  subdomain: string;
  region: string;
  brandName: string;
  settings: any;
  country_code?: string | null;
  currency_code?: string | null;
  currency_symbol?: string | null;
  language_code?: string | null;
}
