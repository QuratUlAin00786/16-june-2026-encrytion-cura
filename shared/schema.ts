import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, char, decimal, real, date, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// SaaS Owners (Platform Administrators)
export const saasOwners = pgTable("saas_owners", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SaaS Packages
export const saasPackages = pgTable("saas_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"), // monthly, yearly
  stripePriceId: varchar("stripe_price_id", { length: 64 }),
  features: jsonb("features").$type<{
    maxUsers?: number;
    maxPatients?: number;
    aiEnabled?: boolean;
    telemedicineEnabled?: boolean;
    billingEnabled?: boolean;
    analyticsEnabled?: boolean;
    customBranding?: boolean;
    prioritySupport?: boolean;
    storageGB?: number;
    apiCallsPerMonth?: number;
  }>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  showOnWebsite: boolean("show_on_website").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SaaS Subscriptions
export const saasSubscriptions = pgTable("saas_subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  packageId: integer("package_id").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 64 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 64 }),
  stripePriceId: varchar("stripe_price_id", { length: 64 }),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"), // monthly, annual
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, trial, expired, cancelled
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("trial"), // paid, unpaid, failed, pending, trial
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  trialEnd: timestamp("trial_end"),
  maxUsers: integer("max_users"),
  maxPatients: integer("max_patients"),
  details: text("details"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").$type<{
    paymentMethodId?: string;
    lastPaymentDate?: string;
    nextPaymentDate?: string;
    paymentProvider?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SaaS Payments - Track all payment methods and transactions
export const saasPayments = pgTable("saas_payments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  subscriptionId: integer("subscription_id"),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // cash, stripe, paypal, bank_transfer
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // pending, completed, failed, refunded
  paymentDate: timestamp("payment_date"),
  dueDate: timestamp("due_date").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  paymentProvider: varchar("payment_provider", { length: 50 }), // stripe_payment_intent_id, paypal_order_id, etc.
  providerTransactionId: text("provider_transaction_id"), // External payment ID
  description: text("description"),
  metadata: jsonb("metadata").$type<{
    stripePaymentIntentId?: string;
    paypalOrderId?: string;
    bankTransferDetails?: {
      accountNumber?: string;
      sortCode?: string;
      reference?: string;
    };
    cashReceiptNumber?: string;
    notes?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SaaS Settings - Store global system settings
export const saasSettings = pgTable("saas_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().default("system"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SaaS Subscription History - Audit trail for subscription changes
export const saasSubscriptionHistory = pgTable("saas_subscription_history", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  subscriptionId: integer("subscription_id").notNull().references(() => saasSubscriptions.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(), // 'upgrade', 'downgrade', 'cancel', 'renew', 'change_cycle', 'create', 'update'
  performedBy: integer("performed_by").references(() => users.id), // User who performed the action
  performedByType: varchar("performed_by_type", { length: 20 }).default("admin"), // 'saas_admin' or 'org_admin'
  oldPackageId: integer("old_package_id").references(() => saasPackages.id),
  newPackageId: integer("new_package_id").references(() => saasPackages.id),
  oldBillingCycle: varchar("old_billing_cycle", { length: 20 }), // 'monthly' or 'annual'
  newBillingCycle: varchar("new_billing_cycle", { length: 20 }), // 'monthly' or 'annual'
  oldStatus: varchar("old_status", { length: 20 }), // 'active', 'trial', 'cancelled', etc.
  newStatus: varchar("new_status", { length: 20 }), // 'active', 'trial', 'cancelled', etc.
  oldPrice: decimal("old_price", { precision: 10, scale: 2 }),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }),
  details: jsonb("details").$type<{
    prorationAmount?: number;
    reason?: string;
    immediate?: boolean;
    effectiveDate?: string;
    stripeSubscriptionId?: string;
    [key: string]: any;
  }>().default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SaaS Invoices - Track billing invoices
export const saasInvoices = pgTable("saas_invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  subscriptionId: integer("subscription_id").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, paid, overdue, cancelled, unpaid
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  lineItems: jsonb("line_items").$type<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations (Tenants)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: varchar("subdomain", { length: 50 }).notNull().unique(),
  email: text("email").notNull(),
  region: varchar("region", { length: 10 }).notNull().default("UK"), // UK, EU, ME, SA, US
  brandName: text("brand_name").notNull(),
  country_code: char("country_code", { length: 2 }), // ISO 3166-1 alpha-2 country code (e.g., "AE", "GB", "US")
  currency_code: char("currency_code", { length: 3 }), // ISO 4217 currency code (e.g., "AED", "GBP", "USD")
  currency_symbol: varchar("currency_symbol", { length: 10 }), // Currency symbol (e.g., "د.إ", "£", "$")
  language_code: char("language_code", { length: 5 }), // Locale code (e.g., "ar-AE", "en-GB", "en-US")
  settings: jsonb("settings").$type<{
    theme?: { primaryColor?: string; logoUrl?: string };
    compliance?: { gdprEnabled?: boolean; dataResidency?: string };
    features?: { aiEnabled?: boolean; billingEnabled?: boolean };
  }>().default({}),
  features: jsonb("features").$type<{
    maxUsers?: number;
    maxPatients?: number;
    aiEnabled?: boolean;
    telemedicineEnabled?: boolean;
    billingEnabled?: boolean;
    analyticsEnabled?: boolean;
  }>().default({}),
  accessLevel: varchar("access_level", { length: 50 }).default("full"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).notNull().default("trial"), // trial, active, suspended, cancelled
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("trial"), // trial, paid, unpaid, failed, pending
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeStatus: varchar("stripe_status", { length: 20 }).default("active"), // active, disconnected
  stripeCustomerId: varchar("stripe_customer_id", { length: 64 }), // For platform subscription billing (separate from stripe_account_id)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clinic Headers - Application-wide header information
export const clinicHeaders = pgTable("clinic_headers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  logoBase64: text("logo_base64"),
  logoPosition: varchar("logo_position", { length: 20 }).notNull().default("center"), // left, right, center
  clinicName: text("clinic_name").notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: text("email"),
  website: text("website"),
  clinicNameFontSize: varchar("clinic_name_font_size", { length: 20 }).notNull().default("24pt"),
  fontSize: varchar("font_size", { length: 20 }).notNull().default("12pt"),
  fontFamily: varchar("font_family", { length: 50 }).notNull().default("verdana"),
  fontWeight: varchar("font_weight", { length: 20 }).notNull().default("normal"), // normal, bold
  fontStyle: varchar("font_style", { length: 20 }).notNull().default("normal"), // normal, italic
  textDecoration: varchar("text_decoration", { length: 20 }).notNull().default("none"), // none, underline
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clinic Footers - Application-wide footer information
export const clinicFooters = pgTable("clinic_footers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  footerText: text("footer_text").notNull(),
  backgroundColor: varchar("background_color", { length: 7 }).notNull().default("#4A7DFF"),
  textColor: varchar("text_color", { length: 7 }).notNull().default("#FFFFFF"),
  showSocial: boolean("show_social").notNull().default(false),
  facebook: text("facebook"),
  twitter: text("twitter"),
  linkedin: text("linkedin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  email: text("email").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 64 }),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("doctor"), // admin, doctor, nurse, receptionist, patient, sample_taker
  professionalRegistrationId: text("Professional_RegistrationID"),
  profilePicturePath: text("profile_picture_path"),
  department: text("department"),
  medicalSpecialtyCategory: text("medical_specialty_category"),
  subSpecialty: text("sub_specialty"),
  workingDays: jsonb("working_days").$type<string[]>().default([]),
  workingHours: jsonb("working_hours").$type<{
    start?: string;
    end?: string;
  }>().default({}),
  permissions: jsonb("permissions").$type<{
    modules?: {
      patients?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      appointments?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      medicalRecords?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      prescriptions?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      billing?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      analytics?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      userManagement?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      settings?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      aiInsights?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      messaging?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      telemedicine?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      populationHealth?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      clinicalDecision?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      labResults?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      medicalImaging?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      voiceDocumentation?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      forms?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      integrations?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      automation?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      mobileHealth?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    };
    fields?: {
      patientSensitiveInfo?: boolean;
      financialData?: boolean;
      medicalHistory?: boolean;
      prescriptionDetails?: boolean;
      labResults?: boolean;
      imagingResults?: boolean;
      billingInformation?: boolean;
      insuranceDetails?: boolean;
    };
  }>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  isSaaSOwner: boolean("is_saas_owner").notNull().default(false), // Flag for SaaS owners
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Personal info (all users) – also synced to patients table when role is patient
  dateOfBirth: text("date_of_birth"),
  genderAtBirth: text("gender_at_birth"),
});

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Document Preferences
export const userDocumentPreferences = pgTable("user_document_preferences", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  clinicInfo: jsonb("clinic_info").$type<{
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  }>().default({}),
  headerPreferences: jsonb("header_preferences").$type<{
    selectedHeader?: string;
    logoPosition?: string;
    clinicHeaderType?: string;
    clinicHeaderPosition?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserOrg: uniqueIndex("unique_user_document_preferences").on(table.userId, table.organizationId),
}));

// Roles
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  permissions: jsonb("permissions").$type<{
    modules: {
      [key: string]: {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
      };
    };
    fields: {
      [key: string]: {
        view: boolean;
        edit: boolean;
      };
    };
  }>().notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Staff Shifts and Availability
export const staffShifts = pgTable("staff_shifts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  staffId: integer("staff_id").notNull(),
  date: timestamp("date").notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull().default("regular"), // regular, overtime, on_call, absent
  startTime: varchar("start_time", { length: 5 }).notNull(), // "09:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // "17:00"
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, completed, cancelled, absent
  notes: text("notes"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id), // User who created the shift
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organization holiday calendar (global config for shift / scheduling workflows)
export const organizationHolidaySettings = pgTable("organization_holiday_settings", {
  organizationId: integer("organization_id").primaryKey().notNull(),
  weekendDays: text("weekend_days").array().notNull().default(["Saturday", "Sunday"]),
  weekendsNonWorking: boolean("weekends_non_working").notNull().default(true),
  defaultAllowShiftsOnHolidays: boolean("default_allow_shifts_on_holidays").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizationHolidays = pgTable("organization_holidays", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  holidayDate: date("holiday_date").notNull(),
  name: text("name").notNull(),
  holidayType: varchar("holiday_type", { length: 20 }).notNull().default("national"), // national, regional, company
  region: text("region"),
  allowShifts: boolean("allow_shifts").notNull().default(false),
  isWorkingDay: boolean("is_working_day").notNull().default(false),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Default Shifts for Staff (Lifetime default working hours)
export const doctorDefaultShifts = pgTable("doctor_default_shifts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull().default("09:00"), // "09:00"
  endTime: varchar("end_time", { length: 5 }).notNull().default("17:00"), // "17:00"
  workingDays: text("working_days").array().notNull().default(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Patients
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").references(() => users.id), // Foreign key to users table
  patientId: text("patient_id").notNull(), // Custom patient ID per organization
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  relation: text("relation"), // Self, Father, Mother, Son, Daughter, Spouse, Other (or encrypted envelope)
  dateOfBirth: text("date_of_birth"), // ISO date or encrypted envelope
  genderAtBirth: text("gender_at_birth"), // plaintext or encrypted envelope
  email: text("email"),
  phone: text("phone"),
  nhsNumber: text("nhs_number"), // NHS number for UK patients
  address: jsonb("address").$type<{
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  }>().default({}),
  insuranceInfo: jsonb("insurance_info").$type<{
    provider?: string;
    policyNumber?: string;
    groupNumber?: string;
    memberNumber?: string;
    planType?: string;
    effectiveDate?: string;
    expirationDate?: string;
    copay?: number;
    deductible?: number;
    isActive?: boolean;
  }>().default({}),
  emergencyContact: jsonb("emergency_contact").$type<{
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  }>().default({}),
  medicalHistory: jsonb("medical_history").$type<{
    allergies?: string[];
    chronicConditions?: string[];
    medications?: string[];
    familyHistory?: {
      father?: string[];
      mother?: string[];
      siblings?: string[];
      grandparents?: string[];
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
  }>().default({}),
  riskLevel: varchar("risk_level", { length: 10 }).notNull().default("low"), // low, medium, high
  flags: text("flags").array().default([]),
  communicationPreferences: jsonb("communication_preferences").$type<{
    preferredMethod?: "email" | "sms" | "phone" | "whatsapp";
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    appointmentReminders?: boolean;
    medicationReminders?: boolean;
    followUpReminders?: boolean;
    marketingCommunications?: boolean;
    emergencyContactOnly?: boolean;
  }>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  isInsured: boolean("is_insured").notNull().default(false),
  cnicHash: text("cnic_hash"),
  phoneHash: text("phone_hash"),
  emailHash: text("email_hash"),
  isEncrypted: boolean("is_encrypted").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id), // User who created the patient record
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Legacy patient import staging (admin migration)
export const patientImportStaging = pgTable("patient_import_staging", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  importBatchId: text("import_batch_id").notNull(),
  fullName: text("full_name"),
  cnic: text("cnic"),
  phone: text("phone"),
  email: text("email"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  importStatus: varchar("import_status", { length: 20 }).notNull().default("Pending"),
  validationStatus: varchar("validation_status", { length: 20 }).notNull().default("Pending"),
  errorMessage: text("error_message"),
  duplicateReason: text("duplicate_reason"),
  importedPatientId: integer("imported_patient_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  importedAt: timestamp("imported_at"),
});

export const patientImportAudit = pgTable("patient_import_audit", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id"),
  action: varchar("action", { length: 50 }).notNull(),
  fileName: text("file_name"),
  importBatchId: text("import_batch_id"),
  totalRecords: integer("total_records").default(0),
  validRecords: integer("valid_records").default(0),
  invalidRecords: integer("invalid_records").default(0),
  duplicateRecords: integer("duplicate_records").default(0),
  importedRecords: integer("imported_records").default(0),
  failedRecords: integer("failed_records").default(0),
  existingRecords: integer("existing_records").default(0),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical Records
export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(), // user who created the record
  type: varchar("type", { length: 20 }).notNull(), // consultation, prescription, lab_result, imaging
  title: text("title").notNull(),
  notes: text("notes"),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  prescription: jsonb("prescription").$type<{
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  }>().default({}),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  aiSuggestions: jsonb("ai_suggestions").$type<{
    riskAssessment?: string;
    recommendations?: string[];
    drugInteractions?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical record file attachments (e.g. consultation PDFs)
export const medicalRecordsFiles = pgTable("medical_records_files", {
  id: serial("id").primaryKey(),
  medicalRecordId: integer("medical_record_id").notNull().references(() => medicalRecords.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  appointmentId: text("appointment_id").notNull().unique(), // Unique appointment ID (e.g., APT1762331234567P10AUTO)
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  assignedRole: varchar("assigned_role", { length: 50 }), // Role selected during booking
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: false }).notNull(),
  duration: integer("duration").notNull().default(30), // minutes
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, completed, cancelled, no_show, rescheduled
  type: varchar("type", { length: 20 }).notNull().default("consultation"), // consultation, follow_up, procedure, emergency, routine_checkup
  appointmentType: varchar("appointment_type", { length: 20 }).notNull().default("consultation"),
  treatmentId: integer("treatment_id"),
  consultationId: integer("consultation_id"),
  location: text("location"),
  isVirtual: boolean("is_virtual").notNull().default(false),
  createdBy: integer("created_by"), // User ID who created the appointment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patient Invoices - Medical service billing
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  patientId: text("patient_id").notNull(), // Reference to patients.patientId
  patientName: text("patient_name").notNull(),
  nhsNumber: varchar("nhs_number", { length: 50 }), // NHS number or patient identifier
  serviceType: varchar("service_type", { length: 50 }), // lab_result, medical_image, consultation, etc.
  serviceId: text("service_id"), // ID of the related service (lab_results.testId, medical_images.id, etc.)
  dateOfService: timestamp("date_of_service").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, paid, overdue, cancelled, unpaid
  invoiceType: varchar("invoice_type", { length: 50 }).notNull().default("payment"), // payment, insurance_claim
  paymentMethod: varchar("payment_method", { length: 50 }), // cash, card, stripe, paypal
  insuranceProvider: varchar("insurance_provider", { length: 100 }), // NHS, Bupa, AXA, etc.
  doctorId: integer("doctor_id").references(() => users.id), // Reference to provider/doctor who performed the service
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  items: jsonb("items").$type<Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>>().notNull(),
  insurance: jsonb("insurance").$type<{
    provider: string;
    claimNumber: string;
    status: 'pending' | 'approved' | 'denied' | 'partially_paid';
    paidAmount: number;
  }>(),
  payments: jsonb("payments").$type<Array<{
    id: string;
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'insurance';
    date: string;
    reference?: string;
  }>>().notNull().default([]),
  notes: text("notes"),
  createdBy: integer("created_by"), // User ID who created the invoice
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments - Medical billing payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  invoiceId: integer("invoice_id").notNull(), // Reference to invoices.id
  patientId: text("patient_id").notNull(), // Reference to patients.patientId
  transactionId: text("transaction_id").notNull().unique(), // Stripe/PayPal transaction ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // online, cash, card, bank_transfer
  paymentProvider: varchar("payment_provider", { length: 50 }), // stripe, paypal, etc.
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("completed"), // completed, pending, failed, refunded
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  metadata: jsonb("metadata").$type<{
    stripePaymentIntentId?: string;
    paypalOrderId?: string;
    cardLast4?: string;
    cardBrand?: string;
    receiptUrl?: string;
    notes?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insurance Payments - Track individual insurance payments for invoices
export const insurancePayments = pgTable("insurance_payments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  invoiceId: integer("invoice_id").notNull(), // Reference to invoices.id
  claimNumber: varchar("claim_number", { length: 100 }), // Insurance claim ID/reference
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  insuranceProvider: text("insurance_provider").notNull(),
  paymentReference: text("payment_reference"), // EOB number, check number, etc.
  notes: text("notes"),
  createdBy: integer("created_by"), // User ID who recorded the payment
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Insights
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id"),
  type: varchar("type", { length: 30 }).notNull(), // risk_alert, drug_interaction, treatment_suggestion, preventive_care
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 10 }).notNull().default("medium"), // low, medium, high, critical
  actionRequired: boolean("action_required").notNull().default(false),
  confidence: varchar("confidence", { length: 32 }), // 0.00–1.00 (widen for legacy DB varchar(10) migrations)
  metadata: jsonb("metadata").$type<{
    relatedConditions?: string[];
    suggestedActions?: string[];
    references?: string[];
  }>().default({}),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, dismissed, resolved
  aiStatus: varchar("ai_status", { length: 20 }).default("pending"), // pending, reviewed, implemented, dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents - For Forms and other document storage
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("medical_form"), // medical_form, letter, report, etc.
  content: text("content").notNull(), // HTML content of the document
  metadata: jsonb("metadata").$type<{
    subject?: string;
    recipient?: string;
    location?: string;
    practitioner?: string;
    header?: string;
    templateUsed?: string;
  }>().default({}),
  isTemplate: boolean("is_template").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dynamic Forms
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default({}),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formSections = pgTable("form_sections", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => forms.id),
  organizationId: integer("organization_id").notNull(),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formFields = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => formSections.id),
  organizationId: integer("organization_id").notNull(),
  label: text("label").notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull(),
  required: boolean("required").notNull().default(false),
  placeholder: text("placeholder"),
  fieldOptions: jsonb("field_options").$type<string[]>().default([]),
  order: integer("order").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formShares = pgTable("form_shares", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => forms.id),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  /** External recipient when not linked to an org patient record. */
  recipientEmail: text("recipient_email"),
  sentBy: integer("sent_by").references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, submitted, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formShareLogs = pgTable("form_share_logs", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => forms.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").references(() => patients.id),
  recipientEmail: text("recipient_email"),
  sentBy: integer("sent_by").references(() => users.id),
  link: text("link").notNull(),
  emailSent: boolean("email_sent").notNull().default(false),
  emailSubject: text("email_subject"),
  emailHtml: text("email_html"),
  emailText: text("email_text"),
  emailError: text("email_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const formResponses = pgTable("form_responses", {
  id: serial("id").primaryKey(),
  shareId: integer("share_id").notNull().references(() => formShares.id),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default({}),
});

export const formResponseValues = pgTable("form_response_values", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").notNull().references(() => formResponses.id),
  fieldId: integer("field_id").notNull().references(() => formFields.id),
  value: text("value"),
  valueJson: jsonb("value_json").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  planName: text("plan_name").notNull(),
  plan: varchar("plan", { length: 20 }), // starter, professional, enterprise
  status: varchar("status", { length: 20 }).notNull().default("trial"), // trial, active, suspended, cancelled
  userLimit: integer("user_limit").notNull().default(5),
  currentUsers: integer("current_users").notNull().default(0),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  trialEndsAt: timestamp("trial_ends_at"),
  nextBillingAt: timestamp("next_billing_at"),
  features: jsonb("features").$type<{
    aiInsights?: boolean;
    advancedReporting?: boolean;
    apiAccess?: boolean;
    whiteLabel?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consultations
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  appointmentId: integer("appointment_id"),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  consultationType: varchar("consultation_type", { length: 20 }).notNull(), // routine, urgent, follow_up, emergency
  chiefComplaint: text("chief_complaint"),
  historyOfPresentIllness: text("history_of_present_illness"),
  vitals: jsonb("vitals").$type<{
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
  }>().default({}),
  physicalExam: text("physical_exam"),
  assessment: text("assessment"),
  diagnosis: text("diagnosis").array(),
  treatmentPlan: text("treatment_plan"),
  prescriptions: text("prescriptions").array(),
  followUpInstructions: text("follow_up_instructions"),
  consultationNotes: text("consultation_notes"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, completed, cancelled
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Symptom Checker
export const symptomChecks = pgTable("symptom_checks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  userId: integer("user_id").notNull().references(() => users.id),
  symptoms: text("symptoms").array().notNull(),
  symptomDescription: text("symptom_description").notNull(),
  duration: text("duration"),
  severity: varchar("severity", { length: 20 }),
  aiAnalysis: jsonb("ai_analysis").$type<{
    potentialDiagnoses?: Array<{
      condition: string;
      probability: string;
      description: string;
      severity: string;
    }>;
    recommendedSpecialists?: Array<{
      specialty: string;
      reason: string;
      urgency: string;
    }>;
    redFlags?: string[];
    homeCareTips?: string[];
    whenToSeekCare?: string;
    confidence: number;
  }>(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  appointmentCreated: boolean("appointment_created").notNull().default(false),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prescriptions
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  prescriptionCreatedBy: integer("prescription_created_by").references(() => users.id),
  consultationId: integer("consultation_id").references(() => consultations.id),
  prescriptionNumber: varchar("prescription_number", { length: 50 }),
  status: text("status").notNull().default("active"), // active, completed, cancelled, expired
  diagnosis: text("diagnosis"),
  // Legacy columns (for backward compatibility)
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"),
  duration: text("duration"),
  instructions: text("instructions"),
  issuedDate: timestamp("issued_date").defaultNow(),
  // Modern JSONB columns
  medications: jsonb("medications").$type<Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    refills: number;
    instructions: string;
    genericAllowed: boolean;
    ndc?: string; // National Drug Code
    startDate?: string;
    endDate?: string;
  }>>().default([]),
  pharmacy: jsonb("pharmacy").$type<{
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    fax?: string;
    npi?: string; // National Provider Identifier
  }>().default({}),
  prescribedAt: timestamp("prescribed_at").defaultNow(),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  isElectronic: boolean("is_electronic").notNull().default(true),
  interactions: jsonb("interactions").$type<Array<{
    severity: "minor" | "moderate" | "major";
    description: string;
    medications: string[];
  }>>().default([]),
  signature: jsonb("signature").$type<{
    doctorSignature?: string; // base64 encoded signature image
    signedBy?: string; // doctor name
    signedAt?: string; // ISO timestamp
    signerId?: number; // user ID who signed
  }>().default({}),
  savedPdfPath: text("saved_pdf_path"), // Path to saved PDF file
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prescription Share Logs
export const prescriptionShareLogs = pgTable("prescription_share_logs", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull().references(() => prescriptions.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  sentBy: integer("sent_by").references(() => users.id),
  recipientEmail: text("recipient_email"), // Email address of recipient (pharmacy or patient)
  pharmacyEmail: text("pharmacy_email"), // Pharmacy email (if shared with pharmacy)
  pharmacyName: text("pharmacy_name"), // Pharmacy name
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent, success, failed
  emailSent: boolean("email_sent").notNull().default(false),
  emailSubject: text("email_subject"),
  emailHtml: text("email_html"),
  emailText: text("email_text"),
  emailError: text("email_error"),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical Images
export const medicalImages = pgTable("medical_images", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  imageId: text("image_id").notNull().unique(), // Unique image ID (e.g., IMG1760636902921I2ONC)
  studyType: text("study_type").notNull(),
  modality: varchar("modality", { length: 50 }).notNull(), // X-Ray, CT, MRI, Ultrasound, etc.
  bodyPart: text("body_part"),
  indication: text("indication"),
  priority: varchar("priority", { length: 20 }).notNull().default("routine"), // routine, urgent, stat
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  imageData: text("image_data"), // base64 encoded image data
  status: varchar("status", { length: 20 }).notNull().default("uploaded"), // uploaded, processing, analyzed, reported
  // Report fields for radiological interpretation
  findings: text("findings"), // Radiological findings
  impression: text("impression"), // Clinical impression
  radiologist: text("radiologist"), // Radiologist who interpreted the study
  // Generated PDF report storage
  reportFileName: text("report_file_name"), // Generated PDF report file name
  reportFilePath: text("report_file_path"), // Generated PDF report file path
  prescriptionFilePath: text("prescription_file_path"), // Prescription PDF file path
  metadata: jsonb("metadata").$type<{
    imageCount?: number;
    totalSize?: string;
    resolution?: string;
    acquisitionDate?: string;
  }>().default({}),
  // Study scheduling and performance dates
  scheduledAt: timestamp("scheduled_at"),
  performedAt: timestamp("performed_at"),
  // Order study tracking fields
  orderStudyCreated: boolean("order_study_created").notNull().default(false),
  orderStudyReadyToGenerate: boolean("order_study_ready_to_generate").notNull().default(false),
  orderStudyGenerated: boolean("order_study_generated").notNull().default(false),
  orderStudyShared: boolean("order_study_shared").notNull().default(false),
  // E-signature fields
  signatureData: text("signature_data"),
  signatureDate: timestamp("signature_date"),
  // Selected role and user fields
  selectedRole: varchar("selected_role", { length: 20 }),
  selectedUserId: integer("selected_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Radiology Images - Multiple images per radiology report
export const radiologyImages = pgTable("radiology_images", {
  id: serial("id").primaryKey(),
  medicalImageId: integer("medical_image_id").notNull().references(() => medicalImages.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  fileName: text("file_name").notNull(), // Image file name
  filePath: text("file_path").notNull(), // Full file path in filesystem
  fileSize: integer("file_size").notNull(), // File size in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull(), // Image MIME type
  imageData: text("image_data"), // Optional: base64 encoded image data
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  displayOrder: integer("display_order").default(0), // Order for displaying images in report
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clinical Photos - Voice Documentation Photos
export const clinicalPhotos = pgTable("clinical_photos", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  capturedBy: integer("captured_by").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // wound, rash, surgical_site, dermatological, dental, etc.
  description: text("description").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(), // Filesystem path where image is stored
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull().default("image/png"),
  metadata: jsonb("metadata").$type<{
    camera?: string;
    resolution?: string;
    lighting?: string;
    location?: string; // body part or location where photo was taken
    tags?: string[];
  }>().default({}),
  aiAnalysis: jsonb("ai_analysis").$type<{
    findings?: string[];
    recommendations?: string[];
    confidence?: number;
    severity?: string;
  }>(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, archived, deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Patient Communications Tracking
export const patientCommunications = pgTable("patient_communications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  sentBy: integer("sent_by").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // appointment_reminder, medication_reminder, follow_up_reminder, billing_notice, marketing
  method: varchar("method", { length: 20 }).notNull(), // email, sms, phone, whatsapp
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, delivered, failed, opened, clicked
  message: text("message").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    appointmentId?: number;
    reminderType?: string;
    urgency?: "low" | "medium" | "high";
    retryCount?: number;
    cost?: number;
    provider?: string; // Twilio, SendGrid, etc.
    flagType?: "urgent" | "follow-up" | "billing" | "general";
    priority?: "low" | "medium" | "high" | "urgent";
    method?: string;
    timezone?: string;
    localTime?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id), // Who should receive this notification
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // appointment_reminder, lab_result, prescription_alert, system_alert, payment_due, etc.
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, critical
  status: varchar("status", { length: 20 }).notNull().default("unread"), // unread, read, dismissed, archived
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // patient, appointment, prescription, etc.
  relatedEntityId: integer("related_entity_id"), // ID of the related entity
  actionUrl: text("action_url"), // URL to navigate to when clicked
  isActionable: boolean("is_actionable").notNull().default(false), // Whether this notification requires an action
  scheduledFor: timestamp("scheduled_for"), // For delayed notifications
  expiresAt: timestamp("expires_at"), // When notification should auto-expire
  metadata: jsonb("metadata").$type<{
    patientId?: number;
    patientName?: string;
    appointmentId?: number;
    prescriptionId?: number;
    urgency?: "low" | "medium" | "high" | "critical" | "moderate";
    riskLevel?: "low" | "medium" | "high" | "critical" | "moderate";
    alertType?: string;
    department?: string;
    requiresResponse?: boolean;
    autoMarkAsRead?: boolean;
    icon?: string;
    color?: string;
  }>().default({}),
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GDPR Consent Management
export const gdprConsents = pgTable("gdpr_consents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  consentType: varchar("consent_type", { length: 50 }).notNull(), // data_processing, marketing, research, data_sharing
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, granted, withdrawn, expired
  grantedAt: timestamp("granted_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  expiresAt: timestamp("expires_at"),
  purpose: text("purpose").notNull(), // specific purpose for data processing
  legalBasis: varchar("legal_basis", { length: 50 }).notNull(), // legitimate_interest, consent, contract, legal_obligation
  dataCategories: jsonb("data_categories").$type<string[]>().default([]), // personal_data, health_data, financial_data
  retentionPeriod: integer("retention_period"), // in months
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  consentMethod: varchar("consent_method", { length: 30 }).notNull().default("digital"), // digital, written, verbal
  metadata: jsonb("metadata").$type<{
    version?: string;
    language?: string;
    consentDocument?: string;
    witnesses?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GDPR Data Requests (Right to Access, Portability, Erasure)
export const gdprDataRequests = pgTable("gdpr_data_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  requestType: varchar("request_type", { length: 30 }).notNull(), // access, portability, erasure, rectification
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, rejected
  requestReason: text("request_reason"),
  identityVerified: boolean("identity_verified").notNull().default(false),
  processedBy: integer("processed_by").references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date").notNull(), // 30 days from request
  responseData: jsonb("response_data").$type<{
    exportedFiles?: string[];
    dataCategories?: string[];
    deletedRecords?: string[];
    rectificationChanges?: any[];
  }>().default({}),
  rejectionReason: text("rejection_reason"),
  communicationLog: jsonb("communication_log").$type<Array<{
    timestamp: string;
    type: string;
    message: string;
    sentBy: string;
  }>>().default([]),
  metadata: jsonb("metadata").$type<{
    requestMethod?: string; // email, portal, written
    documentsSent?: string[];
    followUpRequired?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GDPR Audit Trail
export const gdprAuditTrail = pgTable("gdpr_audit_trail", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").references(() => users.id),
  patientId: integer("patient_id").references(() => patients.id),
  action: varchar("action", { length: 50 }).notNull(), // data_access, data_export, data_deletion, consent_change
  resourceType: varchar("resource_type", { length: 30 }).notNull(), // patient, medical_record, prescription, etc.
  resourceId: integer("resource_id"),
  dataCategories: jsonb("data_categories").$type<string[]>().default([]),
  legalBasis: varchar("legal_basis", { length: 50 }),
  purpose: text("purpose"),
  changes: jsonb("changes").$type<Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>>().default([]),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<{
    riskLevel?: string;
    complianceFlags?: string[];
    retentionPeriod?: number;
  }>().default({}),
});

// GDPR Data Processing Activities
export const gdprProcessingActivities = pgTable("gdpr_processing_activities", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  activityName: text("activity_name").notNull(),
  purpose: text("purpose").notNull(),
  legalBasis: varchar("legal_basis", { length: 50 }).notNull(),
  dataCategories: jsonb("data_categories").$type<string[]>().default([]),
  dataSubjects: jsonb("data_subjects").$type<string[]>().default([]), // patients, employees, visitors
  recipients: jsonb("recipients").$type<string[]>().default([]), // internal staff, third parties
  internationalTransfers: jsonb("international_transfers").$type<Array<{
    country: string;
    safeguards: string;
    adequacyDecision: boolean;
  }>>().default([]),
  retentionPeriod: integer("retention_period"), // in months
  securityMeasures: jsonb("security_measures").$type<string[]>().default([]),
  dataProtectionImpactAssessment: boolean("dpia_required").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, suspended, terminated
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lab Results
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  testId: varchar("test_id", { length: 50 }).notNull(),
  testType: text("test_type").notNull(),
  orderedBy: integer("ordered_by").notNull().references(() => users.id),
  doctorName: text("doctor_name"), // Store doctor name as entered
  mainSpecialty: text("main_specialty"), // Store main specialization as entered
  subSpecialty: text("sub_specialty"), // Store sub-specialization as entered
  priority: varchar("priority", { length: 20 }).default("routine"), // routine, urgent, stat
  orderedAt: timestamp("ordered_at").notNull(),
  collectedAt: timestamp("collected_at"),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, cancelled
  reportStatus: varchar("report_status", { length: 50 }),
  results: jsonb("results").$type<Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "abnormal_high" | "abnormal_low" | "critical";
    flag?: string;
  }>>().default([]),
  criticalValues: boolean("critical_values").notNull().default(false),
  notes: text("notes"),
  labRequestGenerated: boolean("Lab_Request_Generated").notNull().default(false),
  sampleCollected: boolean("Sample_Collected").notNull().default(false),
  labReportGenerated: boolean("Lab_Report_Generated").notNull().default(false),
  reviewed: boolean("Reviewed").notNull().default(false),
  readyToGenerateLab: boolean("ready_to_generate_lab").notNull().default(false), // Workflow: when prescription is saved, set to true
  labResultGeneratedReport: boolean("lab_result_generated_report").notNull().default(false), // Workflow: when report is generated, set to true
  signature: jsonb("signature").$type<{
    doctorSignature?: string; // base64 encoded signature image
    signedBy?: string; // doctor name
    signedAt?: string; // ISO timestamp
    signerId?: number; // user ID who signed
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Risk Assessments
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  category: text("category").notNull(), // Cardiovascular Disease, Diabetes, etc.
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(), // Percentage 0.00-100.00
  riskLevel: varchar("risk_level", { length: 20 }).notNull(), // low, moderate, high, critical
  riskFactors: jsonb("risk_factors").$type<string[]>().default([]),
  recommendations: jsonb("recommendations").$type<string[]>().default([]),
  basedOnLabResults: jsonb("based_on_lab_results").$type<Array<{
    testId: string;
    testName: string;
    value: string;
    status: string;
    flag?: string;
  }>>().default([]),
  hasCriticalValues: boolean("has_critical_values").notNull().default(false),
  assessmentDate: timestamp("assessment_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Financial Claims
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  claimNumber: varchar("claim_number", { length: 50 }).notNull().unique(),
  serviceDate: timestamp("service_date").notNull(),
  submissionDate: timestamp("submission_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, denied, paid
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  paymentDate: timestamp("payment_date"),
  denialReason: text("denial_reason"),
  insuranceProvider: text("insurance_provider").notNull(),
  procedures: jsonb("procedures").$type<Array<{
    code: string;
    description: string;
    amount: number;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Revenue Data
export const revenueRecords = pgTable("revenue_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull(),
  expenses: decimal("expenses", { precision: 12, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 12, scale: 2 }).notNull(),
  collections: decimal("collections", { precision: 12, scale: 2 }).notNull(),
  target: decimal("target", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insurance Verifications
export const insuranceVerifications = pgTable("insurance_verifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  patientName: text("patient_name").notNull(),
  provider: text("provider").notNull(),
  policyNumber: text("policy_number").notNull(),
  groupNumber: text("group_number"),
  memberNumber: text("member_number"),
  nhsNumber: text("nhs_number"),
  planType: text("plan_type"),
  coverageType: varchar("coverage_type", { length: 20 }).notNull().default("primary"), // primary, secondary
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, pending, expired
  eligibilityStatus: varchar("eligibility_status", { length: 20 }).notNull().default("pending"), // verified, pending, invalid
  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  lastVerified: date("last_verified"),
  benefits: jsonb("benefits").$type<{
    deductible?: number;
    deductibleMet?: number;
    copay?: number;
    coinsurance?: number;
    outOfPocketMax?: number;
    outOfPocketMet?: number;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial Forecasting Models
export const forecastModels = pgTable("forecast_models", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  type: varchar("type", { length: 30 }).notNull(), // revenue, expenses, collections, claims
  algorithm: varchar("algorithm", { length: 20 }).notNull().default("linear"), // linear, seasonal, exponential
  parameters: jsonb("parameters").$type<{
    lookbackMonths?: number;
    seasonalityFactor?: number;
    trendWeight?: number;
    volatilityAdjustment?: number;
    customFactors?: Array<{
      name: string;
      weight: number;
      description: string;
    }>;
  }>().default({}),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }), // 0.00 to 100.00 percentage
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial Forecasts
export const financialForecasts = pgTable("financial_forecasts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  category: text("category").notNull(), // "Monthly Revenue", "Collection Rate", "Claim Volume", "Operating Expenses"
  forecastPeriod: varchar("forecast_period", { length: 7 }).notNull(), // YYYY-MM format for the predicted period
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }).notNull(),
  projectedValue: decimal("projected_value", { precision: 12, scale: 2 }).notNull(),
  variance: decimal("variance", { precision: 12, scale: 2 }).notNull(),
  trend: varchar("trend", { length: 10 }).notNull(), // up, down, stable
  confidence: integer("confidence").notNull(), // 0-100 percentage
  methodology: varchar("methodology", { length: 30 }).notNull().default("historical_trend"), // historical_trend, seasonal_analysis, regression
  keyFactors: jsonb("key_factors").$type<Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
    description: string;
  }>>().default([]),
  modelId: integer("model_id").references(() => forecastModels.id),
  metadata: jsonb("metadata").$type<{
    basedOnMonths?: number;
    dataPoints?: number;
    correlationCoeff?: number;
    seasonalComponent?: number;
    externalFactors?: string[];
    assumptions?: string[];
  }>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clinical Procedures
export const clinicalProcedures = pgTable("clinical_procedures", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  duration: text("duration").notNull(),
  complexity: varchar("complexity", { length: 20 }).notNull(), // low, medium, high
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  steps: jsonb("steps").$type<string[]>().default([]),
  complications: jsonb("complications").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Emergency Protocols
export const emergencyProtocols = pgTable("emergency_protocols", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  priority: varchar("priority", { length: 20 }).notNull(), // low, medium, high, critical
  steps: jsonb("steps").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medications Database
export const medicationsDatabase = pgTable("medications_database", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  dosage: text("dosage").notNull(),
  interactions: jsonb("interactions").$type<string[]>().default([]),
  warnings: jsonb("warnings").$type<string[]>().default([]),
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patient Drug Interactions
export const patientDrugInteractions = pgTable("patient_drug_interactions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  medication1Name: text("medication1_name").notNull(),
  medication1Dosage: text("medication1_dosage").notNull(),
  medication1Frequency: text("medication1_frequency"),
  medication2Name: text("medication2_name").notNull(),
  medication2Dosage: text("medication2_dosage").notNull(),
  medication2Frequency: text("medication2_frequency"),
  interactionType: varchar("interaction_type", { length: 50 }), // drug-drug, drug-food, drug-condition
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high
  description: text("description"),
  warnings: jsonb("warnings").$type<string[]>().default([]),
  recommendations: jsonb("recommendations").$type<string[]>().default([]),
  reportedBy: integer("reported_by").references(() => users.id),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, resolved, dismissed
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory Management System
export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(), // Tablets, Syrups, Pharmaceuticals, Beauty Products, Vitamins, Minerals
  description: text("description"),
  parentCategoryId: integer("parent_category_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }).notNull(), // Stock Keeping Unit
  barcode: varchar("barcode", { length: 100 }),
  genericName: text("generic_name"),
  brandName: text("brand_name"),
  manufacturer: text("manufacturer"),
  unitOfMeasurement: varchar("unit_of_measurement", { length: 20 }).notNull().default("pieces"), // pieces, ml, mg, grams, etc.
  packSize: integer("pack_size").notNull().default(1),

  // Pricing
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }), // Maximum Retail Price
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("0.00"), // VAT/GST percentage

  // Stock Management
  currentStock: integer("current_stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(10),
  maximumStock: integer("maximum_stock").notNull().default(1000),
  reorderPoint: integer("reorder_point").notNull().default(20),

  // Additional Information
  expiryTracking: boolean("expiry_tracking").notNull().default(false),
  batchTracking: boolean("batch_tracking").notNull().default(false),
  prescriptionRequired: boolean("prescription_required").notNull().default(false),
  storageConditions: text("storage_conditions"),
  sideEffects: text("side_effects"),
  contraindications: text("contraindications"),
  dosageInstructions: text("dosage_instructions"),

  // Status
  isActive: boolean("is_active").notNull().default(true),
  isDiscontinued: boolean("is_discontinued").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventorySuppliers = pgTable("inventory_suppliers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: text("city"),
  country: text("country").notNull().default("UK"),
  taxId: varchar("tax_id", { length: 50 }),
  paymentTerms: varchar("payment_terms", { length: 100 }).default("Net 30"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryItemsName = pgTable("inventory_items_name", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  brandName: text("brand_name"),
  manufacturer: text("manufacturer"),
  unitOfMeasurement: varchar("unit_of_measurement", { length: 20 }).default("pieces"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryPurchaseOrders = pgTable("inventory_purchase_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  poNumber: varchar("po_number", { length: 100 }).notNull().unique(),
  supplierId: integer("supplier_id").notNull(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, received, cancelled
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  emailSent: boolean("email_sent").notNull().default(false),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryPurchaseOrderItems = pgTable("inventory_purchase_order_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  purchaseOrderId: integer("purchase_order_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: integer("received_quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryWarehouses = pgTable("inventory_warehouses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  warehouseName: varchar("warehouse_name", { length: 200 }).notNull(),
  location: text("location"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryBatches = pgTable("inventory_batches", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  itemId: integer("item_id").notNull(),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  expiryDate: timestamp("expiry_date"),
  manufactureDate: timestamp("manufacture_date"),
  quantity: integer("quantity").notNull(),
  remainingQuantity: integer("remaining_quantity").notNull().default(0),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  supplierId: integer("supplier_id"),
  warehouseId: integer("warehouse_id"),
  purchaseOrderId: integer("purchase_order_id"), // Link to purchase order
  receivedDate: timestamp("received_date").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  isExpired: boolean("is_expired").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventorySales = pgTable("inventory_sales", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id"),
  saleNumber: varchar("sale_number", { length: 100 }).notNull().unique(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  saleType: varchar("sale_type", { length: 20 }).notNull().default("walk_in"),
  customerName: varchar("customer_name", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  saleDate: timestamp("sale_date").defaultNow().notNull(),
  subtotalAmount: decimal("subtotal_amount", { precision: 12, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountType: varchar("discount_type", { length: 20 }),
  discountReason: varchar("discount_reason", { length: 200 }),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("cash"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("paid"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0.00"),
  amountDue: decimal("amount_due", { precision: 12, scale: 2 }).default("0.00"),
  changeGiven: decimal("change_given", { precision: 10, scale: 2 }).default("0.00"),
  insuranceProviderId: integer("insurance_provider_id"),
  insuranceClaimNumber: varchar("insurance_claim_number", { length: 100 }),
  insuranceAmount: decimal("insurance_amount", { precision: 12, scale: 2 }),
  copayAmount: decimal("copay_amount", { precision: 10, scale: 2 }),
  prescriptionId: integer("prescription_id"),
  soldBy: integer("sold_by").notNull(),
  shiftId: integer("shift_id"),
  status: varchar("status", { length: 20 }).default("completed"),
  voidedAt: timestamp("voided_at"),
  voidedBy: integer("voided_by"),
  voidReason: varchar("void_reason", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventorySaleItems = pgTable("inventory_sale_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  saleId: integer("sale_id").notNull(),
  itemId: integer("item_id").notNull(),
  batchId: integer("batch_id").notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  quantity: integer("quantity").notNull(),
  returnedQuantity: integer("returned_quantity").default(0),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  prescriptionItemId: integer("prescription_item_id"),
  status: varchar("status", { length: 20 }).default("sold"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryStockMovements = pgTable("inventory_stock_movements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  itemId: integer("item_id").notNull(),
  batchId: integer("batch_id"),
  movementType: varchar("movement_type", { length: 20 }).notNull(), // purchase, sale, adjustment, transfer, expired
  quantity: integer("quantity").notNull(), // positive for in, negative for out
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  referenceType: varchar("reference_type", { length: 50 }), // purchase_order, sale, adjustment
  referenceId: integer("reference_id"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryStockAlerts = pgTable("inventory_stock_alerts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  itemId: integer("item_id").notNull(),
  alertType: varchar("alert_type", { length: 20 }).notNull(), // low_stock, expired, expiring_soon
  thresholdValue: integer("threshold_value").notNull(),
  currentValue: integer("current_value").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, resolved
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// PHARMACY SALES MODULE - NEW TABLES
// ========================================

export const inventoryTaxRates = pgTable("inventory_tax_rates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  appliesTo: varchar("applies_to", { length: 50 }).default("all"),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insuranceProviders = pgTable("insurance_providers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  contactPerson: varchar("contact_person", { length: 200 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  defaultCoveragePercent: decimal("default_coverage_percent", { precision: 5, scale: 2 }).default("80.00"),
  maxCoverageAmount: decimal("max_coverage_amount", { precision: 12, scale: 2 }),
  apiEndpoint: varchar("api_endpoint", { length: 500 }),
  apiKey: varchar("api_key", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventorySalePayments = pgTable("inventory_sale_payments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  saleId: integer("sale_id").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  cardLast4: varchar("card_last_4", { length: 4 }),
  cardType: varchar("card_type", { length: 20 }),
  authorizationCode: varchar("authorization_code", { length: 50 }),
  transactionReference: varchar("transaction_reference", { length: 100 }),
  insuranceProviderId: integer("insurance_provider_id"),
  claimNumber: varchar("claim_number", { length: 100 }),
  claimStatus: varchar("claim_status", { length: 20 }),
  status: varchar("status", { length: 20 }).default("completed"),
  processedBy: integer("processed_by").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// RETURNS MANAGEMENT MODULE - NEW TABLES
// ========================================

export const inventoryReturns = pgTable("inventory_returns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  returnNumber: varchar("return_number", { length: 100 }).notNull().unique(),
  returnType: varchar("return_type", { length: 20 }).notNull(),
  originalSaleId: integer("original_sale_id"),
  originalPurchaseOrderId: integer("original_purchase_order_id"),
  originalInvoiceNumber: varchar("original_invoice_number", { length: 100 }),
  patientId: integer("patient_id"),
  customerName: varchar("customer_name", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  supplierId: integer("supplier_id"),
  supplierRmaNumber: varchar("supplier_rma_number", { length: 100 }),
  subtotalAmount: decimal("subtotal_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  restockingFee: decimal("restocking_fee", { precision: 10, scale: 2 }).default("0.00"),
  netRefundAmount: decimal("net_refund_amount", { precision: 12, scale: 2 }).notNull(),
  settlementType: varchar("settlement_type", { length: 20 }),
  creditNoteNumber: varchar("credit_note_number", { length: 100 }),
  creditNoteAmount: decimal("credit_note_amount", { precision: 12, scale: 2 }),
  refundTransactionId: varchar("refund_transaction_id", { length: 100 }),
  returnReason: varchar("return_reason", { length: 100 }).notNull(),
  returnReasonDetails: text("return_reason_details"),
  internalNotes: text("internal_notes"),
  shiftId: integer("shift_id"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  rejectedBy: integer("rejected_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  shippedAt: timestamp("shipped_at"),
  shippedBy: integer("shipped_by"),
  carrierName: varchar("carrier_name", { length: 100 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  receivedBySupplierAt: timestamp("received_by_supplier_at"),
  initiatedBy: integer("initiated_by").notNull(),
  processedBy: integer("processed_by"),
  returnDate: timestamp("return_date").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryReturnItems = pgTable("inventory_return_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  returnId: integer("return_id").notNull(),
  itemId: integer("item_id").notNull(),
  originalSaleItemId: integer("original_sale_item_id"),
  originalPoItemId: integer("original_po_item_id"),
  batchId: integer("batch_id").notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  returnedQuantity: integer("returned_quantity").notNull(),
  acceptedQuantity: integer("accepted_quantity").default(0),
  rejectedQuantity: integer("rejected_quantity").default(0),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  conditionOnReturn: varchar("condition_on_return", { length: 30 }),
  isRestockable: boolean("is_restockable").default(false),
  inspectionNotes: text("inspection_notes"),
  inspectedBy: integer("inspected_by"),
  inspectedAt: timestamp("inspected_at"),
  disposition: varchar("disposition", { length: 30 }),
  dispositionNotes: text("disposition_notes"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryReturnApprovals = pgTable("inventory_return_approvals", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  returnId: integer("return_id").notNull(),
  approvalLevel: integer("approval_level").notNull().default(1),
  approverRole: varchar("approver_role", { length: 50 }).notNull(),
  approverId: integer("approver_id"),
  decision: varchar("decision", { length: 20 }),
  decisionNotes: text("decision_notes"),
  decisionAt: timestamp("decision_at"),
  escalatedTo: integer("escalated_to"),
  escalationReason: text("escalation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryStockAdjustments = pgTable("inventory_stock_adjustments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  adjustmentNumber: varchar("adjustment_number", { length: 100 }).notNull().unique(),
  adjustmentType: varchar("adjustment_type", { length: 30 }).notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: integer("reference_id"),
  itemId: integer("item_id").notNull(),
  batchId: integer("batch_id"),
  previousQuantity: integer("previous_quantity").notNull(),
  adjustmentQuantity: integer("adjustment_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCostImpact: decimal("total_cost_impact", { precision: 12, scale: 2 }),
  reason: varchar("reason", { length: 200 }).notNull(),
  notes: text("notes"),
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  adjustedBy: integer("adjusted_by").notNull(),
  adjustmentDate: timestamp("adjustment_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryCreditNotes = pgTable("inventory_credit_notes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  creditNoteNumber: varchar("credit_note_number", { length: 100 }).notNull().unique(),
  creditNoteType: varchar("credit_note_type", { length: 30 }).notNull(),
  returnId: integer("return_id"),
  originalInvoiceNumber: varchar("original_invoice_number", { length: 100 }),
  patientId: integer("patient_id"),
  supplierId: integer("supplier_id"),
  recipientName: varchar("recipient_name", { length: 200 }),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }).notNull(),
  usedAmount: decimal("used_amount", { precision: 12, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remaining_amount", { precision: 12, scale: 2 }).notNull(),
  issueDate: timestamp("issue_date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  status: varchar("status", { length: 20 }).default("active"),
  issuedBy: integer("issued_by").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conversations - Database table for persistent messaging
export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 50 }).primaryKey(), // using string IDs like conv_xxx
  organizationId: integer("organization_id").notNull(),
  participants: jsonb("participants").$type<Array<{
    id: string | number;
    name: string;
    role: string;
  }>>().notNull(),
  lastMessage: jsonb("last_message").$type<{
    id: string;
    senderId: string | number;
    subject: string;
    content: string;
    timestamp: string;
    priority: string;
  }>(),
  unreadCount: integer("unread_count").notNull().default(0),
  isPatientConversation: boolean("is_patient_conversation").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages - Database table for persistent message storage
export const messages = pgTable("messages", {
  id: varchar("id", { length: 50 }).primaryKey(), // using string IDs like msg_xxx
  organizationId: integer("organization_id").notNull(),
  conversationId: varchar("conversation_id", { length: 50 }).notNull(),
  senderId: integer("sender_id").notNull(), // references users.id
  senderName: text("sender_name").notNull(),
  senderRole: varchar("sender_role", { length: 20 }).notNull(),
  recipientId: text("recipient_id"), // can be string or number
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isRead: boolean("is_read").notNull().default(false),
  priority: varchar("priority", { length: 10 }).notNull().default("normal"), // low, normal, high, urgent
  type: varchar("type", { length: 20 }).notNull().default("internal"), // internal, patient, broadcast
  isStarred: boolean("is_starred").notNull().default(false),
  phoneNumber: varchar("phone_number", { length: 20 }),
  messageType: varchar("message_type", { length: 10 }), // sms, email, internal
  deliveryStatus: varchar("delivery_status", { length: 20 }).notNull().default("pending"), // pending, sent, delivered, failed
  externalMessageId: text("external_message_id"), // Twilio message ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Message Campaigns - Database table for messaging campaigns
export const messageCampaigns = pgTable("message_campaigns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  type: varchar("type", { length: 20 }).notNull().default("email"), // email, sms, both
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, scheduled, sent, cancelled
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  template: varchar("template", { length: 50 }).notNull().default("default"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  openRate: integer("open_rate").notNull().default(0), // percentage
  clickRate: integer("click_rate").notNull().default(0), // percentage
  recipients: jsonb("recipients").default([]), // Array of recipient objects with id, name, role, phone, email
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message Templates - Database table for reusable message templates
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("general"), // general, appointment, reminder, etc.
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Conversation Favorites - Tracks which conversations each user has favorited
export const userConversationFavorites = pgTable("user_conversation_favorites", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  conversationId: varchar("conversation_id", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Message Tags - Tags that can be applied to messages
export const messageTags = pgTable("message_tags", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 20 }).default("blue"), // blue, red, green, yellow, purple, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

// Message Tag Assignments - Junction table linking messages to tags
export const messageTagAssignments = pgTable("message_tag_assignments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  messageId: varchar("message_id", { length: 50 }).notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

// SaaS Relations
export const saasSubscriptionsRelations = relations(saasSubscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [saasSubscriptions.organizationId],
    references: [organizations.id],
  }),
  package: one(saasPackages, {
    fields: [saasSubscriptions.packageId],
    references: [saasPackages.id],
  }),
  payments: many(saasPayments),
  invoices: many(saasInvoices),
}));

export const saasPaymentsRelations = relations(saasPayments, ({ one }) => ({
  organization: one(organizations, {
    fields: [saasPayments.organizationId],
    references: [organizations.id],
  }),
  subscription: one(saasSubscriptions, {
    fields: [saasPayments.subscriptionId],
    references: [saasSubscriptions.id],
  }),
}));

export const saasInvoicesRelations = relations(saasInvoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [saasInvoices.organizationId],
    references: [organizations.id],
  }),
  subscription: one(saasSubscriptions, {
    fields: [saasInvoices.subscriptionId],
    references: [saasSubscriptions.id],
  }),
}));

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  patients: many(patients),
  subscription: many(subscriptions),
  saasPayments: many(saasPayments),
  saasInvoices: many(saasInvoices),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  medicalRecords: many(medicalRecords),
  appointments: many(appointments),
  shifts: many(staffShifts),
  documentPreferences: many(userDocumentPreferences),
}));

export const userDocumentPreferencesRelations = relations(userDocumentPreferences, ({ one }) => ({
  organization: one(organizations, {
    fields: [userDocumentPreferences.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [userDocumentPreferences.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ one }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [patients.organizationId],
    references: [organizations.id],
  }),
  medicalRecords: many(medicalRecords),
  appointments: many(appointments),
  aiInsights: many(aiInsights),
  communications: many(patientCommunications),
  prescriptions: many(prescriptions),
  medicalImages: many(medicalImages),
  clinicalPhotos: many(clinicalPhotos),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const patientCommunicationsRelations = relations(patientCommunications, ({ one }) => ({
  organization: one(organizations, {
    fields: [patientCommunications.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [patientCommunications.patientId],
    references: [patients.id],
  }),
  sentByUser: one(users, {
    fields: [patientCommunications.sentBy],
    references: [users.id],
  }),
}));

export const medicalRecordsFilesRelations = relations(medicalRecordsFiles, ({ one }) => ({
  medicalRecord: one(medicalRecords, {
    fields: [medicalRecordsFiles.medicalRecordId],
    references: [medicalRecords.id],
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [medicalRecords.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [medicalRecords.providerId],
    references: [users.id],
  }),
  files: many(medicalRecordsFiles),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointments.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [appointments.providerId],
    references: [users.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  organization: one(organizations, {
    fields: [aiInsights.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [aiInsights.patientId],
    references: [patients.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  organization: one(organizations, {
    fields: [consultations.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [consultations.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [consultations.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [consultations.providerId],
    references: [users.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [prescriptions.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [prescriptions.doctorId],
    references: [users.id],
  }),
  consultation: one(consultations, {
    fields: [prescriptions.consultationId],
    references: [consultations.id],
  }),
}));

export const medicalImagesRelations = relations(medicalImages, ({ one }) => ({
  organization: one(organizations, {
    fields: [medicalImages.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [medicalImages.patientId],
    references: [patients.id],
  }),
  uploadedByUser: one(users, {
    fields: [medicalImages.uploadedBy],
    references: [users.id],
  }),
}));

export const clinicalPhotosRelations = relations(clinicalPhotos, ({ one }) => ({
  organization: one(organizations, {
    fields: [clinicalPhotos.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [clinicalPhotos.patientId],
    references: [patients.id],
  }),
  capturedByUser: one(users, {
    fields: [clinicalPhotos.capturedBy],
    references: [users.id],
  }),
}));

// Lab Results Relations
export const labResultsRelations = relations(labResults, ({ one }) => ({
  organization: one(organizations, {
    fields: [labResults.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [labResults.patientId],
    references: [patients.id],
  }),
  orderedByUser: one(users, {
    fields: [labResults.orderedBy],
    references: [users.id],
  }),
}));

// Risk Assessments Relations
export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  organization: one(organizations, {
    fields: [riskAssessments.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [riskAssessments.patientId],
    references: [patients.id],
  }),
}));

// Claims Relations
export const claimsRelations = relations(claims, ({ one }) => ({
  organization: one(organizations, {
    fields: [claims.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [claims.patientId],
    references: [patients.id],
  }),
}));

// Revenue Records Relations
export const revenueRecordsRelations = relations(revenueRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [revenueRecords.organizationId],
    references: [organizations.id],
  }),
}));

// Clinical Procedures Relations
export const clinicalProceduresRelations = relations(clinicalProcedures, ({ one }) => ({
  organization: one(organizations, {
    fields: [clinicalProcedures.organizationId],
    references: [organizations.id],
  }),
}));

// Emergency Protocols Relations
export const emergencyProtocolsRelations = relations(emergencyProtocols, ({ one }) => ({
  organization: one(organizations, {
    fields: [emergencyProtocols.organizationId],
    references: [organizations.id],
  }),
}));

// Medications Database Relations
export const medicationsDatabaseRelations = relations(medicationsDatabase, ({ one }) => ({
  organization: one(organizations, {
    fields: [medicationsDatabase.organizationId],
    references: [organizations.id],
  }),
}));

// Staff Shifts Relations
export const staffShiftsRelations = relations(staffShifts, ({ one }) => ({
  organization: one(organizations, {
    fields: [staffShifts.organizationId],
    references: [organizations.id],
  }),
  staff: one(users, {
    fields: [staffShifts.staffId],
    references: [users.id],
  }),
}));

// Default Shifts Relations
export const doctorDefaultShiftsRelations = relations(doctorDefaultShifts, ({ one }) => ({
  organization: one(organizations, {
    fields: [doctorDefaultShifts.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [doctorDefaultShifts.userId],
    references: [users.id],
  }),
}));

// GDPR Relations
export const gdprConsentsRelations = relations(gdprConsents, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprConsents.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [gdprConsents.patientId],
    references: [patients.id],
  }),
}));

export const gdprDataRequestsRelations = relations(gdprDataRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprDataRequests.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [gdprDataRequests.patientId],
    references: [patients.id],
  }),
  processedByUser: one(users, {
    fields: [gdprDataRequests.processedBy],
    references: [users.id],
  }),
}));

export const gdprAuditTrailRelations = relations(gdprAuditTrail, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprAuditTrail.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [gdprAuditTrail.userId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [gdprAuditTrail.patientId],
    references: [patients.id],
  }),
}));

export const gdprProcessingActivitiesRelations = relations(gdprProcessingActivities, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprProcessingActivities.organizationId],
    references: [organizations.id],
  }),
}));

// Inventory Relations
export const inventoryCategoriesRelations = relations(inventoryCategories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventoryCategories.organizationId],
    references: [organizations.id],
  }),
  parentCategory: one(inventoryCategories, {
    fields: [inventoryCategories.parentCategoryId],
    references: [inventoryCategories.id],
  }),
  items: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventoryItems.organizationId],
    references: [organizations.id],
  }),
  category: one(inventoryCategories, {
    fields: [inventoryItems.categoryId],
    references: [inventoryCategories.id],
  }),
  batches: many(inventoryBatches),
  stockMovements: many(inventoryStockMovements),
  stockAlerts: many(inventoryStockAlerts),
  purchaseOrderItems: many(inventoryPurchaseOrderItems),
  saleItems: many(inventorySaleItems),
}));

export const inventorySuppliersRelations = relations(inventorySuppliers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventorySuppliers.organizationId],
    references: [organizations.id],
  }),
  purchaseOrders: many(inventoryPurchaseOrders),
  batches: many(inventoryBatches),
}));

export const inventoryPurchaseOrdersRelations = relations(inventoryPurchaseOrders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventoryPurchaseOrders.organizationId],
    references: [organizations.id],
  }),
  supplier: one(inventorySuppliers, {
    fields: [inventoryPurchaseOrders.supplierId],
    references: [inventorySuppliers.id],
  }),
  createdByUser: one(users, {
    fields: [inventoryPurchaseOrders.createdBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [inventoryPurchaseOrders.approvedBy],
    references: [users.id],
  }),
  items: many(inventoryPurchaseOrderItems),
}));

export const inventoryPurchaseOrderItemsRelations = relations(inventoryPurchaseOrderItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventoryPurchaseOrderItems.organizationId],
    references: [organizations.id],
  }),
  purchaseOrder: one(inventoryPurchaseOrders, {
    fields: [inventoryPurchaseOrderItems.purchaseOrderId],
    references: [inventoryPurchaseOrders.id],
  }),
  item: one(inventoryItems, {
    fields: [inventoryPurchaseOrderItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const inventoryBatchesRelations = relations(inventoryBatches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventoryBatches.organizationId],
    references: [organizations.id],
  }),
  item: one(inventoryItems, {
    fields: [inventoryBatches.itemId],
    references: [inventoryItems.id],
  }),
  supplier: one(inventorySuppliers, {
    fields: [inventoryBatches.supplierId],
    references: [inventorySuppliers.id],
  }),
  saleItems: many(inventorySaleItems),
  stockMovements: many(inventoryStockMovements),
}));

export const inventorySalesRelations = relations(inventorySales, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventorySales.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [inventorySales.patientId],
    references: [patients.id],
  }),
  prescription: one(prescriptions, {
    fields: [inventorySales.prescriptionId],
    references: [prescriptions.id],
  }),
  soldByUser: one(users, {
    fields: [inventorySales.soldBy],
    references: [users.id],
  }),
  items: many(inventorySaleItems),
}));

export const inventorySaleItemsRelations = relations(inventorySaleItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventorySaleItems.organizationId],
    references: [organizations.id],
  }),
  sale: one(inventorySales, {
    fields: [inventorySaleItems.saleId],
    references: [inventorySales.id],
  }),
  item: one(inventoryItems, {
    fields: [inventorySaleItems.itemId],
    references: [inventoryItems.id],
  }),
  batch: one(inventoryBatches, {
    fields: [inventorySaleItems.batchId],
    references: [inventoryBatches.id],
  }),
}));

export const inventoryStockMovementsRelations = relations(inventoryStockMovements, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventoryStockMovements.organizationId],
    references: [organizations.id],
  }),
  item: one(inventoryItems, {
    fields: [inventoryStockMovements.itemId],
    references: [inventoryItems.id],
  }),
  batch: one(inventoryBatches, {
    fields: [inventoryStockMovements.batchId],
    references: [inventoryBatches.id],
  }),
  createdByUser: one(users, {
    fields: [inventoryStockMovements.createdBy],
    references: [users.id],
  }),
}));

export const inventoryStockAlertsRelations = relations(inventoryStockAlerts, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventoryStockAlerts.organizationId],
    references: [organizations.id],
  }),
  item: one(inventoryItems, {
    fields: [inventoryStockAlerts.itemId],
    references: [inventoryItems.id],
  }),
  resolvedByUser: one(users, {
    fields: [inventoryStockAlerts.resolvedBy],
    references: [users.id],
  }),
}));

// Conversations Relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [conversations.organizationId],
    references: [organizations.id],
  }),
  messages: many(messages),
}));

// Messages Relations
export const messagesRelations = relations(messages, ({ one }) => ({
  organization: one(organizations, {
    fields: [messages.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// Message Campaigns Relations
export const messageCampaignsRelations = relations(messageCampaigns, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageCampaigns.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [messageCampaigns.createdBy],
    references: [users.id],
  }),
}));

// Message Templates Relations
export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageTemplates.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [messageTemplates.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().trim().min(1, "Organization name is required"),
  subdomain: z.string().trim().min(1, "Subdomain is required").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
  contactEmail: z.string().trim().email("Please enter a valid email address").min(1, "Contact email is required"),
  contactPhone: z.string().trim().min(1, "Contact phone is required"),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  country: z.string().trim().min(1, "Country is required"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
}).extend({
  email: z.string().trim().email("Please enter a valid email address").min(1, "Email is required"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(50, "Username cannot exceed 50 characters"),
  passwordHash: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Please select a role"), // Accept any role from database
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  isUsed: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type SelectPasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const insertUserDocumentPreferencesSchema = createInsertSchema(userDocumentPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserDocumentPreferencesSchema = insertUserDocumentPreferencesSchema.omit({
  organizationId: true,
  userId: true,
}).partial();

export const insertClinicHeaderSchema = createInsertSchema(clinicHeaders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  clinicName: z.string().trim().min(1, "Clinic name is required"),
  logoPosition: z.enum(["left", "right", "center"]).default("center"),
});

export const insertClinicFooterSchema = createInsertSchema(clinicFooters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  footerText: z.string().trim().min(1, "Footer text is required"),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().trim().min(1, "Role name is required"),
  displayName: z.string().trim().min(1, "Display name is required"),
  description: z.string().trim().min(1, "Description is required"),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  patientId: z.string().trim().min(1, "Patient ID is required"),
  relation: z.enum(["Self", "Father", "Mother", "Son", "Daughter", "Spouse", "Other", "Dependent Child"]).optional().nullable(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  patientId: z.coerce.number({
    required_error: "Patient is required",
    invalid_type_error: "Invalid patient selection"
  }),
  providerId: z.coerce.number({
    required_error: "Provider is required",
    invalid_type_error: "Invalid provider selection"
  }),
  recordType: z.string().trim().min(1, "Record type is required"),
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
});

// Valid time slots for appointments (9:00 AM to 4:30 PM in 30-minute intervals)
const VALID_TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"
] as const;

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
}).extend({
  patientId: z.coerce.number({
    required_error: "Patient is required",
    invalid_type_error: "Invalid patient selection"
  }),
  providerId: z.coerce.number({
    required_error: "Provider is required",
    invalid_type_error: "Invalid provider selection"
  }),
  title: z.string().trim().min(1, "Appointment title is required"),
  scheduledAt: z.coerce.date({
    required_error: "Appointment date and time is required",
    invalid_type_error: "Please enter a valid date and time"
  }),
  timeLabel: z.string().refine((val) => VALID_TIME_SLOTS.includes(val as any), {
    message: "Invalid time slot. Must be between 9:00 AM and 4:30 PM in 30-minute intervals"
  }).optional(),
  dateLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in YYYY-MM-DD format"
  }).optional(),
  duration: z.coerce.number({
    invalid_type_error: "Duration must be a number"
  }).positive("Duration must be greater than 0").default(30),
  type: z.string().trim().min(1, "Appointment type is required"),
  appointmentType: z.enum(["consultation", "treatment"]).default("consultation"),
  treatmentId: z.number().int().optional().nullable(),
  consultationId: z.number().int().optional().nullable(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
  patientId: z.string().trim().min(1, "Patient ID is required"),
  patientName: z.string().trim().min(1, "Patient name is required"),
  totalAmount: z.coerce.number().positive("Total amount must be greater than 0"),
  items: z.array(z.object({
    code: z.string().trim().min(1, "Service code is required"),
    description: z.string().trim().min(1, "Service description is required"),
    quantity: z.number().int().positive("Quantity must be greater than 0"),
    unitPrice: z.number().positive("Unit price must be greater than 0"),
    total: z.number().positive("Total must be greater than 0"),
  })).min(1, "At least one service item is required"),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceId: z.number().int().positive("Invoice ID is required"),
  transactionId: z.string().trim().min(1, "Transaction ID is required"),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.string().trim().min(1, "Payment method is required"),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export const insertInsurancePaymentSchema = createInsertSchema(insurancePayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceId: z.number().int().positive("Invoice ID is required"),
  amountPaid: z.coerce.number().positive("Payment amount must be greater than 0"),
  insuranceProvider: z.string().trim().min(1, "Insurance provider is required"),
});

export type InsurancePayment = typeof insurancePayments.$inferSelect;
export type InsertInsurancePayment = z.infer<typeof insertInsurancePaymentSchema>;

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSymptomCheckSchema = createInsertSchema(symptomChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientCommunicationSchema = createInsertSchema(patientCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicalImageSchema = createInsertSchema(medicalImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClinicalPhotoSchema = createInsertSchema(clinicalPhotos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating individual report fields
export const updateMedicalImageReportFieldSchema = z.object({
  fieldName: z.enum(['findings', 'impression', 'radiologist']),
  value: z.string().max(5000), // Reasonable max length for report fields
});

export type UpdateMedicalImageReportField = z.infer<typeof updateMedicalImageReportFieldSchema>;

export const insertLabResultSchema = createInsertSchema(labResults).omit({
  id: true,
  createdAt: true,
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({
  id: true,
  createdAt: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  createdAt: true,
});

export const insertRevenueRecordSchema = createInsertSchema(revenueRecords).omit({
  id: true,
  createdAt: true,
});

export const insertInsuranceVerificationSchema = createInsertSchema(insuranceVerifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClinicalProcedureSchema = createInsertSchema(clinicalProcedures).omit({
  id: true,
  createdAt: true,
});

export const insertEmergencyProtocolSchema = createInsertSchema(emergencyProtocols).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationsDatabaseSchema = createInsertSchema(medicationsDatabase).omit({
  id: true,
  createdAt: true,
});

export const insertStaffShiftSchema = createInsertSchema(staffShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDoctorDefaultShiftSchema = createInsertSchema(doctorDefaultShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationHolidaySettingsSchema = createInsertSchema(organizationHolidaySettings).omit({
  updatedAt: true,
});

export const insertOrganizationHolidaySchema = createInsertSchema(organizationHolidays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// GDPR Insert Schemas
export const insertGdprConsentSchema = createInsertSchema(gdprConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGdprDataRequestSchema = createInsertSchema(gdprDataRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGdprAuditTrailSchema = createInsertSchema(gdprAuditTrail).omit({
  id: true,
});

export const insertGdprProcessingActivitySchema = createInsertSchema(gdprProcessingActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Inventory Insert Schemas
export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySupplierSchema = createInsertSchema(inventorySuppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemsNameSchema = createInsertSchema(inventoryItemsName).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryPurchaseOrderSchema = createInsertSchema(inventoryPurchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryPurchaseOrderItemSchema = createInsertSchema(inventoryPurchaseOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryWarehouseSchema = createInsertSchema(inventoryWarehouses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryBatchSchema = createInsertSchema(inventoryBatches).omit({
  id: true,
  createdAt: true,
});

export const insertInventorySaleSchema = createInsertSchema(inventorySales).omit({
  id: true,
  createdAt: true,
});

export const insertInventorySaleItemSchema = createInsertSchema(inventorySaleItems).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryStockMovementSchema = createInsertSchema(inventoryStockMovements).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryStockAlertSchema = createInsertSchema(inventoryStockAlerts).omit({
  id: true,
  createdAt: true,
});

// Pharmacy Sales Module Insert Schemas
export const insertInventoryTaxRateSchema = createInsertSchema(inventoryTaxRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInsuranceProviderSchema = createInsertSchema(insuranceProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySalePaymentSchema = createInsertSchema(inventorySalePayments).omit({
  id: true,
  createdAt: true,
});

// Returns Management Module Insert Schemas
export const insertInventoryReturnSchema = createInsertSchema(inventoryReturns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryReturnItemSchema = createInsertSchema(inventoryReturnItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryReturnApprovalSchema = createInsertSchema(inventoryReturnApprovals).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryStockAdjustmentSchema = createInsertSchema(inventoryStockAdjustments).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryCreditNoteSchema = createInsertSchema(inventoryCreditNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Messaging Insert Schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  createdAt: true,
});

export const insertMessageCampaignSchema = createInsertSchema(messageCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Chatbot Configuration - Each organization can configure their chatbot
export const chatbotConfigs = pgTable("chatbot_configs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull().default("Healthcare Assistant"),
  description: text("description").default("AI-powered healthcare assistant"),
  isActive: boolean("is_active").notNull().default(true),
  primaryColor: text("primary_color").default("#4A7DFF"),
  welcomeMessage: text("welcome_message").default("Hello! I can help with appointments and prescriptions."),
  appointmentBookingEnabled: boolean("appointment_booking_enabled").notNull().default(true),
  prescriptionRequestsEnabled: boolean("prescription_requests_enabled").notNull().default(true),
  apiKey: text("api_key").notNull(),
  embedCode: text("embed_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chatbot Sessions - Track individual chat sessions
export const chatbotSessions = pgTable("chatbot_sessions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  configId: integer("config_id").notNull().references(() => chatbotConfigs.id),
  sessionId: text("session_id").notNull().unique(),
  visitorId: text("visitor_id"),
  patientId: integer("patient_id").references(() => patients.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  currentIntent: text("current_intent"),
  extractedPatientName: text("extracted_patient_name"),
  extractedPhone: text("extracted_phone"),
  extractedEmail: text("extracted_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chatbot Messages - Individual messages in chat sessions
export const chatbotMessages = pgTable("chatbot_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  sessionId: integer("session_id").notNull().references(() => chatbotSessions.id),
  messageId: text("message_id").notNull().unique(),
  sender: varchar("sender", { length: 10 }).notNull(),
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"),
  content: text("content").notNull(),
  intent: text("intent"),
  confidence: real("confidence"),
  aiProcessed: boolean("ai_processed").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chatbot Analytics - Track chatbot performance and usage
export const chatbotAnalytics = pgTable("chatbot_analytics", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  configId: integer("config_id").notNull().references(() => chatbotConfigs.id),
  date: timestamp("date").notNull(),
  totalSessions: integer("total_sessions").default(0),
  completedSessions: integer("completed_sessions").default(0),
  totalMessages: integer("total_messages").default(0),
  appointmentsBooked: integer("appointments_booked").default(0),
  prescriptionRequests: integer("prescription_requests").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chatbot Insert Schemas
export const insertChatbotConfigSchema = createInsertSchema(chatbotConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatbotSessionSchema = createInsertSchema(chatbotSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatbotMessageSchema = createInsertSchema(chatbotMessages).omit({
  id: true,
  createdAt: true,
});

export const insertChatbotAnalyticsSchema = createInsertSchema(chatbotAnalytics).omit({
  id: true,
  createdAt: true,
});

// Chatbot Types
export type ChatbotConfig = typeof chatbotConfigs.$inferSelect;
export type InsertChatbotConfig = z.infer<typeof insertChatbotConfigSchema>;

export type ChatbotSession = typeof chatbotSessions.$inferSelect;
export type InsertChatbotSession = z.infer<typeof insertChatbotSessionSchema>;

export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type InsertChatbotMessage = z.infer<typeof insertChatbotMessageSchema>;

export type ChatbotAnalytics = typeof chatbotAnalytics.$inferSelect;
export type InsertChatbotAnalytics = z.infer<typeof insertChatbotAnalyticsSchema>;

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserDocumentPreferences = typeof userDocumentPreferences.$inferSelect;
export type InsertUserDocumentPreferences = z.infer<typeof insertUserDocumentPreferencesSchema>;
export type UpdateUserDocumentPreferences = z.infer<typeof updateUserDocumentPreferencesSchema>;

export type ClinicHeader = typeof clinicHeaders.$inferSelect;
export type InsertClinicHeader = z.infer<typeof insertClinicHeaderSchema>;

export type ClinicFooter = typeof clinicFooters.$inferSelect;
export type InsertClinicFooter = z.infer<typeof insertClinicFooterSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type MedicalRecordsFile = typeof medicalRecordsFiles.$inferSelect;
export type InsertMedicalRecordsFile = typeof medicalRecordsFiles.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;

export type SymptomCheck = typeof symptomChecks.$inferSelect;
export type InsertSymptomCheck = z.infer<typeof insertSymptomCheckSchema>;

export type PatientCommunication = typeof patientCommunications.$inferSelect;
export type InsertPatientCommunication = z.infer<typeof insertPatientCommunicationSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type MedicalImage = typeof medicalImages.$inferSelect;
export type InsertMedicalImage = z.infer<typeof insertMedicalImageSchema>;

export type ClinicalPhoto = typeof clinicalPhotos.$inferSelect;
export type InsertClinicalPhoto = z.infer<typeof insertClinicalPhotoSchema>;

export type LabResult = typeof labResults.$inferSelect;
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;

export type RevenueRecord = typeof revenueRecords.$inferSelect;
export type InsertRevenueRecord = z.infer<typeof insertRevenueRecordSchema>;

export type InsuranceVerification = typeof insuranceVerifications.$inferSelect;
export type InsertInsuranceVerification = z.infer<typeof insertInsuranceVerificationSchema>;

export type ClinicalProcedure = typeof clinicalProcedures.$inferSelect;
export type InsertClinicalProcedure = z.infer<typeof insertClinicalProcedureSchema>;

export type EmergencyProtocol = typeof emergencyProtocols.$inferSelect;
export type InsertEmergencyProtocol = z.infer<typeof insertEmergencyProtocolSchema>;

export type MedicationsDatabase = typeof medicationsDatabase.$inferSelect;
export type InsertMedicationsDatabase = z.infer<typeof insertMedicationsDatabaseSchema>;

export type StaffShift = typeof staffShifts.$inferSelect;
export type InsertStaffShift = z.infer<typeof insertStaffShiftSchema>;

export type DoctorDefaultShift = typeof doctorDefaultShifts.$inferSelect;
export type InsertDoctorDefaultShift = z.infer<typeof insertDoctorDefaultShiftSchema>;

export type OrganizationHolidaySettings = typeof organizationHolidaySettings.$inferSelect;
export type InsertOrganizationHolidaySettings = z.infer<typeof insertOrganizationHolidaySettingsSchema>;
export type OrganizationHoliday = typeof organizationHolidays.$inferSelect;
export type InsertOrganizationHoliday = z.infer<typeof insertOrganizationHolidaySchema>;

// GDPR Types
export type GdprConsent = typeof gdprConsents.$inferSelect;
export type InsertGdprConsent = z.infer<typeof insertGdprConsentSchema>;

export type GdprDataRequest = typeof gdprDataRequests.$inferSelect;
export type InsertGdprDataRequest = z.infer<typeof insertGdprDataRequestSchema>;

export type GdprAuditTrail = typeof gdprAuditTrail.$inferSelect;
export type InsertGdprAuditTrail = z.infer<typeof insertGdprAuditTrailSchema>;

export type GdprProcessingActivity = typeof gdprProcessingActivities.$inferSelect;
export type InsertGdprProcessingActivity = z.infer<typeof insertGdprProcessingActivitySchema>;

// Inventory Types
export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type InventoryItemsName = typeof inventoryItemsName.$inferSelect;
export type InsertInventoryItemsName = z.infer<typeof insertInventoryItemsNameSchema>;

export type InventorySupplier = typeof inventorySuppliers.$inferSelect;
export type InsertInventorySupplier = z.infer<typeof insertInventorySupplierSchema>;

export type InventoryWarehouse = typeof inventoryWarehouses.$inferSelect;
export type InsertInventoryWarehouse = z.infer<typeof insertInventoryWarehouseSchema>;

export type InventoryPurchaseOrder = typeof inventoryPurchaseOrders.$inferSelect;
export type InsertInventoryPurchaseOrder = z.infer<typeof insertInventoryPurchaseOrderSchema>;

export type InventoryPurchaseOrderItem = typeof inventoryPurchaseOrderItems.$inferSelect;
export type InsertInventoryPurchaseOrderItem = z.infer<typeof insertInventoryPurchaseOrderItemSchema>;

export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type InsertInventoryBatch = z.infer<typeof insertInventoryBatchSchema>;

export type InventorySale = typeof inventorySales.$inferSelect;
export type InsertInventorySale = z.infer<typeof insertInventorySaleSchema>;

export type InventorySaleItem = typeof inventorySaleItems.$inferSelect;
export type InsertInventorySaleItem = z.infer<typeof insertInventorySaleItemSchema>;

export type InventoryStockMovement = typeof inventoryStockMovements.$inferSelect;
export type InsertInventoryStockMovement = z.infer<typeof insertInventoryStockMovementSchema>;

export type InventoryStockAlert = typeof inventoryStockAlerts.$inferSelect;
export type InsertInventoryStockAlert = z.infer<typeof insertInventoryStockAlertSchema>;

// Pharmacy Sales Module Types
export type InventoryTaxRate = typeof inventoryTaxRates.$inferSelect;
export type InsertInventoryTaxRate = z.infer<typeof insertInventoryTaxRateSchema>;

export type InsuranceProvider = typeof insuranceProviders.$inferSelect;
export type InsertInsuranceProvider = z.infer<typeof insertInsuranceProviderSchema>;

export type InventorySalePayment = typeof inventorySalePayments.$inferSelect;
export type InsertInventorySalePayment = z.infer<typeof insertInventorySalePaymentSchema>;

// Returns Management Module Types
export type InventoryReturn = typeof inventoryReturns.$inferSelect;
export type InsertInventoryReturn = z.infer<typeof insertInventoryReturnSchema>;

export type InventoryReturnItem = typeof inventoryReturnItems.$inferSelect;
export type InsertInventoryReturnItem = z.infer<typeof insertInventoryReturnItemSchema>;

export type InventoryReturnApproval = typeof inventoryReturnApprovals.$inferSelect;
export type InsertInventoryReturnApproval = z.infer<typeof insertInventoryReturnApprovalSchema>;

export type InventoryStockAdjustment = typeof inventoryStockAdjustments.$inferSelect;
export type InsertInventoryStockAdjustment = z.infer<typeof insertInventoryStockAdjustmentSchema>;

export type InventoryCreditNote = typeof inventoryCreditNotes.$inferSelect;
export type InsertInventoryCreditNote = z.infer<typeof insertInventoryCreditNoteSchema>;

// Voice Documentation
export const voiceNotes = pgTable("voice_notes", {
  id: varchar("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  patientName: text("patient_name").notNull(),
  providerId: varchar("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // consultation, procedure_note, clinical_note
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  recordingDuration: integer("recording_duration"), // in seconds
  transcript: text("transcript"),
  confidence: real("confidence"), // 0-100
  medicalTerms: jsonb("medical_terms").$type<Array<{
    term: string;
    confidence: number;
    category: string;
  }>>().default([]),
  structuredData: jsonb("structured_data").$type<{
    chiefComplaint?: string;
    assessment?: string;
    plan?: string;
    [key: string]: any;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVoiceNoteSchema = createInsertSchema(voiceNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Muscle Positions - For facial muscle analysis and black dot detection
export const musclePositions = pgTable("muscles_position", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id").notNull(),
  consultationId: integer("consultation_id"),
  position: integer("position").notNull(), // 1-15 for the 15 facial muscles
  value: text("value").notNull(), // Muscle name (e.g., "Frontalis (Forehead)", "Temporalis", etc.)
  coordinates: jsonb("coordinates").$type<{
    xPct: number;
    yPct: number;
  }>(),
  isDetected: boolean("is_detected").notNull().default(false),
  detectedAt: timestamp("detected_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMusclePositionSchema = createInsertSchema(musclePositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Letter Drafts - For saving letter drafts when email sending fails
export const letterDrafts = pgTable("letter_drafts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull(),
  recipient: text("recipient").notNull(),
  doctorEmail: text("doctor_email"),
  location: text("location"),
  copiedRecipients: text("copied_recipients"),
  header: text("header"),
  documentContent: text("document_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLetterDraftSchema = createInsertSchema(letterDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Messaging Types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type MessageCampaign = typeof messageCampaigns.$inferSelect;
export type InsertMessageCampaign = z.infer<typeof insertMessageCampaignSchema>;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

export type VoiceNote = typeof voiceNotes.$inferSelect;
export type InsertVoiceNote = z.infer<typeof insertVoiceNoteSchema>;

// SaaS Insert Schemas
export const insertSaaSPaymentSchema = createInsertSchema(saasPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaaSInvoiceSchema = createInsertSchema(saasInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SaaS Types
export type SaaSOwner = typeof saasOwners.$inferSelect;
export type InsertSaaSOwner = typeof saasOwners.$inferInsert;

export type SaaSPackage = typeof saasPackages.$inferSelect;
export type InsertSaaSPackage = typeof saasPackages.$inferInsert;

export type SaaSSubscription = typeof saasSubscriptions.$inferSelect;
export type InsertSaaSSubscription = typeof saasSubscriptions.$inferInsert;

export type SaaSPayment = typeof saasPayments.$inferSelect;
export type InsertSaaSPayment = z.infer<typeof insertSaaSPaymentSchema>;

export type SaaSInvoice = typeof saasInvoices.$inferSelect;
export type InsertSaaSInvoice = z.infer<typeof insertSaaSInvoiceSchema>;

export type SaaSSettings = typeof saasSettings.$inferSelect;
export type InsertSaaSSettings = typeof saasSettings.$inferInsert;

export type SaaSSubscriptionHistory = typeof saasSubscriptionHistory.$inferSelect;
export type InsertSaaSSubscriptionHistory = typeof saasSubscriptionHistory.$inferInsert;

// Muscle Position Types
export type MusclePosition = typeof musclePositions.$inferSelect;
export type InsertMusclePosition = z.infer<typeof insertMusclePositionSchema>;

// Letter Draft Types
export type LetterDraft = typeof letterDrafts.$inferSelect;
export type InsertLetterDraft = z.infer<typeof insertLetterDraftSchema>;

// QuickBooks Integration Tables

// QuickBooks Connections - Store OAuth tokens and company info
export const quickbooksConnections = pgTable("quickbooks_connections", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  companyId: text("company_id").notNull(), // QuickBooks Company ID
  companyName: text("company_name").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  realmId: text("realm_id").notNull(), // QuickBooks Company/Realm ID
  baseUrl: text("base_url").notNull(), // sandbox or production URL
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncSettings: jsonb("sync_settings").$type<{
    autoSync?: boolean;
    syncIntervalHours?: number;
    syncCustomers?: boolean;
    syncInvoices?: boolean;
    syncPayments?: boolean;
    syncItems?: boolean;
    syncAccounts?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks Sync Logs - Track all sync operations
export const quickbooksSyncLogs = pgTable("quickbooks_sync_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  syncType: varchar("sync_type", { length: 50 }).notNull(), // customers, invoices, payments, items, accounts
  operation: varchar("operation", { length: 20 }).notNull(), // create, update, delete, sync
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, success, failed, partial
  recordsProcessed: integer("records_processed").default(0),
  recordsSuccessful: integer("records_successful").default(0),
  recordsFailed: integer("records_failed").default(0),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  metadata: jsonb("metadata").$type<{
    lastCursor?: string;
    totalRecords?: number;
    batchSize?: number;
    retryCount?: number;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// QuickBooks Customer Mappings - Map EMR patients to QB customers
export const quickbooksCustomerMappings = pgTable("quickbooks_customer_mappings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  patientId: integer("patient_id").notNull(),
  quickbooksCustomerId: text("quickbooks_customer_id").notNull(),
  quickbooksDisplayName: text("quickbooks_display_name"),
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("synced"), // synced, pending, failed
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    quickbooksData?: any;
    lastModified?: string;
    customFields?: Record<string, any>;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks Invoice Mappings - Map EMR invoices to QB invoices
export const quickbooksInvoiceMappings = pgTable("quickbooks_invoice_mappings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  emrInvoiceId: text("emr_invoice_id").notNull(), // EMR internal invoice ID
  quickbooksInvoiceId: text("quickbooks_invoice_id").notNull(),
  quickbooksInvoiceNumber: text("quickbooks_invoice_number"),
  patientId: integer("patient_id").notNull(),
  customerId: integer("customer_id"), // Reference to QB customer mapping
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // draft, sent, paid, cancelled
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("synced"),
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    quickbooksData?: any;
    lastModified?: string;
    lineItems?: any[];
    taxes?: any[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks Payment Mappings - Map EMR payments to QB payments
export const quickbooksPaymentMappings = pgTable("quickbooks_payment_mappings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  emrPaymentId: text("emr_payment_id").notNull(),
  quickbooksPaymentId: text("quickbooks_payment_id").notNull(),
  invoiceMappingId: integer("invoice_mapping_id"), // Reference to invoice mapping
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("synced"),
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    quickbooksData?: any;
    lastModified?: string;
    depositTo?: string;
    paymentRefNum?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks Chart of Accounts Mappings
export const quickbooksAccountMappings = pgTable("quickbooks_account_mappings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  emrAccountType: varchar("emr_account_type", { length: 50 }).notNull(), // revenue, expense, asset, liability
  emrAccountName: text("emr_account_name").notNull(),
  quickbooksAccountId: text("quickbooks_account_id").notNull(),
  quickbooksAccountName: text("quickbooks_account_name").notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(),
  accountSubType: varchar("account_sub_type", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("synced"),
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    quickbooksData?: any;
    lastModified?: string;
    parentAccount?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks Item Mappings - Map EMR services/products to QB items
export const quickbooksItemMappings = pgTable("quickbooks_item_mappings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  emrItemType: varchar("emr_item_type", { length: 50 }).notNull(), // service, product, medication
  emrItemId: text("emr_item_id").notNull(),
  emrItemName: text("emr_item_name").notNull(),
  quickbooksItemId: text("quickbooks_item_id").notNull(),
  quickbooksItemName: text("quickbooks_item_name").notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull(), // Service, Inventory, NonInventory
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  description: text("description"),
  incomeAccountId: text("income_account_id"),
  expenseAccountId: text("expense_account_id"),
  isActive: boolean("is_active").notNull().default(true),
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("synced"),
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    quickbooksData?: any;
    lastModified?: string;
    taxCode?: string;
    sku?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks Sync Configurations
export const quickbooksSyncConfigs = pgTable("quickbooks_sync_configs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  configType: varchar("config_type", { length: 50 }).notNull(), // mapping, sync_rules, field_mapping
  configName: text("config_name").notNull(),
  configValue: jsonb("config_value").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pricing Management Tables

// Doctors Fee Pricing Table
export const doctorsFee = pgTable("doctors_fee", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  doctorId: integer("doctor_id").references(() => users.id),
  doctorName: text("doctor_name"),
  doctorRole: varchar("doctor_role", { length: 50 }),
  serviceName: text("service_name").notNull(),
  serviceCode: varchar("service_code", { length: 50 }),
  category: varchar("category", { length: 100 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  version: integer("version").notNull().default(1),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<{
    previousPrice?: number;
    changeReason?: string;
    approvedBy?: number;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lab Test Pricing Table
export const labTestPricing = pgTable("lab_test_pricing", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  doctorId: integer("doctor_id").references(() => users.id),
  doctorName: text("doctor_name"),
  doctorRole: varchar("doctor_role", { length: 50 }),
  testName: text("test_name").notNull(),
  testCode: varchar("test_code", { length: 50 }),
  category: varchar("category", { length: 100 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  version: integer("version").notNull().default(1),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<{
    previousPrice?: number;
    changeReason?: string;
    approvedBy?: number;
    sampleType?: string;
    turnaroundTime?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Imaging Pricing Table
export const imagingPricing = pgTable("imaging_pricing", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  imagingType: text("imaging_type").notNull(),
  imagingCode: varchar("imaging_code", { length: 50 }),
  modality: varchar("modality", { length: 50 }),
  bodyPart: varchar("body_part", { length: 100 }),
  category: varchar("category", { length: 100 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  version: integer("version").notNull().default(1),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<{
    previousPrice?: number;
    changeReason?: string;
    approvedBy?: number;
    contrast?: boolean;
    duration?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Treatments Table
export const treatments = pgTable("treatments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  doctorId: integer("doctor_id").references(() => users.id),
  doctorName: text("doctor_name"),
  doctorRole: varchar("doctor_role", { length: 50 }),
  name: text("name").notNull(),
  colorCode: varchar("color_code", { length: 7 }).notNull().default("#2563eb"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<{ [key: string]: any }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pricing Insert Schemas
export const insertDoctorsFeeSchema = createInsertSchema(doctorsFee).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLabTestPricingSchema = createInsertSchema(labTestPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImagingPricingSchema = createInsertSchema(imagingPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTreatmentSchema = createInsertSchema(treatments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Treatments Info Table
export const treatmentsInfo = pgTable("treatments_info", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  colorCode: varchar("color_code", { length: 7 }).notNull().default("#2563eb"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Analytics Subjects Table
export const analyticsSubjects = pgTable("analytics_subjects", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  subjectTitle: text("subject_title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Analytics Subject Treatments Mapping Table
export const analyticsSubjectTreatments = pgTable("analytics_subject_treatments", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => analyticsSubjects.id, { onDelete: "cascade" }),
  // NOTE: this maps to `treatments_info.id` (the catalog used by the UI)
  treatmentId: integer("treatment_id").notNull().references(() => treatmentsInfo.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueSubjectTreatment: uniqueIndex("unique_subject_treatment").on(table.subjectId, table.treatmentId),
}));

export const insertTreatmentsInfoSchema = createInsertSchema(treatmentsInfo).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Pricing Types
export type DoctorsFee = typeof doctorsFee.$inferSelect;
export type InsertDoctorsFee = z.infer<typeof insertDoctorsFeeSchema>;

export type LabTestPricing = typeof labTestPricing.$inferSelect;
export type InsertLabTestPricing = z.infer<typeof insertLabTestPricingSchema>;

export type ImagingPricing = typeof imagingPricing.$inferSelect;
export type InsertImagingPricing = z.infer<typeof insertImagingPricingSchema>;
export type Treatment = typeof treatments.$inferSelect;
export type InsertTreatment = z.infer<typeof insertTreatmentSchema>;
export type TreatmentsInfo = typeof treatmentsInfo.$inferSelect;
export type InsertTreatmentsInfo = z.infer<typeof insertTreatmentsInfoSchema>;

// QuickBooks Insert Schemas
export const insertQuickBooksConnectionSchema = createInsertSchema(quickbooksConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksSyncLogSchema = createInsertSchema(quickbooksSyncLogs).omit({
  id: true,
  createdAt: true,
});

export const insertQuickBooksCustomerMappingSchema = createInsertSchema(quickbooksCustomerMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksInvoiceMappingSchema = createInsertSchema(quickbooksInvoiceMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksPaymentMappingSchema = createInsertSchema(quickbooksPaymentMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksAccountMappingSchema = createInsertSchema(quickbooksAccountMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksItemMappingSchema = createInsertSchema(quickbooksItemMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksSyncConfigSchema = createInsertSchema(quickbooksSyncConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// QuickBooks Types
export type QuickBooksConnection = typeof quickbooksConnections.$inferSelect;
export type InsertQuickBooksConnection = z.infer<typeof insertQuickBooksConnectionSchema>;

export type QuickBooksSyncLog = typeof quickbooksSyncLogs.$inferSelect;
export type InsertQuickBooksSyncLog = z.infer<typeof insertQuickBooksSyncLogSchema>;

export type QuickBooksCustomerMapping = typeof quickbooksCustomerMappings.$inferSelect;
export type InsertQuickBooksCustomerMapping = z.infer<typeof insertQuickBooksCustomerMappingSchema>;

export type QuickBooksInvoiceMapping = typeof quickbooksInvoiceMappings.$inferSelect;
export type InsertQuickBooksInvoiceMapping = z.infer<typeof insertQuickBooksInvoiceMappingSchema>;

export type QuickBooksPaymentMapping = typeof quickbooksPaymentMappings.$inferSelect;
export type InsertQuickBooksPaymentMapping = z.infer<typeof insertQuickBooksPaymentMappingSchema>;

export type QuickBooksAccountMapping = typeof quickbooksAccountMappings.$inferSelect;
export type InsertQuickBooksAccountMapping = z.infer<typeof insertQuickBooksAccountMappingSchema>;

export type QuickBooksItemMapping = typeof quickbooksItemMappings.$inferSelect;
export type InsertQuickBooksItemMapping = z.infer<typeof insertQuickBooksItemMappingSchema>;

export type QuickBooksSyncConfig = typeof quickbooksSyncConfigs.$inferSelect;
export type InsertQuickBooksSyncConfig = z.infer<typeof insertQuickBooksSyncConfigSchema>;

// Financial Forecasting Insert Schemas
export const insertForecastModelSchema = createInsertSchema(forecastModels).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFinancialForecastSchema = createInsertSchema(financialForecasts).omit({ id: true, generatedAt: true, createdAt: true, updatedAt: true });

// Financial Forecasting Types
export type ForecastModel = typeof forecastModels.$inferSelect;
export type InsertForecastModel = z.infer<typeof insertForecastModelSchema>;
export type FinancialForecast = typeof financialForecasts.$inferSelect;
export type InsertFinancialForecast = z.infer<typeof insertFinancialForecastSchema>;

// ========================================
// PHARMACY ROLE MODULE TABLES
// ========================================

// Pharmacy User Sessions - Track pharmacist login sessions
export const pharmacyUserSessions = pgTable("pharmacy_user_sessions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  sessionToken: varchar("session_token", { length: 500 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  loginAt: timestamp("login_at").defaultNow().notNull(),
  logoutAt: timestamp("logout_at"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pharmacy Activity Logs - Immutable audit trail
export const pharmacyActivityLogs = pgTable("pharmacy_activity_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => pharmacyUserSessions.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  entityName: varchar("entity_name", { length: 200 }),
  details: jsonb("details").$type<{
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    additionalInfo?: string;
    saleAmount?: number;
    returnAmount?: number;
    itemCount?: number;
  }>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Pharmacy Shift Closings - Track daily shift reconciliation
export const pharmacyShiftClosings = pgTable("pharmacy_shift_closings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  pharmacistId: integer("pharmacist_id").notNull().references(() => users.id),
  shiftDate: timestamp("shift_date").notNull(),
  shiftStartTime: timestamp("shift_start_time").notNull(),
  shiftEndTime: timestamp("shift_end_time"),
  status: varchar("status", { length: 20 }).default("open").notNull(),

  // Sales Summary
  totalSalesCount: integer("total_sales_count").default(0),
  totalSalesAmount: decimal("total_sales_amount", { precision: 12, scale: 2 }).default("0.00"),
  totalReturnsCount: integer("total_returns_count").default(0),
  totalReturnsAmount: decimal("total_returns_amount", { precision: 12, scale: 2 }).default("0.00"),

  // Payment Breakdown
  cashSales: decimal("cash_sales", { precision: 12, scale: 2 }).default("0.00"),
  cardSales: decimal("card_sales", { precision: 12, scale: 2 }).default("0.00"),
  insuranceSales: decimal("insurance_sales", { precision: 12, scale: 2 }).default("0.00"),
  creditSales: decimal("credit_sales", { precision: 12, scale: 2 }).default("0.00"),

  // Cash Drawer
  openingCash: decimal("opening_cash", { precision: 12, scale: 2 }).default("0.00"),
  closingCash: decimal("closing_cash", { precision: 12, scale: 2 }).default("0.00"),
  expectedCash: decimal("expected_cash", { precision: 12, scale: 2 }).default("0.00"),
  cashDiscrepancy: decimal("cash_discrepancy", { precision: 12, scale: 2 }).default("0.00"),
  discrepancyNotes: text("discrepancy_notes"),

  // Approval
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pharmacy Dashboard Snapshots - Daily metrics cache
export const pharmacyDashboardSnapshots = pgTable("pharmacy_dashboard_snapshots", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  snapshotDate: timestamp("snapshot_date").notNull(),

  // Sales Metrics
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0.00"),
  totalSalesCount: integer("total_sales_count").default(0),
  averageSaleValue: decimal("average_sale_value", { precision: 10, scale: 2 }).default("0.00"),

  // Returns Metrics
  totalReturns: decimal("total_returns", { precision: 12, scale: 2 }).default("0.00"),
  totalReturnsCount: integer("total_returns_count").default(0),

  // Inventory Metrics
  lowStockItemsCount: integer("low_stock_items_count").default(0),
  nearExpiryItemsCount: integer("near_expiry_items_count").default(0),
  outOfStockItemsCount: integer("out_of_stock_items_count").default(0),

  // Pending Amounts
  pendingInsuranceAmount: decimal("pending_insurance_amount", { precision: 12, scale: 2 }).default("0.00"),
  pendingCreditAmount: decimal("pending_credit_amount", { precision: 12, scale: 2 }).default("0.00"),
  pendingInsuranceCount: integer("pending_insurance_count").default(0),
  pendingCreditCount: integer("pending_credit_count").default(0),

  // Top Items
  topSellingItems: jsonb("top_selling_items").$type<Array<{
    itemId: number;
    itemName: string;
    quantitySold: number;
    totalAmount: number;
  }>>().default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pharmacy Role Permissions - Define what actions pharmacists can perform
export const pharmacyRolePermissions = pgTable("pharmacy_role_permissions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  roleName: varchar("role_name", { length: 50 }).notNull(),
  permissionKey: varchar("permission_key", { length: 100 }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pharmacy Insert Schemas
export const insertPharmacyUserSessionSchema = createInsertSchema(pharmacyUserSessions).omit({
  id: true,
  createdAt: true,
});

export const insertPharmacyActivityLogSchema = createInsertSchema(pharmacyActivityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertPharmacyShiftClosingSchema = createInsertSchema(pharmacyShiftClosings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPharmacyDashboardSnapshotSchema = createInsertSchema(pharmacyDashboardSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPharmacyRolePermissionSchema = createInsertSchema(pharmacyRolePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Pharmacy Role Module Types
export type PharmacyUserSession = typeof pharmacyUserSessions.$inferSelect;
export type InsertPharmacyUserSession = z.infer<typeof insertPharmacyUserSessionSchema>;

export type PharmacyActivityLog = typeof pharmacyActivityLogs.$inferSelect;
export type InsertPharmacyActivityLog = z.infer<typeof insertPharmacyActivityLogSchema>;

export type PharmacyShiftClosing = typeof pharmacyShiftClosings.$inferSelect;
export type InsertPharmacyShiftClosing = z.infer<typeof insertPharmacyShiftClosingSchema>;

export type PharmacyDashboardSnapshot = typeof pharmacyDashboardSnapshots.$inferSelect;
export type InsertPharmacyDashboardSnapshot = z.infer<typeof insertPharmacyDashboardSnapshotSchema>;

export type PharmacyRolePermission = typeof pharmacyRolePermissions.$inferSelect;
export type InsertPharmacyRolePermission = z.infer<typeof insertPharmacyRolePermissionSchema>;

// Organization Integrations - Track integration status per organization
export const organizationIntegrations = pgTable("organization_integrations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  integrationType: varchar("integration_type", { length: 50 }).notNull(), // stripe, twilio, sendgrid, etc.
  isEnabled: boolean("is_enabled").default(false),
  isConfigured: boolean("is_configured").default(false),
  status: varchar("status", { length: 20 }).default("disconnected"), // connected, disconnected, error
  lastTestedAt: timestamp("last_tested_at"),
  lastError: text("last_error"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  settings: jsonb("settings").$type<{
    mode?: 'test' | 'live';
    webhookEvents?: string[];
    defaultCurrency?: string;
    autoCapture?: boolean;
    statementDescriptor?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationIntegrationSchema = createInsertSchema(organizationIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type OrganizationIntegration = typeof organizationIntegrations.$inferSelect;
export type InsertOrganizationIntegration = z.infer<typeof insertOrganizationIntegrationSchema>;

// Scheduled Video Calls
export const scheduledVideoCalls = pgTable("scheduled_video_calls", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  createdBy: integer("created_by").notNull(), // User who scheduled the call
  participantId: integer("participant_id").notNull(), // Participant user/patient ID
  participantName: text("participant_name").notNull(),
  participantEmail: text("participant_email").notNull(),
  participantRole: varchar("participant_role", { length: 50 }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30), // Duration in minutes
  callType: varchar("call_type", { length: 50 }).notNull().default("consultation"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, started, completed, cancelled, failed
  roomName: text("room_name"), // LiveKit room name (set when call starts)
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScheduledVideoCallSchema = createInsertSchema(scheduledVideoCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ScheduledVideoCall = typeof scheduledVideoCalls.$inferSelect;
export type InsertScheduledVideoCall = z.infer<typeof insertScheduledVideoCallSchema>;
